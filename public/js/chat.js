/* ==================================================
   CHAT + CRYPTO LAB RENDERER
================================================== */

import { currentUser } from "./auth.js";

/* ── DOM ── */
const userListEl   = document.getElementById("userList");
const messagesEl   = document.getElementById("messages");
const messageInput = document.getElementById("messageInput");
const sendBtn      = document.getElementById("sendBtn");
const chatPic      = document.getElementById("chatPic");
const chatName     = document.getElementById("chatName");
const searchInput  = document.getElementById("searchInput");

/* ── Crypto Lab DOM ── */
const labPlaceholder = document.getElementById("labPlaceholder");
const labSteps       = document.getElementById("labSteps");
const labNetwork     = document.getElementById("labNetwork");
const wireData       = document.getElementById("wireData");
const plainData      = document.getElementById("plainData");

let ws       = null;
let allUsers = [];

/* ══════════════════════════════════════════════
   USER LIST
══════════════════════════════════════════════ */

export async function loadUsers(onSelect) {
  const res = await fetch("/users");
  allUsers  = await res.json();
  renderUsers(allUsers, onSelect);

  searchInput?.addEventListener("input", () => {
    const q = searchInput.value.toLowerCase();
    renderUsers(
      allUsers.filter(u => u.username.toLowerCase().includes(q)),
      onSelect
    );
  });
}

function renderUsers(users, onSelect) {
  userListEl.innerHTML = "";
  users.forEach(user => {
    const el = document.createElement("div");
    el.className = "user-item";
    el.innerHTML = `
      <img class="avatar" src="${escHtml(user.picture)}"
           onerror="this.style.visibility='hidden'">
      <span>${escHtml(user.username)}</span>
    `;
    el.addEventListener("click", () => onSelect(user));
    userListEl.appendChild(el);
  });
}

/* ══════════════════════════════════════════════
   OPEN CHAT
══════════════════════════════════════════════ */

function chatId(a, b) {
  return [a, b].sort().join("_");
}

export async function openChat(user, socket) {
  ws = socket;
  chatName.textContent = user.username;
  chatPic.src = user.picture;
  messagesEl.innerHTML = "";

  const id      = chatId(currentUser.google_id, user.google_id);
  const history = await fetch(`/messages?chat_id=${id}`).then(r => r.json());
  history.forEach(m => addBubble(m, m.sender_id === currentUser.google_id));

  ws.send(JSON.stringify({ type: "join", chat_id: id, user_id: currentUser.google_id }));
  ws.chat_id = id;
}

/* ══════════════════════════════════════════════
   INCOMING MESSAGES
══════════════════════════════════════════════ */

export function handleIncomingMessage(data) {
  if (data.type !== "message") return;
  addBubble(data.message, data.message.sender_id === currentUser.google_id);
  if (data.cryptoTrace) renderTrace(data.cryptoTrace);
}

function addBubble(msg, mine) {
  const el = document.createElement("div");
  el.className = mine ? "bubble mine" : "bubble";
  el.innerHTML = `
    <div class="bubble-name">${escHtml(msg.username)}</div>
    <div class="bubble-text">${escHtml(msg.text)}</div>
    <div class="bubble-time">${fmtTime(msg.timestamp)}</div>
  `;
  messagesEl.appendChild(el);
  messagesEl.scrollTop = messagesEl.scrollHeight;
}

/* ══════════════════════════════════════════════
   SEND
══════════════════════════════════════════════ */

function send() {
  if (!ws?.chat_id) return;
  const text = messageInput.value.trim();
  if (!text) return;
  ws.send(JSON.stringify({
    chat_id:   ws.chat_id,
    sender_id: currentUser.google_id,
    username:  currentUser.username,
    picture:   currentUser.picture,
    text,
    timestamp: Date.now(),
  }));
  messageInput.value = "";
}

export function setupComposer(socket) {
  ws = socket;
  sendBtn.addEventListener("click", send);
  messageInput.addEventListener("keydown", e => { if (e.key === "Enter") send(); });
}

/* ══════════════════════════════════════════════
   CRYPTO LAB RENDERER
══════════════════════════════════════════════ */

function renderTrace(trace) {
  labPlaceholder.classList.add("hidden");

  if (trace.error) {
    labSteps.classList.remove("hidden");
    labSteps.innerHTML = `<div class="lab-error">${escHtml(trace.error)}</div>`;
    labNetwork.classList.add("hidden");
    return;
  }

  const steps = [
    { n: 1, name: "Plaintext",           desc: "Original message before encryption",         val: trace.plaintext,                   cls: "step-green"  },
    { n: 2, name: "Sender public key",   desc: "X25519 SPKI — safe to share",                val: trunc(trace.senderPublicKey, 80),  cls: "step-blue"   },
    { n: 3, name: "Receiver public key", desc: "X25519 SPKI — safe to share",                val: trunc(trace.receiverPublicKey, 80),cls: "step-blue"   },
    { n: 4, name: "Shared secret",       desc: "ECDH result — never sent over the network",  val: trace.sharedSecret,                cls: "step-orange" },
    { n: 5, name: "AES-256 key",         desc: "Derived from shared secret via HKDF-SHA256", val: trace.aesKey,                      cls: "step-orange" },
    { n: 6, name: "IV / Nonce",          desc: "12 random bytes, unique per message",         val: trace.iv,                          cls: "step-purple" },
    { n: 7, name: "Ciphertext",          desc: "AES-256-GCM encrypted output",                val: trace.ciphertext,                  cls: "step-red"    },
    { n: 8, name: "Auth tag",            desc: "GCM integrity check",                         val: trace.authTag,                     cls: "step-red"    },
    { n: 9, name: "Decrypted plaintext", desc: "Receiver recovers original message",          val: trace.decryptedText,               cls: "step-green"  },
  ];

  labSteps.classList.remove("hidden");
  labSteps.innerHTML = steps.map(s => `
    <div class="lab-step ${s.cls}">
      <div class="lab-step-header">
        <span class="lab-step-num">${s.n}</span>
        <div class="lab-step-labels">
          <span class="lab-step-name">${s.name}</span>
          <span class="lab-step-desc">${s.desc}</span>
        </div>
      </div>
      <div class="lab-step-value">${escHtml(s.val ?? "")}</div>
    </div>
  `).join("");

  labNetwork.classList.remove("hidden");
  wireData.textContent  = trace.ciphertext ?? "";
  plainData.textContent = trace.plaintext  ?? "";
}

/* ── Utilities ── */

function trunc(s, max) {
  if (!s) return "";
  return s.length > max ? s.slice(0, max) + "…" : s;
}

function escHtml(s) {
  return String(s ?? "")
    .replace(/&/g, "&amp;").replace(/</g, "&lt;")
    .replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function fmtTime(ts) {
  if (!ts) return "";
  const d = new Date(typeof ts === "number" ? ts : ts);
  if (isNaN(d)) return "";
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}
