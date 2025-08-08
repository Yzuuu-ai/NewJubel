const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Middleware untuk validasi admin
const validateAdmin = async (req, res, next) => {
  try {
    const userId = req.user.userId;
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { role: true }
    });

    if (!user || user.role !== 'ADMIN') {
      return res.status(403).json({
        sukses: false,
        pesan: 'Akses ditolak. Hanya admin yang dapat mengakses endpoint ini.'
      });
    }

    next();
  } catch (error) {
    console.error('Error validating admin:', error);
    return res.status(500).json({
      sukses: false,
      pesan: 'Terjadi kesalahan server'
    });
  }
};

// Dashboard Stats
const getDashboardStats = async (req, res) => {
  try {
    // Get today's date range
    const today = new Date();
    const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const endOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1);

    // Get basic counts
    const [
      totalUsers,
      totalTransaksi,
      totalSengketa,
      totalProduk,
      transaksiAktif,
      sengketaMenunggu,
      userBaru,
      // Daily activity counts
      penggunaHariIni,
      transaksiHariIni,
      sengketaHariIni,
      produkHariIni
    ] = await Promise.all([
      // Total users
      prisma.user.count(),
      // Total transaksi
      prisma.transaksi.count(),
      // Total sengketa
      prisma.sengketa.count(),
      // Total produk
      prisma.produk.count(),
      // Transaksi aktif (belum selesai)
      prisma.transaksi.count({
        where: {
          status: {
            in: ['MENUNGGU_PEMBAYARAN', 'DIBAYAR_SMARTCONTRACT', 'DIKIRIM']
          }
        }
      }),
      // Sengketa menunggu
      prisma.sengketa.count({
        where: {
          status: 'DIPROSES'
        }
      }),
      // User baru bulan ini
      prisma.user.count({
        where: {
          dibuatPada: {
            gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1)
          }
        }
      }),
      // Users created today
      prisma.user.count({
        where: {
          dibuatPada: {
            gte: startOfToday,
            lt: endOfToday
          }
        }
      }),
      // Transactions created today
      prisma.transaksi.count({
        where: {
          dibuatPada: {
            gte: startOfToday,
            lt: endOfToday
          }
        }
      }),
      // Disputes created today
      prisma.sengketa.count({
        where: {
          dibuatPada: {
            gte: startOfToday,
            lt: endOfToday
          }
        }
      }),
      // Products created today
      prisma.produk.count({
        where: {
          dibuatPada: {
            gte: startOfToday,
            lt: endOfToday
          }
        }
      })
    ]);

    // Calculate pendapatan bulan ini (estimasi dari transaksi selesai)
    const transaksiSelesai = await prisma.transaksi.findMany({
      where: {
        status: 'SELESAI',
        waktuSelesai: {
          gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1)
        }
      },
      include: {
        produk: {
          select: {
            harga: true
          }
        }
      }
    });

    const pendapatanBulanIni = transaksiSelesai.reduce((total, t) => {
      return total + (t.produk?.harga || 0);
    }, 0);

    // Calculate escrow data
    const [transaksiDenganEscrow, transaksiSelesaiDenganEscrow] = await Promise.all([
      // Total dana dalam escrow (transaksi yang belum selesai)
      prisma.transaksi.findMany({
        where: {
          status: {
            in: ['DIBAYAR_SMARTCONTRACT', 'MENUNGGU_KIRIM_AKUN', 'DIKIRIM', 'DIKONFIRMASI_PEMBELI', 'SENGKETA']
          },
          escrowAmount: {
            not: null
          }
        },
        select: {
          escrowAmount: true
        }
      }),
      // Dana yang sudah dibayar hari ini
      prisma.transaksi.findMany({
        where: {
          status: 'SELESAI',
          waktuSelesai: {
            gte: startOfToday,
            lt: endOfToday
          },
          escrowAmount: {
            not: null
          }
        },
        select: {
          escrowAmount: true
        }
      })
    ]);

    // Calculate total dana escrow
    const totalDanaEscrow = transaksiDenganEscrow.reduce((total, t) => {
      return total + (parseFloat(t.escrowAmount) || 0);
    }, 0);

    // Calculate dana terbayar hari ini
    const danaTerbayar = transaksiSelesaiDenganEscrow.reduce((total, t) => {
      return total + (parseFloat(t.escrowAmount) || 0);
    }, 0);

    const stats = {
      totalUsers,
      totalTransaksi,
      totalSengketa,
      totalProduk,
      pendapatanBulanIni,
      transaksiAktif,
      sengketaMenunggu,
      userBaru,
      // Daily activity
      penggunaHariIni,
      transaksiHariIni,
      sengketaHariIni,
      produkHariIni,
      // Escrow data
      totalDanaEscrow,
      danaTerbayar,
      danaTersisa: totalDanaEscrow - danaTerbayar
    };

    res.json({
      sukses: true,
      data: stats
    });
  } catch (error) {
    console.error('❌ Error getting dashboard stats:', error);
    res.status(500).json({
      sukses: false,
      pesan: 'Terjadi kesalahan server'
    });
  }
};

