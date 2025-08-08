const express = require('express');
const router = express.Router();
const { 
  getNotifications, 
  markAsRead, 
  markAllAsRead, 
  deleteNotification 
} = require('../controllers/kontrolerNotifikasi');
const { authenticateToken } = require('../middleware/auth');

// Semua route memerlukan autentikasi
router.use(authenticateToken);

// GET /api/notifikasi - Ambil semua notifikasi user
router.get('/', getNotifications);

// PUT /api/notifikasi/:notificationId/read - Tandai notifikasi sebagai dibaca
router.put('/:notificationId/read', markAsRead);

// PUT /api/notifikasi/read-all - Tandai semua notifikasi sebagai dibaca
router.put('/read-all', markAllAsRead);

// DELETE /api/notifikasi/:notificationId - Hapus notifikasi
router.delete('/:notificationId', deleteNotification);

module.exports = router;