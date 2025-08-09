import { useState, useEffect, useCallback } from 'react';
import priceService from '../layanan/priceService';

/**
 * Hook untuk menggunakan harga ETH real-time
 */
export const useEthPrice = (options = {}) => {
  const {
    autoUpdate = true,
    updateInterval = 60000, // 1 menit
    fetchOnMount = true
  } = options;

  const [priceData, setPriceData] = useState(() => priceService.getCurrentPrice());
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  // Update state dari price service
  const updatePriceData = useCallback((newPriceData) => {
    setPriceData(newPriceData);
    setIsLoading(newPriceData.isLoading);
    setError(null);
  }, []);

  // Manual refresh function
  const refreshPrice = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const newPriceData = await priceService.fetchEthPrice();
      setPriceData(newPriceData);
    } catch (err) {
      setError(err.message);
      console.error('Failed to refresh ETH price:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Conversion functions
  const convertEthToIdr = useCallback((ethAmount) => {
    if (!ethAmount || isNaN(ethAmount)) return 0;
    return priceService.convertEthToIdr(parseFloat(ethAmount));
  }, [priceData.ethToIdr]);

  const convertIdrToEth = useCallback((idrAmount) => {
    if (!idrAmount || isNaN(idrAmount)) return 0;
    return priceService.convertIdrToEth(parseFloat(idrAmount));
  }, [priceData.ethToIdr]);

  // Format functions
  const formatEthPrice = useCallback((amount) => {
    if (!amount || isNaN(amount)) return '0 ETH';
    return `${parseFloat(amount).toFixed(6)} ETH`;
  }, []);

  const formatIdrPrice = useCallback((amount) => {
    if (!amount || isNaN(amount)) return 'Rp 0';
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  }, []);

  // Setup effect
  useEffect(() => {
    // Subscribe to price updates
    const unsubscribe = priceService.subscribe(updatePriceData);

    // Fetch initial price if needed
    if (fetchOnMount && (!priceData.lastUpdate || priceService.isPriceStale())) {
      refreshPrice();
    }

    // Start auto-update if enabled
    if (autoUpdate) {
      priceService.startAutoUpdate(updateInterval);
    }

    // Cleanup
    return () => {
      unsubscribe();
      if (autoUpdate) {
        priceService.stopAutoUpdate();
      }
    };
  }, [autoUpdate, updateInterval, fetchOnMount, updatePriceData, refreshPrice]);

  return {
    // Price data
    ethToIdrRate: priceData.ethToIdr,
    lastUpdate: priceData.lastUpdate,
    source: priceData.source,
    
    // Status
    isLoading,
    error,
    isStale: priceService.isPriceStale(),
    
    // Functions
    refreshPrice,
    convertEthToIdr,
    convertIdrToEth,
    formatEthPrice,
    formatIdrPrice,
    
    // Raw price data
    priceData
  };
};

/**
 * Hook sederhana untuk hanya mendapatkan rate konversi
 */
export const useEthToIdrRate = () => {
  const { ethToIdrRate, isLoading, error } = useEthPrice({
    autoUpdate: true,
    fetchOnMount: true
  });

  return {
    rate: ethToIdrRate,
    isLoading,
    error
  };
};

/**
 * Hook untuk konversi mata uang dengan format
 */
export const useCurrencyConverter = () => {
  const {
    ethToIdrRate,
    convertEthToIdr,
    convertIdrToEth,
    formatEthPrice,
    formatIdrPrice,
    isLoading,
    error
  } = useEthPrice();

  const convertAndFormat = useCallback((amount, fromCurrency, toCurrency) => {
    if (!amount || isNaN(amount)) return toCurrency === 'ETH' ? '0 ETH' : 'Rp 0';

    const numAmount = parseFloat(amount);

    if (fromCurrency === 'ETH' && toCurrency === 'IDR') {
      return formatIdrPrice(convertEthToIdr(numAmount));
    } else if (fromCurrency === 'IDR' && toCurrency === 'ETH') {
      return formatEthPrice(convertIdrToEth(numAmount));
    }

    return amount;
  }, [convertEthToIdr, convertIdrToEth, formatEthPrice, formatIdrPrice]);

  return {
    rate: ethToIdrRate,
    convertAndFormat,
    convertEthToIdr,
    convertIdrToEth,
    formatEthPrice,
    formatIdrPrice,
    isLoading,
    error
  };
};

export default useEthPrice;