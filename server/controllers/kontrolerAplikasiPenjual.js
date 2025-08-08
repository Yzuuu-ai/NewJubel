const { PrismaClient } = require('@prisma/client');
const { createNotification } = require('./kontrolerNotifikasi');

const prisma = new PrismaClient();

// User mengajukan aplikasi menjadi penjual
const ajukanAplikasiPenjual = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { nomor_telepon, nomor_whatsapp, alamat, alasan_jual } = req.body;

    // Validasi input
    if (!nomor_telepon || !alamat) {
      return res.status(400).json({
        error: 'Nomor telepon dan alamat lengkap wajib diisi'
      });
    }

    // Cek apakah user sudah mengajukan aplikasi
    const aplikasiExisting = await prisma.aplikasi_penjual.findUnique({
      where: { userId }
    });

    if (aplikasiExisting) {
      return res.status(400).json({
        error: 'Anda sudah mengajukan aplikasi penjual sebelumnya'
      });
    }

    // Cek apakah user sudah menjadi penjual
    const user = await prisma.user.findUnique({
      where: { id: userId }
    });

    if (user.role === 'PENJUAL') {
      return res.status(400).json({
        error: 'Anda sudah menjadi penjual'
      });
    }

    // Buat aplikasi penjual
    const aplikasi = await prisma.aplikasi_penjual.create({
      data: {
        id: `aplikasi_${Date.now()}_${userId.slice(-6)}`,
        userId,
        nomor_telepon,
        nomor_whatsapp,
        alamat,
        alasan_jual,
        status: 'MENUNGGU'
      }
    });

    // Update role user menjadi PENJUAL (tapi belum terverifikasi)
    await prisma.user.update({
      where: { id: userId },
      data: { role: 'PENJUAL' }
    });

    // Kirim notifikasi ke user
    await createNotification(
      userId,
      'sistem',
      'Aplikasi Penjual Diajukan',
      'Aplikasi Anda untuk menjadi penjual telah diajukan dan sedang menunggu review admin.'
    );

    // Kirim notifikasi ke semua admin
    const admins = await prisma.user.findMany({
      where: { role: 'ADMIN' }
    });

    for (const admin of admins) {
      await createNotification(
        admin.id,
        'sistem',
        'Aplikasi Penjual Baru',
        `Ada aplikasi penjual baru dari ${user.email} yang perlu direview.`
      );
    }

    res.status(201).json({
      message: 'Aplikasi penjual berhasil diajukan',
      data: aplikasi
    });

  } catch (error) {
    console.error('Error mengajukan aplikasi penjual:', error);
    res.status(500).json({
      error: 'Terjadi kesalahan saat mengajukan aplikasi penjual'
    });
  }
};

// User cek status aplikasi penjual
const cekStatusAplikasi = async (req, res) => {
  try {
    const userId = req.user.userId;

    const aplikasi = await prisma.aplikasi_penjual.findUnique({
      where: { userId },
      include: {
        user: {
          select: {
            email: true,
            role: true
          }
        }
      }
    });

    if (!aplikasi) {
      return res.status(404).json({
        error: 'Aplikasi penjual tidak ditemukan'
      });
    }

    res.json({
      message: 'Status aplikasi penjual',
      data: aplikasi
    });

  } catch (error) {
    console.error('Error cek status aplikasi:', error);
    res.status(500).json({
      error: 'Terjadi kesalahan saat mengecek status aplikasi'
    });
  }
};

// Admin: Ambil semua aplikasi penjual
const ambilSemuaAplikasi = async (req, res) => {
  try {
    const { status, page = 1, limit = 10 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    let where = {};
    if (status) {
      where.status = status;
    }

    const [aplikasi, total] = await Promise.all([
      prisma.aplikasi_penjual.findMany({
        where,
        include: {
          user: {
            select: {
              email: true,
              role: true
            }
          }
        },
        orderBy: { diajukan_pada: 'desc' },
        skip,
        take: parseInt(limit)
      }),
      prisma.aplikasi_penjual.count({ where })
    ]);

    res.json({
      message: 'Daftar aplikasi penjual',
      data: aplikasi,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(total / parseInt(limit))
      }
    });

  } catch (error) {
    console.error('Error ambil aplikasi:', error);
    res.status(500).json({
      error: 'Terjadi kesalahan saat mengambil daftar aplikasi'
    });
  }
};

