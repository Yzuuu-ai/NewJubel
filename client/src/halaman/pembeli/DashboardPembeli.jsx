import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../konteks/AuthContext';
import { useWallet } from '../../konteks/WalletContext';
import { transaksiAPI, apiService } from '../../layanan/api';
import { useDashboardUpdates } from '../../hooks/useRealTimeUpdates';
import { accountDataHelper } from '../../utils/accountDataHelper';
import ModalLihatAkun from '../../komponen/ModalLihatAkun';
import ModalTerimaAkun from '../../komponen/ModalTerimaAkun';
import ModalSengketa from '../../komponen/ModalSengketa';
import ModalDetailTransaksi from '../../komponen/ModalDetailTransaksi';
import PaymentTimer from '../../komponen/PaymentTimer';
import PembelianKontrakPintar from '../../komponen/PembelianKontrakPintar';
import transactionExpiryManager from '../../utils/transactionExpiry';
import toast from 'react-hot-toast';
import {
  ShoppingBagIcon,
  ClockIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  EyeIcon,
  ArrowPathIcon,
  BanknotesIcon,
  DocumentTextIcon,
  ShieldCheckIcon
} from '@heroicons/react/24/outline';

const DashboardPembeli = () => {
  const [transaksi, setTransaksi] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filter, setFilter] = useState('all');
  const [lastRefresh, setLastRefresh] = useState(new Date());
  const [refreshing, setRefreshing] = useState(false);
  const [showLihatAkunModal, setShowLihatAkunModal] = useState(false);
  const [showTerimaAkunModal, setShowTerimaAkunModal] = useState(false);
  const [showSengketaModal, setShowSengketaModal] = useState(false);
  const [showDetailTransaksiModal, setShowDetailTransaksiModal] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [selectedTransaksi, setSelectedTransaksi] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);
  
  const { user, isAuthenticated, loading: authLoading } = useAuth();
  const { isConnected, walletAddress } = useWallet();
  const navigate = useNavigate();
  
  // Real-time updates hook
  const { triggerUpdate } = useDashboardUpdates((source) => {
    fetchTransaksi(false); // Refresh tanpa loading indicator
    toast.success('Data transaksi diperbarui', { duration: 2000 });
  });

  // Setup transaction expiry manager
  useEffect(() => {
    const handleExpiredTransaction = (event, expiredTransaksi) => {
      console.log('🔄 Transaction expired:', expiredTransaksi);
      // Refresh data setelah transaksi expired
      fetchTransaksi(false);
    };

    const handleTransactionCreated = (event) => {
      console.log('🔄 Transaction created:', event.detail);
      // Refresh data setelah transaksi dibuat
      fetchTransaksi(false);
      toast.success('Transaksi berhasil dibuat! Timer 15 menit dimulai.');
    };

    // Add listener untuk expired transactions
    transactionExpiryManager.addListener(handleExpiredTransaction);
    
    // Add listener untuk transaction created
    window.addEventListener('transaction-created', handleTransactionCreated);

    // Cleanup
    return () => {
      transactionExpiryManager.removeListener(handleExpiredTransaction);
      transactionExpiryManager.stopAll();
      window.removeEventListener('transaction-created', handleTransactionCreated);
    };
  }, []);

  // Fetch data setelah auth selesai
  useEffect(() => {
    if (authLoading) return;
    if (!isAuthenticated || !user) {
      navigate('/masuk');
      return;
    }
    fetchTransaksi();
  }, [isAuthenticated, user, authLoading, filter, navigate]);

  const fetchTransaksi = useCallback(async (showLoading = true) => {
    try {
      if (showLoading) {
        setLoading(true);
      } else {
        setRefreshing(true);
      }
      setError(null);
      
      if (!user?.id) {
        throw new Error('User ID tidak ditemukan');
      }
      
      let response;
      try {
        // Coba endpoint utama
        response = await transaksiAPI.getTransaksiSaya({
          role: 'pembeli',
          status: filter === 'all' ? undefined : filter,
          page: 1,
          limit: 50,
          timestamp: Date.now()
        });
      } catch (primaryError) {
        console.warn('Endpoint utama gagal, mencoba alternatif...', primaryError.message);
        // Fallback ke endpoint alternatif
        response = await transaksiAPI.getTransaksiUser({
          role: 'pembeli',
          status: filter === 'all' ? undefined : filter,
          page: 1,
          limit: 50,
          timestamp: Date.now()
        });
      }

      // Handle response
      let transaksiData = [];
      if (response.data?.sukses) {
        if (response.data.data?.transaksi) {
          transaksiData = response.data.data.transaksi;
        } else if (Array.isArray(response.data.data)) {
          transaksiData = response.data.data;
        }
      } else if (Array.isArray(response.data)) {
        transaksiData = response.data;
      }
      
      // Filter out GAGAL transactions from all views
      // Keep MENUNGGU_PEMBAYARAN only when specifically filtered or in 'all' view for buyer dashboard
      let filteredTransaksi = transaksiData;
      if (filter === 'all') {
        // In 'all' view, exclude GAGAL but keep MENUNGGU_PEMBAYARAN for buyer dashboard functionality
        filteredTransaksi = transaksiData.filter(t => t.status !== 'GAGAL');
      } else {
        // In specific filter views, show all matching transactions including MENUNGGU_PEMBAYARAN if filtered
        filteredTransaksi = transaksiData.filter(t => t.status !== 'GAGAL');
      }
      
      setTransaksi(filteredTransaksi);
      setLastRefresh(new Date());

      // Start monitoring transaksi dengan status MENUNGGU_PEMBAYARAN
      const pendingTransactions = transaksiData.filter(t => t.status === 'MENUNGGU_PEMBAYARAN');
      if (pendingTransactions.length > 0) {
        console.log(`⏰ Starting monitoring for ${pendingTransactions.length} pending transactions`);
        transactionExpiryManager.startMonitoringMultiple(pendingTransactions);
      }

    } catch (error) {
      console.error('Error fetching transaksi:', error);
      
      let errorMessage = 'Gagal memuat transaksi';
      if (error.response?.status === 401) {
        localStorage.removeItem('authToken');
        localStorage.removeItem('user');
        navigate('/masuk');
        return;
      } else if (error.response?.status === 500) {
        errorMessage = 'Server bermasalah. Silakan coba lagi nanti.';
      } else if (error.response?.status === 404) {
        errorMessage = 'Endpoint tidak ditemukan. Hubungi admin.';
      } else if (error.code === 'ERR_NETWORK') {
        errorMessage = 'Koneksi ke server bermasalah.';
      } else if (error.response?.data?.pesan) {
        errorMessage = error.response.data.pesan;
        if (errorMessage.toLowerCase().includes('token tidak valid')) {
          localStorage.removeItem('authToken');
          localStorage.removeItem('user');
          navigate('/masuk');
          return;
        }
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      setError(errorMessage);
      
      if (transaksi.length === 0) {
        setTransaksi([]);
      }
    } finally {
      if (showLoading) {
        setLoading(false);
      } else {
        setRefreshing(false);
      }
    }
  }, [filter, user, transaksi.length, navigate]);

  // Manual refresh handler
  const handleRefresh = async () => {
    await fetchTransaksi(false);
    toast.success('Data transaksi diperbarui');
  };

  // Handle payment expired
  const handlePaymentExpired = async (expiredTransaksi) => {
    try {
      console.log('⏰ Handling expired transaction:', expiredTransaksi.id);
      
      // Stop monitoring untuk transaksi ini
      transactionExpiryManager.stopMonitoring(expiredTransaksi.id);
      
      // Refresh data untuk mendapatkan status terbaru
      await fetchTransaksi(false);
      
      toast.error(`Waktu pembayaran untuk ${expiredTransaksi.produk?.judulProduk} telah habis. Produk dikembalikan ke market.`);
      
      // Broadcast event untuk refresh marketplace
      window.dispatchEvent(new CustomEvent('transaction-expired', { 
        detail: { 
          transaksiId: expiredTransaksi.id,
          produkId: expiredTransaksi.produkId,
          timestamp: Date.now()
        } 
      }));

    } catch (error) {
      console.error('Error handling expired payment:', error);
    }
  };

  // Handle payment
  const handlePayment = (transaksi) => {
    // Validasi wallet connected
    if (!isConnected) {
      toast.error('Silakan connect wallet di navbar terlebih dahulu');
      return;
    }
    
    // Validasi wallet match
    if (walletAddress?.toLowerCase() !== user.walletAddress?.toLowerCase()) {
      toast.error('Wallet yang terhubung tidak sesuai dengan akun Anda');
      return;
    }

    setSelectedTransaksi(transaksi);
    setShowPaymentModal(true);
  };

  // Handle payment success
  const handlePaymentSuccess = (result) => {
    toast.success('Pembayaran berhasil! Transaksi telah dibuat di blockchain.');
    setShowPaymentModal(false);
    setSelectedTransaksi(null);
    
    // Stop monitoring untuk transaksi ini karena sudah dibayar
    if (selectedTransaksi) {
      transactionExpiryManager.stopMonitoring(selectedTransaksi.id);
    }
    
    // Refresh data
    fetchTransaksi(false);
  };

  // Handle payment cancel
  const handlePaymentCancel = () => {
    setShowPaymentModal(false);
    setSelectedTransaksi(null);
  };

  // Format date
  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('id-ID', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStatusBadge = (status) => {
    const statusConfig = {
      'MENUNGGU_PEMBAYARAN': { 
        color: 'bg-yellow-100 text-yellow-800', 
        text: 'Menunggu Pembayaran',
        icon: ClockIcon
      },
      'DIBAYAR_SMARTCONTRACT': { 
        color: 'bg-blue-100 text-blue-800', 
        text: 'Pembayaran Berhasil',
        icon: BanknotesIcon
      },
      'DIKIRIM': { 
        color: 'bg-purple-100 text-purple-800', 
        text: 'Akun Dikirim',
        icon: ShoppingBagIcon
      },
      'DIKONFIRMASI_PEMBELI': { 
        color: 'bg-green-100 text-green-800', 
        text: 'Dikonfirmasi',
        icon: CheckCircleIcon
      },
      'SELESAI': { 
        color: 'bg-green-100 text-green-800', 
        text: 'Selesai',
        icon: CheckCircleIcon
      },
      'SENGKETA': { 
        color: 'bg-red-100 text-red-800', 
        text: 'Sengketa',
        icon: ExclamationTriangleIcon
      },
      'GAGAL': { 
        color: 'bg-gray-100 text-gray-800', 
        text: 'Gagal',
        icon: ExclamationTriangleIcon
      },
      'REFUNDED': { 
        color: 'bg-blue-100 text-blue-800', 
        text: 'Refund',
        icon: CheckCircleIcon
      }
    };
    
    const config = statusConfig[status] || { 
      color: 'bg-gray-100 text-gray-800', 
      text: status,
      icon: ClockIcon
    };
    
    const badgeClass = `inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${config.color}`;
    return (
      <span className={badgeClass}>
        <config.icon className="h-3 w-3 mr-1" />
        {config.text}
      </span>
    );
  };

  const handleDetailClick = (transaksi) => {
    setSelectedTransaksi(transaksi);
    setShowDetailTransaksiModal(true);
  };

  const handleLihatAkun = (transaksi) => {
    setSelectedTransaksi(transaksi);
    setShowLihatAkunModal(true);
  };

  const handleTerimaAkun = (transaksi) => {
    setSelectedTransaksi(transaksi);
    setShowTerimaAkunModal(true);
  };

  const handleKonfirmasiPenerimaan = async () => {
    if (!selectedTransaksi) return;
    try {
      setActionLoading(true);
      await transaksiAPI.konfirmasiPenerimaan(selectedTransaksi.id);
      await fetchTransaksi(false);
      setShowTerimaAkunModal(false);
      setSelectedTransaksi(null);
      toast.success('Penerimaan akun berhasil dikonfirmasi!');
    } catch (error) {
      console.error('Error konfirmasi penerimaan:', error);
      toast.error('Gagal konfirmasi penerimaan: ' + error.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleSengketa = async (sengketaData) => {
    if (!selectedTransaksi) return;
    try {
      setActionLoading(true);
      const formattedData = {
        alasan: sengketaData.deskripsi || sengketaData.alasan,
        bukti: sengketaData.bukti || null
      };
      
      if (!formattedData.alasan || formattedData.alasan.length < 20) {
        toast.error('Alasan sengketa minimal 20 karakter');
        return;
      }
      
      await transaksiAPI.buatSengketa(selectedTransaksi.id, formattedData);
      await fetchTransaksi(false);
      setShowSengketaModal(false);
      setSelectedTransaksi(null);
      toast.success('Sengketa berhasil dilaporkan!');
    } catch (error) {
      console.error('Error buat sengketa:', error);
      const errorMessage = error.response?.data?.pesan || error.message;
      toast.error('Gagal membuat sengketa: ' + errorMessage);
    } finally {
      setActionLoading(false);
    }
  };

  const handleBuatSengketa = (transaksi) => {
    setSelectedTransaksi(transaksi);
    setShowSengketaModal(true);
  };

  const canCreateDispute = (transaksi) => {
    return transaksi.status === 'DIKIRIM' && 
           transaksi.status !== 'SENGKETA' &&
           !transaksi.sengketa;
  };

  const getDisputeStatusInfo = (transaksi) => {
    if (transaksi.status === 'SENGKETA') {
      return { message: 'Sengketa sedang diproses admin' };
    }
    if (transaksi.status === 'DIMENANGKAN_PEMBELI') {
      return { message: 'Sengketa dimenangkan - Dana dikembalikan' };
    }
    if (transaksi.status === 'DIMENANGKAN_PENJUAL') {
      return { message: 'Sengketa dimenangkan penjual' };
    }
    return { message: null };
  };

  // Loading state untuk auth
  if (authLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Memuat dashboard...</p>
        </div>
      </div>
    );
  }

  // Redirect to login if not authenticated
  if (!isAuthenticated || !user) {
    navigate('/masuk');
    return null;
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Memuat transaksi...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-4 sm:py-8">
      <div className="max-w-[90%] mx-auto px-2 sm:px-4 lg:px-8">
        {/* Header Card */}
        <div className="bg-white rounded-lg shadow-sm mb-4 sm:mb-6">
          <div className="px-4 sm:px-6 py-4 border-b border-gray-200">
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center space-y-3 sm:space-y-0">
              <div>
                <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Dashboard Pembeli</h1>
                <p className="text-sm text-gray-600 mt-1">
                  Kelola transaksi pembelian Anda dengan timer pembayaran 15 menit
                </p>
              </div>
              <div className="flex flex-col sm:text-right">
                <button
                  onClick={handleRefresh}
                  disabled={loading || refreshing}
                  className="inline-flex items-center justify-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
                >
                  <ArrowPathIcon className={`w-4 h-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
                  {refreshing ? 'Memperbarui...' : 'Perbarui'}
                </button>
                <p className="text-xs text-gray-500 mt-1 text-center sm:text-right">
                  Terakhir diperbarui: {lastRefresh.toLocaleTimeString('id-ID')}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Dashboard Content Card */}
        <div className="bg-white rounded-lg shadow-sm">

          {/* Content */}
          <div className="p-6">
            {/* Error Alert */}
            {error && (
              <div className="mt-4 bg-red-50 border border-red-200 rounded-md p-4">
                <div className="flex">
                  <div className="flex-shrink-0">
                    <svg className="h-5 w-5 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                    </svg>
                  </div>
                  <div className="ml-3">
                    <h3 className="text-sm font-medium text-red-800">
                      Gagal memuat transaksi
                    </h3>
                    <div className="mt-2 text-sm text-red-700">
                      <p>{error}</p>
                    </div>
                    <div className="mt-4 space-x-2">
                      <button
                        onClick={() => fetchTransaksi(true)}
                        className="bg-red-100 px-3 py-2 rounded-md text-sm font-medium text-red-800 hover:bg-red-200"
                      >
                        Coba Lagi
                      </button>
                      <button
                        onClick={() => {
                          setError(null);
                          setTransaksi([]);
                          fetchTransaksi(true);
                        }}
                        className="bg-blue-100 px-3 py-2 rounded-md text-sm font-medium text-blue-800 hover:bg-blue-200"
                      >
                        Reset & Muat Ulang
                      </button>
                      {error && error.toLowerCase().includes('token') && (
                        <button
                          onClick={() => navigate('/masuk')}
                          className="bg-green-100 px-3 py-2 rounded-md text-sm font-medium text-green-800 hover:bg-green-200"
                        >
                          Login Ulang
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}
            
            {/* Transaksi List Header */}
            <div className="mb-4">
              <h2 className="text-lg font-semibold text-gray-900">Riwayat Transaksi</h2>
            </div>

            {/* Transaksi Content */}
            {transaksi.length === 0 ? (
              <div className="px-6 py-12 text-center">
                <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                </svg>
                <h3 className="mt-2 text-sm font-medium text-gray-900">
                  {error ? 'Tidak dapat memuat transaksi' : 'Belum ada transaksi'}
                </h3>
                <p className="mt-1 text-sm text-gray-500">
                  {error 
                    ? 'Terjadi masalah saat memuat data. Silakan coba lagi.' 
                    : 'Mulai berbelanja untuk melihat transaksi di sini.'
                  }
                </p>
                <div className="mt-6">
                  {error ? (
                    <div className="space-x-2">
                      <button
                        onClick={() => fetchTransaksi(true)}
                        className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-red-600 hover:bg-red-700"
                      >
                        Coba Lagi
                      </button>
                      <button
                        onClick={() => navigate('/masuk')}
                        className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
                      >
                        Login Ulang
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => navigate('/produk')}
                      className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
                    >
                      Mulai Belanja
                    </button>
                  )}
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                {transaksi.map((item) => (
                  <div key={item.id} className="bg-gray-50 rounded-lg p-3 hover:bg-gray-100 transition-colors">
                    <div className="flex flex-col space-y-2">
                      {/* Product Info */}
                      <div className="flex items-start space-x-3">
                        <img
                          src={item.produk?.gambar || '/placeholder-game.jpg'}
                          alt={item.produk?.judulProduk || 'Produk'}
                          className="w-12 h-12 sm:w-16 sm:h-16 rounded-lg object-cover flex-shrink-0"
                        />
                        <div className="flex-1 min-w-0">
                          <h3 className="text-sm font-medium text-gray-900 line-clamp-2">
                            {item.produk?.judulProduk || 'Produk Tidak Ditemukan'}
                          </h3>
                          <p className="text-xs text-gray-500">
                            {item.produk?.namaGame || 'Game'}
                          </p>
                          <p className="text-xs text-gray-500">
                            Kode: {item.kodeTransaksi || item.id}
                          </p>
                          <div className="flex items-center space-x-2 mt-1">
                            <p className="text-sm font-semibold text-blue-600">
                              {item.escrowAmount ? `${parseFloat(item.escrowAmount).toFixed(4)} ETH` :
                               item.produk?.hargaEth ? `${item.produk.hargaEth} ETH` : 'N/A'}
                            </p>
                          </div>
                        </div>
                      </div>
                      
                      {/* Status and Date */}
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-1 sm:space-y-0">
                        <div className="flex items-center space-x-2">
                          {getStatusBadge(item.status)}
                        </div>
                        <div className="text-left sm:text-right">
                          <p className="text-xs text-gray-500">
                            {formatDate(item.dibuatPada)}
                          </p>
                          {item.escrowId && (
                            <p className="text-xs text-blue-600">
                              Escrow ID: {item.escrowId}
                            </p>
                          )}
                        </div>
                      </div>

                      {/* Payment Timer - Hanya untuk MENUNGGU_PEMBAYARAN */}
                      {item.status === 'MENUNGGU_PEMBAYARAN' && (
                        <PaymentTimer
                          transaksi={item}
                          onExpired={handlePaymentExpired}
                          onPayment={handlePayment}
                        />
                      )}
                      
                      {/* Action Buttons */}
                      <div className="flex flex-wrap gap-2">
                        {/* Tombol Lihat Akun */}
                        {(() => {
                          const hasData = accountDataHelper.hasAccountData(item);
                          const validStatus = ['DIKIRIM', 'DIKONFIRMASI_PEMBELI', 'SELESAI'].includes(item.status);
                          
                          return hasData && validStatus && (
                            <button
                              onClick={() => handleLihatAkun(item)}
                              className="flex-1 sm:flex-none inline-flex items-center justify-center px-3 py-2 border border-green-300 text-xs font-medium rounded-md text-green-700 bg-green-50 hover:bg-green-100"
                            >
                              <DocumentTextIcon className="h-4 w-4 mr-1" />
                              Lihat Akun
                            </button>
                          );
                        })()}
                        
                        {/* Tombol Konfirmasi */}
                        {item.status === 'DIKIRIM' && (
                          <button
                            onClick={() => handleTerimaAkun(item)}
                            className="flex-1 sm:flex-none inline-flex items-center justify-center px-3 py-2 border border-transparent text-xs font-medium rounded-md text-white bg-green-600 hover:bg-green-700"
                          >
                            <CheckCircleIcon className="h-4 w-4 mr-1" />
                            Konfirmasi
                          </button>
                        )}
                        
                        {/* Tombol Buat Sengketa */}
                        {canCreateDispute(item) && (
                          <button
                            onClick={() => handleBuatSengketa(item)}
                            className="flex-1 sm:flex-none inline-flex items-center justify-center px-3 py-2 border border-red-300 text-xs font-medium rounded-md text-red-700 bg-red-50 hover:bg-red-100"
                          >
                            <ExclamationTriangleIcon className="h-4 w-4 mr-1" />
                            Sengketa
                          </button>
                        )}
                        
                        {/* Info Status */}
                        {item.status === 'DIKONFIRMASI_PEMBELI' && (
                          <div className="flex-1 sm:flex-none inline-flex items-center justify-center px-3 py-2 border border-blue-300 text-xs font-medium rounded-md text-blue-700 bg-blue-50">
                            <ShieldCheckIcon className="h-4 w-4 mr-1" />
                            Dana Ditahan
                          </div>
                        )}
                        
                        {getDisputeStatusInfo(item).message && (
                          <div className="flex-1 sm:flex-none inline-flex items-center justify-center px-3 py-2 border border-orange-300 text-xs font-medium rounded-md text-orange-700 bg-orange-50" title={getDisputeStatusInfo(item).message}>
                            <ShieldCheckIcon className="h-4 w-4 mr-1" />
                            Sengketa Aktif
                          </div>
                        )}
                        
                        {/* Tombol Detail */}
                        <button
                          onClick={() => handleDetailClick(item)}
                          className="flex-1 sm:flex-none inline-flex items-center justify-center px-3 py-2 border border-gray-300 text-xs font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
                        >
                          <EyeIcon className="h-4 w-4 mr-1" />
                          Detail
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
        
        {/* Modal Lihat Akun */}
        <ModalLihatAkun
          isOpen={showLihatAkunModal}
          onClose={() => {
            setShowLihatAkunModal(false);
            setSelectedTransaksi(null);
          }}
          transaksi={selectedTransaksi}
        />
        
        {/* Modal Terima Akun */}
        <ModalTerimaAkun
          isOpen={showTerimaAkunModal}
          onClose={() => {
            setShowTerimaAkunModal(false);
            setSelectedTransaksi(null);
          }}
          onConfirm={handleKonfirmasiPenerimaan}
          onDispute={handleSengketa}
          loading={actionLoading}
          transaksi={selectedTransaksi}
        />
        
        {/* Modal Sengketa */}
        <ModalSengketa
          isOpen={showSengketaModal}
          onClose={() => {
            setShowSengketaModal(false);
            setSelectedTransaksi(null);
          }}
          onSubmit={handleSengketa}
          loading={actionLoading}
          transaksi={selectedTransaksi}
        />

        {/* Modal Detail Transaksi */}
        <ModalDetailTransaksi
          isOpen={showDetailTransaksiModal}
          onClose={() => {
            setShowDetailTransaksiModal(false);
            setSelectedTransaksi(null);
          }}
          transaksi={selectedTransaksi}
        />

        {/* Modal Pembayaran */}
        {showPaymentModal && selectedTransaksi && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg max-w-md w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6">
                <div className="flex justify-between items-center mb-6">
                  <h3 className="text-xl font-semibold text-gray-900">
                    Pembayaran Transaksi
                  </h3>
                  <button
                    onClick={handlePaymentCancel}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
                <PembelianKontrakPintar
                  produk={selectedTransaksi.produk}
                  onSuccess={handlePaymentSuccess}
                  onCancel={handlePaymentCancel}
                />
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default DashboardPembeli;
