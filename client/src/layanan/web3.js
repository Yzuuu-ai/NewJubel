import { ethers } from 'ethers';
import EscrowABI from '../abi/Escrow.json';
// Smart Contract Configuration (Escrow)
const CONTRACT_ADDRESS = process.env.REACT_APP_CONTRACT_ADDRESS || '0x2100b2dEF2B3d7Dc4B29f8D297C9AA283b74b1f6';
const NETWORK_NAME = process.env.REACT_APP_NETWORK || 'sepolia';
const CHAIN_ID = parseInt(process.env.REACT_APP_CHAIN_ID || '11155111');
const RPC_URL = process.env.REACT_APP_RPC_URL || 'https://sepolia.infura.io/v3/96f08bb9b5ba41bda7d5999a33d2d523';
console.log('🔒 Escrow Web3 Configuration:', {
  CONTRACT_ADDRESS,
  NETWORK_NAME,
  CHAIN_ID,
  RPC_URL: RPC_URL.substring(0, 50) + '...'
});
class Web3Service {
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
  // Connect to MetaMask
  async connectWallet() {
    try {
      if (!this.isMetaMaskInstalled()) {
        throw new Error('MetaMask is not installed. Please install MetaMask to continue.');
      }
      // Request account access
      const accounts = await window.ethereum.request({
        method: 'eth_requestAccounts',
      });
      if (accounts.length === 0) {
        throw new Error('No accounts found. Please connect your wallet.');
      }
      // Setup provider and signer
      this.provider = new ethers.BrowserProvider(window.ethereum);
      this.signer = await this.provider.getSigner();
      this.account = accounts[0];
      // Setup Escrow contract
      this.contract = new ethers.Contract(CONTRACT_ADDRESS, EscrowABI, this.signer);
      // Check network
      await this.checkNetwork();
      return {
        success: true,
        account: this.account,
        message: 'Wallet connected successfully'
      };
    } catch (error) {
      console.error('Error connecting wallet:', error);
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
      // Check if connected to correct network
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
            rpcUrls: [RPC_URL],
            blockExplorerUrls: ['https://sepolia.etherscan.io/'],
          },
        ],
      });
    } catch (error) {
      throw new Error('Failed to add Sepolia network to MetaMask');
    }
  }
  // PERBAIKAN: Get current account - deteksi wallet yang sudah terhubung
  async getCurrentAccount() {
    try {
      // PERBAIKAN: Cek wallet yang sudah terhubung tanpa memerlukan provider yang sudah diinisialisasi
      if (!this.isMetaMaskInstalled()) {
        return null;
      }

      // PERBAIKAN: Gunakan ethereum.request langsung untuk cek akun yang sudah terhubung
      const accounts = await window.ethereum.request({
        method: 'eth_accounts'
      });

      if (accounts && accounts.length > 0) {
        // PERBAIKAN: Jika ada akun terhubung, inisialisasi provider juga
        if (!this.provider) {
          this.provider = new ethers.BrowserProvider(window.ethereum);
          this.signer = await this.provider.getSigner();
          this.account = accounts[0];
          // Setup contract juga
          this.contract = new ethers.Contract(CONTRACT_ADDRESS, EscrowABI, this.signer);
        }
        return accounts[0];
      }

      return null;
    } catch (error) {
      console.error('Error getting current account:', error);
      return null;
    }
  }
  // Get account balance
  async getBalance(address = null) {
    try {
      if (!this.provider) {
        throw new Error('Provider not initialized');
      }
      const targetAddress = address || this.account;
      if (!targetAddress) {
        throw new Error('No address provided');
      }
      const balance = await this.provider.getBalance(targetAddress);
      return ethers.formatEther(balance);
    } catch (error) {
      console.error('Error getting balance:', error);
      throw error;
    }
  }
  // Create escrow transaction (Escrow)
  async createEscrow(sellerAddress, productCode, amountInEth) {
    try {
      if (!this.contract) {
        throw new Error('Contract not initialized. Please connect your wallet first.');
      }
      const amountWei = ethers.parseEther(amountInEth.toString());
      console.log('Creating Escrow:', {
        seller: sellerAddress,
        productCode: productCode,
        amount: amountInEth + ' ETH'
      });
      const tx = await this.contract.createEscrow(sellerAddress, productCode, {
        value: amountWei,
        gasLimit: 300000
      });
      const receipt = await tx.wait();
      // Extract escrow ID from events
      let escrowId = null;
      for (const log of receipt.logs) {
        try {
          const parsedLog = this.contract.interface.parseLog(log);
          if (parsedLog.name === 'EscrowCreated') {
            escrowId = parsedLog.args.escrowId.toString();
            break;
          }
        } catch (e) {
          // Skip unparseable logs
        }
      }
      return {
        success: true,
        escrowId: escrowId,
        transactionHash: tx.hash,
        blockNumber: receipt.blockNumber,
        gasUsed: receipt.gasUsed.toString()
      };
    } catch (error) {
      console.error('Error creating escrow:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }
  // Confirm receipt
  async confirmReceived(escrowId) {
    try {
      if (!this.contract) {
        throw new Error('Contract not initialized. Please connect your wallet first.');
      }
      const tx = await this.contract.confirmReceived(escrowId, {
        gasLimit: 200000
      });
      const receipt = await tx.wait();
      return {
        success: true,
        transactionHash: tx.hash,
        blockNumber: receipt.blockNumber,
        gasUsed: receipt.gasUsed.toString()
      };
    } catch (error) {
      console.error('Error confirming receipt:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }
  // Create dispute
  async createDispute(escrowId) {
    try {
      if (!this.contract) {
        throw new Error('Contract not initialized. Please connect your wallet first.');
      }
      const tx = await this.contract.createDispute(escrowId, {
        gasLimit: 200000
      });
      const receipt = await tx.wait();
      return {
        success: true,
        transactionHash: tx.hash,
        blockNumber: receipt.blockNumber,
        gasUsed: receipt.gasUsed.toString()
      };
    } catch (error) {
      console.error('Error creating dispute:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }
  // Get escrow details (Escrow)
  async getEscrow(escrowId) {
    try {
      if (!this.contract) {
        // Use read-only provider for viewing data
        const readProvider = new ethers.JsonRpcProvider(RPC_URL);
        const readContract = new ethers.Contract(CONTRACT_ADDRESS, EscrowABI, readProvider);
        const escrowData = await readContract.getEscrow(escrowId);
        return {
          success: true,
          data: {
            escrowId: escrowData.escrowId.toString(),
            buyer: escrowData.buyer,
            seller: escrowData.seller,
            amount: ethers.formatEther(escrowData.amount),
            status: this.getStatusName(escrowData.status),
            statusCode: escrowData.status,
            dibuatPada: new Date(Number(escrowData.createdAt) * 1000),
            timeoutAt: new Date(Number(escrowData.timeoutAt) * 1000),
            disputeActive: escrowData.disputeActive,
            disputeInitiator: escrowData.disputeInitiator,
            productCode: escrowData.productCode,
            processedBy: escrowData.processedBy,
            processedAt: escrowData.processedAt ? new Date(Number(escrowData.processedAt) * 1000) : null,
            adminNote: escrowData.adminNote
          }
        };
      }
      const escrowData = await this.contract.getEscrow(escrowId);
      return {
        success: true,
        data: {
          escrowId: escrowData.escrowId.toString(),
          buyer: escrowData.buyer,
          seller: escrowData.seller,
          amount: ethers.formatEther(escrowData.amount),
          status: this.getStatusName(escrowData.status),
          statusCode: escrowData.status,
          dibuatPada: new Date(Number(escrowData.createdAt) * 1000),
          timeoutAt: new Date(Number(escrowData.timeoutAt) * 1000),
          disputeActive: escrowData.disputeActive,
          disputeInitiator: escrowData.disputeInitiator,
          productCode: escrowData.productCode,
          processedBy: escrowData.processedBy,
          processedAt: escrowData.processedAt ? new Date(Number(escrowData.processedAt) * 1000) : null,
          adminNote: escrowData.adminNote
        }
      };
    } catch (error) {
      console.error('Error getting escrow:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }
  // Convert status code to readable name (Escrow)
  getStatusName(statusCode) {
    const statuses = {
      0: 'CREATED',
      1: 'FUNDED',
      2: 'COMPLETED',
      3: 'DISPUTED',
      4: 'REFUNDED',
      5: 'CANCELLED',
      6: 'ADMIN_PROCESSED'
    };
    return statuses[statusCode] || 'UNKNOWN';
  }
  // PERBAIKAN: Listen for account changes tanpa reload
  setupEventListeners() {
    if (!this.isMetaMaskInstalled()) return;
    
    // PERBAIKAN: Hapus listener lama untuk mencegah duplikasi
    if (window.ethereum.removeAllListeners) {
      window.ethereum.removeAllListeners('accountsChanged');
      window.ethereum.removeAllListeners('chainChanged');
    }
    
    window.ethereum.on('accountsChanged', (accounts) => {
      console.log('🔄 Account changed:', accounts);
      if (accounts.length === 0) {
        // User disconnected wallet
        this.disconnect();
        console.log('❌ Wallet disconnected');
      } else {
        // User switched account
        this.account = accounts[0];
        console.log('🔄 Account switched to:', accounts[0]);
        // PERBAIKAN: Dispatch custom event instead of reload
        window.dispatchEvent(new CustomEvent('walletAccountChanged', {
          detail: { account: accounts[0] }
        }));
      }
    });
    
    window.ethereum.on('chainChanged', (chainId) => {
      console.log('🔄 Chain changed:', chainId);
      // PERBAIKAN: Dispatch custom event instead of reload
      window.dispatchEvent(new CustomEvent('walletChainChanged', {
        detail: { chainId }
      }));
    });
  }
  // Disconnect wallet
  disconnect() {
    this.provider = null;
    this.signer = null;
    this.contract = null;
    this.account = null;
  }
}
// Create singleton instance
const web3Service = new Web3Service();
export default web3Service;
