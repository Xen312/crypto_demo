// app/routes/user.routes.js
import express from "express";
import {
  getUserByGoogleId,
  listUsers
} from "../db/sheets.db.js";

export default function createUserRoutes() {
  const router = express.Router();

  /* ---------- CURRENT USER ---------- */
  router.get("/me", async (req, res) => {
    const google_id = req.cookies.google_id;

    if (!google_id) {
      return res.json(null);
    }

    const user = await getUserByGoogleId(google_id);
    res.json(user);
  });

  /* ---------- ALL USERS (EXCEPT ME) ---------- */
  router.get("/users", async (req, res) => {
    const google_id = req.cookies.google_id;

    if (!google_id) {
      return res.status(401).json([]);
    }

    const users = await listUsers();
    res.json(users.filter(u => u.google_id !== google_id));
  });

  return router;
}
