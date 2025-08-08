import React, { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import { PhotoIcon, XMarkIcon, ChevronLeftIcon, ChevronRightIcon } from '@heroicons/react/24/outline';

/**
 * EvidenceImageGallery - Komponen untuk menampilkan galeri gambar bukti sengketa
 * Hanya menampilkan grid 5 thumbnail tanpa gambar utama
 * Modal viewer seperti produk marketplace
 */
const EvidenceImageGallery = ({ 
  evidenceData, 
  label = 'Bukti', 
  className = '',
  thumbnailCount = 5,
  aspectRatio = 'aspect-square',
  size = 'medium',
  colorTheme = 'red' // red, green, blue, etc.
}) => {
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [imageLoadStates, setImageLoadStates] = useState({});
  const [showModal, setShowModal] = useState(false);
  const imageRefs = useRef({});
  
  // Parse evidence URLs from comma-separated string
  const allImages = useMemo(() => {
    if (!evidenceData) return [];
    if (typeof evidenceData !== 'string') return [];
    return evidenceData.split(',')
      .map(url => url.trim())
      .filter(url => url && url.length > 0);
  }, [evidenceData]);
  
  // Size configurations
  const config = useMemo(() => {
    const sizeConfig = {
      small: {
        thumbnail: 'h-16 w-16',
        icon: 'h-8 w-8'
      },
      medium: {
        thumbnail: 'h-20 w-20',
        icon: 'h-10 w-10'
      },
      large: {
        thumbnail: 'h-24 w-24',
        icon: 'h-12 w-12'
      }
    };
    return sizeConfig[size] || sizeConfig.medium;
  }, [size]);
  
  // Color theme configurations
  const colorConfig = useMemo(() => {
    const themes = {
      red: {
        border: 'border-red-500',
        ring: 'ring-red-200',
        bg: 'bg-red-50',
        text: 'text-red-600'
      },
      green: {
        border: 'border-green-500',
        ring: 'ring-green-200',
        bg: 'bg-green-50',
        text: 'text-green-600'
      },
      blue: {
        border: 'border-blue-500',
        ring: 'ring-blue-200',
        bg: 'bg-blue-50',
        text: 'text-blue-600'
      },
      yellow: {
        border: 'border-yellow-500',
        ring: 'ring-yellow-200',
        bg: 'bg-yellow-50',
        text: 'text-yellow-600'
      }
    };
    return themes[colorTheme] || themes.red;
  }, [colorTheme]);
  
  // Memoize thumbnail slots
  const thumbnailSlots = useMemo(() => {
    return Array.from({ length: thumbnailCount }, (_, index) => {
      const hasImage = index < allImages.length;
      const imageUrl = hasImage ? allImages[index] : null;
      
      return {
        index,
        hasImage,
        imageUrl
      };
    });
  }, [allImages, thumbnailCount]);
  
  // Preload images
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
  
  // Event handlers
  const handleThumbnailClick = useCallback((index) => {
    setSelectedImageIndex(index);
    setShowModal(true);
  }, []);
  
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
  
  const handleImageError = useCallback((e) => {
    e.target.src = '/placeholder-image.svg';
    e.target.onerror = null;
  }, []);
  
  const handleCloseModal = useCallback(() => {
    setShowModal(false);
  }, []);
  
  // Keyboard navigation
  useEffect(() => {
    if (!showModal) return;
    
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        handleCloseModal();
      } else if (e.key === 'ArrowLeft') {
        handlePrevious();
      } else if (e.key === 'ArrowRight') {
        handleNext();
      }
    };
    
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [showModal, handleCloseModal, handlePrevious, handleNext]);
  
  // If no images, return empty state
  if (allImages.length === 0) {
    return (
      <div className={`flex items-center justify-center p-4 ${colorConfig.bg} rounded-lg ${className}`}>
        <div className="text-center">
          <PhotoIcon className={`${config.icon} ${colorConfig.text} mx-auto mb-2`} />
          <p className={`text-sm ${colorConfig.text}`}>Tidak ada {label.toLowerCase()}</p>
        </div>
      </div>
    );
  }
  
  return (
    <>
      {/* Grid Thumbnail Only */}
      <div className={`space-y-3 ${className}`}>
        <div className="grid grid-cols-5 gap-2">
          {thumbnailSlots.map((slot) => (
            <div
              key={`thumb-${slot.index}`}
              className={`
                ${config.thumbnail} ${aspectRatio} rounded-md overflow-hidden border-2 transition-all duration-200 cursor-pointer
                ${slot.hasImage 
                  ? 'border-gray-200 hover:border-gray-300 hover:shadow-md transform hover:scale-105'
                  : `border-dashed border-gray-200 ${colorConfig.bg}`
                }
              `}
              onClick={() => slot.hasImage && handleThumbnailClick(slot.index)}
            >
              {slot.hasImage ? (
                <>
                  {/* Thumbnail loading state */}
                  {imageLoadStates[slot.imageUrl] === 'loading' && (
                    <div className="w-full h-full flex items-center justify-center bg-gray-100">
                      <div className="animate-pulse">
                        <PhotoIcon className="h-4 w-4 text-gray-300" />
                      </div>
                    </div>
                  )}
                  
                  <img
                    ref={el => imageRefs.current[`thumb-${slot.index}`] = el}
                    src={slot.imageUrl}
                    alt={`${label} - Thumbnail ${slot.index + 1}`}
                    className={`w-full h-full object-cover transition-opacity duration-200 ${
                      imageLoadStates[slot.imageUrl] === 'loaded' ? 'opacity-100' : 'opacity-0'
                    }`}
                    onLoad={() => {
                      setImageLoadStates(prev => ({ ...prev, [slot.imageUrl]: 'loaded' }));
                    }}
                    onError={handleImageError}
                    loading="lazy"
                  />
                  
                  {/* Hover overlay */}
                  <div className="absolute inset-0 bg-black bg-opacity-0 hover:bg-opacity-20 transition-all duration-200 flex items-center justify-center">
                    <div className="opacity-0 hover:opacity-100 transition-opacity duration-200">
                      <PhotoIcon className="h-6 w-6 text-white" />
                    </div>
                  </div>
                </>
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <PhotoIcon className="h-6 w-6 text-gray-300" />
                </div>
              )}
            </div>
          ))}
        </div>
        
        {/* Image count and info */}
        <div className="flex justify-between items-center">
          <span className={`text-xs ${colorConfig.text}`}>
            {allImages.length} dari {thumbnailCount} gambar {label.toLowerCase()}
          </span>
          
          {allImages.length > 0 && (
            <span className="text-xs text-gray-500">
              Klik gambar untuk memperbesar
            </span>
          )}
        </div>
      </div>

      {/* Modal Image Viewer */}
      {showModal && allImages.length > 0 && (
        <div className="fixed inset-0 z-[9999] bg-black bg-opacity-90 flex items-center justify-center p-4">
          {/* Close button */}
          <button
            onClick={handleCloseModal}
            className="absolute top-4 right-4 z-10 p-2 bg-black bg-opacity-50 text-white rounded-full hover:bg-opacity-70 transition-colors"
          >
            <XMarkIcon className="h-6 w-6" />
          </button>
          
          {/* Image counter */}
          <div className="absolute top-4 left-4 z-10 bg-black bg-opacity-50 text-white px-3 py-1 rounded-full text-sm">
            {selectedImageIndex + 1} / {allImages.length}
          </div>
          
          {/* Main image */}
          <div className="relative max-w-4xl max-h-[80vh] w-full h-full flex items-center justify-center">
            <img
              src={allImages[selectedImageIndex]}
              alt={`${label} ${selectedImageIndex + 1}`}
              className="max-w-full max-h-full object-contain rounded-lg shadow-2xl"
              onError={handleImageError}
            />
            
            {/* Navigation arrows */}
            {allImages.length > 1 && (
              <>
                <button
                  onClick={handlePrevious}
                  className="absolute left-4 top-1/2 transform -translate-y-1/2 p-3 bg-black bg-opacity-50 text-white rounded-full hover:bg-opacity-70 transition-colors"
                >
                  <ChevronLeftIcon className="h-6 w-6" />
                </button>
                <button
                  onClick={handleNext}
                  className="absolute right-4 top-1/2 transform -translate-y-1/2 p-3 bg-black bg-opacity-50 text-white rounded-full hover:bg-opacity-70 transition-colors"
                >
                  <ChevronRightIcon className="h-6 w-6" />
                </button>
              </>
            )}
          </div>
          
          {/* Thumbnail navigation */}
          {allImages.length > 1 && (
            <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex space-x-2 bg-black bg-opacity-50 p-2 rounded-lg">
              {allImages.map((url, index) => (
                <button
                  key={index}
                  onClick={() => setSelectedImageIndex(index)}
                  className={`w-12 h-12 rounded overflow-hidden border-2 transition-all ${
                    index === selectedImageIndex 
                      ? `${colorConfig.border} opacity-100` 
                      : 'border-gray-400 opacity-60 hover:opacity-80'
                  }`}
                >
                  <img
                    src={url}
                    alt={`${label} ${index + 1}`}
                    className="w-full h-full object-cover"
                    onError={handleImageError}
                  />
                </button>
              ))}
            </div>
          )}
          
          {/* Click outside to close */}
          <div 
            className="absolute inset-0 -z-10" 
            onClick={handleCloseModal}
          />
        </div>
      )}
    </>
  );
};

