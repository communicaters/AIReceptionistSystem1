import bcrypt from 'bcrypt';

/**
 * Encrypts a password using bcrypt
 * 
 * @param password - Plain text password to encrypt
 * @returns Promise resolving to hashed password
 */
export async function encrypt(password: string): Promise<string> {
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(password, salt);
}

/**
 * Compares a plain text password against a hashed password
 * 
 * @param password - Plain text password to check
 * @param hashedPassword - Stored hashed password to compare against
 * @returns Promise resolving to boolean indicating if password matches
 */
export async function compare(password: string, hashedPassword: string): Promise<boolean> {
  try {
    // Check if it's a bcrypt hash
    if (hashedPassword.startsWith('$2b$') || hashedPassword.startsWith('$2a$')) {
      return bcrypt.compare(password, hashedPassword);
    }
    
    // Legacy hash format for older passwords (the pbkdf2 format)
    // This allows backward compatibility with existing passwords
    if (hashedPassword.startsWith('pbkdf2$')) {
      const [algorithm, iterations, salt, storedHash] = hashedPassword.split('$');
      
      if (algorithm !== 'pbkdf2' || !iterations || !salt || !storedHash) {
        return false;
      }
      
      const crypto = require('crypto');
      // Hash the provided password with the same salt and iterations
      const hash = crypto.pbkdf2Sync(
        password,
        salt,
        parseInt(iterations, 10),
        64,
        'sha512'
      ).toString('hex');
      
      // Compare the hashes
      return crypto.timingSafeEqual(
        Buffer.from(hash, 'hex'),
        Buffer.from(storedHash, 'hex')
      );
    }
    
    // Unknown hash format
    return false;
  } catch (error) {
    console.error('Password comparison error:', error);
    return false;
  }
}