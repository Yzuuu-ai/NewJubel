import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../konteks/AuthContext';
import { transaksiAPI, produkAPI } from '../../layanan/api';
import { useDashboardUpdates } from '../../hooks/useRealTimeUpdates';
import { useEthToIdrRate } from '../../hooks/useEthPrice';
import { accountDataHelper } from '../../utils/accountDataHelper';
import { getProductImageUrl, createImageErrorHandler } from '../../utils/imageHelper';
import toast from 'react-hot-toast';
import ModalLihatAkun from '../../komponen/ModalLihatAkun';
import ModalTerimaAkun from '../../komponen/ModalTerimaAkun';
import ModalKirimAkun from '../../komponen/ModalKirimAkun';
import ModalSengketa from '../../komponen/ModalSengketa';
import ModalSengketaPenjual from '../../komponen/ModalSengketaPenjual';
import ModalDetailSengketa from '../../komponen/ModalDetailSengketa';
import ModalDetailTransaksi from '../../komponen/ModalDetailTransaksi';
import {
  ShoppingBagIcon,
  ClockIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  CurrencyDollarIcon,
  EyeIcon,
  ArrowPathIcon,
  BanknotesIcon,
  DocumentTextIcon,
  PaperAirplaneIcon,
  ArrowLeftIcon,
  ShieldCheckIcon
} from '@heroicons/react/24/outline';

