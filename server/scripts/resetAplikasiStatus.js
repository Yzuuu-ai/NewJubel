const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function resetAplikasiStatus() {
  try {
    console.log('🔄 Resetting aplikasi status to MENUNGGU...');
    
    // Reset aplikasi yang baru saja ditest
    const aplikasiId = 'aplikasi_1752179978237_7c4667';
    const userId = 'a81373b9-a4fa-4115-a274-db05b37c4667';
    
    const result = await prisma.$transaction(async (tx) => {
      // Reset aplikasi
      const aplikasiUpdate = await tx.aplikasi_penjual.update({
        where: { id: aplikasiId },
        data: {
          status: 'MENUNGGU',
          catatanAdmin: null
        }
      });

      // Reset user
      const userUpdate = await tx.user.update({
        where: { id: userId },
        data: {
          role: 'PENJUAL',
          isPenjualTerverifikasi: false,
          catatanPenjual: null
        }
      });

      return { aplikasiUpdate, userUpdate };
    });

    console.log('✅ Reset completed successfully!');
    console.log('📊 Aplikasi status:', result.aplikasiUpdate.status);
    console.log('📊 User role:', result.userUpdate.role);

  } catch (error) {
    console.error('❌ Error resetting aplikasi:', error);
  } finally {
    await prisma.$disconnect();
  }
}

resetAplikasiStatus();