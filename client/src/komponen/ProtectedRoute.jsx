import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../konteks/AuthContext';
const ProtectedRoute = ({ children, requireAuth = true, redirectTo = '/masuk' }) => {
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
  // If auth is required but user is not authenticated
  if (requireAuth && !isAuthenticated) {
    return <Navigate to={redirectTo} state={{ from: location }} replace />;
  }
  // If auth is not required but user is authenticated (like login/register pages)
  if (!requireAuth && isAuthenticated) {
    // Redirect based on user role
    if (user?.role === 'ADMIN') {
      return <Navigate to="/admin" replace />;
    } else {
      return <Navigate to={redirectTo || "/beranda"} replace />;
    }
  }
  return children;
};
export default ProtectedRoute;
