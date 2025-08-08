const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seeding...');

  // Hash password untuk admin
  const hashedPassword = await bcrypt.hash('admin123', 10);
  
  // Buat admin user
  const admin = await prisma.user.upsert({
    where: { email: 'admin@jubel.com' },
    update: {},
    create: {
      id: 'admin_jubel_001',
      email: 'admin@jubel.com',
      password: hashedPassword,
      role: 'ADMIN',
      walletAddress: '0x0000000000000000000000000000000000000000',
      profile: {
        create: {
          id: 'profile_admin_001',
          nama: 'Admin Jubel',
          nomor_telepon: '081234567890'
        }
      }
    },
    include: {
      profile: true
    }
  });

  console.log('✅ Admin user created:', admin.email);

  // Buat user untuk testing
  const userPassword = await bcrypt.hash('user123', 10);
  const user = await prisma.user.upsert({
    where: { email: 'user@jubel.com' },
    update: {},
    create: {
      id: 'user_jubel_001',
      email: 'user@jubel.com',
      password: userPassword,
      role: 'PEMBELI',
      walletAddress: '0x1111111111111111111111111111111111111111',
      profile: {
        create: {
          id: 'profile_user_001',
          nama: 'User Jubel',
          nomor_telepon: '081234567891'
        }
      }
    },
    include: {
      profile: true
    }
  });

  console.log('✅ Test user created:', user.email);

  // Hash password untuk admin dari Email.md
  const emailPassword = await bcrypt.hash('Yuu1234.', 10);

  // Buat admin user dari Email.md
  const adminEmail1 = await prisma.user.upsert({
    where: { email: 'aquainaja04@gmail.com' },
    update: {},
    create: {
      id: 'admin_email_001',
      email: 'aquainaja04@gmail.com',
      password: emailPassword,
      role: 'ADMIN',
      profile: {
        create: {
          id: 'profile_admin_email_001',
          nama: 'Admin Aqua',
          nomor_telepon: '081234567892'
        }
      }
    },
    include: {
      profile: true
    }
  });

  console.log('✅ Admin email user created:', adminEmail1.email);

  console.log('🎉 Database seeding completed successfully!');
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });