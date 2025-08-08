const axios = require('axios');

async function testAuthEndpoint() {
  try {
    console.log('🧪 Testing auth endpoint...');

    // Test login
    const loginResponse = await axios.post('http://localhost:5000/api/auth/masuk', {
      email: 'darul29042002@gmail.com',
      password: 'password123' // Ganti dengan password yang benar
    });

    if (loginResponse.data.sukses) {
      console.log('✅ Login successful');
      const userData = loginResponse.data.data.pengguna;
      console.log('📋 User data from login:');
      console.log('- ID:', userData.id);
      console.log('- Email:', userData.email);
      console.log('- Role:', userData.role);
      console.log('- isPenjualTerverifikasi:', userData.isPenjualTerverifikasi);
      console.log('- diverifikasiPada:', userData.diverifikasiPada);
      console.log('- catatanPenjual:', userData.catatanPenjual);
      console.log('- Profile nama:', userData.profil?.nama);

      // Test token validation
      const token = loginResponse.data.data.token;
      console.log('');
      console.log('🔍 Testing token validation...');
      
      const validateResponse = await axios.get('http://localhost:5000/api/auth/validasi', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (validateResponse.data.sukses) {
        console.log('✅ Token validation successful');
        const validatedUser = validateResponse.data.user;
        console.log('📋 User data from validation:');
        console.log('- ID:', validatedUser.id);
        console.log('- Email:', validatedUser.email);
        console.log('- Role:', validatedUser.role);
        console.log('- isPenjualTerverifikasi:', validatedUser.isPenjualTerverifikasi);
        console.log('- diverifikasiPada:', validatedUser.diverifikasiPada);
        console.log('- catatanPenjual:', validatedUser.catatanPenjual);
        console.log('- Profile nama:', validatedUser.nama);
      } else {
        console.log('❌ Token validation failed:', validateResponse.data.pesan);
      }
    } else {
      console.log('❌ Login failed:', loginResponse.data.pesan);
    }

  } catch (error) {
    console.error('❌ Error testing auth endpoint:', error.response?.data || error.message);
  }
}

// Run the test
testAuthEndpoint();