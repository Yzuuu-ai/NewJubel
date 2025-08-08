import { ethers } from 'ethers';
import { smartContractAPI } from './api';
import { toast } from 'react-hot-toast';
import EscrowABI from '../abi/Escrow.json';
// Smart Contract Configuration (Escrow)
const CONTRACT_ADDRESS = process.env.REACT_APP_CONTRACT_ADDRESS || '0x2100b2dEF2B3d7Dc4B29f8D297C9AA283b74b1f6';
const NETWORK_NAME = process.env.REACT_APP_NETWORK || 'sepolia';
const CHAIN_ID = parseInt(process.env.REACT_APP_CHAIN_ID || '11155111');
class EscrowService {
  constructor() {
    this.provider = null;
    this.signer = null;
    this.contract = null;
    this.account = null;
  }
  // Check if MetaMask is installed
  isMetaMaskInstalled() {
    return typeof window !== 'undefined' && typeof window.ethereum !== 'undefined';
  }
  // Initialize MetaMask connection
  async initializeWallet() {
    try {
      if (!this.isMetaMaskInstalled()) {
        throw new Error('MetaMask is not installed. Please install MetaMask to continue.');
      }
      // Setup provider and signer
      this.provider = new ethers.BrowserProvider(window.ethereum);
      this.signer = await this.provider.getSigner();
      this.account = await this.signer.getAddress();
      // Setup Escrow contract
      this.contract = new ethers.Contract(CONTRACT_ADDRESS, EscrowABI, this.signer);
      // Check network
      await this.checkNetwork();
      return {
        success: true,
        account: this.account
      };
    } catch (error) {
      console.error('Error initializing wallet:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }
  // Check if connected to correct network
  async checkNetwork() {
    try {
      const network = await this.provider.getNetwork();
      const chainId = Number(network.chainId);
      if (chainId !== CHAIN_ID) {
        // Request network switch
        await window.ethereum.request({
          method: 'wallet_switchEthereumChain',
          params: [{ chainId: `0x${CHAIN_ID.toString(16)}` }],
        });
      }
      return true;
    } catch (error) {
      if (error.code === 4902) {
        // Network not added to MetaMask
        await this.addSepoliaNetwork();
      } else {
        throw error;
      }
    }
  }
  // Add Sepolia network to MetaMask
  async addSepoliaNetwork() {
    try {
      await window.ethereum.request({
        method: 'wallet_addEthereumChain',
        params: [
          {
            chainId: `0x${CHAIN_ID.toString(16)}`,
            chainName: 'Sepolia Testnet',
            nativeCurrency: {
              name: 'Ethereum',
              symbol: 'ETH',
              decimals: 18,
            },
            rpcUrls: ['https://sepolia.infura.io/v3/96f08bb9b5ba41bda7d5999a33d2d523'],
            blockExplorerUrls: ['https://sepolia.etherscan.io/'],
          },
        ],
      });
    } catch (error) {
      throw new Error('Failed to add Sepolia network to MetaMask');
    }
  }
  /**
   * Confirm Receipt - Escrow Flow
   */
  async confirmReceived(escrowId, buyerAddress) {
    try {
      // Step 1: Get preparation data from server
      toast.loading('Preparing confirmation data...', { id: 'confirm-prep' });
      const prepResponse = await smartContractAPI.confirmReceived(escrowId, buyerAddress);
      if (!prepResponse.data.success) {
        toast.error(prepResponse.data.message, { id: 'confirm-prep' });
        return {
          success: false,
          error: prepResponse.data.message
        };
      }
      toast.success('Data prepared. Please confirm in your wallet.', { id: 'confirm-prep' });
      // Step 2: Initialize wallet and sign transaction
      const walletInit = await this.initializeWallet();
      if (!walletInit.success) {
        toast.error(walletInit.error);
        return walletInit;
      }
      // Verify user is the correct buyer
      if (this.account.toLowerCase() !== buyerAddress.toLowerCase()) {
        const error = `Wrong wallet connected. Expected: ${buyerAddress}, Connected: ${this.account}`;
        toast.error(error);
        return {
          success: false,
          error: error
        };
      }
      toast.loading('Please confirm transaction in MetaMask...', { id: 'confirm-tx' });
      // Step 3: Execute Escrow blockchain transaction
      const tx = await this.contract.confirmReceived(escrowId, {
        gasLimit: 200000
      });
      toast.loading('Transaction sent. Waiting for confirmation...', { id: 'confirm-tx' });
      const receipt = await tx.wait();
      toast.success('Transaction confirmed on blockchain!', { id: 'confirm-tx' });
      // Step 4: Send callback to server
      toast.loading('Updating database...', { id: 'confirm-callback' });
      try {
        await smartContractAPI.confirmReceivedCallback({
          escrowId: escrowId,
          transactionHash: tx.hash,
          buyerAddress: buyerAddress
        });
        toast.success('Receipt confirmation completed successfully!', { id: 'confirm-callback' });
      } catch (callbackError) {
        console.error('Callback error:', callbackError);
        toast.error('Transaction successful but database update failed. Please contact support.', { id: 'confirm-callback' });
      }
      return {
        success: true,
        transactionHash: tx.hash,
        blockNumber: receipt.blockNumber,
        gasUsed: receipt.gasUsed.toString()
      };
    } catch (error) {
      console.error('Error in confirmReceived:', error);
      // Handle user rejection
      if (error.code === 4001) {
        toast.error('Transaction rejected by user');
        return {
          success: false,
          error: 'Transaction rejected by user'
        };
      }
      // Handle insufficient funds
      if (error.code === 'INSUFFICIENT_FUNDS') {
        toast.error('Insufficient funds for gas fee');
        return {
          success: false,
          error: 'Insufficient funds for gas fee'
        };
      }
      toast.error('Failed to confirm receipt: ' + error.message);
      return {
        success: false,
        error: error.message
      };
    }
  }
  /**
   * Create Dispute - Escrow Flow
   */
  async createDispute(escrowId, initiatorAddress, reason) {
    try {
      // Step 1: Get preparation data from server
      toast.loading('Preparing dispute data...', { id: 'dispute-prep' });
      const prepResponse = await smartContractAPI.createDispute(escrowId, {
        initiatorAddress: initiatorAddress,
        reason: reason
      });
      if (!prepResponse.data.success) {
        toast.error(prepResponse.data.message, { id: 'dispute-prep' });
        return {
          success: false,
          error: prepResponse.data.message
        };
      }
      toast.success('Data prepared. Please confirm in your wallet.', { id: 'dispute-prep' });
      // Step 2: Initialize wallet and sign transaction
      const walletInit = await this.initializeWallet();
      if (!walletInit.success) {
        toast.error(walletInit.error);
        return walletInit;
      }
      // Verify user is the correct initiator
      if (this.account.toLowerCase() !== initiatorAddress.toLowerCase()) {
        const error = `Wrong wallet connected. Expected: ${initiatorAddress}, Connected: ${this.account}`;
        toast.error(error);
        return {
          success: false,
          error: error
        };
      }
      toast.loading('Please confirm transaction in MetaMask...', { id: 'dispute-tx' });
      // Step 3: Execute Escrow blockchain transaction
      const tx = await this.contract.createDispute(escrowId, {
        gasLimit: 200000
      });
      toast.loading('Transaction sent. Waiting for confirmation...', { id: 'dispute-tx' });
      const receipt = await tx.wait();
      toast.success('Transaction confirmed on blockchain!', { id: 'dispute-tx' });
      // Step 4: Send callback to server
      toast.loading('Updating database...', { id: 'dispute-callback' });
      try {
        await smartContractAPI.createDisputeCallback({
          escrowId: escrowId,
          transactionHash: tx.hash,
          initiatorAddress: initiatorAddress,
          reason: reason
        });
        toast.success('Dispute created successfully!', { id: 'dispute-callback' });
      } catch (callbackError) {
        console.error('Callback error:', callbackError);
        toast.error('Transaction successful but database update failed. Please contact support.', { id: 'dispute-callback' });
      }
      return {
        success: true,
        transactionHash: tx.hash,
        blockNumber: receipt.blockNumber,
        gasUsed: receipt.gasUsed.toString()
      };
    } catch (error) {
      console.error('Error in createDispute:', error);
      // Handle user rejection
      if (error.code === 4001) {
        toast.error('Transaction rejected by user');
        return {
          success: false,
          error: 'Transaction rejected by user'
        };
      }
      // Handle insufficient funds
      if (error.code === 'INSUFFICIENT_FUNDS') {
        toast.error('Insufficient funds for gas fee');
        return {
          success: false,
          error: 'Insufficient funds for gas fee'
        };
      }
      toast.error('Failed to create dispute: ' + error.message);
      return {
        success: false,
        error: error.message
      };
    }
  }
  /**
   * Get current connected account
   */
  async getCurrentAccount() {
    try {
      if (!this.provider) {
        await this.initializeWallet();
      }
      return this.account;
    } catch (error) {
      console.error('Error getting current account:', error);
      return null;
    }
  }
  /**
   * Check if user can perform action (is buyer or seller)
   */
  async canPerformAction(escrowId, userAddress, action) {
    try {
      // Get escrow details from server
      const escrowResponse = await smartContractAPI.getEscrowStatus(escrowId);
      if (!escrowResponse.data.success) {
        return {
          canPerform: false,
          reason: 'Escrow not found'
        };
      }
      const escrowData = escrowResponse.data.data;
      const userAddr = userAddress.toLowerCase();
      switch (action) {
        case 'confirm':
          return {
            canPerform: escrowData.buyer.toLowerCase() === userAddr,
            reason: escrowData.buyer.toLowerCase() === userAddr ? null : 'Only buyer can confirm receipt'
          };
        case 'dispute':
          const canDispute = 
            escrowData.buyer.toLowerCase() === userAddr || 
            escrowData.seller.toLowerCase() === userAddr;
          return {
            canPerform: canDispute,
            reason: canDispute ? null : 'Only buyer or seller can create dispute'
          };
        default:
          return {
            canPerform: false,
            reason: 'Unknown action'
          };
      }
    } catch (error) {
      console.error('Error checking permissions:', error);
      return {
        canPerform: false,
        reason: 'Error checking permissions'
      };
    }
  }
}
// Create singleton instance
const escrowService = new EscrowService();
export default escrowService;
