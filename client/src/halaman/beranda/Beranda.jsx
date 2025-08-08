import React, { useState, useEffect } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { useAuth } from '../../konteks/AuthContext';
import { useWallet } from '../../konteks/WalletContext';
import { 
  ShoppingBagIcon, 
  ShieldCheckIcon, 
  CurrencyDollarIcon,
  UserGroupIcon 
} from '@heroicons/react/24/outline';

// Import gambar
import MLImage from '../../gambar/ML.jpg';
import FFImage from '../../gambar/FF.jpg';
import PUBGImage from '../../gambar/PUBGM.jpg';
import GIImage from '../../gambar/GI.jpg';
const Beranda = () => {
  const { isAuthenticated, user, loading: authLoading } = useAuth();
  const { isConnected } = useWallet();
  const [gameStats, setGameStats] = useState([]);
  const [loading, setLoading] = useState(true);

  // Fetch game statistics from API
  useEffect(() => {
    const fetchGameStats = async () => {
      try {
        const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';
        const response = await fetch(`${API_BASE_URL}/produk/game-populer`);
        
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        if (data.sukses) {
          setGameStats(data.data.gamePopuler);
        }
      } catch (error) {
        console.error('Error fetching game stats:', error);
        // Set empty array so default games are shown
        setGameStats([]);
      } finally {
        setLoading(false);
      }
    };

    fetchGameStats();
  }, []);

  // Mapping game images
  const gameImages = {
    'Mobile Legends': MLImage,
    'Free Fire': FFImage,
    'PUBG Mobile': PUBGImage,
    'Genshin Impact': GIImage
  };

  // Game descriptions
  const gameDescriptions = {
    'Mobile Legends': 'Akun ML dengan rank tinggi dan skin rare',
    'Free Fire': 'Akun FF dengan diamond dan karakter premium',
    'PUBG Mobile': 'Akun PUBG dengan tier tinggi dan outfit eksklusif',
    'Genshin Impact': 'Akun Genshin dengan karakter 5-star dan weapon rare'
  };

  const features = [
    {
      name: 'Transaksi Aman',
      description: 'Menggunakan smart contract escrow untuk transparansi transaksi maksimal',
      icon: ShieldCheckIcon,
    },
    {
      name: 'Pembayaran Crypto',
      description: 'Pembayaran menggunakan Ethereum di Sepolia testnet',
      icon: CurrencyDollarIcon,
    },
    {
      name: 'Marketplace Terpercaya',
      description: 'Platform jual beli akun game yang terpercaya dan transparan',
      icon: ShoppingBagIcon,
    },
    {
      name: 'Komunitas Aktif',
      description: 'Bergabung dengan ribuan gamer yang sudah mempercayai kami',
      icon: UserGroupIcon,
    },
  ];
  // Default games yang akan ditampilkan
  const defaultGames = [
    { 
      name: 'Mobile Legends', 
      image: MLImage,
      count: '0 akun',
      description: 'Akun ML dengan rank tinggi dan skin rare'
    },
    { 
      name: 'Free Fire', 
      image: FFImage,
      count: '0 akun',
      description: 'Akun FF dengan diamond dan karakter premium'
    },
    { 
      name: 'PUBG Mobile', 
      image: PUBGImage,
      count: '0 akun',
      description: 'Akun PUBG dengan tier tinggi dan outfit eksklusif'
    },
    { 
      name: 'Genshin Impact', 
      image: GIImage,
      count: '0 akun',
      description: 'Akun Genshin dengan karakter 5-star dan weapon rare'
    },
  ];

  // Create games array from API data or use default
  const games = gameStats.length > 0 
    ? gameStats.map(game => ({
        name: game.namaGame,
        image: gameImages[game.namaGame] || MLImage,
        count: `${game.jumlahProduk} akun`,
        description: gameDescriptions[game.namaGame] || 'Akun game berkualitas tinggi'
      }))
    : defaultGames.map(game => {
        // Cari data dari API jika ada
        const apiGame = gameStats.find(g => g.namaGame === game.name);
        return {
          ...game,
          count: apiGame ? `${apiGame.jumlahProduk} akun` : game.count
        };
      });

  // Loading state games
  const loadingGames = defaultGames.map(game => ({
    ...game,
    count: 'Loading...'
  }));

  const displayGames = loading ? loadingGames : games;
  
  // Redirect admin to admin panel (after all hooks are called)
  if (isAuthenticated && user?.role === 'ADMIN') {
    return <Navigate to="/admin" replace />;
  }
  
  return (
    <div className="bg-white">
      {/* Hero Section */}
      <div className="relative bg-gradient-to-r from-primary-600 to-primary-800">
        <div className="absolute inset-0 bg-black opacity-20"></div>
        <div className="relative max-w-[90%] mx-auto py-8 px-4 sm:py-12 md:py-16 sm:px-6 lg:px-8">
          <h1 className="text-xl font-extrabold tracking-tight text-white sm:text-2xl md:text-3xl lg:text-4xl xl:text-5xl">
            Jual Beli Akun Game
            <span className="block text-primary-200 mt-1">Dengan Transparansi Transaksi Blockchain</span>
          </h1>
          <p className="mt-4 sm:mt-6 max-w-3xl text-base sm:text-lg md:text-xl text-primary-100 leading-relaxed">
            Platform marketplace pertama di Indonesia yang menggunakan teknologi smart contract 
            untuk menjamin transparansi transaksi jual beli akun game.
          </p>
          <div className="mt-6 sm:mt-8 md:mt-10 flex flex-col sm:flex-row gap-3 sm:gap-4">
            {!isAuthenticated ? (
              <>
                <Link
                  to="/masuk"
                  className="inline-flex items-center justify-center px-4 sm:px-6 py-2.5 sm:py-3 border border-transparent text-sm sm:text-base font-medium rounded-md text-primary-700 bg-white hover:bg-gray-50 transition-colors w-full sm:w-auto"
                >
                  Mulai Sekarang
                </Link>
                <Link
                  to="/produk"
                  className="inline-flex items-center justify-center px-4 sm:px-6 py-2.5 sm:py-3 border border-white text-sm sm:text-base font-medium rounded-md text-white hover:bg-white hover:text-primary-700 transition-colors w-full sm:w-auto"
                >
                  Lihat Produk
                </Link>
              </>
            ) : (
              <>
                <Link
                  to="/produk"
                  className="inline-flex items-center justify-center px-4 sm:px-6 py-2.5 sm:py-3 border border-transparent text-sm sm:text-base font-medium rounded-md text-primary-700 bg-white hover:bg-gray-50 transition-colors w-full sm:w-auto"
                >
                  Jelajahi Produk
                </Link>
                              </>
            )}
          </div>
        </div>
      </div>
      
      {/* Games Section */}
      <div className="py-12 sm:py-16 bg-white">
        <div className="max-w-[90%] mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h2 className="text-xs sm:text-sm md:text-base text-primary-600 font-semibold tracking-wide uppercase">
              Game Populer
            </h2>
            <p className="mt-2 text-2xl sm:text-3xl leading-7 sm:leading-8 font-extrabold tracking-tight text-gray-900 md:text-4xl">
              Akun Game Terlengkap
            </p>
            <p className="mt-3 sm:mt-4 max-w-2xl text-base sm:text-lg md:text-xl text-gray-500 mx-auto leading-relaxed">
              Temukan akun game impian Anda dari berbagai game populer
            </p>
          </div>
          <div className="mt-10 sm:mt-12 md:mt-16 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4 sm:gap-8">
            {displayGames.map((game, index) => (
              <Link 
                key={`game-${index}-${game.name}`} 
                to={`/produk?game=${encodeURIComponent(game.name)}`}
                className="relative group cursor-pointer"
              >
                <div className="relative w-full h-56 bg-gray-200 rounded-xl overflow-hidden group-hover:opacity-75 transition-all duration-300 shadow-lg group-hover:shadow-xl">
                  <img
                    src={game.image}
                    alt={game.name}
                    className="w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-300"
                    onError={(e) => {
                      e.target.style.display = 'none';
                      e.target.nextSibling.style.display = 'flex';
                    }}
                  />
                  <div className="w-full h-full bg-gradient-to-br from-primary-400 to-primary-600 flex items-center justify-center" style={{display: 'none'}}>
                    <span className="text-white font-bold text-xl">{game.name}</span>
                  </div>
                  {/* Overlay gradient for better text readability */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                  {/* Hover overlay with "Lihat Produk" text */}
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
                    <div className="text-white text-center">
                      <div className="text-lg font-semibold mb-1">Lihat Produk</div>
                      <div className="text-sm">{game.name}</div>
                    </div>
                  </div>
                </div>
                <div className="mt-4 text-center">
                  <h3 className="text-lg font-semibold text-gray-900 mb-1 group-hover:text-primary-600 transition-colors">{game.name}</h3>
                  <p className="text-sm font-medium text-primary-600">{game.count}</p>
                </div>
              </Link>
            ))}
          </div>
          <div className="mt-12 text-center">
            <Link
              to="/produk"
              className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700 transition-colors"
            >
              Lihat Semua Produk
            </Link>
          </div>
        </div>
      </div>

      {/* Features Section */}
      <div className="py-12 sm:py-16 bg-gray-50">
        <div className="max-w-[90%] mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center lg:text-center">
            <h2 className="text-xs sm:text-sm md:text-base text-primary-600 font-semibold tracking-wide uppercase">
              Keunggulan
            </h2>
            <p className="mt-2 text-2xl sm:text-3xl leading-7 sm:leading-8 font-extrabold tracking-tight text-gray-900 md:text-4xl">
              Mengapa Memilih Jubel?
            </p>
            <p className="mt-3 sm:mt-4 max-w-2xl text-base sm:text-lg md:text-xl text-gray-500 mx-auto leading-relaxed">
              Kami menggunakan teknologi blockchain terdepan untuk memberikan pengalaman 
              jual beli yang aman dan transparan.
            </p>
          </div>
          <div className="mt-10 sm:mt-12 md:mt-16">
            <dl className="space-y-8 sm:space-y-10 md:space-y-0 md:grid md:grid-cols-2 md:gap-x-6 lg:gap-x-8 md:gap-y-8 lg:gap-y-10">
              {features.map((feature, index) => (
                <div key={`feature-${index}-${feature.name}`} className="relative">
                  <dt>
                    <div className="absolute flex items-center justify-center h-10 w-10 sm:h-12 sm:w-12 rounded-md bg-primary-500 text-white">
                      <feature.icon className="h-5 w-5 sm:h-6 sm:w-6" aria-hidden="true" />
                    </div>
                    <p className="ml-12 sm:ml-16 text-base sm:text-lg leading-5 sm:leading-6 font-medium text-gray-900">
                      {feature.name}
                    </p>
                  </dt>
                  <dd className="mt-2 ml-12 sm:ml-16 text-sm sm:text-base text-gray-500 leading-relaxed">
                    {feature.description}
                  </dd>
                </div>
              ))}
            </dl>
          </div>
        </div>
      </div>
    </div>
  );
};
export default Beranda;
