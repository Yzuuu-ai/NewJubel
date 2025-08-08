import axios from 'axios';
const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';
// Create axios instance with enhanced config
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 30000, // 30 second timeout (increased from 10s)
});
// Add auth token to requests
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('authToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    // Add request timestamp for debugging
    config.metadata = { startTime: new Date() };
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);
// Handle response errors with better error handling and retry mechanism
api.interceptors.response.use(
  (response) => {
    // Log response time for debugging
    const endTime = new Date();
    const duration = endTime - response.config.metadata.startTime;
    if (duration > 5000) { // Log slow requests (>5s)
      console.warn(`Slow API request: ${response.config.method?.toUpperCase()} ${response.config.url} took ${duration}ms`);
    }
    return response;
  },
  async (error) => {
    const originalRequest = error.config;
    // Enhanced error logging
    console.error('API Error Details:', {
      message: error.message,
      code: error.code,
      status: error.response?.status,
      url: error.config?.url,
      method: error.config?.method,
      data: error.response?.data
    });
    // Handle timeout errors with retry mechanism
    if (error.code === 'ECONNABORTED' && !originalRequest._retry) {
      console.warn('Request timeout, attempting retry...');
      originalRequest._retry = true;
      originalRequest.timeout = 45000; // Increase timeout for retry
      try {
        const retryResponse = await api(originalRequest);
        return retryResponse;
      } catch (retryError) {
        console.error('Retry failed:', retryError.message);
        return Promise.reject({
          ...retryError,
          userMessage: 'Koneksi timeout. Server mungkin sedang sibuk, silakan coba lagi.'
        });
      }
    }
    // Handle network errors
    if (error.message === 'Network Error' || error.code === 'ERR_NETWORK') {
      console.error('Network error - check server connection');
      return Promise.reject({
        ...error,
        userMessage: 'Koneksi ke server bermasalah. Pastikan server berjalan dan coba lagi.'
      });
    }
    // Handle server errors (5xx)
    if (error.response?.status >= 500) {
      console.error('Server error:', error.response.status);
      return Promise.reject({
        ...error,
        userMessage: 'Server sedang bermasalah. Silakan coba lagi dalam beberapa saat.'
      });
    }
    // Handle timeout specifically for escrow operations
    if (error.response?.status === 408 || error.message.includes('timeout')) {
      console.warn('Operation timeout - this might still be processing');
      return Promise.reject({
        ...error,
        userMessage: 'Operasi memakan waktu lebih lama dari biasanya. Silakan periksa status transaksi di Etherscan.'
      });
    }
    // Handle specific backend errors
    if (error.response?.data?.pesan || error.response?.data?.message) {
      return Promise.reject({
        ...error,
        userMessage: error.response.data.pesan || error.response.data.message
      });
    }
    // Only logout on actual 401 authentication errors
    if (error.response?.status === 401) {
      localStorage.removeItem('authToken');
      localStorage.removeItem('user');
      window.location.href = '/masuk';
    }
    return Promise.reject(error);
  }
);
// Enhanced API wrapper with retry logic for critical operations
const apiWithRetry = async (apiCall, maxRetries = 2) => {
  let lastError;
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const result = await apiCall();
      return result;
    } catch (error) {
      lastError = error;
      // Don't retry on client errors (4xx) except timeout
      if (error.response?.status >= 400 && error.response?.status < 500 && error.response?.status !== 408) {
        throw error;
      }
      // Don't retry on the last attempt
      if (attempt === maxRetries) {
        throw error;
      }
      // Wait before retry (exponential backoff)
      const delay = Math.pow(2, attempt) * 1000; // 2s, 4s, 8s...
      console.warn(`API call failed (attempt ${attempt}/${maxRetries}), retrying in ${delay}ms...`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  throw lastError;
};
// Auth API
export const authAPI = {
  login: (credentials) => api.post('/auth/masuk', credentials),
  register: (userData) => api.post('/auth/daftar', userData),
  logout: () => api.post('/auth/keluar'),
  getProfile: () => api.get('/auth/profil'),
  updateProfile: (profileData) => api.put('/auth/profil', profileData),
  validateToken: () => api.get('/auth/validasi'),
  checkWalletAvailability: (alamatWallet) => {
    console.log('🔍 API: Checking wallet availability for:', alamatWallet);
    return api.get('/auth/cek-wallet', { 
      params: { alamatWallet },
      timeout: 10000 // 10 second timeout
    });
  },
};
// Produk API - FIXED ENDPOINTS
export const produkAPI = {
  getAllProduk: (params = {}) => api.get('/produk', { params }),
  getProdukById: (id) => api.get(`/produk/${id}`),
  getProdukPenjual: () => api.get('/produk/saya/daftar'),
  createProduk: (produkData) => api.post('/produk', produkData),
  updateProduk: (id, produkData) => api.put(`/produk/${id}`, produkData),
  deleteProduk: (id) => api.delete(`/produk/${id}`),
  searchProduk: (query) => api.get(`/produk/search?q=${encodeURIComponent(query)}`),
};
// Transaksi API with enhanced error handling
export const transaksiAPI = {
  // Buat transaksi baru
  buatTransaksi: (produkId) => apiWithRetry(() => api.post('/transaksi', { produkId })),
  // Get transaksi user (pembeli dan penjual)
  getTransaksiUser: (params = {}) => api.get('/transaksi', { params }),
  getTransaksiSaya: (params = {}) => api.get('/transaksi/saya', { params }),
  // Get transaksi berdasarkan role (DIPERBAIKI)
  getTransaksiPembeli: (params = {}) => api.get('/transaksi', { params: { ...params, role: 'pembeli' } }),
  getTransaksiPenjual: (params = {}) => api.get('/transaksi', { params: { ...params, role: 'penjual' } }),
  // Get detail transaksi
  getDetailTransaksi: (id) => api.get(`/transaksi/${id}`),
  // Konfirmasi pembayaran (setelah smart contract) - critical operation
  konfirmasiPembayaran: (id, data) => apiWithRetry(() => 
    api.put(`/transaksi/${id}/konfirmasi-pembayaran`, data), 3
  ),
  // Penjual kirim akun
  kirimAkun: (id, data) => api.put(`/transaksi/${id}/kirim-akun`, data),
  // Pembeli konfirmasi penerimaan
  konfirmasiPenerimaan: (id) => api.put(`/transaksi/${id}/konfirmasi-penerimaan`),
  // Buat sengketa (HANYA PEMBELI)
  buatSengketa: (id, data) => api.post(`/transaksi/${id}/sengketa`, data),
  // Get detail sengketa
  getDetailSengketa: (transaksiId) => api.get(`/transaksi/${transaksiId}/sengketa`),
  // Check status sengketa dan permissions
  checkSengketa: (transaksiId) => api.get(`/transaksi/${transaksiId}/sengketa/check`),
  // Buat pembelaan (HANYA PENJUAL)
  buatPembelaan: (sengketaId, data) => api.post(`/transaksi/sengketa/${sengketaId}/pembelaan`, data),
  // Get statistik transaksi user
  getStatistikTransaksi: () => api.get('/transaksi/statistik'),
  // Get riwayat transaksi dengan filter
  getRiwayatTransaksi: (params = {}) => api.get('/transaksi/riwayat', { params }),
  // Update status transaksi
  updateStatus: (id, data) => api.put(`/transaksi/${id}/status`, data),
};
// Admin API
export const adminAPI = {
  // Dashboard stats
  getDashboardStats: () => api.get('/admin/dashboard'),
  // User management
  getAllUsers: (params = {}) => api.get('/admin/users', { params }),
  updateUserStatus: (userId, status) => api.put(`/admin/users/${userId}/status`, { status }),
  updateUserRole: (userId, role) => api.put(`/admin/users/${userId}/role`, { role }),
  deleteUser: (userId) => api.delete(`/admin/users/${userId}`),
  // Sengketa management
  getAllSengketa: (params = {}) => api.get('/admin/sengketa', { params }),
  resolveSengketa: (id, data) => api.put(`/admin/sengketa/${id}/resolve`, data),
  getSengketaDetail: (id) => api.get(`/admin/sengketa/${id}`),
  // Produk management
  getAllProdukAdmin: (params = {}) => api.get('/admin/produk', { params }),
  deleteProduk: (id) => api.delete(`/admin/produk/${id}`),
  // Konfigurasi management
  getKonfigurasi: (kunci) => api.get(`/admin/konfigurasi/${kunci}`),
  // Payment management - UPDATED to use new admin payment system
  payToSeller: (id, data) => apiWithRetry(() => 
    api.post(`/admin-payment/payment/${id}`, { reason: data.note || 'Admin processing payment' }, { timeout: 90000 }), 2
  ),
};
// Upload API with enhanced timeout for file uploads
export const uploadAPI = {
  uploadImage: (file) => {
    const formData = new FormData();
    formData.append('gambar', file);
    return api.post('/upload/single', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      timeout: 60000, // 60 seconds for file uploads
    });
  },
  uploadMultipleImages: (files) => {
    const formData = new FormData();
    files.forEach(file => {
      formData.append('gambar', file);
    });
    return api.post('/upload/multiple', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      timeout: 120000, // 2 minutes for multiple file uploads
    });
  },
  uploadBukti: (file) => {
    const formData = new FormData();
    formData.append('gambar', file);
    return api.post('/upload/single', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      timeout: 60000, // 60 seconds for file uploads
    });
  },
  deleteImage: (url) => {
    return api.delete('/upload/cloudinary', {
      data: { url }
    });
  },
};
// Notification API
export const notificationAPI = {
  getNotifications: () => api.get('/notifications'),
  markAsRead: (id) => api.put(`/notifications/${id}/read`),
  markAllAsRead: () => api.put('/notifications/read-all'),
  deleteNotification: (id) => api.delete(`/notifications/${id}`),
};

