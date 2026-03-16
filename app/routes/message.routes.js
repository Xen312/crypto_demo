// app/routes/message.routes.js
import express from "express";
import { getMessages } from "../db/sheets.db.js";

export default function createMessageRoutes() {
  const router = express.Router();

  /* ---------- CHAT HISTORY ---------- */
  router.get("/messages", async (req, res) => {
    const { chat_id } = req.query;

    if (!chat_id) {
      return res.json([]);
    }

    const messages = await getMessages(chat_id);
    res.json(messages);
  });

  return router;
}