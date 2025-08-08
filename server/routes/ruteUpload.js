const express = require('express');
const router = express.Router();
const middlewareAuth = require('../middleware/middlewareAuth');
const { 
  uploadSingle, 
  uploadMultiple, 
  handleUploadError, 
  deleteFromCloudinary, 
  extractPublicId 
} = require('../middleware/cloudinaryUpload');
// Upload single image (dengan auth)
router.post('/single', middlewareAuth, (req, res) => {
  uploadSingle(req, res, (err) => {
    if (err) {
      return handleUploadError(err, req, res, () => {
        res.status(500).json({
          sukses: false,
          pesan: 'Gagal upload file'
        });
      });
    }
    if (!req.file) {
      return res.status(400).json({
        sukses: false,
        pesan: 'Tidak ada file yang diupload'
      });
    }
    // Cloudinary sudah memberikan URL langsung
    res.json({
      sukses: true,
      pesan: 'Gambar berhasil diupload ke cloud! ☁️',
      data: {
        filename: req.file.filename,
        originalName: req.file.originalname,
        size: req.file.size,
        url: req.file.path, // Cloudinary URL
        publicId: req.file.public_id
      }
    });
  });
});
// Upload multiple images
router.post('/multiple', middlewareAuth, (req, res) => {
  uploadMultiple(req, res, (err) => {
    if (err) {
      return handleUploadError(err, req, res, () => {
        res.status(500).json({
          sukses: false,
          pesan: 'Gagal upload file'
        });
      });
    }
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({
        sukses: false,
        pesan: 'Tidak ada file yang diupload'
      });
    }
    // Cloudinary URLs untuk semua file
    const files = req.files.map(file => ({
      filename: file.filename,
      originalName: file.originalname,
      size: file.size,
      url: file.path, // Cloudinary URL
      publicId: file.public_id
    }));
    res.json({
      sukses: true,
      pesan: `${req.files.length} gambar berhasil diupload ke cloud! ☁️`,
      data: {
        files: files,
        urls: files.map(f => f.url)
      }
    });
  });
});
// Delete uploaded file from Cloudinary
router.delete('/cloudinary', middlewareAuth, async (req, res) => {
  try {
    const { url } = req.body;
    if (!url) {
      return res.status(400).json({
        sukses: false,
        pesan: 'URL gambar wajib diisi'
      });
    }
    // Extract public_id dari Cloudinary URL
    const publicId = extractPublicId(url);
    if (!publicId) {
      return res.status(400).json({
        sukses: false,
        pesan: 'URL Cloudinary tidak valid'
      });
    }
    // Hapus dari Cloudinary
    const result = await deleteFromCloudinary(publicId);
    if (result.result === 'ok') {
      res.json({
        sukses: true,
        pesan: 'Gambar berhasil dihapus dari cloud! 🗑️'
      });
    } else {
      res.status(404).json({
        sukses: false,
        pesan: 'Gambar tidak ditemukan di cloud'
      });
    }
  } catch (error) {
    console.error('Error deleting from Cloudinary:', error);
    res.status(500).json({
      sukses: false,
      pesan: 'Gagal menghapus gambar dari cloud'
    });
  }
});
module.exports = router;
