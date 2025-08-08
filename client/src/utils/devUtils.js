// Development utilities
export const clearAuthData = () => {
  localStorage.removeItem('authToken');
  localStorage.removeItem('user');
  console.log('🧹 Auth data cleared from localStorage');
  window.location.reload();
};

// Auto-clear auth data in development mode
export const enableDevMode = () => {
  if (process.env.NODE_ENV === 'development') {
    // Add global function to clear auth
    window.clearAuth = clearAuthData;
    
    // Add function to check current auth status
    window.checkAuth = () => {
      const token = localStorage.getItem('authToken') || sessionStorage.getItem('authToken');
      const user = localStorage.getItem('user') || sessionStorage.getItem('user');
      console.log('🔍 Current auth status:', {
        hasToken: !!token,
        hasUser: !!user,
        token: token ? token.substring(0, 20) + '...' : null,
        user: user ? JSON.parse(user) : null
      });
    };
    
    // Optional: Clear auth data on every page refresh (uncomment if needed)
    // clearAuthData();
    
    console.log('🔧 Dev mode enabled. Available commands:');
    console.log('  - window.clearAuth() - Clear authentication data');
    console.log('  - window.checkAuth() - Check current auth status');
  }
};