/* ==================================================
   AUTH & SESSION
================================================== */

export let currentUser = null;

const loginScreen = document.getElementById("login-screen");
const appEl       = document.getElementById("app");
const logoutBtn   = document.getElementById("logoutBtn");
const myPic       = document.getElementById("myPic");
const myName      = document.getElementById("myName");

export async function checkAuth(onReady) {
  try {
    const res  = await fetch("/me", { credentials: "include" });
    const data = await res.json();

    if (!data) { showLogin(); return; }

    currentUser        = data;
    myName.textContent = currentUser.username;
    myPic.src          = currentUser.picture;

    loginScreen.classList.add("hidden");
    appEl.classList.remove("hidden");
    onReady();
  } catch {
    showLogin();
  }
}

function showLogin() {
  loginScreen.classList.remove("hidden");
  appEl.classList.add("hidden");
}

window.handleGoogleCredential = async function (response) {
  const res = await fetch("/auth/google", {
    method:  "POST",
    headers: { "Content-Type": "application/json" },
    body:    JSON.stringify({ credential: response.credential }),
    credentials: "include",
  });

  if (!res.ok) { console.error("Auth failed"); return; }
  location.reload();
};

logoutBtn?.addEventListener("click", () => {
  location.href = "/auth/logout";
});
