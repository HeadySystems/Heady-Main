/**
 * Auth Session Server — Type Definitions
 * Heady Liquid Latent OS — Zero-Trust Authentication
 * Author: Eric Haywood / HeadySystems Inc. — 51 Provisional Patents
 * 
 * ALL numeric constants derive from φ (1.618...) or Fibonacci sequence.
 * NEVER use localStorage for tokens — httpOnly cookies ONLY.
 */

// ═══════════════════════════════════════════════════════
// φ Constants — Sacred Geometry Foundation
// ═══════════════════════════════════════════════════════

export const PHI = 1.618033988749895;
export const PSI = 1 / PHI; // ≈ 0.618033988749895
export const CSL_THRESHOLD = 0.618;
export const PHI_SQUARED = PHI * PHI; // ≈ 2.618
export const PHI_CUBED = PHI * PHI * PHI; // ≈ 4.236
export const FIB = [1, 1, 2, 3, 5, 8, 13, 21, 34, 55, 89, 144, 233, 377, 610, 987] as const;

// ═══════════════════════════════════════════════════════
// Auth Types
// ═══════════════════════════════════════════════════════

export type Role = 'admin' | 'developer' | 'operator' | 'viewer';

export interface UserIdentity {
  readonly userId: string;
  readonly email: string;
  readonly displayName: string;
  readonly roles: ReadonlyArray<Role>;
  readonly tenantId: string;
  readonly createdAt: string;
  readonly lastLoginAt: string;
}

export interface SessionPayload {
  readonly sessionId: string;
  readonly userId: string;
  readonly tenantId: string;
  readonly roles: ReadonlyArray<Role>;
  readonly issuedAt: number;
  readonly expiresAt: number;
  readonly refreshTokenHash: string;
  readonly fingerprint: string;
}

export interface JWTClaims {
  readonly sub: string;       // userId
  readonly iss: string;       // 'heady-auth-session-server'
  readonly aud: string;       // target service or domain
  readonly iat: number;
  readonly exp: number;
  readonly roles: ReadonlyArray<Role>;
  readonly tenantId: string;
  readonly sessionId: string;
  readonly jti: string;       // unique token ID for revocation
}

export interface RefreshTokenRecord {
  readonly tokenHash: string;
  readonly userId: string;
  readonly sessionId: string;
  readonly family: string;    // rotation family for reuse detection
  readonly issuedAt: number;
  readonly expiresAt: number;
  readonly isRevoked: boolean;
  readonly replacedBy: string | null;
}

export interface OAuthPKCEChallenge {
  readonly codeChallenge: string;
  readonly codeChallengeMethod: 'S256';
  readonly clientId: string;
  readonly redirectUri: string;
  readonly scope: string;
  readonly state: string;
  readonly createdAt: number;
  readonly expiresAt: number;   // FIB[7] * 1000 = 13000ms
}

export interface RateLimitState {
  readonly key: string;
  readonly windowStart: number;
  readonly requestCount: number;
  readonly windowDurationMs: number;    // FIB[index] * 1000
  readonly maxRequests: number;         // FIB[index+2]
  readonly backoffUntil: number | null; // φ^attempt * base delay
}

export interface Tenant {
  readonly tenantId: string;
  readonly domain: string;
  readonly name: string;
  readonly allowedOrigins: ReadonlyArray<string>;
  readonly maxSessions: number;         // FIB[10] = 55 per user
  readonly sessionTTLMs: number;        // FIB[13] * 60 * 1000 = 233 minutes
  readonly refreshTTLMs: number;        // FIB[15] * 60 * 1000 = 610 minutes
  readonly isActive: boolean;
}

export interface CookieConfig {
  readonly name: string;
  readonly httpOnly: true;              // ALWAYS true — NEVER false
  readonly secure: true;               // ALWAYS true in production
  readonly sameSite: 'strict' | 'lax';
  readonly domain: string;
  readonly path: string;
  readonly maxAge: number;              // seconds, φ-derived
}

export interface AuthHealthStatus {
  readonly status: 'healthy' | 'degraded' | 'unhealthy';
  readonly redisConnected: boolean;
  readonly postgresConnected: boolean;
  readonly activeSessionCount: number;
  readonly uptime: number;
  readonly version: string;
  readonly coherenceScore: number;      // CSL-based health metric [0,1]
}

// ═══════════════════════════════════════════════════════
// Service Configuration
// ═══════════════════════════════════════════════════════

export interface AuthServerConfig {
  readonly port: number;                // 3338
  readonly host: string;
  readonly jwtAlgorithm: 'RS256';
  readonly jwtPublicKeyPath: string;
  readonly jwtPrivateKeyPath: string;
  readonly redisUrl: string;
  readonly postgresUrl: string;
  readonly corsOrigins: ReadonlyArray<string>;
  readonly rateLimitWindowMs: number;   // FIB[8] * 1000 = 21000ms
  readonly rateLimitMaxRequests: number; // FIB[10] = 55
  readonly sessionMaxAge: number;       // FIB[13] * 60 = 13980s ≈ 233min
  readonly refreshMaxAge: number;       // FIB[15] * 60 = 36600s ≈ 610min
  readonly logLevel: string;
}

// ═══════════════════════════════════════════════════════
// Request/Response Types
// ═══════════════════════════════════════════════════════

export interface LoginRequest {
  readonly email: string;
  readonly password: string;
  readonly tenantId?: string;
  readonly fingerprint: string;         // browser fingerprint for session binding
}

export interface LoginResponse {
  readonly userId: string;
  readonly displayName: string;
  readonly roles: ReadonlyArray<Role>;
  readonly expiresAt: number;
  // NOTE: tokens are set via httpOnly cookies, NEVER in response body
}

export interface TokenRefreshRequest {
  readonly fingerprint: string;
  // refresh token comes from httpOnly cookie, NOT request body
}

export interface AuthorizationResult {
  readonly allowed: boolean;
  readonly userId: string;
  readonly roles: ReadonlyArray<Role>;
  readonly tenantId: string;
  readonly reason?: string;
}

export interface OAuthAuthorizeRequest {
  readonly clientId: string;
  readonly redirectUri: string;
  readonly responseType: 'code';
  readonly scope: string;
  readonly state: string;
  readonly codeChallenge: string;
  readonly codeChallengeMethod: 'S256';
}

export interface OAuthTokenRequest {
  readonly grantType: 'authorization_code' | 'refresh_token';
  readonly code?: string;
  readonly codeVerifier?: string;
  readonly clientId: string;
  readonly redirectUri?: string;
}

// ═══════════════════════════════════════════════════════
// Event Types (NATS)
// ═══════════════════════════════════════════════════════

export type AuthEventType =
  | 'auth.login.success'
  | 'auth.login.failure'
  | 'auth.logout'
  | 'auth.token.refresh'
  | 'auth.token.revoke'
  | 'auth.session.expired'
  | 'auth.rate.limited'
  | 'auth.suspicious.activity';

export interface AuthEvent {
  readonly type: AuthEventType;
  readonly userId: string;
  readonly tenantId: string;
  readonly timestamp: string;
  readonly metadata: Record<string, string | number | boolean>;
  readonly sourceIp: string;
  readonly userAgent: string;
}
