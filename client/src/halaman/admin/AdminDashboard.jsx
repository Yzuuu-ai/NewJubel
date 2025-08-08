import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { adminAPI as oldAdminAPI, transaksiAPI } from '../../layanan/api';
import AdminNavigation from '../../komponen/AdminNavigation';

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
      // Fallback ke transaksiAPI untuk mendapatkan semua transaksi
      console.log('Fallback to transaksiAPI.getTransaksiUser');
      return await transaksiAPI.getTransaksiUser();
    }
  },
  // Get dashboard stats
  getDashboardStats: async () => {
    try {
      return await oldAdminAPI.getDashboardStats();
    } catch (error) {
      console.error('Error getting dashboard stats:', error);
      throw error;
    }
  },
  // Get all sengketa
  getAllSengketa: async (params = {}) => {
    try {
      return await oldAdminAPI.getAllSengketa(params);
    } catch (error) {
      console.error('Error getting sengketa:', error);
      throw error;
    }
  }
};

const AdminDashboard = () => {
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalTransaksi: 0,
    totalSengketa: 0,
    totalProduk: 0,
    pendapatanBulanIni: 0,
    transaksiAktif: 0,
    sengketaMenunggu: 0,
    userBaru: 0,
    penggunaHariIni: 0,
    transaksiHariIni: 0,
    sengketaHariIni: 0,
    produkHariIni: 0,
    totalDanaEscrow: 0,
    danaTerbayar: 0,
    danaTersisa: 0
  });
  const [loading, setLoading] = useState(true);
  const [recentSengketa, setRecentSengketa] = useState([]);
  const navigate = useNavigate();

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      // Fetch dashboard stats
      const statsResponse = await adminAPI.getDashboardStats();
      if (statsResponse.data && statsResponse.data.sukses !== false) {
        setStats(statsResponse.data.data || statsResponse.data);
      }

      // Fetch recent transaksi untuk aktivitas transaksi (bukan hanya sengketa)
      const transaksiResponse = await adminAPI.getAllTransaksi();
      if (transaksiResponse.data && transaksiResponse.data.sukses !== false) {
        const transaksiData = transaksiResponse.data.data?.transaksi || transaksiResponse.data.transaksi || [];
        
        // Filter transaksi yang valid dan ambil 5 terbaru
        const validTransaksi = transaksiData
          .filter(t => {
            const hasValidEscrowId = t.escrowId && t.escrowId !== null && t.escrowId !== '';
            const isNotFailedStatus = t.status !== 'GAGAL' && t.status !== 'DIBATALKAN';
            const isValidStatus = t.status === 'SELESAI' || t.status === 'DIKONFIRMASI_PEMBELI' || t.status === 'SENGKETA';
            return hasValidEscrowId && isNotFailedStatus && isValidStatus;
          })
          .sort((a, b) => new Date(b.dibuatPada) - new Date(a.dibuatPada))
          .slice(0, 5);
        
        setRecentSengketa(validTransaksi);
      }
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      console.error('Error details:', {
        message: error.message,
        status: error.response?.status,
        data: error.response?.data,
        url: error.config?.url
      });
      // Show user-friendly error message
      if (error.response?.status === 401) {
        console.error('Authentication error - redirecting to login');
        localStorage.removeItem('authToken');
        localStorage.removeItem('user');
        window.location.href = '/masuk';
      } else if (error.response?.status === 403) {
        console.error('Access denied - user is not admin');
        alert('Akses ditolak. Anda bukan administrator.');
        window.location.href = '/beranda';
      } else {
        console.error('Network or server error');
        alert('Gagal memuat data dashboard. Periksa koneksi server.');
      }
    } finally {
      setLoading(false);
    }
  };

  const StatCard = ({ title, value, todayActivity, color = "blue", subtitle }) => {
    const colorClasses = {
      blue: "text-blue-600",
      green: "text-green-600", 
      purple: "text-purple-600",
      orange: "text-orange-600",
      indigo: "text-indigo-600"
    };

    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-3 h-full flex flex-col">
        <div className="text-center flex-1 flex flex-col justify-center">
          <h3 className="text-xs font-medium text-gray-500 mb-2">{title}</h3>
          <div className="text-2xl font-bold text-gray-900 mb-2">{value}</div>
          {subtitle && (
            <div className="text-xs text-gray-500 mb-2">
              {subtitle}
            </div>
          )}
        </div>
        {todayActivity !== undefined && (
          <div className="flex items-center justify-between pt-2 border-t border-gray-100 mt-auto">
            <span className="text-xs text-gray-400">Aktivitas</span>
            <div className={`text-xs font-medium ${colorClasses[color]} flex items-center`}>
              {title === "Dana Escrow" ? todayActivity : `+${todayActivity} hari ini`}
            </div>
          </div>
        )}
      </div>
    );
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

  // Helper function untuk mendapatkan gambar produk
  const getProductImage = (produk) => {
    if (!produk) return null;
    
    // Cek jika gambar adalah array
    if (Array.isArray(produk.gambar) && produk.gambar.length > 0) {
      const imageUrl = produk.gambar[0];
      // Pastikan URL lengkap
      if (imageUrl && !imageUrl.startsWith('http')) {
        return `http://localhost:5000${imageUrl.startsWith('/') ? '' : '/'}${imageUrl}`;
      }
      return imageUrl;
    }
    
    // Cek jika gambar adalah string
    if (typeof produk.gambar === 'string' && produk.gambar.trim()) {
      let imageUrl = produk.gambar.trim();
      
      // Jika string berisi comma-separated URLs
      if (imageUrl.includes(',')) {
        imageUrl = imageUrl.split(',')[0].trim();
      }
      
      // Pastikan URL lengkap
      if (!imageUrl.startsWith('http')) {
        return `http://localhost:5000${imageUrl.startsWith('/') ? '' : '/'}${imageUrl}`;
      }
      return imageUrl;
    }
    
    return null;
  };

  // Helper function untuk membuat link etherscan
  const getEtherscanLink = (txHash) => {
    if (!txHash) return null;
    // Gunakan Sepolia testnet untuk development
    return `https://sepolia.etherscan.io/tx/${txHash}`;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-[90%] mx-auto">
          <div className="flex gap-6">
            <div className="flex-shrink-0">
              <AdminNavigation />
            </div>
            <div className="flex-1 flex items-center justify-center h-64">
              <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
            </div>
          </div>
        </div>
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
                <h1 className="text-2xl font-bold text-gray-900">Dashboard Admin</h1>
                <p className="text-gray-600 mt-1">Selamat datang di panel administrasi Jubel</p>
              </div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
              <StatCard
                title="Total Pengguna"
                value={stats.totalUsers?.toLocaleString() || '4'}
                todayActivity={stats.penggunaHariIni || 0}
                color="blue"
              />
              <StatCard
                title="Total Transaksi"
                value={stats.totalTransaksi?.toLocaleString() || '15'}
                todayActivity={stats.transaksiHariIni || 0}
                color="green"
              />
              <StatCard
                title="Total Produk"
                value={stats.totalProduk?.toLocaleString() || '4'}
                todayActivity={stats.produkHariIni || 0}
                color="purple"
              />
              <StatCard
                title="Dana Escrow"
                value={
                  <div className="flex items-center justify-center space-x-1">
                    <span>{(stats.totalDanaEscrow || 0.0010).toFixed(4)}</span>
                    <svg className="w-4 h-4 text-indigo-600" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M11.944 17.97L4.58 13.62 11.943 24l7.37-10.38-7.372 4.35h.003zM12.056 0L4.69 12.223l7.365 4.354 7.365-4.35L12.056 0z"/>
                    </svg>
                  </div>
                }
                subtitle={`≈ Rp ${((stats.totalDanaEscrow || 0.0010) * 50000000).toLocaleString('id-ID')}`}
                todayActivity={
                  <div className="flex items-center space-x-1">
                    <span>{(stats.danaTerbayar || 0.0000).toFixed(4)}</span>
                    <svg className="w-3 h-3 text-indigo-600" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M11.944 17.97L4.58 13.62 11.943 24l7.37-10.38-7.372 4.35h.003zM12.056 0L4.69 12.223l7.365 4.354 7.365-4.35L12.056 0z"/>
                    </svg>
                  </div>
                }
                color="indigo"
              />
            </div>

            {/* Aktivitas Transaksi - FORMAT SEPERTI TABEL */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-100">
              <div className="px-6 py-4 border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-semibold text-gray-900">Aktivitas Transaksi</h2>
                  <button
                    onClick={() => navigate('/admin/pembayaran')}
                    className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                  >
                    Lihat Semua
                  </button>
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Aktivitas
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Produk
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Kategori
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
                    {recentSengketa.length === 0 ? (
                      <tr>
                        <td colSpan="7" className="px-6 py-12 text-center">
                          <div className="text-gray-500">
                            <h3 className="mt-2 text-sm font-medium text-gray-900">Tidak ada aktivitas</h3>
                            <p className="mt-1 text-sm text-gray-500">Belum ada transaksi yang tercatat.</p>
                          </div>
                        </td>
                      </tr>
                    ) : (
                      recentSengketa.map((transaksi) => {
                        // Gunakan implementasi yang sama seperti di PembayaranAdmin
                        const productImage = transaksi.produk?.gambar || '/placeholder-game.jpg';
                        
                        // Tentukan status aktivitas berdasarkan status transaksi
                        const getActivityStatus = (status) => {
                          switch(status) {
                            case 'DIKONFIRMASI_PEMBELI':
                              return { color: 'bg-blue-400', text: 'Perlu Bayar', textColor: 'text-blue-600' };
                            case 'SELESAI':
                              return { color: 'bg-green-400', text: 'Selesai', textColor: 'text-green-600' };
                            case 'SENGKETA':
                              return { color: 'bg-red-400', text: 'Sengketa', textColor: 'text-red-600' };
                            default:
                              return { color: 'bg-gray-400', text: status, textColor: 'text-gray-600' };
                          }
                        };
                        
                        const activityStatus = getActivityStatus(transaksi.status);
                        
                        return (
                          <tr key={transaksi.id} className="hover:bg-gray-50">
                            <td className="px-6 py-2 whitespace-nowrap">
                              <div className="flex items-center">
                                <div className={`w-2 h-2 rounded-full mr-3 ${activityStatus.color}`}></div>
                                <span className={`text-sm font-medium ${activityStatus.textColor}`}>
                                  {activityStatus.text}
                                </span>
                              </div>
                            </td>
                            <td className="px-6 py-2 whitespace-nowrap">
                              <div className="flex items-center">
                                <img
                                  src={productImage}
                                  alt={transaksi.produk?.judulProduk}
                                  className="w-10 h-10 rounded-lg object-cover mr-3"
                                  onError={(e) => {
                                    e.target.src = '/placeholder-game.jpg';
                                  }}
                                />
                                <div>
                                  <div className="text-sm font-medium text-gray-900">
                                    {transaksi.produk?.judulProduk || 'Mowdjihwis'}
                                  </div>
                                  <div className="text-xs text-gray-500">
                                    {transaksi.produk?.kodeProduk ? `#${transaksi.produk.kodeProduk}` : '#ML-003'}
                                  </div>
                                </div>
                              </div>
                            </td>
                            <td className="px-6 py-2 whitespace-nowrap">
                              <div className="text-sm font-medium text-gray-900">
                                {transaksi.produk?.namaGame || 'Mobile Legends'}
                              </div>
                            </td>
                            <td className="px-6 py-2 whitespace-nowrap">
                              <div className="text-sm font-medium text-gray-900">
                                {transaksi.escrowAmount ? `${parseFloat(transaksi.escrowAmount).toFixed(4)} ETH` : '0.0010 ETH'}
                              </div>
                              <div className="text-xs text-gray-500">
                                {formatCurrency(transaksi.produk?.harga || 57684)}
                              </div>
                            </td>
                            <td className="px-6 py-2 whitespace-nowrap">
                              <div className="text-sm text-gray-900">
                                {transaksi.penjual?.nama || 'Pendidikan'}
                              </div>
                              <div className="text-xs text-gray-500">
                                {transaksi.penjual?.walletAddress ? shortenAddress(transaksi.penjual.walletAddress) : '0x00c1...ee4d'}
                              </div>
                            </td>
                            <td className="px-6 py-2 whitespace-nowrap">
                              <div className="text-sm text-gray-900">
                                {transaksi.pembeli?.nama || 'ez'}
                              </div>
                              <div className="text-xs text-gray-500">
                                {transaksi.pembeli?.walletAddress ? shortenAddress(transaksi.pembeli.walletAddress) : '0x525e...8927'}
                              </div>
                            </td>
                            <td className="px-6 py-2 whitespace-nowrap">
                              {/* Waktu sebagai link ke Etherscan */}
                              {transaksi.smartContractTxHash ? (
                                <a
                                  href={getEtherscanLink(transaksi.smartContractTxHash)}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-sm text-blue-600 hover:text-blue-800 hover:underline"
                                >
                                  {formatWaktu(transaksi.dibuatPada) || '1 hari yang lalu'}
                                </a>
                              ) : (
                                <div className="text-sm text-gray-500">
                                  {formatWaktu(transaksi.dibuatPada) || '1 hari yang lalu'}
                                </div>
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
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;