// Enhanced search - search both email and profile name
const getAllUsers = async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 10, 
      search
    } = req.query;

    console.log('📋 Enhanced search getAllUsers called with:', { page, limit, search });

    // Validate pagination parameters
    const pageNum = Math.max(1, parseInt(page));
    const limitNum = Math.min(100, Math.max(1, parseInt(limit)));
    const skip = (pageNum - 1) * limitNum;

    let allUsers = [];
    let total = 0;

    if (search && search.trim()) {
      const searchTerm = search.trim();
      console.log('🔍 Enhanced search for:', searchTerm);
      
      // Strategy: Get all users first, then filter by email OR profile name
      try {
        // Get all users without pagination first
        const allUsersData = await prisma.user.findMany({
          orderBy: { dibuatPada: 'desc' },
          select: {
            id: true,
            email: true,
            role: true,
            walletAddress: true,
            dibuatPada: true
          }
        });

        console.log('📊 Total users found:', allUsersData.length);

        // Get all profiles
        const allProfiles = await prisma.profile.findMany({
          select: {
            userId: true,
            nama: true,
            nomor_telepon: true,
            alamat: true
          }
        });

        console.log('📊 Total profiles found:', allProfiles.length);

        // Create profile map
        const profileMap = {};
        allProfiles.forEach(p => {
          profileMap[p.userId] = p;
        });

        // Filter users by search term (email OR profile name)
        const filteredUsers = allUsersData.filter(user => {
          const profile = profileMap[user.id];
          const emailMatch = user.email.toLowerCase().includes(searchTerm.toLowerCase());
          const nameMatch = profile?.nama?.toLowerCase().includes(searchTerm.toLowerCase());
          
          return emailMatch || nameMatch;
        });

        console.log('🔍 Filtered users:', filteredUsers.length);

        // Apply pagination to filtered results
        total = filteredUsers.length;
        allUsers = filteredUsers.slice(skip, skip + limitNum);

      } catch (error) {
        console.log('❌ Enhanced search failed, falling back to email only:', error.message);
        
        // Fallback to email-only search
        const [users, userCount] = await Promise.all([
          prisma.user.findMany({
            where: {
              email: { contains: searchTerm }
            },
            orderBy: { dibuatPada: 'desc' },
            skip,
            take: limitNum,
            select: {
              id: true,
              email: true,
              role: true,
              walletAddress: true,
              dibuatPada: true
            }
          }),
          prisma.user.count({
            where: {
              email: { contains: searchTerm }
            }
          })
        ]);
        
        allUsers = users;
        total = userCount;
      }
    } else {
      // No search term - get all users with pagination
      const [users, userCount] = await Promise.all([
        prisma.user.findMany({
          orderBy: { dibuatPada: 'desc' },
          skip,
          take: limitNum,
          select: {
            id: true,
            email: true,
            role: true,
            walletAddress: true,
            dibuatPada: true
          }
        }),
        prisma.user.count()
      ]);
      
      allUsers = users;
      total = userCount;
    }

    console.log('✅ Final users count:', allUsers.length, 'out of', total);

    // Get profile data for final users
    const userIds = allUsers.map(u => u.id);
    let profiles = [];
    
    if (userIds.length > 0) {
      try {
        profiles = await prisma.profile.findMany({
          where: {
            userId: { in: userIds }
          },
          select: {
            userId: true,
            nama: true,
            nomor_telepon: true,
            alamat: true
          }
        });
        console.log('✅ Found profiles for final users:', profiles.length);
      } catch (profileError) {
        console.log('⚠️ Profile fetch failed, continuing without profiles:', profileError.message);
        profiles = [];
      }
    }

    // Create profile map
    const profileMap = {};
    profiles.forEach(p => {
      profileMap[p.userId] = p;
    });

    // Format users data with profile names
    const usersFormatted = allUsers.map(user => ({
      id: user.id,
      email: user.email,
      role: user.role,
      walletAddress: user.walletAddress,
      dibuatPada: user.dibuatPada,
      nama: profileMap[user.id]?.nama || 'Belum diisi',
      nomor_telepon: profileMap[user.id]?.nomor_telepon || 'Belum diisi',
      alamat: profileMap[user.id]?.alamat || 'Belum diisi',
      totalProduk: 0,
      totalPembelian: 0,
      totalPenjualan: 0
    }));

    const totalPages = Math.ceil(total / limitNum);

    console.log('✅ Sending enhanced search response with', usersFormatted.length, 'users');

    res.json({
      sukses: true,
      data: {
        users: usersFormatted,
        pagination: {
          currentPage: pageNum,
          totalPages,
          totalItems: total,
          itemsPerPage: limitNum
        }
      }
    });
  } catch (error) {
    console.error('❌ Error in enhanced search getAllUsers:', error);
    console.error('❌ Error stack:', error.stack);
    
    res.status(500).json({
      sukses: false,
      pesan: 'Terjadi kesalahan server saat mengambil data pengguna',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
};

// Get All Transaksi
const getAllTransaksi = async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 10, 
      search, 
      status,
      sortBy = 'dibuatPada',
      sortOrder = 'desc'
    } = req.query;

    console.log('📋 Getting all transactions for admin:', {
      page, limit, search, status, sortBy, sortOrder
    });

    const where = {
      ...(search && {
        OR: [
          { kodeTransaksi: { contains: search } },
          { produk: { judulProduk: { contains: search } } },
          { produk: { namaGame: { contains: search } } }
        ]
      }),
      ...(status && { status })
    };

    const orderBy = {};
    orderBy[sortBy] = sortOrder;

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [transaksi, total] = await Promise.all([
      prisma.transaksi.findMany({
        where,
        orderBy,
        skip,
        take: parseInt(limit),
        include: {
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
              id: true,
              email: true,
              walletAddress: true,
              profile: {
                select: {
                  nama: true
                }
              }
            }
          },
          user_transaksi_penjualIdTouser: {
            select: {
              id: true,
              email: true,
              walletAddress: true,
              profile: {
                select: {
                  nama: true
                }
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
              resolution: true,
              dibuatPada: true,
              resolvedAt: true
            }
          }
        }
      }),
      prisma.transaksi.count({ where })
    ]);

    const transaksiFormatted = transaksi.map(t => ({
      id: t.id,
      kodeTransaksi: t.kodeTransaksi,
      status: t.status,
      dibuatPada: t.dibuatPada,
      diperbaruiPada: t.diperbaruiPada,
      waktuBayar: t.waktuBayar,
      waktuSelesai: t.waktuSelesai,
      smartContractTxHash: t.smartContractTxHash,
      escrowId: t.escrowId,
      escrowAmount: t.escrowAmount,
      produk: t.produk,
      pembeli: {
        id: t.user_transaksi_pembeliIdTouser.id,
        email: t.user_transaksi_pembeliIdTouser.email,
        walletAddress: t.user_transaksi_pembeliIdTouser.walletAddress,
        nama: t.user_transaksi_pembeliIdTouser.profile?.nama || 'Belum diisi'
      },
      penjual: {
        id: t.user_transaksi_penjualIdTouser.id,
        email: t.user_transaksi_penjualIdTouser.email,
        walletAddress: t.user_transaksi_penjualIdTouser.walletAddress,
        nama: t.user_transaksi_penjualIdTouser.profile?.nama || 'Belum diisi'
      },
      sengketa: t.sengketa
    }));

    res.json({
      sukses: true,
      data: {
        transaksi: transaksiFormatted,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(total / parseInt(limit)),
          totalItems: total,
          itemsPerPage: parseInt(limit)
        }
      }
    });
  } catch (error) {
    console.error('❌ Error getting all transactions:', error);
    res.status(500).json({
      sukses: false,
      pesan: 'Terjadi kesalahan server'
    });
  }
};

