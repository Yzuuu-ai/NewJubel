import React, { useState, useEffect, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { adminAPI } from '../../layanan/api';
import AdminNavigation from '../../komponen/AdminNavigation';
import { 
  ShoppingBagIcon, 
  ExclamationTriangleIcon, 
  CheckCircleIcon,
  XCircleIcon,
  ClockIcon,
  EyeIcon,
  PhotoIcon
} from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';

const ProdukAdmin = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [produk, setProduk] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');
  const [selectedProduk, setSelectedProduk] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [updateLoading, setUpdateLoading] = useState(false);
  const [error, setError] = useState(null);
  
  // State untuk image viewer
  const [showImageViewer, setShowImageViewer] = useState(false);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [viewerImages, setViewerImages] = useState([]);

  // Read URL parameters for search
  useEffect(() => {
    const searchParams = new URLSearchParams(location.search);
    const searchParam = searchParams.get('search');
    const pageParam = searchParams.get('page');
    
    if (searchParam) {
      setSearchTerm(searchParam);
      setDebouncedSearchTerm(searchParam);
    }
    
    if (pageParam) {
      setCurrentPage(parseInt(pageParam) || 1);
    }
  }, [location.search]);

  // Debounce search term
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
    }, 500);

    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Reset to page 1 when search term changes
  useEffect(() => {
    setCurrentPage(1);
  }, [debouncedSearchTerm]);
  
  useEffect(() => {
    fetchProduk();
  }, [filter, currentPage, debouncedSearchTerm]);

  const fetchProduk = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const params = {
        page: currentPage,
        limit: 12,
        ...(filter !== 'all' && { statusProduk: filter }),
        ...(debouncedSearchTerm && { search: debouncedSearchTerm }),
        _t: Date.now() // Cache buster
      };
      
      console.log('Fetching products with params:', params);
      
      const response = await adminAPI.getAllProdukAdmin(params);
      
      if (response.data && response.data.sukses !== false) {
        const produkData = response.data.data?.produk || response.data.produk || [];
        const paginationData = response.data.data?.pagination || response.data.pagination || {};
        
        console.log('Product data received:', produkData);
        console.log('Pagination data:', paginationData);
        
        setProduk(produkData);
        setTotalPages(paginationData.totalPages || 1);
      } else {
        throw new Error(response.data?.pesan || 'Gagal memuat data produk');
      }
    } catch (error) {
      console.error('Error fetching produk:', error);
      setError('Gagal memuat data produk. Silakan coba lagi.');
      toast.error('Gagal memuat data produk');
    } finally {
      setLoading(false);
    }
  }, [filter, currentPage, debouncedSearchTerm]);

  const handleSearchChange = (value) => {
    setSearchTerm(value);
    // Don't update URL immediately, let debounce handle it
  };

  // Update URL when debounced search term changes
  useEffect(() => {
    const searchParams = new URLSearchParams(location.search);
    if (debouncedSearchTerm) {
      searchParams.set('search', debouncedSearchTerm);
    } else {
      searchParams.delete('search');
    }
    searchParams.delete('page'); // Reset page when searching
    
    const newURL = searchParams.toString() 
      ? `${location.pathname}?${searchParams.toString()}`
      : location.pathname;
      
    navigate(newURL, { replace: true });
  }, [debouncedSearchTerm, location.pathname, navigate]);

  const handlePaginationChange = (pageNum) => {
    setCurrentPage(pageNum);
    
    // Update URL parameters
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

  const handleDeleteProduct = async (produkId) => {
    if (!window.confirm('Yakin ingin menghapus produk ini? Tindakan ini tidak dapat dibatalkan.')) {
      return;
    }

    try {
      setUpdateLoading(true);
      const response = await adminAPI.deleteProduk(produkId);
      
      if (response.data.sukses) {
        await fetchProduk();
        setShowDetailModal(false);
        toast.success('Produk berhasil dihapus!');
      } else {
        throw new Error(response.data.pesan || 'Gagal menghapus produk');
      }
    } catch (error) {
      console.error('Error deleting product:', error);
      toast.error('Gagal menghapus produk: ' + (error.response?.data?.pesan || error.message));
    } finally {
      setUpdateLoading(false);
    }
  };

  const getStatusBadge = (status) => {
    const statusConfig = {
      'AKTIF': { color: 'bg-green-100 text-green-800', text: 'Aktif' },
      'PENDING': { color: 'bg-yellow-100 text-yellow-800', text: 'Pending' },
      'DITOLAK': { color: 'bg-red-100 text-red-800', text: 'Ditolak' },
      'TERJUAL': { color: 'bg-blue-100 text-blue-800', text: 'Terjual' },
      'DIHAPUS': { color: 'bg-gray-100 text-gray-500', text: 'Dihapus' }
    };
    const config = statusConfig[status] || { color: 'bg-gray-100 text-gray-800', text: status };
    return (
      <span className={`px-2 py-1 rounded text-xs font-medium ${config.color}`}>
        {config.text}
      </span>
    );
  };

  const handleDetailClick = (produkItem) => {
    setSelectedProduk(produkItem);
    setShowDetailModal(true);
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0
    }).format(amount);
  };

  const getStatusCounts = () => {
    return {
      aktif: produk.filter(p => p.statusProduk === 'AKTIF').length,
      pending: produk.filter(p => p.statusProduk === 'PENDING').length,
      terjual: produk.filter(p => p.statusProduk === 'TERJUAL').length,
      ditolak: produk.filter(p => p.statusProduk === 'DITOLAK').length,
      total: produk.length
    };
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

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-[90%] mx-auto">
          <div className="flex gap-6">
            <div className="flex-shrink-0">
              <AdminNavigation />
            </div>
            <div className="flex-1 flex items-center justify-center h-64">
              <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const statusCounts = getStatusCounts();

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-[90%] mx-auto">
        <div className="flex gap-6">
          {/* Navigation Panel - Kiri (seperti filter di market) */}
          <div className="flex-shrink-0">
            <AdminNavigation />
          </div>

          {/* Main Content - Kanan */}
          <div className="flex-1">
            {/* Header */}
            <div className="bg-white rounded-lg shadow-sm mb-6">
              <div className="px-6 py-4 border-b border-gray-200">
                <h1 className="text-2xl font-bold text-gray-900">Manajemen Produk</h1>
                <p className="text-gray-600 mt-1">Monitor dan moderasi semua produk di platform</p>
              </div>
            </div>

            {/* Error Message */}
            {error && (
              <div className="mb-6 bg-red-50 border border-red-200 rounded-md p-4">
                <div className="flex">
                  <ExclamationTriangleIcon className="h-5 w-5 text-red-400" />
                  <div className="ml-3">
                    <p className="text-sm text-red-800">{error}</p>
                    <button
                      onClick={fetchProduk}
                      className="mt-2 text-sm text-red-600 hover:text-red-500 underline"
                    >
                      Coba lagi
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Produk Grid with integrated search */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-100">
              <div className="px-6 py-4 border-b border-gray-200">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <h2 className="text-lg font-semibold text-gray-900">Daftar Produk</h2>
                  <div className="w-full sm:w-auto">
                    <input
                      type="text"
                      placeholder="Cari produk..."
                      value={searchTerm}
                      onChange={(e) => handleSearchChange(e.target.value)}
                      className="w-full sm:w-64 pl-4 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                    />
                  </div>
                </div>
              </div>
              
              {produk.length === 0 ? (
                <div className="px-6 py-16 text-center">
                  <ShoppingBagIcon className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                  <h3 className="mt-2 text-lg font-medium text-gray-900">
                    {searchTerm ? 'Tidak ada hasil pencarian' : 'Tidak ada produk'}
                  </h3>
                  <p className="mt-1 text-sm text-gray-500">
                    {searchTerm 
                      ? `Tidak ditemukan produk dengan kata kunci "${searchTerm}"`
                      : 'Belum ada produk yang sesuai dengan filter.'
                    }
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          No
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Produk
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Game
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Harga
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Penjual
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Status
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Tanggal
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Aksi
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {produk.map((item, index) => (
                        <tr key={item.id} className="hover:bg-gray-50">
                          <td className="px-6 py-2 whitespace-nowrap">
                            <div className="text-sm font-medium text-gray-900">
                              {(currentPage - 1) * 12 + index + 1}
                            </div>
                          </td>
                          <td className="px-6 py-2 whitespace-nowrap">
                            <div className="flex items-center">
                              <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center mr-3 overflow-hidden">
                                {(() => {
                                  // Handle both array and string format for images
                                  let imageUrl = null;
                                  
                                  // Parse gambar data - could be array, JSON string, or regular string
                                  if (Array.isArray(item.gambar) && item.gambar.length > 0) {
                                    imageUrl = item.gambar[0];
                                  } else if (typeof item.gambar === 'string' && item.gambar.trim()) {
                                    try {
                                      // Try to parse as JSON array first
                                      const parsed = JSON.parse(item.gambar);
                                      if (Array.isArray(parsed) && parsed.length > 0) {
                                        imageUrl = parsed[0];
                                      } else {
                                        // Single string URL
                                        imageUrl = item.gambar;
                                      }
                                    } catch (e) {
                                      // Not JSON, treat as single URL
                                      imageUrl = item.gambar;
                                    }
                                  }

                                  return imageUrl ? (
                                    <img
                                      src={imageUrl}
                                      alt={item.judulProduk}
                                      className="w-full h-full object-cover"
                                      onError={(e) => {
                                        console.log('❌ Gambar gagal dimuat:', imageUrl);
                                        e.target.style.display = 'none';
                                        e.target.nextElementSibling.style.display = 'flex';
                                      }}
                                      onLoad={() => {
                                        console.log('✅ Gambar berhasil dimuat:', imageUrl);
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
                                  <PhotoIcon className="h-6 w-6 text-gray-300" />
                                </div>
                              </div>
                              <div>
                                <div className="text-sm font-medium text-gray-900 max-w-xs truncate">
                                  {item.judulProduk}
                                </div>
                                <div className="text-xs text-gray-500">
                                  Kode: {item.kodeProduk}
                                </div>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-2 whitespace-nowrap">
                            <div className="text-sm text-gray-900">{item.namaGame}</div>
                          </td>
                          <td className="px-6 py-2 whitespace-nowrap">
                            <div className="text-sm font-medium text-blue-600">
                              {item.hargaEth ? `${item.hargaEth} ETH` : 'N/A'}
                            </div>
                            <div className="text-xs text-gray-500">
                              ≈ {formatCurrency(item.harga || 0)}
                            </div>
                          </td>
                          <td className="px-6 py-2 whitespace-nowrap">
                            <div className="text-sm text-gray-900">{item.penjual?.nama || 'N/A'}</div>
                            {item.penjual?.email && (
                              <div className="text-xs text-gray-500">{item.penjual.email}</div>
                            )}
                          </td>
                          <td className="px-6 py-2 whitespace-nowrap">
                            {getStatusBadge(item.statusProduk)}
                          </td>
                          <td className="px-6 py-2 whitespace-nowrap">
                            <div className="text-sm text-gray-500">
                              {new Date(item.dibuatPada).toLocaleDateString('id-ID')}
                            </div>
                          </td>
                          <td className="px-6 py-2 whitespace-nowrap">
                            <button
                              onClick={() => handleDetailClick(item)}
                              className="inline-flex items-center px-3 py-1 border border-gray-300 shadow-sm text-xs leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
                            >
                              <EyeIcon className="h-4 w-4 mr-1" />
                              Detail
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="px-6 py-4 border-t border-gray-200">
                  <div className="flex items-center justify-between">
                    <div className="text-sm text-gray-700">
                      Halaman {currentPage} dari {totalPages}
                    </div>
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => handlePaginationChange(Math.max(currentPage - 1, 1))}
                        disabled={currentPage === 1}
                        className="px-3 py-2 text-sm font-medium text-gray-500 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Sebelumnya
                      </button>
                      {/* Page numbers */}
                      <div className="flex items-center space-x-1">
                        {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                          const pageNum = i + 1;
                          const isActive = pageNum === currentPage;
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
                        onClick={() => handlePaginationChange(Math.min(currentPage + 1, totalPages))}
                        disabled={currentPage === totalPages}
                        className="px-3 py-2 text-sm font-medium text-gray-500 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Selanjutnya
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Detail Modal */}
      {showDetailModal && selectedProduk && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-6xl w-full max-h-[95vh] overflow-y-auto shadow-2xl">
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-semibold text-gray-900">
                  Detail Produk
                </h3>
                <button
                  onClick={() => setShowDetailModal(false)}
                  className="text-gray-400 hover:text-red-500 text-2xl font-bold px-2"
                  aria-label="Tutup"
                >
                  ×
                </button>
              </div>
              
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Left Side - Sesuai produk.md */}
                <div className="space-y-4">
                  {/* Main Image */}
                  <div 
                    className="w-full h-64 bg-gray-100 rounded-lg flex items-center justify-center overflow-hidden cursor-pointer hover:bg-gray-200 transition-colors"
                    onClick={() => openImageViewer(selectedProduk.gambar, 0)}
                  >
                    {(() => {
                      // Handle both array and string format for images in modal
                      let imageUrl = null;
                      let images = [];
                      
                      if (Array.isArray(selectedProduk.gambar) && selectedProduk.gambar.length > 0) {
                        images = selectedProduk.gambar;
                        imageUrl = selectedProduk.gambar[0];
                      } else if (typeof selectedProduk.gambar === 'string' && selectedProduk.gambar.trim()) {
                        try {
                          // Try to parse as JSON array first
                          const parsed = JSON.parse(selectedProduk.gambar);
                          if (Array.isArray(parsed) && parsed.length > 0) {
                            images = parsed;
                            imageUrl = parsed[0];
                          } else {
                            // Single string URL
                            imageUrl = selectedProduk.gambar;
                            images = [selectedProduk.gambar];
                          }
                        } catch (e) {
                          // Not JSON, treat as single URL
                          imageUrl = selectedProduk.gambar;
                          images = [selectedProduk.gambar];
                        }
                      }

                      return imageUrl ? (
                        <img
                          src={imageUrl}
                          alt={selectedProduk.judulProduk}
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
                        if (Array.isArray(selectedProduk.gambar) && selectedProduk.gambar.length > 0) {
                          imageUrl = selectedProduk.gambar[0];
                        } else if (typeof selectedProduk.gambar === 'string' && selectedProduk.gambar.trim()) {
                          try {
                            const parsed = JSON.parse(selectedProduk.gambar);
                            if (Array.isArray(parsed) && parsed.length > 0) {
                              imageUrl = parsed[0];
                            } else {
                              imageUrl = selectedProduk.gambar;
                            }
                          } catch (e) {
                            imageUrl = selectedProduk.gambar;
                          }
                        }
                        return imageUrl ? 'none' : 'flex';
                      })() }}
                    >
                      <PhotoIcon className="h-16 w-16 text-gray-300 mx-auto mb-2" />
                      <p className="text-gray-500 text-sm">Tidak ada gambar</p>
                    </div>
                  </div>

                  {/* Thumbnail Images - Only show actual additional images */}
                  {(() => {
                    let images = [];
                    
                    // Parse gambar data for thumbnails
                    if (Array.isArray(selectedProduk.gambar) && selectedProduk.gambar.length > 1) {
                      images = selectedProduk.gambar.slice(1); // Skip first image, get all remaining
                    } else if (typeof selectedProduk.gambar === 'string' && selectedProduk.gambar.trim()) {
                      try {
                        const parsed = JSON.parse(selectedProduk.gambar);
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
                      <div className="grid grid-cols-4 gap-2">
                        {images.map((img, index) => (
                          <div key={index} className="h-20 bg-gray-200 rounded flex items-center justify-center overflow-hidden border border-gray-300">
                            <img
                              src={img}
                              alt={`Gambar ${index + 2}`}
                              className="w-full h-full object-cover hover:scale-105 transition-transform duration-200 cursor-pointer"
                              onError={(e) => {
                                console.log('❌ Thumbnail gagal dimuat:', img);
                                e.target.style.display = 'none';
                                e.target.nextElementSibling.style.display = 'flex';
                              }}
                              onClick={() => {
                                // Buka image viewer dengan index yang benar
                                const allImages = (() => {
                                  if (Array.isArray(selectedProduk.gambar)) {
                                    return selectedProduk.gambar;
                                  } else if (typeof selectedProduk.gambar === 'string' && selectedProduk.gambar.trim()) {
                                    try {
                                      const parsed = JSON.parse(selectedProduk.gambar);
                                      return Array.isArray(parsed) ? parsed : [selectedProduk.gambar];
                                    } catch (e) {
                                      return [selectedProduk.gambar];
                                    }
                                  }
                                  return [];
                                })();
                                openImageViewer(allImages, index + 1); // +1 karena thumbnail dimulai dari gambar kedua
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

                  {/* Informasi Produk - Sesuai produk.md */}
                  <div className="bg-white rounded-lg p-3 shadow-sm border">
                    <div className="text-xs text-gray-500 mb-2">Informasi Produk</div>
                    <div className="space-y-1 text-xs">
                      <div className="flex justify-between">
                        <span className="text-gray-600">Status:</span>
                        <span className={`font-medium ${
                          selectedProduk.statusProduk === 'AKTIF' ? 'text-green-600' : 
                          selectedProduk.statusProduk === 'TERJUAL' ? 'text-red-600' : 
                          selectedProduk.statusProduk === 'PENDING' ? 'text-yellow-600' :
                          selectedProduk.statusProduk === 'DITOLAK' ? 'text-red-600' :
                          'text-gray-600'
                        }`}>
                          {selectedProduk.statusProduk === 'TERJUAL' ? 'Terjual' :
                           selectedProduk.statusProduk === 'AKTIF' ? 'Aktif' :
                           selectedProduk.statusProduk === 'PENDING' ? 'Pending' :
                           selectedProduk.statusProduk === 'DITOLAK' ? 'Ditolak' : 'Unknown'}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Diposting:</span>
                        <span className="font-medium text-gray-900">{new Date(selectedProduk.dibuatPada || new Date().toISOString()).toLocaleDateString('id-ID')}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Kategori:</span>
                        <span className="font-medium text-gray-900">{selectedProduk.namaGame}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Right Side - Sesuai produk.md */}
                <div className="space-y-4">
                  {/* Title & Game Info */}
                  <div>
                    <h1 className="text-2xl font-bold text-gray-900 leading-tight">
                      {selectedProduk.judulProduk}
                    </h1>
                    <div className="text-gray-600 text-base mt-1">{selectedProduk.namaGame}</div>
                    <div className="text-blue-600 text-sm font-semibold mt-0.5">
                      Kode Akun: {selectedProduk.kodeProduk}
                    </div>
                  </div>

                  {/* Description Box - Real Description */}
                  <div className="border border-gray-400 rounded-lg p-4">
                    <div className="font-semibold text-gray-900 mb-3 text-sm uppercase tracking-wide">
                      DESKRIPSI
                    </div>
                    <div className="text-sm text-gray-700">
                      <div className="whitespace-pre-wrap leading-relaxed min-h-[100px]">
                        {selectedProduk.deskripsi ? (
                          selectedProduk.deskripsi
                        ) : (
                          <span className="text-gray-500 italic">Belum ada deskripsi untuk produk ini.</span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Price Section */}
                  <div className="py-3">
                    <div className="flex items-center justify-between border-b border-gray-300 pb-2 mb-2">
                      <span className="text-gray-700 font-medium">Harga</span>
                      <span className="text-lg font-bold text-blue-600">
                        {selectedProduk.hargaEth ? `${selectedProduk.hargaEth} ETH` : '0.1 ETH'}
                      </span>
                    </div>
                    <div className="text-right text-gray-600">
                      ≈ {formatCurrency(selectedProduk.harga || 2000000)}
                    </div>
                  </div>

                  {/* Seller Info */}
                  <div>
                    <h4 className="font-medium text-gray-900 mb-1">Penjual</h4>
                    {selectedProduk.penjual?.namaToko && (
                      <div className="text-sm text-blue-700 font-semibold mb-1">{selectedProduk.penjual.namaToko}</div>
                    )}
                    <div className="text-sm text-gray-700">
                      {selectedProduk.penjual?.nama || 'Belum diisi'}
                      {selectedProduk.penjual?.email && (
                        <span className="text-gray-400"> ({selectedProduk.penjual.email})</span>
                      )}
                    </div>
                  </div>

                  {/* Aksi Admin - Conditional based on product status */}
                  <div className="bg-gray-50 rounded-lg p-4 border mt-4">
                    <h4 className="font-medium text-gray-900 mb-2">Aksi Admin</h4>
                    {selectedProduk.statusProduk === 'TERJUAL' || selectedProduk.statusProduk === 'SELESAI' ? (
                      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                        <div className="flex items-center">
                          <CheckCircleIcon className="h-5 w-5 text-blue-600 mr-2" />
                          <div>
                            <h5 className="font-medium text-blue-800">Produk Sudah Terjual</h5>
                            <p className="text-blue-700 text-sm mt-1">
                              Produk ini sudah terjual dan transaksi telah selesai. 
                              Tidak dapat dihapus karena sudah ada riwayat transaksi.
                            </p>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <button
                        onClick={() => handleDeleteProduct(selectedProduk.id)}
                        disabled={updateLoading}
                        className="w-full bg-red-600 text-white py-2 px-4 rounded-lg hover:bg-red-700 disabled:opacity-50 flex items-center justify-center"
                      >
                        <XCircleIcon className="h-4 w-4 mr-2" />
                        {updateLoading ? 'Menghapus...' : 'Hapus Produk'}
                      </button>
                    )}
                  </div>
                </div>
              </div>
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
  );
};

export default ProdukAdmin;