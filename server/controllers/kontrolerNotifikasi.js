const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Generate ID unik untuk notifikasi
const generateNotificationId = () => {
  return `NOTIF${Date.now()}${Math.random().toString(36).substr(2, 5)}`;
};

// Buat notifikasi baru
const createNotification = async (userId, type, title, message, relatedId = null, relatedModel = null) => {
  try {
    // Map type ke enum yang ada di schema - diperbaiki untuk transaksi
    const typeMapping = {
      'transaksi': 'TRANSAKSI_SUKSES',
      'penawaran': 'PEMBAYARAN_DITERIMA', 
      'sistem': 'REGISTER',
      'pesan': 'AKUN_DIKIRIM',
      'verifikasi': 'REGISTER',
      'pembayaran': 'PEMBAYARAN_DITERIMA',
      'produk': 'TRANSAKSI_SUKSES'
    };

    const notification = await prisma.notifikasi.create({
      data: {
        id: generateNotificationId(),
        userId,
        tipe: typeMapping[type] || 'TRANSAKSI_SUKSES',
        judul: title,
        pesan: message,
        transaksiId: relatedModel === 'Transaksi' ? relatedId : null,
        dibaca: false
      }
    });
    
    console.log('✅ Notifikasi berhasil dibuat:', {
      id: notification.id,
      userId,
      type,
      mappedType: typeMapping[type] || 'TRANSAKSI_SUKSES',
      title,
      message,
      relatedId,
      relatedModel
    });
    
    return notification;
  } catch (error) {
    console.error('❌ Error creating notification:', error);
    console.error('❌ Error details:', {
      userId,
      type,
      title,
      message,
      relatedId,
      relatedModel,
      error: error.message
    });
    throw error;
  }
};

