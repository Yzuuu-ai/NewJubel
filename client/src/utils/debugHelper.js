/**
 * Debug Helper untuk troubleshooting masalah gambar
 */

export const debugProductImage = (produk, context = 'unknown') => {
  console.log(`🔍 Debug ${context} - Data produk:`, {
    id: produk.id,
    kodeProduk: produk.kodeProduk,
    judulProduk: produk.judulProduk,
    gambar: produk.gambar,
    gambarType: typeof produk.gambar,
    gambarLength: produk.gambar ? produk.gambar.length : 0,
    gambarStartsWith: produk.gambar ? produk.gambar.substring(0, 50) : null
  });

  if (produk.gambar) {
    console.log('🖼️ Debug - Gambar raw:', produk.gambar);
    
    try {
      if (typeof produk.gambar === 'string' && produk.gambar.startsWith('[')) {
        const parsed = JSON.parse(produk.gambar);
        console.log('🖼️ Debug - Gambar parsed:', parsed);
        console.log('🖼️ Debug - First image:', parsed[0]);
        return parsed[0]; // Return first image for immediate use
      } else {
        console.log('🖼️ Debug - Single image URL:', produk.gambar);
        return produk.gambar;
      }
    } catch (error) {
      console.log('🖼️ Debug - Error parsing gambar:', error);
      return produk.gambar; // Return as-is if parsing fails
    }
  }
  
  return null;
};

export const getFirstImageUrl = (imageData) => {
  if (!imageData) return null;
  
  try {
    if (typeof imageData === 'string' && imageData.startsWith('[')) {
      const parsed = JSON.parse(imageData);
      return Array.isArray(parsed) && parsed.length > 0 ? parsed[0] : imageData;
    }
    return imageData;
  } catch (error) {
    console.warn('Error parsing image data:', error);
    return imageData;
  }
};