// 🔍 Transaction Validation Middleware
// Memastikan field wajib terisi untuk setiap status transaksi
/**
 * Validasi field wajib berdasarkan status transaksi
 * @param {string} status - Status transaksi
 * @param {object} data - Data yang akan diupdate
 * @throws {Error} Jika ada field wajib yang hilang
 */
const validateTransactionUpdate = (status, data) => {
  // Definisi field wajib untuk setiap status
  const requiredFields = {
    'MENUNGGU_PEMBAYARAN': [],
    'DIBAYAR_SMARTCONTRACT': ['contractAddress', 'smartContractTxHash', 'waktuBayar'],
    'MENUNGGU_KIRIM_AKUN': [],
    'DIKIRIM': ['buktiPenjual'],
    'DIKONFIRMASI_PEMBELI': ['buktiPembeli'],
    'SENGKETA': [], // Akan divalidasi terpisah dengan record sengketa
    'SELESAI': ['waktuSelesai'],
    'REFUND': ['adminRefundAt', 'adminRefundBy'],
    'GAGAL': []
  };
  const required = requiredFields[status] || [];
  const missing = required.filter(field => !data[field] && data[field] !== 0);
  if (missing.length > 0) {
    throw new Error(`Field wajib tidak ada untuk status ${status}: ${missing.join(', ')}`);
  }
};
/**
 * Middleware untuk validasi update transaksi
 */
const validateTransactionMiddleware = (req, res, next) => {
  try {
    const { status } = req.body;
    if (status) {
      // Validasi status yang diizinkan
      const allowedStatuses = [
        'MENUNGGU_PEMBAYARAN',
        'DIBAYAR_SMARTCONTRACT', 
        'MENUNGGU_KIRIM_AKUN',
        'DIKIRIM',
        'DIKONFIRMASI_PEMBELI',
        'SENGKETA',
        'SELESAI',
        'REFUND',
        'GAGAL'
      ];
      if (!allowedStatuses.includes(status)) {
        return res.status(400).json({
          sukses: false,
          pesan: `Status tidak valid: ${status}. Status yang diizinkan: ${allowedStatuses.join(', ')}`
        });
      }
      // Validasi field wajib
      validateTransactionUpdate(status, req.body);
    }
    next();
  } catch (error) {
    return res.status(400).json({
      sukses: false,
      pesan: error.message
    });
  }
};
/**
 * Fungsi helper untuk memastikan field wajib terisi saat update
 * @param {string} status - Status baru
 * @param {object} existingData - Data transaksi yang sudah ada
 * @returns {object} Data dengan field wajib yang terisi
 */
const ensureRequiredFields = (status, existingData = {}) => {
  const data = { ...existingData };
  switch (status) {
    case 'DIBAYAR_SMARTCONTRACT':
      if (!data.contractAddress) {
        data.contractAddress = process.env.SMART_CONTRACT_ADDRESS || process.env.ESCROW_CONTRACT_ADDRESS;
      }
      if (!data.waktuBayar) {
        data.waktuBayar = new Date();
      }
      break;
    case 'DIKONFIRMASI_PEMBELI':
      if (!data.buktiPembeli) {
        data.buktiPembeli = 'Akun telah diterima dan dikonfirmasi oleh pembeli';
      }
      break;
    case 'SELESAI':
      if (!data.waktuSelesai) {
        data.waktuSelesai = new Date();
      }
      break;
    case 'REFUND':
      if (!data.adminRefundAt) {
        data.adminRefundAt = new Date();
      }
      if (!data.adminRefundBy) {
        data.adminRefundBy = 'SYSTEM_AUTO';
      }
      if (!data.adminRefundNote) {
        data.adminRefundNote = 'Auto-generated refund entry';
      }
      break;
  }
  return data;
};
/**
 * Validasi khusus untuk sengketa
 * Memastikan record sengketa ada saat status diubah ke SENGKETA
 */
const validateSengketaStatus = async (prisma, transaksiId) => {
  const sengketa = await prisma.sengketa.findFirst({
    where: { transaksiId }
  });
  if (!sengketa) {
    throw new Error('Status SENGKETA memerlukan record sengketa. Gunakan fungsi buatSengketa() terlebih dahulu.');
  }
  return sengketa;
};
/**
 * Fungsi untuk membuat sengketa dengan benar
 * @param {object} prisma - Prisma client
 * @param {string} transaksiId - ID transaksi
 * @param {string} userId - ID user yang membuat sengketa
 * @param {string} deskripsi - Deskripsi sengketa
 * @param {string} bukti - Bukti sengketa (opsional)
 */
const buatSengketaWithValidation = async (prisma, transaksiId, userId, deskripsi, bukti = null) => {
  return await prisma.$transaction(async (tx) => {
    // Cek apakah transaksi ada dan statusnya valid untuk sengketa
    const transaksi = await tx.transaksi.findUnique({
      where: { id: transaksiId },
      select: { 
        id: true, 
        status: true, 
        pembeliId: true, 
        penjualId: true 
      }
    });
    if (!transaksi) {
      throw new Error('Transaksi tidak ditemukan');
    }
    // Validasi user yang membuat sengketa adalah pembeli atau penjual
    if (userId !== transaksi.pembeliId && userId !== transaksi.penjualId) {
      throw new Error('Hanya pembeli atau penjual yang dapat membuat sengketa');
    }
    // Validasi status transaksi
    const validStatusForSengketa = ['DIKIRIM', 'DIKONFIRMASI_PEMBELI'];
    if (!validStatusForSengketa.includes(transaksi.status)) {
      throw new Error(`Sengketa hanya dapat dibuat untuk status: ${validStatusForSengketa.join(', ')}`);
    }
    // Cek apakah sudah ada sengketa aktif
    const existingSengketa = await tx.sengketa.findFirst({
      where: { 
        transaksiId,
        status: 'DIPROSES'
      }
    });
    if (existingSengketa) {
      throw new Error('Sudah ada sengketa aktif untuk transaksi ini');
    }
    // Update status transaksi
    await tx.transaksi.update({
      where: { id: transaksiId },
      data: { status: 'SENGKETA' }
    });
    // Buat record sengketa
    const sengketa = await tx.sengketa.create({
      data: {
        transaksiId,
        userId,
        deskripsi,
        status: 'DIPROSES',
        ...(bukti && { 
          [userId === transaksi.pembeliId ? 'pembeliBukti' : 'penjualBukti']: bukti 
        })
      }
    });
    return sengketa;
  });
};
module.exports = {
  validateTransactionUpdate,
  validateTransactionMiddleware,
  ensureRequiredFields,
  validateSengketaStatus,
  buatSengketaWithValidation
};