/**
 * EvidenceImageCard - Komponen sederhana untuk menampilkan bukti dalam card
 */
export const EvidenceImageCard = React.memo(({ 
  evidenceData, 
  label = 'Bukti',
  className = '',
  size = 'medium',
  colorTheme = 'red',
  showImageCount = true
}) => {
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageError, setImageError] = useState(false);
  const [showModal, setShowModal] = useState(false);
  
  const allImages = useMemo(() => {
    if (!evidenceData) return [];
    if (typeof evidenceData !== 'string') return [];
    return evidenceData.split(',')
      .map(url => url.trim())
      .filter(url => url && url.length > 0);
  }, [evidenceData]);
  
  const mainImage = useMemo(() => {
    return allImages.length > 0 ? allImages[0] : null;
  }, [allImages]);
  
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
    e.target.src = '/placeholder-image.svg';
    e.target.onerror = null;
  }, []);
  
  useEffect(() => {
    setImageLoaded(false);
    setImageError(false);
  }, [mainImage]);
  
  if (!mainImage) {
    return (
      <div className={`${height} bg-gray-100 rounded-lg flex items-center justify-center ${className}`}>
        <div className="text-center">
          <PhotoIcon className="h-12 w-12 text-gray-300 mx-auto mb-2" />
          <p className="text-gray-500 text-sm">Tidak ada {label.toLowerCase()}</p>
        </div>
      </div>
    );
  }
  
  return (
    <>
      <div 
        className={`relative ${height} bg-gray-100 rounded-lg overflow-hidden cursor-pointer ${className}`}
        onClick={() => setShowModal(true)}
      >
        {!imageLoaded && !imageError && (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-100">
            <div className="animate-pulse">
              <PhotoIcon className="h-12 w-12 text-gray-300" />
            </div>
          </div>
        )}
        
        <img
          src={mainImage}
          alt={label}
          className={`w-full h-full object-cover transition-opacity duration-300 ${
            imageLoaded ? 'opacity-100' : 'opacity-0'
          }`}
          onLoad={handleImageLoad}
          onError={handleImageError}
          loading="lazy"
        />
        
        {showImageCount && allImages.length > 1 && imageLoaded && (
          <div className="absolute top-2 right-2 bg-black/70 text-white text-xs px-2 py-1 rounded-full">
            +{allImages.length - 1} foto
          </div>
        )}
        
        <div className="absolute inset-0 bg-black/0 hover:bg-black/10 transition-colors duration-200 flex items-center justify-center">
          <div className="opacity-0 hover:opacity-100 transition-opacity duration-200 text-white text-sm font-medium">
            Klik untuk memperbesar
          </div>
        </div>
      </div>
      
      {/* Modal for card */}
      {showModal && (
        <EvidenceImageGallery
          evidenceData={evidenceData}
          label={label}
          colorTheme={colorTheme}
        />
      )}
    </>
  );
});

EvidenceImageCard.displayName = 'EvidenceImageCard';

export default EvidenceImageGallery;