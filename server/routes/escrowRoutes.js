const express = require('express');
const { body, param } = require('express-validator');
const escrowController = require('../controllers/escrowController');
const router = express.Router();
/**
 * Validation middleware untuk prepare escrow
 */
const validatePrepareEscrow = [
  body('sellerAddress')
    .notEmpty()
    .withMessage('Seller address is required')
    .matches(/^0x[a-fA-F0-9]{40}$/)
    .withMessage('Invalid Ethereum address format'),
  body('buyerAddress')
    .notEmpty()
    .withMessage('Buyer address is required')
    .matches(/^0x[a-fA-F0-9]{40}$/)
    .withMessage('Invalid buyer address format'),
  body('productCode')
    .notEmpty()
    .withMessage('Product code is required')
    .isLength({ min: 3, max: 50 })
    .withMessage('Product code must be between 3-50 characters'),
  body('amount')
    .notEmpty()
    .withMessage('Amount is required')
    .isNumeric()
    .withMessage('Amount must be a valid number')
    .custom((value) => {
      const num = parseFloat(value);
      if (isNaN(num) || num < 0.001) {
        throw new Error('Amount must be at least 0.001 ETH');
      }
      return true;
    }),
  body('transaksiId')
    .optional({ nullable: true, checkFalsy: true })
    .isString()
    .withMessage('Transaction ID must be a string')
];
/**
 * Validation middleware untuk verify escrow
 */
const validateVerifyEscrow = [
  body('transactionHash')
    .notEmpty()
    .withMessage('Transaction hash is required')
    .matches(/^0x[a-fA-F0-9]{64}$/)
    .withMessage('Invalid transaction hash format'),
  body('buyerAddress')
    .notEmpty()
    .withMessage('Buyer address is required')
    .matches(/^0x[a-fA-F0-9]{40}$/)
    .withMessage('Invalid buyer address format'),
  body('sellerAddress')
    .notEmpty()
    .withMessage('Seller address is required')
    .matches(/^0x[a-fA-F0-9]{40}$/)
    .withMessage('Invalid seller address format'),
  body('productCode')
    .notEmpty()
    .withMessage('Product code is required')
    .isLength({ min: 3, max: 50 })
    .withMessage('Product code must be between 3-50 characters'),
  body('amount')
    .notEmpty()
    .withMessage('Amount is required')
    .isNumeric()
    .withMessage('Amount must be a valid number')
    .custom((value) => {
      const num = parseFloat(value);
      if (isNaN(num) || num < 0.001) {
        throw new Error('Amount must be at least 0.001 ETH');
      }
      return true;
    }),
  body('transaksiId')
    .optional({ nullable: true, checkFalsy: true })
    .isString()
    .withMessage('Transaction ID must be a string')
];
/**
 * Validation middleware untuk confirm receipt
 */
const validateConfirmReceipt = [
  body('escrowId')
    .notEmpty()
    .withMessage('Escrow ID is required')
    .isInt({ min: 1 })
    .withMessage('Invalid escrow ID'),
  body('buyerAddress')
    .notEmpty()
    .withMessage('Buyer address is required')
    .matches(/^0x[a-fA-F0-9]{40}$/)
    .withMessage('Invalid buyer address format')
];
/**
 * Validation middleware untuk create dispute
 */
const validateCreateDispute = [
  body('escrowId')
    .notEmpty()
    .withMessage('Escrow ID is required')
    .isInt({ min: 1 })
    .withMessage('Invalid escrow ID'),
  body('initiatorAddress')
    .notEmpty()
    .withMessage('Initiator address is required')
    .matches(/^0x[a-fA-F0-9]{40}$/)
    .withMessage('Invalid initiator address format'),
  body('reason')
    .notEmpty()
    .withMessage('Dispute reason is required')
    .isLength({ min: 10, max: 500 })
    .withMessage('Reason must be between 10-500 characters')
];
/**
 * Validation middleware untuk resolve dispute
 */
const validateResolveDispute = [
  body('escrowId')
    .notEmpty()
    .withMessage('Escrow ID is required')
    .isInt({ min: 1 })
    .withMessage('Invalid escrow ID'),
  body('winnerAddress')
    .notEmpty()
    .withMessage('Winner address is required')
    .matches(/^0x[a-fA-F0-9]{40}$/)
    .withMessage('Invalid Ethereum address format'),
  body('resolution')
    .notEmpty()
    .withMessage('Resolution is required')
    .isLength({ min: 10, max: 500 })
    .withMessage('Resolution must be between 10-500 characters')
];
/**
 * Validation middleware untuk get escrow
 */
const validateGetEscrow = [
  param('id')
    .notEmpty()
    .withMessage('Escrow ID is required')
    .isInt({ min: 1 })
    .withMessage('Invalid escrow ID')
];
/**
 * Validation middleware untuk confirm callback
 */
