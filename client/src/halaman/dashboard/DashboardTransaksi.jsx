import React, { useState, useEffect } from 'react';
import { transaksiAPI, adminAPI } from '../../layanan/api';
import { useAuth } from '../../konteks/AuthContext';

const DashboardTransaksiSemua = () => {
  const { isAuthenticated, user } = useAuth();
  const [transaksi, setTransaksi] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (isAuthenticated) {
      fetchTransaksi();
    }
  }, [filter, currentPage, isAuthenticated, user]);

  const fetchTransaksi = async () => {
    try {
      setLoading(true);
      setError(null);
      const params = {
        page: currentPage,
        limit: 20,
        ...(filter !== 'all' && { status: filter })
      };
      
      let allTransaksi = [];
      
      // Check if user is admin - use admin API to get all transactions
      if (user?.role === 'ADMIN') {
        const response = await adminAPI.getAllTransaksi(params);
        if (response.data && response.data.sukses !== false) {
          allTransaksi = response.data.data?.transaksi || response.data.transaksi || [];
          setTotalPages(response.data.data?.pagination?.totalPages || response.data.totalPages || 1);
        }
      } else {
        // Regular user - get both purchase and sale transactions
        try {
          // Fetch purchase transactions (as buyer)
          const pembelianResponse = await transaksiAPI.getTransaksiSaya({
            role: 'pembeli',
            page: 1,
            limit: 100, // Get more to combine properly
            ...(filter !== 'all' && { status: filter })
          });
          
          // Fetch sale transactions (as seller)
          const penjualanResponse = await transaksiAPI.getTransaksiUser({
            role: 'penjual',
            page: 1,
            limit: 100, // Get more to combine properly
            ...(filter !== 'all' && { status: filter })
          });
          
          let pembelianData = [];
          let penjualanData = [];
          
          // Process purchase data
          if (pembelianResponse.data?.sukses) {
            pembelianData = pembelianResponse.data.data?.transaksi || pembelianResponse.data.data || [];
          } else if (Array.isArray(pembelianResponse.data)) {
            pembelianData = pembelianResponse.data;
          }
          
          // Process sale data
          if (penjualanResponse.data?.sukses) {
            penjualanData = penjualanResponse.data.data?.transaksi || penjualanResponse.data.data || [];
          } else if (Array.isArray(penjualanResponse.data)) {
            penjualanData = penjualanResponse.data;
          }
          
          // Combine and deduplicate transactions
          const combinedTransaksi = [...pembelianData, ...penjualanData];
          const uniqueTransaksi = combinedTransaksi.filter((transaction, index, self) =>
            index === self.findIndex(t => t.id === transaction.id)
          );
          
          // Sort by creation date (newest first)
          allTransaksi = uniqueTransaksi.sort((a, b) => new Date(b.dibuatPada) - new Date(a.dibuatPada));
          
          // Simple pagination for combined results
          const startIndex = (currentPage - 1) * 20;
          const endIndex = startIndex + 20;
          allTransaksi = allTransaksi.slice(startIndex, endIndex);
          
          // Calculate total pages
          const totalTransaksi = uniqueTransaksi.length;
          setTotalPages(Math.ceil(totalTransaksi / 20));
          
        } catch (fetchError) {
          console.error('Error fetching user transactions:', fetchError);
          throw fetchError;
        }
      }
      
      // Show ALL transactions including MENUNGGU_PEMBAYARAN for complete activity view
      // Only filter out GAGAL transactions as they are truly failed
      const filteredTransaksi = Array.isArray(allTransaksi) ? 
        allTransaksi.filter(t => t.status !== 'GAGAL') : 
        [];
      
      setTransaksi(filteredTransaksi);
    } catch (error) {
      console.error('Error fetching transaksi:', error);
      setError('Gagal memuat data transaksi. Silakan coba lagi.');
      setTransaksi([]);
    } finally {
      setLoading(false);
    }
  };

  const getAktivitasText = (status) => {
    const statusMap = {
      'MENUNGGU_PEMBAYARAN': 'Menunggu Pembayaran',
      'DIBAYAR_SMARTCONTRACT': 'Dibayar',
      'DIKIRIM': 'Dikirim',
      'SELESAI': 'Selesai',
      'DIKONFIRMASI_PEMBELI': 'Dikonfirmasi',
      'DIBATALKAN': 'Dibatalkan',
      'SENGKETA': 'Sengketa',
      'REFUND': 'Refund'
    };
    return statusMap[status] || status;
  };

  const getStatusColor = (status) => {
    const colorMap = {
      'MENUNGGU_PEMBAYARAN': 'text-yellow-600',
      'DIBAYAR_SMARTCONTRACT': 'text-blue-600',
      'DIKIRIM': 'text-purple-600',
      'SELESAI': 'text-green-600',
      'DIKONFIRMASI_PEMBELI': 'text-green-600',
      'DIBATALKAN': 'text-red-600',
      'SENGKETA': 'text-orange-600',
      'REFUND': 'text-gray-600'
    };
    return colorMap[status] || 'text-gray-600';
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0
    }).format(amount);
  };

  const formatWaktu = (tanggal) => {
    const now = new Date();
    const transaksiDate = new Date(tanggal);
    const diffInMinutes = Math.floor((now - transaksiDate) / (1000 * 60));
    
    if (diffInMinutes < 1) return 'Baru saja';
    if (diffInMinutes < 60) return `${diffInMinutes} menit yang lalu`;
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)} jam yang lalu`;
    if (diffInMinutes < 10080) return `${Math.floor(diffInMinutes / 1440)} hari yang lalu`;
    
    return transaksiDate.toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
  };

  const shortenAddress = (address) => {
    if (!address) return 'N/A';
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  const getEtherscanUrl = (txHash) => {
    // Menggunakan Sepolia testnet untuk development
    const baseUrl = 'https://sepolia.etherscan.io/tx/';
    return `${baseUrl}${txHash}`;
  };

  const getUserRole = (transaksi) => {
    if (user && transaksi.pembeliId === user.id) return 'pembeli';
    if (user && transaksi.penjualId === user.id) return 'penjual';
    return 'unknown';
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="flex items-center justify-center py-20">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Silakan Masuk Terlebih Dahulu</h2>
            <p className="text-gray-600 mb-6">Anda perlu masuk untuk melihat aktivitas transaksi.</p>
            <a
              href="/masuk"
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
            >
              Masuk Sekarang
            </a>
          </div>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="flex items-center justify-center py-20">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="flex items-center justify-center py-20">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Terjadi Kesalahan</h2>
            <p className="text-gray-600 mb-6">{error}</p>
            <button
              onClick={fetchTransaksi}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
            >
              Coba Lagi
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-[90%] mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header Card */}
        <div className="bg-white rounded-lg shadow-sm mb-6 border border-gray-100">
          <div className="px-6 py-4 border-b border-gray-100">
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center space-y-3 sm:space-y-0">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">
                  {user?.role === 'ADMIN' ? 'Aktivitas Transaksi Semua Pengguna' : 'Aktivitas Transaksi'}
                </h1>
                <p className="text-gray-600 mt-1">
                  {user?.role === 'ADMIN' 
                    ? 'Riwayat semua transaksi di platform' 
                    : 'Riwayat aktivitas transaksi Anda sebagai pembeli dan penjual'
                  }
                </p>
              </div>
              <div className="flex items-center space-x-3">
                <button
                  onClick={fetchTransaksi}
                  className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-lg text-gray-700 bg-white hover:bg-gray-50 transition-colors"
                >
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  Refresh
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Tabel Aktivitas */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Aktivitas
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Role
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Produk
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Harga
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Dari
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Ke
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Waktu
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {transaksi.length === 0 ? (
                  <tr>
                    <td colSpan="7" className="px-6 py-12 text-center">
                      <div className="text-gray-500">
                        <h3 className="mt-2 text-sm font-medium text-gray-900">Tidak ada aktivitas</h3>
                        <p className="mt-1 text-sm text-gray-500">Belum ada transaksi yang tercatat.</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  transaksi.map((item) => {
                    const userRole = getUserRole(item);
                    return (
                      <tr key={item.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <div className={`w-2 h-2 rounded-full mr-3 ${
                              item.status === 'SELESAI' ? 'bg-green-400' :
                              item.status === 'DIBAYAR_SMARTCONTRACT' ? 'bg-blue-400' :
                              item.status === 'DIKIRIM' ? 'bg-purple-400' :
                              item.status === 'SENGKETA' ? 'bg-orange-400' :
                              item.status === 'DIBATALKAN' ? 'bg-red-400' :
                              'bg-yellow-400'
                            }`}></div>
                            <span className={`text-sm font-medium ${getStatusColor(item.status)}`}>
                              {getAktivitasText(item.status)}
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {user?.role === 'ADMIN' ? (
                            <span className="text-sm text-gray-500">Admin View</span>
                          ) : (
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                              userRole === 'pembeli' 
                                ? 'bg-blue-100 text-blue-800' 
                                : userRole === 'penjual'
                                ? 'bg-green-100 text-green-800'
                                : 'bg-gray-100 text-gray-800'
                            }`}>
                              {userRole === 'pembeli' ? '👤 Pembeli' : 
                               userRole === 'penjual' ? '🏪 Penjual' : 
                               '❓ Unknown'}
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <img
                              src={item.produk?.gambar || '/placeholder-game.jpg'}
                              alt={item.produk?.judulProduk || 'Produk'}
                              className="w-10 h-10 rounded-lg object-cover mr-3"
                            />
                            <div>
                              <div className="text-sm font-medium text-gray-900">
                                {item.produk?.judulProduk || 'Produk tidak tersedia'}
                              </div>
                              <div className="text-sm text-gray-500">
                                {item.produk?.kodeProduk ? `#${item.produk.kodeProduk}` : 'Kode tidak tersedia'} • {item.produk?.namaGame || 'Game tidak tersedia'}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {item.escrowAmount && (
                            <div className="text-sm font-medium text-gray-900">
                              {parseFloat(item.escrowAmount).toFixed(4)} ETH
                            </div>
                          )}
                          <div className="text-sm text-gray-500">
                            {formatCurrency(item.produk?.harga || 0)}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">
                            {item.penjual?.nama || item.penjual?.profil?.nama || 'Penjual'}
                          </div>
                          <div className="text-xs text-gray-500">
                            {shortenAddress(item.penjual?.walletAddress)}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">
                            {item.pembeli?.nama || item.pembeli?.profil?.nama || 'Pembeli'}
                          </div>
                          <div className="text-xs text-gray-500">
                            {shortenAddress(item.pembeli?.walletAddress)}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {item.smartContractTxHash ? (
                            <a
                              href={getEtherscanUrl(item.smartContractTxHash)}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-blue-600 hover:text-blue-800 hover:underline cursor-pointer"
                              title="Lihat di Etherscan"
                            >
                              {formatWaktu(item.dibuatPada)}
                            </a>
                          ) : (
                            formatWaktu(item.dibuatPada)
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="mt-6 flex items-center justify-between">
            <div className="flex items-center">
              <p className="text-sm text-gray-700">
                Halaman {currentPage} dari {totalPages}
              </p>
            </div>
            <div className="flex items-center space-x-2">
              <button
                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                disabled={currentPage === 1}
                className="px-3 py-2 text-sm font-medium text-gray-500 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Sebelumnya
              </button>
              <button
                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                disabled={currentPage === totalPages}
                className="px-3 py-2 text-sm font-medium text-gray-500 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Selanjutnya
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default DashboardTransaksiSemua;
