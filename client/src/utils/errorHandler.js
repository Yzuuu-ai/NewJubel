// utils/errorHandler.js
// Unified Error Handling System untuk Project Jubel
/**
 * Centralized error handling utility
 * Provides consistent error formatting and logging across the application
 */
export class ErrorHandler {
  /**
   * Format error message untuk user-friendly display
   * @param {Error|Object} error - Error object atau response error
   * @returns {string} Formatted error message
   */
  static formatError(error) {
    // Priority 1: Backend error messages
    if (error.response?.data?.pesan) {
      return error.response.data.pesan;
    }
    if (error.response?.data?.message) {
      return error.response.data.message;
    }
    // Priority 2: User-friendly messages (dari interceptor)
    if (error.userMessage) {
      return error.userMessage;
    }
    // Priority 3: Network dan HTTP errors
    if (error.code === 'ECONNABORTED') {
      return 'Koneksi timeout. Silakan coba lagi.';
    }
    if (error.code === 'ERR_NETWORK') {
      return 'Koneksi ke server bermasalah. Pastikan server berjalan.';
    }
    // Priority 4: HTTP status codes
    if (error.response?.status) {
      switch (error.response.status) {
        case 400:
          return 'Permintaan tidak valid. Periksa data yang dikirim.';
        case 401:
          return 'Sesi telah berakhir. Silakan login kembali.';
        case 403:
          return 'Anda tidak memiliki akses untuk melakukan operasi ini.';
        case 404:
          return 'Data yang diminta tidak ditemukan.';
        case 408:
          return 'Permintaan timeout. Silakan coba lagi.';
        case 429:
          return 'Terlalu banyak permintaan. Silakan tunggu sebentar.';
        case 500:
          return 'Server sedang bermasalah. Silakan coba lagi dalam beberapa saat.';
        case 502:
          return 'Server tidak dapat dijangkau. Silakan coba lagi.';
        case 503:
          return 'Layanan sedang tidak tersedia. Silakan coba lagi nanti.';
        default:
          return `Terjadi kesalahan server (${error.response.status})`;
      }
    }
    // Priority 5: Generic error message
    if (error.message) {
      return error.message;
    }
    // Fallback
    return 'Terjadi kesalahan yang tidak diketahui';
  }
  /**
   * Handle API errors dengan logging dan context
   * @param {Error} error - Error object
   * @param {string} context - Context dimana error terjadi
   * @returns {string} Formatted error message
   */
  static handleAPIError(error, context = '') {
    const message = this.formatError(error);
    // Enhanced logging
    console.error(`❌ ${context} Error:`, {
      message,
      originalError: error,
      timestamp: new Date().toISOString(),
      context,
      stack: error.stack,
      response: error.response?.data,
      status: error.response?.status
    });
    // Log to monitoring service
    this.logError(error, context);
    return message;
  }
  /**
   * Log error to monitoring service
   * @param {Error} error - Error object
   * @param {string} context - Context information
   */
  static logError(error, context) {
    // Prepare error data for monitoring
    const errorData = {
      message: error.message,
      stack: error.stack,
      context,
      timestamp: new Date().toISOString(),
      url: window.location.href,
      userAgent: navigator.userAgent,
      userId: this.getCurrentUserId(),
      sessionId: this.getSessionId(),
      response: error.response ? {
        status: error.response.status,
        data: error.response.data,
        headers: error.response.headers
      } : null
    };
    // Log to console in development
    if (process.env.NODE_ENV === 'development') {
      console.error('🔍 Error Details:', errorData);
    }
    // Example: Sentry.captureException(error, { extra: errorData });
    // Store in localStorage for debugging (limited storage)
    this.storeErrorLocally(errorData);
  }
  /**
   * Store error locally for debugging purposes
   * @param {Object} errorData - Error data to store
   */
  static storeErrorLocally(errorData) {
    try {
      const errors = JSON.parse(localStorage.getItem('jubel_errors') || '[]');
      // Keep only last 10 errors to prevent storage overflow
      errors.push(errorData);
      if (errors.length > 10) {
        errors.shift();
      }
      localStorage.setItem('jubel_errors', JSON.stringify(errors));
    } catch (e) {
      console.warn('Failed to store error locally:', e);
    }
  }
  /**
   * Get current user ID for error tracking
   * @returns {string|null} User ID
   */
  static getCurrentUserId() {
    try {
      const user = JSON.parse(localStorage.getItem('user') || 'null');
      return user?.id || null;
    } catch (e) {
      return null;
    }
  }
  /**
   * Get session ID for error tracking
   * @returns {string} Session ID
   */
  static getSessionId() {
    let sessionId = sessionStorage.getItem('jubel_session_id');
    if (!sessionId) {
      sessionId = 'session_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
      sessionStorage.setItem('jubel_session_id', sessionId);
    }
    return sessionId;
  }
  /**
   * Check if error is retryable
   * @param {Error} error - Error object
   * @returns {boolean} Whether error is retryable
   */
  static isRetryableError(error) {
    // Network errors
    if (error.code === 'ECONNABORTED' || error.code === 'ERR_NETWORK') {
      return true;
    }
    // Server errors (5xx)
    if (error.response?.status >= 500) {
      return true;
    }
    // Timeout errors
    if (error.response?.status === 408) {
      return true;
    }
    // Rate limit errors
    if (error.response?.status === 429) {
      return true;
    }
    return false;
  }
  /**
   * Get retry delay based on attempt number
   * @param {number} attempt - Attempt number (0-based)
   * @returns {number} Delay in milliseconds
   */
  static getRetryDelay(attempt) {
    // Exponential backoff: 1s, 2s, 4s, 8s, 16s
    return Math.min(1000 * Math.pow(2, attempt), 16000);
  }
  /**
   * Clear stored errors (for debugging)
   */
  static clearStoredErrors() {
    localStorage.removeItem('jubel_errors');
  }
  /**
   * Get stored errors (for debugging)
   * @returns {Array} Array of stored errors
   */
  static getStoredErrors() {
    try {
      return JSON.parse(localStorage.getItem('jubel_errors') || '[]');
    } catch (e) {
      return [];
    }
  }
}
/**
 * Smart Contract specific error handler
 */
