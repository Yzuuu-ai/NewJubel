const express = require('express');
const router = express.Router();
const kontrolerProduk = require('../controllers/kontrolerProduk');
const middlewareAuth = require('../middleware/middlewareAuth');
// Public routes (tidak perlu login)
router.get('/', kontrolerProduk.ambilSemuaProduk);
router.get('/game-populer', kontrolerProduk.ambilGamePopuler);
router.get('/suggested-prices', kontrolerProduk.ambilSuggestedPrices);
router.get('/konversi-eth', kontrolerProduk.konversiEthKeIdr);
// Protected routes (perlu login) - PERBAIKAN: Letakkan route spesifik sebelum route dengan parameter
router.get('/saya/daftar', middlewareAuth, kontrolerProduk.ambilProdukSaya);
router.post('/', middlewareAuth, kontrolerProduk.tambahProduk);
router.put('/:id', middlewareAuth, kontrolerProduk.updateProduk);
router.delete('/:id', middlewareAuth, kontrolerProduk.hapusProduk);
// Route dengan parameter harus di akhir
router.get('/:id', kontrolerProduk.ambilProdukById);
module.exports = router;
