import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../konteks/AuthContext';
import { toastManager } from '../utils/toastManager';

const PenjualRoute = ({ children }) => {
  const { isAuthenticated, loading, user } = useAuth();
  const location = useLocation();

  // Show loading spinner while checking auth
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  // If user is not authenticated
  if (!isAuthenticated) {
    toastManager.error('Anda harus login untuk mengakses halaman ini');
    return <Navigate to="/masuk" state={{ from: location }} replace />;
  }

  // If user is authenticated but not PENJUAL role
  if (user?.role !== 'PENJUAL') {
    toastManager.error('Akses ditolak. Halaman ini hanya untuk penjual.');
    return <Navigate to="/beranda" replace />;
  }

  // If user is authenticated and has PENJUAL role
  return children;
};

export default PenjualRoute;