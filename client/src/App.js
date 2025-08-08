import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';

// Wallet error suppression for known non-critical errors
import './utils/walletErrorSuppression';

// Context Providers
import { AuthProvider } from './konteks/AuthContext.jsx';
import { WalletProvider } from './konteks/WalletContext.jsx';
import { NotificationProvider } from './konteks/NotificationContext.js';

// Layout
import Layout from './komponen/Layout';
import BatasPenangananError from './komponen/BatasPenangananError';
import WalletErrorBoundary from './komponen/WalletErrorBoundary';
import AdminRoute from './komponen/AdminRoute';
import ProtectedRoute from './komponen/ProtectedRoute';
import PenjualRoute from './komponen/PenjualRoute';
import RoleBasedRedirect from './komponen/RoleBasedRedirect';
// import NotifikasiTransaksi from './komponen/NotifikasiTransaksi'; // DISABLED: Pop-up notifications dinonaktifkan

// Pages
import Beranda from './halaman/beranda/Beranda';
import Masuk from './halaman/masuk/Masuk';
import Daftar from './halaman/daftar/Daftar';
import Profil from './halaman/profil/Profil';
import Produk from './halaman/produk/Produk';
import DashboardPenjual from './halaman/penjual/DashboardPenjual';
import DashboardPembeli from './halaman/pembeli/DashboardPembeli';
import DetailProduk from './halaman/detail-produk/DetailProduk';
import AdminDashboard from './halaman/admin/AdminDashboard';
import PenggunaAdmin from './halaman/admin/PenggunaAdmin';
import ProdukAdmin from './halaman/admin/ProdukAdmin';
import PembayaranAdmin from './halaman/admin/PembayaranAdmin';
import ProdukSaya from './halaman/penjual/ProdukSaya';
import EditProduk from './halaman/penjual/EditProduk';
import DetailTransaksi from './halaman/DetailTransaksi';
import DashboardTransaksiSemua from './halaman/dashboard/DashboardTransaksi';
import Dashboard from './halaman/dashboard/Dashboard';

// Temporary placeholder component
const PlaceholderPage = ({ title }) => (
  <div className="min-h-screen flex items-center justify-center bg-gray-50">
    <div className="text-center">
      <h1 className="text-4xl font-bold text-gray-900 mb-4">
        {title}
      </h1>
      <p className="text-gray-600">Halaman ini sedang dalam pengembangan</p>
    </div>
  </div>
);

function App() {
  return (
    <WalletErrorBoundary>
      <BatasPenangananError>
        <Router>
          <AuthProvider>
            <WalletProvider>
              <NotificationProvider>
                <div className="App">
                {/* Toast notifications */}
                <Toaster
                  position="top-right"
                  toastOptions={{
                    duration: 4000,
                    style: {
                      background: '#363636',
                      color: '#fff',
                    },
                    success: {
                      duration: 3000,
                      theme: {
                        primary: '#4aed88',
                      },
                    },
                  }}
                />

                <Routes>
                  {/* Public routes */}
                  <Route path="/" element={<RoleBasedRedirect />} />
                  <Route path="/masuk" element={<ProtectedRoute requireAuth={false} redirectTo="/beranda"><Masuk /></ProtectedRoute>} />
                  <Route path="/daftar" element={<ProtectedRoute requireAuth={false} redirectTo="/beranda"><Daftar /></ProtectedRoute>} />
                  
                  {/* Routes with layout */}
                  <Route path="/*" element={
                    <Layout>
                      <Routes>
                        <Route path="/beranda" element={<Beranda />} />
                        <Route path="/produk" element={<Produk />} />
                        <Route path="/produk/:id" element={<DetailProduk />} />
                        <Route path="/profil" element={<ProtectedRoute><Profil /></ProtectedRoute>} />
                        <Route path="/riwayat-transaksi" element={<ProtectedRoute><PlaceholderPage title="Riwayat Transaksi" /></ProtectedRoute>} />
                        
                        {/* Penjual-only routes */}
                        <Route path="/jual-akun" element={<Navigate to="/produk-saya" replace />} />
                        <Route path="/produk-saya" element={<PenjualRoute><ProdukSaya /></PenjualRoute>} />
                        <Route path="/edit-produk/:id" element={<PenjualRoute><EditProduk /></PenjualRoute>} />
                        
                        {/* New Unified Dashboard */}
                        <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
                        
                        {/* Legacy Penjual routes - redirect to new dashboard */}
                        <Route path="/penjual" element={<Navigate to="/dashboard" replace />} />
                        <Route path="/penjual/transaksi" element={<Navigate to="/dashboard" replace />} />
                        <Route path="/dashboard-penjual" element={<Navigate to="/dashboard" replace />} />
                        
                        {/* Legacy Pembeli routes - redirect to new dashboard */}
                        <Route path="/pembeli" element={<Navigate to="/dashboard" replace />} />
                        <Route path="/pembeli/transaksi" element={<Navigate to="/dashboard" replace />} />
                        <Route path="/dashboard-pembeli" element={<Navigate to="/dashboard" replace />} />
                        
                        {/* Dashboard Transaksi - Redirect to aktivitas */}
                        <Route path="/dashboard-transaksi" element={<Navigate to="/aktivitas" replace />} />
                        <Route path="/transaksi" element={<Navigate to="/aktivitas" replace />} />
                        
                        {/* Dashboard Transaksi Semua User - OpenSea Style */}
                        <Route path="/aktivitas" element={<ProtectedRoute><DashboardTransaksiSemua /></ProtectedRoute>} />
                        <Route path="/aktivitas-transaksi" element={<ProtectedRoute><DashboardTransaksiSemua /></ProtectedRoute>} />
                        
                        {/* Detail Transaksi */}
                        <Route path="/transaksi/:id" element={<ProtectedRoute><DetailTransaksi /></ProtectedRoute>} />
                        
                        <Route path="/kirim-akun/:id" element={<ProtectedRoute><PlaceholderPage title="Kirim Akun" /></ProtectedRoute>} />
                        
                        {/* Admin routes */}
                        <Route path="/admin" element={<AdminRoute><AdminDashboard /></AdminRoute>} />
                        <Route path="/admin/pembayaran" element={<AdminRoute><PembayaranAdmin /></AdminRoute>} />
                        <Route path="/admin/pengguna" element={<AdminRoute><PenggunaAdmin /></AdminRoute>} />
                        <Route path="/admin/produk" element={<AdminRoute><ProdukAdmin /></AdminRoute>} />
                                                                                          
                        {/* 404 */}
                        <Route path="*" element={<PlaceholderPage title="Halaman Tidak Ditemukan" />} />
                      </Routes>
                    </Layout>
                  } />
                </Routes>
                
                {/* Global Notifications - DISABLED */}
                {/* <NotifikasiTransaksi /> */}
                
                </div>
              </NotificationProvider>
            </WalletProvider>
          </AuthProvider>
        </Router>
      </BatasPenangananError>
    </WalletErrorBoundary>
  );
}

export default App;