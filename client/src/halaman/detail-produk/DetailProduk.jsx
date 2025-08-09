import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../konteks/AuthContext';
import { useWallet } from '../../konteks/WalletContext';
import { apiService } from '../../layanan/api';
import { useEthToIdrRate } from '../../hooks/useEthPrice';
import {
  DevicePhoneMobileIcon,
  UserIcon,
  ClockIcon,
  CurrencyDollarIcon,
  ShieldCheckIcon,
  PhotoIcon,
  ArrowLeftIcon,
  ExclamationTriangleIcon,
  WalletIcon,
  XMarkIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  MagnifyingGlassPlusIcon
} from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';

// Modal Gambar seperti Shopee/Tokopedia
const ImageModal = ({ isOpen, onClose, images, currentIndex, setCurrentIndex, productName }) => {
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (!isOpen) return;
      
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowLeft' && images.length > 1) {
        setCurrentIndex((prev) => (prev === 0 ? images.length - 1 : prev - 1));
      }
      if (e.key === 'ArrowRight' && images.length > 1) {
        setCurrentIndex((prev) => (prev === images.length - 1 ? 0 : prev + 1));
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'hidden';
    }
    
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, images.length, onClose, setCurrentIndex]);

  if (!isOpen) return null;

  const handlePrevious = () => {
    setCurrentIndex((prev) => (prev === 0 ? images.length - 1 : prev - 1));
  };

  const handleNext = () => {
    setCurrentIndex((prev) => (prev === images.length - 1 ? 0 : prev + 1));
  };

  return (
    <div className="fixed inset-0 z-50 bg-black bg-opacity-95 flex items-center justify-center">
      {/* Close Button */}
      <button
        onClick={onClose}
        className="absolute top-4 right-4 z-10 bg-white bg-opacity-20 hover:bg-opacity-30 text-white p-2 rounded-full transition-all"
      >
        <XMarkIcon className="h-6 w-6" />
      </button>

      {/* Navigation Arrows */}
      {images.length > 1 && (
        <>
          <button
            onClick={handlePrevious}
            className="absolute left-4 top-1/2 transform -translate-y-1/2 z-10 bg-white bg-opacity-20 hover:bg-opacity-30 text-white p-3 rounded-full transition-all"
          >
            <ChevronLeftIcon className="h-6 w-6" />
          </button>
          <button
            onClick={handleNext}
            className="absolute right-4 top-1/2 transform -translate-y-1/2 z-10 bg-white bg-opacity-20 hover:bg-opacity-30 text-white p-3 rounded-full transition-all"
          >
            <ChevronRightIcon className="h-6 w-6" />
          </button>
        </>
      )}

      {/* Image Counter */}
      {images.length > 1 && (
        <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 z-10 bg-black bg-opacity-50 text-white px-4 py-2 rounded-full text-sm">
          {currentIndex + 1} / {images.length}
        </div>
      )}

      {/* Main Image */}
      <div className="relative max-w-4xl max-h-4xl w-full h-full flex items-center justify-center p-4">
        <img
          src={images[currentIndex]}
          alt={`${productName} - Gambar ${currentIndex + 1}`}
          className="max-w-full max-h-full object-contain"
          onClick={(e) => e.stopPropagation()}
        />
      </div>

      {/* Backdrop */}
      <div className="absolute inset-0" onClick={onClose} />
    </div>
  );
};

