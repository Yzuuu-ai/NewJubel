const { PrismaClient } = require('@prisma/client');
const { 
  cleanImageData, 
  parseImageData, 
  formatProductWithImages,
  validateImageRequest 
} = require('../utils/imageHelper');
const prisma = new PrismaClient();

// Simple price conversion service (fallback)
const simplePriceService = {
  validateEthAmount: (ethAmount) => {
    const amount = parseFloat(ethAmount);
    if (isNaN(amount) || amount <= 0) {
      return { valid: false, message: 'Jumlah ETH harus berupa angka positif' };
    }
    if (amount < 0.001) {
      return { valid: false, message: 'Jumlah minimal 0.001 ETH' };
    }
    if (amount > 10) {
      return { valid: false, message: 'Jumlah maksimal 10 ETH' };
    }
    return { valid: true };
  },
  ethToIdr: async (ethAmount) => {
    // Simple conversion: 1 ETH = 50,000,000 IDR (approximate)
    return parseFloat(ethAmount) * 50000000;
  },
  formatEth: (amount) => {
    return parseFloat(amount).toFixed(6) + ' ETH';
  },
  formatRupiah: (amount) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  }
};

// Try to use the full service, fallback to simple service
let priceConversionService;
try {
  priceConversionService = require('../services/priceConversionService');
} catch (error) {
  console.warn('⚠️ Using simple price service as fallback');
  priceConversionService = simplePriceService;
}

// Helper function to parse gambar field (can be string or JSON array)
const parseGambarField = (gambar) => {
  if (!gambar) return null;
  
  try {
    // Try to parse as JSON array
    const parsed = JSON.parse(gambar);
    if (Array.isArray(parsed)) {
      return parsed;
    }
    // If it's not an array, return as single item array for consistency
    return [gambar];
  } catch (error) {
    // If parsing fails, it's probably a single string URL
    return gambar;
  }
};

// Generate kode produk unik berdasarkan nama game
const generateKodeProduk = async (namaGame) => {
  // Mapping nama game ke kode (hanya 4 game)
  const gameCodeMap = {
    'Mobile Legends': 'ML',
    'Free Fire': 'FF',
    'PUBG Mobile': 'PM',
    'Genshin Impact': 'GI'
  };
  
  // Cari kode game, jika tidak ada gunakan 3 huruf pertama
  let gameCode = gameCodeMap[namaGame];
  if (!gameCode) {
    // Ambil 3 huruf pertama dan uppercase
    gameCode = namaGame.replace(/[^a-zA-Z]/g, '').substring(0, 3).toUpperCase();
  }
  
  // Hitung jumlah produk dengan game yang sama
  const count = await prisma.produk.count({
    where: {
      namaGame: namaGame
    }
  });
  
  let kode;
  let counter = count + 1;
  
  // Generate kode dengan format: ML-001, FF-001, dst
  // Jika lebih dari 999, lanjut ke ML-1000, ML-1001, dst
  do {
    if (counter <= 999) {
      kode = `${gameCode}-${String(counter).padStart(3, '0')}`;
    } else {
      kode = `${gameCode}-${counter}`;
    }
    
    // Cek apakah kode sudah ada
    const existing = await prisma.produk.findUnique({
      where: { kodeProduk: kode }
    });
    
    if (!existing) {
      break;
    }
    counter++;
  } while (true);
  
  return kode;
};

// Tambah Produk Baru
const tambahProduk = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { judulProduk, namaGame, deskripsi, hargaEth, gambar } = req.body;

    // Validasi apakah user adalah penjual
    const user = await prisma.user.findUnique({
      where: { id: userId }
    });

    if (!user) {
      return res.status(404).json({
        sukses: false,
        pesan: 'User tidak ditemukan'
      });
    }

    if (user.role !== 'PENJUAL') {
      return res.status(403).json({
        sukses: false,
        pesan: 'Hanya penjual yang dapat menambahkan produk.'
      });
    }

    // Validasi input
    if (!judulProduk || !namaGame || !hargaEth) {
      return res.status(400).json({
        sukses: false,
        pesan: 'Judul produk, nama game, dan harga ETH wajib diisi'
      });
    }

    // Validasi harga ETH
    const ethValidation = priceConversionService.validateEthAmount(hargaEth);
    if (!ethValidation.valid) {
      return res.status(400).json({
        sukses: false,
        pesan: ethValidation.message
      });
    }

    // Konversi ETH ke Rupiah untuk display
    let hargaIdr;
    try {
      hargaIdr = await priceConversionService.ethToIdr(hargaEth);
    } catch (error) {
      console.error('❌ Error konversi harga:', error);
      hargaIdr = parseFloat(hargaEth) * 50000000; // Fallback conversion
    }

    // Generate kode produk
    let kodeProduk;
    try {
      kodeProduk = await generateKodeProduk(namaGame);
    } catch (error) {
      console.error('❌ Error generate kode:', error);
      // Fallback kode produk
      kodeProduk = `PROD-${Date.now()}`;
    }

    // Generate ID untuk produk
    const produkId = `prod_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // Validate and clean image data
    const imageValidation = validateImageRequest(gambar);
    if (!imageValidation.valid) {
      return res.status(400).json({
        sukses: false,
        pesan: imageValidation.message
      });
    }
    
    const gambarData = imageValidation.cleanData;

    // Buat produk baru
    const produkData = {
      id: produkId,
      kodeProduk,
      judulProduk: judulProduk.trim(),
      namaGame: namaGame.trim(),
      deskripsi: deskripsi ? deskripsi.trim() : null,
      harga: Math.round(hargaIdr),
      hargaEth: parseFloat(hargaEth),
      gambar: gambarData,
      penjualId: userId,
      statusJual: true,
      dibuatPada: new Date()
    };

    const produk = await prisma.produk.create({
      data: produkData,
      include: {
        user: {
          include: {
            profile: true
          }
        }
      }
    });

    res.status(201).json({
      sukses: true,
      pesan: 'Produk berhasil ditambahkan! 🎉',
      data: {
        produk: {
          id: produk.id,
          kodeProduk: produk.kodeProduk,
          judulProduk: produk.judulProduk,
          namaGame: produk.namaGame,
          deskripsi: produk.deskripsi,
          harga: produk.harga,
          hargaEth: produk.hargaEth,
          hargaFormatted: {
            eth: priceConversionService.formatEth(produk.hargaEth),
            idr: priceConversionService.formatRupiah(produk.harga)
          },
          gambar: produk.gambar,
          statusJual: produk.statusJual,
          dibuatPada: produk.dibuatPada,
          penjual: {
            nama: produk.user.profile?.nama || 'Anonim',
            email: produk.user.email
          }
        }
      }
    });

  } catch (error) {
    console.error('❌ Error tambah produk:', error);
    
    // Handle specific Prisma errors
    if (error.code === 'P2002') {
      return res.status(400).json({
        sukses: false,
        pesan: 'Kode produk sudah ada, silakan coba lagi'
      });
    }
    
    if (error.code === 'P2003') {
      return res.status(400).json({
        sukses: false,
        pesan: 'User tidak ditemukan'
      });
    }
    
    res.status(500).json({
      sukses: false,
      pesan: 'Terjadi kesalahan server: ' + error.message
    });
  }
};

// Ambil Semua Produk dengan Filter & Search
const ambilSemuaProduk = async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 12, 
      search, 
      namaGame, 
      hargaMin, 
      hargaMax,
      hargaEthMin,
      hargaEthMax,
      sortBy = 'dibuatPada',
      sortOrder = 'desc'
    } = req.query;

    // Build filter conditions - Hanya tampilkan produk yang aktif dan tersedia
    const where = {
      statusJual: true, // Produk masih dijual
      statusProduk: 'AKTIF', // Hanya produk yang aktif
      ...(search && {
        OR: [
          { judulProduk: { contains: search } },
          { deskripsi: { contains: search } },
          { namaGame: { contains: search } }
        ]
      }),
      ...(namaGame && { namaGame: { contains: namaGame } }),
      // Handle ETH price filtering (preferred)
      ...(hargaEthMin && { hargaEth: { gte: parseFloat(hargaEthMin) } }),
      ...(hargaEthMax && { hargaEth: { lte: parseFloat(hargaEthMax) } }),
      // Fallback to IDR price filtering if ETH not provided
      ...(!hargaEthMin && !hargaEthMax && hargaMin && { harga: { gte: parseInt(hargaMin) } }),
      ...(!hargaEthMin && !hargaEthMax && hargaMax && { harga: { lte: parseInt(hargaMax) } })
    };
    
    // Validate ETH price parameters
    if (hargaEthMin && (isNaN(parseFloat(hargaEthMin)) || parseFloat(hargaEthMin) < 0)) {
      return res.status(400).json({
        sukses: false,
        pesan: 'Harga ETH minimum tidak valid'
      });
    }
    
    if (hargaEthMax && (isNaN(parseFloat(hargaEthMax)) || parseFloat(hargaEthMax) < 0)) {
      return res.status(400).json({
        sukses: false,
        pesan: 'Harga ETH maksimum tidak valid'
      });
    }
    
    if (hargaEthMin && hargaEthMax && parseFloat(hargaEthMin) > parseFloat(hargaEthMax)) {
      return res.status(400).json({
        sukses: false,
        pesan: 'Harga ETH minimum tidak boleh lebih besar dari maksimum'
      });
    }

    // Log query parameters for debugging
    console.log('🔍 Query parameters:', {
      page, limit, search, namaGame, 
      hargaMin, hargaMax, hargaEthMin, hargaEthMax,
      sortBy, sortOrder
    });
    console.log('🔍 Where clause:', JSON.stringify(where, null, 2));

    // Validate sort parameters
    const validSortFields = ['dibuatPada', 'harga', 'hargaEth', 'judulProduk', 'namaGame'];
    const validSortOrders = ['asc', 'desc'];
    
    if (!validSortFields.includes(sortBy)) {
      return res.status(400).json({
        sukses: false,
        pesan: 'Field sorting tidak valid'
      });
    }
    
    if (!validSortOrders.includes(sortOrder)) {
      return res.status(400).json({
        sukses: false,
        pesan: 'Order sorting tidak valid'
      });
    }

    // Build sort options
    const orderBy = {};
    orderBy[sortBy] = sortOrder;
    
    // Calculate pagination with validation
    const pageNum = Math.max(1, parseInt(page) || 1);
    const limitNum = Math.min(50, Math.max(1, parseInt(limit) || 12)); // Max 50 items per page
    const skip = (pageNum - 1) * limitNum;

    // Get products with pagination
    const [produk, total] = await Promise.all([
      prisma.produk.findMany({
        where,
        orderBy,
        skip,
        take: limitNum,
        include: {
          user: {
            include: {
              profile: true
            }
          }
        }
      }),
      prisma.produk.count({ where })
    ]);

    console.log('🔍 Query results:', {
      totalFound: total,
      productsReturned: produk.length,
      productStatuses: produk.map(p => ({
        id: p.id,
        kodeProduk: p.kodeProduk,
        statusJual: p.statusJual,
        statusProduk: p.statusProduk
      }))
    });

    // Format response
    const produkFormatted = produk.map(p => ({
      id: p.id,
      kodeProduk: p.kodeProduk,
      judulProduk: p.judulProduk,
      namaGame: p.namaGame,
      deskripsi: p.deskripsi,
      harga: p.harga,
      hargaEth: p.hargaEth,
      gambar: p.gambar,
      statusJual: p.statusJual,
      dibuatPada: p.dibuatPada,
      penjual: {
        id: p.user.id,
        nama: p.user.profile?.nama || 'Anonim',
        email: p.user.email,
        walletAddress: p.user.walletAddress
      }
    }));

    res.json({
      sukses: true,
      data: {
        produk: produkFormatted,
        pagination: {
          currentPage: pageNum,
          totalPages: Math.ceil(total / limitNum),
          totalItems: total,
          itemsPerPage: limitNum
        }
      }
    });

  } catch (error) {
    console.error('❌ Error ambil produk:', {
      message: error.message,
      stack: error.stack,
      code: error.code,
      query: req.query
    });
    
    // Handle specific Prisma errors
    if (error.code === 'P2025') {
      return res.status(404).json({
        sukses: false,
        pesan: 'Data tidak ditemukan'
      });
    }
    
    if (error.code === 'P2002') {
      return res.status(400).json({
        sukses: false,
        pesan: 'Data duplikat ditemukan'
      });
    }
    
    // Handle validation errors
    if (error.name === 'ValidationError') {
      return res.status(400).json({
        sukses: false,
        pesan: 'Data tidak valid: ' + error.message
      });
    }
    
    // Return empty result instead of error for better UX
    res.status(200).json({
      sukses: true,
      data: {
        produk: [],
        pagination: {
          currentPage: pageNum,
          totalPages: 0,
          totalItems: 0,
          itemsPerPage: limitNum
        }
      },
      pesan: 'Tidak ada produk ditemukan'
    });
  }
};

// Ambil Produk Berdasarkan ID
const ambilProdukById = async (req, res) => {
  try {
    const { id } = req.params;
    const produk = await prisma.produk.findUnique({
      where: { id },
      include: {
        user: {
          include: {
            profile: true
          }
        }
      }
    });

    if (!produk) {
      return res.status(404).json({
        sukses: false,
        pesan: 'Produk tidak ditemukan'
      });
    }

    res.json({
      sukses: true,
      data: {
        produk: {
          id: produk.id,
          kodeProduk: produk.kodeProduk,
          judulProduk: produk.judulProduk,
          namaGame: produk.namaGame,
          deskripsi: produk.deskripsi,
          harga: produk.harga,
          hargaEth: produk.hargaEth,
          gambar: produk.gambar,
          statusJual: produk.statusJual,
          statusProduk: produk.statusProduk,
          dibuatPada: produk.dibuatPada,
          diperbaruiPada: produk.diperbaruiPada,
          penjual: {
            id: produk.user.id,
            nama: produk.user.profile?.nama || 'Anonim',
            email: produk.user.email,
            walletAddress: produk.user.walletAddress
          }
        }
      }
    });

  } catch (error) {
    console.error('Error ambil produk by ID:', error);
    res.status(500).json({
      sukses: false,
      pesan: 'Terjadi kesalahan server'
    });
  }
};

// Update Produk (Hanya Penjual)
const updateProduk = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { id } = req.params;
    const { judulProduk, namaGame, deskripsi, hargaEth, gambar, statusJual } = req.body;

    // Cek apakah produk ada dan milik user
    const produkExisting = await prisma.produk.findUnique({
      where: { id },
      include: {
        transaksi: {
          where: {
            status: {
              in: ['DIBAYAR_SMARTCONTRACT', 'MENUNGGU_KIRIM_AKUN', 'DIKIRIM', 'DIKONFIRMASI_PEMBELI', 'SELESAI']
            }
          }
        }
      }
    });

    if (!produkExisting) {
      return res.status(404).json({
        sukses: false,
        pesan: 'Produk tidak ditemukan'
      });
    }

    if (produkExisting.penjualId !== userId) {
      return res.status(403).json({
        sukses: false,
        pesan: 'Anda tidak memiliki akses untuk mengubah produk ini'
      });
    }

    // PERBAIKAN: Cek apakah produk sudah dibayar atau terjual
    if (produkExisting.statusProduk === 'TERJUAL') {
      return res.status(400).json({
        sukses: false,
        pesan: 'Produk yang sudah terjual tidak dapat diedit'
      });
    }

    // PERBAIKAN: Cek apakah ada transaksi yang sudah dibayar
    const transaksiDibayar = produkExisting.transaksi.find(t =>
      ['DIBAYAR_SMARTCONTRACT', 'MENUNGGU_KIRIM_AKUN', 'DIKIRIM', 'DIKONFIRMASI_PEMBELI', 'SELESAI'].includes(t.status)
    );

    if (transaksiDibayar) {
      return res.status(400).json({
        sukses: false,
        pesan: 'Produk yang sudah dibayar tidak dapat diedit. Transaksi sedang berlangsung.'
      });
    }

    // PERBAIKAN: Prepare update data dengan validasi
    let updateData = {};
    if (judulProduk !== undefined) updateData.judulProduk = judulProduk.trim();
    if (namaGame !== undefined) updateData.namaGame = namaGame.trim();
    if (deskripsi !== undefined) updateData.deskripsi = deskripsi ? deskripsi.trim() : null;
    if (statusJual !== undefined) updateData.statusJual = statusJual;

    // Handle hargaEth parameter and convert to IDR
    if (hargaEth !== undefined) {
      // Validasi harga ETH
      const ethValidation = priceConversionService.validateEthAmount(hargaEth);
      if (!ethValidation.valid) {
        return res.status(400).json({
          sukses: false,
          pesan: ethValidation.message
        });
      }

      // Konversi ETH ke Rupiah
      let hargaIdr;
      try {
        hargaIdr = await priceConversionService.ethToIdr(hargaEth);
      } catch (error) {
        console.error('❌ Error konversi harga:', error);
        hargaIdr = parseFloat(hargaEth) * 50000000; // Fallback conversion
      }

      updateData.hargaEth = parseFloat(hargaEth);
      updateData.harga = Math.round(hargaIdr);
    }

    // Handle image update with validation
    if (gambar !== undefined) {
      // Validate and clean image data (not required for updates)
      const imageValidation = validateImageRequest(gambar, false);
      if (!imageValidation.valid) {
        return res.status(400).json({
          sukses: false,
          pesan: imageValidation.message
        });
      }
      
      // Only update if there's actual image data
      if (imageValidation.cleanData !== null) {
        updateData.gambar = imageValidation.cleanData;
      }
    }

    // Update produk
    const produkUpdate = await prisma.produk.update({
      where: { id },
      data: updateData,
      include: {
        user: {
          include: {
            profile: true
          }
        }
      }
    });

    res.json({
      sukses: true,
      pesan: 'Produk berhasil diperbarui! ✨',
      data: {
        produk: {
          id: produkUpdate.id,
          kodeProduk: produkUpdate.kodeProduk,
          judulProduk: produkUpdate.judulProduk,
          namaGame: produkUpdate.namaGame,
          deskripsi: produkUpdate.deskripsi,
          harga: produkUpdate.harga,
          hargaEth: produkUpdate.hargaEth,
          hargaFormatted: {
            eth: priceConversionService.formatEth(produkUpdate.hargaEth),
            idr: priceConversionService.formatRupiah(produkUpdate.harga)
          },
          gambar: produkUpdate.gambar,
          statusJual: produkUpdate.statusJual,
          statusProduk: produkUpdate.statusProduk,
          diperbaruiPada: produkUpdate.diperbaruiPada,
          penjual: {
            nama: produkUpdate.user.profile?.nama || 'Anonim'
          }
        }
      }
    });

  } catch (error) {
    console.error('Error update produk:', error);
    res.status(500).json({
      sukses: false,
      pesan: 'Terjadi kesalahan server'
    });
  }
};

// Hapus Produk (Hanya Penjual)
const hapusProduk = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { id } = req.params;

    // Cek apakah produk ada dan milik user
    const produk = await prisma.produk.findUnique({
      where: { id },
      include: {
        transaksi: {
          select: {
            id: true,
            status: true,
            kodeTransaksi: true
          }
        }
      }
    });

    if (!produk) {
      return res.status(404).json({
        sukses: false,
        pesan: 'Produk tidak ditemukan'
      });
    }

    if (produk.penjualId !== userId) {
      return res.status(403).json({
        sukses: false,
        pesan: 'Anda tidak memiliki akses untuk menghapus produk ini'
      });
    }

    // PERBAIKAN: Cek apakah produk sudah terjual
    if (produk.statusProduk === 'TERJUAL') {
      return res.status(400).json({
        sukses: false,
        pesan: 'Produk yang sudah terjual tidak dapat dihapus'
      });
    }

    // PERBAIKAN: Cek apakah ada transaksi yang sudah dibayar atau aktif
    const transaksiAktif = produk.transaksi.find(t => 
      ['MENUNGGU_PEMBAYARAN', 'DIBAYAR_SMARTCONTRACT', 'MENUNGGU_KIRIM_AKUN', 'DIKIRIM', 'DIKONFIRMASI_PEMBELI'].includes(t.status)
    );

    if (transaksiAktif) {
      const statusMessage = transaksiAktif.status === 'MENUNGGU_PEMBAYARAN' 
        ? 'menunggu pembayaran' 
        : 'sudah dibayar dan sedang diproses';
      return res.status(400).json({
        sukses: false,
        pesan: `Tidak dapat menghapus produk yang memiliki transaksi ${statusMessage}. Kode transaksi: ${transaksiAktif.kodeTransaksi}`
      });
    }

    // Hapus produk
    await prisma.produk.delete({
      where: { id }
    });

    res.json({
      sukses: true,
      pesan: 'Produk berhasil dihapus! 🗑️'
    });

  } catch (error) {
    console.error('Error hapus produk:', error);
    res.status(500).json({
      sukses: false,
      pesan: 'Terjadi kesalahan server'
    });
  }
};

// Ambil Produk Milik User
const ambilProdukSaya = async (req, res) => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      return res.status(401).json({
        sukses: false,
        pesan: 'User ID tidak ditemukan. Silakan login ulang.'
      });
    }

    const { page = 1, limit = 10 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [produk, total] = await Promise.all([
      prisma.produk.findMany({
        where: { penjualId: userId },
        orderBy: { dibuatPada: 'desc' },
        skip,
        take: parseInt(limit),
        include: {
          transaksi: {
            select: {
              id: true,
              status: true,
              kodeTransaksi: true,
              dibuatPada: true,
              user_transaksi_pembeliIdTouser: {
                select: {
                  profile: {
                    select: {
                      nama: true
                    }
                  }
                }
              }
            }
          }
        }
      }),
      prisma.produk.count({ where: { penjualId: userId } })
    ]);

    const produkFormatted = produk.map(p => {
      try {
        // Cek status transaksi untuk menentukan apakah bisa edit/hapus
        const transaksiDibayar = p.transaksi?.find(t => 
          ['DIBAYAR_SMARTCONTRACT', 'MENUNGGU_KIRIM_AKUN', 'DIKIRIM', 'DIKONFIRMASI_PEMBELI', 'SELESAI'].includes(t.status)
        );
        const transaksiAktif = p.transaksi?.filter(t => 
          ['MENUNGGU_PEMBAYARAN', 'DIBAYAR_SMARTCONTRACT', 'DIKIRIM'].includes(t.status)
        ) || [];

        return {
          id: p.id,
          kodeProduk: p.kodeProduk,
          judulProduk: p.judulProduk,
          namaGame: p.namaGame,
          deskripsi: p.deskripsi,
          harga: p.harga,
          hargaEth: p.hargaEth,
          gambar: p.gambar,
          statusJual: p.statusJual,
          statusProduk: p.statusProduk,
          dibuatPada: p.dibuatPada,
          diperbaruiPada: p.diperbaruiPada,
          totalTransaksi: p.transaksi?.length || 0,
          transaksiAktif: transaksiAktif.length,
          // PERBAIKAN: Tambahkan informasi status untuk UI
          canEdit: !transaksiDibayar && p.statusProduk !== 'TERJUAL',
          canDelete: !transaksiAktif.length && p.statusProduk !== 'TERJUAL',
          canToggleStatus: !transaksiDibayar && p.statusProduk !== 'TERJUAL',
          isPaid: !!transaksiDibayar,
          isSold: p.statusProduk === 'TERJUAL',
          statusInfo: {
            message: transaksiDibayar 
              ? `Produk sudah dibayar (${transaksiDibayar.kodeTransaksi})` 
              : p.statusProduk === 'TERJUAL' 
                ? 'Produk sudah terjual' 
                : transaksiAktif.length > 0 
                  ? `Ada ${transaksiAktif.length} transaksi aktif`
                  : 'Produk tersedia untuk dijual',
            canModify: !transaksiDibayar && p.statusProduk !== 'TERJUAL'
          },
          latestTransaction: p.transaksi?.length > 0 ? {
            kodeTransaksi: p.transaksi[0].kodeTransaksi,
            status: p.transaksi[0].status,
            pembeli: p.transaksi[0].user_transaksi_pembeliIdTouser?.profile?.nama || 'Anonim',
            dibuatPada: p.transaksi[0].dibuatPada
          } : null
        };
      } catch (formatError) {
        console.error('❌ Error formatting produk:', p.id, formatError);
        // Return basic product info if formatting fails
        return {
          id: p.id,
          kodeProduk: p.kodeProduk,
          judulProduk: p.judulProduk,
          namaGame: p.namaGame,
          deskripsi: p.deskripsi,
          harga: p.harga,
          hargaEth: p.hargaEth,
          gambar: p.gambar,
          statusJual: p.statusJual,
          statusProduk: p.statusProduk,
          dibuatPada: p.dibuatPada,
          diperbaruiPada: p.diperbaruiPada,
          totalTransaksi: 0,
          transaksiAktif: 0,
          canEdit: false,
          canDelete: false,
          canToggleStatus: false,
          isPaid: false,
          isSold: false,
          statusInfo: {
            message: 'Error memuat status',
            canModify: false
          },
          latestTransaction: null
        };
      }
    });

    res.json({
      sukses: true,
      data: {
        produk: produkFormatted,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(total / parseInt(limit)),
          totalItems: total,
          itemsPerPage: parseInt(limit)
        }
      }
    });

  } catch (error) {
    console.error('❌ Error ambil produk saya:', error);
    console.error('❌ Error stack:', error.stack);
    res.status(500).json({
      sukses: false,
      pesan: 'Terjadi kesalahan server: ' + error.message,
      error: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
};

// Ambil Daftar Game Populer
const ambilGamePopuler = async (req, res) => {
  try {
    const gameStats = await prisma.produk.groupBy({
      by: ['namaGame'],
      where: { 
        statusJual: true,
        statusProduk: {
          not: 'TERJUAL'
        }
      },
      _count: {
        namaGame: true
      },
      orderBy: {
        _count: {
          namaGame: 'desc'
        }
      }
    });

    // Daftar game yang harus selalu ditampilkan
    const defaultGames = ['Mobile Legends', 'Free Fire', 'PUBG Mobile', 'Genshin Impact'];
    
    // Buat map dari hasil query untuk akses cepat
    const gameStatsMap = new Map();
    gameStats.forEach(game => {
      gameStatsMap.set(game.namaGame, game._count.namaGame);
    });

    // Gabungkan default games dengan statistik yang ada
    const gamePopuler = defaultGames.map(gameName => ({
      namaGame: gameName,
      jumlahProduk: gameStatsMap.get(gameName) || 0
    }));

    // Tambahkan game lain yang tidak ada di default list tapi ada di database
    gameStats.forEach(game => {
      if (!defaultGames.includes(game.namaGame)) {
        gamePopuler.push({
          namaGame: game.namaGame,
          jumlahProduk: game._count.namaGame
        });
      }
    });

    res.json({
      sukses: true,
      data: {
        gamePopuler
      }
    });

  } catch (error) {
    console.error('Error ambil game populer:', error);
    res.status(500).json({
      sukses: false,
      pesan: 'Terjadi kesalahan server'
    });
  }
};

// Ambil Suggested Prices ETH
const ambilSuggestedPrices = async (req, res) => {
  try {
    const suggestions = await priceConversionService.getSuggestedPrices();
    const rates = await priceConversionService.getCurrentRates();
    res.json({
      sukses: true,
      data: {
        suggestions,
        rates,
        info: {
          minEth: '0.001',
          maxEth: '10.000',
          lastUpdate: rates.lastUpdate
        }
      }
    });
  } catch (error) {
    console.error('Error ambil suggested prices:', error);
    res.status(500).json({
      sukses: false,
      pesan: 'Terjadi kesalahan server'
    });
  }
};

// Konversi ETH ke IDR
const konversiEthKeIdr = async (req, res) => {
  try {
    const { ethAmount } = req.query;
    if (!ethAmount) {
      return res.status(400).json({
        sukses: false,
        pesan: 'Parameter ethAmount diperlukan'
      });
    }

    const validation = priceConversionService.validateEthAmount(ethAmount);
    if (!validation.valid) {
      return res.status(400).json({
        sukses: false,
        pesan: validation.message
      });
    }

    const idrAmount = await priceConversionService.ethToIdr(ethAmount);
    const rates = await priceConversionService.getCurrentRates();

    res.json({
      sukses: true,
      data: {
        ethAmount: parseFloat(ethAmount),
        idrAmount: idrAmount,
        formatted: {
          eth: priceConversionService.formatEth(ethAmount),
          idr: priceConversionService.formatRupiah(idrAmount)
        },
        rates: rates
      }
    });

  } catch (error) {
    console.error('Error konversi ETH ke IDR:', error);
    res.status(500).json({
      sukses: false,
      pesan: 'Terjadi kesalahan server'
    });
  }
};

module.exports = {
  tambahProduk,
  ambilSemuaProduk,
  ambilProdukById,
  updateProduk,
  hapusProduk,
  ambilProdukSaya,
  ambilGamePopuler,
  ambilSuggestedPrices,
  konversiEthKeIdr
};