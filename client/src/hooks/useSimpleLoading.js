// hooks/useSimpleLoading.js
// Simple loading state hook
import { useState } from 'react';
import toast from 'react-hot-toast';
import { ErrorHandler } from '../utils/errorHandler';
/**
 * Simple loading state hook dengan error handling
 * @param {boolean} initialState - Initial loading state
 * @returns {Object} Loading state dan utilities
 */
export const useSimpleLoading = (initialState = false) => {
  const [loading, setLoading] = useState(initialState);
  const [error, setError] = useState(null);
  /**
   * Execute operation dengan loading state
   * @param {Function} operation - Async operation
   * @param {string} errorContext - Context untuk error
   * @param {boolean} showToast - Show error toast
   * @returns {Promise} Operation result
   */
  const withLoading = async (operation, errorContext = '', showToast = true) => {
    try {
      setLoading(true);
      setError(null);
      const result = await operation();
      return result;
    } catch (err) {
      setError(err);
      const message = ErrorHandler.handleAPIError(err, errorContext);
      if (showToast) {
        toast.error(message);
      }
      throw err;
    } finally {
      setLoading(false);
    }
  };
  /**
   * Clear error state
   */
  const clearError = () => {
    setError(null);
  };
  /**
   * Reset loading dan error state
   */
  const reset = () => {
    setLoading(false);
    setError(null);
  };
  return { 
    loading, 
    error, 
    withLoading, 
    clearError, 
    reset,
    setLoading 
  };
};
export default useSimpleLoading;
