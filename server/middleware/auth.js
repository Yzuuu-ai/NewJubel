const jwt = require('jsonwebtoken');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
// Middleware untuk autentikasi token
const authenticateToken = (req, res, next) => {
  try {
    // Ambil token dari header
    const headerAuth = req.header('Authorization');
    if (!headerAuth) {
      return res.status(401).json({
        success: false,
        message: 'Access denied. Token not found.'
      });
    }
    // Cek apakah token dimulai dengan 'Bearer '
    const token = headerAuth.startsWith('Bearer ') 
      ? headerAuth.slice(7) 
      : headerAuth;
    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Access denied. Invalid token format.'
      });
    }
    // Verifikasi token
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-jwt-secret-key-here');
    req.user = { id: decoded.userId, userId: decoded.userId };
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        message: 'Token expired. Please login again.'
      });
    }
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        success: false,
        message: 'Invalid token.'
      });
    }
    console.error('Error in auth middleware:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during authentication.'
    });
  }
};
// Middleware untuk memastikan user adalah admin
const requireAdmin = async (req, res, next) => {
  try {
    const userId = req.user.id;
    // Cek apakah user ada dan memiliki role admin
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { 
        id: true, 
        email: true, 
        role: true 
      }
    });
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found.'
      });
    }
    if (user.role !== 'ADMIN') {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Admin privileges required.'
      });
    }
    // Tambahkan informasi user ke request untuk digunakan di route handler
    req.user = { ...req.user, role: user.role };
    next();
  } catch (error) {
    console.error('Error in requireAdmin middleware:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during admin verification.'
    });
  }
};
module.exports = {
  authenticateToken,
  requireAdmin
};
