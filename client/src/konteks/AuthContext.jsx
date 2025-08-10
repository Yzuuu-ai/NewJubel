import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { apiService } from '../layanan/api';
import toast from 'react-hot-toast';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  // PERBAIKAN: Validasi user yang lebih robust dengan storage consistency
  const validateUser = useCallback(async () => {
    try {
      // Always use localStorage for consistency
      const storage = localStorage;
      const token = storage.getItem('authToken');
      const storedUser = storage.getItem('user');

      if (!token || !storedUser) {
        setUser(null);
        setIsAuthenticated(false);
        setLoading(false);
        return;
      }

      // Parse stored user data
      let parsedUser;
      try {
        parsedUser = JSON.parse(storedUser);
      } catch (parseError) {
        console.error('❌ Error parsing stored user:', parseError);
        storage.removeItem('authToken');
        storage.removeItem('user');
        setUser(null);
        setIsAuthenticated(false);
        setLoading(false);
        return;
      }

      // Try to validate token with backend
      try {
        const response = await apiService.auth.validateToken();
        if (response.data.sukses) {
          // Handle different response structures
          const validatedUser = response.data.user || response.data.data?.pengguna || response.data.data?.user || response.data.data;
          if (validatedUser) {
            // PERBAIKAN: Ensure consistent user object structure with ALL fields including wallet
            const normalizedUser = {
              id: validatedUser.id,
              email: validatedUser.email,
              role: validatedUser.role,
              // PERBAIKAN: Handle multiple possible wallet address fields
              walletAddress: validatedUser.walletAddress || validatedUser.alamatWallet,
              alamatWallet: validatedUser.alamatWallet || validatedUser.walletAddress,
              dibuatPada: validatedUser.dibuatPada,
              profil: {
                nama: validatedUser.nama || validatedUser.profil?.nama || validatedUser.profile?.nama || '',
                nomor_telepon: validatedUser.nomor_telepon || validatedUser.profil?.nomor_telepon || validatedUser.profile?.nomor_telepon || '',
                alamat: validatedUser.alamat || validatedUser.profil?.alamat || validatedUser.profile?.alamat || '',
                // PERBAIKAN: Tambahkan alamatWallet di profil juga
                alamatWallet: validatedUser.walletAddress || validatedUser.alamatWallet || validatedUser.profil?.alamatWallet
              }
            };
            
            setUser(normalizedUser);
            setIsAuthenticated(true);
            // Update storage dengan data user yang tervalidasi
            storage.setItem('user', JSON.stringify(normalizedUser));
          } else {
            throw new Error('No user data in response');
          }
        } else {
          throw new Error('Invalid token response');
        }
      } catch (apiError) {
        console.warn('⚠️ Token validation API failed, using stored user data:', apiError.message);
        // PERBAIKAN: Fallback to stored user data dengan normalisasi struktur
        const normalizedStoredUser = {
          ...parsedUser,
          walletAddress: parsedUser.walletAddress || parsedUser.alamatWallet,
          alamatWallet: parsedUser.alamatWallet || parsedUser.walletAddress,
          profil: {
            ...parsedUser.profil,
            alamatWallet: parsedUser.walletAddress || parsedUser.alamatWallet || parsedUser.profil?.alamatWallet
          }
        };
        setUser(normalizedStoredUser);
        setIsAuthenticated(true);
        // Update storage dengan struktur yang dinormalisasi
        storage.setItem('user', JSON.stringify(normalizedStoredUser));
      }
    } catch (error) {
      console.error('❌ User validation failed:', error);
      localStorage.removeItem('authToken');
      localStorage.removeItem('user');
      setUser(null);
      setIsAuthenticated(false);
    } finally {
      setLoading(false);
    }
  }, []);

  // Check if user is logged in on app start
  useEffect(() => {
    validateUser();
  }, [validateUser]);

  const login = async (credentials) => {
    try {
      setLoading(true);
      const response = await apiService.auth.login(credentials);
      if (response.data.sukses) {
        const { token, pengguna } = response.data.data;
        
        // PERBAIKAN: Normalize user data to include all fields including wallet
        const normalizedUser = {
          id: pengguna.id,
          email: pengguna.email,
          role: pengguna.role,
          walletAddress: pengguna.walletAddress || pengguna.alamatWallet,
          alamatWallet: pengguna.alamatWallet || pengguna.walletAddress,
          dibuatPada: pengguna.dibuatPada,
          profil: {
            nama: pengguna.nama || pengguna.profil?.nama || pengguna.profile?.nama || '',
            nomor_telepon: pengguna.nomor_telepon || pengguna.profil?.nomor_telepon || pengguna.profile?.nomor_telepon || '',
            alamat: pengguna.alamat || pengguna.profil?.alamat || pengguna.profile?.alamat || '',
            alamatWallet: pengguna.walletAddress || pengguna.alamatWallet || pengguna.profil?.alamatWallet
          }
        };
        
        // Save to localStorage (consistent storage)
        localStorage.setItem('authToken', token);
        localStorage.setItem('user', JSON.stringify(normalizedUser));
        
        // Update state
        setUser(normalizedUser);
        setIsAuthenticated(true);
        toast.success(response.data.pesan || 'Login berhasil!');
        return { success: true, user: normalizedUser };
      } else {
        throw new Error(response.data.pesan || 'Login gagal');
      }
    } catch (error) {
      const errorMessage = error.response?.data?.pesan || error.response?.data?.message || error.message || 'Login gagal';
      toast.error(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setLoading(false);
    }
  };

  const register = async (userData) => {
    try {
      setLoading(true);
      const response = await apiService.auth.register(userData);
      if (response.data.sukses) {
        toast.success(response.data.pesan || 'Registrasi berhasil! Silakan login.');
        return { success: true };
      } else {
        throw new Error(response.data.pesan || 'Registrasi gagal');
      }
    } catch (error) {
      const errorMessage = error.response?.data?.pesan || error.response?.data?.message || error.message || 'Registrasi gagal';
      toast.error(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    try {
      // Call logout API
      await apiService.auth.logout();
    } catch (error) {
      // Continue with logout even if API call fails
      console.error('Error during logout:', error);
    } finally {
      // Set flag untuk mencegah toast error dari AdminRoute
      localStorage.setItem('justLoggedOut', 'true');
      
      // Clear storage (consistent with localStorage)
      localStorage.removeItem('authToken');
      localStorage.removeItem('user');
      
      // Update state
      setUser(null);
      setIsAuthenticated(false);
      toast.success('Logout berhasil');
      
      // Clear flag setelah delay
      setTimeout(() => {
        localStorage.removeItem('justLoggedOut');
      }, 1000);
    }
  };

  const updateProfile = async (profileData) => {
    try {
      setLoading(true);
      console.log('🔄 Updating profile with data:', profileData);
      
      const response = await apiService.auth.updateProfile(profileData);
      console.log('✅ Profile update response:', response.data);
      
      if (response.data.sukses) {
        const updatedData = response.data.data;
        
        // PERBAIKAN: Handle wallet address update dengan lebih robust
        const newWalletAddress = profileData.alamatWallet || updatedData.walletAddress || updatedData.alamatWallet;
        
        // Update user object dengan data baru dari response
        const updatedUser = {
          ...user,
          id: updatedData.id || user.id,
          email: updatedData.email || user.email,
          role: updatedData.role || user.role,
          // PERBAIKAN: Pastikan wallet address ter-update dengan benar
          walletAddress: newWalletAddress || user.walletAddress,
          alamatWallet: newWalletAddress || user.alamatWallet,
          dibuatPada: updatedData.dibuatPada || user.dibuatPada,
          profil: {
            nama: updatedData.profil?.nama || user.profil?.nama || '',
            nomor_telepon: updatedData.profil?.nomor_telepon || user.profil?.nomor_telepon || '',
            alamat: updatedData.profil?.alamat || user.profil?.alamat || '',
            // PERBAIKAN: Tambahkan alamatWallet di profil juga
            alamatWallet: newWalletAddress || user.profil?.alamatWallet
          }
        };
        
        console.log('🔄 Updated user object:', updatedUser);
        
        // PERBAIKAN: Update storage dengan struktur yang konsisten
        localStorage.setItem('user', JSON.stringify(updatedUser));
        
        // Update state
        setUser(updatedUser);
        
        return { success: true, user: updatedUser };
      } else {
        throw new Error(response.data.pesan || 'Gagal memperbarui profil');
      }
    } catch (error) {
      console.error('❌ Error updating profile:', error);
      const errorMessage = error.response?.data?.pesan || error.response?.data?.message || error.message || 'Gagal memperbarui profil';
      return { success: false, error: errorMessage };
    } finally {
      setLoading(false);
    }
  };

  // Helper functions
  const isAdmin = () => {
    return user?.role === 'ADMIN';
  };

  const isUser = () => {
    return user?.role === 'USER';
  };

  const isPenjual = () => {
    return user?.role === 'PENJUAL';
  };

  const hasWallet = () => {
    return (user?.walletAddress || user?.alamatWallet) ? true : false;
  };

  const getWalletAddress = () => {
    return user?.walletAddress || user?.alamatWallet || null;
  };

  // Check if user can sell (any user can sell)
  const canSell = () => {
    return isUser() || isAdmin() || isPenjual();
  };

  // Check if user can buy (any user can buy)
  const canBuy = () => {
    return isUser() || isAdmin() || isPenjual();
  };

  // Check if user has seller activity (will be checked by RoleGuard)
  const hasSellerActivity = () => {
    // This will be determined by RoleGuard based on actual transaction data
    return true; // Allow RoleGuard to handle the actual check
  };

  // Check if user has buyer activity (will be checked by RoleGuard)
  const hasBuyerActivity = () => {
    // This will be determined by RoleGuard based on actual transaction data
    return true; // Allow RoleGuard to handle the actual check
  };

  // PERBAIKAN: Function to directly update user state (for immediate UI updates)
  const setUserData = (userData) => {
    // Normalize data structure before setting
    const normalizedUserData = {
      ...userData,
      walletAddress: userData.walletAddress || userData.alamatWallet,
      alamatWallet: userData.alamatWallet || userData.walletAddress,
      profil: {
        ...userData.profil,
        alamatWallet: userData.walletAddress || userData.alamatWallet || userData.profil?.alamatWallet
      }
    };
    setUser(normalizedUserData);
    localStorage.setItem('user', JSON.stringify(normalizedUserData));
  };

  const value = {
    user,
    setUser: setUserData,
    loading,
    isAuthenticated,
    login,
    register,
    logout,
    updateProfile,
    validateUser,
    // Helper functions
    isAdmin,
    isUser,
    isPenjual,
    canSell,
    canBuy,
    hasSellerActivity,
    hasBuyerActivity,
    hasWallet,
    getWalletAddress,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};