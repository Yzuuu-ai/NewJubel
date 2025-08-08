import React from 'react';
import Navbar from './Navbar';
import Footer from './Footer';
// import NotificationSystem from './NotificationSystem'; // DISABLED: Pop-up notifications dinonaktifkan

const Layout = ({ children }) => {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navigation */}
      <Navbar />
      {/* Main content */}
      <main className="flex-1">
        {children}
      </main>
      {/* Footer */}
      <Footer />
      {/* Real-time Notifications - DISABLED */}
      {/* <NotificationSystem /> */}
    </div>
  );
};

export default Layout;