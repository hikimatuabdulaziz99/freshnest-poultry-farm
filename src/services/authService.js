import { db } from '../database/db.js';
import { cryptoService } from './cryptoService.js';

const SESSION_STORAGE_KEY = 'freshnest_admin_session';
const DEFAULT_SESSION_HOURS = 8;
const REMEMBER_SESSION_HOURS = 48;

/**
 * FreshNest Authentication & Session Service
 * 
 * ARCHITECTURAL NOTICE & SECURITY LIMITATIONS:
 * FreshNest Poultry Farm is an offline-first client application that stores data locally in IndexedDB.
 * Local administrator authentication secures the user interface and protects farm operational records
 * from unauthorized browser users.
 * 
 * Security Controls Enforced:
 * 1. Web Crypto API PBKDF2-HMAC-SHA256 with 100,000 iterations.
 * 2. Cryptographically unique 128-bit random salt per administrator.
 * 3. Constant-time hash verification against timing analysis.
 * 4. Passwords and hashes are NEVER stored in localStorage or sessionStorage.
 * 5. Ephemeral session tokens with automatic cryptographic expiry.
 * 
 * Inherent Limitation:
 * Because this application executes purely in the client browser without a remote server,
 * a local user with advanced technical knowledge and physical access to browser developer tools
 * or raw IndexedDB storage could inspect or manipulate local state. Local authentication provides
 * operational interface protection for farm personnel, not cryptographic DRM.
 */
