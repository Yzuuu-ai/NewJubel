import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { adminAPI as oldAdminAPI } from '../../layanan/api';
import AdminNavigation from '../../komponen/AdminNavigation';
import ModalDetailSengketaAdmin from '../../komponen/ModalDetailSengketaAdmin';

// API Base URL untuk New Admin System
const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

// Unified Admin API - menggunakan sistem admin baru dengan fallback ke sistem lama
const adminAPI = {
  // Get all transaksi menggunakan sistem baru dengan fallback
  getAllTransaksi: async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/admin-new/transaksi`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`,
          'Content-Type': 'application/json'
        }
      });
      const data = await response.json();
      if (!response.ok) throw data;
      return data;
    } catch (error) {
      // Fallback ke sistem lama
      return await oldAdminAPI.getAllTransaksi();
    }
  },
  // Get all sengketa
  getAllSengketa: async (params = {}) => {
    try {
      const queryString = new URLSearchParams(params).toString();
      const response = await fetch(`${API_BASE_URL}/admin/sengketa${queryString ? `?${queryString}` : ''}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`,
          'Content-Type': 'application/json'
        }
      });
      const data = await response.json();
      if (!response.ok) throw data;
      return data;
    } catch (error) {
      // Fallback ke sistem lama
      return await oldAdminAPI.getAllSengketa(params);
    }
  },
  // Admin release funds - sistem baru
  releaseFunds: async (transaksiId, reason) => {
    const response = await fetch(`${API_BASE_URL}/admin-new/transaksi/${transaksiId}/release-funds`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('authToken')}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ reason })
    });
    const data = await response.json();
    if (!response.ok) throw data;
    return data;
  },
  // Admin resolve dispute - bayar ke penjual
  resolveDisputeToSeller: async (transaksiId, reason) => {
    const response = await fetch(`${API_BASE_URL}/admin-new/transaksi/${transaksiId}/resolve-dispute-seller`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('authToken')}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ reason })
    });
    const data = await response.json();
    if (!response.ok) throw data;
    return data;
  },
  // Admin resolve dispute - refund ke pembeli
  resolveDisputeToBuyer: async (transaksiId, reason) => {
    const response = await fetch(`${API_BASE_URL}/admin-new/transaksi/${transaksiId}/resolve-dispute-buyer`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('authToken')}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ reason })
    });
    const data = await response.json();
    if (!response.ok) throw data;
    return data;
  }
};

