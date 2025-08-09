import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../../konteks/AuthContext';
import { apiService } from '../../layanan/api';
import ImageUploadSimple from '../../komponen/ImageUploadSimple';
import { getProductImageUrl, getAllProductImageUrls } from '../../utils/imageHelper';
import { useEthPrice } from '../../hooks/useEthPrice';
import {
  DevicePhoneMobileIcon,
  ArrowLeftIcon,
  PhotoIcon,
  ArrowPathIcon
} from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';
const EditProduk = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const { user, isAuthenticated, loading: authLoading } = useAuth();
  const {
    ethToIdrRate,
    convertEthToIdr,
    convertIdrToEth,
    formatIdrPrice,
    isLoading: priceLoading,
    refreshPrice,
    lastUpdate,
    source
  } = useEthPrice();
  const [loading, setLoading] = useState(false);
  const [loadingData, setLoadingData] = useState(true);
  const [formData, setFormData] = useState({
    judulProduk: '',
    namaGame: '',
    deskripsi: '',
    hargaEth: '',
    gambar: '',
    statusJual: true
  });
  const [errors, setErrors] = useState({});
  const [hasUnsavedImages, setHasUnsavedImages] = useState(false);
  const [currencyMode, setCurrencyMode] = useState('ETH'); // 'ETH' or 'IDR'
  // Redirect if not authenticated
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      toast.error('Anda harus login untuk mengakses halaman ini');
      navigate('/masuk');
      return;
    }
    
    if (!authLoading && isAuthenticated && user) {
      loadProduk();
    }
  }, [id, isAuthenticated, authLoading, user]);

  // Peringatan ketika ada perubahan gambar yang belum disimpan
  useEffect(() => {
    const handleBeforeUnload = (e) => {
      if (hasUnsavedImages) {
        e.preventDefault();
        e.returnValue = 'Anda memiliki perubahan gambar yang belum disimpan. Yakin ingin meninggalkan halaman?';
        return e.returnValue;
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [hasUnsavedImages]);
  const loadProduk = async () => {
    try {
      setLoadingData(true);
      
      // Double check authentication
      if (!user || !isAuthenticated) {
        toast.error('Anda harus login untuk mengakses halaman ini');
        navigate('/masuk');
        return;
      }
      
      const response = await apiService.produk.getProdukById(id);
      if (response.data.sukses) {
        const produk = response.data.data.produk;
        // Cek apakah user adalah pemilik produk
        if (produk.penjual.id !== user.id) {
          toast.error('Anda tidak memiliki akses untuk mengedit produk ini');
          navigate('/produk-saya');
          return;
        }
        // Parse image data properly using helper function to get all images
        const allImageUrls = getAllProductImageUrls(produk.gambar);
        
        setFormData({
          judulProduk: produk.judulProduk,
          namaGame: produk.namaGame,
          deskripsi: produk.deskripsi || '',
          hargaEth: produk.hargaEth.toString(),
          gambar: allImageUrls, // Store all images as array
          statusJual: produk.statusJual
        });
      }
    } catch (error) {
      console.error('Error loading produk:', error);
      toast.error('Gagal memuat data produk');
      navigate('/produk-saya');
    } finally {
      setLoadingData(false);
    }
  };
  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };

  const convertCurrency = (value, fromMode, toMode) => {
    if (!value || value === '') return '';
    const numValue = parseFloat(value);
    if (isNaN(numValue)) return '';
    
    if (fromMode === 'ETH' && toMode === 'IDR') {
      return convertEthToIdr(numValue).toString();
    } else if (fromMode === 'IDR' && toMode === 'ETH') {
      return convertIdrToEth(numValue).toFixed(6);
    }
    return value;
  };

  const handleCurrencyToggle = () => {
    const newMode = currencyMode === 'ETH' ? 'IDR' : 'ETH';
    const convertedValue = convertCurrency(formData.hargaEth, currencyMode, newMode);
    
    setCurrencyMode(newMode);
    setFormData(prev => ({
      ...prev,
      hargaEth: convertedValue
    }));
  };

  const formatRupiah = (amount) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  const validateForm = () => {
    const newErrors = {};
    if (!formData.judulProduk.trim()) {
      newErrors.judulProduk = 'Judul produk wajib diisi';
    }
    if (!formData.namaGame.trim()) {
      newErrors.namaGame = 'Nama game wajib diisi';
    }
    if (!formData.hargaEth) {
      newErrors.hargaEth = 'Harga wajib diisi';
    } else {
      const hargaValue = parseFloat(formData.hargaEth);
      if (currencyMode === 'ETH') {
        if (hargaValue < 0.001) {
          newErrors.hargaEth = 'Harga minimal 0.001 ETH';
        } else if (hargaValue > 10) {
          newErrors.hargaEth = 'Harga maksimal 10 ETH';
        }
      } else { // IDR mode
        const minIdr = Math.round(0.001 * ethToIdrRate);
        const maxIdr = Math.round(10 * ethToIdrRate);
        if (hargaValue < minIdr) {
          newErrors.hargaEth = `Harga minimal ${formatIdrPrice(minIdr)}`;
        } else if (hargaValue > maxIdr) {
          newErrors.hargaEth = `Harga maksimal ${formatIdrPrice(maxIdr)}`;
        }
      }
    }
    if (!formData.deskripsi.trim()) {
      newErrors.deskripsi = 'Deskripsi wajib diisi';
    } else if (formData.deskripsi.length > 500) {
      newErrors.deskripsi = 'Deskripsi maksimal 500 karakter';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) {
      toast.error('Mohon lengkapi semua field yang wajib diisi');
      return;
    }
    try {
      setLoading(true);
      // Prepare image data for submission
      let gambarData = null;
      if (formData.gambar) {
        if (Array.isArray(formData.gambar)) {
          // If it's an array, send as is (server will handle JSON conversion)
          gambarData = formData.gambar.length > 0 ? formData.gambar : null;
        } else {
          // If it's a single string, convert to array
          gambarData = [formData.gambar];
        }
      }

      // Convert to ETH if currently in IDR mode
      let hargaEthValue = formData.hargaEth;
      if (currencyMode === 'IDR') {
        hargaEthValue = convertCurrency(formData.hargaEth, 'IDR', 'ETH');
      }

      const response = await apiService.produk.updateProduk(id, {
        judulProduk: formData.judulProduk.trim(),
        namaGame: formData.namaGame.trim(),
        deskripsi: formData.deskripsi.trim(),
        hargaEth: parseFloat(hargaEthValue),
        gambar: gambarData,
        statusJual: formData.statusJual
      });
      if (response.data.sukses) {
        setHasUnsavedImages(false);
        toast.success('Produk berhasil diperbarui!');
        navigate('/produk-saya');
      } else {
        toast.error(response.data.pesan || 'Gagal memperbarui produk');
      }
    } catch (error) {
      console.error('Error updating product:', error);
      const errorMessage = error.response?.data?.pesan || 'Gagal memperbarui produk';
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };
  // Show loading while checking authentication or loading data
  if (authLoading || loadingData) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">
            {authLoading ? 'Memeriksa autentikasi...' : 'Memuat data produk...'}
          </p>
        </div>
      </div>
    );
  }
  
  // If not authenticated after loading, this should not render (useEffect will redirect)
  if (!isAuthenticated || !user) {
    return null;
  }
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          {/* Header */}
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-xl font-semibold text-gray-900">
              Edit Produk
            </h3>
            <button
              onClick={() => {
                if (hasUnsavedImages) {
                  if (window.confirm('Anda memiliki perubahan gambar yang belum disimpan. Yakin ingin meninggalkan halaman?')) {
                    navigate('/produk-saya');
                  }
                } else {
                  navigate('/produk-saya');
                }
              }}
              className="text-gray-400 hover:text-gray-600"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Form Fields */}
            <div className="lg:col-span-2 space-y-6">
            {/* Judul Produk */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Judul Produk *
              </label>
              <input
                type="text"
                name="judulProduk"
                value={formData.judulProduk}
                onChange={handleInputChange}
                className={`w-full px-3 py-2 border rounded-md focus:ring-blue-500 focus:border-blue-500 ${
                  errors.judulProduk ? 'border-red-300' : 'border-gray-300'
                }`}
              />
              {errors.judulProduk && (
                <p className="mt-1 text-sm text-red-600">{errors.judulProduk}</p>
              )}
            </div>
            {/* Nama Game */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Nama Game *
              </label>
              <input
                type="text"
                name="namaGame"
                value={formData.namaGame}
                onChange={handleInputChange}
                className={`w-full px-3 py-2 border rounded-md focus:ring-blue-500 focus:border-blue-500 ${
                  errors.namaGame ? 'border-red-300' : 'border-gray-300'
                }`}
              />
              {errors.namaGame && (
                <p className="mt-1 text-sm text-red-600">{errors.namaGame}</p>
              )}
            </div>
            {/* Harga ETH */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Harga dalam ETH *
              </label>
              <div className="relative">
                <button
                  type="button"
                  onClick={handleCurrencyToggle}
                  className="absolute inset-y-0 left-0 pl-3 flex items-center hover:bg-gray-100 rounded-l-md transition-colors"
                >
                  <span className="text-gray-500 sm:text-sm font-medium">
                    {currencyMode}
                  </span>
                </button>
                <input
                  type="number"
                  name="hargaEth"
                  value={formData.hargaEth}
                  onChange={handleInputChange}
                  step={currencyMode === 'ETH' ? '0.001' : '1000'}
                  min={currencyMode === 'ETH' ? '0.001' : Math.round(0.001 * ethToIdrRate)}
                  max={currencyMode === 'ETH' ? '10' : Math.round(10 * ethToIdrRate)}
                  className={`w-full pl-12 pr-3 py-2 border rounded-md focus:ring-blue-500 focus:border-blue-500 ${
                    errors.hargaEth ? 'border-red-300' : 'border-gray-300'
                  }`}
                />
              </div>
              {errors.hargaEth && (
                <p className="mt-1 text-sm text-red-600">{errors.hargaEth}</p>
              )}
            </div>
            {/* Upload Gambar */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Screenshot Akun
              </label>
              <ImageUploadSimple
                maxFiles={5}
                currentImages={Array.isArray(formData.gambar) ? formData.gambar : (formData.gambar ? [formData.gambar] : [])}
                onUploadSuccess={(urls) => {
                  console.log('🖼️ Image upload success:', urls);
                  setFormData(prev => ({
                    ...prev,
                    gambar: urls
                  }));
                  setHasUnsavedImages(true);
                  toast.success('Gambar berhasil diupload! Jangan lupa klik "Perbarui Produk" untuk menyimpan perubahan.');
                }}
                onUploadError={(error) => {
                  console.error('❌ Image upload error:', error);
                  toast.error('Gagal upload gambar');
                }}
                className="w-full"
              />
              {hasUnsavedImages && (
                <div className="mt-2 p-3 bg-yellow-50 border border-yellow-200 rounded-md">
                  <div className="flex">
                    <div className="flex-shrink-0">
                      <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <div className="ml-3">
                      <p className="text-sm text-yellow-800">
                        <strong>Perhatian:</strong> Anda telah mengubah gambar produk. Klik tombol "Perbarui Produk" di bawah untuk menyimpan perubahan.
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
            {/* Deskripsi */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Deskripsi Detail *
              </label>
              <textarea
                name="deskripsi"
                value={formData.deskripsi}
                onChange={handleInputChange}
                rows={6}
                maxLength={500}
                className={`w-full px-3 py-2 border rounded-md focus:ring-blue-500 focus:border-blue-500 ${
                  errors.deskripsi ? 'border-red-300' : 'border-gray-300'
                }`}
              />
              {errors.deskripsi && (
                <p className="mt-1 text-sm text-red-600">{errors.deskripsi}</p>
              )}
              <p className="mt-1 text-sm text-gray-500">
                {formData.deskripsi.length}/500 karakter
              </p>
            </div>
            </div>

            {/* Sidebar Preview */}
            <div className="lg:col-span-1">
              <div className="bg-gray-50 rounded-lg p-4 sticky top-4">
                <div className="flex items-center justify-between mb-4">
                  <h4 className="text-lg font-semibold text-gray-900">Preview Produk</h4>
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={refreshPrice}
                      disabled={priceLoading}
                      className="p-1 text-gray-500 hover:text-gray-700 disabled:opacity-50"
                      title="Refresh harga ETH"
                    >
                      <ArrowPathIcon className={`h-4 w-4 ${priceLoading ? 'animate-spin' : ''}`} />
                    </button>
                    <div className="text-xs text-gray-500">
                      {source && `${source}`}
                    </div>
                  </div>
                </div>
                {/* Price Info */}
                <div className="mb-3 p-2 bg-blue-50 rounded-md">
                  <div className="text-xs text-blue-600 font-medium">
                    1 ETH = {formatIdrPrice(ethToIdrRate)}
                  </div>
                  {lastUpdate && (
                    <div className="text-xs text-blue-500">
                      Update: {new Date(lastUpdate).toLocaleTimeString('id-ID')}
                    </div>
                  )}
                </div>
                <div className="border rounded-lg p-4 bg-white">
                  {/* Preview Image */}
                  <div className="w-full h-32 bg-gray-200 rounded-md mb-3 flex items-center justify-center">
                    {(() => {
                      let imageUrl = null;
                      if (Array.isArray(formData.gambar) && formData.gambar.length > 0) {
                        imageUrl = formData.gambar[0];
                      } else if (typeof formData.gambar === 'string' && formData.gambar.trim()) {
                        try {
                          const parsed = JSON.parse(formData.gambar);
                          if (Array.isArray(parsed) && parsed.length > 0) {
                            imageUrl = parsed[0];
                          } else {
                            imageUrl = formData.gambar;
                          }
                        } catch (e) {
                          imageUrl = formData.gambar;
                        }
                      }
                      
                      return imageUrl ? (
                        <img
                          src={imageUrl}
                          alt="Preview"
                          className="w-full h-full object-cover rounded-md"
                        />
                      ) : (
                        <PhotoIcon className="h-8 w-8 text-gray-400" />
                      );
                    })()}
                  </div>
                  {/* Show image count if multiple images */}
                  {(() => {
                    let imageCount = 0;
                    if (Array.isArray(formData.gambar)) {
                      imageCount = formData.gambar.length;
                    } else if (typeof formData.gambar === 'string' && formData.gambar.trim()) {
                      try {
                        const parsed = JSON.parse(formData.gambar);
                        if (Array.isArray(parsed)) {
                          imageCount = parsed.length;
                        } else {
                          imageCount = 1;
                        }
                      } catch (e) {
                        imageCount = 1;
                      }
                    }
                    
                    return imageCount > 1 ? (
                      <div className="text-xs text-gray-500 text-center mb-2">
                        +{imageCount - 1} gambar lainnya
                      </div>
                    ) : null;
                  })()}
                  {/* Preview Content */}
                  <div className="space-y-2">
                    <div className="text-sm font-medium text-gray-900">
                      {formData.judulProduk || 'Judul Produk Anda'}
                    </div>
                    <div className="text-xs text-gray-500">
                      {formData.namaGame || 'Nama Game'}
                    </div>
                    <div className="flex justify-between items-center">
                      <div>
                        <div className="text-lg font-bold text-blue-600">
                          {(() => {
                            console.log('🔍 Preview Debug:', {
                              currencyMode,
                              hargaEth: formData.hargaEth,
                              parsedValue: parseFloat(formData.hargaEth)
                            });
                            
                            if (formData.hargaEth) {
                              if (currencyMode === 'ETH') {
                                return `${formData.hargaEth} ETH`;
                              } else {
                                return formatRupiah(parseFloat(formData.hargaEth));
                              }
                            } else {
                              return currencyMode === 'ETH' ? '0.000 ETH' : formatRupiah(0);
                            }
                          })()}
                        </div>
                        {formData.hargaEth && currencyMode === 'ETH' && (
                          <div className="text-xs text-gray-500">
                            ≈ {formatIdrPrice(convertEthToIdr(parseFloat(formData.hargaEth)))}
                          </div>
                        )}
                        {formData.hargaEth && currencyMode === 'IDR' && (
                          <div className="text-xs text-gray-500">
                            ≈ {convertIdrToEth(parseFloat(formData.hargaEth)).toFixed(6)} ETH
                          </div>
                        )}
                      </div>
                    </div>
                    {formData.deskripsi && (
                      <div className="text-xs text-gray-600 mt-2 line-clamp-3">
                        {formData.deskripsi.substring(0, 100)}...
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Submit Button */}
            <div className="lg:col-span-3 flex justify-end space-x-4 pt-6 border-t">
              <button
                type="button"
                onClick={() => {
                  if (hasUnsavedImages) {
                    if (window.confirm('Anda memiliki perubahan gambar yang belum disimpan. Yakin ingin membatalkan?')) {
                      navigate('/produk-saya');
                    }
                  } else {
                    navigate('/produk-saya');
                  }
                }}
                className="px-6 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition-colors"
              >
                Batal
              </button>
              <button
                type="submit"
                disabled={loading}
                className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center space-x-2"
              >
                {loading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    <span>Menyimpan...</span>
                  </>
                ) : (
                  <>
                    <DevicePhoneMobileIcon className="h-4 w-4" />
                    <span>Perbarui Produk</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};
export default EditProduk;
