// hooks/useTransactionState.js
// Custom hook untuk mengelola state transaksi
import { useState, useCallback, useRef, useEffect } from 'react';
import { useErrorHandler } from './useErrorHandler';
/**
 * Transaction states
 */
export const TRANSACTION_STATES = {
  IDLE: 'idle',
  PREPARING: 'preparing',
  SIGNING: 'signing',
  CONFIRMING: 'confirming',
  SUCCESS: 'success',
  ERROR: 'error',
  CANCELLED: 'cancelled'
};
/**
 * Custom hook untuk mengelola state transaksi dengan retry mechanism
 * @param {Object} options - Configuration options
 * @returns {Object} Transaction state dan methods
 */
export const useTransactionState = (options = {}) => {
  const {
    maxRetries = 3,
    retryDelay = 1000,
    timeoutMs = 300000, // 5 minutes
    onSuccess,
    onError,
    onStateChange
  } = options;
  const { handleError, handleSuccess } = useErrorHandler();
  const timeoutRef = useRef(null);
  const retryTimeoutRef = useRef(null);
  const [state, setState] = useState({
    status: TRANSACTION_STATES.IDLE,
    txHash: null,
    escrowId: null,
    error: null,
    retryCount: 0,
    progress: 0,
    message: '',
    data: null,
    startTime: null,
    endTime: null
  });
  /**
   * Update transaction state
   * @param {Object} newState - New state properties
   */
  const updateState = useCallback((newState) => {
    setState(prevState => {
      const updatedState = { ...prevState, ...newState };
      // Call onStateChange callback if provided
      if (onStateChange) {
        onStateChange(updatedState, prevState);
      }
      return updatedState;
    });
  }, [onStateChange]);
  /**
   * Reset transaction state to idle
   */
  const resetState = useCallback(() => {
    // Clear any pending timeouts
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    if (retryTimeoutRef.current) {
      clearTimeout(retryTimeoutRef.current);
      retryTimeoutRef.current = null;
    }
    updateState({
      status: TRANSACTION_STATES.IDLE,
      txHash: null,
      escrowId: null,
      error: null,
      retryCount: 0,
      progress: 0,
      message: '',
      data: null,
      startTime: null,
      endTime: null
    });
  }, [updateState]);
  /**
   * Start transaction process
   * @param {string} message - Initial message
   */
  const startTransaction = useCallback((message = 'Memulai transaksi...') => {
    updateState({
      status: TRANSACTION_STATES.PREPARING,
      message,
      startTime: Date.now(),
      progress: 10,
      error: null
    });
    // Set timeout for transaction
    timeoutRef.current = setTimeout(() => {
      updateState({
        status: TRANSACTION_STATES.ERROR,
        error: new Error('Transaksi timeout'),
        message: 'Transaksi timeout. Silakan coba lagi.',
        endTime: Date.now()
      });
    }, timeoutMs);
  }, [updateState, timeoutMs]);
  /**
   * Update to signing state
   * @param {string} message - Signing message
   */
  const setSigning = useCallback((message = 'Menunggu tanda tangan...') => {
    updateState({
      status: TRANSACTION_STATES.SIGNING,
      message,
      progress: 30
    });
  }, [updateState]);
  /**
   * Update to confirming state
   * @param {string} txHash - Transaction hash
   * @param {string} message - Confirming message
   */
  const setConfirming = useCallback((txHash, message = 'Menunggu konfirmasi blockchain...') => {
    updateState({
      status: TRANSACTION_STATES.CONFIRMING,
      txHash,
      message,
      progress: 60
    });
  }, [updateState]);
  /**
   * Set transaction success
   * @param {Object} data - Success data
   * @param {string} message - Success message
   */
  const setSuccess = useCallback((data, message = 'Transaksi berhasil!') => {
    // Clear timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    const successState = {
      status: TRANSACTION_STATES.SUCCESS,
      data,
      message,
      progress: 100,
      endTime: Date.now(),
      error: null
    };
    updateState(successState);
    // Show success message
    handleSuccess(message);
    // Call success callback
    if (onSuccess) {
      onSuccess(data, successState);
    }
  }, [updateState, handleSuccess, onSuccess]);
  /**
   * Set transaction error
   * @param {Error} error - Error object
   * @param {string} context - Error context
   */
  const setError = useCallback((error, context = 'Transaction') => {
    // Clear timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    const errorState = {
      status: TRANSACTION_STATES.ERROR,
      error,
      message: error.message || 'Transaksi gagal',
      endTime: Date.now()
    };
    updateState(errorState);
    // Handle error with toast
    handleError(error, context);
    // Call error callback
    if (onError) {
      onError(error, errorState);
    }
  }, [updateState, handleError, onError]);
  /**
   * Cancel transaction
   * @param {string} reason - Cancellation reason
   */
  const cancelTransaction = useCallback((reason = 'Transaksi dibatalkan') => {
    // Clear timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    updateState({
      status: TRANSACTION_STATES.CANCELLED,
      message: reason,
      endTime: Date.now()
    });
  }, [updateState]);
  /**
   * Retry transaction
   * @param {Function} retryFunction - Function to retry
   */
  const retry = useCallback(async (retryFunction) => {
    if (state.retryCount >= maxRetries) {
      setError(new Error(`Maksimal ${maxRetries} percobaan telah tercapai`), 'Retry');
      return;
    }
    const newRetryCount = state.retryCount + 1;
    updateState({
      status: TRANSACTION_STATES.PREPARING,
      retryCount: newRetryCount,
      message: `Mencoba lagi... (${newRetryCount}/${maxRetries})`,
      progress: 10,
      error: null
    });
    // Wait before retry
    const delay = retryDelay * Math.pow(2, newRetryCount - 1); // Exponential backoff
    retryTimeoutRef.current = setTimeout(async () => {
      try {
        if (retryFunction) {
          await retryFunction();
        }
      } catch (error) {
        setError(error, 'Retry');
      }
    }, delay);
  }, [state.retryCount, maxRetries, retryDelay, updateState, setError]);
  /**
   * Update progress
   * @param {number} progress - Progress percentage (0-100)
   * @param {string} message - Progress message
   */
  const updateProgress = useCallback((progress, message) => {
    updateState({ progress, message });
  }, [updateState]);
  /**
   * Check if transaction can be retried
   */
  const canRetry = state.status === TRANSACTION_STATES.ERROR && 
                   state.retryCount < maxRetries &&
                   state.error?.code !== 4001; // Don't retry user cancellations
  /**
   * Check if transaction is in progress
   */
  const isInProgress = [
    TRANSACTION_STATES.PREPARING,
    TRANSACTION_STATES.SIGNING,
    TRANSACTION_STATES.CONFIRMING
  ].includes(state.status);
  /**
   * Check if transaction is completed (success or error)
   */
  const isCompleted = [
    TRANSACTION_STATES.SUCCESS,
    TRANSACTION_STATES.ERROR,
    TRANSACTION_STATES.CANCELLED
  ].includes(state.status);
  /**
   * Get transaction duration
   */
  const getDuration = () => {
    if (!state.startTime) return 0;
    const endTime = state.endTime || Date.now();
    return endTime - state.startTime;
  };
  /**
   * Get formatted duration
   */
  const getFormattedDuration = () => {
    const duration = getDuration();
    const seconds = Math.floor(duration / 1000);
    const minutes = Math.floor(seconds / 60);
    if (minutes > 0) {
      return `${minutes}m ${seconds % 60}s`;
    }
    return `${seconds}s`;
  };
  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current);
      }
    };
  }, []);
  return {
    // State
    state,
    // Status checks
    isInProgress,
    isCompleted,
    canRetry,
    // Actions
    startTransaction,
    setSigning,
    setConfirming,
    setSuccess,
    setError,
    cancelTransaction,
    retry,
    resetState,
    updateProgress,
    updateState,
    // Utilities
    getDuration,
    getFormattedDuration,
    // Constants
    STATES: TRANSACTION_STATES
  };
};
export default useTransactionState;