const DashboardPenjual = () => {
  // State management
  const [transaksi, setTransaksi] = useState([]);
  const [produk, setProduk] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filter, setFilter] = useState('all');
  const [lastRefresh, setLastRefresh] = useState(new Date());
  const [refreshing, setRefreshing] = useState(false);
  
  // Real-time ETH price
  const { rate: ethToIdrRate } = useEthToIdrRate();
  
  // Modal states
  const [showLihatAkunModal, setShowLihatAkunModal] = useState(false);
  const [showTerimaAkunModal, setShowTerimaAkunModal] = useState(false);
  const [showKirimAkunModal, setShowKirimAkunModal] = useState(false);
  const [showDetailSengketaModal, setShowDetailSengketaModal] = useState(false);
  const [showSengketaModal, setShowSengketaModal] = useState(false);
  const [showDetailTransaksiModal, setShowDetailTransaksiModal] = useState(false);
  const [selectedTransaksi, setSelectedTransaksi] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);
  
  // Auth and navigation
  const { user, isAuthenticated, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  
  // Real-time updates hook
  const { triggerUpdate } = useDashboardUpdates((source) => {
    fetchTransaksi(false);
    fetchProduk(false);
    toast.success('Data transaksi dan produk diperbarui', { duration: 2000 });
  });

  // Fetch data after auth completes
  useEffect(() => {
    if (authLoading) return;
    if (!isAuthenticated || !user) {
      navigate('/masuk');
      return;
    }
    fetchTransaksi();
    fetchProduk();
  }, [isAuthenticated, user, authLoading, filter]);

  // Fetch transaction data
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
      
      const response = await transaksiAPI.getTransaksiUser({
        role: 'penjual',
        status: filter === 'all' ? undefined : filter,
        page: 1,
        limit: 50,
        timestamp: Date.now()
      });
      
      let transaksiData = [];
      if (response.data?.sukses) {
        transaksiData = response.data.data?.transaksi || response.data.data || [];
      } else if (Array.isArray(response.data)) {
        transaksiData = response.data;
      }
      
      // Filter out GAGAL transactions from all views
      let filteredTransaksi = transaksiData;
      if (filter === 'all') {
        filteredTransaksi = transaksiData.filter(t => t.status !== 'GAGAL');
      } else {
        filteredTransaksi = transaksiData.filter(t => t.status !== 'GAGAL');
      }
      
      // 🔍 DEBUGGING: Log transaksi data
      console.log('🔍 DEBUGGING TRANSAKSI DATA FROM API:');
      console.log('📊 Total transactions:', filteredTransaksi.length);
      
      filteredTransaksi.forEach((transaksi, index) => {
        console.log(`\n📋 Transaction ${index + 1}:`, {
          id: transaksi.id,
          kodeTransaksi: transaksi.kodeTransaksi,
          status: transaksi.status,
          hasSengketa: !!transaksi.sengketa,
          sengketaData: transaksi.sengketa ? {
            id: transaksi.sengketa.id,
            status: transaksi.sengketa.status,
            deskripsi: transaksi.sengketa.deskripsi?.substring(0, 30) + '...',
            penjualBukti: transaksi.sengketa.penjualBukti,
            resolution: transaksi.sengketa.resolution
          } : null
        });
        
        if (transaksi.status === 'SENGKETA') {
          console.log(`🚨 SENGKETA TRANSACTION FOUND: ${transaksi.kodeTransaksi}`);
          console.log('🔍 Full sengketa data:', transaksi.sengketa);
        }
      });
      
      setTransaksi(filteredTransaksi);
      setLastRefresh(new Date());
    } catch (error) {
      const errorMessage = error.response?.data?.pesan || error.message || 'Gagal memuat transaksi';
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
  }, [filter, user]);

  // Fetch product data
  const fetchProduk = useCallback(async (showLoading = true) => {
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
      
      const response = await produkAPI.getProdukPenjual({
        userId: user.id
      });
      
      let produkData = [];
      if (response.data?.sukses) {
        produkData = response.data.data?.produk || response.data.data || [];
      } else if (Array.isArray(response.data)) {
        produkData = response.data;
      }
      
      setProduk(produkData);
    } catch (error) {
      const errorMessage = error.response?.data?.pesan || error.message || 'Gagal memuat produk';
      setError(errorMessage);
      if (produk.length === 0) {
        setProduk([]);
      }
    } finally {
      if (showLoading) {
        setLoading(false);
      } else {
        setRefreshing(false);
      }
    }
  }, [user]);

  // Manual refresh handler
  const handleRefresh = async () => {
    await fetchTransaksi(false);
    await fetchProduk(false);
    toast.success('Data transaksi dan produk diperbarui');
  };

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

  // Get status badge with appropriate styling
  const getStatusBadge = (status) => {
    const statusConfig = {
      'MENUNGGU_PEMBAYARAN': { 
        color: 'bg-yellow-100 text-yellow-800', 
        text: 'Menunggu Pembayaran',
        icon: ClockIcon,
        description: 'Transaksi dibuat, menunggu pembayaran'
      },
      'DIBAYAR_SMARTCONTRACT': { 
        color: 'bg-blue-100 text-blue-800', 
        text: 'Pembayaran Berhasil',
        icon: BanknotesIcon,
        description: 'Pembayaran berhasil, menunggu pengiriman akun'
      },
      'DIKIRIM': { 
        color: 'bg-purple-100 text-purple-800', 
        text: 'Akun Dikirim',
        icon: ShoppingBagIcon,
        description: 'Akun sudah dikirim, perlu konfirmasi penerimaan'
      },
      'DIKONFIRMASI_PEMBELI': { 
        color: 'bg-green-100 text-green-800', 
        text: 'Dikonfirmasi',
        icon: CheckCircleIcon,
        description: 'Pembeli sudah konfirmasi penerimaan'
      },
      'SELESAI': { 
        color: 'bg-green-100 text-green-800', 
        text: 'Selesai',
        icon: CheckCircleIcon,
        description: 'Transaksi selesai'
      },
      'SENGKETA': { 
        color: 'bg-red-100 text-red-800', 
        text: 'Sengketa',
        icon: ExclamationTriangleIcon,
        description: 'Transaksi dalam sengketa'
      },
      'GAGAL': { 
        color: 'bg-gray-100 text-gray-800', 
        text: 'Gagal',
        icon: ExclamationTriangleIcon,
        description: 'Transaksi gagal'
      },
      'REFUNDED': { 
        color: 'bg-blue-100 text-blue-800', 
        text: '💰 Dana Dikembalikan ke Pembeli',
        icon: ArrowLeftIcon,
        description: 'Dana telah dikembalikan ke pembeli via smart contract',
        isBlockchainStatus: true
      },
      'COMPLETED_DISPUTE': { 
        color: 'bg-green-100 text-green-800', 
        text: '✅ Selesai (Resolusi Sengketa)',
        icon: CheckCircleIcon, 
        description: 'Dana telah dikirim ke penjual via resolusi sengketa',
        isBlockchainStatus: true
      }
    };
    
    const config = statusConfig[status] || { 
      color: 'bg-gray-100 text-gray-800', 
      text: status,
      icon: ClockIcon,
      description: 'Status tidak diketahui'
    };
    
    const badgeClass = config.isDisputeOutcome || config.isBlockchainStatus 
      ? `inline-flex items-center px-3 py-1 rounded-full text-sm font-semibold ${config.color} border-2 ${
          config.color.includes('blue') ? 'border-blue-300' : 'border-green-300'
        }`
      : `inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${config.color}`;
    
    return (
      <span className={badgeClass} title={config.description}>
        <config.icon className={`${config.isDisputeOutcome || config.isBlockchainStatus ? 'h-4 w-4' : 'h-3 w-3'} mr-1`} />
        {config.text}
      </span>
    );
  };

  // Navigation handlers
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



  // Action handlers
  const handleKirimAkunSubmit = async (kirimData) => {
    if (!selectedTransaksi) return;
    try {
      setActionLoading(true);
      await transaksiAPI.kirimAkun(selectedTransaksi.id, kirimData);
      await fetchTransaksi(false);
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
      
      if (selectedTransaksi.status === 'SENGKETA') {
        // Cek apakah ada data sengketa
        let sengketaId = selectedTransaksi.sengketa?.id;
        
        if (!sengketaId) {
          // Coba ambil data sengketa dari API jika tidak ada
          try {
            const sengketaResponse = await transaksiAPI.getDetailSengketa(selectedTransaksi.id);
            if (sengketaResponse.data?.sukses && sengketaResponse.data.data?.id) {
              sengketaId = sengketaResponse.data.data.id;
            } else {
              toast.error('❌ Data sengketa tidak ditemukan. Silakan refresh halaman dan coba lagi.');
              return;
            }
          } catch (fetchError) {
            console.error('Error fetching sengketa data:', fetchError);
            toast.error('❌ Gagal mengambil data sengketa. Silakan refresh halaman dan coba lagi.');
            return;
          }
        }
        
        const pembelaanData = {
          pembelaan: sengketaData.alasan || sengketaData.deskripsi || sengketaData.pembelaan,
          bukti: sengketaData.bukti || null
        };
        
        if (!pembelaanData.pembelaan || pembelaanData.pembelaan.length < 20) {
          toast.error('Pembelaan harus diisi minimal 20 karakter');
          return;
        }
        
        console.log('🔧 Sending pembelaan with data:', { sengketaId, pembelaanData });
        await transaksiAPI.buatPembelaan(sengketaId, pembelaanData);
        toast.success('Pembelaan berhasil dikirim!');
        
        // Wait a bit for backend to process
        await new Promise(resolve => setTimeout(resolve, 1000));
      } else {
        toast.error('❌ PENJUAL TIDAK BISA BUAT SENGKETA!\n\nHanya pembeli yang bisa membuat sengketa. Penjual hanya bisa memberikan pembelaan jika ada sengketa dari pembeli.');
        return;
      }
      
      await fetchTransaksi(false);
      setShowTerimaAkunModal(false);
      setShowSengketaModal(false);
      setSelectedTransaksi(null);
    } catch (error) {
      console.error('Error handling sengketa:', error);
      const errorMessage = error.response?.data?.pesan || error.message;
      if (errorMessage.includes('Hanya pembeli yang dapat membuat sengketa')) {
        toast.error('❌ PENJUAL TIDAK BISA BUAT SENGKETA!\n\nHanya pembeli yang bisa membuat sengketa. Penjual hanya bisa memberikan pembelaan jika ada sengketa dari pembeli.');
      } else if (errorMessage.includes('sudah memberikan pembelaan')) {
        toast.error('❌ Anda sudah memberikan pembelaan untuk sengketa ini.');
      } else {
        toast.error('Gagal: ' + errorMessage);
      }
    } finally {
      setActionLoading(false);
    }
  };

  const handleBuatSengketa = (transaksi) => {
    setSelectedTransaksi(transaksi);
    setShowSengketaModal(true);
  };

  const handleBuatPembelaan = (transaksi) => {
    console.log('🔧 handleBuatPembelaan called for:', transaksi.kodeTransaksi);
    setSelectedTransaksi(transaksi);
    setShowSengketaModal(true);
  };

  const handleLihatDetailSengketa = (transaksi) => {
    setSelectedTransaksi(transaksi);
    setShowDetailSengketaModal(true);
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

  return (
    <div className="min-h-screen bg-gray-50 py-4 sm:py-8">
      <div className="max-w-[90%] mx-auto px-2 sm:px-4 lg:px-8">
        {/* Header Card */}
        <div className="bg-white rounded-lg shadow-sm mb-4 sm:mb-6">
          <div className="px-4 sm:px-6 py-4 border-b border-gray-200">
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center space-y-3 sm:space-y-0">
              <div>
                <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Dashboard Penjual</h1>
                <p className="text-sm text-gray-600 mt-1">Kelola transaksi dan penjualan Anda</p>
              </div>
              <div className="flex flex-col sm:flex-row gap-2 sm:text-right">
                <button
                  onClick={() => navigate('/produk-saya')}
                  className="inline-flex items-center justify-center px-4 py-2 bg-blue-600 text-white shadow-sm text-sm leading-4 font-medium rounded-md hover:bg-blue-700"
                >
                  <ShoppingBagIcon className="w-4 h-4 mr-2" />
                  Kelola Produk
                </button>
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
          <div className="p-3 sm:p-6">
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
                    <div className="mt-4 flex flex-col sm:flex-row gap-2">
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
              <h2 className="text-base sm:text-lg font-semibold text-gray-900">Riwayat Transaksi</h2>
            </div>
            
            {/* Transaksi Content */}
            {transaksi.length === 0 ? (
              <div className="px-3 sm:px-6 py-12 text-center">
                <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                </svg>
                <h3 className="mt-2 text-sm font-medium text-gray-900">
                  {error ? 'Tidak dapat memuat transaksi' : 'Belum ada transaksi'}
                </h3>
                <p className="mt-1 text-sm text-gray-500">
                  {error 
                    ? 'Terjadi masalah saat memuat data. Silakan coba lagi.' 
                    : 'Transaksi penjualan akan muncul di sini setelah ada pembeli.'
                  }
                </p>
                <div className="mt-6">
                  {error ? (
                    <div className="flex flex-col sm:flex-row gap-2 justify-center">
                      <button
                        onClick={() => fetchTransaksi(true)}
                        className="inline-flex items-center justify-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-red-600 hover:bg-red-700"
                      >
                        Coba Lagi
                      </button>
                      <button
                        onClick={() => navigate('/masuk')}
                        className="inline-flex items-center justify-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
                      >
                        Login Ulang
                      </button>
                    </div>) : (
                    <button
                      onClick={() => navigate('/produk-saya')}
                      className="inline-flex items-center justify-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
                    >
                      Jual Akun Pertama
                    </button>
                  )}
                </div>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Produk
                      </th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Transaksi
                      </th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Harga
                      </th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Pembeli
                      </th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Tanggal
                      </th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Aksi
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {transaksi.map((item) => (
                      <tr key={item.id} className="hover:bg-gray-50">
                        <td className="px-4 py-2 whitespace-nowrap">
                          <div className="flex items-center">
                            <img
                              src={getProductImageUrl(item.produk?.gambar)}
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
                          <div className="text-sm text-gray-900">{item.kodeTransaksi || item.id}</div>
                          {item.escrowId && (
                            <div className="text-xs text-gray-500">Escrow: {item.escrowId}</div>
                          )}
                        </td>
                        <td className="px-4 py-2 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">
                            {item.escrowAmount ? `${parseFloat(item.escrowAmount).toFixed(4)} ETH` : 'N/A'}
                          </div>
                          {item.produk?.hargaEth && (
                            <div className="text-xs text-gray-500">
                              ≈ {formatCurrency((item.produk.hargaEth || 0) * 65000000)}
                            </div>
                          )}
                        </td>
                        <td className="px-4 py-2 whitespace-nowrap">
                          <div className="text-sm text-gray-900">{item.pembeli?.nama || 'Anonim'}</div>
                          {item.pembeli?.walletAddress && (
                            <div className="text-xs text-gray-500 font-mono">
                              {item.pembeli.walletAddress.substring(0, 6)}...{item.pembeli.walletAddress.substring(item.pembeli.walletAddress.length - 4)}
                            </div>
                          )}
                        </td>
                        <td className="px-4 py-2 whitespace-nowrap">
                          {getStatusBadge(item.status)}
                          {item.status === 'SENGKETA' && (
                            <div className="text-xs text-red-600">
                              🚨 Sengketa Aktif
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
                            {(() => {
                              const hasData = accountDataHelper.hasAccountData(item);
                              const validStatus = ['DIKIRIM', 'DIKONFIRMASI_PEMBELI', 'SELESAI'].includes(item.status);
                              
                              return hasData && validStatus && (
                                <button
                                  onClick={() => handleLihatAkun(item)}
                                  className="inline-flex items-center px-2 py-1 border border-green-300 text-xs font-medium rounded text-green-700 bg-green-50 hover:bg-green-100"
                                  title="Lihat Akun"
                                >
                                  <DocumentTextIcon className="h-3 w-3" />
                                </button>
                              );
                            })()}
                            
                            {/* Tombol Kirim Akun */}
                            {item.status === 'DIBAYAR_SMARTCONTRACT' && (
                              <button
                                onClick={() => handleKirimAkun(item)}
                                className="inline-flex items-center px-2 py-1 border border-transparent text-xs font-medium rounded text-white bg-blue-600 hover:bg-blue-700"
                                title="Kirim Akun"
                              >
                                <PaperAirplaneIcon className="h-3 w-3" />
                              </button>
                            )}
                            
                            {/* Tombol Pembelaan - Pindah ke kolom Aksi */}
                            {item.status === 'SENGKETA' && !item.sengketa?.penjualBukti && (
                              <button
                                onClick={() => handleBuatPembelaan(item)}
                                className="inline-flex items-center px-2 py-1 border border-red-300 text-xs font-medium rounded text-red-700 bg-red-50 hover:bg-red-100"
                                title="Beri Pembelaan"
                              >
                                <ExclamationTriangleIcon className="h-3 w-3" />
                              </button>
                            )}

                            {/* Tombol Detail Sengketa */}
                            {item.status === 'SENGKETA' && (
                              <button
                                onClick={() => handleLihatDetailSengketa(item)}
                                className="inline-flex items-center px-2 py-1 border border-orange-300 text-xs font-medium rounded text-orange-700 bg-orange-50 hover:bg-orange-100"
                                title="Detail Sengketa"
                              >
                                <EyeIcon className="h-3 w-3" />
                              </button>
                            )}
                            
                            {/* Tombol Detail - Selalu ada */}
                            <button
                              onClick={() => handleDetailClick(item)}
                              className="inline-flex items-center px-2 py-1 border border-gray-300 text-xs font-medium rounded text-gray-700 bg-white hover:bg-gray-50"
                              title="Detail Transaksi"
                            >
                              <EyeIcon className="h-3 w-3" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
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
        <ModalDetailSengketa
          isOpen={showDetailSengketaModal}
          onClose={() => {
            setShowDetailSengketaModal(false);
            setSelectedTransaksi(null);
          }}
          transaksi={selectedTransaksi}
        />
        <ModalSengketaPenjual
          isOpen={showSengketaModal}
          onClose={() => {
            setShowSengketaModal(false);
            setSelectedTransaksi(null);
          }}
          onSubmit={handleSengketa}
          loading={actionLoading}
          transaksi={selectedTransaksi}
        />
        <ModalDetailTransaksi
          isOpen={showDetailTransaksiModal}
          onClose={() => {
            setShowDetailTransaksiModal(false);
            setSelectedTransaksi(null);
          }}
          transaksi={selectedTransaksi}
          onRefresh={fetchTransaksi}
        />
      </div>
    </div>
  );
};

export default DashboardPenjual;





