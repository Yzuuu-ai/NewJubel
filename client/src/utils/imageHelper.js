/**
 * Image Helper Utilities
 * Handles product image data parsing and validation
 * Optimized with caching to prevent flickering
 */

// Cache untuk menyimpan hasil parsing agar tidak perlu parse ulang
const imageCache = new Map();
const urlValidationCache = new Map();

/**
 * Get the first/main image URL from product image data
 * @param {string|Array} imageData - Image data from product
 * @returns {string|null} - First image URL or null
 */
export const getProductImageUrl = (imageData) => {
  if (!imageData) return null;
  
  // Check cache first
  const cacheKey = `main_${JSON.stringify(imageData)}`;
  if (imageCache.has(cacheKey)) {
    return imageCache.get(cacheKey);
  }
  
  let result = null;
  
  try {
    // If it's already a string URL, return it
    if (typeof imageData === 'string' && !imageData.startsWith('[')) {
      result = imageData;
    }
    // If it's a JSON string, parse it
    else if (typeof imageData === 'string' && imageData.startsWith('[')) {
      const parsed = JSON.parse(imageData);
      if (Array.isArray(parsed) && parsed.length > 0) {
        result = parsed[0];
      }
    }
    // If it's already an array
    else if (Array.isArray(imageData) && imageData.length > 0) {
      result = imageData[0];
    }
  } catch (error) {
    console.warn('Error parsing image data:', error);
    result = null;
  }
  
  // Cache the result
  imageCache.set(cacheKey, result);
  return result;
};

/**
 * Get all image URLs from product image data
 * @param {string|Array} imageData - Image data from product
 * @returns {Array} - Array of image URLs (up to 5)
 */
export const getAllProductImageUrls = (imageData) => {
  if (!imageData) return [];
  
  // Check cache first
  const cacheKey = `all_${JSON.stringify(imageData)}`;
  if (imageCache.has(cacheKey)) {
    return imageCache.get(cacheKey);
  }
  
  let result = [];
  
  try {
    // If it's already an array
    if (Array.isArray(imageData)) {
      result = imageData.filter(url => {
        if (!url || typeof url !== 'string') return false;
        if (url.trim() === '') return false;
        if (url.includes('placeholder')) return false;
        if (url.startsWith('data:image/') && url.length < 100) return false;
        return true;
      }).slice(0, 5);
    }
    // If it's a JSON string, parse it
    else if (typeof imageData === 'string' && imageData.startsWith('[')) {
      const parsed = JSON.parse(imageData);
      if (Array.isArray(parsed)) {
        result = parsed.filter(url => {
          if (!url || typeof url !== 'string') return false;
          if (url.trim() === '') return false;
          if (url.includes('placeholder')) return false;
          if (url.startsWith('data:image/') && url.length < 100) return false;
          return true;
        }).slice(0, 5);
      }
    }
    // If it's a single string URL
    else if (typeof imageData === 'string' && imageData.trim() && !imageData.includes('placeholder')) {
      result = [imageData];
    }
  } catch (error) {
    console.warn('Error parsing image data:', error);
    result = [];
  }
  
  // Cache the result
  imageCache.set(cacheKey, result);
  return result;
};

/**
 * Validate if URL is a valid image URL (not data URL)
 * @param {string} url - URL to validate
 * @returns {boolean} - True if valid image URL
 */
export const isValidImageUrl = (url) => {
  if (!url || typeof url !== 'string') return false;
  
  // Check cache first
  if (urlValidationCache.has(url)) {
    return urlValidationCache.get(url);
  }
  
  let isValid = false;
  
  // Reject data URLs (base64)
  if (url.startsWith('data:image/')) {
    isValid = false;
  }
  // Accept HTTP/HTTPS URLs
  else if (url.startsWith('http://') || url.startsWith('https://')) {
    isValid = true;
  }
  // Accept relative URLs
  else if (url.startsWith('/')) {
    isValid = true;
  }
  // Accept Cloudinary URLs
  else if (url.includes('cloudinary.com') || url.includes('res.cloudinary.com')) {
    isValid = true;
  }
  
  // Cache the result
  urlValidationCache.set(url, isValid);
  return isValid;
};

/**
 * Clean and validate image data
 * @param {string|Array} imageData - Image data to clean
 * @returns {Array} - Array of valid image URLs
 */
export const cleanImageData = (imageData) => {
  const allUrls = getAllProductImageUrls(imageData);
  return allUrls.filter(url => isValidImageUrl(url));
};

/**
 * Format image data for storage (convert array to JSON string if needed)
 * @param {Array} imageUrls - Array of image URLs
 * @returns {string|null} - Formatted data for storage
 */
