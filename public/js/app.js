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
const toggleLabBtn = document.getElementById("toggleLabBtn");
const closeLabBtn  = document.getElementById("closeLabBtn");
const cryptoLab    = document.getElementById("cryptoLab");
const app          = document.getElementById("app");

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
const mobileNav = document.getElementById("mobileNav");
const sidebar   = document.getElementById("sidebar");
const chatPanel = document.querySelector(".chat-panel");
const navBtns   = document.querySelectorAll(".mobile-nav-btn");

const panels = { sidebar, chat: chatPanel, lab: cryptoLab };

let activeMobilePanel = "sidebar";

function setMobilePanel(name) {
  activeMobilePanel = name;
  Object.values(panels).forEach(p => p?.classList.remove("mobile-active"));
  panels[name]?.classList.add("mobile-active");
  navBtns.forEach(b => {
    b.classList.toggle("active", b.dataset.panel === name);
  });
}

navBtns.forEach(btn => {
  btn.addEventListener("click", () => {
    setMobilePanel(btn.dataset.panel === "lab" ? "lab" : "chat");
  });
});

/* ── Back button — go to sidebar on mobile ── */
document.querySelector(".back-btn")?.addEventListener("click", () => {
  if (window.innerWidth < 700) {
    setMobilePanel("sidebar");
  }
});

/* ── Init mobile layout — only called once on load ── */
function initMobileLayout() {
  if (window.innerWidth < 700) {
    mobileNav?.classList.remove("hidden");
    setMobilePanel("sidebar");
  } else {
    mobileNav?.classList.add("hidden");
    Object.values(panels).forEach(p => p?.classList.remove("mobile-active"));
  }
}

/* ── Bootstrap ── */
document.addEventListener("DOMContentLoaded", () => {
  initMobileLayout();

  // Re-run layout init only when the screen size crosses the mobile breakpoint,
  // NOT on every resize (which fires when the mobile keyboard opens/closes).
  let wasMobile = window.innerWidth < 700;
  window.addEventListener("resize", () => {
    const isMobile = window.innerWidth < 700;
    if (isMobile !== wasMobile) {
      wasMobile = isMobile;
      initMobileLayout();
    }
  });

  checkAuth(async () => {
    ws = createSocket(handleIncomingMessage);
    await loadUsers(user => {
      openChat(user, ws);
      if (window.innerWidth < 700) {
        setMobilePanel("chat");
      }
    });
    setupComposer(ws);
  });
});
