// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

/**
 * @title Escrow Smart Contract untuk Jubel Marketplace
 * @dev Contract untuk menahan dana dalam transaksi jual beli akun game
 * @author Jubel Team
 */
contract EscrowFixed {
    
    // Events
    event EscrowCreated(uint256 indexed escrowId, address indexed buyer, address indexed seller, uint256 amount);
    event PaymentDeposited(uint256 indexed escrowId, address indexed buyer, uint256 amount);
    event PaymentReleased(uint256 indexed escrowId, address indexed seller, uint256 amount);
    event PaymentRefunded(uint256 indexed escrowId, address indexed buyer, uint256 amount);
    event DisputeCreated(uint256 indexed escrowId, address indexed initiator);
    event DisputeResolved(uint256 indexed escrowId, address indexed winner, uint256 amount);
    event AdminPaymentProcessed(uint256 indexed escrowId, address indexed admin, uint256 amount, string reason);
    event AdminRefundProcessed(uint256 indexed escrowId, address indexed admin, uint256 amount, string reason);
    
    // Enums
    enum EscrowStatus {
        CREATED,        // Escrow dibuat, menunggu pembayaran
        FUNDED,         // Dana sudah masuk, menunggu konfirmasi
        COMPLETED,      // Transaksi selesai, dana dilepas ke penjual
        DISPUTED,       // Ada sengketa
        REFUNDED,       // Dana dikembalikan ke pembeli
        CANCELLED,      // Dibatalkan
        ADMIN_PROCESSED // admin processing
    }
    
    // Structs
    struct EscrowData {
        uint256 escrowId;
        address buyer;
        address seller;
        uint256 amount;
        EscrowStatus status;
        uint256 createdAt;
        uint256 timeoutAt;      // Batas waktu pembayaran (15 menit)
        bool disputeActive;
        address disputeInitiator;
        string productCode;     // Kode produk dari database
        //  admin tracking
        address processedBy;    // Admin yang memproses
        uint256 processedAt;    // Waktu diproses
        string adminNote;       // Catatan admin
    }
    
    // State variables
    mapping(uint256 => EscrowData) public escrows;
    mapping(address => bool) public admins;
    mapping(address => uint256) public adminPaymentCount; // 🆕 Tracking admin payments
    
    address public owner;
    uint256 public escrowCounter;
    uint256 public totalAdminPayments; // 🆕 Total admin payments
    
    // Constants
    uint256 public constant PAYMENT_TIMEOUT = 24 hours; // 🔧 Extended timeout
    uint256 public constant DISPUTE_TIMEOUT = 7 days;
    
    // Modifiers
    modifier onlyOwner() {
        require(msg.sender == owner, "Only owner can call this function");
        _;
    }
    
    modifier onlyAdmin() {
        require(admins[msg.sender] || msg.sender == owner, "Only admin can call this function");
        _;
    }
    
    modifier onlyBuyer(uint256 _escrowId) {
        require(msg.sender == escrows[_escrowId].buyer, "Only buyer can call this function");
        _;
    }
    
    modifier onlySeller(uint256 _escrowId) {
        require(msg.sender == escrows[_escrowId].seller, "Only seller can call this function");
        _;
    }
    
    modifier escrowExists(uint256 _escrowId) {
        require(escrows[_escrowId].buyer != address(0), "Escrow does not exist");
        _;
    }
    
    // Constructor
    constructor() {
        owner = msg.sender;
        admins[msg.sender] = true;
        escrowCounter = 0;
        totalAdminPayments = 0;
    }
    
    function createEscrow(
        address _seller,
        string memory _productCode
    ) external payable returns (uint256) {
        require(_seller != address(0), "Invalid seller address");
        require(_seller != msg.sender, "Buyer and seller cannot be the same");
        require(msg.value > 0, "Amount must be greater than 0");
        
        escrowCounter++;
        uint256 newEscrowId = escrowCounter;
        
        escrows[newEscrowId] = EscrowData({
            escrowId: newEscrowId,
            buyer: msg.sender,
            seller: _seller,
            amount: msg.value,
            status: EscrowStatus.FUNDED,
            createdAt: block.timestamp,
            timeoutAt: block.timestamp + PAYMENT_TIMEOUT,
            disputeActive: false,
            disputeInitiator: address(0),
            productCode: _productCode,
            processedBy: address(0),
            processedAt: 0,
            adminNote: ""
        });
        
        emit EscrowCreated(newEscrowId, msg.sender, _seller, msg.value);
        emit PaymentDeposited(newEscrowId, msg.sender, msg.value);
        
        return newEscrowId;
    }
    
    function confirmReceived(uint256 _escrowId) 
        external 
        escrowExists(_escrowId) 
        onlyBuyer(_escrowId) 
    {
        EscrowData storage escrow = escrows[_escrowId];
        require(escrow.status == EscrowStatus.FUNDED, "Escrow is not in funded state");
        require(!escrow.disputeActive, "Cannot confirm during dispute");
        
        escrow.status = EscrowStatus.COMPLETED;
        escrow.processedBy = msg.sender;
        escrow.processedAt = block.timestamp;
        
        // Transfer dana ke penjual
        payable(escrow.seller).transfer(escrow.amount);
        
        emit PaymentReleased(_escrowId, escrow.seller, escrow.amount);
    }
    
    function adminReleaseFunds(uint256 _escrowId, string memory _reason) 
        external 
        escrowExists(_escrowId) 
        onlyAdmin 
    {
        EscrowData storage escrow = escrows[_escrowId];
        require(escrow.status == EscrowStatus.FUNDED, "Escrow is not in funded state");
        require(bytes(_reason).length >= 10, "Reason must be at least 10 characters");
        
        escrow.status = EscrowStatus.ADMIN_PROCESSED;
        escrow.processedBy = msg.sender;
        escrow.processedAt = block.timestamp;
        escrow.adminNote = _reason;
        
        // Update statistics
        adminPaymentCount[msg.sender]++;
        totalAdminPayments++;
        
        // Transfer dana ke penjual
        payable(escrow.seller).transfer(escrow.amount);
        
        emit AdminPaymentProcessed(_escrowId, msg.sender, escrow.amount, _reason);
        emit PaymentReleased(_escrowId, escrow.seller, escrow.amount);
    }
    
    function adminRefund(uint256 _escrowId, string memory _reason) 
        external 
        escrowExists(_escrowId) 
        onlyAdmin 
    {
        EscrowData storage escrow = escrows[_escrowId];
        require(escrow.status == EscrowStatus.FUNDED, "Escrow is not in funded state");
        require(bytes(_reason).length >= 10, "Reason must be at least 10 characters");
        
        escrow.status = EscrowStatus.REFUNDED;
        escrow.processedBy = msg.sender;
        escrow.processedAt = block.timestamp;
        escrow.adminNote = _reason;
        
        // Update statistics
        adminPaymentCount[msg.sender]++;
        
        // Transfer dana kembali ke pembeli
        payable(escrow.buyer).transfer(escrow.amount);
        
        emit AdminRefundProcessed(_escrowId, msg.sender, escrow.amount, _reason);
        emit PaymentRefunded(_escrowId, escrow.buyer, escrow.amount);
    }
    
    function createDispute(uint256 _escrowId) 
        external 
        escrowExists(_escrowId) 
    {
        EscrowData storage escrow = escrows[_escrowId];
        require(
            msg.sender == escrow.buyer || msg.sender == escrow.seller,
            "Only buyer or seller can create dispute"
        );
        require(escrow.status == EscrowStatus.FUNDED, "Escrow is not in funded state");
        require(!escrow.disputeActive, "Dispute already active");
        
        escrow.status = EscrowStatus.DISPUTED;
        escrow.disputeActive = true;
        escrow.disputeInitiator = msg.sender;
        
        emit DisputeCreated(_escrowId, msg.sender);
    }
    
    function adminCreateDispute(uint256 _escrowId, string memory _reason) 
        external 
        escrowExists(_escrowId) 
        onlyAdmin 
    {
        EscrowData storage escrow = escrows[_escrowId];
        require(escrow.status == EscrowStatus.FUNDED, "Escrow is not in funded state");
        require(!escrow.disputeActive, "Dispute already active");
        require(bytes(_reason).length >= 10, "Reason must be at least 10 characters");
        
        escrow.status = EscrowStatus.DISPUTED;
        escrow.disputeActive = true;
        escrow.disputeInitiator = msg.sender; // Admin sebagai initiator
        escrow.adminNote = _reason;
        
        emit DisputeCreated(_escrowId, msg.sender);
    }
    
    function resolveDispute(uint256 _escrowId, address _winner) 
        external 
        escrowExists(_escrowId) 
        onlyAdmin 
    {
        EscrowData storage escrow = escrows[_escrowId];
        require(escrow.status == EscrowStatus.DISPUTED, "No active dispute");
        require(
            _winner == escrow.buyer || _winner == escrow.seller,
            "Winner must be buyer or seller"
        );
        
        escrow.disputeActive = false;
        escrow.processedBy = msg.sender;
        escrow.processedAt = block.timestamp;
        
        // Update statistics
        adminPaymentCount[msg.sender]++;
        
        if (_winner == escrow.seller) {
            // Penjual menang, dana ke penjual
            escrow.status = EscrowStatus.COMPLETED;
            payable(escrow.seller).transfer(escrow.amount);
            emit PaymentReleased(_escrowId, escrow.seller, escrow.amount);
        } else {
            // Pembeli menang, dana dikembalikan
            escrow.status = EscrowStatus.REFUNDED;
            payable(escrow.buyer).transfer(escrow.amount);
            emit PaymentRefunded(_escrowId, escrow.buyer, escrow.amount);
        }
        
        emit DisputeResolved(_escrowId, _winner, escrow.amount);
    }
    
    function cancelEscrow(uint256 _escrowId) 
        external 
        escrowExists(_escrowId) 
        onlyBuyer(_escrowId) 
    {
        EscrowData storage escrow = escrows[_escrowId];
        require(escrow.status == EscrowStatus.CREATED, "Cannot cancel funded escrow");
        
        escrow.status = EscrowStatus.CANCELLED;
        escrow.processedBy = msg.sender;
        escrow.processedAt = block.timestamp;
    }
    
    function timeoutRefund(uint256 _escrowId) 
        external 
        escrowExists(_escrowId) 
    {
        EscrowData storage escrow = escrows[_escrowId];
        require(block.timestamp > escrow.timeoutAt, "Timeout not reached");
        require(escrow.status == EscrowStatus.FUNDED, "Escrow not in funded state");
        
        escrow.status = EscrowStatus.REFUNDED;
        escrow.processedBy = msg.sender;
        escrow.processedAt = block.timestamp;
        
        payable(escrow.buyer).transfer(escrow.amount);
        
        emit PaymentRefunded(_escrowId, escrow.buyer, escrow.amount);
    }
    
    function addAdmin(address _admin) external onlyOwner {
        require(_admin != address(0), "Invalid admin address");
        admins[_admin] = true;
    }
    
   
    function removeAdmin(address _admin) external onlyOwner {
        require(_admin != owner, "Cannot remove owner");
        admins[_admin] = false;
    }
    
  
    function isAdmin(address _address) external view returns (bool) {
        return admins[_address] || _address == owner;
    }
    
    function getAdminPaymentCount(address _admin) external view returns (uint256) {
        return adminPaymentCount[_admin];
    }
    
    function getContractStats() 
        external 
        view 
        returns (
            uint256 totalEscrows,
            uint256 totalAdminProcessed,
            uint256 contractBalance
        ) 
    {
        return (
            escrowCounter,
            totalAdminPayments,
            address(this).balance
        );
    }
    
    function getEscrow(uint256 _escrowId) 
        external 
        view 
        escrowExists(_escrowId) 
        returns (EscrowData memory) 
    {
        return escrows[_escrowId];
    }
    

    function getContractBalance() external view returns (uint256) {
        return address(this).balance;
    }
    
    function emergencyWithdraw() external onlyOwner {
        payable(owner).transfer(address(this).balance);
    }
    
    function batchProcess(
        uint256[] memory _escrowIds, 
        uint8 _action, 
        string memory _reason
    ) external onlyAdmin {
        require(_escrowIds.length > 0, "No escrow IDs provided");
        require(_escrowIds.length <= 20, "Too many escrows in batch");
        require(bytes(_reason).length >= 10, "Reason required");
        require(_action <= 1, "Invalid action");
        
        for (uint256 i = 0; i < _escrowIds.length; i++) {
            uint256 escrowId = _escrowIds[i];
            
            if (escrowId > 0 && escrowId <= escrowCounter) {
                EscrowData storage escrow = escrows[escrowId];
                
                if (escrow.status == EscrowStatus.FUNDED && !escrow.disputeActive) {
                    if (_action == 0) {
                        // Release to seller
                        escrow.status = EscrowStatus.ADMIN_PROCESSED;
                        escrow.processedBy = msg.sender;
                        escrow.processedAt = block.timestamp;
                        escrow.adminNote = _reason;
                        
                        adminPaymentCount[msg.sender]++;
                        totalAdminPayments++;
                        
                        payable(escrow.seller).transfer(escrow.amount);
                        emit AdminPaymentProcessed(escrowId, msg.sender, escrow.amount, _reason);
                        emit PaymentReleased(escrowId, escrow.seller, escrow.amount);
                    } else {
                        // Refund to buyer
                        escrow.status = EscrowStatus.REFUNDED;
                        escrow.processedBy = msg.sender;
                        escrow.processedAt = block.timestamp;
                        escrow.adminNote = _reason;
                        
                        adminPaymentCount[msg.sender]++;
                        
                        payable(escrow.buyer).transfer(escrow.amount);
                        emit AdminRefundProcessed(escrowId, msg.sender, escrow.amount, _reason);
                        emit PaymentRefunded(escrowId, escrow.buyer, escrow.amount);
                    }
                }
            }
        }
    }
}