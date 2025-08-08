const jwt = require('jsonwebtoken');

// Contoh token yang mungkin ada di localStorage
const sampleToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiI5ZjQyNzE4Ni1hNzE5LTQ5YzQtOGJhNy1hNzE5ZjQyNzE4NiIsImlhdCI6MTczNDU5NzY5NCwiZXhwIjoxNzM1MjAyNDk0fQ.example';

function verifyToken(token) {
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'kunci-rahasia-jubel');
    console.log('🔍 Token decoded:', decoded);
    
    if (decoded.role) {
      console.log('✅ Token contains role:', decoded.role);
    } else {
      console.log('❌ Token does NOT contain role - user needs to login again');
    }
    
    return decoded;
  } catch (error) {
    console.error('❌ Token verification failed:', error.message);
    return null;
  }
}

console.log('🔧 Token Verification Test');
console.log('This script helps verify if JWT tokens contain role information');
console.log('');

// Test with sample token structure
const testToken = jwt.sign(
  { userId: 'test-user-id', role: 'ADMIN' },
  process.env.JWT_SECRET || 'kunci-rahasia-jubel',
  { expiresIn: '7d' }
);

console.log('📝 Test token with role:', testToken);
verifyToken(testToken);

console.log('');
console.log('💡 If your current token doesn\'t have role, please:');
console.log('1. Logout from the frontend');
console.log('2. Login again with admin credentials');
console.log('3. The new token will include role information');