// Utility untuk menangani expired transactions di frontend
import { apiService } from '../layanan/api';
import toast from 'react-hot-toast';

class TransactionExpiryManager {
  constructor() {
    this.timers = new Map();
    this.listeners = new Set();
  }

  // Start monitoring transaksi dengan timer 15 menit
  startMonitoring(transaksi) {
    if (!transaksi || transaksi.status !== 'MENUNGGU_PEMBAYARAN') {
      return;
    }

    const transaksiId = transaksi.id;
    
    // Clear existing timer jika ada
    this.stopMonitoring(transaksiId);

    const createdAt = new Date(transaksi.dibuatPada);
    const expiryTime = new Date(createdAt.getTime() + 15 * 60 * 1000); // 15 menit
    const now = new Date();
    const timeLeft = expiryTime.getTime() - now.getTime();

    if (timeLeft <= 0) {
      // Sudah expired
      this.handleExpiredTransaction(transaksi);
      return;
    }

    // Set timer untuk handle expiry
    const timer = setTimeout(() => {
      this.handleExpiredTransaction(transaksi);
    }, timeLeft);

    this.timers.set(transaksiId, {
      timer,
      transaksi,
      expiryTime
    });

    console.log(`⏰ Started monitoring transaction ${transaksiId}, expires in ${Math.round(timeLeft / 1000)}s`);
  }

  // Stop monitoring transaksi
  stopMonitoring(transaksiId) {
    const timerData = this.timers.get(transaksiId);
    if (timerData) {
      clearTimeout(timerData.timer);
      this.timers.delete(transaksiId);
      console.log(`⏹️ Stopped monitoring transaction ${transaksiId}`);
    }
  }

  // Handle expired transaction
  async handleExpiredTransaction(transaksi) {
    try {
      console.log(`⏰ Transaction ${transaksi.id} expired, updating status...`);
      
      // Update status transaksi menjadi GAGAL
      await apiService.transaksi.updateStatus(transaksi.id, {
        status: 'GAGAL',
        alasan: 'Waktu pembayaran habis (15 menit)'
      });

      // Notify listeners
      this.notifyListeners('expired', transaksi);

      // Show notification
      toast.error(`Waktu pembayaran untuk ${transaksi.produk?.judulProduk} telah habis. Produk dikembalikan ke market.`);

      // Broadcast event untuk refresh marketplace
      window.dispatchEvent(new CustomEvent('transaction-expired', { 
        detail: { 
          transaksiId: transaksi.id,
          produkId: transaksi.produkId,
          timestamp: Date.now()
        } 
      }));

      // Clean up
      this.stopMonitoring(transaksi.id);

    } catch (error) {
      console.error('Error handling expired transaction:', error);
    }
  }

  // Add listener untuk expired events
  addListener(callback) {
    this.listeners.add(callback);
  }

  // Remove listener
  removeListener(callback) {
    this.listeners.delete(callback);
  }

  // Notify all listeners
  notifyListeners(event, data) {
    this.listeners.forEach(callback => {
      try {
        callback(event, data);
      } catch (error) {
        console.error('Error in expiry listener:', error);
      }
    });
  }

  // Get time left untuk transaksi
  getTimeLeft(transaksiId) {
    const timerData = this.timers.get(transaksiId);
    if (!timerData) return null;

    const now = new Date();
    const timeLeft = timerData.expiryTime.getTime() - now.getTime();
    
    if (timeLeft <= 0) return { minutes: 0, seconds: 0 };

    const minutes = Math.floor(timeLeft / (1000 * 60));
    const seconds = Math.floor((timeLeft % (1000 * 60)) / 1000);
    
    return { minutes, seconds };
  }

  // Check if transaksi is expired
  isExpired(transaksiId) {
    const timeLeft = this.getTimeLeft(transaksiId);
    return timeLeft && timeLeft.minutes === 0 && timeLeft.seconds === 0;
  }

  // Start monitoring multiple transactions
  startMonitoringMultiple(transaksiList) {
    transaksiList.forEach(transaksi => {
      if (transaksi.status === 'MENUNGGU_PEMBAYARAN') {
        this.startMonitoring(transaksi);
      }
    });
  }

  // Stop all monitoring
  stopAll() {
    this.timers.forEach((timerData, transaksiId) => {
      clearTimeout(timerData.timer);
    });
    this.timers.clear();
    console.log('⏹️ Stopped all transaction monitoring');
  }

  // Get all active timers
  getActiveTimers() {
    return Array.from(this.timers.entries()).map(([transaksiId, timerData]) => ({
      transaksiId,
      transaksi: timerData.transaksi,
      expiryTime: timerData.expiryTime,
      timeLeft: this.getTimeLeft(transaksiId)
    }));
  }
}

// Create singleton instance
const transactionExpiryManager = new TransactionExpiryManager();

export default transactionExpiryManager;