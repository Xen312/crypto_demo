// app/ws/chat.socket.js

import { WebSocketServer } from "ws";
import { processMessage } from "../services/message.service.js";

export default function setupChatSocket(server, userKeys) {
  const wss = new WebSocketServer({ server });

  wss.on("connection", (socket) => {
    socket.on("message", async (raw) => {
      let msg;
      try {
        msg = JSON.parse(raw);
      } catch {
        socket.send(JSON.stringify({ type: "error", error: "Invalid JSON" }));
        return;
      }

      if (msg.type === "join") {
        socket.chat_id = msg.chat_id;
        socket.user_id = msg.user_id;
        return;
      }

      let cryptoTrace = null;
      try {
        const result = await processMessage({ msg, userKeys });
        cryptoTrace = result.cryptoTrace;
      } catch (err) {
        console.error("Message processing error:", err);
        cryptoTrace = { error: err.message };
      }

      // Broadcast the message and its crypto trace to everyone in the same room.
      wss.clients.forEach((client) => {
        if (client.readyState === client.OPEN && client.chat_id === socket.chat_id) {
          client.send(JSON.stringify({ type: "message", message: msg, cryptoTrace }));
        }
      });
    });

    socket.on("error", (err) => console.error("WebSocket error:", err.message));
  });
}
