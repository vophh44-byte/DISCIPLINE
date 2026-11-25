const pageMeta = {
 dashboard:{title:"Command Center",desc:"Your daily system overview.",icon:"▦"},
 students:{title:"Student Registry",desc:"Create and manage student profiles.",icon:"♙"},
 parents:{title:"Parent Management",desc:"Manage parent accounts and family links.",icon:"♧"},
 accounts:{title:"Portal Accounts",desc:"Create student and parent sign-in accounts.",icon:"◎"},
 attendance:{title:"Morning Attendance",desc:"Record attendance for the institute-bound journey.",icon:"✓"},
 journeys:{title:"Journey Sessions",desc:"Manage morning and evening journey records.",icon:"↗"},
 marks:{title:"Award & Deduct Marks",desc:"Record positive contributions and discipline deductions.",icon:"＋"},
 dedications:{title:"Dedication Hall",desc:"Manage mark transfers and appreciation dedications.",icon:"◇"},
 leaderboard:{title:"Hall of Excellence",desc:"Explore weekly and lifetime student rankings.",icon:"♜"},
 ledger:{title:"Discipline Ledger",desc:"Review the complete history of mark transactions.",icon:"▤"},
 incidents:{title:"Incident Center",desc:"Record behaviour concerns and verified incident details.",icon:"!"},
 analytics:{title:"Performance Analytics",desc:"Understand weekly trends and student improvement.",icon:"⌁"},
 reports:{title:"Reports & Certificates",desc:"Prepare parent reports and student achievement records.",icon:"▧"},
 portals:{title:"Portal Previews",desc:"Preview the student and parent experiences.",icon:"◎"},
 settings:{title:"Settings",desc:"Configure system preferences and security.",icon:"⚙"}
};

const pageContent = document.getElementById("pageContent");
const breadcrumbCurrent = document.getElementById("breadcrumbCurrent");
const toast = document.getElementById("toast");
const modalBackdrop = document.getElementById("modalBackdrop");
const modalTitle = document.getElementById("modalTitle");
const modalBody = document.getElementById("modalBody");
let toastTimer;

