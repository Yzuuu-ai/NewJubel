import React, { useEffect, useCallback } from 'react';
import { useWebSocket } from '../hooks/useWebSocket';
import { useAuth } from '../konteks/AuthContext';
import toast from 'react-hot-toast';
const RealTimeUpdates = ({ 
  onProductUpdate, 
  onTransactionUpdate, 
  onUserUpdate,
  children 
}) => {
  const { user, isAuthenticated } = useAuth();
  const {
    isConnected,
    subscribeToMarketplace,
    subscribeToBuyerTransactions,
    subscribeToSellerTransactions,
    subscribeToAdminUpdates
  } = useWebSocket();
  // Handle marketplace updates (for all users)
  const handleMarketplaceUpdate = useCallback((event) => {
    if (onProductUpdate) {
      onProductUpdate(event);
    }
    // Show toast notifications for product changes
    const messages = {
      'CREATED': `📦 Produk baru: ${event.data.judulProduk}`,
      'UPDATED': `📝 Produk diperbarui: ${event.data.judulProduk}`,
      'SOLD': `🔥 Produk terjual: ${event.data.judulProduk}`,
      'DELETED': `🗑️ Produk dihapus: ${event.data.judulProduk}`
    };
    if (messages[event.action]) {
      toast.info(messages[event.action], { 
        duration: 3000,
        icon: '📦'
      });
    }
  }, [onProductUpdate]);
  // Handle buyer transaction updates
  const handleBuyerUpdate = useCallback((event) => {
    if (onTransactionUpdate) {
      onTransactionUpdate(event);
    }
    // Auto-refresh specific components based on update type
    if (event.type === 'TRANSACTION_UPDATE') {
      // Trigger refresh for buyer dashboard
      window.dispatchEvent(new CustomEvent('refreshBuyerDashboard', {
        detail: event
      }));
    }
  }, [onTransactionUpdate]);
  // Handle seller transaction updates
  const handleSellerUpdate = useCallback((event) => {
    if (onTransactionUpdate || onProductUpdate) {
      if (event.type === 'TRANSACTION_UPDATE') {
        onTransactionUpdate?.(event);
      } else if (event.type === 'PRODUCT_UPDATE') {
        onProductUpdate?.(event);
      }
    }
    // Auto-refresh specific components based on update type
    if (event.type === 'TRANSACTION_UPDATE') {
      // Trigger refresh for seller dashboard
      window.dispatchEvent(new CustomEvent('refreshSellerDashboard', {
        detail: event
      }));
    } else if (event.type === 'PRODUCT_UPDATE') {
      // Trigger refresh for product management
      window.dispatchEvent(new CustomEvent('refreshProductList', {
        detail: event
      }));
    }
  }, [onTransactionUpdate, onProductUpdate]);
  // Handle admin updates
  const handleAdminUpdate = useCallback((event) => {
    if (onTransactionUpdate || onUserUpdate) {
      if (event.type === 'TRANSACTION_UPDATE') {
        onTransactionUpdate?.(event);
      } else if (event.type === 'USER_UPDATE') {
        onUserUpdate?.(event);
      }
    }
    // Auto-refresh admin components
    window.dispatchEvent(new CustomEvent('refreshAdminDashboard', {
      detail: event
    }));
  }, [onTransactionUpdate, onUserUpdate]);
  // Subscribe to relevant updates based on user role
  useEffect(() => {
    if (!isConnected || !isAuthenticated || !user) {
      return;
    }
    // All users subscribe to marketplace updates
    const unsubscribeMarketplace = subscribeToMarketplace(handleMarketplaceUpdate);
    let unsubscribeBuyer, unsubscribeSeller, unsubscribeAdmin;
    // Subscribe based on user role
    if (user.role === 'USER') {
      // Regular users can be both buyers and sellers
      unsubscribeBuyer = subscribeToBuyerTransactions(handleBuyerUpdate);
      unsubscribeSeller = subscribeToSellerTransactions(handleSellerUpdate);
    } else if (user.role === 'ADMIN') {
      // Admins get all updates
      unsubscribeAdmin = subscribeToAdminUpdates(handleAdminUpdate);
      unsubscribeBuyer = subscribeToBuyerTransactions(handleBuyerUpdate);
      unsubscribeSeller = subscribeToSellerTransactions(handleSellerUpdate);
    }
    // Cleanup function
    return () => {
      unsubscribeMarketplace?.();
      unsubscribeBuyer?.();
      unsubscribeSeller?.();
      unsubscribeAdmin?.();
    };
  }, [
    isConnected, 
    isAuthenticated, 
    user,
    subscribeToMarketplace,
    subscribeToBuyerTransactions,
    subscribeToSellerTransactions,
    subscribeToAdminUpdates,
    handleMarketplaceUpdate,
    handleBuyerUpdate,
    handleSellerUpdate,
    handleAdminUpdate
  ]);
  // Show connection status
  useEffect(() => {
    if (isAuthenticated && user) {
      if (isConnected) {
      } else {
      }
    }
  }, [isConnected, isAuthenticated, user]);
  return (
    <>
      {children}
      {/* Connection Status Indicator */}
      {isAuthenticated && (
        <div className="fixed bottom-4 right-4 z-50">
          <div className={`flex items-center space-x-2 px-3 py-2 rounded-full text-sm font-medium shadow-lg ${
            isConnected 
              ? 'bg-green-100 text-green-800 border border-green-200' 
              : 'bg-red-100 text-red-800 border border-red-200'
          }`}>
            <div className={`w-2 h-2 rounded-full ${
              isConnected ? 'bg-green-500 animate-pulse' : 'bg-red-500'
            }`}></div>
            <span>
              {isConnected ? 'Real-time aktif' : 'Terputus'}
            </span>
          </div>
        </div>
      )}
    </>
  );
};
export default RealTimeUpdates;
