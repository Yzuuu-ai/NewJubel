import React from 'react';
import { Link } from 'react-router-dom';
const Footer = () => {
  return (
    <footer className="bg-white border-t">
      <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col sm:flex-row justify-between items-center gap-4 sm:gap-0">
          <div className="text-sm text-gray-500 text-center sm:text-left">
            © 2024 Jubel Marketplace. All rights reserved.
          </div>
          <div className="flex flex-col sm:flex-row items-center gap-2 sm:gap-6">
            <Link to="/riwayat-transaksi" className="text-sm text-gray-500 hover:text-gray-700">
              Riwayat Transaksi
            </Link>
            <a href="#" className="text-sm text-gray-500 hover:text-gray-700">
              Bantuan
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
};
export default Footer;
