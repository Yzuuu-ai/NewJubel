import React from 'react';
import {
  XMarkIcon,
  ExclamationTriangleIcon,
  DocumentTextIcon,
  PhotoIcon,
  UserIcon,
  CalendarIcon,
  ShieldCheckIcon
} from '@heroicons/react/24/outline';

const ModalDetailSengketaAdmin = ({ isOpen, onClose, transaksi, onResolve }) => {
  // State untuk image viewer - HARUS di atas sebelum early return
  const [showImageViewer, setShowImageViewer] = React.useState(false);
  const [currentImageIndex, setCurrentImageIndex] = React.useState(0);
  const [viewerImages, setViewerImages] = React.useState([]);

  const formatDate = (dateString) => {
    if (!dateString) return 'Tanggal tidak tersedia';
    return new Date(dateString).toLocaleDateString('id-ID', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Fungsi untuk membuka image viewer
  const openImageViewer = (images, startIndex = 0) => {
    if (images && images.length > 0) {
      setViewerImages(images);
      setCurrentImageIndex(Math.max(0, Math.min(startIndex, images.length - 1)));
      setShowImageViewer(true);
    }
  };

  // Fungsi navigasi image viewer
  const nextImage = () => {
    setCurrentImageIndex((prev) => (prev + 1) % viewerImages.length);
  };

  const prevImage = () => {
    setCurrentImageIndex((prev) => (prev - 1 + viewerImages.length) % viewerImages.length);
  };

  // Add keyboard event listener - HARUS di atas sebelum early return
  React.useEffect(() => {
    const handleKeyDown = (e) => {
      if (!showImageViewer) return;
      
      if (e.key === 'ArrowRight') {
        nextImage();
      } else if (e.key === 'ArrowLeft') {
        prevImage();
      } else if (e.key === 'Escape') {
        setShowImageViewer(false);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [showImageViewer, viewerImages]);

  // Early return SETELAH semua hooks dipanggil
  if (!isOpen || !transaksi) return null;

  const sengketa = transaksi.sengketa || {};

  // Enhanced helper function untuk parse bukti
  const parseBukti = (buktiString) => {
    if (!buktiString || buktiString === 'null' || buktiString === 'undefined') return [];
    if (Array.isArray(buktiString)) return buktiString;
    
    try {
      // Coba parse sebagai JSON array
      const parsed = JSON.parse(buktiString);
      return Array.isArray(parsed) ? parsed : [buktiString];
    } catch (e) {
      // Jika bukan JSON, split by comma atau return as single item
      return buktiString.includes(',') ? buktiString.split(',').map(b => b.trim()) : [buktiString];
    }
  };

  // Parse bukti dengan multiple field checks
  const buktiBembeli = parseBukti(sengketa.pembeliBukti || sengketa.bukti || sengketa.evidence);
  const buktiPenjual = parseBukti(sengketa.penjualBukti || sengketa.sellerEvidence);

  // Extract pembelaan dengan multiple checks
  const pembelaan = sengketa.resolution && sengketa.resolution.includes('[PEMBELAAN PENJUAL]') 
    ? sengketa.resolution.replace('[PEMBELAAN PENJUAL]', '').trim()
    : sengketa.penjualPembelaan || sengketa.sellerDefense || null;

  // Get detailed dispute info with better fallbacks
  const disputeDetails = {
    id: sengketa.id || sengketa.disputeId || 'N/A',
    status: sengketa.status || 'DIPROSES',
    createdAt: sengketa.dibuatPada || sengketa.createdAt || transaksi.diperbaruiPada,
    description: sengketa.deskripsi || sengketa.description || sengketa.reason || 'Tidak ada alasan yang diberikan',
    category: sengketa.kategori || sengketa.category || 'N/A',
    buyerEvidence: buktiBembeli,
    sellerEvidence: buktiPenjual,
    sellerDefense: pembelaan,
    hasSellerResponse: !!(pembelaan || buktiPenjual.length > 0)
  };

  // Helper function untuk mendapatkan gambar produk
  const getProductImages = () => {
    try {
      const productData = transaksi.produk;
      
      // Cek field 'gambar' terlebih dahulu
      if (Array.isArray(productData?.gambar) && productData.gambar.length > 0) {
        return productData.gambar.filter(img => img && typeof img === 'string');
      }
      
      // Jika field 'gambar' adalah string dengan comma-separated URLs
      if (typeof productData?.gambar === 'string' && productData.gambar.trim()) {
        if (productData.gambar.includes(',')) {
          return productData.gambar.split(',').map(img => img.trim()).filter(img => img);
        } else {
          return [productData.gambar];
        }
      }
      
      return [];
    } catch (error) {
      console.error('Error getting product images:', error);
      return [];
    }
  };

  // Helper function untuk mendapatkan deskripsi produk
  const getProductDescription = () => {
    const productData = transaksi.produk;
    
    // Deskripsi lengkap berdasarkan data yang kita tahu ada di database
    const deskripsiLengkap = `Detail Akun Mobile Legends:

Level: [isi level akun]
Rank: [isi rank saat ini, contoh: Mythic Glory]
Total Heroes: [jumlah hero yang dimiliki]
Skins: [daftar skin yang dimiliki]
Emblem: [level emblem]
Server: [server game]
Binding: [Facebook/Google/Moonton]
Highlight: [sebutkan keunggulan akun]
[item rare yang dimiliki]`;

    // Cek berbagai field untuk deskripsi
    const possibleFields = [
      'deskripsi',
      'description', 
      'desc',
      'keterangan',
      'detail',
      'detailProduk',
      'informasi',
      'info'
    ];
    
    for (const field of possibleFields) {
      if (productData?.[field] && typeof productData[field] === 'string' && productData[field].trim()) {
        return productData[field];
      }
    }
    
    // Jika tidak ada deskripsi di data transaksi, gunakan deskripsi default berdasarkan game
    if (productData?.namaGame === 'Mobile Legends') {
      return deskripsiLengkap;
    }
    
    return 'Deskripsi produk tidak tersedia';
  };

  // Render evidence (bukti) dengan grid layout yang sederhana dan kecil - TANPA TOMBOL AKSI
  const renderEvidence = (evidence, title, colorClass) => {
    if (!evidence || evidence.length === 0) {
      return (
        <div className="border p-3 rounded">
          <p className="text-sm opacity-75">Tidak ada bukti yang diberikan</p>
        </div>
      );
    }

    // Pisahkan bukti gambar dan teks
    const imageEvidence = evidence.filter(bukti => bukti && bukti.includes('http'));
    const textEvidence = evidence.filter(bukti => bukti && !bukti.includes('http'));

    return (
      <div className="space-y-4">
        {/* Grid untuk gambar bukti - UKURAN KECIL TANPA TOMBOL AKSI */}
        {imageEvidence.length > 0 && (
          <div>
            <div className="flex items-center space-x-2 mb-3">
              <PhotoIcon className="h-4 w-4 text-gray-600" />
              <span className="text-sm font-medium">Bukti Gambar ({imageEvidence.length})</span>
            </div>
            <div className="grid grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-2">
              {imageEvidence.map((bukti, index) => (
                <div key={index} className="relative group">
                  <div className="w-16 h-16 bg-gray-100 rounded overflow-hidden border border-gray-200">
                    <img 
                      src={bukti} 
                      alt={`${title} ${index + 1}`}
                      className="w-full h-full object-cover hover:scale-105 transition-transform duration-200 cursor-pointer"
                      onClick={() => openImageViewer(imageEvidence, index)}
                      onError={(e) => {
                        e.target.style.display = 'none';
                        e.target.nextElementSibling.style.display = 'flex';
                      }}
                    />
                    <div 
                      className="w-full h-full flex flex-col items-center justify-center text-center"
                      style={{ display: 'none' }}
                    >
                      <PhotoIcon className="h-6 w-6 text-gray-300 mb-1" />
                      <span className="text-xs text-gray-400">Error</span>
                    </div>
                  </div>
                  {/* Overlay dengan nomor gambar - UKURAN KECIL */}
                  <div className="absolute top-1 left-1 bg-black bg-opacity-60 text-white text-xs px-1 py-0.5 rounded text-[10px]">
                    {index + 1}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Bukti teks */}
        {textEvidence.length > 0 && (
          <div>
            <div className="flex items-center space-x-2 mb-3">
              <DocumentTextIcon className="h-4 w-4 text-gray-600" />
              <span className="text-sm font-medium">Bukti Teks</span>
            </div>
            <div className="space-y-2">
              {textEvidence.map((bukti, index) => (
                <div key={index} className="border p-3 rounded break-words whitespace-pre-wrap overflow-hidden">
                  <p className="text-sm">{bukti || 'Bukti kosong'}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-7xl w-full max-h-[95vh] overflow-y-auto">
        <div className="p-6">
          {/* Header */}
          <div className="flex justify-between items-center mb-6">
            <div className="flex items-center space-x-3">
              <div>
                <h3 className="text-xl font-semibold text-gray-900 break-words">
                  Detail Sengketa - {transaksi.kodeTransaksi}
                </h3>
                <p className="text-sm text-gray-500 break-words">
                  {transaksi.produk?.judulProduk} - {transaksi.produk?.namaGame}
                </p>
                {disputeDetails.id && (
                  <p className="text-xs text-blue-600 break-words">
                    ID Sengketa: {disputeDetails.id}
                  </p>
                )}
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              <XMarkIcon className="h-6 w-6" />
            </button>
          </div>

          {/* Detail Transaksi - GABUNGAN INFORMASI TRANSAKSI & PRODUK */}
          <div className="bg-gray-50 rounded-lg p-4 mb-6">
            <h4 className="font-medium text-gray-900 mb-3 flex items-center">
              <DocumentTextIcon className="h-5 w-5 mr-2 text-gray-600" />
              Detail Transaksi
            </h4>
            <div className="space-y-4">
              {/* Informasi Transaksi & Produk - Grid 2 Kolom */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                {/* Kolom 1: Informasi Transaksi */}
                <div className="space-y-2">
                  <h5 className="font-medium text-gray-800 mb-2 text-xs uppercase tracking-wide">Informasi Transaksi</h5>
                  <p className="break-words"><span className="font-medium">Kode Transaksi:</span> {transaksi.kodeTransaksi}</p>
                  <p className="break-words"><span className="font-medium">Harga:</span> {transaksi.escrowAmount || transaksi.produk?.hargaEth || 'N/A'} ETH</p>
                  <p className="break-words"><span className="font-medium">Pembeli:</span> {transaksi.pembeli?.nama}</p>
                  <p className="break-words"><span className="font-medium">Penjual:</span> {transaksi.penjual?.nama}</p>
                  <p className="break-words"><span className="font-medium">Status:</span> 
                    <span className={`ml-1 px-2 py-1 rounded-full text-xs ${
                      disputeDetails.status === 'DIMENANGKAN_PEMBELI' || disputeDetails.status === 'DIMENANGKAN_PENJUAL' 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-red-100 text-red-800'
                    }`}>
                      {disputeDetails.status}
                    </span>
                  </p>
                  <p className="break-words"><span className="font-medium">Tanggal Sengketa:</span> {formatDate(disputeDetails.createdAt)}</p>
                </div>

                {/* Kolom 2: Detail Produk */}
                <div className="space-y-2">
                  <h5 className="font-medium text-gray-800 mb-2 text-xs uppercase tracking-wide">Detail Produk</h5>
                  <p className="break-words"><span className="font-medium">Nama Produk:</span> {transaksi.produk?.judulProduk || 'N/A'}</p>
                  <p className="break-words"><span className="font-medium">Game:</span> {transaksi.produk?.namaGame || 'N/A'}</p>
                  <p className="break-words"><span className="font-medium">Kode Produk:</span> {transaksi.produk?.kodeProduk || 'N/A'}</p>
                  <p className="break-words"><span className="font-medium">Kategori:</span> {transaksi.produk?.kategori || transaksi.produk?.namaGame || 'N/A'}</p>
                  <p className="break-words"><span className="font-medium">Status Produk:</span> {transaksi.produk?.statusProduk || 'TERJUAL'}</p>
                </div>
              </div>

              {/* Gambar Produk - TANPA TOMBOL AKSI */}
              <div>
                <p className="text-sm font-medium text-gray-800 mb-2">Gambar Produk:</p>
                {(() => {
                  const productImages = getProductImages();
                  
                  if (productImages.length > 0) {
                    return (
                      <>
                        <p className="text-xs text-gray-600 mb-2">({productImages.length} gambar)</p>
                        <div className="grid grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-2">
                          {productImages.map((gambar, index) => (
                            <div key={index} className="relative group">
                              <div className="w-16 h-16 bg-gray-100 rounded overflow-hidden border border-gray-200">
                                <img 
                                  src={gambar} 
                                  alt={`Produk ${index + 1}`}
                                  className="w-full h-full object-cover hover:scale-105 transition-transform duration-200 cursor-pointer"
                                  onClick={() => openImageViewer(productImages, index)}
                                  onError={(e) => {
                                    e.target.style.display = 'none';
                                    e.target.nextElementSibling.style.display = 'flex';
                                  }}
                                />
                                <div 
                                  className="w-full h-full flex flex-col items-center justify-center text-center"
                                  style={{ display: 'none' }}
                                >
                                  <PhotoIcon className="h-6 w-6 text-gray-300 mb-1" />
                                  <span className="text-xs text-gray-400">Error</span>
                                </div>
                              </div>
                              {/* Overlay dengan nomor gambar */}
                              <div className="absolute top-1 left-1 bg-black bg-opacity-60 text-white text-xs px-1 py-0.5 rounded text-[10px]">
                                {index + 1}
                              </div>
                            </div>
                          ))}
                        </div>
                      </>
                    );
                  } else {
                    return (
                      <div className="border p-3 rounded bg-gray-50">
                        <div className="flex items-center justify-center text-gray-500">
                          <PhotoIcon className="h-8 w-8 mr-2" />
                          <span className="text-sm">Tidak ada gambar produk tersedia</span>
                        </div>
                      </div>
                    );
                  }
                })()}
              </div>

              {/* Deskripsi Produk */}
              <div>
                <p className="text-sm font-medium text-gray-800 mb-1">Deskripsi Produk:</p>
                <div className="text-sm text-gray-700 border p-3 rounded break-words whitespace-pre-wrap overflow-hidden max-h-40 overflow-y-auto bg-white">
                  {getProductDescription()}
                </div>
              </div>
            </div>
          </div>

          {/* Sengketa & Pembelaan - Side by Side */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            {/* Laporan Sengketa dari Pembeli - KIRI */}
            <div className="bg-white border border-gray-200 rounded-lg p-4 min-h-0">
              <h4 className="font-medium text-gray-900 mb-3 flex items-center">
                <UserIcon className="h-5 w-5 mr-2 text-gray-600" />
                Laporan Sengketa dari Pembeli
              </h4>
              <div className="space-y-4">
                {/* Kategori Sengketa */}
                {disputeDetails.category && disputeDetails.category !== 'N/A' && (
                  <div>
                    <p className="text-sm font-medium text-gray-800 mb-1">Kategori Sengketa:</p>
                    <p className="text-sm text-gray-700 border px-3 py-2 rounded break-words whitespace-pre-wrap overflow-hidden">
                      {disputeDetails.category}
                    </p>
                  </div>
                )}
                
                {/* Alasan Sengketa */}
                <div>
                  <p className="text-sm font-medium text-gray-800 mb-1">Alasan Sengketa:</p>
                  <div className="text-sm text-gray-700 border p-3 rounded break-words whitespace-pre-wrap overflow-hidden max-h-40 overflow-y-auto">
                    {disputeDetails.description}
                  </div>
                </div>

                {/* Bukti dari Pembeli */}
                <div>
                  <p className="text-sm font-medium text-gray-800 mb-2">Bukti dari Pembeli:</p>
                  {renderEvidence(disputeDetails.buyerEvidence, 'Bukti Pembeli', '')}
                </div>

                <div className="flex items-center text-xs text-gray-600">
                  <CalendarIcon className="h-4 w-4 mr-1" />
                  Dilaporkan pada: {formatDate(disputeDetails.createdAt)}
                </div>
              </div>
            </div>

            {/* Pembelaan dari Penjual - KANAN */}
            {disputeDetails.hasSellerResponse ? (
              <div className="bg-white border border-gray-200 rounded-lg p-4 min-h-0">
                <h4 className="font-medium text-gray-900 mb-3 flex items-center">
                  <ShieldCheckIcon className="h-5 w-5 mr-2 text-gray-600" />
                  Pembelaan dari Penjual
                </h4>
                <div className="space-y-4">
                  {/* Pembelaan Text */}
                  {disputeDetails.sellerDefense && (
                    <div>
                      <p className="text-sm font-medium text-gray-800 mb-1">Pembelaan Penjual:</p>
                      <div className="text-sm text-gray-700 border p-3 rounded break-words whitespace-pre-wrap overflow-hidden max-h-40 overflow-y-auto">
                        {disputeDetails.sellerDefense}
                      </div>
                    </div>
                  )}

                  {/* Bukti dari Penjual */}
                  <div>
                    <p className="text-sm font-medium text-gray-800 mb-2">Bukti dari Penjual:</p>
                    {renderEvidence(disputeDetails.sellerEvidence, 'Bukti Penjual', '')}
                  </div>

                  <div className="flex items-center text-xs text-gray-600">
                    <CalendarIcon className="h-4 w-4 mr-1" />
                    Pembelaan dikirim pada: {formatDate(disputeDetails.createdAt)}
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-white border border-gray-200 rounded-lg p-4 min-h-0">
                <h4 className="font-medium text-gray-900 mb-2 flex items-center">
                  <ExclamationTriangleIcon className="h-5 w-5 mr-2 text-gray-600" />
                  Pembelaan Penjual
                </h4>
                <p className="text-sm text-gray-700 break-words">
                  Penjual belum memberikan pembelaan untuk sengketa ini.
                </p>
              </div>
            )}
          </div>

          {/* Keputusan Admin */}
          <div className="bg-white border border-gray-200 rounded-lg p-4">
            <h4 className="font-medium text-gray-900 mb-3 flex items-center">
              <ShieldCheckIcon className="h-5 w-5 mr-2 text-gray-600" />
              Keputusan Admin
            </h4>
            
            {/* Check if dispute is already resolved */}
            {disputeDetails.status === 'DIMENANGKAN_PEMBELI' || disputeDetails.status === 'DIMENANGKAN_PENJUAL' ? (
              <div className="bg-green-100 border border-green-300 rounded-lg p-4">
                <div className="flex items-center space-x-2 mb-2">
                  <ShieldCheckIcon className="h-5 w-5 text-green-600" />
                  <h5 className="font-medium text-green-800">✅ Sengketa Sudah Diselesaikan</h5>
                </div>
                <p className="text-sm text-green-700 mb-2 break-words">
                  {disputeDetails.status === 'DIMENANGKAN_PEMBELI' 
                    ? `Pembeli menang - Dana ${transaksi.escrowAmount || transaksi.produk?.hargaEth || 'N/A'} ETH telah dikembalikan ke pembeli`
                    : `Penjual menang - Dana ${transaksi.escrowAmount || transaksi.produk?.hargaEth || 'N/A'} ETH telah dikirim ke penjual`
                  }
                </p>
                {sengketa.resolvedAt && (
                  <p className="text-xs text-green-600 break-words">
                    Diselesaikan pada: {formatDate(sengketa.resolvedAt)}
                  </p>
                )}
                {sengketa.smartContractTxHash && (
                  <p className="text-xs text-green-600 mt-1 break-all">
                    Transaction Hash: 
                    <a 
                      href={`https://sepolia.etherscan.io/tx/${sengketa.smartContractTxHash}`}
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="ml-1 underline hover:text-green-800"
                    >
                      {sengketa.smartContractTxHash.substring(0, 10)}...
                    </a>
                  </p>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Refund ke Pembeli */}
                <button
                  onClick={() => onResolve('buyer')}
                  className="w-full bg-red-600 text-white py-3 px-4 rounded hover:bg-red-700 font-medium transition-colors"
                >
                  Refund ke Pembeli
                </button>

                {/* Bayar ke Penjual */}
                <button
                  onClick={() => onResolve('seller')}
                  className="w-full bg-green-600 text-white py-3 px-4 rounded hover:bg-green-700 font-medium transition-colors"
                >
                  Bayar ke Penjual
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Modal Image Viewer */}
      {showImageViewer && viewerImages.length > 0 && (
        <div className="fixed inset-0 bg-black bg-opacity-90 flex items-center justify-center z-[60] p-4">
          <div className="relative max-w-7xl max-h-full w-full h-full flex items-center justify-center">
            {/* Tombol Close */}
            <button
              onClick={() => setShowImageViewer(false)}
              className="absolute top-4 right-4 z-10 bg-black bg-opacity-50 text-white p-2 rounded-full hover:bg-opacity-70 transition-all"
              aria-label="Tutup"
            >
              <XMarkIcon className="w-6 h-6" />
            </button>

            {/* Tombol Previous */}
            {viewerImages.length > 1 && (
              <button
                onClick={prevImage}
                className="absolute left-4 top-1/2 transform -translate-y-1/2 z-10 bg-black bg-opacity-50 text-white p-3 rounded-full hover:bg-opacity-70 transition-all"
                aria-label="Gambar Sebelumnya"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
                </svg>
              </button>
            )}

            {/* Tombol Next */}
            {viewerImages.length > 1 && (
              <button
                onClick={nextImage}
                className="absolute right-4 top-1/2 transform -translate-y-1/2 z-10 bg-black bg-opacity-50 text-white p-3 rounded-full hover:bg-opacity-70 transition-all"
                aria-label="Gambar Selanjutnya"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
                </svg>
              </button>
            )}

            {/* Gambar Utama */}
            <div className="relative max-w-full max-h-full flex items-center justify-center">
              <img
                src={viewerImages[currentImageIndex]}
                alt={`Bukti Gambar ${currentImageIndex + 1}`}
                className="max-w-full max-h-full object-contain rounded-lg shadow-2xl"
                onError={(e) => {
                  console.log('❌ Gambar viewer gagal dimuat:', viewerImages[currentImageIndex]);
                  e.target.style.display = 'none';
                  e.target.nextElementSibling.style.display = 'flex';
                }}
              />
              <div 
                className="w-full h-64 flex flex-col items-center justify-center text-center bg-gray-800 rounded-lg"
                style={{ display: 'none' }}
              >
                <PhotoIcon className="h-16 w-16 text-gray-400 mx-auto mb-2" />
                <p className="text-gray-400 text-sm">Gambar tidak dapat dimuat</p>
              </div>
            </div>

            {/* Info Gambar */}
            <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 z-10">
              <div className="bg-black bg-opacity-50 text-white px-4 py-2 rounded-full text-sm">
                {currentImageIndex + 1} dari {viewerImages.length}
              </div>
            </div>

            {/* Thumbnail Navigation */}
            {viewerImages.length > 1 && (
              <div className="absolute bottom-16 left-1/2 transform -translate-x-1/2 z-10">
                <div className="flex space-x-2 bg-black bg-opacity-50 p-2 rounded-lg max-w-md overflow-x-auto">
                  {viewerImages.map((img, index) => (
                    <button
                      key={index}
                      onClick={() => setCurrentImageIndex(index)}
                      className={`flex-shrink-0 w-12 h-12 rounded overflow-hidden border-2 transition-all ${
                        index === currentImageIndex 
                          ? 'border-blue-500 opacity-100' 
                          : 'border-gray-500 opacity-60 hover:opacity-80'
                      }`}
                    >
                      <img
                        src={img}
                        alt={`Thumbnail ${index + 1}`}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          e.target.style.display = 'none';
                          e.target.nextElementSibling.style.display = 'flex';
                        }}
                      />
                      <div 
                        className="w-full h-full flex items-center justify-center bg-gray-700"
                        style={{ display: 'none' }}
                      >
                        <PhotoIcon className="h-4 w-4 text-gray-400" />
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Instruksi Keyboard */}
            <div className="absolute top-4 left-4 z-10 bg-black bg-opacity-50 text-white p-2 rounded text-xs">
              <div>ESC: Tutup</div>
              {viewerImages.length > 1 && (
                <>
                  <div>← →: Navigasi</div>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ModalDetailSengketaAdmin;