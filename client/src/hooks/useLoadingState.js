// hooks/useLoadingState.js
// Custom hook untuk mengelola loading state secara konsisten
import { useState, useCallback, useRef } from 'react';
import { useErrorHandler } from './useErrorHandler';
/**
 * Custom hook untuk mengelola loading state dengan error handling
 * @param {boolean} initialState - Initial loading state
 * @returns {Object} Loading state dan utilities
 */
export const useLoadingState = (initialState = false) => {
  const [loading, setLoading] = useState(initialState);
  const [error, setError] = useState(null);
  const { handleError } = useErrorHandler();
  const abortControllerRef = useRef(null);
  /**
   * Execute operation dengan loading state
   * @param {Function} operation - Async operation to execute
   * @param {Object} options - Options untuk loading
   * @returns {Promise} Operation result
   */
  const withLoading = useCallback(async (operation, options = {}) => {
    const {
      showError = true,
      errorContext = 'Operation',
      onSuccess,
      onError,
      timeout = 30000 // 30 seconds default timeout
    } = options;
    try {
      setLoading(true);
      setError(null);
      // Create abort controller for timeout
      abortControllerRef.current = new AbortController();
      // Set timeout
      const timeoutId = setTimeout(() => {
        if (abortControllerRef.current) {
          abortControllerRef.current.abort();
        }
      }, timeout);
      // Execute operation
      const result = await operation(abortControllerRef.current.signal);
      // Clear timeout
      clearTimeout(timeoutId);
      // Call success callback
      if (onSuccess) {
        onSuccess(result);
      }
      return result;
    } catch (err) {
      // Handle abort error
      if (err.name === 'AbortError') {
        const timeoutError = new Error('Operasi timeout. Silakan coba lagi.');
        setError(timeoutError);
        if (showError) {
          handleError(timeoutError, `${errorContext} Timeout`);
        }
        if (onError) {
          onError(timeoutError);
        }
        throw timeoutError;
      }
      // Handle other errors
      setError(err);
      if (showError) {
        handleError(err, errorContext);
      }
      if (onError) {
        onError(err);
      }
      throw err;
    } finally {
      setLoading(false);
      abortControllerRef.current = null;
    }
  }, [handleError]);
  /**
   * Execute multiple operations dengan loading state
   * @param {Array} operations - Array of async operations
   * @param {Object} options - Options untuk loading
   * @returns {Promise} Array of results
   */
  const withLoadingMultiple = useCallback(async (operations, options = {}) => {
    const {
      showError = true,
      errorContext = 'Multiple Operations',
      onSuccess,
      onError,
      failFast = false // If true, stop on first error
    } = options;
    try {
      setLoading(true);
      setError(null);
      let results;
      if (failFast) {
        // Use Promise.all - fails fast
        results = await Promise.all(operations.map(op => op()));
      } else {
        // Use Promise.allSettled - continues even if some fail
        const settledResults = await Promise.allSettled(operations.map(op => op()));
        results = settledResults.map(result => {
          if (result.status === 'fulfilled') {
            return result.value;
          } else {
            throw result.reason;
          }
        });
      }
      if (onSuccess) {
        onSuccess(results);
      }
      return results;
    } catch (err) {
      setError(err);
      if (showError) {
        handleError(err, errorContext);
      }
      if (onError) {
        onError(err);
      }
      throw err;
    } finally {
      setLoading(false);
    }
  }, [handleError]);
  /**
   * Set loading state manually
   * @param {boolean} isLoading - Loading state
   */
  const setLoadingState = useCallback((isLoading) => {
    setLoading(isLoading);
    if (!isLoading) {
      setError(null);
    }
  }, []);
  /**
   * Clear error state
   */
  const clearError = useCallback(() => {
    setError(null);
  }, []);
  /**
   * Cancel current operation
   */
  const cancelOperation = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    setLoading(false);
    setError(null);
  }, []);
  /**
   * Reset all states
   */
  const reset = useCallback(() => {
    cancelOperation();
    setError(null);
  }, [cancelOperation]);
  return {
    loading,
    error,
    withLoading,
    withLoadingMultiple,
    setLoading: setLoadingState,
    setError,
    clearError,
    cancelOperation,
    reset
  };
};
/**
 * Hook untuk mengelola multiple loading states
 * @param {Object} initialStates - Initial loading states
 * @returns {Object} Loading states dan utilities
 */
export const useMultipleLoadingStates = (initialStates = {}) => {
  const [loadingStates, setLoadingStates] = useState(initialStates);
  const [errors, setErrors] = useState({});
  const { handleError } = useErrorHandler();
  /**
   * Set loading state untuk key tertentu
   * @param {string} key - Loading state key
   * @param {boolean} isLoading - Loading state
   */
  const setLoading = useCallback((key, isLoading) => {
    setLoadingStates(prev => ({
      ...prev,
      [key]: isLoading
    }));
    if (!isLoading) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[key];
        return newErrors;
      });
    }
  }, []);
  /**
   * Execute operation dengan loading state untuk key tertentu
   * @param {string} key - Loading state key
   * @param {Function} operation - Async operation
   * @param {Object} options - Options
   * @returns {Promise} Operation result
   */
  const withLoading = useCallback(async (key, operation, options = {}) => {
    const {
      showError = true,
      errorContext = `Operation ${key}`,
      onSuccess,
      onError
    } = options;
    try {
      setLoading(key, true);
      const result = await operation();
      if (onSuccess) {
        onSuccess(result);
      }
      return result;
    } catch (err) {
      setErrors(prev => ({
        ...prev,
        [key]: err
      }));
      if (showError) {
        handleError(err, errorContext);
      }
      if (onError) {
        onError(err);
      }
      throw err;
    } finally {
      setLoading(key, false);
    }
  }, [setLoading, handleError]);
  /**
   * Clear error untuk key tertentu
   * @param {string} key - Error key
   */
  const clearError = useCallback((key) => {
    setErrors(prev => {
      const newErrors = { ...prev };
      delete newErrors[key];
      return newErrors;
    });
  }, []);
  /**
   * Clear semua errors
   */
  const clearAllErrors = useCallback(() => {
    setErrors({});
  }, []);
  /**
   * Check if any loading state is active
   */
  const isAnyLoading = Object.values(loadingStates).some(Boolean);
  /**
   * Check if specific key is loading
   * @param {string} key - Loading state key
   * @returns {boolean} Loading state
   */
  const isLoading = useCallback((key) => {
    return Boolean(loadingStates[key]);
  }, [loadingStates]);
  /**
   * Get error for specific key
   * @param {string} key - Error key
   * @returns {Error|null} Error object
   */
  const getError = useCallback((key) => {
    return errors[key] || null;
  }, [errors]);
  return {
    loadingStates,
    errors,
    isAnyLoading,
    isLoading,
    getError,
    setLoading,
    withLoading,
    clearError,
    clearAllErrors
  };
};
export default useLoadingState;