export const formatImageDataForStorage = (imageUrls) => {
  if (!imageUrls || !Array.isArray(imageUrls) || imageUrls.length === 0) {
    return null;
  }
  
  const validUrls = imageUrls.filter(url => isValidImageUrl(url));
  
  if (validUrls.length === 0) {
    return null;
  }
  
  // If only one image, store as string for backward compatibility
  if (validUrls.length === 1) {
    return validUrls[0];
  }
  
  // If multiple images, store as JSON string
  return JSON.stringify(validUrls);
};

/**
 * Get image count from image data
 * @param {string|Array} imageData - Image data from product
 * @returns {number} - Number of images
 */
export const getImageCount = (imageData) => {
  return getAllProductImageUrls(imageData).length;
};

/**
 * Check if product has multiple images
 * @param {string|Array} imageData - Image data from product
 * @returns {boolean} - True if has multiple images
 */
export const hasMultipleImages = (imageData) => {
  return getImageCount(imageData) > 1;
};

/**
 * Get placeholder image URL
 * @returns {string} - Placeholder image URL
 */
export const getPlaceholderImageUrl = () => {
  return '/placeholder-game.svg';
};

/**
 * Handle image error by setting placeholder
 * @param {Event} event - Image error event
 */
export const handleImageError = (event) => {
  event.target.src = getPlaceholderImageUrl();
  event.target.onerror = null; // Prevent infinite loop
};

/**
 * Create image error handler function
 * @param {string} fallbackUrl - Optional fallback URL
 * @returns {Function} - Error handler function
 */
export const createImageErrorHandler = (fallbackUrl = null) => {
  return (event) => {
    event.target.src = fallbackUrl || getPlaceholderImageUrl();
    event.target.onerror = null; // Prevent infinite loop
  };
};

/**
 * Preload images for better performance
 * @param {Array} imageUrls - Array of image URLs to preload
 * @returns {Promise} - Promise that resolves when all images are loaded
 */
export const preloadImages = (imageUrls) => {
  if (!Array.isArray(imageUrls)) return Promise.resolve();
  
  const validUrls = imageUrls.filter(url => isValidImageUrl(url));
  
  const loadPromises = validUrls.map(url => {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => resolve({ url, status: 'loaded' });
      img.onerror = () => resolve({ url, status: 'error' });
      img.src = url;
    });
  });
  
  return Promise.all(loadPromises);
};

/**
 * Create optimized image component props
 * @param {string} imageUrl - Image URL
 * @param {string} alt - Alt text
 * @param {Function} onLoad - Load callback
 * @param {Function} onError - Error callback
 * @returns {Object} - Props object for img element
 */
export const createOptimizedImageProps = (imageUrl, alt = '', onLoad = null, onError = null) => {
  return {
    src: imageUrl,
    alt,
    loading: 'lazy',
    decoding: 'async',
    onLoad: onLoad || (() => {}),
    onError: onError || createImageErrorHandler(),
    style: {
      transition: 'opacity 0.3s ease-in-out'
    }
  };
};

/**
 * Clear image cache (useful for memory management)
 */
export const clearImageCache = () => {
  imageCache.clear();
  urlValidationCache.clear();
};

/**
 * Get cache statistics
 * @returns {Object} - Cache statistics
 */
export const getCacheStats = () => {
  return {
    imageCache: imageCache.size,
    urlValidationCache: urlValidationCache.size
  };
};

// Auto-clear cache when it gets too large (prevent memory leaks)
const MAX_CACHE_SIZE = 1000;

const checkCacheSize = () => {
  if (imageCache.size > MAX_CACHE_SIZE) {
    // Clear oldest entries (simple LRU-like behavior)
    const entries = Array.from(imageCache.entries());
    const toDelete = entries.slice(0, Math.floor(MAX_CACHE_SIZE / 2));
    toDelete.forEach(([key]) => imageCache.delete(key));
  }
  
  if (urlValidationCache.size > MAX_CACHE_SIZE) {
    const entries = Array.from(urlValidationCache.entries());
    const toDelete = entries.slice(0, Math.floor(MAX_CACHE_SIZE / 2));
    toDelete.forEach(([key]) => urlValidationCache.delete(key));
  }
};

// Check cache size periodically
setInterval(checkCacheSize, 60000); // Every minute

export default {
  getProductImageUrl,
  getAllProductImageUrls,
  isValidImageUrl,
  cleanImageData,
  formatImageDataForStorage,
  getImageCount,
  hasMultipleImages,
  getPlaceholderImageUrl,
  handleImageError,
  createImageErrorHandler,
  preloadImages,
  createOptimizedImageProps,
  clearImageCache,
  getCacheStats
};