function showToast(message){
  toast.textContent = message;
  toast.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(()=>toast.classList.remove("show"),2800);
}
function setActivePage(page){
  document.querySelectorAll(".nav-item").forEach(btn=>btn.classList.toggle("active",btn.dataset.page===page));
  breadcrumbCurrent.textContent = (pageMeta[page]||pageMeta.dashboard).title;
  if(page==="dashboard"){ location.hash=""; renderDashboard(); }
  else if(page==="students"){ location.hash=page; renderStudents(); }
  else if(page==="accounts"){ location.hash=page; renderAccounts(); }
  else { location.hash=page; renderPlaceholder(page); }
  closeSidebar();
}
function closeSidebar(){
  document.getElementById("sidebar").classList.remove("open");
  document.getElementById("sidebarBackdrop").classList.remove("show");
}
function renderDashboard(){
  pageContent.innerHTML = `
    <div class="welcome-row"><div><div class="eyebrow"><span class="eyebrow-line"></span> MONDAY, 25 NOVEMBER 2026</div><h1>Good evening, <em>Administrator.</em></h1><p class="page-intro">Here is the latest overview of your journey discipline system.</p></div><button class="button button-primary" data-action="add-student"><span>＋</span> Add student</button></div>
    <div class="notice-banner"><div class="notice-icon">✦</div><div><strong>Your command center is ready.</strong><span>This is a local preview with sample information. Connect Supabase in the next phase to save real records securely.</span></div><button class="notice-dismiss" aria-label="Dismiss notice">×</button></div>
    <div class="section-heading"><div><h2>System overview</h2><p>Weekly snapshot · Monday to Sunday</p></div><button class="button button-quiet" id="dateButton">This week <span>⌄</span></button></div>
    <div class="stats-grid">
      <article class="stat-card"><div class="stat-top"><span class="stat-label">Registered students</span><span class="stat-icon gold">♙</span></div><div class="stat-value" id="studentCount">18</div><div class="stat-foot"><span class="status-dot green"></span> Active student profiles</div></article>
      <article class="stat-card"><div class="stat-top"><span class="stat-label">Present this morning</span><span class="stat-icon blue">✓</span></div><div class="stat-value">16<span class="stat-unit">/ 18</span></div><div class="stat-foot"><span class="trend-up">88.9%</span> morning attendance</div></article>
      <article class="stat-card"><div class="stat-top"><span class="stat-label">Marks awarded</span><span class="stat-icon green">↗</span></div><div class="stat-value">+245</div><div class="stat-foot">Current weekly period</div></article>
      <article class="stat-card"><div class="stat-top"><span class="stat-label">Open incidents</span><span class="stat-icon red">!</span></div><div class="stat-value">03</div><div class="stat-foot"><span class="status-dot amber"></span> Awaiting administrator review</div></article>
    </div>
    <div class="dashboard-grid">
      <section class="panel performance-panel"><div class="panel-heading"><div><h3>Weekly performance</h3><p>Marks awarded across the current week</p></div><span class="panel-menu">•••</span></div><div class="chart-legend"><span><i class="legend-dot gold-dot"></i> Marks awarded</span><span><i class="legend-dot blue-dot"></i> Marks deducted</span></div><div class="chart-wrap"><div class="y-labels"><span>100</span><span>75</span><span>50</span><span>25</span><span>0</span></div><div class="chart"><div class="chart-grid"><i></i><i></i><i></i><i></i><i></i></div><div class="bars"><div class="bar-group"><div class="bar gold-bar" style="height:38%"></div><div class="bar blue-bar" style="height:12%"></div><span>Mon</span></div><div class="bar-group"><div class="bar gold-bar" style="height:58%"></div><div class="bar blue-bar" style="height:18%"></div><span>Tue</span></div><div class="bar-group"><div class="bar gold-bar" style="height:48%"></div><div class="bar blue-bar" style="height:10%"></div><span>Wed</span></div><div class="bar-group"><div class="bar gold-bar" style="height:76%"></div><div class="bar blue-bar" style="height:23%"></div><span>Thu</span></div><div class="bar-group"><div class="bar gold-bar" style="height:64%"></div><div class="bar blue-bar" style="height:15%"></div><span>Fri</span></div><div class="bar-group"><div class="bar gold-bar" style="height:45%"></div><div class="bar blue-bar" style="height:8%"></div><span>Sat</span></div><div class="bar-group muted-bars"><div class="bar gold-bar" style="height:8%"></div><div class="bar blue-bar" style="height:3%"></div><span>Sun</span></div></div></div></div><div class="chart-summary"><div><span class="summary-dot gold-dot"></span><strong>245</strong><small>Marks awarded</small></div><div><span class="summary-dot blue-dot"></span><strong>68</strong><small>Marks deducted</small></div><div><span class="summary-dot pale-dot"></span><strong>+177</strong><small>Net movement</small></div></div></section>
      <section class="panel session-panel"><div class="panel-heading"><div><h3>Journey sessions</h3><p>Daily journey activity</p></div><span class="live-label"><i></i> TODAY</span></div><div class="session-card morning"><div class="session-icon">☀</div><div class="session-main"><strong>Morning journey</strong><span>Home → Institute</span></div><span class="session-status completed">Completed</span><div class="session-meta"><span>16 present</span><span>08:10 AM</span></div></div><div class="session-card evening"><div class="session-icon">☾</div><div class="session-main"><strong>Evening journey</strong><span>Institute → Home</span></div><span class="session-status pending">Not started</span><div class="session-meta"><span>Session record pending</span><span>—</span></div></div><button class="button button-outline full-width" data-page="journeys">Manage journey sessions <span>→</span></button></section>
    </div>
    <div class="lower-grid"><section class="panel activity-panel"><div class="panel-heading"><div><h3>Recent activity</h3><p>Latest mark transactions and records</p></div><button class="text-button" data-page="ledger">View ledger →</button></div><div class="table-scroll"><table><thead><tr><th>STUDENT</th><th>ACTIVITY</th><th>SESSION</th><th>MARKS</th><th>TIME</th></tr></thead><tbody><tr><td><div class="student-cell"><span class="mini-avatar avatar-a">AR</span><strong>Ayaan R.</strong></div></td><td><span class="activity-type positive">Good cooperation</span></td><td>Morning</td><td class="positive-text">+10</td><td>08:22 AM</td></tr><tr><td><div class="student-cell"><span class="mini-avatar avatar-b">HM</span><strong>Hammad M.</strong></div></td><td><span class="activity-type negative">Noise disturbance</span></td><td>Morning</td><td class="negative-text">−5</td><td>08:19 AM</td></tr><tr><td><div class="student-cell"><span class="mini-avatar avatar-c">ZA</span><strong>Zayd A.</strong></div></td><td><span class="activity-type neutral">Appreciation</span></td><td>Morning</td><td class="positive-text">+5</td><td>08:15 AM</td></tr></tbody></table></div></section><section class="panel leaderboard-panel"><div class="panel-heading"><div><h3>Hall of excellence</h3><p>Weekly top performers</p></div><button class="text-button" data-page="leaderboard">View all →</button></div><div class="leader-row"><span class="rank rank-one">01</span><span class="mini-avatar avatar-a">AR</span><div class="leader-name"><strong>Ayaan R.</strong><span>Consistent performer</span></div><strong class="leader-score">+42</strong></div><div class="leader-row"><span class="rank">02</span><span class="mini-avatar avatar-c">ZA</span><div class="leader-name"><strong>Zayd A.</strong><span>Helpful attitude</span></div><strong class="leader-score">+36</strong></div><div class="leader-row"><span class="rank">03</span><span class="mini-avatar avatar-d">IA</span><div class="leader-name"><strong>Ibrahim A.</strong><span>Good cooperation</span></div><strong class="leader-score">+29</strong></div><div class="leader-note"><span>✦</span> Rankings are based on current-week marks.</div></section></div>
    <footer class="page-footer"><span>© 2026 DISCIPLINE. Built for better journeys.</span><span>LOCAL PREVIEW · NOT CONNECTED TO DATABASE</span></footer>`;
}

