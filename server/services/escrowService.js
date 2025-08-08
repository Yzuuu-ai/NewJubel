const { ethers } = require('ethers');
require('dotenv').config();
// Escrow Contract ABI
const ESCROW_ABI = [
  "function createEscrow(address _seller, string memory _productCode) external payable returns (uint256)",
  "function confirmReceived(uint256 _escrowId) external",
  "function createDispute(uint256 _escrowId) external",
  "function adminCreateDispute(uint256 _escrowId, string memory _reason) external",
  "function adminReleaseFunds(uint256 _escrowId, string memory _reason) external",
  "function adminRefund(uint256 _escrowId, string memory _reason) external",
  "function resolveDispute(uint256 _escrowId, address _winner) external",
  "function escrows(uint256) external view returns (uint256 escrowId, address buyer, address seller, uint256 amount, uint8 status, uint256 createdAt, uint256 timeoutAt, bool disputeActive, address disputeInitiator, string productCode, address processedBy, uint256 processedAt, string adminNote)",
  "function getEscrow(uint256 _escrowId) external view returns (tuple(uint256 escrowId, address buyer, address seller, uint256 amount, uint8 status, uint256 createdAt, uint256 timeoutAt, bool disputeActive, address disputeInitiator, string productCode, address processedBy, uint256 processedAt, string adminNote))",
  "function escrowCounter() external view returns (uint256)",
  "function owner() external view returns (address)",
  "function isAdmin(address _address) external view returns (bool)",
  "function getContractStats() external view returns (uint256 totalEscrows, uint256 totalAdminProcessed, uint256 contractBalance)",
  "event EscrowCreated(uint256 indexed escrowId, address indexed buyer, address indexed seller, uint256 amount)",
  "event PaymentDeposited(uint256 indexed escrowId, address indexed buyer, uint256 amount)",
  "event PaymentReleased(uint256 indexed escrowId, address indexed seller, uint256 amount)",
  "event PaymentRefunded(uint256 indexed escrowId, address indexed buyer, uint256 amount)",
  "event DisputeCreated(uint256 indexed escrowId, address indexed initiator)",
  "event DisputeResolved(uint256 indexed escrowId, address indexed winner, uint256 amount)",
  "event AdminPaymentProcessed(uint256 indexed escrowId, address indexed admin, uint256 amount, string reason)",
  "event AdminRefundProcessed(uint256 indexed escrowId, address indexed admin, uint256 amount, string reason)"
];
class EscrowService {
  constructor() {
    // Multiple RPC providers untuk load balancing
    this.providers = this.createMultipleProviders();
    this.currentProviderIndex = 0;
    this.adminWallet = new ethers.Wallet(process.env.PRIVATE_KEY, this.getCurrentProvider());
    this.contractAddress = process.env.SMART_CONTRACT_ADDRESS;
    this.contract = new ethers.Contract(this.contractAddress, ESCROW_ABI, this.getCurrentProvider());
    this.adminContract = new ethers.Contract(this.contractAddress, ESCROW_ABI, this.adminWallet);
  }
  createMultipleProviders() {
    const providers = [];
    // Primary Infura
    if (process.env.RPC_URL) {
      providers.push(new ethers.JsonRpcProvider(process.env.RPC_URL));
    }
    // Backup providers
    providers.push(
      new ethers.JsonRpcProvider('https://eth-sepolia.g.alchemy.com/v2/demo'),
      new ethers.JsonRpcProvider('https://rpc.ankr.com/eth_sepolia'),
      new ethers.JsonRpcProvider('https://sepolia.rpc.thirdweb.com')
    );
    return providers.filter(p => p);
  }
  getCurrentProvider() {
    return this.providers[this.currentProviderIndex % this.providers.length];
  }
  async switchToNextProvider() {
    this.currentProviderIndex = (this.currentProviderIndex + 1) % this.providers.length;
    const newProvider = this.getCurrentProvider();
    this.contract = new ethers.Contract(this.contractAddress, ESCROW_ABI, newProvider);
    this.adminWallet = new ethers.Wallet(process.env.PRIVATE_KEY, newProvider);
    this.adminContract = new ethers.Contract(this.contractAddress, ESCROW_ABI, this.adminWallet);
  }
  async executeWithRetry(operation, maxRetries = 3) {
    let lastError;
    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error;
        if (error.message.includes('Too Many Requests') || 
            error.message.includes('rate limit') ||
            error.code === -32005) {
          await this.switchToNextProvider();
          await new Promise(resolve => setTimeout(resolve, 1000 * (attempt + 1)));
          continue;
        }
        throw error;
      }
    }
    throw lastError;
  }
  async prepareEscrowTransaction(sellerAddress, produkId, amount, buyerAddress) {
    return this.executeWithRetry(async () => {
      // Validasi addresses
      const normalizedSellerAddress = ethers.getAddress(sellerAddress.toLowerCase());
      const normalizedBuyerAddress = ethers.getAddress(buyerAddress.toLowerCase());
      // Validasi amount
      const amountWei = ethers.parseEther(amount.toString());
      // Estimate gas
      let gasEstimate;
      try {
        const tempWallet = new ethers.Wallet(ethers.Wallet.createRandom().privateKey, this.getCurrentProvider());
        const tempContract = new ethers.Contract(this.contractAddress, ESCROW_ABI, tempWallet);
        gasEstimate = await tempContract.createEscrow.estimateGas(
          normalizedSellerAddress,
          produkId,
          { value: amountWei }
        ).catch(() => 300000n);
      } catch (gasError) {
        gasEstimate = 300000n;
      }
      // Prepare transaction data untuk client
      const transactionData = {
        to: this.contractAddress,
        value: amountWei.toString(),
        data: this.contract.interface.encodeFunctionData('createEscrow', [
          normalizedSellerAddress,
          produkId
        ]),
        gasLimit: (gasEstimate * 130n / 100n).toString(),
        from: normalizedBuyerAddress
      };
      return {
        success: true,
        transactionData,
        contractAddress: this.contractAddress,
        method: 'createEscrow',
        parameters: {
          sellerAddress: normalizedSellerAddress,
          productCode: produkId,
          amount: amount,
          buyerAddress: normalizedBuyerAddress
        },
        gasEstimate: gasEstimate.toString(),
        amountWei: amountWei.toString(),
        note: 'This transaction must be signed by the buyer using MetaMask'
      };
    });
  }
  async verifyAndProcessUserTransaction(transactionHash, buyerAddress, sellerAddress, produkId, expectedAmount) {
    return this.executeWithRetry(async () => {
      // Wait for transaction receipt
      const receipt = await this.getCurrentProvider().waitForTransaction(transactionHash, 1, 180000);
      if (!receipt) {
        throw new Error('Transaction not found or not confirmed');
      }
      if (receipt.status !== 1) {
        throw new Error('Transaction failed on blockchain');
      }
      // Validasi transaction details
      const transaction = await this.getCurrentProvider().getTransaction(transactionHash);
      // Validasi contract address
      if (transaction.to.toLowerCase() !== this.contractAddress.toLowerCase()) {
        throw new Error('Transaction not sent to correct contract address');
      }
      // Validasi sender (buyer)
      if (transaction.from.toLowerCase() !== buyerAddress.toLowerCase()) {
        throw new Error('Transaction not sent from expected buyer address');
      }
      // Validasi amount
      const expectedAmountWei = ethers.parseEther(expectedAmount.toString());
      if (transaction.value.toString() !== expectedAmountWei.toString()) {
        throw new Error(`Amount mismatch. Expected: ${expectedAmount} ETH, Got: ${ethers.formatEther(transaction.value)} ETH`);
      }
      // Extract escrowId from events
      let escrowId = null;
      for (const log of receipt.logs) {
        try {
          const parsedLog = this.contract.interface.parseLog(log);
          if (parsedLog.name === 'EscrowCreated') {
            escrowId = parsedLog.args.escrowId.toString();
            break;
          }
        } catch (e) {
          continue;
        }
      }
      // Jika tidak bisa mendapatkan escrowId dari event, coba ambil dari contract
      if (!escrowId) {
        try {
          const escrowCounter = await this.contract.escrowCounter();
          escrowId = escrowCounter.toString();
        } catch (counterError) {
          console.error('❌ Failed to get escrow counter:', counterError);
          escrowId = 'pending';
        }
      }
      return {
        success: true,
        verified: true,
        escrowId: escrowId,
        transactionHash: transactionHash,
        blockNumber: receipt.blockNumber,
        gasUsed: receipt.gasUsed.toString(),
        amount: expectedAmount,
        buyerAddress: buyerAddress,
        sellerAddress: sellerAddress,
        productCode: produkId
      };
    });
  }
  async getEscrow(escrowId) {
    return this.executeWithRetry(async () => {
      const escrowData = await this.contract.getEscrow(escrowId);
      return {
        success: true,
        data: {
          escrowId: escrowData.escrowId.toString(),
          buyer: escrowData.buyer,
          seller: escrowData.seller,
          amount: ethers.formatEther(escrowData.amount),
          status: escrowData.status,
          createdAt: new Date(Number(escrowData.createdAt) * 1000),
          timeoutAt: new Date(Number(escrowData.timeoutAt) * 1000),
          disputeActive: escrowData.disputeActive,
          disputeInitiator: escrowData.disputeInitiator,
          productCode: escrowData.productCode,
          processedBy: escrowData.processedBy,
          processedAt: escrowData.processedAt ? new Date(Number(escrowData.processedAt) * 1000) : null,
          adminNote: escrowData.adminNote
        }
      };
    });
  }
  async confirmReceivedByAdmin(escrowId, sellerAddress, reason = "Admin approved transaction") {
    return this.executeWithRetry(async () => {
      // Check escrow status first using getEscrow
      const escrowData = await this.contract.getEscrow(escrowId);
      // Validasi alamat penjual
      if (escrowData.seller.toLowerCase() !== sellerAddress.toLowerCase()) {
        throw new Error(`Seller address mismatch. Expected: ${escrowData.seller}, Got: ${sellerAddress}`);
      }
      if (escrowData.status === 3) { // 3 = DISPUTED
        // If already disputed, resolve it
        const tx = await this.adminContract.resolveDispute(escrowId, sellerAddress);
        const receipt = await tx.wait();
        return {
          success: true,
          transactionHash: tx.hash,
          blockNumber: receipt.blockNumber,
          gasUsed: receipt.gasUsed.toString(),
          recipient: sellerAddress,
          method: 'resolveDispute'
        };
      } else if (escrowData.status === 1) { // 1 = FUNDED
        // Use adminReleaseFunds for Escrow
        const tx = await this.adminContract.adminReleaseFunds(escrowId, reason);
        const receipt = await tx.wait();
        return {
          success: true,
          transactionHash: tx.hash,
          blockNumber: receipt.blockNumber,
          gasUsed: receipt.gasUsed.toString(),
          recipient: sellerAddress,
          method: 'adminReleaseFunds'
        };
      } else if (escrowData.status === 2) { // 2 = COMPLETED
        throw new Error('Escrow sudah selesai. Dana telah dilepas.');
      } else if (escrowData.status === 4) { // 4 = REFUNDED
        throw new Error('Escrow sudah di-refund. Tidak dapat melepas dana ke penjual.');
      } else {
        throw new Error(`Tidak dapat melepas dana. Status escrow: ${this.getStatusString(escrowData.status)}`);
      }
    });
  }
  async refundByAdmin(escrowId, buyerAddress, reason = "Admin approved refund") {
    return this.executeWithRetry(async () => {
      const tx = await this.adminContract.adminRefund(escrowId, reason);
      const receipt = await tx.wait();
      return {
        success: true,
        transactionHash: tx.hash,
        blockNumber: receipt.blockNumber,
        gasUsed: receipt.gasUsed.toString(),
        recipient: buyerAddress,
        method: 'adminRefund'
      };
    });
  }
  async createDisputeByAdmin(escrowId, reason) {
    return this.executeWithRetry(async () => {
      const tx = await this.adminContract.adminCreateDispute(escrowId, reason);
      const receipt = await tx.wait();
      return {
        success: true,
        transactionHash: tx.hash,
        blockNumber: receipt.blockNumber,
        gasUsed: receipt.gasUsed.toString()
      };
    });
  }
  async resolveDispute(escrowId, winnerAddress, reason = "Admin dispute resolution") {
    return this.executeWithRetry(async () => {
      // First, check escrow status
      const escrowData = await this.contract.getEscrow(escrowId);
      // If no dispute is active, create one first
      if (!escrowData.disputeActive && escrowData.status === 1) { // 1 = FUNDED
        try {
          const createDisputeTx = await this.adminContract.adminCreateDispute(escrowId, reason);
          await createDisputeTx.wait();
          // Wait a moment for the state to update
          await new Promise(resolve => setTimeout(resolve, 2000));
        } catch (createError) {
          console.error('  ❌ Failed to create dispute:', createError);
          throw new Error(`Failed to create dispute: ${createError.message}`);
        }
      }
      // Now resolve the dispute
      const tx = await this.adminContract.resolveDispute(escrowId, winnerAddress);
      const receipt = await tx.wait();
      return {
        success: true,
        transactionHash: tx.hash,
        blockNumber: receipt.blockNumber,
        gasUsed: receipt.gasUsed.toString(),
        winner: winnerAddress,
        method: 'resolveDispute'
      };
    });
  }
  async adminReleaseFunds(escrowId, reason) {
    return this.executeWithRetry(async () => {
      const tx = await this.adminContract.adminReleaseFunds(escrowId, reason);
      const receipt = await tx.wait();
      return {
        success: true,
        transactionHash: tx.hash,
        blockNumber: receipt.blockNumber,
        gasUsed: receipt.gasUsed.toString(),
        method: 'adminReleaseFunds'
      };
    });
  }
  async adminRefund(escrowId, reason) {
    return this.executeWithRetry(async () => {
      const tx = await this.adminContract.adminRefund(escrowId, reason);
      const receipt = await tx.wait();
      return {
        success: true,
        transactionHash: tx.hash,
        blockNumber: receipt.blockNumber,
        gasUsed: receipt.gasUsed.toString(),
        method: 'adminRefund'
      };
    });
  }

    getStatusString(status) {
    const statusMap = {
      0: 'CREATED',
      1: 'FUNDED',
      2: 'COMPLETED', 
      3: 'DISPUTED',
      4: 'REFUNDED',
      5: 'CANCELLED',
      6: 'ADMIN_PROCESSED'
    };
    return statusMap[status] || 'UNKNOWN';
  }
}
module.exports = EscrowService;
