// app/routes/auth.routes.js
import express from "express";
import { googleClient, REDIRECT_URI } from "../config/google.js";
import { ENV } from "../config/env.js";
import { createUser, getUserByGoogleId, logUserKeys } from "../db/sheets.db.js";
import { generateX25519KeyPair } from "../services/crypto.service.js";

export default function createAuthRoutes({ userKeys }) {
  const router = express.Router();

  /* --------------------------------------------------
     STEP 1 — Redirect the browser to Google's login page.
     
     The user clicks "Sign in with Google" → we send them
     to Google with our Client ID and a callback URL.
     Google authenticates them and then sends them back
     to /auth/google/callback with a one-time code.
     
     This approach works on every browser and every device
     because it's a normal page navigation, not a popup.
  -------------------------------------------------- */
  router.get("/google/redirect", (req, res) => {
    const url = googleClient.generateAuthUrl({
      access_type: "online",
      scope: ["openid", "email", "profile"],
      prompt: "select_account",
    });
    res.redirect(url);
  });

  /* --------------------------------------------------
     STEP 2 — Google redirects back here with a code.
     
     We exchange the code for an ID token, verify it,
     upsert the user in Sheets, generate their X25519
     keypair if needed, set the session cookie, and
     redirect to the app.
  -------------------------------------------------- */
  router.get("/google/callback", async (req, res) => {
    try {
      const { code } = req.query;

      if (!code) {
        return res.redirect("/?error=missing_code");
      }

      // Exchange the one-time code for tokens
      const { tokens } = await googleClient.getToken(code);
      googleClient.setCredentials(tokens);

      // Verify the ID token and extract user info
      const ticket = await googleClient.verifyIdToken({
        idToken:  tokens.id_token,
        audience: ENV.GOOGLE_CLIENT_ID,
      });

      const payload   = ticket.getPayload();
      const google_id = payload.sub;

      // Upsert user in Sheets
      let user = await getUserByGoogleId(google_id);
      if (!user) {
        await createUser({
          google_id,
          username: payload.name,
          picture:  payload.picture,
          email:    payload.email,
        });
        user = await getUserByGoogleId(google_id);
      }

      // Generate X25519 keypair on first login
      if (!userKeys.has(google_id)) {
        const keypair = generateX25519KeyPair();
        userKeys.set(google_id, keypair);
        await logUserKeys({
          google_id,
          username:   user.username,
          privateKey: keypair.privateKey,
          publicKey:  keypair.publicKey,
        });
      }

      // Set session cookie and go to the app
      res.cookie("google_id", google_id, {
        httpOnly: true,
        sameSite: "lax",
        secure:   ENV.APP_URL.startsWith("https"),
      });

      res.redirect("/");

    } catch (err) {
      console.error("Google OAuth callback error:", err);
      res.redirect("/?error=auth_failed");
    }
  });

  /* ---------- LOGOUT ---------- */
  router.get("/logout", (req, res) => {
    res.clearCookie("google_id", { httpOnly: true, sameSite: "lax" });
    res.redirect("/");
  });

  return router;
}
