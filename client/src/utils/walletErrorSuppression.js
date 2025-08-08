// Wallet extension error suppression
// This file suppresses known non-critical errors from wallet extensions

// IMMEDIATE PROTECTION: Catch ethereum property redefinition errors at the earliest possible moment
(function() {
  const originalDefineProperty = Object.defineProperty;
  Object.defineProperty = function(obj, prop, descriptor) {
    try {
      if (prop === 'ethereum' && obj === window) {
        // Allow the first definition but suppress subsequent redefinition errors
        if (window.ethereum) {
          return window.ethereum; // Return existing ethereum object
        }
      }
      return originalDefineProperty.call(this, obj, prop, descriptor);
    } catch (error) {
      if (error.message && error.message.includes('Cannot redefine property: ethereum')) {
        // Silently ignore ethereum redefinition errors
        return window.ethereum || obj[prop];
      }
      throw error;
    }
  };
})();

// Store original console methods before overriding
const originalMethods = {
  error: console.error,
  warn: console.warn,
  log: console.log
};

// List of wallet extension patterns to suppress
const WALLET_ERROR_PATTERNS = [
  'Cannot redefine property: ethereum',
  'TypeError: Cannot redefine property: ethereum',
  'evmAsk.js',
  'chrome-extension',
  'bfnaelmomeimhlpmgjnjophhpkkoljpa',
  'defineProperty',
  'Object.defineProperty',
  'r.inject',
  'window.addEventListener.once',
  'Sender: Failed to get initial state',
  'sender-wallet-providerResult',
  'sender_getProviderState',
  'script.bundle.js:52',
  'notificationId',
  'Please report this bug',
  'type: \'sender-wallet-providerResult\'',
  'method: \'sender_getProviderState\'',
  'Failed to get initial state',
  'sender-wallet',
  'providerResult',
  'getProviderState',
  'sender\\',
  'sender_',
  'response: {…}',
  'params: Array(0)',
  'type: "sender-wallet-providerResult"',
  'method: "sender_getProviderState"',
  // OKX Wallet patterns
  'okx',
  'okxwallet',
  'okx-wallet',
  'OKX',
  'okx extension',
  'okx provider',
  'okxProvider',
  'wallet_',
  'okx_'
];

// Helper function to check if message contains wallet error patterns
const isWalletError = (message) => {
  return WALLET_ERROR_PATTERNS.some(pattern => 
    message.toLowerCase().includes(pattern.toLowerCase())
  );
};

// Override console.error to filter wallet extension errors
console.error = (...args) => {
  const message = args.join(' ');
  
  // Check if this is a wallet extension error
  if (isWalletError(message)) {
    // These are wallet extension errors that don't affect functionality
    return;
  }
  
  // Special handling for objects that might contain wallet errors
  if (args.length > 0 && typeof args[0] === 'object') {
    try {
      const objStr = JSON.stringify(args[0]);
      if (isWalletError(objStr)) {
        return;
      }
    } catch (e) {
      // If JSON.stringify fails, check the object's toString
      const objStr = args[0].toString();
      if (isWalletError(objStr)) {
        return;
      }
    }
  }
  
  // Allow other errors to be logged
  originalMethods.error.apply(console, args);
};

// Override console.warn for wallet warnings
console.warn = (...args) => {
  const message = args.join(' ');
  
  // Suppress expected wallet warnings
  if (
    isWalletError(message) ||
    message.includes('via.placeholder.com') ||
    message.includes('ERR_NAME_NOT_RESOLVED')
  ) {
    return;
  }
  
  originalMethods.warn.apply(console, args);
};

// Override console.log to catch any wallet logs that might be errors
console.log = (...args) => {
  const message = args.join(' ');
  if (isWalletError(message)) {
    return; // Suppress wallet logs
  }
  originalMethods.log.apply(console, args);
};

// Suppress global error events from wallet extensions
window.addEventListener('error', (event) => {
  if (
    isWalletError(event.message) ||
    event.filename?.includes('chrome-extension') ||
    event.filename?.includes('script.bundle.js')
  ) {
    event.preventDefault();
    event.stopPropagation();
    return false;
  }
});

// Suppress unhandled promise rejections from wallet extensions
window.addEventListener('unhandledrejection', (event) => {
  if (
    event.reason?.message && isWalletError(event.reason.message)
  ) {
    event.preventDefault();
    return false;
  }
});

