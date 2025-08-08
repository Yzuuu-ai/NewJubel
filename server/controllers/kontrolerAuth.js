const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { PrismaClient } = require('@prisma/client');
const { v4: uuidv4 } = require('uuid');
const prisma = new PrismaClient();

// Buat JWT Token
const buatToken = (userId, role) => {
  return jwt.sign(
    { userId, role },
    process.env.JWT_SECRET || 'kunci-rahasia-jubel',
    { expiresIn: '7d' }
  );
};

// Daftar Pengguna Baru
const daftar = async (req, res) => {
  try {
    const { email, password, nama, nomor_telepon, role = 'PEMBELI' } = req.body;

    // Validasi input
    if (!email || !password || !nama) {
      return res.status(400).json({
        sukses: false,
        pesan: 'Email, password, dan nama wajib diisi'
      });
    }

    // Validasi nomor telepon wajib untuk PENJUAL
    if (role === 'PENJUAL' && (!nomor_telepon || !nomor_telepon.trim())) {
      return res.status(400).json({
        sukses: false,
        pesan: 'Nomor telepon wajib diisi untuk penjual'
      });
    }

    // Blokir pembuatan akun dengan role ADMIN untuk keamanan
    if (role === 'ADMIN') {
      return res.status(403).json({
        sukses: false,
        pesan: 'Tidak dapat membuat akun dengan role ADMIN. Fitur ini telah dinonaktifkan untuk keamanan.'
      });
    }

    // Validasi role yang diizinkan
    const allowedRoles = ['PEMBELI', 'PENJUAL'];
    if (!allowedRoles.includes(role)) {
      return res.status(400).json({
        sukses: false,
        pesan: 'Role tidak valid. Role yang diizinkan: PEMBELI, PENJUAL'
      });
    }

    // Cek apakah pengguna sudah ada
    const penggunaAda = await prisma.user.findUnique({
      where: { email }
    });

    if (penggunaAda) {
      return res.status(400).json({
        sukses: false,
        pesan: 'Email sudah terdaftar'
      });
    }

    // Cek apakah nomor telepon sudah digunakan (jika diisi)
    if (nomor_telepon && nomor_telepon.trim()) {
      const nomorTeleponAda = await prisma.profile.findUnique({
        where: { nomor_telepon: nomor_telepon.trim() }
      });

      if (nomorTeleponAda) {
        return res.status(400).json({
          sukses: false,
          pesan: 'Nomor telepon sudah terdaftar'
        });
      }
    }

    // Hash password
    const saltRounds = 12;
    const passwordTerenkripsi = await bcrypt.hash(password, saltRounds);

    // Generate IDs
    const userId = uuidv4();
    const profileId = uuidv4();

    // Buat pengguna dengan profil
    const pengguna = await prisma.user.create({
      data: {
        id: userId,
        email,
        password: passwordTerenkripsi,
        role,
        profile: {
          create: {
            id: profileId,
            nama,
            ...(nomor_telepon && { nomor_telepon }) // Tambahkan nomor_telepon jika ada
          }
        }
      },
      include: {
        profile: true
      }
    });

    // Buat token dengan role
    const token = buatToken(pengguna.id, pengguna.role);

    res.status(201).json({
      sukses: true,
      pesan: 'Pendaftaran berhasil! Selamat bergabung di Jubel 🎉',
      data: {
        pengguna: {
          id: pengguna.id,
          email: pengguna.email,
          role: pengguna.role,
          profil: {
            nama: pengguna.profile.nama,
            nomor_telepon: pengguna.profile.nomor_telepon
          },
          walletAddress: pengguna.walletAddress,
          dibuatPada: pengguna.dibuatPada
        },
        token
      }
    });
  } catch (error) {
    console.error('Error pendaftaran:', error);
    
    // Handle Prisma unique constraint error
    if (error.code === 'P2002') {
      if (error.meta?.target?.includes('email')) {
        return res.status(400).json({
          sukses: false,
          pesan: 'Email sudah terdaftar'
        });
      }
      if (error.meta?.target?.includes('nomor_telepon')) {
        return res.status(400).json({
          sukses: false,
          pesan: 'Nomor telepon sudah terdaftar'
        });
      }
    }
    
    res.status(500).json({
      sukses: false,
      pesan: 'Terjadi kesalahan server'
    });
  }
};

