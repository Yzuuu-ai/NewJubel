# Jubel Escrow Smart Contract - Usage Guide

## Contract Information
- **Network**: Sepolia Testnet
- **Contract Address**: `0x36E0E218DB17d111B47fcF80F672F8F0225eBb21`
- **Owner**: `0xE14fcb0fDb1256445DC6ddd876225a8fAd9D211F`
- **Etherscan**: https://sepolia.etherscan.io/address/0x36E0E218DB17d111B47fcF80F672F8F0225eBb21

## Features
- ✅ Secure escrow for game account transactions
- ✅ Automatic timeout refunds (15 minutes)
- ✅ Dispute resolution system
- ✅ Admin controls
- ✅ Event logging for all transactions

## Contract Functions

### 1. Create Escrow
```javascript
const escrow = new EscrowContract();
const result = await escrow.createEscrow(
  buyerPrivateKey,    // Buyer's private key
  sellerAddress,      // Seller's wallet address
  "GAME001",         // Product code
  "0.01"             // Amount in ETH
);
```

### 2. Confirm Receipt (Release Payment)
```javascript
const result = await escrow.confirmReceived(
  buyerPrivateKey,   // Buyer's private key
  escrowId          // Escrow ID
);
```

### 3. Create Dispute
```javascript
const result = await escrow.createDispute(
  userPrivateKey,   // Buyer or seller's private key
  escrowId         // Escrow ID
);
```

### 4. Get Escrow Details
```javascript
const result = await escrow.getEscrow(escrowId);
console.log(result.data);
// Output:
// {
//   escrowId: "1",
//   buyer: "0x...",
//   seller: "0x...",
//   amount: "0.01",
//   status: "FUNDED",
//   createdAt: Date,
//   timeoutAt: Date,
//   disputeActive: false,
//   productCode: "GAME001"
// }
```

## Escrow Status Flow

```
CREATED → FUNDED → COMPLETED
    ↓        ↓         ↑
CANCELLED  DISPUTED → REFUNDED
```

### Status Descriptions:
- **CREATED**: Escrow created, waiting for payment
- **FUNDED**: Payment received, waiting for confirmation
- **COMPLETED**: Transaction completed, payment released to seller
- **DISPUTED**: Dispute active, waiting for admin resolution
- **REFUNDED**: Payment refunded to buyer
- **CANCELLED**: Escrow cancelled before funding

## Integration with Server

### 1. Install Dependencies
```bash
npm install ethers dotenv
```

### 2. Environment Variables
```env
ESCROW_CONTRACT_ADDRESS=0x36E0E218DB17d111B47fcF80F672F8F0225eBb21
PRIVATE_KEY=your_admin_private_key
SEPOLIA_RPC_URL=https://sepolia.infura.io/v3/your_infura_key
```

### 3. Basic Usage Example
```javascript
const EscrowContract = require('./smart-contract/scripts/contract-interface.js');

// Initialize contract
const escrowContract = new EscrowContract();

// Create escrow when user makes purchase
app.post('/api/purchase', async (req, res) => {
  const { buyerPrivateKey, sellerAddress, productCode, amount } = req.body;
  
  const result = await escrowContract.createEscrow(
    buyerPrivateKey,
    sellerAddress,
    productCode,
    amount
  );
  
  if (result.success) {
    // Save escrow ID to database
    // Update order status
    res.json({ escrowId: result.escrowId, txHash: result.transactionHash });
  } else {
    res.status(400).json({ error: result.error });
  }
});

// Confirm receipt when buyer receives account
app.post('/api/confirm-receipt', async (req, res) => {
  const { buyerPrivateKey, escrowId } = req.body;
  
  const result = await escrowContract.confirmReceived(buyerPrivateKey, escrowId);
  
  if (result.success) {
    // Update order status to completed
    res.json({ success: true, txHash: result.transactionHash });
  } else {
    res.status(400).json({ error: result.error });
  }
});
```

## Testing

### Run Contract Tests
```bash
cd smart-contract
npx hardhat run scripts/test-contract.js --network sepolia
```

### Check Contract Stats
```bash
node -e "
const EscrowContract = require('./scripts/contract-interface.js');
const escrow = new EscrowContract();
escrow.getContractStats().then(console.log);
"
```

## Security Features

1. **Timeout Protection**: Automatic refund after 15 minutes if no confirmation
2. **Dispute Resolution**: Admin can resolve disputes between parties
3. **Access Control**: Only authorized parties can perform specific actions
4. **Event Logging**: All transactions are logged for transparency
5. **Reentrancy Protection**: Built-in protection against reentrancy attacks

## Gas Estimates

| Function | Estimated Gas |
|----------|---------------|
| createEscrow | ~150,000 |
| confirmReceived | ~80,000 |
| createDispute | ~70,000 |
| resolveDispute | ~90,000 |

## Error Handling

Common errors and solutions:

1. **"Insufficient funds"**: Ensure wallet has enough ETH for transaction + gas
2. **"Only buyer can call this function"**: Verify correct private key is used
3. **"Escrow does not exist"**: Check escrow ID is valid
4. **"Cannot confirm during dispute"**: Resolve dispute first

## Support

For technical support or questions:
- Check transaction on Etherscan: https://sepolia.etherscan.io/
- Review contract events for debugging
- Ensure correct network (Sepolia) is being used

## Next Steps

1. ✅ Smart contract deployed and tested
2. 🔄 Integrate with server API endpoints
3. 🔄 Add frontend wallet connection
4. 🔄 Implement event listeners for real-time updates
5. 🔄 Add admin dashboard for dispute resolution