import React, { useState } from 'react';
import {
  XMarkIcon,
  ExclamationTriangleIcon,
  DocumentTextIcon,
  PhotoIcon,
  ShieldCheckIcon
} from '@heroicons/react/24/outline';
import ImageUpload from './ImageUpload';

const ModalSengketaPenjual = ({ isOpen, onClose, onSubmit, loading, transaksi }) => {
  const [pembelaan, setPembelaan] = useState('');
  const [bukti, setBukti] = useState([]); // Changed to array for multiple images
  const [error, setError] = useState('');
  const [uploadLoading, setUploadLoading] = useState(false);
  
  if (!isOpen || !transaksi) return null;
  
  const handleSubmit = (e) => {
    e.preventDefault();
    setError('');
    
    // Validasi
    if (!pembelaan.trim()) {
      setError('Pembelaan harus diisi');
      return;
    }
    if (pembelaan.trim().length < 20) {
      setError('Pembelaan harus diisi minimal 20 karakter');
      return;
    }
    
    // Format data untuk dikirim
    const pembelaanData = {
      alasan: pembelaan.trim(), // Changed from 'deskripsi' to 'alasan' to match backend
      bukti: Array.isArray(bukti) ? bukti.join(',') : (bukti || null) // Join multiple URLs with comma
    };
    
    onSubmit(pembelaanData);
  };
  
  const handleUploadSuccess = (urls) => {
    if (urls && urls.length > 0) {
      setBukti(urls); // Set all URLs for multiple images
    }
    setUploadLoading(false);
  };

  const handleUploadError = (error) => {
    console.error('Upload error:', error);
    setError('Gagal upload gambar. Silakan coba lagi.');
    setUploadLoading(false);
  };

  const handleUploadStart = () => {
    setUploadLoading(true);
    setError(''); // Clear previous errors
  };

  const handleClose = () => {
    setPembelaan('');
    setBukti([]);
    setError('');
    setUploadLoading(false);
    onClose();
  };
  
  const sengketa = transaksi.sengketa || {};
  
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          {/* Header */}
          <div className="flex justify-between items-center mb-6">
            <div className="flex items-center space-x-3">
              <ShieldCheckIcon className="h-8 w-8 text-blue-600" />
              <div>
                <h3 className="text-xl font-semibold text-gray-900">
                  Buat Pembelaan Sengketa
                </h3>
                <p className="text-sm text-gray-500">
                  {transaksi.produk?.judulProduk} - {transaksi.kodeTransaksi}
                </p>
              </div>
            </div>
            <button
              onClick={handleClose}
              className="text-gray-400 hover:text-gray-600"
            >
              <XMarkIcon className="h-6 w-6" />
            </button>
          </div>
          
          {/* Informasi Sengketa dari Pembeli */}
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <h4 className="font-medium text-red-900 mb-3 flex items-center">
              <ExclamationTriangleIcon className="h-5 w-5 mr-2" />
              Sengketa dari Pembeli
            </h4>
            <div className="space-y-2">
              <div>
                <p className="text-sm font-medium text-red-800">Pembeli:</p>
                <p className="text-sm text-red-700">{transaksi.pembeli?.nama}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-red-800">Alasan Sengketa:</p>
                <p className="text-sm text-red-700 bg-red-100 p-2 rounded">
                  {sengketa.alasan || sengketa.deskripsi || 'Tidak ada alasan yang diberikan'}
                </p>
              </div>
              {sengketa.bukti && sengketa.bukti.length > 0 && (
                <div>
                  <p className="text-sm font-medium text-red-800">Bukti Pembeli:</p>
                  <div className="space-y-1">
                    {sengketa.bukti.map((buktiItem, index) => (
                      <div key={index} className="text-sm text-red-700 bg-red-100 p-2 rounded">
                        {buktiItem.includes('http') ? (
                          <a 
                            href={buktiItem} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="text-red-700 hover:text-red-900 underline flex items-center"
                          >
                            <PhotoIcon className="h-4 w-4 mr-1" />
                            Lihat Bukti {index + 1}
                          </a>
                        ) : (
                          buktiItem
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
          
          {/* Form Pembelaan */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Pembelaan */}
            <div>`n              <label className="block text-sm font-medium text-gray-700 mb-2">
                <DocumentTextIcon className="h-4 w-4 inline mr-1" />
                Pembelaan Anda *
              </label>
              <textarea
                value={pembelaan}
                onChange={(e) => setPembelaan(e.target.value)}
                placeholder="Jelaskan pembelaan Anda terhadap sengketa ini. Berikan penjelasan yang detail dan jujur..."
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                rows={6}
                disabled={loading}
              />
              <p className="text-xs text-gray-500 mt-1">
                Minimal 20 karakter. Jelaskan dengan detail mengapa Anda tidak setuju dengan sengketa pembeli.
              </p>
            </div>
            
            {/* Upload Bukti Tambahan */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <PhotoIcon className="h-4 w-4 inline mr-1" />
                Upload Bukti Tambahan (Opsional)
              </label>
              <ImageUpload
                maxFiles={5} // Changed from 1 to 5 for multiple images
                currentImages={bukti}
                onUploadStart={handleUploadStart}
                onUploadSuccess={handleUploadSuccess}
                onUploadError={handleUploadError}
                className="w-full"
              />
              {uploadLoading && (
                <p className="text-blue-600 text-sm mt-1 flex items-center">
                  <svg className="animate-spin h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Sedang mengupload gambar...
                </p>
              )}
              {bukti.length > 0 && !uploadLoading && (
                <p className="text-green-600 text-sm mt-1 flex items-center">
                  <svg className="h-4 w-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                  </svg>
                  {bukti.length} gambar berhasil diupload
                </p>
              )}
              
              {/* Tips upload gambar */}
              <div className="mt-2 text-xs text-gray-500">
                <p className="font-medium mb-1">Tips upload gambar:</p>
                <ul className="list-disc list-inside space-y-1">
                  <li>Gunakan gambar berkualitas tinggi untuk memperjelas pembelaan</li>
                  <li>Screenshot yang jelas menunjukkan bukti pembelaan</li>
                  <li>Hindari gambar yang blur atau gelap</li>
                  <li>Maksimal 5 gambar, masing-masing hingga 5MB</li>
                </ul>
              </div>
            </div>
            
            {/* Error Message */}
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-md p-3">
                <div className="flex">
                  <ExclamationTriangleIcon className="h-5 w-5 text-red-400" />
                  <div className="ml-3">
                    <p className="text-sm text-red-800">{error}</p>
                  </div>
                </div>
              </div>
            )}
            
            {/* Peringatan */}
            <div className="bg-yellow-50 border border-yellow-200 rounded-md p-3">
              <div className="flex">
                <ExclamationTriangleIcon className="h-5 w-5 text-yellow-400" />
                <div className="ml-3">
                  <h4 className="text-sm font-medium text-yellow-800">Penting!</h4>
                  <p className="text-sm text-yellow-700 mt-1">
                    Pembelaan ini akan dikirim ke admin untuk ditinjau bersama dengan sengketa pembeli. 
                    Pastikan pembelaan Anda jujur dan didukung dengan bukti yang valid.
                  </p>
                </div>
              </div>
            </div>
            
            {/* Action Buttons */}
            <div className="flex space-x-3 pt-4">
              <button
                type="button"
                onClick={handleClose}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 font-medium"
                disabled={loading}
              >
                Batal
              </button>
              <button
                type="submit"
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 font-medium disabled:opacity-50"
                disabled={loading || uploadLoading || !pembelaan.trim() || pembelaan.trim().length < 20}
              >
                {loading || uploadLoading ? (
                  <div className="flex items-center justify-center">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    {uploadLoading ? 'Mengupload...' : 'Mengirim...'}
                  </div>
                ) : (
                  <>
                    <ShieldCheckIcon className="h-4 w-4 inline mr-1" />
                    Kirim Pembelaan
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

export default ModalSengketaPenjual;

