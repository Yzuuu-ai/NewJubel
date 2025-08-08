// 🛠️ JUBEL MARKETPLACE - UTILITY HELPERS
// Comprehensive helper functions for the application
import { ethers } from 'ethers';
// ==========================================
// 💰 PRICE & CURRENCY HELPERS
// ==========================================
/**
 * Format price to Indonesian Rupiah
 * @param {number} price - Price in number
 * @returns {string} Formatted price string
 */
export const formatRupiah = (price) => {
  if (!price && price !== 0) return 'Rp 0';
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(price);
};
/**
 * Format ETH price with proper decimals
 * @param {number|string} ethAmount - ETH amount
 * @returns {string} Formatted ETH string
 */
export const formatEth = (ethAmount) => {
  if (!ethAmount && ethAmount !== 0) return '0 ETH';
  const amount = typeof ethAmount === 'string' ? parseFloat(ethAmount) : ethAmount;
  if (amount === 0) return '0 ETH';
  if (amount < 0.001) return `${amount.toFixed(6)} ETH`;
  if (amount < 0.01) return `${amount.toFixed(4)} ETH`;
  if (amount < 1) return `${amount.toFixed(3)} ETH`;
  return `${amount.toFixed(2)} ETH`;
};
/**
 * Convert Wei to ETH
 * @param {string|BigNumber} weiAmount - Amount in Wei
 * @returns {string} Amount in ETH
 */
export const weiToEth = (weiAmount) => {
  try {
    if (!weiAmount) return '0';
    return ethers.formatEther(weiAmount);
  } catch (error) {
    console.error('Error converting Wei to ETH:', error);
    return '0';
  }
};
/**
 * Convert ETH to Wei
 * @param {string|number} ethAmount - Amount in ETH
 * @returns {string} Amount in Wei
 */
export const ethToWei = (ethAmount) => {
  try {
    if (!ethAmount) return '0';
    return ethers.parseEther(ethAmount.toString());
  } catch (error) {
    console.error('Error converting ETH to Wei:', error);
    return '0';
  }
};
// ==========================================
// 📅 DATE & TIME HELPERS
// ==========================================
/**
 * Format date to Indonesian locale
 * @param {string|Date} date - Date to format
 * @returns {string} Formatted date string
 */
