import crypto from 'crypto';

export interface AuthSession {
  username: string;
  expiresAt: number;
}

export class SecurityManager {
  private secretKey: string;
  private passwordHash: string;
  private sessionDurationMs: number;
  private sensitiveHeadersSet: Set<string>;
  private sensitiveParamsSet: Set<string>;

  constructor(options?: {
    password?: string;
    secretKey?: string;
    sessionDurationSeconds?: number;
    sensitiveHeaders?: string[];
    sensitiveParams?: string[];
  }) {
    this.secretKey = options?.secretKey || crypto.randomBytes(32).toString('hex');
    this.sessionDurationMs = (options?.sessionDurationSeconds || 86400) * 1000;
    
    const plainPassword = options?.password || 'plutos2026';
    this.passwordHash = this.hashPassword(plainPassword);

    this.sensitiveHeadersSet = new Set([
      'authorization',
      'cookie',
      'set-cookie',
      'x-auth-token',
      'x-api-key',
      'api-key',
      ...(options?.sensitiveHeaders || []).map((h) => h.toLowerCase()),
    ]);

    this.sensitiveParamsSet = new Set([
      'password',
      'pass',
      'secret',
      'token',
      'accessToken',
      'refreshToken',
      'creditCard',
      'cardNumber',
      'cvv',
      ...(options?.sensitiveParams || []).map((p) => p.toLowerCase()),
    ]);
  }

  public hashPassword(password: string): string {
    const salt = crypto.randomBytes(16).toString('hex');
    const hash = crypto.pbkdf2Sync(password, salt, 100000, 64, 'sha512').toString('hex');
    return `${salt}:${hash}`;
  }

  public verifyPassword(password: string): boolean {
    const parts = this.passwordHash.split(':');
    if (parts.length !== 2) return false;
    const [salt, storedHash] = parts;
    const hash = crypto.pbkdf2Sync(password, salt, 100000, 64, 'sha512').toString('hex');
    return crypto.timingSafeEqual(Buffer.from(storedHash, 'hex'), Buffer.from(hash, 'hex'));
  }

  public createSessionToken(username: string): string {
    const expiresAt = Date.now() + this.sessionDurationMs;
    const payload = `${username}:${expiresAt}`;
    const signature = crypto.createHmac('sha256', this.secretKey).update(payload).digest('hex');
    return Buffer.from(`${payload}:${signature}`).toString('base64url');
  }

  public verifySessionToken(token: string): AuthSession | null {
    try {
      const decoded = Buffer.from(token, 'base64url').toString('utf-8');
      const parts = decoded.split(':');
      if (parts.length !== 3) return null;
      const [username, expiresAtStr, signature] = parts;
      const expiresAt = parseInt(expiresAtStr, 10);
      if (isNaN(expiresAt) || expiresAt < Date.now()) return null;

      const payload = `${username}:${expiresAtStr}`;
      const expectedSignature = crypto.createHmac('sha256', this.secretKey).update(payload).digest('hex');
      
      if (!crypto.timingSafeEqual(Buffer.from(signature, 'hex'), Buffer.from(expectedSignature, 'hex'))) {
        return null;
      }

      return { username, expiresAt };
    } catch {
      return null;
    }
  }

  public redactHeaders(headers: Record<string, any>): Record<string, string> {
    const redacted: Record<string, string> = {};
    for (const [key, value] of Object.entries(headers)) {
      const lowerKey = key.toLowerCase();
      if (this.sensitiveHeadersSet.has(lowerKey)) {
        redacted[key] = '[REDACTED]';
      } else {
        redacted[key] = typeof value === 'string' ? value : JSON.stringify(value);
      }
    }
    return redacted;
  }

  public redactQueryParams(params: Record<string, any>): Record<string, any> {
    if (!params || typeof params !== 'object') return {};
    const redacted: Record<string, any> = {};
    for (const [key, value] of Object.entries(params)) {
      const lowerKey = key.toLowerCase();
      if (this.sensitiveParamsSet.has(lowerKey)) {
        redacted[key] = '[REDACTED]';
      } else if (typeof value === 'object' && value !== null) {
        redacted[key] = this.redactQueryParams(value);
      } else {
        redacted[key] = value;
      }
    }
    return redacted;
  }

  public getSecurityHeaders(): Record<string, string> {
    return {
      'X-Content-Type-Options': 'nosniff',
      'X-Frame-Options': 'DENY',
      'X-XSS-Protection': '1; mode=block',
      'Referrer-Policy': 'strict-origin-when-cross-origin',
      'Content-Security-Policy': "default-src 'self' 'unsafe-inline' 'unsafe-eval' data: blob:;",
    };
  }
}
