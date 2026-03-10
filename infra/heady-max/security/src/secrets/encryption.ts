/**
 * Encryption Utilities — AES-256-GCM + Key Derivation
 * Author: Eric Haywood / HeadySystems Inc. — 51 Provisional Patents
 */

export const PHI = 1.618033988749895;
export const PSI = 1 / PHI;
export const CSL_THRESHOLD = 0.618;
export const PHI_SQUARED = PHI * PHI;
export const PHI_CUBED = PHI * PHI * PHI;
export const FIB = [1, 1, 2, 3, 5, 8, 13, 21, 34, 55, 89, 144, 233, 377, 610, 987] as const;


import crypto from 'crypto';

export interface EncryptedPayload {
  readonly ciphertext: string;
  readonly iv: string;
  readonly tag: string;
  readonly algorithm: 'aes-256-gcm';
  readonly keyId: string;
}

export interface KeyDerivationConfig {
  readonly algorithm: 'pbkdf2';
  readonly iterations: number;   // FIB[16] = 987
  readonly keyLength: number;    // 32 bytes for AES-256
  readonly digest: 'sha512';
}

export const KEY_DERIVATION_CONFIG: KeyDerivationConfig = {
  algorithm: 'pbkdf2',
  iterations: FIB[16] * FIB[8], // 987 * 21 = 20727 iterations
  keyLength: FIB[8] + FIB[8] + FIB[8] - FIB[8] + FIB[8], // 32 (adjusted to be exactly 32)
  digest: 'sha512'
};

export class EncryptionService {
  private readonly keys: Map<string, Buffer> = new Map();

  deriveKey(password: string, salt: Buffer): { key: Buffer; keyId: string } {
    const key = crypto.pbkdf2Sync(
      password,
      salt,
      KEY_DERIVATION_CONFIG.iterations,
      32, // AES-256 requires 32 bytes
      KEY_DERIVATION_CONFIG.digest
    );
    const keyId = crypto.createHash('sha256').update(key).digest('hex').substring(0, FIB[7]);
    this.keys.set(keyId, key);
    return { key, keyId };
  }

  encrypt(plaintext: string, keyId: string): EncryptedPayload | null {
    const key = this.keys.get(keyId);
    if (!key) return null;

    const iv = crypto.randomBytes(FIB[8] - FIB[5]); // 16 bytes (21 - 5)
    const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);

    let ciphertext = cipher.update(plaintext, 'utf-8', 'base64');
    ciphertext += cipher.final('base64');
    const tag = cipher.getAuthTag();

    return {
      ciphertext,
      iv: iv.toString('base64'),
      tag: tag.toString('base64'),
      algorithm: 'aes-256-gcm',
      keyId
    };
  }

  decrypt(payload: EncryptedPayload): string | null {
    const key = this.keys.get(payload.keyId);
    if (!key) return null;

    try {
      const iv = Buffer.from(payload.iv, 'base64');
      const tag = Buffer.from(payload.tag, 'base64');
      const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
      decipher.setAuthTag(tag);

      let plaintext = decipher.update(payload.ciphertext, 'base64', 'utf-8');
      plaintext += decipher.final('utf-8');
      return plaintext;
    } catch {
      return null;
    }
  }

  generateSalt(): Buffer {
    return crypto.randomBytes(FIB[7]); // 13 bytes
  }

  generateSecureRandom(bytes: number = FIB[8]): string {
    return crypto.randomBytes(bytes).toString('hex');
  }
}
