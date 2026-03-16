// app/config/google.js
import { OAuth2Client } from "google-auth-library";
import { ENV } from "./env.js";

// Redirect URI must match exactly what is registered in Google Cloud Console.
export const REDIRECT_URI = `${ENV.APP_URL}/auth/google/callback`;

export const googleClient = new OAuth2Client(
  ENV.GOOGLE_CLIENT_ID,
  ENV.GOOGLE_CLIENT_SECRET,
  REDIRECT_URI
);
