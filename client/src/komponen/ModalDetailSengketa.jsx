import React, { useState, useEffect } from 'react';
import { 
  ExclamationTriangleIcon, 
  DocumentTextIcon, 
  PhotoIcon,
  ClockIcon,
  CheckCircleIcon,
  XCircleIcon,
  UserIcon,
  CalendarIcon,
  EyeIcon
} from '@heroicons/react/24/outline';
import { transaksiAPI } from '../layanan/api';
import toast from 'react-hot-toast';
const ModalDetailSengketa = ({ isOpen, onClose, transaksi }) => {
  const [sengketaDetail, setSengketaDetail] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  useEffect(() => {
    if (isOpen && transaksi?.id) {
      fetchSengketaDetail();
    }
  }, [isOpen, transaksi?.id]);
  const fetchSengketaDetail = async () => {
    try {
      setLoading(true);
      setError(null);
      // Panggil API untuk mendapatkan detail sengketa
      const response = await transaksiAPI.getDetailSengketa(transaksi.id);
      if (response.data?.sukses) {
        setSengketaDetail(response.data.data);
      } else {
        throw new Error(response.data?.pesan || 'Gagal memuat detail sengketa');
      }
    } catch (error) {
      console.error('❌ Error fetching dispute detail:', error);
      setError(error.message || 'Gagal memuat detail sengketa');
      toast.error('Gagal memuat detail sengketa');
    } finally {
      setLoading(false);
    }
  };
  const getStatusBadge = (status) => {
    const statusConfig = {
      'DIPROSES': {
        color: 'bg-yellow-100 text-yellow-800 border-yellow-300',
        text: 'Sedang Diproses',
        icon: ClockIcon,
        description: 'Sengketa sedang ditinjau oleh admin'
      },
      'DIMENANGKAN_PEMBELI': {
        color: 'bg-blue-100 text-blue-800 border-blue-300',
        text: 'Dimenangkan Pembeli',
        icon: CheckCircleIcon,
        description: 'Sengketa diputuskan untuk pembeli, dana dikembalikan'
      },
      'DIMENANGKAN_PENJUAL': {
        color: 'bg-green-100 text-green-800 border-green-300',
        text: 'Dimenangkan Penjual',
        icon: CheckCircleIcon,
        description: 'Sengketa diputuskan untuk penjual, dana dikirim ke penjual'
      },
      'DITOLAK': {
        color: 'bg-red-100 text-red-800 border-red-300',
        text: 'Ditolak',
        icon: XCircleIcon,
        description: 'Sengketa ditolak oleh admin'
      }
    };
    const config = statusConfig[status] || {
      color: 'bg-gray-100 text-gray-800 border-gray-300',
      text: status,
      icon: ClockIcon,
      description: 'Status tidak diketahui'
    };
    return (
      <span 
        className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-semibold border-2 ${config.color}`}
        title={config.description}
      >
        <config.icon className="h-4 w-4 mr-2" />
        {config.text}
      </span>
    );
  };
  const getKategoriLabel = (kategori) => {
    const kategoriMap = {
      'akun_bermasalah': 'Akun Bermasalah/Tidak Bisa Login',
      'akun_tidak_sesuai': 'Akun Tidak Sesuai Deskripsi',
      'akun_tidak_dikirim': 'Akun Tidak Dikirim',
      'data_salah': 'Data Login Salah/Tidak Lengkap',
      'lainnya': 'Masalah Lainnya'
    };
    return kategoriMap[kategori] || kategori;
  };
  const formatDate = (dateString) => {
    if (!dateString) return 'Tidak tersedia';
    return new Date(dateString).toLocaleDateString('id-ID', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };
  const handleClose = () => {
    setSengketaDetail(null);
    setError(null);
    onClose();
  };
  if (!isOpen || !transaksi) return null;
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b border-gray-200">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 flex items-center">
              <ExclamationTriangleIcon className="h-6 w-6 text-red-600 mr-2" />
              Detail Sengketa
            </h2>
            <p className="text-sm text-gray-600 mt-1">
              Transaksi: {transaksi.kodeTransaksi} - {transaksi.produk?.judulProduk}
            </p>
          </div>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-gray-600 text-2xl font-bold"
          >
            ×
          </button>
        </div>
        {/* Content */}
        <div className="p-6">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
                <p className="mt-4 text-gray-600">Memuat detail sengketa...</p>
              </div>
            </div>
          ) : error ? (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <div className="flex items-start">
                <XCircleIcon className="h-5 w-5 text-red-400 mt-0.5 mr-3" />
                <div>
                  <h3 className="text-sm font-medium text-red-800">Error</h3>
                  <p className="text-sm text-red-700 mt-1">{error}</p>
                  <button
                    onClick={fetchSengketaDetail}
                    className="mt-3 bg-red-100 px-3 py-2 rounded-md text-sm font-medium text-red-800 hover:bg-red-200"
                  >
                    Coba Lagi
                  </button>
                </div>
              </div>
            </div>
          ) : sengketaDetail ? (
            <div className="space-y-6">
              {/* Status Sengketa */}
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">Status Sengketa</h3>
                    {getStatusBadge(sengketaDetail.status)}
                  </div>
                  <div className="text-right text-sm text-gray-600">
                    <div className="flex items-center">
                      <CalendarIcon className="h-4 w-4 mr-1" />
                      Dibuat: {formatDate(sengketaDetail.dibuatPada)}
                    </div>
                    {sengketaDetail.resolvedAt && (
                      <div className="flex items-center mt-1">
                        <CheckCircleIcon className="h-4 w-4 mr-1" />
                        Diselesaikan: {formatDate(sengketaDetail.resolvedAt)}
                      </div>
                    )}
                  </div>
                </div>
              </div>
              {/* Informasi Transaksi */}
              <div className="bg-blue-50 rounded-lg p-4">
                <h3 className="text-lg font-semibold text-gray-900 mb-3">Informasi Transaksi</h3>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-gray-600">Kode Transaksi:</span>
                    <p className="font-medium">{transaksi.kodeTransaksi}</p>
                  </div>
                  <div>
                    <span className="text-gray-600">Produk:</span>
                    <p className="font-medium">{transaksi.produk?.judulProduk}</p>
                  </div>
                  <div>
                    <span className="text-gray-600">Game:</span>
                    <p className="font-medium">{transaksi.produk?.namaGame}</p>
                  </div>
                  <div>
                    <span className="text-gray-600">Nilai Transaksi:</span>
                    <p className="font-medium">
                      {transaksi.escrowAmount ? `${parseFloat(transaksi.escrowAmount).toFixed(4)} ETH` : 'N/A'}
                    </p>
                  </div>
                  <div>
                    <span className="text-gray-600">Pembeli:</span>
                    <p className="font-medium">{transaksi.pembeli?.nama || 'Anonim'}</p>
                  </div>
                  <div>
                    <span className="text-gray-600">Penjual:</span>
                    <p className="font-medium">{transaksi.penjual?.nama || 'Anonim'}</p>
                  </div>
                </div>
              </div>
              {/* Detail Sengketa */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-gray-900">Detail Sengketa</h3>
                {/* Kategori Masalah */}
                <div className="bg-white border border-gray-200 rounded-lg p-4">
                  <h4 className="font-medium text-gray-900 mb-2">Kategori Masalah</h4>
                  <p className="text-gray-700">
                    {sengketaDetail.kategori ? getKategoriLabel(sengketaDetail.kategori) : 'Kategori tidak tersedia'}
                  </p>
                </div>
                {/* Deskripsi dari Pembeli */}
                {sengketaDetail.deskripsi && (
                  <div className="bg-white border border-gray-200 rounded-lg p-4">
                    <h4 className="font-medium text-gray-900 mb-2 flex items-center">
                      <UserIcon className="h-4 w-4 mr-2 text-blue-600" />
                      Keluhan Pembeli
                    </h4>
                    <p className="text-gray-700 whitespace-pre-wrap">{sengketaDetail.deskripsi}</p>
                  </div>
                )}
                {/* Bukti dari Pembeli */}
                {sengketaDetail.pembeliBukti && (
                  <div className="bg-white border border-gray-200 rounded-lg p-4">
                    <h4 className="font-medium text-gray-900 mb-3 flex items-center">
                      <PhotoIcon className="h-4 w-4 mr-2 text-blue-600" />
                      Bukti dari Pembeli
                    </h4>
                    <div className="flex items-center space-x-4">
                      <img
                        src={sengketaDetail.pembeliBukti}
                        alt="Bukti Pembeli"
                        className="w-32 h-32 object-cover rounded-lg border border-gray-300"
                      />
                      <div>
                        <button
                          onClick={() => window.open(sengketaDetail.pembeliBukti, '_blank')}
                          className="inline-flex items-center px-3 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
                        >
                          <EyeIcon className="h-4 w-4 mr-2" />
                          Lihat Gambar Penuh
                        </button>
                      </div>
                    </div>
                  </div>
                )}
                {/* Bukti dari Penjual (jika ada) */}
                {sengketaDetail.penjualBukti && (
                  <div className="bg-white border border-gray-200 rounded-lg p-4">
                    <h4 className="font-medium text-gray-900 mb-3 flex items-center">
                      <PhotoIcon className="h-4 w-4 mr-2 text-green-600" />
                      Bukti dari Penjual
                    </h4>
                    <div className="flex items-center space-x-4">
                      <img
                        src={sengketaDetail.penjualBukti}
                        alt="Bukti Penjual"
                        className="w-32 h-32 object-cover rounded-lg border border-gray-300"
                      />
                      <div>
                        <button
                          onClick={() => window.open(sengketaDetail.penjualBukti, '_blank')}
                          className="inline-flex items-center px-3 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
                        >
                          <EyeIcon className="h-4 w-4 mr-2" />
                          Lihat Gambar Penuh
                        </button>
                      </div>
                    </div>
                  </div>
                )}
                {/* Keputusan Admin */}
                {sengketaDetail.resolution && (
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                    <h4 className="font-medium text-green-900 mb-2 flex items-center">
                      <CheckCircleIcon className="h-4 w-4 mr-2" />
                      Keputusan Admin
                    </h4>
                    <p className="text-green-800 whitespace-pre-wrap">{sengketaDetail.resolution}</p>
                    {sengketaDetail.admin && (
                      <p className="text-sm text-green-700 mt-2">
                        Diputuskan oleh: {sengketaDetail.admin.nama || sengketaDetail.admin.email}
                      </p>
                    )}
                  </div>
                )}
                {/* Smart Contract Info */}
                {(sengketaDetail.smartContractTxHash || sengketaDetail.paymentTxHash) && (
                  <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                    <h4 className="font-medium text-purple-900 mb-2">Transaksi Blockchain</h4>
                    <p className="text-sm text-purple-800 mb-2">
                      Hash: <code className="bg-purple-100 px-2 py-1 rounded text-xs">
                        {sengketaDetail.smartContractTxHash || sengketaDetail.paymentTxHash}
                      </code>
                    </p>
                    <a
                      href={`https://sepolia.etherscan.io/tx/${sengketaDetail.smartContractTxHash || sengketaDetail.paymentTxHash}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center px-3 py-2 border border-purple-300 text-sm font-medium rounded-md text-purple-700 bg-purple-100 hover:bg-purple-200"
                    >
                      Lihat di Etherscan
                    </a>
                  </div>
                )}
              </div>
              {/* Timeline */}
              <div className="bg-gray-50 rounded-lg p-4">
                <h3 className="text-lg font-semibold text-gray-900 mb-3">Timeline</h3>
                <div className="space-y-3">
                  <div className="flex items-start space-x-3">
                    <div className="w-2 h-2 bg-red-500 rounded-full mt-2"></div>
                    <div>
                      <p className="font-medium text-gray-900">Sengketa Dibuat</p>
                      <p className="text-sm text-gray-600">{formatDate(sengketaDetail.dibuatPada)}</p>
                    </div>
                  </div>
                  {sengketaDetail.resolvedAt && (
                    <div className="flex items-start space-x-3">
                      <div className="w-2 h-2 bg-green-500 rounded-full mt-2"></div>
                      <div>
                        <p className="font-medium text-gray-900">Sengketa Diselesaikan</p>
                        <p className="text-sm text-gray-600">{formatDate(sengketaDetail.resolvedAt)}</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-12">
              <ExclamationTriangleIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600">Detail sengketa tidak ditemukan</p>
            </div>
          )}
        </div>
        {/* Footer */}
        <div className="flex justify-end items-center p-6 border-t border-gray-200">
          <button
            onClick={handleClose}
            className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
};
export default ModalDetailSengketa;
