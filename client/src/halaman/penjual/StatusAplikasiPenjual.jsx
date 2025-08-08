import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../konteks/AuthContext';
import { apiService } from '../../layanan/api';
import { 
  ClockIcon,
  CheckCircleIcon,
  XCircleIcon,
  ExclamationTriangleIcon,
  DocumentTextIcon,
  UserIcon,
  PhoneIcon,
  MapPinIcon
} from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';

const StatusAplikasiPenjual = () => {
  const navigate = useNavigate();
  const { user, isAuthenticated, loading: authLoading } = useAuth();
  const [aplikasi, setAplikasi] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      toast.error('Anda harus login untuk mengakses halaman ini');
      navigate('/masuk');
      return;
    }
    
    if (!authLoading && isAuthenticated && user) {
      if (user.role !== 'PENJUAL') {
        toast.error('Anda harus menjadi penjual untuk mengakses halaman ini');
        navigate('/');
        return;
      }
      loadStatusAplikasi();
    }
  }, [isAuthenticated, authLoading, user, navigate]);

  const loadStatusAplikasi = async () => {
    try {
      setLoading(true);
      const response = await apiService.aplikasiPenjual.getStatusAplikasi();
      if (response.data.data) {
        setAplikasi(response.data.data);
      }
    } catch (error) {
      console.error('Error loading status aplikasi:', error);
      toast.error('Gagal memuat status aplikasi');
    } finally {
      setLoading(false);
    }
  };

  const getStatusInfo = (status) => {
    switch (status) {
      case 'MENUNGGU':
        return {
          icon: ClockIcon,
          color: 'text-yellow-600',
          bgColor: 'bg-yellow-50',
          borderColor: 'border-yellow-200',
          title: 'Menunggu Review',
          description: 'Aplikasi Anda sedang dalam antrian untuk direview oleh admin.'
        };
      case 'SEDANG_DIREVIEW':
        return {
          icon: DocumentTextIcon,
          color: 'text-blue-600',
          bgColor: 'bg-blue-50',
          borderColor: 'border-blue-200',
          title: 'Sedang Direview',
          description: 'Admin sedang mereview aplikasi Anda. Mohon tunggu beberapa saat.'
        };
      case 'DISETUJUI':
        return {
          icon: CheckCircleIcon,
          color: 'text-green-600',
          bgColor: 'bg-green-50',
          borderColor: 'border-green-200',
          title: 'Disetujui',
          description: 'Selamat! Aplikasi Anda telah disetujui. Anda sekarang dapat mulai menjual produk.'
        };
      case 'DITOLAK':
        return {
          icon: XCircleIcon,
          color: 'text-red-600',
          bgColor: 'bg-red-50',
          borderColor: 'border-red-200',
          title: 'Ditolak',
          description: 'Maaf, aplikasi Anda ditolak. Silakan lihat catatan admin di bawah.'
        };
      default:
        return {
          icon: ExclamationTriangleIcon,
          color: 'text-gray-600',
          bgColor: 'bg-gray-50',
          borderColor: 'border-gray-200',
          title: 'Status Tidak Diketahui',
          description: 'Status aplikasi tidak dapat ditentukan.'
        };
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'Tidak diketahui';
    return new Date(dateString).toLocaleDateString('id-ID', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Memuat status aplikasi...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated || !user) {
    return null;
  }

  if (!aplikasi) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center">
        <div className="max-w-md mx-auto text-center">
          <ExclamationTriangleIcon className="h-16 w-16 text-gray-400 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">
            Aplikasi Tidak Ditemukan
          </h2>
          <p className="text-gray-600 mb-6">
            Anda belum mengajukan aplikasi menjadi penjual.
          </p>
          <button
            onClick={() => navigate('/ajukan-penjual')}
            className="bg-primary-600 text-white px-6 py-3 rounded-lg hover:bg-primary-700 transition-colors"
          >
            Ajukan Aplikasi Penjual
          </button>
        </div>
      </div>
    );
  }

  const statusInfo = getStatusInfo(aplikasi.status);
  const StatusIcon = statusInfo.icon;

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Status Aplikasi Penjual</h1>
          <p className="text-gray-600 mt-2">Pantau status aplikasi Anda untuk menjadi penjual</p>
        </div>

        {/* Status Card */}
        <div className={`${statusInfo.bgColor} ${statusInfo.borderColor} border-2 rounded-lg p-6 mb-8`}>
          <div className="flex items-center mb-4">
            <StatusIcon className={`h-8 w-8 ${statusInfo.color} mr-3`} />
            <div>
              <h2 className={`text-xl font-semibold ${statusInfo.color}`}>
                {statusInfo.title}
              </h2>
              <p className="text-gray-700 mt-1">
                {statusInfo.description}
              </p>
            </div>
          </div>
          
          {aplikasi.status === 'DISETUJUI' && (
            <div className="mt-4">
              <button
                onClick={() => navigate('/produk-saya')}
                className="bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700 transition-colors"
              >
                Mulai Jual Produk
              </button>
            </div>
          )}
        </div>

        {/* Detail Aplikasi */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-8">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Detail Aplikasi</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div className="flex items-start">
                <UserIcon className="h-5 w-5 text-gray-400 mt-0.5 mr-3" />
                <div>
                  <p className="text-sm font-medium text-gray-900">Email</p>
                  <p className="text-sm text-gray-600">{aplikasi.user?.email || 'Tidak tersedia'}</p>
                </div>
              </div>
              
              <div className="flex items-start">
                <PhoneIcon className="h-5 w-5 text-gray-400 mt-0.5 mr-3" />
                <div>
                  <p className="text-sm font-medium text-gray-900">Nomor Telepon</p>
                  <p className="text-sm text-gray-600">{aplikasi.nomor_telepon || 'Tidak tersedia'}</p>
                  {aplikasi.nomor_whatsapp && (
                    <>
                      <p className="text-sm font-medium text-gray-900 mt-2">WhatsApp</p>
                      <p className="text-sm text-gray-600">{aplikasi.nomor_whatsapp}</p>
                    </>
                  )}
                </div>
              </div>
            </div>
            
            <div className="space-y-4">
              <div className="flex items-start">
                <MapPinIcon className="h-5 w-5 text-gray-400 mt-0.5 mr-3" />
                <div>
                  <p className="text-sm font-medium text-gray-900">Alamat</p>
                  <p className="text-sm text-gray-600">{aplikasi.alamat || 'Tidak tersedia'}</p>
                </div>
              </div>
              
              {aplikasi.alasan_jual && (
                <div className="flex items-start">
                  <DocumentTextIcon className="h-5 w-5 text-gray-400 mt-0.5 mr-3" />
                  <div>
                    <p className="text-sm font-medium text-gray-900">Alasan Jual</p>
                    <p className="text-sm text-gray-600">{aplikasi.alasan_jual}</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Timeline */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-8">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Timeline Aplikasi</h3>
          
          <div className="space-y-4">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                  <CheckCircleIcon className="w-5 h-5 text-green-600" />
                </div>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-900">Aplikasi Diajukan</p>
                <p className="text-sm text-gray-500">{formatDate(aplikasi.diajukan_pada)}</p>
              </div>
            </div>
            
            {aplikasi.status !== 'MENUNGGU' && (
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className={`w-8 h-8 ${
                    aplikasi.status === 'DISETUJUI' ? 'bg-green-100' : 'bg-red-100'
                  } rounded-full flex items-center justify-center`}>
                    {aplikasi.status === 'DISETUJUI' ? (
                      <CheckCircleIcon className="w-5 h-5 text-green-600" />
                    ) : (
                      <XCircleIcon className="w-5 h-5 text-red-600" />
                    )}
                  </div>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-900">
                    Aplikasi {aplikasi.status === 'DISETUJUI' ? 'Disetujui' : 'Ditolak'}
                  </p>
                  <p className="text-sm text-gray-500">{formatDate(aplikasi.diperbarui)}</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Catatan Admin */}
        {aplikasi.catatan_admin && (
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Catatan Admin</h3>
            <div className={`p-4 rounded-lg ${
              aplikasi.status === 'DISETUJUI' ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'
            }`}>
              <p className="text-sm text-gray-700 whitespace-pre-wrap">
                {aplikasi.catatan_admin}
              </p>
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="mt-8 flex justify-center">
          <button
            onClick={() => navigate('/')}
            className="bg-gray-600 text-white px-6 py-3 rounded-lg hover:bg-gray-700 transition-colors"
          >
            Kembali ke Beranda
          </button>
        </div>
      </div>
    </div>
  );
};

export default StatusAplikasiPenjual;