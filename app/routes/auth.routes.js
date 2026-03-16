// app/routes/auth.routes.js
import express from "express";

import { googleClient } from "../config/google.js";
import { ENV } from "../config/env.js";

import {
  createUser,
  getUserByGoogleId,
  logUserKeys
} from "../db/sheets.db.js";

import { generateX25519KeyPair } from "../services/crypto.service.js";

/*
  NOTE:
  userKeys remains in-memory for now.
  We inject it from server/app level.
*/

export default function createAuthRoutes({ userKeys }) {
  const router = express.Router();

  /* ---------- GOOGLE LOGIN ---------- */
  router.post("/google", async (req, res) => {
    try {
      const { credential } = req.body;

      if(!credential) {
        return res.status(400).json({ error: "Missing Credential" });
      }

      const ticket = await googleClient.verifyIdToken({
        idToken: credential,
        audience: ENV.GOOGLE_CLIENT_ID
      });

      const payload = ticket.getPayload();
      const google_id = payload.sub;

      let user = await getUserByGoogleId(google_id);

      // Create user if first login
      if (!user) {
        await createUser({
          google_id,
          username: payload.name,
          picture: payload.picture,
          email: payload.email
        });

        user = await getUserByGoogleId(google_id);
      }

      // Generate X25519 keys once per user
      if (!userKeys.has(google_id)) {
        const keypair = generateX25519KeyPair();
        userKeys.set(google_id, keypair);

        await logUserKeys({
          google_id,
          username: user.username,
          privateKey: keypair.privateKey,
          publicKey: keypair.publicKey
        });
      }

      // Session cookie
      res.cookie("google_id", google_id, {
        httpOnly: true,
        sameSite: "none",
        secure: true
      });

      res.json({ success: true, user });

    } catch (err) {
      console.error("Google auth failed:", err);
      res.status(401).json({ error: "Google auth failed" });
    }
  });

  /* ---------- LOGOUT ---------- */
  router.get("/logout", (req, res) => {
    res.clearCookie("google_id", {
      httpOnly: true,
      sameSite: "lax"
    });

    res.redirect("/");
  });

  return router;
}
