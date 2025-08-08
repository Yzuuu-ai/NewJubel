// hooks/useErrorHandler.js
// Custom hook untuk unified error handling
import { useCallback } from 'react';
import toast from 'react-hot-toast';
import { ErrorHandler } from '../utils/errorHandler';
/**
 * Custom hook untuk menangani error secara konsisten
 * @returns {Object} Object dengan fungsi handleError
 */
export const useErrorHandler = () => {
  /**
   * Handle error dengan toast notification
   * @param {Error|Object} error - Error object
   * @param {string} context - Context dimana error terjadi
   * @param {Object} options - Options untuk error handling
   * @returns {string} Formatted error message
   */
  const handleError = useCallback((error, context = '', options = {}) => {
    const {
      showToast = true,
      toastType = 'error',
      duration = 4000,
      logError = true
    } = options;
    // Format error message
    const message = logError 
      ? ErrorHandler.handleAPIError(error, context)
      : ErrorHandler.formatError(error);
    // Show toast notification
    if (showToast) {
      switch (toastType) {
        case 'error':
          toast.error(message, { duration });
          break;
        case 'warning':
          toast.error(message, { 
            duration,
            icon: '⚠️',
            style: {
              background: '#FEF3C7',
              color: '#92400E',
              border: '1px solid #F59E0B'
            }
          });
          break;
        case 'info':
          toast(message, { 
            duration,
            icon: 'ℹ️',
            style: {
              background: '#DBEAFE',
              color: '#1E40AF',
              border: '1px solid #3B82F6'
            }
          });
          break;
        default:
          toast.error(message, { duration });
      }
    }
    return message;
  }, []);
  /**
   * Handle API error khusus untuk API calls
   * @param {Error} error - API error
   * @param {string} operation - Operation yang gagal
   * @returns {string} Error message
   */
  const handleAPIError = useCallback((error, operation = '') => {
    const context = operation ? `API ${operation}` : 'API Call';
    return handleError(error, context, { showToast: true });
  }, [handleError]);
  /**
   * Handle form validation error
   * @param {Object} errors - Validation errors object
   * @param {string} formName - Form name
   */
  const handleValidationError = useCallback((errors, formName = '') => {
    const errorMessages = Object.values(errors).filter(Boolean);
    if (errorMessages.length > 0) {
      const message = errorMessages.length === 1 
        ? errorMessages[0]
        : `${errorMessages.length} kesalahan validasi ditemukan`;
      handleError(
        new Error(message), 
        `Form Validation ${formName}`,
        { toastType: 'warning' }
      );
    }
  }, [handleError]);
  /**
   * Handle smart contract error
   * @param {Error} error - Smart contract error
   * @param {string} operation - Smart contract operation
   * @returns {string} Error message
   */
  const handleSmartContractError = useCallback((error, operation = '') => {
    const context = operation ? `Smart Contract ${operation}` : 'Smart Contract';
    // Import SmartContractErrorHandler dynamically to avoid circular dependency
    import('../utils/errorHandler').then(({ SmartContractErrorHandler }) => {
      const message = SmartContractErrorHandler.parseError(error);
      toast.error(message, {
        duration: 6000, // Longer duration for smart contract errors
        style: {
          background: '#FEE2E2',
          color: '#991B1B',
          border: '1px solid #DC2626'
        }
      });
      // Log the error
      SmartContractErrorHandler.logError(error, context);
    });
    return ErrorHandler.formatError(error);
  }, []);
  /**
   * Handle success message
   * @param {string} message - Success message
   * @param {Object} options - Toast options
   */
  const handleSuccess = useCallback((message, options = {}) => {
    const { duration = 3000, icon = '✅' } = options;
    toast.success(message, {
      duration,
      icon,
      style: {
        background: '#D1FAE5',
        color: '#065F46',
        border: '1px solid #10B981'
      }
    });
  }, []);
  /**
   * Handle info message
   * @param {string} message - Info message
   * @param {Object} options - Toast options
   */
  const handleInfo = useCallback((message, options = {}) => {
    const { duration = 3000, icon = 'ℹ️' } = options;
    toast(message, {
      duration,
      icon,
      style: {
        background: '#DBEAFE',
        color: '#1E40AF',
        border: '1px solid #3B82F6'
      }
    });
  }, []);
  /**
   * Handle warning message
   * @param {string} message - Warning message
   * @param {Object} options - Toast options
   */
  const handleWarning = useCallback((message, options = {}) => {
    const { duration = 4000, icon = '⚠️' } = options;
    toast(message, {
      duration,
      icon,
      style: {
        background: '#FEF3C7',
        color: '#92400E',
        border: '1px solid #F59E0B'
      }
    });
  }, []);
  /**
   * Clear all toasts
   */
  const clearToasts = useCallback(() => {
    toast.dismiss();
  }, []);
  return {
    handleError,
    handleAPIError,
    handleValidationError,
    handleSmartContractError,
    handleSuccess,
    handleInfo,
    handleWarning,
    clearToasts
  };
};
export default useErrorHandler;
