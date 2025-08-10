import React, { useState, useRef } from 'react';
import { PhotoIcon, XMarkIcon } from '@heroicons/react/24/outline';
import { apiService } from '../layanan/api';
import toast from 'react-hot-toast';
const ImageUploadSimple = ({ 
  onUploadSuccess, 
  onUploadError, 
  maxFiles = 1, 
  currentImages = [],
  className = '' 
}) => {
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef(null);
  const handleFileSelect = async (files) => {
    if (files.length === 0) return;
    // Validasi jumlah file
    if (files.length > maxFiles) {
      toast.error(`Maksimal ${maxFiles} file yang dapat diupload`);
      return;
    }
    // Validasi ukuran file (5MB)
    const maxSize = 5 * 1024 * 1024;
    for (let file of files) {
      if (file.size > maxSize) {
        toast.error(`File ${file.name} terlalu besar. Maksimal 5MB`);
        return;
      }
    }
    // Validasi tipe file
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
    for (let file of files) {
      if (!allowedTypes.includes(file.type)) {
        toast.error(`File ${file.name} bukan format gambar yang didukung`);
        return;
      }
    }
    try {
      setUploading(true);
      
      if (maxFiles === 1) {
        // Single file upload - replace existing image for single file mode
        const response = await apiService.upload.uploadImage(files[0]);
        if (response.data.sukses) {
          // For single file mode, replace the existing image instead of adding to it
          const newImages = [response.data.data.url];
          onUploadSuccess && onUploadSuccess(newImages);
          toast.success('Gambar berhasil diupload!');
        } else {
          throw new Error(response.data.pesan || 'Upload gagal');
        }
      } else {
        // Multiple file upload
        if (apiService.upload.uploadMultipleImages) {
          const response = await apiService.upload.uploadMultipleImages(files);
          if (response.data.sukses) {
            const urls = response.data.data.urls || response.data.data.files?.map(f => f.url) || [];
            const allImages = [...currentImages, ...urls];
            const limitedImages = allImages.slice(0, maxFiles);
            onUploadSuccess && onUploadSuccess(limitedImages);
            toast.success(`${files.length} gambar berhasil diupload!`);
          } else {
            throw new Error(response.data.pesan || 'Upload gagal');
          }
        } else {
          // Fallback: upload one by one
          const uploadPromises = files.map(file => apiService.upload.uploadImage(file));
          const responses = await Promise.all(uploadPromises);
          const urls = responses.filter(r => r.data.sukses).map(r => r.data.data.url);
          const allImages = [...currentImages, ...urls];
          const limitedImages = allImages.slice(0, maxFiles);
          onUploadSuccess && onUploadSuccess(limitedImages);
          toast.success(`${urls.length} gambar berhasil diupload!`);
        }
      }
    } catch (error) {
      console.error('Upload error:', error);
      const errorMessage = error.response?.data?.pesan || 
                          error.response?.data?.message || 
                          error.message || 
                          'Gagal upload gambar';
      toast.error(errorMessage);
      onUploadError && onUploadError(error);
    } finally {
      setUploading(false);
    }
  };
  const handleFileInputChange = (e) => {
    const files = Array.from(e.target.files);
    handleFileSelect(files);
    e.target.value = '';
  };
  const removeImage = (imageUrl) => {
    const updatedImages = currentImages.filter(img => img !== imageUrl);
    onUploadSuccess && onUploadSuccess(updatedImages);
  };
  return (
    <div className={className}>
      {/* Current Images */}
      {currentImages.length > 0 && (
        <div className="mb-4">
          <p className="text-sm font-medium text-gray-700 mb-2">Gambar Saat Ini:</p>
          <div className="flex gap-2 overflow-x-auto">
            {currentImages.map((imageUrl, index) => (
              <div key={index} className="relative group flex-shrink-0">
                <img
                  src={imageUrl}
                  alt={`Preview ${index + 1}`}
                  className="w-20 h-20 object-cover rounded-md border"
                  onError={(e) => {
                    // Handle broken images or invalid data URLs
                    console.warn('Image failed to load:', imageUrl);
                    e.target.src = '/placeholder-game.jpg';
                  }}
                />
                <button
                  type="button"
                  onClick={() => removeImage(imageUrl)}
                  className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <XMarkIcon className="h-3 w-3" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
      {/* Upload Area - Only show if less than maxFiles */}
      {currentImages.length < maxFiles && (
        <div className="border-2 border-dashed border-gray-300 rounded-lg p-2 hover:border-gray-400 transition-colors">
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple={maxFiles > 1}
          onChange={handleFileInputChange}
          className="hidden"
        />
        {uploading ? (
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-primary-600 mr-2"></div>
            <p className="text-xs text-gray-600">Memproses gambar...</p>
          </div>
        ) : (
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <PhotoIcon className="h-6 w-6 text-gray-400 mr-2" />
              <div>
                <p className="text-xs font-medium text-gray-900">
                  Klik untuk pilih gambar
                </p>
                <p className="text-xs text-gray-500">
                  PNG, JPG, GIF, WebP hingga 5MB{maxFiles > 1 && ` (Maksimal ${maxFiles} file)`}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="bg-primary-600 text-white px-3 py-1.5 rounded-md hover:bg-primary-700 transition-colors text-xs flex-shrink-0"
            >
              Pilih Gambar
            </button>
          </div>
        )}
        </div>
      )}
      {/* Info */}
      <div className="mt-2 text-xs text-gray-500">
        <p>💡 Tips: Gunakan screenshot yang jelas untuk menunjukkan detail akun game Anda</p>
      </div>
    </div>
  );
};
export default ImageUploadSimple;