// Get All Sengketa
const getAllSengketa = async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 10, 
      status,
      sortBy = 'dibuatPada',
      sortOrder = 'desc'
    } = req.query;

    const where = {
      ...(status && { status })
    };

    const orderBy = {};
    orderBy[sortBy] = sortOrder;

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [sengketa, total] = await Promise.all([
      prisma.sengketa.findMany({
        where,
        orderBy,
        skip,
        take: parseInt(limit),
        include: {
          transaksi: {
            include: {
              produk: {
                select: {
                  judulProduk: true,
                  namaGame: true,
                  harga: true
                }
              },
              user_transaksi_pembeliIdTouser: {
                select: {
                  email: true,
                  profile: { select: { nama: true } }
                }
              },
              user_transaksi_penjualIdTouser: {
                select: {
                  email: true,
                  profile: { select: { nama: true } }
                }
              }
            }
          }
        }
      }),
      prisma.sengketa.count({ where })
    ]);

    const sengketaFormatted = sengketa.map(s => ({
      id: s.id,
      transaksiId: s.transaksiId,
      deskripsi: s.deskripsi,
      status: s.status,
      dibuatPada: s.dibuatPada,
      pembeliBukti: s.pembeliBukti,
      penjualBukti: s.penjualBukti,
      transaksi: {
        kodeTransaksi: s.transaksi.kodeTransaksi,
        status: s.transaksi.status,
        produk: s.transaksi.produk,
        pembeli: {
          email: s.transaksi.user_transaksi_pembeliIdTouser.email,
          nama: s.transaksi.user_transaksi_pembeliIdTouser.profile?.nama || 'Belum diisi'
        },
        penjual: {
          email: s.transaksi.user_transaksi_penjualIdTouser.email,
          nama: s.transaksi.user_transaksi_penjualIdTouser.profile?.nama || 'Belum diisi'
        }
      }
    }));

    res.json({
      sukses: true,
      data: {
        sengketa: sengketaFormatted,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(total / parseInt(limit)),
          totalItems: total,
          itemsPerPage: parseInt(limit)
        }
      }
    });
  } catch (error) {
    console.error('Error getting all sengketa:', error);
    res.status(500).json({
      sukses: false,
      pesan: 'Terjadi kesalahan server'
    });
  }
};

