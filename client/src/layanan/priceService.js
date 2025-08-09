/**
 * Service untuk mengambil harga cryptocurrency real-time
 */

const COINGECKO_API = 'https://api.coingecko.com/api/v3';
const BINANCE_API = 'https://api.binance.com/api/v3';

// Fallback rate jika API gagal
const FALLBACK_ETH_TO_IDR = 68300000;

class PriceService {
  constructor() {
    this.cache = {
      ethToIdr: FALLBACK_ETH_TO_IDR,
      lastUpdate: null,
      isLoading: false
    };
    this.listeners = new Set();
    this.updateInterval = null;
  }

  /**
   * Mengambil harga ETH ke IDR dari CoinGecko
   */
  async fetchFromCoinGecko() {
    try {
      const response = await fetch(
        `${COINGECKO_API}/simple/price?ids=ethereum&vs_currencies=idr&include_last_updated_at=true`,
        {
          method: 'GET',
          headers: {
            'Accept': 'application/json',
          }
        }
      );

      if (!response.ok) {
        throw new Error(`CoinGecko API error: ${response.status}`);
      }

      const data = await response.json();
      
      if (data.ethereum && data.ethereum.idr) {
        return {
          rate: Math.round(data.ethereum.idr),
          timestamp: data.ethereum.last_updated_at * 1000,
          source: 'CoinGecko'
        };
      }
      
      throw new Error('Invalid CoinGecko response format');
    } catch (error) {
      console.warn('CoinGecko API failed:', error.message);
      throw error;
    }
  }

  /**
   * Mengambil harga ETH dari Binance (dalam USDT) dan konversi ke IDR
   */
  async fetchFromBinance() {
    try {
      // Ambil harga ETH/USDT dan USDT/IDR secara bersamaan
      const [ethUsdtResponse, usdtIdrResponse] = await Promise.all([
        fetch(`${BINANCE_API}/ticker/price?symbol=ETHUSDT`),
        fetch(`${BINANCE_API}/ticker/price?symbol=USDTIDR`)
      ]);

      if (!ethUsdtResponse.ok || !usdtIdrResponse.ok) {
        throw new Error('Binance API error');
      }

      const [ethUsdtData, usdtIdrData] = await Promise.all([
        ethUsdtResponse.json(),
        usdtIdrResponse.json()
      ]);

      const ethUsdt = parseFloat(ethUsdtData.price);
      const usdtIdr = parseFloat(usdtIdrData.price);
      const ethIdr = ethUsdt * usdtIdr;

      return {
        rate: Math.round(ethIdr),
        timestamp: Date.now(),
        source: 'Binance'
      };
    } catch (error) {
      console.warn('Binance API failed:', error.message);
      throw error;
    }
  }

  /**
   * Mengambil harga dengan fallback ke multiple sources
   */
  async fetchEthPrice() {
    if (this.cache.isLoading) {
      return this.cache;
    }

    this.cache.isLoading = true;

    try {
      // Coba CoinGecko terlebih dahulu
      try {
        const coinGeckoPrice = await this.fetchFromCoinGecko();
        this.updateCache(coinGeckoPrice);
        return this.cache;
      } catch (coinGeckoError) {
        console.warn('CoinGecko failed, trying Binance...');
        
        // Fallback ke Binance
        try {
          const binancePrice = await this.fetchFromBinance();
          this.updateCache(binancePrice);
          return this.cache;
        } catch (binanceError) {
          console.warn('All price APIs failed, using fallback rate');
          
          // Gunakan fallback rate
          this.updateCache({
            rate: FALLBACK_ETH_TO_IDR,
            timestamp: Date.now(),
            source: 'Fallback'
          });
          return this.cache;
        }
      }
    } finally {
      this.cache.isLoading = false;
    }
  }

  /**
   * Update cache dan notify listeners
   */
  updateCache(priceData) {
    const oldRate = this.cache.ethToIdr;
    
    this.cache = {
      ...this.cache,
      ethToIdr: priceData.rate,
      lastUpdate: priceData.timestamp,
      source: priceData.source,
      isLoading: false
    };

    // Notify listeners jika harga berubah
    if (oldRate !== priceData.rate) {
      this.notifyListeners();
    }

    console.log(`💰 ETH Price updated: ${this.formatPrice(priceData.rate)} IDR (${priceData.source})`);
  }

  /**
   * Format harga untuk display
   */
  formatPrice(price) {
    return new Intl.NumberFormat('id-ID').format(price);
  }

  /**
   * Subscribe ke price updates
   */
  subscribe(callback) {
    this.listeners.add(callback);
    
    // Return unsubscribe function
    return () => {
      this.listeners.delete(callback);
    };
  }

  /**
   * Notify semua listeners
   */
  notifyListeners() {
    this.listeners.forEach(callback => {
      try {
        callback(this.cache);
      } catch (error) {
        console.error('Error in price listener:', error);
      }
    });
  }

  /**
   * Start auto-update dengan interval
   */
  startAutoUpdate(intervalMs = 60000) { // Default 1 menit
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
    }

    // Update immediately
    this.fetchEthPrice();

    // Set interval untuk update berkala
    this.updateInterval = setInterval(() => {
      this.fetchEthPrice();
    }, intervalMs);

    console.log(`🔄 ETH price auto-update started (${intervalMs/1000}s interval)`);
  }

  /**
   * Stop auto-update
   */
  stopAutoUpdate() {
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
      this.updateInterval = null;
      console.log('🛑 ETH price auto-update stopped');
    }
  }

  /**
   * Get current cached price
   */
  getCurrentPrice() {
    return this.cache;
  }

  /**
   * Convert ETH to IDR
   */
  convertEthToIdr(ethAmount) {
    return ethAmount * this.cache.ethToIdr;
  }

  /**
   * Convert IDR to ETH
   */
  convertIdrToEth(idrAmount) {
    return idrAmount / this.cache.ethToIdr;
  }

  /**
   * Check if price data is stale (older than 5 minutes)
   */
  isPriceStale() {
    if (!this.cache.lastUpdate) return true;
    const fiveMinutes = 5 * 60 * 1000;
    return (Date.now() - this.cache.lastUpdate) > fiveMinutes;
  }
}

// Export singleton instance
export const priceService = new PriceService();
export default priceService;