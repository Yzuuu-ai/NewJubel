const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Update User Role
const updateUserRole = async (req, res) => {
  try {
    const { userId } = req.params;
    const { role } = req.body;
    
    // Validasi role yang diizinkan - ADMIN role dihapus untuk keamanan
    const allowedRoles = ['USER', 'PENJUAL'];
    if (!allowedRoles.includes(role)) {
      return res.status(400).json({
        sukses: false,
        pesan: 'Role tidak valid. Role yang diizinkan: USER, PENJUAL'
      });
    }

    // Blokir perubahan ke role ADMIN untuk keamanan
    if (role === 'ADMIN') {
      return res.status(403).json({
        sukses: false,
        pesan: 'Tidak dapat mengubah role menjadi ADMIN. Fitur ini telah dinonaktifkan untuk keamanan.'
      });
    }

    // Cek apakah user ada
    const existingUser = await prisma.user.findUnique({
      where: { id: userId },
      include: { profile: true }
    });

    if (!existingUser) {
      return res.status(404).json({
        sukses: false,
        pesan: 'User tidak ditemukan'
      });
    }

    // Update user role
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: { 
        role: role,
        // Jika diubah menjadi PENJUAL, set isPenjualTerverifikasi = true
        ...(role === 'PENJUAL' && { 
          isPenjualTerverifikasi: true,
          diverifikasiPada: new Date(),
          catatanPenjual: 'Diverifikasi langsung oleh admin'
        })
      },
      include: {
        profile: true
      }
    });

    // Buat notifikasi untuk user
    try {
      let notifikasiTipe = 'REGISTER';
      let judulNotifikasi = '';
      let pesanNotifikasi = '';

      if (role === 'PENJUAL') {
        notifikasiTipe = 'APLIKASI_PENJUAL_DISETUJUI';
        judulNotifikasi = '🎉 Selamat! Anda Sekarang Penjual Terverifikasi';
        pesanNotifikasi = 'Admin telah mengubah status Anda menjadi penjual terverifikasi. Anda sekarang dapat menjual produk di platform Jubel.';
      } else if (role === 'ADMIN') {
        judulNotifikasi = '👑 Anda Telah Menjadi Admin';
        pesanNotifikasi = 'Selamat! Anda telah diberikan akses administrator. Gunakan dengan bijak.';
      } else {
        judulNotifikasi = '📝 Role Akun Diperbarui';
        pesanNotifikasi = `Role akun Anda telah diubah menjadi ${role} oleh administrator.`;
      }

      await prisma.notifikasi.create({
        data: {
          userId: userId,
          tipe: notifikasiTipe,
          judul: judulNotifikasi,
          pesan: pesanNotifikasi
        }
      });
    } catch (notifError) {
      console.error('Error creating notification:', notifError);
      // Jangan gagalkan update role jika notifikasi gagal
    }

    res.json({
      sukses: true,
      pesan: `Role user berhasil diubah menjadi ${role}`,
      data: {
        user: {
          id: updatedUser.id,
          email: updatedUser.email,
          role: updatedUser.role,
          isPenjualTerverifikasi: updatedUser.isPenjualTerverifikasi,
          diverifikasiPada: updatedUser.diverifikasiPada,
          nama: updatedUser.profile?.nama || 'Belum diisi'
        }
      }
    });
  } catch (error) {
    console.error('Error updating user role:', error);
    res.status(500).json({
      sukses: false,
      pesan: 'Terjadi kesalahan server'
    });
  }
};

module.exports = { updateUserRole };