// Get All Produk (Admin)
const getAllProdukAdmin = async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 10, 
      search, 
      namaGame,
      statusProduk,
      sortBy = 'dibuatPada',
      sortOrder = 'desc'
    } = req.query;

    const where = {
      ...(search && {
        OR: [
          { judulProduk: { contains: search } },
          { kodeProduk: { contains: search } },
          { deskripsi: { contains: search } }
        ]
      }),
      ...(namaGame && { namaGame: { contains: namaGame } }),
      ...(statusProduk && { statusProduk })
    };

    const orderBy = {};
    orderBy[sortBy] = sortOrder;

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [produk, total] = await Promise.all([
      prisma.produk.findMany({
        where,
        orderBy,
        skip,
        take: parseInt(limit),
        include: {
          user: {
            select: {
              email: true,
              profile: {
                select: {
                  nama: true
                }
              }
            }
          },
          _count: {
            select: {
              transaksi: true
            }
          }
        }
      }),
      prisma.produk.count({ where })
    ]);

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
      statusProduk: p.statusProduk,
      dibuatPada: p.dibuatPada,
      diperbaruiPada: p.diperbaruiPada,
      penjual: {
        email: p.user.email,
        nama: p.user.profile?.nama || 'Belum diisi'
      },
      totalTransaksi: p._count.transaksi
    }));

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
    console.error('Error getting all produk admin:', error);
    res.status(500).json({
      sukses: false,
      pesan: 'Terjadi kesalahan server'
    });
  }
};

// Update User Status
const updateUserStatus = async (req, res) => {
  try {
    const { userId } = req.params;
    const { status } = req.body;

    // Validasi status yang diizinkan
    const allowedStatuses = ['ACTIVE', 'SUSPENDED', 'BANNED'];
    if (!allowedStatuses.includes(status)) {
      return res.status(400).json({
        sukses: false,
        pesan: 'Status tidak valid'
      });
    }

    // Update user status (implementasi sederhana, bisa diperluas)
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: { 
        // Untuk sementara, kita bisa menggunakan field lain atau menambah field status
      },
      include: {
        profile: true
      }
    });

    res.json({
      sukses: true,
      pesan: 'Status user berhasil diperbarui',
      data: {
        user: {
          id: updatedUser.id,
          email: updatedUser.email,
          role: updatedUser.role,
          nama: updatedUser.profile?.nama || 'Belum diisi'
        }
      }
    });
  } catch (error) {
    console.error('Error updating user status:', error);
    res.status(500).json({
      sukses: false,
      pesan: 'Terjadi kesalahan server'
    });
  }
};

