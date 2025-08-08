import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../konteks/AuthContext';
import { toastManager } from '../utils/toastManager';

const AdminRoute = ({ children }) => {
  const { user, isAuthenticated, loading } = useAuth();

  // Show loading while checking authentication
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Memeriksa akses admin...</p>
        </div>
      </div>
    );
  }

  // Jika tidak login, redirect ke halaman masuk
  if (!isAuthenticated) {
    toastManager.error('Anda harus login sebagai admin untuk mengakses halaman ini');
    return <Navigate to="/masuk" replace />;
  }

  // Jika user tidak ada atau bukan admin, redirect ke beranda
  if (!user) {
    toastManager.error('Akses ditolak. Halaman ini hanya untuk admin.');
    return <Navigate to="/beranda" replace />;
  }

  if (user.role !== 'ADMIN') {
    toastManager.error('Akses ditolak. Halaman ini hanya untuk admin.');
    return <Navigate to="/beranda" replace />;
  }

  // Jika admin, tampilkan halaman
  return children;
};

export default AdminRoute;