import crypto from 'crypto';

// Simple JWT implementation for user authentication
// In a production environment, consider using a proper JWT library like jsonwebtoken

// Secret key for JWT signing
// In production, this should be stored in environment variables
const JWT_SECRET = process.env.JWT_SECRET || 'your_jwt_secret_key';

// Token expiry time (1 day in seconds)
const TOKEN_EXPIRY = 24 * 60 * 60;

interface TokenPayload {
  userId: number;
  role: string;
  [key: string]: any;
}

/**
 * Generate a JWT token
 * @param payload - Data to include in the token
 * @returns JWT token string
 */
export function generateToken(payload: TokenPayload): string {
  const header = {
    alg: 'HS256',
    typ: 'JWT'
  };
  
  const now = Math.floor(Date.now() / 1000);
  const fullPayload = {
    ...payload,
    iat: now,
    exp: now + TOKEN_EXPIRY
  };
  
  const base64Header = Buffer.from(JSON.stringify(header)).toString('base64').replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
  const base64Payload = Buffer.from(JSON.stringify(fullPayload)).toString('base64').replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
  
  const signature = crypto.createHmac('sha256', JWT_SECRET)
    .update(`${base64Header}.${base64Payload}`)
    .digest('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
  
  return `${base64Header}.${base64Payload}.${signature}`;
}

/**
 * Verify and decode a JWT token
 * @param token - JWT token to verify
 * @returns Decoded payload or null if invalid
 */
export function verifyToken(token: string): TokenPayload | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) {
      return null;
    }
    
    const [base64Header, base64Payload, signature] = parts;
    
    // Verify signature
    const expectedSignature = crypto.createHmac('sha256', JWT_SECRET)
      .update(`${base64Header}.${base64Payload}`)
      .digest('base64')
      .replace(/=/g, '')
      .replace(/\+/g, '-')
      .replace(/\//g, '_');
    
    if (signature !== expectedSignature) {
      return null;
    }
    
    // Decode payload
    const payload = JSON.parse(
      Buffer.from(base64Payload.replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString()
    );
    
    // Check expiration
    const now = Math.floor(Date.now() / 1000);
    if (payload.exp && payload.exp < now) {
      return null;
    }
    
    return payload;
  } catch (error) {
    console.error('Token verification error:', error);
    return null;
  }
}