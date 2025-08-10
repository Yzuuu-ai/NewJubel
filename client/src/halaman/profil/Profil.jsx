import React, { useState, useEffect } from 'react';
import { useAuth } from '../../konteks/AuthContext';
import { useWallet } from '../../konteks/WalletContext';
import { apiService } from '../../layanan/api';
import {
  UserIcon,
  WalletIcon,
  ShieldCheckIcon,
  ExclamationTriangleIcon,
  PencilIcon,
  CheckIcon,
  XMarkIcon,
  InformationCircleIcon
} from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';

const Profil = () => {
  const { 
    user,
    setUser,
    isAuthenticated, 
    updateProfile,
    loading,
    logout
  } = useAuth();
  const { 
    walletAddress, 
    connectWallet, 
    isConnecting 
  } = useWallet();
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState({
    nama: '',
    nomor_telepon: '',
    alamat: ''
  });
  const [walletValidation, setWalletValidation] = useState({
    isChecking: false,
    isValid: null,
    message: '',
    isAvailable: null
  });
  // PERBAIKAN: State untuk force refresh UI
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // Load profile data
  useEffect(() => {
    if (user) {
      setEditData({
        nama: user.profil?.nama || '',
        nomor_telepon: user.profil?.nomor_telepon || '',
        alamat: user.profil?.alamat || ''
      });
    }
  }, [user]);

  // Debug: Log user changes
  useEffect(() => {
    console.log('👤 User state changed:', user);
  }, [user]);

  // PERBAIKAN: Listen untuk wallet connected event
  useEffect(() => {
    const handleWalletConnected = (event) => {
      console.log('🔄 Wallet connected event received:', event.detail);
      // Force refresh state
      setRefreshTrigger(prev => prev + 1);
    };

    window.addEventListener('walletConnected', handleWalletConnected);
    
    return () => {
      window.removeEventListener('walletConnected', handleWalletConnected);
    };
  }, []);

  // PERBAIKAN: Force re-render saat refreshTrigger berubah
  useEffect(() => {
    if (refreshTrigger > 0) {
      console.log('🔄 Forcing component re-render due to refresh trigger:', refreshTrigger);
    }
  }, [refreshTrigger]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setEditData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleEditToggle = () => {
    if (isEditing && user) {
      // Reset data jika cancel
      setEditData({
        nama: user.profil?.nama || '',
        nomor_telepon: user.profil?.nomor_telepon || '',
        alamat: user.profil?.alamat || ''
      });
    }
    setIsEditing(!isEditing);
  };

  const handleSave = async () => {
    if (!editData.nama.trim()) {
      toast.error('Nama lengkap tidak boleh kosong');
      return;
    }

    try {
      const result = await updateProfile(editData);
      if (result.success) {
        setIsEditing(false);
        toast.success('Profil berhasil diperbarui!');
      } else {
        toast.error(result.error || 'Gagal memperbarui profil');
      }
    } catch (error) {
      console.error('Error saving profile:', error);
      toast.error('Gagal menyimpan profil');
    }
  };

  // Function untuk validasi wallet address
  const validateWalletAddress = async (address) => {
    if (!address) {
      setWalletValidation({
        isChecking: false,
        isValid: null,
        message: '',
        isAvailable: null
      });
      return;
    }

    // Validasi format Ethereum address
    const ethAddressRegex = /^0x[a-fA-F0-9]{40}$/;
    if (!ethAddressRegex.test(address)) {
      setWalletValidation({
        isChecking: false,
        isValid: false,
        message: 'Format alamat wallet tidak valid',
        isAvailable: null
      });
      return;
    }

    // Cek ketersediaan di server
    setWalletValidation(prev => ({
      ...prev,
      isChecking: true,
      message: 'Mengecek ketersediaan...'
    }));

    try {
      console.log('🔍 Checking wallet availability for:', address);
      const response = await apiService.auth.checkWalletAvailability(address);
      console.log('✅ Wallet check response:', response.data);
      
      if (response.data.sukses && response.data.tersedia) {
        setWalletValidation({
          isChecking: false,
          isValid: true,
          message: '✅ Alamat wallet tersedia',
          isAvailable: true
        });
      } else {
        setWalletValidation({
          isChecking: false,
          isValid: false,
          message: `❌ ${response.data.pesan}`,
          isAvailable: false
        });
      }
    } catch (error) {
      console.error('❌ Error checking wallet availability:', error);
      console.error('Error details:', {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status
      });
      
      let errorMessage = '❌ Gagal memvalidasi alamat wallet';
      if (error.response?.data?.pesan) {
        errorMessage = `❌ ${error.response.data.pesan}`;
      } else if (error.response?.status === 400) {
        errorMessage = '❌ Format alamat wallet tidak valid';
      } else if (error.response?.status >= 500) {
        errorMessage = '❌ Server bermasalah, coba lagi nanti';
      }
      
      setWalletValidation({
        isChecking: false,
        isValid: false,
        message: errorMessage,
        isAvailable: null
      });
    }
  };

  const handleConnectWallet = async () => {
    try {
      // Check if MetaMask is installed first
      if (typeof window.ethereum === 'undefined') {
        const installMetaMask = window.confirm(
          'MetaMask tidak terdeteksi di browser Anda.\n\n' +
          'MetaMask diperlukan untuk menghubungkan wallet.\n' +
          'Apakah Anda ingin menginstall MetaMask sekarang?'
        );
        if (installMetaMask) {
          window.open('https://metamask.io/download/', '_blank');
        }
        return;
      }

      // PERBAIKAN: BLOKIR jika user sudah punya wallet terhubung (cek semua kemungkinan field)
      if (user?.walletAddress || user?.alamatWallet || user?.profil?.alamatWallet) {
        toast.error(
          'Wallet sudah terhubung secara permanen!\n' +
          'Untuk keamanan, satu akun hanya bisa terhubung dengan satu wallet selamanya.'
        );
        return;
      }

      // Show connecting state dengan instruksi yang jelas
      toast.loading(
        '🦊 Menghubungkan ke MetaMask...\n\n' +
        'Silakan periksa popup MetaMask dan klik "Connect"',
        { id: 'connecting', duration: 15000 }
      );

      // Hubungkan wallet melalui MetaMask/WalletConnect
      const walletResult = await connectWallet();

      // Dismiss loading toast
      toast.dismiss('connecting');

      if (walletResult.success) {
        // Validasi ketersediaan wallet terlebih dahulu
        toast.loading('Memvalidasi alamat wallet...', { id: 'validating' });

        try {
          console.log('🔍 Validating wallet address:', walletResult.address);
          const validationResponse = await apiService.auth.checkWalletAvailability(walletResult.address);
          console.log('✅ Validation response:', validationResponse.data);

          toast.dismiss('validating');
          
          if (!validationResponse.data.sukses || !validationResponse.data.tersedia) {
            console.warn('❌ Wallet not available:', validationResponse.data);
            toast.error(
              `❌ Wallet Tidak Tersedia!\n\n` +
              `${validationResponse.data.pesan}\n\n` +
              `Alamat: ${walletResult.address.slice(0, 6)}...${walletResult.address.slice(-4)}`
            );
            return;
          }

          // Wallet tersedia, langsung lanjutkan tanpa dialog popup
          // Tampilkan notifikasi informatif saja
          toast.success(
            `✅ Wallet ${walletResult.address.slice(0, 6)}...${walletResult.address.slice(-4)} siap dihubungkan!\n` +
            `Menyimpan ke akun Anda...`,
            { duration: 3000 }
          );

          // Simpan alamat wallet ke server
          console.log('💾 Saving wallet to server:', walletResult.address);
          toast.loading('Menyimpan wallet ke akun...', { id: 'saving' });
          
          const response = await apiService.auth.updateProfile({
            alamatWallet: walletResult.address
          });
          
          toast.dismiss('saving');
          console.log('✅ Save wallet response:', response.data);
          
          if (response.data.sukses) {
            // PERBAIKAN: Update user state dengan struktur yang konsisten
            const updatedUserData = {
              ...user,
              walletAddress: walletResult.address,
              alamatWallet: walletResult.address,
              profil: {
                ...user?.profil,
                alamatWallet: walletResult.address,
                // Merge dengan data dari response jika ada
                ...(response.data.data?.profil || {})
              }
            };
            
            console.log('🔄 Updating user data:', updatedUserData);
            
            // PERBAIKAN: Update localStorage secara eksplisit untuk memastikan persistensi
            localStorage.setItem('user', JSON.stringify(updatedUserData));
            
            // Update AuthContext state
            setUser(updatedUserData);
            
            // PERBAIKAN: Tunggu sebentar sebelum refresh untuk memastikan state ter-update
            await new Promise(resolve => setTimeout(resolve, 500));
            
            // Force refresh user data dari server untuk memastikan sinkronisasi
            try {
              console.log('🔄 Refreshing user data from server...');
              const refreshedUser = await apiService.auth.getProfile();
              if (refreshedUser.data.sukses) {
                console.log('✅ Refreshed user data:', refreshedUser.data.data);
                
                // PERBAIKAN: Pastikan struktur data konsisten saat refresh
                const normalizedRefreshedUser = {
                  ...refreshedUser.data.data,
                  walletAddress: refreshedUser.data.data.walletAddress || refreshedUser.data.data.alamatWallet,
                  alamatWallet: refreshedUser.data.data.alamatWallet || refreshedUser.data.data.walletAddress,
                  profil: {
                    ...refreshedUser.data.data.profil,
                    alamatWallet: refreshedUser.data.data.walletAddress || refreshedUser.data.data.alamatWallet
                  }
                };
                
                // Update localStorage dengan data yang ter-refresh
                localStorage.setItem('user', JSON.stringify(normalizedRefreshedUser));
                setUser(normalizedRefreshedUser);
              }
            } catch (refreshError) {
              console.warn('Warning: Could not refresh user data:', refreshError);
            }
            
            toast.success('🔒 Wallet berhasil terhubung PERMANEN ke akun Anda!', { duration: 5000 });
            
            // PERBAIKAN: Force refresh UI untuk memastikan wallet muncul
            console.log('✅ Wallet connection completed successfully');
            
            // Trigger re-render dengan mengubah state
            setRefreshTrigger(prev => prev + 1);
            
            // Force update editData untuk trigger re-render
            setEditData(prev => ({ ...prev }));
            
            // Dispatch custom event untuk memaksa update komponen lain
            window.dispatchEvent(new CustomEvent('walletConnected', {
              detail: { address: walletResult.address }
            }));
            
          } else {
            console.error('❌ Failed to save wallet:', response.data);
            toast.error(response.data.pesan || 'Gagal menyimpan alamat wallet');
          }
        } catch (validationError) {
          toast.dismiss('validating');
          toast.dismiss('saving');
          console.error('❌ Error validating wallet:', validationError);
          console.error('Validation error details:', {
            message: validationError.message,
            response: validationError.response?.data,
            status: validationError.response?.status
          });
          
          let errorMessage = 'Gagal memvalidasi alamat wallet';
          if (validationError.response?.data?.pesan) {
            errorMessage = validationError.response.data.pesan;
          } else if (validationError.response?.status === 400) {
            errorMessage = 'Format alamat wallet tidak valid';
          } else if (validationError.response?.status >= 500) {
            errorMessage = 'Server bermasalah, coba lagi nanti';
          }
          
          toast.error(errorMessage);
          return;
        }
      } else {
        // Handle specific errors dengan pesan yang jelas
        let errorMessage = walletResult.error || 'Gagal menghubungkan wallet';
        
        if (walletResult.error && walletResult.error.includes('User rejected')) {
          errorMessage = 'Koneksi dibatalkan oleh pengguna. Silakan coba lagi dan setujui koneksi di MetaMask.';
        } else if (walletResult.error && walletResult.error.includes('Already processing')) {
          errorMessage = 'MetaMask sedang memproses permintaan lain. Silakan periksa popup MetaMask atau tunggu sebentar.';
        } else if (walletResult.error && walletResult.error.includes('No accounts found')) {
          errorMessage = 'Tidak ada akun ditemukan. Pastikan MetaMask sudah login.';
        }
        
        toast.error(errorMessage);
      }
    } catch (error) {
      console.error('Error connecting wallet:', error);
      toast.dismiss('connecting');
      toast.dismiss('validating');
      toast.dismiss('saving');
      
      let errorMessage = 'Gagal menghubungkan wallet';
      if (error.message && error.message.includes('User rejected')) {
        errorMessage = 'Koneksi dibatalkan';
      } else if (error.message && error.message.includes('MetaMask')) {
        errorMessage = 'Error MetaMask: ' + error.message;
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      toast.error(errorMessage);
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-white p-8 rounded-lg shadow-md text-center">
          <ExclamationTriangleIcon className="h-16 w-16 text-yellow-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-800 mb-4">Akses Ditolak</h2>
          <p className="text-gray-600 mb-6">Silakan masuk terlebih dahulu untuk mengakses halaman profil.</p>
          <button
            onClick={() => window.location.href = '/masuk'}
            className="bg-primary-600 text-white px-6 py-2 rounded-md hover:bg-primary-700 transition-colors"
          >
            Masuk Sekarang
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-[90%] mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-sm mb-6">
          <div className="px-6 py-4 border-b border-gray-200">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Profil Saya</h1>
              <p className="text-gray-600 mt-1">Kelola informasi profil dan akun Anda</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Profile Info */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-lg shadow-sm">
              <div className="px-6 py-4 border-b border-gray-200">
                <div className="flex justify-between items-center">
                  <h2 className="text-lg font-semibold text-gray-900">Informasi Pribadi</h2>
                  <button
                    onClick={handleEditToggle}
                    className="flex items-center space-x-2 text-primary-600 hover:text-primary-700 text-sm font-medium"
                  >
                    {isEditing ? (
                      <>
                        <XMarkIcon className="h-4 w-4" />
                        <span>Batal</span>
                      </>
                    ) : (
                      <>
                        <PencilIcon className="h-4 w-4" />
                        <span>Edit</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              <div className="p-6 space-y-6">
                {/* Nama */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Nama Lengkap
                  </label>
                  <input
                    type="text"
                    name="nama"
                    value={editData.nama}
                    onChange={handleInputChange}
                    disabled={!isEditing}
                    className={`w-full px-3 py-2 border rounded-md ${
                      isEditing
                        ? 'border-gray-300 focus:ring-primary-500 focus:border-primary-500'
                        : 'border-gray-300 bg-gray-50 text-gray-500'
                    }`}
                    placeholder="Masukkan nama lengkap"
                  />
                </div>

                {/* Email (Read Only) */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Email
                  </label>
                  <div className="flex items-center space-x-3">
                    <input
                      type="email"
                      value={user?.email || ''}
                      disabled
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-md bg-gray-50 text-gray-500"
                    />
                    <ShieldCheckIcon className="h-5 w-5 text-green-500" title="Terverifikasi" />
                  </div>
                </div>

                {/* Nomor Telepon */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Nomor Telepon
                  </label>
                  <input
                    type="tel"
                    name="nomor_telepon"
                    value={editData.nomor_telepon}
                    onChange={handleInputChange}
                    disabled={!isEditing}
                    className={`w-full px-3 py-2 border rounded-md ${
                      isEditing 
                        ? 'border-gray-300 focus:ring-primary-500 focus:border-primary-500' 
                        : 'border-gray-300 bg-gray-50 text-gray-500'
                    }`}
                    placeholder="Masukkan nomor telepon"
                  />
                </div>

                {/* Alamat */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Alamat
                  </label>
                  <textarea
                    name="alamat"
                    value={editData.alamat}
                    onChange={handleInputChange}
                    disabled={!isEditing}
                    rows={3}
                    className={`w-full px-3 py-2 border rounded-md ${
                      isEditing 
                        ? 'border-gray-300 focus:ring-primary-500 focus:border-primary-500' 
                        : 'border-gray-300 bg-gray-50 text-gray-500'
                    }`}
                    placeholder="Masukkan alamat lengkap"
                  />
                </div>

                {/* Wallet Address - Read Only */}
                <div key={`wallet-section-${refreshTrigger}`}>
                  <div className="flex items-center space-x-2 mb-2">
                    <label className="block text-sm font-medium text-gray-700">
                      Alamat Wallet
                    </label>
                    <div className="relative group">
                      <InformationCircleIcon className="h-4 w-4 text-blue-500 cursor-help" />
                      {/* Tooltip */}
                      <div className="absolute left-1/2 transform -translate-x-1/2 bottom-full mb-2 px-3 py-2 bg-gray-900 text-white text-xs rounded-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 whitespace-nowrap z-10">
                        <div className="space-y-1">
                          <div className="font-medium">Informasi</div>
                          <div>• Wallet permanen setelah terhubung</div>
                          <div>• Tidak dapat diganti untuk keamanan</div>
                          <div>• Gunakan dompet blockchain extension (MetaMask, OKX, Trust Wallet, dll)</div>
                        </div>
                        {/* Arrow */}
                        <div className="absolute top-full left-1/2 transform -translate-x-1/2 border-4 border-transparent border-t-gray-900"></div>
                      </div>
                    </div>
                  </div>
                  {(user?.walletAddress || user?.alamatWallet || user?.profil?.alamatWallet) ? (
                    // Wallet sudah terhubung
                    <div className="space-y-2">
                      <div className="flex items-center justify-between p-3 bg-blue-50 border border-blue-200 rounded-md">
                        <div className="flex items-center space-x-3">
                          <div className="flex-shrink-0">
                            <ShieldCheckIcon className="h-5 w-5 text-blue-500" />
                          </div>
                          <div>
                            <p className="text-base font-medium text-blue-800">
                              Wallet Terhubung
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-sm text-blue-600 font-mono break-all">
                            {user.walletAddress || user.alamatWallet || user.profil?.alamatWallet}
                          </p>
                        </div>
                      </div>
                      
                      {walletAddress && walletAddress !== (user.walletAddress || user.alamatWallet || user.profil?.alamatWallet) && (
                        <div className="bg-orange-50 border border-orange-200 rounded-md p-3">
                          <p className="text-xs text-orange-800 font-medium">Peringatan:</p>
                          <p className="text-xs text-orange-700 mt-1">
                            Wallet aktif di extension ({walletAddress.slice(0, 6)}...{walletAddress.slice(-4)})
                            berbeda dengan wallet yang terdaftar di akun Anda.
                            Silakan ganti ke wallet yang benar di extension.
                          </p>
                        </div>
                      )}
                    </div>
                  ) : (
                    // Wallet belum terhubung
                    <div className="space-y-2">
                      <div className="flex items-center space-x-3 p-3 bg-yellow-50 border border-yellow-200 rounded-md">
                        <div className="flex-shrink-0">
                          <ExclamationTriangleIcon className="h-5 w-5 text-yellow-500" />
                        </div>
                        <div className="flex-1">
                          <p className="text-sm font-medium text-yellow-800">
                            Dompet Blockchain Belum Terhubung
                          </p>
                          <p className="text-xs text-yellow-600">
                            Hubungkan dompet blockchain extension untuk melakukan transaksi
                          </p>
                        </div>
                        <button
                          onClick={handleConnectWallet}
                          disabled={isConnecting}
                          className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 disabled:opacity-50 flex items-center space-x-2 text-sm"
                        >
                          <WalletIcon className="h-4 w-4" />
                          <span>
                            {isConnecting ? 'Menghubungkan...' : 'Hubungkan'}
                          </span>
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                {/* Save Button */}
                {isEditing && (
                  <div className="flex justify-end space-x-3 pt-4 border-t">
                    <button
                      onClick={handleEditToggle}
                      className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50"
                    >
                      Batal
                    </button>
                    <button
                      onClick={handleSave}
                      disabled={loading}
                      className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 disabled:opacity-50 flex items-center space-x-2"
                    >
                      <CheckIcon className="h-4 w-4" />
                      <span>
                        {loading ? 'Menyimpan...' : 'Simpan'}
                      </span>
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Account Stats */}
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Statistik Akun</h3>
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Status</span>
                  <span className="text-green-600 font-medium">Aktif</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Bergabung</span>
                  <span className="text-gray-900 font-medium">
                    {user?.dibuatPada ? new Date(user.dibuatPada).toLocaleDateString('id-ID', {
                      day: 'numeric',
                      month: 'long', 
                      year: 'numeric'
                    }) : '-'}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Role</span>
                  <span className="text-gray-900 font-medium">
                    {user?.role === 'ADMIN' ? 'Administrator' :
                     user?.role === 'PENJUAL' ? 'Penjual' :
                     user?.role === 'PEMBELI' ? 'Pembeli' : 'Pengguna'}
                  </span>
                </div>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Aksi Cepat</h3>
              <div className="space-y-3">
                {user?.role === 'ADMIN' ? (
                  <>
                    <button
                      onClick={() => window.location.href = '/admin/dashboard'}
                      className="w-full text-left px-4 py-2 text-primary-600 hover:bg-primary-50 rounded-md transition-colors"
                    >
                      Dashboard Admin
                    </button>
                    <button
                      onClick={() => window.location.href = '/admin/produk'}
                      className="w-full text-left px-4 py-2 text-primary-600 hover:bg-primary-50 rounded-md transition-colors"
                    >
                      Kelola Produk
                    </button>
                    <button
                      onClick={() => window.location.href = '/admin/pengguna'}
                      className="w-full text-left px-4 py-2 text-primary-600 hover:bg-primary-50 rounded-md transition-colors"
                    >
                      Kelola Pengguna
                    </button>
                  </>
                ) : user?.role === 'PENJUAL' ? (
                  <>
                    <button
                      onClick={() => window.location.href = '/produk-saya'}
                      className="w-full text-left px-4 py-2 text-primary-600 hover:bg-primary-50 rounded-md transition-colors"
                    >
                      Produk Saya
                    </button>
                    <button
                      onClick={() => window.location.href = '/dashboard-penjual'}
                      className="w-full text-left px-4 py-2 text-primary-600 hover:bg-primary-50 rounded-md transition-colors"
                    >
                      Transaksi
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      onClick={() => window.location.href = '/produk'}
                      className="w-full text-left px-4 py-2 text-primary-600 hover:bg-primary-50 rounded-md transition-colors"
                    >
                      Lihat Produk
                    </button>
                    <button
                      onClick={() => window.location.href = '/dashboard-pembeli'}
                      className="w-full text-left px-4 py-2 text-primary-600 hover:bg-primary-50 rounded-md transition-colors"
                    >
                      Dashboard Pembeli
                    </button>
                  </>
                )}
                <button
                  onClick={logout}
                  className="w-full text-left px-4 py-2 text-red-600 hover:bg-red-50 rounded-md transition-colors"
                >
                  Keluar
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Profil;