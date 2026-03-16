// app/app.js

import express from "express";
import path from "path";
import fs from "fs";
import cookieParser from "cookie-parser";
import { fileURLToPath } from "url";
import { ENV } from "./config/env.js";

import createAuthRoutes    from "./routes/auth.routes.js";
import createUserRoutes    from "./routes/user.routes.js";
import createMessageRoutes from "./routes/message.routes.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname  = path.dirname(__filename);
const publicDir  = path.join(__dirname, "../public");

export default function createApp({ userKeys }) {
  const app = express();

  // Allow Google's OAuth popup to postMessage back to this window.
  app.use((req, res, next) => {
    res.removeHeader("Cross-Origin-Opener-Policy");
    res.removeHeader("Cross-Origin-Embedder-Policy");
    res.setHeader("Cross-Origin-Opener-Policy", "same-origin-allow-popups");
    next();
  });

  app.use(express.json());
  app.use(cookieParser());

  // Serve index.html dynamically so GOOGLE_CLIENT_ID is injected from env,
  // avoiding a hardcoded value in the HTML source.
  app.get("/", (req, res) => {
    const html     = fs.readFileSync(path.join(publicDir, "index.html"), "utf8");
    const injected = html.replace("__GOOGLE_CLIENT_ID__", ENV.GOOGLE_CLIENT_ID);
    res.setHeader("Content-Type", "text/html");
    res.send(injected);
  });

  app.use(express.static(publicDir, { index: false }));

  app.use("/auth", createAuthRoutes({ userKeys }));
  app.use(createUserRoutes());
  app.use(createMessageRoutes());

  return app;
}
