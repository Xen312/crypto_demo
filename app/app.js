// app/app.js

import express from "express";
import path from "path";
import cookieParser from "cookie-parser";
import { fileURLToPath } from "url";

import createAuthRoutes    from "./routes/auth.routes.js";
import createUserRoutes    from "./routes/user.routes.js";
import createMessageRoutes from "./routes/message.routes.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname  = path.dirname(__filename);
const publicDir  = path.join(__dirname, "../public");

export default function createApp({ userKeys }) {
  const app = express();

  app.use(express.json());
  app.use(cookieParser());
  app.use(express.static(publicDir));

  app.use("/auth", createAuthRoutes({ userKeys }));
  app.use(createUserRoutes());
  app.use(createMessageRoutes());

  return app;
}
