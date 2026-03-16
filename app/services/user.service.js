// app/services/user.service.js

import {
  getUserByGoogleId,
  listUsers,
  logUserKeys
} from "../db/sheets.db.js";

import { generateX25519KeyPair } from "./crypto.service.js";

/* ==================================================
   USER SERVICE
================================================== */

/**
 * Get the currently authenticated user.
 *
 * @param {string|null} google_id
 * @returns {Object|null}
 */
export async function getCurrentUser(google_id) {
  if (!google_id) return null;
  return await getUserByGoogleId(google_id);
}

/**
 * Get all users except the current user.
 *
 * @param {string} google_id
 * @returns {Array}
 */
export async function getOtherUsers(google_id) {
  if (!google_id) return [];

  const users = await listUsers();
  return users.filter(u => u.google_id !== google_id);
}

/**
 * Ensure that a user has an X25519 keypair.
 *
 * NOTE:
 * - userKeys is injected to avoid globals
 * - Keys are generated server-side (temporary)
 */
export async function ensureUserKeypair({
  google_id,
  username,
  userKeys
}) {
  if (userKeys.has(google_id)) {
    return userKeys.get(google_id);
  }

  const keypair = generateX25519KeyPair();
  userKeys.set(google_id, keypair);

  await logUserKeys({
    google_id,
    username,
    privateKey: keypair.privateKey,
    publicKey: keypair.publicKey
  });

  return keypair;
}
