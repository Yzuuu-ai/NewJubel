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
import ConfirmationModal from '../../komponen/ConfirmationModal';
import { broadcastMarketplaceUpdate, broadcastProductCreated } from '../../hooks/useRealTimeUpdates';
import { useCurrencyConverter } from '../../hooks/useEthPrice';
import toast from 'react-hot-toast';

const ProdukSaya = () => {
  const navigate = useNavigate();
  const { user, isAuthenticated, loading: authLoading } = useAuth();
  
  // Currency converter hook
  const {
    rate: ethToIdrRate,
    convertEthToIdr,
    convertIdrToEth,
    formatEthPrice,
    formatIdrPrice,
    isLoading: priceLoading,
    error: priceError
  } = useCurrencyConverter();
  
  const [produk, setProduk] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('semua'); // semua, aktif, terjual
  const [showAddModal, setShowAddModal] = useState(false);
  const [addLoading, setAddLoading] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editLoading, setEditLoading] = useState(false);
  const [editProduk, setEditProduk] = useState(null);
  const [editFormData, setEditFormData] = useState({
    judulProduk: '',
    namaGame: '',
    deskripsi: '',
    hargaEth: '',
    gambar: [],
    statusJual: true
  });
  const [editErrors, setEditErrors] = useState({});
  const [hasUnsavedEditImages, setHasUnsavedEditImages] = useState(false);
  const [currencyMode, setCurrencyMode] = useState('ETH'); // 'ETH' or 'IDR'
  const [editCurrencyMode, setEditCurrencyMode] = useState('ETH'); // for edit modal
  const [gamePopuler, setGamePopuler] = useState([]);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedProduk, setSelectedProduk] = useState(null);
  const [editingField, setEditingField] = useState(null); // 'deskripsi', 'judulProduk', 'harga'
  const [editData, setEditData] = useState({});
  const [updateLoading, setUpdateLoading] = useState(false);
  
  // State untuk image viewer
  const [showImageViewer, setShowImageViewer] = useState(false);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [viewerImages, setViewerImages] = useState([]);
  
  // State untuk confirmation modal
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [productToDelete, setProductToDelete] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  
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

  // Load data when component mounts (role validation handled by PenjualRoute)
  useEffect(() => {
    if (!authLoading && isAuthenticated && user) {
      loadProdukSaya();
      loadGamePopuler();
      loadSuggestedPrices();
    }
  }, [isAuthenticated, authLoading, user, ethToIdrRate, formatIdrPrice]);

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
      // Set price suggestions using real-time rate
      const currentRate = ethToIdrRate || 68300000;
      setPriceInfo({
        idrAmount: 0,
        rates: { ethToIdr: currentRate },
        suggestions: [
            { eth: '0.001', idrFormatted: formatIdrPrice(0.001 * currentRate), label: 'Murah' },
            { eth: '0.005', idrFormatted: formatIdrPrice(0.005 * currentRate), label: 'Sedang' },
            { eth: '0.01', idrFormatted: formatIdrPrice(0.01 * currentRate), label: 'Mahal' }
        ]
      });
    } catch (error) {
      console.error('Error loading suggested prices:', error);
    }
  };

  // Konversi ETH ke IDR saat user mengetik
  const handleEthToIdrConversion = async (ethAmount) => {
    if (!ethAmount || parseFloat(ethAmount) <= 0) {
      setPriceInfo(prev => ({ ...prev, idrAmount: 0 }));
      return;
    }
    try {
      const idrAmount = convertEthToIdr(parseFloat(ethAmount));
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

  const convertCurrency = (value, fromMode, toMode) => {
    if (!value || value === '') return '';
    const numValue = parseFloat(value);
    if (isNaN(numValue)) return '';
    
    if (fromMode === 'ETH' && toMode === 'IDR') {
      return convertEthToIdr(numValue).toString();
    } else if (fromMode === 'IDR' && toMode === 'ETH') {
      return convertIdrToEth(numValue).toFixed(6);
    }
    return value;
  };

  const handleCurrencyToggle = (currentMode, setMode, currentValue, setFormData, fieldName) => {
    const newMode = currentMode === 'ETH' ? 'IDR' : 'ETH';
    const convertedValue = convertCurrency(currentValue, currentMode, newMode);
    
    setMode(newMode);
    setFormData(prev => ({
      ...prev,
      [fieldName]: convertedValue
    }));
  };

  const handleEditInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setEditFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
    // Clear error when user starts typing
    if (editErrors[name]) {
      setEditErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };

  const validateEditForm = () => {
    const newErrors = {};
    if (!editFormData.judulProduk.trim()) {
      newErrors.judulProduk = 'Judul produk wajib diisi';
    }
    if (!editFormData.namaGame.trim()) {
      newErrors.namaGame = 'Nama game wajib diisi';
    }
    if (!editFormData.hargaEth) {
      newErrors.hargaEth = 'Harga wajib diisi';
    } else {
      const hargaValue = parseFloat(editFormData.hargaEth);
      if (editCurrencyMode === 'ETH') {
        if (hargaValue < 0.001) {
          newErrors.hargaEth = 'Harga minimal 0.001 ETH';
        } else if (hargaValue > 10) {
          newErrors.hargaEth = 'Harga maksimal 10 ETH';
        }
      } else { // IDR mode
        const currentRate = ethToIdrRate || 68300000;
        const minIdr = Math.round(0.001 * currentRate);
        const maxIdr = Math.round(10 * currentRate);
        if (hargaValue < minIdr) {
          newErrors.hargaEth = `Harga minimal ${formatIdrPrice(minIdr)}`;
        } else if (hargaValue > maxIdr) {
          newErrors.hargaEth = `Harga maksimal ${formatIdrPrice(maxIdr)}`;
        }
      }
    }
    if (!editFormData.deskripsi.trim()) {
      newErrors.deskripsi = 'Deskripsi wajib diisi';
    } else if (editFormData.deskripsi.length > 500) {
      newErrors.deskripsi = 'Deskripsi maksimal 500 karakter';
    }
    setEditErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleEditProduct = async (e) => {
    e.preventDefault();
    if (!validateEditForm()) {
      toast.error('Mohon lengkapi semua field yang wajib diisi');
      return;
    }

    try {
      setEditLoading(true);
      
      // Prepare image data for submission
      let gambarData = null;
      if (editFormData.gambar) {
        if (Array.isArray(editFormData.gambar)) {
          gambarData = editFormData.gambar.length > 0 ? editFormData.gambar : null;
        } else {
          gambarData = [editFormData.gambar];
        }
      }

      // Convert to ETH if currently in IDR mode
      let hargaEthValue = editFormData.hargaEth;
      if (editCurrencyMode === 'IDR') {
        hargaEthValue = convertCurrency(editFormData.hargaEth, 'IDR', 'ETH');
      }

      const response = await apiService.produk.updateProduk(editProduk.id, {
        judulProduk: editFormData.judulProduk.trim(),
        namaGame: editFormData.namaGame.trim(),
        deskripsi: editFormData.deskripsi.trim(),
        hargaEth: parseFloat(hargaEthValue),
        gambar: gambarData,
        statusJual: editFormData.statusJual
      });

      if (response.data.sukses) {
        setHasUnsavedEditImages(false);
        toast.success('Produk berhasil diperbarui!');
        setShowEditModal(false);
        setEditProduk(null);
        
        // Reset form
        setEditFormData({
          judulProduk: '',
          namaGame: '',
          deskripsi: '',
          hargaEth: '',
          gambar: [],
          statusJual: true
        });
        
        // Reload produk list
        loadProdukSaya();
      } else {
        toast.error(response.data.pesan || 'Gagal memperbarui produk');
      }
    } catch (error) {
      console.error('Error updating product:', error);
      const errorMessage = error.response?.data?.pesan || 'Gagal memperbarui produk';
      toast.error(errorMessage);
    } finally {
      setEditLoading(false);
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
      newErrors.hargaEth = 'Harga wajib diisi';
    } else {
      const hargaValue = parseFloat(formData.hargaEth);
      if (currencyMode === 'ETH') {
        if (hargaValue < 0.001) {
          newErrors.hargaEth = 'Harga minimal 0.001 ETH';
        } else if (hargaValue > 10) {
          newErrors.hargaEth = 'Harga maksimal 10 ETH';
        }
      } else { // IDR mode
        const currentRate = ethToIdrRate || 68300000;
        const minIdr = Math.round(0.001 * currentRate);
        const maxIdr = Math.round(10 * currentRate);
        if (hargaValue < minIdr) {
          newErrors.hargaEth = `Harga minimal ${formatIdrPrice(minIdr)}`;
        } else if (hargaValue > maxIdr) {
          newErrors.hargaEth = `Harga maksimal ${formatIdrPrice(maxIdr)}`;
        }
      }
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

  // Function to calculate completion percentage for add product form
  const calculateCompletionPercentage = () => {
    const fields = [
      { field: 'judulProduk', weight: 20 },
      { field: 'namaGame', weight: 15 },
      { field: 'hargaEth', weight: 20 },
      { field: 'gambar', weight: 25 },
      { field: 'deskripsi', weight: 20 }
    ];
    
    let totalScore = 0;
    
    fields.forEach(({ field, weight }) => {
      if (field === 'gambar') {
        // Check if images are uploaded
        if (formData.gambar && formData.gambar.length > 0) {
          totalScore += weight;
        }
      } else if (field === 'judulProduk') {
        // Check if title is at least 10 characters
        if (formData[field] && formData[field].trim().length >= 10) {
          totalScore += weight;
        }
      } else if (field === 'deskripsi') {
        // Check if description is at least 50 characters
        if (formData[field] && formData[field].trim().length >= 50) {
          totalScore += weight;
        }
      } else if (field === 'hargaEth') {
        // Check if price is valid
        const price = parseFloat(formData[field]);
        if (formData[field] && !isNaN(price) && price > 0) {
          totalScore += weight;
        }
      } else {
        // Basic field check
        if (formData[field] && formData[field].trim()) {
          totalScore += weight;
        }
      }
    });
    
    return Math.round(totalScore);
  };

  const handleAddProduct = async (e) => {
    e.preventDefault();
    if (!validateForm()) {
      toast.error('Mohon lengkapi semua field yang wajib diisi');
      return;
    }

    try {
      setAddLoading(true);
      // Convert to ETH if currently in IDR mode
      let hargaEthValue = formData.hargaEth;
      if (currencyMode === 'IDR') {
        hargaEthValue = convertCurrency(formData.hargaEth, 'IDR', 'ETH');
      }

      const response = await apiService.produk.createProduk({
        judulProduk: formData.judulProduk.trim(),
        namaGame: formData.namaGame.trim(),
        deskripsi: formData.deskripsi.trim(),
        hargaEth: parseFloat(hargaEthValue),
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

  const handleEdit = async (produkId) => {
    try {
      // Load produk data untuk edit
      const response = await apiService.produk.getProdukById(produkId);
      if (response.data.sukses) {
        const produk = response.data.data.produk;
        
        // Cek apakah user adalah pemilik produk
        if (produk.penjual.id !== user.id) {
          toast.error('Anda tidak memiliki akses untuk mengedit produk ini');
          return;
        }
        
        // Parse image data properly
        let allImageUrls = [];
        if (Array.isArray(produk.gambar)) {
          allImageUrls = produk.gambar;
        } else if (typeof produk.gambar === 'string' && produk.gambar.trim()) {
          try {
            const parsed = JSON.parse(produk.gambar);
            if (Array.isArray(parsed)) {
              allImageUrls = parsed;
            } else {
              allImageUrls = [produk.gambar];
            }
          } catch (e) {
            allImageUrls = [produk.gambar];
          }
        }
        
        setEditProduk(produk);
        setEditFormData({
          judulProduk: produk.judulProduk,
          namaGame: produk.namaGame,
          deskripsi: produk.deskripsi || '',
          hargaEth: produk.hargaEth.toString(),
          gambar: allImageUrls,
          statusJual: produk.statusJual
        });
        setEditErrors({});
        setHasUnsavedEditImages(false);
        setShowEditModal(true);
      }
    } catch (error) {
      console.error('Error loading produk for edit:', error);
      toast.error('Gagal memuat data produk');
    }
  };

  const handleDelete = (produkId) => {
    setProductToDelete(produkId);
    setShowDeleteConfirm(true);
  };

  const confirmDelete = async () => {
    if (!productToDelete) return;

    try {
      setDeleteLoading(true);
      const response = await apiService.produk.deleteProduk(productToDelete);
      if (response.data.sukses) {
        toast.success('Produk berhasil dihapus');
        loadProdukSaya();
        setShowDeleteConfirm(false);
        setProductToDelete(null);
      }
    } catch (error) {
      toast.error('Gagal menghapus produk');
    } finally {
      setDeleteLoading(false);
    }
  };

  const cancelDelete = () => {
    setShowDeleteConfirm(false);
    setProductToDelete(null);
    setDeleteLoading(false);
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

  // Fungsi untuk membuka image viewer
  const openImageViewer = (images, startIndex = 0) => {
    let processedImages = [];
    
    // Parse gambar data
    if (Array.isArray(images) && images.length > 0) {
      processedImages = images.filter(img => img && img.trim());
    } else if (typeof images === 'string' && images.trim()) {
      try {
        const parsed = JSON.parse(images);
        if (Array.isArray(parsed)) {
          processedImages = parsed.filter(img => img && img.trim());
        } else {
          processedImages = [images];
        }
      } catch (e) {
        processedImages = [images];
      }
    }
    
    if (processedImages.length > 0) {
      setViewerImages(processedImages);
      setCurrentImageIndex(Math.max(0, Math.min(startIndex, processedImages.length - 1)));
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

  // Handle keyboard navigation
  const handleKeyPress = (e) => {
    if (!showImageViewer) return;
    
    if (e.key === 'ArrowRight') {
      nextImage();
    } else if (e.key === 'ArrowLeft') {
      prevImage();
    } else if (e.key === 'Escape') {
      setShowImageViewer(false);
    }
  };

  // Add keyboard event listener
  React.useEffect(() => {
    document.addEventListener('keydown', handleKeyPress);
    return () => {
      document.removeEventListener('keydown', handleKeyPress);
    };
  }, [showImageViewer, viewerImages]);

  // Show loading while checking authentication or loading data
  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
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
    <div className="min-h-screen bg-gray-50 py-4 sm:py-8">
      <div className="max-w-[90%] mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header Card */}
        <div className="bg-white rounded-lg shadow-md mb-6 border border-gray-300">
          <div className="px-4 py-4 border-b border-gray-300">
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center space-y-4 sm:space-y-0">
              <div>
                <h1 className="text-xl font-bold text-gray-900 mb-1">Produk Saya</h1>
                <p className="text-sm text-gray-600">
                  Kelola semua produk yang Anda jual
                </p>
              </div>
              <button
                onClick={() => setShowAddModal(true)}
                className="inline-flex items-center justify-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-lg text-gray-700 bg-white hover:bg-gray-50 transition-colors"
              >
                <PlusIcon className="h-4 w-4 mr-2" />
                Tambah Produk
              </button>
            </div>
          </div>
        </div>

        {/* Main Content Card */}
        <div className="bg-white rounded-lg shadow-md border border-gray-300">
          <div className="p-4">
            {/* Produk List */}
            {filteredProduk.length === 0 ? (
              <div className="text-center py-12">
                <div className="mx-auto h-24 w-24 text-gray-400 mb-4">
                  <PlusIcon className="h-full w-full" />
                </div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">Belum ada produk</h3>
                <p className="text-gray-500 mb-6">Mulai jual akun game Anda sekarang!</p>
                <button
                  onClick={() => setShowAddModal(true)}
                  className="inline-flex items-center px-6 py-3 border border-transparent shadow-sm text-sm font-medium rounded-lg text-white bg-blue-600 hover:bg-blue-700 transition-colors"
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
                    className="bg-white rounded-lg shadow-md hover:shadow-lg hover:border-gray-500 transition-all duration-200 overflow-hidden group cursor-pointer border border-gray-400"
                  >
                    <div className="relative h-32 bg-gray-100">
                      {(() => {
                        // Handle both array and string format for images
                        let imageUrl = null;
                        let images = [];
                        
                        // Parse gambar data - could be array, JSON string, or regular string
                        if (Array.isArray(item.gambar) && item.gambar.length > 0) {
                          images = item.gambar;
                          imageUrl = item.gambar[0];
                        } else if (typeof item.gambar === 'string' && item.gambar.trim()) {
                          try {
                            // Try to parse as JSON array first
                            const parsed = JSON.parse(item.gambar);
                            if (Array.isArray(parsed) && parsed.length > 0) {
                              images = parsed;
                              imageUrl = parsed[0];
                            } else {
                              // Single string URL
                              imageUrl = item.gambar;
                              images = [item.gambar];
                            }
                          } catch (e) {
                            // Not JSON, treat as single URL
                            imageUrl = item.gambar;
                            images = [item.gambar];
                          }
                        }

                        // console.log('🖼️ Processing gambar for', item.kodeProduk, ':', {
                        //   original: item.gambar,
                        //   parsed: images,
                        //   imageUrl: imageUrl
                        // });

                        return imageUrl ? (
                          <img
                            src={imageUrl}
                            alt={item.judulProduk}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                            onError={(e) => {
                              console.log('❌ Gambar gagal dimuat:', imageUrl);
                              e.target.style.display = 'none';
                              e.target.nextElementSibling.style.display = 'flex';
                            }}
                            onLoad={() => {
                              console.log('✅ Gambar berhasil dimuat:', imageUrl);
                            }}
                          />
                        ) : null;
                      })()}
                      <div 
                        className="w-full h-full flex flex-col items-center justify-center text-center"
                        style={{ display: (() => {
                          let imageUrl = null;
                          if (Array.isArray(item.gambar) && item.gambar.length > 0) {
                            imageUrl = item.gambar[0];
                          } else if (typeof item.gambar === 'string' && item.gambar.trim()) {
                            try {
                              const parsed = JSON.parse(item.gambar);
                              if (Array.isArray(parsed) && parsed.length > 0) {
                                imageUrl = parsed[0];
                              } else {
                                imageUrl = item.gambar;
                              }
                            } catch (e) {
                              imageUrl = item.gambar;
                            }
                          }
                          return imageUrl ? 'none' : 'flex';
                        })() }}
                      >
                        <PhotoIcon className="h-10 w-10 text-gray-300 mb-2" />
                        <span className="text-xs text-gray-400">Tidak ada gambar</span>
                      </div>
                      {/* Status Badge */}
                      <div className="absolute top-1.5 right-1.5">
                        {(() => {
                          if (item.statusProduk === 'TERJUAL') {
                            return (
                              <span className="bg-red-100 text-red-800 text-xs px-1.5 py-0.5 rounded font-medium text-[10px]">
                                Terjual
                              </span>
                            );
                          } else if (item.statusProduk === 'AKTIF') {
                            return (
                              <span className="bg-green-100 text-green-800 text-xs px-1.5 py-0.5 rounded font-medium text-[10px]">
                                Aktif
                              </span>
                            );
                          } else if (item.statusProduk === 'PENDING') {
                            return (
                              <span className="bg-yellow-100 text-yellow-800 text-xs px-1.5 py-0.5 rounded font-medium text-[10px]">
                                Pending
                              </span>
                            );
                          } else if (item.statusProduk === 'DITOLAK') {
                            return (
                              <span className="bg-red-100 text-red-800 text-xs px-1.5 py-0.5 rounded font-medium text-[10px]">
                                Ditolak
                              </span>
                            );
                          } else {
                            return (
                              <span className="bg-gray-100 text-gray-800 text-xs px-1.5 py-0.5 rounded font-medium text-[10px]">
                                Unknown
                              </span>
                            );
                          }
                        })()}
                      </div>
                    </div>
                    <div className="p-3">
                      <div className="flex items-center text-xs text-gray-500 mb-1">
                        <span>{item.namaGame}</span>
                      </div>
                      <LineClamp lines={2} className="font-semibold text-gray-900 mb-2 group-hover:text-blue-600 transition-colors text-sm">
                        {item.judulProduk}
                      </LineClamp>
                      <div className="flex justify-between items-center mb-2">
                        <div>
                          <div className="text-sm font-bold text-blue-600">
                            {item.hargaEth ? `${item.hargaEth} ETH` : 'N/A'}
                          </div>
                          <div className="text-xs text-gray-500">
                            ≈ {formatIdrPrice(convertEthToIdr(item.hargaEth || 0))}
                          </div>
                        </div>
                        <div className="text-xs text-gray-500 flex items-center">
                          <ClockIcon className="h-3 w-3 mr-1" />
                          {formatTanggal(item.dibuatPada || new Date().toISOString())}
                        </div>
                      </div>
                      <div className="mb-3 pt-2 border-t border-gray-300 flex items-center text-xs text-gray-500">
                        <UserIcon className="h-3 w-3 mr-1" />
                        <span>Produk Anda</span>
                      </div>
                      
                      {/* Actions - Khusus untuk halaman Produk Saya */}
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
                            <div className="grid grid-cols-5 gap-1">
                              <button
                                onClick={() => handleDetailClick(item)}
                                className="col-span-3 bg-blue-600 text-white py-1.5 px-2 rounded text-xs font-medium hover:bg-blue-700 transition-colors flex items-center justify-center"
                              >
                                <EyeIcon className="h-3 w-3 mr-1" />
                                Detail
                              </button>
                              <button
                                onClick={() => handleEdit(item.id)}
                                className="col-span-1 border border-gray-300 text-xs font-medium rounded text-gray-700 bg-white hover:bg-gray-50 transition-colors flex items-center justify-center py-1.5 px-1"
                              >
                                <PencilIcon className="h-3 w-3" />
                              </button>
                              <button
                                onClick={() => handleDelete(item.id)}
                                className="col-span-1 text-xs font-medium rounded text-red-700 bg-red-100 hover:bg-red-200 transition-colors flex items-center justify-center py-1.5 px-1"
                              >
                                <TrashIcon className="h-3 w-3" />
                              </button>
                            </div>
                          );
                        }
                      })()}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
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
                <div className="lg:col-span-2">
                  {/* Judul Produk */}
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Judul Produk *
                    </label>
                    <input
                      type="text"
                      name="judulProduk"
                      value={formData.judulProduk}
                      onChange={handleInputChange}
                      placeholder="Contoh: Akun ML Mythic Glory Full Skin Rare"
                      className={`w-full px-3 py-2 border rounded-md focus:ring-blue-500 focus:border-blue-500 ${
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
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Nama Game *
                    </label>
                    <select
                      name="namaGame"
                      value={formData.namaGame}
                      onChange={handleInputChange}
                      className={`w-full px-3 py-2 border rounded-md focus:ring-blue-500 focus:border-blue-500 ${
                        errors.namaGame ? 'border-red-300' : 'border-gray-300'
                      }`}
                    >
                      <option value="">Pilih Game</option>
                      <option value="Mobile Legends">Mobile Legends</option>
                      <option value="Free Fire">Free Fire</option>
                      <option value="PUBG Mobile">PUBG Mobile</option>
                      <option value="Genshin Impact">Genshin Impact</option>
                    </select>
                    {errors.namaGame && (
                      <p className="mt-1 text-sm text-red-600">{errors.namaGame}</p>
                    )}
                  </div>

                  {/* Harga ETH */}
                  <div className="mb-6">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Harga dalam ETH *
                    </label>
                    <div className="space-y-3">
                      {/* Input ETH */}
                      <div className="relative">
                        <button
                          type="button"
                          onClick={() => handleCurrencyToggle(currencyMode, setCurrencyMode, formData.hargaEth, setFormData, 'hargaEth')}
                          className="absolute inset-y-0 left-0 pl-3 flex items-center hover:bg-gray-100 rounded-l-md transition-colors"
                        >
                          <span className="text-gray-500 sm:text-sm font-medium">
                            {currencyMode}
                          </span>
                        </button>
                        <input
                          type="number"
                          name="hargaEth"
                          value={formData.hargaEth}
                          onChange={(e) => {
                            handleInputChange(e);
                            handleEthToIdrConversion(e.target.value);
                          }}
                          placeholder={currencyMode === 'ETH' ? '0.001' : '65000'}
                          step={currencyMode === 'ETH' ? '0.001' : '1000'}
                          min={currencyMode === 'ETH' ? '0.001' : Math.round(0.001 * (ethToIdrRate || 68300000))}
                          max={currencyMode === 'ETH' ? '10' : Math.round(10 * (ethToIdrRate || 68300000))}
                          className={`w-full pl-12 pr-3 py-2 border rounded-md focus:ring-blue-500 focus:border-blue-500 ${
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
                        <div className="grid grid-cols-3 gap-1">
                          {priceInfo.suggestions.map((suggestion, index) => (
                            <button
                              key={index}
                              type="button"
                              onClick={() => {
                                setFormData(prev => ({ ...prev, hargaEth: suggestion.eth }));
                                handleEthToIdrConversion(suggestion.eth);
                              }}
                              className="text-xs bg-gray-100 hover:bg-gray-200 px-1.5 py-1 rounded border text-center transition-colors"
                            >
                              <div className="font-medium text-xs">{suggestion.eth} ETH</div>
                              <div className="text-gray-600 text-xs">{suggestion.idrFormatted}</div>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                    {errors.hargaEth && (
                      <p className="mt-1 text-sm text-red-600">{errors.hargaEth}</p>
                    )}
                    <p className="mt-1 text-sm text-gray-500">
                      {currencyMode === 'ETH'
                        ? 'Harga minimal 0.001 ETH, maksimal 10 ETH'
                        : `Harga minimal ${formatIdrPrice(0.001 * (ethToIdrRate || 68300000))}, maksimal ${formatIdrPrice(10 * (ethToIdrRate || 68300000))}`
                      }
                    </p>
                  </div>

                  {/* Upload Gambar */}
                  <div className="mb-2">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Screenshot Akun *
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
                  <div className="mb-6">
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
                          Gunakan Template {formData.namaGame}
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
                      className={`w-full px-3 py-2 border rounded-md focus:ring-blue-500 focus:border-blue-500 ${
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
                  <div className="bg-gray-50 rounded-lg p-2 sticky top-4">
                    <h4 className="text-sm font-semibold text-gray-900 mb-2">Preview Produk</h4>
                    <div className="border rounded-lg p-2 bg-white">
                      {/* Preview Image */}
                      <div className="w-full h-24 bg-gray-200 rounded-md mb-2 flex items-center justify-center">
                        {formData.gambar && formData.gambar.length > 0 ? (
                          <img
                            src={formData.gambar[0]}
                            alt="Preview"
                            className="w-full h-full object-cover rounded-md"
                          />
                        ) : (
                          <PhotoIcon className="h-6 w-6 text-gray-400" />
                        )}
                      </div>
                      {/* Show image count if multiple images */}
                      {formData.gambar && formData.gambar.length > 1 && (
                        <div className="text-xs text-gray-500 text-center mb-1">
                          +{formData.gambar.length - 1} gambar lainnya
                        </div>
                      )}
                      {/* Preview Content */}
                      <div className="space-y-1">
                        <div className="text-xs font-medium text-gray-900 leading-tight line-clamp-2">
                          {formData.judulProduk || 'Jual Akun Genshin Sultan'}
                        </div>
                        <div className="text-xs text-gray-500">
                          {formData.namaGame || 'Genshin Impact'}
                        </div>
                        <div className="flex justify-between items-center">
                          <div>
                            <div className="text-sm font-bold text-blue-600">
                              {formData.hargaEth ?
                                (currencyMode === 'ETH' ?
                                  `${formData.hargaEth} ETH` :
                                  formatRupiah(parseFloat(formData.hargaEth))
                                ) :
                                (currencyMode === 'ETH' ? '0.002 ETH' : formatRupiah(135883))
                              }
                            </div>
                            <div className="text-xs text-gray-500">
                              ≈ Rp 135.883
                            </div>
                          </div>
                        </div>
                        <div className="text-xs text-gray-600 mt-1">
                          Detail Akun Genshin Impact: Adventure Rank: [AR level] World Level: [WL level] 5-Star...
                        </div>
                      </div>
                    </div>
                    {/* Completion Progress */}
                    <div className="mt-2">
                      <div className="flex justify-between text-xs mb-1">
                        <span className="text-gray-600">Kelengkapan</span>
                        <span className="text-gray-900 font-medium">{calculateCompletionPercentage()}%</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-1">
                        <div
                          className="bg-blue-600 h-1 rounded-full transition-all duration-300"
                          style={{ width: `${calculateCompletionPercentage()}%` }}
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
                    className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center space-x-2"
                  >
                    {addLoading ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                        <span>Menyimpan...</span>
                      </>
                    ) : (
                      <span>Tambah Produk</span>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Modal Edit Produk */}
      {showEditModal && editProduk && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-semibold text-gray-900">
                  Edit Produk
                </h3>
                <button
                  onClick={() => {
                    setShowEditModal(false);
                    setEditProduk(null);
                    setHasUnsavedEditImages(false);
                  }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <form onSubmit={handleEditProduct} className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Form Fields */}
                <div className="lg:col-span-2 space-y-6">
                  {/* Judul Produk */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Judul Produk *
                    </label>
                    <input
                      type="text"
                      name="judulProduk"
                      value={editFormData.judulProduk}
                      onChange={handleEditInputChange}
                      className={`w-full px-3 py-2 border rounded-md focus:ring-blue-500 focus:border-blue-500 ${
                        editErrors.judulProduk ? 'border-red-300' : 'border-gray-300'
                      }`}
                    />
                    {editErrors.judulProduk && (
                      <p className="mt-1 text-sm text-red-600">{editErrors.judulProduk}</p>
                    )}
                  </div>

                  {/* Nama Game */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Nama Game *
                    </label>
                    <input
                      type="text"
                      name="namaGame"
                      value={editFormData.namaGame}
                      onChange={handleEditInputChange}
                      className={`w-full px-3 py-2 border rounded-md focus:ring-blue-500 focus:border-blue-500 ${
                        editErrors.namaGame ? 'border-red-300' : 'border-gray-300'
                      }`}
                    />
                    {editErrors.namaGame && (
                      <p className="mt-1 text-sm text-red-600">{editErrors.namaGame}</p>
                    )}
                  </div>

                  {/* Harga ETH */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Harga dalam ETH *
                    </label>
                    <div className="relative">
                      <button
                        type="button"
                        onClick={() => handleCurrencyToggle(editCurrencyMode, setEditCurrencyMode, editFormData.hargaEth, setEditFormData, 'hargaEth')}
                        className="absolute inset-y-0 left-0 pl-3 flex items-center hover:bg-gray-100 rounded-l-md transition-colors"
                      >
                        <span className="text-gray-500 sm:text-sm font-medium">
                          {editCurrencyMode}
                        </span>
                      </button>
                      <input
                        type="number"
                        name="hargaEth"
                        value={editFormData.hargaEth}
                        onChange={handleEditInputChange}
                        step={editCurrencyMode === 'ETH' ? '0.001' : '1000'}
                        min={editCurrencyMode === 'ETH' ? '0.001' : Math.round(0.001 * (ethToIdrRate || 68300000))}
                        max={editCurrencyMode === 'ETH' ? '10' : Math.round(10 * (ethToIdrRate || 68300000))}
                        className={`w-full pl-12 pr-3 py-2 border rounded-md focus:ring-blue-500 focus:border-blue-500 ${
                          editErrors.hargaEth ? 'border-red-300' : 'border-gray-300'
                        }`}
                      />
                    </div>
                    {editErrors.hargaEth && (
                      <p className="mt-1 text-sm text-red-600">{editErrors.hargaEth}</p>
                    )}
                  </div>

                  {/* Upload Gambar */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Screenshot Akun
                    </label>
                    <ImageUploadSimple
                      maxFiles={5}
                      currentImages={Array.isArray(editFormData.gambar) ? editFormData.gambar : (editFormData.gambar ? [editFormData.gambar] : [])}
                      onUploadSuccess={(urls) => {
                        console.log('🖼️ Edit Image upload success:', urls);
                        setEditFormData(prev => ({
                          ...prev,
                          gambar: urls
                        }));
                        setHasUnsavedEditImages(true);
                        toast.success('Gambar berhasil diupload! Jangan lupa klik "Perbarui Produk" untuk menyimpan perubahan.');
                      }}
                      onUploadError={(error) => {
                        console.error('❌ Edit Image upload error:', error);
                        toast.error('Gagal upload gambar');
                      }}
                      className="w-full"
                    />
                  </div>

                  {/* Deskripsi */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Deskripsi Detail *
                    </label>
                    <textarea
                      name="deskripsi"
                      value={editFormData.deskripsi}
                      onChange={handleEditInputChange}
                      rows={6}
                      maxLength={500}
                      className={`w-full px-3 py-2 border rounded-md focus:ring-blue-500 focus:border-blue-500 ${
                        editErrors.deskripsi ? 'border-red-300' : 'border-gray-300'
                      }`}
                    />
                    {editErrors.deskripsi && (
                      <p className="mt-1 text-sm text-red-600">{editErrors.deskripsi}</p>
                    )}
                    <p className="mt-1 text-sm text-gray-500">
                      {editFormData.deskripsi.length}/500 karakter
                    </p>
                  </div>
                </div>

                {/* Sidebar Preview */}
                <div className="lg:col-span-1">
                  <div className="bg-gray-50 rounded-lg p-4 sticky top-4">
                    <h4 className="text-lg font-semibold text-gray-900 mb-4">Preview Produk</h4>
                    <div className="border rounded-lg p-4 bg-white">
                      {/* Preview Image */}
                      <div className="w-full h-32 bg-gray-200 rounded-md mb-3 flex items-center justify-center">
                        {(() => {
                          let imageUrl = null;
                          if (Array.isArray(editFormData.gambar) && editFormData.gambar.length > 0) {
                            imageUrl = editFormData.gambar[0];
                          } else if (typeof editFormData.gambar === 'string' && editFormData.gambar.trim()) {
                            try {
                              const parsed = JSON.parse(editFormData.gambar);
                              if (Array.isArray(parsed) && parsed.length > 0) {
                                imageUrl = parsed[0];
                              } else {
                                imageUrl = editFormData.gambar;
                              }
                            } catch (e) {
                              imageUrl = editFormData.gambar;
                            }
                          }
                          
                          return imageUrl ? (
                            <img
                              src={imageUrl}
                              alt="Preview"
                              className="w-full h-full object-cover rounded-md"
                            />
                          ) : (
                            <PhotoIcon className="h-8 w-8 text-gray-400" />
                          );
                        })()}
                      </div>
                      {/* Show image count if multiple images */}
                      {(() => {
                        let imageCount = 0;
                        if (Array.isArray(editFormData.gambar)) {
                          imageCount = editFormData.gambar.length;
                        } else if (typeof editFormData.gambar === 'string' && editFormData.gambar.trim()) {
                          try {
                            const parsed = JSON.parse(editFormData.gambar);
                            if (Array.isArray(parsed)) {
                              imageCount = parsed.length;
                            } else {
                              imageCount = 1;
                            }
                          } catch (e) {
                            imageCount = 1;
                          }
                        }
                        
                        return imageCount > 1 ? (
                          <div className="text-xs text-gray-500 text-center mb-2">
                            +{imageCount - 1} gambar lainnya
                          </div>
                        ) : null;
                      })()}
                      {/* Preview Content */}
                      <div className="space-y-2">
                        <div className="text-sm font-medium text-gray-900">
                          {editFormData.judulProduk || 'Judul Produk Anda'}
                        </div>
                        <div className="text-xs text-gray-500">
                          {editFormData.namaGame || 'Nama Game'}
                        </div>
                        <div className="flex justify-between items-center">
                          <div>
                            <div className="text-lg font-bold text-blue-600">
                              {editFormData.hargaEth ?
                                (editCurrencyMode === 'ETH' ?
                                  `${editFormData.hargaEth} ETH` :
                                  formatRupiah(parseFloat(editFormData.hargaEth))
                                ) :
                                (editCurrencyMode === 'ETH' ? '0.000 ETH' : formatRupiah(0))
                              }
                            </div>
                            {editFormData.hargaEth && editCurrencyMode === 'ETH' && (
                              <div className="text-xs text-gray-500">
                                ≈ {formatIdrPrice(convertEthToIdr(parseFloat(editFormData.hargaEth)))}
                              </div>
                            )}
                            {editFormData.hargaEth && editCurrencyMode === 'IDR' && (
                              <div className="text-xs text-gray-500">
                                ≈ {formatEthPrice(convertIdrToEth(parseFloat(editFormData.hargaEth)))}
                              </div>
                            )}
                          </div>
                        </div>
                        {editFormData.deskripsi && (
                          <div className="text-xs text-gray-600 mt-2 line-clamp-3">
                            {editFormData.deskripsi.substring(0, 100)}...
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Submit Button */}
                <div className="lg:col-span-3 flex justify-end space-x-4 pt-6 border-t">
                  <button
                    type="button"
                    onClick={() => {
                      setShowEditModal(false);
                      setEditProduk(null);
                      setHasUnsavedEditImages(false);
                    }}
                    className="px-6 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition-colors"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    disabled={editLoading}
                    className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center space-x-2"
                  >
                    {editLoading ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                        <span>Menyimpan...</span>
                      </>
                    ) : (
                      <span>Perbarui Produk</span>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Modal Detail Produk - Sesuai struktur produk.md */}
      {showDetailModal && selectedProduk && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-6xl w-full max-h-[95vh] overflow-y-auto shadow-2xl">
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-semibold text-gray-900">
                  Detail Produk
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
                {/* Left Side - Sesuai produk.md */}
                <div className="space-y-4">
                  {/* Main Image */}
                  <div 
                    className="w-full h-64 bg-gray-100 rounded-lg flex items-center justify-center overflow-hidden cursor-pointer hover:bg-gray-200 transition-colors"
                    onClick={() => openImageViewer(selectedProduk.gambar, 0)}
                  >
                    {(() => {
                      // Handle both array and string format for images in modal
                      let imageUrl = null;
                      let images = [];
                      
                      if (Array.isArray(selectedProduk.gambar) && selectedProduk.gambar.length > 0) {
                        images = selectedProduk.gambar;
                        imageUrl = selectedProduk.gambar[0];
                      } else if (typeof selectedProduk.gambar === 'string' && selectedProduk.gambar.trim()) {
                        try {
                          // Try to parse as JSON array first
                          const parsed = JSON.parse(selectedProduk.gambar);
                          if (Array.isArray(parsed) && parsed.length > 0) {
                            images = parsed;
                            imageUrl = parsed[0];
                          } else {
                            // Single string URL
                            imageUrl = selectedProduk.gambar;
                            images = [selectedProduk.gambar];
                          }
                        } catch (e) {
                          // Not JSON, treat as single URL
                          imageUrl = selectedProduk.gambar;
                          images = [selectedProduk.gambar];
                        }
                      }

                      console.log('🖼️ Processing modal gambar for', selectedProduk.kodeProduk, ':', {
                        original: selectedProduk.gambar,
                        parsed: images,
                        imageUrl: imageUrl
                      });

                      return imageUrl ? (
                        <img
                          src={imageUrl}
                          alt={selectedProduk.judulProduk}
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            console.log('❌ Gambar modal gagal dimuat:', imageUrl);
                            e.target.style.display = 'none';
                            e.target.nextElementSibling.style.display = 'flex';
                          }}
                          onLoad={() => {
                            console.log('✅ Gambar modal berhasil dimuat:', imageUrl);
                          }}
                        />
                      ) : null;
                    })()}
                    <div 
                      className="w-full h-full flex flex-col items-center justify-center text-center"
                      style={{ display: (() => {
                        let imageUrl = null;
                        if (Array.isArray(selectedProduk.gambar) && selectedProduk.gambar.length > 0) {
                          imageUrl = selectedProduk.gambar[0];
                        } else if (typeof selectedProduk.gambar === 'string' && selectedProduk.gambar.trim()) {
                          try {
                            const parsed = JSON.parse(selectedProduk.gambar);
                            if (Array.isArray(parsed) && parsed.length > 0) {
                              imageUrl = parsed[0];
                            } else {
                              imageUrl = selectedProduk.gambar;
                            }
                          } catch (e) {
                            imageUrl = selectedProduk.gambar;
                          }
                        }
                        return imageUrl ? 'none' : 'flex';
                      })() }}
                    >
                      <PhotoIcon className="h-16 w-16 text-gray-300 mx-auto mb-2" />
                      <p className="text-gray-500 text-sm">Tidak ada gambar</p>
                    </div>
                  </div>

                  {/* Thumbnail Images - Only show actual additional images */}
                  {(() => {
                    let images = [];
                    
                    // Parse gambar data for thumbnails
                    if (Array.isArray(selectedProduk.gambar) && selectedProduk.gambar.length > 1) {
                      images = selectedProduk.gambar.slice(1); // Skip first image, get all remaining
                    } else if (typeof selectedProduk.gambar === 'string' && selectedProduk.gambar.trim()) {
                      try {
                        const parsed = JSON.parse(selectedProduk.gambar);
                        if (Array.isArray(parsed) && parsed.length > 1) {
                          images = parsed.slice(1); // Skip first image, get all remaining
                        }
                      } catch (e) {
                        // Not JSON or single image, no thumbnails
                        images = [];
                      }
                    }
                    
                    // Only render if there are actual additional images
                    if (images.length === 0) {
                      return null;
                    }
                    
                    return (
                      <div className="grid grid-cols-4 gap-2">
                        {images.map((img, index) => (
                          <div key={index} className="h-20 bg-gray-200 rounded flex items-center justify-center overflow-hidden border border-gray-300">
                            <img
                              src={img}
                              alt={`Gambar ${index + 2}`}
                              className="w-full h-full object-cover hover:scale-105 transition-transform duration-200 cursor-pointer"
                              onError={(e) => {
                                console.log('❌ Thumbnail gagal dimuat:', img);
                                e.target.style.display = 'none';
                                e.target.nextElementSibling.style.display = 'flex';
                              }}
                              onClick={() => {
                                // Buka image viewer dengan index yang benar
                                const allImages = (() => {
                                  if (Array.isArray(selectedProduk.gambar)) {
                                    return selectedProduk.gambar;
                                  } else if (typeof selectedProduk.gambar === 'string' && selectedProduk.gambar.trim()) {
                                    try {
                                      const parsed = JSON.parse(selectedProduk.gambar);
                                      return Array.isArray(parsed) ? parsed : [selectedProduk.gambar];
                                    } catch (e) {
                                      return [selectedProduk.gambar];
                                    }
                                  }
                                  return [];
                                })();
                                openImageViewer(allImages, index + 1); // +1 karena thumbnail dimulai dari gambar kedua
                              }}
                            />
                            <div
                              className="w-full h-full flex items-center justify-center"
                              style={{ display: 'none' }}
                            >
                              <PhotoIcon className="h-8 w-8 text-gray-400" />
                            </div>
                          </div>
                        ))}
                      </div>
                    );
                  })()}

                  {/* Informasi Produk - Sesuai produk.md */}
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

                {/* Right Side - Sesuai produk.md */}
                <div className="space-y-4">
                  {/* Title & Game Info */}
                  <div>
                    <h1 className="text-2xl font-bold text-gray-900 leading-tight">
                      {selectedProduk.judulProduk}
                    </h1>
                    <div className="text-gray-600 text-base mt-1">{selectedProduk.namaGame}</div>
                    <div className="text-blue-600 text-sm font-semibold mt-0.5">
                      Kode Akun: {selectedProduk.kodeProduk}
                    </div>
                  </div>

                  {/* Description Box - Real Description */}
                  <div className="border border-gray-400 rounded-lg p-4">
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
                    <div className="flex items-center justify-between border-b border-gray-300 pb-2 mb-2">
                      <span className="text-gray-700 font-medium">Harga</span>
                      <span className="text-lg font-bold text-blue-600">
                        {selectedProduk.hargaEth ? `${selectedProduk.hargaEth} ETH` : '0.1 ETH'}
                      </span>
                    </div>
                    <div className="text-right text-gray-600">
                      ≈ {formatIdrPrice(convertEthToIdr(selectedProduk.hargaEth || 0))}
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
                                onClick={() => {
                                  setShowDetailModal(false);
                                  handleEdit(selectedProduk.id);
                                }}
                                className="bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-blue-700 transition-colors text-sm"
                              >
                                EDIT
                              </button>
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
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
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
                alt={`Gambar ${currentImageIndex + 1}`}
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

      {/* Confirmation Modal untuk Delete */}
      <ConfirmationModal
        isOpen={showDeleteConfirm}
        onClose={cancelDelete}
        onConfirm={confirmDelete}
        title="Hapus Produk"
        message="Yakin ingin menghapus produk ini? Tindakan ini tidak dapat dibatalkan."
        confirmText="Hapus"
        cancelText="Batal"
        type="danger"
        loading={deleteLoading}
      />
    </div>
  );
};

export default ProdukSaya;
