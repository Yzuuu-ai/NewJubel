const EscrowService = require('../services/escrowService');
const { validationResult } = require('express-validator');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
// Helper functions untuk mapping
const getUserByWalletAddress = async (walletAddress) => {
  return await prisma.user.findUnique({
    where: { walletAddress: walletAddress.toLowerCase() },
    select: { id: true, email: true }
  });
};
const getProdukByKode = async (kodeProduk) => {
  return await prisma.produk.findUnique({
    where: { kodeProduk },
    select: { id: true, penjualId: true, judulProduk: true }
  });
};
const generateKodeTransaksi = async () => {
  const count = await prisma.transaksi.count();
  return `TXN${String(count + 1).padStart(6, '0')}`;
};
class EscrowController {
  constructor() {
    this.escrowService = new EscrowService();
  }
  /**
   * PERBAIKAN: Prepare transaction data untuk client-side execution
   * POST /api/escrow/prepare
   * Client akan menggunakan MetaMask untuk membayar langsung ke smart contract
   */
  prepareEscrow = async (req, res) => {
    try {
      console.log('📥 Received escrow preparation request:', {
        body: req.body,
        headers: req.headers['content-type']
      });
      // Validasi input
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Validation error',
          errors: errors.array()
        });
      }
      const { sellerAddress, buyerAddress, productCode, amount, transaksiId } = req.body;
      // Validasi dan normalize addresses
      const { ethers } = require('ethers');
      let normalizedSellerAddress, normalizedBuyerAddress;
      try {
        // Validasi seller address
        if (!sellerAddress || typeof sellerAddress !== 'string' || !sellerAddress.startsWith('0x') || sellerAddress.length !== 42) {
          throw new Error('Invalid seller address format');
        }
        normalizedSellerAddress = ethers.getAddress(sellerAddress.toLowerCase());
        // PERBAIKAN: buyerAddress WAJIB ada untuk transaksi yang benar
        if (!buyerAddress) {
          throw new Error('buyerAddress is required for proper transaction mapping');
        }
        if (typeof buyerAddress !== 'string' || !buyerAddress.startsWith('0x') || buyerAddress.length !== 42) {
          throw new Error('Invalid buyer address format');
        }
        normalizedBuyerAddress = ethers.getAddress(buyerAddress.toLowerCase());
        console.log('✅ Addresses validated:', {
          seller: normalizedSellerAddress,
          buyer: normalizedBuyerAddress
        });
      } catch (error) {
        return res.status(400).json({
          success: false,
          message: 'Invalid address format',
          error: error.message,
          debug: {
            sellerAddress,
            buyerAddress,
            buyerAddressType: typeof buyerAddress,
            buyerAddressExists: !!buyerAddress
          }
        });
      }
      // Validasi amount
      const amountNum = parseFloat(amount);
      if (isNaN(amountNum) || amountNum <= 0) {
        return res.status(400).json({
          success: false,
          message: 'Invalid amount'
        });
      }
      // Prepare transaction data untuk client
      const result = await this.escrowService.prepareEscrowTransaction(
        normalizedSellerAddress,
        productCode,
        amount,
        normalizedBuyerAddress
      );
      if (!result.success) {
        return res.status(400).json({
          success: false,
          message: 'Failed to prepare escrow transaction',
          error: result.error
        });
      }
      // Response dengan transaction data untuk client
      res.json({
        success: true,
        message: 'Transaction data prepared successfully. Please sign with MetaMask.',
        data: {
          transactionData: result.transactionData,
          contractAddress: result.contractAddress,
          method: result.method,
          parameters: result.parameters,
          gasEstimate: result.gasEstimate,
          amountWei: result.amountWei,
          note: result.note,
          // Data untuk callback setelah transaksi berhasil
          callbackData: {
            sellerAddress: normalizedSellerAddress,
            buyerAddress: normalizedBuyerAddress,
            productCode: productCode,
            amount: amount,
            transaksiId: transaksiId
          }
        }
      });
    } catch (error) {
      console.error('❌ Error in prepareEscrow:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: error.message
      });
    }
  }
  /**
   * Verify dan process transaction yang sudah dibuat oleh user
   * POST /api/escrow/verify
   */
  verifyEscrow = async (req, res) => {
    try {
      console.log('📥 Received escrow verification request:', {
        body: req.body
      });
      const { transactionHash, buyerAddress, sellerAddress, productCode, amount, transaksiId } = req.body;
      if (!transactionHash) {
        return res.status(400).json({
          success: false,
          message: 'Transaction hash is required'
        });
      }
      // Verify transaction
      const result = await this.escrowService.verifyAndProcessUserTransaction(
        transactionHash,
        buyerAddress,
        sellerAddress,
        productCode,
        amount
      );
      if (!result.success || !result.verified) {
        return res.status(400).json({
          success: false,
          message: 'Transaction verification failed',
          error: result.error
        });
      }
      // PERBAIKAN: Database integration dengan buyer yang benar
      let databaseIntegration = {
        transaksiUpdated: false,
        transaksiCreated: false,
        transaksiId: null,
        kodeTransaksi: null,
        method: null,
        error: null
      };
      try {
        // OPSI 1: Update transaksi existing jika transaksiId diberikan
        if (transaksiId) {
          const existingTransaksi = await prisma.transaksi.findUnique({
            where: { id: transaksiId },
            select: { 
              id: true, 
              kodeTransaksi: true, 
              status: true,
              pembeliId: true,
              penjualId: true,
              produkId: true
            }
          });
          if (existingTransaksi && existingTransaksi.status === 'MENUNGGU_PEMBAYARAN') {
            // Update transaksi existing
            await prisma.transaksi.update({
              where: { id: transaksiId },
              data: {
                status: 'DIBAYAR_SMARTCONTRACT',
                smartContractTxHash: result.transactionHash,
                escrowAmount: amount.toString(),
                escrowId: result.escrowId,
                waktuBayar: new Date()
              }
            });
            // Update status produk menjadi TERJUAL
            await prisma.produk.update({
              where: { id: existingTransaksi.produkId },
              data: { 
                statusJual: false,
                statusProduk: 'TERJUAL'
              }
            });
            databaseIntegration.transaksiUpdated = true;
            databaseIntegration.transaksiId = existingTransaksi.id;
            databaseIntegration.kodeTransaksi = existingTransaksi.kodeTransaksi;
            databaseIntegration.method = 'update_existing';
          } else {
          }
        }
        // OPSI 2: Cari transaksi berdasarkan product code jika transaksiId tidak ada
        if (!databaseIntegration.transaksiUpdated && productCode) {
          const existingTransaksi = await prisma.transaksi.findFirst({
            where: {
              produk: { kodeProduk: productCode },
              status: 'MENUNGGU_PEMBAYARAN'
            },
            orderBy: { dibuatPada: 'desc' },
            select: { 
              id: true, 
              kodeTransaksi: true, 
              pembeliId: true,
              penjualId: true,
              produkId: true
            }
          });
          if (existingTransaksi) {
            // Update transaksi yang ditemukan
            await prisma.transaksi.update({
              where: { id: existingTransaksi.id },
              data: {
                status: 'DIBAYAR_SMARTCONTRACT',
                smartContractTxHash: result.transactionHash,
                escrowAmount: amount.toString(),
                escrowId: result.escrowId,
                waktuBayar: new Date()
              }
            });
            // Update status produk menjadi TERJUAL
            await prisma.produk.update({
              where: { id: existingTransaksi.produkId },
              data: { 
                statusJual: false,
                statusProduk: 'TERJUAL'
              }
            });
            databaseIntegration.transaksiUpdated = true;
            databaseIntegration.transaksiId = existingTransaksi.id;
            databaseIntegration.kodeTransaksi = existingTransaksi.kodeTransaksi;
            databaseIntegration.method = 'update_by_product';
          }
        }
        // OPSI 3: Buat transaksi baru dengan buyer address yang benar
        if (!databaseIntegration.transaksiUpdated) {
          // Mapping wallet address ke user ID
          const [buyerUser, sellerUser] = await Promise.all([
            getUserByWalletAddress(buyerAddress),
            getUserByWalletAddress(sellerAddress)
          ]);
          // Get produk dari product code
          const produk = await getProdukByKode(productCode);
          if (buyerUser && sellerUser && produk) {
            const kodeTransaksi = await generateKodeTransaksi();
            // Generate unique ID untuk transaksi
            const { v4: uuidv4 } = require('uuid');
            const newTransaksiId = uuidv4();
            console.log('🔧 Creating transaction with data:', {
              pembeliId: buyerUser.id,
              penjualId: sellerUser.id,
              produkId: produk.id,
              kodeTransaksi
            });
            const transaksiRecord = await prisma.transaksi.create({
              data: {
                id: newTransaksiId,
                kodeTransaksi,
                produkId: produk.id,
                pembeliId: buyerUser.id,  // ✅ PERBAIKAN: Gunakan buyer yang benar
                penjualId: sellerUser.id,
                status: 'DIBAYAR_SMARTCONTRACT',
                smartContractTxHash: result.transactionHash,
                escrowAmount: amount.toString(),
                escrowId: result.escrowId,
                waktuBayar: new Date()
              }
            });
            // Update status produk menjadi TERJUAL
            await prisma.produk.update({
              where: { id: produk.id },
              data: { 
                statusJual: false,
                statusProduk: 'TERJUAL'
              }
            });
            databaseIntegration.transaksiCreated = true;
            databaseIntegration.transaksiId = transaksiRecord.id;
            databaseIntegration.kodeTransaksi = kodeTransaksi;
            databaseIntegration.method = 'create_new';
          } else {
            console.log('⚠️ Missing required data for new transaction:', {
              buyerUser: !!buyerUser,
              buyerUserEmail: buyerUser?.email,
              sellerUser: !!sellerUser,
              sellerUserEmail: sellerUser?.email,
              produk: !!produk,
              produkTitle: produk?.judulProduk
            });
            databaseIntegration.error = 'Missing required data: ' + 
              (!buyerUser ? 'buyer user not found, ' : '') +
              (!sellerUser ? 'seller user not found, ' : '') +
              (!produk ? 'product not found' : '');
          }
        }
        // Log final result
        if (!databaseIntegration.transaksiUpdated && !databaseIntegration.transaksiCreated) {
          databaseIntegration.method = 'none';
        }
      } catch (dbError) {
        console.error('❌ Database integration error:', dbError);
        databaseIntegration.error = dbError.message;
      }
      // Response sukses - transaksi sudah berhasil di blockchain dan terverifikasi
      res.json({
        success: true,
        message: databaseIntegration.transaksiUpdated || databaseIntegration.transaksiCreated
          ? 'Transaction verified and database updated successfully'
          : 'Transaction verified successfully (database integration partial)',
        data: {
          escrowId: result.escrowId,
          transactionHash: result.transactionHash,
          blockNumber: result.blockNumber,
          gasUsed: result.gasUsed,
          amount: amount,
          sellerAddress: sellerAddress,
          buyerAddress: buyerAddress, // ✅ SEKARANG BUYER YANG BENAR
          productCode: productCode,
          status: 'verified',
          etherscanUrl: `https://sepolia.etherscan.io/tx/${result.transactionHash}`,
          databaseIntegration
        }
      });
    } catch (error) {
      console.error('❌ Error in verifyEscrow:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: error.message
      });
    }
  }
  /**
   * Konfirmasi penerimaan produk
   * POST /api/escrow/confirm
   * PERBAIKAN: Endpoint ini seharusnya hanya menyediakan data untuk client-side transaction
   */
  confirmReceived = async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Validation error',
          errors: errors.array()
        });
      }
      const { escrowId, buyerAddress } = req.body;
      // Validasi escrow exists dan buyer address benar
      const escrowResult = await this.escrowService.getEscrow(escrowId);
      if (!escrowResult.success) {
        return res.status(404).json({
          success: false,
          message: 'Escrow not found',
          error: escrowResult.error
        });
      }
      const escrowData = escrowResult.data;
      // Validasi buyer address
      if (escrowData.buyer.toLowerCase() !== buyerAddress.toLowerCase()) {
        return res.status(403).json({
          success: false,
          message: 'Only the buyer can confirm receipt',
          debug: {
            expectedBuyer: escrowData.buyer,
            providedBuyer: buyerAddress
          }
        });
      }
      // Validasi status escrow
      if (escrowData.status !== 1) { // 1 = FUNDED
        return res.status(400).json({
          success: false,
          message: 'Escrow is not in FUNDED status',
          currentStatus: this.escrowService.getStatusString(escrowData.status)
        });
      }
      // Return data untuk client-side transaction
      res.json({
        success: true,
        message: 'Confirmation data prepared. Please complete transaction in your wallet.',
        data: {
          escrowId: escrowId,
          buyerAddress: buyerAddress,
          contractAddress: this.escrowService.contractAddress,
          method: 'confirmReceived',
          parameters: [escrowId],
          note: 'This transaction must be signed by the buyer using MetaMask or similar wallet'
        }
      });
    } catch (error) {
      console.error('❌ Error in confirmReceived:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: error.message
      });
    }
  }
  /**
   * Membuat sengketa
   * POST /api/escrow/dispute
   * PERBAIKAN: Endpoint ini seharusnya hanya menyediakan data untuk client-side transaction
   */
  createDispute = async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Validation error',
          errors: errors.array()
        });
      }
      const { escrowId, initiatorAddress, reason } = req.body;
      // Validasi escrow exists
      const escrowResult = await this.escrowService.getEscrow(escrowId);
      if (!escrowResult.success) {
        return res.status(404).json({
          success: false,
          message: 'Escrow not found',
          error: escrowResult.error
        });
      }
      const escrowData = escrowResult.data;
      // Validasi initiator adalah buyer atau seller
      const isValidInitiator = 
        escrowData.buyer.toLowerCase() === initiatorAddress.toLowerCase() ||
        escrowData.seller.toLowerCase() === initiatorAddress.toLowerCase();
      if (!isValidInitiator) {
        return res.status(403).json({
          success: false,
          message: 'Only buyer or seller can create dispute',
          debug: {
            buyer: escrowData.buyer,
            seller: escrowData.seller,
            initiator: initiatorAddress
          }
        });
      }
      // Validasi status escrow (harus FUNDED)
      if (escrowData.status !== 1) { // 1 = FUNDED
        return res.status(400).json({
          success: false,
          message: 'Dispute can only be created for FUNDED escrow',
          currentStatus: this.escrowService.getStatusString(escrowData.status)
        });
      }
      // Validasi dispute belum aktif
      if (escrowData.disputeActive) {
        return res.status(400).json({
          success: false,
          message: 'Dispute already active for this escrow'
        });
      }
            try {
        // Simpan alasan dispute ke database untuk referensi admin
        // Implementation akan ditambahkan nanti
      } catch (dbError) {
        console.error('⚠️ Failed to save dispute reason:', dbError);
        // Don't fail the request, just log the error
      }
      // Return data untuk client-side transaction
      res.json({
        success: true,
        message: 'Dispute data prepared. Please complete transaction in your wallet.',
        data: {
          escrowId: escrowId,
          initiatorAddress: initiatorAddress,
          contractAddress: this.escrowService.contractAddress,
          method: 'createDispute',
          parameters: [escrowId],
          reason: reason,
          note: 'This transaction must be signed by the buyer or seller using MetaMask or similar wallet'
        }
      });
    } catch (error) {
      console.error('❌ Error in createDispute:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: error.message
      });
    }
  }
  /**
   * Menyelesaikan sengketa (Admin only)
   * POST /api/escrow/resolve-dispute
   */
  resolveDispute = async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Validation error',
          errors: errors.array()
        });
      }
      const { escrowId, winnerAddress, resolution } = req.body;
      const result = await this.escrowService.resolveDispute(escrowId, winnerAddress);
      if (result.success) {
        res.json({
          success: true,
          message: 'Dispute resolved successfully',
          data: {
            ...result,
            resolution: resolution
          }
        });
      } else {
        res.status(400).json({
          success: false,
          message: 'Failed to resolve dispute',
          error: result.error
        });
      }
    } catch (error) {
      console.error('❌ Error in resolveDispute:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: error.message
      });
    }
  }
  /**
   * Mendapatkan detail escrow
   * GET /api/escrow/:id
   */
  getEscrow = async (req, res) => {
    try {
      const { id } = req.params;
      console.log('📥 Received getEscrow request:', {
        id: id,
        type: typeof id,
        params: req.params,
        url: req.url
      });
      // Handle special cases
      if (!id) {
        return res.status(400).json({
          success: false,
          message: 'Escrow ID is required',
          debug: { received: id, type: typeof id }
        });
      }
      if (id === 'check-etherscan') {
        return res.status(400).json({
          success: false,
          message: 'Escrow ID not available. Please check transaction on Etherscan.',
          debug: { received: id, note: 'This is a fallback value when escrow ID cannot be determined' }
        });
      }
      if (isNaN(id) || parseInt(id) < 1) {
        console.log('❌ Invalid escrow ID validation failed:', {
          id: id,
          isNaN: isNaN(id),
          parsed: parseInt(id),
          type: typeof id
        });
        return res.status(400).json({
          success: false,
          message: 'Invalid escrow ID. Must be a positive integer.',
          debug: {
            received: id,
            type: typeof id,
            isNaN: isNaN(id),
            parsed: parseInt(id)
          }
        });
      }
      const result = await this.escrowService.getEscrow(id);
      if (result.success) {
        res.json({
          success: true,
          message: 'Escrow details retrieved successfully',
          data: result.data
        });
      } else {
        res.status(404).json({
          success: false,
          message: 'Escrow not found',
          error: result.error
        });
      }
    } catch (error) {
      console.error('❌ Error in getEscrow:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: error.message
      });
    }
  }
  /**
   * Mendapatkan statistik contract
   * GET /api/escrow/stats
   */
  getContractStats = async (req, res) => {
    try {
      const balanceResult = await this.escrowService.getContractBalance();
      if (balanceResult.success) {
        res.json({
          success: true,
          message: 'Contract statistics retrieved successfully',
          data: {
            contractBalance: balanceResult.balance,
            contractBalanceWei: balanceResult.balanceWei,
            // totalTransactions: 0,
            // activeEscrows: 0,
            // completedEscrows: 0,
            // disputedEscrows: 0
          }
        });
      } else {
        res.status(500).json({
          success: false,
          message: 'Failed to get contract statistics',
          error: balanceResult.error
        });
      }
    } catch (error) {
      console.error('❌ Error in getContractStats:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: error.message
      });
    }
  }
  /**
   * Callback setelah konfirmasi receipt berhasil di client
   * POST /api/escrow/confirm-callback
   */
  confirmReceivedCallback = async (req, res) => {
    try {
      const { escrowId, transactionHash, buyerAddress } = req.body;
      console.log('📞 Received confirmation callback:', {
        escrowId,
        transactionHash,
        buyerAddress
      });
      // Validasi transaction hash exists
      if (!transactionHash) {
        return res.status(400).json({
          success: false,
          message: 'Transaction hash is required'
        });
      }
      try {
        // Find transaksi by escrowId
        const transaksi = await prisma.transaksi.findFirst({
          where: { escrowId: escrowId.toString() }
        });
        if (transaksi) {
          await prisma.transaksi.update({
            where: { id: transaksi.id },
            data: {
              status: 'SELESAI',
              confirmTxHash: transactionHash,
              waktuSelesai: new Date()
            }
          });
        }
      } catch (dbError) {
        console.error('⚠️ Failed to update database:', dbError);
      }
      res.json({
        success: true,
        message: 'Confirmation callback processed successfully',
        data: {
          escrowId,
          transactionHash,
          status: 'SELESAI'
        }
      });
    } catch (error) {
      console.error('❌ Error in confirmReceivedCallback:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: error.message
      });
    }
  }
  /**
   * Callback setelah dispute berhasil dibuat di client
   * POST /api/escrow/dispute-callback
   */
  createDisputeCallback = async (req, res) => {
    try {
      const { escrowId, transactionHash, initiatorAddress, reason } = req.body;
      console.log('📞 Received dispute callback:', {
        escrowId,
        transactionHash,
        initiatorAddress,
        reason
      });
      // Validasi transaction hash exists
      if (!transactionHash) {
        return res.status(400).json({
          success: false,
          message: 'Transaction hash is required'
        });
      }
      try {
        // Find transaksi by escrowId
        const transaksi = await prisma.transaksi.findFirst({
          where: { escrowId: escrowId.toString() }
        });
        if (transaksi) {
          await prisma.transaksi.update({
            where: { id: transaksi.id },
            data: {
              status: 'SENGKETA',
              disputeTxHash: transactionHash,
              disputeReason: reason,
              disputeInitiator: initiatorAddress,
              waktuSengketa: new Date()
            }
          });
        }
      } catch (dbError) {
        console.error('⚠️ Failed to update database:', dbError);
      }
      res.json({
        success: true,
        message: 'Dispute callback processed successfully',
        data: {
          escrowId,
          transactionHash,
          status: 'SENGKETA',
          reason
        }
      });
    } catch (error) {
      console.error('❌ Error in createDisputeCallback:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: error.message
      });
    }
  }
  /**
   * Health check untuk smart contract connection
   * GET /api/escrow/health
   */
  healthCheck = async (req, res) => {
    try {
      // Test connection dengan memanggil contract owner
      const { ethers } = require('ethers');
      const owner = await this.escrowService.contract.owner();
      res.json({
        success: true,
        message: 'Smart contract connection healthy',
        data: {
          contractAddress: this.escrowService.contractAddress,
          network: process.env.NETWORK || 'sepolia',
          owner: owner,
          timestamp: new Date().toISOString()
        }
      });
    } catch (error) {
      console.error('❌ Smart contract health check failed:', error);
      res.status(500).json({
        success: false,
        message: 'Smart contract connection failed',
        error: error.message
      });
    }
  }
}
const escrowController = new EscrowController();
module.exports = escrowController;
