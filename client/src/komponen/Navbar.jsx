import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../konteks/AuthContext';
import { useWallet } from '../konteks/WalletContext';
import { 
  HomeIcon, 
  ShoppingBagIcon, 
  UserIcon, 
  CogIcon,
  ArrowRightOnRectangleIcon,
  WalletIcon,
  ChevronDownIcon,
  DocumentTextIcon
} from '@heroicons/react/24/outline';

const Navbar = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout, isAuthenticated } = useAuth();
  const { isConnected, account, balance, connectWallet, formatAddress, formatBalance } = useWallet();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);
  
  const handleLogout = async () => {
    await logout();
    navigate('/masuk');
  };

  // Function to get user display name
  const getUserDisplayName = () => {
    // Try different possible fields for user name based on AuthContext structure
    // Priority: profil.nama > nama > other fields > email fallback
    return user?.profil?.nama || 
           user?.nama || 
           user?.profile?.nama ||
           user?.profile?.username || 
           user?.username || 
           user?.profile?.name || 
           user?.name ||
           user?.email?.split('@')[0] || 
           'User';
  };

  // Main navigation - conditional based on user role
  let navigation = [];
  
  // For ADMIN users, only show Admin Panel
  if (isAuthenticated && user?.role === 'ADMIN') {
    navigation = [
      { name: 'Admin Panel', href: '/admin', icon: CogIcon }
    ];
  } else if (isAuthenticated && user?.role === 'PENJUAL') {
    // For PENJUAL users, show Produk Saya and Transaksi in main navigation
    navigation = [
      { name: 'Produk Saya', href: '/produk-saya', icon: ShoppingBagIcon },
      { name: 'Transaksi', href: '/dashboard', icon: DocumentTextIcon }
    ];
  } else {
    // For PEMBELI users and non-authenticated users, show regular navigation
    navigation = [
      { name: 'Beranda', href: '/beranda', icon: HomeIcon },
      { name: 'Produk', href: '/produk', icon: ShoppingBagIcon },
    ];

    // Remove Aktivitas Transaksi from PEMBELI navigation - only admin should have transaction activity
  }

  // User dropdown menu items
  const userDropdownItems = [
    { name: 'Profil', href: '/profil', icon: UserIcon },
  ];

  // Add menu items based on user role (only for non-admin users)
  if (user?.role === 'PEMBELI') {
    userDropdownItems.push(
      { name: 'Dashboard', href: '/dashboard', icon: CogIcon }
    );
  }
  // For PENJUAL users, Dashboard and Produk Saya are now in main navigation, not dropdown
  // For ADMIN users, only Profil is available in dropdown (no additional menu items)

  // Admin Panel is now in main navigation, not in dropdown

  const isDashboardActive = location.pathname === '/dashboard' ||
                           location.pathname === '/penjual' ||
                           location.pathname === '/penjual/transaksi' ||
                           location.pathname === '/pembeli' ||
                           location.pathname === '/pembeli/transaksi' ||
                           location.pathname === '/produk-saya' ||
                           location.pathname.startsWith('/edit-produk') ||
                           location.pathname.startsWith('/admin');

  return (
    <nav className="bg-white shadow-sm border-b">
      <div className="max-w-[90%] mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-12">
          {/* Logo and main navigation */}
          <div className="flex items-center">
            <div className="flex-shrink-0 flex items-center">
              <Link 
                to={
                  isAuthenticated && user?.role === 'ADMIN' ? '/admin' :
                  isAuthenticated && user?.role === 'PENJUAL' ? '/produk-saya' :
                  '/beranda'
                }
                className="text-2xl font-bold text-primary-600"
              >
                Jubel
              </Link>
            </div>
            {/* Hamburger menu for mobile */}
            <div className="flex sm:hidden ml-4">
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="inline-flex items-center justify-center p-2 rounded-md text-gray-500 hover:text-gray-700 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-primary-500"
                aria-controls="mobile-menu"
                aria-expanded={mobileMenuOpen}
              >
                <svg className="block h-6 w-6" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                  {mobileMenuOpen ? (
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                  ) : (
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />
                  )}
                </svg>
              </button>
            </div>
            <div className="hidden sm:ml-6 sm:flex">
              <nav className="-mb-px flex space-x-4">
                {navigation.map((item, index) => {
                  const Icon = item.icon;
                  const isActive = location.pathname === item.href || 
                                 (item.href === '/admin' && location.pathname.startsWith('/admin'));
                  return (
                    <Link
                      key={`nav-${index}-${item.name}`}
                      to={item.href}
                      className={`py-2 px-2 border-b-2 font-medium text-sm inline-flex items-center ${
                        isActive
                          ? 'border-blue-500 text-blue-600'
                          : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                      }`}
                    >
                      <Icon className="h-4 w-4 mr-2" />
                      {item.name}
                    </Link>
                  );
                })}
              </nav>
            </div>
          </div>
          
          {/* Right side navigation */}
          <div className="flex items-center space-x-4">
                        
            {/* Wallet Connection - Hide for ADMIN users */}
            {isAuthenticated && user?.role !== 'ADMIN' && (
              <div className="flex items-center space-x-2">
                {isConnected ? (
                  // Wallet terhubung dan terverifikasi - Tombol keren dengan balance
                  <div className="flex items-center space-x-2 bg-gradient-to-r from-green-50 to-emerald-50 px-3 py-1 rounded-lg border border-green-200 shadow-sm">
                    <div className="relative">
                      <WalletIcon className="h-4 w-4 text-green-600" />
                      <div className="absolute -top-1 -right-1 w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                    </div>
                    <span className="text-sm font-medium text-green-800">
                      {formatBalance(balance)} ETH
                    </span>
                  </div>
                ) : user?.walletAddress ? (
                  // User punya wallet terdaftar tapi belum connect - Tombol connect keren
                  <button
                    onClick={connectWallet}
                    className="relative group flex items-center space-x-1 bg-gradient-to-r from-orange-50 to-amber-50 hover:from-orange-100 hover:to-amber-100 px-2 py-0.5 rounded-md border border-orange-200 transition-all duration-300 text-xs font-medium"
                  >
                    <WalletIcon className="h-4 w-4 text-orange-600 group-hover:animate-bounce" />
                    <span className="text-sm font-medium text-orange-700">Connect Wallet</span>
                    <div className="absolute inset-0 rounded-lg bg-gradient-to-r from-orange-400 to-amber-400 opacity-0 group-hover:opacity-10 transition-opacity duration-300"></div>
                  </button>
                ) : (
                  // User belum punya wallet terdaftar - Tombol info keren
                  <div className="flex items-center space-x-2 bg-gradient-to-r from-yellow-50 to-orange-50 px-3 py-1 rounded-lg border border-yellow-200 shadow-sm">
                    <WalletIcon className="h-4 w-4 text-yellow-600" />
                    <span className="text-sm font-medium text-yellow-700">Setup Wallet</span>
                  </div>
                )}
              </div>
            )}
            
            {/* User menu */}
            {isAuthenticated ? (
              <div className="relative">
                {/* User dropdown button */}
                <button
                  onClick={() => setUserDropdownOpen(!userDropdownOpen)}
                  className="flex items-center space-x-2 text-gray-700 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium transition-colors"
                >
                  <div className="flex items-center space-x-2">
                    <div className="w-8 h-8 bg-primary-100 rounded-full flex items-center justify-center">
                      <UserIcon className="h-4 w-4 text-primary-600" />
                    </div>
                    <span className="hidden sm:block text-xs font-medium">
                      {getUserDisplayName()}
                    </span>
                    <ChevronDownIcon className={`h-4 w-4 transition-transform ${userDropdownOpen ? 'rotate-180' : ''}`} />
                  </div>
                </button>

                {/* Dropdown menu */}
                {userDropdownOpen && (
                  <>
                    {/* Backdrop */}
                    <div 
                      className="fixed inset-0 z-10" 
                      onClick={() => setUserDropdownOpen(false)}
                    ></div>
                    
                    {/* Dropdown content */}
                    <div className="absolute right-0 mt-2 w-56 bg-white rounded-lg shadow-lg border border-gray-200 z-20">
                      <div className="py-2">
                        {/* User info header */}
                        <div className="px-4 py-2 border-b border-gray-100">
                          <p className="text-sm font-medium text-gray-900">
                            {getUserDisplayName()}
                          </p>
                          <p className="text-xs text-gray-500 truncate">
                            {user?.email}
                          </p>
                        </div>
                        
                        {/* Menu items */}
                        {userDropdownItems.map((item, index) => {
                          const Icon = item.icon;
                          return (
                            <Link
                              key={`dropdown-${index}-${item.name}`}
                              to={item.href}
                              onClick={() => setUserDropdownOpen(false)}
                              className={`flex items-center px-4 py-2 text-sm hover:bg-gray-50 transition-colors ${
                                location.pathname === item.href
                                  ? 'text-primary-600 bg-primary-50'
                                  : 'text-gray-700'
                              }`}
                            >
                              <Icon className="h-4 w-4 mr-3" />
                              {item.name}
                            </Link>
                          );
                        })}
                        
                        {/* Logout */}
                        <div className="border-t border-gray-100 mt-2 pt-2">
                          <button
                            onClick={() => {
                              setUserDropdownOpen(false);
                              handleLogout();
                            }}
                            className="flex items-center w-full px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
                          >
                            <ArrowRightOnRectangleIcon className="h-4 w-4 mr-3" />
                            Logout
                          </button>
                        </div>
                      </div>
                    </div>
                  </>
                )}
              </div>
            ) : (
              <div className="flex items-center space-x-4">
                <Link
                  to="/masuk"
                  className="text-gray-500 hover:text-gray-700 px-3 py-2 text-sm font-medium"
                >
                  Masuk
                </Link>
                <Link
                  to="/daftar"
                  state={{ from: '/beranda' }}
                  className="bg-primary-600 hover:bg-primary-700 text-white px-4 py-2 text-sm font-medium rounded-md"
                >
                  Daftar
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
      
      {/* Mobile menu, show/hide based on menu state. */}
      {mobileMenuOpen && (
        <div className="sm:hidden fixed inset-0 z-40 bg-black bg-opacity-30" onClick={() => setMobileMenuOpen(false)}></div>
      )}
      <div className={`sm:hidden fixed top-0 left-0 w-64 h-full bg-white shadow-lg z-50 transform transition-transform duration-200 ease-in-out ${mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}`}
        id="mobile-menu"
      >
        <div className="flex flex-col h-full p-6">
          <div className="flex items-center justify-between mb-8">
            <Link 
              to={
                isAuthenticated && user?.role === 'ADMIN' ? '/admin' :
                isAuthenticated && user?.role === 'PENJUAL' ? '/produk-saya' :
                '/beranda'
              }
              className="text-2xl font-bold text-primary-600" 
              onClick={() => setMobileMenuOpen(false)}
            >
              Jubel
            </Link>
            <button onClick={() => setMobileMenuOpen(false)} className="p-2 rounded-md text-gray-500 hover:text-gray-700 hover:bg-gray-100">
              <svg className="h-6 w-6" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          
          <nav className="flex flex-col gap-2 mt-2 mb-4">
            {/* Main navigation */}
            {navigation.map((item, index) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.href || 
                             (item.href === '/admin' && location.pathname.startsWith('/admin'));
              return (
                <Link
                  key={`mobile-nav-${index}-${item.name}`}
                  to={item.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className={
                    `${isActive ? 'bg-primary-50 text-primary-700 font-semibold' : 'text-gray-600 hover:bg-gray-100 hover:text-primary-700'} flex items-center px-4 py-2 text-base rounded-md transition-colors`
                  }
                >
                  <Icon className="h-5 w-5 mr-2" />
                  {item.name}
                </Link>
              );
            })}
            
                        
            {/* User menu items in mobile */}
            {isAuthenticated && userDropdownItems.length > 0 && (
              <>
                <div className="border-t border-gray-200 my-4"></div>
                <div className="px-4 py-2">
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Akun Saya</p>
                </div>
                {userDropdownItems.map((item, index) => {
                  const Icon = item.icon;
                  return (
                    <Link
                      key={`mobile-user-nav-${index}-${item.name}`}
                      to={item.href}
                      onClick={() => setMobileMenuOpen(false)}
                      className={
                        `${location.pathname === item.href ? 'bg-primary-50 text-primary-700 font-semibold' : 'text-gray-600 hover:bg-gray-100 hover:text-primary-700'} flex items-center px-4 py-2 text-base rounded-md transition-colors`
                      }
                    >
                      <Icon className="h-5 w-5 mr-2" />
                      {item.name}
                    </Link>
                  );
                })}
              </>
            )}
            
            {!isAuthenticated && (
              <>
                <Link
                  to="/masuk"
                  onClick={() => setMobileMenuOpen(false)}
                  className="text-gray-600 hover:bg-gray-100 hover:text-primary-700 px-4 py-2 text-base rounded-md transition-colors"
                >
                  Masuk
                </Link>
                <Link
                  to="/daftar"
                  state={{ from: '/beranda' }}
                  onClick={() => setMobileMenuOpen(false)}
                  className="bg-primary-600 hover:bg-primary-700 text-white px-4 py-2 text-base font-medium rounded-md transition-colors"
                >
                  Daftar
                </Link>
              </>
            )}
          </nav>
          
          {isAuthenticated && (
            <div className="mt-auto border-t pt-4">
              {/* Wallet section - Hide for ADMIN users */}
              {user?.role !== 'ADMIN' && (
                <div className="flex items-center space-x-2 mb-4">
                  {isConnected ? (
                    <div className="flex items-center space-x-2 bg-gradient-to-r from-green-50 to-emerald-50 px-3 py-1 rounded-lg border border-green-200 shadow-sm">
                      <WalletIcon className="h-4 w-4 text-green-600" />
                      <span className="text-sm font-medium text-green-800">
                        {formatBalance(balance)} ETH
                      </span>
                    </div>
                  ) : user?.walletAddress ? (
                    <button
                      onClick={connectWallet}
                      className="relative group flex items-center space-x-2 bg-gradient-to-r from-orange-50 to-amber-50 hover:from-orange-100 hover:to-amber-100 px-3 py-1 rounded-lg border border-orange-200 transition-all duration-300 shadow-sm hover:shadow-md transform hover:scale-105"
                    >
                      <WalletIcon className="h-4 w-4 text-orange-600 group-hover:animate-bounce" />
                      <span className="text-sm font-medium text-orange-700">Connect Wallet</span>
                    </button>
                  ) : (
                    <div className="flex items-center space-x-2 bg-gradient-to-r from-yellow-50 to-orange-50 px-3 py-1 rounded-lg border border-yellow-200 shadow-sm">
                      <WalletIcon className="h-4 w-4 text-yellow-600" />
                      <span className="text-sm font-medium text-yellow-700">Setup Wallet</span>
                    </div>
                  )}
                </div>
              )}
              
              <div className="flex flex-col items-start gap-2 mt-2 border rounded-lg p-3 bg-gray-50 w-full">
                <div className="mb-1">
                  <p className="text-gray-900 font-medium break-all text-xs">
                    {getUserDisplayName()}
                  </p>
                  <p className="text-gray-500 text-xs truncate">
                    {user?.email}
                  </p>
                </div>
              </div>
              
              <button
                onClick={() => { setMobileMenuOpen(false); handleLogout(); }}
                className="w-full mt-3 flex items-center justify-center text-gray-500 hover:text-white hover:bg-red-600 p-2 rounded-md border border-gray-200 bg-white transition-colors"
                title="Logout"
              >
                <ArrowRightOnRectangleIcon className="h-5 w-5" />
                <span className="ml-2 text-sm">Logout</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
