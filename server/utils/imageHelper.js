/**
 * Backend Image Helper Utilities
 * Ensures consistent image data handling between frontend and backend
 */

/**
 * Validate if a URL is a valid image URL (not data URL)
 * @param {string} url - URL to validate
 * @returns {boolean} - True if valid image URL
 */
const isValidImageUrl = (url) => {
  if (!url || typeof url !== 'string') return false;
  
  // Reject data URLs (base64)
  if (url.startsWith('data:image/')) {
    console.warn('⚠️ Data URL detected and rejected:', url.substring(0, 50) + '...');
    return false;
  }
  
  // Accept HTTP/HTTPS URLs
  if (url.startsWith('http://') || url.startsWith('https://')) return true;
  
  // Accept relative URLs
  if (url.startsWith('/')) return true;
  
  // Accept Cloudinary URLs
  if (url.includes('cloudinary.com') || url.includes('res.cloudinary.com')) return true;
  
  return false;
};

/**
 * Clean and validate image data before saving to database
 * @param {string|Array} imageData - Image data to clean
 * @returns {string|null} - Cleaned image data or null
 */
const cleanImageData = (imageData) => {
  if (!imageData) return null;
  
  try {
    let urls = [];
    
    // Handle array input
    if (Array.isArray(imageData)) {
      urls = imageData;
    } 
    // Handle JSON string input
    else if (typeof imageData === 'string' && (imageData.startsWith('[') || imageData.startsWith('{'))) {
      try {
        const parsed = JSON.parse(imageData);
        if (Array.isArray(parsed)) {
          urls = parsed;
        } else if (parsed && typeof parsed === 'object' && parsed.url) {
          urls = [parsed.url];
        } else {
          urls = [imageData]; // Treat as single URL
        }
      } catch (parseError) {
        console.warn('⚠️ Failed to parse image JSON, treating as single URL:', parseError);
        urls = [imageData];
      }
    }
    // Handle single string URL
    else if (typeof imageData === 'string') {
      urls = [imageData];
    }
    
    // Limit to maximum 5 images
    if (urls.length > 5) {
      console.warn('⚠️ Too many images, limiting to first 5');
      urls = urls.slice(0, 5);
    }
    
    // Filter out invalid URLs
    const validUrls = urls.filter(url => {
      if (!url || typeof url !== 'string') return false;
      return isValidImageUrl(url);
    });
    
    if (validUrls.length === 0) {
      console.warn('⚠️ No valid image URLs found in data:', imageData);
      return null;
    }
    
    // Return as JSON string if multiple URLs, single string if one URL
    if (validUrls.length === 1) {
      return validUrls[0];
    } else {
      return JSON.stringify(validUrls);
    }
    
  } catch (error) {
    console.error('❌ Error cleaning image data:', error);
    return null;
  }
};

/**
 * Parse image data for frontend consumption
 * @param {string} imageData - Image data from database
 * @returns {Object} - Parsed image data with first URL and all URLs
 */
const parseImageData = (imageData) => {
  if (!imageData) {
    return {
      firstImage: null,
      allImages: [],
      hasMultiple: false
    };
  }
  
  try {
    let urls = [];
    
    // Handle JSON string
    if (typeof imageData === 'string' && (imageData.startsWith('[') || imageData.startsWith('{'))) {
      try {
        const parsed = JSON.parse(imageData);
        if (Array.isArray(parsed)) {
          urls = parsed.filter(url => url && typeof url === 'string');
        } else if (parsed && typeof parsed === 'object' && parsed.url) {
          urls = [parsed.url];
        }
      } catch (parseError) {
        console.warn('⚠️ Failed to parse image JSON:', parseError);
        urls = [imageData];
      }
    }
    // Handle single string
    else if (typeof imageData === 'string') {
      urls = [imageData];
    }
    
    // Filter valid URLs
    const validUrls = urls.filter(url => isValidImageUrl(url));
    
    return {
      firstImage: validUrls.length > 0 ? validUrls[0] : null,
      allImages: validUrls,
      hasMultiple: validUrls.length > 1
    };
    
  } catch (error) {
    console.error('❌ Error parsing image data:', error);
    return {
      firstImage: null,
      allImages: [],
      hasMultiple: false
    };
  }
};

/**
 * Format product data with consistent image handling
 * @param {Object} product - Product object from database
 * @returns {Object} - Formatted product with consistent image data
 */
const formatProductWithImages = (product) => {
  if (!product) return null;
  
  const imageData = parseImageData(product.gambar);
  
  return {
    ...product,
    gambar: imageData.firstImage, // Always return first image as main image
    gambarList: imageData.allImages, // All images as array
    hasMultipleImages: imageData.hasMultiple
  };
};

/**
 * Validate image data in request body (supports up to 5 images)
 * @param {string|Array} imageData - Image data from request
 * @returns {Object} - Validation result
 */
const validateImageRequest = (imageData, isRequired = true) => {
  if (!imageData) {
    if (isRequired) {
      return {
        valid: false,
        message: 'Gambar produk wajib diisi',
        cleanData: null
      };
    } else {
      // For updates, empty image data is valid (means no change)
      return {
        valid: true,
        message: 'Tidak ada perubahan gambar',
        cleanData: null
      };
    }
  }
  
  // Handle array of images (up to 5 images)
  let urls = [];
  
  if (Array.isArray(imageData)) {
    urls = imageData;
  } else if (typeof imageData === 'string') {
    try {
      const parsed = JSON.parse(imageData);
      if (Array.isArray(parsed)) {
        urls = parsed;
      } else {
        urls = [imageData];
      }
    } catch {
      urls = [imageData];
    }
  }
  
  // Validate maximum 5 images
  if (urls.length > 5) {
    return {
      valid: false,
      message: 'Maksimal 5 gambar yang dapat diunggah',
      cleanData: null
    };
  }
  
  // Validate each URL
  const validUrls = urls.filter(url => {
    if (!url || typeof url !== 'string') return false;
    return isValidImageUrl(url);
  });
  
  if (validUrls.length === 0) {
    return {
      valid: false,
      message: 'Format gambar tidak valid. Gunakan URL gambar yang valid (bukan data URL/base64)',
      cleanData: null
    };
  }
  
  // Return as JSON string if multiple URLs, single string if one URL
  const cleanData = validUrls.length === 1 ? validUrls[0] : JSON.stringify(validUrls);
  
  return {
    valid: true,
    message: `${validUrls.length} gambar valid`,
    cleanData: cleanData
  };
};

/**
 * Middleware to clean image data in request body
 */
const cleanImageMiddleware = (req, res, next) => {
  if (req.body.gambar) {
    const validation = validateImageRequest(req.body.gambar);
    
    if (!validation.valid) {
      return res.status(400).json({
        sukses: false,
        pesan: validation.message
      });
    }
    
    req.body.gambar = validation.cleanData;
  }
  
  next();
};

module.exports = {
  isValidImageUrl,
  cleanImageData,
  parseImageData,
  formatProductWithImages,
  validateImageRequest,
  cleanImageMiddleware
};