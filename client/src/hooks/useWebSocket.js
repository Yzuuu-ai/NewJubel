import { useEffect, useRef, useState, useCallback } from 'react';
import { io } from 'socket.io-client';
import { useAuth } from '../konteks/AuthContext';
import toast from 'react-hot-toast';
const SOCKET_URL = process.env.REACT_APP_API_URL?.replace('/api', '') || 'http://localhost:5000';
export const useWebSocket = () => {
  const { user, isAuthenticated } = useAuth();
  const socketRef = useRef(null);
  const [isConnected, setIsConnected] = useState(false);
  const [connectionError, setConnectionError] = useState(null);
  // Event listeners storage
  const eventListenersRef = useRef(new Map());
  const connect = useCallback(() => {
    if (socketRef.current?.connected) {
      return;
    }
    socketRef.current = io(SOCKET_URL, {
      transports: ['websocket', 'polling'],
      timeout: 10000,
      forceNew: true
    });
    const socket = socketRef.current;
    socket.on('connect', () => {
      setIsConnected(true);
      setConnectionError(null);
      // Authenticate if user is logged in
      if (isAuthenticated && user) {
        const token = localStorage.getItem('authToken');
        if (token) {
          socket.emit('authenticate', token);
        }
      }
    });
    socket.on('disconnect', (reason) => {
      setIsConnected(false);
    });
    socket.on('connect_error', (error) => {
      console.error('❌ WebSocket connection error:', error);
      setConnectionError(error.message);
      setIsConnected(false);
    });
    socket.on('authenticated', (data) => {
      toast.success('Real-time updates aktif!', { duration: 2000 });
    });
    socket.on('authentication_error', (error) => {
      console.error('❌ WebSocket authentication error:', error);
      toast.error('Gagal mengaktifkan real-time updates');
    });
    // Handle force refresh
    socket.on('force_refresh', (data) => {
      toast.info(`Sistem diperbarui: ${data.reason}. Halaman akan di-refresh.`);
      setTimeout(() => {
        window.location.reload();
      }, 3000);
    });
    // Handle system maintenance
    socket.on('system_maintenance', (data) => {
      toast.warning(`Maintenance: ${data.message}`, { duration: 10000 });
    });
    // Handle notifications
    socket.on('notification', (data) => {
      toast.info(data.data.message || data.data.title);
    });
    // Handle urgent alerts
    socket.on('urgent_alert', (data) => {
      toast.error(data.data.message, { duration: 10000 });
    });
  }, [isAuthenticated, user]);
  const disconnect = useCallback(() => {
    if (socketRef.current) {
      socketRef.current.disconnect();
      socketRef.current = null;
      setIsConnected(false);
    }
  }, []);
  // Subscribe to marketplace updates
  const subscribeToMarketplace = useCallback((callback) => {
    if (!socketRef.current) return;
    const socket = socketRef.current;
    socket.emit('subscribe_marketplace');
    const handleProductUpdate = (event) => {
      callback(event);
    };
    socket.on('product_update', handleProductUpdate);
    eventListenersRef.current.set('product_update', handleProductUpdate);
    return () => {
      socket.off('product_update', handleProductUpdate);
      eventListenersRef.current.delete('product_update');
    };
  }, []);
  // Subscribe to transaction updates for buyers
  const subscribeToBuyerTransactions = useCallback((callback) => {
    if (!socketRef.current || !user?.id) return;
    const socket = socketRef.current;
    socket.emit('subscribe_transactions', user.id);
    const handleTransactionUpdate = (event) => {
      callback(event);
      // Show toast notification
      const messages = {
        'PAID': 'Pembayaran berhasil! Menunggu penjual mengirim akun.',
        'SENT': 'Akun telah dikirim! Silakan periksa dan konfirmasi.',
        'COMPLETED': 'Transaksi selesai! Terima kasih.',
        'DISPUTED': 'Sengketa dibuat. Admin akan meninjau dalam 24 jam.'
      };
      if (messages[event.action]) {
        toast.success(messages[event.action]);
      }
    };
    socket.on('buyer_transaction_update', handleTransactionUpdate);
    eventListenersRef.current.set('buyer_transaction_update', handleTransactionUpdate);
    return () => {
      socket.off('buyer_transaction_update', handleTransactionUpdate);
      eventListenersRef.current.delete('buyer_transaction_update');
    };
  }, [user?.id]);
  // Subscribe to transaction updates for sellers
  const subscribeToSellerTransactions = useCallback((callback) => {
    if (!socketRef.current || !user?.id) return;
    const socket = socketRef.current;
    const handleTransactionUpdate = (event) => {
      callback(event);
      // Show toast notification
      const messages = {
        'CREATED': 'Transaksi baru! Ada yang tertarik dengan produk Anda.',
        'PAID': '💰 Pembayaran diterima! Silakan kirim akun segera.',
        'COMPLETED': 'Transaksi selesai! Dana akan segera diterima.',
        'DISPUTED': 'Ada sengketa. Silakan berikan penjelasan.'
      };
      if (messages[event.action]) {
        toast.info(messages[event.action]);
      }
    };
    const handleProductUpdate = (event) => {
      callback(event);
    };
    socket.on('seller_transaction_update', handleTransactionUpdate);
    socket.on('seller_product_update', handleProductUpdate);
    eventListenersRef.current.set('seller_transaction_update', handleTransactionUpdate);
    eventListenersRef.current.set('seller_product_update', handleProductUpdate);
    return () => {
      socket.off('seller_transaction_update', handleTransactionUpdate);
      socket.off('seller_product_update', handleProductUpdate);
      eventListenersRef.current.delete('seller_transaction_update');
      eventListenersRef.current.delete('seller_product_update');
    };
  }, [user?.id]);
  // Subscribe to admin updates
  const subscribeToAdminUpdates = useCallback((callback) => {
    if (!socketRef.current || user?.role !== 'ADMIN') return;
    const socket = socketRef.current;
    socket.emit('subscribe_admin');
    const handleAdminUpdate = (event) => {
      callback(event);
    };
    socket.on('admin_transaction_update', handleAdminUpdate);
    socket.on('admin_user_update', handleAdminUpdate);
    eventListenersRef.current.set('admin_transaction_update', handleAdminUpdate);
    eventListenersRef.current.set('admin_user_update', handleAdminUpdate);
    return () => {
      socket.off('admin_transaction_update', handleAdminUpdate);
      socket.off('admin_user_update', handleAdminUpdate);
      eventListenersRef.current.delete('admin_transaction_update');
      eventListenersRef.current.delete('admin_user_update');
    };
  }, [user?.role]);
  // Cleanup function
  const cleanup = useCallback(() => {
    // Remove all event listeners
    eventListenersRef.current.forEach((listener, event) => {
      if (socketRef.current) {
        socketRef.current.off(event, listener);
      }
    });
    eventListenersRef.current.clear();
  }, []);
  // Auto-connect when authenticated
  useEffect(() => {
    if (isAuthenticated && user) {
      connect();
    } else {
      disconnect();
    }
    return () => {
      cleanup();
    };
  }, [isAuthenticated, user, connect, disconnect, cleanup]);
  // Cleanup on unmount
  useEffect(() => {
    return () => {
      cleanup();
      disconnect();
    };
  }, [cleanup, disconnect]);
  return {
    isConnected,
    connectionError,
    connect,
    disconnect,
    subscribeToMarketplace,
    subscribeToBuyerTransactions,
    subscribeToSellerTransactions,
    subscribeToAdminUpdates
  };
};
export default useWebSocket;
