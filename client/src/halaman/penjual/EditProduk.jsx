import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../../konteks/AuthContext';
import { apiService } from '../../layanan/api';
import ImageUploadSimple from '../../komponen/ImageUploadSimple';
import { getProductImageUrl, getAllProductImageUrls } from '../../utils/imageHelper';
import {
  DevicePhoneMobileIcon,
  ArrowLeftIcon
} from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';
const EditProduk = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const { user, isAuthenticated, loading: authLoading } = useAuth();
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
  const validateForm = () => {
    const newErrors = {};
    if (!formData.judulProduk.trim()) {
      newErrors.judulProduk = 'Judul produk wajib diisi';
    }
    if (!formData.namaGame.trim()) {
      newErrors.namaGame = 'Nama game wajib diisi';
    }
    if (!formData.hargaEth) {
      newErrors.hargaEth = 'Harga ETH wajib diisi';
    } else if (parseFloat(formData.hargaEth) < 0.001) {
      newErrors.hargaEth = 'Harga minimal 0.001 ETH';
    } else if (parseFloat(formData.hargaEth) > 10) {
      newErrors.hargaEth = 'Harga maksimal 10 ETH';
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

      const response = await apiService.produk.updateProduk(id, {
        judulProduk: formData.judulProduk.trim(),
        namaGame: formData.namaGame.trim(),
        deskripsi: formData.deskripsi.trim(),
        hargaEth: parseFloat(formData.hargaEth),
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
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
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
            className="inline-flex items-center text-blue-600 hover:text-blue-800 mb-4"
          >
            <ArrowLeftIcon className="h-5 w-5 mr-2" />
            Kembali ke Produk Saya
          </button>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Edit Produk</h1>
          <p className="text-gray-600">Perbarui informasi produk Anda</p>
        </div>
        {/* Form */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Status Produk */}
            <div className="flex items-center">
              <input
                type="checkbox"
                name="statusJual"
                checked={formData.statusJual}
                onChange={handleInputChange}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <label className="ml-2 block text-sm text-gray-900">
                Produk aktif untuk dijual
              </label>
            </div>
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
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <span className="text-gray-500 sm:text-sm">ETH</span>
                </div>
                <input
                  type="number"
                  name="hargaEth"
                  value={formData.hargaEth}
                  onChange={handleInputChange}
                  step="0.001"
                  min="0.001"
                  max="10"
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
            {/* Submit Button */}
            <div className="flex justify-end space-x-4">
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
