const express = require('express');
const router = express.Router();
const middlewareAuth = require('../middleware/middlewareAuth');

// Import all admin functions from main adminController
const {
  validateAdmin,
  getDashboardStats,
  getAllUsers,
  getAllTransaksi,
  getAllSengketa,
  getAllProdukAdmin,
  updateUserStatus,
  updateTransaksiStatus,
  deleteProduk,
  resolveSengketa,
  payToSeller,
  deleteUser
} = require('../controllers/adminController');

// Middleware: semua routes memerlukan authentication dan admin validation
router.use(middlewareAuth);
router.use(validateAdmin);

// ========================================
// 📊 ADMIN DASHBOARD & STATS
// ========================================

// Admin Dashboard dengan stats
router.get('/dashboard', getDashboardStats);
router.get('/dashboard-enhanced', getDashboardStats); // Alias untuk compatibility

// ========================================
// 👥 USER MANAGEMENT
// ========================================

// User Management
router.get('/users', getAllUsers);
router.put('/users/:userId/status', updateUserStatus);
router.delete('/users/:userId', deleteUser);

// ========================================
// 💰 TRANSACTION MANAGEMENT
// ========================================

// Transaction Management
router.get('/transaksi', getAllTransaksi);
router.put('/transaksi/:id/status', updateTransaksiStatus);

// Payment to seller (release funds)
router.post('/transaksi/:id/pay-seller', payToSeller);
router.post('/transaksi/:id/release-funds', payToSeller); // Alias untuk compatibility

// ========================================
// ⚖️ DISPUTE MANAGEMENT
// ========================================

// Dispute Management  
router.get('/sengketa', getAllSengketa);
router.put('/sengketa/:id/resolve', resolveSengketa);

// Resolve dispute aliases for compatibility
router.post('/transaksi/:id/resolve-dispute-seller', async (req, res) => {
  try {
    // Find sengketa by transaksi ID
    const { PrismaClient } = require('@prisma/client');
    const prisma = new PrismaClient();
    
    const sengketa = await prisma.sengketa.findFirst({
      where: { transaksiId: req.params.id }
    });
    
    if (!sengketa) {
      return res.status(404).json({
        sukses: false,
        pesan: 'Sengketa tidak ditemukan untuk transaksi ini'
      });
    }
    
    // Set req.params.id to sengketa ID and add winner info
    req.params.id = sengketa.id;
    req.body.winner = 'DIMENANGKAN_PENJUAL';
    req.body.resolution = req.body.reason || 'Diselesaikan oleh admin - dana diberikan ke penjual';
    
    // Call resolveSengketa
    return resolveSengketa(req, res);
  } catch (error) {
    console.error('Error resolving dispute to seller:', error);
    res.status(500).json({
      sukses: false,
      pesan: 'Terjadi kesalahan server'
    });
  }
});

router.post('/transaksi/:id/resolve-dispute-buyer', async (req, res) => {
  try {
    // Find sengketa by transaksi ID
    const { PrismaClient } = require('@prisma/client');
    const prisma = new PrismaClient();
    
    const sengketa = await prisma.sengketa.findFirst({
      where: { transaksiId: req.params.id }
    });
    
    if (!sengketa) {
      return res.status(404).json({
        sukses: false,
        pesan: 'Sengketa tidak ditemukan untuk transaksi ini'
      });
    }
    
    // Set req.params.id to sengketa ID and add winner info
    req.params.id = sengketa.id;
    req.body.winner = 'DIMENANGKAN_PEMBELI';
    req.body.resolution = req.body.reason || 'Diselesaikan oleh admin - dana dikembalikan ke pembeli';
    
    // Call resolveSengketa
    return resolveSengketa(req, res);
  } catch (error) {
    console.error('Error resolving dispute to buyer:', error);
    res.status(500).json({
      sukses: false,
      pesan: 'Terjadi kesalahan server'
    });
  }
});

// ========================================
// 🛍️ PRODUCT MANAGEMENT
// ========================================