// Gallery Gambar seperti Shopee/Tokopedia
const ProductImageGallery = ({ produk }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);

  // Parse gambar dari JSON string and filter out invalid images
  const parseImages = (imageData) => {
    if (!imageData) return [];
    
    console.log('🔍 Raw image data:', imageData);
    
    try {
      let images = [];
      
      if (typeof imageData === 'string') {
        if (imageData.startsWith('[')) {
          images = JSON.parse(imageData);
        } else {
          images = [imageData];
        }
      } else if (Array.isArray(imageData)) {
        images = imageData;
      }
      
      console.log('🔍 Parsed images before filtering:', images);
      
      // Filter out invalid, empty, or placeholder images
      const validImages = images.filter(image => {
        if (!image || typeof image !== 'string') {
          console.log('❌ Invalid image (not string):', image);
          return false;
        }
        if (image.trim() === '') {
          console.log('❌ Empty image:', image);
          return false;
        }
        if (image.includes('placeholder')) {
          console.log('❌ Placeholder image:', image);
          return false;
        }
        if (image.startsWith('data:image/') && image.length < 100) {
          console.log('❌ Small data URL:', image);
          return false;
        }
        // Check if it's a valid URL
        try {
          new URL(image);
          console.log('✅ Valid image:', image);
          return true;
        } catch {
          console.log('❌ Invalid URL:', image);
          return false;
        }
      });
      
      console.log('🔍 Final valid images:', validImages);
      return validImages;
      
    } catch (error) {
      console.error('Error parsing images:', error);
    }
    
    return [];
  };

  const images = parseImages(produk?.gambar);
  console.log('🖼️ Parsed images:', images, 'Length:', images.length);
  const mainImage = images.length > 0 ? images[selectedImageIndex] : null;

  const openModal = (index = selectedImageIndex) => {
    setCurrentImageIndex(index);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
  };

  return (
    <>
      {/* Main Image Display - seperti Shopee */}
      <div className="relative">
        <div className="aspect-square bg-gray-100 flex items-center justify-center relative group overflow-hidden">
          {mainImage ? (
            <>
              <img
                src={mainImage}
                alt={produk.judulProduk}
                className="w-full h-full object-cover cursor-pointer transition-transform duration-300 group-hover:scale-110"
                onClick={() => openModal()}
              />
              
              {/* Zoom Icon Overlay */}
              <div className="absolute top-4 right-4 bg-black bg-opacity-50 text-white p-2 rounded-full opacity-0 group-hover:opacity-100 transition-opacity">
                <MagnifyingGlassPlusIcon className="h-5 w-5" />
              </div>

              {/* Navigation Arrows untuk main image */}
              {images.length > 1 && (
                <>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedImageIndex(prev => prev === 0 ? images.length - 1 : prev - 1);
                    }}
                    className="absolute left-2 top-1/2 transform -translate-y-1/2 bg-white bg-opacity-80 hover:bg-opacity-100 text-gray-800 p-2 rounded-full shadow-lg opacity-0 group-hover:opacity-100 transition-all"
                  >
                    <ChevronLeftIcon className="h-4 w-4" />
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedImageIndex(prev => prev === images.length - 1 ? 0 : prev + 1);
                    }}
                    className="absolute right-2 top-1/2 transform -translate-y-1/2 bg-white bg-opacity-80 hover:bg-opacity-100 text-gray-800 p-2 rounded-full shadow-lg opacity-0 group-hover:opacity-100 transition-all"
                  >
                    <ChevronRightIcon className="h-4 w-4" />
                  </button>
                </>
              )}

              {/* Image Counter untuk main image */}
              {images.length > 1 && (
                <div className="absolute bottom-4 right-4 bg-black bg-opacity-60 text-white text-xs px-2 py-1 rounded">
                  {selectedImageIndex + 1}/{images.length}
                </div>
              )}
            </>
          ) : (
            <div className="text-center">
              <PhotoIcon className="h-24 w-24 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500">Tidak ada gambar</p>
            </div>
          )}
        </div>

        {/* Thumbnail Gallery - TEMPORARILY DISABLED TO FIX PLACEHOLDER ISSUE */}
        {false && images.length > 1 && (
          <div className="mt-4">
            <div className="flex space-x-2 overflow-x-auto pb-2">
              {images.map((image, index) => (
                <div
                  key={index}
                  className={`flex-shrink-0 w-16 h-16 rounded-lg overflow-hidden border-2 cursor-pointer transition-all ${
                    index === selectedImageIndex
                      ? 'border-blue-500 ring-2 ring-blue-200'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                  onClick={() => setSelectedImageIndex(index)}
                  onDoubleClick={() => openModal(index)}
                >
                  <img
                    src={image}
                    alt={`${produk.judulProduk} - Thumbnail ${index + 1}`}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      // Hide broken images completely
                      e.target.parentElement.style.display = 'none';
                    }}
                  />
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Modal */}
      {images.length > 0 && (
        <ImageModal
          isOpen={isModalOpen}
          onClose={closeModal}
          images={images}
          currentIndex={currentImageIndex}
          setCurrentIndex={setCurrentImageIndex}
          productName={produk.judulProduk}
        />
      )}
    </>
  );
};

const DetailProduk = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuth();
  const { isConnected, walletAddress, balance } = useWallet();
  const { rate: ethToIdrRate } = useEthToIdrRate();
  const [produk, setProduk] = useState(null);
  const [loading, setLoading] = useState(true);
  const [purchasing, setPurchasing] = useState(false);

  useEffect(() => {
    loadProduk();
  }, [id]);

  const loadProduk = async () => {
    try {
      setLoading(true);
      
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Request timeout')), 10000)
      );
      
      const apiPromise = apiService.produk.getProdukById(id);
      
      const response = await Promise.race([apiPromise, timeoutPromise]);
      
      if (response.data.sukses) {
        setProduk(response.data.data.produk);
      } else {
        toast.error('Produk tidak ditemukan');
        navigate('/produk');
      }
    } catch (error) {
      console.error('Error loading produk:', error);
      
      if (error.message === 'Request timeout') {
        toast.error('Koneksi timeout. Silakan coba lagi.');
      } else if (error.response?.status === 404) {
        toast.error('Produk tidak ditemukan');
      } else {
        toast.error('Gagal memuat detail produk');
      }
      
      setTimeout(() => {
        navigate('/produk');
      }, 3000);
    } finally {
      setLoading(false);
    }
  };

  const handlePurchase = async () => {
    if (!isAuthenticated) {
      toast.error('Silakan login terlebih dahulu');
      navigate('/masuk');
      return;
    }
    if (user?.role === 'ADMIN') {
      toast.error('Admin tidak dapat membeli produk');
      return;
    }
    if (!user?.walletAddress) {
      toast.error('Silakan hubungkan wallet terlebih dahulu');
      navigate('/profil');
      return;
    }
    if (!isConnected) {
      toast.error('Silakan connect wallet di navbar terlebih dahulu');
      return;
    }
    if (walletAddress?.toLowerCase() !== user.walletAddress.toLowerCase()) {
      toast.error('Wallet yang terhubung tidak sesuai dengan akun Anda');
      return;
    }
    if (produk.penjual.id === user.id) {
      toast.error('Anda tidak dapat membeli produk sendiri');
      return;
    }
    if (produk.statusProduk !== 'AKTIF' || !produk.statusJual) {
      if (produk.statusProduk === 'TERJUAL') {
        toast.error('Produk ini sudah terjual');
      } else if (produk.statusProduk === 'PENDING') {
        toast.error('Produk ini sedang menunggu persetujuan admin');
      } else if (produk.statusProduk === 'DITOLAK') {
        toast.error('Produk ini ditolak oleh admin');
      } else if (produk.statusProduk === 'DIHAPUS') {
        toast.error('Produk ini telah dihapus');
      } else {
        toast.error('Produk ini tidak tersedia untuk dibeli');
      }
      loadProduk();
      return;
    }

    try {
      setPurchasing(true);
      
      const response = await apiService.transaksi.buatTransaksi(produk.id);
      
      if (response.data.sukses) {
        toast.success('Transaksi dibuat! Anda memiliki 15 menit untuk menyelesaikan pembayaran.');
        
        window.dispatchEvent(new CustomEvent('product-reserved', { 
          detail: { 
            productId: produk.id,
            timestamp: Date.now()
          } 
        }));
        
        window.dispatchEvent(new CustomEvent('marketplace-refresh', { 
          detail: { 
            productId: produk.id,
            action: 'reserved',
            timestamp: Date.now()
          } 
        }));
        
        navigate('/pembeli');
      } else {
        toast.error(response.data.pesan || 'Gagal membuat transaksi');
      }
    } catch (error) {
      console.error('❌ Error creating transaction:', error);
      const errorMessage = error.response?.data?.pesan || error.response?.data?.message || error.message;
      toast.error('Gagal membuat transaksi: ' + errorMessage);
    } finally {
      setPurchasing(false);
    }
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
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="animate-pulse">
            <div className="bg-gray-200 h-8 w-32 rounded mb-6"></div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <div className="bg-gray-200 aspect-square rounded-lg"></div>
              <div className="space-y-4">
                <div className="bg-gray-200 h-8 rounded"></div>
                <div className="bg-gray-200 h-6 rounded w-3/4"></div>
                <div className="bg-gray-200 h-32 rounded"></div>
                <div className="bg-gray-200 h-12 rounded"></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!produk) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <ExclamationTriangleIcon className="h-16 w-16 text-gray-300 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Produk Tidak Ditemukan</h2>
          <p className="text-gray-600 mb-4">Produk yang Anda cari tidak tersedia</p>
          <button
            onClick={() => navigate(-1)}
            className="bg-primary-600 text-white px-6 py-2 rounded-md hover:bg-primary-700 transition-colors"
          >
            Kembali
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Back Button */}
        <button
          onClick={() => navigate(-1)}
          className="flex items-center text-gray-600 hover:text-gray-900 mb-6 transition-colors"
        >
          <ArrowLeftIcon className="h-5 w-5 mr-2" />
          Kembali
        </button>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Product Image Gallery */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <ProductImageGallery produk={produk} />
          </div>

          {/* Product Info */}
          <div className="space-y-6">
            {/* Header */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="bg-primary-600 text-white text-sm px-3 py-1 rounded">
                  {produk.kodeProduk}
                </span>
                {(() => {
                  if (produk.statusProduk === 'TERJUAL') {
                    return (
                      <span className="bg-red-100 text-red-800 text-sm px-3 py-1 rounded-full">
                        Terjual
                      </span>
                    );
                  } else if (produk.statusProduk === 'PENDING') {
                    return (
                      <span className="bg-yellow-100 text-yellow-800 text-sm px-3 py-1 rounded-full">
                        Pending
                      </span>
                    );
                  } else if (produk.statusProduk === 'DITOLAK') {
                    return (
                      <span className="bg-red-100 text-red-800 text-sm px-3 py-1 rounded-full">
                        Ditolak
                      </span>
                    );
                  } else if (produk.statusProduk === 'DIHAPUS') {
                    return (
                      <span className="bg-gray-100 text-gray-500 text-sm px-3 py-1 rounded-full">
                        Dihapus
                      </span>
                    );
                  } else if (produk.statusJual && produk.statusProduk === 'AKTIF') {
                    return (
                      <span className="bg-green-100 text-green-800 text-sm px-3 py-1 rounded-full">
                        Tersedia
                      </span>
                    );
                  } else {
                    return (
                      <span className="bg-yellow-100 text-yellow-800 text-sm px-3 py-1 rounded-full">
                        Tidak Tersedia
                      </span>
                    );
                  }
                })()}
              </div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">
                {produk.judulProduk}
              </h1>
              <div className="flex items-center text-gray-600 mb-4">
                <DevicePhoneMobileIcon className="h-5 w-5 mr-2" />
                <span className="text-lg">{produk.namaGame}</span>
              </div>
              <div className="mb-4">
                <div className="text-4xl font-bold text-primary-600">
                  {produk.hargaEth ? `${produk.hargaEth} ETH` : 'N/A'}
                </div>
                <div className="text-sm text-gray-500 mt-2">
                  ≈ {formatRupiah((produk.hargaEth || 0) * ethToIdrRate)}
                </div>
              </div>
            </div>

            {/* Description */}
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-3">Deskripsi</h3>
              <div className="max-w-none">
                <p className="text-gray-700 whitespace-pre-line">
                  {produk.deskripsi || 'Tidak ada deskripsi'}
                </p>
              </div>
            </div>

            {/* Seller Info */}
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-3">Informasi Penjual</h3>
              <div className="flex items-center space-x-4">
                <div className="bg-gray-100 rounded-full p-3">
                  <UserIcon className="h-6 w-6 text-gray-600" />
                </div>
                <div>
                  <p className="font-medium text-gray-900">{produk.penjual.nama}</p>
                  <p className="text-sm text-gray-600">{produk.penjual.email}</p>
                  {produk.penjual.walletAddress && (
                    <div className="flex items-center text-sm text-green-600 mt-1">
                      <ShieldCheckIcon className="h-4 w-4 mr-1" />
                      <span>Wallet Terverifikasi</span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Product Meta */}
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-3">Detail Produk</h3>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-gray-600">Kode Produk</span>
                  <span className="font-medium">{produk.kodeProduk}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Game</span>
                  <span className="font-medium">{produk.namaGame}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Status</span>
                  <span className={`font-medium ${
                    produk.statusProduk === 'AKTIF' && produk.statusJual ? 'text-green-600' : 
                    produk.statusProduk === 'TERJUAL' ? 'text-red-600' : 
                    produk.statusProduk === 'PENDING' ? 'text-yellow-600' :
                    produk.statusProduk === 'DITOLAK' ? 'text-red-600' :
                    'text-green-600'
                  }`}>
                    {produk.statusProduk === 'TERJUAL' ? 'Terjual' :
                     produk.statusProduk === 'PENDING' ? 'Pending' :
                     produk.statusProduk === 'DITOLAK' ? 'Ditolak' :
                     produk.statusProduk === 'DIHAPUS' ? 'Dihapus' :
                     produk.statusJual && produk.statusProduk === 'AKTIF' ? 'Tersedia' : 'Tidak Tersedia'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Dipublikasi</span>
                  <span className="font-medium">{formatTanggal(produk.dibuatPada)}</span>
                </div>
              </div>
            </div>

            {/* Purchase Button */}
            <div className="bg-white rounded-lg shadow-sm p-6">
              {!isAuthenticated ? (
                <div className="text-center">
                  <p className="text-gray-600 mb-4">Login untuk membeli produk ini</p>
                  <Link
                    to="/masuk"
                    className="w-full bg-primary-600 text-white py-3 px-6 rounded-md hover:bg-primary-700 transition-colors inline-block text-center"
                  >
                    Login Sekarang
                  </Link>
                </div>
              ) : !user?.walletAddress ? (
                <div className="text-center">
                  <p className="text-gray-600 mb-4">Hubungkan wallet untuk membeli</p>
                  <Link
                    to="/profil"
                    className="w-full bg-orange-600 text-white py-3 px-6 rounded-md hover:bg-orange-700 transition-colors inline-block text-center"
                  >
                    Setup Wallet
                  </Link>
                </div>
              ) : !isConnected ? (
                <div className="text-center">
                  <p className="text-gray-600 mb-4">Connect wallet di navbar untuk melanjutkan</p>
                  <div className="w-full bg-gray-300 text-gray-500 py-3 px-6 rounded-md text-center">
                    Connect Wallet Required
                  </div>
                </div>
              ) : user?.role === 'ADMIN' ? (
                <div className="text-center">
                  <p className="text-red-600 mb-4">Admin tidak dapat membeli produk</p>
                  <div className="w-full bg-gray-300 text-gray-500 py-3 px-6 rounded-md text-center">
                    Tidak Diizinkan
                  </div>
                </div>
              ) : produk.penjual.id === user?.id ? (
                <div className="text-center">
                  <p className="text-gray-600 mb-4">Ini adalah produk Anda</p>
                  <Link
                    to="/produk-saya"
                    className="w-full bg-gray-600 text-white py-3 px-6 rounded-md hover:bg-gray-700 transition-colors inline-block text-center"
                  >
                    Kelola Produk
                  </Link>
                </div>
              ) : produk.statusProduk === 'TERJUAL' ? (
                <div className="text-center">
                  <p className="text-red-600 mb-4">Produk ini sudah terjual</p>
                  <div className="w-full bg-gray-300 text-gray-500 py-3 px-6 rounded-md text-center">
                    Tidak Tersedia
                  </div>
                </div>
              ) : produk.statusProduk === 'PENDING' ? (
                <div className="text-center">
                  <p className="text-yellow-600 mb-4">Produk ini sedang menunggu persetujuan admin</p>
                  <div className="w-full bg-yellow-300 text-yellow-700 py-3 px-6 rounded-md text-center">
                    Menunggu Persetujuan
                  </div>
                </div>
              ) : produk.statusProduk === 'DITOLAK' ? (
                <div className="text-center">
                  <p className="text-red-600 mb-4">Produk ini ditolak oleh admin</p>
                  <div className="w-full bg-red-300 text-red-700 py-3 px-6 rounded-md text-center">
                    Ditolak
                  </div>
                </div>
              ) : produk.statusProduk === 'DIHAPUS' ? (
                <div className="text-center">
                  <p className="text-gray-600 mb-4">Produk ini telah dihapus</p>
                  <div className="w-full bg-gray-300 text-gray-500 py-3 px-6 rounded-md text-center">
                    Tidak Tersedia
                  </div>
                </div>
              ) : !produk.statusJual ? (
                <div className="text-center">
                  <p className="text-gray-600 mb-4">Produk ini tidak tersedia</p>
                  <div className="w-full bg-gray-300 text-gray-500 py-3 px-6 rounded-md text-center">
                    Tidak Tersedia
                  </div>
                </div>
              ) : (
                <div>
                  <div className="bg-blue-50 border border-blue-200 rounded-md p-4 mb-4">
                    <div className="flex items-center">
                      <ClockIcon className="h-5 w-5 text-blue-600 mr-2" />
                      <div>
                        <p className="text-sm font-medium text-blue-900">⏰ Sistem Pembayaran Baru</p>
                        <p className="text-sm text-blue-700">Setelah klik beli, Anda akan diarahkan ke dashboard dengan timer 15 menit untuk pembayaran</p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="bg-green-50 border border-green-200 rounded-md p-4 mb-4">
                    <div className="flex items-center">
                      <WalletIcon className="h-5 w-5 text-green-600 mr-2" />
                      <div>
                        <p className="text-sm font-medium text-green-900">✅ Transaksi Aman</p>
                        <p className="text-sm text-green-700">Menggunakan sistem escrow dengan smart contract</p>
                      </div>
                    </div>
                  </div>
                  
                  <button
                    onClick={handlePurchase}
                    disabled={purchasing}
                    className="w-full bg-primary-600 text-white py-3 px-6 rounded-md hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center space-x-2"
                  >
                    {purchasing ? (
                      <>
                        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                        <span>Membuat Transaksi...</span>
                      </>
                    ) : (
                      <>
                        <CurrencyDollarIcon className="h-5 w-5" />
                        <span>Beli Sekarang</span>
                      </>
                    )}
                  </button>
                  <p className="text-xs text-gray-500 text-center mt-2">
                    Dengan membeli, Anda menyetujui syarat dan ketentuan
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DetailProduk;