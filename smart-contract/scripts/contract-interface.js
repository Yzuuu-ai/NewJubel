const { ethers } = require("ethers");
require("dotenv").config();
class EscrowContract {
  constructor() {
    this.contractAddress = process.env.ESCROW_CONTRACT_ADDRESS;
    this.privateKey = process.env.PRIVATE_KEY;
    this.rpcUrl = process.env.SEPOLIA_RPC_URL;
    // Initialize provider and wallet
    this.provider = new ethers.JsonRpcProvider(this.rpcUrl);
    this.wallet = new ethers.Wallet(this.privateKey, this.provider);
    // Contract ABI (essential functions only)
    this.contractABI = [
      "function createEscrow(address _seller, string memory _productCode) external payable returns (uint256)",
      "function confirmReceived(uint256 _escrowId) external",
      "function createDispute(uint256 _escrowId) external",
      "function resolveDispute(uint256 _escrowId, address _winner) external",
      "function timeoutRefund(uint256 _escrowId) external",
      "function getEscrow(uint256 _escrowId) external view returns (tuple(uint256 escrowId, address buyer, address seller, uint256 amount, uint8 status, uint256 createdAt, uint256 timeoutAt, bool disputeActive, address disputeInitiator, string productCode))",
      "function escrowCounter() external view returns (uint256)",
      "function getContractBalance() external view returns (uint256)",
      "function owner() external view returns (address)",
      "function addAdmin(address _admin) external",
      "event EscrowCreated(uint256 indexed escrowId, address indexed buyer, address indexed seller, uint256 amount)",
      "event PaymentReleased(uint256 indexed escrowId, address indexed seller, uint256 amount)",
      "event PaymentRefunded(uint256 indexed escrowId, address indexed buyer, uint256 amount)",
      "event DisputeCreated(uint256 indexed escrowId, address indexed initiator)",
      "event DisputeResolved(uint256 indexed escrowId, address indexed winner, uint256 amount)"
    ];
    // Initialize contract instance
    this.contract = new ethers.Contract(this.contractAddress, this.contractABI, this.wallet);
  }
  /**
   * Create a new escrow
   * @param {string} buyerPrivateKey - Buyer's private key
   * @param {string} sellerAddress - Seller's wallet address
   * @param {string} productCode - Product code from database
   * @param {string} amountInEth - Amount in ETH (e.g., "0.01")
   * @returns {Object} Transaction result with escrow ID
   */
  async createEscrow(buyerPrivateKey, sellerAddress, productCode, amountInEth) {
    try {
      // Create buyer wallet
      const buyerWallet = new ethers.Wallet(buyerPrivateKey, this.provider);
      const buyerContract = this.contract.connect(buyerWallet);
      // Convert amount to wei
      const amountWei = ethers.parseEther(amountInEth);
      // Create escrow transaction
      const tx = await buyerContract.createEscrow(sellerAddress, productCode, {
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
  /**
   * Buyer confirms receipt and releases payment to seller
   * @param {string} buyerPrivateKey - Buyer's private key
   * @param {number} escrowId - Escrow ID
   * @returns {Object} Transaction result
   */
  async confirmReceived(buyerPrivateKey, escrowId) {
    try {
      const buyerWallet = new ethers.Wallet(buyerPrivateKey, this.provider);
      const buyerContract = this.contract.connect(buyerWallet);
      const tx = await buyerContract.confirmReceived(escrowId, {
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
  /**
   * Create a dispute
   * @param {string} userPrivateKey - User's private key (buyer or seller)
   * @param {number} escrowId - Escrow ID
   * @returns {Object} Transaction result
   */
  async createDispute(userPrivateKey, escrowId) {
    try {
      const userWallet = new ethers.Wallet(userPrivateKey, this.provider);
      const userContract = this.contract.connect(userWallet);
      const tx = await userContract.createDispute(escrowId, {
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
  /**
   * Admin resolves dispute
   * @param {number} escrowId - Escrow ID
   * @param {string} winnerAddress - Winner's address (buyer or seller)
   * @returns {Object} Transaction result
   */
  async resolveDispute(escrowId, winnerAddress) {
    try {
      const tx = await this.contract.resolveDispute(escrowId, winnerAddress, {
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
      console.error('Error resolving dispute:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }
  /**
   * Get escrow details
   * @param {number} escrowId - Escrow ID
   * @returns {Object} Escrow data
   */
  async getEscrow(escrowId) {
    try {
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
          createdAt: new Date(Number(escrowData.createdAt) * 1000),
          timeoutAt: new Date(Number(escrowData.timeoutAt) * 1000),
          disputeActive: escrowData.disputeActive,
          disputeInitiator: escrowData.disputeInitiator,
          productCode: escrowData.productCode
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
  /**
   * Get contract statistics
   * @returns {Object} Contract stats
   */
  async getContractStats() {
    try {
      const escrowCounter = await this.contract.escrowCounter();
      const contractBalance = await this.contract.getContractBalance();
      const owner = await this.contract.owner();
      return {
        success: true,
        data: {
          totalEscrows: escrowCounter.toString(),
          contractBalance: ethers.formatEther(contractBalance),
          owner: owner
        }
      };
    } catch (error) {
      console.error('Error getting contract stats:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }
  /**
   * Convert status code to readable name
   * @param {number} statusCode - Status code from contract
   * @returns {string} Status name
   */
  getStatusName(statusCode) {
    const statuses = {
      0: 'CREATED',
      1: 'FUNDED',
      2: 'COMPLETED',
      3: 'DISPUTED',
      4: 'REFUNDED',
      5: 'CANCELLED'
    };
    return statuses[statusCode] || 'UNKNOWN';
  }
  /**
   * Listen for contract events
   * @param {Function} callback - Callback function for events
   */
  listenForEvents(callback) {
    // Listen for EscrowCreated events
    this.contract.on('EscrowCreated', (escrowId, buyer, seller, amount, event) => {
      callback({
        type: 'EscrowCreated',
        escrowId: escrowId.toString(),
        buyer,
        seller,
        amount: ethers.formatEther(amount),
        transactionHash: event.transactionHash
      });
    });
    // Listen for PaymentReleased events
    this.contract.on('PaymentReleased', (escrowId, seller, amount, event) => {
      callback({
        type: 'PaymentReleased',
        escrowId: escrowId.toString(),
        seller,
        amount: ethers.formatEther(amount),
        transactionHash: event.transactionHash
      });
    });
    // Listen for DisputeCreated events
    this.contract.on('DisputeCreated', (escrowId, initiator, event) => {
      callback({
        type: 'DisputeCreated',
        escrowId: escrowId.toString(),
        initiator,
        transactionHash: event.transactionHash
      });
    });
  }
}
module.exports = EscrowContract;
