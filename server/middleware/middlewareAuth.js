const jwt = require('jsonwebtoken');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const middlewareAuth = async (req, res, next) => {
  try {
    // Ambil token dari header
    const headerAuth = req.header('Authorization');
    if (!headerAuth) {
      return res.status(401).json({
        sukses: false,
        pesan: 'Akses ditolak. Token tidak ditemukan.'
      });
    }
    // Cek apakah token dimulai dengan 'Bearer '
    const token = headerAuth.startsWith('Bearer ') 
      ? headerAuth.slice(7) 
      : headerAuth;
    if (!token) {
      return res.status(401).json({
        sukses: false,
        pesan: 'Akses ditolak. Format token tidak valid.'
      });
    }
    // Verifikasi token
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'kunci-rahasia-jubel');
    
    // Jika token tidak memiliki role (token lama), ambil dari database
    if (!decoded.role) {
      console.log('🔄 Token lama tanpa role, mengambil dari database...');
      const user = await prisma.user.findUnique({
        where: { id: decoded.userId },
        select: { role: true, email: true }
      });
      
      if (!user) {
        return res.status(401).json({
          sukses: false,
          pesan: 'User tidak ditemukan.'
        });
      }
      
      // Tambahkan role ke decoded token
      decoded.role = user.role;
      decoded.email = user.email;
      console.log('✅ Role ditambahkan dari database:', user.role);
    }
    
    req.user = decoded;
    console.log('🔐 Auth middleware - User decoded:', {
      userId: decoded.userId || decoded.id,
      role: decoded.role,
      email: decoded.email
    });
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        sukses: false,
        pesan: 'Token sudah kedaluwarsa. Silakan masuk kembali.'
      });
    }
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        sukses: false,
        pesan: 'Token tidak valid.'
      });
    }
    console.error('Error middleware auth:', error);
    res.status(500).json({
      sukses: false,
      pesan: 'Kesalahan server saat autentikasi.'
    });
  }
};
module.exports = middlewareAuth;