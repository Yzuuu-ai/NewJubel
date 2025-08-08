# 🔐 Jubel Escrow Smart Contract

Smart Contract Escrow untuk marketplace jual beli akun game dengan sistem keamanan dan dispute resolution.

## 🏗️ Fitur Smart Contract

### ✅ **Core Functions:**
- **Create Escrow** - Pembeli membuat escrow dengan deposit ETH
- **Confirm Receipt** - Pembeli konfirmasi terima produk, dana ke penjual
- **Create Dispute** - Pembeli/penjual buat sengketa
- **Resolve Dispute** - Admin putuskan pemenang sengketa
- **Timeout Protection** - Auto-refund jika timeout 15 menit

### ✅ **Security Features:**
- **Access Control** - Owner dan admin system
- **Reentrancy Protection** - Secure fund transfers
- **Input Validation** - Comprehensive checks
- **Emergency Functions** - Owner emergency withdraw

### ✅ **Event Logging:**
- EscrowCreated, PaymentReleased, PaymentRefunded
- DisputeCreated, DisputeResolved
- Full transaction history on blockchain

## 🚀 Quick Setup

### 1. Install Dependencies
```bash
cd smart-contract
npm install
```

### 2. Configure Environment
```bash
cp .env.example .env
# Edit .env dengan private key dan RPC URL
```

### 3. Compile Contract
```bash
npm run compile
```

### 4. Run Tests
```bash
npm run test
```

### 5. Deploy to Sepolia Testnet
```bash
npm run deploy
```

## 📋 Contract Functions

### **createEscrow(seller, productCode)**
- Pembeli membuat escrow dengan deposit ETH
- Dana ditahan di contract sampai konfirmasi
- Returns: escrowId

### **confirmReceived(escrowId)**
- Pembeli konfirmasi terima produk
- Dana otomatis transfer ke penjual
- Status: COMPLETED

### **createDispute(escrowId)**
- Pembeli/penjual buat sengketa
- Status: DISPUTED
- Butuh admin untuk resolve

### **resolveDispute(escrowId, winner)**
- Admin putuskan pemenang
- Dana ke penjual atau refund ke pembeli
- Status: COMPLETED/REFUNDED

## 🔄 Status Flow

```
CREATED → FUNDED → COMPLETED ✅
    ↓         ↓
CANCELLED  DISPUTED → COMPLETED/REFUNDED
```

## 🧪 Testing

Contract sudah dilengkapi dengan comprehensive tests:

```bash
npm run test
```

**Test Coverage:**
- ✅ Deployment & initialization
- ✅ Create escrow (success & failure cases)
- ✅ Confirm receipt
- ✅ Dispute creation & resolution
- ✅ Admin management
- ✅ Emergency functions

## 🌐 Network Configuration

### **Sepolia Testnet**
- RPC: `https://sepolia.infura.io/v3/YOUR_KEY`
- Chain ID: 11155111
- Explorer: https://sepolia.etherscan.io
- Faucet: https://sepoliafaucet.com

## 🔗 Backend Integration

Contract sudah terintegrasi dengan backend melalui `EscrowService`:

```javascript
const escrowService = new EscrowService();

// Create escrow
const result = await escrowService.createEscrow(
  sellerAddress, 
  productCode, 
  amount
);

// Confirm receipt
await escrowService.confirmReceived(escrowId, buyerPrivateKey);

// Create dispute
await escrowService.createDispute(escrowId, initiatorPrivateKey);
```

## 📊 Gas Estimates

| Function | Gas Limit | Cost (20 gwei) |
|----------|-----------|----------------|
| createEscrow | ~150,000 | ~0.003 ETH |
| confirmReceived | ~50,000 | ~0.001 ETH |
| createDispute | ~80,000 | ~0.0016 ETH |
| resolveDispute | ~60,000 | ~0.0012 ETH |

## 🛡️ Security Considerations

1. **Private Key Management** - Never commit private keys
2. **RPC Endpoints** - Use reliable providers (Infura/Alchemy)
3. **Gas Price** - Monitor network congestion
4. **Contract Verification** - Verify on Etherscan after deploy
5. **Admin Keys** - Secure admin private keys

## 📝 Deployment Checklist

- [ ] Configure .env with correct keys
- [ ] Test on local network first
- [ ] Deploy to testnet
- [ ] Verify contract on explorer
- [ ] Update backend .env with contract address
- [ ] Test integration with backend
- [ ] Setup event monitoring
- [ ] Configure admin addresses

## 🎯 Next Steps

1. ✅ Smart Contract (COMPLETED)
2. 🔄 Backend API Integration
3. 🔄 Frontend Web3 Integration
4. 🔄 Testing & Deployment
5. 🔄 Production Launch