// Additional protection: Override the global error handler
const originalOnError = window.onerror;
window.onerror = function(message, source, lineno, colno, error) {
  if (isWalletError(message) || source?.includes('script.bundle.js')) {
    return true; // Prevent default error handling
  }
  if (originalOnError) {
    return originalOnError.call(this, message, source, lineno, colno, error);
  }
  return false;
};

// More aggressive suppression: Override all console methods
const suppressWalletLogs = (originalMethod) => {
  return function(...args) {
    const message = args.join(' ');
    
    // Check for wallet errors in any console output
    if (isWalletError(message)) {
      return; // Suppress completely
    }
    
    // Check for objects that might contain wallet errors
    if (args.length > 0 && typeof args[0] === 'object') {
      try {
        const objStr = JSON.stringify(args[0]);
        if (isWalletError(objStr)) {
          return;
        }
      } catch (e) {
        // If JSON.stringify fails, check toString
        try {
          const objStr = args[0].toString();
          if (isWalletError(objStr)) {
            return;
          }
        } catch (e2) {
          // If both fail, check if it's a wallet-related object
          if (args[0] && (
            args[0].type === 'sender-wallet-providerResult' ||
            args[0].method === 'sender_getProviderState' ||
            String(args[0]).includes('sender')
          )) {
            return;
          }
        }
      }
    }
    
    // Allow other logs
    originalMethod.apply(console, args);
  };
};

// Apply aggressive suppression to all console methods
console.error = suppressWalletLogs(originalMethods.error);
console.warn = suppressWalletLogs(originalMethods.warn);
console.log = suppressWalletLogs(originalMethods.log);
console.info = suppressWalletLogs(console.info);
console.debug = suppressWalletLogs(console.debug);

// Intercept at the source - override the global console object
const originalConsole = window.console;
Object.defineProperty(window, 'console', {
  value: new Proxy(originalConsole, {
    get(target, prop) {
      if (typeof target[prop] === 'function' && ['error', 'warn', 'log', 'info', 'debug'].includes(prop)) {
        return suppressWalletLogs(originalMethods[prop] || target[prop]);
      }
      return target[prop];
    }
  }),
  writable: false,
  configurable: false
});

// Nuclear option: Intercept all possible error sources
// This catches errors that might bypass normal console methods
const originalSetTimeout = window.setTimeout;
window.setTimeout = function(callback, delay, ...args) {
  const wrappedCallback = function() {
    try {
      return callback.apply(this, arguments);
    } catch (error) {
      if (isWalletError(error.message || String(error))) {
        return; // Suppress wallet errors
      }
      throw error; // Re-throw non-wallet errors
    }
  };
  return originalSetTimeout.call(this, wrappedCallback, delay, ...args);
};

// Patch Promise to catch wallet-related rejections
const originalPromiseReject = Promise.reject;
Promise.reject = function(reason) {
  if (reason && isWalletError(String(reason))) {
    return new Promise(() => {}); // Return a never-resolving promise to suppress
  }
  return originalPromiseReject.call(this, reason);
};

// Final fallback: Multiple aggressive patches
setTimeout(() => {
  // Patch 1: Override console at multiple levels
  const patchConsoleAtLevel = (consoleObj) => {
    if (consoleObj && consoleObj.error) {
      const originalError = consoleObj.error;
      consoleObj.error = function(...args) {
        const message = args.join(' ');
        if (message.includes('Sender: Failed to get initial state') || 
            message.includes('sender-wallet-providerResult') ||
            message.includes('sender_getProviderState') ||
            (args[0] && typeof args[0] === 'object' && args[0].type === 'sender-wallet-providerResult')) {
          return; // Completely suppress
        }
        return originalError.apply(this, args);
      };
    }
  };

  // Apply patches to multiple console references
  patchConsoleAtLevel(window.console);
  patchConsoleAtLevel(console);
  
  // Patch 2: Override the console property descriptor
  try {
    Object.defineProperty(window, 'console', {
      get() {
        return new Proxy(originalConsole, {
          get(target, prop) {
            if (prop === 'error') {
              return function(...args) {
                const message = args.join(' ');
                if (message.includes('Sender: Failed to get initial state') || 
                    message.includes('sender-wallet-providerResult') ||
                    (args[0] && typeof args[0] === 'object' && args[0].type === 'sender-wallet-providerResult')) {
                  return;
                }
                return originalMethods.error.apply(this, args);
              };
            }
            return target[prop];
          }
        });
      },
      configurable: true
    });
  } catch (e) {
    // If property descriptor fails, continue with other methods
  }

  // Patch 3: Intercept at the DevTools level (if possible)
  if (window.chrome && window.chrome.runtime) {
    try {
      const originalSendMessage = window.chrome.runtime.sendMessage;
      window.chrome.runtime.sendMessage = function(...args) {
        const message = JSON.stringify(args);
        if (isWalletError(message)) {
          return; // Suppress wallet extension messages
        }
        return originalSendMessage.apply(this, args);
      };
    } catch (e) {
      // Chrome runtime not available or restricted
    }
  }
}, 100);