// Product Management
router.get('/produk', getAllProdukAdmin);
router.delete('/produk/:id', deleteProduk);

// ========================================
// 🔧 UTILITY ROUTES
// ========================================

// Health check untuk admin panel
router.get('/health', (req, res) => {
  res.json({
    sukses: true,
    pesan: 'Admin Panel is running',
    timestamp: new Date().toISOString(),
    features: {
      userManagement: true,
      transactionManagement: true,
      disputeResolution: true,
      productManagement: true,
      dashboardStats: true
    }
  });
});

// Get admin capabilities
router.get('/capabilities', (req, res) => {
  res.json({
    sukses: true,
    data: {
      adminFeatures: {
        userManagement: {
          enabled: true,
          description: 'Kelola pengguna, update status, hapus user',
          endpoints: [
            'GET /admin-new/users',
            'PUT /admin-new/users/:userId/status',
            'DELETE /admin-new/users/:userId'
          ]
        },
        transactionManagement: {
          enabled: true,
          description: 'Kelola transaksi, update status, bayar ke penjual',
          endpoints: [
            'GET /admin-new/transaksi',
            'PUT /admin-new/transaksi/:id/status',
            'POST /admin-new/transaksi/:id/pay-seller'
          ]
        },
        disputeResolution: {
          enabled: true,
          description: 'Selesaikan sengketa dengan memilih pemenang',
          endpoints: [
            'GET /admin-new/sengketa',
            'PUT /admin-new/sengketa/:id/resolve',
            'POST /admin-new/transaksi/:id/resolve-dispute-seller',
            'POST /admin-new/transaksi/:id/resolve-dispute-buyer'
          ]
        },
        productManagement: {
          enabled: true,
          description: 'Kelola produk, hapus produk bermasalah',
          endpoints: [
            'GET /admin-new/produk',
            'DELETE /admin-new/produk/:id'
          ]
        },
        dashboardStats: {
          enabled: true,
          description: 'Statistik lengkap untuk dashboard admin',
          endpoints: [
            'GET /admin-new/dashboard',
            'GET /admin-new/dashboard-enhanced'
          ]
        }
      }
    }
  });
});

// Get pending escrows (compatibility endpoint)
router.get('/escrows/pending', async (req, res) => {
  try {
    // Get transactions that need admin attention
    const { PrismaClient } = require('@prisma/client');
    const prisma = new PrismaClient();
    
    const pendingTransaksi = await prisma.transaksi.findMany({
      where: {
        status: {
          in: ['SENGKETA', 'DIKONFIRMASI_PEMBELI']
        }
      },
      include: {
        produk: {
          select: {
            judulProduk: true,
            namaGame: true,
            harga: true
          }
        },
        user_transaksi_pembeliIdTouser: {
          select: {
            email: true,
            profile: { select: { nama: true } }
          }
        },
        user_transaksi_penjualIdTouser: {
          select: {
            email: true,
            profile: { select: { nama: true } }
          }
        },
        sengketa: true
      },
      orderBy: { dibuatPada: 'desc' }
    });
    
    res.json({
      sukses: true,
      data: {
        pendingEscrows: pendingTransaksi.map(t => ({
          id: t.id,
          kodeTransaksi: t.kodeTransaksi,
          status: t.status,
          escrowAmount: t.escrowAmount,
          dibuatPada: t.dibuatPada,
          produk: t.produk,
          pembeli: {
            email: t.user_transaksi_pembeliIdTouser.email,
            nama: t.user_transaksi_pembeliIdTouser.profile?.nama || 'Belum diisi'
          },
          penjual: {
            email: t.user_transaksi_penjualIdTouser.email,
            nama: t.user_transaksi_penjualIdTouser.profile?.nama || 'Belum diisi'
          },
          sengketa: t.sengketa
        })),
        totalPending: pendingTransaksi.length
      }
    });
  } catch (error) {
    console.error('Error getting pending escrows:', error);
    res.status(500).json({
      sukses: false,
      pesan: 'Terjadi kesalahan server'
    });
  }
});

module.exports = router;