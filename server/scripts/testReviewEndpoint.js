const { PrismaClient } = require('@prisma/client');
const jwt = require('jsonwebtoken');

const prisma = new PrismaClient();

async function testReviewEndpoint() {
  try {
    console.log('🔍 Testing review endpoint simulation...');
    
    // Cari admin user
    const admin = await prisma.user.findFirst({
      where: { role: 'ADMIN' }
    });

    if (!admin) {
      console.log('❌ Admin user tidak ditemukan');
      return;
    }

    console.log('👤 Admin found:', admin.email);

    // Cari aplikasi dengan status MENUNGGU
    const aplikasi = await prisma.aplikasi_penjual.findFirst({
      where: { status: 'MENUNGGU' },
      include: { user: true }
    });

    if (!aplikasi) {
      console.log('❌ Tidak ada aplikasi dengan status MENUNGGU');
      return;
    }

    console.log('📋 Aplikasi found:', {
      id: aplikasi.id,
      email: aplikasi.user.email,
      status: aplikasi.status
    });

    // Simulate the review process
    const reviewData = {
      status: 'DITOLAK',
      catatanAdmin: 'Test penolakan melalui endpoint simulation'
    };

    console.log('\n🔄 Simulating review process...');
    console.log('Request data:', reviewData);

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

    console.log('\n🔍 Verification after review:');
    console.log('Aplikasi status:', updatedAplikasi.status);
    console.log('Catatan admin:', updatedAplikasi.catatanAdmin);
    console.log('User role:', updatedAplikasi.user.role);
    console.log('User isPenjualTerverifikasi:', updatedAplikasi.user.isPenjualTerverifikasi);

  } catch (error) {
    console.error('❌ Error testing review endpoint:', error);
    console.error('Error stack:', error.stack);
  } finally {
    await prisma.$disconnect();
  }
}

testReviewEndpoint();