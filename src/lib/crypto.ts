/**
 * Invitation-code hashing — PBKDF2 over SHA-256 with a random 128-bit salt,
 * 100 000 iterations. Runs entirely in the browser via the Web Crypto
 * Subtle API so the plaintext invitation code never leaves the client.
 *
 * Storage format: `"<saltHex>:<hashHex>"` in a single column. Verification
 * re-hashes the candidate with the stored salt and compares the hash part.
 *
 * Security note: this protects the stored hash from offline guessing if
 * the `invitation_codes` table is leaked; it does NOT protect against
 * online guessing by a user who can call the registration endpoint at
 * will. Pair with rate-limiting at the API edge if high-value codes are
 * a concern.
 */
export class InvitationCodeCrypto {
  private static async getTextEncoder(): Promise<TextEncoder> {
    return new TextEncoder();
  }

  private static async getSubtleCrypto(): Promise<SubtleCrypto> {
    return crypto.subtle;
  }

  /**
   * Hash an invitation code. When `salt` is omitted, a fresh 128-bit salt
   * is generated and returned alongside the hash so the caller can persist
   * both. When `salt` is provided (as hex), the result is deterministic —
   * {@link verifyCode} relies on that to re-derive and compare.
   *
   * @param code  — plaintext invitation code.
   * @param salt  — optional hex-encoded salt (16 bytes, 32 hex chars).
   * @returns     — `{ hash: "<saltHex>:<hashHex>", salt: "<saltHex>" }`.
   */
  static async hashCode(code: string, salt?: string): Promise<{ hash: string; salt: string }> {
    const encoder = await this.getTextEncoder();
    const subtleCrypto = await this.getSubtleCrypto();
    
    let saltBytes: Uint8Array;
    let saltString: string;
    
    if (salt) {
      // Convert hex string back to bytes
      saltString = salt;
      saltBytes = new Uint8Array(salt.match(/.{1,2}/g)!.map(byte => parseInt(byte, 16)));
    } else {
      // Generate new random salt
      saltBytes = crypto.getRandomValues(new Uint8Array(16));
      saltString = Array.from(saltBytes, byte => 
        byte.toString(16).padStart(2, '0')
      ).join('');
    }

    // Convert code to ArrayBuffer
    const codeBuffer = encoder.encode(code);

    // Import the password as a key
    const key = await subtleCrypto.importKey(
      'raw',
      codeBuffer,
      'PBKDF2',
      false,
      ['deriveBits']
    );

    // Derive bits using PBKDF2
    const derivedBits = await subtleCrypto.deriveBits(
      {
        name: 'PBKDF2',
        salt: saltBytes,
        iterations: 100000,
        hash: 'SHA-256'
      },
      key,
      256
    );

    // Convert to hex string
    const hashArray = Array.from(new Uint8Array(derivedBits));
    const hashHex = hashArray.map(byte => 
      byte.toString(16).padStart(2, '0')
    ).join('');

    return {
      hash: `${saltString}:${hashHex}`,
      salt: saltString
    };
  }

  /**
   * Verify an invitation code against a stored `"<salt>:<hash>"` entry.
   * Returns `false` for a wrong code, an empty string, or a malformed
   * stored value — never throws.
   */
  static async verifyCode(code: string, storedHash: string): Promise<boolean> {
    try {
      const [salt, hash] = storedHash.split(':');
      if (!salt || !hash) return false;

      const { hash: newHash } = await this.hashCode(code, salt);
      const [, newHashOnly] = newHash.split(':');
      
      return hash === newHashOnly;
    } catch (error) {
      console.error('Error verifying invitation code:', error);
      return false;
    }
  }
} 