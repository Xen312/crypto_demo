// app/services/crypto.service.js

import crypto from "crypto";

/* ==================================================
   WHY THIS FILE EXISTS
   
   This file implements a hybrid encryption scheme — the same
   approach used by TLS, Signal, and WhatsApp:
   
     1. Asymmetric key exchange (X25519) to agree on a shared
        secret without ever sending it over the network.
     2. Key derivation (HKDF) to turn that secret into a
        proper AES key.
     3. Symmetric encryption (AES-256-GCM) to encrypt messages
        quickly with built-in tamper detection.
   
   Each step is a separate function so every piece of the
   pipeline can be inspected independently.
================================================== */


/* ==================================================
   PART 1 — X25519 KEY EXCHANGE
   
   WHY X25519 and not RSA?
   ─────────────────────────
   RSA keys need 2048-4096 bits to be secure.
   X25519 keys are 256 bits and are stronger.
   X25519 also runs in constant time — it takes the same
   number of CPU cycles regardless of the key value.
   RSA does not. Timing differences can leak information
   about the private key (a side-channel attack).
   X25519 is immune to this and is used by Signal,
   WhatsApp, and TLS 1.3.
   
   HOW DIFFIE-HELLMAN WORKS:
   ─────────────────────────
   Alice has (privateA, publicA). Bob has (privateB, publicB).
   Alice computes: ECDH(privateA, publicB) → sharedSecret
   Bob   computes: ECDH(privateB, publicA) → same sharedSecret
   
   An eavesdropper sees both public keys but cannot compute
   the shared secret without one of the private keys.
================================================== */

/**
 * Generate an X25519 key pair.
 * Public key  → SPKI DER format, base64-encoded  (safe to share)
 * Private key → PKCS8 DER format, base64-encoded (never share)
 *
 * @returns {{ publicKey: string, privateKey: string }}
 */
export function generateX25519KeyPair() {
  const { publicKey, privateKey } = crypto.generateKeyPairSync("x25519");
  return {
    publicKey:  publicKey.export({ type: "spki",  format: "der" }).toString("base64"),
    privateKey: privateKey.export({ type: "pkcs8", format: "der" }).toString("base64"),
  };
}

/**
 * Compute the X25519 Diffie-Hellman shared secret.
 *
 * Both Alice and Bob call this with their own private key and
 * the other person's public key — they get the same output.
 *
 * @param {string} privateKeyB64 - base64 PKCS8
 * @param {string} publicKeyB64  - base64 SPKI
 * @returns {Buffer} 32-byte shared secret
 */
export function computeSharedSecret(privateKeyB64, publicKeyB64) {
  const privateKey = crypto.createPrivateKey({
    key: Buffer.from(privateKeyB64, "base64"), format: "der", type: "pkcs8",
  });
  const publicKey = crypto.createPublicKey({
    key: Buffer.from(publicKeyB64, "base64"),  format: "der", type: "spki",
  });
  return crypto.diffieHellman({ privateKey, publicKey });
}


/* ==================================================
   PART 2 — KEY DERIVATION (HKDF)
   
   WHY NOT use the shared secret directly as an AES key?
   ──────────────────────────────────────────────────────
   The raw X25519 output is 32 bytes — the right size for
   AES-256 — but it is not uniformly distributed. Certain
   bit patterns appear more often due to the elliptic curve
   arithmetic. A good AES key must look like pure random noise.
   
   HKDF extracts randomness from the shared secret and expands
   it into a key that is indistinguishable from random bytes.
   
   Using chat_id as the HKDF salt means Alice and Bob get a
   unique AES key per conversation even if they reuse the same
   X25519 keypair across multiple chats.
================================================== */

/**
 * Derive a 256-bit AES key from an ECDH shared secret using HKDF-SHA256.
 *
 * @param {Buffer} sharedSecret
 * @param {string} chatId - used as salt (unique per conversation)
 * @returns {Buffer} 32-byte AES-256 key
 */
export function deriveAESKeyHKDF(sharedSecret, chatId) {
  return crypto.hkdfSync(
    "sha256",
    sharedSecret,
    Buffer.from(chatId),                     // salt — unique per conversation
    Buffer.from("HybridSecure AES-GCM Key"), // context label
    32
  );
}


/* ==================================================
   PART 3 — SYMMETRIC ENCRYPTION (AES-256-GCM)
   
   WHY AES-GCM and not plain AES?
   ──────────────────────────────
   GCM (Galois/Counter Mode) adds authentication on top of
   encryption. After encrypting, it produces a 16-byte auth
   tag — a cryptographic checksum over the ciphertext.
   
   On decryption, GCM recomputes the tag and checks it matches.
   If anyone flipped even one bit of the ciphertext in transit,
   the tags won't match and decryption throws an error.
   This is called Authenticated Encryption (AEAD).
   
   Without authentication (e.g. plain AES-CBC), an attacker
   can silently corrupt ciphertext and the recipient decrypts
   garbage without knowing anything went wrong.
   
   WHY a 12-byte IV?
   ─────────────────
   GCM is optimised for 96-bit (12-byte) nonces. Using a
   different size requires an extra internal step, making it
   slower and subtly less safe. Always use 12 bytes with GCM.
   
   The IV must be different for every message under the same key.
   Reusing an IV with the same key in GCM allows an attacker to
   recover the key — this is called a nonce reuse attack.
================================================== */

/**
 * Encrypt plaintext using AES-256-GCM.
 *
 * @param {Buffer} key       - 32-byte AES key from deriveAESKeyHKDF()
 * @param {string} plaintext
 * @returns {{ iv: string, ciphertext: string, authTag: string }} all base64
 */
export function encryptAESGCM(key, plaintext) {
  const iv     = crypto.randomBytes(12); // fresh random nonce, never reused
  const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);

  const ciphertext = Buffer.concat([
    cipher.update(plaintext, "utf8"),
    cipher.final(),
  ]);

  return {
    iv:         iv.toString("base64"),
    ciphertext: ciphertext.toString("base64"),
    authTag:    cipher.getAuthTag().toString("base64"),
  };
}

/**
 * Decrypt AES-256-GCM ciphertext.
 * Throws if the auth tag does not match (tampered or wrong key).
 *
 * @param {Buffer} key
 * @param {string} ivB64
 * @param {string} ciphertextB64
 * @param {string} authTagB64
 * @returns {string} plaintext
 */
export function decryptAESGCM(key, ivB64, ciphertextB64, authTagB64) {
  const decipher = crypto.createDecipheriv(
    "aes-256-gcm",
    key,
    Buffer.from(ivB64, "base64")
  );
  decipher.setAuthTag(Buffer.from(authTagB64, "base64"));
  return (
    decipher.update(ciphertextB64, "base64", "utf8") +
    decipher.final("utf8")
  );
}