const PembayaranAdmin = () => {
  const [transaksi, setTransaksi] = useState([]);
  const [sengketa, setSengketa] = useState([]);
  const [displayData, setDisplayData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [paymentLoading, setPaymentLoading] = useState(false);
  const [filter, setFilter] = useState('all');
  const [selectedTransaksi, setSelectedTransaksi] = useState(null);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showDisputeModal, setShowDisputeModal] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    fetchTransaksi();
  }, []);

  useEffect(() => {
    fetchTransaksi();
  }, [filter]);

  const fetchTransaksi = async () => {
    try {
      setLoading(true);
      
      if (filter === 'SENGKETA') {
        // Fetch both transaksi with SENGKETA status and all sengketa data
        const [transaksiResponse, sengketaResponse] = await Promise.all([
          adminAPI.getAllTransaksi(),
          adminAPI.getAllSengketa()
        ]);
        
        let combinedData = [];
        
        // Add transaksi with SENGKETA status (hanya yang memiliki escrow ID yang valid dan bukan GAGAL)
        if (transaksiResponse.data && transaksiResponse.data.sukses !== false) {
          const transaksiData = transaksiResponse.data.data?.transaksi || transaksiResponse.data.transaksi || [];
          const sengketaTransaksi = transaksiData.filter(t => {
            const hasValidEscrowId = t.escrowId && t.escrowId !== null && t.escrowId !== '';
            const isSengketaStatus = t.status === 'SENGKETA';
            const isNotFailedStatus = t.status !== 'GAGAL' && t.status !== 'DIBATALKAN';
            
            return hasValidEscrowId && isSengketaStatus && isNotFailedStatus;
          });
          combinedData = [...combinedData, ...sengketaTransaksi];
        }
        
        // Add all sengketa data
        if (sengketaResponse.data && sengketaResponse.data.sukses !== false) {
          const sengketaData = sengketaResponse.data.data?.sengketa || sengketaResponse.data.sengketa || [];
          const formattedSengketa = sengketaData.map(s => ({
            ...s.transaksi,
            sengketaData: s,
            isSengketaItem: true
          }));
          combinedData = [...combinedData, ...formattedSengketa];
        }
        
        setDisplayData(combinedData);
      } else {
        // Fetch transaksi normally
        const response = await adminAPI.getAllTransaksi();
        if (response.data && response.data.sukses !== false) {
          const transaksiData = response.data.data?.transaksi || response.data.transaksi || [];
          
          // Filter hanya transaksi yang memiliki escrow ID yang valid dan bukan status GAGAL
          console.log('All transaksi data:', transaksiData);
          const validTransaksi = transaksiData.filter(t => {
            const hasValidEscrowId = t.escrowId && t.escrowId !== null && t.escrowId !== '';
            const isNotFailedStatus = t.status !== 'GAGAL' && t.status !== 'DIBATALKAN';
            const isValidStatus = t.status === 'SELESAI' || t.status === 'DIKONFIRMASI_PEMBELI' || t.status === 'SENGKETA';
            
            console.log(`Transaction ${t.kodeTransaksi}: escrowId=${t.escrowId}, status=${t.status}, hasValidEscrowId=${hasValidEscrowId}, isNotFailedStatus=${isNotFailedStatus}, isValidStatus=${isValidStatus}`);
            
            return hasValidEscrowId && isNotFailedStatus && isValidStatus;
          });
          console.log('Valid transaksi after filter:', validTransaksi);
          
          // Filter transaksi berdasarkan status
          let filteredTransaksi = validTransaksi;
          if (filter === 'DIKONFIRMASI_PEMBELI') {
            filteredTransaksi = validTransaksi.filter(t => t.status === 'DIKONFIRMASI_PEMBELI');
          } else if (filter === 'SELESAI') {
            filteredTransaksi = validTransaksi.filter(t => t.status === 'SELESAI');
          }
          setTransaksi(Array.isArray(filteredTransaksi) ? filteredTransaksi : []);
          setDisplayData(Array.isArray(filteredTransaksi) ? filteredTransaksi : []);
        } else {
          throw new Error(response.data?.pesan || 'Failed to load transaksi');
        }
      }
    } catch (error) {
      console.error('Error loading data:', error);
      if (error.message.includes('403') || error.message.includes('401')) {
        alert('Sesi Anda telah berakhir. Silakan login kembali.');
        navigate('/masuk');
      } else {
        alert('Gagal memuat data. Periksa koneksi server.');
      }
      setTransaksi([]);
      setDisplayData([]);
    } finally {
      setLoading(false);
    }
  };

  const handlePayment = async () => {
    if (!selectedTransaksi) return;

    // Validasi data sebelum kirim
    if (!selectedTransaksi.escrowId) {
      alert('Escrow ID tidak ditemukan');
      return;
    }

    // Ambil wallet address yang benar
    const sellerWallet = selectedTransaksi.penjual?.walletAddress;
    if (!sellerWallet) {
      alert('Alamat wallet penjual tidak ditemukan');
      return;
    }

    // Validasi format wallet address
    if (!/^0x[a-fA-F0-9]{40}$/.test(sellerWallet)) {
      alert('Format alamat wallet penjual tidak valid');
      return;
    }

    // Gunakan sistem baru dengan alasan
    const reason = prompt(`PEMBAYARAN KE PENJUAL\n\nAnda akan mengirim dana ${selectedTransaksi.escrowAmount} ETH ke penjual: ${selectedTransaksi.penjual.nama}\n\nMasukkan alasan pembayaran (minimal 10 karakter):`);
    if (!reason || reason.length < 10) {
      alert('Alasan pembayaran harus diisi minimal 10 karakter');
      return;
    }

    const confirmMessage = `KONFIRMASI PEMBAYARAN ADMIN\n\n` +
      `Anda akan mengirim dana dari smart contract ke penjual:\n\n` +
      `Detail:\n` +
      `- Escrow ID: ${selectedTransaksi.escrowId}\n` +
      `- Jumlah: ${selectedTransaksi.escrowAmount} ETH\n` +
      `- Penjual: ${selectedTransaksi.penjual.nama}\n` +
      `- Wallet: ${sellerWallet}\n` +
      `- Alasan: ${reason}\n\n` +
      `Lanjutkan pembayaran?`;

    if (!window.confirm(confirmMessage)) {
      return;
    }

    try {
      setPaymentLoading(true);
      // Gunakan API baru untuk release funds
      const response = await adminAPI.releaseFunds(selectedTransaksi.id, reason);

      if (response.sukses) {
        setShowPaymentModal(false);
        setSelectedTransaksi(null);
        await fetchTransaksi();
        // Show success message dengan transaction hash
        alert(`PEMBAYARAN BERHASIL!\n\n${response.pesan}\n\nTransaction Hash: ${response.data?.smartContract?.transactionHash || 'N/A'}\n\nDana ${selectedTransaksi.escrowAmount} ETH telah dikirim ke ${selectedTransaksi.penjual.nama}`);
      } else {
        throw new Error(response.pesan || 'Failed to release funds');
      }
    } catch (error) {
      console.error('Payment error:', error);
      console.error('Full error object:', JSON.stringify(error, null, 2));
      
      let errorMessage = 'PEMBAYARAN GAGAL\n\n';
      // Handle fetch response errors
      if (error.name === 'TypeError' && error.message.includes('fetch')) {
        errorMessage += 'Koneksi ke server gagal. Periksa koneksi internet Anda.';
      } else if (typeof error === 'object' && error.pesan) {
        // Response dari server dengan format {sukses: false, pesan: "..."}
        errorMessage += `Server Error: ${error.pesan}`;
        if (error.error) {
          errorMessage += `\nDetail: ${error.error}`;
        }
        if (error.details) {
          errorMessage += `\nStack: ${error.details}`;
        }
      } else if (error.message) {
        errorMessage += `Error: ${error.message}`;
      } else {
        errorMessage += 'Terjadi kesalahan yang tidak diketahui';
      }
      alert(errorMessage);
    } finally {
      setPaymentLoading(false);
    }
  };

  const handleDisputePayment = async (payTo) => {
    if (!selectedTransaksi) return;

    // Validasi data sebelum kirim
    if (!selectedTransaksi.escrowId) {
      alert('Escrow ID tidak ditemukan');
      return;
    }

    const recipient = payTo === 'seller' ? selectedTransaksi.penjual : selectedTransaksi.pembeli;
    const recipientWallet = payTo === 'seller' ? selectedTransaksi.penjual?.walletAddress : selectedTransaksi.pembeli?.walletAddress;

    if (!recipientWallet) {
      alert(`Alamat wallet ${payTo === 'seller' ? 'penjual' : 'pembeli'} tidak ditemukan`);
      return;
    }

    // Validasi format wallet address
    if (!/^0x[a-fA-F0-9]{40}$/.test(recipientWallet)) {
      alert(`Format alamat wallet ${payTo === 'seller' ? 'penjual' : 'pembeli'} tidak valid`);
      return;
    }

    const actionText = payTo === 'seller' ? 'BAYAR PENJUAL' : 'REFUND PEMBELI';
    const reason = prompt(`PENYELESAIAN SENGKETA - ${actionText}\n\nAnda akan menyelesaikan sengketa dan mengirim dana ${selectedTransaksi.escrowAmount} ETH ke ${payTo === 'seller' ? 'penjual' : 'pembeli'}: ${recipient.nama}\n\nMasukkan alasan penyelesaian sengketa (minimal 10 karakter):`);
    
    if (!reason || reason.length < 10) {
      alert('Alasan penyelesaian sengketa harus diisi minimal 10 karakter');
      return;
    }

    const confirmMessage = `KONFIRMASI PENYELESAIAN SENGKETA\n\n` +
      `Anda akan menyelesaikan sengketa dan mengirim dana ke ${payTo === 'seller' ? 'penjual' : 'pembeli'}:\n\n` +
      `Detail:\n` +
      `- Escrow ID: ${selectedTransaksi.escrowId}\n` +
      `- Jumlah: ${selectedTransaksi.escrowAmount} ETH\n` +
      `- Penerima: ${recipient.nama}\n` +
      `- Wallet: ${recipientWallet}\n` +
      `- Alasan: ${reason}\n\n` +
      `Lanjutkan penyelesaian sengketa?`;

    if (!window.confirm(confirmMessage)) {
      return;
    }

    try {
      setPaymentLoading(true);
      // Gunakan API yang sesuai - SISTEM BARU LEBIH SEDERHANA
      const response = payTo === 'seller' 
        ? await adminAPI.resolveDisputeToSeller(selectedTransaksi.id, reason)
        : await adminAPI.resolveDisputeToBuyer(selectedTransaksi.id, reason);

      if (response.sukses) {
        setShowPaymentModal(false);
        setSelectedTransaksi(null);
        await fetchTransaksi();
        // Show success message dengan transaction hash
        alert(`SENGKETA BERHASIL DISELESAIKAN!\n\n${response.pesan}\n\nTransaction Hash: ${response.data?.smartContract?.transactionHash || 'N/A'}\n\nDana ${selectedTransaksi.escrowAmount} ETH telah dikirim ke ${recipient.nama}`);
      } else {
        throw new Error(response.pesan || 'Failed to resolve dispute');
      }
    } catch (error) {
      console.error('Dispute resolution error:', error);
      console.error('Full error object:', JSON.stringify(error, null, 2));
      
      let errorMessage = 'PENYELESAIAN SENGKETA GAGAL\n\n';
      // Handle fetch response errors
      if (error.name === 'TypeError' && error.message.includes('fetch')) {
        errorMessage += 'Koneksi ke server gagal. Periksa koneksi internet Anda.';
      } else if (typeof error === 'object' && error.pesan) {
        // Response dari server dengan format {sukses: false, pesan: "..."}
        errorMessage += `Server Error: ${error.pesan}`;
        if (error.error) {
          errorMessage += `\nDetail: ${error.error}`;
        }
        if (error.details) {
          errorMessage += `\nStack: ${error.details}`;
        }
      } else if (error.message) {
        errorMessage += `Error: ${error.message}`;
      } else {
        errorMessage += 'Terjadi kesalahan yang tidak diketahui';
      }
      alert(errorMessage);
    } finally {
      setPaymentLoading(false);
    }
  };

  const getStatusBadge = (status) => {
    const statusConfig = {
      // Status Transaksi
      'DIKONFIRMASI_PEMBELI': { color: 'bg-blue-100 text-blue-800', text: 'Perlu Bayar Penjual' },
      'SELESAI': { color: 'bg-green-100 text-green-800', text: 'Selesai' },
      'SENGKETA': { color: 'bg-red-100 text-red-800', text: 'Sengketa Aktif' },
      // Status Sengketa
      'DIPROSES': { color: 'bg-yellow-100 text-yellow-800', text: 'Perlu Review' },
      'DIMENANGKAN_PEMBELI': { color: 'bg-blue-100 text-blue-800', text: 'Pembeli Menang' },
      'DIMENANGKAN_PENJUAL': { color: 'bg-green-100 text-green-800', text: 'Penjual Menang' }
    };
    const config = statusConfig[status] || { color: 'bg-gray-100 text-gray-800', text: status };
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${config.color}`}>
        {config.text}
      </span>
    );
  };

  const handleDetailClick = (transaksiItem) => {
    setSelectedTransaksi(transaksiItem);
    // Jika ada sengketaData atau status SENGKETA
    if (transaksiItem.sengketaData || transaksiItem.status === 'SENGKETA') {
      setShowDisputeModal(true);
    } else {
      setShowPaymentModal(true);
    }
  };

  const handleDisputeResolve = async (winner) => {
    if (!selectedTransaksi) return;
    // Tutup modal detail sengketa dan buka modal pembayaran
    setShowDisputeModal(false);
    // Proses resolusi sengketa
    await handleDisputePayment(winner);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-[90%] mx-auto">
        <div className="flex gap-6">
          {/* Navigation Panel - Kiri (seperti filter di market) */}
          <div className="flex-shrink-0">
            <AdminNavigation />
          </div>

          {/* Main Content - Kanan */}
          <div className="flex-1">
            {/* Header */}
            <div className="bg-white rounded-lg shadow-sm mb-6">
              <div className="px-6 py-4 border-b border-gray-200">
                <h1 className="text-2xl font-bold text-gray-900">Manajemen Pembayaran & Sengketa</h1>
                <p className="text-gray-600 mt-1">Kelola pembayaran escrow dan sengketa untuk transaksi yang sudah dibayar pembeli</p>
              </div>
            </div>

            {/* Transactions Table */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-100">
              <div className="px-6 py-4 border-b border-gray-200">
                <h2 className="text-lg font-semibold text-gray-900">
                  {filter === 'SENGKETA' ? 'Daftar Sengketa & Transaksi Sengketa' : 'Daftar Transaksi Pembayaran'}
                </h2>
              </div>
              
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Produk
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Transaksi
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Harga
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Penjual
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Pembeli
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Tanggal
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Aksi
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {!Array.isArray(displayData) || displayData.length === 0 ? (
                      <tr>
                        <td colSpan="8" className="px-6 py-12 text-center">
                          <div className="text-gray-500">
                            <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                            </svg>
                            <h3 className="mt-2 text-sm font-medium text-gray-900">
                              {filter === 'SENGKETA' ? 'Tidak ada sengketa' : 'Tidak ada transaksi'}
                            </h3>
                            <p className="mt-1 text-sm text-gray-500">
                              {filter === 'SENGKETA'
                                ? 'Belum ada sengketa yang perlu ditinjau.'
                                : 'Belum ada transaksi dengan escrow yang perlu dikelola admin.'
                              }
                            </p>
                          </div>
                        </td>
                      </tr>
                    ) : (
                      Array.isArray(displayData) && displayData.map((item, index) => {
                        const isSengketaItem = item.isSengketaItem || false;
                        const sengketaData = item.sengketaData;
                        
                        // Create a unique key that combines multiple identifiers
                        const uniqueKey = isSengketaItem && sengketaData
                          ? `sengketa-${sengketaData.id || sengketaData.transaksiId || item.id}-${index}`
                          : `transaksi-${item.id || item.kodeTransaksi}-${index}`;
                        
                        return (
                          <tr key={uniqueKey} className="hover:bg-gray-50">
                            <td className="px-6 py-2 whitespace-nowrap">
                              <div className="flex items-center">
                                <img
                                  src={item.produk?.gambar || '/placeholder-game.jpg'}
                                  alt={item.produk?.judulProduk}
                                  className="w-10 h-10 rounded-lg object-cover mr-3"
                                />
                                <div>
                                  <div className="text-sm font-medium text-gray-900">
                                    {item.produk?.judulProduk || '-'}
                                  </div>
                                  <div className="text-xs text-gray-500">
                                    {item.produk?.namaGame || '-'}
                                  </div>
                                </div>
                              </div>
                            </td>
                            <td className="px-6 py-2 whitespace-nowrap">
                              <div className="text-sm text-gray-900">{item.kodeTransaksi || '-'}</div>
                              {item.escrowId && (
                                <div className="text-xs text-gray-500">Escrow: {item.escrowId}</div>
                              )}
                            </td>
                            <td className="px-6 py-2 whitespace-nowrap">
                              <div className="text-sm font-medium text-gray-900">
                                {item.escrowAmount ? `${parseFloat(item.escrowAmount).toFixed(4)} ETH` : '-'}
                              </div>
                              {item.produk?.harga && (
                                <div className="text-xs text-gray-500">
                                  ≈ Rp {item.produk.harga.toLocaleString()}
                                </div>
                              )}
                            </td>
                            <td className="px-6 py-2 whitespace-nowrap">
                              <div className="text-sm text-gray-900">{item.penjual?.nama || '-'}</div>
                              {item.penjual?.walletAddress && (
                                <div className="text-xs text-gray-500 font-mono">
                                  {item.penjual.walletAddress.substring(0, 6)}...{item.penjual.walletAddress.substring(item.penjual.walletAddress.length - 4)}
                                </div>
                              )}
                              {!item.penjual?.walletAddress && (
                                <div className="text-xs text-gray-400">-</div>
                              )}
                            </td>
                            <td className="px-6 py-2 whitespace-nowrap">
                              <div className="text-sm text-gray-900">{item.pembeli?.nama || '-'}</div>
                              {item.pembeli?.walletAddress && (
                                <div className="text-xs text-gray-500 font-mono">
                                  {item.pembeli.walletAddress.substring(0, 6)}...{item.pembeli.walletAddress.substring(item.pembeli.walletAddress.length - 4)}
                                </div>
                              )}
                              {!item.pembeli?.walletAddress && (
                                <div className="text-xs text-gray-400">-</div>
                              )}
                            </td>
                            <td className="px-6 py-2 whitespace-nowrap">
                              {isSengketaItem && sengketaData ?
                                getStatusBadge(sengketaData.status) :
                                getStatusBadge(item.status)
                              }
                            </td>
                            <td className="px-6 py-2 whitespace-nowrap">
                              <div className="text-sm text-gray-500">
                                {isSengketaItem && sengketaData ?
                                  new Date(sengketaData.dibuatPada).toLocaleDateString('id-ID') :
                                  new Date(item.dibuatPada).toLocaleDateString('id-ID')
                                }
                              </div>
                            </td>
                            <td className="px-6 py-2 whitespace-nowrap">
                              <button
                                onClick={() => handleDetailClick(item)}
                                className={`inline-flex items-center px-3 py-1 border shadow-sm text-xs leading-4 font-medium rounded-md text-white ${
                                  isSengketaItem && sengketaData
                                    ? sengketaData.status === 'DIPROSES'
                                      ? 'bg-red-600 hover:bg-red-700 border-red-600'
                                      : 'bg-gray-600 hover:bg-gray-700 border-gray-600'
                                    : item.status === 'DIKONFIRMASI_PEMBELI'
                                    ? 'bg-blue-600 hover:bg-blue-700 border-blue-600'
                                    : item.status === 'SENGKETA'
                                    ? 'bg-red-600 hover:bg-red-700 border-red-600'
                                    : 'bg-gray-600 hover:bg-gray-700 border-gray-600'
                                }`}
                              >
                                {isSengketaItem && sengketaData
                                  ? sengketaData.status === 'DIPROSES' ? 'Review' : 'Detail'
                                  : item.status === 'DIKONFIRMASI_PEMBELI'
                                  ? 'Bayar'
                                  : item.status === 'SENGKETA'
                                  ? 'Sengketa'
                                  : 'Detail'
                                }
                              </button>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Payment Modal */}
      {showPaymentModal && selectedTransaksi && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-semibold text-gray-900">
                  {selectedTransaksi.status === 'SENGKETA' 
                    ? `Penyelesaian Sengketa - ${selectedTransaksi.kodeTransaksi}`
                    : `Pembayaran ke Penjual - ${selectedTransaksi.kodeTransaksi}`
                  }
                </h3>
                <button
                  onClick={() => setShowPaymentModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <div className="space-y-4">
                {/* Informasi Transaksi */}
                <div className="bg-gray-50 rounded-lg p-4">
                  <h4 className="font-medium text-gray-900 mb-2">Informasi Transaksi</h4>
                  <div className="space-y-2 text-sm">
                    <p><span className="font-medium">Produk:</span> {selectedTransaksi.produk?.judulProduk}</p>
                    <p><span className="font-medium">Game:</span> {selectedTransaksi.produk?.namaGame}</p>
                    <p><span className="font-medium">Harga:</span> Rp {selectedTransaksi.produk?.harga?.toLocaleString()}</p>
                    <p><span className="font-medium">Status:</span> {selectedTransaksi.status}</p>
                  </div>
                </div>
                {/* Informasi Penjual */}
                <div className="bg-green-50 rounded-lg p-4">
                  <h4 className="font-medium text-gray-900 mb-2">Penerima Pembayaran (Penjual)</h4>
                  <div className="space-y-2 text-sm">
                    <p><span className="font-medium">Nama:</span> {selectedTransaksi.penjual?.nama}</p>
                    <p><span className="font-medium">Email:</span> {selectedTransaksi.penjual?.email}</p>
                    <p><span className="font-medium">Wallet:</span> 
                      {selectedTransaksi.penjual?.walletAddress ? (
                        <span className="text-xs ml-1 font-mono bg-gray-100 px-2 py-1 rounded">
                          {selectedTransaksi.penjual.walletAddress}
                        </span>
                      ) : (
                        <span className="text-red-600 ml-1">Tidak ada wallet address</span>
                      )}
                    </p>
                    {!selectedTransaksi.penjual?.walletAddress && (
                      <div className="bg-red-100 p-2 rounded mt-2">
                        <p className="text-red-800 text-xs">
                        <span className="font-medium">MASALAH:</span> Penjual belum menghubungkan wallet address.
                        Pembayaran tidak dapat diproses tanpa wallet address penjual.
                        </p>
                      </div>
                    )}
                  </div>
                </div>
                {/* Informasi Escrow */}
                <div className="bg-blue-50 rounded-lg p-4">
                  <h4 className="font-medium text-gray-900 mb-2">Informasi Escrow & Pembayaran</h4>
                  <div className="space-y-2 text-sm">
                    {selectedTransaksi.escrowId ? (
                      <>
                        <p><span className="font-medium">Escrow ID:</span> {selectedTransaksi.escrowId}</p>
                        {selectedTransaksi.escrowAmount && (
                          <p><span className="font-medium">Jumlah Dana:</span> {parseFloat(selectedTransaksi.escrowAmount).toFixed(4)} ETH</p>
                        )}
                        {selectedTransaksi.smartContractTxHash && (
                          <p>
                            <span className="font-medium">TX Hash Deposit:</span> 
                            <a 
                              href={`https://sepolia.etherscan.io/tx/${selectedTransaksi.smartContractTxHash}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-blue-600 hover:text-blue-800 ml-1 break-all text-xs"
                            >
                              {selectedTransaksi.smartContractTxHash.substring(0, 20)}...
                            </a>
                          </p>
                        )}
                        <div className="bg-green-100 p-2 rounded mt-2">
                          <p className="text-green-800 text-xs">
                            <strong>Dana Siap Dibayar:</strong> Dana {parseFloat(selectedTransaksi.escrowAmount || 0).toFixed(4)} ETH sudah terkunci di smart contract dan siap untuk dibayarkan ke penjual.
                          </p>
                        </div>
                      </>
                    ) : (
                      <div className="bg-red-100 p-3 rounded">
                        <p className="text-red-800 text-sm">
                          <span className="font-medium">PERINGATAN:</span>
                        </p>
                        <p className="text-red-700 text-xs mt-1">
                          Transaksi ini tidak memiliki Escrow ID. Dana tidak dikelola oleh smart contract dan tidak dapat dibayar secara otomatis.
                        </p>
                      </div>
                    )}
                  </div>
                </div>
                {/* Status Transaksi */}
                {selectedTransaksi.status === 'DIKONFIRMASI_PEMBELI' ? (
                  <div className="bg-yellow-50 rounded-lg p-4">
                    <h4 className="font-medium text-gray-900 mb-2">Status Konfirmasi</h4>
                    <div className="space-y-2 text-sm">
                      <p><span className="font-medium">Pembeli:</span> {selectedTransaksi.pembeli?.nama}</p>
                      <p className="text-green-700">
                        <span className="font-medium">Konfirmasi:</span> Pembeli telah mengkonfirmasi penerimaan akun
                      </p>
                      <p className="text-blue-700">
                        <span className="font-medium">Menunggu:</span> Admin melepas dana ke penjual
                      </p>
                    </div>
                  </div>
                ) : selectedTransaksi.status === 'SENGKETA' ? (
                  <div className="bg-red-50 rounded-lg p-4">
                    <h4 className="font-medium text-gray-900 mb-2">Status Sengketa</h4>
                    <div className="space-y-2 text-sm">
                      <p><span className="font-medium">Pembeli:</span> {selectedTransaksi.pembeli?.nama}</p>
                      <p><span className="font-medium">Penjual:</span> {selectedTransaksi.penjual?.nama}</p>
                      <p className="text-red-700">
                        <span className="font-medium">Status:</span> Transaksi dalam sengketa
                      </p>
                      <p className="text-orange-700">
                        <span className="font-medium">Menunggu:</span> Admin menyelesaikan sengketa
                      </p>
                      <div className="bg-red-100 p-2 rounded mt-2">
                        <p className="text-red-800 text-xs">
                          <span className="font-medium">Tindakan:</span> Pilih pihak yang menang untuk menyelesaikan sengketa dan melepas dana.
                        </p>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="bg-gray-50 rounded-lg p-4">
                    <h4 className="font-medium text-gray-900 mb-2">Status Transaksi</h4>
                    <div className="space-y-2 text-sm">
                      <p><span className="font-medium">Pembeli:</span> {selectedTransaksi.pembeli?.nama}</p>
                      <p><span className="font-medium">Penjual:</span> {selectedTransaksi.penjual?.nama}</p>
                      <p><span className="font-medium">Status:</span> {selectedTransaksi.status}</p>
                    </div>
                  </div>
                )}
              </div>
              {/* Action Button */}
              {selectedTransaksi.status === 'DIKONFIRMASI_PEMBELI' && selectedTransaksi.escrowId && (
                <div className="mt-6 pt-6 border-t border-gray-200">
                  <h4 className="font-medium text-gray-900 mb-4">Konfirmasi Pembayaran</h4>
                  {selectedTransaksi.penjual?.walletAddress ? (
                    <>
                      <button
                        onClick={handlePayment}
                        disabled={paymentLoading}
                        className="w-full bg-green-600 text-white py-3 px-4 rounded-lg hover:bg-green-700 disabled:opacity-50 font-medium"
                      >
                        {paymentLoading ? 'Memproses Pembayaran...' : `Bayar ${parseFloat(selectedTransaksi.escrowAmount || 0).toFixed(4)} ETH ke Penjual`}
                      </button>
                      <p className="text-sm text-gray-500 mt-2 text-center">
                        Dana akan dikirim dari smart contract ke wallet penjual menggunakan sistem baru
                      </p>
                    </>
                  ) : (
                    <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                      <h5 className="font-medium text-red-800 mb-2">Pembayaran Tidak Dapat Diproses</h5>
                      <p className="text-red-700 text-sm mb-3">
                        Penjual belum menghubungkan wallet address ke akun mereka. 
                        Pembayaran tidak dapat dilakukan tanpa alamat wallet penjual.
                      </p>
                      <p className="text-red-600 text-xs">
                        <span className="font-medium">Solusi:</span> Minta penjual untuk login dan menghubungkan wallet address di halaman profil mereka.
                      </p>
                    </div>
                  )}
                </div>
              )}
              {/* Dispute Resolution Actions */}
              {selectedTransaksi.status === 'SENGKETA' && selectedTransaksi.escrowId && (
                <div className="mt-6 pt-6 border-t border-gray-200">
                  <h4 className="font-medium text-gray-900 mb-4">Penyelesaian Sengketa</h4>
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
                    <h5 className="font-medium text-yellow-800 mb-2">Perhatian</h5>
                    <p className="text-yellow-700 text-sm">
                      Anda akan menyelesaikan sengketa ini dengan memilih pihak yang menang. 
                      Dana akan dikirim ke pihak yang dipilih dan sengketa akan ditutup secara permanen.
                    </p>
                  </div>
                  {/* Check wallet addresses */}
                  {(!selectedTransaksi.penjual?.walletAddress || !selectedTransaksi.pembeli?.walletAddress) ? (
                    <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                      <h5 className="font-medium text-red-800 mb-2">Tidak Dapat Menyelesaikan Sengketa</h5>
                      <div className="text-red-700 text-sm space-y-1">
                        {!selectedTransaksi.penjual?.walletAddress && (
                          <p>- Penjual belum menghubungkan wallet address</p>
                        )}
                        {!selectedTransaksi.pembeli?.walletAddress && (
                          <p>- Pembeli belum menghubungkan wallet address</p>
                        )}
                      </div>
                      <p className="text-red-600 text-xs mt-2">
                        <span className="font-medium">Solusi:</span> Minta kedua pihak untuk menghubungkan wallet address di profil mereka.
                      </p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Bayar ke Penjual */}
                      <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                        <h5 className="font-medium text-green-800 mb-2">Menangkan Penjual</h5>
                        <p className="text-green-700 text-sm mb-3">
                          Dana {parseFloat(selectedTransaksi.escrowAmount || 0).toFixed(4)} ETH akan dikirim ke penjual: {selectedTransaksi.penjual?.nama}
                        </p>
                        <button
                          onClick={() => handleDisputePayment('seller')}
                          disabled={paymentLoading}
                          className="w-full bg-green-600 text-white py-2 px-4 rounded-lg hover:bg-green-700 disabled:opacity-50 font-medium text-sm"
                        >
                          {paymentLoading ? 'Memproses...' : 'Bayar ke Penjual'}
                        </button>
                      </div>
                      {/* Refund ke Pembeli */}
                      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                        <h5 className="font-medium text-blue-800 mb-2">Menangkan Pembeli</h5>
                        <p className="text-blue-700 text-sm mb-3">
                          Dana {parseFloat(selectedTransaksi.escrowAmount || 0).toFixed(4)} ETH akan dikembalikan ke pembeli: {selectedTransaksi.pembeli?.nama}
                        </p>
                        <button
                          onClick={() => handleDisputePayment('buyer')}
                          disabled={paymentLoading}
                          className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 disabled:opacity-50 font-medium text-sm"
                        >
                          {paymentLoading ? 'Memproses...' : 'Refund ke Pembeli'}
                        </button>
                      </div>
                    </div>
                  )}
                  <p className="text-sm text-gray-500 mt-4 text-center">
                    Penyelesaian sengketa menggunakan smart contract dan tidak dapat dibatalkan
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Modal Detail Sengketa */}
      <ModalDetailSengketaAdmin
        isOpen={showDisputeModal}
        onClose={() => {
          setShowDisputeModal(false);
          setSelectedTransaksi(null);
        }}
        transaksi={selectedTransaksi}
        onResolve={handleDisputeResolve}
      />
    </div>
  );
};

export default PembayaranAdmin;