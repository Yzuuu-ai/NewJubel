const multer = require('multer');
const path = require('path');
const fs = require('fs');
// Pastikan folder uploads ada
const uploadDir = path.join(__dirname, '../uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}
// Konfigurasi storage
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    // Generate nama file unik
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, 'product-' + uniqueSuffix + ext);
  }
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
// Konfigurasi multer
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
module.exports = {
  uploadSingle,
  uploadMultiple,
  handleUploadError
};
