const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkUserStatus() {
  try {
    console.log('🔍 Checking user status for darul29042002@gmail.com...');

    // Find user by email
    const user = await prisma.user.findUnique({
      where: { email: 'darul29042002@gmail.com' },
      include: { profile: true }
    });

    if (!user) {
      console.log('❌ User not found');
      return;
    }

    console.log('📋 Current user status:');
    console.log('- ID:', user.id);
    console.log('- Email:', user.email);
    console.log('- Role:', user.role);
    console.log('- isPenjualTerverifikasi:', user.isPenjualTerverifikasi);
    console.log('- diverifikasiPada:', user.diverifikasiPada);
    console.log('- catatanPenjual:', user.catatanPenjual);
    console.log('- Profile nama:', user.profile?.nama);

    // Check if user should be verified seller
    if (user.role === 'PENJUAL' && !user.isPenjualTerverifikasi) {
      console.log('');
      console.log('🔧 User is PENJUAL but not verified. Updating...');
      
      const updatedUser = await prisma.user.update({
        where: { id: user.id },
        data: {
          isPenjualTerverifikasi: true,
          diverifikasiPada: new Date(),
          catatanPenjual: 'Diverifikasi otomatis oleh sistem'
        },
        include: { profile: true }
      });

      console.log('✅ User updated successfully!');
      console.log('- isPenjualTerverifikasi:', updatedUser.isPenjualTerverifikasi);
      console.log('- diverifikasiPada:', updatedUser.diverifikasiPada);
      console.log('- catatanPenjual:', updatedUser.catatanPenjual);

      // Create notification
      try {
        await prisma.notifikasi.create({
          data: {
            userId: user.id,
            tipe: 'APLIKASI_PENJUAL_DISETUJUI',
            judul: '🎉 Selamat! Anda Sekarang Penjual Terverifikasi',
            pesan: 'Status penjual Anda telah diverifikasi. Anda sekarang dapat menjual produk di platform Jubel.'
          }
        });
        console.log('📧 Notification created');
      } catch (notifError) {
        console.error('❌ Error creating notification:', notifError);
      }
    } else if (user.role === 'PENJUAL' && user.isPenjualTerverifikasi) {
      console.log('✅ User is already a verified seller');
    } else {
      console.log('ℹ️ User role is', user.role, '- no action needed');
    }

  } catch (error) {
    console.error('❌ Error checking user status:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the script
checkUserStatus();