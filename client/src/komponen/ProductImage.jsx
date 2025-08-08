import React from 'react';
import { getProductImageUrl } from '../utils/imageHelper';
import { PhotoIcon } from '@heroicons/react/24/outline';

/**
 * ProductImage - Komponen untuk menampilkan gambar produk dengan handling JSON array
 * @param {Object} props
 * @param {string|Array} props.imageData - Data gambar dari produk (bisa JSON string atau array)
 * @param {string} props.alt - Alt text untuk gambar
 * @param {string} props.className - CSS classes
 * @param {string} props.fallbackSrc - URL fallback jika gambar gagal load
 * @param {Function} props.onError - Callback ketika gambar error
 * @param {Function} props.onLoad - Callback ketika gambar berhasil load
 */
const ProductImage = ({ 
  imageData, 
  alt = 'Product Image', 
  className = '', 
  fallbackSrc = '/placeholder-game.svg',
  onError = null,
  onLoad = null,
  ...props 
}) => {
  const imageUrl = getProductImageUrl(imageData);

  const handleError = (e) => {
    e.target.src = fallbackSrc;
    e.target.onerror = null; // Prevent infinite loop
    if (onError) onError(e);
  };

  if (!imageUrl) {
    return (
      <div className={`flex items-center justify-center bg-gray-100 ${className}`}>
        <PhotoIcon className="h-8 w-8 text-gray-400" />
      </div>
    );
  }

  return (
    <img
      src={imageUrl}
      alt={alt}
      className={className}
      onError={handleError}
      onLoad={onLoad}
      {...props}
    />
  );
};

export default ProductImage;