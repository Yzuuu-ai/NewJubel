const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');
class WebSocketService {
  constructor() {
    this.io = null;
    this.connectedUsers = new Map(); // userId -> socketId
    this.userSockets = new Map(); // socketId -> userInfo
  }
  initialize(server) {
    this.io = new Server(server, {
      cors: {
        origin: process.env.FRONTEND_URL || "http://localhost:3000",
        methods: ["GET", "POST"],
        credentials: true
      }
    });
    this.setupEventHandlers();
  }
  setupEventHandlers() {
    this.io.on('connection', (socket) => {
      // Handle authentication
      socket.on('authenticate', (token) => {
        try {
          const decoded = jwt.verify(token, process.env.JWT_SECRET);
          const userInfo = {
            userId: decoded.userId,
            email: decoded.email,
            role: decoded.role,
            socketId: socket.id
          };
          this.connectedUsers.set(decoded.userId, socket.id);
          this.userSockets.set(socket.id, userInfo);
          socket.join(`user_${decoded.userId}`);
          socket.join(`role_${decoded.role}`);
          socket.emit('authenticated', { success: true, userInfo });
        } catch (error) {
          socket.emit('authentication_error', { error: 'Invalid token' });
        }
      });
      // Handle marketplace subscription
      socket.on('subscribe_marketplace', () => {
        socket.join('marketplace');
      });
      // Handle transaction subscription
      socket.on('subscribe_transactions', (userId) => {
        socket.join(`transactions_${userId}`);
      });
      // Handle admin subscription
      socket.on('subscribe_admin', () => {
        const userInfo = this.userSockets.get(socket.id);
        if (userInfo && userInfo.role === 'ADMIN') {
          socket.join('admin');
        }
      });
      // Handle disconnection
      socket.on('disconnect', () => {
        const userInfo = this.userSockets.get(socket.id);
        if (userInfo) {
          this.connectedUsers.delete(userInfo.userId);
          this.userSockets.delete(socket.id);
        } else {
        }
      });
    });
  }
  // Broadcast product updates
  broadcastProductUpdate(productData, action) {
    const event = {
      type: 'PRODUCT_UPDATE',
      action, // 'CREATED', 'UPDATED', 'SOLD', 'DELETED'
      data: productData,
      timestamp: new Date().toISOString()
    };
    this.io.to('marketplace').emit('product_update', event);
    // Also notify the seller
    if (productData.penjualId) {
      this.io.to(`user_${productData.penjualId}`).emit('seller_product_update', event);
    }
  }
  // Broadcast transaction updates
  broadcastTransactionUpdate(transactionData, action) {
    const event = {
      type: 'TRANSACTION_UPDATE',
      action, // 'CREATED', 'PAID', 'SENT', 'COMPLETED', 'DISPUTED'
      data: transactionData,
      timestamp: new Date().toISOString()
    };
    // Notify buyer
    if (transactionData.pembeliId) {
      this.io.to(`user_${transactionData.pembeliId}`).emit('buyer_transaction_update', event);
    }
    // Notify seller
    if (transactionData.penjualId) {
      this.io.to(`user_${transactionData.penjualId}`).emit('seller_transaction_update', event);
    }
    // Notify admin
    this.io.to('admin').emit('admin_transaction_update', event);
  }
  // Broadcast user updates
  broadcastUserUpdate(userData, action) {
    const event = {
      type: 'USER_UPDATE',
      action, // 'REGISTERED', 'UPDATED', 'WALLET_CONNECTED'
      data: userData,
      timestamp: new Date().toISOString()
    };
    this.io.to('admin').emit('admin_user_update', event);
  }
  // Send notification to specific user
  sendNotificationToUser(userId, notification) {
    const socketId = this.connectedUsers.get(userId);
    if (socketId) {
      this.io.to(socketId).emit('notification', {
        type: 'NOTIFICATION',
        data: notification,
        timestamp: new Date().toISOString()
      });
    }
  }
  // Send urgent alert to user
  sendUrgentAlert(userId, alert) {
    const socketId = this.connectedUsers.get(userId);
    if (socketId) {
      this.io.to(socketId).emit('urgent_alert', {
        type: 'URGENT_ALERT',
        data: alert,
        timestamp: new Date().toISOString()
      });
    }
  }
  // Broadcast system maintenance
  broadcastSystemMaintenance(message) {
    this.io.emit('system_maintenance', {
      type: 'SYSTEM_MAINTENANCE',
      message,
      timestamp: new Date().toISOString()
    });
  }
  // Get connected users count
  getConnectedUsersCount() {
    return this.connectedUsers.size;
  }
  // Get user connection status
  isUserConnected(userId) {
    return this.connectedUsers.has(userId);
  }
  // Force refresh for all clients
  forceRefreshAll(reason) {
    this.io.emit('force_refresh', {
      type: 'FORCE_REFRESH',
      reason,
      timestamp: new Date().toISOString()
    });
  }
}
// Create singleton instance
const websocketService = new WebSocketService();
module.exports = websocketService;
