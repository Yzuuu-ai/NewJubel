const multer = require('multer');
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const cloudinary = require('cloudinary').v2;
require('dotenv').config();
// Konfigurasi Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});
// Konfigurasi Cloudinary Storage
const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: process.env.CLOUDINARY_FOLDER || 'jubel-marketplace',
    allowed_formats: ['jpg', 'jpeg', 'png', 'gif', 'webp'],
    transformation: [
      {
        width: 1200,
        height: 1200,
        crop: 'limit',
        quality: 'auto:good',
        fetch_format: 'auto'
      }
    ],
    public_id: (req, file) => {
      // Generate unique filename
      const timestamp = Date.now();
      const random = Math.round(Math.random() * 1E9);
      return `product-${timestamp}-${random}`;
    },
  },
});
// Filter file - hanya gambar
const fileFilter = (req, file, cb) => {
  const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Hanya file gambar yang diizinkan (JPEG, PNG, GIF, WebP)'), false);
  }
};
// Konfigurasi multer dengan Cloudinary
const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB max
    files: 5 // Maksimal 5 file
  }
});
// Middleware untuk single file
const uploadSingle = upload.single('gambar');
// Middleware untuk multiple files
const uploadMultiple = upload.array('gambar', 5);
// Error handler untuk multer
const handleUploadError = (error, req, res, next) => {
  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        sukses: false,
        pesan: 'File terlalu besar. Maksimal 5MB per file.'
      });
    }
    if (error.code === 'LIMIT_FILE_COUNT') {
      return res.status(400).json({
        sukses: false,
        pesan: 'Terlalu banyak file. Maksimal 5 file.'
      });
    }
    if (error.code === 'LIMIT_UNEXPECTED_FILE') {
      return res.status(400).json({
        sukses: false,
        pesan: 'Field file tidak sesuai. Gunakan field "gambar".'
      });
    }
  }
  if (error.message.includes('Hanya file gambar')) {
    return res.status(400).json({
      sukses: false,
      pesan: error.message
    });
  }
  next(error);
};
// Function untuk hapus gambar dari Cloudinary
const deleteFromCloudinary = async (publicId) => {
  try {
    const result = await cloudinary.uploader.destroy(publicId);
    return result;
  } catch (error) {
    console.error('Error deleting from Cloudinary:', error);
    throw error;
  }
};
// Function untuk extract public_id dari Cloudinary URL
const extractPublicId = (cloudinaryUrl) => {
  try {
    // URL format: https://res.cloudinary.com/cloud-name/image/upload/v1234567890/folder/filename.jpg
    const parts = cloudinaryUrl.split('/');
    const filename = parts[parts.length - 1];
    const publicId = filename.split('.')[0];
    const folder = process.env.CLOUDINARY_FOLDER || 'jubel-marketplace';
    return `${folder}/${publicId}`;
  } catch (error) {
    console.error('Error extracting public_id:', error);
    return null;
  }
};
module.exports = {
  uploadSingle,
  uploadMultiple,
  handleUploadError,
  deleteFromCloudinary,
  extractPublicId,
  cloudinary
};
