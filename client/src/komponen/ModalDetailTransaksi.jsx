import React, { useEffect, useState } from 'react';
import { useAuth } from '../konteks/AuthContext';
import { RoleBasedTransaksiActions } from './KomponenSengketaBerdasarkanRole';
import EvidenceImageGallery from './EvidenceImageGallery';
import {
  XMarkIcon,
  ClockIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  CurrencyDollarIcon,
  ShoppingBagIcon,
  DocumentTextIcon,
  LinkIcon,
  ArrowPathIcon,
  EyeIcon,
  KeyIcon,
  AtSymbolIcon,
  UserIcon,
  EyeSlashIcon,
  ClipboardDocumentIcon,
  ShieldCheckIcon,
  InformationCircleIcon,
  BanknotesIcon,
  TruckIcon,
  HandThumbUpIcon
} from '@heroicons/react/24/outline';

const ModalDetailTransaksi = ({ isOpen, onClose, transaksi, onRefresh }) => {
  const { user } = useAuth();
  const [timeLeft, setTimeLeft] = useState(null);
  const [isExpired, setIsExpired] = useState(false);
  const [showAccountData, setShowAccountData] = useState(false);
  const [visibleFields, setVisibleFields] = useState({});
  const [expandedSteps, setExpandedSteps] = useState({});

  // Handle success callback for role-based actions
  const handleActionSuccess = () => {
    if (onRefresh) {
      onRefresh();
    }
  };

  // Timer untuk pembayaran (15 menit)
  useEffect(() => {
    if (!transaksi || transaksi.status !== 'MENUNGGU_PEMBAYARAN' || !transaksi.dibuatPada) {
      setTimeLeft(null);
      setIsExpired(false);
      return;
    }

    try {
      const createdAt = new Date(transaksi.dibuatPada);
      if (isNaN(createdAt.getTime())) {
        setTimeLeft(null);
        setIsExpired(false);
        return;
      }
      
      const expiryTime = new Date(createdAt.getTime() + 15 * 60 * 1000); // 15 menit

      const updateTimer = () => {
        const now = new Date();
        const difference = expiryTime.getTime() - now.getTime();

        if (difference <= 0) {
          setTimeLeft(null);
          setIsExpired(true);
          return;
        }

        const minutes = Math.floor(difference / (1000 * 60));
        const seconds = Math.floor((difference % (1000 * 60)) / 1000);
        
        setTimeLeft({ minutes, seconds });
        setIsExpired(false);
      };

      updateTimer();
      const interval = setInterval(updateTimer, 1000);

      return () => {
        clearInterval(interval);
      };
    } catch (error) {
      setTimeLeft(null);
      setIsExpired(false);
    }
  }, [transaksi]);

  // Format currency
  const formatCurrency = (amount) => {
    if (!amount) return 'Rp 0';
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  // Generate Etherscan link
  const getEtherscanLink = (hash) => {
    if (!hash) return null;
    const baseUrl = process.env.REACT_APP_ETHERSCAN_BASE_URL || 'https://sepolia.etherscan.io/tx/';
    return `${baseUrl}${hash}`;
  };

  // Check if account data exists
  const hasAccountData = (transaksi) => {
    return transaksi?.accountData && (
      transaksi.accountData.username || 
      transaksi.accountData.password || 
      transaksi.accountData.email || 
      transaksi.accountData.loginId
    );
  };

  // Copy to clipboard function
  const copyToClipboard = async (text, fieldName) => {
    try {
      await navigator.clipboard.writeText(text);
      // You could add a toast notification here
    } catch (err) {
      console.error('Failed to copy: ', err);
    }
  };

  // Toggle field visibility
  const toggleFieldVisibility = (fieldName) => {
    setVisibleFields(prev => ({
      ...prev,
      [fieldName]: !prev[fieldName]
    }));
  };

  // Toggle step expansion
  const toggleStepExpansion = (stepId) => {
    setExpandedSteps(prev => ({
      ...prev,
      [stepId]: !prev[stepId]
    }));
  };

  // Enhanced transaction steps with better flow and details
  const getTransactionSteps = () => {
    if (!transaksi) return [];
    
    const steps = [
      {
        id: 'created',
        title: 'Transaksi Dibuat',
        description: 'Transaksi berhasil dibuat dan menunggu pembayaran',
        status: 'completed',
        timestamp: transaksi.dibuatPada || transaksi.createdAt,
        icon: DocumentTextIcon,
        userRole: 'both',
        details: {
          productName: transaksi.produk?.judulProduk,
          gameName: transaksi.produk?.namaGame,
          price: transaksi.produk?.harga,
          priceEth: transaksi.escrowAmount || transaksi.produk?.hargaEth
        }
      }
    ];

    // Payment step - only show if payment has been made
    if (transaksi.status && transaksi.status !== 'MENUNGGU_PEMBAYARAN') {
      steps.push({
        id: 'paid',
        title: 'Pembayaran Berhasil',
        description: 'Pembayaran telah dikonfirmasi di blockchain',
        status: 'completed',
        timestamp: transaksi.waktuBayar || transaksi.updatedAt,
        icon: BanknotesIcon,
        hash: transaksi.smartContractTxHash,
        userRole: 'both',
        escrowInfo: {
          amount: transaksi.escrowAmount || transaksi.produk?.hargaEth,
          escrowId: transaksi.escrowId
        }
      });
    }

    // Account sent step
    if (transaksi.status && ['DIKIRIM', 'DIKONFIRMASI_PEMBELI', 'SELESAI', 'SENGKETA'].includes(transaksi.status)) {
      steps.push({
        id: 'sent',
        title: 'Akun Dikirim',
        description: 'Penjual telah mengirim data akun game',
        status: 'completed',
        timestamp: transaksi.waktuKirim || transaksi.updatedAt,
        icon: TruckIcon,
        accountData: hasAccountData(transaksi),
        userRole: 'both',
        hasEvidence: !!transaksi.deskripsiBukti,
        evidenceDescription: transaksi.deskripsiBukti
      });
    }

    // Buyer confirmation step
    if (transaksi.status && ['DIKONFIRMASI_PEMBELI', 'SELESAI'].includes(transaksi.status)) {
      steps.push({
        id: 'confirmed',
        title: 'Dikonfirmasi Pembeli',
        description: 'Pembeli telah mengkonfirmasi penerimaan akun',
        status: 'completed',
        timestamp: transaksi.waktuKonfirmasi || transaksi.updatedAt,
        icon: HandThumbUpIcon,
        userRole: 'both'
      });
    }

    // Dispute step - can happen after account is sent
    if (transaksi.status === 'SENGKETA') {
      const disputeStep = {
        id: 'dispute',
        title: 'Sengketa Dilaporkan',
        description: 'Transaksi dalam proses penyelesaian sengketa',
        status: 'warning',
        timestamp: transaksi.sengketa?.dibuatPada || transaksi.updatedAt,
        icon: ExclamationTriangleIcon,
        disputeData: transaksi.sengketa,
        userRole: 'both'
      };
      
      // Insert dispute step after 'sent' step if it exists
      const sentIndex = steps.findIndex(step => step.id === 'sent');
      if (sentIndex !== -1) {
        steps.splice(sentIndex + 1, 0, disputeStep);
      } else {
        steps.push(disputeStep);
      }
    }

    // Final completion step
    if (transaksi.status === 'SELESAI') {
      steps.push({
        id: 'completed',
        title: 'Transaksi Selesai',
        description: 'Dana telah dilepas dari escrow ke penjual',
        status: 'completed',
        timestamp: transaksi.waktuSelesai || transaksi.updatedAt,
        icon: CheckCircleIcon,
        hash: transaksi.paymentToSellerTxHash || transaksi.adminReleaseTxHash,
        userRole: 'both',
        finalAmount: transaksi.escrowAmount || transaksi.produk?.hargaEth
      });
    }

    // Refund step (alternative ending)
    if (transaksi.status === 'REFUNDED' || transaksi.status === 'REFUND') {
      steps.push({
        id: 'refunded',
        title: 'Dana Dikembalikan',
        description: 'Dana telah dikembalikan dari escrow ke pembeli',
        status: 'completed',
        timestamp: transaksi.adminRefundAt || transaksi.updatedAt,
        icon: ArrowPathIcon,
        hash: transaksi.adminRefundTxHash,
        userRole: 'both',
        refundReason: transaksi.adminRefundNote || 'Pengembalian dana oleh admin'
      });
    }

    // Cancelled/Expired step
    if (transaksi.status === 'DIBATALKAN' || transaksi.status === 'EXPIRED') {
      steps.push({
        id: 'cancelled',
        title: transaksi.status === 'EXPIRED' ? 'Transaksi Kedaluwarsa' : 'Transaksi Dibatalkan',
        description: transaksi.status === 'EXPIRED' 
          ? 'Waktu pembayaran telah habis, transaksi dibatalkan'
          : 'Transaksi dibatalkan sebelum pembayaran',
        status: 'cancelled',
        timestamp: transaksi.updatedAt,
        icon: XMarkIcon,
        userRole: 'both'
      });
    }

    return steps;
  };

  const steps = transaksi ? getTransactionSteps() : [];

  if (!isOpen || !transaksi) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black bg-opacity-50" onClick={onClose}></div>
      
      {/* Modal */}
      <div className="flex min-h-full items-center justify-center p-4">
        <div className="relative w-full max-w-5xl bg-white rounded-lg shadow-xl max-h-[90vh] overflow-y-auto">
          
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b bg-gray-50">
            <div>
              <h2 className="text-xl font-semibold text-gray-900">Detail Transaksi</h2>
              <p className="text-sm text-gray-600 mt-1">#{transaksi?.kodeTransaksi || 'N/A'}</p>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <XMarkIcon className="h-6 w-6" />
            </button>
          </div>

          {/* Content */}
          <div className="p-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              
              {/* Left Column - Transaction Info */}
              <div className="space-y-6">
                
                {/* Timer Display */}
                {transaksi?.status === 'MENUNGGU_PEMBAYARAN' && (
                  <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                    <h3 className="font-semibold text-yellow-800 mb-2 flex items-center">
                      <ClockIcon className="h-5 w-5 mr-2" />
                      Status Pembayaran
                    </h3>
                    {timeLeft && !isExpired ? (
                      <div className="text-yellow-700">
                        Sisa waktu pembayaran: <strong className="text-lg font-mono">
                          {String(timeLeft.minutes).padStart(2, '0')}:{String(timeLeft.seconds).padStart(2, '0')}
                        </strong>
                      </div>
                    ) : isExpired ? (
                      <div className="flex items-center gap-2 text-red-600">
                        <ExclamationTriangleIcon className="h-5 w-5" />
                        <span className="font-semibold">Waktu pembayaran telah habis</span>
                      </div>
                    ) : (
                      <div className="text-yellow-700">Memuat timer...</div>
                    )}
                  </div>
                )}

                {/* Product Info */}
                {transaksi?.produk && (
                  <div className="bg-gray-50 rounded-lg p-4">
                    <h3 className="font-semibold text-gray-900 mb-3">Informasi Produk</h3>
                    
                    <div className="flex items-start space-x-4 mb-4">
                      <img
                        src={transaksi?.produk?.gambar || '/placeholder-game.jpg'}
                        alt={transaksi?.produk?.judulProduk || 'Produk'}
                        className="w-20 h-20 rounded-lg object-cover border border-gray-200"
                      />
                      <div className="flex-1">
                        <h4 className="font-medium text-gray-900 text-lg">{transaksi?.produk?.judulProduk || 'Produk Tidak Ditemukan'}</h4>
                        <p className="text-sm text-gray-600 mb-2">{transaksi?.produk?.namaGame || 'Game'}</p>
                        <div className="mb-3">
                          <span className="text-lg font-semibold text-blue-600">
                            {transaksi?.escrowAmount ? `${parseFloat(transaksi.escrowAmount).toFixed(4)} ETH` :
                             transaksi?.produk?.hargaEth ? `${transaksi.produk.hargaEth} ETH` : 'N/A'}
                          </span>
                          {transaksi?.produk?.harga && (
                            <span className="text-sm text-gray-500 ml-2">
                              ≈ {formatCurrency(transaksi.produk.harga)}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    
                  </div>
                )}

                {/* Transaction Details */}
                <div className="bg-gray-50 rounded-lg p-4">
                  <h3 className="font-semibold text-gray-900 mb-3">Detail Transaksi</h3>
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Kode Transaksi:</span>
                      <span className="text-sm font-medium text-gray-900">{transaksi?.kodeTransaksi || 'N/A'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Status:</span>
                      <span className="text-sm font-medium text-gray-900">{transaksi?.status || 'N/A'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Dibuat:</span>
                      <span className="text-sm font-medium text-gray-900">
                        {transaksi?.dibuatPada ? new Date(transaksi.dibuatPada).toLocaleString('id-ID') : 'Tidak tersedia'}
                      </span>
                    </div>
                    {transaksi?.escrowId && (
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">Escrow ID:</span>
                        <span className="text-sm font-medium text-blue-600">#{transaksi.escrowId}</span>
                      </div>
                    )}
                    {transaksi?.pembeli && (
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">Pembeli:</span>
                        <span className="text-sm font-medium text-gray-900">{transaksi.pembeli?.nama || 'Anonim'}</span>
                      </div>
                    )}
                    {transaksi?.penjual && (
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">Penjual:</span>
                        <span className="text-sm font-medium text-gray-900">{transaksi.penjual?.nama || 'Anonim'}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Enhanced Dispute Information */}
                {transaksi?.status === 'SENGKETA' && transaksi?.sengketa && (
                  <div className="bg-red-50 rounded-lg border border-red-200 overflow-hidden">
                    <div className="bg-red-100 px-4 py-3 border-b border-red-200">
                      <h3 className="font-semibold text-red-900 flex items-center">
                        <ExclamationTriangleIcon className="h-5 w-5 mr-2" />
                        Informasi Sengketa
                      </h3>
                    </div>
                    
                    <div className="p-4 space-y-4">
                      <div className="grid grid-cols-1 gap-3">
                        <div className="flex justify-between items-center py-2 border-b border-red-100">
                          <span className="text-sm font-medium text-red-600">ID Sengketa:</span>
                          <span className="text-sm font-mono text-red-900 bg-red-100 px-2 py-1 rounded">
                            {transaksi.sengketa.id}
                          </span>
                        </div>
                        <div className="flex justify-between items-center py-2 border-b border-red-100">
                          <span className="text-sm font-medium text-red-600">Status:</span>
                          <span className="text-sm font-semibold text-red-900">
                            {transaksi.sengketa.status || 'DIPROSES'}
                          </span>
                        </div>
                        <div className="flex justify-between items-center py-2 border-b border-red-100">
                          <span className="text-sm font-medium text-red-600">Tanggal Dibuat:</span>
                          <span className="text-sm text-red-900">
                            {transaksi.sengketa.dibuatPada ? new Date(transaksi.sengketa.dibuatPada).toLocaleString('id-ID') : 'Tidak tersedia'}
                          </span>
                        </div>
                      </div>

                      {transaksi.sengketa.deskripsi && (
                        <div className="space-y-2">
                          <label className="text-sm font-medium text-red-600 block">Alasan Sengketa:</label>
                          <div className="bg-white border border-red-200 rounded-lg p-3">
                            <p className="text-sm text-red-800 leading-relaxed break-words">
                              {transaksi.sengketa.deskripsi}
                            </p>
                          </div>
                        </div>
                      )}

                      {transaksi.sengketa.pembeliBukti && (
                        <div className="space-y-2">
                          <label className="text-sm font-medium text-red-600 block">Bukti Pembeli:</label>
                          <div className="bg-white border border-red-200 rounded-lg p-3">
                            <EvidenceImageGallery 
                              evidenceData={transaksi.sengketa.pembeliBukti} 
                              label="Bukti Pembeli" 
                              size="medium" 
                              colorTheme="red" 
                              showThumbnails={true} 
                              thumbnailCount={5} 
                            />
                          </div>
                        </div>
                      )}

                      {transaksi.sengketa.penjualBukti ? (
                        <div className="space-y-2">
                          <label className="text-sm font-medium text-green-600 block">Pembelaan Penjual:</label>
                          <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                            <p className="text-sm text-green-800 leading-relaxed break-words mb-3">
                              {transaksi.sengketa.resolution && transaksi.sengketa.resolution.includes('[PEMBELAAN PENJUAL]') 
                                ? transaksi.sengketa.resolution.replace('[PEMBELAAN PENJUAL]', '').trim()
                                : 'Pembelaan telah dikirim'
                              }
                            </p>
                            {transaksi.sengketa.penjualBukti !== 'null' && transaksi.sengketa.penjualBukti.includes('http') && (
                              <EvidenceImageGallery 
                                evidenceData={transaksi.sengketa.penjualBukti} 
                                label="Bukti Pembelaan" 
                                size="medium" 
                                colorTheme="green" 
                                showThumbnails={true} 
                                thumbnailCount={5} 
                              />
                            )}
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          <label className="text-sm font-medium text-yellow-600 block">Status Pembelaan:</label>
                          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                            <div className="flex items-center">
                              <ClockIcon className="h-4 w-4 text-yellow-600 mr-2" />
                              <p className="text-sm text-yellow-800">
                                Menunggu pembelaan dari penjual
                              </p>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Account Data Display */}
                {hasAccountData(transaksi) && ['DIKIRIM', 'DIKONFIRMASI_PEMBELI', 'SELESAI'].includes(transaksi?.status) && (
                  <div className="bg-green-50 rounded-lg p-4 border border-green-200">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="font-semibold text-green-900 flex items-center text-sm">
                        <KeyIcon className="h-4 w-4 mr-2" />
                        Data Akun yang Diterima
                      </h3>
                      <button
                        onClick={() => setShowAccountData(!showAccountData)}
                        className="flex items-center text-xs text-green-600 hover:text-green-800 transition-colors"
                      >
                        {showAccountData ? (
                          <>
                            <EyeSlashIcon className="h-3 w-3 mr-1" />
                            Sembunyikan
                          </>
                        ) : (
                          <>
                            <EyeIcon className="h-3 w-3 mr-1" />
                            Lihat Data
                          </>
                        )}
                      </button>
                    </div>
                    
                    {showAccountData && (
                      <div className="space-y-2">
                        {transaksi?.accountData?.username && (
                          <div className="flex items-center justify-between bg-white p-2 rounded border">
                            <div className="flex items-center">
                              <UserIcon className="h-3 w-3 text-green-600 mr-2" />
                              <span className="text-xs text-gray-600 w-16">Username:</span>
                              <span className="font-mono text-sm">
                                {visibleFields.username ? transaksi.accountData.username : '••••••••'}
                              </span>
                            </div>
                            <div className="flex items-center space-x-1">
                              <button
                                onClick={() => toggleFieldVisibility('username')}
                                className="p-1 text-gray-400 hover:text-gray-600"
                              >
                                {visibleFields.username ? <EyeSlashIcon className="h-3 w-3" /> : <EyeIcon className="h-3 w-3" />}
                              </button>
                              <button
                                onClick={() => copyToClipboard(transaksi.accountData.username, 'username')}
                                className="p-1 text-gray-400 hover:text-gray-600"
                              >
                                <ClipboardDocumentIcon className="h-3 w-3" />
                              </button>
                            </div>
                          </div>
                        )}
                        
                        {transaksi?.accountData?.password && (
                          <div className="flex items-center justify-between bg-white p-2 rounded border">
                            <div className="flex items-center">
                              <KeyIcon className="h-3 w-3 text-green-600 mr-2" />
                              <span className="text-xs text-gray-600 w-16">Password:</span>
                              <span className="font-mono text-sm">
                                {visibleFields.password ? transaksi.accountData.password : '••••••••'}
                              </span>
                            </div>
                            <div className="flex items-center space-x-1">
                              <button
                                onClick={() => toggleFieldVisibility('password')}
                                className="p-1 text-gray-400 hover:text-gray-600"
                              >
                                {visibleFields.password ? <EyeSlashIcon className="h-3 w-3" /> : <EyeIcon className="h-3 w-3" />}
                              </button>
                              <button
                                onClick={() => copyToClipboard(transaksi.accountData.password, 'password')}
                                className="p-1 text-gray-400 hover:text-gray-600"
                              >
                                <ClipboardDocumentIcon className="h-3 w-3" />
                              </button>
                            </div>
                          </div>
                        )}
                        
                        {transaksi?.accountData?.email && (
                          <div className="flex items-center justify-between bg-white p-2 rounded border">
                            <div className="flex items-center">
                              <AtSymbolIcon className="h-3 w-3 text-green-600 mr-2" />
                              <span className="text-xs text-gray-600 w-16">Email:</span>
                              <span className="font-mono text-sm">
                                {visibleFields.email ? transaksi.accountData.email : '••••••••'}
                              </span>
                            </div>
                            <div className="flex items-center space-x-1">
                              <button
                                onClick={() => toggleFieldVisibility('email')}
                                className="p-1 text-gray-400 hover:text-gray-600"
                              >
                                {visibleFields.email ? <EyeSlashIcon className="h-3 w-3" /> : <EyeIcon className="h-3 w-3" />}
                              </button>
                              <button
                                onClick={() => copyToClipboard(transaksi.accountData.email, 'email')}
                                className="p-1 text-gray-400 hover:text-gray-600"
                              >
                                <ClipboardDocumentIcon className="h-3 w-3" />
                              </button>
                            </div>
                          </div>
                        )}
                        
                        {transaksi?.accountData?.loginId && (
                          <div className="flex items-center justify-between bg-white p-2 rounded border">
                            <div className="flex items-center">
                              <DocumentTextIcon className="h-3 w-3 text-green-600 mr-2" />
                              <span className="text-xs text-gray-600 w-16">Login ID:</span>
                              <span className="font-mono text-sm">
                                {visibleFields.loginId ? transaksi.accountData.loginId : '••••••••'}
                              </span>
                            </div>
                            <div className="flex items-center space-x-1">
                              <button
                                onClick={() => toggleFieldVisibility('loginId')}
                                className="p-1 text-gray-400 hover:text-gray-600"
                              >
                                {visibleFields.loginId ? <EyeSlashIcon className="h-3 w-3" /> : <EyeIcon className="h-3 w-3" />}
                              </button>
                              <button
                                onClick={() => copyToClipboard(transaksi.accountData.loginId, 'loginId')}
                                className="p-1 text-gray-400 hover:text-gray-600"
                              >
                                <ClipboardDocumentIcon className="h-3 w-3" />
                              </button>
                            </div>
                          </div>
                        )}
                        
                        {transaksi?.accountData?.catatan && (
                          <div className="bg-white p-2 rounded border">
                            <div className="flex items-center mb-1">
                              <DocumentTextIcon className="h-3 w-3 text-green-600 mr-2" />
                              <span className="text-xs text-gray-600">Catatan:</span>
                            </div>
                            <p className="text-xs text-gray-700 ml-5">
                              {transaksi.accountData.catatan}
                            </p>
                          </div>
                        )}
                      </div>
                    )}
                    
                    {!showAccountData && (
                      <p className="text-xs text-green-600 text-center py-2">
                        Klik "Lihat Data" untuk melihat informasi akun
                      </p>
                    )}
                  </div>
                )}

              </div>

              {/* Right Column - Enhanced Transaction Timeline */}
              <div>
                <h3 className="font-semibold text-gray-900 mb-4">Riwayat Transaksi</h3>
                <div className="relative">
                  {/* Continuous timeline line */}
                  <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-gray-200"></div>
                  
                  <div className="space-y-6">
                    {steps.map((step, index) => {
                      const Icon = step.icon;
                      const isExpanded = expandedSteps[step.id];
                      const hasExpandableContent = step.hash || step.accountData || step.disputeData || step.details;
                      
                      return (
                        <div key={step.id} className="relative">
                          <div className="flex items-start space-x-4">
                            {/* Timeline Icon */}
                            <div className={`relative z-10 flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center border-2 ${
                              step.status === 'completed' ? 'bg-green-100 text-green-600 border-green-200' :
                              step.status === 'warning' ? 'bg-red-100 text-red-600 border-red-200' :
                              step.status === 'cancelled' ? 'bg-gray-100 text-gray-400 border-gray-200' :
                              'bg-blue-100 text-blue-600 border-blue-200'
                            }`}>
                              <Icon className="h-4 w-4" />
                            </div>
                            
                            {/* Step Content */}
                            <div className="flex-1 min-w-0 pb-4">
                              {/* Step Header */}
                              <div className="flex items-center justify-between mb-2">
                                <h4 className="text-sm font-medium text-gray-900">{step.title}</h4>
                                {step.timestamp && (
                                  <span className="text-xs text-gray-500">
                                    {(() => {
                                      try {
                                        return new Date(step.timestamp).toLocaleString('id-ID');
                                      } catch (e) {
                                        return 'Tanggal tidak valid';
                                      }
                                    })()}
                                  </span>
                                )}
                              </div>
                              
                              {/* Step Description */}
                              <p className="text-sm text-gray-600 mb-3">{step.description}</p>
                              
                              {/* Action buttons for expandable content */}
                              {hasExpandableContent && (
                                <div className="flex flex-wrap gap-2 mb-3">
                                  {step.details && (
                                    <button
                                      onClick={() => toggleStepExpansion(`${step.id}-details`)}
                                      className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-blue-100 text-blue-800 hover:bg-blue-200 transition-colors"
                                    >
                                      <InformationCircleIcon className="h-3 w-3 mr-1" />
                                      {expandedSteps[`${step.id}-details`] ? 'Sembunyikan Detail' : 'Lihat Detail'}
                                    </button>
                                  )}
                                  
                                  {step.accountData && (
                                    <button
                                      onClick={() => toggleStepExpansion(`${step.id}-account`)}
                                      className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-green-100 text-green-800 hover:bg-green-200 transition-colors"
                                    >
                                      <KeyIcon className="h-3 w-3 mr-1" />
                                      {expandedSteps[`${step.id}-account`] ? 'Sembunyikan Akun' : 'Lihat Akun'}
                                    </button>
                                  )}
                                  
                                  {step.disputeData && (
                                    <button
                                      onClick={() => toggleStepExpansion(`${step.id}-dispute`)}
                                      className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-red-100 text-red-800 hover:bg-red-200 transition-colors"
                                    >
                                      <ShieldCheckIcon className="h-3 w-3 mr-1" />
                                      {expandedSteps[`${step.id}-dispute`] ? 'Sembunyikan Detail' : 'Detail Sengketa'}
                                    </button>
                                  )}
                                  
                                  {step.hash && (
                                    <button
                                      onClick={() => toggleStepExpansion(`${step.id}-hash`)}
                                      className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-purple-100 text-purple-800 hover:bg-purple-200 transition-colors"
                                    >
                                      <LinkIcon className="h-3 w-3 mr-1" />
                                      {expandedSteps[`${step.id}-hash`] ? 'Sembunyikan Hash' : 'Lihat Hash'}
                                    </button>
                                  )}
                                </div>
                              )}
                              
                              {/* Expandable Content Sections */}
                              
                              {/* Step Details */}
                              {step.details && expandedSteps[`${step.id}-details`] && (
                                <div className="mt-3 bg-blue-50 border border-blue-200 rounded-lg p-3">
                                  <h5 className="text-xs font-medium text-blue-900 mb-2">Detail Lengkap</h5>
                                  <div className="space-y-2 text-xs">
                                    {step.details.productName && (
                                      <div className="flex justify-between">
                                        <span className="text-blue-600">Produk:</span>
                                        <span className="text-blue-800 font-medium">{step.details.productName}</span>
                                      </div>
                                    )}
                                    {step.details.gameName && (
                                      <div className="flex justify-between">
                                        <span className="text-blue-600">Game:</span>
                                        <span className="text-blue-800">{step.details.gameName}</span>
                                      </div>
                                    )}
                                    {step.details.priceEth && (
                                      <div className="flex justify-between">
                                        <span className="text-blue-600">Harga:</span>
                                        <span className="text-blue-800 font-mono">{step.details.priceEth} ETH</span>
                                      </div>
                                    )}
                                    {step.escrowInfo && (
                                      <>
                                        <div className="flex justify-between">
                                          <span className="text-blue-600">Escrow ID:</span>
                                          <span className="text-blue-800 font-mono">#{step.escrowInfo.escrowId}</span>
                                        </div>
                                        <div className="flex justify-between">
                                          <span className="text-blue-600">Dana Escrow:</span>
                                          <span className="text-blue-800 font-mono">{step.escrowInfo.amount} ETH</span>
                                        </div>
                                      </>
                                    )}
                                    {step.evidenceDescription && (
                                      <div>
                                        <span className="text-blue-600 block mb-1">Catatan Penjual:</span>
                                        <div className="bg-white border border-blue-200 rounded p-2 text-blue-800">
                                          {step.evidenceDescription}
                                        </div>
                                      </div>
                                    )}
                                    {step.refundReason && (
                                      <div>
                                        <span className="text-blue-600 block mb-1">Alasan Refund:</span>
                                        <div className="bg-white border border-blue-200 rounded p-2 text-blue-800">
                                          {step.refundReason}
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              )}
                              
                              {/* Expandable Dispute Data */}
                              {step.disputeData && expandedSteps[`${step.id}-dispute`] && (
                                <div className="mt-3 bg-red-50 border border-red-200 rounded-lg overflow-hidden">
                                  <div className="bg-red-100 px-3 py-2 border-b border-red-200">
                                    <h5 className="text-xs font-medium text-red-900">Detail Sengketa</h5>
                                  </div>
                                  <div className="p-3 space-y-3">
                                    <div className="text-xs">
                                      <span className="text-red-600 font-medium">ID Sengketa:</span>
                                      <span className="ml-2 text-red-800 font-mono bg-red-100 px-1 py-0.5 rounded">
                                        {step.disputeData.id}
                                      </span>
                                    </div>
                                    {step.disputeData.deskripsi && (
                                      <div className="text-xs">
                                        <span className="text-red-600 font-medium block mb-1">Alasan:</span>
                                        <div className="bg-white border border-red-200 rounded p-2 text-red-800 leading-relaxed">
                                          {step.disputeData.deskripsi}
                                        </div>
                                      </div>
                                    )}
                                    {step.disputeData.penjualBukti ? (
                                      <div className="text-xs">
                                        <span className="text-green-600 font-medium block mb-1">Pembelaan:</span>
                                        <div className="bg-green-50 border border-green-200 rounded p-2 text-green-800 leading-relaxed">
                                          {step.disputeData.resolution && step.disputeData.resolution.includes('[PEMBELAAN PENJUAL]') 
                                            ? step.disputeData.resolution.replace('[PEMBELAAN PENJUAL]', '').trim()
                                            : 'Pembelaan telah dikirim'
                                          }
                                        </div>
                                      </div>
                                    ) : (
                                      <div className="bg-yellow-50 border border-yellow-200 rounded p-2 text-xs">
                                        <div className="flex items-center text-yellow-800">
                                          <ClockIcon className="h-3 w-3 mr-1" />
                                          Menunggu pembelaan dari penjual
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              )}
                              
                              {/* Expandable Account Data */}
                              {step.accountData && expandedSteps[`${step.id}-account`] && (
                                <div className="mt-3 bg-green-50 p-3 rounded-lg border border-green-200">
                                  <h5 className="text-xs font-medium text-green-900 mb-2">Data Akun Game</h5>
                                  <div className="space-y-2">
                                    {transaksi?.accountData?.username && (
                                      <div className="flex items-center justify-between bg-white p-2 rounded border text-xs">
                                        <div className="flex items-center">
                                          <UserIcon className="h-3 w-3 text-green-600 mr-2" />
                                          <span className="text-gray-600 w-12">User:</span>
                                          <span className="font-mono">{transaksi.accountData.username}</span>
                                        </div>
                                        <button
                                          onClick={() => copyToClipboard(transaksi.accountData.username)}
                                          className="p-1 text-gray-400 hover:text-gray-600"
                                        >
                                          <ClipboardDocumentIcon className="h-3 w-3" />
                                        </button>
                                      </div>
                                    )}
                                    
                                    {transaksi?.accountData?.password && (
                                      <div className="flex items-center justify-between bg-white p-2 rounded border text-xs">
                                        <div className="flex items-center">
                                          <KeyIcon className="h-3 w-3 text-green-600 mr-2" />
                                          <span className="text-gray-600 w-12">Pass:</span>
                                          <span className="font-mono">{transaksi.accountData.password}</span>
                                        </div>
                                        <button
                                          onClick={() => copyToClipboard(transaksi.accountData.password)}
                                          className="p-1 text-gray-400 hover:text-gray-600"
                                        >
                                          <ClipboardDocumentIcon className="h-3 w-3" />
                                        </button>
                                      </div>
                                    )}
                                    
                                    {transaksi?.accountData?.email && (
                                      <div className="flex items-center justify-between bg-white p-2 rounded border text-xs">
                                        <div className="flex items-center">
                                          <AtSymbolIcon className="h-3 w-3 text-green-600 mr-2" />
                                          <span className="text-gray-600 w-12">Email:</span>
                                          <span className="font-mono">{transaksi.accountData.email}</span>
                                        </div>
                                        <button
                                          onClick={() => copyToClipboard(transaksi.accountData.email)}
                                          className="p-1 text-gray-400 hover:text-gray-600"
                                        >
                                          <ClipboardDocumentIcon className="h-3 w-3" />
                                        </button>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              )}
                              
                              {/* Expandable Hash */}
                              {step.hash && expandedSteps[`${step.id}-hash`] && (
                                <div className="mt-3 bg-purple-50 p-3 rounded-lg border border-purple-200">
                                  <div className="flex items-center justify-between mb-2">
                                    <span className="text-xs text-purple-700 font-medium">Transaction Hash:</span>
                                    <a
                                      href={getEtherscanLink(step.hash)}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="inline-flex items-center text-xs text-purple-600 hover:text-purple-800 transition-colors"
                                    >
                                      <EyeIcon className="h-3 w-3 mr-1" />
                                      Buka Etherscan
                                    </a>
                                  </div>
                                  <div className="flex items-center justify-between bg-white p-2 rounded border">
                                    <p className="text-xs font-mono text-gray-700 break-all flex-1 mr-2">
                                      {step.hash}
                                    </p>
                                    <button
                                      onClick={() => copyToClipboard(step.hash)}
                                      className="p-1 text-gray-400 hover:text-gray-600 flex-shrink-0"
                                    >
                                      <ClipboardDocumentIcon className="h-3 w-3" />
                                    </button>
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          </div>

          
          {/* Footer */}
          <div className="px-6 py-4 bg-gray-50 border-t rounded-b-lg">
            <div className="flex justify-end">
              <button
                onClick={onClose}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ModalDetailTransaksi;