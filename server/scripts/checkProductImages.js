const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkProductImages() {
  try {
    console.log('🔍 Checking product images in database...\n');
    
    const products = await prisma.produk.findMany({
      select: {
        id: true,
        kodeProduk: true,
        judulProduk: true,
        gambar: true,
        statusProduk: true,
        statusJual: true
      },
      orderBy: {
        dibuatPada: 'desc'
      },
      take: 10 // Check last 10 products
    });

    if (products.length === 0) {
      console.log('❌ No products found in database');
      return;
    }

    console.log(`✅ Found ${products.length} products\n`);

    products.forEach((product, index) => {
      console.log(`--- Product ${index + 1} ---`);
      console.log(`ID: ${product.id}`);
      console.log(`Code: ${product.kodeProduk}`);
      console.log(`Title: ${product.judulProduk}`);
      console.log(`Status: ${product.statusProduk} | Jual: ${product.statusJual}`);
      console.log(`Gambar Type: ${typeof product.gambar}`);
      console.log(`Gambar Length: ${product.gambar ? product.gambar.length : 0}`);
      console.log(`Gambar Preview: ${product.gambar ? product.gambar.substring(0, 100) + '...' : 'NULL'}`);
      
      // Try to parse if it's JSON
      if (product.gambar && typeof product.gambar === 'string' && product.gambar.startsWith('[')) {
        try {
          const parsed = JSON.parse(product.gambar);
          console.log(`Parsed Images Count: ${parsed.length}`);
          console.log(`First Image: ${parsed[0] || 'N/A'}`);
        } catch (error) {
          console.log(`❌ JSON Parse Error: ${error.message}`);
        }
      } else if (product.gambar) {
        console.log(`Single Image URL: ${product.gambar}`);
      } else {
        console.log(`❌ No image data`);
      }
      
      console.log(''); // Empty line
    });

  } catch (error) {
    console.error('❌ Error checking products:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the check
checkProductImages();