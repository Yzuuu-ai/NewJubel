import React, { useState } from 'react';
import { accountDataHelper } from '../utils/accountDataHelper';
const ModalLihatAkun = ({ isOpen, onClose, transaksi }) => {
  const [copiedField, setCopiedField] = useState('');
  const [showDebug, setShowDebug] = useState(false);
  if (!isOpen || !transaksi) return null;
  // Parse account data menggunakan helper yang robust
  const { accountData, source, hasData, rawDescription } =
    accountDataHelper.parseAccountData(transaksi);
  // Validasi kualitas data
  const validation = accountDataHelper.validateAccountData(accountData);
  // Copy to clipboard function
  const copyToClipboard = async (text, field) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedField(field);
      setTimeout(() => setCopiedField(''), 2000);
    } catch (err) {
      console.error('Failed to copy: ', err);
      // Fallback untuk browser yang tidak support clipboard API
      const textArea = document.createElement('textarea');
      textArea.value = text;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      setCopiedField(field);
      setTimeout(() => setCopiedField(''), 2000);
    }
  };
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b border-gray-200">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Data Akun Game</h2>
            <p className="text-sm text-gray-600 mt-1">
              Transaksi: {transaksi.kodeTransaksi} | Status: {transaksi.status}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-2xl font-bold"
          >
            ×
          </button>
        </div>
        {/* Content */}
        <div className="p-6">
          {!hasData ? (
            // No data available
            <div className="text-center py-12">
              <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <h3 className="mt-2 text-sm font-medium text-gray-900">Belum Ada Data Akun</h3>
              <p className="mt-1 text-sm text-gray-500">
                Penjual belum mengirim data akun untuk transaksi ini.
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Status Badge */}
              <div className="flex items-center space-x-4">
                <div className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                  validation.isValid 
                    ? 'bg-green-100 text-green-800' 
                    : 'bg-yellow-100 text-yellow-800'
                }`}>
                  {validation.isValid ? '✅ Data Lengkap' : '⚠️ Data Tidak Lengkap'}
                </div>
                <div className="text-sm text-gray-500">
                  {accountDataHelper.getSourceLabel(source)}
                </div>
                <div className="text-sm text-gray-500">
                  Score: {validation.score}/100
                </div>
              </div>
              {/* Account Information */}
              {validation.isValid && (
                <div className="bg-gray-50 rounded-lg p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Informasi Akun</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Username */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Username/ID Akun Game
                      </label>
                      <div className="flex items-center space-x-2">
                        <input
                          type="text"
                          value={accountData.username || 'Tidak tersedia'}
                          readOnly
                          className="flex-1 px-3 py-2 border border-gray-300 rounded-md bg-white text-gray-900"
                        />
                        <button
                          onClick={() => copyToClipboard(accountData.username || '', 'username')}
                          className="px-3 py-2 border border-gray-300 rounded-md hover:bg-gray-50"
                          title="Copy username"
                        >
                          {copiedField === 'username' ? (
                            <svg className="h-4 w-4 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                            </svg>
                          ) : (
                            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                            </svg>
                          )}
                        </button>
                      </div>
                    </div>
                    {/* Email */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Email Akun
                      </label>
                      <div className="flex items-center space-x-2">
                        <input
                          type="text"
                          value={accountData.email || 'Tidak tersedia'}
                          readOnly
                          className="flex-1 px-3 py-2 border border-gray-300 rounded-md bg-white text-gray-900"
                        />
                        <button
                          onClick={() => copyToClipboard(accountData.email || '', 'email')}
                          className="px-3 py-2 border border-gray-300 rounded-md hover:bg-gray-50"
                          title="Copy email"
                        >
                          {copiedField === 'email' ? (
                            <svg className="h-4 w-4 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                            </svg>
                          ) : (
                            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                            </svg>
                          )}
                        </button>
                      </div>
                    </div>
                    {/* Password */}
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Password
                      </label>
                      <div className="flex items-center space-x-2">
                        <input
                          type="text"
                          value={accountData.password || 'Tidak tersedia'}
                          readOnly
                          className="flex-1 px-3 py-2 border border-gray-300 rounded-md bg-white text-gray-900"
                        />
                        <button
                          onClick={() => copyToClipboard(accountData.password || '', 'password')}
                          className="px-3 py-2 border border-gray-300 rounded-md hover:bg-gray-50"
                          title="Copy password"
                        >
                          {copiedField === 'password' ? (
                            <svg className="h-4 w-4 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                            </svg>
                          ) : (
                            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                            </svg>
                          )}
                        </button>
                      </div>
                    </div>
                  </div>
                  {/* Copy All Button */}
                  <div className="mt-6 pt-4 border-t border-gray-200">
                    <button
                      onClick={() => {
                        const allData = `
