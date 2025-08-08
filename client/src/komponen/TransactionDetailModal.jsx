import React, { useState, useEffect } from 'react';
import { transaksiAPI } from '../layanan/api';
import { useAuth } from '../konteks/AuthContext';
import toast from 'react-hot-toast';
import PembelianKontrakPintar from './PembelianKontrakPintar';
import { 
  CurrencyDollarIcon,
  ShieldCheckIcon,
  UserIcon,
  DevicePhoneMobileIcon,
  ClockIcon,
  ExclamationTriangleIcon,
  WalletIcon,
  CheckCircleIcon,
  ArrowRightIcon,
  ArrowLeftIcon
} from '@heroicons/react/24/outline';

const TransactionDetailModal = ({ 
  produk, 
  onConfirm, 
  onCancel, 
  userWalletAddress, 
  userBalance, 
  onExpired, 
  onPaymentStart 
}) => {
  const { user } = useAuth();
  const [currentStep, setCurrentStep] = useState(1); // 1: Detail, 2: Payment, 3: Processing
  const [agreed, setAgreed] = useState(false);
  const [timeLeft, setTimeLeft] = useState(null);
  const [isExpired, setIsExpired] = useState(false);
  const [paymentStartTime, setPaymentStartTime] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [hasNotifiedExpired, setHasNotifiedExpired] = useState(false);

  // Timer 15 menit untuk tahap pembayaran (hanya aktif di step 2)
  useEffect(() => {
    if (currentStep !== 2 || !paymentStartTime) {
      setTimeLeft(null);
      setIsExpired(false);
      setHasNotifiedExpired(false);
      return;
    }

    const expiryTime = new Date(paymentStartTime.getTime() + 15 * 60 * 1000); // 15 menit

    const updateTimer = () => {
      const now = new Date();
      const difference = expiryTime.getTime() - now.getTime();

      if (difference <= 0) {
        setTimeLeft({ minutes: 0, seconds: 0 });
        setIsExpired(true);
        
        // Notifikasi dan callback hanya sekali
        if (!hasNotifiedExpired) {
          setHasNotifiedExpired(true);
          
          // Notifikasi browser
          if ('Notification' in window && Notification.permission === 'granted') {
            new Notification('Waktu Pembayaran Habis', {
              body: 'Batas waktu 15 menit untuk menyelesaikan pembayaran telah berakhir. Produk dikembalikan ke market.',
              icon: '/favicon.ico'
            });
          }
          
          // Callback untuk mengembalikan produk ke market
          if (onExpired) {
            setTimeout(() => {
              onExpired(produk);
            }, 3000); // Delay 3 detik untuk user baca pesan
          }
        }
        
        return;
      }

      const minutes = Math.floor(difference / (1000 * 60));
      const seconds = Math.floor((difference % (1000 * 60)) / 1000);
      
      setTimeLeft({ minutes, seconds });
      setIsExpired(false);
    };

    // Minta izin notifikasi
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }

    updateTimer();
    const interval = setInterval(updateTimer, 1000);

    return () => clearInterval(interval);
  }, [currentStep, paymentStartTime, hasNotifiedExpired, onExpired, produk]);

  // Use hargaEth from product if available, otherwise convert from IDR
  const priceInEth = produk.hargaEth ? produk.hargaEth.toString() : (produk.harga / 1000000).toFixed(4);

  const formatRupiah = (amount) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0
    }).format(amount);
  };

  // Calculate estimated total cost
  const estimatedGasCost = 0.004; // ETH
  const totalEstimatedCost = parseFloat(priceInEth) + estimatedGasCost;

  // Check if seller has wallet address
  const sellerWalletAddress = produk.penjual?.walletAddress || produk.user?.walletAddress || produk.walletAddress;

  // Handle step navigation
  const handleNextStep = async () => {
    if (currentStep === 1) {
      // Validasi role admin
      if (user?.role === 'ADMIN') {
        toast.error('Admin tidak dapat membeli produk');
        onCancel();
        return;
      }
      
      try {
        console.log('🔄 Creating transaction for product:', produk.id);
        console.log('🔄 API Base URL:', process.env.REACT_APP_API_URL || 'http://localhost:5000/api');
        
        // Buat transaksi terlebih dahulu saat masuk tahap 2
        const response = await transaksiAPI.buatTransaksi(produk.id);
        
        console.log('✅ Transaction API response:', response);
        
        if (!response.data.sukses) {
          throw new Error(response.data.pesan || 'Gagal membuat transaksi');
        }

        // Jika berhasil, lanjut ke step 2
        setCurrentStep(2);
        setPaymentStartTime(new Date()); // Mulai timer saat masuk tahap 2
        
        console.log('✅ Transaction created successfully:', response.data.data.transaksi);
        
        // Callback untuk memberi tahu parent bahwa pembayaran dimulai
        if (onPaymentStart) {
          onPaymentStart(produk, response.data.data.transaksi);
        }

        // Broadcast event untuk refresh dashboard pembeli
        window.dispatchEvent(new CustomEvent('transaction-created', { 
          detail: { 
            transaksi: response.data.data.transaksi,
            timestamp: Date.now()
          } 
        }));

        // Broadcast event untuk refresh marketplace (produk hilang dari market)
        window.dispatchEvent(new CustomEvent('product-reserved', { 
          detail: { 
            produkId: produk.id,
            transaksiId: response.data.data.transaksi.id,
            timestamp: Date.now()
          } 
        }));

      } catch (error) {
        console.error('❌ Error creating transaction:', error);
        console.error('❌ Error details:', {
          message: error.message,
          response: error.response?.data,
          status: error.response?.status,
          config: error.config
        });
        
        let errorMessage = 'Gagal membuat transaksi';
        
        if (error.response?.status === 404) {
          errorMessage = 'Endpoint API tidak ditemukan. Pastikan server berjalan.';
        } else if (error.response?.status === 401) {
          errorMessage = 'Anda perlu login ulang.';
        } else if (error.response?.data?.pesan) {
          errorMessage = error.response.data.pesan;
        } else if (error.message.includes('Network Error')) {
          errorMessage = 'Tidak dapat terhubung ke server. Pastikan server berjalan di http://localhost:5000';
        } else if (error.message) {
          errorMessage = error.message;
        }
        
        toast.error('Gagal membuat transaksi: ' + errorMessage);
        return;
      }
    } else if (currentStep === 2) {
      setCurrentStep(3);
      setIsProcessing(true);
      // Panggil fungsi pembayaran
      handlePayment();
    }
  };

  const handlePrevStep = () => {
    if (currentStep === 2) {
      setCurrentStep(1);
      setPaymentStartTime(null); // Reset timer
      setTimeLeft(null);
      setIsExpired(false);
      setHasNotifiedExpired(false);
    } else if (currentStep === 3) {
      setCurrentStep(2);
      setIsProcessing(false);
    }
  };

  const handlePayment = async () => {
    try {
      setIsProcessing(true);
      
      // Jangan langsung panggil onConfirm, tapi tampilkan komponen dompet
      // onConfirm akan dipanggil dari PembelianKontrakPintar setelah pembayaran berhasil
      setCurrentStep(3); // Pindah ke step 3 untuk menampilkan komponen dompet
      
    } catch (error) {
      console.error('Payment error:', error);
      setIsProcessing(false);
      // Kembali ke step 2 jika ada error
      setCurrentStep(2);
    }
  };

  const handlePaymentSuccess = async (result) => {
    try {
      // Panggil onConfirm dengan hasil pembayaran
      if (onConfirm) {
        await onConfirm(result);
      }
      
      // Tutup modal setelah pembayaran berhasil
      onCancel();
    } catch (error) {
      console.error('Payment confirmation error:', error);
      setIsProcessing(false);
      setCurrentStep(2);
    }
  };

  const handlePaymentCancel = () => {
    // Kembali ke step 2 jika user membatalkan pembayaran
    setCurrentStep(2);
    setIsProcessing(false);
  };

  // Auto close modal when expired
  useEffect(() => {
    if (isExpired && hasNotifiedExpired) {
      const timer = setTimeout(() => {
        onCancel();
      }, 5000); // Tutup modal 5 detik setelah expired
      
      return () => clearTimeout(timer);
    }
  }, [isExpired, hasNotifiedExpired, onCancel]);

  // Step indicator component
  const StepIndicator = () => (
    <div className="flex items-center justify-center mb-6">
      <div className="flex items-center space-x-4">
        {/* Step 1 */}
        <div className="flex items-center">
          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
            currentStep >= 1 ? 'bg-blue-600 text-white' : 'bg-gray-300 text-gray-600'
          }`}>
            {currentStep > 1 ? <CheckCircleIcon className="w-5 h-5" /> : '1'}
          </div>
          <span className="ml-2 text-sm font-medium text-gray-700">Detail Transaksi</span>
        </div>
        
        <ArrowRightIcon className="w-4 h-4 text-gray-400" />
        
        {/* Step 2 */}
        <div className="flex items-center">
          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
            currentStep >= 2 ? 'bg-blue-600 text-white' : 'bg-gray-300 text-gray-600'
          }`}>
            {currentStep > 2 ? <CheckCircleIcon className="w-5 h-5" /> : '2'}
          </div>
          <span className="ml-2 text-sm font-medium text-gray-700">Pembayaran</span>
        </div>
        
        <ArrowRightIcon className="w-4 h-4 text-gray-400" />
        
        {/* Step 3 */}
        <div className="flex items-center">
          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
            currentStep >= 3 ? 'bg-blue-600 text-white' : 'bg-gray-300 text-gray-600'
          }`}>
            3
          </div>
          <span className="ml-2 text-sm font-medium text-gray-700">Proses</span>
        </div>
      </div>
    </div>
  );

  // Render content based on current step
  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return (
          <div>
            {/* Product Information */}
            <div className="bg-gray-50 rounded-lg p-4 sm:p-6 mb-4 sm:mb-6">
              <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-3 sm:mb-4 flex items-center">
                <DevicePhoneMobileIcon className="h-4 w-4 sm:h-5 sm:w-5 mr-2" />
                Informasi Produk
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                <div>
                  <p className="text-xs sm:text-sm text-gray-600">Nama Produk</p>
                  <p className="font-medium text-gray-900 text-sm sm:text-base break-words">{produk.judulProduk}</p>
                </div>
                <div>
                  <p className="text-xs sm:text-sm text-gray-600">Game</p>
                  <p className="font-medium text-gray-900 text-sm sm:text-base">{produk.namaGame}</p>
                </div>
                <div>
                  <p className="text-xs sm:text-sm text-gray-600">Kode Produk</p>
                  <p className="font-medium text-gray-900 text-sm sm:text-base">{produk.kodeProduk}</p>
                </div>
                <div>
                  <p className="text-xs sm:text-sm text-gray-600">Status</p>
                  <span className="bg-green-100 text-green-800 text-xs sm:text-sm px-2 py-1 rounded-full">
                    Tersedia
                  </span>
                </div>
              </div>
            </div>

            {/* Seller Information */}
            <div className="bg-blue-50 rounded-lg p-4 sm:p-6 mb-4 sm:mb-6">
              <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-3 sm:mb-4 flex items-center">
                <UserIcon className="h-4 w-4 sm:h-5 sm:w-5 mr-2" />
                Informasi Penjual
              </h3>
              <div className="space-y-3">
                <div>
                  <p className="text-xs sm:text-sm text-gray-600">Nama Penjual</p>
                  <p className="font-medium text-gray-900 text-sm sm:text-base">{produk.penjual?.nama || produk.user?.nama || 'Anonim'}</p>
                </div>
                <div>
                  <p className="text-xs sm:text-sm text-gray-600">Wallet Address</p>
                  <p className="font-mono text-xs sm:text-sm text-gray-900 break-all bg-white p-2 rounded border">
                    {sellerWalletAddress || 'Tidak tersedia'}
                  </p>
                  {sellerWalletAddress && (
                    <div className="flex items-center text-xs sm:text-sm text-green-600 mt-2">
                      <ShieldCheckIcon className="h-3 w-3 sm:h-4 sm:w-4 mr-1" />
                      <span>Wallet Terverifikasi</span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Price Information */}
            <div className="bg-yellow-50 rounded-lg p-4 sm:p-6 mb-4 sm:mb-6">
              <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-3 sm:mb-4 flex items-center">
                <CurrencyDollarIcon className="h-4 w-4 sm:h-5 sm:w-5 mr-2" />
                Rincian Harga
              </h3>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm sm:text-base text-gray-600">Harga Produk</span>
                  <div className="text-right">
                    <p className="font-bold text-lg sm:text-xl text-primary-600">{priceInEth} ETH</p>
                    <p className="text-xs sm:text-sm text-gray-500">≈ {formatRupiah(produk.harga)}</p>
                  </div>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm sm:text-base text-gray-600">Estimasi Gas Fee</span>
                  <span className="font-medium text-sm sm:text-base">~{estimatedGasCost} ETH</span>
                </div>
                <div className="border-t pt-3">
                  <div className="flex justify-between items-center">
                    <span className="font-semibold text-gray-900 text-sm sm:text-base">Total Estimasi</span>
                    <span className="font-bold text-lg sm:text-xl text-primary-600">
                      {totalEstimatedCost.toFixed(4)} ETH
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Terms Agreement */}
            <div className="mb-4 sm:mb-6">
              <label className="flex items-start space-x-3">
                <input
                  type="checkbox"
                  checked={agreed}
                  onChange={(e) => setAgreed(e.target.checked)}
                  className="mt-1 h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded flex-shrink-0"
                />
                <span className="text-xs sm:text-sm text-gray-700">
                  Saya telah membaca dan menyetujui syarat dan ketentuan transaksi. 
                  Saya memahami bahwa dana akan disimpan dalam escrow smart contract 
                  dan akan dilepas setelah saya mengkonfirmasi penerimaan akun game.
                  <strong className="text-orange-600"> Saya juga memahami bahwa saya akan memiliki batas waktu 15 menit untuk menyelesaikan pembayaran di tahap selanjutnya.</strong>
                </span>
              </label>
            </div>

            {/* Warning if seller has no wallet */}
            {!sellerWalletAddress && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3 sm:p-4 mb-4 sm:mb-6">
                <div className="flex">
                  <ExclamationTriangleIcon className="w-4 h-4 sm:w-5 sm:h-5 text-red-400 mt-0.5 mr-2 sm:mr-3 flex-shrink-0" />
                  <div>
                    <h4 className="text-xs sm:text-sm font-medium text-red-800">Tidak Dapat Melanjutkan!</h4>
                    <p className="text-xs sm:text-sm text-red-700 mt-1">
                      Penjual belum menghubungkan wallet address. Transaksi tidak dapat diproses.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        );

      case 2:
        return (
          <div>
            {/* Timer Display */}
            {isExpired ? (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
                <div className="flex items-start gap-3">
                  <ExclamationTriangleIcon className="h-5 w-5 text-red-600 mt-0.5" />
                  <div className="flex-1">
                    <h4 className="font-semibold text-red-900">
                      ❌ Waktu Pembayaran Telah Habis
                    </h4>
                    <p className="text-sm text-red-700 mt-1">
                      Batas waktu 15 menit untuk menyelesaikan pembayaran telah berakhir. 
                      Produk akan dikembalikan ke market dan modal akan ditutup otomatis.
                    </p>
                    <div className="mt-3 p-3 bg-red-100 rounded-lg">
                      <p className="text-xs font-medium text-red-800">
                        📝 Modal akan ditutup dalam beberapa detik. Anda dapat mencoba membeli produk lagi dari halaman market.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className={`rounded-lg p-4 border mb-6 ${
                timeLeft && timeLeft.minutes < 5 
                  ? 'bg-red-50 border-red-200' 
                  : timeLeft && timeLeft.minutes < 10 
                    ? 'bg-orange-50 border-orange-200'
                    : 'bg-blue-50 border-blue-200'
              }`}>
                <div className="flex items-start gap-3">
                  <ClockIcon className={`h-5 w-5 mt-0.5 ${
                    timeLeft && timeLeft.minutes < 5 
                      ? 'text-red-600' 
                      : timeLeft && timeLeft.minutes < 10 
                        ? 'text-orange-600'
                        : 'text-blue-600'
                  }`} />
                  <div className="flex-1">
                    <h4 className={`font-semibold ${
                      timeLeft && timeLeft.minutes < 5 
                        ? 'text-red-900' 
                        : timeLeft && timeLeft.minutes < 10 
                          ? 'text-orange-900'
                          : 'text-blue-900'
                    }`}>
                      {!timeLeft ? '⏳ Memulai Timer Pembayaran...' :
                       timeLeft.minutes < 5 ? '⚠️ Waktu Pembayaran Hampir Habis!' : 
                       timeLeft.minutes < 10 ? '⏰ Segera Lakukan Pembayaran' : 
                       'Siap untuk Pembayaran'
                      }
                    </h4>
                    {timeLeft && (
                      <div className="text-3xl font-bold mt-2 mb-2">
                        {String(timeLeft.minutes).padStart(2, '0')}:{String(timeLeft.seconds).padStart(2, '0')}
                      </div>
                    )}
                    <p className={`text-sm mt-1 ${
                      timeLeft && timeLeft.minutes < 5 
                        ? 'text-red-700' 
                        : timeLeft && timeLeft.minutes < 10 
                          ? 'text-orange-700'
                          : 'text-blue-700'
                    }`}>
                      {!timeLeft ? 'Timer akan dimulai dalam beberapa detik...' :
                       timeLeft.minutes < 5 ? `Anda hanya memiliki ${timeLeft.minutes} menit ${timeLeft.seconds} detik lagi! Jika waktu habis, produk akan kembali ke market.` :
                       `Anda memiliki ${timeLeft.minutes} menit ${timeLeft.seconds} detik untuk menyelesaikan pembayaran. Proses akan dilanjutkan di dashboard pembeli.`
                      }
                    </p>
                  </div>
                </div>
              </div>
            )}

            {!isExpired && (
              <>
                {/* Payment Summary */}
                <div className="bg-green-50 rounded-lg p-4 sm:p-6 mb-4 sm:mb-6">
                  <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-3 sm:mb-4 flex items-center">
                    <WalletIcon className="h-4 w-4 sm:h-5 sm:w-5 mr-2" />
                    Ringkasan Pembayaran
                  </h3>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-sm sm:text-base text-gray-600">Produk</span>
                      <span className="font-medium text-sm sm:text-base">{produk.judulProduk}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm sm:text-base text-gray-600">Harga</span>
                      <span className="font-medium text-sm sm:text-base">{priceInEth} ETH</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm sm:text-base text-gray-600">Gas Fee (estimasi)</span>
                      <span className="font-medium text-sm sm:text-base">~{estimatedGasCost} ETH</span>
                    </div>
                    <div className="border-t pt-3">
                      <div className="flex justify-between items-center">
                        <span className="font-semibold text-gray-900 text-sm sm:text-base">Total</span>
                        <span className="font-bold text-lg sm:text-xl text-primary-600">
                          {totalEstimatedCost.toFixed(4)} ETH
                        </span>
                      </div>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm sm:text-base text-gray-600">Saldo Anda</span>
                      <span className="font-medium text-sm sm:text-base">{userBalance || '0'} ETH</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm sm:text-base text-gray-600">Sisa Setelah Transaksi</span>
                      <span className={`font-medium text-sm sm:text-base ${
                        parseFloat(userBalance || 0) - totalEstimatedCost > 0 ? 'text-green-600' : 'text-red-600'
                      }`}>
                        ~{(parseFloat(userBalance || 0) - totalEstimatedCost).toFixed(4)} ETH
                      </span>
                    </div>
                  </div>
                </div>

                {/* Payment Instructions */}
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 sm:p-6 mb-4 sm:mb-6">
                  <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-3 sm:mb-4">
                    Instruksi Pembayaran
                  </h3>
                  <div className="space-y-2 text-xs sm:text-sm text-blue-800">
                    <p>1. Klik tombol "Bayar Sekarang" di bawah</p>
                    <p>2. Dompet Anda akan terbuka untuk konfirmasi</p>
                    <p>3. Konfirmasi transaksi di dompet Anda</p>
                    <p>4. Dana akan disimpan dalam escrow smart contract</p>
                    <p>5. Setelah pembayaran berhasil, produk akan tersimpan di dashboard pembeli</p>
                  </div>
                </div>
              </>
            )}
          </div>
        );

      case 3:
        return (
          <div>
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
              <h3 className="text-lg font-semibold text-blue-900 mb-2">
                💳 Pembayaran dengan Dompet Digital
              </h3>
              <p className="text-sm text-blue-700">
                Silakan hubungkan dompet MetaMask Anda dan konfirmasi pembayaran untuk menyelesaikan transaksi.
              </p>
            </div>
            
            <PembelianKontrakPintar
              produk={produk}
              onSuccess={handlePaymentSuccess}
              onCancel={handlePaymentCancel}
            />
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-2 sm:p-4">
      <div className="bg-white rounded-lg max-w-2xl w-full max-h-[95vh] sm:max-h-[90vh] overflow-y-auto">
        <div className="p-4 sm:p-6">
          {/* Header */}
          <div className="flex justify-between items-center mb-4 sm:mb-6">
            <div>
              <h2 className="text-lg sm:text-2xl font-bold text-gray-900">
                {currentStep === 1 ? 'Konfirmasi Pembelian' :
                 currentStep === 2 ? 'Pembayaran' :
                 'Memproses Pembayaran'}
              </h2>
            </div>
            <button
              onClick={onCancel}
              className="text-gray-400 hover:text-gray-600 p-1"
              disabled={currentStep === 3 && isProcessing}
            >
              <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Step Indicator */}
          <StepIndicator />

          {/* Step Content */}
          {renderStepContent()}

          {/* Action Buttons - Hanya tampilkan untuk step 1 dan 2 */}
          {currentStep !== 3 && (
            <div className="flex flex-col sm:flex-row space-y-3 sm:space-y-0 sm:space-x-4 mt-6">
              {/* Cancel Button */}
              {!isExpired && (
                <button
                  onClick={onCancel}
                  className="w-full sm:flex-1 bg-gray-300 text-gray-700 py-3 px-4 sm:px-6 rounded-lg hover:bg-gray-400 transition-colors text-sm sm:text-base"
                >
                  Batal
                </button>
              )}

              {/* Next/Action Button */}
              {currentStep === 1 && (
                <button
                  onClick={handleNextStep}
                  disabled={!agreed || !sellerWalletAddress}
                  className="w-full sm:flex-1 bg-primary-600 text-white py-3 px-4 sm:px-6 rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center space-x-2 text-sm sm:text-base"
                >
                  <span>Lanjut ke Pembayaran</span>
                  <ArrowRightIcon className="h-4 w-4" />
                </button>
              )}

              {currentStep === 2 && !isExpired && (
                <button
                  onClick={handleNextStep}
                  disabled={isProcessing}
                  className="w-full sm:flex-1 bg-green-600 text-white py-3 px-4 sm:px-6 rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center space-x-2 text-sm sm:text-base"
                >
                  <CurrencyDollarIcon className="h-4 w-4 sm:h-5 sm:w-5" />
                  <span>{isProcessing ? 'Memproses...' : 'Bayar Sekarang'}</span>
                </button>
              )}

              {isExpired && (
                <button
                  onClick={onCancel}
                  className="w-full bg-red-600 text-white py-3 px-4 sm:px-6 rounded-lg hover:bg-red-700 transition-colors text-sm sm:text-base"
                >
                  Tutup Modal
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default TransactionDetailModal;