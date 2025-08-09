import React, { useState, useEffect } from 'react';
import { ClockIcon, ExclamationTriangleIcon, CurrencyDollarIcon } from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';

const PaymentTimer = ({ transaksi, onExpired, onPayment, inline = false, compact = false, displayOnly = false, buttonOnly = false }) => {
  const [timeLeft, setTimeLeft] = useState(null);
  const [isExpired, setIsExpired] = useState(false);
  const [hasNotifiedExpired, setHasNotifiedExpired] = useState(false);

  useEffect(() => {
    if (!transaksi || transaksi.status !== 'MENUNGGU_PEMBAYARAN') {
      setTimeLeft(null);
      setIsExpired(false);
      setHasNotifiedExpired(false);
      return;
    }

    const createdAt = new Date(transaksi.dibuatPada);
    const expiryTime = new Date(createdAt.getTime() + 15 * 60 * 1000); // 15 menit

    const updateTimer = () => {
      const now = new Date();
      const difference = expiryTime.getTime() - now.getTime();

      if (difference <= 0) {
        setTimeLeft({ minutes: 0, seconds: 0 });
        setIsExpired(true);
        
        // Notifikasi dan callback hanya sekali
        if (!hasNotifiedExpired) {
          setHasNotifiedExpired(true);
          
          // Notifikasi toast
          toast.error(`⏰ Waktu pembayaran habis untuk transaksi ${transaksi.kodeTransaksi}. Produk dikembalikan ke market.`, {
            duration: 6000
          });
          
          // Callback untuk mengembalikan produk ke market
          if (onExpired) {
            onExpired(transaksi);
          }
        }
        
        return;
      }

      const minutes = Math.floor(difference / (1000 * 60));
      const seconds = Math.floor((difference % (1000 * 60)) / 1000);
      
      setTimeLeft({ minutes, seconds });
      setIsExpired(false);
    };


    updateTimer();
    const interval = setInterval(updateTimer, 1000);

    return () => clearInterval(interval);
  }, [transaksi, hasNotifiedExpired, onExpired]);

  if (!transaksi || transaksi.status !== 'MENUNGGU_PEMBAYARAN') {
    return null;
  }

  // Button only mode - just show payment button with timer
  if (buttonOnly) {
    if (isExpired) {
      return (
        <div className="flex-1 sm:flex-none inline-flex items-center justify-center px-3 py-2 border border-red-300 text-xs font-medium rounded-md text-red-700 bg-red-50">
          <ExclamationTriangleIcon className="h-4 w-4 mr-1" />
          Waktu Habis
        </div>
      );
    }

    if (timeLeft) {
      return (
        <button
          onClick={() => onPayment && onPayment(transaksi)}
          className={`flex-1 sm:flex-none inline-flex items-center justify-center px-3 py-2 text-xs font-medium rounded-md text-white transition-colors ${
            timeLeft.minutes < 5
              ? 'bg-red-600 hover:bg-red-700'
              : timeLeft.minutes < 10
                ? 'bg-orange-600 hover:bg-orange-700'
                : 'bg-blue-600 hover:bg-blue-700'
          }`}
          title={`${timeLeft.minutes} menit ${timeLeft.seconds} detik tersisa`}
        >
          <CurrencyDollarIcon className="h-4 w-4 mr-1" />
          Bayar ({String(timeLeft.minutes).padStart(2, '0')}:{String(timeLeft.seconds).padStart(2, '0')})
        </button>
      );
    }

    return (
      <div className="flex-1 sm:flex-none inline-flex items-center justify-center px-3 py-2 border border-blue-300 text-xs font-medium rounded-md text-blue-700 bg-blue-50">
        <CurrencyDollarIcon className="h-4 w-4 mr-1" />
        Memuat...
      </div>
    );
  }

  // Display only mode - just show timer
  if (displayOnly) {
    if (isExpired) {
      return (
        <div className="text-xs text-red-600 font-medium">
          ⚠️ Waktu habis
        </div>
      );
    }

    if (timeLeft) {
      return (
        <div className={`text-xs font-medium ${
          timeLeft.minutes < 5
            ? 'text-red-600'
            : timeLeft.minutes < 10
              ? 'text-orange-600'
              : 'text-blue-600'
        }`}>
          ⏰ {String(timeLeft.minutes).padStart(2, '0')}:{String(timeLeft.seconds).padStart(2, '0')}
        </div>
      );
    }

    return (
      <div className="text-xs text-blue-600 font-medium">
        ⏰ Memuat...
      </div>
    );
  }

  // Compact mode - simple button with timer
  if (compact || inline) {
    if (isExpired) {
      return (
        <div className="flex-1 sm:flex-none inline-flex items-center justify-center px-3 py-2 border border-red-300 text-xs font-medium rounded-md text-red-700 bg-red-50">
          <ExclamationTriangleIcon className="h-4 w-4 mr-1" />
          Waktu Habis
        </div>
      );
    }

    if (timeLeft) {
      return (
        <button
          onClick={() => onPayment && onPayment(transaksi)}
          className={`flex-1 sm:flex-none inline-flex items-center justify-center px-3 py-2 text-xs font-medium rounded-md text-white transition-colors ${
            timeLeft.minutes < 5
              ? 'bg-red-600 hover:bg-red-700'
              : timeLeft.minutes < 10
                ? 'bg-orange-600 hover:bg-orange-700'
                : 'bg-blue-600 hover:bg-blue-700'
          }`}
          title={`${timeLeft.minutes} menit ${timeLeft.seconds} detik tersisa`}
        >
          <CurrencyDollarIcon className="h-4 w-4 mr-1" />
          Bayar {String(timeLeft.minutes).padStart(2, '0')}:{String(timeLeft.seconds).padStart(2, '0')}
        </button>
      );
    }

    return (
      <div className="flex-1 sm:flex-none inline-flex items-center justify-center px-3 py-2 border border-blue-300 text-xs font-medium rounded-md text-blue-700 bg-blue-50">
        <CurrencyDollarIcon className="h-4 w-4 mr-1" />
        Memuat...
      </div>
    );
  }

  // Original full display mode
  return (
    <div className="mt-3">
      {isExpired ? (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3">
          <div className="flex items-start gap-2">
            <ExclamationTriangleIcon className="h-5 w-5 text-red-600 mt-0.5 flex-shrink-0" />
            <div className="flex-1">
              <h4 className="font-semibold text-red-900 text-sm">
                ❌ Waktu Pembayaran Habis
              </h4>
              <p className="text-xs text-red-700 mt-1">
                Batas waktu 15 menit telah berakhir. Produk dikembalikan ke market.
              </p>
            </div>
          </div>
        </div>
      ) : timeLeft ? (
        <div className={`rounded-lg p-3 border ${
          timeLeft.minutes < 5
            ? 'bg-red-50 border-red-200'
            : timeLeft.minutes < 10
              ? 'bg-orange-50 border-orange-200'
              : 'bg-blue-50 border-blue-200'
        }`}>
          <div className="flex items-start gap-2">
            <ClockIcon className={`h-5 w-5 mt-0.5 flex-shrink-0 ${
              timeLeft.minutes < 5
                ? 'text-red-600'
                : timeLeft.minutes < 10
                  ? 'text-orange-600'
                  : 'text-blue-600'
            }`} />
            <div className="flex-1">
              <div className="flex items-center justify-between">
                <h4 className={`font-semibold text-sm ${
                  timeLeft.minutes < 5
                    ? 'text-red-900'
                    : timeLeft.minutes < 10
                      ? 'text-orange-900'
                      : 'text-blue-900'
                }`}>
                  {timeLeft.minutes < 5
                    ? '⚠️ Segera Bayar!'
                    : timeLeft.minutes < 10
                      ? '⏰ Waktu Terbatas'
                      : '💳 Menunggu Pembayaran'
                  }
                </h4>
                <div className={`text-lg font-bold ${
                  timeLeft.minutes < 5
                    ? 'text-red-600'
                    : timeLeft.minutes < 10
                      ? 'text-orange-600'
                      : 'text-blue-600'
                }`}>
                  {String(timeLeft.minutes).padStart(2, '0')}:{String(timeLeft.seconds).padStart(2, '0')}
                </div>
              </div>
              <p className={`text-xs mt-1 ${
                timeLeft.minutes < 5
                  ? 'text-red-700'
                  : timeLeft.minutes < 10
                    ? 'text-orange-700'
                    : 'text-blue-700'
              }`}>
                {timeLeft.minutes < 5
                  ? `Hanya ${timeLeft.minutes} menit ${timeLeft.seconds} detik lagi! Jika tidak bayar, produk kembali ke market.`
                  : `Anda memiliki ${timeLeft.minutes} menit ${timeLeft.seconds} detik untuk menyelesaikan pembayaran.`
                }
              </p>
              
              {/* Tombol Bayar */}
              <div className="mt-2 flex gap-2">
                <button
                  onClick={() => onPayment && onPayment(transaksi)}
                  className={`flex-1 inline-flex items-center justify-center px-3 py-2 text-xs font-medium rounded-md text-white transition-colors ${
                    timeLeft.minutes < 5
                      ? 'bg-red-600 hover:bg-red-700'
                      : timeLeft.minutes < 10
                        ? 'bg-orange-600 hover:bg-orange-700'
                        : 'bg-blue-600 hover:bg-blue-700'
                  }`}
                >
                  <CurrencyDollarIcon className="h-4 w-4 mr-1" />
                  Bayar Sekarang
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
          <div className="flex items-center gap-2">
            <ClockIcon className="h-5 w-5 text-blue-600" />
            <span className="text-sm text-blue-700">Memuat timer pembayaran...</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default PaymentTimer;