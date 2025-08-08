import React, { useState, useEffect } from 'react';
import { useAuth } from '../konteks/AuthContext';
import { transaksiAPI } from '../layanan/api';

const NotifikasiTransaksi = () => {
  const [notifications, setNotifications] = useState([]);
  const [isVisible, setIsVisible] = useState(false);
  const { user } = useAuth();

  useEffect(() => {
    if (user) {
      checkUrgentTransactions();
      // Check every 30 seconds
      const interval = setInterval(checkUrgentTransactions, 30000);
      return () => clearInterval(interval);
    }
  }, [user]);

  const checkUrgentTransactions = async () => {
    try {
      // DISABLED: Pop-up notifikasi transaksi dinonaktifkan
      // Notifikasi transaksi sekarang hanya muncul di navbar untuk mengurangi gangguan
      
      const urgentNotifications = [];
      
      // Jika ada notifikasi non-transaksi lainnya yang penting, bisa ditambahkan di sini
      // Contoh: notifikasi sistem kritis, maintenance, update aplikasi, dll
      
      /* DISABLED - Notifikasi transaksi dipindahkan ke navbar
      const response = await transaksiAPI.getTransaksiUser({
        role: user?.role === 'USER' ? 'all' : 'penjual'
      });
      const transaksiData = response.data?.data?.transaksi || response.data?.transaksi || [];

      // For sellers - need to send account
      const needSendAccount = transaksiData.filter(t => 
        t.status === 'DIBAYAR_SMARTCONTRACT' && t.roleUser === 'penjual'
      );
      if (needSendAccount.length > 0) {
        urgentNotifications.push({
          id: 'send-account',
          type: 'urgent',
          title: `${needSendAccount.length} Transaksi Perlu Pengiriman Akun`,
          message: 'Pembeli sudah membayar, segera kirim data akun!',
          action: 'Kirim Akun',
          count: needSendAccount.length,
          transactions: needSendAccount
        });
      }

      // For buyers - need to confirm receipt
      const needConfirmReceipt = transaksiData.filter(t => 
        t.status === 'DIKIRIM' && t.roleUser === 'pembeli'
      );
      if (needConfirmReceipt.length > 0) {
        urgentNotifications.push({
          id: 'confirm-receipt',
          type: 'info',
          title: `${needConfirmReceipt.length} Akun Sudah Dikirim`,
          message: 'Periksa dan konfirmasi penerimaan akun Anda!',
          action: 'Konfirmasi',
          count: needConfirmReceipt.length,
          transactions: needConfirmReceipt
        });
      }
      */

      setNotifications(urgentNotifications);
      setIsVisible(urgentNotifications.length > 0);
    } catch (error) {
      console.error('Error checking urgent transactions:', error);
    }
  };

  const handleDismiss = (notificationId) => {
    setNotifications(prev => prev.filter(n => n.id !== notificationId));
    if (notifications.length <= 1) {
      setIsVisible(false);
    }
  };

  const handleAction = (notification) => {
    if (notification.id === 'send-account') {
      window.location.href = '/penjual';
    } else if (notification.id === 'confirm-receipt') {
      window.location.href = '/pembeli';
    }
  };

  // Return null karena notifikasi transaksi dinonaktifkan
  // Komponen ini masih ada untuk notifikasi non-transaksi di masa depan
  if (!isVisible || notifications.length === 0) {
    return null;
  }

  return (
    <div className="fixed top-4 right-4 z-50 space-y-2 max-w-sm">
      {notifications.map((notification) => (
        <div
          key={notification.id}
          className={`rounded-lg shadow-lg p-4 border-l-4 ${
            notification.type === 'urgent'
              ? 'bg-red-50 border-red-400'
              : 'bg-blue-50 border-blue-400'
          } animate-slide-in`}
        >
          <div className="flex items-start">
            <div className="flex-shrink-0">
              {notification.type === 'urgent' ? (
                <svg className="h-5 w-5 text-red-400" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
              ) : (
                <svg className="h-5 w-5 text-blue-400" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                </svg>
              )}
            </div>
            <div className="ml-3 flex-1">
              <h3 className={`text-sm font-medium ${
                notification.type === 'urgent' ? 'text-red-800' : 'text-blue-800'
              }`}>
                {notification.title}
              </h3>
              <p className={`mt-1 text-sm ${
                notification.type === 'urgent' ? 'text-red-700' : 'text-blue-700'
              }`}>
                {notification.message}
              </p>
              <div className="mt-3 flex space-x-2">
                <button
                  onClick={() => handleAction(notification)}
                  className={`text-sm font-medium px-3 py-1 rounded ${
                    notification.type === 'urgent'
                      ? 'bg-red-600 text-white hover:bg-red-700'
                      : 'bg-blue-600 text-white hover:bg-blue-700'
                  }`}
                >
                  {notification.action}
                </button>
                <button
                  onClick={() => handleDismiss(notification.id)}
                  className="text-sm font-medium text-gray-600 hover:text-gray-800"
                >
                  Tutup
                </button>
              </div>
            </div>
            <div className="ml-4 flex-shrink-0">
              <button
                onClick={() => handleDismiss(notification.id)}
                className={`rounded-md inline-flex text-gray-400 hover:text-gray-500 focus:outline-none`}
              >
                <span className="sr-only">Close</span>
                <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

export default NotifikasiTransaksi;