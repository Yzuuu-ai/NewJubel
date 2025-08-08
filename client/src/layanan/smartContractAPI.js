/* eslint-disable no-undef */
import axios from 'axios';
const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';
// Create axios instance for smart contract operations
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 30000,
});
// Add auth token to requests
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('authToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);
// Enhanced API wrapper with retry logic
const apiWithRetry = async (apiCall, maxRetries = 2) => {
  let lastError;
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const result = await apiCall();
      return result;
    } catch (error) {
      lastError = error;
      // Don't retry on client errors (4xx) except timeout
      if (error.response?.status >= 400 && error.response?.status < 500 && error.response?.status !== 408) {
        throw error;
      }
      // Don't retry on the last attempt
      if (attempt === maxRetries) {
        throw error;
      }
      // Wait before retry (exponential backoff)
      const delay = Math.pow(2, attempt) * 1000;
      console.warn(`API call failed (attempt ${attempt}/${maxRetries}), retrying in ${delay}ms...`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  throw lastError;
};
// PERBAIKAN: Smart Contract API dengan User Wallet Flow
export const smartContractAPI = {
  // STEP 1: Prepare transaction data untuk client-side execution
  // User akan menggunakan MetaMask untuk membayar langsung ke smart contract
  prepareEscrow: (data) => {
    return api.post('/escrow/prepare', data, { timeout: 30000 });
  },
  // STEP 2: Verify transaction yang sudah dibuat oleh user
  // Backend akan memverifikasi transaksi dan update database
  verifyEscrow: (data) => {
    return apiWithRetry(() => 
      api.post('/escrow/verify', data, { timeout: 60000 }), 2
    );
  },
  // LEGACY: Old method (masih ada untuk backward compatibility)
  // TIDAK DIREKOMENDASIKAN - menggunakan admin wallet
  createEscrow: (data) => {
    console.warn('⚠️ Using legacy createEscrow method - admin wallet will be used');
    return apiWithRetry(() => 
      api.post('/escrow/create', data, { timeout: 120000 }), 3
    );
  },
  // Preparation endpoints untuk client-side transactions
  confirmReceived: (escrowId, buyerAddress) => 
    api.post('/escrow/confirm', { escrowId, buyerAddress }),
  createDispute: (escrowId, data) => 
    api.post('/escrow/dispute', { escrowId, ...data }),
  // Callback endpoints setelah successful blockchain transaction
  confirmReceivedCallback: (data) => apiWithRetry(() =>
    api.post('/escrow/confirm-callback', data), 2
  ),
  createDisputeCallback: (data) => apiWithRetry(() =>
    api.post('/escrow/dispute-callback', data), 2
  ),
  // Admin operations (masih menggunakan server-side execution)
  resolveDispute: (escrowId, data) => apiWithRetry(() => 
    api.post('/escrow/resolve-dispute', { escrowId, ...data }, { timeout: 90000 }), 2
  ),
  // Read operations
  getEscrowStatus: (escrowId) => api.get(`/escrow/${escrowId}`),
  getContractStats: () => api.get('/escrow/stats'),
  healthCheck: () => api.get('/escrow/health'),
};
// Utility functions untuk MetaMask integration
export const metaMaskUtils = {
  // Check if MetaMask is installed
  isMetaMaskInstalled: () => {
    return typeof window.ethereum !== 'undefined';
  },
  // Connect to MetaMask
  connectMetaMask: async () => {
    if (!window.ethereum) {
      throw new Error('MetaMask tidak terdeteksi');
    }
    try {
      const accounts = await window.ethereum.request({
        method: 'eth_requestAccounts'
      });
      return accounts[0];
    } catch (error) {
      throw new Error('Gagal menghubungkan ke MetaMask: ' + error.message);
    }
  },
  // Get current account
  getCurrentAccount: async () => {
    if (!window.ethereum) {
      return null;
    }
    try {
      const accounts = await window.ethereum.request({
        method: 'eth_accounts'
      });
      return accounts[0] || null;
    } catch (error) {
      console.error('Error getting current account:', error);
      return null;
    }
  },
  // Get account balance
  getBalance: async (address) => {
    if (!window.ethereum) {
      throw new Error('MetaMask tidak terdeteksi');
    }
    try {
      const balance = await window.ethereum.request({
        method: 'eth_getBalance',
        params: [address, 'latest']
      });
      // Convert from wei to ETH
      const balanceInEth = parseInt(balance, 16) / Math.pow(10, 18);
      return balanceInEth.toFixed(4);
    } catch (error) {
      throw new Error('Gagal mendapatkan saldo: ' + error.message);
    }
  },
  // Send transaction using MetaMask
  sendTransaction: async (transactionData) => {
    if (!window.ethereum) {
      throw new Error('MetaMask tidak terdeteksi');
    }
    try {
      const txHash = await window.ethereum.request({
        method: 'eth_sendTransaction',
        params: [{
          from: transactionData.from,
          to: transactionData.to,
          value: '0x' + BigInt(transactionData.value).toString(16),
          data: transactionData.data,
          gas: '0x' + BigInt(transactionData.gasLimit).toString(16)
        }]
      });
      return txHash;
    } catch (error) {
      console.error('❌ Transaction failed:', error);
      // Handle user rejection
      if (error.code === 4001) {
        throw new Error('Transaksi dibatalkan oleh user');
      }
      // Handle insufficient funds
      if (error.message.includes('insufficient funds')) {
        throw new Error('Saldo tidak mencukupi untuk transaksi ini');
      }
      // Handle gas estimation errors
      if (error.message.includes('gas')) {
        throw new Error('Estimasi gas gagal. Pastikan parameter transaksi benar.');
      }
      throw new Error('Transaksi gagal: ' + error.message);
    }
  },
  // Wait for transaction confirmation
  waitForTransaction: async (txHash, confirmations = 1) => {
    if (!window.ethereum) {
      throw new Error('MetaMask tidak terdeteksi');
    }
    let receipt = null;
    let attempts = 0;
    const maxAttempts = 60; // 5 minutes with 5 second intervals
    while (!receipt && attempts < maxAttempts) {
      try {
        receipt = await window.ethereum.request({
          method: 'eth_getTransactionReceipt',
          params: [txHash]
        });
        if (receipt) {
          return receipt;
        }
        // Wait 5 seconds before next attempt
        await new Promise(resolve => setTimeout(resolve, 5000));
        attempts++;
        if (attempts % 6 === 0) { // Log every 30 seconds
        }
      } catch (error) {
        console.error('Error checking transaction receipt:', error);
        await new Promise(resolve => setTimeout(resolve, 5000));
        attempts++;
      }
    }
    if (!receipt) {
      throw new Error('Timeout waiting for transaction confirmation');
    }
    return receipt;
  },
  // Switch to correct network (Sepolia testnet)
  switchToSepolia: async () => {
    if (!window.ethereum) {
      throw new Error('MetaMask tidak terdeteksi');
    }
    try {
      await window.ethereum.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: '0xaa36a7' }], // Sepolia testnet
      });
    } catch (switchError) {
      // This error code indicates that the chain has not been added to MetaMask
      if (switchError.code === 4902) {
        try {
          await window.ethereum.request({
            method: 'wallet_addEthereumChain',
            params: [{
              chainId: '0xaa36a7',
              chainName: 'Sepolia Test Network',
              nativeCurrency: {
                name: 'ETH',
                symbol: 'ETH',
                decimals: 18,
              },
              rpcUrls: ['https://sepolia.infura.io/v3/'],
              blockExplorerUrls: ['https://sepolia.etherscan.io/'],
            }],
          });
        } catch (addError) {
          throw new Error('Gagal menambahkan Sepolia network: ' + addError.message);
        }
      } else {
        throw new Error('Gagal switch ke Sepolia network: ' + switchError.message);
      }
    }
  }
};
export default smartContractAPI;
