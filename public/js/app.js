// public/js/app.js

import { checkAuth } from "./auth.js";
import { createSocket } from "./socket.js";
import {
  loadUsers,
  openChat,
  handleIncomingMessage,
  setupComposer,
} from "./chat.js";

let ws = null;

/* ── Crypto Lab toggle (desktop / tablet) ── */
const toggleLabBtn  = document.getElementById("toggleLabBtn");
const closeLabBtn   = document.getElementById("closeLabBtn");
const cryptoLab     = document.getElementById("cryptoLab");
const app           = document.getElementById("app");

function showLab() {
  cryptoLab.classList.remove("lab-hidden");
  app.classList.remove("lab-hidden");
  toggleLabBtn?.classList.add("active");
}

function hideLab() {
  cryptoLab.classList.add("lab-hidden");
  app.classList.add("lab-hidden");
  toggleLabBtn?.classList.remove("active");
}

toggleLabBtn?.addEventListener("click", () => {
  cryptoLab.classList.contains("lab-hidden") ? showLab() : hideLab();
});

closeLabBtn?.addEventListener("click", hideLab);

/* ── Mobile nav ── */
const mobileNav  = document.getElementById("mobileNav");
const sidebar    = document.getElementById("sidebar");
const chatPanel  = document.querySelector(".chat-panel");
const navBtns    = document.querySelectorAll(".mobile-nav-btn");

const panels = { sidebar, chat: chatPanel, lab: cryptoLab };

function setMobilePanel(name) {
  Object.values(panels).forEach(p => p?.classList.remove("mobile-active"));
  panels[name]?.classList.add("mobile-active");
  navBtns.forEach(b => {
    b.classList.toggle("active", b.dataset.panel === name ||
      (b.dataset.panel === "chat" && name === "sidebar"));
  });
  // Keep nav chat button active when sidebar showing (initial state)
  if (name === "sidebar") {
    document.querySelector('[data-panel="chat"]')?.classList.add("active");
  }
}

navBtns.forEach(btn => {
  btn.addEventListener("click", () => {
    const target = btn.dataset.panel;
    setMobilePanel(target === "chat" ? "chat" : "lab");
    navBtns.forEach(b => b.classList.remove("active"));
    btn.classList.add("active");
  });
});

/* ── Back button — mobile goes to sidebar ── */
document.querySelector(".back-btn")?.addEventListener("click", () => {
  const isMobile = window.innerWidth < 700;
  if (isMobile) {
    setMobilePanel("sidebar");
    navBtns.forEach(b => b.classList.toggle("active", b.dataset.panel === "chat"));
  }
});

/* ── Init mobile layout ── */
function initMobileLayout() {
  if (window.innerWidth < 700) {
    mobileNav?.classList.remove("hidden");
    setMobilePanel("sidebar");
  } else {
    mobileNav?.classList.add("hidden");
    Object.values(panels).forEach(p => p?.classList.remove("mobile-active"));
  }
}

window.addEventListener("resize", initMobileLayout);

/* ── Bootstrap ── */
document.addEventListener("DOMContentLoaded", () => {
  initMobileLayout();
  checkAuth(async () => {
    ws = createSocket(handleIncomingMessage);
    await loadUsers(user => {
      openChat(user, ws);
      // On mobile, switch to chat panel after selecting a user
      if (window.innerWidth < 700) {
        setMobilePanel("chat");
        navBtns.forEach(b => b.classList.toggle("active", b.dataset.panel === "chat"));
      }
    });
    setupComposer(ws);
  });
});
