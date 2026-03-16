/* ==================================================
   AUTH & SESSION
   
   No Google popup or GSI script needed anymore.
   Sign-in is handled entirely server-side via redirect
   (/auth/google/redirect → Google → /auth/google/callback).
   This works on every browser and every mobile device.
================================================== */

export let currentUser = null;

const loginScreen = document.getElementById("login-screen");
const appEl       = document.getElementById("app");
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

document.getElementById("logoutBtn")?.addEventListener("click", () => {
  location.href = "/auth/logout";
});
