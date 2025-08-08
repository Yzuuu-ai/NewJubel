import React from 'react';
import {
  ClockIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  CurrencyDollarIcon,
  ShoppingBagIcon,
  TruckIcon,
  HandThumbUpIcon,
  XCircleIcon,
  BanknotesIcon,
  ArrowLeftIcon,
  ShieldCheckIcon
} from '@heroicons/react/24/outline';
const StatusTracker = ({ currentStatus, userRole, transaksi }) => {
  // Define status flow berdasarkan role
  const getStatusFlow = () => {
    const baseFlow = [
      {
        key: 'MENUNGGU_PEMBAYARAN',
        label: 'Menunggu Pembayaran',
        description: 'Transaksi dibuat, menunggu pembayaran',
        icon: ClockIcon,
        color: 'yellow'
      },
      {
        key: 'DIBAYAR_SMARTCONTRACT',
        label: 'Pembayaran Berhasil',
        description: 'Pembayaran berhasil di blockchain',
        icon: BanknotesIcon,
        color: 'blue'
      },
      {
        key: 'MENUNGGU_KIRIM_AKUN',
        label: 'Menunggu Pengiriman',
        description: 'Menunggu penjual mengirim detail akun',
        icon: ClockIcon,
        color: 'purple'
      },
      {
        key: 'DIKIRIM',
        label: 'Akun Dikirim',
        description: 'Detail akun sudah dikirim ke pembeli',
        icon: TruckIcon,
        color: 'indigo'
      },
      {
        key: 'DIKONFIRMASI_PEMBELI',
        label: 'Dikonfirmasi Pembeli',
        description: 'Pembeli konfirmasi penerimaan akun',
        icon: HandThumbUpIcon,
        color: 'green'
      },
      {
        key: 'SELESAI',
        label: 'Transaksi Selesai',
        description: 'Transaksi berhasil diselesaikan',
        icon: CheckCircleIcon,
        color: 'green'
      }
    ];
    // Add special statuses
    const specialStatuses = {
      'SENGKETA': {
        key: 'SENGKETA',
        label: 'Dalam Sengketa',
        description: 'Transaksi sedang dalam proses sengketa',
        icon: ExclamationTriangleIcon,
        color: 'red'
      },
      'GAGAL': {
        key: 'GAGAL',
        label: 'Transaksi Gagal',
        description: 'Transaksi dibatalkan atau gagal',
        icon: XCircleIcon,
        color: 'gray'
      },
      // 🆕 DISPUTE RESOLUTION OUTCOMES
      'DIMENANGKAN_PEMBELI': {
        key: 'DIMENANGKAN_PEMBELI',
        label: '🏆 Pembeli Menang Sengketa',
        description: 'Sengketa diputuskan untuk pembeli, dana telah dikembalikan',
        icon: ArrowLeftIcon,
        color: 'blue',
        isDisputeOutcome: true
      },
      'DIMENANGKAN_PENJUAL': {
        key: 'DIMENANGKAN_PENJUAL',
        label: '🏆 Penjual Menang Sengketa',
        description: 'Sengketa diputuskan untuk penjual, dana telah dikirim ke penjual',
        icon: CheckCircleIcon,
        color: 'green',
        isDisputeOutcome: true
      },
      // 🆕 SMART CONTRACT STATUSES
      'REFUNDED': {
        key: 'REFUNDED',
        label: '💰 Dana Dikembalikan',
        description: 'Dana telah dikembalikan ke pembeli via smart contract',
        icon: ArrowLeftIcon,
        color: 'blue',
        isBlockchainStatus: true
      },
      'COMPLETED_DISPUTE': {
        key: 'COMPLETED_DISPUTE',
        label: '✅ Selesai (Resolusi Sengketa)',
        description: 'Dana telah dikirim ke penjual via resolusi sengketa',
        icon: CheckCircleIcon,
        color: 'green',
        isBlockchainStatus: true
      }
    };
    return { baseFlow, specialStatuses };
  };
  const { baseFlow, specialStatuses } = getStatusFlow();
  // Get current status index
  const getCurrentStatusIndex = () => {
    return baseFlow.findIndex(status => status.key === currentStatus);
  };
  // Check if status is completed
  const isStatusCompleted = (statusKey) => {
    const currentIndex = getCurrentStatusIndex();
    const statusIndex = baseFlow.findIndex(status => status.key === statusKey);
    if (currentIndex === -1) return false; // Special status
    return statusIndex <= currentIndex;
  };
  // Check if status is current
  const isStatusCurrent = (statusKey) => {
    return statusKey === currentStatus;
  };
  // Get status color classes
  const getStatusClasses = (status) => {
    const isCompleted = isStatusCompleted(status.key);
    const isCurrent = isStatusCurrent(status.key);
    if (isCompleted) {
      return {
        circle: 'bg-green-500 border-green-500',
        icon: 'text-white',
        line: 'bg-green-500',
        text: 'text-green-600',
        description: 'text-green-500'
      };
    } else if (isCurrent) {
      return {
        circle: `bg-${status.color}-500 border-${status.color}-500`,
        icon: 'text-white',
        line: 'bg-gray-300',
        text: `text-${status.color}-600`,
        description: `text-${status.color}-500`
      };
    } else {
      return {
        circle: 'bg-gray-200 border-gray-300',
        icon: 'text-gray-400',
        line: 'bg-gray-300',
        text: 'text-gray-400',
        description: 'text-gray-400'
      };
    }
  };
  // Handle special statuses
  if (specialStatuses[currentStatus]) {
    const specialStatus = specialStatuses[currentStatus];
    const StatusIcon = specialStatus.icon;
    return (
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <div className="text-center">
          <div className={`inline-flex items-center justify-center w-16 h-16 rounded-full bg-${specialStatus.color}-100 mb-4`}>
            <StatusIcon className={`h-8 w-8 text-${specialStatus.color}-600`} />
          </div>
          <h3 className={`text-lg font-semibold text-${specialStatus.color}-600 mb-2`}>
            {specialStatus.label}
          </h3>
          <p className="text-gray-600">{specialStatus.description}</p>
          {currentStatus === 'SENGKETA' && (
            <div className="mt-4 p-4 bg-yellow-50 rounded-lg">
              <p className="text-sm text-yellow-800">
                Transaksi sedang ditinjau oleh admin. Anda akan mendapat notifikasi setelah sengketa diselesaikan.
              </p>
            </div>
          )}
          {/* 🆕 DISPUTE OUTCOME INFO */}
          {specialStatus.isDisputeOutcome && (
            <div className="mt-4 space-y-3">
              <div className={`p-4 bg-${specialStatus.color}-50 rounded-lg border border-${specialStatus.color}-200`}>
                <h4 className={`font-medium text-${specialStatus.color}-900 mb-2`}>
                  Hasil Sengketa
                </h4>
                <div className="space-y-2 text-sm">
                  <p className={`text-${specialStatus.color}-800`}>
                    {specialStatus.key === 'DIMENANGKAN_PEMBELI' 
                      ? 'Dana telah dikembalikan ke pembeli' 
                      : 'Dana telah dikirim ke penjual'
                    }
                  </p>
                  {transaksi?.escrowAmount && (
                    <p className={`text-${specialStatus.color}-700`}>
                      <span className="font-medium">Jumlah:</span> {transaksi.escrowAmount} ETH
                    </p>
                  )}
                  {transaksi?.disputeResolutionTxHash && (
                    <p className={`text-${specialStatus.color}-700`}>
                      <span className="font-medium">Transaction Hash:</span>
                      <a 
                        href={`https://sepolia.etherscan.io/tx/${transaksi.disputeResolutionTxHash}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={`text-${specialStatus.color}-600 hover:text-${specialStatus.color}-800 ml-1 break-all underline`}
                      >
                        {transaksi.disputeResolutionTxHash.substring(0, 20)}...
                      </a>
                    </p>
                  )}
                  {transaksi?.waktuSelesai && (
                    <p className={`text-${specialStatus.color}-700`}>
                      <span className="font-medium">Diselesaikan:</span> {new Date(transaksi.waktuSelesai).toLocaleString('id-ID')}
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}
          {/* 🆕 BLOCKCHAIN STATUS INFO */}
          {specialStatus.isBlockchainStatus && (
            <div className="mt-4 space-y-3">
              <div className={`p-4 bg-${specialStatus.color}-50 rounded-lg border border-${specialStatus.color}-200`}>
                <h4 className={`font-medium text-${specialStatus.color}-900 mb-2`}>
                  Status Blockchain
                </h4>
                <div className="space-y-2 text-sm">
                  <p className={`text-${specialStatus.color}-800`}>
                    {specialStatus.description}
                  </p>
                  {transaksi?.escrowAmount && (
                    <p className={`text-${specialStatus.color}-700`}>
                      <span className="font-medium">Jumlah:</span> {transaksi.escrowAmount} ETH
                    </p>
                  )}
                  {transaksi?.smartContractTxHash && (
                    <p className={`text-${specialStatus.color}-700`}>
                      <span className="font-medium">Transaction Hash:</span>
                      <a 
                        href={`https://sepolia.etherscan.io/tx/${transaksi.smartContractTxHash}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={`text-${specialStatus.color}-600 hover:text-${specialStatus.color}-800 ml-1 break-all underline`}
                      >
                        {transaksi.smartContractTxHash.substring(0, 20)}...
                      </a>
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }
  return (
    <div className="bg-white rounded-lg shadow-sm border p-6">
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-2">Status Transaksi</h3>
        <p className="text-sm text-gray-600">
          Pantau progress transaksi Anda sebagai {userRole === 'pembeli' ? 'pembeli' : 'penjual'}
        </p>
      </div>
      <div className="relative">
        {baseFlow.map((status, index) => {
          const StatusIcon = status.icon;
          const classes = getStatusClasses(status);
          const isLast = index === baseFlow.length - 1;
          const isCompleted = isStatusCompleted(status.key);
          const isCurrent = isStatusCurrent(status.key);
          return (
            <div key={status.key} className="relative flex items-start">
              {/* Vertical line */}
              {!isLast && (
                <div className="absolute left-4 top-8 w-0.5 h-16 bg-gray-300"></div>
              )}
              {/* Status circle */}
              <div className={`relative flex items-center justify-center w-8 h-8 rounded-full border-2 ${classes.circle}`}>
                {isCompleted ? (
                  <CheckCircleIcon className="h-5 w-5 text-white" />
                ) : (
                  <StatusIcon className={`h-4 w-4 ${classes.icon}`} />
                )}
              </div>
              {/* Status content */}
              <div className="ml-4 flex-1 pb-8">
                <div className="flex items-center justify-between">
                  <h4 className={`text-sm font-medium ${classes.text}`}>
                    {status.label}
                  </h4>
                  {isCurrent && (
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                      Saat ini
                    </span>
                  )}
                  {isCompleted && !isCurrent && (
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                      Selesai
                    </span>
                  )}
                </div>
                <p className={`text-sm mt-1 ${classes.description}`}>
                  {status.description}
                </p>
                {/* Additional info for current status */}
                {isCurrent && (
                  <div className="mt-3 p-3 bg-blue-50 rounded-lg">
                    {status.key === 'MENUNGGU_PEMBAYARAN' && (
                      <p className="text-sm text-blue-800">
                        Silakan lakukan pembayaran melalui smart contract untuk melanjutkan transaksi.
                      </p>
                    )}
                    {status.key === 'DIBAYAR_SMARTCONTRACT' && userRole === 'penjual' && (
                      <p className="text-sm text-blue-800">
                        Pembayaran telah diterima. Silakan kirim detail akun kepada pembeli.
                      </p>
                    )}
                    {status.key === 'DIBAYAR_SMARTCONTRACT' && userRole === 'pembeli' && (
                      <p className="text-sm text-blue-800">
                        Pembayaran berhasil. Menunggu penjual mengirim detail akun.
                      </p>
                    )}
                    {status.key === 'MENUNGGU_KIRIM_AKUN' && userRole === 'penjual' && (
                      <p className="text-sm text-blue-800">
                        Silakan kirim detail akun game kepada pembeli melalui form yang tersedia.
                      </p>
                    )}
                    {status.key === 'DIKIRIM' && userRole === 'pembeli' && (
                      <p className="text-sm text-blue-800">
                        Detail akun telah dikirim. Silakan periksa dan konfirmasi jika sudah sesuai.
                      </p>
                    )}
                    {status.key === 'DIKONFIRMASI_PEMBELI' && (
                      <p className="text-sm text-blue-800">
                        Pembeli telah mengkonfirmasi penerimaan. Dana akan segera dilepas ke penjual.
                      </p>
                    )}
                  </div>
                )}
                {/* Show timestamp if available */}
                {isCompleted && transaksi && (
                  <div className="mt-2">
                    {status.key === 'DIBAYAR_SMARTCONTRACT' && transaksi.waktuBayar && (
                      <p className="text-xs text-gray-500">
                        Dibayar: {new Date(transaksi.waktuBayar).toLocaleString('id-ID')}
                      </p>
                    )}
                    {status.key === 'SELESAI' && transaksi.waktuSelesai && (
                      <p className="text-xs text-gray-500">
                        Selesai: {new Date(transaksi.waktuSelesai).toLocaleString('id-ID')}
                      </p>
                    )}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
      {/* Blockchain info */}
      {transaksi?.smartContractTxHash && (
        <div className="mt-6 pt-6 border-t border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="text-sm font-medium text-gray-900">Informasi Blockchain</h4>
              <p className="text-xs text-gray-500 mt-1">
                Escrow ID: {transaksi.escrowId || 'N/A'}
              </p>
            </div>
            <a
              href={`https://sepolia.etherscan.io/tx/${transaksi.smartContractTxHash}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center px-3 py-1.5 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
            >
              <svg className="h-4 w-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                <path d="M11 3a1 1 0 100 2h2.586l-6.293 6.293a1 1 0 101.414 1.414L15 6.414V9a1 1 0 102 0V4a1 1 0 00-1-1h-5z" />
                <path d="M5 5a2 2 0 00-2 2v8a2 2 0 002 2h8a2 2 0 002-2v-3a1 1 0 10-2 0v3H5V7h3a1 1 0 000-2H5z" />
              </svg>
              Lihat di Etherscan
            </a>
          </div>
        </div>
      )}
    </div>
  );
};
export default StatusTracker;