export const formatDate = (date) => {
  if (!date) return '-';
  try {
    const dateObj = new Date(date);
    return dateObj.toLocaleDateString('id-ID', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  } catch (error) {
    console.error('Error formatting date:', error);
    return '-';
  }
};
/**
 * Format datetime to Indonesian locale with time
 * @param {string|Date} datetime - DateTime to format
 * @returns {string} Formatted datetime string
 */
export const formatDateTime = (datetime) => {
  if (!datetime) return '-';
  try {
    const dateObj = new Date(datetime);
    return dateObj.toLocaleString('id-ID', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  } catch (error) {
    console.error('Error formatting datetime:', error);
    return '-';
  }
};
/**
 * Get relative time (e.g., "2 hours ago")
 * @param {string|Date} date - Date to compare
 * @returns {string} Relative time string
 */
export const getRelativeTime = (date) => {
  if (!date) return '-';
  try {
    const now = new Date();
    const dateObj = new Date(date);
    const diffMs = now - dateObj;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);
    if (diffMins < 1) return 'Baru saja';
    if (diffMins < 60) return `${diffMins} menit yang lalu`;
    if (diffHours < 24) return `${diffHours} jam yang lalu`;
    if (diffDays < 7) return `${diffDays} hari yang lalu`;
    return formatDate(date);
  } catch (error) {
    console.error('Error getting relative time:', error);
    return '-';
  }
};
// ==========================================
// 🔗 BLOCKCHAIN HELPERS
// ==========================================
/**
 * Shorten wallet address for display
 * @param {string} address - Wallet address
 * @param {number} startChars - Characters to show at start
 * @param {number} endChars - Characters to show at end
 * @returns {string} Shortened address
 */
export const shortenAddress = (address, startChars = 6, endChars = 4) => {
  if (!address) return '';
  if (address.length <= startChars + endChars) return address;
  return `${address.slice(0, startChars)}...${address.slice(-endChars)}`;
};
/**
 * Validate Ethereum address
 * @param {string} address - Address to validate
 * @returns {boolean} Is valid address
 */
export const isValidAddress = (address) => {
  try {
    return ethers.isAddress(address);
  } catch (error) {
    return false;
  }
};
/**
 * Get Etherscan URL for transaction
 * @param {string} txHash - Transaction hash
 * @param {string} network - Network name (default: sepolia)
 * @returns {string} Etherscan URL
 */
export const getEtherscanUrl = (txHash, network = 'sepolia') => {
  if (!txHash) return '';
  const baseUrls = {
    mainnet: 'https://etherscan.io',
    sepolia: 'https://sepolia.etherscan.io',
    goerli: 'https://goerli.etherscan.io'
  };
  const baseUrl = baseUrls[network] || baseUrls.sepolia;
  return `${baseUrl}/tx/${txHash}`;
};
/**
 * Get Etherscan URL for address
 * @param {string} address - Wallet address
 * @param {string} network - Network name (default: sepolia)
 * @returns {string} Etherscan URL
 */
export const getAddressUrl = (address, network = 'sepolia') => {
  if (!address) return '';
  const baseUrls = {
    mainnet: 'https://etherscan.io',
    sepolia: 'https://sepolia.etherscan.io',
    goerli: 'https://goerli.etherscan.io'
  };
  const baseUrl = baseUrls[network] || baseUrls.sepolia;
  return `${baseUrl}/address/${address}`;
};
// ==========================================
// 📝 STRING HELPERS
// ==========================================
/**
 * Truncate text with ellipsis
 * @param {string} text - Text to truncate
 * @param {number} maxLength - Maximum length
 * @returns {string} Truncated text
 */
export const truncateText = (text, maxLength = 100) => {
  if (!text) return '';
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength).trim() + '...';
};
/**
 * Capitalize first letter of each word
 * @param {string} text - Text to capitalize
 * @returns {string} Capitalized text
 */
export const capitalizeWords = (text) => {
  if (!text) return '';
  return text
    .toLowerCase()
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
};
/**
 * Generate random string
 * @param {number} length - Length of string
 * @returns {string} Random string
 */
export const generateRandomString = (length = 8) => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
};
// ==========================================
// 🎮 GAME HELPERS
// ==========================================
/**
 * Get game icon/emoji based on game name
 * @param {string} gameName - Name of the game
 * @returns {string} Game emoji/icon
 */
export const getGameIcon = (gameName) => {
  if (!gameName) return '🎮';
  const gameIcons = {
    'mobile legends': '⚔️',
    'ml': '⚔️',
    'pubg': '🔫',
    'pubg mobile': '🔫',
    'free fire': '🔥',
    'ff': '🔥',
    'genshin impact': '⚡',
    'genshin': '⚡',
    'valorant': '🎯',
    'dota 2': '🛡️',
    'dota': '🛡️',
    'league of legends': '👑',
    'lol': '👑',
    'clash of clans': '🏰',
    'coc': '🏰',
    'clash royale': '👑',
    'minecraft': '⛏️',
    'roblox': '🧱',
    'among us': '👨‍🚀',
    'fall guys': '🏃',
    'fortnite': '🌪️'
  };
  const lowerGameName = gameName.toLowerCase();
  for (const [key, icon] of Object.entries(gameIcons)) {
    if (lowerGameName.includes(key)) {
      return icon;
    }
  }
  return '🎮';
};
/**
 * Get game category based on game name
 * @param {string} gameName - Name of the game
 * @returns {string} Game category
 */
export const getGameCategory = (gameName) => {
  if (!gameName) return 'Lainnya';
  const categories = {
    'MOBA': ['mobile legends', 'ml', 'dota 2', 'dota', 'league of legends', 'lol'],
    'Battle Royale': ['pubg', 'pubg mobile', 'free fire', 'ff', 'fortnite', 'apex legends'],
    'RPG': ['genshin impact', 'genshin', 'final fantasy', 'ragnarok'],
    'FPS': ['valorant', 'counter strike', 'cs', 'call of duty', 'cod'],
    'Strategy': ['clash of clans', 'coc', 'clash royale', 'age of empires'],
    'Sandbox': ['minecraft', 'roblox', 'terraria'],
    'Casual': ['among us', 'fall guys', 'candy crush']
  };
  const lowerGameName = gameName.toLowerCase();
  for (const [category, games] of Object.entries(categories)) {
    if (games.some(game => lowerGameName.includes(game))) {
      return category;
    }
  }
  return 'Lainnya';
};
// ==========================================
// 🔄 STATUS HELPERS
// ==========================================
/**
 * Get status color class for transaction status
 * @param {string} status - Transaction status
 * @returns {string} Tailwind color class
 */
export const getStatusColor = (status) => {
  const statusColors = {
    'MENUNGGU_PEMBAYARAN': 'text-yellow-600 bg-yellow-100',
    'DIBAYAR_SMARTCONTRACT': 'text-blue-600 bg-blue-100',
    'MENUNGGU_KIRIM_AKUN': 'text-orange-600 bg-orange-100',
    'DIKIRIM': 'text-purple-600 bg-purple-100',
    'DIKONFIRMASI_PEMBELI': 'text-green-600 bg-green-100',
    'SELESAI': 'text-green-700 bg-green-200',
    'SENGKETA': 'text-red-600 bg-red-100',
    'GAGAL': 'text-red-700 bg-red-200'
  };
  return statusColors[status] || 'text-gray-600 bg-gray-100';
};
/**
 * Get human-readable status text
 * @param {string} status - Transaction status
 * @returns {string} Human-readable status
 */
export const getStatusText = (status) => {
  const statusTexts = {
    'MENUNGGU_PEMBAYARAN': 'Menunggu Pembayaran',
    'DIBAYAR_SMARTCONTRACT': 'Dibayar (Smart Contract)',
    'MENUNGGU_KIRIM_AKUN': 'Menunggu Pengiriman Akun',
    'DIKIRIM': 'Akun Telah Dikirim',
    'DIKONFIRMASI_PEMBELI': 'Dikonfirmasi Pembeli',
    'SELESAI': 'Transaksi Selesai',
    'SENGKETA': 'Dalam Sengketa',
    'GAGAL': 'Transaksi Gagal'
  };
  return statusTexts[status] || status;
};
// ==========================================
// 📱 RESPONSIVE HELPERS
// ==========================================
/**
 * Check if device is mobile
 * @returns {boolean} Is mobile device
 */
export const isMobile = () => {
  return window.innerWidth < 768;
};
/**
 * Check if device is tablet
 * @returns {boolean} Is tablet device
 */
export const isTablet = () => {
  return window.innerWidth >= 768 && window.innerWidth < 1024;
};
/**
 * Check if device is desktop
 * @returns {boolean} Is desktop device
 */
export const isDesktop = () => {
  return window.innerWidth >= 1024;
};
// ==========================================
// 🔧 VALIDATION HELPERS
// ==========================================
/**
 * Validate email format
 * @param {string} email - Email to validate
 * @returns {boolean} Is valid email
 */
export const isValidEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};
/**
 * Validate Indonesian phone number
 * @param {string} phone - Phone number to validate
 * @returns {boolean} Is valid phone number
 */
export const isValidPhone = (phone) => {
  const phoneRegex = /^(\+62|62|0)8[1-9][0-9]{6,9}$/;
  return phoneRegex.test(phone.replace(/\s/g, ''));
};
/**
 * Validate password strength
 * @param {string} password - Password to validate
 * @returns {object} Validation result with score and feedback
 */
