import React, { createContext, useContext, useState, useEffect } from 'react';
import { ethers } from 'ethers';
const Web3Context = createContext();
export const useWeb3 = () => {
  const context = useContext(Web3Context);
  if (!context) {
    throw new Error('useWeb3 must be used within a Web3Provider');
  }
  return context;
};
export const Web3Provider = ({ children }) => {
  const [account, setAccount] = useState(null);
  const [provider, setProvider] = useState(null);
  const [chainId, setChainId] = useState(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState(null);
  // Sepolia Testnet configuration
  const SEPOLIA_CHAIN_ID = '0xaa36a7'; // 11155111 in hex
  const SEPOLIA_CONFIG = {
    chainId: SEPOLIA_CHAIN_ID,
    chainName: 'Sepolia Test Network',
    nativeCurrency: {
      name: 'Sepolia ETH',
      symbol: 'SEP',
      decimals: 18,
    },
    rpcUrls: ['https://sepolia.infura.io/v3/YOUR_INFURA_KEY'],
    blockExplorerUrls: ['https://sepolia.etherscan.io/'],
  };
  useEffect(() => {
    checkConnection();
    setupEventListeners();
  }, []);
  const checkConnection = async () => {
    if (typeof window.ethereum !== 'undefined') {
      try {
        const provider = new ethers.BrowserProvider(window.ethereum);
        const accounts = await provider.listAccounts();
        if (accounts.length > 0) {
          setAccount(accounts[0].address);
          setProvider(provider);
          const network = await provider.getNetwork();
          setChainId(network.chainId.toString());
        }
      } catch (error) {
        console.error('Error checking connection:', error);
      }
    }
  };
  const setupEventListeners = () => {
    if (typeof window.ethereum !== 'undefined') {
      window.ethereum.on('accountsChanged', handleAccountsChanged);
      window.ethereum.on('chainChanged', handleChainChanged);
      window.ethereum.on('disconnect', handleDisconnect);
    }
  };
  const handleAccountsChanged = (accounts) => {
    if (accounts.length === 0) {
      setAccount(null);
      setProvider(null);
    } else {
      setAccount(accounts[0]);
    }
  };
  const handleChainChanged = (chainId) => {
    setChainId(parseInt(chainId, 16).toString());
    window.location.reload(); // Recommended by MetaMask
  };
  const handleDisconnect = () => {
    setAccount(null);
    setProvider(null);
    setChainId(null);
  };
  const connectWallet = async () => {
    if (typeof window.ethereum === 'undefined') {
      setError('MetaMask tidak terdeteksi. Silakan install MetaMask terlebih dahulu.');
      return false;
    }
    try {
      setIsConnecting(true);
      setError(null);
      // Request account access
      const accounts = await window.ethereum.request({
        method: 'eth_requestAccounts',
      });
      if (accounts.length === 0) {
        throw new Error('Tidak ada akun yang dipilih');
      }
      const provider = new ethers.BrowserProvider(window.ethereum);
      const network = await provider.getNetwork();
      setAccount(accounts[0]);
      setProvider(provider);
      setChainId(network.chainId.toString());
      // Check if on Sepolia network
      if (network.chainId.toString() !== '11155111') {
        await switchToSepolia();
      }
      return true;
    } catch (error) {
      console.error('Error connecting wallet:', error);
      setError(error.message);
      return false;
    } finally {
      setIsConnecting(false);
    }
  };
  const switchToSepolia = async () => {
    try {
      await window.ethereum.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: SEPOLIA_CHAIN_ID }],
      });
    } catch (switchError) {
      // This error code indicates that the chain has not been added to MetaMask
      if (switchError.code === 4902) {
        try {
          await window.ethereum.request({
            method: 'wallet_addEthereumChain',
            params: [SEPOLIA_CONFIG],
          });
        } catch (addError) {
          console.error('Error adding Sepolia network:', addError);
          throw new Error('Gagal menambahkan Sepolia network');
        }
      } else {
        console.error('Error switching to Sepolia:', switchError);
        throw new Error('Gagal switch ke Sepolia network');
      }
    }
  };
  const disconnectWallet = () => {
    setAccount(null);
    setProvider(null);
    setChainId(null);
    setError(null);
  };
  const getBalance = async (address = account) => {
    if (!provider || !address) return null;
    try {
      const balance = await provider.getBalance(address);
      return ethers.formatEther(balance);
    } catch (error) {
      console.error('Error getting balance:', error);
      return null;
    }
  };
  const isSepoliaNetwork = () => {
    return chainId === '11155111';
  };
  const getNetworkName = () => {
    switch (chainId) {
      case '1':
        return 'Ethereum Mainnet';
      case '11155111':
        return 'Sepolia Testnet';
      case '5':
        return 'Goerli Testnet';
      default:
        return 'Unknown Network';
    }
  };
  const value = {
    account,
    provider,
    chainId,
    isConnecting,
    error,
    connectWallet,
    disconnectWallet,
    switchToSepolia,
    getBalance,
    isSepoliaNetwork,
    getNetworkName,
    isConnected: !!account,
  };
  return (
    <Web3Context.Provider value={value}>
      {children}
    </Web3Context.Provider>
  );
};
export default Web3Context;
