-- CreateTable
CREATE TABLE `notifikasi` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `transaksiId` VARCHAR(191) NULL,
    `tipe` ENUM('REGISTER', 'PEMBAYARAN_DITERIMA', 'TRANSAKSI_SUKSES', 'SENGKETA_DIMULAI', 'SENGKETA_DIPUTUSKAN', 'AKUN_DIKIRIM', 'COUNTDOWN_PEMBAYARAN', 'APLIKASI_PENJUAL_DIAJUKAN', 'APLIKASI_PENJUAL_DISETUJUI', 'APLIKASI_PENJUAL_DITOLAK', 'APLIKASI_PENJUAL_BARU') NOT NULL,
    `judul` VARCHAR(191) NOT NULL,
    `pesan` VARCHAR(191) NOT NULL,
    `dibaca` BOOLEAN NOT NULL DEFAULT false,
    `dibuatPada` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `Notifikasi_transaksiId_fkey`(`transaksiId`),
    INDEX `Notifikasi_userId_fkey`(`userId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `produk` (
    `id` VARCHAR(191) NOT NULL,
    `kodeProduk` VARCHAR(191) NOT NULL,
    `namaGame` VARCHAR(191) NOT NULL,
    `deskripsi` TEXT NULL,
    `harga` INTEGER NOT NULL,
    `penjualId` VARCHAR(191) NOT NULL,
    `statusJual` BOOLEAN NOT NULL DEFAULT true,
    `gambar` LONGTEXT NULL,
    `judulProduk` VARCHAR(191) NOT NULL,
    `dibuatPada` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `diperbaruiPada` DATETIME(3) NOT NULL,
    `statusProduk` ENUM('AKTIF', 'TERJUAL', 'PENDING', 'DITOLAK', 'DIHAPUS') NULL DEFAULT 'AKTIF',
    `hargaEth` DOUBLE NULL,

    UNIQUE INDEX `Produk_kodeProduk_key`(`kodeProduk`),
    INDEX `Produk_penjualId_fkey`(`penjualId`),
    INDEX `idx_produk_status`(`statusProduk`),
    INDEX `idx_produk_status_jual`(`statusJual`, `statusProduk`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `profile` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `nama` VARCHAR(191) NOT NULL,
    `nomor_telepon` VARCHAR(191) NULL,
    `alamat` VARCHAR(191) NULL,
    `nomor_whatsapp` VARCHAR(191) NULL,

    UNIQUE INDEX `Profile_userId_key`(`userId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `riwayattransaksi` (
    `id` VARCHAR(191) NOT NULL,
    `kodeTransaksi` VARCHAR(191) NOT NULL,
    `namaGame` VARCHAR(191) NOT NULL,
    `harga` INTEGER NOT NULL,
    `walletPenjual` VARCHAR(191) NOT NULL,
    `walletPembeli` VARCHAR(191) NOT NULL,
    `tanggalSelesai` DATETIME(3) NOT NULL,
    `dibuatPada` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `sengketa` (
    `id` VARCHAR(191) NOT NULL,
    `transaksiId` VARCHAR(191) NOT NULL,
    `deskripsi` VARCHAR(191) NULL,
    `adminNote` TEXT NULL,
    `dibuatPada` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `disputeType` ENUM('USER_DISPUTE', 'ADMIN_DISPUTE') NOT NULL DEFAULT 'USER_DISPUTE',
    `paymentMethod` VARCHAR(191) NULL,
    `paymentTxHash` VARCHAR(191) NULL,
    `pembeliBukti` VARCHAR(191) NULL,
    `penjualBukti` VARCHAR(191) NULL,
    `resolution` TEXT NULL,
    `resolvedAt` DATETIME(3) NULL,
    `status` ENUM('DIPROSES', 'DIMENANGKAN_PEMBELI', 'DIMENANGKAN_PENJUAL') NOT NULL DEFAULT 'DIPROSES',

    UNIQUE INDEX `Sengketa_transaksiId_key`(`transaksiId`),
    INDEX `idx_sengketa_disputeType`(`disputeType`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `transaksi` (
    `id` VARCHAR(191) NOT NULL,
    `kodeTransaksi` VARCHAR(191) NOT NULL,
    `produkId` VARCHAR(191) NOT NULL,
    `pembeliId` VARCHAR(191) NOT NULL,
    `penjualId` VARCHAR(191) NOT NULL,
    `status` ENUM('MENUNGGU_PEMBAYARAN', 'DIBAYAR_SMARTCONTRACT', 'MENUNGGU_KIRIM_AKUN', 'DIKIRIM', 'DIKONFIRMASI_PEMBELI', 'SENGKETA', 'SELESAI', 'REFUND', 'GAGAL') NOT NULL DEFAULT 'MENUNGGU_PEMBAYARAN',
    `waktuBayar` DATETIME(3) NULL,
    `waktuSelesai` DATETIME(3) NULL,
    `contractAddress` VARCHAR(191) NULL,
    `escrowAmount` VARCHAR(191) NULL,
    `smartContractTxHash` VARCHAR(191) NULL,
    `accountData` TEXT NULL,
    `deskripsiBukti` TEXT NULL,
    `adminRefundAt` DATETIME(3) NULL,
    `adminRefundBy` VARCHAR(191) NULL,
    `adminRefundNote` TEXT NULL,
    `adminRefundTxHash` VARCHAR(191) NULL,
    `adminReleaseAt` DATETIME(3) NULL,
    `adminReleaseBy` VARCHAR(191) NULL,
    `adminReleaseNote` TEXT NULL,
    `adminReleaseTxHash` VARCHAR(191) NULL,
    `dibuatPada` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `diperbaruiPada` DATETIME(3) NOT NULL,
    `escrowId` VARCHAR(191) NULL,
    `expiredAt` DATETIME(3) NULL,

    UNIQUE INDEX `Transaksi_kodeTransaksi_key`(`kodeTransaksi`),
    INDEX `Transaksi_pembeliId_fkey`(`pembeliId`),
    INDEX `Transaksi_penjualId_fkey`(`penjualId`),
    INDEX `Transaksi_produkId_fkey`(`produkId`),
    INDEX `Transaksi_escrowId_fkey`(`escrowId`),
    INDEX `idx_escrowId`(`escrowId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `user` (
    `id` VARCHAR(191) NOT NULL,
    `email` VARCHAR(191) NOT NULL,
    `password` VARCHAR(191) NOT NULL,
    `role` ENUM('PEMBELI', 'PENJUAL', 'ADMIN') NOT NULL DEFAULT 'PEMBELI',
    `walletAddress` VARCHAR(191) NULL,
    `dibuatPada` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `User_email_key`(`email`),
    UNIQUE INDEX `User_walletAddress_key`(`walletAddress`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `aplikasi_penjual` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `nomor_telepon` VARCHAR(191) NULL,
    `nomor_whatsapp` VARCHAR(191) NULL,
    `alamat` TEXT NULL,
    `alasan_jual` TEXT NULL,
    `status` ENUM('MENUNGGU', 'SEDANG_DIREVIEW', 'DISETUJUI', 'DITOLAK') NOT NULL DEFAULT 'MENUNGGU',
    `catatan_admin` TEXT NULL,
    `diajukan_pada` DATETIME(3) NULL,
    `diperbarui` DATETIME(3) NULL,

    UNIQUE INDEX `aplikasi_penjual_userId_key`(`userId`),
    INDEX `aplikasi_penjual_status_idx`(`status`),
    INDEX `aplikasi_penjual_diajukanPada_idx`(`diajukan_pada`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `notifikasi` ADD CONSTRAINT `Notifikasi_transaksiId_fkey` FOREIGN KEY (`transaksiId`) REFERENCES `transaksi`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `notifikasi` ADD CONSTRAINT `Notifikasi_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `user`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `produk` ADD CONSTRAINT `Produk_penjualId_fkey` FOREIGN KEY (`penjualId`) REFERENCES `user`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `profile` ADD CONSTRAINT `Profile_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `user`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `sengketa` ADD CONSTRAINT `Sengketa_transaksiId_fkey` FOREIGN KEY (`transaksiId`) REFERENCES `transaksi`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `transaksi` ADD CONSTRAINT `Transaksi_pembeliId_fkey` FOREIGN KEY (`pembeliId`) REFERENCES `user`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `transaksi` ADD CONSTRAINT `Transaksi_penjualId_fkey` FOREIGN KEY (`penjualId`) REFERENCES `user`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `transaksi` ADD CONSTRAINT `Transaksi_produkId_fkey` FOREIGN KEY (`produkId`) REFERENCES `produk`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `aplikasi_penjual` ADD CONSTRAINT `aplikasi_penjual_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `user`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
