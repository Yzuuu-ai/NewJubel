import React from 'react';
import { ExclamationTriangleIcon, XMarkIcon } from '@heroicons/react/24/outline';

const ConfirmationModal = ({
  isOpen,
  onClose,
  onConfirm,
  title = "Konfirmasi",
  message = "Apakah Anda yakin?",
  confirmText = "Ya",
  cancelText = "Batal",
  type = "warning", // warning, danger, info
  loading = false
}) => {
  // Handle escape key - must be called before any early returns
  React.useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape' && !loading && isOpen) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      // Prevent body scroll
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, loading, onClose]);

  const getTypeStyles = () => {
    switch (type) {
      case 'danger':
        return {
          icon: 'text-red-600',
          confirmButton: 'bg-red-600 hover:bg-red-700 focus:ring-red-500',
          iconBg: 'bg-red-100'
        };
      case 'info':
        return {
          icon: 'text-blue-600',
          confirmButton: 'bg-blue-600 hover:bg-blue-700 focus:ring-blue-500',
          iconBg: 'bg-blue-100'
        };
      default: // warning
        return {
          icon: 'text-yellow-600',
          confirmButton: 'bg-yellow-600 hover:bg-yellow-700 focus:ring-yellow-500',
          iconBg: 'bg-yellow-100'
        };
    }
  };

  const styles = getTypeStyles();

  const handleConfirm = () => {
    if (loading) return;
    onConfirm();
  };

  const handleCancel = () => {
    if (loading) return;
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-md w-full shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">
            {title}
          </h3>
          <button
            onClick={handleCancel}
            disabled={loading}
            className="text-gray-400 hover:text-gray-600 disabled:opacity-50"
            aria-label="Tutup"
          >
            <XMarkIcon className="h-6 w-6" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          <p className="text-gray-700 leading-relaxed">
            {message}
          </p>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end space-x-3 p-6 border-t border-gray-200 bg-gray-50 rounded-b-lg">
          <button
            onClick={handleCancel}
            disabled={loading}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {cancelText}
          </button>
          <button
            onClick={handleConfirm}
            disabled={loading}
            className={`px-4 py-2 text-sm font-medium text-white rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center space-x-2 ${styles.confirmButton}`}
          >
            {loading && (
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
            )}
            <span>{loading ? 'Memproses...' : confirmText}</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmationModal;