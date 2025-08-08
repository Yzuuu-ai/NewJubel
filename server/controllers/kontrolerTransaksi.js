const { PrismaClient } = require('@prisma/client');
const escrowService = require('../services/escrowService');
const { createNotification, notificationHelpers } = require('./kontrolerNotifikasi');

// Konfigurasi Prisma dengan timeout yang lebih panjang
const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL
    }
  },
  log: process.env.NODE_ENV === 'development' ? ['query', 'error'] : ['error']
});

// Set timeout untuk query database
const DB_TIMEOUT = 15000; // 15 detik

// Wrapper untuk query dengan timeout
const queryWithTimeout = async (queryPromise, timeoutMs = DB_TIMEOUT) => {
  return Promise.race([
    queryPromise,
    new Promise((_, reject) => 
      setTimeout(() => reject(new Error('Database query timeout')), timeoutMs)
    )
  ]);
};

// Generate kode transaksi unik dengan optimasi
const generateKodeTransaksi = async () => {
  try {
    const count = await queryWithTimeout(prisma.transaksi.count(), 5000);
    const kode = `TXN${String(count + 1).padStart(6, '0')}`;
    
    // Cek apakah kode sudah ada dengan timeout pendek
    const existing = await queryWithTimeout(
      prisma.transaksi.findUnique({
        where: { kodeTransaksi: kode },
        select: { id: true } // Hanya ambil ID untuk efisiensi
      }),
      3000
    );
    
    if (existing) {
      // Jika ada, cari kode yang belum digunakan
      let counter = count + 2;
      let newKode;
      let attempts = 0;
      const maxAttempts = 10;
      
      do {
        if (attempts >= maxAttempts) {
          // Fallback ke timestamp jika terlalu banyak percobaan
          newKode = `TXN${Date.now()}`;
          break;
        }
        newKode = `TXN${String(counter).padStart(6, '0')}`;
        const check = await queryWithTimeout(
          prisma.transaksi.findUnique({
            where: { kodeTransaksi: newKode },
            select: { id: true }
          }),
          2000
        );
        if (!check) break;
        counter++;
        attempts++;
      } while (true);
      
      return newKode;
    }
    
    return kode;
  } catch (error) {
    console.error('Error generating transaction code:', error);
    // Fallback ke timestamp jika ada error
    return `TXN${Date.now()}`;
  }
};

