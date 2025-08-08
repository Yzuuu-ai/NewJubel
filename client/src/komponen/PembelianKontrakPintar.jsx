import React, { useState, useEffect, useRef } from 'react';
import { useWallet } from '../konteks/WalletContext';
import { useAuth } from '../konteks/AuthContext';
import { smartContractAPI } from '../layanan/api';
import toast from 'react-hot-toast';
const PembelianKontrakPintar = ({ produk, onSuccess, onCancel }) => {
  const { user } = useAuth();
  const { 
    isConnected, 
    account, 
    balance, 
    connectWallet, 
    createEscrow,
    isConnecting,
    loading: walletLoading 
  } = useWallet();
  const [purchaseStep, setPurchaseStep] = useState('connect'); // connect, payment, processing, success, error
  const [gasEstimate, setGasEstimate] = useState(null);
  const [transactionHash, setTransactionHash] = useState(null);
  const [escrowId, setEscrowId] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [hasStartedPurchase, setHasStartedPurchase] = useState(false);
  const purchaseInProgressRef = useRef(false);
  // Use hargaEth from product if available, otherwise convert from IDR
  const priceInEth = produk.hargaEth ? produk.hargaEth.toString() : (produk.harga / 1000000).toFixed(4);
  // Product code for Escrow.sol (no game restriction)
  const getProductCode = (produk) => {
    // Use product code directly - Escrow.sol supports all games
    return produk.kodeProduk || `PROD_${Date.now()}`;
  };
    const estimateGas = async () => {
    try {
      // Estimate gas for createEscrow
      // This is a simplified estimation
      setGasEstimate({
        gasLimit: 200000,
        gasPrice: '20', // gwei
        totalCost: '0.004', // ETH
        usdCost: '8' // USD (approximate)
      });
    } catch (error) {
      console.error('Error estimating gas:', error);
    }
  };
  const handleConnectWallet = async () => {
    try {
      const result = await connectWallet();
      if (result.success) {
        // Wallet berhasil terhubung, useEffect akan handle pembayaran
        console.log('✅ Wallet connected successfully');
      }
    } catch (error) {
      setError('Gagal menghubungkan wallet');
    }
  };
  const handlePurchase = async () => {
    // Prevent multiple executions with both state and ref
    if (hasStartedPurchase || loading || purchaseInProgressRef.current) {
      console.log('🚫 Purchase already in progress, skipping...', {
        hasStartedPurchase,
        loading,
        purchaseInProgressRef: purchaseInProgressRef.current
      });
      return;
    }

    // Validasi role admin
    if (user?.role === 'ADMIN') {
      toast.error('Admin tidak dapat membeli produk');
      onCancel();
      return;
    }

    // Set ref immediately to prevent race conditions
    purchaseInProgressRef.current = true;

    if (!window.ethereum) {
      toast.error('MetaMask tidak terdeteksi! Silakan install MetaMask.');
      return;
    }
    if (!isConnected || !account) {
      toast.error('Wallet belum terhubung! Klik Connect di navbar dulu.');
      return;
    }
    // Check network
    try {
      const chainId = await window.ethereum.request({ method: 'eth_chainId' });
      if (chainId !== '0xaa36a7') { // Sepolia chainId
        toast.error('Silakan switch ke Sepolia Testnet di MetaMask!');
        return;
      }
    } catch (error) {
      console.error('Error checking network:', error);
    }
    try {
      setLoading(true);
      setHasStartedPurchase(true);
      setPurchaseStep('processing');
      setError(null);
      // Validate required data - check multiple possible data structures
      const sellerAddress = produk.penjual?.walletAddress || 
                           produk.user?.walletAddress || 
                           produk.walletAddress ||
                           produk.penjual?.user?.walletAddress;
      
      console.log('🔍 DEBUGGING - Seller address validation:', {
        produk: produk,
        penjualObject: produk.penjual,
        userObject: produk.user,
        directWallet: produk.walletAddress,
        foundSellerAddress: sellerAddress
      });
      
      if (!sellerAddress) {
        console.error('❌ Seller address not found in any structure:', {
          'produk.penjual?.walletAddress': produk.penjual?.walletAddress,
          'produk.user?.walletAddress': produk.user?.walletAddress,
          'produk.walletAddress': produk.walletAddress,
          'produk.penjual?.user?.walletAddress': produk.penjual?.user?.walletAddress,
          fullProduk: produk
        });
        throw new Error('Alamat wallet penjual tidak ditemukan. Penjual belum menghubungkan wallet.');
      }
      if (!produk.kodeProduk) {
        throw new Error('Kode produk tidak ditemukan');
      }
      const amount = parseFloat(priceInEth);
      if (isNaN(amount) || amount < 0.0001) {
        throw new Error('Jumlah tidak valid (minimal 0.0001 ETH)');
      }
      const productCode = getProductCode(produk);
      console.log('🔍 DEBUGGING - Purchase data:', {
        sellerAddress,
        buyerAddress: account,
        productCode: productCode,
        namaGame: produk.namaGame,
        amount,
        priceInEth
      });
      // Detailed validation logging
      // PERBAIKAN: Hanya gunakan satu jalur transaksi
      // Gunakan backend API yang sudah terintegrasi dengan database
      toast.loading('Membuat escrow di blockchain...', { id: 'purchase' });
      // Prepare data for backend API (yang akan handle smart contract)
      const backendData = {
        sellerAddress: sellerAddress,
        buyerAddress: account, // Kirim address saja, BUKAN private key
        productCode: produk.kodeProduk,
        amount: parseFloat(amount) // Ensure it's a number, not string
      };
      // Manual validation check
      const validationIssues = [];
      if (!sellerAddress || !/^0x[a-fA-F0-9]{40}$/.test(sellerAddress)) {
        validationIssues.push('Invalid seller address format');
      }
      if (!produk.kodeProduk || produk.kodeProduk.length < 3 || produk.kodeProduk.length > 50) {
        validationIssues.push('Invalid product code length');
      }
      if (isNaN(amount) || amount < 0.0001) {
        validationIssues.push('Invalid amount (must be >= 0.0001 ETH)');
      }
      if (validationIssues.length > 0) {
        validationIssues.forEach((issue, index) => {
        });
      } else {
      }
      console.log('Data types:', {
        sellerAddress: typeof backendData.sellerAddress,
        buyerAddress: typeof backendData.buyerAddress,
        productCode: typeof backendData.productCode,
        amount: typeof backendData.amount,
        amountValue: backendData.amount
      });
      // FIXED: Safe ETH to Wei conversion with validation
      const ethToWei = (eth) => {
        const ethValue = parseFloat(eth);
        // Validation: Reject if too high
        if (ethValue > 1) {
          throw new Error(`ETH value too high: ${ethValue}. Max allowed: 1 ETH`);
        }
        if (ethValue < 0) {
          throw new Error(`ETH value negative: ${ethValue}`);
        }
        // Use string manipulation for precision
        const ethStr = ethValue.toFixed(18); // Ensure 18 decimal places
        const [whole, decimal] = ethStr.split('.');
        const paddedDecimal = decimal.padEnd(18, '0');
        const weiStr = whole + paddedDecimal;
        // Remove leading zeros
        const cleanWeiStr = weiStr.replace(/^0+/, '') || '0';
        const weiValue = parseInt(cleanWeiStr);
        const hexValue = '0x' + weiValue.toString(16);
        return hexValue;
      };
      // STEP 1: TRY BACKEND FIRST (FALLBACK TO DIRECT IF NEEDED)
      toast.loading('Menyiapkan transaksi...', { id: 'purchase' });
      let transactionData;
      try {
        // Try backend first
        const prepareResult = await smartContractAPI.prepareEscrow(backendData);
        if (prepareResult.data.success && prepareResult.data.data.transactionData) {
          transactionData = prepareResult.data.data.transactionData;
          // Validate backend data
          if (transactionData.value) {
            const backendValueEth = parseInt(transactionData.value, 16) / 1e18;
            if (backendValueEth > 0.1) {
              console.error('🚨 Backend value too high, falling back to direct call');
              throw new Error('Backend value too high');
            }
          }
        } else {
          throw new Error('Backend failed');
        }
      } catch (backendError) {
        console.warn('⚠️ Backend failed, trying direct contract call...', backendError.message);
        // FALLBACK: Direct contract call
        const contractAddress = process.env.REACT_APP_CONTRACT_ADDRESS || '0x2100b2dEF2B3d7Dc4B29f8D297C9AA283b74b1f6';
        // Check if contract exists
        try {
          const code = await window.ethereum.request({
            method: 'eth_getCode',
            params: [contractAddress, 'latest']
          });
          if (code === '0x' || code === '0x0') {
            throw new Error(`Smart contract tidak ditemukan di address: ${contractAddress}`);
          }
        } catch (codeError) {
          console.error('❌ Contract check failed:', codeError);
          throw new Error('Smart contract tidak dapat diakses');
        }
        // Simple direct call for Escrow.sol createEscrow function
        // Function signature: createEscrow(address _seller, string memory _productCode)
        const productCodeBytes = new TextEncoder().encode(produk.kodeProduk);
        const productCodeHex = Array.from(productCodeBytes)
          .map(b => b.toString(16).padStart(2, '0')).join('');
        transactionData = {
          to: contractAddress,
          value: ethToWei(priceInEth),
          data: '0x3f407b4f' + // createEscrow function selector for createEscrow(address,string)
                sellerAddress.slice(2).padStart(64, '0') + // address _seller
                '0000000000000000000000000000000000000000000000000000000000000040' + // offset for string
                produk.kodeProduk.length.toString(16).padStart(64, '0') + // string length
                productCodeHex.padEnd(Math.ceil(productCodeHex.length / 64) * 64, '0'), // string data
          gasLimit: 300000
        };
      }
      // STEP 2: Show MetaMask popup for user to pay
      toast.loading('Menunggu konfirmasi MetaMask...', { id: 'purchase' });
      if (!window.ethereum) {
        throw new Error('MetaMask tidak terdeteksi');
      }
      // Check current balance in Wei
      const currentBalanceWei = await window.ethereum.request({
        method: 'eth_getBalance',
        params: [account, 'latest']
      });
      const currentBalanceEth = parseInt(currentBalanceWei, 16) / 1e18;
      // Prepare transaction parameters with safety checks
      const valueToSend = transactionData.value || ethToWei(priceInEth);
      // Use conservative gas limit to avoid high fees
      let gasLimitDecimal = transactionData.gasLimit ? parseInt(transactionData.gasLimit) : 200000;
      // If gas limit seems too high, cap it
      if (gasLimitDecimal > 500000) {
        gasLimitDecimal = 300000;
      }
      const gasLimit = '0x' + gasLimitDecimal.toString(16);
      const txParams = {
        from: account,
        to: transactionData.to,
        value: valueToSend,
        data: transactionData.data,
        gas: gasLimit,
        gasPrice: '0x4a817c800' // 20 gwei in hex (reasonable for testnet)
      };
      // Calculate total cost with detailed debugging
      const valueInEth = parseInt(valueToSend, 16) / 1e18;
      const gasLimitNum = parseInt(gasLimit, 16);
      const gasPriceGwei = 20; // 20 gwei
      const gasInEth = (gasLimitNum * gasPriceGwei) / 1e9; // Convert gwei to ETH
      const totalCostEth = valueInEth + gasInEth;
      // EMERGENCY: If value seems too high, something is wrong
      if (valueInEth > 0.1) {
        console.error('🚨 EMERGENCY: Value too high!', valueInEth, 'ETH');
        console.error('🔍 Original priceInEth:', priceInEth);
        console.error('🔍 Conversion check:', parseFloat(priceInEth));
        throw new Error(`EMERGENCY: Nilai transaksi terlalu tinggi (${valueInEth} ETH)! Kemungkinan error konversi.`);
      }
      if (gasInEth > 0.01) {
        console.error('🚨 EMERGENCY: Gas cost too high!', gasInEth, 'ETH');
        throw new Error(`EMERGENCY: Biaya gas terlalu tinggi (${gasInEth} ETH)! Kemungkinan error gas limit.`);
      }
      // Safety check
      if (currentBalanceEth < totalCostEth) {
        throw new Error(`Saldo tidak cukup! Dibutuhkan ${totalCostEth.toFixed(6)} ETH, tersedia ${currentBalanceEth.toFixed(6)} ETH`);
      }
      // Send transaction using MetaMask
      let txHash;
      try {
        console.log('📤 Sending transaction to MetaMask...', {
          to: txParams.to,
          value: txParams.value,
          timestamp: Date.now()
        });
        
        txHash = await window.ethereum.request({
          method: 'eth_sendTransaction',
          params: [txParams]
        });
        
        console.log('✅ Transaction sent successfully:', txHash);
      } catch (metamaskError) {
        console.error('❌ MetaMask error:', metamaskError);
        throw metamaskError;
      }
      setTransactionHash(txHash);
      // STEP 3: Wait for confirmation
      toast.loading('Menunggu konfirmasi blockchain...', { id: 'purchase' });
      let receipt = null;
      let attempts = 0;
      const maxAttempts = 60; // 5 minutes
      while (!receipt && attempts < maxAttempts) {
        try {
          receipt = await window.ethereum.request({
            method: 'eth_getTransactionReceipt',
            params: [txHash]
          });
          if (receipt) {
            break;
          }
          await new Promise(resolve => setTimeout(resolve, 5000));
          attempts++;
        } catch (error) {
          console.error('Error checking receipt:', error);
          await new Promise(resolve => setTimeout(resolve, 5000));
          attempts++;
        }
      }
      if (!receipt) {
        throw new Error('Timeout menunggu konfirmasi transaksi');
      }
      // STEP 4: Verify transaction with backend
      toast.loading('Memverifikasi transaksi...', { id: 'purchase' });
      const verifyData = {
        transactionHash: txHash,
        buyerAddress: account,
        sellerAddress: sellerAddress,
        productCode: produk.kodeProduk,
        amount: parseFloat(amount)
      };
      const verifyResult = await smartContractAPI.verifyEscrow(verifyData);
      if (verifyResult.data.success) {
        const responseData = verifyResult.data.data;
        setEscrowId(responseData.escrowId);
        toast.success('Pembelian berhasil!', { id: 'purchase' });
        setPurchaseStep('success');
        // Broadcast updates
        const updateData = {
          productId: produk.id,
          productCode: produk.kodeProduk,
          transactionId: responseData.databaseIntegration?.transaksiId,
          escrowId: responseData.escrowId,
          transactionHash: txHash,
          timestamp: Date.now()
        };
        localStorage.setItem('product-sold', JSON.stringify(updateData));
        window.dispatchEvent(new CustomEvent('product-sold', { detail: updateData }));
        localStorage.setItem('marketplace-refresh', JSON.stringify(updateData));
        window.dispatchEvent(new CustomEvent('marketplace-refresh', { detail: updateData }));
        localStorage.setItem('transaction-update', JSON.stringify(updateData));
        window.dispatchEvent(new CustomEvent('transaction-update', { detail: updateData }));
        if (onSuccess) {
          onSuccess({
            escrowId: responseData.escrowId,
            transactionHash: txHash,
            backendData: responseData
          });
        }
      } else {
        throw new Error(verifyResult.data.message || 'Gagal memverifikasi transaksi');
      }
    } catch (error) {
      console.error('Purchase error:', error);
      // Enhanced error handling
      let errorMessage = 'Terjadi kesalahan saat pembelian';
      // Handle MetaMask specific errors
      if (error.code === 4001) {
        errorMessage = 'Transaksi dibatalkan oleh user';
      } else if (error.code === -32603) {
        errorMessage = 'Transaksi gagal. Pastikan saldo mencukupi dan gas fee cukup.';
      } else if (error.message?.includes('insufficient funds')) {
        errorMessage = 'Saldo tidak mencukupi untuk transaksi ini';
      } else if (error.message?.includes('gas')) {
        errorMessage = 'Estimasi gas gagal. Pastikan parameter transaksi benar.';
      } else if (error.message?.includes('MetaMask')) {
        errorMessage = error.message;
      } else if (error.response?.data?.errors) {
        // Validation errors
        const validationErrors = error.response.data.errors.map(err => `${err.param}: ${err.msg}`).join(', ');
        errorMessage = `Validasi gagal: ${validationErrors}`;
      } else if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      } else if (error.response?.data?.pesan) {
        errorMessage = error.response.data.pesan;
      } else if (error.userMessage) {
        errorMessage = error.userMessage;
      } else if (error.message) {
        errorMessage = error.message;
      }
      setError(errorMessage);
      setPurchaseStep('error');
      toast.error(errorMessage, { id: 'purchase' });
    } finally {
      setLoading(false);
      purchaseInProgressRef.current = false;
      // Don't reset hasStartedPurchase here to prevent retry loops
    }
  };

  // useEffect untuk auto-start pembayaran jika wallet sudah terhubung
  useEffect(() => {
    if (isConnected && account && !hasStartedPurchase && !loading) {
      // Langsung mulai proses pembayaran karena detail sudah ditampilkan di TransactionDetailModal
      console.log('🚀 Starting purchase from useEffect...', {
        isConnected,
        account,
        hasStartedPurchase,
        loading,
        timestamp: Date.now()
      });
      
      // Add small delay to prevent race conditions
      const timer = setTimeout(() => {
        if (!hasStartedPurchase && !loading && !purchaseInProgressRef.current) {
          handlePurchase();
        }
      }, 100);
      
      return () => clearTimeout(timer);
    }
  }, [isConnected, account, hasStartedPurchase, loading]);

  const renderConnectStep = () => (
    <div className="text-center space-y-4">
      <div className="w-16 h-16 mx-auto bg-blue-100 rounded-full flex items-center justify-center">
        <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
        </svg>
      </div>
      <h3 className="text-lg font-semibold text-gray-900">Hubungkan Dompet Digital</h3>
      <p className="text-gray-600">
        Untuk membeli dengan kontrak pintar, Anda perlu menghubungkan dompet MetaMask
      </p>
      {!window.ethereum ? (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <p className="text-yellow-800 text-sm">
            MetaMask tidak terdeteksi. Silakan install MetaMask terlebih dahulu.
          </p>
          <a 
            href="https://metamask.io/download/" 
            target="_blank" 
            rel="noopener noreferrer"
            className="inline-block mt-2 text-blue-600 hover:text-blue-800 text-sm font-medium"
          >
            Unduh MetaMask →
          </a>
        </div>
      ) : (
        <button
          onClick={handleConnectWallet}
          disabled={isConnecting}
          className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isConnecting ? 'Menghubungkan...' : 'Hubungkan MetaMask'}
        </button>
      )}
    </div>
  );
    const renderProcessingStep = () => (
    <div className="text-center space-y-4">
      <div className="w-16 h-16 mx-auto">
        <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600"></div>
      </div>
      <h3 className="text-lg font-semibold text-gray-900">Memproses Transaksi</h3>
      <p className="text-gray-600">
        Transaksi sedang diproses di blockchain. Mohon tunggu...
      </p>
      {transactionHash && (
        <div className="bg-blue-50 rounded-lg p-4">
          <p className="text-sm text-blue-800">
            <span className="font-medium">Hash Transaksi:</span><br />
            <span className="font-mono break-all">{transactionHash}</span>
          </p>
          <a 
            href={`https://sepolia.etherscan.io/tx/${transactionHash}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-block mt-2 text-blue-600 hover:text-blue-800 text-sm font-medium"
          >
            Lihat di Etherscan →
          </a>
        </div>
      )}
    </div>
  );
  const renderSuccessStep = () => (
    <div className="text-center space-y-4">
      <div className="w-16 h-16 mx-auto bg-green-100 rounded-full flex items-center justify-center">
        <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
        </svg>
      </div>
      <h3 className="text-lg font-semibold text-gray-900">Pembelian Berhasil!</h3>
      <p className="text-gray-600">
        Transaksi telah berhasil dibuat di blockchain. Dana disimpan dalam escrow.
      </p>
      {escrowId && (
        <div className="bg-green-50 rounded-lg p-4">
          <p className="text-sm text-green-800">
            <span className="font-medium">ID Escrow:</span> {escrowId}<br />
            <span className="font-medium">Hash Transaksi:</span><br />
            <span className="font-mono break-all text-xs">{transactionHash}</span>
          </p>
        </div>
      )}
      <div className="bg-blue-50 rounded-lg p-4">
        <h4 className="font-medium text-blue-900 mb-2">Langkah Selanjutnya:</h4>
        <ol className="text-sm text-blue-800 text-left space-y-1">
          <li>1. Penjual akan mengirim detail akun</li>
          <li>2. Periksa akun yang diterima</li>
          <li>3. Konfirmasi penerimaan untuk melepas dana</li>
          <li>4. Atau buat sengketa jika ada masalah</li>
        </ol>
      </div>
      <button
        onClick={() => window.location.href = '/dashboard'}
        className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg hover:bg-blue-700"
      >
        Lihat Transaksi Saya
      </button>
    </div>
  );
  const renderErrorStep = () => (
    <div className="text-center space-y-4">
      <div className="w-16 h-16 mx-auto bg-red-100 rounded-full flex items-center justify-center">
        <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </div>
      <h3 className="text-lg font-semibold text-gray-900">Transaksi Gagal</h3>
      <div className="bg-red-50 rounded-lg p-4">
        <p className="text-red-800 text-sm">{error}</p>
      </div>
      <div className="flex space-x-3">
        <button
          onClick={onCancel}
          className="flex-1 bg-gray-300 text-gray-700 py-3 px-4 rounded-lg hover:bg-gray-400"
        >
          Tutup
        </button>
        <button
          onClick={() => {
            setError(null);
            setHasStartedPurchase(false);
            purchaseInProgressRef.current = false;
            setPurchaseStep('connect');
          }}
          className="flex-1 bg-blue-600 text-white py-3 px-4 rounded-lg hover:bg-blue-700"
        >
          Coba Lagi
        </button>
      </div>
    </div>
  );
  return (
    <div className="max-w-md mx-auto">
      {purchaseStep === 'connect' && renderConnectStep()}
      {purchaseStep === 'processing' && renderProcessingStep()}
      {purchaseStep === 'success' && renderSuccessStep()}
      {purchaseStep === 'error' && renderErrorStep()}
    </div>
  );
};
export default PembelianKontrakPintar;
