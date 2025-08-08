import React, { useState, useRef } from 'react';
import { apiService } from '../layanan/api';
import { 
  PhotoIcon, 
  XMarkIcon, 
  CloudArrowUpIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';
const ImageUpload = ({ 
  onUploadSuccess, 
  onUploadError, 
  onUploadStart,
  maxFiles = 1, 
  currentImages = [],
  className = '' 
}) => {
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef(null);
  const handleFileSelect = (files) => {
    if (files.length === 0) return;
    // Validasi jumlah file
    if (files.length > maxFiles) {
      toast.error(`Maksimal ${maxFiles} file yang dapat diupload`);
      return;
    }
    // Validasi ukuran file
    const maxSize = 5 * 1024 * 1024; // 5MB
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
    uploadFiles(files);
  };
  const uploadFiles = async (files) => {
    try {
      setUploading(true);
      onUploadStart && onUploadStart();
      if (maxFiles === 1) {
        // Single file upload
        const response = await apiService.upload.uploadImage(files[0]);
        console.log('Upload response:', response); // Debug log
        if (response.data.sukses) {
          onUploadSuccess && onUploadSuccess([response.data.data.url]);
          toast.success('Gambar berhasil diupload!');
        } else {
          throw new Error(response.data.pesan || 'Upload gagal');
        }
      } else {
        // Multiple file upload
        if (apiService.upload.uploadMultipleImages) {
          // Use multiple upload endpoint if available
          const response = await apiService.upload.uploadMultipleImages(files);
          console.log('Multiple upload response:', response); // Debug log
          if (response.data.sukses) {
            const urls = response.data.data.urls || response.data.data.files?.map(f => f.url) || [];
            onUploadSuccess && onUploadSuccess(urls);
            toast.success(`${files.length} gambar berhasil diupload!`);
          } else {
            throw new Error(response.data.pesan || 'Upload gagal');
          }
        } else {
          // Fallback: upload one by one
          const uploadPromises = files.map(file => apiService.upload.uploadImage(file));
          const responses = await Promise.all(uploadPromises);
          const urls = responses.map(r => r.data.data.url);
          onUploadSuccess && onUploadSuccess(urls);
          toast.success(`${files.length} gambar berhasil diupload!`);
        }
      }
    } catch (error) {
      console.error('Upload error:', error);
      console.error('Error response:', error.response); // Debug log
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
  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    const files = Array.from(e.dataTransfer.files);
    handleFileSelect(files);
  };
  const handleDragOver = (e) => {
    e.preventDefault();
    setDragOver(true);
  };
  const handleDragLeave = (e) => {
    e.preventDefault();
    setDragOver(false);
  };
  const handleFileInputChange = (e) => {
    const files = Array.from(e.target.files);
    handleFileSelect(files);
    // Reset input
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
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {currentImages.map((imageUrl, index) => (
              <div key={index} className="relative group">
                <img
                  src={imageUrl}
                  alt={`Preview ${index + 1}`}
                  className="w-full h-24 object-cover rounded-md border"
                />
                <button
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
      {/* Upload Area */}
      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
          dragOver 
            ? 'border-primary-500 bg-primary-50' 
            : 'border-gray-300 hover:border-gray-400'
        } ${uploading ? 'opacity-50 pointer-events-none' : ''}`}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple={maxFiles > 1}
          onChange={handleFileInputChange}
          className="hidden"
        />
        {uploading ? (
          <div className="flex flex-col items-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mb-2"></div>
            <p className="text-sm text-gray-600">Mengupload gambar...</p>
          </div>
        ) : (
          <div className="flex flex-col items-center">
            <CloudArrowUpIcon className="h-12 w-12 text-gray-400 mb-3" />
            <p className="text-sm font-medium text-gray-900 mb-1">
              Klik untuk upload atau drag & drop
            </p>
            <p className="text-xs text-gray-500 mb-3">
              PNG, JPG, GIF, WebP hingga 5MB
              {maxFiles > 1 && ` (Maksimal ${maxFiles} file)`}
            </p>
            <button
              onClick={() => fileInputRef.current?.click()}
              className="bg-primary-600 text-white px-4 py-2 rounded-md hover:bg-primary-700 transition-colors text-sm"
            >
              Pilih Gambar
            </button>
          </div>
        )}
      </div>
      {/* Info */}
      <div className="mt-3 flex items-start space-x-2 text-xs text-gray-500">
        <ExclamationTriangleIcon className="h-4 w-4 text-yellow-500 flex-shrink-0 mt-0.5" />
        <div>
          <p>Tips upload gambar:</p>
          <ul className="list-disc list-inside mt-1 space-y-1">
            <li>Gunakan gambar berkualitas tinggi untuk menarik pembeli</li>
            <li>Screenshot yang jelas menunjukkan detail akun</li>
            <li>Hindari gambar yang blur atau gelap</li>
          </ul>
        </div>
      </div>
    </div>
  );
};
export default ImageUpload;