// Buat Transaksi Baru (Pembeli klik "Beli Sekarang")
const buatTransaksi = async (req, res) => {
  try {
    console.log('🔥 BUAT TRANSAKSI - START:', {
      user: req.user,
      body: req.body,
      headers: req.headers.authorization ? 'Present' : 'Missing'
    });

    const userId = req.user.userId;
    const { produkId } = req.body;

    console.log('🔥 BUAT TRANSAKSI - PARAMS:', {
      userId,
      produkId,
      userRole: req.user.role
    });

    // Validasi role admin tidak bisa membeli produk
    if (req.user.role === 'ADMIN') {
      return res.status(403).json({
        sukses: false,
        pesan: 'Admin tidak dapat membeli produk'
      });
    }

    // Validasi input
    if (!produkId) {
      return res.status(400).json({
        sukses: false,
        pesan: 'ID produk wajib diisi'
      });
    }

    // Cek produk dengan query yang dioptimasi
    const produk = await queryWithTimeout(
      prisma.produk.findUnique({
        where: { id: produkId },
        include: {
          user: {
            select: {
              id: true,
              walletAddress: true,
              profile: {
                select: {
                  nama: true
                }
              }
            }
          }
        }
      }),
      8000
    );

    if (!produk) {
      return res.status(404).json({
        sukses: false,
        pesan: 'Produk tidak ditemukan'
      });
    }

    if (!produk.statusJual) {
      return res.status(400).json({
        sukses: false,
        pesan: 'Produk sudah tidak dijual'
      });
    }

    // Validasi tidak beli produk sendiri
    if (produk.penjualId === userId) {
      return res.status(400).json({
        sukses: false,
        pesan: 'Anda tidak dapat membeli produk sendiri'
      });
    }

    // Cek apakah ada transaksi aktif untuk produk ini
    const transaksiAktif = await queryWithTimeout(
      prisma.transaksi.findFirst({
        where: {
          produkId: produkId,
          status: {
            in: ['MENUNGGU_PEMBAYARAN', 'DIBAYAR_SMARTCONTRACT', 'MENUNGGU_KIRIM_AKUN', 'DIKIRIM']
          }
        },
        select: { id: true }
      }),
      5000
    );

    if (transaksiAktif) {
      return res.status(400).json({
        sukses: false,
        pesan: 'Produk sedang dalam transaksi aktif'
      });
    }

    // Generate kode transaksi
    const kodeTransaksi = await generateKodeTransaksi();
    
    // Generate ID untuk transaksi
    const transaksiId = `TXN${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    // Set expired time (15 menit dari sekarang)
    const expiredAt = new Date();
    expiredAt.setMinutes(expiredAt.getMinutes() + 15);
    
    // Buat transaksi baru dengan timeout dan update status produk
    let transaksi;
    try {
      transaksi = await queryWithTimeout(
        prisma.$transaction(async (tx) => {
          // Create transaction
          const newTransaksi = await tx.transaksi.create({
            data: {
              id: transaksiId,
              kodeTransaksi,
              produkId,
              pembeliId: userId,
              penjualId: produk.penjualId,
              status: 'MENUNGGU_PEMBAYARAN',
              expiredAt
            },
            include: {
              produk: {
                select: {
                  id: true,
                  kodeProduk: true,
                  judulProduk: true,
                  namaGame: true,
                  harga: true,
                  hargaEth: true,
                  gambar: true,
                  user: {
                    select: {
                      walletAddress: true,
                      profile: {
                        select: {
                          nama: true
                        }
                      }
                    }
                  }
                }
              },
              user_transaksi_pembeliIdTouser: {
                select: {
                  walletAddress: true,
                  profile: {
                    select: { nama: true }
                  }
                }
              }
            }
          });

          // Update product status to not for sale
          await tx.produk.update({
            where: { id: produkId },
            data: { 
              statusJual: false,
              statusProduk: 'TERJUAL'
            }
          });

          return newTransaksi;
        }),
        15000
      );
    } catch (transactionError) {
      console.error('❌ Database transaction failed:', transactionError);
      throw transactionError;
    }

    // Generate notifikasi untuk pembeli dan penjual
    try {
      await Promise.all([
        notificationHelpers.transaksiDibuat(
          userId, 
          transaksi.id, 
          produk.namaGame
        ),
        notificationHelpers.transaksiDibuat(
          produk.penjualId, 
          transaksi.id, 
          produk.namaGame
        )
      ]);
    } catch (notifError) {
      console.error('❌ Error creating transaction notifications:', notifError);
    }

    res.status(201).json({
      sukses: true,
      pesan: 'Transaksi berhasil dibuat! Silakan lakukan pembayaran dalam 15 menit.',
      data: {
        transaksi: {
          id: transaksi.id,
          kodeTransaksi: transaksi.kodeTransaksi,
          status: transaksi.status,
          expiredAt: transaksi.expiredAt,
          produk: {
            id: transaksi.produk.id,
            kodeProduk: transaksi.produk.kodeProduk,
            judulProduk: transaksi.produk.judulProduk,
            namaGame: transaksi.produk.namaGame,
            harga: transaksi.produk.harga,
            hargaEth: transaksi.produk.hargaEth,
            gambar: transaksi.produk.gambar
          },
          penjual: {
            nama: transaksi.produk.user.profile?.nama || 'Anonim',
            walletAddress: transaksi.produk.user.walletAddress
          },
          pembeli: {
            nama: transaksi.user_transaksi_pembeliIdTouser.profile?.nama || 'Anonim',
            walletAddress: transaksi.user_transaksi_pembeliIdTouser.walletAddress
          }
        }
      }
    });
  } catch (error) {
    console.error('❌ Error buat transaksi:', error);

    if (error.message.includes('timeout')) {
      return res.status(408).json({
        sukses: false,
        pesan: 'Permintaan timeout. Silakan coba lagi dalam beberapa saat.'
      });
    }

    res.status(500).json({
      sukses: false,
      pesan: 'Terjadi kesalahan server',
      error: process.env.NODE_ENV === 'development' ? {
        message: error.message,
        stack: error.stack,
        code: error.code
      } : undefined
    });
  }
};

// Konfirmasi Pembayaran
const konfirmasiPembayaran = async (req, res) => {
  try {
    const { id } = req.params;
    const { smartContractTxHash, escrowAmount } = req.body;

    if (!smartContractTxHash) {
      return res.status(400).json({
        sukses: false,
        pesan: 'Hash transaksi smart contract wajib diisi'
      });
    }

    const transaksi = await queryWithTimeout(
      prisma.transaksi.findUnique({
        where: { id },
        select: {
          id: true,
          status: true,
          produkId: true,
          pembeliId: true,
          penjualId: true
        }
      }),
      5000
    );

    if (!transaksi) {
      return res.status(404).json({
        sukses: false,
        pesan: 'Transaksi tidak ditemukan'
      });
    }

    if (transaksi.status !== 'MENUNGGU_PEMBAYARAN') {
      return res.status(400).json({
        sukses: false,
        pesan: 'Status transaksi tidak valid untuk konfirmasi pembayaran'
      });
    }

    const result = await queryWithTimeout(
      prisma.$transaction(async (tx) => {
        const transaksiUpdate = await tx.transaksi.update({
          where: { id },
          data: {
            status: 'DIBAYAR_SMARTCONTRACT',
            smartContractTxHash,
            escrowAmount,
            waktuBayar: new Date()
          },
          select: {
            id: true,
            kodeTransaksi: true,
            status: true,
            smartContractTxHash: true,
            waktuBayar: true
          }
        });

        await tx.produk.update({
          where: { id: transaksi.produkId },
          data: { 
            statusJual: false,
            statusProduk: 'TERJUAL'
          }
        });

        return transaksiUpdate;
      }),
      10000
    );

    res.json({
      sukses: true,
      pesan: 'Pembayaran berhasil dikonfirmasi! Menunggu penjual mengirim akun.',
      data: {
        transaksi: result
      }
    });
  } catch (error) {
    console.error('Error konfirmasi pembayaran:', error);
    if (error.message.includes('timeout')) {
      return res.status(408).json({
        sukses: false,
        pesan: 'Permintaan timeout. Silakan coba lagi dalam beberapa saat.'
      });
    }
    res.status(500).json({
      sukses: false,
      pesan: 'Terjadi kesalahan server'
    });
  }
};

// Kirim Akun
const kirimAkun = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { id } = req.params;
    const { deskripsiBukti, accountData } = req.body;

    if (accountData && (!accountData.username || !accountData.email || !accountData.password)) {
      return res.status(400).json({
        sukses: false,
        pesan: 'Username, email, dan password akun wajib diisi'
      });
    }

    const transaksi = await queryWithTimeout(
      prisma.transaksi.findUnique({
        where: { id },
        select: {
          id: true,
          status: true,
          penjualId: true,
          produkId: true,
          pembeliId: true
        }
      }),
      5000
    );

    if (!transaksi) {
      return res.status(404).json({
        sukses: false,
        pesan: 'Transaksi tidak ditemukan'
      });
    }

    if (transaksi.penjualId !== userId) {
      return res.status(403).json({
        sukses: false,
        pesan: 'Anda tidak memiliki akses untuk mengirim akun ini'
      });
    }

    if (transaksi.status !== 'DIBAYAR_SMARTCONTRACT') {
      return res.status(400).json({
        sukses: false,
        pesan: 'Status transaksi tidak valid untuk pengiriman akun'
      });
    }

    const updateData = {
      status: 'DIKIRIM',
      deskripsiBukti
    };

    if (accountData) {
      updateData.accountData = JSON.stringify(accountData);
    }

    const transaksiUpdate = await queryWithTimeout(
      prisma.transaksi.update({
        where: { id },
        data: updateData,
        select: {
          id: true,
          kodeTransaksi: true,
          status: true,
          deskripsiBukti: true,
          accountData: true
        }
      }),
      8000
    );

    let parsedAccountData = null;
    if (transaksiUpdate.accountData) {
      try {
        parsedAccountData = JSON.parse(transaksiUpdate.accountData);
      } catch (error) {
        console.error('Error parsing account data:', error);
      }
    }

    // Generate notifikasi akun dikirim
    try {
      const transaksiDetail = await prisma.transaksi.findUnique({
        where: { id },
        include: {
          produk: { select: { namaGame: true } }
        }
      });

      await createNotification(
        transaksi.pembeliId,
        'transaksi',
        'Akun Sudah Dikirim',
        `Penjual telah mengirim akun ${transaksiDetail.produk.namaGame}. Silakan cek dan konfirmasi penerimaan.`,
        id,
        'Transaksi'
      );
    } catch (notifError) {
      console.error('Error creating account sent notification:', notifError);
    }

    res.json({
      sukses: true,
      pesan: 'Akun berhasil dikirim! Menunggu konfirmasi pembeli.',
      data: {
        transaksi: {
          ...transaksiUpdate,
          accountData: parsedAccountData
        }
      }
    });
  } catch (error) {
    console.error('Error kirim akun:', error);
    if (error.message.includes('timeout')) {
      return res.status(408).json({
        sukses: false,
        pesan: 'Permintaan timeout. Silakan coba lagi dalam beberapa saat.'
      });
    }
    res.status(500).json({
      sukses: false,
      pesan: 'Terjadi kesalahan server'
    });
  }
};

// Konfirmasi Penerimaan
const konfirmasiPenerimaan = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { id } = req.params;

    const transaksi = await queryWithTimeout(
      prisma.transaksi.findUnique({
        where: { id },
        select: {
          id: true,
          status: true,
          pembeliId: true,
          produkId: true,
          penjualId: true
        }
      }),
      5000
    );

    if (!transaksi) {
      return res.status(404).json({
        sukses: false,
        pesan: 'Transaksi tidak ditemukan'
      });
    }

    if (transaksi.pembeliId !== userId) {
      return res.status(403).json({
        sukses: false,
        pesan: 'Anda tidak memiliki akses untuk mengkonfirmasi transaksi ini'
      });
    }

    if (transaksi.status !== 'DIKIRIM') {
      return res.status(400).json({
        sukses: false,
        pesan: 'Status transaksi tidak valid untuk konfirmasi penerimaan'
      });
    }

    const result = await queryWithTimeout(
      prisma.$transaction(async (tx) => {
        const transaksiUpdate = await tx.transaksi.update({
          where: { id },
          data: {
            status: 'DIKONFIRMASI_PEMBELI'
          },
          select: {
            id: true,
            kodeTransaksi: true,
            status: true
          }
        });

        await tx.produk.update({
          where: { id: transaksi.produkId },
          data: { statusJual: false }
        });

        return transaksiUpdate;
      }),
      10000
    );

    res.json({
      sukses: true,
      pesan: 'Penerimaan akun berhasil dikonfirmasi! Menunggu admin melepas dana.',
      data: {
        transaksi: result
      }
    });
  } catch (error) {
    console.error('Error konfirmasi penerimaan:', error);
    if (error.message.includes('timeout')) {
      return res.status(408).json({
        sukses: false,
        pesan: 'Permintaan timeout. Silakan coba lagi dalam beberapa saat.'
      });
    }
    res.status(500).json({
      sukses: false,
      pesan: 'Terjadi kesalahan server'
    });
  }
};

// Buat Sengketa
const buatSengketa = async (req, res) => {
  try {
    const userId = req.user.userId || req.user.id;
    const { id: transaksiId } = req.params;
    const { alasan, bukti } = req.body;

    if (!alasan || alasan.length < 20) {
      return res.status(400).json({
        sukses: false,
        pesan: 'Alasan sengketa harus diisi minimal 20 karakter'
      });
    }

    const transaksi = await queryWithTimeout(
      prisma.transaksi.findUnique({
        where: { id: transaksiId },
        include: { 
          user_transaksi_pembeliIdTouser: { 
            select: { 
              id: true, 
              email: true,
              profile: { select: { nama: true } }
            } 
          },
          user_transaksi_penjualIdTouser: { 
            select: { 
              id: true, 
              email: true,
              profile: { select: { nama: true } }
            } 
          },
          produk: { select: { judulProduk: true, namaGame: true } }
        }
      }),
      8000
    );

    if (!transaksi) {
      return res.status(404).json({
        sukses: false,
        pesan: 'Transaksi tidak ditemukan'
      });
    }

    if (transaksi.pembeliId !== userId) {
      return res.status(403).json({
        sukses: false,
        pesan: 'Hanya pembeli yang dapat membuat sengketa untuk transaksi ini'
      });
    }

    if (transaksi.status !== 'DIKIRIM') {
      return res.status(400).json({
        sukses: false,
        pesan: 'Sengketa hanya dapat dibuat setelah menerima akun dari penjual'
      });
    }

    const existingSengketa = await queryWithTimeout(
      prisma.sengketa.findFirst({
        where: {
          transaksiId: transaksiId,
          status: 'DIPROSES'
        }
      }),
      5000
    );

    if (existingSengketa) {
      return res.status(400).json({
        sukses: false,
        pesan: 'Sudah ada sengketa aktif untuk transaksi ini'
      });
    }

    const result = await queryWithTimeout(
      prisma.$transaction(async (tx) => {
        const sengketaId = `SGK${Date.now()}`;
        
        const sengketa = await tx.sengketa.create({
          data: {
            id: sengketaId,
            transaksiId: transaksiId,
            deskripsi: alasan,
            pembeliBukti: Array.isArray(bukti) ? bukti.join(',') : (bukti || null),
            status: 'DIPROSES',
            disputeType: 'USER_DISPUTE'
          }
        });

        const updatedTransaksi = await tx.transaksi.update({
          where: { id: transaksiId },
          data: { status: 'SENGKETA' }
        });

        return { sengketa, transaksi: updatedTransaksi };
      }),
      15000
    );

    res.json({
      sukses: true,
      pesan: 'Sengketa berhasil dibuat. Penjual akan mendapat notifikasi untuk memberikan pembelaan.',
      data: {
        sengketa: result.sengketa,
        nextStep: 'Menunggu pembelaan dari penjual'
      }
    });
  } catch (error) {
    console.error('❌ Error creating sengketa:', error);
    res.status(500).json({
      sukses: false,
      pesan: 'Gagal membuat sengketa',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
};

// Buat Pembelaan
const buatPembelaan = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { id: sengketaId } = req.params;
    const { pembelaan, bukti } = req.body;

    if (!pembelaan || pembelaan.length < 20) {
      return res.status(400).json({
        sukses: false,
        pesan: 'Pembelaan harus diisi minimal 20 karakter'
      });
    }

    const sengketa = await queryWithTimeout(
      prisma.sengketa.findUnique({
        where: { id: sengketaId },
        include: { 
          transaksi: { 
            include: { 
              user_transaksi_penjualIdTouser: { 
                select: { 
                  id: true, 
                  email: true,
                  profile: { select: { nama: true } }
                } 
              },
              user_transaksi_pembeliIdTouser: { 
                select: { 
                  id: true, 
                  email: true,
                  profile: { select: { nama: true } }
                } 
              },
              produk: { select: { judulProduk: true, namaGame: true } }
            } 
          } 
        }
      }),
      8000
    );

    if (!sengketa) {
      return res.status(404).json({
        sukses: false,
        pesan: 'Sengketa tidak ditemukan'
      });
    }

    if (sengketa.transaksi.penjualId !== userId) {
      return res.status(403).json({
        sukses: false,
        pesan: 'Hanya penjual yang dapat memberikan pembelaan untuk sengketa ini'
      });
    }

    if (sengketa.status !== 'DIPROSES') {
      return res.status(400).json({
        sukses: false,
        pesan: 'Pembelaan hanya dapat diberikan untuk sengketa yang sedang diproses'
      });
    }

    if (sengketa.penjualBukti) {
      return res.status(400).json({
        sukses: false,
        pesan: 'Anda sudah memberikan pembelaan untuk sengketa ini'
      });
    }

    const result = await queryWithTimeout(
      prisma.$transaction(async (tx) => {
        const updatedSengketa = await tx.sengketa.update({
          where: { id: sengketaId },
          data: { 
            penjualBukti: Array.isArray(bukti) ? bukti.join(',') : (bukti || null),
            resolution: `[PEMBELAAN PENJUAL] ${pembelaan}`
          }
        });

        return { sengketa: updatedSengketa };
      }),
      10000
    );

    res.json({
      sukses: true,
      pesan: 'Pembelaan berhasil disimpan dan dikirim ke admin untuk ditinjau.',
      data: {
        sengketa: result.sengketa,
        nextStep: 'Menunggu keputusan admin'
      }
    });
  } catch (error) {
    console.error('❌ Error creating pembelaan:', error);
    res.status(500).json({
      sukses: false,
      pesan: 'Gagal menyimpan pembelaan',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
};

// Check Sengketa
const checkSengketa = async (req, res) => {
  try {
    const { id: transaksiId } = req.params;
    const userId = req.user.userId;

    const transaksi = await queryWithTimeout(
      prisma.transaksi.findUnique({
        where: { id: transaksiId },
        include: { 
          user_transaksi_pembeliIdTouser: { select: { id: true, profile: { select: { nama: true } } } },
          user_transaksi_penjualIdTouser: { select: { id: true, profile: { select: { nama: true } } } }
        }
      }),
      5000
    );

    if (!transaksi) {
      return res.status(404).json({
        sukses: false,
        pesan: 'Transaksi tidak ditemukan'
      });
    }

    let userRole = null;
    if (transaksi.pembeliId === userId) {
      userRole = 'pembeli';
    } else if (transaksi.penjualId === userId) {
      userRole = 'penjual';
    } else if (req.user.role === 'admin') {
      userRole = 'admin';
    }

    if (!userRole) {
      return res.status(403).json({
        sukses: false,
        pesan: 'Anda tidak memiliki akses untuk melihat sengketa transaksi ini'
      });
    }

    const existingSengketa = await queryWithTimeout(
      prisma.sengketa.findFirst({
        where: {
          transaksiId: transaksiId,
          status: 'DIPROSES'
        }
      }),
      5000
    );

    const hasActiveSengketa = !!existingSengketa;
    let canCreateNew = false;
    let canCreateReason = '';

    if (userRole === 'pembeli') {
      if (!hasActiveSengketa && transaksi.status === 'DIKIRIM') {
        canCreateNew = true;
        canCreateReason = 'Pembeli dapat membuat sengketa setelah menerima akun';
      } else if (hasActiveSengketa) {
        canCreateReason = 'Sudah ada sengketa aktif';
      } else {
        canCreateReason = `Status transaksi tidak memungkinkan (${transaksi.status})`;
      }
    } else if (userRole === 'penjual') {
      canCreateReason = 'Penjual tidak dapat membuat sengketa, hanya memberikan pembelaan';
    } else {
      canCreateReason = 'Admin tidak dapat membuat sengketa';
    }

    res.json({
      sukses: true,
      data: {
        hasActiveSengketa,
        sengketa: existingSengketa,
        canCreateNew,
        canCreateReason,
        userRole,
        transaksiStatus: transaksi.status,
        allowedActions: {
          pembeli: userRole === 'pembeli' ? ['create_sengketa'] : [],
          penjual: userRole === 'penjual' && hasActiveSengketa ? ['create_pembelaan'] : [],
          admin: userRole === 'admin' && hasActiveSengketa ? ['resolve_sengketa'] : []
        }
      }
    });
  } catch (error) {
    console.error('❌ Error checking sengketa:', error);
    res.status(500).json({
      sukses: false,
      pesan: 'Gagal memeriksa status sengketa'
    });
  }
};

// Ambil Transaksi User (FIXED: Menghilangkan referensi buktiPembeli yang salah)
const ambilTransaksiUser = async (req, res) => {
  try {
    const userId = req.user.userId;
    let { role = 'all', status, page = 1, limit = 10 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const take = Math.min(parseInt(limit), 50);

    // Build where condition
    let where = {};
    if (role === 'pembeli') {
      where.pembeliId = userId;
    } else if (role === 'penjual') {
      where.penjualId = userId;
    } else {
      where.OR = [
        { pembeliId: userId },
        { penjualId: userId }
      ];
    }

    if (status) {
      const validStatus = [
        'MENUNGGU_PEMBAYARAN', 'DIBAYAR_SMARTCONTRACT', 'MENUNGGU_KIRIM_AKUN', 'DIKIRIM',
        'DIKONFIRMASI_PEMBELI', 'SELESAI', 'SENGKETA', 'REFUND', 'DIREFUND', 'REFUNDED'
      ];
      if (!validStatus.includes(status)) {
        return res.status(400).json({
          sukses: false,
          pesan: `Status transaksi tidak valid: ${status}`
        });
      }
      if (status === 'REFUNDED' || status === 'DIREFUND') {
        where.status = 'REFUND';
      } else {
        where.status = status;
      }
    }

    // Query dengan optimasi (FIXED: Menghilangkan buktiPembeli)
    const [transaksi, total] = await Promise.all([
      queryWithTimeout(
        prisma.transaksi.findMany({
          where,
          orderBy: { dibuatPada: 'desc' },
          skip,
          take,
          select: {
            id: true,
            kodeTransaksi: true,
            status: true,
            expiredAt: true,
            waktuBayar: true,
            waktuSelesai: true,
            smartContractTxHash: true,
            escrowAmount: true,
            escrowId: true,
            deskripsiBukti: true,
            accountData: true,
            dibuatPada: true,
            pembeliId: true,
            penjualId: true,
            produk: {
              select: {
                id: true,
                kodeProduk: true,
                judulProduk: true,
                namaGame: true,
                harga: true,
                hargaEth: true,
                gambar: true
              }
            },
            user_transaksi_pembeliIdTouser: {
              select: {
                email: true,
                walletAddress: true,
                profile: {
                  select: { nama: true }
                }
              }
            },
            user_transaksi_penjualIdTouser: {
              select: {
                email: true,
                walletAddress: true,
                profile: {
                  select: { nama: true }
                }
              }
            },
            sengketa: {
              select: {
                id: true,
                status: true,
                deskripsi: true,
                pembeliBukti: true,
                penjualBukti: true,
                dibuatPada: true
              }
            }
          }
        }),
        12000
      ),
      queryWithTimeout(
        prisma.transaksi.count({ where }),
        5000
      )
    ]);

    const transaksiFormatted = transaksi.map(t => {
      let parsedAccountData = null;
      if (t.accountData) {
        try {
          parsedAccountData = JSON.parse(t.accountData);
        } catch (error) {
          console.error('Error parsing account data:', error);
        }
      }

      return {
        id: t.id,
        kodeTransaksi: t.kodeTransaksi,
        status: t.status,
        expiredAt: t.expiredAt,
        waktuBayar: t.waktuBayar,
        waktuSelesai: t.waktuSelesai,
        smartContractTxHash: t.smartContractTxHash,
        escrowAmount: t.escrowAmount,
        escrowId: t.escrowId,
        deskripsiBukti: t.deskripsiBukti,
        accountData: parsedAccountData,
        dibuatPada: t.dibuatPada,
        roleUser: t.pembeliId === userId ? 'pembeli' : 'penjual',
        produk: {
          ...t.produk,
          penjual: {
            walletAddress: t.user_transaksi_penjualIdTouser.walletAddress,
            nama: t.user_transaksi_penjualIdTouser.profile?.nama || 'Anonim'
          },
          user: {
            walletAddress: t.user_transaksi_penjualIdTouser.walletAddress,
            profile: {
              nama: t.user_transaksi_penjualIdTouser.profile?.nama || 'Anonim'
            }
          }
        },
        pembeli: {
          nama: t.user_transaksi_pembeliIdTouser.profile?.nama || 'Anonim',
          email: t.user_transaksi_pembeliIdTouser.email,
          walletAddress: t.user_transaksi_pembeliIdTouser.walletAddress
        },
        penjual: {
          nama: t.user_transaksi_penjualIdTouser.profile?.nama || 'Anonim',
          email: t.user_transaksi_penjualIdTouser.email,
          walletAddress: t.user_transaksi_penjualIdTouser.walletAddress
        },
        sengketa: t.sengketa
      };
    });

    res.json({
      sukses: true,
      data: {
        transaksi: transaksiFormatted,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(total / take),
          totalItems: total,
          itemsPerPage: take
        }
      }
    });
  } catch (error) {
    console.error('Error ambil transaksi user:', error);
    if (error.message.includes('timeout')) {
      return res.status(408).json({
        sukses: false,
        pesan: 'Permintaan timeout. Silakan coba lagi dalam beberapa saat.'
      });
    }
    res.status(500).json({
      sukses: false,
      pesan: 'Terjadi kesalahan server'
    });
  }
};

// Ambil Detail Transaksi
const ambilDetailTransaksi = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { id } = req.params;

    const transaksi = await queryWithTimeout(
      prisma.transaksi.findUnique({
        where: { id },
        select: {
          id: true,
          kodeTransaksi: true,
          status: true,
          expiredAt: true,
          waktuBayar: true,
          waktuSelesai: true,
          smartContractTxHash: true,
          escrowAmount: true,
          escrowId: true,
          deskripsiBukti: true,
          accountData: true,
          dibuatPada: true,
          pembeliId: true,
          penjualId: true,
          produk: {
            select: {
              id: true,
              kodeProduk: true,
              judulProduk: true,
              namaGame: true,
              deskripsi: true,
              harga: true,
              hargaEth: true,
              gambar: true
            }
          },
          user_transaksi_pembeliIdTouser: {
            select: {
              email: true,
              walletAddress: true,
              profile: {
                select: { nama: true }
              }
            }
          },
          user_transaksi_penjualIdTouser: {
            select: {
              email: true,
              walletAddress: true,
              profile: {
                select: { nama: true }
              }
            }
          },
          sengketa: {
            select: {
              id: true,
              status: true,
              deskripsi: true,
              pembeliBukti: true,
              penjualBukti: true,
              dibuatPada: true
            }
          }
        }
      }),
      10000
    );

    if (!transaksi) {
      return res.status(404).json({
        sukses: false,
        pesan: 'Transaksi tidak ditemukan'
      });
    }

    // Validasi akses - Allow access if there's a dispute
    const user = await queryWithTimeout(
      prisma.user.findUnique({ 
        where: { id: userId },
        select: { role: true }
      }),
      3000
    );

    const isPembeli = transaksi.pembeliId === userId;
    const isPenjual = transaksi.penjualId === userId;
    const isAdmin = user.role === 'ADMIN';
    const hasDispute = transaksi.sengketa && transaksi.sengketa.length > 0;

    // Allow access if:
    // 1. User is buyer or seller
    // 2. User is admin
    // 3. There's an active dispute (sengketa)
    if (!isPembeli && !isPenjual && !isAdmin && !hasDispute) {
      return res.status(403).json({
        sukses: false,
        pesan: 'Anda tidak memiliki akses untuk melihat transaksi ini'
      });
    }

    let parsedAccountData = null;
    if (transaksi.accountData) {
      try {
        parsedAccountData = JSON.parse(transaksi.accountData);
      } catch (error) {
        console.error('Error parsing account data:', error);
      }
    }

    res.json({
      sukses: true,
      data: {
        transaksi: {
          ...transaksi,
          accountData: parsedAccountData,
          roleUser: transaksi.pembeliId === userId ? 'pembeli' : 'penjual',
          pembeli: {
            nama: transaksi.user_transaksi_pembeliIdTouser.profile?.nama || 'Anonim',
            email: transaksi.user_transaksi_pembeliIdTouser.email,
            walletAddress: transaksi.user_transaksi_pembeliIdTouser.walletAddress
          },
          penjual: {
            nama: transaksi.user_transaksi_penjualIdTouser.profile?.nama || 'Anonim',
            email: transaksi.user_transaksi_penjualIdTouser.email,
            walletAddress: transaksi.user_transaksi_penjualIdTouser.walletAddress
          }
        }
      }
    });
  } catch (error) {
    console.error('Error ambil detail transaksi:', error);
    if (error.message.includes('timeout')) {
      return res.status(408).json({
        sukses: false,
        pesan: 'Permintaan timeout. Silakan coba lagi dalam beberapa saat.'
      });
    }
    res.status(500).json({
      sukses: false,
      pesan: 'Terjadi kesalahan server'
    });
  }
};

// Ambil Detail Sengketa
const ambilDetailSengketa = async (req, res) => {
  try {
    const { id: transaksiId } = req.params;
    const userId = req.user.userId;

    const transaksi = await queryWithTimeout(
      prisma.transaksi.findUnique({
        where: { id: transaksiId },
        select: {
          id: true,
          pembeliId: true,
          penjualId: true,
          kodeTransaksi: true,
          status: true,
          sengketa: {
            select: {
              id: true,
              deskripsi: true,
              status: true,
              dibuatPada: true,
              resolvedAt: true,
              pembeliBukti: true,
              penjualBukti: true,
              resolution: true,
              paymentTxHash: true
            }
          }
        }
      })
    );

    if (!transaksi) {
      return res.status(404).json({
        sukses: false,
        pesan: 'Transaksi tidak ditemukan'
      });
    }

    const isPembeli = transaksi.pembeliId === userId;
    const isPenjual = transaksi.penjualId === userId;
    
    if (!isPembeli && !isPenjual) {
      return res.status(403).json({
        sukses: false,
        pesan: 'Anda tidak memiliki akses untuk melihat detail sengketa ini'
      });
    }

    if (!transaksi.sengketa) {
      return res.status(404).json({
        sukses: false,
        pesan: 'Sengketa tidak ditemukan untuk transaksi ini'
      });
    }

    const sengketa = transaksi.sengketa;

    let kategori = null;
    let cleanDeskripsi = sengketa.deskripsi;
    if (sengketa.deskripsi && sengketa.deskripsi.startsWith('[')) {
      const match = sengketa.deskripsi.match(/^\[([^\]]+)\]\s*(.*)$/);
      if (match) {
        kategori = match[1];
        cleanDeskripsi = match[2];
      }
    }

    const sengketaDetail = {
      id: sengketa.id,
      transaksiId: transaksiId,
      kodeTransaksi: transaksi.kodeTransaksi,
      deskripsi: cleanDeskripsi,
      kategori: kategori,
      status: sengketa.status,
      dibuatPada: sengketa.dibuatPada,
      resolvedAt: sengketa.resolvedAt,
      pembeliBukti: sengketa.pembeliBukti,
      penjualBukti: sengketa.penjualBukti,
      resolution: sengketa.resolution,
      smartContractTxHash: sengketa.paymentTxHash,
      userRole: isPembeli ? 'PEMBELI' : 'PENJUAL'
    };

    res.json({
      sukses: true,
      pesan: 'Detail sengketa berhasil diambil',
      data: sengketaDetail
    });
  } catch (error) {
    console.error('❌ Error ambil detail sengketa:', error);
    res.status(500).json({
      sukses: false,
      pesan: 'Terjadi kesalahan server saat mengambil detail sengketa',
      error: error.message
    });
  }
};

// Ambil data refund untuk transaksi
const ambilDataRefund = async (req, res) => {
  try {
    const { id } = req.params;
    const transaksi = await queryWithTimeout(
      prisma.transaksi.findUnique({
        where: { id },
        select: {
          id: true,
          status: true
        }
      }),
      5000
    );

    if (!transaksi) {
      return res.status(404).json({
        sukses: false,
        pesan: 'Transaksi tidak ditemukan'
      });
    }

    return res.status(200).json({
      sukses: true,
      data: {
        id: transaksi.id,
        status: transaksi.status
      }
    });
  } catch (error) {
    console.error('Error ambil data refund:', error);
    res.status(500).json({
      sukses: false,
      pesan: 'Terjadi kesalahan server'
    });
  }
};

// Ambil data pemenang sengketa untuk transaksi
const ambilPemenang = async (req, res) => {
  try {
    const { id } = req.params;
    
    const transaksi = await queryWithTimeout(
      prisma.transaksi.findUnique({
        where: { id },
        select: {
          id: true,
          sengketa: {
            select: {
              id: true,
              status: true
            }
          }
        }
      }),
      5000
    );

    if (!transaksi) {
      return res.status(404).json({
        sukses: false,
        pesan: 'Transaksi tidak ditemukan'
      });
    }

    if (!transaksi.sengketa) {
      return res.status(200).json({
        sukses: true,
        data: {
          id: transaksi.id,
          sengketaId: null,
          statusPemenang: null,
          pesan: 'Belum ada sengketa untuk transaksi ini.'
        }
      });
    }

    return res.status(200).json({
      sukses: true,
      data: {
        id: transaksi.id,
        sengketaId: transaksi.sengketa.id,
        statusPemenang: transaksi.sengketa.status
      }
    });
  } catch (error) {
    console.error('Error ambil data pemenang:', error);
    res.status(500).json({
      sukses: false,
      pesan: 'Terjadi kesalahan server',
      error: error.message
    });
  }
};

// Update Status Transaksi
const updateStatusTransaksi = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!status) {
      return res.status(400).json({
        sukses: false,
        pesan: 'Status wajib diisi'
      });
    }

    const transaksi = await queryWithTimeout(
      prisma.transaksi.findUnique({
        where: { id },
        select: {
          id: true,
          status: true,
          produkId: true
        }
      }),
      5000
    );

    if (!transaksi) {
      return res.status(404).json({
        sukses: false,
        pesan: 'Transaksi tidak ditemukan'
      });
    }

    const result = await queryWithTimeout(
      prisma.$transaction(async (tx) => {
        const transaksiUpdate = await tx.transaksi.update({
          where: { id },
          data: { status },
          select: {
            id: true,
            kodeTransaksi: true,
            status: true
          }
        });

        if (status === 'EXPIRED' || status === 'GAGAL') {
          await tx.produk.update({
            where: { id: transaksi.produkId },
            data: { 
              statusJual: true,
              statusProduk: 'AKTIF'
            }
          });
        }

        return transaksiUpdate;
      }),
      10000
    );

    res.json({
      sukses: true,
      pesan: 'Status transaksi berhasil diupdate',
      data: {
        transaksi: result
      }
    });
  } catch (error) {
    console.error('Error update status transaksi:', error);
    if (error.message.includes('timeout')) {
      return res.status(408).json({
        sukses: false,
        pesan: 'Permintaan timeout. Silakan coba lagi dalam beberapa saat.'
      });
    }
    res.status(500).json({
      sukses: false,
      pesan: 'Terjadi kesalahan server'
    });
  }
};

module.exports = {
  buatTransaksi,
  konfirmasiPembayaran,
  updateStatusTransaksi,
  kirimAkun,
  konfirmasiPenerimaan,
  buatSengketa,
  buatPembelaan,
  checkSengketa,
  ambilTransaksiUser,
  ambilDetailTransaksi,
  ambilDetailSengketa,
  ambilDataRefund,
  ambilPemenang
};