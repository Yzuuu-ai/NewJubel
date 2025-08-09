import React from 'react';
import { useEthPrice } from '../hooks/useEthPrice';
import { ArrowPathIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline';

const EthPriceIndicator = ({ className = '', showFullInfo = false }) => {
  const { 
    ethToIdrRate, 
    formatIdrPrice, 
    isLoading, 
    error, 
    refreshPrice, 
    lastUpdate, 
    source,
    isStale 
  } = useEthPrice();

  if (error && !ethToIdrRate) {
    return (
      <div className={`flex items-center space-x-2 text-red-600 ${className}`}>
        <ExclamationTriangleIcon className="h-4 w-4" />
        <span className="text-sm">Price Error</span>
      </div>
    );
  }

  return (
    <div className={`flex items-center space-x-2 ${className}`}>
      {/* Price Display */}
      <div className="flex items-center space-x-1">
        <span className="text-sm font-medium text-gray-700">
          1 ETH =
        </span>
        <span className={`text-sm font-bold ${isStale ? 'text-orange-600' : 'text-green-600'}`}>
          {formatIdrPrice(ethToIdrRate)}
        </span>
      </div>

      {/* Refresh Button */}
      <button
        onClick={refreshPrice}
        disabled={isLoading}
        className={`p-1 rounded-full hover:bg-gray-100 transition-colors ${
          isLoading ? 'opacity-50 cursor-not-allowed' : 'hover:text-blue-600'
        }`}
        title="Refresh harga ETH"
      >
        <ArrowPathIcon className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
      </button>

      {/* Status Indicators */}
      {isStale && (
        <div className="w-2 h-2 bg-orange-400 rounded-full" title="Data harga sudah lama" />
      )}
      
      {!isStale && !isLoading && (
        <div className="w-2 h-2 bg-green-400 rounded-full" title="Data harga terbaru" />
      )}

      {/* Extended Info */}
      {showFullInfo && (
        <div className="text-xs text-gray-500">
          {source && <span>({source})</span>}
          {lastUpdate && (
            <span className="ml-1">
              {new Date(lastUpdate).toLocaleTimeString('id-ID', {
                hour: '2-digit',
                minute: '2-digit'
              })}
            </span>
          )}
        </div>
      )}
    </div>
  );
};

export default EthPriceIndicator;