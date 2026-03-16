// app/db/sheets.db.js
import { google } from "googleapis";
import { ENV } from "../config/env.js";

/* =========================
   AUTH (GOOGLE SHEETS)
========================= */

const auth = new google.auth.JWT(
  ENV.SERVICE_ACCOUNT_EMAIL,
  null,
  ENV.SERVICE_ACCOUNT_PRIVATE_KEY,
  ["https://www.googleapis.com/auth/spreadsheets"]
);

const sheets = google.sheets({
  version: "v4",
  auth
});

/* =========================
   USERS
   Sheet: USERS
   A: google_id
   B: username
   C: picture
   D: email
========================= */

export async function createUser({ google_id, username, picture, email }) {
  await sheets.spreadsheets.values.append({
    spreadsheetId: ENV.SPREADSHEET_ID,
    range: "USERS!A2:E",
    valueInputOption: "RAW",
    requestBody: {
      values: [[google_id, username, picture, email]]
    }
  });
}

export async function getUserByGoogleId(google_id) {
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: ENV.SPREADSHEET_ID,
    range: "USERS!A2:D"
  });

  const rows = res.data.values || [];
  const row = rows.find(r => r[0] === google_id);

  if (!row) return null;

  return {
    google_id: row[0],
    username: row[1],
    picture: row[2],
    email: row[3],
    username_set: row[4] === true || row[4] === "TRUE"
  };
}

export async function listUsers() {
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: ENV.SPREADSHEET_ID,
    range: "USERS!A2:D"
  });

  return (res.data.values || []).map(r => ({
    google_id: r[0],
    username: r[1],
    picture: r[2],
    email: r[3]
  }));
}

export async function updateUsername({ google_id, username }) {
  const rows = await sheets.spreadsheets.values.get({
    spreadsheetId: ENV.SPREADSHEET_ID,
    range: "USERS!A2:E"
  });

  const values = rows.data.values || [];
  const rowIndex = values.findIndex(r => r[0] === google_id);

  if (rowIndex === -1) return;

  await sheets.spreadsheets.values.update({
    spreadsheetId: ENV.SPREADSHEET_ID,
    range: `USERS!B${rowIndex + 2}:E${rowIndex + 2}`,
    valueInputOption: "RAW",
    requestBody: {
      values: [[
        username,
        values[rowIndex][2],
        values[rowIndex][3],
        true
      ]]
    }
  });
}

/* =========================
   MESSAGES
   Sheet: MESSAGES
   A: chat_id
   B: sender_id
   C: username
   D: message
   E: timestamp
========================= */

export async function saveMessage(msg) {
  await sheets.spreadsheets.values.append({
    spreadsheetId: ENV.SPREADSHEET_ID,
    range: "MESSAGES!A2:E",
    valueInputOption: "RAW",
    requestBody: {
      values: [[
        msg.chat_id,
        msg.sender_id,
        msg.username,
        msg.text,
        msg.timestamp
      ]]
    }
  });
}

export async function getMessages(chat_id) {
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: ENV.SPREADSHEET_ID,
    range: "MESSAGES!A2:E"
  });

  return (res.data.values || [])
    .filter(r => r[0] === chat_id)
    .map(r => ({
      chat_id: r[0],
      sender_id: r[1],
      username: r[2],
      text: r[3],
      timestamp: r[4]
    }));
}

/* =========================
   CRYPTO / AUDIT LOGS
   (For judge visibility)
========================= */

export async function logUserKeys({ google_id, username, privateKey, publicKey }) {
  await sheets.spreadsheets.values.append({
    spreadsheetId: ENV.SPREADSHEET_ID,
    range: "USERS_KEYS!A:D",
    valueInputOption: "RAW",
    requestBody: {
      values: [[google_id, username, privateKey, publicKey]]
    }
  });
}

export async function logChatSecret({
  chat_id,
  user_a,
  user_b,
  sharedSecret,
  aesKey
}) {
  await sheets.spreadsheets.values.append({
    spreadsheetId: ENV.SPREADSHEET_ID,
    range: "CHAT_SECRETS!A:E",
    valueInputOption: "RAW",
    requestBody: {
      values: [[chat_id, user_a, user_b, sharedSecret, aesKey]]
    }
  });
}

export async function logPlaintextMessage({
  chat_id,
  sender,
  plaintext,
  timestamp
}) {
  await sheets.spreadsheets.values.append({
    spreadsheetId: ENV.SPREADSHEET_ID,
    range: "PLAINTEXT_MESSAGES_LOG!A2:D",
    valueInputOption: "RAW",
    requestBody: {
      values: [[chat_id, sender, plaintext, timestamp]]
    }
  });
}

export async function logEncryptedMessage({
  chat_id,
  sender,
  iv,
  ciphertext,
  authTag,
  timestamp
}) {
  await sheets.spreadsheets.values.append({
    spreadsheetId: ENV.SPREADSHEET_ID,
    range: "ENCRYPTED_MESSAGES!A:F",
    valueInputOption: "RAW",
    requestBody: {
      values: [[
        chat_id,
        sender,
        String(iv),
        String(ciphertext),
        String(authTag),
        timestamp
      ]]
    }
  });
} 

export async function logNetworkTraffic({ direction, payload }) {
  let safePayload;

  if (Buffer.isBuffer(payload)) {
    safePayload = payload.toString("base64");
  } else if (payload instanceof ArrayBuffer) {
    safePayload = Buffer.from(payload).toString("base64");
  } else if (typeof payload === "object") {
    safePayload = JSON.stringify(payload);
  } else {
    safePayload = String(payload);
  }

  await sheets.spreadsheets.values.append({
    spreadsheetId: ENV.SPREADSHEET_ID,
    range: "NETWORK_TRAFFIC!A:C",
    valueInputOption: "RAW",
    requestBody: {
      values: [[direction, "websocket", safePayload]]
    }
  });
}