(function () {
  const config = window.DISCIPLINE_SUPABASE_CONFIG;
  const gate = document.createElement("section");
  gate.id = "authGate";
  gate.className = "auth-gate";
  gate.innerHTML = `
    <div class="auth-card auth-card-wide">
      <div class="auth-brand"><div class="auth-mark">D</div><div><strong>DISCIPLINE</strong><span>JOURNEY MANAGEMENT</span></div></div>
      <div id="portalPicker">
        <h1>Welcome to DISCIPLINE.</h1>
        <p>Choose your portal to continue.</p>
        <div class="portal-choice-grid">
          <button type="button" class="portal-choice" data-portal="admin"><span class="portal-choice-icon">⌘</span><strong>Administrator</strong><small>Manage students, journeys, marks and reports</small><span class="portal-choice-arrow">→</span></button>
          <button type="button" class="portal-choice" data-portal="parent"><span class="portal-choice-icon">♧</span><strong>Parent</strong><small>View your child’s progress and updates</small><span class="portal-choice-arrow">→</span></button>
          <button type="button" class="portal-choice" data-portal="driver"><span class="portal-choice-icon">↗</span><strong>Driver</strong><small>View your route and update journey check-ins</small><span class="portal-choice-arrow">→</span></button>
        </div>
        <div class="auth-note">Use the account provided by the DISCIPLINE administrator. Your access is based on your assigned role.</div>
      </div>
      <div id="loginPanel" hidden>
        <button type="button" class="auth-back" id="backToPortals">← All portals</button>
        <h1 id="loginHeading">Sign in</h1>
        <p id="loginDescription">Enter your account details.</p>
        <form class="auth-form" id="loginForm">
          <label>Email<input id="loginEmail" type="email" autocomplete="username" required placeholder="Your email"></label>
          <label>Password<input id="loginPassword" type="password" autocomplete="current-password" required placeholder="Your password"></label>
          <button class="button button-primary" id="loginButton" type="submit">Log in</button>
          <button class="auth-forgot" id="forgotPasswordButton" type="button">Forgot password?</button>
          <div class="auth-message" id="authMessage" role="status"></div>
        </form>
        <div class="auth-note">Your sign-in stays saved on this browser. Sign out only when you want to end your session.</div>
      </div>
    </div>`;
  document.body.prepend(gate);

  if (!config || !window.supabase || !window.supabase.createClient) {
    const picker = document.getElementById("portalPicker");
    picker.insertAdjacentHTML("beforeend", '<p class="auth-message">Authentication could not load. Please refresh and try again.</p>');
    return;
  }

  // Keep sessions in browser storage and refresh them automatically.
  const client = window.supabase.createClient(config.url, config.publishableKey, {
    auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true }
  });
  window.disciplineSupabase = client;

  const picker = document.getElementById("portalPicker");
  const loginPanel = document.getElementById("loginPanel");
  const form = document.getElementById("loginForm");
  const message = document.getElementById("authMessage");
  const button = document.getElementById("loginButton");
  const forgotButton = document.getElementById("forgotPasswordButton");
  let selectedPortal = null;
  let isPasswordRecovery = false;
  const isInviteSetup = new URLSearchParams(window.location.search).get("setup") === "1";

  function showPicker() {
    selectedPortal = null;
    picker.hidden = false;
    loginPanel.hidden = true;
  }
  function showLogin(role) {
    selectedPortal = role;
    picker.hidden = true;
    loginPanel.hidden = false;
    const names = { admin: "Administrator", parent: "Parent", driver: "Driver" };
    document.getElementById("loginHeading").textContent = names[role] + " sign in";
    document.getElementById("loginDescription").textContent = "Sign in to your " + names[role].toLowerCase() + " dashboard.";
    message.textContent = "";
    document.getElementById("loginEmail").focus();
  }
  document.querySelectorAll("[data-portal]").forEach(item => {
    item.addEventListener("click", () => showLogin(item.dataset.portal));
  });
  document.getElementById("backToPortals").addEventListener("click", showPicker);

  forgotButton.addEventListener("click", async () => {
    const email = document.getElementById("loginEmail").value.trim();
    if (!email) {
      message.textContent = "Enter your email first.";
      document.getElementById("loginEmail").focus();
      return;
    }
    forgotButton.disabled = true;
    message.textContent = "Sending reset email…";
    const { error } = await client.auth.resetPasswordForEmail(email, {
      redirectTo: window.location.origin + window.location.pathname
    });
    message.textContent = error
      ? "Could not send reset email. Please try again."
      : "If an account exists for this email, a reset link has been sent. Check your inbox and spam folder.";
    forgotButton.disabled = false;
  });

  function showNewPasswordForm() {
    if (isPasswordRecovery) return;
    isPasswordRecovery = true;
    gate.style.display = "grid";
    picker.hidden = true;
    loginPanel.hidden = false;
    const card = gate.querySelector(".auth-card");
    card.querySelector("#loginHeading").textContent = isInviteSetup ? "Create your password" : "Choose a new password";
    card.querySelector("#loginDescription").textContent = "Use at least 8 characters for your password.";
    form.innerHTML = `
      <label>New password<input id="newPassword" type="password" minlength="8" autocomplete="new-password" required placeholder="At least 8 characters"></label>
      <label>Confirm password<input id="confirmPassword" type="password" minlength="8" autocomplete="new-password" required placeholder="Enter it again"></label>
      <button class="button button-primary" id="saveNewPassword" type="submit">Save password</button>
      <div class="auth-message" id="authMessage" role="status"></div>`;
    const recoveryMessage = document.getElementById("authMessage");
    form.addEventListener("submit", async event => {
      event.preventDefault();
      const password = document.getElementById("newPassword").value;
      const confirm = document.getElementById("confirmPassword").value;
      if (password.length < 8) { recoveryMessage.textContent = "Use at least 8 characters."; return; }
      if (password !== confirm) { recoveryMessage.textContent = "The passwords do not match."; return; }
      const save = document.getElementById("saveNewPassword");
      save.disabled = true;
      save.textContent = "Saving…";
      const { error } = await client.auth.updateUser({ password });
      if (error) {
        recoveryMessage.textContent = "Password update failed. Please request a new reset link.";
        save.disabled = false;
        save.textContent = "Save password";
      } else if (isInviteSetup) {
        history.replaceState({}, document.title, window.location.pathname);
        recoveryMessage.textContent = "Password saved. Opening your dashboard…";
        const { data: sessionData } = await client.auth.getSession();
        if (sessionData.session) await openForSession(sessionData.session);
      } else {
        await client.auth.signOut();
        recoveryMessage.textContent = "Password updated. Sign in with your new password.";
        form.innerHTML = '<a class="button button-primary" href="' + window.location.pathname + '">Return to sign in</a>';
      }
    });
  }

  client.auth.onAuthStateChange(event => {
    if (event === "PASSWORD_RECOVERY" || (event === "SIGNED_IN" && isInviteSetup)) showNewPasswordForm();
  });

  function esc(v) {
    return String(v ?? "").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"}[c]));
  }
  function addSignOut() {
    const actions = document.querySelector(".topbar-actions");
    if (!actions || document.getElementById("signOutButton")) return;
    const signOut = document.createElement("button");
    signOut.id = "signOutButton";
    signOut.className = "button button-quiet";
    signOut.type = "button";
    signOut.textContent = "Sign out";
    signOut.addEventListener("click", async () => {
      signOut.disabled = true;
      await client.auth.signOut();
      location.reload();
    });
    actions.appendChild(signOut);
  }
  function portalShell(role, displayName) {
    document.body.classList.add("is-authenticated");
    gate.remove();
    const sidebar = document.getElementById("sidebar");
    if (role !== "admin") {
      if (sidebar) sidebar.remove();
      const backdrop = document.getElementById("sidebarBackdrop");
      if (backdrop) backdrop.remove();
      document.querySelector(".main-area").style.marginLeft = "0";
      document.querySelector(".topbar-left").innerHTML = '<div class="breadcrumb"><strong>My DISCIPLINE Dashboard</strong></div>';
    }
    const topAdmin = document.querySelector(".top-admin");
    if (topAdmin) topAdmin.innerHTML = '<div class="top-avatar">' + esc((displayName || "U").slice(0,1).toUpperCase()) + '</div><div><strong>' + esc(displayName || "User") + '</strong><span>' + esc(role.charAt(0).toUpperCase()+role.slice(1)) + '</span></div>';
    const demo = document.querySelector(".demo-pill");
    if (demo) demo.innerHTML = '<span class="pulse-dot"></span> ' + esc(role.toUpperCase()) + ' SESSION';
    addSignOut();
  }

  async function renderReadOnlyPortal(role, profile, user) {
    const name = profile.display_name || user.email || "Parent";
    portalShell(role, name);
    const page = document.getElementById("pageContent");
    page.innerHTML = '<div class="registry-head"><div><div class="eyebrow">DISCIPLINE / PARENT</div><h1>Welcome, ' + esc(name) + '</h1><p class="page-intro">Private updates for the student profiles linked to your account.</p></div></div><div class="registry-stats"><article class="stat-card"><div class="stat-label">Linked profile(s)</div><div class="stat-value" id="linkedCount">…</div></article><article class="stat-card"><div class="stat-label">Portal access</div><div class="stat-value" style="font-size:18px">View & respond</div></article></div><div id="portalChildren"></div><footer class="page-footer"><span>© 2026 DISCIPLINE.</span><span>PRIVATE PARENT PORTAL</span></footer>';
    const container = document.getElementById("portalChildren");
    const { data: links, error: linkError } = await client.from("parent_student_links").select("student_id,relationship_label").eq("parent_user_id", user.id);
    if (linkError) { container.textContent = "Unable to load linked student profiles. Please contact the administrator."; return; }
    const ids = (links || []).map(x => x.student_id);
    document.getElementById("linkedCount").textContent = ids.length;
    if (!ids.length) {
      container.innerHTML = '<section class="panel registry-panel"><h3>No linked profile yet</h3><p class="page-intro">Your account is active, but the administrator has not linked a student profile yet.</p></section>';
      return;
    }
    // The existing parent dashboard renderer remains the source of family report data.
    // Reuse its previously deployed implementation by loading the portal through app.js helper.
    if (typeof window.renderDisciplineParentPortal === "function") {
      await window.renderDisciplineParentPortal(profile, user, container);
      return;
    }
    container.innerHTML = '<section class="panel registry-panel"><h3>Parent dashboard</h3><p>Your linked account is ready, but the detailed parent report module needs to be reloaded. Refresh the page.</p></section>';
  }

  function driverToday() {
    const parts = new Intl.DateTimeFormat("en-CA", { timeZone:"Asia/Kolkata", year:"numeric", month:"2-digit", day:"2-digit" }).formatToParts(new Date());
    const values = {};
    parts.forEach(x => values[x.type] = x.value);
    return values.year + "-" + values.month + "-" + values.day;
  }
  async function renderDriverPortal(profile, user) {
    const name = profile.display_name || user.email || "Driver";
    portalShell("driver", name);
    const page = document.getElementById("pageContent");
    page.innerHTML = '<div class="registry-head"><div><div class="eyebrow">DISCIPLINE / DRIVER</div><h1>Driver Dashboard</h1><p class="page-intro">Your assigned route and student journey check-ins.</p></div></div><section class="panel registry-panel"><div class="driver-route-head"><div><span class="stat-label">Assigned route</span><h2 id="driverRouteName">Loading…</h2><p id="driverVehicle" class="page-intro"></p></div><span class="session-status completed">Driver access</span></div><div class="driver-toolbar"><div class="field"><label for="driverDate">Journey date</label><input type="date" id="driverDate" value="' + driverToday() + '"></div><div class="field"><label for="driverJourneyType">Journey</label><select id="driverJourneyType"><option value="morning">Morning · Home to institute</option><option value="evening">Evening · Institute to home</option></select></div></div><p id="driverInfo" class="registry-disclaimer" role="status">Loading assigned students…</p></section><section class="panel registry-panel"><div class="panel-heading"><div><h3>Assigned students</h3><p>Update one check-in at a time. Only your assigned route is shown.</p></div></div><div class="table-scroll"><table class="registry-table driver-roster-table"><thead><tr><th>STUDENT</th><th>STATUS</th><th>NOTE</th><th>ACTION</th></tr></thead><tbody id="driverRosterRows"><tr><td colspan="4">Loading…</td></tr></tbody></table></div></section><p class="registry-disclaimer">This portal does not show marks, behaviour reports or parent information. For an urgent safety issue, contact the administrator directly.</p>';
    const info = document.getElementById("driverInfo");
    const rows = document.getElementById("driverRosterRows");
    const date = document.getElementById("driverDate");
    const journey = document.getElementById("driverJourneyType");
    const routeResult = await client.from("driver_routes").select("id,route_name,vehicle_label").eq("driver_user_id", user.id).eq("is_active", true).limit(1).maybeSingle();
    if (routeResult.error || !routeResult.data) {
      document.getElementById("driverRouteName").textContent = "Route not assigned";
      info.textContent = routeResult.error ? "Unable to load your route. Contact the administrator." : "Your account is active, but no active route has been assigned yet. Contact the administrator.";
      rows.innerHTML = '<tr><td colspan="4">No route is available.</td></tr>';
      return;
    }
    const route = routeResult.data;
    document.getElementById("driverRouteName").textContent = route.route_name;
    document.getElementById("driverVehicle").textContent = route.vehicle_label || "Vehicle not specified";
    const optionsFor = type => type === "morning"
      ? [["boarded","Boarded"],["late","Late"],["absent","Absent"],["not_on_vehicle","Not on vehicle"]]
      : [["boarded","Boarded"],["dropped_off","Dropped off"],["not_on_vehicle","Not on vehicle"]];
    async function loadRoster() {
      info.textContent = "Loading your assigned students…";
      rows.innerHTML = '<tr><td colspan="4">Loading…</td></tr>';
      const { data, error } = await client.rpc("driver_get_roster", { p_journey_date: date.value, p_journey_type: journey.value });
      if (error) {
        info.textContent = "Could not load the route list. Please refresh or contact the administrator.";
        rows.innerHTML = '<tr><td colspan="4">Roster unavailable.</td></tr>';
        return;
      }
      const roster = data || [];
      info.textContent = roster.length + " assigned student(s) · " + (journey.value === "morning" ? "Morning journey" : "Evening journey") + " · " + date.value;
      if (!roster.length) {
        rows.innerHTML = '<tr><td colspan="4">No students are assigned for this date.</td></tr>';
        return;
      }
      rows.innerHTML = roster.map(student => {
        const options = optionsFor(journey.value).map(([value,label]) => '<option value="' + value + '" ' + (student.last_status === value ? "selected" : "") + '>' + label + '</option>').join("");
        return '<tr data-driver-row="' + esc(student.student_id) + '"><td><strong>' + esc(student.full_name) + '</strong><small class="registry-email">' + esc(student.student_code) + (student.class_group ? " · " + esc(student.class_group) : "") + '</small></td><td><select data-driver-status><option value="">Choose status</option>' + options + '</select></td><td><input data-driver-note maxlength="250" placeholder="Optional note" value="' + esc(student.last_note || "") + '"></td><td><button class="button button-primary" type="button" data-driver-save>Save</button></td></tr>';
      }).join("");
    }
    rows.addEventListener("click", async event => {
      const save = event.target.closest("[data-driver-save]");
      if (!save) return;
      const row = save.closest("[data-driver-row]");
      const status = row.querySelector("[data-driver-status]").value;
      const note = row.querySelector("[data-driver-note]").value.trim();
      if (!status) { info.textContent = "Choose a journey status before saving."; return; }
      save.disabled = true;
      save.textContent = "Saving…";
      const { error } = await client.rpc("driver_record_journey_checkin", {
        p_student_id: row.dataset.driverRow,
        p_journey_date: date.value,
        p_journey_type: journey.value,
        p_status: status,
        p_note: note || null
      });
      if (error) {
        info.textContent = "Could not save this check-in. Please try again.";
        save.disabled = false;
        save.textContent = "Save";
      } else {
        info.textContent = "Journey check-in saved.";
        await loadRoster();
      }
    });
    date.addEventListener("change", loadRoster);
    journey.addEventListener("change", loadRoster);
    await loadRoster();
  }

  async function openForSession(session, expectedPortal = null) {
    if (isPasswordRecovery || !session || !session.user) return false;
    const { data: profile, error } = await client.from("profiles")
      .select("role,is_active,display_name").eq("user_id", session.user.id).maybeSingle();
    const allowedRoles = ["admin","parent","driver"];
    if (error || !profile || profile.is_active !== true || !allowedRoles.includes(String(profile.role))) {
      await client.auth.signOut();
      gate.style.display = "grid";
      showPicker();
      picker.insertAdjacentHTML("beforeend", '<p class="auth-message">This account is inactive or has no active portal role. Please contact the administrator.</p>');
      return false;
    }
    if (expectedPortal && profile.role !== expectedPortal) {
      await client.auth.signOut();
      message.textContent = "This is a " + profile.role + " account. Choose the " + profile.role + " portal and sign in again.";
      return false;
    }
    if (profile.role === "admin") {
      portalShell("admin", profile.display_name || "Administrator");
      const requestedPage = location.hash.replace("#", "");
      if (typeof setActivePage === "function") {
        const navItem = Array.from(document.querySelectorAll(".nav-item")).find(x => x.dataset.page === requestedPage);
        setActivePage(navItem ? requestedPage : "dashboard");
      }
      return true;
    }
    if (profile.role === "parent") {
      await renderReadOnlyPortal("parent", profile, session.user);
      return true;
    }
    await renderDriverPortal(profile, session.user);
    return true;
  }

  form.addEventListener("submit", async event => {
    if (isPasswordRecovery) return;
    event.preventDefault();
    message.textContent = "";
    button.disabled = true;
    button.textContent = "Signing in…";
    const email = document.getElementById("loginEmail").value.trim();
    const password = document.getElementById("loginPassword").value;
    try {
      const { data, error } = await client.auth.signInWithPassword({ email, password });
      if (error) {
        message.textContent = "Sign-in failed. Check your email and password.";
      } else {
        await openForSession(data.session, selectedPortal);
      }
    } catch (error) {
      message.textContent = "Could not sign in right now. Please try again.";
    } finally {
      button.disabled = false;
      button.textContent = "Log in";
    }
  });

  client.auth.getSession().then(({ data, error }) => {
    if (!error && data.session) {
      if (isInviteSetup) showNewPasswordForm();
      else openForSession(data.session);
    }
  });
})();