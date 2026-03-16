// app/config/env.js
import dotenv from "dotenv";

dotenv.config();

/* =========================
   REQUIRED ENV VARIABLES
========================= */

const REQUIRED_VARS = [
  "GOOGLE_CLIENT_ID",
  "SERVICE_ACCOUNT_EMAIL",
  "SERVICE_ACCOUNT_PRIVATE_KEY",
  "SPREADSHEET_ID"
];

for (const key of REQUIRED_VARS) {
  if (!process.env[key]) {
    throw new Error(`❌ Missing required env variable: ${key}`);
  }
}

/* =========================
   EXPORT CONFIG
========================= */

export const ENV = {
  PORT: process.env.PORT || 8080,

  GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID,

  SERVICE_ACCOUNT_EMAIL: process.env.SERVICE_ACCOUNT_EMAIL,

  // Handle multiline private key (local + Railway)
  SERVICE_ACCOUNT_PRIVATE_KEY: process.env.SERVICE_ACCOUNT_PRIVATE_KEY.includes("\\n")
    ? process.env.SERVICE_ACCOUNT_PRIVATE_KEY.replace(/\\n/g, "\n")
    : process.env.SERVICE_ACCOUNT_PRIVATE_KEY,

  SPREADSHEET_ID: process.env.SPREADSHEET_ID
};