const express = require('express');
const router = express.Router();
const kontrolerAplikasiPenjual = require('../controllers/kontrolerAplikasiPenjual');
const middlewareAuth = require('../middleware/middlewareAuth');

// Middleware untuk memastikan hanya admin yang bisa akses route admin
const requireAdmin = (req, res, next) => {
  if (req.user.role !== 'ADMIN') {
    return res.status(403).json({
      error: 'Akses ditolak. Hanya admin yang dapat mengakses fitur ini.'
    });
  }
  next();
};

// Route untuk user
router.post('/ajukan', middlewareAuth, kontrolerAplikasiPenjual.ajukanAplikasiPenjual);
router.get('/status', middlewareAuth, kontrolerAplikasiPenjual.cekStatusAplikasi);

// Route untuk admin
router.get('/admin/semua', middlewareAuth, requireAdmin, kontrolerAplikasiPenjual.ambilSemuaAplikasi);
router.put('/admin/:id/review', middlewareAuth, requireAdmin, kontrolerAplikasiPenjual.reviewAplikasi);
router.get('/admin/statistik', middlewareAuth, requireAdmin, kontrolerAplikasiPenjual.statistikAplikasi);

module.exports = router;