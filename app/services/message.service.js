// app/services/message.service.js

import {
  saveMessage,
  getUserByGoogleId,
  logUserKeys,
  logChatSecret,
  logEncryptedMessage,
  logPlaintextMessage,
  logNetworkTraffic,
} from "../db/sheets.db.js";

import {
  generateX25519KeyPair,
  computeSharedSecret,
  deriveAESKeyHKDF,
  encryptAESGCM,
} from "./crypto.service.js";

/* ==================================================
   MESSAGE PROCESSING PIPELINE
   
   1.  Log plaintext          → PLAINTEXT_MESSAGES_LOG
   2.  Ensure both keypairs exist
   3.  Compute ECDH shared secret (X25519)
   4.  Derive AES key via HKDF-SHA256
   5.  Log chat secret once   → CHAT_SECRETS
   6.  Encrypt with AES-256-GCM
   7.  Log encrypted message  → ENCRYPTED_MESSAGES
   8.  Log network traffic    → NETWORK_TRAFFIC
   9.  Save plaintext message → MESSAGES
   10. Return crypto trace    → sent back to the browser (Crypto Lab)
================================================== */

export async function processMessage({ msg, userKeys }) {
  const { chat_id, sender_id, text, timestamp } = msg;
  const readableTimestamp = new Date(timestamp).toISOString();

  /* ── 1. Log plaintext ── */
  await logPlaintextMessage({
    chat_id,
    sender: sender_id,
    plaintext: text,
    timestamp: readableTimestamp,
  });

  /* ── 2. Resolve IDs and ensure keypairs ──
     chat_id format: "<lower_id>_<higher_id>" (always sorted) */
  const [a, b]      = chat_id.split("_");
  const receiver_id = sender_id === a ? b : a;

  async function ensureKey(user_id) {
    if (userKeys.has(user_id)) return;
    const user = await getUserByGoogleId(user_id);
    if (!user) return;
    const keypair = generateX25519KeyPair();
    userKeys.set(user_id, keypair);
    await logUserKeys({
      google_id:  user_id,
      username:   user.username,
      privateKey: keypair.privateKey,
      publicKey:  keypair.publicKey,
    });
  }

  await ensureKey(sender_id);
  await ensureKey(receiver_id);

  const senderKey   = userKeys.get(sender_id);
  const receiverKey = userKeys.get(receiver_id);

  if (!senderKey || !receiverKey) {
    await saveMessage({ ...msg, timestamp: readableTimestamp });
    return {
      cryptoTrace: {
        error: "One or both users have no keypair yet. The other user may need to log in first.",
        plaintext: text,
      },
    };
  }

  /* ── 3. Compute ECDH shared secret ── */
  const sharedSecret = computeSharedSecret(senderKey.privateKey, receiverKey.publicKey);

  /* ── 4. Derive AES-256 key via HKDF ── */
  const aesKey = deriveAESKeyHKDF(sharedSecret, chat_id);

  /* ── 5. Log chat secret (once per chat_id) ── */
  if (!global.chatSecretsLogged) global.chatSecretsLogged = new Set();
  if (!global.chatSecretsLogged.has(chat_id)) {
    await logChatSecret({
      chat_id,
      user_a: a,
      user_b: b,
      sharedSecret: sharedSecret.toString("base64"),
      aesKey:       Buffer.from(aesKey).toString("base64"),
    });
    global.chatSecretsLogged.add(chat_id);
  }

  /* ── 6. Encrypt ── */
  const encrypted = encryptAESGCM(aesKey, text);

  /* ── 7 & 8. Log encrypted message and network traffic ── */
  await logEncryptedMessage({
    chat_id,
    sender:     sender_id,
    iv:         encrypted.iv,
    ciphertext: encrypted.ciphertext,
    authTag:    encrypted.authTag,
    timestamp:  readableTimestamp,
  });

  await logNetworkTraffic({ direction: "outbound", payload: encrypted.ciphertext });

  /* ── 9. Persist plaintext for chat history ── */
  await saveMessage({ ...msg, timestamp: readableTimestamp });

  /* ── 10. Return full crypto trace for the Crypto Lab panel ── */
  return {
    cryptoTrace: {
      plaintext:         text,
      senderPublicKey:   senderKey.publicKey,
      receiverPublicKey: receiverKey.publicKey,
      sharedSecret:      sharedSecret.toString("hex"),
      aesKey:            Buffer.from(aesKey).toString("hex"),
      iv:                encrypted.iv,
      ciphertext:        encrypted.ciphertext,
      authTag:           encrypted.authTag,
    },
  };
}