Username: ${accountData.username || 'N/A'}
Email: ${accountData.email || 'N/A'}
Password: ${accountData.password || 'N/A'}
                        `.trim();
                        copyToClipboard(allData, 'all');
                      }}
                      className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
                    >
                      {copiedField === 'all' ? (
                        <>
                          <svg className="h-4 w-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                          </svg>
                          Semua Data Tersalin!
                        </>
                      ) : (
                        <>
                          <svg className="h-4 w-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                          </svg>
                          Copy Semua Data
                        </>
                      )}
                    </button>
                  </div>
                </div>
              )}
              {/* Raw Description (if available and different from structured data) */}
              {rawDescription && source !== 'structured' && (
                <div className="bg-yellow-50 rounded-lg p-4">
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">Deskripsi/Catatan Penjual</h3>
                  <div className="text-sm text-gray-700 whitespace-pre-wrap">
                    {rawDescription}
                  </div>
                  <button
                    onClick={() => copyToClipboard(rawDescription, 'description')}
                    className="mt-2 inline-flex items-center px-3 py-1 border border-gray-300 shadow-sm text-xs font-medium rounded text-gray-700 bg-white hover:bg-gray-50"
                  >
                    {copiedField === 'description' ? 'Tersalin!' : 'Copy Deskripsi'}
                  </button>
                </div>
              )}
              {/* Validation Issues */}
              {!validation.isValid && validation.issues.length > 0 && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <h3 className="text-sm font-medium text-red-800 mb-2">Masalah Data:</h3>
                  <ul className="text-sm text-red-700 list-disc list-inside">
                    {validation.issues.map((issue, index) => (
                      <li key={index}>{issue}</li>
                    ))}
                  </ul>
                </div>
              )}
              {/* Instructions */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h3 className="text-sm font-medium text-blue-800 mb-2">Petunjuk:</h3>
                <ul className="text-sm text-blue-700 list-disc list-inside space-y-1">
                  <li>Gunakan data login di atas untuk mengakses akun game</li>
                  <li>Klik tombol copy untuk menyalin data dengan mudah</li>
                  <li>Pastikan untuk mengganti password setelah login pertama kali</li>
                  <li>Jika ada masalah dengan akun, segera hubungi penjual</li>
                </ul>
              </div>
            </div>
          )}
          {/* Debug Information (Developer Mode) */}
          {process.env.NODE_ENV === 'development' && (
            <div className="mt-6 pt-6 border-t border-gray-200">
              <button
                onClick={() => setShowDebug(!showDebug)}
                className="text-sm text-gray-500 hover:text-gray-700"
              >
                {showDebug ? 'Hide' : 'Show'} Debug Info
              </button>
              {showDebug && (
                <div className="mt-4 p-4 bg-gray-100 rounded-lg text-xs">
                  <p><strong>Source:</strong> {source}</p>
                  <p><strong>Has Data:</strong> {hasData ? 'Yes' : 'No'}</p>
                  <p><strong>Validation Score:</strong> {validation.score}/100</p>
                  <p><strong>Account Data:</strong> {JSON.stringify(accountData, null, 2)}</p>
                  <p><strong>Raw Description:</strong> {rawDescription || 'None'}</p>
                </div>
              )}
            </div>
          )}
        </div>
        {/* Footer */}
        <div className="flex justify-end p-6 border-t border-gray-200">
          <button
            onClick={onClose}
            className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
};
export default ModalLihatAkun;
