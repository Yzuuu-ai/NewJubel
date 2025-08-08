const express = require('express');
const router = express.Router();
const kontrolerTransaksi = require('../controllers/kontrolerTransaksi');
const middlewareAuth = require('../middleware/middlewareAuth');

// Semua route transaksi memerlukan authentication
router.use(middlewareAuth);

// POST /api/transaksi - Buat transaksi baru (Pembeli klik "Beli Sekarang")
router.post('/', kontrolerTransaksi.buatTransaksi);

// GET /api/transaksi - Ambil transaksi user (sebagai pembeli atau penjual)
router.get('/', kontrolerTransaksi.ambilTransaksiUser);

// GET /api/transaksi/saya - Ambil transaksi user dengan filter role yang lebih spesifik
router.get('/saya', kontrolerTransaksi.ambilTransaksiUser);

// GET /api/transaksi/:id - Ambil detail transaksi
router.get('/:id', kontrolerTransaksi.ambilDetailTransaksi);

// PUT /api/transaksi/:id/konfirmasi-pembayaran - Konfirmasi pembayaran (setelah bayar ke smart contract)
router.put('/:id/konfirmasi-pembayaran', kontrolerTransaksi.konfirmasiPembayaran);

// PUT /api/transaksi/:id/status - Update status transaksi (untuk expired transactions)
router.put('/:id/status', kontrolerTransaksi.updateStatusTransaksi);

// PUT /api/transaksi/:id/kirim-akun - Penjual kirim akun (upload bukti)
router.put('/:id/kirim-akun', kontrolerTransaksi.kirimAkun);

// PUT /api/transaksi/:id/konfirmasi-penerimaan - Pembeli konfirmasi terima akun
router.put('/:id/konfirmasi-penerimaan', kontrolerTransaksi.konfirmasiPenerimaan);

// POST /api/transaksi/:id/sengketa - HANYA PEMBELI buat sengketa
router.post('/:id/sengketa', kontrolerTransaksi.buatSengketa);

// GET /api/transaksi/:id/sengketa - Ambil detail sengketa
router.get('/:id/sengketa', kontrolerTransaksi.ambilDetailSengketa);

// GET /api/transaksi/:id/sengketa/check - Check status sengketa dan permissions
router.get('/:id/sengketa/check', kontrolerTransaksi.checkSengketa);

// POST /api/sengketa/:id/pembelaan - HANYA PENJUAL buat pembelaan
router.post('/sengketa/:id/pembelaan', kontrolerTransaksi.buatPembelaan);

// GET /api/transaksi/:id/refund - Ambil data refund untuk transaksi
router.get('/:id/refund', kontrolerTransaksi.ambilDataRefund);

// GET /api/transaksi/:id/pemenang - Ambil data pemenang (pembeli/penjual) untuk transaksi
router.get('/:id/pemenang', kontrolerTransaksi.ambilPemenang);

module.exports = router;