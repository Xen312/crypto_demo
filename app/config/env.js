// app/config/env.js
import dotenv from "dotenv";
dotenv.config();

const REQUIRED_VARS = [
  "GOOGLE_CLIENT_ID",
  "GOOGLE_CLIENT_SECRET",
  "APP_URL",
  "SERVICE_ACCOUNT_EMAIL",
  "SERVICE_ACCOUNT_PRIVATE_KEY",
  "SPREADSHEET_ID",
];

for (const key of REQUIRED_VARS) {
  if (!process.env[key]) {
    throw new Error(`Missing required env variable: ${key}`);
  }
}

export const ENV = {
  PORT: process.env.PORT || 8080,

  GOOGLE_CLIENT_ID:     process.env.GOOGLE_CLIENT_ID,
  GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET,

  // Full public URL of this app — used to build the OAuth redirect URI.
  // e.g. https://your-app.onrender.com  (no trailing slash)
  APP_URL: process.env.APP_URL.replace(/\/$/, ""),

  SERVICE_ACCOUNT_EMAIL: process.env.SERVICE_ACCOUNT_EMAIL,

  SERVICE_ACCOUNT_PRIVATE_KEY: process.env.SERVICE_ACCOUNT_PRIVATE_KEY.includes("\\n")
    ? process.env.SERVICE_ACCOUNT_PRIVATE_KEY.replace(/\\n/g, "\n")
    : process.env.SERVICE_ACCOUNT_PRIVATE_KEY,

  SPREADSHEET_ID: process.env.SPREADSHEET_ID,
};