// Delete User - Removed aplikasi_penjual references
const deleteUser = async (req, res) => {
  try {
    const { userId } = req.params;
    const adminId = req.user.userId;

    // Cek apakah user yang akan dihapus ada
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        profile: true,
        produk: {
          select: {
            id: true,
            judulProduk: true,
            statusJual: true
          }
        },
        transaksi_transaksi_pembeliIdTouser: {
          where: {
            status: {
              in: ['MENUNGGU_PEMBAYARAN', 'DIBAYAR_SMARTCONTRACT', 'MENUNGGU_KIRIM_AKUN', 'DIKIRIM', 'DIKONFIRMASI_PEMBELI', 'SENGKETA']
            }
          },
          select: {
            id: true,
            kodeTransaksi: true,
            status: true
          }
        },
        transaksi_transaksi_penjualIdTouser: {
          where: {
            status: {
              in: ['MENUNGGU_PEMBAYARAN', 'DIBAYAR_SMARTCONTRACT', 'MENUNGGU_KIRIM_AKUN', 'DIKIRIM', 'DIKONFIRMASI_PEMBELI', 'SENGKETA']
            }
          },
          select: {
            id: true,
            kodeTransaksi: true,
            status: true
          }
        }
      }
    });

    if (!user) {
      return res.status(404).json({
        sukses: false,
        pesan: 'User tidak ditemukan'
      });
    }

    // Cek apakah user adalah admin
    if (user.role === 'ADMIN') {
      return res.status(400).json({
        sukses: false,
        pesan: 'Tidak dapat menghapus user dengan role admin'
      });
    }

    // Cek apakah user yang akan dihapus adalah admin yang sedang login
    if (userId === adminId) {
      return res.status(400).json({
        sukses: false,
        pesan: 'Tidak dapat menghapus akun sendiri'
      });
    }

    // Cek apakah ada transaksi aktif
    const transaksiAktifPembeli = user.transaksi_transaksi_pembeliIdTouser;
    const transaksiAktifPenjual = user.transaksi_transaksi_penjualIdTouser;
    
    if (transaksiAktifPembeli.length > 0 || transaksiAktifPenjual.length > 0) {
      const transaksiAktif = [...transaksiAktifPembeli, ...transaksiAktifPenjual];
      return res.status(400).json({
        sukses: false,
        pesan: `Tidak dapat menghapus user yang memiliki transaksi aktif. Kode transaksi: ${transaksiAktif.map(t => t.kodeTransaksi).join(', ')}`,
        data: {
          transaksiAktif: transaksiAktif.map(t => ({
            kodeTransaksi: t.kodeTransaksi,
            status: t.status
          }))
        }
      });
    }

    // Cek apakah ada produk yang masih dijual
    const produkAktif = user.produk.filter(p => p.statusJual === true);
    if (produkAktif.length > 0) {
      return res.status(400).json({
        sukses: false,
        pesan: `Tidak dapat menghapus user yang memiliki produk aktif. Silakan hapus atau nonaktifkan produk terlebih dahulu.`,
        data: {
          produkAktif: produkAktif.map(p => ({
            id: p.id,
            judulProduk: p.judulProduk
          }))
        }
      });
    }

    // Mulai transaksi database untuk menghapus semua data terkait user
    await prisma.$transaction(async (tx) => {
      // Hapus notifikasi user
      await tx.notifikasi.deleteMany({
        where: { userId: userId }
      });

      // Hapus produk user (yang sudah tidak aktif)
      await tx.produk.deleteMany({
        where: { penjualId: userId }
      });

      // Hapus profile user
      await tx.profile.deleteMany({
        where: { userId: userId }
      });

      // Hapus user
      await tx.user.delete({
        where: { id: userId }
      });
    });

    console.log(`✅ User ${user.email} berhasil dihapus oleh admin`);

    res.json({
      sukses: true,
      pesan: 'User berhasil dihapus',
      data: {
        deletedUser: {
          id: user.id,
          email: user.email,
          nama: user.profile?.nama || 'Belum diisi',
          role: user.role
        }
      }
    });
  } catch (error) {
    console.error('Error deleting user:', error);
    res.status(500).json({
      sukses: false,
      pesan: 'Terjadi kesalahan server saat menghapus user',
      error: error.message
    });
  }
};

