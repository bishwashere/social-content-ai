/**
 * Token Encryption/Decryption
 * 
 * Setup:
 *  # Add to .env.local:
 *    ENCRYPTION_KEY=your-32-character-secret-key-here-12345
 *    (Must be exactly 32 characters for AES-256)
 * 
 *  # Generate a random key:
 *    node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
 */

import crypto from 'crypto';

// Algorithm configuration
const ALGORITHM = 'aes-256-cbc';
const IV_LENGTH = 16; // For AES, this is always 16

/**
 * Get encryption key from environment variable
 * Must be 32 bytes (64 hex characters) for AES-256
 */
function getEncryptionKey(): Buffer {
    const key = process.env.ENCRYPTION_KEY;

    if (!key) {
        throw new Error(
            'ENCRYPTION_KEY environment variable is not set. ' +
            'Generate one with: node -e "console.log(require(\'crypto\').randomBytes(32).toString(\'hex\'))"'
        );
    }

    // Convert hex string to buffer (32 bytes)
    if (key.length !== 64) {
        throw new Error(
            'ENCRYPTION_KEY must be 64 hex characters (32 bytes). ' +
            `Current length: ${key.length}. ` +
            'Generate a new one with: node -e "console.log(require(\'crypto\').randomBytes(32).toString(\'hex\'))"'
        );
    }

    return Buffer.from(key, 'hex');
}

/**
 * Encrypt a token
 * 
 * @param token - Plain text token to encrypt
 * @returns Encrypted token in format: iv:encryptedData (both hex encoded)
 * 
 * @example
 * const encrypted = encryptToken("my-access-token-123");
 * // Returns: "a1b2c3d4e5f6....:1a2b3c4d5e6f...."
 */
export function encryptToken(token: string): string {
    if (!token) {
        return '';
    }

    try {
        const key = getEncryptionKey();

        // Generate random IV (Initialization Vector)
        const iv = crypto.randomBytes(IV_LENGTH);

        // Create cipher
        const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

        // Encrypt the token
        let encrypted = cipher.update(token, 'utf8', 'hex');
        encrypted += cipher.final('hex');

        // Return IV and encrypted data (both hex encoded, separated by :)
        return `${iv.toString('hex')}:${encrypted}`;
    } catch (error) {
        console.error('Error encrypting token:', error);
        throw new Error(`Failed to encrypt token: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
}

/**
 * Decrypt a token
 * 
 * @param encryptedToken - Encrypted token in format: iv:encryptedData
 * @returns Decrypted plain text token
 * 
 * @example
 * const decrypted = decryptToken("a1b2c3d4e5f6....:1a2b3c4d5e6f....");
 * // Returns: "my-access-token-123"
 */
export function decryptToken(encryptedToken: string): string {
    if (!encryptedToken) {
        return '';
    }

    try {
        const key = getEncryptionKey();

        // Split IV and encrypted data
        const parts = encryptedToken.split(':');
        if (parts.length !== 2) {
            throw new Error('Invalid encrypted token format. Expected format: iv:encryptedData');
        }

        const iv = Buffer.from(parts[0], 'hex');
        const encryptedData = parts[1];

        // Create decipher
        const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);

        // Decrypt the token
        let decrypted = decipher.update(encryptedData, 'hex', 'utf8');
        decrypted += decipher.final('utf8');

        return decrypted;
    } catch (error) {
        console.error('Error decrypting token:', error);
        throw new Error(`Failed to decrypt token: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
}

/**
 * Encrypt multiple tokens in an object
 * 
 * @param data - Object containing tokens to encrypt
 * @param fieldsToEncrypt - Array of field names to encrypt
 * @returns Object with specified fields encrypted
 * 
 * @example
 * const data = {
 *   accessToken: "token123",
 *   refreshToken: "refresh456",
 *   userId: "user789" // Won't be encrypted
 * };
 * const encrypted = encryptTokenFields(data, ["accessToken", "refreshToken"]);
 */
export function encryptTokenFields<T extends Record<string, any>>(
    data: T,
    fieldsToEncrypt: (keyof T)[]
): T {
    const result = { ...data };

    for (const field of fieldsToEncrypt) {
        if (result[field] && typeof result[field] === 'string') {
            result[field] = encryptToken(result[field] as string) as any;
        }
    }

    return result;
}

/**
 * Decrypt multiple tokens in an object
 * 
 * @param data - Object containing encrypted tokens
 * @param fieldsToDecrypt - Array of field names to decrypt
 * @returns Object with specified fields decrypted
 * 
 * @example
 * const encrypted = {
 *   accessToken: "a1b2c3...:1a2b3c...",
 *   refreshToken: "d4e5f6...:4d5e6f...",
 *   userId: "user789"
 * };
 * const decrypted = decryptTokenFields(encrypted, ["accessToken", "refreshToken"]);
 */
export function decryptTokenFields<T extends Record<string, any>>(
    data: T,
    fieldsToDecrypt: (keyof T)[]
): T {
    const result = { ...data };

    for (const field of fieldsToDecrypt) {
        if (result[field] && typeof result[field] === 'string') {
            try {
                result[field] = decryptToken(result[field] as string) as any;
            } catch (error) {
                // If decryption fails, might be unencrypted (backward compatibility)
                console.warn(`Failed to decrypt field ${String(field)}, keeping original value`);
            }
        }
    }

    return result;
}