export const authService = {
  /**
   * Check if any administrator account is registered in IndexedDB
   * @returns {Promise<boolean>}
   */
  async hasAdmin() {
    try {
      if (!db.administrators) return false;
      const count = await db.administrators.count();
      return count > 0;
    } catch (err) {
      console.error('Error checking administrator existence:', err);
      return false;
    }
  },

  /**
   * Get the primary administrator account (metadata only, excluding salt and hash)
   * @returns {Promise<object|null>}
   */
  async getPrimaryAdmin() {
    try {
      if (!db.administrators) return null;
      const admin = await db.administrators.toCollection().first();
      if (!admin) return null;
      return {
        id: admin.id,
        fullName: admin.fullName,
        username: admin.username,
        status: admin.status,
        createdAt: admin.createdAt,
      };
    } catch (err) {
      console.error('Error fetching administrator profile:', err);
      return null;
    }
  },

  /**
   * Register the initial farm administrator during initial setup
   * Enforces strict validation and prevents duplicate registration
   */
  async registerInitialAdmin({ fullName, username, password, confirmPassword }) {
    try {
      // 1. Check if an administrator already exists
      const existingCount = await db.administrators.count();
      if (existingCount > 0) {
        return {
          success: false,
          error: 'An administrator account already exists. Duplicate setup is prohibited.',
        };
      }

      // 2. Validate Full Name
      const cleanName = (fullName || '').trim();
      if (!cleanName || cleanName.length < 2) {
        return { success: false, error: 'Please enter a valid full name (minimum 2 characters).' };
      }

      // 3. Validate Username
      const cleanUsername = (username || '').trim().toLowerCase();
      if (!cleanUsername || cleanUsername.length < 3) {
        return { success: false, error: 'Username must be at least 3 characters long.' };
      }
      if (!/^[a-z0-9_-]+$/.test(cleanUsername)) {
        return { success: false, error: 'Username can only contain letters, numbers, hyphens, and underscores.' };
      }

      // 4. Validate Password & Confirmation
      if (!password) {
        return { success: false, error: 'Password is required.' };
      }
      if (password !== confirmPassword) {
        return { success: false, error: 'Password confirmation does not match.' };
      }

      const strength = cryptoService.evaluatePasswordStrength(password);
      if (!strength.isValid) {
        return {
          success: false,
          error: `Password is not strong enough: ${strength.message}`,
        };
      }

      // 5. Generate unique cryptographic salt and PBKDF2-SHA256 hash
      const salt = cryptoService.generateSalt(16);
      const iterations = 100000;
      const passwordHash = await cryptoService.hashPassword(password, salt, iterations);

      // 6. Save administrator record in IndexedDB
      const nowIso = new Date().toISOString();
      const adminId = await db.administrators.add({
        fullName: cleanName,
        username: cleanUsername,
        passwordHash,
        salt,
        iterations,
        status: 'Active',
        createdAt: nowIso,
        updatedAt: nowIso,
      });

      return {
        success: true,
        message: 'Administrator registered successfully.',
        adminId,
      };
    } catch (err) {
      console.error('Failed to register administrator:', err);
      return {
        success: false,
        error: err.message || 'An error occurred during administrator registration.',
      };
    }
  },

  /**
   * Authenticate administrator credentials against local IndexedDB
   * @param {object} credentials - { username, password, rememberSession }
   */
  async login({ username, password, rememberSession = false }) {
    try {
      const cleanUsername = (username || '').trim().toLowerCase();
      if (!cleanUsername || !password) {
        return { success: false, error: 'Please provide both username and password.' };
      }

      // 1. Query administrator from IndexedDB
      const admin = await db.administrators.where('username').equals(cleanUsername).first();
      if (!admin || admin.status !== 'Active') {
        // Obscure whether username exists for security
        return { success: false, error: 'Invalid username or password.' };
      }

      // 2. Verify password hash using PBKDF2 with stored salt and iterations
      const isValid = await cryptoService.verifyPassword(
        password,
        admin.passwordHash,
        admin.salt,
        admin.iterations || 100000
      );

      if (!isValid) {
        return { success: false, error: 'Invalid username or password.' };
      }

      // 3. Generate secure session token and expiration
      const sessionToken = cryptoService.generateSessionToken();
      const durationHours = rememberSession ? REMEMBER_SESSION_HOURS : DEFAULT_SESSION_HOURS;
      const expiresAt = Date.now() + durationHours * 60 * 60 * 1000;

      const sessionData = {
        token: sessionToken,
        adminId: admin.id,
        username: admin.username,
        fullName: admin.fullName,
        expiresAt,
      };

      // Store in sessionStorage (or localStorage if remember selected)
      // NEVER stores passwords or password hashes!
      const storage = rememberSession ? localStorage : sessionStorage;
      // Clear alternative storage to avoid conflicting tokens
      sessionStorage.removeItem(SESSION_STORAGE_KEY);
      localStorage.removeItem(SESSION_STORAGE_KEY);

      storage.setItem(SESSION_STORAGE_KEY, JSON.stringify(sessionData));

      return {
        success: true,
        admin: {
          id: admin.id,
          username: admin.username,
          fullName: admin.fullName,
          status: admin.status,
          createdAt: admin.createdAt,
        },
      };
    } catch (err) {
      console.error('Login error:', err);
      return { success: false, error: 'Authentication failed due to a local system error.' };
    }
  },

  /**
   * Retrieve and validate active local administrator session
   * Automatically expires old sessions and verifies database integrity
   * @returns {Promise<object|null>} Valid session object or null
   */
  async getActiveSession() {
    try {
      // Check sessionStorage first, then localStorage
      let rawSession = sessionStorage.getItem(SESSION_STORAGE_KEY);
      let isPersistent = false;

      if (!rawSession) {
        rawSession = localStorage.getItem(SESSION_STORAGE_KEY);
        isPersistent = true;
      }

      if (!rawSession) return null;

      const session = JSON.parse(rawSession);
      if (!session || !session.token || !session.adminId || !session.expiresAt) {
        this.logout();
        return null;
      }

      // Check session expiration
      if (Date.now() > session.expiresAt) {
        this.logout();
        return null;
      }

      // Confirm administrator still exists in IndexedDB and is active
      const admin = await db.administrators.get(session.adminId);
      if (!admin || admin.status !== 'Active') {
        this.logout();
        return null;
      }

      return {
        admin: {
          id: admin.id,
          username: admin.username,
          fullName: admin.fullName,
          status: admin.status,
          createdAt: admin.createdAt,
        },
        token: session.token,
        expiresAt: session.expiresAt,
        isPersistent,
      };
    } catch (err) {
      console.error('Session validation error:', err);
      this.logout();
      return null;
    }
  },

  /**
   * Terminate active administrator session
   */
  logout() {
    try {
      sessionStorage.removeItem(SESSION_STORAGE_KEY);
      localStorage.removeItem(SESSION_STORAGE_KEY);
    } catch (err) {
      console.error('Logout cleanup error:', err);
    }
  },

  /**
   * Update administrator profile details (Full name and username)
   */
  async updateProfile(adminId, { fullName, username }) {
    try {
      const admin = await db.administrators.get(Number(adminId));
      if (!admin) {
        return { success: false, error: 'Administrator record not found.' };
      }

      const cleanName = (fullName || '').trim();
      const cleanUsername = (username || '').trim().toLowerCase();

      if (!cleanName || cleanName.length < 2) {
        return { success: false, error: 'Full name must be at least 2 characters long.' };
      }

      if (!cleanUsername || cleanUsername.length < 3) {
        return { success: false, error: 'Username must be at least 3 characters long.' };
      }

      // Check if another admin already uses this username
      const existing = await db.administrators
        .where('username')
        .equals(cleanUsername)
        .first();

      if (existing && existing.id !== admin.id) {
        return { success: false, error: 'Username is already taken by another account.' };
      }

      const nowIso = new Date().toISOString();
      await db.administrators.update(admin.id, {
        fullName: cleanName,
        username: cleanUsername,
        updatedAt: nowIso,
      });

      // Update active session metadata
      const active = await this.getActiveSession();
      if (active && active.admin.id === admin.id) {
        const raw = sessionStorage.getItem(SESSION_STORAGE_KEY) || localStorage.getItem(SESSION_STORAGE_KEY);
        if (raw) {
          const parsed = JSON.parse(raw);
          parsed.fullName = cleanName;
          parsed.username = cleanUsername;
          const storage = sessionStorage.getItem(SESSION_STORAGE_KEY) ? sessionStorage : localStorage;
          storage.setItem(SESSION_STORAGE_KEY, JSON.stringify(parsed));
        }
      }

      return {
        success: true,
        admin: {
          id: admin.id,
          fullName: cleanName,
          username: cleanUsername,
          status: admin.status,
          createdAt: admin.createdAt,
        },
      };
    } catch (err) {
      console.error('Update profile error:', err);
      return { success: false, error: err.message || 'Failed to update administrator profile.' };
    }
  },

  /**
   * Change administrator password
   * Requires current password verification prior to hashing new password
   */
  async changePassword(adminId, { currentPassword, newPassword, confirmNewPassword }) {
    try {
      const admin = await db.administrators.get(Number(adminId));
      if (!admin) {
        return { success: false, error: 'Administrator record not found.' };
      }

      if (!currentPassword) {
        return { success: false, error: 'Current password is required.' };
      }

      // 1. Verify current password
      const isCurrentValid = await cryptoService.verifyPassword(
        currentPassword,
        admin.passwordHash,
        admin.salt,
        admin.iterations || 100000
      );

      if (!isCurrentValid) {
        return { success: false, error: 'Current password is incorrect.' };
      }

      // 2. Validate new password
      if (!newPassword) {
        return { success: false, error: 'New password is required.' };
      }

      if (newPassword !== confirmNewPassword) {
        return { success: false, error: 'New password confirmation does not match.' };
      }

      if (currentPassword === newPassword) {
        return { success: false, error: 'New password cannot be identical to current password.' };
      }

      const strength = cryptoService.evaluatePasswordStrength(newPassword);
      if (!strength.isValid) {
        return { success: false, error: `New password does not meet security rules: ${strength.message}` };
      }

      // 3. Generate fresh cryptographic salt and derive new hash
      const newSalt = cryptoService.generateSalt(16);
      const iterations = 100000;
      const newPasswordHash = await cryptoService.hashPassword(newPassword, newSalt, iterations);

      // 4. Update administrator record in IndexedDB
      await db.administrators.update(admin.id, {
        passwordHash: newPasswordHash,
        salt: newSalt,
        iterations,
        updatedAt: new Date().toISOString(),
      });

      return { success: true, message: 'Password updated successfully.' };
    } catch (err) {
      console.error('Change password error:', err);
      return { success: false, error: err.message || 'Failed to change administrator password.' };
    }
  },
};
