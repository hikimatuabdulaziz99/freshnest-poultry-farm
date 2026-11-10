/**
 * FreshNest Poultry Farm - Cryptographic Security Service
 * Implements PBKDF2-HMAC-SHA256 via native browser Web Crypto API
 * 
 * Strict Security Invariants:
 * - Passwords are never stored in plain-text.
 * - Unique cryptographically random salt for every user.
 * - 100,000 PBKDF2 iterations using SHA-256.
 * - Constant-time hash verification.
 * - No sensitive passwords or hashes logged.
 */

// Utility: Uint8Array to Hex string
function bytesToHex(bytes) {
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

// Utility: Hex string to Uint8Array
function hexToBytes(hex) {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = parseInt(hex.substr(i * 2, 2), 16);
  }
  return bytes;
}

export const cryptoService = {
  /**
   * Generate a cryptographically random salt
   * @param {number} byteLength - Number of random bytes (default: 16 bytes / 128 bits)
   * @returns {string} Hex-encoded salt
   */
  generateSalt(byteLength = 16) {
    const saltBytes = new Uint8Array(byteLength);
    crypto.getRandomValues(saltBytes);
    return bytesToHex(saltBytes);
  },

  /**
   * Derive a 256-bit PBKDF2-SHA256 password hash
   * @param {string} password - The plain-text password
   * @param {string} saltHex - The hex-encoded salt
   * @param {number} iterations - Number of PBKDF2 iterations (default: 100,000)
   * @returns {Promise<string>} Hex-encoded derived password hash
   */
  async hashPassword(password, saltHex, iterations = 100000) {
    if (!password || !saltHex) {
      throw new Error('Password and salt are required for key derivation.');
    }

    const enc = new TextEncoder();
    const passwordBytes = enc.encode(password);
    const saltBytes = hexToBytes(saltHex);

    // 1. Import plain password as PBKDF2 raw key material
    const baseKey = await crypto.subtle.importKey(
      'raw',
      passwordBytes,
      { name: 'PBKDF2' },
      false,
      ['deriveBits']
    );

    // 2. Derive 256 bits using PBKDF2-HMAC-SHA-256
    const derivedBits = await crypto.subtle.deriveBits(
      {
        name: 'PBKDF2',
        salt: saltBytes,
        iterations,
        hash: 'SHA-256',
      },
      baseKey,
      256
    );

    return bytesToHex(new Uint8Array(derivedBits));
  },

  /**
   * Verify password against stored hash using constant-time comparison
   * @param {string} candidatePassword - Password input to verify
   * @param {string} storedHashHex - Stored reference hash
   * @param {string} saltHex - Stored user salt
   * @param {number} iterations - Stored iterations count
   * @returns {Promise<boolean>} True if password matches, false otherwise
   */
  async verifyPassword(candidatePassword, storedHashHex, saltHex, iterations = 100000) {
    try {
      if (!candidatePassword || !storedHashHex || !saltHex) {
        return false;
      }

      const candidateHashHex = await this.hashPassword(candidatePassword, saltHex, iterations);

      // Constant-time string comparison to prevent timing attacks
      if (candidateHashHex.length !== storedHashHex.length) {
        return false;
      }

      let diff = 0;
      for (let i = 0; i < candidateHashHex.length; i++) {
        diff |= candidateHashHex.charCodeAt(i) ^ storedHashHex.charCodeAt(i);
      }

      return diff === 0;
    } catch (err) {
      console.error('Password verification error:', err);
      return false;
    }
  },

  /**
   * Generate cryptographically secure session token
   * @returns {string} 256-bit random hex string
   */
  generateSessionToken() {
    const tokenBytes = new Uint8Array(32);
    crypto.getRandomValues(tokenBytes);
    return bytesToHex(tokenBytes);
  },

  /**
   * Evaluate password strength according to agricultural security standards
   * @param {string} password 
   * @returns {{ score: number, label: string, isValid: boolean, message: string }}
   */
  evaluatePasswordStrength(password) {
    if (!password) {
      return { score: 0, label: 'Empty', isValid: false, message: 'Password is required' };
    }

    let score = 0;
    const checks = {
      length: password.length >= 8,
      hasLetter: /[a-zA-Z]/.test(password),
      hasNumber: /[0-9]/.test(password),
      hasSpecial: /[^a-zA-Z0-9]/.test(password),
      longEnough: password.length >= 12,
    };

    if (checks.length) score++;
    if (checks.hasLetter && checks.hasNumber) score++;
    if (checks.hasSpecial) score++;
    if (checks.longEnough) score++;

    let label = 'Weak';
    if (score === 2) label = 'Fair';
    if (score === 3) label = 'Good';
    if (score >= 4) label = 'Strong';

    const isValid = checks.length && checks.hasLetter && checks.hasNumber;
    let message = '';
    if (!checks.length) message = 'Must be at least 8 characters long.';
    else if (!checks.hasLetter) message = 'Must contain at least one letter.';
    else if (!checks.hasNumber) message = 'Must contain at least one number.';

    return { score, label, isValid, message };
  },
};
