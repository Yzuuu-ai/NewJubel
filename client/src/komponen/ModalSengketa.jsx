import React, { useState } from 'react';
import { ExclamationTriangleIcon, DocumentTextIcon, PhotoIcon } from '@heroicons/react/24/outline';
import ImageUpload from './ImageUpload';
const ModalSengketa = ({ isOpen, onClose, onSubmit, loading, transaksi }) => {
  const [sengketaData, setSengketaData] = useState({
    bukti: [],
    deskripsi: '',
    kategori: 'akun_bermasalah'
  });
  const [errors, setErrors] = useState({});
  const [uploadLoading, setUploadLoading] = useState(false);
  if (!isOpen || !transaksi) return null;
  const kategoriOptions = [
    { value: 'akun_bermasalah', label: 'Akun Bermasalah/Tidak Bisa Login' },
    { value: 'akun_tidak_sesuai', label: 'Akun Tidak Sesuai Deskripsi' },
    { value: 'akun_tidak_dikirim', label: 'Akun Tidak Dikirim' },
    { value: 'data_salah', label: 'Data Login Salah/Tidak Lengkap' },
    { value: 'lainnya', label: 'Masalah Lainnya' }
  ];
  const validateForm = () => {
    const newErrors = {};
    if (!sengketaData.deskripsi.trim()) {
      newErrors.deskripsi = 'Deskripsi masalah wajib diisi';
    } else if (sengketaData.deskripsi.trim().length < 20) {
      newErrors.deskripsi = 'Deskripsi minimal 20 karakter';
    }
    if (!sengketaData.bukti || sengketaData.bukti.length === 0) {
      newErrors.bukti = 'Bukti (screenshot) wajib diupload';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };
  const handleSubmit = () => {
    if (!validateForm()) {
      return;
    }
    onSubmit({
      bukti: sengketaData.bukti,
      alasan: sengketaData.deskripsi,
      kategori: sengketaData.kategori,
      transaksiId: transaksi.id
    });
  };
  const handleUploadSuccess = (urls) => {
    if (urls && urls.length > 0) {
      setSengketaData(prev => ({
        ...prev,
        bukti: urls // Simpan semua URL
      }));
      setErrors(prev => ({
        ...prev,
        bukti: undefined // Clear error
      }));
    }
    setUploadLoading(false);
  };
  const handleUploadError = (error) => {
    console.error('Upload error:', error);
    setErrors(prev => ({
      ...prev,
      bukti: 'Gagal upload gambar. Silakan coba lagi.'
    }));
    setUploadLoading(false);
  };
  const handleUploadStart = () => {
    setUploadLoading(true);
    setErrors(prev => ({
      ...prev,
      bukti: undefined // Clear previous errors
    }));
  };
  const handleClose = () => {
    setSengketaData({
      bukti: [],
      deskripsi: '',
      kategori: 'akun_bermasalah'
    });
    setErrors({});
    setUploadLoading(false);
    onClose();
  };
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b border-gray-200">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 flex items-center">
              <ExclamationTriangleIcon className="h-6 w-6 text-red-600 mr-2" />
              Buat Sengketa
            </h2>
            <p className="text-sm text-gray-600 mt-1">
              Transaksi: {transaksi.kodeTransaksi} - {transaksi.produk?.judulProduk}
            </p>
          </div>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-gray-600 text-2xl font-bold"
            disabled={loading || uploadLoading}
          >
            ×
          </button>
        </div>
        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Warning */}
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex items-start">
              <ExclamationTriangleIcon className="h-5 w-5 text-red-400 mt-0.5 mr-3" />
              <div>
                <h3 className="text-sm font-medium text-red-800">Penting!</h3>
                <p className="text-sm text-red-700 mt-1">
                  Sengketa akan ditinjau oleh admin dalam 1x24 jam. Pastikan Anda memberikan bukti yang jelas dan deskripsi yang detail.
                </p>
              </div>
            </div>
          </div>
          {/* Kategori Masalah */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Kategori Masalah <span className="text-red-500">*</span>
            </label>
            <select
              value={sengketaData.kategori}
              onChange={(e) => setSengketaData(prev => ({ ...prev, kategori: e.target.value }))}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
            >
              {kategoriOptions.map(option => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
          {/* Deskripsi Masalah */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Deskripsi Masalah <span className="text-red-500">*</span>
            </label>
            <textarea
              value={sengketaData.deskripsi}
              onChange={(e) => setSengketaData(prev => ({ ...prev, deskripsi: e.target.value }))}
              placeholder="Jelaskan secara detail masalah yang Anda alami dengan akun ini. Contoh: Tidak bisa login dengan username dan password yang diberikan, akun sudah terbanned, level tidak sesuai deskripsi, dll."
              rows="5"
              className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent ${
                errors.deskripsi ? 'border-red-300' : 'border-gray-300'
              }`}
            />
            {errors.deskripsi && (
              <p className="text-red-600 text-sm mt-1">{errors.deskripsi}</p>
            )}
            <p className="text-sm text-gray-500 mt-2">
              Karakter: {sengketaData.deskripsi.length}/500 (minimal 20)
            </p>
          </div>
          {/* Upload Bukti Screenshot */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Upload Bukti Screenshot <span className="text-red-500">*</span>
            </label>
            <ImageUpload
              maxFiles={5}
              currentImages={Array.isArray(sengketaData.bukti) ? sengketaData.bukti : []}
              onUploadStart={handleUploadStart}
              onUploadSuccess={handleUploadSuccess}
              onUploadError={handleUploadError}
              className="w-full"
            />
            {errors.bukti && (
              <p className="text-red-600 text-sm mt-1">{errors.bukti}</p>
            )}
            {uploadLoading && (
              <p className="text-blue-600 text-sm mt-1 flex items-center">
                <svg className="animate-spin h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Sedang mengupload gambar...
              </p>
            )}
            {sengketaData.bukti && sengketaData.bukti.length > 0 && !uploadLoading && (
              <p className="text-green-600 text-sm mt-1 flex items-center">
                <svg className="h-4 w-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                </svg>
                {sengketaData.bukti.length} gambar berhasil diupload
              </p>
            )}
            <div className="mt-2 p-3 bg-blue-50 rounded-lg">
              <div className="flex items-start">
                <PhotoIcon className="h-5 w-5 text-blue-400 mt-0.5 mr-2" />
                <div className="text-sm text-blue-700">
                  <p className="font-medium">Tips screenshot yang baik:</p>
                  <ul className="list-disc list-inside mt-1 space-y-1">
                    <li>Ambil screenshot yang jelas menunjukkan masalah</li>
                    <li>Pastikan gambar tidak blur atau gelap</li>
                    <li>Sertakan informasi yang relevan (error message, status akun, dll)</li>
                    <li>Format yang didukung: PNG, JPG, GIF, WebP (maksimal 5MB)</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
          {/* Info Transaksi */}
          <div className="bg-gray-50 rounded-lg p-4">
            <h3 className="text-sm font-medium text-gray-900 mb-2">Informasi Transaksi</h3>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-gray-600">Produk:</span>
                <p className="font-medium">{transaksi.produk?.judulProduk}</p>
              </div>
              <div>
                <span className="text-gray-600">Game:</span>
                <p className="font-medium">{transaksi.produk?.namaGame}</p>
              </div>
              <div>
                <span className="text-gray-600">Harga:</span>
                <p className="font-medium">
                  {transaksi.escrowAmount ? `${parseFloat(transaksi.escrowAmount).toFixed(4)} ETH` : 'N/A'}
                </p>
              </div>
              <div>
                <span className="text-gray-600">Status:</span>
                <p className="font-medium">{transaksi.status}</p>
              </div>
            </div>
          </div>
        </div>
        {/* Footer */}
        <div className="flex justify-between items-center p-6 border-t border-gray-200">
          <button
            onClick={handleClose}
            className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium"
            disabled={loading || uploadLoading}
          >
            Batal
          </button>
          <button
            onClick={handleSubmit}
            disabled={loading || uploadLoading}
            className="px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 font-medium disabled:opacity-50 flex items-center"
          >
            {loading || uploadLoading ? (
              <>
                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                {uploadLoading ? 'Mengupload...' : 'Mengirim...'}
              </>
            ) : (
              <>
                <DocumentTextIcon className="h-5 w-5 mr-2" />
                Kirim Sengketa
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
export default ModalSengketa;