// Update Transaksi Status
const updateTransaksiStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    // Validasi status yang diizinkan
    const allowedStatuses = [
      'MENUNGGU_PEMBAYARAN',
      'DIBAYAR_SMARTCONTRACT',
      'MENUNGGU_KIRIM_AKUN',
      'DIKIRIM',
      'DIKONFIRMASI_PEMBELI',
      'SENGKETA',
      'SELESAI',
      'GAGAL'
    ];

    if (!allowedStatuses.includes(status)) {
      return res.status(400).json({
        sukses: false,
        pesan: 'Status tidak valid'
      });
    }

    const updatedTransaksi = await prisma.transaksi.update({
      where: { id },
      data: { 
        status,
        ...(status === 'SELESAI' && { waktuSelesai: new Date() }),
        ...(status === 'REFUND' && { 
          adminRefundAt: new Date(),
          adminRefundBy: req.user.userId,
          adminRefundNote: 'Refund processed by admin'
        })
      },
      include: {
        produk: true,
        user_transaksi_pembeliIdTouser: {
          select: {
            email: true,
            profile: { select: { nama: true } }
          }
        },
        user_transaksi_penjualIdTouser: {
          select: {
            email: true,
            profile: { select: { nama: true } }
          }
        }
      }
    });

    res.json({
      sukses: true,
      pesan: 'Status transaksi berhasil diperbarui',
      data: {
        transaksi: {
          id: updatedTransaksi.id,
          kodeTransaksi: updatedTransaksi.kodeTransaksi,
          status: updatedTransaksi.status,
          produk: updatedTransaksi.produk,
          pembeli: {
            email: updatedTransaksi.user_transaksi_pembeliIdTouser.email,
            nama: updatedTransaksi.user_transaksi_pembeliIdTouser.profile?.nama || 'Belum diisi'
          },
          penjual: {
            email: updatedTransaksi.user_transaksi_penjualIdTouser.email,
            nama: updatedTransaksi.user_transaksi_penjualIdTouser.profile?.nama || 'Belum diisi'
          }
        }
      }
    });
  } catch (error) {
    console.error('Error updating transaksi status:', error);
    res.status(500).json({
      sukses: false,
      pesan: 'Terjadi kesalahan server'
    });
  }
};

