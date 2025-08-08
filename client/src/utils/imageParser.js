/**
 * Simple Image Parser untuk mengatasi masalah JSON string array
 */

export const parseProductImage = (imageData) => {
  if (!imageData) return null;
  
  try {
    // Jika string yang dimulai dengan '[', parse sebagai JSON
    if (typeof imageData === 'string' && imageData.startsWith('[')) {
      const parsed = JSON.parse(imageData);
      return Array.isArray(parsed) && parsed.length > 0 ? parsed[0] : null;
    }
    
    // Jika array, ambil elemen pertama
    if (Array.isArray(imageData)) {
      return imageData.length > 0 ? imageData[0] : null;
    }
    
    // Jika string biasa, return as-is
    if (typeof imageData === 'string') {
      return imageData;
    }
    
    return null;
  } catch (error) {
    console.warn('Error parsing image data:', error);
    return typeof imageData === 'string' ? imageData : null;
  }
};

export const parseAllProductImages = (imageData) => {
  if (!imageData) return [];
  
  try {
    // Jika string yang dimulai dengan '[', parse sebagai JSON
    if (typeof imageData === 'string' && imageData.startsWith('[')) {
      const parsed = JSON.parse(imageData);
      return Array.isArray(parsed) ? parsed : [imageData];
    }
    
    // Jika array, return as-is
    if (Array.isArray(imageData)) {
      return imageData;
    }
    
    // Jika string biasa, return sebagai array
    if (typeof imageData === 'string') {
      return [imageData];
    }
    
    return [];
  } catch (error) {
    console.warn('Error parsing image data:', error);
    return typeof imageData === 'string' ? [imageData] : [];
  }
};