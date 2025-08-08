// Debug utilities for development
export const debugLog = (message, data) => {
  if (process.env.NODE_ENV === 'development') {
    console.log(message, data);
  }
};

export const debugOwnershipCheck = (isAuthenticated, user, selectedProduct) => {
  if (process.env.NODE_ENV === 'development') {
    console.log('🔍 Ownership check:', {
      isAuthenticated,
      hasUser: !!user,
      userId: user?.id,
      userEmail: user?.email,
      productSellerId: selectedProduct?.penjual?.id,
      productSellerEmail: selectedProduct?.penjual?.email,
      productUserId: selectedProduct?.user?.id,
      productPenjualId: selectedProduct?.penjualId
    });
  }
};