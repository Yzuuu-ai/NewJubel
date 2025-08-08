import React, { useEffect, useState } from 'react';
import { useAuth } from '../konteks/AuthContext';
import { useTransactionUpdates } from '../hooks/useRealTimeUpdates';
import toast from 'react-hot-toast';
import {
  CheckCircleIcon,
  ExclamationTriangleIcon,
  InformationCircleIcon,
  XMarkIcon
} from '@heroicons/react/24/outline';

const NotificationSystem = () => {
  const { user, isAuthenticated } = useAuth();
  const [notifications, setNotifications] = useState([]);

  // Handle real-time transaction updates
  const { triggerUpdate } = useTransactionUpdates((source) => {
    // Handle transaction updates here
  });

  // Listen for specific events
  useEffect(() => {
    if (!isAuthenticated) return;
    
    // DISABLED: Pop-up notifikasi transaksi dinonaktifkan
    // Notifikasi transaksi sekarang hanya muncul di navbar untuk mengurangi gangguan
    
    const handleTransactionUpdate = (event) => {
      // DISABLED: Tidak menampilkan pop-up untuk update transaksi
      console.log('Transaction update event received (pop-up disabled):', event.detail);
      
      /* DISABLED - Pop-up notification untuk transaksi
      const data = event.detail;
      // Show notification based on transaction status
      if (data.status === 'DIBAYAR_SMARTCONTRACT') {
        showNotification({
          type: 'success',
          title: 'Pembayaran Berhasil!',
          message: `Transaksi ${data.transactionId} telah dibayar melalui smart contract.`,
          action: {
            label: 'Lihat Detail',
            onClick: () => window.location.href = `/transaksi/${data.transactionId}`
          }
        });
      } else if (data.status === 'DIKIRIM') {
        showNotification({
          type: 'info',
          title: 'Akun Dikirim',
          message: `Detail akun untuk transaksi ${data.transactionId} telah dikirim.`,
          action: {
            label: 'Lihat Detail',
            onClick: () => window.location.href = `/transaksi/${data.transactionId}`
          }
        });
      } else if (data.status === 'SELESAI') {
        showNotification({
          type: 'success',
          title: 'Transaksi Selesai!',
          message: `Transaksi ${data.transactionId} telah berhasil diselesaikan.`,
          action: {
            label: 'Lihat Riwayat',
            onClick: () => window.location.href = '/dashboard'
          }
        });
      }
      */
    };

    const handleProductSold = (event) => {
      // DISABLED: Tidak menampilkan pop-up untuk produk terjual
      console.log('Product sold event received (pop-up disabled):', event.detail);
      
      /* DISABLED - Pop-up notification untuk produk terjual
      const data = event.detail;
      showNotification({
        type: 'success',
        title: 'Produk Terjual!',
        message: `Produk ${data.productCode} telah berhasil terjual.`,
        action: {
          label: 'Lihat Transaksi',
          onClick: () => window.location.href = `/transaksi/${data.transactionId}`
        }
      });
      */
    };

    const handlePaymentConfirmed = (event) => {
      // DISABLED: Tidak menampilkan pop-up untuk konfirmasi pembayaran
      console.log('Payment confirmed event received (pop-up disabled):', event.detail);
      
      /* DISABLED - Pop-up notification untuk konfirmasi pembayaran
      const data = event.detail;
      showNotification({
        type: 'success',
        title: 'Pembayaran Dikonfirmasi!',
        message: `Pembayaran untuk transaksi ${data.transactionId} telah dikonfirmasi di blockchain.`,
        action: {
          label: 'Lihat di Etherscan',
          onClick: () => window.open(`https://sepolia.etherscan.io/tx/${data.transactionHash}`, '_blank')
        }
      });
      */
    };

    // Event listeners tetap ada untuk log, tapi tidak menampilkan pop-up
    window.addEventListener('transaction-update', handleTransactionUpdate);
    window.addEventListener('product-sold', handleProductSold);
    window.addEventListener('payment-confirmed', handlePaymentConfirmed);

    return () => {
      window.removeEventListener('transaction-update', handleTransactionUpdate);
      window.removeEventListener('product-sold', handleProductSold);
      window.removeEventListener('payment-confirmed', handlePaymentConfirmed);
    };
  }, [isAuthenticated]);

  // Show notification function (untuk notifikasi non-transaksi)
  const showNotification = (notification) => {
    const id = Date.now();
    const newNotification = { ...notification, id, timestamp: new Date() };
    setNotifications(prev => [newNotification, ...prev.slice(0, 4)]); // Keep max 5 notifications

    // Auto remove after 10 seconds
    setTimeout(() => {
      removeNotification(id);
    }, 10000);

    // Also show toast
    const toastMessage = `${notification.title}\n${notification.message}`;
    if (notification.type === 'success') {
      toast.success(toastMessage, { duration: 5000 });
    } else if (notification.type === 'error') {
      toast.error(toastMessage, { duration: 5000 });
    } else {
      toast(toastMessage, { duration: 5000 });
    }
  };

  // Remove notification
  const removeNotification = (id) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  // Get icon for notification type
  const getIcon = (type) => {
    switch (type) {
      case 'success':
        return <CheckCircleIcon className="h-6 w-6 text-green-600" />;
      case 'error':
        return <ExclamationTriangleIcon className="h-6 w-6 text-red-600" />;
      case 'warning':
        return <ExclamationTriangleIcon className="h-6 w-6 text-yellow-600" />;
      default:
        return <InformationCircleIcon className="h-6 w-6 text-blue-600" />;
    }
  };

  // Get background color for notification type
  const getBgColor = (type) => {
    switch (type) {
      case 'success':
        return 'bg-green-50 border-green-200';
      case 'error':
        return 'bg-red-50 border-red-200';
      case 'warning':
        return 'bg-yellow-50 border-yellow-200';
      default:
        return 'bg-blue-50 border-blue-200';
    }
  };

  // Return null karena notifikasi transaksi dinonaktifkan
  // Komponen ini masih ada untuk notifikasi non-transaksi di masa depan
  if (!isAuthenticated || notifications.length === 0) {
    return null;
  }

  return (
    <div className="fixed top-20 right-4 z-50 space-y-2 max-w-sm">
      {notifications.map((notification) => (
        <div
          key={notification.id}
          className={`${getBgColor(notification.type)} border rounded-lg shadow-lg p-4 animate-slide-in-right`}
        >
          <div className="flex items-start">
            <div className="flex-shrink-0">
              {getIcon(notification.type)}
            </div>
            <div className="ml-3 flex-1">
              <h4 className="text-sm font-medium text-gray-900">
                {notification.title}
              </h4>
              <p className="text-sm text-gray-600 mt-1">
                {notification.message}
              </p>
              {notification.action && (
                <button
                  onClick={notification.action.onClick}
                  className="mt-2 text-sm font-medium text-blue-600 hover:text-blue-500"
                >
                  {notification.action.label}
                </button>
              )}
              <p className="text-xs text-gray-400 mt-2">
                {notification.timestamp.toLocaleTimeString('id-ID')}
              </p>
            </div>
            <button
              onClick={() => removeNotification(notification.id)}
              className="flex-shrink-0 ml-2 text-gray-400 hover:text-gray-600"
            >
              <XMarkIcon className="h-4 w-4" />
            </button>
          </div>
        </div>
      ))}
    </div>
  );
};

export default NotificationSystem;