// utils/accountDataHelper.js
// Helper untuk mengelola data akun dalam transaksi

/**
 * Helper untuk mengelola data akun dalam transaksi
 */
export const accountDataHelper = {
  /**
   * Cek apakah transaksi memiliki data akun
   * @param {Object} transaksi - Object transaksi
   * @returns {boolean} True jika ada data akun
   */
  hasAccountData(transaksi) {
    if (!transaksi) return false;
    
    // Cek berbagai field yang mungkin berisi data akun
    // Prioritas utama: accountData (dari server) dan deskripsiBukti
    if (transaksi.accountData) {
      // Jika accountData adalah object dan memiliki data
      if (typeof transaksi.accountData === 'object') {
        return !!(
          transaksi.accountData.username ||
          transaksi.accountData.password ||
          transaksi.accountData.email ||
          transaksi.accountData.dataAkun
        );
      }
      // Jika accountData adalah string
      if (typeof transaksi.accountData === 'string' && transaksi.accountData.trim()) {
        return true;
      }
    }
    
    // Cek field lainnya untuk backward compatibility
    return !!(
      transaksi.deskripsiBukti ||
      transaksi.dataAkun ||
      transaksi.usernameAkun ||
      transaksi.passwordAkun ||
      transaksi.emailAkun ||
      transaksi.buktiPenjual ||
      (transaksi.catatan && transaksi.catatan.trim())
    );
  },

  /**
   * Ekstrak data akun dari transaksi
   * @param {Object} transaksi - Object transaksi
   * @returns {Object} Data akun yang terstruktur
   */
  extractAccountData(transaksi) {
    if (!transaksi) return null;

    return {
      username: transaksi.usernameAkun || '',
      password: transaksi.passwordAkun || '',
      email: transaksi.emailAkun || '',
      dataAkun: transaksi.dataAkun || '',
      buktiPenjual: transaksi.buktiPenjual || '',
      deskripsiBukti: transaksi.deskripsiBukti || '',
      catatan: transaksi.catatan || '',
      // Tambahan data yang mungkin ada
      additionalInfo: transaksi.additionalInfo || '',
      gameSpecificData: transaksi.gameSpecificData || ''
    };
  },

  /**
   * Format data akun untuk ditampilkan
   * @param {Object} transaksi - Object transaksi
   * @returns {Array} Array of formatted account data
   */
  formatAccountDataForDisplay(transaksi) {
    const accountData = this.extractAccountData(transaksi);
    if (!accountData) return [];

    const displayData = [];

    if (accountData.username) {
      displayData.push({
        label: 'Username',
        value: accountData.username,
        type: 'text',
        sensitive: false
      });
    }

    if (accountData.password) {
      displayData.push({
        label: 'Password',
        value: accountData.password,
        type: 'password',
        sensitive: true
      });
    }

    if (accountData.email) {
      displayData.push({
        label: 'Email',
        value: accountData.email,
        type: 'email',
        sensitive: false
      });
    }

    if (accountData.dataAkun) {
      displayData.push({
        label: 'Data Akun',
        value: accountData.dataAkun,
        type: 'textarea',
        sensitive: false
      });
    }

    if (accountData.catatan) {
      displayData.push({
        label: 'Catatan',
        value: accountData.catatan,
        type: 'textarea',
        sensitive: false
      });
    }

    if (accountData.deskripsiBukti) {
      displayData.push({
        label: 'Deskripsi Bukti',
        value: accountData.deskripsiBukti,
        type: 'textarea',
        sensitive: false
      });
    }

    return displayData;
  },

  /**
   * Validasi data akun sebelum dikirim
   * @param {Object} accountData - Data akun yang akan divalidasi
   * @returns {Object} Result dengan success, errors, isValid, score, dan issues
   */
  validateAccountData(accountData) {
    const errors = [];
    const issues = [];
    let score = 0;

    // Validasi username
    if (accountData.username) {
      score += 30;
      if (accountData.username.length < 3) {
        issues.push('Username terlalu pendek (minimal 3 karakter)');
        score -= 10;
      }
    } else {
      issues.push('Username tidak tersedia');
    }

    // Validasi email
    if (accountData.email) {
      if (this.isValidEmail(accountData.email)) {
        score += 25;
      } else {
        issues.push('Format email tidak valid');
        score += 10; // Partial score karena ada email tapi tidak valid
      }
    } else {
      issues.push('Email tidak tersedia');
    }

    // Validasi password
    if (accountData.password) {
      if (accountData.password.length >= 6) {
        score += 45;
      } else if (accountData.password.length >= 3) {
        score += 30;
        issues.push('Password pendek (kurang dari 6 karakter)');
      } else {
        score += 15;
        issues.push('Password terlalu pendek (kurang dari 3 karakter)');
      }
    } else {
      issues.push('Password tidak tersedia');
    }

    // Minimal harus ada username atau email
    if (!accountData.username && !accountData.email && !accountData.dataAkun) {
      errors.push('Minimal harus ada Username, Email, atau Data Akun');
    }

    // Validasi format email jika ada (untuk backward compatibility)
    if (accountData.email && !this.isValidEmail(accountData.email)) {
      errors.push('Format email tidak valid');
    }

    // Validasi panjang password jika ada (untuk backward compatibility)
    if (accountData.password && accountData.password.length < 3) {
      errors.push('Password terlalu pendek (minimal 3 karakter)');
    }

    const isValid = score >= 60 && errors.length === 0;

    return {
      success: errors.length === 0, // Backward compatibility
      errors, // Backward compatibility
      isValid,
      score: Math.min(score, 100),
      issues
    };
  },

  /**
   * Validasi format email
   * @param {string} email - Email yang akan divalidasi
   * @returns {boolean} True jika email valid
   */
  isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  },

  /**
   * Sanitize data akun untuk keamanan
   * @param {Object} accountData - Data akun yang akan disanitize
   * @returns {Object} Data akun yang sudah disanitize
   */
  sanitizeAccountData(accountData) {
    const sanitized = {};

    // Sanitize string fields
    const stringFields = ['username', 'password', 'email', 'dataAkun', 'catatan', 'deskripsiBukti'];
    
    stringFields.forEach(field => {
      if (accountData[field]) {
        // Trim whitespace dan remove dangerous characters
        sanitized[field] = accountData[field]
          .toString()
          .trim()
          .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '') // Remove script tags
          .replace(/javascript:/gi, '') // Remove javascript: protocol
          .replace(/on\w+\s*=/gi, ''); // Remove event handlers
      }
    });

    return sanitized;
  },

  /**
   * Cek apakah user bisa melihat data akun
   * @param {Object} transaksi - Object transaksi
   * @param {Object} user - Object user yang sedang login
   * @returns {boolean} True jika user bisa melihat data akun
   */
  canViewAccountData(transaksi, user) {
    if (!transaksi || !user) return false;

    // Admin bisa melihat semua
    if (user.role === 'admin') return true;

    // Pembeli bisa melihat jika transaksi sudah dikirim
    if (transaksi.roleUser === 'pembeli' && 
        ['DIKIRIM', 'DIKONFIRMASI_PEMBELI', 'SELESAI'].includes(transaksi.status)) {
      return true;
    }

    // Penjual bisa melihat data yang dia kirim
    if (transaksi.roleUser === 'penjual') {
      return true;
    }

    return false;
  },

  /**
   * Get status message untuk data akun
   * @param {Object} transaksi - Object transaksi
   * @returns {string} Status message
   */
  getAccountDataStatusMessage(transaksi) {
    if (!transaksi) return '';

    switch (transaksi.status) {
      case 'MENUNGGU_PEMBAYARAN':
        return 'Data akun akan tersedia setelah pembayaran dikonfirmasi';
      case 'DIBAYAR_SMARTCONTRACT':
        return 'Menunggu penjual mengirim data akun';
      case 'DIKIRIM':
        return 'Data akun telah dikirim oleh penjual';
      case 'DIKONFIRMASI_PEMBELI':
        return 'Data akun telah dikonfirmasi oleh pembeli';
      case 'SELESAI':
        return 'Transaksi selesai - Data akun tersedia';
      case 'SENGKETA':
        return 'Transaksi dalam sengketa - Data akun ditinjau admin';
      default:
        return '';
    }
  },

  /**
   * Parse account data dari transaksi dengan berbagai sumber
   * @param {Object} transaksi - Object transaksi
   * @returns {Object} Parsed account data dengan metadata
   */
  parseAccountData(transaksi) {
    if (!transaksi) {
      return {
        accountData: {},
        source: 'none',
        hasData: false,
        rawDescription: null
      };
    }

    let accountData = {};
    let source = 'none';
    let rawDescription = null;

    // Prioritas 1: accountData dari server (sudah di-parse)
    if (transaksi.accountData) {
      if (typeof transaksi.accountData === 'object') {
        // Data sudah dalam bentuk object
        accountData = {
          username: transaksi.accountData.username || transaksi.accountData.user || transaksi.accountData.id || '',
          password: transaksi.accountData.password || transaksi.accountData.pass || '',
          email: transaksi.accountData.email || transaksi.accountData.mail || ''
        };
        source = 'server_parsed';
      } else if (typeof transaksi.accountData === 'string') {
        // Data dalam bentuk string, coba parse
        try {
          const parsed = JSON.parse(transaksi.accountData);
          if (typeof parsed === 'object') {
            accountData = {
              username: parsed.username || parsed.user || parsed.id || '',
              password: parsed.password || parsed.pass || '',
              email: parsed.email || parsed.mail || ''
            };
            source = 'json';
          } else {
            throw new Error('Not an object');
          }
        } catch {
          // Jika bukan JSON, extract dari text
          accountData = this.extractFromText(transaksi.accountData);
          source = 'text';
          rawDescription = transaksi.accountData;
        }
      }
    }
    // Prioritas 2: Data terstruktur (usernameAkun, passwordAkun, emailAkun)
    else if (transaksi.usernameAkun || transaksi.passwordAkun || transaksi.emailAkun) {
      accountData = {
        username: transaksi.usernameAkun || '',
        password: transaksi.passwordAkun || '',
        email: transaksi.emailAkun || ''
      };
      source = 'structured';
    }
    // Prioritas 3: dataAkun field
    else if (transaksi.dataAkun) {
      // Coba parse jika JSON
      try {
        const parsed = JSON.parse(transaksi.dataAkun);
        if (typeof parsed === 'object') {
          accountData = {
            username: parsed.username || parsed.user || parsed.id || '',
            password: parsed.password || parsed.pass || '',
            email: parsed.email || parsed.mail || ''
          };
          source = 'json';
        } else {
          throw new Error('Not an object');
        }
      } catch {
        // Jika bukan JSON, coba extract dari text
        accountData = this.extractFromText(transaksi.dataAkun);
        source = 'text';
        rawDescription = transaksi.dataAkun;
      }
    }
    // Prioritas 4: deskripsiBukti
    else if (transaksi.deskripsiBukti) {
      accountData = this.extractFromText(transaksi.deskripsiBukti);
      source = 'description';
      rawDescription = transaksi.deskripsiBukti;
    }
    // Prioritas 5: catatan
    else if (transaksi.catatan) {
      accountData = this.extractFromText(transaksi.catatan);
      source = 'notes';
      rawDescription = transaksi.catatan;
    }

    const hasData = !!(accountData.username || accountData.password || accountData.email);

    return {
      accountData,
      source,
      hasData,
      rawDescription
    };
  },

  /**
   * Extract account data dari text menggunakan pattern matching
   * @param {string} text - Text yang akan di-extract
   * @returns {Object} Extracted account data
   */
  extractFromText(text) {
    if (!text || typeof text !== 'string') return {};

    const accountData = {
      username: '',
      password: '',
      email: ''
    };

    // Pattern untuk username/ID
    const usernamePatterns = [
      /(?:username|user|id|login|akun)[\s:=]+([^\s\n]+)/i,
      /(?:user|id)[\s:=]*([a-zA-Z0-9_.-]+)/i,
      /^([a-zA-Z0-9_.-]+)$/m // Single line yang mungkin username
    ];

    // Pattern untuk password
    const passwordPatterns = [
      /(?:password|pass|pw|kata sandi)[\s:=]+([^\s\n]+)/i,
      /(?:pass|pw)[\s:=]*([^\s\n]+)/i
    ];

    // Pattern untuk email
    const emailPatterns = [
      /(?:email|mail|e-mail)[\s:=]+([^\s\n]+)/i,
      /([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/i
    ];

    // Extract username
    for (const pattern of usernamePatterns) {
      const match = text.match(pattern);
      if (match && match[1] && !match[1].includes('@')) {
        accountData.username = match[1].trim();
        break;
      }
    }

    // Extract password
    for (const pattern of passwordPatterns) {
      const match = text.match(pattern);
      if (match && match[1]) {
        accountData.password = match[1].trim();
        break;
      }
    }

    // Extract email
    for (const pattern of emailPatterns) {
      const match = text.match(pattern);
      if (match && match[1]) {
        accountData.email = match[1].trim();
        break;
      }
    }

    return accountData;
  },

  /**
   * Get label untuk source data
   * @param {string} source - Source type
   * @returns {string} Human readable label
   */
  getSourceLabel(source) {
    const labels = {
      'server_parsed': 'Data Server (Terstruktur)',
      'structured': 'Data Terstruktur',
      'json': 'Format JSON',
      'text': 'Ekstrak dari Teks',
      'description': 'Deskripsi Bukti',
      'notes': 'Catatan',
      'none': 'Tidak Ada Data'
    };

    return labels[source] || 'Tidak Diketahui';
  }
};

export default accountDataHelper;