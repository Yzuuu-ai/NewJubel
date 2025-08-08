const bcrypt = require('bcryptjs');
const { PrismaClient } = require('@prisma/client');
const { v4: uuidv4 } = require('uuid');

const prisma = new PrismaClient();

async function createAdmin() {
  try {
    console.log('🔧 Creating admin user...');

    // Check if admin already exists
    const existingAdmin = await prisma.user.findFirst({
      where: { role: 'ADMIN' }
    });

    if (existingAdmin) {
      console.log('✅ Admin user already exists:', existingAdmin.email);
      return;
    }

    // Admin credentials
    const adminEmail = 'admin@jubel.com';
    const adminPassword = 'admin123';
    const adminNama = 'Administrator Jubel';

    // Check if user with admin email already exists
    const existingUser = await prisma.user.findUnique({
      where: { email: adminEmail }
    });

    if (existingUser) {
      // Update existing user to admin
      const updatedUser = await prisma.user.update({
        where: { id: existingUser.id },
        data: { role: 'ADMIN' },
        include: { profile: true }
      });
      console.log('✅ Updated existing user to admin:', updatedUser.email);
      return;
    }

    // Hash password
    const saltRounds = 12;
    const hashedPassword = await bcrypt.hash(adminPassword, saltRounds);

    // Create new admin user
    const adminUser = await prisma.user.create({
      data: {
        id: uuidv4(),
        email: adminEmail,
        password: hashedPassword,
        role: 'ADMIN',
        profile: {
          create: {
            id: uuidv4(),
            nama: adminNama
          }
        }
      },
      include: {
        profile: true
      }
    });

    console.log('✅ Admin user created successfully!');
    console.log('📧 Email:', adminUser.email);
    console.log('🔑 Password:', adminPassword);
    console.log('👤 Name:', adminUser.profile.nama);
    console.log('🎭 Role:', adminUser.role);

  } catch (error) {
    console.error('❌ Error creating admin:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the script
createAdmin();