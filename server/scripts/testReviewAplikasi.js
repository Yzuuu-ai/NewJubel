const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function testReviewAplikasi() {
  try {
    console.log('🔍 Testing review aplikasi function...');
    
    // Cari aplikasi dengan status MENUNGGU
    const aplikasiMenunggu = await prisma.aplikasi_penjual.findFirst({
      where: { status: 'MENUNGGU' },
      include: { user: true }
    });

    if (!aplikasiMenunggu) {
      console.log('❌ Tidak ada aplikasi dengan status MENUNGGU');
      return;
    }

    console.log('📋 Aplikasi ditemukan:', {
      id: aplikasiMenunggu.id,
      userId: aplikasiMenunggu.userId,
      email: aplikasiMenunggu.user.email,
      status: aplikasiMenunggu.status
    });

    // Test update ke DITOLAK
    console.log('\n🔄 Testing update to DITOLAK...');
    
    const result = await prisma.$transaction(async (tx) => {
      // Update aplikasi
      const aplikasiUpdate = await tx.aplikasi_penjual.update({
        where: { id: aplikasiMenunggu.id },
        data: {
          status: 'DITOLAK',
          catatanAdmin: 'Test penolakan aplikasi - automated test'
        }
      });

      console.log('✅ Aplikasi updated:', aplikasiUpdate);

      // Update user
      const userUpdate = await tx.user.update({
        where: { id: aplikasiMenunggu.userId },
        data: {
          role: 'USER',
          isPenjualTerverifikasi: false,
          catatanPenjual: 'Test penolakan aplikasi - automated test'
        }
      });

      console.log('✅ User updated:', {
        id: userUpdate.id,
        role: userUpdate.role,
        isPenjualTerverifikasi: userUpdate.isPenjualTerverifikasi
      });

      return aplikasiUpdate;
    });

    console.log('\n✅ Transaction completed successfully!');
    console.log('📊 Final result:', result);

    // Verify the changes
    const verifyAplikasi = await prisma.aplikasi_penjual.findUnique({
      where: { id: aplikasiMenunggu.id },
      include: { user: true }
    });

    console.log('\n🔍 Verification:');
    console.log('Aplikasi status:', verifyAplikasi.status);
    console.log('Catatan admin:', verifyAplikasi.catatanAdmin);
    console.log('User role:', verifyAplikasi.user.role);
    console.log('User isPenjualTerverifikasi:', verifyAplikasi.user.isPenjualTerverifikasi);

  } catch (error) {
    console.error('❌ Error testing review aplikasi:', error);
    console.error('Error stack:', error.stack);
  } finally {
    await prisma.$disconnect();
  }
}

testReviewAplikasi();