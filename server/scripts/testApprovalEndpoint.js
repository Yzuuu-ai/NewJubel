const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function testApprovalEndpoint() {
  try {
    console.log('🔍 Testing approval endpoint simulation...');
    
    // Reset aplikasi ke MENUNGGU terlebih dahulu
    const aplikasiId = 'aplikasi_1752179978237_7c4667';
    const userId = 'a81373b9-a4fa-4115-a274-db05b37c4667';
    
    await prisma.$transaction(async (tx) => {
      await tx.aplikasi_penjual.update({
        where: { id: aplikasiId },
        data: {
          status: 'MENUNGGU',
          catatanAdmin: null
        }
      });

      await tx.user.update({
        where: { id: userId },
        data: {
          role: 'PENJUAL',
          isPenjualTerverifikasi: false,
          catatanPenjual: null
        }
      });
    });

    console.log('✅ Reset to MENUNGGU completed');

    // Cari admin user
    const admin = await prisma.user.findFirst({
      where: { role: 'ADMIN' }
    });

    // Cari aplikasi
    const aplikasi = await prisma.aplikasi_penjual.findFirst({
      where: { status: 'MENUNGGU' },
      include: { user: true }
    });

    console.log('📋 Testing DISETUJUI for:', {
      id: aplikasi.id,
      email: aplikasi.user.email,
      status: aplikasi.status
    });

    // Simulate the approval process
    const reviewData = {
      status: 'DISETUJUI',
      catatanAdmin: 'Test persetujuan aplikasi - automated test'
    };

    console.log('\n🔄 Simulating approval process...');

    // Import the controller function
    const { reviewAplikasi } = require('../controllers/kontrolerAplikasiPenjual');

    // Create mock request and response objects
    const mockReq = {
      params: { id: aplikasi.id },
      body: reviewData,
      user: {
        userId: admin.id,
        role: admin.role,
        email: admin.email
      }
    };

    const mockRes = {
      status: function(code) {
        this.statusCode = code;
        return this;
      },
      json: function(data) {
        this.responseData = data;
        console.log(`📤 Response [${this.statusCode}]:`, data);
        return this;
      }
    };

    // Call the controller function
    await reviewAplikasi(mockReq, mockRes);

    // Verify the result
    const updatedAplikasi = await prisma.aplikasi_penjual.findUnique({
      where: { id: aplikasi.id },
      include: { user: true }
    });

    console.log('\n🔍 Verification after approval:');
    console.log('Aplikasi status:', updatedAplikasi.status);
    console.log('Catatan admin:', updatedAplikasi.catatanAdmin);
    console.log('User role:', updatedAplikasi.user.role);
    console.log('User isPenjualTerverifikasi:', updatedAplikasi.user.isPenjualTerverifikasi);
    console.log('User diverifikasiPada:', updatedAplikasi.user.diverifikasiPada);

  } catch (error) {
    console.error('❌ Error testing approval endpoint:', error);
    console.error('Error stack:', error.stack);
  } finally {
    await prisma.$disconnect();
  }
}

testApprovalEndpoint();