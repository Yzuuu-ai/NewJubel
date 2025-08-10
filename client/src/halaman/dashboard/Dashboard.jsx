import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../konteks/AuthContext';
import { useWallet } from '../../konteks/WalletContext';
import { transaksiAPI, produkAPI } from '../../layanan/api';
import { useDashboardUpdates } from '../../hooks/useRealTimeUpdates';
import { accountDataHelper } from '../../utils/accountDataHelper';
import { getProductImageUrl, createImageErrorHandler } from '../../utils/imageHelper';
import ModalLihatAkun from '../../komponen/ModalLihatAkun';
import ModalTerimaAkun from '../../komponen/ModalTerimaAkun';
import ModalKirimAkun from '../../komponen/ModalKirimAkun';
import ModalSengketa from '../../komponen/ModalSengketa';
import ModalSengketaPenjual from '../../komponen/ModalSengketaPenjual';
import ModalDetailSengketa from '../../komponen/ModalDetailSengketa';
import ModalDetailTransaksi from '../../komponen/ModalDetailTransaksi';
import PembelianKontrakPintar from '../../komponen/PembelianKontrakPintar';
import TransactionCard from '../../komponen/TransactionCard';
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
  PaperAirplaneIcon,
  ShieldCheckIcon,
  UserIcon
} from '@heroicons/react/24/outline';