function escapeHTML(value){
  return String(value ?? "").replace(/[&<>"']/g, ch => ({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"}[ch]));
}

async function renderStudents(){
  const db = window.disciplineSupabase;
  pageContent.innerHTML = `
    <div class="registry-head">
      <div><div class="eyebrow"><span class="eyebrow-line"></span> WORKSPACE / STUDENTS</div><h1>Student Registry</h1><p class="page-intro">Manage student profiles and guardian contacts in the secure database.</p></div>
      <span class="demo-pill"><span class="pulse-dot"></span> ONLINE DATABASE</span>
    </div>
    <div class="registry-stats">
      <article class="stat-card"><div class="stat-label">Active students</div><div class="stat-value" id="activeStudentCount">—</div></article>
      <article class="stat-card"><div class="stat-label">Archived profiles</div><div class="stat-value" id="archivedStudentCount">—</div></article>
    </div>
    <section class="panel registry-panel">
      <div class="panel-heading"><div><h3 id="studentFormHeading">Register a student</h3><p>Guardian contact details are stored separately and visible only to administrators.</p></div></div>
      <form id="studentForm" class="registry-form">
        <input type="hidden" id="editingStudentId">
        <div class="form-grid">
          <div class="field"><label for="studentName">Student full name *</label><input id="studentName" required maxlength="100" placeholder="Enter full name"></div>
          <div class="field"><label for="studentCode">Student ID *</label><input id="studentCode" required maxlength="30" placeholder="e.g. STU-001"></div>
          <div class="field"><label for="studentClass">Class / group</label><input id="studentClass" maxlength="60" placeholder="e.g. Grade 8"></div>
          <div class="field"><label for="parentName">Parent / guardian name *</label><input id="parentName" required maxlength="100" placeholder="Parent or guardian"></div>
          <div class="field"><label for="parentPhone">Parent phone *</label><input id="parentPhone" type="tel" required maxlength="25" placeholder="Contact number"></div>
          <div class="field"><label for="parentEmail">Parent email</label><input id="parentEmail" type="email" maxlength="120" placeholder="parent@example.com"></div>
        </div>
        <div class="registry-form-actions"><button class="button button-primary" type="submit" id="studentSaveButton">Save student online</button><button class="button button-secondary" type="button" id="studentCancelEdit" hidden>Cancel edit</button></div>
        <p class="registry-disclaimer">Student records are saved to Supabase. Use genuine student details only after confirming your privacy and access settings. Parent login accounts are created separately; entering an email here does not invite a parent.</p>
      </form>
    </section>
    <section class="panel registry-panel">
      <div class="panel-heading"><div><h3>Student profiles</h3><p id="studentListCaption">Loading records…</p></div><input class="registry-search" id="studentSearch" type="search" placeholder="Search name, ID or class…" aria-label="Search students"></div>
      <div class="table-scroll"><table class="registry-table"><thead><tr><th>STUDENT</th><th>STUDENT ID</th><th>CLASS / GROUP</th><th>PARENT / GUARDIAN</th><th>CONTACT</th><th>STATUS</th><th>ACTIONS</th></tr></thead><tbody id="studentRows"></tbody></table></div>
      <p class="registry-empty" id="studentEmpty" hidden>No student profiles found.</p>
    </section>
    <footer class="page-footer"><span>© 2026 DISCIPLINE. Built for better journeys.</span><span>SUPABASE · ADMINISTRATOR ACCESS</span></footer>`;

  if(!db){ showToast("Database client is unavailable. Refresh and sign in again."); return; }
  const form=document.getElementById("studentForm");
  const rows=document.getElementById("studentRows");
  const search=document.getElementById("studentSearch");
  let records=[];

  function guardianOf(s){
    const g=Array.isArray(s.student_guardians)?s.student_guardians[0]:s.student_guardians;
    return g||{};
  }
  function drawRows(){
    const q=search.value.trim().toLowerCase();
    const list=records.filter(s=>s.is_active).filter(s=>{
      const g=guardianOf(s);
      return [s.full_name,s.student_code,s.class_group,g.guardian_name,g.phone,g.email].join(" ").toLowerCase().includes(q);
    });
    rows.innerHTML=list.map(s=>{
      const g=guardianOf(s);
      return `<tr>
        <td><strong>${escapeHTML(s.full_name)}</strong></td>
        <td>${escapeHTML(s.student_code)}</td>
        <td>${escapeHTML(s.class_group||"—")}</td>
        <td>${escapeHTML(g.guardian_name||"—")}</td>
        <td>${escapeHTML(g.phone||"—")}<small class="registry-email">${escapeHTML(g.email||"")}</small></td>
        <td><span class="session-status completed">Active</span></td>
        <td><div class="registry-actions"><button type="button" class="button button-quiet" data-edit-student="${escapeHTML(s.id)}">Edit</button><button type="button" class="button button-quiet registry-archive" data-archive-student="${escapeHTML(s.id)}">Archive</button></div></td>
      </tr>`;
    }).join("");
    document.getElementById("studentEmpty").hidden=list.length>0;
    document.getElementById("studentListCaption").textContent=list.length+" active profile(s)";
  }

  async function loadRecords(){
    rows.innerHTML='<tr><td colspan="7">Loading…</td></tr>';
    const {data,error}=await db.from("students")
      .select("id,student_code,full_name,class_group,is_active,created_at,student_guardians(guardian_name,phone,email)")
      .order("created_at",{ascending:false});
    if(error){
      rows.innerHTML='<tr><td colspan="7">Could not load records. Check your administrator session and database permissions.</td></tr>';
      showToast("Could not load students: "+error.message);
      return;
    }
    records=data||[];
    document.getElementById("activeStudentCount").textContent=records.filter(s=>s.is_active).length;
    document.getElementById("archivedStudentCount").textContent=records.filter(s=>!s.is_active).length;
    drawRows();
  }

  function resetForm(){
    form.reset();
    document.getElementById("editingStudentId").value="";
    document.getElementById("studentFormHeading").textContent="Register a student";
    document.getElementById("studentSaveButton").textContent="Save student online";
    document.getElementById("studentCancelEdit").hidden=true;
  }

  form.addEventListener("submit",async e=>{
    e.preventDefault();
    const id=document.getElementById("editingStudentId").value;
    const student={
      full_name:document.getElementById("studentName").value.trim(),
      student_code:document.getElementById("studentCode").value.trim(),
      class_group:document.getElementById("studentClass").value.trim()||null,
      is_active:true
    };
    const guardian={
      guardian_name:document.getElementById("parentName").value.trim(),
      phone:document.getElementById("parentPhone").value.trim(),
      email:document.getElementById("parentEmail").value.trim()||null
    };
    if(!student.full_name||!student.student_code||!guardian.guardian_name||!guardian.phone){
      showToast("Complete all required fields."); return;
    }
    const saveButton=document.getElementById("studentSaveButton");
    saveButton.disabled=true; saveButton.textContent="Saving…";
    let studentId=id;
    let studentError=null;
    if(id){
      const result=await db.from("students").update(student).eq("id",id).select("id").single();
      studentError=result.error;
    }else{
      const result=await db.from("students").insert(student).select("id").single();
      studentError=result.error;
      if(!studentError) studentId=result.data.id;
    }
    if(studentError){
      showToast(studentError.code==="23505"?"That student ID is already in use.":"Could not save student: "+studentError.message);
    }else{
      const guardianResult=await db.from("student_guardians").upsert(
        {...guardian,student_id:studentId},{onConflict:"student_id"}
      );
      if(guardianResult.error){
        showToast("Student profile saved, but guardian contact did not save. Please edit and retry. "+guardianResult.error.message);
      }else{
        resetForm();
        await loadRecords();
        showToast(id?"Student profile updated online.":"Student profile saved online.");
      }
    }
    saveButton.disabled=false;
    saveButton.textContent=id?"Update student online":"Save student online";
  });

  document.getElementById("studentCancelEdit").addEventListener("click",resetForm);
  search.addEventListener("input",drawRows);
  rows.addEventListener("click",async e=>{
    const edit=e.target.closest("[data-edit-student]");
    const archive=e.target.closest("[data-archive-student]");
    if(edit){
      const s=records.find(x=>x.id===edit.dataset.editStudent);
      if(!s)return;
      const g=guardianOf(s);
      document.getElementById("editingStudentId").value=s.id;
      document.getElementById("studentName").value=s.full_name||"";
      document.getElementById("studentCode").value=s.student_code||"";
      document.getElementById("studentClass").value=s.class_group||"";
      document.getElementById("parentName").value=g.guardian_name||"";
      document.getElementById("parentPhone").value=g.phone||"";
      document.getElementById("parentEmail").value=g.email||"";
      document.getElementById("studentFormHeading").textContent="Edit student profile";
      document.getElementById("studentSaveButton").textContent="Update student online";
      document.getElementById("studentCancelEdit").hidden=false;
      document.getElementById("studentName").focus();
      pageContent.querySelector(".registry-form").scrollIntoView({behavior:"smooth",block:"center"});
    }
    if(archive){
      const s=records.find(x=>x.id===archive.dataset.archiveStudent);
      if(!s||!confirm("Archive "+s.full_name+"'s profile? The record and history will remain in the database."))return;
      const {error}=await db.from("students").update({is_active:false}).eq("id",s.id);
      if(error){showToast("Could not archive student: "+error.message);return;}
      await loadRecords(); showToast("Student profile archived. History retained.");
    }
  });
  await loadRecords();
}