export const validatePassword = (password) => {
  const result = {
    isValid: false,
    score: 0,
    feedback: []
  };
  if (!password) {
    result.feedback.push('Password tidak boleh kosong');
    return result;
  }
  if (password.length < 8) {
    result.feedback.push('Password minimal 8 karakter');
  } else {
    result.score += 1;
  }
  if (!/[a-z]/.test(password)) {
    result.feedback.push('Password harus mengandung huruf kecil');
  } else {
    result.score += 1;
  }
  if (!/[A-Z]/.test(password)) {
    result.feedback.push('Password harus mengandung huruf besar');
  } else {
    result.score += 1;
  }
  if (!/[0-9]/.test(password)) {
    result.feedback.push('Password harus mengandung angka');
  } else {
    result.score += 1;
  }
  if (!/[^a-zA-Z0-9]/.test(password)) {
    result.feedback.push('Password harus mengandung karakter khusus');
  } else {
    result.score += 1;
  }
  result.isValid = result.score >= 4;
  return result;
};
// ==========================================
// 🎨 UI HELPERS
// ==========================================
/**
 * Generate avatar initials from name
 * @param {string} name - Full name
 * @returns {string} Initials
 */
export const getInitials = (name) => {
  if (!name) return '?';
  return name
    .split(' ')
    .map(word => word.charAt(0).toUpperCase())
    .slice(0, 2)
    .join('');
};
/**
 * Generate random avatar color
 * @param {string} seed - Seed for consistent color
 * @returns {string} Tailwind color class
 */
export const getAvatarColor = (seed) => {
  const colors = [
    'bg-red-500',
    'bg-blue-500',
    'bg-green-500',
    'bg-yellow-500',
    'bg-purple-500',
    'bg-pink-500',
    'bg-indigo-500',
    'bg-teal-500'
  ];
  if (!seed) return colors[0];
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = seed.charCodeAt(i) + ((hash << 5) - hash);
  }
  return colors[Math.abs(hash) % colors.length];
};
// ==========================================
// 📊 ANALYTICS HELPERS
// ==========================================
/**
 * Track user action (placeholder for analytics)
 * @param {string} action - Action name
 * @param {object} properties - Action properties
 */
export const trackAction = (action, properties = {}) => {
  if (process.env.NODE_ENV === 'development') {
  }
  // Example: gtag('event', action, properties);
};
/**
 * Log error for monitoring (placeholder)
 * @param {Error} error - Error object
 * @param {object} context - Error context
 */
export const logError = (error, context = {}) => {
  console.error('🚨 Error:', error, context);
  // Example: Sentry.captureException(error, { extra: context });
};
// ==========================================
// 🔄 ASYNC HELPERS
// ==========================================
/**
 * Sleep/delay function
 * @param {number} ms - Milliseconds to sleep
 * @returns {Promise} Promise that resolves after delay
 */
export const sleep = (ms) => {
  return new Promise(resolve => setTimeout(resolve, ms));
};
/**
 * Retry async function with exponential backoff
 * @param {Function} fn - Async function to retry
 * @param {number} maxRetries - Maximum retry attempts
 * @param {number} baseDelay - Base delay in ms
 * @returns {Promise} Promise with retry logic
 */
export const retryWithBackoff = async (fn, maxRetries = 3, baseDelay = 1000) => {
  let lastError;
  for (let i = 0; i <= maxRetries; i++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      if (i === maxRetries) {
        throw lastError;
      }
      const delay = baseDelay * Math.pow(2, i);
      await sleep(delay);
    }
  }
};
// ==========================================
// 🎯 EXPORT ALL HELPERS
// ==========================================
export default {
  // Price & Currency
  formatRupiah,
  formatEth,
  weiToEth,
  ethToWei,
  // Date & Time
  formatDate,
  formatDateTime,
  getRelativeTime,
  // Blockchain
  shortenAddress,
  isValidAddress,
  getEtherscanUrl,
  getAddressUrl,
  // String
  truncateText,
  capitalizeWords,
  generateRandomString,
  // Game
  getGameIcon,
  getGameCategory,
  // Status
  getStatusColor,
  getStatusText,
  // Responsive
  isMobile,
  isTablet,
  isDesktop,
  // Validation
  isValidEmail,
  isValidPhone,
  validatePassword,
  // UI
  getInitials,
  getAvatarColor,
  // Analytics
  trackAction,
  logError,
  // Async
  sleep,
  retryWithBackoff
};
