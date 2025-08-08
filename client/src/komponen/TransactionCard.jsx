import React from 'react';
import { 
  ClockIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  BanknotesIcon,
  ShoppingBagIcon,
  DocumentTextIcon,
  PaperAirplaneIcon,
  EyeIcon
} from '@heroicons/react/24/outline';

const TransactionCard = ({ 
  transaksi, 
  mode = 'pembelian', // 'pembelian' atau 'penjualan'
  onLihatAkun,
  onKirimAkun,
  onKonfirmasi,
  onSengketa,
  onDetail,
  onPayment,
  showPaymentTimer = false,
  PaymentTimerComponent
}) => {
  
  // Format date
  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('id-ID', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Format currency
  const formatCurrency = (amount) => {
    if (!amount) return 'Rp 0';
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  // Get status badge
  const getStatusBadge = (status) => {
    const statusConfig = {
      'MENUNGGU_PEMBAYARAN': { 
        color: 'bg-amber-50 text-amber-700 border-amber-200', 
        text: 'Menunggu Pembayaran',
        icon: ClockIcon
      },
      'DIBAYAR_SMARTCONTRACT': { 
        color: 'bg-blue-50 text-blue-700 border-blue-200', 
        text: 'Pembayaran Berhasil',
        icon: BanknotesIcon
      },
      'DIKIRIM': { 
        color: 'bg-purple-50 text-purple-700 border-purple-200', 
        text: 'Akun Dikirim',
        icon: ShoppingBagIcon
      },
      'DIKONFIRMASI_PEMBELI': { 
        color: 'bg-emerald-50 text-emerald-700 border-emerald-200', 
        text: 'Dikonfirmasi',
        icon: CheckCircleIcon
      },
      'SELESAI': { 
        color: 'bg-green-50 text-green-700 border-green-200', 
        text: 'Selesai',
        icon: CheckCircleIcon
      },
      'SENGKETA': { 
        color: 'bg-red-50 text-red-700 border-red-200', 
        text: 'Sengketa',
        icon: ExclamationTriangleIcon
      },
      'REFUNDED': { 
        color: 'bg-blue-50 text-blue-700 border-blue-200', 
        text: 'Refund',
        icon: CheckCircleIcon
      }
    };
    
    const config = statusConfig[status] || { 
      color: 'bg-gray-50 text-gray-700 border-gray-200', 
      text: status,
      icon: ClockIcon
    };
    
    return (
      <span className={`inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium border ${config.color}`}>
        <config.icon className="h-3 w-3 mr-1" />
        {config.text}
      </span>
    );
  };

  const hasAccountData = transaksi.username || transaksi.password || transaksi.email || transaksi.loginId;
  const validStatusForAccount = ['DIKIRIM', 'DIKONFIRMASI_PEMBELI', 'SELESAI'].includes(transaksi.status);

  return (
    <div className="bg-white rounded-lg border border-gray-200 hover:border-gray-300 hover:shadow-sm transition-all duration-200">
      <div className="p-4">
        <div className="flex items-center space-x-4">
          {/* Product Image */}
          <div className="flex-shrink-0">
            <img
              src={transaksi.produk?.gambar || '/placeholder-game.jpg'}
              alt={transaksi.produk?.judulProduk || 'Produk'}
              className="w-16 h-16 rounded-lg object-cover border border-gray-200"
            />
          </div>
          
          {/* Product Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between">
              <div className="flex-1 min-w-0">
                <h3 className="font-medium text-gray-900 text-sm truncate">
                  {transaksi.produk?.judulProduk || 'Produk Tidak Ditemukan'}
                </h3>
                <p className="text-xs text-gray-500 mt-1">
                  {transaksi.produk?.namaGame || 'Game'} • #{transaksi.kodeTransaksi || transaksi.id}
                </p>
                
                {/* Price */}
                <div className="flex items-center space-x-2 mt-2">
                  <span className="text-base font-semibold text-blue-600">
                    {transaksi.escrowAmount ? `${parseFloat(transaksi.escrowAmount).toFixed(4)} ETH` : 
                     transaksi.produk?.hargaEth ? `${transaksi.produk.hargaEth} ETH` : 'N/A'}
                  </span>
                  {transaksi.produk?.harga && (
                    <span className="text-xs text-gray-500">
                      ≈ {formatCurrency(transaksi.produk.harga)}
                    </span>
                  )}
                </div>

                {/* Additional Info */}
                <div className="flex items-center space-x-4 mt-2 text-xs text-gray-500">
                  <span>{formatDate(transaksi.dibuatPada)}</span>
                  {mode === 'penjualan' && transaksi.pembeli && (
                    <span>Pembeli: {transaksi.pembeli.nama || 'Anonim'}</span>
                  )}
                  {transaksi.escrowId && (
                    <span>Escrow #{transaksi.escrowId}</span>
                  )}
                </div>
              </div>
              
              {/* Status Badge */}
              <div className="ml-4">
                {getStatusBadge(transaksi.status)}
              </div>
            </div>

            {/* Payment Timer */}
            {showPaymentTimer && transaksi.status === 'MENUNGGU_PEMBAYARAN' && PaymentTimerComponent && (
              <div className="mt-3">
                <PaymentTimerComponent />
              </div>
            )}

            {/* Action Buttons */}
            <div className="mt-3 flex flex-wrap gap-2">
              {/* Tombol Lihat Akun */}
              {hasAccountData && validStatusForAccount && (
                <button
                  onClick={() => onLihatAkun?.(transaksi)}
                  className="inline-flex items-center px-3 py-1.5 border border-green-300 text-xs font-medium rounded-md text-green-700 bg-green-50 hover:bg-green-100 transition-colors"
                >
                  <DocumentTextIcon className="h-3 w-3 mr-1" />
                  Lihat Akun
                </button>
              )}
              
              {/* Tombol Kirim Akun (Penjual) */}
              {mode === 'penjualan' && transaksi.status === 'DIBAYAR_SMARTCONTRACT' && (
                <button
                  onClick={() => onKirimAkun?.(transaksi)}
                  className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 transition-colors"
                >
                  <PaperAirplaneIcon className="h-3 w-3 mr-1" />
                  Kirim Akun
                </button>
              )}
              
              {/* Tombol Konfirmasi (Pembeli) */}
              {mode === 'pembelian' && transaksi.status === 'DIKIRIM' && (
                <button
                  onClick={() => onKonfirmasi?.(transaksi)}
                  className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded-md text-white bg-green-600 hover:bg-green-700 transition-colors"
                >
                  <CheckCircleIcon className="h-3 w-3 mr-1" />
                  Konfirmasi
                </button>
              )}
              
              {/* Tombol Sengketa (Pembeli) */}
              {mode === 'pembelian' && transaksi.status === 'DIKIRIM' && (
                <button
                  onClick={() => onSengketa?.(transaksi)}
                  className="inline-flex items-center px-3 py-1.5 border border-red-300 text-xs font-medium rounded-md text-red-700 bg-red-50 hover:bg-red-100 transition-colors"
                >
                  <ExclamationTriangleIcon className="h-3 w-3 mr-1" />
                  Sengketa
                </button>
              )}

              {/* Tombol Pembelaan (Penjual) - DIPERBAIKI */}
              {mode === 'penjualan' && transaksi.status === 'SENGKETA' && (
                <button
                  onClick={() => onSengketa?.(transaksi)}
                  className="inline-flex items-center px-3 py-1.5 border border-red-300 text-xs font-medium rounded-md text-red-700 bg-red-50 hover:bg-red-100 transition-colors"
                >
                  <ExclamationTriangleIcon className="h-3 w-3 mr-1" />
                  Beri Pembelaan
                </button>
              )}
              
              {/* Tombol Detail */}
              <button
                onClick={() => onDetail?.(transaksi)}
                className="inline-flex items-center px-3 py-1.5 border border-gray-300 text-xs font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 transition-colors"
              >
                <EyeIcon className="h-3 w-3 mr-1" />
                Detail
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TransactionCard;