// Masuk/Login Pengguna
const masuk = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validasi input
    if (!email || !password) {
      return res.status(400).json({
        sukses: false,
        pesan: 'Email dan password wajib diisi'
      });
    }

    // Cari pengguna
    const pengguna = await prisma.user.findUnique({
      where: { email },
      include: {
        profile: true
      }
    });

    if (!pengguna) {
      return res.status(401).json({
        sukses: false,
        pesan: 'Email atau password salah'
      });
    }

    // Cek password
    const passwordValid = await bcrypt.compare(password, pengguna.password);
    if (!passwordValid) {
      return res.status(401).json({
        sukses: false,
        pesan: 'Email atau password salah'
      });
    }

    // Buat token dengan role
    const token = buatToken(pengguna.id, pengguna.role);

    res.json({
      sukses: true,
      pesan: `Selamat datang kembali, ${pengguna.profile?.nama || 'Sobat Jubel'}! 🎉`,
      data: {
        pengguna: {
          id: pengguna.id,
          email: pengguna.email,
          role: pengguna.role,
          profil: {
            nama: pengguna.profile?.nama || '',
            nomor_telepon: pengguna.profile?.nomor_telepon || ''
          },
          walletAddress: pengguna.walletAddress,
          dibuatPada: pengguna.dibuatPada
        },
        token
      }
    });
  } catch (error) {
    console.error('Error masuk:', error);
    res.status(500).json({
      sukses: false,
      pesan: 'Terjadi kesalahan server'
    });
  }
};

// Keluar/Logout Pengguna
const keluar = async (req, res) => {
  try {
    // Untuk JWT, logout biasanya dilakukan di client-side dengan menghapus token
    // Namun kita bisa menambahkan logging atau blacklist token jika diperlukan
    
    const userId = req.user?.userId;
    console.log(`User ${userId} logged out at ${new Date().toISOString()}`);
    
    res.json({
      sukses: true,
      pesan: 'Berhasil keluar. Sampai jumpa lagi! 👋'
    });
  } catch (error) {
    console.error('Error logout:', error);
    res.status(500).json({
      sukses: false,
      pesan: 'Terjadi kesalahan server'
    });
  }
};

// Ambil Profil Pengguna
const ambilProfil = async (req, res) => {
  try {
    const userId = req.user.userId;

    const pengguna = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        profile: true
      }
    });

    if (!pengguna) {
      return res.status(404).json({
        sukses: false,
        pesan: 'Pengguna tidak ditemukan'
      });
    }

    res.json({
      sukses: true,
      data: {
        pengguna: {
          id: pengguna.id,
          email: pengguna.email,
          role: pengguna.role,
          profil: {
            nama: pengguna.profile?.nama || '',
            nomor_telepon: pengguna.profile?.nomor_telepon || ''
          },
          walletAddress: pengguna.walletAddress,
          dibuatPada: pengguna.dibuatPada
        }
      }
    });
  } catch (error) {
    console.error('Error ambil profil:', error);
    res.status(500).json({
      sukses: false,
      pesan: 'Terjadi kesalahan server'
    });
  }
};

