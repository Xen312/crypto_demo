// app/config/google.js
import { OAuth2Client } from "google-auth-library";
import { ENV } from "./env.js";

export const googleClient = new OAuth2Client(ENV.GOOGLE_CLIENT_ID);