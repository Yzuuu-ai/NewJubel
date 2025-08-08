/**
 * Image utility functions to handle image URLs and data URLs
 */

/**
 * Check if a URL is a base64 data URL
 * @param {string} url - The URL to check
 * @returns {boolean} - True if it's a data URL
 */
export const isDataURL = (url) => {
  if (!url || typeof url !== 'string') return false;
  return url.startsWith('data:image/');
};

/**
 * Check if a URL is a valid HTTP/HTTPS URL
 * @param {string} url - The URL to check
 * @returns {boolean} - True if it's a valid HTTP URL
 */
export const isValidHttpURL = (url) => {
  if (!url || typeof url !== 'string') return false;
  try {
    const urlObj = new URL(url);
    return urlObj.protocol === 'http:' || urlObj.protocol === 'https:';
  } catch {
    return false;
  }
};

/**
 * Validate and sanitize image URL
 * @param {string} url - The image URL to validate
 * @param {string} fallback - Fallback URL if invalid (default: '/placeholder-game.svg')
 * @returns {string} - Valid image URL or fallback
 */
export const validateImageURL = (url, fallback = '/placeholder-game.svg') => {
  // If no URL provided, return fallback
  if (!url || typeof url !== 'string') {
    console.warn('⚠️ No image URL provided, using fallback');
    return fallback;
  }

  // If it's a data URL, log warning and return fallback
  if (isDataURL(url)) {
    console.warn('⚠️ Data URL detected, using fallback:', url.substring(0, 50) + '...');
    return fallback;
  }

  // If it's a valid HTTP/HTTPS URL (Cloudinary, etc.), return it
  if (isValidHttpURL(url)) {
    return url;
  }

  // If it's a relative path (starts with /), return it
  if (url.startsWith('/')) {
    return url;
  }

  // If it looks like a Cloudinary URL or other valid image URL, return it
  if (url.includes('cloudinary.com') || url.includes('res.cloudinary.com')) {
    return url;
  }

  // For any other case, log warning and return the original URL (let browser handle it)
  console.warn('⚠️ Unusual image URL format, attempting to load:', url);
  return url; // Return original URL instead of fallback
};

/**
 * Convert data URL to File object (for uploading)
 * @param {string} dataURL - The data URL to convert
 * @param {string} filename - The filename for the file
 * @returns {File|null} - File object or null if invalid
 */
export const dataURLToFile = (dataURL, filename = 'image.jpg') => {
  if (!isDataURL(dataURL)) {
    return null;
  }

  try {
    const arr = dataURL.split(',');
    const mime = arr[0].match(/:(.*?);/)[1];
    const bstr = atob(arr[1]);
    let n = bstr.length;
    const u8arr = new Uint8Array(n);
    
    while (n--) {
      u8arr[n] = bstr.charCodeAt(n);
    }
    
    return new File([u8arr], filename, { type: mime });
  } catch (error) {
    console.error('Error converting data URL to file:', error);
    return null;
  }
};

/**
 * Clean up image URLs in an array, removing data URLs
 * @param {string[]} urls - Array of image URLs
 * @returns {string[]} - Cleaned array with only valid URLs
 */
export const cleanImageURLs = (urls) => {
  if (!Array.isArray(urls)) {
    return [];
  }

  return urls.filter(url => {
    if (isDataURL(url)) {
      console.warn('⚠️ Removing data URL from array:', url.substring(0, 50) + '...');
      return false;
    }
    return true;
  });
};

/**
 * Handle image load error by setting fallback
 * @param {Event} event - The error event
 * @param {string} fallback - Fallback image URL
 */
export const handleImageError = (event, fallback = '/placeholder-game.svg') => {
  const img = event.target;
  if (img.src !== fallback) {
    console.warn('⚠️ Image failed to load, using fallback:', img.src);
    img.src = fallback;
  }
};

/**
 * Create an image error handler function
 * @param {string} fallback - Fallback image URL
 * @returns {Function} - Error handler function
 */
export const createImageErrorHandler = (fallback = '/placeholder-game.svg') => {
  return (event) => handleImageError(event, fallback);
};

/**
 * Preload an image and return a promise
 * @param {string} url - Image URL to preload
 * @returns {Promise<string>} - Promise that resolves with the URL or rejects
 */
export const preloadImage = (url) => {
  return new Promise((resolve, reject) => {
    if (!url || isDataURL(url)) {
      reject(new Error('Invalid image URL'));
      return;
    }

    const img = new Image();
    img.onload = () => resolve(url);
    img.onerror = () => reject(new Error(`Failed to load image: ${url}`));
    img.src = url;
  });
};

export default {
  isDataURL,
  isValidHttpURL,
  validateImageURL,
  dataURLToFile,
  cleanImageURLs,
  handleImageError,
  createImageErrorHandler,
  preloadImage
};