// Admin: Review aplikasi penjual (setujui/tolak)
const reviewAplikasi = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, catatan_admin } = req.body;

    console.log('Review aplikasi request:', { id, status, catatan_admin });

    // Validasi status
    if (!['DISETUJUI', 'DITOLAK'].includes(status)) {
      return res.status(400).json({
        error: 'Status harus DISETUJUI atau DITOLAK'
      });
    }

    // Validasi catatan admin
    if (!catatan_admin || catatan_admin.trim() === '') {
      return res.status(400).json({
        error: 'Catatan admin wajib diisi'
      });
    }

    // Cari aplikasi
    const aplikasi = await prisma.aplikasi_penjual.findUnique({
      where: { id },
      include: { user: true }
    });

    if (!aplikasi) {
      return res.status(404).json({
        error: 'Aplikasi tidak ditemukan'
      });
    }

    if (aplikasi.status !== 'MENUNGGU') {
      return res.status(400).json({
        error: 'Aplikasi sudah direview sebelumnya'
      });
    }

    console.log('Aplikasi ditemukan:', aplikasi);

    // Gunakan transaction untuk memastikan konsistensi data
    const result = await prisma.$transaction(async (tx) => {
      // Update aplikasi
      const aplikasiUpdate = await tx.aplikasi_penjual.update({
        where: { id },
        data: {
          status,
          catatan_admin: catatan_admin.trim()
        }
      });

      console.log('Aplikasi updated:', aplikasiUpdate);

      if (status === 'DISETUJUI') {
        // Update role user menjadi PENJUAL yang terverifikasi
        const userUpdate = await tx.user.update({
          where: { id: aplikasi.userId },
          data: {
            role: 'PENJUAL'
          }
        });

        console.log('User updated (DISETUJUI):', userUpdate);

      } else if (status === 'DITOLAK') {
        // Kembalikan role ke USER
        const userUpdate = await tx.user.update({
          where: { id: aplikasi.userId },
          data: {
            role: 'USER'
          }
        });

        console.log('User updated (DITOLAK):', userUpdate);
      }

      return aplikasiUpdate;
    });

    console.log('Transaction completed successfully:', result);

    // Kirim notifikasi setelah transaksi selesai
    try {
      if (status === 'DISETUJUI') {
        await createNotification(
          aplikasi.userId,
          'sistem',
          'Aplikasi Penjual Disetujui',
          'Selamat! Aplikasi Anda untuk menjadi penjual telah disetujui. Anda sekarang dapat mulai menjual produk.'
        );
      } else if (status === 'DITOLAK') {
        await createNotification(
          aplikasi.userId,
          'sistem',
          'Aplikasi Penjual Ditolak',
          `Maaf, aplikasi Anda untuk menjadi penjual ditolak. Alasan: ${catatan_admin}`
        );
      }
    } catch (notifError) {
      console.error('Error sending notification:', notifError);
      // Jangan gagalkan response karena notifikasi error
    }

    res.json({
      message: `Aplikasi berhasil ${status.toLowerCase()}`,
      data: result
    });

  } catch (error) {
    console.error('Error review aplikasi:', error);
    console.error('Error stack:', error.stack);
    res.status(500).json({
      error: 'Terjadi kesalahan saat mereview aplikasi',
      details: error.message
    });
  }
};

// Admin: Ambil statistik aplikasi penjual
const statistikAplikasi = async (req, res) => {
  try {
    const [menunggu, disetujui, ditolak, total] = await Promise.all([
      prisma.aplikasi_penjual.count({ where: { status: 'MENUNGGU' } }),
      prisma.aplikasi_penjual.count({ where: { status: 'DISETUJUI' } }),
      prisma.aplikasi_penjual.count({ where: { status: 'DITOLAK' } }),
      prisma.aplikasi_penjual.count()
    ]);

    const penjualAktif = await prisma.user.count({
      where: {
        role: 'PENJUAL'
      }
    });

    res.json({
      message: 'Statistik aplikasi penjual',
      data: {
        total,
        menunggu,
        disetujui,
        ditolak,
        penjualAktif
      }
    });

  } catch (error) {
    console.error('Error statistik aplikasi:', error);
    res.status(500).json({
      error: 'Terjadi kesalahan saat mengambil statistik'
    });
  }
};

module.exports = {
  ajukanAplikasiPenjual,
  cekStatusAplikasi,
  ambilSemuaAplikasi,
  reviewAplikasi,
  statistikAplikasi
};