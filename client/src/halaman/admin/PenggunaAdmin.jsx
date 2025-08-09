import React, { useState, useEffect, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { adminAPI } from '../../layanan/api';
import AdminNavigation from '../../komponen/AdminNavigation';
import { 
  UserIcon, 
  ExclamationTriangleIcon, 
  TrashIcon,
  MagnifyingGlassIcon,
  XMarkIcon
} from '@heroicons/react/24/outline';

const PenggunaAdmin = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedUser, setSelectedUser] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [deleteConfirmed, setDeleteConfirmed] = useState(false);
  const [updateLoading, setUpdateLoading] = useState(false);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');
  const [sortOrder, setSortOrder] = useState('pembeli-first'); // pembeli-first, penjual-first
  
  const [pagination, setPagination] = useState({
    currentPage: 1,
    totalPages: 1,
    totalItems: 0,
    itemsPerPage: 10
  });

  // Read URL parameters for search
  useEffect(() => {
    const searchParams = new URLSearchParams(location.search);
    const searchParam = searchParams.get('search');
    const pageParam = searchParams.get('page');
    
    if (searchParam) {
      setSearchTerm(searchParam);
      setDebouncedSearchTerm(searchParam);
    }
    
    if (pageParam) {
      setPagination(prev => ({ ...prev, currentPage: parseInt(pageParam) || 1 }));
    }
  }, [location.search]);

  // Debounce search term
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
    }, 500);

    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Reset to page 1 when search term changes
  useEffect(() => {
    setPagination(prev => ({ ...prev, currentPage: 1 }));
  }, [debouncedSearchTerm]);

  // Load data when search or pagination change
  useEffect(() => {
    fetchUsers();
  }, [pagination.currentPage, debouncedSearchTerm]);

  const fetchUsers = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const params = {
        page: pagination.currentPage,
        limit: pagination.itemsPerPage,
        ...(debouncedSearchTerm && { search: debouncedSearchTerm }),
        _t: Date.now() // Cache buster
      };
      
      console.log('Fetching users with params:', params);
      
      const response = await adminAPI.getAllUsers(params);
      
      console.log('API Response:', response.data);
      
      // Check if response is successful
      if (response.data && response.data.sukses === true) {
        const userData = response.data.data?.users || response.data.users || [];
        const paginationData = response.data.data?.pagination || response.data.pagination || {};
        
        console.log('User data received:', userData);
        console.log('Pagination data:', paginationData);
        
        // HAPUS ADMIN - Filter hanya PEMBELI dan PENJUAL
        const filteredUsers = userData.filter(user => 
          user.role !== 'ADMIN' && (user.role === 'PEMBELI' || user.role === 'PENJUAL')
        );
        
        console.log('Filtered users:', filteredUsers);
        
        setUsers(filteredUsers);
        setPagination(prev => ({
          ...prev,
          totalPages: paginationData.totalPages || 1,
          totalItems: paginationData.totalItems || filteredUsers.length
        }));
        
        // Clear any previous errors if data loaded successfully
        setError(null);
      } else {
        console.error('API returned sukses !== true:', response.data);
        throw new Error(response.data?.pesan || 'Gagal memuat data pengguna');
      }
    } catch (error) {
      console.error('Error fetching users:', error);
      console.error('Error details:', {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status
      });
      
      // Only set error if we don't have any users loaded
      if (users.length === 0) {
        setError('Gagal memuat data pengguna. Silakan coba lagi.');
        console.error('Gagal memuat data pengguna');
      } else {
        // If we have users but got an error (maybe network issue), just log it
        console.warn('Error occurred but users are already loaded, not showing error message');
        console.error('Terjadi kesalahan saat memperbarui data');
      }
    } finally {
      setLoading(false);
    }
  }, [pagination.currentPage, pagination.itemsPerPage, debouncedSearchTerm, users.length]);

  const handleSearchChange = (value) => {
    setSearchTerm(value);
    // Don't update URL immediately, let debounce handle it
  };

  // Update URL when debounced search term changes
  useEffect(() => {
    const searchParams = new URLSearchParams(location.search);
    if (debouncedSearchTerm) {
      searchParams.set('search', debouncedSearchTerm);
    } else {
      searchParams.delete('search');
    }
    searchParams.delete('page'); // Reset page when searching
    
    const newURL = searchParams.toString() 
      ? `${location.pathname}?${searchParams.toString()}`
      : location.pathname;
      
    navigate(newURL, { replace: true });
  }, [debouncedSearchTerm, location.pathname, navigate]);

  const handlePaginationChange = (pageNum) => {
    setPagination(prev => ({ ...prev, currentPage: pageNum }));
    
    // Update URL parameters
    const searchParams = new URLSearchParams(location.search);
    if (pageNum > 1) {
      searchParams.set('page', pageNum);
    } else {
      searchParams.delete('page');
    }
    
    const newURL = searchParams.toString() 
      ? `${location.pathname}?${searchParams.toString()}`
      : location.pathname;
      
    navigate(newURL, { replace: true });
  };

  const handleRoleHeaderClick = () => {
    console.log('Current sortOrder:', sortOrder); // Debug log
    
    let newOrder;
    if (sortOrder === 'pembeli-first') {
      newOrder = 'penjual-first';
    } else {
      newOrder = 'pembeli-first';
    }
    
    console.log('New sortOrder:', newOrder); // Debug log
    setSortOrder(newOrder);
  };

  // Fungsi untuk mengurutkan users berdasarkan sortOrder
  const getSortedUsers = () => {
    console.log('getSortedUsers called with sortOrder:', sortOrder); // Debug log
    
    const roleOrder = {
      'pembeli-first': ['PEMBELI', 'PENJUAL'],
      'penjual-first': ['PENJUAL', 'PEMBELI']
    };
    
    const order = roleOrder[sortOrder];
    if (!order) return users;
    
    const sorted = [...users].sort((a, b) => {
      const aIndex = order.indexOf(a.role);
      const bIndex = order.indexOf(b.role);
      return aIndex - bIndex;
    });
    
    console.log('Sorted users:', sorted.map(u => u.role)); // Debug log
    return sorted;
  };

  const getRoleBadge = (role) => {
    const roleText = {
      'PEMBELI': 'Pembeli',
      'PENJUAL': 'Penjual'
    };
    
    // Role badge tanpa warna, hanya teks biasa
    return (
      <span className="text-xs font-medium text-gray-700">
        {roleText[role] || role}
      </span>
    );
  };

  const handleDetailClick = (user) => {
    setSelectedUser(user);
    setShowDetailModal(true);
  };


  const handleDeleteUser = async (userId) => {
    if (!deleteConfirmed) return;
    
    try {
      setUpdateLoading(true);
      const response = await adminAPI.deleteUser(userId);
      
      if (response.data && response.data.sukses !== false) {
        await fetchUsers();
        setShowDetailModal(false);
        setDeleteConfirmed(false);
        // Simple success message without toast
        console.log('User deleted successfully');
      } else {
        throw new Error(response.data?.pesan || 'Gagal menghapus user');
      }
    } catch (error) {
      console.error('Error deleting user:', error);
      const errorMessage = error.response?.data?.pesan || error.userMessage || error.message || 'Gagal menghapus user';
      
      // Show error in console instead of toast
      console.error('Delete error:', errorMessage);
      
      // Show detailed error if available
      if (error.response?.data?.data?.transaksiAktif) {
        const transaksiList = error.response.data.data.transaksiAktif.map(t => t.kodeTransaksi).join(', ');
        console.error(`Transaksi aktif: ${transaksiList}`);
      }
      if (error.response?.data?.data?.produkAktif) {
        const produkList = error.response.data.data.produkAktif.map(p => p.judulProduk).join(', ');
        console.error(`Produk aktif: ${produkList}`);
      }
    } finally {
      setUpdateLoading(false);
    }
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

  const sortedUsers = getSortedUsers();

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
            <div className="bg-white rounded-lg shadow-sm mb-3">
              <div className="px-6 py-3 border-b border-gray-300">
                <h1 className="text-2xl font-bold text-gray-900">Manajemen Pengguna</h1>
                <p className="text-gray-600 mt-1">Kelola akun pengguna di platform</p>
              </div>
            </div>

            
            {/* Error Message */}
            {error && (
              <div className="mb-6 bg-red-50 border border-red-200 rounded-md p-4">
                <div className="flex">
                  <ExclamationTriangleIcon className="h-5 w-5 text-red-400" />
                  <div className="ml-3">
                    <p className="text-sm text-red-800">{error}</p>
                    <button
                      onClick={fetchUsers}
                      className="mt-2 text-sm text-red-600 hover:text-red-500 underline"
                    >
                      Coba lagi
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Users Table with integrated search */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-100">
              <div className="px-6 py-4 border-b border-gray-200">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <h2 className="text-lg font-semibold text-gray-900">Daftar Pengguna</h2>
                  <div className="w-full sm:w-auto">
                    <input
                      type="text"
                      placeholder="Cari pengguna..."
                      value={searchTerm}
                      onChange={(e) => handleSearchChange(e.target.value)}
                      className="w-full sm:w-64 pl-4 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                    />
                  </div>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        No
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Pengguna
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Email
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Nomor
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Wallet
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        <button
                          onClick={handleRoleHeaderClick}
                          className="hover:text-blue-600 transition-colors cursor-pointer"
                          title="Klik untuk mengurutkan berdasarkan role"
                        >
                          Role
                        </button>
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Bergabung
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Aksi
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {sortedUsers.length === 0 ? (
                      <tr>
                        <td colSpan="8" className="px-6 py-12 text-center">
                          <div className="text-gray-500">
                            <UserIcon className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                            <h3 className="mt-2 text-sm font-medium text-gray-900">
                              {searchTerm ? 'Tidak ada hasil pencarian' : 'Tidak ada pengguna'}
                            </h3>
                            <p className="mt-1 text-sm text-gray-500">
                              {searchTerm 
                                ? `Tidak ditemukan pengguna dengan kata kunci "${searchTerm}"`
                                : 'Belum ada pengguna yang terdaftar.'
                              }
                            </p>
                          </div>
                        </td>
                      </tr>
                    ) : (
                      sortedUsers.map((user, index) => (
                        <tr key={user.id} className="hover:bg-gray-50">
                          <td className="px-6 py-2 whitespace-nowrap">
                            <div className="text-sm font-medium text-gray-900">
                              {(pagination.currentPage - 1) * pagination.itemsPerPage + index + 1}
                            </div>
                          </td>
                          <td className="px-6 py-2 whitespace-nowrap">
                            <div className="flex items-center">
                              <div className="w-10 h-10 bg-gray-300 rounded-full flex items-center justify-center mr-3">
                                <span className="text-sm font-medium text-gray-700">
                                  {user.nama?.charAt(0)?.toUpperCase() || user.email?.charAt(0)?.toUpperCase() || 'U'}
                                </span>
                              </div>
                              <div>
                                <div className="text-sm font-medium text-gray-900">
                                  {user.nama || '-'}
                                </div>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-2 whitespace-nowrap">
                            <div className="text-sm text-gray-900">{user.email}</div>
                          </td>
                          <td className="px-6 py-2 whitespace-nowrap">
                            <div className="text-sm text-gray-900">
                              {user.nomor_telepon && user.nomor_telepon !== 'Belum diisi' ? (
                                user.nomor_telepon
                              ) : (
                                <span className="text-gray-400">-</span>
                              )}
                            </div>
                          </td>
                          <td className="px-6 py-2 whitespace-nowrap">
                            <div className="text-sm text-gray-900">
                              {user.walletAddress ? (
                                <span className="font-mono">
                                  {user.walletAddress.slice(0, 6)}...{user.walletAddress.slice(-4)}
                                </span>
                              ) : (
                                <span className="text-gray-400">-</span>
                              )}
                            </div>
                          </td>
                          <td className="px-6 py-2 whitespace-nowrap">
                            {getRoleBadge(user.role)}
                          </td>
                          <td className="px-6 py-2 whitespace-nowrap">
                            <div className="text-sm text-gray-500">
                              {new Date(user.dibuatPada).toLocaleDateString('id-ID')}
                            </div>
                          </td>
                          <td className="px-6 py-2 whitespace-nowrap">
                            <button
                              onClick={() => handleDetailClick(user)}
                              className="inline-flex items-center px-3 py-1 border border-gray-300 shadow-sm text-xs leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
                            >
                              Detail
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {pagination.totalPages > 1 && (
                <div className="px-6 py-4 border-t border-gray-200">
                  <div className="flex items-center justify-between">
                    <div className="text-sm text-gray-700">
                      Halaman {pagination.currentPage} dari {pagination.totalPages}
                    </div>
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => handlePaginationChange(Math.max(1, pagination.currentPage - 1))}
                        disabled={pagination.currentPage === 1}
                        className="px-3 py-2 text-sm font-medium text-gray-500 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Sebelumnya
                      </button>
                      {/* Page numbers */}
                      <div className="flex items-center space-x-1">
                        {Array.from({ length: Math.min(5, pagination.totalPages) }, (_, i) => {
                          const pageNum = i + 1;
                          const isActive = pageNum === pagination.currentPage;
                          return (
                            <button
                              key={pageNum}
                              onClick={() => handlePaginationChange(pageNum)}
                              className={`px-3 py-2 text-sm font-medium rounded-md ${
                                isActive
                                  ? 'bg-primary-600 text-white'
                                  : 'text-gray-700 bg-white border border-gray-300 hover:bg-gray-50'
                              }`}
                            >
                              {pageNum}
                            </button>
                          );
                        })}
                      </div>
                      <button
                        onClick={() => handlePaginationChange(Math.min(pagination.totalPages, pagination.currentPage + 1))}
                        disabled={pagination.currentPage === pagination.totalPages}
                        className="px-3 py-2 text-sm font-medium text-gray-500 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Selanjutnya
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* User Detail Modal - Simplified */}
      {showDetailModal && selectedUser && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-lg w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-semibold text-gray-900">
                  Detail Pengguna - {selectedUser.nama || selectedUser.email}
                </h3>
                <button
                  onClick={() => setShowDetailModal(false)}
                  className="text-gray-400 hover:text-gray-600 text-2xl font-bold"
                >
                  ×
                </button>
              </div>
              
              <div className="space-y-6">
                {/* Activity Stats - Role-based display */}
                <div className="bg-gray-50 rounded-lg p-4">
                  <h4 className="font-medium text-gray-900 mb-4">Statistik Aktivitas</h4>
                  <div className="grid gap-4 text-center">
                    {/* For PEMBELI - only show purchases */}
                    {selectedUser.role === 'PEMBELI' && (
                      <div>
                        <p className="text-2xl font-bold text-green-600">{selectedUser.totalPembelian || 0}</p>
                        <p className="text-sm text-gray-600">Pembelian</p>
                      </div>
                    )}
                    
                    {/* For PENJUAL - show products and sales */}
                    {selectedUser.role === 'PENJUAL' && (
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <p className="text-2xl font-bold text-blue-600">{selectedUser.totalProduk || 0}</p>
                          <p className="text-sm text-gray-600">Produk</p>
                        </div>
                        <div>
                          <p className="text-2xl font-bold text-purple-600">{selectedUser.totalPenjualan || 0}</p>
                          <p className="text-sm text-gray-600">Penjualan</p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Delete User Section - Single Component */}
                <div className="pt-4 border-t border-gray-200 space-y-3">
                  {/* Warning Message */}
                  <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
                    <p className="text-gray-800 font-medium text-sm mb-2">
                      Anda akan menghapus pengguna "{selectedUser.nama || selectedUser.email}" secara permanen!
                    </p>
                    <div className="text-xs text-gray-700">
                      <p className="font-medium mb-1">Tindakan ini akan menghapus:</p>
                      <ul className="list-disc list-inside space-y-0.5 ml-2">
                        <li>Data pengguna</li>
                        <li>Profil pengguna</li>
                        <li>Produk yang tidak aktif</li>
                        <li>Notifikasi</li>
                      </ul>
                      <p className="mt-2 text-xs opacity-75">
                        Data transaksi yang sudah selesai akan tetap ada untuk keperluan audit.
                      </p>
                    </div>
                  </div>

                  {/* Checkbox Confirmation */}
                  <div className="flex items-start space-x-2">
                    <input
                      type="checkbox"
                      id="deleteConfirm"
                      checked={deleteConfirmed}
                      onChange={(e) => setDeleteConfirmed(e.target.checked)}
                      className="mt-1 h-4 w-4 text-red-600 focus:ring-red-500 border-gray-300 rounded"
                    />
                    <label htmlFor="deleteConfirm" className="text-sm text-gray-700">
                      Saya memahami bahwa tindakan ini tidak dapat dibatalkan dan akan menghapus pengguna secara permanen.
                    </label>
                  </div>

                  {/* Delete Button */}
                  <div className="flex justify-end">
                    <button
                      onClick={() => handleDeleteUser(selectedUser.id)}
                      disabled={!deleteConfirmed || updateLoading}
                      className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-gray-600 hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <TrashIcon className="w-4 h-4 mr-2" />
                      {updateLoading ? 'Menghapus...' : 'Hapus Pengguna'}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default PenggunaAdmin;