import crypto from 'crypto';

/**
 * Encrypts a password using bcrypt-like algorithm (simple implementation)
 * In production, use a proper library like bcrypt
 * 
 * @param password - Plain text password to encrypt
 * @returns Promise resolving to hashed password
 */
export async function encrypt(password: string): Promise<string> {
  // Generate a random salt
  const salt = crypto.randomBytes(16).toString('hex');
  
  // Use PBKDF2 for key derivation (simulating bcrypt's work factor)
  const hash = crypto.pbkdf2Sync(
    password,
    salt,
    10000, // iterations (work factor)
    64,    // key length
    'sha512'
  ).toString('hex');
  
  // Format: algorithm$iterations$salt$hash
  return `pbkdf2$10000$${salt}$${hash}`;
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
    // Parse the stored hash
    const [algorithm, iterations, salt, storedHash] = hashedPassword.split('$');
    
    if (algorithm !== 'pbkdf2' || !iterations || !salt || !storedHash) {
      return false;
    }
    
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
  } catch (error) {
    console.error('Password comparison error:', error);
    return false;
  }
}