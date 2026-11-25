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
    const name = profile.display_name || user.email || (role==="parent"?"Parent":"Student");
    portalShell(role,name);
    const page = document.getElementById("pageContent");
    page.innerHTML = '<div class="registry-head"><div><div class="eyebrow"><span class="eyebrow-line"></span> DISCIPLINE / '+role.toUpperCase()+'</div><h1>Welcome, '+esc(name)+'</h1><p class="page-intro">Your personal, read-only journey dashboard.</p></div></div><div class="registry-stats"><article class="stat-card"><div class="stat-label">Linked profile(s)</div><div class="stat-value" id="linkedCount">…</div></article><article class="stat-card"><div class="stat-label">Portal access</div><div class="stat-value" style="font-size:18px">View only</div></article></div><div id="portalChildren"></div><footer class="page-footer"><span>© 2026 DISCIPLINE.</span><span>PRIVATE PORTAL · READ ONLY</span></footer>';
    const container=document.getElementById("portalChildren");
    let links=[];
    if(role==="student"){
      const {data,error}=await client.from("student_accounts").select("student_id").eq("user_id",user.id);
      if(error){container.textContent="Unable to load your student link. Please contact the administrator.";return;}
      links=(data||[]).map(x=>x.student_id);
    }else{
      const {data,error}=await client.from("parent_student_links").select("student_id,relationship_label").eq("parent_user_id",user.id);
      if(error){container.textContent="Unable to load linked student profiles. Please contact the administrator.";return;}
      links=(data||[]).map(x=>x.student_id);
    }
    document.getElementById("linkedCount").textContent=links.length;
    if(!links.length){container.innerHTML='<section class="panel registry-panel"><h3>No linked profile yet</h3><p class="page-intro">Your account is active, but the administrator has not linked a student profile yet.</p></section>';return;}
    const {data:students,error:studentError}=await client.from("students").select("id,full_name,student_code,class_group").in("id",links);
    if(studentError){container.textContent="Unable to load permitted student details.";return;}
    for(const student of (students||[])){
      const [{data:weekly},{data:tx}] = await Promise.all([
        client.from("weekly_results").select("weekly_net,lifetime_balance,week_start,week_end,published_at").eq("student_id",student.id).order("week_start",{ascending:false}).limit(1).maybeSingle(),
        client.from("mark_transactions").select("transaction_type,amount,balance_delta,reason,occurred_at").eq("student_id",student.id).order("occurred_at",{ascending:false}).limit(8)
      ]);
      const history=(tx||[]).map(t=>'<tr><td>'+esc(new Date(t.occurred_at).toLocaleDateString())+'</td><td>'+esc(t.reason||t.transaction_type)+'</td><td>'+esc(t.balance_delta>0?"+":"")+esc(t.balance_delta)+'</td></tr>').join("");
      container.insertAdjacentHTML("beforeend",'<section class="panel registry-panel"><div class="panel-heading"><div><h3>'+esc(student.full_name)+'</h3><p>'+esc(student.student_code)+' · '+esc(student.class_group||"Student")+'</p></div></div><div class="registry-stats"><article class="stat-card"><div class="stat-label">Latest published weekly score</div><div class="stat-value">'+(weekly&&weekly.published_at?esc(weekly.weekly_net):"—")+'</div></article><article class="stat-card"><div class="stat-label">Lifetime balance</div><div class="stat-value">'+(weekly&&weekly.published_at?esc(weekly.lifetime_balance):"—")+'</div></article></div><h3>Recent mark history</h3><div class="table-scroll"><table class="registry-table"><thead><tr><th>DATE</th><th>ACTIVITY</th><th>CHANGE</th></tr></thead><tbody>'+ (history||'<tr><td colspan="3">No mark records yet.</td></tr>')+'</tbody></table></div></section>');
    }
  }

  async function openForSession(session) {
    if (!session || !session.user) return false;
    const {data:profile,error}=await client.from("profiles").select("role,is_active,display_name").eq("user_id",session.user.id).maybeSingle();
    if(error||!profile||profile.is_active!==true||!["admin","student","parent"].includes(profile.role)){
      await client.auth.signOut();
      gate.style.display="grid";
      message.textContent="This account is not active or has no assigned DISCIPLINE role. Please contact the administrator.";
      return false;
    }
    if(profile.role==="admin"){
      portalShell("admin",profile.display_name||"Administrator");
      if(location.hash==="#students" && typeof renderStudents==="function") renderStudents();
      return true;
    }
    await renderReadOnlyPortal(profile.role,profile,session.user);
    return true;
  }

  form.addEventListener("submit",async event=>{
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
    if(!error&&data.session) openForSession(data.session);
  });
})();
