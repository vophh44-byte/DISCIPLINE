(function () {
  const config = window.DISCIPLINE_SUPABASE_CONFIG;
  const gate = document.createElement("section");
  gate.id = "authGate";
  gate.className = "auth-gate";
  gate.innerHTML = `
    <div class="auth-card">
      <div class="auth-brand"><div class="auth-mark">D</div><div><strong>DISCIPLINE</strong><span>ADMINISTRATOR ACCESS</span></div></div>
      <h1>Welcome back.</h1>
      <p>Sign in with your authorized administrator account to open the workspace.</p>
      <form class="auth-form" id="adminLoginForm">
        <label>Email address<input id="loginEmail" type="email" autocomplete="username" required value="voph.h44@gmail.com"></label>
        <label>Password<input id="loginPassword" type="password" autocomplete="current-password" required></label>
        <button class="button button-primary" id="loginButton" type="submit">Sign in securely</button>
        <div class="auth-message" id="authMessage" role="status"></div>
      </form>
      <div class="auth-note">Administrator access only. Student and parent portals will be enabled separately after their permissions are tested. Never share your password.</div>
    </div>`;
  document.body.prepend(gate);

  if (!config || !window.supabase || !window.supabase.createClient) {
    document.getElementById("authMessage").textContent = "Authentication could not load. Please refresh and try again.";
    return;
  }

  const client = window.supabase.createClient(config.url, config.publishableKey);
  window.disciplineSupabase = client;
  const form = document.getElementById("adminLoginForm");
  const message = document.getElementById("authMessage");
  const button = document.getElementById("loginButton");

  async function openAdminWorkspace(session) {
    if (!session || !session.user) return false;
    const { data, error } = await client.from("profiles")
      .select("role,is_active")
      .eq("user_id", session.user.id)
      .maybeSingle();
    if (error || !data || data.role !== "admin" || data.is_active !== true) {
      await client.auth.signOut();
      message.textContent = "This account does not have active administrator access.";
      return false;
    }
    document.body.classList.add("is-authenticated");
    gate.remove();
    const demo = document.querySelector(".demo-pill");
    if (demo) demo.innerHTML = '<span class="pulse-dot"></span> ADMIN SESSION';
    const actions = document.querySelector(".topbar-actions");
    if (actions && !document.getElementById("signOutButton")) {
      const signOut = document.createElement("button");
      signOut.id = "signOutButton";
      signOut.className = "button button-quiet";
      signOut.type = "button";
      signOut.textContent = "Sign out";
      signOut.addEventListener("click", async function () {
        await client.auth.signOut();
        location.reload();
      });
      actions.appendChild(signOut);
    }
    return true;
  }

  form.addEventListener("submit", async function (event) {
    event.preventDefault();
    message.textContent = "";
    button.disabled = true;
    button.textContent = "Signing in…";
    const email = document.getElementById("loginEmail").value.trim();
    const password = document.getElementById("loginPassword").value;
    const { data, error } = await client.auth.signInWithPassword({ email, password });
    if (error) {
      message.textContent = "Sign-in failed. Check your email and password, then try again.";
    } else {
      await openAdminWorkspace(data.session);
    }
    button.disabled = false;
    button.textContent = "Sign in securely";
  });

  client.auth.getSession().then(({ data, error }) => {
    if (!error && data.session) openAdminWorkspace(data.session);
  });
})();
