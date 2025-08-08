import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../konteks/AuthContext';

const RoleBasedRedirect = () => {
  const { isAuthenticated, user, loading } = useAuth();

  // Show loading while checking auth
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  // If not authenticated, redirect to beranda
  if (!isAuthenticated) {
    return <Navigate to="/beranda" replace />;
  }

  // If authenticated, redirect based on role
  if (user?.role === 'ADMIN') {
    return <Navigate to="/admin" replace />;
  } else {
    return <Navigate to="/beranda" replace />;
  }
};

export default RoleBasedRedirect;