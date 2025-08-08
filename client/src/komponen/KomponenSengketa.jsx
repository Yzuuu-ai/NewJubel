import React, { useState } from 'react';
import { useWallet } from '../konteks/WalletContext';
import { transaksiAPI } from '../layanan/api';
const KomponenSengketa = ({ transaksi, userRole, onSengketaCreated }) => {
  const [showModal, setShowModal] = useState(false);
  const [bukti, setBukti] = useState('');
  const [deskripsi, setDeskripsi] = useState('');
  const [loading, setLoading] = useState(false);
  const [useBlockchain, setUseBlockchain] = useState(false);
  const { account, isConnected } = useWallet();
  const canCreateDispute = () => {
    return transaksi.status === 'DIKIRIM' && 
           (userRole === 'pembeli' || userRole === 'penjual');
  };
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!bukti.trim() || !deskripsi.trim()) {
      alert('Bukti dan deskripsi wajib diisi');
      return;
    }
    setLoading(true);
    try {
      let blockchainTxHash = null;
      // Create dispute on blockchain if enabled and wallet connected
      if (useBlockchain && account && isConnected && transaksi.smartContractTxHash) {
        try {
          // Get escrow ID and initiator address
          const escrowId = transaksi.escrowId || transaksi.escrowAmount;
          const initiatorAddress = account;
          if (!escrowId) {
            throw new Error('Escrow ID tidak ditemukan');
          }
          // Import and use escrowService for secure dispute creation
          const { default: escrowService } = await import('../layanan/escrowService');
          const result = await escrowService.createDispute(escrowId, initiatorAddress, deskripsi);
          if (result.success) {
            blockchainTxHash = result.transactionHash;
          } else {
            throw new Error(result.error);
          }
        } catch (blockchainError) {
          console.error('Blockchain dispute failed:', blockchainError);
          // Ask user if they want to continue without blockchain
          const continueWithoutBlockchain = window.confirm(
            'Gagal membuat sengketa di blockchain: ' + blockchainError.message + '\n\nLanjutkan tanpa blockchain?'
          );
          if (!continueWithoutBlockchain) {
            setLoading(false);
            return;
          }
        }
      }
      // Create dispute in database
      const requestData = {
        bukti,
        deskripsi
      };
      // Add blockchain transaction hash if available
      if (blockchainTxHash) {
        requestData.blockchainTxHash = blockchainTxHash;
      }
      const response = await transaksiAPI.buatSengketa(transaksi.id, requestData);
      alert(response.data.pesan);
      setShowModal(false);
      setBukti('');
      setDeskripsi('');
      if (onSengketaCreated) {
        onSengketaCreated(response.data.data);
      }
    } catch (error) {
      console.error('Error creating dispute:', error);
      alert(error.response?.data?.pesan || 'Terjadi kesalahan saat membuat sengketa');
    } finally {
      setLoading(false);
    }
  };
  const getDisputeTitle = () => {
    return userRole === 'penjual' 
      ? 'Buat Sengketa Sebagai Penjual' 
      : 'Buat Sengketa Sebagai Pembeli';
  };
  const getDisputePlaceholder = () => {
    return userRole === 'penjual'
      ? 'Jelaskan mengapa Anda merasa sudah mengirim akun dengan benar sesuai deskripsi...'
      : 'Jelaskan masalah yang Anda alami dengan akun yang diterima...';
  };
  if (!canCreateDispute()) {
    return null;
  }
  return (
    <>
      <button 
        onClick={() => setShowModal(true)}
        className="w-full bg-red-600 text-white py-3 px-4 rounded-lg hover:bg-red-700 flex items-center justify-center"
      >
        <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
        </svg>
        {userRole === 'penjual' ? 'Buat Sengketa Penjual' : 'Buat Sengketa'}
      </button>
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-md w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold text-gray-900">
                  {getDisputeTitle()}
                </h3>
                <button
                  onClick={() => setShowModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Bukti Pendukung (URL Gambar) *
                  </label>
                  <input
                    type="url"
                    value={bukti}
                    onChange={(e) => setBukti(e.target.value)}
                    required
                    placeholder="https://example.com/bukti.jpg"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Upload gambar ke layanan seperti Imgur, kemudian paste URL-nya di sini
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Deskripsi Masalah *
                  </label>
                  <textarea
                    value={deskripsi}
                    onChange={(e) => setDeskripsi(e.target.value)}
                    required
                    rows="4"
                    placeholder={getDisputePlaceholder()}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                {/* Blockchain Option */}
                {account && transaksi.smartContractTxHash && (
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <div className="flex items-center">
                      <input
                        type="checkbox"
                        id="useBlockchain"
                        checked={useBlockchain}
                        onChange={(e) => setUseBlockchain(e.target.checked)}
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                      />
                      <label htmlFor="useBlockchain" className="ml-2 block text-sm text-blue-900">
                        Catat sengketa di blockchain (direkomendasikan)
                      </label>
                    </div>
                    <p className="text-xs text-blue-700 mt-1">
                      Sengketa akan tercatat di smart contract untuk transparansi maksimal
                    </p>
                  </div>
                )}
                {/* Warning */}
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <div className="flex">
                    <svg className="w-5 h-5 text-yellow-400 mr-2 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                    </svg>
                    <div className="text-sm text-yellow-800">
                      <p className="font-medium">Perhatian!</p>
                      <p>
                        Sengketa akan ditinjau oleh admin dalam 1x24 jam. 
                        Pastikan bukti dan deskripsi yang Anda berikan akurat dan lengkap.
                      </p>
                    </div>
                  </div>
                </div>
                <div className="flex space-x-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setShowModal(false)}
                    className="flex-1 bg-gray-300 text-gray-700 py-2 px-4 rounded-md hover:bg-gray-400"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="flex-1 bg-red-600 text-white py-2 px-4 rounded-md hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {loading ? (
                      <div className="flex items-center justify-center">
                        <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Memproses...
                      </div>
                    ) : (
                      'Buat Sengketa'
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
export default KomponenSengketa;