async function renderAccounts(){
  if(!window.disciplineSupabase){pageContent.innerHTML='<section class="panel"><h2>Portal Accounts</h2><p>Authentication is not ready. Please refresh the page.</p></section>';return;}
  pageContent.innerHTML=`
    <div class="welcome-row"><div><div class="eyebrow"><span class="eyebrow-line"></span> ADMINISTRATION / ACCESS CONTROL</div><h1>Portal Accounts</h1><p class="page-intro">Create secure sign-in accounts and link each person to the correct student profile.</p></div></div>
    <section class="panel registry-panel">
      <div class="panel-heading"><div><h3>Create a portal account</h3><p>An invitation email will be sent so the user can set their own password.</p></div></div>
      <form id="portalAccountForm">
        <div class="form-grid">
          <div class="field"><label for="portalRole">Account type</label><select id="portalRole" required><option value="student">Student</option><option value="parent">Parent / Guardian</option></select></div>
          <div class="field"><label for="portalName">Full name</label><input id="portalName" required maxlength="100" placeholder="Enter full name"></div>
          <div class="field"><label for="portalEmail">Email address</label><input id="portalEmail" type="email" required maxlength="254" placeholder="name@example.com"></div>
          <div class="field"><label for="portalStudent">Link to student</label><select id="portalStudent" required><option value="">Loading student profiles…</option></select></div>
        </div>
        <div class="notice-banner" style="margin-top:16px"><div class="notice-icon">i</div><div><strong>Account security</strong><span>Users receive an invitation email and create their own password. Never enter or share their password here.</span></div></div>
        <div class="modal-actions"><button class="button button-primary" id="createPortalAccount" type="submit">Send invitation</button></div>
        <p id="portalAccountMessage" class="auth-message" role="status"></p>
      </form>
    </section>
    <section class="panel registry-panel"><div class="panel-heading"><div><h3>Before inviting</h3><p>Check these items to avoid linking the wrong family.</p></div></div><ul class="simple-list"><li>Register the student first in Student Registry.</li><li>Use an email address the student or parent can access.</li><li>Create a separate parent account for each parent email.</li><li>A parent account can be linked to one student in this first release.</li></ul></section>
    <footer class="page-footer"><span>© 2026 DISCIPLINE.</span><span>SECURE ACCOUNT PROVISIONING</span></footer>`;
  const select=document.getElementById("portalStudent");
  const {data:students,error}=await window.disciplineSupabase.from("students").select("id,student_code,full_name,class_group").eq("is_active",true).order("full_name");
  if(error){select.innerHTML='<option value="">Could not load students</option>';document.getElementById("portalAccountMessage").textContent=error.message;return;}
  select.innerHTML='<option value="">Choose a student</option>'+(students||[]).map(s=>'<option value="'+s.id+'">'+escapeHTML(s.student_code)+' — '+escapeHTML(s.full_name)+(s.class_group?' ('+escapeHTML(s.class_group)+')':'')+'</option>').join("");
  document.getElementById("portalRole").addEventListener("change",()=>{document.getElementById("portalStudent").value="";});
  document.getElementById("portalAccountForm").addEventListener("submit",async e=>{
    e.preventDefault();
    const btn=document.getElementById("createPortalAccount"),msg=document.getElementById("portalAccountMessage");
    btn.disabled=true;btn.textContent="Sending invitation…";msg.textContent="";
    const payload={role:document.getElementById("portalRole").value,display_name:document.getElementById("portalName").value.trim(),email:document.getElementById("portalEmail").value.trim(),student_id:select.value};
    const {data,error}=await window.disciplineSupabase.functions.invoke("create-portal-account",{body:payload});
    if(error||!data||!data.success){msg.textContent=(data&&data.error)||error?.message||"Could not create account. Please try again.";}
    else {msg.style.color="#7ed6a5";msg.textContent="Invitation sent to "+data.email+". The user must open the email and set a password.";e.target.reset();}
    btn.disabled=false;btn.textContent="Send invitation";
  });
}