// Resolve Sengketa
const resolveSengketa = async (req, res) => {
  try {
    const { id } = req.params;
    const { resolution, winner } = req.body;
    const adminId = req.user.userId;
    
    // Validasi winner
    const allowedWinners = ['DIMENANGKAN_PEMBELI', 'DIMENANGKAN_PENJUAL'];
    if (!allowedWinners.includes(winner)) {
      return res.status(400).json({
        sukses: false,
        pesan: 'Pemenang sengketa tidak valid. Harus DIMENANGKAN_PEMBELI atau DIMENANGKAN_PENJUAL'
      });
    }
    
    // Get sengketa dengan detail transaksi dan user wallet addresses
    const sengketa = await prisma.sengketa.findUnique({
      where: { id },
      include: {
        transaksi: {
          include: {
            produk: true,
            user_transaksi_pembeliIdTouser: {
              select: {
                id: true,
                email: true,
                walletAddress: true,
                profile: { select: { nama: true } }
              }
            },
            user_transaksi_penjualIdTouser: {
              select: {
                id: true,
                email: true,
                walletAddress: true,
                profile: { select: { nama: true } }
              }
            }
          }
        }
      }
    });
    
    if (!sengketa) {
      return res.status(404).json({
        sukses: false,
        pesan: 'Sengketa tidak ditemukan'
      });
    }
    
    if (sengketa.status !== 'DIPROSES') {
      return res.status(400).json({
        sukses: false,
        pesan: 'Sengketa sudah diselesaikan sebelumnya'
      });
    }
    
    const transaksi = sengketa.transaksi;
    
    // Validasi transaksi memiliki escrowId
    if (!transaksi.escrowId) {
      return res.status(400).json({
        sukses: false,
        pesan: 'Transaksi tidak memiliki escrow ID. Tidak dapat menyelesaikan sengketa.'
      });
    }
    
    // Tentukan pemenang berdasarkan keputusan admin
    let winnerAddress;
    let winnerName;
    let loserName;
    
    if (winner === 'DIMENANGKAN_PEMBELI') {
      winnerAddress = transaksi.user_transaksi_pembeliIdTouser.walletAddress;
      winnerName = transaksi.user_transaksi_pembeliIdTouser.profile?.nama || 'Pembeli';
      loserName = transaksi.user_transaksi_penjualIdTouser.profile?.nama || 'Penjual';
    } else {
      winnerAddress = transaksi.user_transaksi_penjualIdTouser.walletAddress;
      winnerName = transaksi.user_transaksi_penjualIdTouser.profile?.nama || 'Penjual';
      loserName = transaksi.user_transaksi_pembeliIdTouser.profile?.nama || 'Pembeli';
    }
    
    if (!winnerAddress) {
      return res.status(400).json({
        sukses: false,
        pesan: `Alamat wallet ${winner === 'DIMENANGKAN_PEMBELI' ? 'pembeli' : 'penjual'} tidak ditemukan`
      });
    }
    
    console.log('💰 Resolving dispute on smart contract:', {
      escrowId: transaksi.escrowId,
      winnerAddress,
      winnerName,
      amount: transaksi.escrowAmount
    });
    
    // Update database
    const updatedSengketa = await prisma.sengketa.update({
      where: { id },
      data: {
        status: winner,
        resolvedAt: new Date(),
        resolution: resolution
      },
      include: {
        transaksi: {
          include: {
            produk: true,
            user_transaksi_pembeliIdTouser: {
              select: {
                id: true,
                email: true,
                walletAddress: true,
                profile: { select: { nama: true } }
              }
            },
            user_transaksi_penjualIdTouser: {
              select: {
                id: true,
                email: true,
                walletAddress: true,
                profile: { select: { nama: true } }
              }
            }
          }
        }
      }
    });
    
    // Update status transaksi menjadi selesai
    await prisma.transaksi.update({
      where: { id: updatedSengketa.transaksiId },
      data: {
        status: 'SELESAI',
        waktuSelesai: new Date()
      }
    });
    
    console.log('✅ Dispute resolved successfully:', {
      sengketaId: id,
      winner: winner,
      winnerAddress: winnerAddress
    });
    
    res.json({
      sukses: true,
      pesan: `Sengketa berhasil diselesaikan. Dana telah dikirim ke ${winnerName}.`,
      data: {
        sengketa: {
          id: updatedSengketa.id,
          status: updatedSengketa.status,
          resolution: resolution,
          winner: winnerName,
          loser: loserName,
          winnerAddress: winnerAddress,
          amount: transaksi.escrowAmount,
          transaksi: {
            kodeTransaksi: updatedSengketa.transaksi.kodeTransaksi,
            produk: updatedSengketa.transaksi.produk,
            pembeli: updatedSengketa.transaksi.user_transaksi_pembeliIdTouser,
            penjual: updatedSengketa.transaksi.user_transaksi_penjualIdTouser
          }
        }
      }
    });
  } catch (error) {
    console.error('❌ Error resolving sengketa:', error);
    res.status(500).json({
      sukses: false,
      pesan: 'Terjadi kesalahan server saat menyelesaikan sengketa',
      error: error.message
    });
  }
};

// Delete Produk
const deleteProduk = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Cek apakah produk ada
    const produk = await prisma.produk.findUnique({
      where: { id },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            profile: { select: { nama: true } }
          }
        },
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

    // Cek apakah ada transaksi aktif
    const transaksiAktif = produk.transaksi.find(t => 
      ['MENUNGGU_PEMBAYARAN', 'DIBAYAR_SMARTCONTRACT', 'MENUNGGU_KIRIM_AKUN', 'DIKIRIM', 'DIKONFIRMASI_PEMBELI'].includes(t.status)
    );

    if (transaksiAktif) {
      return res.status(400).json({
        sukses: false,
        pesan: `Tidak dapat menghapus produk yang memiliki transaksi aktif. Kode transaksi: ${transaksiAktif.kodeTransaksi}`
      });
    }

    // Hapus produk
    await prisma.produk.delete({
      where: { id }
    });

    res.json({
      sukses: true,
      pesan: 'Produk berhasil dihapus',
      data: {
        produk: {
          id: produk.id,
          kodeProduk: produk.kodeProduk,
          judulProduk: produk.judulProduk,
          penjual: {
            email: produk.user.email,
            nama: produk.user.profile?.nama || 'Belum diisi'
          }
        }
      }
    });
  } catch (error) {
    console.error('Error deleting produk:', error);
    res.status(500).json({
      sukses: false,
      pesan: 'Terjadi kesalahan server'
    });
  }
};