// Perbarui Profil Pengguna
const perbaruiProfil = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { nama, nomor_telepon, alamat, alamatWallet } = req.body;

    console.log('🔄 Updating profile for user:', userId);
    console.log('📝 Profile data:', { nama, nomor_telepon, alamat, alamatWallet });

    // Validasi dan cek wallet address jika dikirim
    if (alamatWallet) {
      // Validasi format alamat Ethereum
      if (!/^0x[a-fA-F0-9]{40}$/.test(alamatWallet)) {
        return res.status(400).json({
          sukses: false,
          pesan: 'Format alamat wallet tidak valid'
        });
      }

      // Cek apakah user sudah memiliki wallet terdaftar
      const userCurrent = await prisma.user.findUnique({
        where: { id: userId }
      });

      if (userCurrent.walletAddress) {
        return res.status(400).json({
          sukses: false,
          pesan: 'Wallet sudah terhubung secara permanen dan tidak dapat diubah'
        });
      }

      // Cek apakah wallet sudah digunakan pengguna lain
      const penggunaLain = await prisma.user.findFirst({
        where: {
          walletAddress: alamatWallet,
          id: { not: userId }
        }
      });

      if (penggunaLain) {
        return res.status(400).json({
          sukses: false,
          pesan: 'Alamat wallet sudah digunakan pengguna lain'
        });
      }
    }

    // Cek apakah nomor telepon sudah digunakan pengguna lain (jika diubah)
    if (nomor_telepon !== undefined && nomor_telepon && nomor_telepon.trim()) {
      const nomorTeleponAda = await prisma.profile.findFirst({
        where: {
          nomor_telepon: nomor_telepon.trim(),
          userId: { not: userId }
        }
      });

      if (nomorTeleponAda) {
        return res.status(400).json({
          sukses: false,
          pesan: 'Nomor telepon sudah digunakan pengguna lain'
        });
      }
    }

    // Update alamat wallet pengguna (hanya jika alamatWallet dikirim dan user belum punya wallet)
    const penggunaUpdate = await prisma.user.update({
      where: { id: userId },
      data: {
        ...(alamatWallet !== undefined && { walletAddress: alamatWallet })
      },
      include: {
        profile: true
      }
    });

    // Update profil (hanya field yang ada di schema)
    const profilUpdate = await prisma.profile.upsert({
      where: { userId },
      update: {
        ...(nama && { nama }),
        ...(nomor_telepon !== undefined && { nomor_telepon }),
        ...(alamat !== undefined && { alamat })
      },
      create: {
        id: uuidv4(),
        userId,
        nama: nama || '',
        ...(nomor_telepon && { nomor_telepon }),
        ...(alamat && { alamat })
      }
    });

    console.log('✅ Profile updated successfully');

    res.json({
      sukses: true,
      pesan: 'Profil berhasil diperbarui! ✨',
      data: {
        id: penggunaUpdate.id,
        email: penggunaUpdate.email,
        role: penggunaUpdate.role,
        walletAddress: penggunaUpdate.walletAddress,
        dibuatPada: penggunaUpdate.dibuatPada,
        profil: {
          nama: profilUpdate.nama,
          nomor_telepon: profilUpdate.nomor_telepon,
          alamat: profilUpdate.alamat
        }
      }
    });
  } catch (error) {
    console.error('❌ Error perbarui profil:', error);
    console.error('❌ Error details:', {
      message: error.message,
      code: error.code,
      meta: error.meta,
      stack: error.stack
    });
    
    // Handle Prisma unique constraint error
    if (error.code === 'P2002') {
      if (error.meta?.target?.includes('walletAddress')) {
        return res.status(400).json({
          sukses: false,
          pesan: 'Alamat wallet sudah digunakan pengguna lain'
        });
      }
      if (error.meta?.target?.includes('nomor_telepon')) {
        return res.status(400).json({
          sukses: false,
          pesan: 'Nomor telepon sudah digunakan pengguna lain'
        });
      }
    }

    res.status(500).json({
      sukses: false,
      pesan: 'Terjadi kesalahan server: ' + error.message
    });
  }
};