// Ambil semua notifikasi user
const getNotifications = async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const userId = req.user.userId || req.user.id;

    console.log('🔔 Getting notifications for user:', {
      userId,
      page,
      limit,
      userObject: req.user
    });

    const notifications = await prisma.notifikasi.findMany({
      where: { userId },
      orderBy: { dibuatPada: 'desc' },
      take: parseInt(limit),
      skip: (parseInt(page) - 1) * parseInt(limit),
      include: {
        transaksi: {
          select: {
            id: true,
            kodeTransaksi: true,
            produk: {
              select: {
                namaGame: true,
                judulProduk: true
              }
            }
          }
        }
      }
    });

    console.log('🔔 Found notifications:', {
      count: notifications.length,
      notifications: notifications.map(n => ({
        id: n.id,
        title: n.judul,
        type: n.tipe,
        read: n.dibaca,
        createdAt: n.dibuatPada
      }))
    });

    const unreadCount = await prisma.notifikasi.count({ 
      where: { 
        userId, 
        dibaca: false 
      }
    });

    const totalCount = await prisma.notifikasi.count({ where: { userId } });

    console.log('🔔 Notification counts:', {
      unreadCount,
      totalCount
    });

    res.json({
      success: true,
      data: {
        notifications: notifications.map(notif => ({
          _id: notif.id,
          type: notif.tipe.toLowerCase(),
          title: notif.judul,
          message: notif.pesan,
          read: notif.dibaca,
          createdAt: notif.dibuatPada,
          relatedId: notif.transaksiId,
          relatedModel: notif.transaksiId ? 'Transaksi' : null,
          transaksi: notif.transaksi
        })),
        unreadCount,
        currentPage: parseInt(page),
        totalPages: Math.ceil(totalCount / parseInt(limit))
      }
    });
  } catch (error) {
    console.error('❌ Error fetching notifications:', error);
    console.error('❌ Error details:', {
      message: error.message,
      stack: error.stack,
      userId: req.user?.userId || req.user?.id
    });
    res.status(500).json({
      success: false,
      message: 'Gagal mengambil notifikasi',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Tandai notifikasi sebagai dibaca
const markAsRead = async (req, res) => {
  try {
    const { notificationId } = req.params;
    const userId = req.user.userId || req.user.id;

    await prisma.notifikasi.updateMany({
      where: { 
        id: notificationId, 
        userId 
      },
      data: { dibaca: true }
    });

    res.json({
      success: true,
      message: 'Notifikasi ditandai sebagai dibaca'
    });
  } catch (error) {
    console.error('Error marking notification as read:', error);
    res.status(500).json({
      success: false,
      message: 'Gagal menandai notifikasi'
    });
  }
};

// Tandai semua notifikasi sebagai dibaca
const markAllAsRead = async (req, res) => {
  try {
    const userId = req.user.userId || req.user.id;

    await prisma.notifikasi.updateMany({
      where: { 
        userId, 
        dibaca: false 
      },
      data: { dibaca: true }
    });

    res.json({
      success: true,
      message: 'Semua notifikasi ditandai sebagai dibaca'
    });
  } catch (error) {
    console.error('Error marking all notifications as read:', error);
    res.status(500).json({
      success: false,
      message: 'Gagal menandai semua notifikasi'
    });
  }
};

// Hapus notifikasi
const deleteNotification = async (req, res) => {
  try {
    const { notificationId } = req.params;
    const userId = req.user.userId || req.user.id;

    await prisma.notifikasi.deleteMany({
      where: { 
        id: notificationId, 
        userId 
      }
    });

    res.json({
      success: true,
      message: 'Notifikasi berhasil dihapus'
    });
  } catch (error) {
    console.error('Error deleting notification:', error);
    res.status(500).json({
      success: false,
      message: 'Gagal menghapus notifikasi'
    });
  }
};

// Helper functions untuk membuat notifikasi otomatis
const notificationHelpers = {
  // Notifikasi transaksi
  transaksiDibuat: (userId, transaksiId, namaGame) => 
    createNotification(
      userId, 
      'transaksi', 
      'Transaksi Baru Dibuat', 
      `Transaksi untuk akun ${namaGame} telah dibuat dan menunggu pembayaran`,
      transaksiId,
      'Transaksi'
    ),

  pembayaranDiterima: (userId, transaksiId, namaGame) => 
    createNotification(
      userId, 
      'transaksi', 
      'Pembayaran Diterima', 
      `Pembayaran untuk akun ${namaGame} telah diterima dan sedang diproses`,
      transaksiId,
      'Transaksi'
    ),

  transaksiSelesai: (userId, transaksiId, namaGame) => 
    createNotification(
      userId, 
      'transaksi', 
      'Transaksi Selesai', 
      `Transaksi untuk akun ${namaGame} telah berhasil diselesaikan`,
      transaksiId,
      'Transaksi'
    ),

  // Notifikasi produk
  produkTerjual: (userId, produkId, namaGame) => 
    createNotification(
      userId, 
      'transaksi', 
      'Produk Terjual!', 
      `🎉 Selamat! Akun ${namaGame} Anda telah berhasil terjual dan pembayaran telah diterima.`,
      produkId,
      'Produk'
    ),

  produkDibeli: (userId, produkId, namaGame) => 
    createNotification(
      userId, 
      'penawaran', 
      'Pembelian Berhasil', 
      `Anda berhasil membeli akun ${namaGame}`,
      produkId,
      'Produk'
    ),

  // Notifikasi sistem
  akunDiverifikasi: (userId) => 
    createNotification(
      userId, 
      'sistem', 
      'Akun Terverifikasi', 
      'Akun Anda telah berhasil diverifikasi dan dapat melakukan transaksi'
    ),

  walletTerhubung: (userId) => 
    createNotification(
      userId, 
      'sistem', 
      'Wallet Terhubung', 
      'Wallet Anda telah berhasil terhubung dan siap untuk transaksi'
    ),

  // Notifikasi urgent untuk navbar
  transaksiPerluPengiriman: (userId, transaksiId, namaGame) => 
    createNotification(
      userId, 
      'transaksi', 
      'Transaksi Perlu Pengiriman Akun', 
      `Pembeli sudah membayar untuk akun ${namaGame}. Segera kirim data akun!`,
      transaksiId,
      'Transaksi'
    ),

  akunSudahDikirim: (userId, transaksiId, namaGame) => 
    createNotification(
      userId, 
      'transaksi', 
      'Akun Sudah Dikirim', 
      `Penjual telah mengirim akun ${namaGame}. Silakan cek dan konfirmasi penerimaan.`,
      transaksiId,
      'Transaksi'
    )
};

module.exports = {
  createNotification,
  getNotifications,
  markAsRead,
  markAllAsRead,
  deleteNotification,
  notificationHelpers
};