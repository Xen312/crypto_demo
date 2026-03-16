/* =======================
   SERVER ENTRY POINT
======================= */

import http from "http";
import { ENV } from "./app/config/env.js";
import createApp from "./app/app.js";
import setupChatSocket from "./app/ws/chat.socket.js";

// Each user's X25519 keypair, keyed by google_id.
// In a true E2EE system these would never exist on the server —
// we keep them here so the crypto pipeline is fully visible for teaching.
const userKeys = new Map();

const app    = createApp({ userKeys });
const server = http.createServer(app);

setupChatSocket(server, userKeys);

server.listen(ENV.PORT, () => {
  console.log(`Server running on http://localhost:${ENV.PORT}`);
});
