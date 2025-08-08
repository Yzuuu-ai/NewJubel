import { useEffect, useCallback, useRef } from 'react';
import { useAuth } from '../konteks/AuthContext';
import toast from 'react-hot-toast';
/**
 * Hook untuk menangani real-time updates
 * Mendengarkan perubahan dari:
 * 1. LocalStorage events (antar tab)
 * 2. Custom events (dalam tab yang sama)
 * 3. Periodic polling (fallback)
 */
export const useRealTimeUpdates = (onUpdate, options = {}) => {
  const { user, isAuthenticated } = useAuth();
  const {
    enablePolling = false,
    pollingInterval = 30000, // 30 seconds
    enableToast = true,
    enableLocalStorage = true,
    enableCustomEvents = true,
    eventTypes = ['marketplace-refresh', 'transaction-update', 'product-sold', 'product-created']
  } = options;
  const lastUpdateRef = useRef(Date.now());
  const pollingIntervalRef = useRef(null);
  // Callback wrapper untuk mencegah multiple calls
  const debouncedUpdate = useCallback(
    debounce((source) => {
      const now = Date.now();
      // Prevent updates within 1 second of each other
      if (now - lastUpdateRef.current < 1000) {
        return;
      }
      lastUpdateRef.current = now;
      if (onUpdate) {
        onUpdate(source);
      }
      if (enableToast) {
        toast.success('Data diperbarui', { duration: 2000 });
      }
    }, 500),
    [onUpdate, enableToast]
  );
  // Handle localStorage events (antar tab)
  useEffect(() => {
    if (!enableLocalStorage || !isAuthenticated) return;
    const handleStorageChange = (e) => {
      if (eventTypes.some(type => e.key?.includes(type))) {
        debouncedUpdate('localStorage');
      }
    };
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, [enableLocalStorage, isAuthenticated, eventTypes, debouncedUpdate]);
  // Handle custom events (dalam tab yang sama)
  useEffect(() => {
    if (!enableCustomEvents || !isAuthenticated) return;
    const eventHandlers = eventTypes.map(eventType => {
      const handler = (e) => {
        debouncedUpdate(`customEvent:${eventType}`);
      };
      window.addEventListener(eventType, handler);
      return { eventType, handler };
    });
    // Cleanup
    return () => {
      eventHandlers.forEach(({ eventType, handler }) => {
        window.removeEventListener(eventType, handler);
      });
    };
  }, [enableCustomEvents, isAuthenticated, eventTypes, debouncedUpdate]);
  // Handle periodic polling (fallback)
  useEffect(() => {
    if (!enablePolling || !isAuthenticated) return;
    pollingIntervalRef.current = setInterval(() => {
      debouncedUpdate('polling');
    }, pollingInterval);
    return () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
      }
    };
  }, [enablePolling, isAuthenticated, pollingInterval, debouncedUpdate]);
  // Manual trigger function
  const triggerUpdate = useCallback((source = 'manual') => {
    debouncedUpdate(source);
  }, [debouncedUpdate]);
  // Broadcast update to other tabs
  const broadcastUpdate = useCallback((eventType = 'marketplace-refresh', data = {}) => {
    if (!enableLocalStorage) return;
    const updateData = {
      timestamp: Date.now(),
      userId: user?.id,
      ...data
    };
    // LocalStorage event
    localStorage.setItem(eventType, JSON.stringify(updateData));
    // Custom event for same tab
    if (enableCustomEvents) {
      window.dispatchEvent(new CustomEvent(eventType, { detail: updateData }));
    }
  }, [enableLocalStorage, enableCustomEvents, user?.id]);
  return {
    triggerUpdate,
    broadcastUpdate
  };
};
/**
 * Hook khusus untuk marketplace updates
 */
export const useMarketplaceUpdates = (onUpdate) => {
  return useRealTimeUpdates(onUpdate, {
    enablePolling: false,
    enableToast: false,
    eventTypes: ['marketplace-refresh', 'product-sold', 'product-updated', 'product-created']
  });
};
/**
 * Hook khusus untuk transaction updates
 */
export const useTransactionUpdates = (onUpdate) => {
  return useRealTimeUpdates(onUpdate, {
    enablePolling: true,
    pollingInterval: 60000, // 1 minute
    enableToast: true,
    eventTypes: ['transaction-update', 'payment-confirmed', 'product-delivered']
  });
};
/**
 * Hook khusus untuk dashboard updates
 */
export const useDashboardUpdates = (onUpdate) => {
  return useRealTimeUpdates(onUpdate, {
    enablePolling: true,
    pollingInterval: 30000, // 30 seconds
    enableToast: false,
    eventTypes: ['marketplace-refresh', 'transaction-update', 'dashboard-refresh']
  });
};
// Utility function untuk debouncing
function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}
// Utility functions untuk broadcasting events
export const broadcastMarketplaceUpdate = (data = {}) => {
  const updateData = {
    timestamp: Date.now(),
    type: 'marketplace',
    ...data
  };
  localStorage.setItem('marketplace-refresh', JSON.stringify(updateData));
  window.dispatchEvent(new CustomEvent('marketplace-refresh', { detail: updateData }));
};
export const broadcastTransactionUpdate = (transactionId, status, data = {}) => {
  const updateData = {
    timestamp: Date.now(),
    type: 'transaction',
    transactionId,
    status,
    ...data
  };
  localStorage.setItem('transaction-update', JSON.stringify(updateData));
  window.dispatchEvent(new CustomEvent('transaction-update', { detail: updateData }));
};
export const broadcastProductSold = (productId, transactionId, data = {}) => {
  const updateData = {
    timestamp: Date.now(),
    type: 'product-sold',
    productId,
    transactionId,
    ...data
  };
  localStorage.setItem('product-sold', JSON.stringify(updateData));
  window.dispatchEvent(new CustomEvent('product-sold', { detail: updateData }));
};
export const broadcastProductCreated = (productData = {}) => {
  const updateData = {
    timestamp: Date.now(),
    type: 'product-created',
    ...productData
  };
  localStorage.setItem('product-created', JSON.stringify(updateData));
  window.dispatchEvent(new CustomEvent('product-created', { detail: updateData }));
};