function renderPlaceholder(page){
  const meta=pageMeta[page]||pageMeta.dashboard;
  const cards = {
    students:[["♙","Student profiles","Register, edit and archive student records."],["⌕","Find a student","Search by name, class or student reference."],["▤","Student history","Review individual weekly and lifetime records."]],
    parents:[["♧","Parent accounts","Create and manage parent login accounts."],["↔","Family links","Connect each parent to the correct student profile."],["▣","Parent access","Preview the private parent reporting experience."]],
    attendance:[["✓","Morning register","Mark students present or absent for the morning journey."],["◷","Attendance history","Review previous attendance records."],["％","Attendance summary","View attendance rates and patterns."]],
    journeys:[["☀","Morning journey","Home → Institute. Manage session activity."],["☾","Evening journey","Institute → Home. Record return journey activity."],["◷","Session history","Review completed and closed journey sessions."]],
    marks:[["＋","Award marks","Reward respectful, helpful and responsible behaviour."],["−","Deduct marks","Record proportionate deductions with clear reasons."],["▤","Transaction history","Keep a traceable record of every mark change."]],
    dedications:[["⇄","Transfer marks","Move marks from one student's balance to another."],["✦","Appreciation marks","Recognise another student without reducing the giver's balance."],["✓","Approval queue","Review and approve dedication requests."]],
    leaderboard:[["♜","Weekly champions","Rank students by their current Monday–Sunday balance."],["↗","Most improved","Highlight positive progress over the previous week."],["∞","Lifetime excellence","Preserve historical achievements and accumulated records."]],
    ledger:[["▤","All transactions","Search awards, deductions and dedications."],["⌕","Filters","Filter by student, date, session or transaction type."],["↶","Corrections","Record corrections with an audit trail."]],
    incidents:[["!","New incident","Record what happened, when and during which journey."],["✎","Exact language","Enter verified words with context and attribution."],["◉","Audio transcription","Review a permitted recording's draft transcript before saving."]],
    analytics:[["⌁","Weekly trends","Compare awards, deductions and net marks."],["♙","Student progress","Review individual improvement over time."],["▥","Attendance patterns","Understand morning attendance trends."]],
    reports:[["▧","Weekly parent reports","Prepare clear, respectful summaries for each family."],["✦","Certificates","Recognise improvement, cooperation and achievement."],["⇩","Export","Prepare printable reports for distribution."]],
    portals:[["♙","Student portal preview","See the view-only student experience."],["♧","Parent portal preview","See private child-specific results and incident reports."],["⌁","Access permissions","Review the intended role-based access model."]],
    settings:[["◷","Weekly scoring","Monday 12:00 AM to Sunday 11:59 PM, Asia/Kolkata."],["♧","User permissions","Administrator control with restricted student and parent access."],["◇","Supabase connection","Backend setup will be completed in a later phase."]]
  }[page] || [];
  pageContent.innerHTML=`<div class="page-placeholder"><div class="eyebrow"><span class="eyebrow-line"></span> DISCIPLINE WORKSPACE</div><div class="placeholder-hero"><h1>${meta.title}</h1><p>${meta.desc} This section is part of the Phase 1 interface preview. Its live data and workflows will be implemented in later development phases.</p><span class="demo-pill"><span class="pulse-dot"></span> INTERFACE PREVIEW</span></div><div class="placeholder-grid">${cards.map(c=>`<article class="placeholder-card"><div class="card-icon">${c[0]}</div><h3>${c[1]}</h3><p>${c[2]}</p></article>`).join("")}</div><div class="panel" style="margin-top:16px"><div class="panel-heading"><div><h3>Development note</h3><p>What happens next</p></div><span class="session-status pending">Coming in next phases</span></div><p style="font-size:11px;color:var(--muted);margin:0">This is a navigation and design preview only. No student, parent, attendance, mark or incident record is being saved yet. The Supabase database and secure role permissions will be connected after the interface is approved.</p></div><footer class="page-footer"><span>© 2026 DISCIPLINE. Built for better journeys.</span><span>LOCAL PREVIEW · NOT CONNECTED TO DATABASE</span></footer></div>`;
}
function openModal(type){
  const configs={
    "add-student":{title:"Add student",fields:[["Student full name","text","Full name"],["Student reference","text","e.g. STU-001"],["Class / group","text","Class or group"],["Parent name","text","Parent or guardian"],["Parent email","email","parent@example.com"]]},
    "award":{title:"Award marks",fields:[["Student name","text","Select student"],["Marks to award","number","e.g. 5"],["Reason","text","Reason for recognition"],["Journey session","text","Morning or evening"]]},
    "incident":{title:"Record an incident",fields:[["Student name","text","Select student"],["Incident category","text","e.g. Noise / language / safety"],["Exact words (if relevant)","text","Enter only verified words"],["Deduction marks","number","e.g. 5"],["Description","textarea","Describe what happened factually."]]}
  };
  const cfg=configs[type]||configs["add-student"];
  modalTitle.textContent=cfg.title;
  modalBody.innerHTML=`<form id="demoForm"><div class="form-grid">${cfg.fields.map(f=>`<div class="field ${f[1]==="textarea"?"full":""}"><label>${f[0]}</label>${f[1]==="textarea"?`<textarea placeholder="${f[2]}"></textarea>`:`<input type="${f[1]}" placeholder="${f[2]}" ${f[1]==="number"?'min="1"':''}>`}</div>`).join("")}</div><div class="modal-actions"><button type="button" class="button button-secondary" id="cancelModal">Cancel</button><button type="submit" class="button button-primary">Save preview</button></div><p style="font-size:9px;color:#8190a2;margin:12px 0 0">Demonstration only. This form does not save to a database.</p></form>`;
  modalBackdrop.classList.add("open");
  document.getElementById("cancelModal").addEventListener("click",closeModal);
  document.getElementById("demoForm").addEventListener("submit",e=>{e.preventDefault();closeModal();showToast("Preview only — database connection comes in a later phase.");});
}
function closeModal(){modalBackdrop.classList.remove("open");}
document.addEventListener("click",e=>{
  const pageBtn=e.target.closest("[data-page]");
  const actionBtn=e.target.closest("[data-action]");
  if(pageBtn)setActivePage(pageBtn.dataset.page);
  if(actionBtn)openModal(actionBtn.dataset.action);
  if(e.target.closest(".notice-dismiss"))e.target.closest(".notice-banner").remove();
  if(e.target.closest("#dateButton"))showToast("Weekly period: Monday to Sunday · Asia/Kolkata");
  if(e.target.closest("#notificationButton"))showToast("No live notifications in local preview.");
});
document.querySelectorAll(".nav-item").forEach(btn=>btn.addEventListener("click",()=>setActivePage(btn.dataset.page)));
document.getElementById("menuToggle").addEventListener("click",()=>{document.getElementById("sidebar").classList.add("open");document.getElementById("sidebarBackdrop").classList.add("show");});
document.getElementById("closeSidebar").addEventListener("click",closeSidebar);
document.getElementById("sidebarBackdrop").addEventListener("click",closeSidebar);
document.getElementById("modalClose").addEventListener("click",closeModal);
modalBackdrop.addEventListener("click",e=>{if(e.target===modalBackdrop)closeModal();});
document.addEventListener("keydown",e=>{if(e.key==="Escape"){closeModal();closeSidebar();}});
const hash=location.hash.replace("#","");
if(hash&&pageMeta[hash])setActivePage(hash);
