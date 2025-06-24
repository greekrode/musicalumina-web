// Crypto utilities for invitation codes
// Using Web Crypto API for secure hashing

export class InvitationCodeCrypto {
  private static async getTextEncoder(): Promise<TextEncoder> {
    return new TextEncoder();
  }

  private static async getSubtleCrypto(): Promise<SubtleCrypto> {
    return crypto.subtle;
  }

  /**
   * Hash an invitation code using PBKDF2
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
   * Verify an invitation code against its hash
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