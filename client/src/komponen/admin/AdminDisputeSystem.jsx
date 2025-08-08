import React, { useState, useEffect } from 'react';
import axios from 'axios';
const AdminDisputeSystem = () => {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [dashboardData, setDashboardData] = useState(null);
  const [disputes, setDisputes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [pagination, setPagination] = useState({});
  const [filters, setFilters] = useState({
    status: '',
    page: 1,
    limit: 10
  });
  // Get auth token
  const getAuthToken = () => {
    return localStorage.getItem('token');
  };
  // API headers
  const getHeaders = () => ({
    'Authorization': `Bearer ${getAuthToken()}`,
    'Content-Type': 'application/json'
  });
  // Load dashboard data
  const loadDashboardData = async () => {
    try {
      setLoading(true);
      const response = await axios.get('/api/admin-dispute/dashboard', {
        headers: getHeaders()
      });
      if (response.data.success) {
        setDashboardData(response.data.data);
      }
    } catch (error) {
      console.error('Error loading dashboard:', error);
      setError('Gagal memuat data dashboard');
    } finally {
      setLoading(false);
    }
  };
  // Load disputes
  const loadDisputes = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (filters.status) params.append('status', filters.status);
      params.append('page', filters.page);
      params.append('limit', filters.limit);
      const response = await axios.get(`/api/admin-dispute/disputes?${params}`, {
        headers: getHeaders()
      });
      if (response.data.success) {
        setDisputes(response.data.data);
        setPagination(response.data.pagination);
      }
    } catch (error) {
      console.error('Error loading disputes:', error);
      setError('Gagal memuat data sengketa');
    } finally {
      setLoading(false);
    }
  };
  // Load data on component mount and tab change
  useEffect(() => {
    if (activeTab === 'dashboard') {
      loadDashboardData();
    } else if (activeTab === 'disputes') {
      loadDisputes();
    }
  }, [activeTab, filters]);
  // Dashboard Component
  const DashboardTab = () => (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-3xl font-bold text-gray-800 mb-2">🚨 Admin Dispute System Dashboard</h2>
        <p className="text-gray-600">Sistem manual untuk menangani sengketa yang tidak bisa diselesaikan smart contract</p>
      </div>
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="text-lg text-gray-600">Memuat data dashboard...</div>
        </div>
      ) : dashboardData ? (
        <>
          {/* Statistics Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="bg-white rounded-lg shadow-md p-6 border-l-4 border-blue-500">
              <div className="flex items-center">
                <div className="text-3xl mr-4">📊</div>
                <div>
                  <h3 className="text-2xl font-bold text-gray-800">{dashboardData.stats.total}</h3>
                  <p className="text-gray-600">Total Sengketa Admin</p>
                </div>
              </div>
            </div>
            <div className="bg-white rounded-lg shadow-md p-6 border-l-4 border-yellow-500">
              <div className="flex items-center">
                <div className="text-3xl mr-4">🔄</div>
                <div>
                  <h3 className="text-2xl font-bold text-gray-800">{dashboardData.stats.processing}</h3>
                  <p className="text-gray-600">Sedang Diproses</p>
                </div>
              </div>
            </div>
            <div className="bg-white rounded-lg shadow-md p-6 border-l-4 border-green-500">
              <div className="flex items-center">
                <div className="text-3xl mr-4">✅</div>
                <div>
                  <h3 className="text-2xl font-bold text-gray-800">{dashboardData.stats.resolved}</h3>
                  <p className="text-gray-600">Sudah Diselesaikan</p>
                </div>
              </div>
            </div>
            <div className="bg-white rounded-lg shadow-md p-6 border-l-4 border-purple-500">
              <div className="flex items-center">
                <div className="text-3xl mr-4">📈</div>
                <div>
                  <h3 className="text-2xl font-bold text-gray-800">{dashboardData.stats.resolutionRate}%</h3>
                  <p className="text-gray-600">Tingkat Penyelesaian</p>
                </div>
              </div>
            </div>
          </div>
          {/* Win Rate */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h3 className="text-xl font-semibold text-gray-800 mb-4">📊 Statistik Pemenang Sengketa</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
                <div className="flex items-center">
                  <div className="text-2xl mr-3">👤</div>
                  <div>
                    <h4 className="text-xl font-bold text-blue-800">{dashboardData.stats.buyerWins}</h4>
                    <p className="text-blue-600">Pembeli Menang</p>
                  </div>
                </div>
              </div>
              <div className="bg-orange-50 rounded-lg p-4 border border-orange-200">
                <div className="flex items-center">
                  <div className="text-2xl mr-3">🏪</div>
                  <div>
                    <h4 className="text-xl font-bold text-orange-800">{dashboardData.stats.sellerWins}</h4>
                    <p className="text-orange-600">Penjual Menang</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
          {/* Recent Disputes */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h3 className="text-xl font-semibold text-gray-800 mb-4">📋 Sengketa Terbaru</h3>
            {dashboardData.recentDisputes.length > 0 ? (
              <div className="space-y-4">
                {dashboardData.recentDisputes.map(dispute => (
                  <div key={dispute.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border hover:bg-gray-100 transition-colors">
                    <div className="flex-1">
                      <h4 className="font-semibold text-gray-800">{dispute.transaksi.kodeTransaksi}</h4>
                      <p className="text-gray-600 text-sm">{dispute.transaksi.produk.judulProduk}</p>
                      <span className={`inline-block px-2 py-1 rounded-full text-xs font-medium mt-2 ${
                        dispute.status.toLowerCase() === 'diproses' ? 'bg-yellow-100 text-yellow-800' :
                        dispute.status.toLowerCase() === 'dimenangkan_pembeli' ? 'bg-blue-100 text-blue-800' :
                        dispute.status.toLowerCase() === 'dimenangkan_penjual' ? 'bg-orange-100 text-orange-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {dispute.status}
                      </span>
                    </div>
                    <div className="text-sm text-gray-500">
                      {new Date(dispute.dibuatPada).toLocaleDateString('id-ID')}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 text-center py-8">Tidak ada sengketa terbaru</p>
            )}
          </div>
        </>
      ) : (
        <div className="text-center py-12">
          <div className="text-gray-500">Tidak ada data dashboard</div>
        </div>
      )}
    </div>
  );
  // Disputes List Component
  const DisputesTab = () => (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <h2 className="text-2xl font-bold text-gray-800">📋 Daftar Sengketa Admin</h2>
          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-3">
            <select 
              value={filters.status} 
              onChange={(e) => setFilters({...filters, status: e.target.value, page: 1})}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">Semua Status</option>
              <option value="DIPROSES">Sedang Diproses</option>
              <option value="DIMENANGKAN_PEMBELI">Pembeli Menang</option>
              <option value="DIMENANGKAN_PENJUAL">Penjual Menang</option>
            </select>
            <button 
              className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors font-medium"
              onClick={() => setActiveTab('create')}
            >
              ➕ Buat Sengketa Baru
            </button>
          </div>
        </div>
      </div>
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="text-lg text-gray-600">Memuat data sengketa...</div>
        </div>
      ) : (
        <>
          {disputes.length > 0 ? (
            <>
              <div className="bg-white rounded-lg shadow-md overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Kode Transaksi</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Produk</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Pembeli</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Penjual</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tanggal</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Aksi</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {disputes.map(dispute => (
                        <tr key={dispute.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                            {dispute.transaksi.kodeTransaksi}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div>
                              <div className="text-sm font-medium text-gray-900">{dispute.transaksi.produk.judulProduk}</div>
                              <div className="text-sm text-gray-500">{dispute.transaksi.produk.namaGame}</div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {dispute.transaksi.user_transaksi_pembeliIdTouser.profile?.nama || 'N/A'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {dispute.transaksi.user_transaksi_penjualIdTouser.profile?.nama || 'N/A'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                              dispute.status.toLowerCase() === 'diproses' ? 'bg-yellow-100 text-yellow-800' :
                              dispute.status.toLowerCase() === 'dimenangkan_pembeli' ? 'bg-blue-100 text-blue-800' :
                              dispute.status.toLowerCase() === 'dimenangkan_penjual' ? 'bg-orange-100 text-orange-800' :
                              'bg-gray-100 text-gray-800'
                            }`}>
                              {dispute.status}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {new Date(dispute.dibuatPada).toLocaleDateString('id-ID')}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                            <button 
                              className="text-blue-600 hover:text-blue-900 px-3 py-1 rounded bg-blue-50 hover:bg-blue-100 transition-colors"
                              onClick={() => viewDisputeDetail(dispute.id)}
                            >
                              👁️ Lihat
                            </button>
                            {dispute.status === 'DIPROSES' && (
                              <button 
                                className="text-green-600 hover:text-green-900 px-3 py-1 rounded bg-green-50 hover:bg-green-100 transition-colors"
                                onClick={() => resolveDispute(dispute.id)}
                              >
                                ⚖️ Selesaikan
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
              {/* Pagination */}
              {pagination.totalPages > 1 && (
                <div className="bg-white rounded-lg shadow-md p-4">
                  <div className="flex items-center justify-between">
                    <button 
                      disabled={pagination.currentPage === 1}
                      onClick={() => setFilters({...filters, page: pagination.currentPage - 1})}
                      className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                        pagination.currentPage === 1 
                          ? 'bg-gray-100 text-gray-400 cursor-not-allowed' 
                          : 'bg-blue-500 text-white hover:bg-blue-600'
                      }`}
                    >
                      ← Sebelumnya
                    </button>
                    <span className="text-sm text-gray-700">
                      Halaman {pagination.currentPage} dari {pagination.totalPages}
                    </span>
                    <button 
                      disabled={pagination.currentPage === pagination.totalPages}
                      onClick={() => setFilters({...filters, page: pagination.currentPage + 1})}
                      className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                        pagination.currentPage === pagination.totalPages 
                          ? 'bg-gray-100 text-gray-400 cursor-not-allowed' 
                          : 'bg-blue-500 text-white hover:bg-blue-600'
                      }`}
                    >
                      Selanjutnya →
                    </button>
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="bg-white rounded-lg shadow-md p-8 text-center">
              <p className="text-gray-500 mb-4">Tidak ada sengketa ditemukan</p>
              <button 
                className="px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors font-medium"
                onClick={() => setActiveTab('create')}
              >
                ➕ Buat Sengketa Pertama
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
  // Placeholder functions
  const viewDisputeDetail = (disputeId) => {
  };
  const resolveDispute = (disputeId) => {
  };
  return (
    <div className="min-h-screen bg-gray-100">
      {error && (
        <div className="mx-6 mt-6">
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded flex items-center justify-between">
            <span>❌ {error}</span>
            <button 
              onClick={() => setError(null)}
              className="text-red-700 hover:text-red-900 font-bold ml-4"
            >
              ✕
            </button>
          </div>
        </div>
      )}
      {/* Navigation Tabs */}
      <div className="bg-white shadow-sm border-b">
        <div className="flex space-x-1 p-4">
          <button 
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              activeTab === 'dashboard' 
                ? 'bg-blue-500 text-white shadow-md' 
                : 'text-gray-600 hover:text-gray-800 hover:bg-gray-100'
            }`}
            onClick={() => setActiveTab('dashboard')}
          >
            📊 Dashboard
          </button>
          <button 
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              activeTab === 'disputes' 
                ? 'bg-blue-500 text-white shadow-md' 
                : 'text-gray-600 hover:text-gray-800 hover:bg-gray-100'
            }`}
            onClick={() => setActiveTab('disputes')}
          >
            📋 Daftar Sengketa
          </button>
          <button 
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              activeTab === 'create' 
                ? 'bg-blue-500 text-white shadow-md' 
                : 'text-gray-600 hover:text-gray-800 hover:bg-gray-100'
            }`}
            onClick={() => setActiveTab('create')}
          >
            ➕ Buat Sengketa
          </button>
          <button 
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              activeTab === 'analytics' 
                ? 'bg-blue-500 text-white shadow-md' 
                : 'text-gray-600 hover:text-gray-800 hover:bg-gray-100'
            }`}
            onClick={() => setActiveTab('analytics')}
          >
            📈 Analytics
          </button>
        </div>
      </div>
      {/* Tab Content */}
      <div className="p-6">
        {activeTab === 'dashboard' && <DashboardTab />}
        {activeTab === 'disputes' && <DisputesTab />}
        {activeTab === 'create' && (
          <div className="bg-white rounded-lg shadow-md p-8 text-center">
            <h2 className="text-2xl font-bold text-gray-800 mb-4">➕ Buat Sengketa Admin Baru</h2>
            <p className="text-gray-600">Fitur ini akan segera tersedia...</p>
          </div>
        )}
        {activeTab === 'analytics' && (
          <div className="bg-white rounded-lg shadow-md p-8 text-center">
            <h2 className="text-2xl font-bold text-gray-800 mb-4">📈 Analytics Sengketa</h2>
            <p className="text-gray-600">Fitur analytics akan segera tersedia...</p>
          </div>
        )}
      </div>
    </div>
  );
};
export default AdminDisputeSystem;
