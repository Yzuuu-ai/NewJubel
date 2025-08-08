import React from 'react';
import { PhotoIcon } from '@heroicons/react/24/outline';
import { parseProductImage } from '../utils/imageParser';

/**
 * ProductImageSimple - Komponen sederhana untuk menampilkan gambar produk
 * Mengatasi masalah JSON string array dari backend
 */
const ProductImageSimple = ({ 
  imageData, 
  alt = 'Product Image', 
  className = '',
  fallbackClassName = '',
  onError = null,
  ...props 
}) => {
  const imageUrl = parseProductImage(imageData);

  const handleError = (e) => {
    console.warn('Image failed to load:', e.target.src);
    e.target.src = '/placeholder-game.svg';
    e.target.onerror = null; // Prevent infinite loop
    if (onError) onError(e);
  };

  if (!imageUrl) {
    return (
      <div className={`flex items-center justify-center bg-gray-100 ${fallbackClassName || className}`}>
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
      {...props}
    />
  );
};

export default ProductImageSimple;