// Hubungkan Wallet
const hubungkanWallet = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { alamatWallet } = req.body;

    if (!alamatWallet) {
      return res.status(400).json({
        sukses: false,
        pesan: 'Alamat wallet wajib diisi'
      });
    }

    // Validasi format alamat Ethereum
    if (!/^0x[a-fA-F0-9]{40}$/.test(alamatWallet)) {
      return res.status(400).json({
        sukses: false,
        pesan: 'Format alamat wallet tidak valid'
      });
    }

    // Cek apakah user sudah memiliki wallet terdaftar
    const userCurrent = await prisma.user.findUnique({
      where: { id: userId }
    });

    if (userCurrent.walletAddress) {
      return res.status(400).json({
        sukses: false,
        pesan: 'Wallet sudah terhubung secara permanen dan tidak dapat diubah'
      });
    }

    // Cek apakah wallet sudah digunakan pengguna lain
    const penggunaLain = await prisma.user.findFirst({
      where: {
        walletAddress: alamatWallet,
        id: { not: userId }
      }
    });

    if (penggunaLain) {
      return res.status(400).json({
        sukses: false,
        pesan: 'Alamat wallet sudah digunakan pengguna lain'
      });
    }

    // Update alamat wallet pengguna
    const penggunaUpdate = await prisma.user.update({
      where: { id: userId },
      data: {
        walletAddress: alamatWallet
      },
      include: {
        profile: true
      }
    });

    res.json({
      sukses: true,
      pesan: 'Wallet berhasil terhubung! 🔗',
      data: {
        pengguna: {
          id: penggunaUpdate.id,
          email: penggunaUpdate.email,
          role: penggunaUpdate.role,
          profil: {
            nama: penggunaUpdate.profile?.nama || '',
            nomor_telepon: penggunaUpdate.profile?.nomor_telepon || ''
          },
          walletAddress: penggunaUpdate.walletAddress,
          dibuatPada: penggunaUpdate.dibuatPada
        }
      }
    });
  } catch (error) {
    console.error('Error hubungkan wallet:', error);
    // Handle Prisma unique constraint error
    if (error.code === 'P2002' && error.meta?.target?.includes('walletAddress')) {
      return res.status(400).json({
        sukses: false,
        pesan: 'Alamat wallet sudah digunakan pengguna lain'
      });
    }

    res.status(500).json({
      sukses: false,
      pesan: 'Terjadi kesalahan server'
    });
  }
};

// Cek Ketersediaan Wallet Address
const cekWalletTersedia = async (req, res) => {
  try {
    const { alamatWallet } = req.query;
    console.log('🔍 Checking wallet availability for:', alamatWallet);
    
    if (!alamatWallet) {
      console.log('❌ No wallet address provided');
      return res.status(400).json({
        sukses: false,
        pesan: 'Alamat wallet wajib diisi'
      });
    }
    
    // Validasi format alamat Ethereum
    if (!/^0x[a-fA-F0-9]{40}$/.test(alamatWallet)) {
      console.log('❌ Invalid wallet format:', alamatWallet);
      return res.status(400).json({
        sukses: false,
        pesan: 'Format alamat wallet tidak valid'
      });
    }
    
    // Cek apakah wallet sudah digunakan
    const penggunaAda = await prisma.user.findFirst({
      where: {
        walletAddress: alamatWallet
      },
      select: {
        id: true,
        email: true
      }
    });
    
    if (penggunaAda) {
      console.log('❌ Wallet already used by user:', penggunaAda.email);
      return res.json({
        sukses: false,
        tersedia: false,
        pesan: 'Alamat wallet sudah digunakan pengguna lain',
        data: {
          digunakan: true,
          emailPengguna: penggunaAda.email.substring(0, 3) + '***' // Partial email untuk privacy
        }
      });
    }
    
    console.log('✅ Wallet available:', alamatWallet);
    res.json({
      sukses: true,
      tersedia: true,
      pesan: 'Alamat wallet tersedia',
      data: {
        digunakan: false
      }
    });
  } catch (error) {
    console.error('❌ Error cek wallet tersedia:', error);
    res.status(500).json({
      sukses: false,
      pesan: 'Terjadi kesalahan server'
    });
  }
};

// Validasi Token
const validasiToken = async (req, res) => {
  try {
    const userId = req.user.userId;

    const pengguna = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        profile: true
      }
    });

    if (!pengguna) {
      return res.status(404).json({
        sukses: false,
        pesan: 'User tidak ditemukan'
      });
    }

    res.json({
      sukses: true,
      pesan: 'Token valid',
      user: {
        id: pengguna.id,
        email: pengguna.email,
        role: pengguna.role,
        walletAddress: pengguna.walletAddress,
        nama: pengguna.profile?.nama || 'User',
        nomor_telepon: pengguna.profile?.nomor_telepon || '',
        alamat: pengguna.profile?.alamat || '',
        dibuatPada: pengguna.dibuatPada
      }
    });
  } catch (error) {
    console.error('Error validate token:', error);
    res.status(500).json({
      sukses: false,
      pesan: 'Terjadi kesalahan server'
    });
  }
};

module.exports = {
  daftar,
  masuk,
  keluar,
  ambilProfil,
  perbaruiProfil,
  hubungkanWallet,
  cekWalletTersedia,
  validasiToken
};