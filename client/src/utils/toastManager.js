import toast from 'react-hot-toast';

// Global toast manager untuk mencegah duplikasi
class ToastManager {
  constructor() {
    this.activeToasts = new Set();
    this.toastTimeout = 3000; // 3 detik
  }

  // Method untuk menampilkan toast dengan duplikasi prevention
  showToast(message, type = 'error', options = {}) {
    // Jika toast dengan pesan yang sama sudah aktif, jangan tampilkan lagi
    if (this.activeToasts.has(message)) {
      return;
    }

    // Tambahkan ke set toast aktif
    this.activeToasts.add(message);

    // Tampilkan toast
    let toastId;
    switch (type) {
      case 'success':
        toastId = toast.success(message, options);
        break;
      case 'error':
        toastId = toast.error(message, options);
        break;
      case 'loading':
        toastId = toast.loading(message, options);
        break;
      default:
        toastId = toast(message, options);
    }

    // Hapus dari set setelah timeout
    setTimeout(() => {
      this.activeToasts.delete(message);
    }, options.duration || this.toastTimeout);

    return toastId;
  }

  // Method khusus untuk error
  error(message, options = {}) {
    return this.showToast(message, 'error', options);
  }

  // Method khusus untuk success
  success(message, options = {}) {
    return this.showToast(message, 'success', options);
  }

  // Method khusus untuk loading
  loading(message, options = {}) {
    return this.showToast(message, 'loading', options);
  }

  // Method untuk clear semua toast aktif
  clear() {
    this.activeToasts.clear();
    toast.dismiss();
  }

  // Method untuk clear toast tertentu
  clearToast(message) {
    this.activeToasts.delete(message);
  }
}

// Export singleton instance
export const toastManager = new ToastManager();
export default toastManager;