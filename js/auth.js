(function () {
  const config = window.DISCIPLINE_SUPABASE_CONFIG;
  const gate = document.createElement("section");
  gate.id = "authGate";
  gate.className = "auth-gate";
  gate.innerHTML = `
    <div class="auth-card">
      <div class="auth-brand"><div class="auth-mark">D</div><div><strong>DISCIPLINE</strong><span>JOURNEY MANAGEMENT</span></div></div>
      <h1>Welcome back.</h1>
      <p>Sign in to open your personal DISCIPLINE dashboard.</p>
      <form class="auth-form" id="loginForm">
        <label>Email address<input id="loginEmail" type="email" autocomplete="username" required placeholder="Enter your email"></label>
        <label>Password<input id="loginPassword" type="password" autocomplete="current-password" required placeholder="Enter your password"></label>
        <button class="button button-primary" id="loginButton" type="submit">Sign in securely</button>
        <button class="auth-forgot" id="forgotPasswordButton" type="button">Forgot password?</button>
        <div class="auth-message" id="authMessage" role="status"></div>
      </form>
      <div class="auth-note">Use the account created for you by the DISCIPLINE administrator. Your dashboard is selected automatically according to your assigned role.</div>
    </div>`;
  document.body.prepend(gate);

  if (!config || !window.supabase || !window.supabase.createClient) {
    document.getElementById("authMessage").textContent = "Authentication could not load. Please refresh and try again.";
    return;
  }

  const client = window.supabase.createClient(config.url, config.publishableKey);
  window.disciplineSupabase = client;
  const form = document.getElementById("loginForm");
  const message = document.getElementById("authMessage");
  const button = document.getElementById("loginButton");
  const forgotButton = document.getElementById("forgotPasswordButton");
  let isPasswordRecovery = false;
  const isInviteSetup = new URLSearchParams(window.location.search).get("setup") === "1";

  forgotButton.addEventListener("click", async () => {
    const email = document.getElementById("loginEmail").value.trim();
    if (!email) {
      message.textContent = "Enter your account email address first.";
      document.getElementById("loginEmail").focus();
      return;
    }
    forgotButton.disabled = true;
    message.textContent = "Sending password reset email…";
    const { error } = await client.auth.resetPasswordForEmail(email, {
      redirectTo: window.location.origin + window.location.pathname
    });
    message.textContent = error
      ? "Reset error: " + error.message
      : "If an account exists for this email, a password reset link has been sent. Check your inbox and spam folder.";
    forgotButton.disabled = false;
  });

  function showNewPasswordForm() {
    if (isPasswordRecovery) return;
    isPasswordRecovery = true;
    gate.style.display = "grid";
    const card = gate.querySelector(".auth-card");
    card.querySelector("h1").textContent = isInviteSetup ? "Create your password" : "Choose a new password";
    card.querySelector("p").textContent = isInviteSetup ? "Set a password for your DISCIPLINE account to finish joining." : "Enter and confirm your new password.";
    form.innerHTML = `
      <label>New password<input id="newPassword" type="password" minlength="8" autocomplete="new-password" required placeholder="At least 8 characters"></label>
      <label>Confirm new password<input id="confirmPassword" type="password" minlength="8" autocomplete="new-password" required placeholder="Enter it again"></label>
      <button class="button button-primary" id="saveNewPassword" type="submit">Update password</button>
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
      save.textContent = "Updating…";
      const { error } = await client.auth.updateUser({ password });
      if (error) {
        recoveryMessage.textContent = "Password update failed. Please request a new reset link.";
        save.disabled = false;
        save.textContent = "Update password";
      } else if (isInviteSetup) {
        history.replaceState({}, document.title, window.location.pathname);
        recoveryMessage.textContent = "Password created. Opening your DISCIPLINE dashboard…";
        const { data: sessionData } = await client.auth.getSession();
        if (sessionData.session) await openForSession(sessionData.session);
      } else {
        await client.auth.signOut();
        recoveryMessage.textContent = "Password updated successfully. You can now sign in with your new password.";
        form.innerHTML = '<a class="button button-primary" href="' + window.location.pathname + '">Return to sign in</a><div class="auth-message" id="authMessage" role="status">Your password has been changed.</div>';
      }
    });
  }

  client.auth.onAuthStateChange((event) => {
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
    if (topAdmin) topAdmin.innerHTML = '<div class="top-avatar">'+esc((displayName||"U").slice(0,1).toUpperCase())+'</div><div><strong>'+esc(displayName||"User")+'</strong><span>'+esc(role.charAt(0).toUpperCase()+role.slice(1))+'</span></div>';
    const demo = document.querySelector(".demo-pill");
    if (demo) demo.innerHTML = '<span class="pulse-dot"></span> '+esc(role.toUpperCase())+' SESSION';
    addSignOut();
  }

  async function renderReadOnlyPortal(role, profile, user) {
    const name = profile.display_name || user.email || (role === "parent" ? "Parent" : "Student");
    portalShell(role, name);
    const page = document.getElementById("pageContent");
    page.innerHTML = '<div class="registry-head"><div><div class="eyebrow">DISCIPLINE / '+role.toUpperCase()+'</div><h1>Welcome, '+esc(name)+'</h1><p class="page-intro">'+(role==="parent"?"Private updates for the student profiles linked to your account.":"Your personal, read-only journey dashboard.")+'</p></div></div><div class="registry-stats"><article class="stat-card"><div class="stat-label">Linked profile(s)</div><div class="stat-value" id="linkedCount">…</div></article><article class="stat-card"><div class="stat-label">Portal access</div><div class="stat-value" style="font-size:18px">'+(role==="parent"?"View & respond":"View only")+'</div></article></div><div id="portalChildren"></div><footer class="page-footer"><span>© 2026 DISCIPLINE.</span><span>'+(role==="parent"?"PRIVATE PARENT PORTAL":"PRIVATE STUDENT PORTAL · VIEW ONLY")+'</span></footer>';
    const container = document.getElementById("portalChildren");
    let links = [];
    if (role === "student") {
      const { data, error } = await client.from("student_accounts").select("student_id").eq("user_id", user.id);
      if (error) { container.textContent = "Unable to load your student link. Please contact the administrator."; return; }
      links = (data || []).map(x => x.student_id);
    } else {
      const { data, error } = await client.from("parent_student_links").select("student_id,relationship_label").eq("parent_user_id", user.id);
      if (error) { container.textContent = "Unable to load linked student profiles. Please contact the administrator."; return; }
      links = (data || []).map(x => x.student_id);
    }
    document.getElementById("linkedCount").textContent = links.length;
    if (!links.length) {
      container.innerHTML = '<section class="panel registry-panel"><h3>No linked profile yet</h3><p class="page-intro">Your account is active, but the administrator has not linked a student profile yet.</p></section>';
      return;
    }
    const { data: students, error: studentError } = await client.from("students")
      .select("id,full_name,student_code,class_group,starting_marks").in("id", links);
    if (studentError) { container.textContent = "Unable to load permitted student details."; return; }

    function responseForm(studentId, relationId, relationType) {
      const options = relationType === "incident"
        ? '<option value="acknowledged">Acknowledge report</option><option value="review_requested">Request review</option><option value="clarification_requested">Request clarification</option>'
        : '<option value="acknowledged">Acknowledge result</option><option value="review_requested">Request review</option>';
      return '<form class="registry-response-form" data-parent-response-form data-student-id="'+esc(studentId)+'" data-relation-id="'+esc(relationId)+'" data-relation-type="'+relationType+'"><div class="field"><label>Response</label><select data-response-type>'+options+'</select></div><div class="field"><label>Message (optional)</label><textarea data-response-message rows="2" maxlength="500" placeholder="Add a note for the administrator"></textarea></div><button class="button button-outline" type="submit">Send response</button><span class="registry-disclaimer" data-response-status role="status"></span></form>';
    }

    for (const student of (students || [])) {
      const commonQueries = [
        client.from("weekly_results").select("id,weekly_net,lifetime_balance,week_start,week_end,published_at,total_awards,total_deductions,total_received,total_transferred").eq("student_id", student.id).not("published_at", "is", null).order("week_start", { ascending: false }).limit(8),
        client.from("mark_transactions").select("transaction_type,amount,balance_delta,balance_after,reason,occurred_at").eq("student_id", student.id).order("occurred_at", { ascending: false }).limit(8)
      ];
      const [weeklyResult, txResult] = await Promise.all(commonQueries);
      if (weeklyResult.error || txResult.error) {
        container.insertAdjacentHTML("beforeend", '<section class="panel registry-panel"><h3>'+esc(student.full_name)+'</h3><p>Unable to load this profile’s results. Please contact the administrator.</p></section>');
        continue;
      }
      const weeklyRows = weeklyResult.data || [];
      const tx = txResult.data || [];
      const latestWeekly = weeklyRows[0] || null;
      const lifetimeBalance = tx.length ? tx[0].balance_after : (student.starting_marks || 0);
      const history = tx.map(t => '<tr><td>'+esc(new Date(t.occurred_at).toLocaleDateString("en-IN"))+'</td><td>'+esc(t.reason || t.transaction_type)+'</td><td>'+esc(t.balance_delta > 0 ? "+" : "")+esc(t.balance_delta)+'</td></tr>').join("");

      if (role !== "parent") {
        const certificateResult = await client.from("certificates")
          .select("title,description,issued_at").eq("student_id", student.id)
          .not("published_at", "is", null).order("issued_at", { ascending: false }).limit(20);
        const certificateHtml = (certificateResult.data || []).map(x =>
          '<li><strong>'+esc(x.title)+'</strong> · '+esc(x.description || "Achievement recognised")+' <small>'+esc(new Date(x.issued_at).toLocaleDateString("en-IN"))+'</small></li>'
        ).join("");
        container.insertAdjacentHTML("beforeend",
          '<section class="panel registry-panel"><div class="panel-heading"><div><h3>'+esc(student.full_name)+'</h3><p>'+esc(student.student_code)+' · '+esc(student.class_group || "Student")+'</p></div></div><div class="registry-stats"><article class="stat-card"><div class="stat-label">Latest published weekly score</div><div class="stat-value">'+(latestWeekly ? esc(latestWeekly.weekly_net) : "—")+'</div></article><article class="stat-card"><div class="stat-label">Lifetime balance</div><div class="stat-value">'+esc(lifetimeBalance)+'</div></article></div><h3>Achievements & certificates</h3><ul class="simple-list">'+(certificateHtml || '<li>No certificates have been published yet.</li>')+'</ul><h3>Recent mark history</h3><div class="table-scroll"><table class="registry-table"><thead><tr><th>DATE</th><th>ACTIVITY</th><th>CHANGE</th></tr></thead><tbody>'+(history || '<tr><td colspan="3">No mark records yet.</td></tr>')+'</tbody></table></div></section>');
        if(certificateResult.error) console.warn("Could not load certificates for student portal:", certificateResult.error);
        continue;
      }

      const [incidentResult, responseResult, certificateResult, attendanceResult, notificationResult] = await Promise.all([
        client.from("incidents").select("id,category,severity,factual_description,exact_words,action_taken,occurred_at").eq("student_id", student.id).order("occurred_at", { ascending: false }).limit(50),
        client.from("parent_responses").select("id,incident_id,weekly_result_id,response_type,message,created_at").eq("parent_user_id", user.id).eq("student_id", student.id).order("created_at", { ascending: false }).limit(50),
        client.from("certificates").select("id,title,description,issued_at").eq("student_id", student.id).not("published_at", "is", null).order("issued_at", { ascending: false }).limit(20),
        client.from("attendance").select("status,recorded_at,journey_sessions(session_date,session_type)").eq("student_id", student.id).order("recorded_at", { ascending: false }).limit(30),
        client.from("notifications").select("id,title,message,read_at,created_at").eq("recipient_user_id", user.id).order("created_at", { ascending: false }).limit(20)
      ]);
      const queryError = incidentResult.error || responseResult.error || certificateResult.error || attendanceResult.error || notificationResult.error;
      if (queryError) {
        container.insertAdjacentHTML("beforeend", '<section class="panel registry-panel"><h3>'+esc(student.full_name)+'</h3><p>Some family report data could not be loaded: '+esc(queryError.message)+'</p></section>');
        continue;
      }
      const incidents = incidentResult.data || [];
      const responses = responseResult.data || [];
      const certificates = certificateResult.data || [];
      const attendance = attendanceResult.data || [];
      const notifications = notificationResult.data || [];
      const presentCount = attendance.filter(x => x.status === "present" || x.status === "late").length;
      const attendanceHtml = attendance.map(x => '<tr><td>'+esc(x.journey_sessions?.session_date || new Date(x.recorded_at).toLocaleDateString("en-IN"))+'</td><td>'+esc(x.journey_sessions?.session_type || "Morning")+'</td><td>'+esc(x.status)+'</td></tr>').join("");
      const weeklyHtml = weeklyRows.map(x =>
        '<tr><td>'+esc(x.week_start)+' – '+esc(x.week_end)+'</td><td class="'+(x.weekly_net >= 0 ? "positive-text" : "negative-text")+'">'+(x.weekly_net > 0 ? "+" : "")+esc(x.weekly_net)+'</td><td>'+esc(x.total_awards)+'</td><td>'+esc(x.total_deductions)+'</td><td>'+responseForm(student.id, x.id, "weekly")+'</td></tr>'
      ).join("");
      const incidentHtml = incidents.map(x =>
        '<article class="panel registry-panel"><div class="panel-heading"><div><h3>'+esc(x.category.replaceAll("_", " "))+'</h3><p>'+esc(new Date(x.occurred_at).toLocaleString("en-IN"))+' · '+esc(x.severity)+'</p></div></div><p>'+esc(x.factual_description)+'</p>'+(x.exact_words ? '<p><strong>Verified words:</strong> '+esc(x.exact_words)+'</p>' : '')+(x.action_taken ? '<p><strong>Action taken:</strong> '+esc(x.action_taken)+'</p>' : '')+responseForm(student.id, x.id, "incident")+'</article>'
      ).join("");
      const responseHtml = responses.map(x => '<tr><td>'+esc(new Date(x.created_at).toLocaleDateString("en-IN"))+'</td><td>'+esc(x.incident_id ? "Incident report" : x.weekly_result_id ? "Weekly result" : "General message")+'</td><td>'+esc(x.response_type.replaceAll("_", " "))+'</td><td>'+esc(x.message || "—")+'</td></tr>').join("");
      const certificateHtml = certificates.map(x => '<li><strong>'+esc(x.title)+'</strong> · '+esc(x.description || "Achievement recognised")+' <small>'+esc(new Date(x.issued_at).toLocaleDateString("en-IN"))+'</small></li>').join("");
      const notificationHtml = notifications.map(x => '<li><strong>'+esc(x.title)+'</strong><p>'+esc(x.message)+'</p><small>'+esc(new Date(x.created_at).toLocaleString("en-IN"))+'</small>'+(x.read_at ? '<span class="session-status completed">Read</span>' : '<button class="button button-quiet" type="button" data-mark-notification-read="'+esc(x.id)+'">Mark read</button>')+'</li>').join("");

      container.insertAdjacentHTML("beforeend",
        '<section class="panel registry-panel"><div class="panel-heading"><div><h2>'+esc(student.full_name)+'</h2><p>'+esc(student.student_code)+' · '+esc(student.class_group || "Student")+'</p></div></div>'+
        '<div class="registry-stats"><article class="stat-card"><div class="stat-label">Latest published weekly score</div><div class="stat-value">'+(latestWeekly ? esc(latestWeekly.weekly_net) : "—")+'</div></article><article class="stat-card"><div class="stat-label">Lifetime balance</div><div class="stat-value">'+esc(lifetimeBalance)+'</div></article><article class="stat-card"><div class="stat-label">Attendance marked present / late</div><div class="stat-value">'+presentCount+' / '+attendance.length+'</div></article></div>'+
        '<h3>Published weekly reports</h3><div class="table-scroll"><table class="registry-table"><thead><tr><th>WEEK</th><th>NET</th><th>AWARDS</th><th>DEDUCTIONS</th><th>YOUR RESPONSE</th></tr></thead><tbody>'+(weeklyHtml || '<tr><td colspan="5">No weekly results have been published yet.</td></tr>')+'</tbody></table></div>'+
        '<h3>Verified behaviour reports</h3>'+(incidentHtml || '<p>No verified incident reports have been published to this parent portal.</p>')+
        '<h3>Morning attendance history</h3><div class="table-scroll"><table class="registry-table"><thead><tr><th>DATE</th><th>JOURNEY</th><th>STATUS</th></tr></thead><tbody>'+(attendanceHtml || '<tr><td colspan="3">No attendance records yet.</td></tr>')+'</tbody></table></div>'+
        '<h3>Achievements & certificates</h3><ul class="simple-list">'+(certificateHtml || '<li>No certificates have been published yet.</li>')+'</ul>'+
        '<h3>Your previous responses</h3><div class="table-scroll"><table class="registry-table"><thead><tr><th>DATE</th><th>ABOUT</th><th>RESPONSE</th><th>MESSAGE</th></tr></thead><tbody>'+(responseHtml || '<tr><td colspan="4">No responses submitted yet.</td></tr>')+'</tbody></table></div>'+
        '<h3>Notifications</h3><ul class="simple-list">'+(notificationHtml || '<li>No notifications yet.</li>')+'</ul>'+
        '<h3>Recent mark history</h3><div class="table-scroll"><table class="registry-table"><thead><tr><th>DATE</th><th>ACTIVITY</th><th>CHANGE</th></tr></thead><tbody>'+(history || '<tr><td colspan="3">No mark records yet.</td></tr>')+'</tbody></table></div></section>'
      );
    }

    if (role === "student") {
      const weekStart = disciplineMonday(disciplineToday());
      const board = await client.rpc("get_published_student_leaderboard", { p_week_start: weekStart, p_limit: 10 });
      const entries = board.data || [];
      const boardRows = entries.map(x => '<tr><td><strong>#'+esc(x.rank)+'</strong></td><td><strong>'+esc(x.full_name)+'</strong><small class="registry-email">'+esc(x.student_code)+'</small></td><td class="'+(x.weekly_net >= 0 ? "positive-text" : "negative-text")+'">'+(x.weekly_net > 0 ? "+" : "")+esc(x.weekly_net)+'</td></tr>').join("");
      container.insertAdjacentHTML("beforeend",
        '<section class="panel registry-panel"><div class="panel-heading"><div><h3>Hall of Excellence</h3><p>Public rankings · week starting '+esc(weekStart)+'</p></div></div>' +
        (board.error ? '<p>Leaderboard unavailable: '+esc(board.error.message)+'</p>' :
        '<div class="table-scroll"><table class="registry-table"><thead><tr><th>RANK</th><th>STUDENT</th><th>WEEKLY SCORE</th></tr></thead><tbody>'+(boardRows || '<tr><td colspan="3">No published weekly results yet.</td></tr>')+'</tbody></table></div>') +
        '<p class="registry-disclaimer">Only published weekly scores and basic student identifiers appear here. Private balances and incident details are not shown.</p></section>'
      );
    }

    if (role === "parent") {
      container.addEventListener("submit", async event => {
        const form = event.target.closest("form[data-parent-response-form]");
        if (!form) return;
        event.preventDefault();
        const status = form.querySelector("[data-response-status]");
        const button = form.querySelector('button[type="submit"]');
        const payload = {
          parent_user_id: user.id,
          student_id: form.dataset.studentId,
          incident_id: form.dataset.relationType === "incident" ? form.dataset.relationId : null,
          weekly_result_id: form.dataset.relationType === "weekly" ? form.dataset.relationId : null,
          response_type: form.querySelector("[data-response-type]").value,
          message: form.querySelector("[data-response-message]").value.trim() || null
        };
        button.disabled = true;
        status.textContent = "Sending…";
        const { error } = await client.from("parent_responses").insert(payload);
        if (error) status.textContent = "Could not send: " + error.message;
        else {
          status.textContent = "Response sent to the administrator.";
          form.querySelector("[data-response-message]").value = "";
        }
        button.disabled = false;
      });
      container.addEventListener("click", async event => {
        const button = event.target.closest("[data-mark-notification-read]");
        if (!button) return;
        button.disabled = true;
        const { error } = await client.from("notifications")
          .update({ read_at: new Date().toISOString() })
          .eq("id", button.dataset.markNotificationRead)
          .eq("recipient_user_id", user.id);
        if (error) {
          button.disabled = false;
          button.textContent = "Could not mark read";
        } else {
          button.replaceWith(Object.assign(document.createElement("span"), { className: "session-status completed", textContent: "Read" }));
        }
      });
    }
  }

  async function openForSession(session) {
    if (isPasswordRecovery || !session || !session.user) return false;
    const {data:profile,error}=await client.from("profiles").select("role,is_active,display_name").eq("user_id",session.user.id).maybeSingle();
    if(error||!profile||profile.is_active!==true||!["admin","student","parent"].includes(profile.role)){
      await client.auth.signOut();
      gate.style.display="grid";
      message.textContent="This account is not active or has no assigned DISCIPLINE role. Please contact the administrator.";
      return false;
    }
    if(profile.role==="admin"){
      portalShell("admin",profile.display_name||"Administrator");
      const requestedPage=location.hash.replace("#","");
      if(typeof setActivePage==="function") setActivePage(requestedPage && document.querySelector('.nav-item[data-page="'+requestedPage+'"]') ? requestedPage : "dashboard");
      return true;
    }
    await renderReadOnlyPortal(profile.role,profile,session.user);
    return true;
  }

  form.addEventListener("submit",async event=>{
    if (isPasswordRecovery) return;
    event.preventDefault();
    message.textContent="";
    button.disabled=true;
    button.textContent="Signing in…";
    const email=document.getElementById("loginEmail").value.trim();
    const password=document.getElementById("loginPassword").value;
    const {data,error}=await client.auth.signInWithPassword({email,password});
    if(error){message.textContent="Sign-in failed. Check your email and password, then try again.";}
    else {await openForSession(data.session);}
    button.disabled=false;
    button.textContent="Sign in securely";
  });

  client.auth.getSession().then(({data,error})=>{
    if(!error&&data.session) {
      if (isInviteSetup) showNewPasswordForm();
      else openForSession(data.session);
    }
  });
})();
