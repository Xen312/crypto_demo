# HybridSecure

A live cryptography teaching tool built as a real-time chat app.

Every message you send triggers a full encryption pipeline — and the **Crypto Lab** panel in the UI shows every step of it happening in real time.

---

## What Students Will See

Open the app, send a message, and the right-hand panel immediately shows:

| Step | What it is |
|------|------------|
| 📝 Plaintext | The original message before any encryption |
| 🔑 Public Keys | Both users' X25519 SPKI public keys |
| 🤝 Shared Secret | The ECDH result — never transmitted over the network |
| 🎯 AES Key | The 256-bit key derived from the shared secret via HKDF |
| 🎲 IV / Nonce | 12 random bytes, unique to this message |
| 🔒 Ciphertext | The encrypted output |
| ✅ Auth Tag | The GCM integrity checksum |

And the **Network View** shows side by side: what an eavesdropper on the wire sees (ciphertext) vs. what the recipient actually reads (plaintext).

---

## Get Running in 60 Seconds

```bash
git clone https://github.com/Xen312/Hybrid_Secure.git
cd Hybrid_Secure
npm install
# create your .env (see below)
node server.js
# → open http://localhost:8080
```

---

## Environment Setup

Copy `.env.example` to `.env` and fill in four values:

```env
GOOGLE_CLIENT_ID=...
SERVICE_ACCOUNT_EMAIL=...
SERVICE_ACCOUNT_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n..."
SPREADSHEET_ID=...
```

### Getting each value

**GOOGLE_CLIENT_ID**
1. Go to [console.cloud.google.com](https://console.cloud.google.com) → APIs & Services → Credentials
2. Create an OAuth 2.0 Client ID (Web Application type)
3. Add `http://localhost:8080` to Authorised JavaScript Origins
4. Copy the Client ID

**SERVICE_ACCOUNT_EMAIL + SERVICE_ACCOUNT_PRIVATE_KEY**
1. Still in Google Cloud → IAM & Admin → Service Accounts
2. Create a service account, generate a JSON key
3. The `client_email` field → SERVICE_ACCOUNT_EMAIL
4. The `private_key` field → SERVICE_ACCOUNT_PRIVATE_KEY

**SPREADSHEET_ID**
1. Create a new Google Sheet
2. Share it with your service account email (Editor access)
3. The ID is the long string in the URL: `docs.google.com/spreadsheets/d/THIS_PART/edit`
4. Create these sheet tabs: `USERS`, `MESSAGES`, `USERS_KEYS`, `CHAT_SECRETS`, `PLAINTEXT_MESSAGES_LOG`, `ENCRYPTED_MESSAGES`, `NETWORK_TRAFFIC`

---

## Classroom Walkthrough

Follow this order for the best teaching experience:

### Step 1 — Send a message, then open Google Sheets
After sending your first message, open the spreadsheet. You'll find:
- **USERS** — your Google account info
- **USERS_KEYS** — your X25519 keypair (public + private)
- **PLAINTEXT_MESSAGES_LOG** — the message before encryption

Ask students: *"If the server can see the plaintext here, is this truly end-to-end encrypted?"*

### Step 2 — Look at the Crypto Lab panel
Send a second message and read through the steps on the right. Walk through each one:
- Why is there a shared secret if neither person sent their private key?
- Why do we run HKDF on the shared secret instead of using it directly?
- What's the IV for? What happens if you reuse it?

### Step 3 — Enable Tamper Mode
Click the **🔥 Tamper Mode: OFF** button in the Crypto Lab header. Send a message.

The panel now shows an extra section: it takes the real auth tag, flips one byte, and tries to decrypt with the broken tag. The decryption fails with:
> `Unsupported state or unable to authenticate data`

This is AES-GCM's tamper detection working. Ask students: *"What would happen in a system that used plain AES-CBC instead of GCM?"*

### Step 4 — Compare the Network View
Point to the **📡 What the network sees** section. The left column is what a passive eavesdropper captures. The right column is what the recipient reads. They're completely different.

### Step 5 — Read the code
Direct students to these files in order:
1. `app/services/crypto.service.js` — each function has a "WHY" explanation
2. `app/services/message.service.js` — the pipeline steps as code
3. `app/ws/chat.socket.js` — how the trace gets sent back to the browser

---

## Cryptographic Model

```
Sender                          Server                         Receiver
  │                               │                               │
  │  X25519 keypair               │  X25519 keypair               │
  │  (generated on login)         │  (generated on login)         │
  │                               │                               │
  │                    ECDH(senderPriv, receiverPub)              │
  │                               │= sharedSecret                 │
  │                               │                               │
  │                    HKDF(sharedSecret, chatId)                 │
  │                               │= aesKey                       │
  │                               │                               │
  │  "hello"          AES-256-GCM(aesKey, "hello")                │
  │──────────────────►│= { iv, ciphertext, authTag }              │
  │                   │──────────────────────────────►│           │
  │                   │                               │  decrypt  │
  │                   │                               │= "hello"  │
```

> **Important note for students:** In this implementation, all crypto runs on the server. The server holds every key and can read every message. This is intentional — it's what makes the Sheets audit log possible and the Crypto Lab visible. A true E2EE system (like Signal) does key generation and encryption entirely on the client, so the server only ever sees ciphertext. Migrating to that model is listed under Future Work.

---

## Technologies Used

| Layer | Technology |
|-------|-----------|
| Runtime | Node.js ≥ 18 (ES Modules) |
| Web framework | Express 4 |
| Real-time | WebSockets (ws) |
| Authentication | Google OAuth 2.0 |
| Storage | Google Sheets API |
| Cryptography | Node.js built-in `crypto` module |
| Key exchange | X25519 (Curve25519 ECDH) |
| Key derivation | HKDF-SHA256 |
| Encryption | AES-256-GCM |
| Frontend | Vanilla JS (ES Modules, no bundler) |

---

## Future Work

- Client-side key generation and storage (true E2EE)
- WebSocket message authentication (verify sender identity)
- Message timestamp display in UI
- Key persistence across server restarts
- Unit tests for `crypto.service.js`
