import React from 'react';
import { PhotoIcon } from '@heroicons/react/24/outline';
import { debugProductImage, getFirstImageUrl } from '../utils/debugHelper';

/**
 * ProductImageDebug - Komponen untuk debug dan display gambar produk
 */
const ProductImageDebug = ({ 
  produk, 
  className = '', 
  alt = 'Product Image',
  showDebug = true,
  ...props 
}) => {
  // Debug logging jika diperlukan
  if (showDebug) {
    debugProductImage(produk, 'ProductImageDebug');
  }

  const imageUrl = getFirstImageUrl(produk.gambar);

  const handleError = (e) => {
    console.warn('🖼️ Image failed to load:', e.target.src);
    e.target.src = '/placeholder-game.svg';
    e.target.onerror = null; // Prevent infinite loop
  };

  if (!imageUrl) {
    return (
      <div className={`flex items-center justify-center bg-gray-100 ${className}`}>
        <PhotoIcon className="h-8 w-8 text-gray-400" />
        {showDebug && (
          <div className="absolute top-0 left-0 bg-red-500 text-white text-xs px-1">
            NO IMG
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="relative">
      <img
        src={imageUrl}
        alt={alt || produk.judulProduk}
        className={className}
        onError={handleError}
        {...props}
      />
      {showDebug && (
        <div className="absolute top-0 right-0 bg-green-500 text-white text-xs px-1">
          IMG OK
        </div>
      )}
    </div>
  );
};

export default ProductImageDebug;