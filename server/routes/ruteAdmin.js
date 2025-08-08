const express = require('express');
const router = express.Router();
const {
  validateAdmin,
  getDashboardStats,
  getAllUsers,
  getAllTransaksi,
  getAllSengketa,
  getAllProdukAdmin,
  updateUserStatus,
  deleteUser,
  updateTransaksiStatus,
  resolveSengketa,
  deleteProduk,
  getKonfigurasi,
  payToSeller
} = require('../controllers/adminController');

const { updateUserRole } = require('../controllers/updateUserRole');
const middlewareAuth = require('../middleware/middlewareAuth');

// Middleware: semua route admin memerlukan autentikasi dan validasi admin
router.use(middlewareAuth);
router.use(validateAdmin);

// Dashboard
router.get('/dashboard', getDashboardStats);

// User Management
router.get('/users', getAllUsers);
router.put('/users/:userId/status', updateUserStatus);
router.put('/users/:userId/role', updateUserRole);
router.delete('/users/:userId', deleteUser);

// Transaksi Management
router.get('/transaksi', getAllTransaksi);
router.put('/transaksi/:id/status', updateTransaksiStatus);

// Sengketa Management
router.get('/sengketa', getAllSengketa);
router.put('/sengketa/:id/resolve', resolveSengketa);

// Produk Management
router.get('/produk', getAllProdukAdmin);
router.delete('/produk/:id', deleteProduk);

// Konfigurasi Management
router.get('/konfigurasi/:kunci', getKonfigurasi);

// Payment Management
router.post('/transaksi/:id/pay-seller', payToSeller);

module.exports = router;