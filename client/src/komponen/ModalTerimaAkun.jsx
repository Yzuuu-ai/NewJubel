import React, { useState } from 'react';
import { accountDataHelper } from '../utils/accountDataHelper';
const ModalTerimaAkun = ({ isOpen, onClose, onConfirm, onDispute, loading, transaksi }) => {
  const [showSengketaForm, setShowSengketaForm] = useState(false);
  const [sengketaData, setSengketaData] = useState({
    bukti: '',
    deskripsi: ''
  });
  const [showDebug, setShowDebug] = useState(false);
  if (!isOpen || !transaksi) return null;
  // Parse account data dengan helper
  const { accountData, source, hasData } = accountDataHelper.parseAccountData(transaksi);
  // Validasi data akun
  const validation = accountDataHelper.validateAccountData(accountData);
  const deskripsiBukti = transaksi?.deskripsiBukti;
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b border-gray-200">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Konfirmasi Penerimaan Akun</h2>
            <p className="text-sm text-gray-600 mt-1">
              Transaksi: {transaksi.kodeTransaksi}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-2xl font-bold"
            disabled={loading}
          >
            ×
          </button>
        </div>
        {/* Content */}
        <div className="p-6">
          {!showSengketaForm ? (
            <div className="space-y-6">
              {/* Account Data Display */}
              {hasData && validation.isValid ? (
                <div className="bg-green-50 border border-green-200 rounded-lg p-6">
                  <div className="flex items-start">
                    <div className="flex-shrink-0">
                      <svg className="h-6 w-6 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <div className="ml-3 flex-1">
                      <h3 className="text-lg font-medium text-green-800">Data Akun Diterima</h3>
                      <div className="mt-4 space-y-3">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <p className="text-sm font-medium text-green-700">Username/ID Game:</p>
                            <p className="text-sm text-green-600 font-mono bg-white px-2 py-1 rounded border">
                              {accountData.username || 'Tidak tersedia'}
                            </p>
                          </div>
                          <div>
                            <p className="text-sm font-medium text-green-700">Email:</p>
                            <p className="text-sm text-green-600 font-mono bg-white px-2 py-1 rounded border">
                              {accountData.email || 'Tidak tersedia'}
                            </p>
                          </div>
                          <div className="md:col-span-2">
                            <p className="text-sm font-medium text-green-700">Password:</p>
                            <p className="text-sm text-green-600 font-mono bg-white px-2 py-1 rounded border">
                              {accountData.password || 'Tidak tersedia'}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
                  <div className="flex items-start">
                    <div className="flex-shrink-0">
                      <svg className="h-6 w-6 text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                      </svg>
                    </div>
                    <div className="ml-3">
                      <h3 className="text-lg font-medium text-yellow-800">Data Akun Tidak Lengkap</h3>
                      <p className="mt-2 text-sm text-yellow-700">
                        Data akun yang dikirim penjual tidak lengkap atau tidak dapat dibaca dengan baik.
                      </p>
                      {deskripsiBukti && (
                        <div className="mt-4">
                          <p className="text-sm font-medium text-yellow-700">Catatan Penjual:</p>
                          <div className="mt-1 p-3 bg-white rounded border text-sm text-gray-700 whitespace-pre-wrap">
                            {deskripsiBukti}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
              {/* Debug Information (Development Only) */}
              {process.env.NODE_ENV === 'development' && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <button
                    onClick={() => setShowDebug(!showDebug)}
                    className="text-sm font-medium text-yellow-800 hover:text-yellow-900"
                  >
                    {showDebug ? 'Hide' : 'Show'} Debug Info
                  </button>
                  {showDebug && (
                    <div className="mt-2">
                      <h4 className="text-sm font-medium text-yellow-800 mb-2">Debug Info</h4>
                      <div className="text-xs text-yellow-700">
                        <p><strong>Account Data Type:</strong> {typeof transaksi?.accountData}</p>
                        <p><strong>Account Data:</strong> {JSON.stringify(accountData, null, 2)}</p>
                        <p><strong>Deskripsi Bukti:</strong> {deskripsiBukti ? 'Ada' : 'Tidak ada'}</p>
                      </div>
                    </div>
                  )}
                </div>
              )}
              {/* Instructions */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
                <h3 className="text-lg font-semibold text-blue-900 mb-4">Petunjuk</h3>
                <div className="space-y-3 text-sm text-blue-800">
                  <div className="flex items-start">
                    <span className="flex-shrink-0 w-6 h-6 bg-blue-200 text-blue-800 rounded-full flex items-center justify-center text-xs font-bold mr-3 mt-0.5">1</span>
                    <p>Coba login ke akun game menggunakan data yang diberikan penjual</p>
                  </div>
                  <div className="flex items-start">
                    <span className="flex-shrink-0 w-6 h-6 bg-blue-200 text-blue-800 rounded-full flex items-center justify-center text-xs font-bold mr-3 mt-0.5">2</span>
                    <p>Pastikan akun dapat diakses dan sesuai dengan deskripsi produk</p>
                  </div>
                  <div className="flex items-start">
                    <span className="flex-shrink-0 w-6 h-6 bg-blue-200 text-blue-800 rounded-full flex items-center justify-center text-xs font-bold mr-3 mt-0.5">3</span>
                    <p>Jika akun sesuai, klik "Konfirmasi Penerimaan" - setelah ini admin akan mengirim dana ke penjual</p>
                  </div>
                  <div className="flex items-start">
                    <span className="flex-shrink-0 w-6 h-6 bg-red-200 text-red-800 rounded-full flex items-center justify-center text-xs font-bold mr-3 mt-0.5">4</span>
                    <p><strong>PENTING:</strong> Jika ada masalah dengan akun, klik "Buat Sengketa" SEBELUM konfirmasi. Setelah konfirmasi, Anda tidak bisa lagi membuat sengketa.</p>
                  </div>
                </div>
              </div>
              {/* Peringatan Penting */}
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <div className="flex items-start">
                  <div className="flex-shrink-0">
                    <svg className="h-5 w-5 text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                    </svg>
                  </div>
                  <div className="ml-3">
                    <h3 className="text-sm font-medium text-yellow-800">Peringatan</h3>
                    <p className="text-sm text-yellow-700 mt-1">
                      Setelah Anda mengkonfirmasi penerimaan akun, transaksi akan dianggap selesai dan Anda tidak dapat lagi membuat sengketa. Pastikan akun sudah benar-benar sesuai sebelum konfirmasi.
                    </p>
                  </div>
                </div>
              </div>
              {/* Action Buttons */}
              <div className="flex justify-between">
                <button
                  onClick={() => setShowSengketaForm(true)}
                  className="px-6 py-3 border border-red-300 text-red-700 rounded-lg hover:bg-red-50 font-medium"
                  disabled={loading}
                >
                  Buat Sengketa
                </button>
                <div className="space-x-4">
                  <button
                    onClick={onClose}
                    className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium"
                    disabled={loading}
                  >
                    Batal
                  </button>
                  <button
                    onClick={onConfirm}
                    disabled={loading}
                    className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium disabled:opacity-50"
                  >
                    {loading ? (
                      <div className="flex items-center">
                        <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Memproses...
                      </div>
                    ) : (
                      'Konfirmasi Penerimaan'
                    )}
                  </button>
                </div>
              </div>
            </div>
          ) : (
            /* Sengketa Form */
            <div className="space-y-6">
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <div className="flex items-start">
                  <div className="flex-shrink-0">
                    <svg className="h-6 w-6 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                    </svg>
                  </div>
                  <div className="ml-3">
                    <h3 className="text-lg font-medium text-red-800">Buat Sengketa</h3>
                    <p className="mt-2 text-sm text-red-700">
                      Jelaskan masalah yang Anda alami dengan akun yang diterima. Admin akan meninjau sengketa Anda dalam 1x24 jam.
                    </p>
                  </div>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Bukti Masalah (URL Screenshot) <span className="text-red-500">*</span>
                </label>
                <input
                  type="url"
                  value={sengketaData.bukti}
                  onChange={(e) => setSengketaData(prev => ({ ...prev, bukti: e.target.value }))}
                  placeholder="https://example.com/screenshot-masalah.jpg"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
                  required
                />
                <p className="text-sm text-gray-500 mt-2">
                  Upload screenshot yang menunjukkan masalah ke layanan seperti Imgur, lalu masukkan linknya di sini.
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Deskripsi Masalah <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={sengketaData.deskripsi}
                  onChange={(e) => setSengketaData(prev => ({ ...prev, deskripsi: e.target.value }))}
                  placeholder="Jelaskan secara detail masalah yang Anda alami dengan akun ini..."
                  rows="5"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
                  required
                />
              </div>
              <div className="flex justify-between">
                <button
                  onClick={() => setShowSengketaForm(false)}
                  className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium"
                  disabled={loading}
                >
                  Kembali
                </button>
                <div className="space-x-4">
                  <button
                    onClick={onClose}
                    className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium"
                    disabled={loading}
                  >
                    Batal
                  </button>
                  <button
                    onClick={() => {
                      if (!sengketaData.bukti.trim() || !sengketaData.deskripsi.trim()) {
                        alert('Bukti dan deskripsi masalah wajib diisi!');
                        return;
                      }
                      onDispute(sengketaData);
                    }}
                    disabled={loading}
                    className="px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 font-medium disabled:opacity-50"
                  >
                    {loading ? (
                      <div className="flex items-center">
                        <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Mengirim...
                      </div>
                    ) : (
                      'Kirim Sengketa'
                    )}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
export default ModalTerimaAkun;
