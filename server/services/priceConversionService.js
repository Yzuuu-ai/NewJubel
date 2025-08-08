const axios = require('axios');
class PriceConversionService {
  constructor() {
    this.ethToUsdRate = 2300; // Default fallback rate
    this.usdToIdrRate = 15800; // Default fallback rate
    this.lastUpdate = null;
    this.updateInterval = 5 * 60 * 1000; // 5 menit
    this.isUpdating = false; // Prevent concurrent updates
  }
  // Update rates dari API dengan error handling yang lebih baik
  async updateRates() {
    try {
      // Prevent concurrent updates
      if (this.isUpdating) {
        return;
      }
      // Cek apakah perlu update (setiap 5 menit)
      if (this.lastUpdate && Date.now() - this.lastUpdate < this.updateInterval) {
        return;
      }
      this.isUpdating = true;
      // Try to update ETH rate dengan timeout yang pendek
      try {
        const ethResponse = await Promise.race([
          axios.get('https://api.coingecko.com/api/v3/simple/price?ids=ethereum&vs_currencies=usd', {
            timeout: 8000, // 8 detik
            headers: {
              'User-Agent': 'Jubel-Marketplace/1.0'
            }
          }),
          new Promise((_, reject) => 
            setTimeout(() => reject(new Error('ETH price API timeout')), 7000)
          )
        ]);
        if (ethResponse.data && ethResponse.data.ethereum && ethResponse.data.ethereum.usd) {
          this.ethToUsdRate = ethResponse.data.ethereum.usd;
        }
      } catch (ethError) {
        console.warn('⚠️ ETH rate update failed, using cached rate:', ethError.message);
      }
      // Try to update USD to IDR rate dengan timeout yang pendek
      try {
        const usdResponse = await Promise.race([
          axios.get('https://api.exchangerate-api.com/v4/latest/USD', {
            timeout: 8000, // 8 detik
            headers: {
              'User-Agent': 'Jubel-Marketplace/1.0'
            }
          }),
          new Promise((_, reject) => 
            setTimeout(() => reject(new Error('USD rate API timeout')), 7000)
          )
        ]);
        if (usdResponse.data && usdResponse.data.rates && usdResponse.data.rates.IDR) {
          this.usdToIdrRate = usdResponse.data.rates.IDR;
        }
      } catch (usdError) {
        console.warn('⚠️ USD rate update failed, using cached rate:', usdError.message);
      }
      this.lastUpdate = Date.now();
    } catch (error) {
      console.error('❌ Error in updateRates:', error.message);
    } finally {
      this.isUpdating = false;
    }
  }
  // Konversi ETH ke Rupiah dengan fallback cepat
  async ethToIdr(ethAmount) {
    // Update rates in background, don't wait if it takes too long
    this.updateRatesInBackground();
    const usdAmount = parseFloat(ethAmount) * this.ethToUsdRate;
    const idrAmount = usdAmount * this.usdToIdrRate;
    return Math.round(idrAmount);
  }
  // Konversi Rupiah ke ETH dengan fallback cepat
  async idrToEth(idrAmount) {
    // Update rates in background, don't wait if it takes too long
    this.updateRatesInBackground();
    const usdAmount = parseFloat(idrAmount) / this.usdToIdrRate;
    const ethAmount = usdAmount / this.ethToUsdRate;
    return parseFloat(ethAmount.toFixed(6)); // 6 decimal places untuk ETH
  }
  // Update rates in background without blocking
  updateRatesInBackground() {
    if (!this.isUpdating && (!this.lastUpdate || Date.now() - this.lastUpdate > this.updateInterval)) {
      // Run update in background, don't await
      this.updateRates().catch(error => {
        console.warn('Background rate update failed:', error.message);
      });
    }
  }
  // Get current rates dengan response cepat
  async getCurrentRates() {
    // Update in background if needed
    this.updateRatesInBackground();
    return {
      ethToUsd: this.ethToUsdRate,
      usdToIdr: this.usdToIdrRate,
      ethToIdr: this.ethToUsdRate * this.usdToIdrRate,
      lastUpdate: this.lastUpdate ? new Date(this.lastUpdate).toISOString() : 'never',
      status: this.lastUpdate ? 'cached' : 'fallback'
    };
  }
  // Format Rupiah
  formatRupiah(amount) {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  }
  // Format ETH
  formatEth(amount) {
    return parseFloat(amount).toFixed(6) + ' ETH';
  }
  // Validasi ETH amount
  validateEthAmount(ethAmount) {
    const amount = parseFloat(ethAmount);
    if (isNaN(amount) || amount <= 0) {
      return { valid: false, message: 'Jumlah ETH harus berupa angka positif' };
    }
    if (amount < 0.001) {
      return { valid: false, message: 'Jumlah minimal 0.001 ETH' };
    }
    if (amount > 10) {
      return { valid: false, message: 'Jumlah maksimal 10 ETH' };
    }
    return { valid: true };
  }
  // Get suggested ETH prices (untuk dropdown/suggestions) dengan response cepat
  async getSuggestedPrices() {
    // Update in background if needed
    this.updateRatesInBackground();
    const suggestions = [
      { eth: '0.001', label: 'Murah' },
      { eth: '0.005', label: 'Standar' },
      { eth: '0.01', label: 'Premium' },
      { eth: '0.02', label: 'Eksklusif' },
      { eth: '0.05', label: 'Rare' }
    ];
    const result = [];
    for (const suggestion of suggestions) {
      const idrAmount = await this.ethToIdr(suggestion.eth);
      result.push({
        ...suggestion,
        idr: idrAmount,
        idrFormatted: this.formatRupiah(idrAmount),
        ethFormatted: this.formatEth(suggestion.eth)
      });
    }
    return result;
  }
  // Initialize rates on startup
  async initialize() {
    try {
      await this.updateRates();
    } catch (error) {
      console.warn('⚠️ Price conversion service initialized with fallback rates');
    }
  }
}
// Singleton instance
const priceConversionService = new PriceConversionService();
// Initialize on startup
priceConversionService.initialize().catch(error => {
  console.warn('Price service initialization failed, using fallback rates');
});
module.exports = priceConversionService;