// Smart Contract API with enhanced error handling for blockchain operations
export const smartContractAPI = {
  // Prepare escrow transaction data for client-side execution
  prepareEscrow: (data) => apiWithRetry(() => 
    api.post('/escrow/prepare', data, { timeout: 60000 }), 2 // 1 minute timeout, 2 retries
  ),
  // Critical blockchain operations with retry (legacy - for backward compatibility)
  createEscrow: (data) => apiWithRetry(() => 
    api.post('/escrow/create', data, { timeout: 120000 }), 3 // 2 minutes timeout, 3 retries
  ),
  // Verify user transaction
  verifyEscrow: (data) => apiWithRetry(() =>
    api.post('/escrow/verify', data, { timeout: 60000 }), 2 // 1 minute timeout, 2 retries
  ),
  // NEW SECURE FLOW: Preparation endpoints (no retry needed for validation)
  confirmReceived: (escrowId, buyerAddress) => 
    api.post('/escrow/confirm', { escrowId, buyerAddress }),
  createDispute: (escrowId, data) => 
    api.post('/escrow/dispute', { escrowId, ...data }),
  // NEW SECURE FLOW: Callback endpoints after successful blockchain transaction
  confirmReceivedCallback: (data) => apiWithRetry(() =>
    api.post('/escrow/confirm-callback', data), 2
  ),
  createDisputeCallback: (data) => apiWithRetry(() =>
    api.post('/escrow/dispute-callback', data), 2
  ),
  // Admin operations (still use server-side execution)
  resolveDispute: (escrowId, data) => apiWithRetry(() => 
    api.post('/escrow/resolve-dispute', { escrowId, ...data }, { timeout: 90000 }), 2
  ),
  // Read operations (no retry needed)
  getEscrowStatus: (escrowId) => api.get(`/escrow/${escrowId}`),
  getContractStats: () => api.get('/escrow/stats'),
  healthCheck: () => api.get('/escrow/health'),
};
// Enhanced utility functions
export const apiUtils = {
  // Format error message with user-friendly messages
  getErrorMessage: (error) => {
    // Check for user-friendly message first
    if (error.userMessage) {
      return error.userMessage;
    }
    // Check for backend error messages
    if (error.response?.data?.pesan) {
      return error.response.data.pesan;
    }
    if (error.response?.data?.message) {
      return error.response.data.message;
    }
    // Handle specific error codes
    if (error.code === 'ECONNABORTED') {
      return 'Koneksi timeout. Silakan coba lagi.';
    }
    if (error.code === 'ERR_NETWORK') {
      return 'Koneksi ke server bermasalah. Pastikan server berjalan.';
    }
    // Handle HTTP status codes
    if (error.response?.status === 500) {
      return 'Server sedang bermasalah. Silakan coba lagi dalam beberapa saat.';
    }
    if (error.response?.status === 404) {
      return 'Data yang diminta tidak ditemukan.';
    }
    if (error.response?.status === 403) {
      return 'Anda tidak memiliki akses untuk melakukan operasi ini.';
    }
    // Fallback to original error message
    if (error.message) {
      return error.message;
    }
    return 'Terjadi kesalahan yang tidak diketahui';
  },
  // Check if user is authenticated
  isAuthenticated: () => {
    return !!localStorage.getItem('authToken');
  },
  // Get user from localStorage
  getCurrentUser: () => {
    try {
      const user = localStorage.getItem('user');
      if (!user) return null;
      const parsedUser = JSON.parse(user);
      return parsedUser;
    } catch (error) {
      console.error('❌ Error parsing user from localStorage:', error);
      localStorage.removeItem('user'); // Clear corrupted data
      return null;
    }
  },
  // Set auth data
  setAuthData: (token, user) => {
    localStorage.setItem('authToken', token);
    localStorage.setItem('user', JSON.stringify(user));
  },
  // Clear auth data
  clearAuthData: () => {
    localStorage.removeItem('authToken');
    localStorage.removeItem('user');
  },
  // Check if error is retryable
  isRetryableError: (error) => {
    return (
      error.code === 'ECONNABORTED' ||
      error.code === 'ERR_NETWORK' ||
      error.response?.status >= 500 ||
      error.response?.status === 408
    );
  },
  // Format response time
  formatResponseTime: (ms) => {
    if (ms < 1000) return `${ms}ms`;
    return `${(ms / 1000).toFixed(1)}s`;
  }
};
// Backward compatibility - create apiService object
export const apiService = {
  auth: authAPI,
  produk: produkAPI,
  transaksi: transaksiAPI,
  admin: adminAPI,
  upload: uploadAPI,
  notification: notificationAPI,
  smartContract: smartContractAPI,
  utils: apiUtils
};
export default api;