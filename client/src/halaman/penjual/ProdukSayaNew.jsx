import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../konteks/AuthContext';
import { apiService } from '../../layanan/api';
import { 
  PencilIcon,
  TrashIcon,
  EyeIcon,
  PlusIcon,
  CheckCircleIcon,
  XCircleIcon,
  DevicePhoneMobileIcon,
  ClockIcon,
  UserIcon,
  PhotoIcon,
  CurrencyDollarIcon,
  DocumentTextIcon,
  ExclamationTriangleIcon,
  ShieldCheckIcon
} from '@heroicons/react/24/outline';
import LineClamp from '../../komponen/LineClamp';
import ImageUploadSimple from '../../komponen/ImageUploadSimple';
import ProductImageGallery, { ProductImageCard } from '../../komponen/ProductImageGallery';
import { broadcastMarketplaceUpdate, broadcastProductCreated } from '../../hooks/useRealTimeUpdates';
import toast from 'react-hot-toast';

const ProdukSaya = () => {
  const navigate = useNavigate();
  const { user, isAuthenticated, loading: authLoading } = useAuth();
  const [produk, setProduk] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('semua'); // semua, aktif, terjual
  const [showAddModal, setShowAddModal] = useState(false);
  const [addLoading, setAddLoading] = useState(false);
  const [gamePopuler, setGamePopuler] = useState([]);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedProduk, setSelectedProduk] = useState(null);
  const [editingField, setEditingField] = useState(null); // 'deskripsi', 'judulProduk', 'harga'
  const [editData, setEditData] = useState({});
  const [updateLoading, setUpdateLoading] = useState(false);
  
  // Form data untuk tambah produk
  const [formData, setFormData] = useState({
    judulProduk: '',
    namaGame: '',
    deskripsi: '',
    hargaEth: '',
    gambar: [] // Changed to array for multiple images
  });
  const [priceInfo, setPriceInfo] = useState({
    idrAmount: 0,
    rates: null,
    suggestions: []
  });
  const [errors, setErrors] = useState({});

  // Template deskripsi berdasarkan game
  const gameTemplates = {
    'Mobile Legends': `Detail Akun Mobile Legends:
Level: [isi level akun]
Rank: [isi rank saat ini, contoh: Mythic Glory]
Total Heroes: [jumlah hero yang dimiliki]
Skins: [daftar skin yang dimiliki]
Emblem: [level emblem]
Server: [server game]
Binding: [Facebook/Google/Moonton]

Highlight:
[sebutkan keunggulan akun]
[item rare yang dimiliki]`,
    'Free Fire': `Detail Akun Free Fire:
Level: [isi level akun]
Rank: [isi rank saat ini]
Characters: [karakter yang dimiliki]
Skins/Bundles: [daftar skin dan bundle]
Diamonds: [jumlah diamond tersisa]
Server: [server game]

Highlight:
[sebutkan keunggulan akun]
[item rare yang dimiliki]`,
    'PUBG Mobile': `Detail Akun PUBG Mobile:
Level: [isi level akun]
Rank: [isi rank saat ini]
Tier: [tier achievement]
Skins: [daftar skin senjata dan outfit]
UC: [jumlah UC tersisa]
Server: [server game]

Highlight:
[sebutkan keunggulan akun]
[item rare yang dimiliki]`,
    'Genshin Impact': `Detail Akun Genshin Impact:
Adventure Rank: [AR level]
World Level: [WL level]
5-Star Characters: [daftar karakter 5 bintang]
5-Star Weapons: [daftar senjata 5 bintang]
Primogems: [jumlah primogems]
Server: [Asia/America/Europe/TW,HK,MO]

Highlight:
[sebutkan keunggulan akun]
[constellation dan refinement]`
  };

  // Redirect if not authenticated
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      toast.error('Anda harus login untuk mengakses halaman ini');
      navigate('/masuk');
      return;
    }
    
    if (!authLoading && isAuthenticated && user) {
      // Cek status aplikasi penjual terlebih dahulu
      checkSellerApplicationStatus();
    }
  }, [isAuthenticated, authLoading, user]);

  const checkSellerApplicationStatus = async () => {
    try {
      if (user.role !== 'PENJUAL') {
        toast.error('Anda harus menjadi penjual untuk mengakses halaman ini');
        navigate('/');
        return;
      }

      // Cek status aplikasi penjual
      const response = await apiService.aplikasiPenjual.getStatusAplikasi();
      if (response.data.data.status !== 'DISETUJUI') {
        toast.error('Aplikasi penjual Anda belum disetujui oleh admin');
        navigate('/status-aplikasi-penjual');
        return;
      }

      // Jika sudah disetujui, load data produk
      loadProdukSaya();
      loadGamePopuler();
      loadSuggestedPrices();
    } catch (error) {
      console.error('Error checking seller status:', error);
      toast.error('Gagal memeriksa status aplikasi penjual');
      navigate('/');
    }
  };

  const loadProdukSaya = async () => {
    try {
      setLoading(true);
      
      // Double check authentication
      if (!user || !isAuthenticated) {
        toast.error('Anda harus login untuk mengakses halaman ini');
        navigate('/masuk');
        return;
      }
      
      // Endpoint ini perlu ditambahkan di backend
      const response = await apiService.produk.getProdukPenjual();
      if (response.data.sukses) {
        setProduk(response.data.data.produk || []);
      }
    } catch (error) {
      console.error('Error loading produk:', error);
      toast.error('Gagal memuat produk');
    } finally {
      setLoading(false);
    }
  };

  const loadGamePopuler = async () => {
    try {
      const response = await apiService.produk.getAllProduk();
      if (response.data.sukses) {
        setGamePopuler(response.data.data.produk || []);
      }
    } catch (error) {
      console.error('Error loading game populer:', error);
    }
  };

  const loadSuggestedPrices = async () => {
    try {
      // Set default price suggestions
      setPriceInfo({
        idrAmount: 0,
        rates: { ethToIdr: 50000000 },
        suggestions: [
            { eth: '0.001', idrFormatted: 'Rp 50.000', label: 'Murah' },
            { eth: '0.005', idrFormatted: 'Rp 250.000', label: 'Sedang' },
            { eth: '0.01', idrFormatted: 'Rp 500.000', label: 'Mahal' }
        ]
      });
    } catch (error) {
      console.error('Error loading suggested prices:', error);
    }
  };

  // Konversi ETH ke IDR saat user mengetik
  const convertEthToIdr = async (ethAmount) => {
    if (!ethAmount || parseFloat(ethAmount) <= 0) {
      setPriceInfo(prev => ({ ...prev, idrAmount: 0 }));
      return;
    }
    try {
      // Temporary conversion - should be implemented in backend
      const ethToIdrRate = 50000000; // Approximate rate
      const idrAmount = parseFloat(ethAmount) * ethToIdrRate;
      setPriceInfo(prev => ({ 
        ...prev, 
        idrAmount: idrAmount 
      }));
    } catch (error) {
      console.error('Error converting ETH to IDR:', error);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };

  // Function untuk apply template deskripsi
  const applyTemplate = (gameName) => {
    if (gameTemplates[gameName]) {
      setFormData(prev => ({
        ...prev,
        deskripsi: gameTemplates[gameName]
      }));
      toast.success(`Template ${gameName} berhasil diterapkan!`);
    }
  };

  const validateForm = () => {
    const newErrors = {};
    if (!formData.judulProduk.trim()) {
      newErrors.judulProduk = 'Judul produk wajib diisi';
    } else if (formData.judulProduk.length < 10) {
      newErrors.judulProduk = 'Judul produk minimal 10 karakter';
    }
    if (!formData.namaGame.trim()) {
      newErrors.namaGame = 'Nama game wajib diisi';
    }
    if (!formData.hargaEth) {
      newErrors.hargaEth = 'Harga ETH wajib diisi';
    } else if (parseFloat(formData.hargaEth) < 0.001) {
      newErrors.hargaEth = 'Harga minimal 0.001 ETH';
    } else if (parseFloat(formData.hargaEth) > 10) {
      newErrors.hargaEth = 'Harga maksimal 10 ETH';
    }
    if (!formData.deskripsi.trim()) {
      newErrors.deskripsi = 'Deskripsi wajib diisi';
    } else if (formData.deskripsi.length < 50) {
      newErrors.deskripsi = 'Deskripsi minimal 50 karakter';
    }
    if (!formData.gambar || formData.gambar.length === 0) {
      newErrors.gambar = 'Minimal 1 screenshot akun wajib diupload';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleAddProduct = async (e) => {
    e.preventDefault();
    if (!validateForm()) {
      toast.error('Mohon lengkapi semua field yang wajib diisi');
      return;
    }

    try {
      setAddLoading(true);
      const response = await apiService.produk.createProduk({
        judulProduk: formData.judulProduk.trim(),
        namaGame: formData.namaGame.trim(),
        deskripsi: formData.deskripsi.trim(),
        hargaEth: parseFloat(formData.hargaEth),
        gambar: Array.isArray(formData.gambar) ? formData.gambar : []
      });

      if (response.data.sukses) {
        toast.success(response.data.pesan);
        
        // PERBAIKAN: Broadcast marketplace update ketika produk baru dibuat
        const updateData = {
          type: 'product-created',
          productId: response.data.data?.produk?.id,
          productCode: response.data.data?.produk?.kodeProduk,
          productTitle: formData.judulProduk,
          game: formData.namaGame,
          price: formData.hargaEth,
          timestamp: Date.now()
        };
        
        // Broadcast ke semua tab/window
        broadcastMarketplaceUpdate(updateData);
        
        // Broadcast event khusus untuk produk baru dengan utility function
        broadcastProductCreated(updateData);
        
        // Show success notification dengan detail
        toast.success(
          `Produk "${formData.judulProduk}" berhasil dipublikasikan!`, 
          { 
            duration: 4000,
            icon: '🎉'
          }
        );

        // Reset form dan tutup modal
        setFormData({
          judulProduk: '',
          namaGame: '',
          deskripsi: '',
          hargaEth: '',
          gambar: []
        });
        setShowAddModal(false);
        
        // Reload produk list
        loadProdukSaya();
      } else {
        toast.error(response.data.pesan || 'Gagal menambahkan produk');
      }
    } catch (error) {
      console.error('Error creating product:', error);
      const errorMessage = error.response?.data?.pesan || 'Gagal menambahkan produk';
      toast.error(errorMessage);
    } finally {
      setAddLoading(false);
    }
  };

  const handleEdit = (produkId) => {
    navigate(`/edit-produk/${produkId}`);
  };

  const handleDelete = async (produkId) => {
    if (!window.confirm('Yakin ingin menghapus produk ini?')) return;

    try {
      const response = await apiService.produk.deleteProduk(produkId);
      if (response.data.sukses) {
        toast.success('Produk berhasil dihapus');
        loadProdukSaya();
      }
    } catch (error) {
      toast.error('Gagal menghapus produk');
    }
  };

  
  const handleDetailClick = async (item) => {
    try {
      // Ambil data produk lengkap dari server untuk memastikan semua data ter-load
      const response = await apiService.produk.getProdukById(item.id);
      if (response.data.sukses) {
        const produkLengkap = response.data.data.produk;
        
        // Debug logging untuk memeriksa data catatan admin
        console.log('🔍 Debug - Data produk lengkap:', {
          id: produkLengkap.id,
          kodeProduk: produkLengkap.kodeProduk,
          statusProduk: produkLengkap.statusProduk,
          statusJual: produkLengkap.statusJual,
          nonaktifBy: produkLengkap.nonaktifBy,
          catatanAdmin: produkLengkap.catatanAdmin,
          adminNote: produkLengkap.adminNote, // Cek field alternatif
          catatan: produkLengkap.catatan, // Cek field alternatif
          note: produkLengkap.note // Cek field alternatif
        });
        
        setSelectedProduk(produkLengkap);
      } else {
        // Fallback ke data item jika gagal ambil data lengkap
        console.log('🔍 Debug - Fallback ke data item:', {
          id: item.id,
          kodeProduk: item.kodeProduk,
          statusProduk: item.statusProduk,
          statusJual: item.statusJual,
          nonaktifBy: item.nonaktifBy,
          catatanAdmin: item.catatanAdmin,
          adminNote: item.adminNote,
          catatan: item.catatan,
          note: item.note
        });
        setSelectedProduk(item);
      }
    } catch (error) {
      console.error('❌ Error loading detail produk:', error);
      // Fallback ke data item jika error
      console.log('🔍 Debug - Error fallback ke data item:', {
        id: item.id,
        kodeProduk: item.kodeProduk,
        statusProduk: item.statusProduk,
        statusJual: item.statusJual,
        nonaktifBy: item.nonaktifBy,
        catatanAdmin: item.catatanAdmin
      });
      setSelectedProduk(item);
    }
    
    setShowDetailModal(true);
    setEditingField(null);
    setEditData({});
  };

  
  const handleSaveField = async (field) => {
    try {
      setUpdateLoading(true);
      
      const updateData = {};
      if (field === 'deskripsi') {
        updateData.deskripsi = editData.deskripsi;
      } else if (field === 'judulProduk') {
        updateData.judulProduk = editData.judulProduk;
      } else if (field === 'harga') {
        updateData.hargaEth = parseFloat(editData.hargaEth);
      }

      const response = await apiService.produk.updateProduk(selectedProduk.id, updateData);
      
      if (response.data.sukses) {
        toast.success(`${field === 'deskripsi' ? 'Deskripsi' : field === 'judulProduk' ? 'Judul' : 'Harga'} berhasil diperbarui!`);
        
        // Update selectedProduk dengan data baru
        setSelectedProduk(prev => ({
          ...prev,
          ...updateData
        }));
        
        // Reset editing state
        setEditingField(null);
        setEditData({});
        
        // Refresh produk list
        loadProdukSaya();
      } else {
        toast.error(response.data.pesan || 'Gagal memperbarui data');
      }
    } catch (error) {
      console.error('Error updating field:', error);
      toast.error('Gagal memperbarui data: ' + (error.response?.data?.pesan || error.message));
    } finally {
      setUpdateLoading(false);
    }
  };

  const filteredProduk = produk.filter(p => {
    if (filter === 'aktif') return p.statusProduk === 'AKTIF';
    if (filter === 'terjual') return p.statusProduk === 'TERJUAL';
    return true; // semua
  });

  const formatRupiah = (amount) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  const formatTanggal = (dateString) => {
    return new Date(dateString).toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'AKTIF':
        return 'Aktif';
      case 'TERJUAL':
        return 'Terjual';
      case 'PENDING':
        return 'Pending';
      case 'DITOLAK':
        return 'Ditolak';
      default:
        return '';
    }
  };

  // Show loading while checking authentication or loading data
  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto mb-4"></div>
          <p className="text-gray-600">
            {authLoading ? 'Memeriksa autentikasi...' : 'Memuat produk Anda...'}
          </p>
        </div>
      </div>
    );
  }
  
  // If not authenticated after loading, this should not render (useEffect will redirect)
  if (!isAuthenticated || !user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-6">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Produk Saya</h1>
              <p className="text-gray-600">Kelola semua produk yang Anda jual</p>
            </div>
            <button
              onClick={() => setShowAddModal(true)}
              className="inline-flex items-center px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 transition-colors text-sm"
            >
              <PlusIcon className="h-4 w-4 mr-2" />
              Tambah Produk
            </button>
          </div>
        </div>

        {/* Filter */}
        <div className="mb-6">
          <div className="flex space-x-3">
            {[
              { key: 'semua', label: 'Semua', count: produk.length },
              { key: 'aktif', label: 'Aktif', count: produk.filter(p => p.statusProduk === 'AKTIF').length },
              { key: 'terjual', label: 'Terjual', count: produk.filter(p => p.statusProduk === 'TERJUAL').length }
            ].map(item => (
              <button
                key={item.key}
                onClick={() => setFilter(item.key)}
                className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                  filter === item.key
                    ? 'bg-primary-600 text-white'
                    : 'bg-white text-gray-700 hover:bg-gray-50'
                }`}
              >
                {item.label} ({item.count})
              </button>
            ))}
          </div>
        </div>

        {/* Produk List */}
        {filteredProduk.length === 0 ? (
          <div className="bg-white rounded-lg shadow-sm p-8 text-center">
            <div className="text-gray-400 mb-4">
              <svg className="mx-auto h-10 w-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2M4 13h2m13-8V4a1 1 0 00-1-1H7a1 1 0 00-1 1v1m8 0V4a1 1 0 00-1-1H9a1 1 0 00-1 1v1" />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">Belum ada produk</h3>
            <p className="text-gray-500 mb-4">Mulai jual akun game Anda sekarang!</p>
            <button
              onClick={() => setShowAddModal(true)}
              className="inline-flex items-center px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700"
            >
              <PlusIcon className="h-4 w-4 mr-2" />
              Tambah Produk Pertama
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {filteredProduk.map((item) => (
              <div
                key={item.id}
                className="bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow overflow-hidden group cursor-pointer"
              >
                <div className="relative">
                  <ProductImageCard
                    imageData={item.gambar}
                    productName={item.judulProduk}
                    size="small"
                    showImageCount={true}
                    className="group-hover:scale-105 transition-transform duration-300"
                  />
                  <div className="absolute top-1.5 left-1.5">
                    <span className="bg-primary-600 text-white text-xs px-1.5 py-0.5 rounded text-[10px]">
                      {item.kodeProduk}
                    </span>
                  </div>
                  {/* Status Badge */}
                  <div className="absolute top-1.5 right-1.5">
                    {(() => {
                      if (item.statusProduk === 'TERJUAL') {
                        return (
                          <span className="bg-red-100 text-red-800 text-xs px-1.5 py-0.5 rounded-full font-medium text-[10px]">
                            Terjual
                          </span>
                        );
                      } else if (item.statusProduk === 'AKTIF') {
                        return (
                          <span className="bg-green-100 text-green-800 text-xs px-1.5 py-0.5 rounded-full font-medium text-[10px]">
                            Aktif
                          </span>
                        );
                      } else if (item.statusProduk === 'PENDING') {
                        return (
                          <span className="bg-yellow-100 text-yellow-800 text-xs px-1.5 py-0.5 rounded-full font-medium text-[10px]">
                            Pending
                          </span>
                        );
                      } else if (item.statusProduk === 'DITOLAK') {
                        return (
                          <span className="bg-red-100 text-red-800 text-xs px-1.5 py-0.5 rounded-full font-medium text-[10px]">
                            Ditolak
                          </span>
                        );
                      } else {
                        return (
                          <span className="bg-gray-100 text-gray-800 text-xs px-1.5 py-0.5 rounded-full font-medium text-[10px]">
                            Unknown
                          </span>
                        );
                      }
                    })()}
                  </div>
                </div>
                <div className="p-3">
                  <div className="flex items-center text-xs text-gray-500 mb-1">
                    <DevicePhoneMobileIcon className="h-3 w-3 mr-1" />
                    <span>{item.namaGame}</span>
                  </div>
                  <LineClamp lines={2} className="font-semibold text-gray-900 mb-2 group-hover:text-primary-600 transition-colors text-sm">
                    {item.judulProduk}
                  </LineClamp>
                  <div className="flex justify-between items-center mb-2">
                    <div>
                      <div className="text-sm font-bold text-primary-600">
                        {item.hargaEth ? `${item.hargaEth} ETH` : 'N/A'}
                      </div>
                      <div className="text-xs text-gray-500">
                        ≈ {formatRupiah(item.harga || 0)}
                      </div>
                    </div>
                    <div className="text-xs text-gray-500 flex items-center">
                      <ClockIcon className="h-3 w-3 mr-1" />
                      {formatTanggal(item.dibuatPada || new Date().toISOString())}
                    </div>
                  </div>
                  <div className="mb-3 pt-2 border-t border-gray-100 flex items-center text-xs text-gray-500">
                    <UserIcon className="h-3 w-3 mr-1" />
                    <span>Produk Anda</span>
                  </div>
                  
                  {/* Actions - Khusus untuk halaman Produk Saya */}
                  <div className="space-y-2">
                    <div className="flex space-x-1">
                      <button
                        onClick={() => handleDetailClick(item)}
                        className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors flex items-center justify-center"
                      >
                        <EyeIcon className="h-4 w-4 mr-2" />
                        Detail
                      </button>
                      <button
                        onClick={() => handleEdit(item.id)}
                        className="flex-1 inline-flex items-center justify-center px-2 py-1.5 border border-gray-300 text-xs font-medium rounded text-gray-700 bg-white hover:bg-gray-50 transition-colors"
                      >
                        <PencilIcon className="h-3 w-3 mr-1" />
                        Edit
                      </button>
                    </div>
                    
                    {/* Action Buttons */}
                    {(() => {
                      if (item.statusProduk === 'TERJUAL') {
                        return (
                          <div className="text-center py-1.5 bg-gray-50 rounded text-xs text-gray-600 font-medium">
                            Produk sudah terjual
                          </div>
                        );
                      } else if (item.statusProduk === 'PENDING') {
                        return (
                          <div className="text-center py-1.5 bg-yellow-50 rounded text-xs text-yellow-600 font-medium">
                            Menunggu persetujuan admin
                          </div>
                        );
                      } else if (item.statusProduk === 'DITOLAK') {
                        return (
                          <div className="text-center py-1.5 bg-red-50 rounded text-xs text-red-600 font-medium">
                            Ditolak oleh admin
                          </div>
                        );
                      } else {
                        return (
                          <div className="flex space-x-1">
                            <button
                              onClick={() => handleDelete(item.id)}
                              className="w-full px-2 py-1.5 text-xs font-medium rounded text-red-700 bg-red-100 hover:bg-red-200 transition-colors flex items-center justify-center"
                            >
                              <TrashIcon className="h-3 w-3 mr-1" />
                              Hapus
                            </button>
                          </div>
                        );
                      }
                    })()}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal Tambah Produk */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-semibold text-gray-900">
                  Tambah Produk Baru
                </h3>
                <button
                  onClick={() => setShowAddModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <form onSubmit={handleAddProduct} className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Form */}
                <div className="lg:col-span-2 space-y-6">
                  {/* Judul Produk */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Judul Produk *
                    </label>
                    <input
                      type="text"
                      name="judulProduk"
                      value={formData.judulProduk}
                      onChange={handleInputChange}
                      placeholder="Contoh: Akun ML Mythic Glory Full Skin Rare"
                      className={`w-full px-3 py-2 border rounded-md focus:ring-primary-500 focus:border-primary-500 ${
                        errors.judulProduk ? 'border-red-300' : 'border-gray-300'
                      }`}
                    />
                    {errors.judulProduk && (
                      <p className="mt-1 text-sm text-red-600">{errors.judulProduk}</p>
                    )}
                    <p className="mt-1 text-sm text-gray-500">
                      Buat judul yang menarik dan deskriptif ({formData.judulProduk.length}/100)
                    </p>
                  </div>

                  {/* Nama Game */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Nama Game *
                    </label>
                    <input
                      type="text"
                      name="namaGame"
                      value={formData.namaGame}
                      onChange={handleInputChange}
                      placeholder="Contoh: Mobile Legends"
                      className={`w-full px-3 py-2 border rounded-md focus:ring-primary-500 focus:border-primary-500 ${
                        errors.namaGame ? 'border-red-300' : 'border-gray-300'
                      }`}
                      list="game-suggestions"
                    />
                    <datalist id="game-suggestions">
                      {gamePopuler.map((game, index) => (
                        <option key={`game-option-${index}-${game.namaGame}`} value={game.namaGame} />
                      ))}
                      <option value="Mobile Legends" />
                      <option value="PUBG Mobile" />
                      <option value="Free Fire" />
                      <option value="Genshin Impact" />
                      <option value="Call of Duty Mobile" />
                    </datalist>
                    {errors.namaGame && (
                      <p className="mt-1 text-sm text-red-600">{errors.namaGame}</p>
                    )}
                  </div>

                  {/* Harga ETH */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Harga dalam ETH (Sepolia) *
                    </label>
                    <div className="space-y-3">
                      {/* Input ETH */}
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                          <span className="text-gray-500 sm:text-sm">ETH</span>
                        </div>
                        <input
                          type="number"
                          name="hargaEth"
                          value={formData.hargaEth}
                          onChange={(e) => {
                            handleInputChange(e);
                            convertEthToIdr(e.target.value);
                          }}
                          placeholder="0.001"
                          step="0.001"
                          min="0.001"
                          max="10"
                          className={`w-full pl-12 pr-3 py-2 border rounded-md focus:ring-primary-500 focus:border-primary-500 ${
                            errors.hargaEth ? 'border-red-300' : 'border-gray-300'
                          }`}
                        />
                      </div>
                      {/* Konversi ke Rupiah */}
                      {priceInfo.idrAmount > 0 && (
                        <div className="bg-blue-50 p-3 rounded-md">
                          <p className="text-sm text-blue-700">
                            ≈ {new Intl.NumberFormat('id-ID', {
                              style: 'currency',
                              currency: 'IDR',
                              minimumFractionDigits: 0,
                              maximumFractionDigits: 0
                            }).format(priceInfo.idrAmount)}
                          </p>
                        </div>
                      )}
                      {/* Suggested Prices */}
                      {priceInfo.suggestions.length > 0 && (
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                          {priceInfo.suggestions.map((suggestion, index) => (
                            <button
                              key={index}
                              type="button"
                              onClick={() => {
                                setFormData(prev => ({ ...prev, hargaEth: suggestion.eth }));
                                convertEthToIdr(suggestion.eth);
                              }}
                              className="text-xs bg-gray-100 hover:bg-gray-200 px-2 py-1 rounded border text-center transition-colors"
                            >
                              <div className="font-medium">{suggestion.eth} ETH</div>
                              <div className="text-gray-600">{suggestion.idrFormatted}</div>
                              <div className="text-gray-500">({suggestion.label})</div>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                    {errors.hargaEth && (
                      <p className="mt-1 text-sm text-red-600">{errors.hargaEth}</p>
                    )}
                    <p className="mt-1 text-sm text-gray-500">
                      Harga minimal 0.001 ETH, maksimal 10 ETH
                    </p>
                  </div>

                  {/* Upload Gambar */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Screenshot Akun * (Hingga 5 gambar)
                    </label>
                    <ImageUploadSimple
                      maxFiles={5}
                      currentImages={Array.isArray(formData.gambar) ? formData.gambar : []}
                      onUploadSuccess={(urls) => {
                        setFormData(prev => ({
                          ...prev,
                          gambar: urls // Store all image URLs as array
                        }));
                      }}
                      onUploadError={(error) => {
                        console.error('Upload error:', error);
                      }}
                      className="w-full"
                    />
                    {errors.gambar && (
                      <p className="mt-1 text-sm text-red-600">{errors.gambar}</p>
                    )}
                    <p className="mt-1 text-sm text-gray-500">
                      Upload hingga 5 screenshot akun game Anda. Gambar yang jelas akan menarik lebih banyak pembeli.
                    </p>
                  </div>

                  {/* Deskripsi */}
                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <label className="block text-sm font-medium text-gray-700">
                        Deskripsi Detail *
                      </label>
                      {formData.namaGame && gameTemplates[formData.namaGame] && (
                        <button
                          type="button"
                          onClick={() => applyTemplate(formData.namaGame)}
                          className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded hover:bg-blue-200 transition-colors"
                        >
                          📋 Gunakan Template {formData.namaGame}
                        </button>
                      )}
                    </div>
                    {/* Template Quick Buttons */}
                    {!formData.deskripsi && (
                      <div className="mb-3">
                        <p className="text-xs text-gray-500 mb-2">Template cepat:</p>
                        <div className="flex flex-wrap gap-2">
                          {Object.keys(gameTemplates).map((game, index) => (
                            <button
                              key={`template-${index}-${game}`}
                              type="button"
                              onClick={() => applyTemplate(game)}
                              className="text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded hover:bg-gray-200 transition-colors"
                            >
                              {game}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                    <textarea
                      name="deskripsi"
                      value={formData.deskripsi}
                      onChange={handleInputChange}
                      rows={8}
                      placeholder="Jelaskan detail akun Anda:&#10;Level/Rank&#10;Hero/Character yang dimiliki&#10;Skin yang ada&#10;Server&#10;Binding akun&#10;dll"
                      className={`w-full px-3 py-2 border rounded-md focus:ring-primary-500 focus:border-primary-500 ${
                        errors.deskripsi ? 'border-red-300' : 'border-gray-300'
                      }`}
                    />
                    {errors.deskripsi && (
                      <p className="mt-1 text-sm text-red-600">{errors.deskripsi}</p>
                    )}
                    <p className="mt-1 text-sm text-gray-500">
                      Jelaskan detail akun dengan lengkap ({formData.deskripsi.length}/1000)
                    </p>
                  </div>
                </div>

                {/* Sidebar Preview */}
                <div className="lg:col-span-1">
                  <div className="bg-gray-50 rounded-lg p-4 sticky top-4">
                    <h4 className="text-lg font-semibold text-gray-900 mb-4">Preview Produk</h4>
                    <div className="border rounded-lg p-4 bg-white">
                      {/* Preview Image Gallery */}
                      <ProductImageCard
                        imageData={formData.gambar}
                        productName={formData.judulProduk || 'Judul Produk Anda'}
                        size="small"
                        showImageCount={true}
                        className="mb-3"
                      />
                      
                      {/* Preview Content */}
                      <div className="space-y-2">
                        <div className="text-sm font-medium text-gray-900">
                          {formData.judulProduk || 'Judul Produk Anda'}
                        </div>
                        <div className="text-xs text-gray-500">
                          {formData.namaGame || 'Nama Game'}
                        </div>
                        <div className="flex justify-between items-center">
                          <div>
                            <div className="text-lg font-bold text-primary-600">
                              {formData.hargaEth ? `${formData.hargaEth} ETH` : '0.000 ETH'}
                            </div>
                            {priceInfo.idrAmount > 0 && (
                              <div className="text-xs text-gray-500">
                                ≈ {new Intl.NumberFormat('id-ID', {
                                  style: 'currency',
                                  currency: 'IDR',
                                  minimumFractionDigits: 0,
                                  maximumFractionDigits: 0
                                }).format(priceInfo.idrAmount)}
                              </div>
                            )}
                          </div>
                        </div>
                        {formData.deskripsi && (
                          <div className="text-xs text-gray-600 mt-2 line-clamp-3">
                            {formData.deskripsi.substring(0, 100)}...
                          </div>
                        )}
                      </div>
                    </div>
                    {/* Completion Progress */}
                    <div className="mt-4">
                      <div className="flex justify-between text-sm mb-2">
                        <span className="text-gray-600">Kelengkapan</span>
                        <span className="text-gray-900 font-medium">
                          {Math.round(
                            [formData.judulProduk, formData.namaGame, formData.hargaEth, formData.deskripsi, formData.gambar]
                              .filter(Boolean).length / 5 * 100
                          )}%
                        </span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div 
                          className="bg-primary-600 h-2 rounded-full transition-all duration-300"
                          style={{
                            width: `${[formData.judulProduk, formData.namaGame, formData.hargaEth, formData.deskripsi, formData.gambar]
                              .filter(Boolean).length / 5 * 100}%`
                          }}
                        ></div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Submit Buttons */}
                <div className="lg:col-span-3 flex justify-end space-x-4 pt-6 border-t">
                  <button
                    type="button"
                    onClick={() => setShowAddModal(false)}
                    className="px-6 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition-colors"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    disabled={addLoading}
                    className="px-6 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center space-x-2"
                  >
                    {addLoading ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                        <span>Menyimpan...</span>
                      </>
                    ) : (
                      <>
                        <DevicePhoneMobileIcon className="h-4 w-4" />
                        <span>Tambah Produk</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Modal Detail Produk dengan 5 Gambar */}
      {showDetailModal && selectedProduk && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto shadow-2xl">
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-semibold text-gray-900">
                  Detail Produk - {selectedProduk.kodeProduk}
                </h3>
                <button
                  onClick={() => setShowDetailModal(false)}
                  className="text-gray-400 hover:text-red-500 text-2xl font-bold px-2"
                  aria-label="Tutup"
                >
                  ×
                </button>
              </div>
              
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Left Side - Product Image Gallery */}
                <div className="space-y-4">
                  {/* Product Image Gallery dengan 5 gambar */}
                  <ProductImageGallery
                    imageData={selectedProduk.gambar}
                    productName={selectedProduk.judulProduk}
                    size="medium"
                    showThumbnails={true}
                    thumbnailCount={5}
                    aspectRatio="aspect-square"
                  />

                  {/* Informasi Produk */}
                  <div className="bg-white rounded-lg p-3 shadow-sm border">
                    <div className="text-xs text-gray-500 mb-2">Informasi Produk</div>
                    <div className="space-y-1 text-xs">
                      <div className="flex justify-between">
                        <span className="text-gray-600">Status:</span>
                        <span className={`font-medium ${
                          selectedProduk.statusProduk === 'AKTIF' ? 'text-green-600' : 
                          selectedProduk.statusProduk === 'TERJUAL' ? 'text-red-600' : 
                          selectedProduk.statusProduk === 'PENDING' ? 'text-yellow-600' :
                          selectedProduk.statusProduk === 'DITOLAK' ? 'text-red-600' :
                          'text-gray-600'
                        }`}>
                          {selectedProduk.statusProduk === 'TERJUAL' ? 'Terjual' :
                           selectedProduk.statusProduk === 'AKTIF' ? 'Aktif' :
                           selectedProduk.statusProduk === 'PENDING' ? 'Pending' :
                           selectedProduk.statusProduk === 'DITOLAK' ? 'Ditolak' : 'Unknown'}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Diposting:</span>
                        <span className="font-medium text-gray-900">{formatTanggal(selectedProduk.dibuatPada || new Date().toISOString())}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Kategori:</span>
                        <span className="font-medium text-gray-900">{selectedProduk.namaGame}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Right Side */}
                <div className="space-y-4">
                  {/* Title & Game Info */}
                  <div>
                    <h1 className="text-2xl font-bold text-gray-900 leading-tight">
                      {selectedProduk.judulProduk}
                    </h1>
                    <div className="text-gray-600 text-base mt-1">{selectedProduk.namaGame}</div>
                    <div className="text-primary-600 text-sm font-semibold mt-0.5">
                      Kode Akun: {selectedProduk.kodeProduk}
                    </div>
                  </div>

                  {/* Description Box */}
                  <div className="border border-gray-200 rounded-lg p-4">
                    <div className="font-semibold text-gray-900 mb-3 text-sm uppercase tracking-wide">
                      DESKRIPSI
                    </div>
                    <div className="text-sm text-gray-700">
                      <div className="whitespace-pre-wrap leading-relaxed min-h-[100px]">
                        {selectedProduk.deskripsi ? (
                          selectedProduk.deskripsi
                        ) : (
                          <span className="text-gray-500 italic">Belum ada deskripsi untuk produk ini.</span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Price Section */}
                  <div className="py-3">
                    <div className="flex items-center justify-between border-b border-gray-200 pb-2 mb-2">
                      <span className="text-gray-700 font-medium">Harga</span>
                      <span className="text-lg font-bold text-primary-600">
                        {selectedProduk.hargaEth ? `${selectedProduk.hargaEth} ETH` : '0.1 ETH'}
                      </span>
                    </div>
                    <div className="text-right text-gray-600">
                      ≈ {formatRupiah(selectedProduk.harga || 2000000)}
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="space-y-3 pt-4">
                    {(() => {
                      if (selectedProduk.statusProduk === 'TERJUAL') {
                        return (
                          <div className="grid grid-cols-1 gap-3">
                            <div className="bg-gray-200 text-gray-500 px-6 py-3 rounded-lg font-semibold text-sm text-center">
                              PRODUK TERJUAL
                            </div>
                          </div>
                        );
                      } else if (selectedProduk.statusProduk === 'PENDING') {
                        return (
                          <div className="grid grid-cols-1 gap-3">
                            <div className="bg-yellow-200 text-yellow-700 px-6 py-3 rounded-lg font-semibold text-sm text-center">
                              MENUNGGU PERSETUJUAN ADMIN
                            </div>
                          </div>
                        );
                      } else if (selectedProduk.statusProduk === 'DITOLAK') {
                        return (
                          <div className="grid grid-cols-1 gap-3">
                            <div className="bg-red-200 text-red-700 px-6 py-3 rounded-lg font-semibold text-sm text-center">
                              DITOLAK OLEH ADMIN
                            </div>
                          </div>
                        );
                      } else {
                        return (
                          <div className="space-y-3">
                            <div className="grid grid-cols-2 gap-3">
                              <button
                                onClick={() => setShowDetailModal(false)}
                                className="bg-gray-200 text-gray-700 px-6 py-3 rounded-lg font-semibold hover:bg-gray-300 transition-colors text-sm"
                              >
                                BATAL
                              </button>
                              <button
                                onClick={() => {
                                  setShowDetailModal(false);
                                  handleEdit(selectedProduk.id);
                                }}
                                className="bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-blue-700 transition-colors text-sm"
                              >
                                EDIT
                              </button>
                            </div>
                            <div className="grid grid-cols-1 gap-3">
                              <button
                                onClick={() => {
                                  setShowDetailModal(false);
                                  handleDelete(selectedProduk.id);
                                }}
                                className="bg-red-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-red-700 transition-colors text-sm"
                              >
                                HAPUS PRODUK
                              </button>
                            </div>
                          </div>
                        );
                      }
                    })()}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProdukSaya;