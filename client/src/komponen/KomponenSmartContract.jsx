import React, { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import { useWallet } from '../konteks/WalletContext';
const ESCROW_ABI = [
  "function createEscrow(address _seller, string memory _productCode) external payable returns (uint256)",
  "function confirmReceived(uint256 _escrowId) external",
  "function createDispute(uint256 _escrowId) external",
  "function getEscrow(uint256 _escrowId) external view returns (tuple(uint256 escrowId, address buyer, address seller, uint256 amount, uint8 status, uint256 createdAt, uint256 timeoutAt, bool disputeActive, address disputeInitiator, string productCode))",
  "event EscrowCreated(uint256 indexed escrowId, address indexed buyer, address indexed seller, uint256 amount)",
  "event DisputeCreated(uint256 indexed escrowId, address indexed initiator)"
];
const ESCROW_CONTRACT_ADDRESS = process.env.REACT_APP_CONTRACT_ADDRESS || "0x36E0E218DB17d111B47fcF80F672F8F0225eBb21";
const KomponenSmartContract = ({ transaksi, onPaymentSuccess, loading }) => {
  const { account, connectWallet, provider } = useWallet();
  const [paymentLoading, setPaymentLoading] = useState(false);
  const [timeLeft, setTimeLeft] = useState(null);
  useEffect(() => {
    if (transaksi.expiredAt) {
      const timer = setInterval(() => {
        const now = new Date().getTime();
        const expiry = new Date(transaksi.expiredAt).getTime();
        const difference = expiry - now;
        if (difference > 0) {
          const minutes = Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60));
          const seconds = Math.floor((difference % (1000 * 60)) / 1000);
          setTimeLeft(`${minutes}:${seconds.toString().padStart(2, '0')}`);
        } else {
          setTimeLeft('Expired');
          clearInterval(timer);
        }
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [transaksi.expiredAt]);
  const handlePayment = async () => {
    if (!account) {
      await connectWallet();
      return;
    }
    try {
      setPaymentLoading(true);
      // Validasi data transaksi
      if (!transaksi) {
        throw new Error('Data transaksi tidak ditemukan');
      }
      if (!transaksi.penjual?.walletAddress) {
        throw new Error('Alamat wallet penjual tidak ditemukan');
      }
      if (!transaksi.produk?.kodeProduk) {
        throw new Error('Kode produk tidak ditemukan');
      }
      if (!transaksi.produk?.hargaEth) {
        throw new Error('Harga ETH tidak ditemukan');
      }
      // Validasi contract address
      if (!ESCROW_CONTRACT_ADDRESS || ESCROW_CONTRACT_ADDRESS === "0x...") {
        throw new Error('Contract address tidak dikonfigurasi dengan benar');
      }
      console.log('📋 Transaction data:', {
        seller: transaksi.penjual.walletAddress,
        productCode: transaksi.produk.kodeProduk,
        amount: transaksi.produk.hargaEth,
        contractAddress: ESCROW_CONTRACT_ADDRESS
      });
      // Validasi provider dan signer
      if (!provider) {
        throw new Error('Provider tidak tersedia. Silakan refresh halaman.');
      }
      const signer = await provider.getSigner();
      if (!signer) {
        throw new Error('Signer tidak tersedia. Pastikan wallet terhubung.');
      }
      // Validasi network (Sepolia)
      const network = await provider.getNetwork();
      if (network.chainId !== 11155111n) { // Sepolia chain ID
        throw new Error('Silakan switch ke Sepolia Testnet di wallet Anda');
      }
      // Create contract instance
      const contract = new ethers.Contract(ESCROW_CONTRACT_ADDRESS, ESCROW_ABI, signer);
      // Convert price to ETH
      const amountInEth = transaksi.produk.hargaEth.toString();
      const amountWei = ethers.parseEther(amountInEth);
      // Check user balance
      const balance = await provider.getBalance(account);
      if (balance < amountWei) {
        throw new Error(`Saldo tidak cukup. Dibutuhkan: ${amountInEth} ETH, Tersedia: ${ethers.formatEther(balance)} ETH`);
      }
      // Basic contract validation
      // Create completely fresh contract instance to avoid cache
      const freshProvider = new ethers.BrowserProvider(window.ethereum);
      const freshSigner = await freshProvider.getSigner();
      const freshContract = new ethers.Contract(ESCROW_CONTRACT_ADDRESS, ESCROW_ABI, freshSigner);
      // Estimate gas with fresh contract
      let gasEstimate;
      try {
        gasEstimate = await freshContract.createEscrow.estimateGas(
          transaksi.penjual.walletAddress,
          transaksi.produk.kodeProduk,
          { value: amountWei }
        );
      } catch (gasError) {
        console.error('❌ Gas estimation failed:', gasError);
        // Log error for debugging
        console.error('Gas estimation error:', gasError.message);
        throw new Error('Gagal estimasi gas. Periksa data transaksi.');
      }
      // Use fresh contract for the actual transaction too
      const finalContract = freshContract;
      // Create escrow transaction with buffer gas
      const gasLimit = gasEstimate * 120n / 100n; // 20% buffer
      const tx = await finalContract.createEscrow(
        transaksi.penjual.walletAddress,
        transaksi.produk.kodeProduk,
        { 
          value: amountWei,
          gasLimit: gasLimit
        }
      );
      // Wait for confirmation
      const receipt = await tx.wait();
      // Extract escrow ID from events
      let escrowId = null;
      for (const log of receipt.logs) {
        try {
          const parsedLog = finalContract.interface.parseLog(log);
          if (parsedLog.name === 'EscrowCreated') {
            escrowId = parsedLog.args.escrowId.toString();
            break;
          }
        } catch (e) {
          // Skip unparseable logs
        }
      }
      if (!escrowId) {
        console.warn('⚠️ Could not extract escrow ID from events');
        escrowId = 'check-etherscan'; // Fallback
      }
      // Call success callback
      await onPaymentSuccess(tx.hash, escrowId);
    } catch (error) {
      console.error('❌ Payment error:', error);
      let errorMessage = 'Pembayaran gagal';
      // Handle specific error types
      if (error.code === 4001) {
        errorMessage = 'Transaksi dibatalkan oleh user';
      } else if (error.code === 'INSUFFICIENT_FUNDS') {
        errorMessage = 'Saldo ETH tidak cukup untuk pembayaran dan gas fee';
      } else if (error.code === -32603) {
        errorMessage = 'Insufficient funds atau gas limit terlalu rendah';
      } else if (error.code === 'NETWORK_ERROR') {
        errorMessage = 'Koneksi network bermasalah. Silakan coba lagi.';
      } else if (error.code === 'UNPREDICTABLE_GAS_LIMIT') {
        errorMessage = 'Gagal estimasi gas. Periksa alamat wallet penjual.';
      } else if (error.message) {
        errorMessage = error.message;
      }
      alert('❌ PEMBAYARAN GAGAL\n\n' + errorMessage + '\n\nSilakan periksa:\n- Koneksi wallet\n- Network (harus Sepolia)\n- Saldo ETH\n- Data transaksi');
    } finally {
      setPaymentLoading(false);
    }
  };
  const isExpired = timeLeft === 'Expired';
  return (
    <div className="space-y-4">
            {/* Countdown Timer */}
            {timeLeft && (
        <div className={`text-center p-4 rounded-lg ${
          isExpired ? 'bg-red-100 text-red-800' : 'bg-yellow-100 text-yellow-800'
        }`}>
          <p className="font-medium">
            {isExpired ? 'Waktu pembayaran telah habis' : `Waktu tersisa: ${timeLeft}`}
          </p>
            {!isExpired && (
            <p className="text-sm mt-1">
              Silakan lakukan pembayaran sebelum waktu habis
            </p>
          )}
        </div>
      )}
            {/* Payment Info */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h3 className="font-medium text-blue-900 mb-2">Informasi Pembayaran</h3>
        <div className="space-y-1 text-sm text-blue-800">
          <p><span className="font-medium">Harga:</span> Rp {transaksi.produk.harga.toLocaleString()}</p>
          <p><span className="font-medium">Dalam ETH:</span> {transaksi.produk.hargaEth || "0.001"} ETH</p>
          <p><span className="font-medium">Penjual:</span> {transaksi.penjual.walletAddress}</p>
        </div>
      </div>
            {/* Wallet Connection */}
            {!account ? (
        <button
          onClick={connectWallet}
          className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg hover:bg-blue-700 flex items-center justify-center"
        >
          <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
          Connect Wallet
        </button>
      ) : (
        <div className="space-y-3">
          <div className="text-sm text-gray-600">
            <p><span className="font-medium">Wallet Connected:</span></p>
            <p className="font-mono text-xs break-all">
            {account}</p>
          </div>
          <button
            onClick={handlePayment}
            disabled={paymentLoading || loading || isExpired}
            className="w-full bg-green-600 text-white py-3 px-4 rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
          >
            {paymentLoading ? (
              <>
                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Memproses Pembayaran...
              </>
            ) : (
              <>
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
                Bayar dengan Smart Contract
              </>
            )}
          </button>
        </div>
      )}
            {/* Instructions */}
      <div className="bg-gray-50 rounded-lg p-4">
        <h4 className="font-medium text-gray-900 mb-2">Cara Pembayaran:</h4>
        <ol className="text-sm text-gray-600 space-y-1 list-decimal list-inside">
          <li>Pastikan wallet Anda terhubung ke Sepolia Testnet</li>
          <li>Pastikan Anda memiliki cukup ETH untuk pembayaran dan gas fee</li>
          <li>Klik "Bayar dengan Smart Contract"</li>
          <li>Konfirmasi transaksi di wallet Anda</li>
          <li>Tunggu konfirmasi blockchain (1-2 menit)</li>
        </ol>
      </div>
            {/* Warning */}
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
        <div className="flex">
          <svg className="w-5 h-5 text-yellow-400 mr-2 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
          </svg>
          <div className="text-sm text-yellow-800">
            <p className="font-medium">Penting!</p>
            <p>Dana akan ditahan di smart contract sampai Anda mengkonfirmasi penerimaan akun. Jika ada masalah, Anda bisa membuat sengketa.</p>
          </div>
        </div>
      </div>
    </div>
  );
};
export default KomponenSmartContract;
