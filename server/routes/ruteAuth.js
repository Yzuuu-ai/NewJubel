const express = require('express');
const router = express.Router();
const kontrolerAuth = require('../controllers/kontrolerAuth');
const middlewareAuth = require('../middleware/middlewareAuth');

// Rute publik
router.post('/daftar', kontrolerAuth.daftar);
router.post('/masuk', kontrolerAuth.masuk);
router.post('/keluar', middlewareAuth, kontrolerAuth.keluar);

// Rute yang dilindungi
router.get('/profil', middlewareAuth, kontrolerAuth.ambilProfil);
router.put('/profil', middlewareAuth, kontrolerAuth.perbaruiProfil);
router.post('/hubungkan-wallet', middlewareAuth, kontrolerAuth.hubungkanWallet);
router.get('/validasi', middlewareAuth, kontrolerAuth.validasiToken);

// Rute untuk validasi wallet
router.get('/cek-wallet', kontrolerAuth.cekWalletTersedia);

module.exports = router;