export class SmartContractErrorHandler extends ErrorHandler {
  /**
   * Parse smart contract specific errors
   * @param {Error} error - Smart contract error
   * @returns {string} User-friendly error message
   */
  static parseError(error) {
    // User rejection
    if (error.code === 4001) {
      return 'Transaksi dibatalkan oleh user';
    }
    // Insufficient funds
    if (error.message.includes('insufficient funds')) {
      return 'Saldo tidak mencukupi untuk transaksi ini';
    }
    // Gas related errors
    if (error.message.includes('gas')) {
      if (error.message.includes('out of gas')) {
        return 'Gas limit terlalu rendah. Silakan coba lagi dengan gas limit yang lebih tinggi.';
      }
      return 'Estimasi gas gagal. Pastikan parameter transaksi benar.';
    }
    // Network errors
    if (error.message.includes('network')) {
      return 'Masalah jaringan. Pastikan terhubung ke Sepolia testnet.';
    }
    // MetaMask not installed
    if (error.message.includes('MetaMask')) {
      return 'MetaMask tidak terdeteksi. Silakan install MetaMask terlebih dahulu.';
    }
    // Contract errors
    if (error.message.includes('revert')) {
      return 'Transaksi ditolak oleh smart contract. Periksa kondisi transaksi.';
    }
    // Transaction timeout
    if (error.message.includes('timeout')) {
      return 'Transaksi timeout. Silakan periksa status di Etherscan atau coba lagi.';
    }
    // Fallback to parent class
    return super.formatError(error);
  }
  /**
   * Retry operation with exponential backoff
   * @param {Function} operation - Operation to retry
   * @param {number} maxRetries - Maximum retry attempts
   * @returns {Promise} Operation result
   */
  static async retryWithBackoff(operation, maxRetries = 3) {
    let lastError;
    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error;
        // Don't retry user rejections
        if (error.code === 4001) {
          throw error;
        }
        // Don't retry on last attempt
        if (attempt === maxRetries - 1) {
          throw error;
        }
        // Only retry retryable errors
        if (!this.isRetryableError(error)) {
          throw error;
        }
        const delay = this.getRetryDelay(attempt);
        console.warn(`⚠️ Attempt ${attempt + 1} failed, retrying in ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
    throw lastError;
  }
}
export default ErrorHandler;