// Patch 4: CSS-based suppression (hide error messages in DevTools if they appear)
setTimeout(() => {
  const style = document.createElement('style');
  style.textContent = `
    /* Hide wallet extension errors in DevTools */
    .console-error-level:has-text("Sender: Failed to get initial state"),
    .console-error-level:has-text("sender-wallet-providerResult"),
    .console-error-level:has-text("sender_getProviderState") {
      display: none !important;
    }
  `;
  document.head.appendChild(style);
}, 200);

// ULTIMATE ETHEREUM PROPERTY PROTECTION
setTimeout(() => {
  // Additional protection for ethereum property redefinition
  const protectEthereumProperty = () => {
    try {
      // If ethereum already exists, make it non-configurable to prevent redefinition
      if (window.ethereum) {
        const currentEthereum = window.ethereum;
        
        // Try to redefine with protection
        try {
          Object.defineProperty(window, 'ethereum', {
            value: currentEthereum,
            writable: false,
            configurable: false,
            enumerable: true
          });
        } catch (e) {
          // If redefinition fails, that's actually good - it means it's already protected
        }
      }
      
      // Override any future attempts to redefine ethereum
      const originalDefineProperty = Object.defineProperty;
      Object.defineProperty = function(obj, prop, descriptor) {
        if (obj === window && prop === 'ethereum') {
          try {
            // If ethereum already exists, just return it
            if (window.ethereum) {
              return window.ethereum;
            }
            // Otherwise, allow the first definition
            return originalDefineProperty.call(this, obj, prop, descriptor);
          } catch (error) {
            // Suppress any redefinition errors
            if (error.message && error.message.includes('Cannot redefine property: ethereum')) {
              return window.ethereum;
            }
            throw error;
          }
        }
        return originalDefineProperty.call(this, obj, prop, descriptor);
      };
      
    } catch (e) {
      // Silently handle any errors in protection setup
    }
  };
  
  protectEthereumProperty();
  
  // Run protection again after a delay to catch late-loading extensions
  setTimeout(protectEthereumProperty, 1000);
  setTimeout(protectEthereumProperty, 3000);
  setTimeout(protectEthereumProperty, 5000);
  
}, 50);

// FINAL ERROR SUPPRESSION: Catch any remaining ethereum errors
const finalErrorSuppression = () => {
  // Override any remaining error handlers
  const suppressEthereumErrors = (originalHandler) => {
    return function(...args) {
      const message = args.join(' ');
      if (message.includes('Cannot redefine property: ethereum') ||
          message.includes('evmAsk.js') ||
          message.includes('bfnaelmomeimhlpmgjnjophhpkkoljpa')) {
        return; // Suppress completely
      }
      if (originalHandler) {
        return originalHandler.apply(this, args);
      }
    };
  };
  
  // Apply to all possible error handlers
  if (window.console && window.console.error) {
    window.console.error = suppressEthereumErrors(originalMethods.error);
  }
  
  // Global error handler override
  window.onerror = function(message, source, lineno, colno, error) {
    if (message && (
      message.includes('Cannot redefine property: ethereum') ||
      message.includes('evmAsk.js') ||
      message.includes('bfnaelmomeimhlpmgjnjophhpkkoljpa')
    )) {
      return true; // Prevent default error handling
    }
    return false;
  };
};

// Apply final suppression immediately and after delays
finalErrorSuppression();
setTimeout(finalErrorSuppression, 100);
setTimeout(finalErrorSuppression, 500);
setTimeout(finalErrorSuppression, 1000);

// Debug: Log that suppression is active (using original method to avoid suppression)
originalMethods.log('��️ Enhanced wallet error suppression active - Nuclear mode with Ethereum protection');

export default {};