const validateConfirmCallback = [
  body('escrowId')
    .notEmpty()
    .withMessage('Escrow ID is required')
    .isInt({ min: 1 })
    .withMessage('Invalid escrow ID'),
  body('transactionHash')
    .notEmpty()
    .withMessage('Transaction hash is required')
    .matches(/^0x[a-fA-F0-9]{64}$/)
    .withMessage('Invalid transaction hash format'),
  body('buyerAddress')
    .notEmpty()
    .withMessage('Buyer address is required')
    .matches(/^0x[a-fA-F0-9]{40}$/)
    .withMessage('Invalid buyer address format')
];
/**
 * Validation middleware untuk dispute callback
 */
const validateDisputeCallback = [
  body('escrowId')
    .notEmpty()
    .withMessage('Escrow ID is required')
    .isInt({ min: 1 })
    .withMessage('Invalid escrow ID'),
  body('transactionHash')
    .notEmpty()
    .withMessage('Transaction hash is required')
    .matches(/^0x[a-fA-F0-9]{64}$/)
    .withMessage('Invalid transaction hash format'),
  body('initiatorAddress')
    .notEmpty()
    .withMessage('Initiator address is required')
    .matches(/^0x[a-fA-F0-9]{40}$/)
    .withMessage('Invalid initiator address format'),
  body('reason')
    .optional()
    .isLength({ max: 500 })
    .withMessage('Reason must be less than 500 characters')
];
// Routes - IMPORTANT: Specific routes must come before parameterized routes
/**
 * @route   GET /api/escrow/health
 * @desc    Health check untuk smart contract connection
 * @access  Public
 */
router.get('/health', escrowController.healthCheck);
/**
 * @route   GET /api/escrow/stats
 * @desc    Mendapatkan statistik contract
 * @access  Public
 */
router.get('/stats', escrowController.getContractStats);
/**
 * @route   POST /api/escrow/prepare
 * @desc    Prepare transaction data untuk client-side execution
 * @access  Public
 * @body    {
 *   sellerAddress: string,
 *   buyerAddress: string,
 *   productCode: string,
 *   amount: number,
 *   transaksiId?: string
 * }
 */
router.post('/prepare', validatePrepareEscrow, escrowController.prepareEscrow);
/**
 * @route   POST /api/escrow/verify
 * @desc    Verify dan process transaction yang sudah dibuat oleh user
 * @access  Public
 * @body    {
 *   transactionHash: string,
 *   buyerAddress: string,
 *   sellerAddress: string,
 *   productCode: string,
 *   amount: number,
 *   transaksiId?: string
 * }
 */
router.post('/verify', validateVerifyEscrow, escrowController.verifyEscrow);
/**
 * @route   POST /api/escrow/confirm
 * @desc    Konfirmasi penerimaan produk oleh pembeli
 * @access  Public (dengan private key)
 * @body    {
 *   escrowId: number,
 *   buyerAddress: string
 * }
 */
router.post('/confirm', validateConfirmReceipt, escrowController.confirmReceived);
/**
 * @route   POST /api/escrow/dispute
 * @desc    Membuat sengketa
 * @access  Public (dengan private key)
 * @body    {
 *   escrowId: number,
 *   initiatorAddress: string,
 *   reason: string
 * }
 */
router.post('/dispute', validateCreateDispute, escrowController.createDispute);
/**
 * @route   POST /api/escrow/resolve-dispute
 * @desc    Menyelesaikan sengketa (Admin only)
 * @access  Admin
 * @body    {
 *   escrowId: number,
 *   winnerAddress: string,
 *   resolution: string
 * }
 */
router.post('/resolve-dispute', validateResolveDispute, escrowController.resolveDispute);
/**
 * @route   POST /api/escrow/confirm-callback
 * @desc    Callback setelah konfirmasi receipt berhasil di client
 * @access  Public
 * @body    {
 *   escrowId: number,
 *   transactionHash: string,
 *   buyerAddress: string
 * }
 */
router.post('/confirm-callback', validateConfirmCallback, escrowController.confirmReceivedCallback);
/**
 * @route   POST /api/escrow/dispute-callback
 * @desc    Callback setelah dispute berhasil dibuat di client
 * @access  Public
 * @body    {
 *   escrowId: number,
 *   transactionHash: string,
 *   initiatorAddress: string,
 *   reason?: string
 * }
 */
router.post('/dispute-callback', validateDisputeCallback, escrowController.createDisputeCallback);
/**
 * @route   GET /api/escrow/:id
 * @desc    Mendapatkan detail escrow
 * @access  Public
 * IMPORTANT: This must be LAST because it uses parameter :id
 */
router.get('/:id', validateGetEscrow, escrowController.getEscrow);
module.exports = router;