// Simple Timer Component
const SimpleTimer = ({ transaksi, onExpired }) => {
  const [timeLeft, setTimeLeft] = useState(null);
  const [isExpired, setIsExpired] = useState(false);

  useEffect(() => {
    if (!transaksi || transaksi.status !== 'MENUNGGU_PEMBAYARAN') {
      return;
    }

    const createdAt = new Date(transaksi.dibuatPada);
    const expiryTime = new Date(createdAt.getTime() + 15 * 60 * 1000); // 15 menit

    const updateTimer = () => {
      const now = new Date();
      const difference = expiryTime.getTime() - now.getTime();

      if (difference <= 0) {
        setTimeLeft({ minutes: 0, seconds: 0 });
        setIsExpired(true);
        if (onExpired) {
          onExpired(transaksi);
        }
        return;
      }

      const minutes = Math.floor(difference / (1000 * 60));
      const seconds = Math.floor((difference % (1000 * 60)) / 1000);
      setTimeLeft({ minutes, seconds });
      setIsExpired(false);
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [transaksi, onExpired]);

  if (!transaksi || transaksi.status !== 'MENUNGGU_PEMBAYARAN') {
    return null;
  }

  if (isExpired) {
    return (
      <div className="text-xs text-red-600 font-medium">
        Waktu habis
      </div>
    );
  }

  if (timeLeft) {
    return (
      <div className={`text-xs font-medium ${
        timeLeft.minutes < 5
          ? 'text-red-600'
          : timeLeft.minutes < 10
            ? 'text-orange-600'
            : 'text-blue-600'
      }`}>
        {String(timeLeft.minutes).padStart(2, '0')}:{String(timeLeft.seconds).padStart(2, '0')}
      </div>
    );
  }

  return (
    <div className="text-xs text-blue-600 font-medium">
      Memuat...
    </div>
  );
};

// Simple Timer Button Component - combines timer with payment button
const SimpleTimerButton = ({ transaksi, onExpired, onPayment }) => {
  const [timeLeft, setTimeLeft] = useState(null);
  const [isExpired, setIsExpired] = useState(false);

  useEffect(() => {
    if (!transaksi || transaksi.status !== 'MENUNGGU_PEMBAYARAN') {
      return;
    }

    const createdAt = new Date(transaksi.dibuatPada);
    const expiryTime = new Date(createdAt.getTime() + 15 * 60 * 1000); // 15 menit

    const updateTimer = () => {
      const now = new Date();
      const difference = expiryTime.getTime() - now.getTime();

      if (difference <= 0) {
        setTimeLeft({ minutes: 0, seconds: 0 });
        setIsExpired(true);
        if (onExpired) {
          onExpired(transaksi);
        }
        return;
      }

      const minutes = Math.floor(difference / (1000 * 60));
      const seconds = Math.floor((difference % (1000 * 60)) / 1000);
      setTimeLeft({ minutes, seconds });
      setIsExpired(false);
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [transaksi, onExpired]);

  if (!transaksi || transaksi.status !== 'MENUNGGU_PEMBAYARAN') {
    return null;
  }

  if (isExpired) {
    return (
      <div className="inline-flex items-center px-2 py-1 border border-red-300 text-xs font-medium rounded text-red-700 bg-red-50">
        <ExclamationTriangleIcon className="h-3 w-3 mr-1" />
        Waktu Habis
      </div>
    );
  }

  if (timeLeft) {
    return (
      <button
        onClick={() => onPayment && onPayment(transaksi)}
        className={`inline-flex items-center justify-center px-2 py-1 border border-transparent text-xs font-medium rounded text-white transition-colors w-24 ${
          timeLeft.minutes < 5
            ? 'bg-red-600 hover:bg-red-700'
            : timeLeft.minutes < 10
              ? 'bg-orange-600 hover:bg-orange-700'
              : 'bg-blue-600 hover:bg-blue-700'
        }`}
        title={`${timeLeft.minutes} menit ${timeLeft.seconds} detik tersisa`}
      >
        <BanknotesIcon className="h-3 w-3 mr-1" />
        Bayar ({String(timeLeft.minutes).padStart(2, '0')}:{String(timeLeft.seconds).padStart(2, '0')})
      </button>
    );
  }

  return (
    <div className="inline-flex items-center px-2 py-1 border border-blue-300 text-xs font-medium rounded text-blue-700 bg-blue-50">
      <BanknotesIcon className="h-3 w-3 mr-1" />
      Memuat...
    </div>
  );
};

const Dashboard = () => {
  // State management
  const [activeTab, setActiveTab] = useState('pembelian'); // 'pembelian' atau 'penjualan'
  const [transaksiPembelian, setTransaksiPembelian] = useState([]);
  const [transaksiPenjualan, setTransaksiPenjualan] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filter, setFilter] = useState('all');
  const [lastRefresh, setLastRefresh] = useState(new Date());
  const [refreshing, setRefreshing] = useState(false);
  const [hasSellerActivity, setHasSellerActivity] = useState(false);
  
  // Modal states
  const [showLihatAkunModal, setShowLihatAkunModal] = useState(false);
  const [showTerimaAkunModal, setShowTerimaAkunModal] = useState(false);
  const [showKirimAkunModal, setShowKirimAkunModal] = useState(false);
  const [showDetailSengketaModal, setShowDetailSengketaModal] = useState(false);
  const [showSengketaModal, setShowSengketaModal] = useState(false);
  const [showDetailTransaksiModal, setShowDetailTransaksiModal] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [selectedTransaksi, setSelectedTransaksi] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);
  
  // Auth and navigation
  const { user, isAuthenticated, loading: authLoading } = useAuth();
  const { isConnected, walletAddress } = useWallet();
  const navigate = useNavigate();
  
  // Real-time updates hook
  const { triggerUpdate } = useDashboardUpdates((source) => {
    fetchAllTransaksi(false);
    toast.success('Data transaksi diperbarui', { duration: 2000 });
  });

  // Setup transaction expiry manager
  useEffect(() => {
    const handleExpiredTransaction = (event, expiredTransaksi) => {
      console.log('🔄 Transaction expired:', expiredTransaksi);
      fetchAllTransaksi(false);
    };

    const handleTransactionCreated = (event) => {
      console.log('🔄 Transaction created:', event.detail);
      fetchAllTransaksi(false);
      toast.success('Transaksi berhasil dibuat! Timer 15 menit dimulai.');
    };

    transactionExpiryManager.addListener(handleExpiredTransaction);
    window.addEventListener('transaction-created', handleTransactionCreated);

    return () => {
      transactionExpiryManager.removeListener(handleExpiredTransaction);
      transactionExpiryManager.stopAll();
      window.removeEventListener('transaction-created', handleTransactionCreated);
    };
  }, []);

  // Set default tab based on user role
  useEffect(() => {
    if (user?.role === 'PENJUAL') {
      setActiveTab('penjualan');
    } else if (user?.role === 'PEMBELI') {
      setActiveTab('pembelian');
    }
  }, [user?.role]);

  // Fetch data after auth completes
  useEffect(() => {
    if (authLoading) return;
    if (!isAuthenticated || !user) {
      navigate('/masuk');
      return;
    }
    fetchAllTransaksi();
  }, [isAuthenticated, user, authLoading, filter]);

  // Fetch all transaction data
  const fetchAllTransaksi = useCallback(async (showLoading = true) => {
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
      
      // Fetch transaksi pembelian
      const responsePembelian = await transaksiAPI.getTransaksiSaya({
        role: 'pembeli',
        status: filter === 'all' ? undefined : filter,
        page: 1,
        limit: 50,
        timestamp: Date.now()
      });

      // Fetch transaksi penjualan
      const responsePenjualan = await transaksiAPI.getTransaksiUser({
        role: 'penjual',
        status: filter === 'all' ? undefined : filter,
        page: 1,
        limit: 50,
        timestamp: Date.now()
      });
      
      // Process pembelian data
      let transaksiPembelianData = [];
      if (responsePembelian.data?.sukses) {
        transaksiPembelianData = responsePembelian.data.data?.transaksi || responsePembelian.data.data || [];
      } else if (Array.isArray(responsePembelian.data)) {
        transaksiPembelianData = responsePembelian.data;
      }
      
      // Process penjualan data
      let transaksiPenjualanData = [];
      if (responsePenjualan.data?.sukses) {
        transaksiPenjualanData = responsePenjualan.data.data?.transaksi || responsePenjualan.data.data || [];
      } else if (Array.isArray(responsePenjualan.data)) {
        transaksiPenjualanData = responsePenjualan.data;
      }
      
      // Filter out GAGAL transactions
      const filteredPembelian = transaksiPembelianData.filter(t => t.status !== 'GAGAL');
      const filteredPenjualan = transaksiPenjualanData.filter(t => t.status !== 'GAGAL');
      
      setTransaksiPembelian(filteredPembelian);
      setTransaksiPenjualan(filteredPenjualan);
      setLastRefresh(new Date());

      // Check if user has seller activity or is a seller (approved or pending)
      const userHasSellerActivity = filteredPenjualan.length > 0 || 
                                   (user?.role === 'PENJUAL'); // Show tab for all sellers, approved or not
      setHasSellerActivity(userHasSellerActivity);

      // If user doesn't have seller activity and is currently on penjualan tab, switch to pembelian
      if (!userHasSellerActivity && activeTab === 'penjualan') {
        setActiveTab('pembelian');
      }

      // Start monitoring transaksi dengan status MENUNGGU_PEMBAYARAN
      const pendingTransactions = filteredPembelian.filter(t => t.status === 'MENUNGGU_PEMBAYARAN');
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
      
      if (transaksiPembelian.length === 0 && transaksiPenjualan.length === 0) {
        setTransaksiPembelian([]);
        setTransaksiPenjualan([]);
      }
    } finally {
      if (showLoading) {
        setLoading(false);
      } else {
        setRefreshing(false);
      }
    }
  }, [filter, user, transaksiPembelian.length, transaksiPenjualan.length, navigate, activeTab]);

  // Manual refresh handler
  const handleRefresh = async () => {
    await fetchAllTransaksi(false);
    toast.success('Data transaksi diperbarui');
  };

  // Get current transactions based on active tab
  const getCurrentTransaksi = () => {
    return activeTab === 'pembelian' ? transaksiPembelian : transaksiPenjualan;
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

  
  // Payment handlers (for pembelian)
  const handlePaymentExpired = async (expiredTransaksi) => {
    try {
      console.log('⏰ Handling expired transaction:', expiredTransaksi.id);
      transactionExpiryManager.stopMonitoring(expiredTransaksi.id);
      await fetchAllTransaksi(false);
      toast.error(`Waktu pembayaran untuk ${expiredTransaksi.produk?.judulProduk} telah habis.`);
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

  const handlePayment = (transaksi) => {
    if (!isConnected) {
      toast.error('Silakan connect wallet di navbar terlebih dahulu');
      return;
    }
    
    if (walletAddress?.toLowerCase() !== user.walletAddress?.toLowerCase()) {
      toast.error('Wallet yang terhubung tidak sesuai dengan akun Anda');
      return;
    }

    setSelectedTransaksi(transaksi);
    setShowPaymentModal(true);
  };

  const handlePaymentSuccess = (result) => {
    toast.success('Pembayaran berhasil! Transaksi telah dibuat di blockchain.');
    setShowPaymentModal(false);
    setSelectedTransaksi(null);
    
    if (selectedTransaksi) {
      transactionExpiryManager.stopMonitoring(selectedTransaksi.id);
    }
    
    fetchAllTransaksi(false);
  };

  const handlePaymentCancel = () => {
    setShowPaymentModal(false);
    setSelectedTransaksi(null);
  };

  // Action handlers
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

  const handleKirimAkun = (transaksi) => {
    setSelectedTransaksi(transaksi);
    setShowKirimAkunModal(true);
  };

  const handleKonfirmasiPenerimaan = async () => {
    if (!selectedTransaksi) return;
    try {
      setActionLoading(true);
      await transaksiAPI.konfirmasiPenerimaan(selectedTransaksi.id);
      await fetchAllTransaksi(false);
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

  const handleKirimAkunSubmit = async (kirimData) => {
    if (!selectedTransaksi) return;
    try {
      setActionLoading(true);
      await transaksiAPI.kirimAkun(selectedTransaksi.id, kirimData);
      await fetchAllTransaksi(false);
      setShowKirimAkunModal(false);
      setSelectedTransaksi(null);
      toast.success('Data akun berhasil dikirim ke pembeli!');
    } catch (error) {
      console.error('Error kirim akun:', error);
      toast.error('Gagal mengirim akun: ' + error.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleSengketa = async (sengketaData) => {
    if (!selectedTransaksi) return;
    try {
      setActionLoading(true);
      
      if (activeTab === 'pembelian') {
        // Pembeli membuat sengketa
        const formattedData = {
          alasan: sengketaData.deskripsi || sengketaData.alasan,
          bukti: sengketaData.bukti || null
        };
        
        if (!formattedData.alasan || formattedData.alasan.length < 20) {
          toast.error('Alasan sengketa minimal 20 karakter');
          return;
        }
        
        await transaksiAPI.buatSengketa(selectedTransaksi.id, formattedData);
        toast.success('Sengketa berhasil dilaporkan!');
      } else {
        // Penjual membuat pembelaan
        if (selectedTransaksi.status === 'SENGKETA') {
          if (!selectedTransaksi.sengketa || !selectedTransaksi.sengketa.id) {
            toast.error('❌ Data sengketa tidak ditemukan. Refresh halaman dan coba lagi.');
            return;
          }
          
          const pembelaanData = {
            pembelaan: sengketaData.alasan || sengketaData.deskripsi || sengketaData.pembelaan,
            bukti: sengketaData.bukti || null
          };
          
          if (!pembelaanData.pembelaan || pembelaanData.pembelaan.length < 20) {
            toast.error('Pembelaan harus diisi minimal 20 karakter');
            return;
          }
          
          await transaksiAPI.buatPembelaan(selectedTransaksi.sengketa.id, pembelaanData);
          toast.success('Pembelaan berhasil dikirim!');
        } else {
          toast.error('❌ PENJUAL TIDAK BISA BUAT SENGKETA!\n\nHanya pembeli yang bisa membuat sengketa.');
          return;
        }
      }
      
      await fetchAllTransaksi(false);
      setShowTerimaAkunModal(false);
      setShowSengketaModal(false);
      setSelectedTransaksi(null);
    } catch (error) {
      const errorMessage = error.response?.data?.pesan || error.message;
      toast.error('Gagal: ' + errorMessage);
    } finally {
      setActionLoading(false);
    }
  };

  const handleBuatSengketa = (transaksi) => {
    setSelectedTransaksi(transaksi);
    setShowSengketaModal(true);
  };

  const handleLihatDetailSengketa = (transaksi) => {
    setSelectedTransaksi(transaksi);
    setShowDetailSengketaModal(true);
  };

  // Helper functions
  const canCreateDispute = (transaksi) => {
    return activeTab === 'pembelian' && 
           transaksi.status === 'DIKIRIM' && 
           transaksi.status !== 'SENGKETA' &&
           !transaksi.sengketa;
  };

  const canCreatePembelaan = (transaksi) => {
    return activeTab === 'penjualan' &&
           transaksi.status === 'SENGKETA' && 
           (!transaksi.sengketa?.penjualBukti || 
            !transaksi.sengketa?.pembelaan);
  };

  const canViewDispute = (transaksi) => {
    return ['SENGKETA', 'DIMENANGKAN_PEMBELI', 'DIMENANGKAN_PENJUAL'].includes(transaksi.status);
  };

  // Loading states
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

  const currentTransaksi = getCurrentTransaksi();

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-[90%] mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-8">
        {/* Header Card */}
        <div className="bg-white rounded-lg shadow-md mb-4 border border-gray-300">
          <div className="px-4 py-4 border-b border-gray-100">
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center space-y-4 sm:space-y-0">
              <div>
                <h1 className="text-xl font-bold text-gray-900 mb-1">Dashboard Transaksi</h1>
                <p className="text-sm text-gray-600">
                  Kelola transaksi pembelian dan penjualan Anda
                </p>
              </div>
              <div className="flex flex-col sm:text-right">
                <button
                  onClick={handleRefresh}
                  disabled={loading || refreshing}
                  className="inline-flex items-center justify-center px-4 py-2 border border-gray-300 shadow-md text-sm font-medium rounded-lg text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 transition-colors"
                >
                  <ArrowPathIcon className={`w-4 h-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
                  {refreshing ? 'Memperbarui...' : 'Perbarui'}
                </button>
                <p className="text-xs text-gray-500 mt-2 text-center sm:text-right">
                  Terakhir diperbarui: {lastRefresh.toLocaleTimeString('id-ID')}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Main Dashboard Card */}
        <div className="bg-white rounded-lg shadow-md border border-gray-300">
          {/* Tab Navigation - Conditional based on user role */}
          <div className="border-b border-gray-300">
            <nav className="flex px-4">
              {/* Show Pembelian tab only for PEMBELI or users with purchase activity */}
              {(user?.role === 'PEMBELI' || transaksiPembelian.length > 0) && (
                <button
                  onClick={() => setActiveTab('pembelian')}
                  className={`py-3 px-4 border-b-2 font-medium text-sm transition-colors ${
                    activeTab === 'pembelian'
                      ? 'border-blue-500 text-blue-600 bg-blue-50'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <div className="flex items-center space-x-2">
                    <UserIcon className="h-5 w-5" />
                    <span>Pembelian Saya</span>
                    <span className={`inline-flex items-center justify-center px-2 py-1 text-xs font-bold rounded-full ${
                      activeTab === 'pembelian' ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-600'
                    }`}>
                      {transaksiPembelian.length}
                    </span>
                  </div>
                </button>
              )}
              
              {/* Show Penjualan tab for PENJUAL or users with seller activity */}
              {(user?.role === 'PENJUAL' || hasSellerActivity) && (
                <button
                  onClick={() => setActiveTab('penjualan')}
                  className={`py-3 px-4 border-b-2 font-medium text-sm transition-colors ${
                    activeTab === 'penjualan'
                      ? 'border-blue-500 text-blue-600 bg-blue-50'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <div className="flex items-center space-x-2">
                    <BanknotesIcon className="h-5 w-5" />
                    <span>Penjualan Saya</span>
                    <span className={`inline-flex items-center justify-center px-2 py-1 text-xs font-bold rounded-full ${
                      activeTab === 'penjualan' ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-600'
                    }`}>
                      {transaksiPenjualan.length}
                    </span>
                  </div>
                </button>
              )}
            </nav>
          </div>

          
          {/* Content */}
          <div className="p-4">
            {/* Error Alert */}
            {error && (
              <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
                <div className="flex">
                  <div className="flex-shrink-0">
                    <ExclamationTriangleIcon className="h-5 w-5 text-red-400" />
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
                        onClick={() => fetchAllTransaksi(true)}
                        className="bg-red-100 px-3 py-2 rounded-md text-sm font-medium text-red-800 hover:bg-red-200"
                      >
                        Coba Lagi
                      </button>
                      <button
                        onClick={() => {
                          setError(null);
                          setTransaksiPembelian([]);
                          setTransaksiPenjualan([]);
                          fetchAllTransaksi(true);
                        }}
                        className="bg-blue-100 px-3 py-2 rounded-md text-sm font-medium text-blue-800 hover:bg-blue-200"
                      >
                        Reset & Muat Ulang
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            
            {/* Transaction Content */}
            {currentTransaksi.length === 0 ? (
              <div className="text-center py-12">
                <div className="mx-auto h-16 w-16 text-gray-400 mb-4">
                  {activeTab === 'pembelian' ? (
                    <ShoppingBagIcon className="h-full w-full" />
                  ) : (
                    <BanknotesIcon className="h-full w-full" />
                  )}
                </div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  {error ? 'Tidak dapat memuat transaksi' : `Belum ada transaksi ${activeTab}`}
                </h3>
                <p className="text-sm text-gray-500 mb-6">
                  {error 
                    ? 'Terjadi masalah saat memuat data. Silakan coba lagi.' 
                    : activeTab === 'pembelian' 
                      ? 'Mulai berbelanja untuk melihat transaksi di sini.'
                      : 'Jual akun pertama Anda untuk melihat transaksi di sini.'
                  }
                </p>
                <div className="space-x-3">
                  {error ? (
                    <>
                      <button
                        onClick={() => fetchAllTransaksi(true)}
                        className="inline-flex items-center px-4 py-2 border border-transparent shadow-md text-sm font-medium rounded-lg text-white bg-red-600 hover:bg-red-700"
                      >
                        Coba Lagi
                      </button>
                      <button
                        onClick={() => navigate('/masuk')}
                        className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-md text-sm font-medium rounded-lg text-gray-700 bg-white hover:bg-gray-50"
                      >
                        Login Ulang
                      </button>
                    </>
                  ) : activeTab === 'pembelian' ? (
                    <button
                      onClick={() => navigate('/produk')}
                      className="inline-flex items-center px-6 py-3 border border-transparent shadow-md text-sm font-medium rounded-lg text-white bg-blue-600 hover:bg-blue-700"
                    >
                      Mulai Belanja
                    </button>
                  ) : user?.role === 'PENJUAL' ? (
                    <button
                      onClick={() => navigate('/produk-saya')}
                      className="inline-flex items-center px-6 py-3 border border-transparent shadow-md text-sm font-medium rounded-lg text-white bg-blue-600 hover:bg-blue-700"
                    >
                      Kelola Produk
                    </button>
                  ) : null}
                </div>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Produk
                      </th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Kode Produk
                      </th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Harga
                      </th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        {activeTab === 'pembelian' ? 'Penjual' : 'Pembeli'}
                      </th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Waktu
                      </th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Aksi
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {currentTransaksi.map((item) => {
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

                      // Get status badge
                      const getStatusBadge = (status) => {
                        const statusConfig = {
                          'MENUNGGU_PEMBAYARAN': { color: 'bg-amber-100 text-amber-800', text: 'Menunggu Pembayaran' },
                          'DIBAYAR_SMARTCONTRACT': { color: 'bg-blue-100 text-blue-800', text: 'Pembayaran Berhasil' },
                          'DIKIRIM': { color: 'bg-purple-100 text-purple-800', text: 'Akun Dikirim' },
                          'DIKONFIRMASI_PEMBELI': { color: 'bg-emerald-100 text-emerald-800', text: 'Dikonfirmasi' },
                          'SELESAI': { color: 'bg-green-100 text-green-800', text: 'Selesai' },
                          'SENGKETA': { color: 'bg-red-100 text-red-800', text: 'Sengketa' },
                          'REFUNDED': { color: 'bg-blue-100 text-blue-800', text: 'Refund' }
                        };
                        const config = statusConfig[status] || { color: 'bg-gray-100 text-gray-800', text: status };
                        return (
                          <span className={`inline-flex items-center px-3 py-1 rounded-md text-xs font-medium ${config.color}`}>
                            {config.text}
                          </span>
                        );
                      };

                      const hasAccountData = item.username || item.password || item.email || item.loginId;
                      const validStatusForAccount = ['DIKIRIM', 'DIKONFIRMASI_PEMBELI', 'SELESAI'].includes(item.status);

                      return (
                        <tr key={item.id} className="hover:bg-gray-50">
                          <td className="px-4 py-2 whitespace-nowrap">
                            <div className="mb-1">
                              {getStatusBadge(item.status)}
                            </div>
                          </td>
                          <td className="px-4 py-2 whitespace-nowrap">
                            <div className="flex items-center">
                              <img
                                src={getProductImageUrl(item.produk?.gambar) || '/placeholder-game.svg'}
                                alt={item.produk?.judulProduk || 'Produk'}
                                className="w-8 h-8 rounded-lg object-cover mr-2"
                                onError={createImageErrorHandler()}
                              />
                              <div>
                                <div className="text-sm font-medium text-gray-900">
                                  {item.produk?.judulProduk || 'Produk Tidak Ditemukan'}
                                </div>
                                <div className="text-xs text-gray-500">
                                  {item.produk?.namaGame || 'Game'}
                                </div>
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-2 whitespace-nowrap">
                            <div className="text-sm text-gray-900">#{item.kodeTransaksi || item.id}</div>
                            {item.escrowId && (
                              <div className="text-xs text-gray-500">Escrow: {item.escrowId}</div>
                            )}
                          </td>
                          <td className="px-4 py-2 whitespace-nowrap">
                            <div className="text-sm font-medium text-gray-900">
                              {item.escrowAmount ? `${parseFloat(item.escrowAmount).toFixed(4)} ETH` :
                               item.produk?.hargaEth ? `${item.produk.hargaEth} ETH` : 'N/A'}
                            </div>
                            {item.produk?.harga && (
                              <div className="text-xs text-gray-500">
                                ≈ {formatCurrency(item.produk.harga)}
                              </div>
                            )}
                          </td>
                          <td className="px-4 py-2 whitespace-nowrap">
                            <div className="text-sm text-gray-900">
                              {activeTab === 'pembelian' ?
                                (item.penjual?.nama || 'Penjual') :
                                (item.pembeli?.nama || 'Pembeli')
                              }
                            </div>
                            {activeTab === 'pembelian' && item.penjual?.walletAddress && (
                              <div className="text-xs text-gray-500 font-mono">
                                {item.penjual.walletAddress.substring(0, 6)}...{item.penjual.walletAddress.substring(item.penjual.walletAddress.length - 4)}
                              </div>
                            )}
                            {activeTab === 'penjualan' && item.pembeli?.walletAddress && (
                              <div className="text-xs text-gray-500 font-mono">
                                {item.pembeli.walletAddress.substring(0, 6)}...{item.pembeli.walletAddress.substring(item.pembeli.walletAddress.length - 4)}
                              </div>
                            )}
                          </td>
                          <td className="px-4 py-2 whitespace-nowrap">
                            <div className="text-sm text-gray-500">
                              {formatDate(item.dibuatPada)}
                            </div>
                          </td>
                          <td className="px-4 py-2 whitespace-nowrap">
                            <div className="flex flex-wrap gap-1">
                              {/* Tombol Lihat Akun */}
                              {hasAccountData && validStatusForAccount && (
                                <button
                                  onClick={() => handleLihatAkun(item)}
                                  className="inline-flex items-center px-2 py-1 border border-green-300 text-xs font-medium rounded text-green-700 bg-green-50 hover:bg-green-100"
                                  title="Lihat Akun"
                                >
                                  <DocumentTextIcon className="h-3 w-3" />
                                </button>
                              )}
                              
                              {/* Tombol Kirim Akun (Penjual) */}
                              {activeTab === 'penjualan' && item.status === 'DIBAYAR_SMARTCONTRACT' && (
                                <button
                                  onClick={() => handleKirimAkun(item)}
                                  className="inline-flex items-center px-2 py-1 border border-transparent text-xs font-medium rounded text-white bg-blue-600 hover:bg-blue-700"
                                  title="Kirim Akun"
                                >
                                  <PaperAirplaneIcon className="h-3 w-3" />
                                </button>
                              )}
                              
                              {/* Tombol Konfirmasi (Pembeli) */}
                              {activeTab === 'pembelian' && item.status === 'DIKIRIM' && (
                                <button
                                  onClick={() => handleTerimaAkun(item)}
                                  className="inline-flex items-center px-2 py-1 border border-transparent text-xs font-medium rounded text-white bg-green-600 hover:bg-green-700"
                                  title="Konfirmasi Penerimaan"
                                >
                                  <CheckCircleIcon className="h-3 w-3" />
                                </button>
                              )}
                              
                              {/* Tombol Sengketa (Pembeli) */}
                              {activeTab === 'pembelian' && item.status === 'DIKIRIM' && (
                                <button
                                  onClick={() => handleBuatSengketa(item)}
                                  className="inline-flex items-center px-2 py-1 border border-red-300 text-xs font-medium rounded text-red-700 bg-red-50 hover:bg-red-100"
                                  title="Buat Sengketa"
                                >
                                  <ExclamationTriangleIcon className="h-3 w-3" />
                                </button>
                              )}

                              {/* Tombol Pembelaan (Penjual) - Pindah ke kolom Aksi */}
                              {activeTab === 'penjualan' && item.status === 'SENGKETA' && (
                                <button
                                  onClick={() => handleBuatSengketa(item)}
                                  className="inline-flex items-center px-2 py-1 border border-red-300 text-xs font-medium rounded text-red-700 bg-red-50 hover:bg-red-100"
                                  title="Beri Pembelaan"
                                >
                                  <ExclamationTriangleIcon className="h-3 w-3" />
                                </button>
                              )}

                              {/* Tombol Detail */}
                              <button
                                onClick={() => handleDetailClick(item)}
                                className="inline-flex items-center px-2 py-1 border border-gray-300 text-xs font-medium rounded text-gray-700 bg-white hover:bg-gray-50"
                                title="Detail Transaksi"
                              >
                                <EyeIcon className="h-3 w-3" />
                              </button>

                              {/* Tombol Bayar dengan Timer (Pembeli) */}
                              {activeTab === 'pembelian' && item.status === 'MENUNGGU_PEMBAYARAN' && (
                                <SimpleTimerButton
                                  transaksi={item}
                                  onExpired={handlePaymentExpired}
                                  onPayment={handlePayment}
                                />
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
        
        {/* Modal Components */}
        <ModalLihatAkun
          isOpen={showLihatAkunModal}
          onClose={() => {
            setShowLihatAkunModal(false);
            setSelectedTransaksi(null);
          }}
          transaksi={selectedTransaksi}
        />
        
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
        
        <ModalKirimAkun
          isOpen={showKirimAkunModal}
          onClose={() => {
            setShowKirimAkunModal(false);
            setSelectedTransaksi(null);
          }}
          onSubmit={handleKirimAkunSubmit}
          loading={actionLoading}
          transaksi={selectedTransaksi}
        />
        
        <ModalSengketa
          isOpen={showSengketaModal && activeTab === 'pembelian'}
          onClose={() => {
            setShowSengketaModal(false);
            setSelectedTransaksi(null);
          }}
          onSubmit={handleSengketa}
          loading={actionLoading}
          transaksi={selectedTransaksi}
        />

        <ModalSengketaPenjual
          isOpen={showSengketaModal && activeTab === 'penjualan'}
          onClose={() => {
            setShowSengketaModal(false);
            setSelectedTransaksi(null);
          }}
          onSubmit={handleSengketa}
          loading={actionLoading}
          transaksi={selectedTransaksi}
        />

        <ModalDetailSengketa
          isOpen={showDetailSengketaModal}
          onClose={() => {
            setShowDetailSengketaModal(false);
            setSelectedTransaksi(null);
          }}
          transaksi={selectedTransaksi}
        />

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
            <div className="bg-white rounded-xl max-w-md w-full max-h-[90vh] overflow-y-auto shadow-2xl">
              <div className="p-6">
                <div className="flex justify-between items-center mb-6">
                  <h3 className="text-xl font-semibold text-gray-900">
                    Pembayaran Transaksi
                  </h3>
                  <button
                    onClick={handlePaymentCancel}
                    className="text-gray-400 hover:text-gray-600 transition-colors"
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

export default Dashboard;

