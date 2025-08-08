import React, { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import { getProductImageUrl, getAllProductImageUrls } from '../utils/imageHelper';
import { PhotoIcon, ChevronLeftIcon, ChevronRightIcon } from '@heroicons/react/24/outline';

/**
 * ProductImageGallery - Komponen untuk menampilkan galeri gambar produk
 * Mendukung hingga 5 gambar dengan thumbnail dan preview utama
 * Optimized untuk mencegah flickering dan re-rendering yang tidak perlu
 */
const ProductImageGallery = ({ 
  imageData, 
  productName = 'Produk', 
  className = '',
  showThumbnails = true,
  thumbnailCount = 5,
  aspectRatio = 'aspect-square',
  size = 'medium'
}) => {
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [imageLoadStates, setImageLoadStates] = useState({});
  const imageRefs = useRef({});
  
  // Memoize image URLs to prevent recalculation on every render
  const allImages = useMemo(() => {
    return getAllProductImageUrls(imageData);
  }, [imageData]);
  
  const mainImage = useMemo(() => {
    return allImages.length > 0 ? allImages[selectedImageIndex] : getProductImageUrl(imageData);
  }, [allImages, selectedImageIndex, imageData]);
  
  // Size configurations - memoized to prevent recreation
  const config = useMemo(() => {
    const sizeConfig = {
      small: {
        main: 'h-32',
        thumbnail: 'h-8 w-8',
        icon: 'h-8 w-8'
      },
      medium: {
        main: 'h-48',
        thumbnail: 'h-12 w-12',
        icon: 'h-12 w-12'
      },
      large: {
        main: 'h-96',
        thumbnail: 'h-16 w-16',
        icon: 'h-16 w-16'
      }
    };
    return sizeConfig[size] || sizeConfig.medium;
  }, [size]);
  
  // Memoize thumbnail slots to prevent recreation
  const thumbnailSlots = useMemo(() => {
    return Array.from({ length: thumbnailCount }, (_, index) => {
      const hasImage = index < allImages.length;
      const imageUrl = hasImage ? allImages[index] : null;
      const isSelected = index === selectedImageIndex && hasImage;
      
      return {
        index,
        hasImage,
        imageUrl,
        isSelected
      };
    });
  }, [allImages, selectedImageIndex, thumbnailCount]);
  
  // Reset selected index when images change
  useEffect(() => {
    if (selectedImageIndex >= allImages.length && allImages.length > 0) {
      setSelectedImageIndex(0);
    }
  }, [allImages.length, selectedImageIndex]);
  
  // Preload images to prevent flickering
  useEffect(() => {
    allImages.forEach((url, index) => {
      if (url && !imageLoadStates[url]) {
        const img = new Image();
        img.onload = () => {
          setImageLoadStates(prev => ({ ...prev, [url]: 'loaded' }));
        };
        img.onerror = () => {
          setImageLoadStates(prev => ({ ...prev, [url]: 'error' }));
        };
        setImageLoadStates(prev => ({ ...prev, [url]: 'loading' }));
        img.src = url;
      }
    });
  }, [allImages]);
  
  // Memoized event handlers to prevent recreation
  const handleThumbnailClick = useCallback((index) => {
    if (index !== selectedImageIndex) {
      setSelectedImageIndex(index);
    }
  }, [selectedImageIndex]);
  
  const handlePrevious = useCallback(() => {
    setSelectedImageIndex((prev) => 
      prev === 0 ? allImages.length - 1 : prev - 1
    );
  }, [allImages.length]);
  
  const handleNext = useCallback(() => {
    setSelectedImageIndex((prev) => 
      prev === allImages.length - 1 ? 0 : prev + 1
    );
  }, [allImages.length]);
  
  // Optimized image error handler
  const handleImageError = useCallback((e, isMainImage = false) => {
    e.target.src = '/placeholder-game.svg';
    e.target.onerror = null; // Prevent infinite loop
    
    if (isMainImage) {
      console.warn('Main image failed to load:', e.target.src);
    }
  }, []);
  
  return (
    <div className={`space-y-3 ${className}`}>
      {/* Main Image Display */}
      <div className={`relative ${config.main} ${aspectRatio} bg-gray-100 rounded-lg overflow-hidden group`}>
        {mainImage ? (
          <>
            {/* Loading placeholder */}
            {imageLoadStates[mainImage] === 'loading' && (
              <div className="absolute inset-0 flex items-center justify-center bg-gray-100">
                <div className="animate-pulse">
                  <PhotoIcon className={`${config.icon} text-gray-300`} />
                </div>
              </div>
            )}
            
            <img
              ref={el => imageRefs.current[`main-${selectedImageIndex}`] = el}
              src={mainImage}
              alt={`${productName} - Gambar ${selectedImageIndex + 1}`}
              className={`w-full h-full object-cover transition-all duration-300 group-hover:scale-105 ${
                imageLoadStates[mainImage] === 'loaded' ? 'opacity-100' : 'opacity-0'
              }`}
              onLoad={() => {
                setImageLoadStates(prev => ({ ...prev, [mainImage]: 'loaded' }));
              }}
              onError={(e) => handleImageError(e, true)}
              loading="eager" // Load main image immediately
            />
            
            {/* Navigation arrows for multiple images */}
            {allImages.length > 1 && (
              <>
                <button
                  onClick={handlePrevious}
                  className="absolute left-2 top-1/2 transform -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-200 z-10"
                  aria-label="Gambar sebelumnya"
                  type="button"
                >
                  <ChevronLeftIcon className="h-4 w-4" />
                </button>
                <button
                  onClick={handleNext}
                  className="absolute right-2 top-1/2 transform -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-200 z-10"
                  aria-label="Gambar selanjutnya"
                  type="button"
                >
                  <ChevronRightIcon className="h-4 w-4" />
                </button>
                
                {/* Image counter */}
                <div className="absolute bottom-2 right-2 bg-black/50 text-white text-xs px-2 py-1 rounded z-10">
                  {selectedImageIndex + 1} / {allImages.length}
                </div>
              </>
            )}
          </>
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <div className="text-center">
              <PhotoIcon className={`${config.icon} text-gray-300 mx-auto mb-2`} />
              <p className="text-gray-500 text-sm">Tidak ada gambar</p>
            </div>
          </div>
        )}
      </div>
      
      {/* Thumbnail Gallery - Only show actual images */}
      {showThumbnails && allImages.length > 1 && (
        <div className="flex flex-wrap gap-2">
          {allImages.map((imageUrl, index) => (
            <div
              key={`thumb-${index}`}
              className={`
                ${config.thumbnail} ${aspectRatio} rounded-md overflow-hidden border-2 transition-all duration-200 cursor-pointer
                ${index === selectedImageIndex
                  ? 'border-blue-500 ring-2 ring-blue-200'
                  : 'border-gray-200 hover:border-gray-300'
                }
              `}
              onClick={() => handleThumbnailClick(index)}
            >
              {/* Thumbnail loading state */}
              {imageLoadStates[imageUrl] === 'loading' && (
                <div className="w-full h-full flex items-center justify-center bg-gray-100">
                  <div className="animate-pulse">
                    <PhotoIcon className="h-3 w-3 text-gray-300" />
                  </div>
                </div>
              )}
              
              <img
                ref={el => imageRefs.current[`thumb-${index}`] = el}
                src={imageUrl}
                alt={`${productName} - Thumbnail ${index + 1}`}
                className={`w-full h-full object-cover transition-opacity duration-200 ${
                  imageLoadStates[imageUrl] === 'loaded' ? 'opacity-100' : 'opacity-0'
                }`}
                onLoad={() => {
                  setImageLoadStates(prev => ({ ...prev, [imageUrl]: 'loaded' }));
                }}
                onError={(e) => handleImageError(e)}
                loading="lazy" // Lazy load thumbnails
              />
            </div>
          ))}
        </div>
      )}
      
      {/* Image count indicator */}
      {allImages.length > 0 && (
        <div className="text-center">
          <span className="text-xs text-gray-500">
            {allImages.length} dari {thumbnailCount} gambar
          </span>
        </div>
      )}
    </div>
  );
};

/**
 * ProductImageCard - Komponen sederhana untuk menampilkan gambar produk dalam card
 * Optimized untuk mencegah flickering
 */
export const ProductImageCard = React.memo(({ 
  imageData, 
  productName = 'Produk',
  className = '',
  size = 'medium',
  showImageCount = true
}) => {
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageError, setImageError] = useState(false);
  
  const allImages = useMemo(() => getAllProductImageUrls(imageData), [imageData]);
  const mainImage = useMemo(() => getProductImageUrl(imageData), [imageData]);
  
  const sizeConfig = useMemo(() => ({
    small: 'h-32',
    medium: 'h-48', 
    large: 'h-64'
  }), []);
  
  const height = sizeConfig[size] || sizeConfig.medium;
  
  const handleImageLoad = useCallback(() => {
    setImageLoaded(true);
    setImageError(false);
  }, []);
  
  const handleImageError = useCallback((e) => {
    setImageError(true);
    setImageLoaded(false);
    e.target.src = '/placeholder-game.svg';
    e.target.onerror = null;
  }, []);
  
  // Reset states when image changes
  useEffect(() => {
    setImageLoaded(false);
    setImageError(false);
  }, [mainImage]);
  
  return (
    <div className={`relative ${height} bg-gray-100 rounded-lg overflow-hidden ${className}`}>
      {mainImage ? (
        <>
          {/* Loading placeholder */}
          {!imageLoaded && !imageError && (
            <div className="absolute inset-0 flex items-center justify-center bg-gray-100">
              <div className="animate-pulse">
                <PhotoIcon className="h-12 w-12 text-gray-300" />
              </div>
            </div>
          )}
          
          <img
            src={mainImage}
            alt={productName}
            className={`w-full h-full object-cover transition-opacity duration-300 ${
              imageLoaded ? 'opacity-100' : 'opacity-0'
            }`}
            onLoad={handleImageLoad}
            onError={handleImageError}
            loading="lazy"
          />
          
          {/* Image count badge */}
          {showImageCount && allImages.length > 1 && imageLoaded && (
            <div className="absolute top-2 right-2 bg-black/70 text-white text-xs px-2 py-1 rounded-full">
              +{allImages.length - 1} foto
            </div>
          )}
        </>
      ) : (
        <div className="w-full h-full flex items-center justify-center">
          <div className="text-center">
            <PhotoIcon className="h-12 w-12 text-gray-300 mx-auto mb-2" />
            <p className="text-gray-500 text-sm">Tidak ada gambar</p>
          </div>
        </div>
      )}
    </div>
  );
});

ProductImageCard.displayName = 'ProductImageCard';

export default ProductImageGallery;