import React, { createContext, useContext, useState, useEffect } from 'react';
import web3Service from '../layanan/web3';
import { useAuth } from './AuthContext';
import toast from 'react-hot-toast';
const WalletContext = createContext();
export const useWallet = () => {
  const context = useContext(WalletContext);
  if (!context) {
    throw new Error('useWallet must be used within a WalletProvider');
  }
  return context;
};
export const WalletProvider = ({ children }) => {
  const { user, updateProfile } = useAuth();
  const [isConnected, setIsConnected] = useState(false);
  const [account, setAccount] = useState(null);
  const [balance, setBalance] = useState('0');
  const [loading, setLoading] = useState(false);
  const [networkError, setNetworkError] = useState(null);
  // Check wallet connection on component mount
  useEffect(() => {
    checkWalletConnection();
    setupEventListeners();
  }, []);
  // Auto-validate wallet when user data changes
  useEffect(() => {
    if (user?.walletAddress && account) {
      validateWalletMatch();
    }
  }, [user, account]);
  // Update balance when account changes
  useEffect(() => {
    if (account) {
      updateBalance();
    }
  }, [account]);
  const checkWalletConnection = async () => {
    try {
      if (!web3Service.isMetaMaskInstalled()) {
        return;
      }
      const currentAccount = await web3Service.getCurrentAccount();
      if (currentAccount) {
        setAccount(currentAccount);
        setIsConnected(true);
        await updateBalance();
      }
    } catch (error) {
      console.error('Error checking wallet connection:', error);
    }
  };
  const connectWallet = async () => {
    try {
      setLoading(true);
      setNetworkError(null);
      // Check if MetaMask is installed
      if (!web3Service.isMetaMaskInstalled()) {
        const installMetaMask = window.confirm(
          'MetaMask tidak terdeteksi. Apakah Anda ingin menginstall MetaMask sekarang?'
        );
        if (installMetaMask) {
          window.open('https://metamask.io/download/', '_blank');
        }
        toast.error('MetaMask diperlukan untuk menghubungkan wallet');
        return { success: false, error: 'MetaMask not installed' };
      }
      // Show loading toast
      const loadingToast = toast.loading('Menghubungkan wallet... Periksa popup MetaMask');
      const result = await web3Service.connectWallet();
      // Dismiss loading toast
      toast.dismiss(loadingToast);
      if (result.success) {
        // VALIDASI KETAT: Cek apakah wallet sesuai dengan yang terdaftar
        if (user?.walletAddress) {
          if (result.account.toLowerCase() !== user.walletAddress.toLowerCase()) {
            // Wallet berbeda - TOLAK AKSES
            toast.error(
              `🚫 AKSES DITOLAK!\n\n` +
              `Wallet yang terhubung: ${result.account.slice(0, 6)}...${result.account.slice(-4)}\n` +
              `Wallet terdaftar: ${user.walletAddress.slice(0, 6)}...${user.walletAddress.slice(-4)}\n\n` +
              `Silakan ganti ke wallet yang benar di MetaMask!`,
              { duration: 6000 }
            );
            return { success: false, error: 'Wallet tidak sesuai dengan yang terdaftar' };
          }
          // Wallet sesuai - IZINKAN
          setAccount(result.account);
          setIsConnected(true);
          await updateBalance();
          toast.success(`✅ Wallet terverifikasi! ${result.account.slice(0, 6)}...${result.account.slice(-4)}`);
        } else {
          // User belum punya wallet terdaftar - ini untuk first time connect di profil
          setAccount(result.account);
          setIsConnected(true);
          await updateBalance();
          toast.success(`Wallet terhubung! ${result.account.slice(0, 6)}...${result.account.slice(-4)}`);
        }
        // TAMBAHAN: Panggil smart contract saat connect (OPSIONAL)
        try {
          await loadSmartContractData(result.account);
        } catch (contractError) {
          console.warn('Smart contract data loading failed (non-critical):', contractError);
        }
        return { success: true, address: result.account };
      } else {
        // Handle specific MetaMask errors
        let errorMessage = result.error || 'Gagal menghubungkan wallet';
        if (result.error && result.error.includes('User rejected')) {
          errorMessage = 'Koneksi wallet dibatalkan oleh pengguna';
        } else if (result.error && result.error.includes('Already processing')) {
          errorMessage = 'MetaMask sedang memproses permintaan lain';
        } else if (result.error && result.error.includes('No accounts found')) {
          errorMessage = 'Tidak ada akun ditemukan. Pastikan MetaMask sudah login';
        }
        toast.error(errorMessage);
        return { success: false, error: errorMessage };
      }
    } catch (error) {
      console.error('Error connecting wallet:', error);
      let errorMessage = 'Gagal menghubungkan wallet';
      if (error.message && error.message.includes('User rejected')) {
        errorMessage = 'Koneksi wallet dibatalkan';
      } else if (error.message && error.message.includes('MetaMask')) {
        errorMessage = 'Error MetaMask: ' + error.message;
      } else if (error.message) {
        errorMessage = error.message;
      }
      toast.error(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setLoading(false);
    }
  };
  const disconnectWallet = () => {
    web3Service.disconnect();
    setAccount(null);
    setIsConnected(false);
    setBalance('0');
    setNetworkError(null);
    toast.success('Wallet terputus');
  };
  const updateBalance = async () => {
    try {
      if (account) {
        const balance = await web3Service.getBalance(account);
        setBalance(balance);
      }
    } catch (error) {
      console.error('Error updating balance:', error);
    }
  };
  const linkWalletToProfile = async (walletAddress) => {
    try {
      const result = await updateProfile({
        alamatWallet: walletAddress
      });
      if (result.success) {
        toast.success('Wallet berhasil dikaitkan dengan akun!');
      } else {
        toast.error(result.error || 'Gagal mengaitkan wallet dengan akun');
      }
    } catch (error) {
      console.error('Error linking wallet to profile:', error);
      toast.error('Gagal mengaitkan wallet dengan akun');
    }
  };
  const setupEventListeners = () => {
    web3Service.setupEventListeners();
  };
  // Validasi apakah wallet yang terhubung sesuai dengan yang terdaftar
  const validateWalletMatch = () => {
    if (!user?.walletAddress || !account) return;
    if (account.toLowerCase() !== user.walletAddress.toLowerCase()) {
      // Wallet tidak sesuai - disconnect dan beri peringatan
      setIsConnected(false);
      setAccount(null);
      setBalance('0');
      toast.error(
        `🚫 Wallet Tidak Sesuai!\n\n` +
        `Wallet aktif: ${account.slice(0, 6)}...${account.slice(-4)}\n` +
        `Wallet terdaftar: ${user.walletAddress.slice(0, 6)}...${user.walletAddress.slice(-4)}\n\n` +
        `Silakan ganti ke wallet yang benar di MetaMask!`,
        { duration: 8000 }
      );
    }
  };
  // TAMBAHAN: Load data dari smart contract saat connect wallet
  const loadSmartContractData = async (walletAddress) => {
    try {
      // Contoh 1: Baca contract balance (GRATIS)
      const contractBalance = await web3Service.getBalance();
      toast.success('Data blockchain berhasil dimuat!');
    } catch (error) {
      console.error('Error loading smart contract data:', error);
      // Jangan tampilkan error ke user, karena ini opsional
    }
  };
  // Smart contract functions
  const createEscrow = async (sellerAddress, productCode, amountInEth) => {
    try {
      if (!isConnected) {
        toast.error('Silakan hubungkan wallet terlebih dahulu');
        return { success: false, error: 'Wallet not connected' };
      }
      setLoading(true);
      const result = await web3Service.createEscrow(sellerAddress, productCode, amountInEth);
      if (result.success) {
        toast.success('Escrow berhasil dibuat!');
        await updateBalance(); // Update balance after transaction
      } else {
        toast.error(result.error);
      }
      return result;
    } catch (error) {
      console.error('Error creating escrow:', error);
      toast.error('Gagal membuat escrow');
      return { success: false, error: error.message };
    } finally {
      setLoading(false);
    }
  };
  const confirmReceived = async (escrowId, buyerAddress) => {
    try {
      if (!isConnected) {
        toast.error('Silakan hubungkan wallet terlebih dahulu');
        return { success: false, error: 'Wallet not connected' };
      }
      // Validate that connected wallet matches buyer address
      if (account.toLowerCase() !== buyerAddress.toLowerCase()) {
        toast.error('Wallet yang terhubung bukan wallet pembeli yang benar');
        return { success: false, error: 'Wrong wallet connected' };
      }
      setLoading(true);
      // Import escrowService dynamically to avoid circular dependency
      const { default: escrowService } = await import('../layanan/escrowService');
      const result = await escrowService.confirmReceived(escrowId, buyerAddress);
      if (result.success) {
        await updateBalance(); // Update balance after transaction
      }
      return result;
    } catch (error) {
      console.error('Error confirming receipt:', error);
      return { success: false, error: error.message };
    } finally {
      setLoading(false);
    }
  };
  const createDispute = async (escrowId, initiatorAddress, reason) => {
    try {
      if (!isConnected) {
        toast.error('Silakan hubungkan wallet terlebih dahulu');
        return { success: false, error: 'Wallet not connected' };
      }
      // Validate that connected wallet matches initiator address
      if (account.toLowerCase() !== initiatorAddress.toLowerCase()) {
        toast.error('Wallet yang terhubung bukan wallet yang berhak membuat sengketa');
        return { success: false, error: 'Wrong wallet connected' };
      }
      setLoading(true);
      // Import escrowService dynamically to avoid circular dependency
      const { default: escrowService } = await import('../layanan/escrowService');
      const result = await escrowService.createDispute(escrowId, initiatorAddress, reason);
      return result;
    } catch (error) {
      console.error('Error creating dispute:', error);
      return { success: false, error: error.message };
    } finally {
      setLoading(false);
    }
  };
  const getEscrow = async (escrowId) => {
    try {
      const result = await web3Service.getEscrow(escrowId);
      return result;
    } catch (error) {
      console.error('Error getting escrow:', error);
      return { success: false, error: error.message };
    }
  };
  // Helper functions
  const formatBalance = (balance) => {
    return parseFloat(balance).toFixed(4);
  };
  const formatAddress = (address) => {
    if (!address) return '';
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };
  const isWalletLinked = () => {
    return user?.profile?.wallet === account;
  };
  const value = {
    // State
    isConnected,
    account,
    walletAddress: account, // Alias for account
    balance,
    loading,
    networkError,
    isConnecting: loading, // Alias for loading
    // Web3 provider and contract access - FIXED
    provider: web3Service.provider,
    contract: web3Service.contract,
    signer: web3Service.signer,
    // Functions
    connectWallet,
    disconnectWallet,
    updateBalance,
    linkWalletToProfile,
    // Smart contract functions
    createEscrow,
    confirmReceived,
    createDispute,
    getEscrow,
    // Helper functions
    formatBalance,
    formatAddress,
    isWalletLinked,
    validateWalletMatch,
    // Web3 service direct access
    web3Service,
  };
  return (
    <WalletContext.Provider value={value}>
      {children}
    </WalletContext.Provider>
  );
};