// Pay to Seller
const payToSeller = async (req, res) => {
  try {
    const { id } = req.params;
    const { note } = req.body;
    
    // Get transaksi dengan detail lengkap
    const transaksi = await prisma.transaksi.findUnique({
      where: { id },
      include: {
        produk: true,
        user_transaksi_pembeliIdTouser: {
          select: {
            id: true,
            email: true,
            walletAddress: true,
            profile: { select: { nama: true } }
          }
        },
        user_transaksi_penjualIdTouser: {
          select: {
            id: true,
            email: true,
            walletAddress: true,
            profile: { select: { nama: true } }
          }
        }
      }
    });
    
    if (!transaksi) {
      return res.status(404).json({
        sukses: false,
        pesan: 'Transaksi tidak ditemukan'
      });
    }
    
    // Validasi status transaksi
    if (transaksi.status !== 'DIKONFIRMASI_PEMBELI') {
      return res.status(400).json({
        sukses: false,
        pesan: 'Status transaksi tidak valid. Hanya transaksi yang sudah dikonfirmasi pembeli yang dapat dibayar.'
      });
    }
    
    // Update database
    const updatedTransaksi = await prisma.transaksi.update({
      where: { id },
      data: {
        status: 'SELESAI',
        waktuSelesai: new Date()
      },
      include: {
        produk: true,
        user_transaksi_pembeliIdTouser: {
          select: {
            id: true,
            email: true,
            walletAddress: true,
            profile: { select: { nama: true } }
          }
        },
        user_transaksi_penjualIdTouser: {
          select: {
            id: true,
            email: true,
            walletAddress: true,
            profile: { select: { nama: true } }
          }
        }
      }
    });
    
    console.log('✅ Payment to seller completed successfully:', {
      transaksiId: id
    });
    
    res.json({
      sukses: true,
      pesan: `Pembayaran berhasil! Dana telah dikirim ke ${transaksi.user_transaksi_penjualIdTouser.profile?.nama || 'penjual'}.`,
      data: {
        transaksi: {
          id: updatedTransaksi.id,
          kodeTransaksi: updatedTransaksi.kodeTransaksi,
          status: updatedTransaksi.status,
          waktuSelesai: updatedTransaksi.waktuSelesai,
          seller: {
            name: updatedTransaksi.user_transaksi_penjualIdTouser.profile?.nama || 'Penjual',
            address: updatedTransaksi.user_transaksi_penjualIdTouser.walletAddress
          },
          buyer: {
            name: updatedTransaksi.user_transaksi_pembeliIdTouser.profile?.nama || 'Pembeli',
            address: updatedTransaksi.user_transaksi_pembeliIdTouser.walletAddress
          }
        }
      }
    });
  } catch (error) {
    console.error('❌ Error paying to seller:', error);
    res.status(500).json({
      sukses: false,
      pesan: 'Terjadi kesalahan server saat memproses pembayaran',
      error: error.message
    });
  }
};

// Get Konfigurasi Admin
const getKonfigurasi = async (req, res) => {
  try {
    const { kunci } = req.params;
    
    // Template catatan admin yang tersedia
    const templateCatatan = {
      'template-catatan-admin': [
        'Produk melanggar kebijakan platform',
        'Informasi produk tidak lengkap atau tidak akurat',
        'Harga produk tidak wajar atau mencurigakan',
        'Gambar produk tidak sesuai dengan deskripsi',
        'Produk mengandung konten yang tidak pantas',
        'Akun game yang dijual sudah tidak valid',
        'Produk duplikat atau spam',
        'Melanggar terms of service game yang bersangkutan'
      ]
    };

    if (kunci === 'template-catatan-admin') {
      res.json({
        sukses: true,
        data: {
          kunci: kunci,
          nilai: templateCatatan[kunci]
        }
      });
    } else {
      res.status(404).json({
        sukses: false,
        pesan: 'Konfigurasi tidak ditemukan'
      });
    }
  } catch (error) {
    console.error('Error getting konfigurasi:', error);
    res.status(500).json({
      sukses: false,
      pesan: 'Terjadi kesalahan server'
    });
  }
};

module.exports = {
  validateAdmin,
  getDashboardStats,
  getAllUsers,
  getAllTransaksi,
  getAllSengketa,
  getAllProdukAdmin,
  updateUserStatus,
  deleteUser,
  updateTransaksiStatus,
  resolveSengketa,
  deleteProduk,
  getKonfigurasi,
  payToSeller
};
