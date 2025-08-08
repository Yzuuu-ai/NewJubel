import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../konteks/AuthContext';
import { transaksiAPI } from '../layanan/api';
import { useWallet } from '../konteks/WalletContext';
import { accountDataHelper } from '../utils/accountDataHelper';
import { RoleBasedTransaksiActions } from '../komponen/KomponenSengketaBerdasarkanRole';
import KomponenSmartContract from '../komponen/KomponenSmartContract';
import ModalKirimAkun from '../komponen/ModalKirimAkun';
import ModalTerimaAkun from '../komponen/ModalTerimaAkun';
import ModalLihatAkun from '../komponen/ModalLihatAkun';
import {
  ArrowLeftIcon,
  ClockIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  CurrencyDollarIcon,
  UserIcon,
  CalendarIcon,
  DocumentTextIcon,
  LinkIcon
} from '@heroicons/react/24/outline';

const DetailTransaksi = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { account, connectWallet, contract } = useWallet();
  const [transaksi, setTransaksi] = useState(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [showKirimAkunModal, setShowKirimAkunModal] = useState(false);
  const [showTerimaAkunModal, setShowTerimaAkunModal] = useState(false);
  const [showLihatAkunModal, setShowLihatAkunModal] = useState(false);

  useEffect(() => {
    fetchTransaksi();
  }, [id]);

  const fetchTransaksi = async () => {
    try {
      setLoading(true);
      const response = await transaksiAPI.getDetailTransaksi(id);
      
      if (response.data?.sukses && response.data?.data?.transaksi) {
        setTransaksi(response.data.data.transaksi);
      } else {
        throw new Error('Data transaksi tidak ditemukan');
      }
    } catch (error) {
      console.error('Error fetching transaksi:', error);
      const errorMessage = error.response?.data?.pesan || error.message || 'Gagal memuat detail transaksi';
      alert(`Error: ${errorMessage}`);
      
      if (user?.role === 'ADMIN') {
        navigate('/admin/transaksi');
      } else {
        navigate('/dashboard');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleKonfirmasiPembayaran = async (txHash, escrowAmount) => {
    try {
      setActionLoading(true);
      const response = await transaksiAPI.konfirmasiPembayaran(id, {
        smartContractTxHash: txHash,
        escrowAmount: escrowAmount
      });
      await fetchTransaksi();
      alert('Pembayaran berhasil dikonfirmasi! Menunggu penjual mengirim akun.');
    } catch (error) {
      console.error('Error konfirmasi pembayaran:', error);
      const errorMessage = error.userMessage || error.response?.data?.pesan || error.message || 'Gagal konfirmasi pembayaran';
      alert('Gagal konfirmasi pembayaran: ' + errorMessage);
    } finally {
      setActionLoading(false);
    }
  };

  const handleKirimAkun = async (buktiData) => {
    try {
      setActionLoading(true);
      await transaksiAPI.kirimAkun(id, buktiData);
      await fetchTransaksi();
      setShowKirimAkunModal(false);
      alert('Akun berhasil dikirim!');
    } catch (error) {
      console.error('Error kirim akun:', error);
      alert('Gagal kirim akun: ' + error.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleKonfirmasiPenerimaan = async () => {
    if (!account) {
      alert('Silakan connect wallet terlebih dahulu');
      return;
    }
    try {
      setActionLoading(true);
      const escrowId = transaksi.escrowId;
      if (!escrowId) {
        alert('Escrow ID tidak ditemukan dalam transaksi. Pastikan pembayaran sudah dikonfirmasi melalui smart contract.');
        return;
      }
      if (isNaN(escrowId) || parseInt(escrowId) < 1) {
        alert('Escrow ID tidak valid: ' + escrowId);
        return;
      }
      const buyerAddress = transaksi.pembeli.walletAddress;
      if (!buyerAddress) {
        alert('Alamat wallet pembeli tidak ditemukan');
        return;
      }
      const { default: escrowService } = await import('../layanan/escrowService');
      const result = await escrowService.confirmReceived(escrowId, buyerAddress);
      if (result.success) {
        await transaksiAPI.konfirmasiPenerimaan(id);
        await fetchTransaksi();
        setShowTerimaAkunModal(false);
        alert('Penerimaan berhasil dikonfirmasi!');
      } else {
        alert('Gagal konfirmasi penerimaan: ' + result.error);
      }
    } catch (error) {
      console.error('Error konfirmasi penerimaan:', error);
      alert('Gagal konfirmasi penerimaan: ' + error.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleSengketa = async (sengketaData) => {
    try {
      setActionLoading(true);
      await transaksiAPI.buatSengketa(id, sengketaData);
      await fetchTransaksi();
      setShowTerimaAkunModal(false);
      alert('Sengketa berhasil dilaporkan!');
    } catch (error) {
      console.error('Error buat sengketa:', error);
      alert('Gagal membuat sengketa: ' + error.message);
    } finally {
      setActionLoading(false);
    }
  };

  const getStatusBadge = (status) => {
    const statusConfig = {
      'MENUNGGU_PEMBAYARAN': { 
        color: 'bg-yellow-100 text-yellow-800 border-yellow-200', 
        text: 'Menunggu Pembayaran',
        icon: ClockIcon
      },
      'DIBAYAR_SMARTCONTRACT': { 
        color: 'bg-blue-100 text-blue-800 border-blue-200', 
        text: 'Pembayaran Berhasil',
        icon: CheckCircleIcon
      },
      'DIKIRIM': { 
        color: 'bg-purple-100 text-purple-800 border-purple-200', 
        text: 'Akun Dikirim',
        icon: DocumentTextIcon
      },
      'DIKONFIRMASI_PEMBELI': { 
        color: 'bg-indigo-100 text-indigo-800 border-indigo-200', 
        text: 'Dikonfirmasi Pembeli',
        icon: CheckCircleIcon
      },
      'SENGKETA': { 
        color: 'bg-red-100 text-red-800 border-red-200', 
        text: 'Dalam Sengketa',
        icon: ExclamationTriangleIcon
      },
      'SELESAI': { 
        color: 'bg-green-100 text-green-800 border-green-200', 
        text: 'Selesai',
        icon: CheckCircleIcon
      },
      'GAGAL': { 
        color: 'bg-gray-100 text-gray-800 border-gray-200', 
        text: 'Gagal',
        icon: ExclamationTriangleIcon
      }
    };
    
    const config = statusConfig[status] || { 
      color: 'bg-gray-100 text-gray-800 border-gray-200', 
      text: status,
      icon: ClockIcon
    };
    
    return (
      <div className={`inline-flex items-center px-4 py-2 rounded-lg border ${config.color} font-medium`}>
        <config.icon className="h-5 w-5 mr-2" />
        {config.text}
      </div>
    );
  };

  const renderActionButtons = () => {
    if (!transaksi || !user) return null;
    const isPembeli = transaksi.roleUser === 'pembeli';
    const isPenjual = transaksi.roleUser === 'penjual';

    if (transaksi.status === 'MENUNGGU_PEMBAYARAN' && isPembeli) {
      return (
        <KomponenSmartContract
          transaksi={transaksi}
          onPaymentSuccess={handleKonfirmasiPembayaran}
          loading={actionLoading}
        />
      );
    }

    if (transaksi.status === 'DIBAYAR_SMARTCONTRACT' && isPenjual) {
      return (
        <button
          onClick={() => setShowKirimAkunModal(true)}
          disabled={actionLoading}
          className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg hover:bg-blue-700 disabled:opacity-50 font-medium"
        >
          {actionLoading ? 'Memproses...' : 'Kirim Data Akun'}
        </button>
      );
    }

    if (transaksi.status === 'DIKIRIM' && isPembeli) {
      return (
        <div className="space-y-3">
          {accountDataHelper.hasAccountData(transaksi) && (
            <button
              onClick={() => setShowLihatAkunModal(true)}
              className="w-full bg-green-600 text-white py-3 px-4 rounded-lg hover:bg-green-700 font-medium"
            >
              📋 Lihat Data Akun
            </button>
          )}
          <RoleBasedTransaksiActions 
            transaksi={transaksi} 
            user={user} 
            onSuccess={fetchTransaksi} 
          />
        </div>
      );
    }

    return (
      <RoleBasedTransaksiActions 
        transaksi={transaksi} 
        user={user} 
        onSuccess={fetchTransaksi} 
      />
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600 font-medium">Memuat detail transaksi...</p>
        </div>
      </div>
    );
  }

  if (!transaksi) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center max-w-md mx-auto">
          <div className="bg-white rounded-lg shadow-lg p-8">
            <ExclamationTriangleIcon className="h-16 w-16 text-gray-400 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Transaksi Tidak Ditemukan</h2>
            <p className="text-gray-600 mb-6">ID Transaksi: {id}</p>
            <div className="space-y-3">
              <button
                onClick={() => navigate(-1)}
                className="w-full bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700 font-medium"
              >
                Kembali
              </button>
              <button
                onClick={() => navigate('/dashboard')}
                className="w-full bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 font-medium"
              >
                Ke Dashboard
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center text-gray-600 hover:text-gray-900 mb-6 font-medium"
          >
            <ArrowLeftIcon className="w-5 h-5 mr-2" />
            Kembali
          </button>
          
          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between">
              <div className="mb-4 lg:mb-0">
                <h1 className="text-3xl font-bold text-gray-900 mb-2">Detail Transaksi</h1>
                <p className="text-gray-600">Kode: <span className="font-mono font-medium">{transaksi.kodeTransaksi}</span></p>
              </div>
              {getStatusBadge(transaksi.status)}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Informasi Produk */}
            {transaksi.produk && (
              <div className="bg-white rounded-lg shadow-sm p-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-6 flex items-center">
                  <DocumentTextIcon className="h-6 w-6 mr-2 text-blue-600" />
                  Informasi Produk
                </h2>
                <div className="flex flex-col sm:flex-row gap-6">
                  <img
                    src={transaksi.produk.gambar || '/placeholder-game.jpg'}
                    alt={transaksi.produk.judulProduk}
                    className="w-full sm:w-32 h-32 rounded-lg object-cover"
                  />
                  <div className="flex-1">
                    <h3 className="text-xl font-semibold text-gray-900 mb-2">
                      {transaksi.produk.judulProduk}
                    </h3>
                    <p className="text-gray-600 mb-3">
                      {transaksi.produk.namaGame}
                    </p>
                    <div className="flex items-center gap-4 mb-4">
                      <div className="text-2xl font-bold text-blue-600">
                        Rp {transaksi.produk.harga?.toLocaleString()}
                      </div>
                      {transaksi.produk.hargaEth && (
                        <div className="text-lg text-gray-500">
                          {transaksi.produk.hargaEth} ETH
                        </div>
                      )}
                    </div>
                    {transaksi.produk.deskripsi && (
                      <div className="pt-4 border-t border-gray-200">
                        <h4 className="font-medium text-gray-900 mb-2">Deskripsi</h4>
                        <p className="text-gray-600 text-sm leading-relaxed">
                          {transaksi.produk.deskripsi}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Pihak Terlibat */}
            {(transaksi.penjual || transaksi.pembeli) && (
              <div className="bg-white rounded-lg shadow-sm p-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-6 flex items-center">
                  <UserIcon className="h-6 w-6 mr-2 text-blue-600" />
                  Pihak Terlibat
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {transaksi.penjual && (
                    <div className="bg-gray-50 rounded-lg p-4">
                      <h3 className="font-semibold text-gray-900 mb-3">Penjual</h3>
                      <div className="space-y-2">
                        <p className="text-gray-900 font-medium">
                          {transaksi.penjual.nama}
                        </p>
                        <p className="text-gray-600 text-sm">
                          {transaksi.penjual.email}
                        </p>
                        {transaksi.penjual.walletAddress && (
                          <p className="text-gray-500 text-xs font-mono break-all">
                            {transaksi.penjual.walletAddress}
                          </p>
                        )}
                      </div>
                    </div>
                  )}
                  {transaksi.pembeli && (
                    <div className="bg-gray-50 rounded-lg p-4">
                      <h3 className="font-semibold text-gray-900 mb-3">Pembeli</h3>
                      <div className="space-y-2">
                        <p className="text-gray-900 font-medium">
                          {transaksi.pembeli.nama}
                        </p>
                        <p className="text-gray-600 text-sm">
                          {transaksi.pembeli.email}
                        </p>
                        {transaksi.pembeli.walletAddress && (
                          <p className="text-gray-500 text-xs font-mono break-all">
                            {transaksi.pembeli.walletAddress}
                          </p>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Timeline */}
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-6 flex items-center">
                <CalendarIcon className="h-6 w-6 mr-2 text-blue-600" />
                Timeline Transaksi
              </h2>
              <div className="space-y-4">
                <div className="flex items-start space-x-4">
                  <div className="w-3 h-3 bg-green-500 rounded-full mt-2"></div>
                  <div>
                    <p className="font-medium text-gray-900">Transaksi Dibuat</p>
                    <p className="text-sm text-gray-500">
                      {new Date(transaksi.dibuatPada).toLocaleString('id-ID')}
                    </p>
                  </div>
                </div>
                {transaksi.waktuBayar && (
                  <div className="flex items-start space-x-4">
                    <div className="w-3 h-3 bg-blue-500 rounded-full mt-2"></div>
                    <div>
                      <p className="font-medium text-gray-900">Pembayaran Dikonfirmasi</p>
                      <p className="text-sm text-gray-500">
                        {new Date(transaksi.waktuBayar).toLocaleString('id-ID')}
                      </p>
                    </div>
                  </div>
                )}
                {transaksi.adminReleaseAt && (
                  <div className="flex items-start space-x-4">
                    <div className="w-3 h-3 bg-green-500 rounded-full mt-2"></div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium text-gray-900">Admin Release Dana</p>
                          <p className="text-sm text-gray-500">
                            {new Date(transaksi.adminReleaseAt).toLocaleString('id-ID')}
                          </p>
                        </div>
                        {transaksi.adminReleaseTxHash && (
                          <a
                            href={`https://sepolia.etherscan.io/tx/${transaksi.adminReleaseTxHash}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center px-3 py-1 bg-blue-100 text-blue-700 text-xs font-medium rounded-full hover:bg-blue-200 transition-colors"
                          >
                            <LinkIcon className="w-3 h-3 mr-1" />
                            Lihat di Etherscan
                          </a>
                        )}
                      </div>
                    </div>
                  </div>
                )}
                {transaksi.adminRefundAt && (
                  <div className="flex items-start space-x-4">
                    <div className="w-3 h-3 bg-orange-500 rounded-full mt-2"></div>
                    <div>
                      <p className="font-medium text-gray-900">Admin Refund Dana</p>
                      <p className="text-sm text-gray-500">
                        {new Date(transaksi.adminRefundAt).toLocaleString('id-ID')}
                      </p>
                    </div>
                  </div>
                )}
                {transaksi.waktuSelesai && (
                  <div className="flex items-start space-x-4">
                    <div className="w-3 h-3 bg-green-500 rounded-full mt-2"></div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium text-gray-900">Transaksi Selesai</p>
                          <p className="text-sm text-gray-500">
                            {new Date(transaksi.waktuSelesai).toLocaleString('id-ID')}
                          </p>
                        </div>
                        {transaksi.adminReleaseTxHash && (
                          <a
                            href={`https://sepolia.etherscan.io/tx/${transaksi.adminReleaseTxHash}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center px-3 py-1 bg-green-100 text-green-700 text-xs font-medium rounded-full hover:bg-green-200 transition-colors"
                          >
                            <LinkIcon className="w-3 h-3 mr-1" />
                            Lihat di Etherscan
                          </a>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Sengketa Info */}
            {transaksi.sengketa && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-6">
                <h2 className="text-xl font-semibold text-red-900 mb-4 flex items-center">
                  <ExclamationTriangleIcon className="h-6 w-6 mr-2" />
                  Informasi Sengketa
                </h2>
                <div className="space-y-3">
                  <div>
                    <span className="font-medium text-red-900">Status: </span>
                    <span className="text-red-800">{transaksi.sengketa.status}</span>
                  </div>
                  <div>
                    <span className="font-medium text-red-900">Deskripsi: </span>
                    <span className="text-red-800">{transaksi.sengketa.deskripsi}</span>
                  </div>
                  <p className="text-sm text-red-700 bg-red-100 p-3 rounded-lg">
                    Sengketa sedang ditinjau oleh admin. Anda akan mendapat notifikasi hasil keputusan.
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Smart Contract Info */}
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <LinkIcon className="h-5 w-5 mr-2 text-blue-600" />
                Smart Contract & Blockchain Transactions
              </h3>
              
              {/* Debug Info - Remove in production */}
              {process.env.NODE_ENV === 'development' && (
                <div className="mb-4 p-3 bg-gray-100 rounded text-xs">
                  <p><strong>Debug Info:</strong></p>
                  <p>smartContractTxHash: {transaksi.smartContractTxHash || 'null'}</p>
                  <p>adminReleaseTxHash: {transaksi.adminReleaseTxHash || 'null'}</p>
                  <p>adminRefundTxHash: {transaksi.adminRefundTxHash || 'null'}</p>
                  <p>escrowAmount: {transaksi.escrowAmount || 'null'}</p>
                  <p>escrowId: {transaksi.escrowId || 'null'}</p>
                </div>
              )}

              <div className="space-y-4">
                {/* Initial Payment Transaction */}
                {transaksi.smartContractTxHash ? (
                  <div className="bg-blue-50 rounded-lg p-4 border-l-4 border-blue-400">
                    <h4 className="text-sm font-semibold text-blue-900 mb-2 flex items-center">
                      💰 Pembayaran Awal (Escrow Created)
                    </h4>
                    <div className="space-y-2">
                      <div>
                        <p className="text-xs font-medium text-blue-700 mb-1">Transaction Hash:</p>
                        <a
                          href={`https://sepolia.etherscan.io/tx/${transaksi.smartContractTxHash}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:text-blue-800 text-xs font-mono break-all underline block"
                        >
                          {transaksi.smartContractTxHash}
                        </a>
                      </div>
                      {transaksi.escrowAmount && (
                        <div>
                          <p className="text-xs font-medium text-blue-700 mb-1">Escrow Amount:</p>
                          <p className="text-xs text-blue-900 font-mono font-bold">{transaksi.escrowAmount} ETH</p>
                        </div>
                      )}
                      {transaksi.escrowId && (
                        <div>
                          <p className="text-xs font-medium text-blue-700 mb-1">Escrow ID:</p>
                          <p className="text-xs text-blue-900 font-mono">{transaksi.escrowId}</p>
                        </div>
                      )}
                      <div>
                        <p className="text-xs font-medium text-blue-700 mb-1">Status:</p>
                        <p className="text-xs text-blue-900">Dana ditahan dalam smart contract</p>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="bg-gray-50 rounded-lg p-4 border-l-4 border-gray-300">
                    <h4 className="text-sm font-medium text-gray-600 mb-2">💰 Pembayaran Awal</h4>
                    <p className="text-xs text-gray-500">Belum ada transaksi pembayaran</p>
                  </div>
                )}

                {/* Admin Release Transaction */}
                {transaksi.adminReleaseTxHash ? (
                  <div className="bg-green-50 rounded-lg p-4 border-l-4 border-green-400">
                    <h4 className="text-sm font-semibold text-green-900 mb-2 flex items-center">
                      ✅ Admin Release Dana ke Penjual
                    </h4>
                    <div className="space-y-2">
                      <div>
                        <p className="text-xs font-medium text-green-700 mb-1">Transaction Hash:</p>
                        <a
                          href={`https://sepolia.etherscan.io/tx/${transaksi.adminReleaseTxHash}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-green-600 hover:text-green-800 text-xs font-mono break-all underline block"
                        >
                          {transaksi.adminReleaseTxHash}
                        </a>
                      </div>
                      {transaksi.adminReleaseAt && (
                        <div>
                          <p className="text-xs font-medium text-green-700 mb-1">Waktu Release:</p>
                          <p className="text-xs text-green-900 font-medium">
                            {new Date(transaksi.adminReleaseAt).toLocaleString('id-ID')}
                          </p>
                        </div>
                      )}
                      {transaksi.adminReleaseBy && (
                        <div>
                          <p className="text-xs font-medium text-green-700 mb-1">Diproses oleh:</p>
                          <p className="text-xs text-green-900">Admin ID: {transaksi.adminReleaseBy}</p>
                        </div>
                      )}
                      {transaksi.adminReleaseNote && (
                        <div>
                          <p className="text-xs font-medium text-green-700 mb-1">Catatan Admin:</p>
                          <p className="text-xs text-green-900 bg-green-100 p-2 rounded">
                            {transaksi.adminReleaseNote}
                          </p>
                        </div>
                      )}
                      <div>
                        <p className="text-xs font-medium text-green-700 mb-1">Status:</p>
                        <p className="text-xs text-green-900">Dana berhasil dikirim ke penjual</p>
                      </div>
                    </div>
                  </div>
                ) : transaksi.adminRefundTxHash ? null : (
                  <div className="bg-gray-50 rounded-lg p-4 border-l-4 border-gray-300">
                    <h4 className="text-sm font-medium text-gray-600 mb-2">✅ Admin Release Dana</h4>
                    <p className="text-xs text-gray-500">Menunggu admin melepas dana ke penjual</p>
                  </div>
                )}

                {/* Admin Refund Transaction */}
                {transaksi.adminRefundTxHash ? (
                  <div className="bg-orange-50 rounded-lg p-4 border-l-4 border-orange-400">
                    <h4 className="text-sm font-semibold text-orange-900 mb-2 flex items-center">
                      🔄 Admin Refund Dana ke Pembeli
                    </h4>
                    <div className="space-y-2">
                      <div>
                        <p className="text-xs font-medium text-orange-700 mb-1">Transaction Hash:</p>
                        <a
                          href={`https://sepolia.etherscan.io/tx/${transaksi.adminRefundTxHash}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-orange-600 hover:text-orange-800 text-xs font-mono break-all underline block"
                        >
                          {transaksi.adminRefundTxHash}
                        </a>
                      </div>
                      {transaksi.adminRefundAt && (
                        <div>
                          <p className="text-xs font-medium text-orange-700 mb-1">Waktu Refund:</p>
                          <p className="text-xs text-orange-900 font-medium">
                            {new Date(transaksi.adminRefundAt).toLocaleString('id-ID')}
                          </p>
                        </div>
                      )}
                      {transaksi.adminRefundBy && (
                        <div>
                          <p className="text-xs font-medium text-orange-700 mb-1">Diproses oleh:</p>
                          <p className="text-xs text-orange-900">Admin ID: {transaksi.adminRefundBy}</p>
                        </div>
                      )}
                      {transaksi.adminRefundNote && (
                        <div>
                          <p className="text-xs font-medium text-orange-700 mb-1">Catatan Admin:</p>
                          <p className="text-xs text-orange-900 bg-orange-100 p-2 rounded">
                            {transaksi.adminRefundNote}
                          </p>
                        </div>
                      )}
                      <div>
                        <p className="text-xs font-medium text-orange-700 mb-1">Status:</p>
                        <p className="text-xs text-orange-900">Dana berhasil dikembalikan ke pembeli</p>
                      </div>
                    </div>
                  </div>
                ) : transaksi.adminReleaseTxHash ? null : (
                  <div className="bg-gray-50 rounded-lg p-4 border-l-4 border-gray-300">
                    <h4 className="text-sm font-medium text-gray-600 mb-2">🔄 Admin Refund Dana</h4>
                    <p className="text-xs text-gray-500">Tidak ada refund yang dilakukan</p>
                  </div>
                )}

                {/* Summary */}
                <div className="bg-blue-50 rounded-lg p-3 border border-blue-200">
                  <h5 className="text-xs font-semibold text-blue-900 mb-2">📊 Ringkasan Transaksi Blockchain</h5>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <span className="text-blue-700">Total TX: </span>
                      <span className="font-mono text-blue-900">
                        {[transaksi.smartContractTxHash, transaksi.adminReleaseTxHash, transaksi.adminRefundTxHash].filter(Boolean).length}
                      </span>
                    </div>
                    <div>
                      <span className="text-blue-700">Status: </span>
                      <span className="font-medium text-blue-900">
                        {transaksi.adminReleaseTxHash ? 'Released' : 
                         transaksi.adminRefundTxHash ? 'Refunded' : 
                         transaksi.smartContractTxHash ? 'Escrowed' : 'Pending'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <CurrencyDollarIcon className="h-5 w-5 mr-2 text-blue-600" />
                Aksi
              </h3>
              <div className="space-y-3">
                {renderActionButtons()}
              </div>
            </div>
          </div>
        </div>

        {/* Modals */}
        <ModalKirimAkun
          isOpen={showKirimAkunModal}
          onClose={() => setShowKirimAkunModal(false)}
          onSubmit={handleKirimAkun}
          loading={actionLoading}
          transaksi={transaksi}
        />
        <ModalTerimaAkun
          isOpen={showTerimaAkunModal}
          onClose={() => setShowTerimaAkunModal(false)}
          onConfirm={handleKonfirmasiPenerimaan}
          onDispute={handleSengketa}
          loading={actionLoading}
          transaksi={transaksi}
        />
        <ModalLihatAkun
          isOpen={showLihatAkunModal}
          onClose={() => setShowLihatAkunModal(false)}
          transaksi={transaksi}
        />
      </div>
    </div>
  );
};

export default DetailTransaksi;
