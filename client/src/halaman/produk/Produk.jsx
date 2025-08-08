import React, { useState, useEffect, useRef } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../konteks/AuthContext';
import { useWallet } from '../../konteks/WalletContext';
import { apiService } from '../../layanan/api';
import LineClamp from '../../komponen/LineClamp';
import { useMarketplaceUpdates } from '../../hooks/useRealTimeUpdates';
import TransactionDetailModal from '../../komponen/TransactionDetailModal';
import PembelianKontrakPintar from '../../komponen/PembelianKontrakPintar';
import { 
  MagnifyingGlassIcon,
  FunnelIcon,
  DevicePhoneMobileIcon,
  CurrencyDollarIcon,
  ClockIcon,
  UserIcon,
  PhotoIcon,
  PlusIcon,
  XMarkIcon,
  ShoppingCartIcon,
  EyeIcon
} from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';
import { debugOwnershipCheck } from '../../utils/debugUtils';

const Produk = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuth();
  const { isConnected, walletAddress, balance } = useWallet();
  const [produk, setProduk] = useState([]);
  const [gamePopuler, setGamePopuler] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isUsingDummyData, setIsUsingDummyData] = useState(false);
  const toastShownRef = useRef(new Set()); // Track toast yang sudah ditampilkan
  const lastGameParamRef = useRef(''); // Track parameter game terakhir
  const [filters, setFilters] = useState({
    search: '',
    namaGame: '',
    hargaMin: '',
    hargaMax: '',
    sortBy: 'dibuatPada',
    sortOrder: 'desc'
  });
  const [pagination, setPagination] = useState({
    currentPage: 1,
    totalPages: 1,
    totalItems: 0,
    itemsPerPage: 12
  });
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [showTransactionDetail, setShowTransactionDetail] = useState(false);
  const [showSmartContractPurchase, setShowSmartContractPurchase] = useState(false);
  
  // State untuk image viewer
  const [showImageViewer, setShowImageViewer] = useState(false);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [viewerImages, setViewerImages] = useState([]);

  // Real-time updates hook dengan throttling untuk mencegah glitch
  const { triggerUpdate, broadcastUpdate } = useMarketplaceUpdates((source) => {
    // Hanya reload jika bukan dari tab yang sama dan tidak sedang loading
    if (source !== 'manual' && !loading) {
      // Throttle updates untuk mencegah glitch
      setTimeout(() => {
        loadProduk();
        loadGamePopuler();
      }, 1000);
    }
  });

  // Listen for product reservation events
  useEffect(() => {
    const handleProductReserved = (event) => {
      console.log('🔄 Product reserved:', event.detail);
      // Force refresh produk list untuk menghilangkan produk yang direservasi
      setTimeout(() => {
        loadProduk();
      }, 500); // Small delay to ensure database is updated
    };

    const handleTransactionExpired = (event) => {
      console.log('🔄 Transaction expired, product returned to market:', event.detail);
      // Refresh produk list untuk menampilkan kembali produk yang expired
      loadProduk();
    };

    window.addEventListener('product-reserved', handleProductReserved);
    window.addEventListener('transaction-expired', handleTransactionExpired);

    return () => {
      window.removeEventListener('product-reserved', handleProductReserved);
      window.removeEventListener('transaction-expired', handleTransactionExpired);
    };
  }, []);

  // Read URL parameters and set initial filters
  useEffect(() => {
    const searchParams = new URLSearchParams(location.search);
    const gameParam = searchParams.get('game');
    const searchParam = searchParams.get('search');
    const minEthParam = searchParams.get('minEth');
    const maxEthParam = searchParams.get('maxEth');
    const sortByParam = searchParams.get('sortBy');
    const sortOrderParam = searchParams.get('sortOrder');
    
    if (gameParam || searchParam || minEthParam || maxEthParam || sortByParam || sortOrderParam) {
      setFilters(prev => ({
        ...prev,
        namaGame: gameParam || '',
        search: searchParam || '',
        hargaMin: minEthParam || '',
        hargaMax: maxEthParam || '',
        sortBy: sortByParam || 'dibuatPada',
        sortOrder: sortOrderParam || 'desc'
      }));
      
      // Track game parameter changes without showing toast
      if (gameParam && gameParam !== lastGameParamRef.current) {
        lastGameParamRef.current = gameParam;
      } else if (!gameParam && lastGameParamRef.current) {
        // Reset when no game filter
        lastGameParamRef.current = '';
      }
    }
  }, [location.search]);

  // Load data saat component mount dan saat filter/pagination berubah
  useEffect(() => {
    loadProduk();
    loadGamePopuler();
  }, [filters, pagination.currentPage]);

  // Reset modal when user authentication changes
  useEffect(() => {
    if (!isAuthenticated) {
      setSelectedProduct(null);
      setIsModalOpen(false);
      setShowTransactionDetail(false);
      setShowSmartContractPurchase(false);
      document.body.style.overflow = 'unset';
    }
  }, [isAuthenticated]);

  // Auto-refresh data setiap 30 detik untuk data yang fresh (tanpa dependency yang menyebabkan re-create interval)
  useEffect(() => {
    const interval = setInterval(() => {
      loadProduk();
    }, 30000); // 30 detik
    return () => clearInterval(interval);
  }, []); // Empty dependency array untuk mencegah re-create interval

  const loadProduk = async () => {
    try {
      setLoading(true);
      const params = {
        page: pagination.currentPage,
        limit: pagination.itemsPerPage,
        ...filters,
        _t: Date.now() // Cache buster
      };
      
      // Convert ETH filter to appropriate parameter names for API
      if (filters.hargaMin) {
        params.hargaEthMin = filters.hargaMin;
        delete params.hargaMin;
      }
      if (filters.hargaMax) {
        params.hargaEthMax = filters.hargaMax;
        delete params.hargaMax;
      }
      
      Object.keys(params).forEach(key => {
        if (params[key] === '' || params[key] === null || params[key] === undefined) {
          delete params[key];
        }
      });
      
      const response = await apiService.produk.getAllProduk(params);
      if (response?.data?.sukses) {
        const produkData = response.data.data?.produk || [];
        const paginationData = response.data.data?.pagination || {
          currentPage: 1,
          totalPages: produkData.length > 0 ? 1 : 0,
          totalItems: produkData.length,
          itemsPerPage: 12
        };
        setProduk(produkData);
        setPagination(paginationData);
        setIsUsingDummyData(false);
      } else {
        // Jika response tidak sukses (sangat jarang terjadi)
        console.error('❌ Response API tidak sukses:', response);
        setProduk([]);
        setPagination({
          currentPage: 1,
          totalPages: 0,
          totalItems: 0,
          itemsPerPage: 12
        });
        setIsUsingDummyData(false);
        toast.error('Response API tidak valid.');
      }
    } catch (error) {
      console.error('❌ Error loading produk:', {
        message: error.message,
        status: error.response?.status,
        statusText: error.response?.statusText,
        url: error.config?.url,
        method: error.config?.method
      });
      
      // Hanya tampilkan toast error jika benar-benar ada masalah koneksi
      if (error.code === 'ERR_NETWORK' || error.message === 'Network Error') {
        toast.error('Tidak dapat terhubung ke server. Pastikan server berjalan.');
      } else if (error.response?.status >= 500) {
        console.error('🔥 Server Error 500 - Detail:', {
          data: error.response?.data,
          config: error.config,
          params: error.config?.params
        });
        toast.error('Server sedang bermasalah. Silakan refresh halaman.');
      } else if (error.response?.status === 404) {
        // Endpoint tidak ditemukan, tapi tidak perlu toast
      } else {
        // Error loading produk, tapi tidak perlu toast
      }
      
      // Set array kosong
      setProduk([]);
      setPagination({
        currentPage: 1,
        totalPages: 0,
        totalItems: 0,
        itemsPerPage: 12
      });
      setIsUsingDummyData(false);
    } finally {
      setLoading(false);
    }
  };

  const loadGamePopuler = async () => {
    try {
      const response = await apiService.produk.getAllProduk();
      if (response?.data?.sukses) {
        const produkList = response.data.data?.produk || [];
        const gameMap = {};
        produkList.forEach(produk => {
          if (gameMap[produk.namaGame]) {
            gameMap[produk.namaGame].jumlahProduk++;
          } else {
            gameMap[produk.namaGame] = {
              namaGame: produk.namaGame,
              jumlahProduk: 1
            };
          }
        });
        setGamePopuler(Object.values(gameMap));
      } else {
        setGamePopuler([]);
      }
    } catch (error) {
      console.error('❌ Error loading game populer:', {
        message: error.message,
        status: error.response?.status,
        url: error.config?.url
      });
      setGamePopuler([]);
    }
  };

  const handleFilterChange = (key, value) => {
    const newFilters = { ...filters, [key]: value };
    setFilters(newFilters);
    setPagination(prev => ({ ...prev, currentPage: 1 }));
    
    // Update URL parameters
    updateURLParams(newFilters);
  };

  const updateURLParams = (currentFilters) => {
    const searchParams = new URLSearchParams();
    
    // Add all non-empty filters to URL
    if (currentFilters.namaGame) {
      searchParams.set('game', currentFilters.namaGame);
    }
    if (currentFilters.search) {
      searchParams.set('search', currentFilters.search);
    }
    if (currentFilters.hargaMin) {
      searchParams.set('minEth', currentFilters.hargaMin);
    }
    if (currentFilters.hargaMax) {
      searchParams.set('maxEth', currentFilters.hargaMax);
    }
    if (currentFilters.sortBy !== 'dibuatPada') {
      searchParams.set('sortBy', currentFilters.sortBy);
    }
    if (currentFilters.sortOrder !== 'desc') {
      searchParams.set('sortOrder', currentFilters.sortOrder);
    }
    
    const newURL = searchParams.toString() 
      ? `${location.pathname}?${searchParams.toString()}`
      : location.pathname;
      
    navigate(newURL, { replace: true });
  };

  const resetFilters = () => {
    const defaultFilters = {
      search: '',
      namaGame: '',
      hargaMin: '',
      hargaMax: '',
      sortBy: 'dibuatPada',
      sortOrder: 'desc'
    };
    setFilters(defaultFilters);
    setPagination(prev => ({ ...prev, currentPage: 1 }));
    
    // Clear URL parameters
    navigate(location.pathname, { replace: true });
  };

  const formatRupiah = (amount) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0
    }).format(amount);
  };

  const formatTanggal = (dateString) => {
    return new Date(dateString).toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
  };

  const openModal = (product) => {
    setSelectedProduct(product);
    setIsModalOpen(true);
    document.body.style.overflow = 'hidden'; // Prevent background scroll
  };

  const closeModal = () => {
    setSelectedProduct(null);
    setIsModalOpen(false);
    document.body.style.overflow = 'unset'; // Restore scroll
  };

  // Close modal on escape key
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape' && isModalOpen) {
        closeModal();
      }
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isModalOpen]);

  // Cleanup scroll when component unmounts
  useEffect(() => {
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, []);

  const handleDirectPurchase = async () => {
    // Validasi login
    if (!isAuthenticated) {
      toast.error('Silakan login terlebih dahulu');
      navigate('/masuk');
      return;
    }

    // Validasi role admin
    if (user?.role === 'ADMIN') {
      toast.error('Admin tidak dapat membeli produk');
      return;
    }

    // Validasi wallet
    if (!user?.walletAddress) {
      toast.error('Silakan hubungkan wallet terlebih dahulu');
      navigate('/profil');
      return;
    }

    // Validasi wallet connected
    if (!isConnected) {
      toast.error('Silakan connect wallet di navbar terlebih dahulu');
      return;
    }

    // Validasi wallet match
    if (walletAddress?.toLowerCase() !== user.walletAddress.toLowerCase()) {
      toast.error('Wallet yang terhubung tidak sesuai dengan akun Anda');
      return;
    }

    // Validasi tidak beli produk sendiri
    if (user) {
      const isOwner = selectedProduct.penjual?.id === user.id || 
                     selectedProduct.user?.id === user.id || 
                     selectedProduct.penjualId === user.id ||
                     selectedProduct.penjual?.email === user.email;
      
      if (isOwner) {
        toast.error('Anda tidak dapat membeli produk sendiri');
        return;
      }
    }

    // Validasi produk masih dijual
    if (!selectedProduct.statusJual) {
      toast.error('Produk ini sudah tidak dijual');
      return;
    }

    // Tutup modal produk dan tampilkan modal detail transaksi
    setIsModalOpen(false);
    document.body.style.overflow = 'unset'; // Restore scroll
    setShowTransactionDetail(true);
  };

  const handleTransactionDetailConfirm = () => {
    setShowTransactionDetail(false);
    setShowSmartContractPurchase(true);
  };

  const handleTransactionDetailCancel = () => {
    setShowTransactionDetail(false);
    setSelectedProduct(null);
    document.body.style.overflow = 'unset'; // Restore scroll
  };

  const handlePurchaseSuccess = (result) => {
    toast.success('Pembelian berhasil! Transaksi telah dibuat di blockchain menggunakan wallet Anda.');
    setShowSmartContractPurchase(false);
    setSelectedProduct(null);
    document.body.style.overflow = 'unset'; // Restore scroll
    
    // Force refresh marketplace data untuk semua tab/window
    window.dispatchEvent(new Event('refreshMarketplace'));
    
    // Refresh produk data di halaman ini juga
    loadProduk();
    
    // Redirect ke dashboard pembeli
    setTimeout(() => {
      navigate('/pembeli');
    }, 2000);
  };

  const handlePurchaseCancel = () => {
    setShowSmartContractPurchase(false);
    setSelectedProduct(null);
    document.body.style.overflow = 'unset'; // Restore scroll
  };

  // Fungsi untuk mengubah halaman pagination dan update URL
  const handlePaginationChange = (pageNum) => {
    setPagination(prev => ({ ...prev, currentPage: pageNum }));
    // Update URL agar tetap konsisten dengan filter dan halaman
    const searchParams = new URLSearchParams(location.search);
    if (pageNum > 1) {
      searchParams.set('page', pageNum);
    } else {
      searchParams.delete('page');
    }
    const newURL = searchParams.toString() 
      ? `${location.pathname}?${searchParams.toString()}`
      : location.pathname;
    navigate(newURL, { replace: true });
  };

  // Fungsi untuk membuka image viewer
  const openImageViewer = (images, startIndex = 0) => {
    let processedImages = [];
    
    // Parse gambar data
    if (Array.isArray(images) && images.length > 0) {
      processedImages = images.filter(img => img && img.trim());
    } else if (typeof images === 'string' && images.trim()) {
      try {
        const parsed = JSON.parse(images);
        if (Array.isArray(parsed)) {
          processedImages = parsed.filter(img => img && img.trim());
        } else {
          processedImages = [images];
        }
      } catch (e) {
        processedImages = [images];
      }
    }
    
    if (processedImages.length > 0) {
      setViewerImages(processedImages);
      setCurrentImageIndex(Math.max(0, Math.min(startIndex, processedImages.length - 1)));
      setShowImageViewer(true);
    }
  };

  // Fungsi navigasi image viewer
  const nextImage = () => {
    setCurrentImageIndex((prev) => (prev + 1) % viewerImages.length);
  };

  const prevImage = () => {
    setCurrentImageIndex((prev) => (prev - 1 + viewerImages.length) % viewerImages.length);
  };

  // Handle keyboard navigation
  const handleKeyPress = (e) => {
    if (!showImageViewer) return;
    
    if (e.key === 'ArrowRight') {
      nextImage();
    } else if (e.key === 'ArrowLeft') {
      prevImage();
    } else if (e.key === 'Escape') {
      setShowImageViewer(false);
    }
  };

  // Add keyboard event listener
  React.useEffect(() => {
    document.addEventListener('keydown', handleKeyPress);
    return () => {
      document.removeEventListener('keydown', handleKeyPress);
    };
  }, [showImageViewer, viewerImages]);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-[90%] mx-auto px-4 sm:px-6 lg:px-8 py-4">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-md mb-3">
          <div className="px-6 py-3 border-b border-gray-300">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Marketplace Akun Game</h1>
              <p className="text-gray-600 mt-1">Temukan akun game impian Anda dengan harga terbaik</p>
            </div>
          </div>
        </div>

        <div className="flex flex-col lg:flex-row gap-4">
          {/* Sidebar Filter */}
          <div className="lg:w-80 flex-shrink-0">
            <div className="bg-white rounded-lg shadow-md p-4 sticky top-4 border border-gray-100">
              <div className="flex items-center justify-between mb-4 pb-3 border-b border-gray-300">
                <h2 className="text-lg font-semibold text-gray-900">
                  Filter Pencarian
                </h2>
                <button 
                  onClick={resetFilters} 
                  className="text-sm text-primary-600 hover:text-primary-700 font-medium px-3 py-1 rounded-lg hover:bg-primary-50 transition-colors"
                >
                  Reset
                </button>
              </div>
              {/* Filter Game */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Game
                </label>
                <select
                  value={filters.namaGame}
                  onChange={(e) => handleFilterChange('namaGame', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 bg-gray-50 hover:bg-white transition-colors text-sm"
                >
                  <option value="">Semua Game</option>
                  <option value="Mobile Legends">Mobile Legends</option>
                  <option value="Free Fire">Free Fire</option>
                  <option value="PUBG Mobile">PUBG Mobile</option>
                  <option value="Genshin Impact">Genshin Impact</option>
                </select>
              </div>

              {/* Filter Harga ETH */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Rentang Harga (ETH)
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <input
                      type="number"
                      step="0.001"
                      placeholder="Min ETH"
                      value={filters.hargaMin}
                      onChange={(e) => handleFilterChange('hargaMin', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 text-sm bg-gray-50 hover:bg-white transition-colors"
                    />
                  </div>
                  <div>
                    <input
                      type="number"
                      step="0.001"
                      placeholder="Max ETH"
                      value={filters.hargaMax}
                      onChange={(e) => handleFilterChange('hargaMax', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 text-sm bg-gray-50 hover:bg-white transition-colors"
                    />
                  </div>
                </div>
                <div className="mt-3">
                  <div className="text-xs font-medium text-gray-600 mb-2">Filter Cepat:</div>
                  <div className="grid grid-cols-2 gap-1">
                    <button
                      onClick={() => {
                        setFilters(prev => ({ ...prev, hargaMin: '0.001', hargaMax: '0.01' }));
                        setPagination(prev => ({ ...prev, currentPage: 1 }));
                        updateURLParams({ ...filters, hargaMin: '0.001', hargaMax: '0.01' });
                      }}
                      className="px-2 py-1 text-xs bg-primary-50 hover:bg-primary-100 rounded-md text-primary-700 font-medium transition-colors"
                    >
                      0.001 - 0.01
                    </button>
                    <button
                      onClick={() => {
                        setFilters(prev => ({ ...prev, hargaMin: '0.01', hargaMax: '0.05' }));
                        setPagination(prev => ({ ...prev, currentPage: 1 }));
                        updateURLParams({ ...filters, hargaMin: '0.01', hargaMax: '0.05' });
                      }}
                      className="px-2 py-1 text-xs bg-primary-50 hover:bg-primary-100 rounded-md text-primary-700 font-medium transition-colors"
                    >
                      0.01 - 0.05
                    </button>
                    <button
                      onClick={() => {
                        setFilters(prev => ({ ...prev, hargaMin: '0.05', hargaMax: '0.1' }));
                        setPagination(prev => ({ ...prev, currentPage: 1 }));
                        updateURLParams({ ...filters, hargaMin: '0.05', hargaMax: '0.1' });
                      }}
                      className="px-2 py-1 text-xs bg-primary-50 hover:bg-primary-100 rounded-md text-primary-700 font-medium transition-colors"
                    >
                      0.05 - 0.1
                    </button>
                    <button
                      onClick={() => {
                        setFilters(prev => ({ ...prev, hargaMin: '0.1', hargaMax: '' }));
                        setPagination(prev => ({ ...prev, currentPage: 1 }));
                        updateURLParams({ ...filters, hargaMin: '0.1', hargaMax: '' });
                      }}
                      className="px-2 py-1 text-xs bg-primary-50 hover:bg-primary-100 rounded-md text-primary-700 font-medium transition-colors"
                    >
                      {'>'} 0.1 ETH
                    </button>
                  </div>
                </div>
              </div>

              {/* Filter Urutkan */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Urutkan
                </label>
                <select
                  value={`${filters.sortBy}-${filters.sortOrder}`}
                  onChange={(e) => {
                    const [sortBy, sortOrder] = e.target.value.split('-');
                    
                    // Update both sortBy and sortOrder at once
                    const newFilters = { ...filters, sortBy, sortOrder };
                    setFilters(newFilters);
                    setPagination(prev => ({ ...prev, currentPage: 1 }));
                    updateURLParams(newFilters);
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 bg-gray-50 hover:bg-white transition-colors text-sm"
                >
                  <option value="dibuatPada-desc">Terbaru</option>
                  <option value="dibuatPada-asc">Terlama</option>
                  <option value="harga-asc">Harga Terendah</option>
                  <option value="harga-desc">Harga Tertinggi</option>
                  <option value="judulProduk-asc">Nama A-Z</option>
                  <option value="judulProduk-desc">Nama Z-A</option>
                </select>
              </div>
            </div>
          </div>
          
          {/* Main Content Area */}
          <div className="flex-1">
            {/* Search Bar - Thinner design */}
            <div className="bg-white rounded-lg shadow-md mb-2 p-2">
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <MagnifyingGlassIcon className="h-4 w-4 text-gray-400" />
                </div>
                <input
                  type="text"
                  placeholder="Cari produk..."
                  value={filters.search}
                  onChange={(e) => handleFilterChange('search', e.target.value)}
                  className="block w-full pl-9 pr-9 py-2 text-sm border border-gray-300 rounded-md bg-gray-50 placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-primary-500 focus:border-primary-500 focus:bg-white transition-all duration-200"
                />
                {filters.search && (
                  <button
                    onClick={() => handleFilterChange('search', '')}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    <XMarkIcon className="h-4 w-4" />
                  </button>
                )}
              </div>
            </div>

            {/* Active Filters Display */}
            {(filters.namaGame || filters.search || filters.hargaMin || filters.hargaMax || !(filters.sortBy === 'dibuatPada' && filters.sortOrder === 'desc')) && (
              <div className="bg-white rounded-lg shadow-md p-2 mb-3">
                <div className="flex items-center justify-between">
                  <div className="flex flex-wrap gap-2">
                    {filters.namaGame && (
                      <span className="inline-flex items-center px-2 py-1 rounded-md text-xs bg-blue-50 text-blue-700 border border-blue-200">
                        {filters.namaGame}
                        <button
                          onClick={() => handleFilterChange('namaGame', '')}
                          className="ml-1 text-blue-500 hover:text-blue-700 font-medium"
                        >
                          ×
                        </button>
                      </span>
                    )}
                    {filters.search && (
                      <span className="inline-flex items-center px-2 py-1 rounded-md text-xs bg-green-50 text-green-700 border border-green-200">
                        "{filters.search}"
                        <button
                          onClick={() => handleFilterChange('search', '')}
                          className="ml-1 text-green-500 hover:text-green-700 font-medium"
                        >
                          ×
                        </button>
                      </span>
                    )}
                    {(filters.hargaMin || filters.hargaMax) && (
                      <span className="inline-flex items-center px-2 py-1 rounded-md text-xs bg-yellow-50 text-yellow-700 border border-yellow-200">
                        {filters.hargaMin && filters.hargaMax 
                          ? `${parseFloat(filters.hargaMin)} - ${parseFloat(filters.hargaMax)} ETH`
                          : filters.hargaMin 
                            ? `≥ ${parseFloat(filters.hargaMin)} ETH`
                            : `≤ ${parseFloat(filters.hargaMax)} ETH`
                        }
                        <button
                          onClick={() => {
                            handleFilterChange('hargaMin', '');
                            handleFilterChange('hargaMax', '');
                          }}
                          className="ml-1 text-yellow-500 hover:text-yellow-700 font-medium"
                        >
                          ×
                        </button>
                      </span>
                    )}
                    {!(filters.sortBy === 'dibuatPada' && filters.sortOrder === 'desc') && (
                      <span className="inline-flex items-center px-2 py-1 rounded-md text-xs bg-purple-50 text-purple-700 border border-purple-200">
                        {(() => {
                          if (filters.sortBy === 'dibuatPada' && filters.sortOrder === 'asc') return 'Terlama';
                          if (filters.sortBy === 'harga' && filters.sortOrder === 'asc') return 'Harga Terendah';
                          if (filters.sortBy === 'harga' && filters.sortOrder === 'desc') return 'Harga Tertinggi';
                          if (filters.sortBy === 'judulProduk' && filters.sortOrder === 'asc') return 'Nama A-Z';
                          if (filters.sortBy === 'judulProduk' && filters.sortOrder === 'desc') return 'Nama Z-A';
                          return `${filters.sortBy}-${filters.sortOrder}`;
                        })()}
                        <button
                          onClick={() => {
                            handleFilterChange('sortBy', 'dibuatPada');
                            handleFilterChange('sortOrder', 'desc');
                          }}
                          className="ml-1 text-purple-500 hover:text-purple-700 font-medium"
                        >
                          ×
                        </button>
                      </span>
                    )}
                  </div>
                  <button
                    onClick={resetFilters}
                    className="inline-flex items-center px-2 py-1 text-xs font-medium text-red-600 bg-red-50 hover:bg-red-100 rounded-md transition-colors duration-200 ml-3"
                  >
                    <XMarkIcon className="h-3 w-3 mr-1" />
                    <span>Reset</span>
                  </button>
                </div>
              </div>
            )}

            {loading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                {[...Array(6)].map((_, i) => (
                  <div key={i} className="bg-white rounded-lg shadow-md p-4 animate-pulse">
                    <div className="bg-gray-200 h-48 rounded-md mb-4"></div>
                    <div className="space-y-2">
                      <div className="bg-gray-200 h-4 rounded w-3/4"></div>
                      <div className="bg-gray-200 h-4 rounded w-1/2"></div>
                    </div>
                  </div>
                ))}
              </div>
            ) : produk.length === 0 ? (
              <div className="text-center py-12">
                <PlusIcon className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">Tidak ada produk ditemukan</h3>
                <p className="text-gray-500 mb-4">Coba ubah filter atau kata kunci pencarian</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 mb-6">
                {produk.map((item) => (
                  <div
                    key={item.id}
                    onClick={() => openModal(item)}
                    className="bg-white rounded-lg shadow-md hover:shadow-md transition-shadow overflow-hidden group cursor-pointer"
                  >
                    <div className="relative h-48 bg-gray-100">
                      {(() => {
                        // Handle both array and string format for images
                        let imageUrl = null;
                        let images = [];
                        
                        // Parse gambar data - could be array, JSON string, or regular string
                        if (Array.isArray(item.gambar) && item.gambar.length > 0) {
                          images = item.gambar;
                          imageUrl = item.gambar[0];
                        } else if (typeof item.gambar === 'string' && item.gambar.trim()) {
                          try {
                            // Try to parse as JSON array first
                            const parsed = JSON.parse(item.gambar);
                            if (Array.isArray(parsed) && parsed.length > 0) {
                              images = parsed;
                              imageUrl = parsed[0];
                            } else {
                              // Single string URL
                              imageUrl = item.gambar;
                              images = [item.gambar];
                            }
                          } catch (e) {
                            // Not JSON, treat as single URL
                            imageUrl = item.gambar;
                            images = [item.gambar];
                          }
                        }

                        return imageUrl ? (
                          <img
                            src={imageUrl}
                            alt={item.judulProduk}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                            onError={(e) => {
                              e.target.style.display = 'none';
                              e.target.nextElementSibling.style.display = 'flex';
                            }}
                          />
                        ) : null;
                      })()}
                      <div 
                        className="w-full h-full flex flex-col items-center justify-center text-center"
                        style={{ display: (() => {
                          let imageUrl = null;
                          if (Array.isArray(item.gambar) && item.gambar.length > 0) {
                            imageUrl = item.gambar[0];
                          } else if (typeof item.gambar === 'string' && item.gambar.trim()) {
                            try {
                              const parsed = JSON.parse(item.gambar);
                              if (Array.isArray(parsed) && parsed.length > 0) {
                                imageUrl = parsed[0];
                              } else {
                                imageUrl = item.gambar;
                              }
                            } catch (e) {
                              imageUrl = item.gambar;
                            }
                          }
                          return imageUrl ? 'none' : 'flex';
                        })() }}
                      >
                        <PhotoIcon className="h-16 w-16 text-gray-300 mb-2" />
                        <span className="text-sm text-gray-400">Tidak ada gambar</span>
                      </div>
                    </div>
                    <div className="p-4">
                      <div className="flex items-center text-sm text-gray-500 mb-2">
                        <DevicePhoneMobileIcon className="h-4 w-4 mr-1" />
                        <span>{item.namaGame}</span>
                      </div>
                      <LineClamp lines={2} className="font-semibold text-gray-900 mb-3 group-hover:text-primary-600 transition-colors">
                        {item.judulProduk}
                      </LineClamp>
                      <div className="flex justify-between items-center">
                        <div>
                          <div className="text-lg font-bold text-primary-600">
                            {item.hargaEth ? `${item.hargaEth} ETH` : 'N/A'}
                          </div>
                          <div className="text-xs text-gray-500 mt-1">
                            ≈ {formatRupiah(item.harga || 0)}
                          </div>
                        </div>
                        <div className="text-xs text-gray-500 flex items-center">
                          <ClockIcon className="h-3 w-3 mr-1" />
                          {formatTanggal(item.dibuatPada || new Date().toISOString())}
                        </div>
                      </div>
                      <div className="mt-3 pt-3 border-t border-gray-100 flex items-center text-sm text-gray-500">
                        <UserIcon className="h-4 w-4 mr-1" />
                        <span>Oleh {item.penjual?.nama || 'Penjual'}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Pagination */}
            {pagination.totalPages > 1 && (
              <div className="mt-8 flex items-center justify-between">
                <div className="text-sm text-gray-700">
                  Halaman {pagination.currentPage} dari {pagination.totalPages}
                </div>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => handlePaginationChange(Math.max(1, pagination.currentPage - 1))}
                    disabled={pagination.currentPage === 1}
                    className="px-3 py-2 text-sm font-medium text-gray-500 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Sebelumnya
                  </button>
                  {/* Page numbers */}
                  <div className="flex items-center space-x-1">
                    {Array.from({ length: Math.min(5, pagination.totalPages) }, (_, i) => {
                      const pageNum = i + 1;
                      const isActive = pageNum === pagination.currentPage;
                      return (
                        <button
                          key={pageNum}
                          onClick={() => handlePaginationChange(pageNum)}
                          className={`px-3 py-2 text-sm font-medium rounded-md ${
                            isActive
                              ? 'bg-primary-600 text-white'
                              : 'text-gray-700 bg-white border border-gray-300 hover:bg-gray-50'
                          }`}
                        >
                          {pageNum}
                        </button>
                      );
                    })}
                  </div>
                  <button
                    onClick={() => handlePaginationChange(Math.min(pagination.totalPages, pagination.currentPage + 1))}
                    disabled={pagination.currentPage === pagination.totalPages}
                    className="px-3 py-2 text-sm font-medium text-gray-500 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Selanjutnya
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Modal Pop-up Detail Produk - Design sesuai produk.md */}
        {isModalOpen && selectedProduct && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            {/* Modal Content */}
            <div className="bg-white rounded-lg max-w-6xl w-full max-h-[95vh] overflow-y-auto shadow-2xl">
              <div className="p-6">
                <div className="flex justify-between items-center mb-6">
                  <h3 className="text-xl font-semibold text-gray-900">
                    Detail Produk
                  </h3>
                  <button
                    onClick={closeModal}
                    className="text-gray-400 hover:text-red-500 text-2xl font-bold px-2"
                    aria-label="Tutup"
                  >
                    ×
                  </button>
                </div>
                
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Left Side - Image Section */}
                    <div className="relative bg-gradient-to-br from-gray-50 to-gray-100 p-4">
                      {/* Main Image - Lebih besar */}
                      <div 
                        className="h-80 bg-gradient-to-br from-gray-200 to-gray-300 rounded-lg mb-3 relative overflow-hidden cursor-pointer hover:bg-gray-300 transition-colors"
                        onClick={() => {
                          // Parse gambar untuk image viewer
                          let images = [];
                          if (Array.isArray(selectedProduct.gambar) && selectedProduct.gambar.length > 0) {
                            images = selectedProduct.gambar;
                          } else if (typeof selectedProduct.gambar === 'string' && selectedProduct.gambar.trim()) {
                            try {
                              const parsed = JSON.parse(selectedProduct.gambar);
                              if (Array.isArray(parsed)) {
                                images = parsed.filter(img => img && img.trim());
                              } else {
                                images = [selectedProduct.gambar];
                              }
                            } catch (e) {
                              images = [selectedProduct.gambar];
                            }
                          }
                          if (images.length > 0) {
                            openImageViewer(images, 0);
                          }
                        }}
                      >
                        {(() => {
                          // Handle both array and string format for images in modal
                          let imageUrl = null;
                          let images = [];
                          
                          if (Array.isArray(selectedProduct.gambar) && selectedProduct.gambar.length > 0) {
                            images = selectedProduct.gambar;
                            imageUrl = selectedProduct.gambar[0];
                          } else if (typeof selectedProduct.gambar === 'string' && selectedProduct.gambar.trim()) {
                            try {
                              // Try to parse as JSON array first
                              const parsed = JSON.parse(selectedProduct.gambar);
                              if (Array.isArray(parsed) && parsed.length > 0) {
                                images = parsed;
                                imageUrl = parsed[0];
                              } else {
                                // Single string URL
                                imageUrl = selectedProduct.gambar;
                                images = [selectedProduct.gambar];
                              }
                            } catch (e) {
                              // Not JSON, treat as single URL
                              imageUrl = selectedProduct.gambar;
                              images = [selectedProduct.gambar];
                            }
                          }

                          console.log('🖼️ Processing modal gambar for', selectedProduct.kodeProduk, ':', {
                            original: selectedProduct.gambar,
                            parsed: images,
                            imageUrl: imageUrl
                          });

                          return imageUrl ? (
                            <img
                              src={imageUrl}
                              alt={selectedProduct.judulProduk}
                              className="w-full h-full object-cover"
                              onError={(e) => {
                                console.log('❌ Gambar modal gagal dimuat:', imageUrl);
                                e.target.style.display = 'none';
                                e.target.nextElementSibling.style.display = 'flex';
                              }}
                              onLoad={() => {
                                console.log('✅ Gambar modal berhasil dimuat:', imageUrl);
                              }}
                            />
                          ) : null;
                        })()}
                        <div 
                          className="w-full h-full flex flex-col items-center justify-center text-center"
                          style={{ display: (() => {
                            let imageUrl = null;
                            if (Array.isArray(selectedProduct.gambar) && selectedProduct.gambar.length > 0) {
                              imageUrl = selectedProduct.gambar[0];
                            } else if (typeof selectedProduct.gambar === 'string' && selectedProduct.gambar.trim()) {
                              try {
                                const parsed = JSON.parse(selectedProduct.gambar);
                                if (Array.isArray(parsed) && parsed.length > 0) {
                                  imageUrl = parsed[0];
                                } else {
                                  imageUrl = selectedProduct.gambar;
                                }
                              } catch (e) {
                                imageUrl = selectedProduct.gambar;
                              }
                            }
                            return imageUrl ? 'none' : 'flex';
                          })() }}
                        >
                          <PhotoIcon className="h-24 w-24 text-gray-400 mb-2" />
                          <p className="text-gray-500 text-sm">Tidak ada gambar</p>
                        </div>
                      </div>

                      {/* Thumbnail Images - Only show actual additional images */}
                      {(() => {
                        let images = [];
                        
                        // Parse gambar data for thumbnails
                        if (Array.isArray(selectedProduct.gambar) && selectedProduct.gambar.length > 1) {
                          images = selectedProduct.gambar.slice(1); // Skip first image, get all remaining
                        } else if (typeof selectedProduct.gambar === 'string' && selectedProduct.gambar.trim()) {
                          try {
                            const parsed = JSON.parse(selectedProduct.gambar);
                            if (Array.isArray(parsed) && parsed.length > 1) {
                              images = parsed.slice(1); // Skip first image, get all remaining
                            }
                          } catch (e) {
                            // Not JSON or single image, no thumbnails
                            images = [];
                          }
                        }
                        
                        // Only render if there are actual additional images
                        if (images.length === 0) {
                          return null;
                        }
                        
                        return (
                          <div className="grid grid-cols-4 gap-2 mb-3">
                            {images.map((img, index) => (
                              <div key={index} className="h-20 bg-gray-200 rounded-md flex items-center justify-center overflow-hidden border border-gray-300">
                                <img
                                  src={img}
                                  alt={`Gambar ${index + 2}`}
                                  className="w-full h-full object-cover hover:scale-105 transition-transform duration-200 cursor-pointer"
                                  onError={(e) => {
                                    console.log('❌ Thumbnail gagal dimuat:', img);
                                    e.target.style.display = 'none';
                                    e.target.nextElementSibling.style.display = 'flex';
                                  }}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    const allImages = (() => {
                                      if (Array.isArray(selectedProduct.gambar)) {
                                        return selectedProduct.gambar;
                                      } else if (typeof selectedProduct.gambar === 'string' && selectedProduct.gambar.trim()) {
                                        try {
                                          const parsed = JSON.parse(selectedProduct.gambar);
                                          return Array.isArray(parsed) ? parsed : [selectedProduct.gambar];
                                        } catch (e) {
                                          return [selectedProduct.gambar];
                                        }
                                      }
                                      return [];
                                    })();
                                    openImageViewer(allImages, index + 1);
                                  }}
                                />
                                <div
                                  className="w-full h-full flex items-center justify-center"
                                  style={{ display: 'none' }}
                                >
                                  <PhotoIcon className="h-8 w-8 text-gray-400" />
                                </div>
                              </div>
                            ))}
                          </div>
                        );
                      })()}

                      {/* Product Info Card */}
                      <div className="bg-white rounded-lg p-3 shadow-md mb-3">
                        <div className="text-xs text-gray-500 mb-2">Informasi Produk</div>
                        <div className="space-y-1 text-xs">
                          <div className="flex justify-between">
                            <span className="text-gray-600">Status:</span>
                            <span className="font-medium text-green-600">Tersedia</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600">Diposting:</span>
                            <span className="font-medium text-gray-900">{formatTanggal(selectedProduct.dibuatPada)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600">Kategori:</span>
                            <span className="font-medium text-gray-900">{selectedProduct.namaGame}</span>
                          </div>
                        </div>
                      </div>

                      {/* Seller Info */}
                      <div className="bg-white rounded-lg p-3 shadow-md">
                        <div className="text-xs text-gray-500 mb-2">Informasi Penjual</div>
                        <div className="flex items-center space-x-3">
                          <div className="w-10 h-10 bg-gradient-to-br from-primary-400 to-primary-600 rounded-full flex items-center justify-center">
                            <UserIcon className="h-5 w-5 text-white" />
                          </div>
                          <div className="flex-1">
                            <div className="font-medium text-gray-900 text-sm">
                              {selectedProduct.penjual?.nama || 'Nama Penjual'}
                            </div>
                            <div className="text-xs text-gray-500">Penjual</div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Right Side - Details Section */}
                    <div className="p-6 flex flex-col h-full justify-between">
                      <div className="space-y-4 flex-1">
                        {/* Title & Game Info */}
                        <div>
                          <h1 className="text-2xl font-bold text-gray-900 leading-tight">
                            {selectedProduct.judulProduk || 'CONTOH JUDUL GAME'}
                          </h1>
                          <div className="text-gray-600 text-base mt-1">{selectedProduct.namaGame || 'Mobile Legends'}</div>
                          {selectedProduct.kodeProduk && (
                            <div className="text-primary-600 text-sm font-semibold mt-0.5">{selectedProduct.kodeProduk}</div>
                          )}
                        </div>

                        {/* Description Box */}
                        <div className="border border-gray-400 rounded-lg p-4">
                          <div className="font-semibold text-gray-900 mb-3 text-sm uppercase tracking-wide">
                            DESKRIPSI
                          </div>
                          <div className="space-y-2 text-sm text-gray-700">
                            {selectedProduct.deskripsi ? (
                              <div className="whitespace-pre-wrap leading-relaxed">
                                {selectedProduct.deskripsi}
                              </div>
                            ) : (
                              <>
                                <div className="flex justify-between">
                                  <span>Level:</span>
                                  <span className="font-medium">50</span>
                                </div>
                                <div className="flex justify-between">
                                  <span>Rank:</span>
                                  <span className="font-medium">Mythic</span>
                                </div>
                                <div className="flex justify-between">
                                  <span>Skin:</span>
                                  <span className="font-medium">120+</span>
                                </div>
                                <div className="flex justify-between">
                                  <span>Hero:</span>
                                  <span className="font-medium">Semua hero terbuka</span>
                                </div>
                                <div className="flex justify-between">
                                  <span>Bind:</span>
                                  <span className="font-medium">Moonton + Gmail</span>
                                </div>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                      {/* Harga & Tombol Aksi sticky di bawah */}
                      <div className="mt-6">
                        <div className="py-3">
                          <div className="flex items-center justify-between border-b border-gray-300 pb-2 mb-2">
                            <span className="text-gray-700 font-medium">Harga</span>
                            <span className="text-lg font-bold text-primary-600">
                              {selectedProduct.hargaEth ? `${selectedProduct.hargaEth} ETH` : '0.1 ETH'}
                            </span>
                          </div>
                          <div className="text-right text-gray-600">
                            {formatRupiah(selectedProduct.harga || 2000000)}
                          </div>
                        </div>
                        {/* Action Buttons - tetap di bawah */}
                        <div className="space-y-3 pt-4">
                          {/* Cek apakah user adalah pemilik produk */}
                          {(() => {
                            // Debug logging
                            debugOwnershipCheck(isAuthenticated, user, selectedProduct);
                            
                            // Jika user tidak login, pasti bukan pemilik
                            if (!isAuthenticated || !user) {
                              return false;
                            }
                            
                            const isOwner = selectedProduct.penjual?.id === user.id || 
                                           selectedProduct.user?.id === user.id ||
                                           selectedProduct.penjualId === user.id ||
                                           selectedProduct.penjual?.email === user.email;
                            
                            return isOwner;
                          })() ? (
                            <div className="grid grid-cols-2 gap-3">
                              <button
                                onClick={closeModal}
                                className="bg-gray-200 text-primary-700 px-6 py-3 rounded-lg font-semibold hover:bg-gray-300 transition-colors text-sm"
                              >
                                BATAL
                              </button>
                              <Link
                                to="/produk-saya"
                                onClick={closeModal}
                                className="bg-primary-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-primary-700 transition-colors text-sm flex items-center justify-center space-x-2"
                              >
                                <span>PRODUK SAYA</span>
                              </Link>
                            </div>
                          ) : !isAuthenticated ? (
                            <div className="grid grid-cols-2 gap-3">
                              <button
                                onClick={closeModal}
                                className="bg-gray-200 text-primary-700 px-6 py-3 rounded-lg font-semibold hover:bg-gray-300 transition-colors text-sm"
                              >
                                BATAL
                              </button>
                              <button
                                onClick={() => {
                                  closeModal();
                                  navigate('/masuk');
                                }}
                                className="bg-primary-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-primary-700 transition-colors text-sm"
                              >
                                LOGIN
                              </button>
                            </div>
                          ) : user?.role === 'ADMIN' ? (
                            <div className="grid grid-cols-1 gap-3">
                              <button
                                onClick={closeModal}
                                className="bg-gray-200 text-primary-700 px-6 py-3 rounded-lg font-semibold hover:bg-gray-300 transition-colors text-sm"
                              >
                                BATAL
                              </button>
                            </div>
                          ) : (
                            <div className="grid grid-cols-2 gap-3">
                              <button
                                onClick={closeModal}
                                className="bg-gray-200 text-primary-700 px-6 py-3 rounded-lg font-semibold hover:bg-gray-300 transition-colors text-sm"
                              >
                                BATAL
                              </button>
                              <button
                                onClick={handleDirectPurchase}
                                className="bg-primary-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-primary-700 transition-all duration-200 flex items-center justify-center space-x-2 shadow-lg hover:shadow-xl text-sm"
                              >
                                <span>BELI</span>
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
        )}

        {/* Transaction Detail Modal */}
        {showTransactionDetail && selectedProduct && (
          <TransactionDetailModal
            produk={selectedProduct}
            onConfirm={handleTransactionDetailConfirm}
            onCancel={handleTransactionDetailCancel}
            userWalletAddress={walletAddress}
            userBalance={balance}
            onPaymentStart={(produk, transaksi) => {
              console.log('Payment started for product:', produk.judulProduk);
              console.log('Transaction created:', transaksi);
              // Produk sudah otomatis muncul di dashboard pembeli melalui event listener
            }}
            onExpired={(produk) => {
              console.log('Payment expired for product:', produk.judulProduk);
              // Refresh marketplace untuk mengembalikan produk ke market
              loadProduk();
            }}
          />
        )}

        {/* Smart Contract Purchase Modal */}
        {showSmartContractPurchase && selectedProduct && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg max-w-md w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-xl font-semibold text-gray-900">
                    Pembelian dengan User Wallet
                  </h3>
                  <button
                    onClick={handlePurchaseCancel}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
                <PembelianKontrakPintar
                  produk={selectedProduct}
                  onSuccess={handlePurchaseSuccess}
                  onCancel={handlePurchaseCancel}
                />
              </div>
            </div>
          </div>
        )}

        {/* Modal Image Viewer */}
        {showImageViewer && viewerImages.length > 0 && (
          <div className="fixed inset-0 bg-black bg-opacity-90 flex items-center justify-center z-[60] p-4">
            <div className="relative max-w-7xl max-h-full w-full h-full flex items-center justify-center">
              {/* Tombol Close */}
              <button
                onClick={() => setShowImageViewer(false)}
                className="absolute top-4 right-4 z-10 bg-black bg-opacity-50 text-white p-2 rounded-full hover:bg-opacity-70 transition-all"
                aria-label="Tutup"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>

              {/* Tombol Previous */}
              {viewerImages.length > 1 && (
                <button
                  onClick={prevImage}
                  className="absolute left-4 top-1/2 transform -translate-y-1/2 z-10 bg-black bg-opacity-50 text-white p-3 rounded-full hover:bg-opacity-70 transition-all"
                  aria-label="Gambar Sebelumnya"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
                  </svg>
                </button>
              )}

              {/* Tombol Next */}
              {viewerImages.length > 1 && (
                <button
                  onClick={nextImage}
                  className="absolute right-4 top-1/2 transform -translate-y-1/2 z-10 bg-black bg-opacity-50 text-white p-3 rounded-full hover:bg-opacity-70 transition-all"
                  aria-label="Gambar Selanjutnya"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              )}

              {/* Gambar Utama */}
              <div className="relative max-w-full max-h-full flex items-center justify-center">
                <img
                  src={viewerImages[currentImageIndex]}
                  alt={`Gambar ${currentImageIndex + 1}`}
                  className="max-w-full max-h-full object-contain rounded-lg shadow-2xl"
                  onError={(e) => {
                    console.log('❌ Gambar viewer gagal dimuat:', viewerImages[currentImageIndex]);
                    e.target.style.display = 'none';
                    e.target.nextElementSibling.style.display = 'flex';
                  }}
                />
                <div 
                  className="w-full h-64 flex flex-col items-center justify-center text-center bg-gray-800 rounded-lg"
                  style={{ display: 'none' }}
                >
                  <PhotoIcon className="h-16 w-16 text-gray-400 mx-auto mb-2" />
                  <p className="text-gray-400 text-sm">Gambar tidak dapat dimuat</p>
                </div>
              </div>

              {/* Info Gambar */}
              <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 z-10">
                <div className="bg-black bg-opacity-50 text-white px-4 py-2 rounded-full text-sm">
                  {currentImageIndex + 1} dari {viewerImages.length}
                </div>
              </div>

              {/* Thumbnail Navigation */}
              {viewerImages.length > 1 && (
                <div className="absolute bottom-16 left-1/2 transform -translate-x-1/2 z-10">
                  <div className="flex space-x-2 bg-black bg-opacity-50 p-2 rounded-lg max-w-md overflow-x-auto">
                    {viewerImages.map((img, index) => (
                      <button
                        key={index}
                        onClick={() => setCurrentImageIndex(index)}
                        className={`flex-shrink-0 w-12 h-12 rounded overflow-hidden border-2 transition-all ${
                          index === currentImageIndex 
                            ? 'border-blue-500 opacity-100' 
                            : 'border-gray-500 opacity-60 hover:opacity-80'
                        }`}
                      >
                        <img
                          src={img}
                          alt={`Thumbnail ${index + 1}`}
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            e.target.style.display = 'none';
                            e.target.nextElementSibling.style.display = 'flex';
                          }}
                        />
                        <div 
                          className="w-full h-full flex items-center justify-center bg-gray-700"
                          style={{ display: 'none' }}
                        >
                          <PhotoIcon className="h-4 w-4 text-gray-400" />
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Instruksi Keyboard */}
              <div className="absolute top-4 left-4 z-10 bg-black bg-opacity-50 text-white p-2 rounded text-xs">
                <div>ESC: Tutup</div>
                {viewerImages.length > 1 && (
                  <>
                    <div>← →: Navigasi</div>
                  </>
                )}
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};

export default Produk;
