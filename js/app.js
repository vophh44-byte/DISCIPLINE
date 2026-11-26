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
  if(!pageMeta[page]) page="dashboard";
  document.querySelectorAll(".nav-item").forEach(btn=>btn.classList.toggle("active",btn.dataset.page===page));
  breadcrumbCurrent.textContent=(pageMeta[page]||pageMeta.dashboard).title;
  location.hash=page==="dashboard"?"":page;
  const renderers={
    dashboard:renderDashboard,students:renderStudents,parents:renderParents,accounts:renderAccounts,
    attendance:renderAttendance,journeys:renderJourneys,marks:renderMarks,dedications:renderDedications,
    leaderboard:renderLeaderboard,ledger:renderLedger,incidents:renderIncidents,
    analytics:renderAnalytics,reports:renderWeeklyReports,portals:renderPortals,settings:renderSettings
  };
  try{
    const task=(renderers[page]||(()=>renderPlaceholder(page)))();
    if(task&&typeof task.catch==="function") task.catch(error=>showPageError(error));
  }catch(error){showPageError(error);}
  closeSidebar();
}
function showPageError(error){
  const message=error&&error.message?error.message:String(error||"Unknown error");
  console.error("DISCIPLINE page error:",error);
  if(pageContent) pageContent.innerHTML='<section class="panel registry-panel"><h2>Page could not be loaded</h2><p>'+escapeHTML(message)+'</p><button class="button button-primary" data-page="dashboard">Return to Command Center</button></section>';
  showToast("Page error: "+message);
}
function closeSidebar(){
  document.getElementById("sidebar").classList.remove("open");
  document.getElementById("sidebarBackdrop").classList.remove("show");
}

async function renderDashboard(){
 const db=window.disciplineSupabase;
 pageContent.innerHTML='<div class="welcome-row"><div><div class="eyebrow">DISCIPLINE / ADMINISTRATION</div><h1>Command Center</h1><p class="page-intro">Live overview of your student journey system.</p></div><button class="button button-primary" data-page="students">Student Registry</button></div><div class="stats-grid"><article class="stat-card"><div class="stat-label">Active students</div><div class="stat-value" id="dashStudents">—</div></article><article class="stat-card"><div class="stat-label">Present this morning</div><div class="stat-value" id="dashAttendance">—</div></article><article class="stat-card"><div class="stat-label">Marks awarded this week</div><div class="stat-value" id="dashAwards">—</div></article><article class="stat-card"><div class="stat-label">Marks deducted this week</div><div class="stat-value" id="dashDeductions">—</div></article></div><section class="panel registry-panel"><div class="panel-heading"><div><h3>Recent mark activity</h3><p>Latest saved transactions from Supabase</p></div><button class="text-button" data-page="marks">Manage marks →</button></div><div class="table-scroll"><table class="registry-table"><thead><tr><th>STUDENT</th><th>TYPE</th><th>REASON</th><th>CHANGE</th><th>DATE</th></tr></thead><tbody id="dashRecent"><tr><td colspan="5">Loading…</td></tr></tbody></table></div></section><section class="panel registry-panel"><div class="panel-heading"><div><h3>Quick actions</h3><p>Open the live administrator tools</p></div></div><div class="attendance-actions"><button class="button button-outline" data-page="attendance">Morning Attendance</button><button class="button button-outline" data-page="marks">Award & Deduct Marks</button><button class="button button-outline" data-page="dedications">Dedication Hall</button><button class="button button-outline" data-page="reports">Weekly Results</button></div></section><footer class="page-footer"><span>© 2026 DISCIPLINE.</span><span>LIVE ADMINISTRATOR WORKSPACE</span></footer>';
 if(!db){pageContent.insertAdjacentHTML("beforeend",'<p class="registry-disclaimer">Database client is not ready. Refresh the page after signing in.</p>');return;}
 try{
  const today=disciplineToday(),week=disciplineMonday(today),next=new Date(week+"T12:00:00");next.setDate(next.getDate()+7);
  const weekEnd=next.getFullYear()+"-"+String(next.getMonth()+1).padStart(2,"0")+"-"+String(next.getDate()).padStart(2,"0");
  const [students,session,weeklyTx,recent]=await Promise.all([
   db.from("students").select("id",{count:"exact",head:true}).eq("is_active",true),
   db.from("journey_sessions").select("id").eq("session_type","morning").eq("session_date",today).maybeSingle(),
   db.from("mark_transactions").select("transaction_type,amount,balance_delta").gte("occurred_at",week+"T00:00:00+05:30").lt("occurred_at",weekEnd+"T00:00:00+05:30"),
   db.from("mark_transactions").select("transaction_type,amount,balance_delta,reason,occurred_at,students(full_name,student_code)").order("occurred_at",{ascending:false}).limit(8)
  ]);
  if(students.error)throw students.error;if(session.error)throw session.error;if(weeklyTx.error)throw weeklyTx.error;if(recent.error)throw recent.error;
  document.getElementById("dashStudents").textContent=students.count??0;
  if(session.data){
   const at=await db.from("attendance").select("status").eq("session_id",session.data.id);
   if(at.error)throw at.error;
   const present=(at.data||[]).filter(x=>x.status==="present"||x.status==="late").length;
   document.getElementById("dashAttendance").textContent=present+" / "+(at.data||[]).length;
  }else document.getElementById("dashAttendance").textContent="Not started";
  const tx=weeklyTx.data||[];
  document.getElementById("dashAwards").textContent=tx.filter(x=>x.transaction_type==="award").reduce((n,x)=>n+x.amount,0);
  document.getElementById("dashDeductions").textContent=tx.filter(x=>x.transaction_type==="deduction").reduce((n,x)=>n+x.amount,0);
  document.getElementById("dashRecent").innerHTML=(recent.data||[]).map(x=>'<tr><td>'+escapeHTML(x.students?.full_name||"Student")+'<small class="registry-email">'+escapeHTML(x.students?.student_code||"")+'</small></td><td>'+escapeHTML(x.transaction_type)+'</td><td>'+escapeHTML(x.reason||"—")+'</td><td class="'+(x.balance_delta>0?"positive-text":"negative-text")+'">'+(x.balance_delta>0?"+":"")+x.balance_delta+'</td><td>'+escapeHTML(new Date(x.occurred_at).toLocaleString("en-IN"))+'</td></tr>').join("")||'<tr><td colspan="5">No mark transactions have been recorded yet.</td></tr>';
 }catch(e){showToast("Dashboard could not load live data: "+e.message);document.getElementById("dashRecent").innerHTML='<tr><td colspan="5">Could not load live records. Check your connection and refresh.</td></tr>';}
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

function disciplineToday(){
 const p=new Intl.DateTimeFormat("en-CA",{timeZone:"Asia/Kolkata",year:"numeric",month:"2-digit",day:"2-digit"}).formatToParts(new Date()),v={};
 p.forEach(x=>v[x.type]=x.value);return v.year+"-"+v.month+"-"+v.day;
}
async function disciplineAdminId(db){
 const r=await db.auth.getUser();if(r.error||!r.data.user)throw new Error("Please sign in again.");return r.data.user.id;
}
async function disciplineSession(db,type,date,create){
 let r=await db.from("journey_sessions").select("*").eq("session_type",type).eq("session_date",date).maybeSingle();
 if(r.error)throw r.error;
 if(!r.data&&create){
  const uid=await disciplineAdminId(db);
  r=await db.from("journey_sessions").insert({session_type:type,session_date:date,created_by:uid,starts_at:new Date().toISOString()}).select("*").single();
  if(r.error?.code==="23505") r=await db.from("journey_sessions").select("*").eq("session_type",type).eq("session_date",date).single();
  if(r.error)throw r.error;
 }
 return r.data;
}
async function renderAttendance(){
 const db=window.disciplineSupabase;
 pageContent.innerHTML='<div class="registry-head"><div><div class="eyebrow">WORKSPACE / DAILY REGISTER</div><h1>Morning Attendance</h1><p class="page-intro">Home → Institute · Record each student once per morning session.</p></div></div><section class="panel registry-panel"><div class="attendance-toolbar"><div class="field"><label for="attendanceDate">Date</label><input id="attendanceDate" type="date" value="'+disciplineToday()+'"></div><div class="attendance-actions"><button class="button button-outline" id="startMorningSession">Start morning register</button><button class="button button-primary" id="saveAttendance" disabled>Save attendance</button></div></div><p id="attendanceInfo" class="registry-disclaimer">Loading…</p></section><section class="panel registry-panel"><div class="panel-heading"><h3>Student register</h3><input class="registry-search" id="attendanceSearch" placeholder="Search students…"></div><div class="table-scroll"><table class="registry-table attendance-table"><thead><tr><th>STUDENT</th><th>ID</th><th>CLASS</th><th>STATUS</th><th>NOTE</th></tr></thead><tbody id="attendanceRows"></tbody></table></div></section>';
 if(!db){showToast("Database is unavailable.");return;}
 const sr=await db.from("students").select("id,student_code,full_name,class_group").eq("is_active",true).order("full_name");
 if(sr.error){showToast(sr.error.message);return;}
 const students=sr.data||[],rows=document.getElementById("attendanceRows"),date=document.getElementById("attendanceDate"),info=document.getElementById("attendanceInfo"),save=document.getElementById("saveAttendance"),start=document.getElementById("startMorningSession");
 let session=null,existing={};
 function draw(){
  const q=document.getElementById("attendanceSearch").value.toLowerCase();
  rows.innerHTML=students.filter(x=>(x.full_name+" "+x.student_code+" "+(x.class_group||"")).toLowerCase().includes(q)).map(x=>{
   const a=existing[x.id]||{},disabled=!session||session.ends_at?"disabled":"";
   return '<tr><td><strong>'+escapeHTML(x.full_name)+'</strong></td><td>'+escapeHTML(x.student_code)+'</td><td>'+escapeHTML(x.class_group||"—")+'</td><td><select '+disabled+' data-status="'+x.id+'"><option value="">Not marked</option>'+["present","absent","late","excused"].map(v=>'<option value="'+v+'" '+(a.status===v?"selected":"")+'>'+v.charAt(0).toUpperCase()+v.slice(1)+'</option>').join("")+'</select></td><td><input '+disabled+' data-note="'+x.id+'" maxlength="300" value="'+escapeHTML(a.notes||"")+'" placeholder="Optional"></td></tr>';
  }).join("");
  save.disabled=!session||!!session.ends_at;
 }
 async function load(){
  try{
   session=await disciplineSession(db,"morning",date.value,false);existing={};
   if(session){const a=await db.from("attendance").select("student_id,status,notes").eq("session_id",session.id);if(a.error)throw a.error;(a.data||[]).forEach(x=>existing[x.student_id]=x);}
   info.textContent=session?"Session: "+(session.ends_at?"Closed":"Open")+" · "+Object.keys(existing).length+" saved records": "No session yet. Start the register to begin.";
   start.disabled=!!session;start.textContent=session?"Session created":"Start morning register";draw();
  }catch(e){info.textContent="Could not load: "+e.message;}
 }
 start.addEventListener("click",async()=>{start.disabled=true;try{await disciplineSession(db,"morning",date.value,true);await load();showToast("Morning register started.");}catch(e){start.disabled=false;showToast(e.message);}});
 date.addEventListener("change",load);document.getElementById("attendanceSearch").addEventListener("input",draw);
 save.addEventListener("click",async()=>{
  save.disabled=true;save.textContent="Saving…";
  try{const uid=await disciplineAdminId(db),records=[];students.forEach(x=>{const status=rows.querySelector('[data-status="'+x.id+'"]')?.value,notes=rows.querySelector('[data-note="'+x.id+'"]')?.value.trim();if(status)records.push({student_id:x.id,session_id:session.id,status,notes:notes||null,recorded_by:uid});});
   if(!records.length)throw new Error("Choose a status for at least one student.");
   const r=await db.from("attendance").upsert(records,{onConflict:"student_id,session_id"});if(r.error)throw r.error;
   await load();showToast(records.length+" attendance records saved.");
  }catch(e){showToast("Save failed: "+e.message);}finally{save.textContent="Save attendance";draw();}
 });
 await load();
}
async function renderJourneys(){
 const db=window.disciplineSupabase;
 pageContent.innerHTML='<div class="registry-head"><div><div class="eyebrow">WORKSPACE / JOURNEY CONTROL</div><h1>Journey Sessions</h1><p class="page-intro">Control the morning and evening journey registers.</p></div></div><section class="panel registry-panel"><div class="field"><label for="journeyDate">Session date</label><input id="journeyDate" type="date" value="'+disciplineToday()+'"></div></section><div class="journey-management-grid">'+["morning","evening"].map(t=>'<section class="panel registry-panel journey-management-card"><div class="session-icon">'+(t==="morning"?"☀":"☾")+'</div><h3>'+(t==="morning"?"Morning · Home → Institute":"Evening · Institute → Home")+'</h3><div id="'+t+'Status" class="journey-status">Loading…</div><p id="'+t+'Time" class="journey-time"></p><button class="button button-primary" id="'+t+'Action">Loading…</button></section>').join("")+'</div>';
 if(!db){showToast("Database is unavailable.");return;}
 async function refresh(){
  const d=document.getElementById("journeyDate").value;
  for(const t of ["morning","evening"]){
   const s=await disciplineSession(db,t,d,false),status=document.getElementById(t+"Status"),time=document.getElementById(t+"Time"),btn=document.getElementById(t+"Action");
   status.textContent=!s?"Not created":s.ends_at?"Closed":"In progress";status.className="journey-status "+(!s?"is-pending":s.ends_at?"is-closed":"is-open");
   time.textContent=s?"Started: "+(s.starts_at?new Date(s.starts_at).toLocaleTimeString("en-IN",{hour:"2-digit",minute:"2-digit"}):"—")+" · Ended: "+(s.ends_at?new Date(s.ends_at).toLocaleTimeString("en-IN",{hour:"2-digit",minute:"2-digit"}):"—"):"No session record";
   btn.textContent=!s?"Start session":s.ends_at?"Session closed":"Close session";btn.disabled=!!s?.ends_at;btn.dataset.exists=s?"yes":"no";
  }
 }
 document.getElementById("journeyDate").addEventListener("change",()=>refresh().catch(e=>showToast(e.message)));
 for(const t of ["morning","evening"])document.getElementById(t+"Action").addEventListener("click",async e=>{
  const btn=e.currentTarget,d=document.getElementById("journeyDate").value;btn.disabled=true;
  try{const s=await disciplineSession(db,t,d,false);if(!s){await disciplineSession(db,t,d,true);showToast(t+" session started.");}
   else{const r=await db.from("journey_sessions").update({ends_at:new Date().toISOString()}).eq("id",s.id);if(r.error)throw r.error;showToast(t+" session closed.");}await refresh();
  }catch(err){showToast(err.message);btn.disabled=false;}
 });
 try{await refresh();}catch(e){showToast("Could not load sessions: "+e.message);}
}

async function renderMarks(){
 const db=window.disciplineSupabase;
 pageContent.innerHTML='<div class="registry-head"><div><div class="eyebrow">WORKSPACE / MARK MANAGEMENT</div><h1>Award & Deduct Marks</h1><p class="page-intro">Record verified awards and deductions. Every entry keeps an auditable before-and-after balance.</p></div><span class="demo-pill"><span class="pulse-dot"></span> LIVE DATABASE</span></div><section class="panel registry-panel"><div class="panel-heading"><div><h3>Record a mark transaction</h3><p>Only administrators can create mark transactions.</p></div></div><form id="markEntryForm"><div class="form-grid"><div class="field"><label for="markStudent">Student *</label><select id="markStudent" required><option value="">Loading students…</option></select></div><div class="field"><label for="markType">Transaction type *</label><select id="markType" required><option value="award">Award marks (+)</option><option value="deduction">Deduct marks (−)</option></select></div><div class="field"><label for="markAmount">Number of marks *</label><input id="markAmount" type="number" min="1" max="10000" step="1" required placeholder="e.g. 5"></div><div class="field"><label for="markSession">Journey session (optional)</label><select id="markSession"><option value="">Not linked to a session</option></select></div><div class="field full"><label for="markReason">Reason / explanation *</label><textarea id="markReason" rows="3" maxlength="500" required placeholder="Write a clear, factual reason (3–500 characters)"></textarea></div></div><div class="registry-form-actions"><button class="button button-primary" id="saveMarkButton" type="submit">Save mark transaction</button><span id="markFormMessage" class="registry-disclaimer" role="status"></span></div></form></section><section class="panel registry-panel"><div class="panel-heading"><div><h3>Student mark balances</h3><p>Balances are calculated from starting marks and all saved transactions.</p></div><input class="registry-search" id="markStudentSearch" type="search" placeholder="Search students…"></div><div class="table-scroll"><table class="registry-table"><thead><tr><th>STUDENT</th><th>STUDENT ID</th><th>STARTING MARKS</th><th>LIFETIME BALANCE</th></tr></thead><tbody id="markBalanceRows"><tr><td colspan="4">Loading…</td></tr></tbody></table></div></section><section class="panel registry-panel"><div class="panel-heading"><div><h3>Recent transactions</h3><p>Latest 50 saved mark entries.</p></div></div><div class="table-scroll"><table class="registry-table"><thead><tr><th>DATE</th><th>STUDENT</th><th>TYPE</th><th>REASON</th><th>CHANGE</th><th>BALANCE AFTER</th></tr></thead><tbody id="markHistoryRows"><tr><td colspan="6">Loading…</td></tr></tbody></table></div></section>';
 if(!db){showToast("Database is unavailable.");return;}
 const studentSelect=document.getElementById("markStudent"),sessionSelect=document.getElementById("markSession"),balanceRows=document.getElementById("markBalanceRows"),historyRows=document.getElementById("markHistoryRows");
 const sr=await db.from("students").select("id,student_code,full_name,class_group,starting_marks").eq("is_active",true).order("full_name");
 if(sr.error){showToast("Could not load students: "+sr.error.message);return;}
 const students=sr.data||[];
 studentSelect.innerHTML='<option value="">Choose a student</option>'+students.map(x=>'<option value="'+x.id+'">'+escapeHTML(x.student_code)+' — '+escapeHTML(x.full_name)+'</option>').join("");
 const today=disciplineToday(),jr=await db.from("journey_sessions").select("id,session_type,session_date").eq("session_date",today).order("session_type");
 if(!jr.error)(jr.data||[]).forEach(x=>{const o=document.createElement("option");o.value=x.id;o.textContent=(x.session_type==="morning"?"Morning":"Evening")+" · "+x.session_date;sessionSelect.appendChild(o);});
 async function loadMarkData(){
  const [tr,allTx]=await Promise.all([
   db.from("mark_transactions").select("id,student_id,transaction_type,amount,balance_delta,reason,balance_before,balance_after,occurred_at,students(full_name,student_code)").order("occurred_at",{ascending:false}).limit(50),
   db.from("mark_transactions").select("student_id,balance_delta")
  ]);
  if(tr.error||allTx.error){showToast("Could not load mark history: "+(tr.error||allTx.error).message);return;}
  const sums={};(allTx.data||[]).forEach(t=>sums[t.student_id]=(sums[t.student_id]||0)+t.balance_delta);
  const q=document.getElementById("markStudentSearch").value.trim().toLowerCase();
  balanceRows.innerHTML=students.filter(x=>(x.full_name+" "+x.student_code).toLowerCase().includes(q)).map(x=>'<tr><td><strong>'+escapeHTML(x.full_name)+'</strong></td><td>'+escapeHTML(x.student_code)+'</td><td>'+x.starting_marks+'</td><td><strong>'+((x.starting_marks||0)+(sums[x.id]||0))+'</strong></td></tr>').join("")||'<tr><td colspan="4">No matching active students.</td></tr>';
  historyRows.innerHTML=(tr.data||[]).map(t=>'<tr><td>'+escapeHTML(new Date(t.occurred_at).toLocaleString("en-IN"))+'</td><td>'+escapeHTML(t.students?.full_name||"Student")+'<small class="registry-email">'+escapeHTML(t.students?.student_code||"")+'</small></td><td>'+escapeHTML(t.transaction_type)+'</td><td>'+escapeHTML(t.reason)+'</td><td class="'+(t.balance_delta>0?"positive-text":"negative-text")+'">'+(t.balance_delta>0?"+":"")+t.balance_delta+'</td><td>'+t.balance_after+'</td></tr>').join("")||'<tr><td colspan="6">No mark records yet.</td></tr>';
 }
 document.getElementById("markStudentSearch").addEventListener("input",loadMarkData);
 document.getElementById("markEntryForm").addEventListener("submit",async e=>{
  e.preventDefault();const btn=document.getElementById("saveMarkButton"),msg=document.getElementById("markFormMessage");
  btn.disabled=true;btn.textContent="Saving securely…";msg.textContent="";
  const args={p_student_id:studentSelect.value,p_transaction_type:document.getElementById("markType").value,p_amount:Number(document.getElementById("markAmount").value),p_reason:document.getElementById("markReason").value.trim(),p_session_id:sessionSelect.value||null};
  try{
   const result=await db.rpc("admin_record_mark",args);if(result.error)throw result.error;
   e.target.reset();await loadMarkData();msg.textContent="Saved successfully. New balance: "+result.data.balance_after;showToast("Mark transaction saved.");
  }catch(err){msg.textContent="Not saved: "+err.message;showToast("Could not save marks: "+err.message);}
  finally{btn.disabled=false;btn.textContent="Save mark transaction";}
 });
 await loadMarkData();
}

async function renderDedications(){
 const db=window.disciplineSupabase;
 pageContent.innerHTML='<div class="registry-head"><div><div class="eyebrow">WORKSPACE / DEDICATION HALL</div><h1>Dedication Hall</h1><p class="page-intro">Encourage generosity, recognition and positive student relationships.</p></div><span class="demo-pill"><span class="pulse-dot"></span> LIVE DATABASE</span></div><section class="panel registry-panel"><div class="panel-heading"><div><h3>Create a dedication</h3><p>Choose a transfer or appreciation entry. Both are recorded in the permanent mark ledger.</p></div></div><form id="dedicationForm"><div class="form-grid"><div class="field"><label for="dedicationMode">Dedication type *</label><select id="dedicationMode"><option value="transfer">Transfer marks — giver loses marks</option><option value="appreciation">Appreciation — recipient gains marks</option></select></div><div class="field" id="dedicationFromWrap"><label for="dedicationFrom">Giving / appreciating student</label><select id="dedicationFrom"><option value="">Choose student</option></select><small id="dedicationFromHelp" class="registry-disclaimer">For transfers, this student&#39;s balance will decrease.</small></div><div class="field"><label for="dedicationTo">Recipient student *</label><select id="dedicationTo" required><option value="">Choose student</option></select></div><div class="field"><label for="dedicationAmount">Marks *</label><input id="dedicationAmount" type="number" min="1" max="10000" step="1" required placeholder="e.g. 3"></div><div class="field full"><label for="dedicationReason">Reason / message *</label><textarea id="dedicationReason" rows="3" maxlength="500" required placeholder="Explain the reason for this dedication (3–500 characters)"></textarea></div></div><div class="registry-form-actions"><button class="button button-primary" id="saveDedication" type="submit">Save dedication</button><span id="dedicationMessage" class="registry-disclaimer" role="status"></span></div></form></section><section class="panel registry-panel"><div class="panel-heading"><div><h3>Recent dedication records</h3><p>Transfers and appreciation marks from the live ledger.</p></div></div><div class="table-scroll"><table class="registry-table"><thead><tr><th>DATE</th><th>STUDENT</th><th>TYPE</th><th>DETAIL</th><th>MARKS</th><th>BALANCE AFTER</th></tr></thead><tbody id="dedicationHistory"><tr><td colspan="6">Loading…</td></tr></tbody></table></div></section>';
 if(!db){showToast("Database is unavailable.");return;}
 const [sr,tr]=await Promise.all([
  db.from("students").select("id,student_code,full_name").eq("is_active",true).order("full_name"),
  db.from("mark_transactions").select("id,student_id,transaction_type,amount,balance_delta,reason,balance_after,occurred_at,related_transaction_id,students(full_name,student_code)").in("transaction_type",["transfer_out","transfer_in","appreciation"]).order("occurred_at",{ascending:false}).limit(100)
 ]);
 if(sr.error){showToast("Could not load students: "+sr.error.message);return;}
 const students=sr.data||[],from=document.getElementById("dedicationFrom"),to=document.getElementById("dedicationTo"),mode=document.getElementById("dedicationMode"),history=document.getElementById("dedicationHistory");
 const opts='<option value="">Choose student</option>'+students.map(x=>'<option value="'+x.id+'">'+escapeHTML(x.student_code)+' — '+escapeHTML(x.full_name)+'</option>').join("");
 from.innerHTML=opts;to.innerHTML=opts;
 function updateMode(){
  const appreciation=mode.value==="appreciation";
  document.getElementById("dedicationFromWrap").querySelector("label").textContent=appreciation?"Recognised by (optional)":"Giving student *";
  document.getElementById("dedicationFromHelp").textContent=appreciation?"Optional attribution only; this student's balance will not decrease.":"This student's balance will decrease by the transferred amount.";
  from.required=!appreciation;
  document.getElementById("saveDedication").textContent=appreciation?"Save appreciation":"Transfer marks";
 }
 mode.addEventListener("change",updateMode);updateMode();
 if(tr.error){history.innerHTML='<tr><td colspan="6">Could not load records: '+escapeHTML(tr.error.message)+'</td></tr>';}
 else history.innerHTML=(tr.data||[]).map(x=>{
  const type=x.transaction_type==="transfer_out"?"Transfer sent":x.transaction_type==="transfer_in"?"Transfer received":"Appreciation";
  const detail=x.transaction_type==="transfer_out"?"Marks given to another student":x.transaction_type==="transfer_in"?"Marks received":x.reason;
  return '<tr><td>'+escapeHTML(new Date(x.occurred_at).toLocaleString("en-IN"))+'</td><td>'+escapeHTML(x.students?.full_name||"Student")+'<small class="registry-email">'+escapeHTML(x.students?.student_code||"")+'</small></td><td>'+type+'</td><td>'+escapeHTML(detail)+'</td><td class="'+(x.balance_delta>0?"positive-text":"negative-text")+'">'+(x.balance_delta>0?"+":"")+x.balance_delta+'</td><td>'+x.balance_after+'</td></tr>';
 }).join("")||'<tr><td colspan="6">No dedication records yet.</td></tr>';
 document.getElementById("dedicationForm").addEventListener("submit",async e=>{
  e.preventDefault();const btn=document.getElementById("saveDedication"),msg=document.getElementById("dedicationMessage");
  if(mode.value==="transfer"&&from.value===to.value){msg.textContent="Choose two different students.";return;}
  btn.disabled=true;btn.textContent="Saving securely…";msg.textContent="";
  try{
   const r=await db.rpc("admin_record_dedication",{p_mode:mode.value,p_from_student_id:from.value||null,p_to_student_id:to.value,p_amount:Number(document.getElementById("dedicationAmount").value),p_reason:document.getElementById("dedicationReason").value.trim()});
   if(r.error)throw r.error;
   e.target.reset();updateMode();
   const giver=r.data.giver_balance_after!==undefined?" Giver balance: "+r.data.giver_balance_after+".":"";
   msg.textContent="Saved successfully. Recipient balance: "+r.data.recipient_balance_after+"."+giver;
   showToast("Dedication saved to the mark ledger.");
   const fresh=await db.from("mark_transactions").select("id,student_id,transaction_type,amount,balance_delta,reason,balance_after,occurred_at,related_transaction_id,students(full_name,student_code)").in("transaction_type",["transfer_out","transfer_in","appreciation"]).order("occurred_at",{ascending:false}).limit(100);
   if(!fresh.error)history.innerHTML=(fresh.data||[]).map(x=>'<tr><td>'+escapeHTML(new Date(x.occurred_at).toLocaleString("en-IN"))+'</td><td>'+escapeHTML(x.students?.full_name||"Student")+'</td><td>'+escapeHTML(x.transaction_type)+'</td><td>'+escapeHTML(x.reason)+'</td><td class="'+(x.balance_delta>0?"positive-text":"negative-text")+'">'+(x.balance_delta>0?"+":"")+x.balance_delta+'</td><td>'+x.balance_after+'</td></tr>').join("")||'<tr><td colspan="6">No dedication records yet.</td></tr>';
  }catch(err){msg.textContent="Not saved: "+err.message;showToast("Could not save dedication: "+err.message);}
  finally{btn.disabled=false;updateMode();}
 });
}

function disciplineMonday(value){
 const d=new Date(value+"T12:00:00"),day=d.getDay();d.setDate(d.getDate()-(day===0?6:day-1));
 return d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0")+"-"+String(d.getDate()).padStart(2,"0");
}
async function renderWeeklyReports(){
 const db=window.disciplineSupabase;
 const today=disciplineToday(),monday=disciplineMonday(today);
 pageContent.innerHTML='<div class="registry-head"><div><div class="eyebrow">WORKSPACE / WEEKLY REPORTS</div><h1>Weekly Results & Publishing</h1><p class="page-intro">Calculate Monday–Sunday results and publish the official scores to linked student and parent portals.</p></div><span class="demo-pill"><span class="pulse-dot"></span> ADMIN CONTROL</span></div><section class="panel registry-panel"><div class="attendance-toolbar"><div class="field"><label for="weeklyStart">Week starting (Monday)</label><input id="weeklyStart" type="date" value="'+monday+'"></div><div class="attendance-actions"><button class="button button-outline" id="loadWeeklyResults">Load results</button><button class="button button-primary" id="publishWeeklyResults">Publish weekly results</button></div></div><p id="weeklyPublishInfo" class="registry-disclaimer">Publishing makes the selected week&#39;s calculated results visible in the private student and parent portals.</p></section><section class="panel registry-panel"><div class="panel-heading"><div><h3>Weekly student results</h3><p>Only published rows appear in student and parent portals.</p></div></div><div class="table-scroll"><table class="registry-table"><thead><tr><th>STUDENT</th><th>AWARDS</th><th>DEDUCTIONS</th><th>RECEIVED</th><th>TRANSFERRED</th><th>WEEKLY NET</th><th>LIFETIME</th></tr></thead><tbody id="weeklyResultRows"><tr><td colspan="7">Loading…</td></tr></tbody></table></div></section><section class="panel registry-panel"><h3>How the score is calculated</h3><ul class="simple-list"><li>Weekly net = all mark balance changes recorded during the selected Monday–Sunday period.</li><li>Received includes incoming transfers and appreciation marks.</li><li>Transferred includes marks sent to other students.</li><li>Lifetime balance = starting marks plus all saved mark transactions to date.</li><li>Negative weekly and lifetime balances are permitted.</li></ul></section>';
 if(!db){showToast("Database is unavailable.");return;}
 const input=document.getElementById("weeklyStart"),tbody=document.getElementById("weeklyResultRows"),info=document.getElementById("weeklyPublishInfo"),publish=document.getElementById("publishWeeklyResults");
 async function load(){
  if(disciplineMonday(input.value)!==input.value){info.textContent="Please choose a Monday as the week start date.";tbody.innerHTML='<tr><td colspan="7">Select a Monday to continue.</td></tr>';publish.disabled=true;return;}
  publish.disabled=false;const end=new Date(input.value+"T12:00:00");end.setDate(end.getDate()+6);const endText=end.getFullYear()+"-"+String(end.getMonth()+1).padStart(2,"0")+"-"+String(end.getDate()).padStart(2,"0");
  const r=await db.from("weekly_results").select("student_id,total_awards,total_deductions,total_received,total_transferred,weekly_net,lifetime_balance,published_at,students(full_name,student_code)").eq("week_start",input.value).order("weekly_net",{ascending:false});
  if(r.error){info.textContent="Could not load results: "+r.error.message;return;}
  info.textContent="Week: "+input.value+" to "+endText+" · "+(r.data||[]).length+" student result(s) currently calculated.";
  tbody.innerHTML=(r.data||[]).map(x=>'<tr><td><strong>'+escapeHTML(x.students?.full_name||"Student")+'</strong><small class="registry-email">'+escapeHTML(x.students?.student_code||"")+'</small></td><td>+'+x.total_awards+'</td><td>−'+x.total_deductions+'</td><td>+'+x.total_received+'</td><td>−'+x.total_transferred+'</td><td><strong>'+((x.weekly_net>0?"+":"")+x.weekly_net)+'</strong></td><td>'+x.lifetime_balance+'</td></tr>').join("")||'<tr><td colspan="7">No results published for this week yet. Select Publish to calculate and publish them.</td></tr>';
  if((r.data||[]).some(x=>x.published_at))info.textContent+=" Published results are visible to linked portal users.";
 }
 document.getElementById("loadWeeklyResults").addEventListener("click",load);
 input.addEventListener("change",load);
 publish.addEventListener("click",async()=>{
  if(disciplineMonday(input.value)!==input.value){showToast("Choose a Monday first.");return;}
  publish.disabled=true;publish.textContent="Publishing…";
  try{const r=await db.rpc("admin_publish_weekly_results",{p_week_start:input.value});if(r.error)throw r.error;
   info.textContent="Published "+r.data.students_published+" student result(s) for "+r.data.week_start+" to "+r.data.week_end+".";
   showToast("Weekly results published to linked portals.");await load();
  }catch(e){info.textContent="Could not publish: "+e.message;showToast("Publishing failed: "+e.message);}
  finally{publish.disabled=false;publish.textContent="Publish weekly results";}
 });
 await load();
}



async function renderParents(){
 const db=window.disciplineSupabase;
 pageContent.innerHTML='<div class="registry-head"><div><div class="eyebrow">ADMINISTRATION / FAMILY ACCESS</div><h1>Parent Management</h1><p class="page-intro">Review parent accounts and the student profiles they are linked to.</p></div><button class="button button-primary" data-page="accounts">Create parent account</button></div><section class="panel registry-panel"><div class="panel-heading"><div><h3>Parent-to-student links</h3><p>Only administrator-visible links are shown here.</p></div><input id="parentSearch" class="registry-search" placeholder="Search parent or student…"></div><div class="table-scroll"><table class="registry-table"><thead><tr><th>PARENT</th><th>EMAIL</th><th>STUDENT</th><th>STUDENT ID</th><th>RELATIONSHIP</th></tr></thead><tbody id="parentRows"><tr><td colspan="5">Loading…</td></tr></tbody></table></div></section>';
 if(!db){showToast("Database connection is unavailable.");return;}
 const body=document.getElementById("parentRows");
 const r=await db.from("parent_student_links").select("parent_user_id,relationship_label,profiles(display_name,email),students(full_name,student_code)").order("created_at",{ascending:false});
 if(r.error){body.innerHTML='<tr><td colspan="5">Could not load parent links: '+escapeHTML(r.error.message)+'</td></tr>';return;}
 const rows=r.data||[];
 function draw(){
  const q=document.getElementById("parentSearch").value.trim().toLowerCase();
  const filtered=rows.filter(x=>[x.profiles?.display_name,x.profiles?.email,x.students?.full_name,x.students?.student_code,x.relationship_label].join(" ").toLowerCase().includes(q));
  body.innerHTML=filtered.map(x=>'<tr><td><strong>'+escapeHTML(x.profiles?.display_name||"Parent")+'</strong></td><td>'+escapeHTML(x.profiles?.email||"—")+'</td><td>'+escapeHTML(x.students?.full_name||"Student")+'</td><td>'+escapeHTML(x.students?.student_code||"—")+'</td><td>'+escapeHTML(x.relationship_label||"—")+'</td></tr>').join("")||'<tr><td colspan="5">No linked parent accounts found. Create an account to add one.</td></tr>';
 }
 document.getElementById("parentSearch").addEventListener("input",draw);draw();
}

async function renderLedger(){
 const db=window.disciplineSupabase;
 pageContent.innerHTML='<div class="registry-head"><div><div class="eyebrow">MARK MANAGEMENT / AUDIT TRAIL</div><h1>Discipline Ledger</h1><p class="page-intro">Search the saved, append-only history of awards, deductions and dedications.</p></div><span class="demo-pill">LIVE DATABASE</span></div><section class="panel registry-panel"><div class="panel-heading"><div><h3>All mark transactions</h3><p>Most recent 500 transactions.</p></div><div class="attendance-actions"><select id="ledgerType"><option value="">All types</option><option value="award">Awards</option><option value="deduction">Deductions</option><option value="transfer_out">Transfers sent</option><option value="transfer_in">Transfers received</option><option value="appreciation">Appreciation</option><option value="correction">Corrections</option></select><input id="ledgerSearch" class="registry-search" placeholder="Search student or reason…"></div></div><div class="table-scroll"><table class="registry-table"><thead><tr><th>DATE</th><th>STUDENT</th><th>TYPE</th><th>REASON</th><th>CHANGE</th><th>BEFORE</th><th>AFTER</th></tr></thead><tbody id="ledgerRows"><tr><td colspan="7">Loading…</td></tr></tbody></table></div></section>';
 if(!db){showToast("Database connection is unavailable.");return;}
 const body=document.getElementById("ledgerRows");
 const r=await db.from("mark_transactions").select("id,student_id,transaction_type,amount,balance_delta,reason,balance_before,balance_after,occurred_at,students(full_name,student_code)").order("occurred_at",{ascending:false}).limit(500);
 if(r.error){body.innerHTML='<tr><td colspan="7">Could not load ledger: '+escapeHTML(r.error.message)+'</td></tr>';return;}
 const rows=r.data||[];
 function draw(){
  const q=document.getElementById("ledgerSearch").value.trim().toLowerCase(),type=document.getElementById("ledgerType").value;
  const filtered=rows.filter(x=>(!type||x.transaction_type===type)&&[x.students?.full_name,x.students?.student_code,x.reason,x.transaction_type].join(" ").toLowerCase().includes(q));
  body.innerHTML=filtered.map(x=>'<tr><td>'+escapeHTML(new Date(x.occurred_at).toLocaleString("en-IN"))+'</td><td><strong>'+escapeHTML(x.students?.full_name||"Student")+'</strong><small class="registry-email">'+escapeHTML(x.students?.student_code||"")+'</small></td><td>'+escapeHTML(x.transaction_type)+'</td><td>'+escapeHTML(x.reason||"—")+'</td><td class="'+(x.balance_delta>0?"positive-text":"negative-text")+'">'+(x.balance_delta>0?"+":"")+x.balance_delta+'</td><td>'+x.balance_before+'</td><td>'+x.balance_after+'</td></tr>').join("")||'<tr><td colspan="7">No matching transactions.</td></tr>';
 }
 document.getElementById("ledgerSearch").addEventListener("input",draw);document.getElementById("ledgerType").addEventListener("change",draw);draw();
}

async function renderLeaderboard(){
 const db=window.disciplineSupabase,today=disciplineToday(),week=disciplineMonday(today);
 pageContent.innerHTML='<div class="registry-head"><div><div class="eyebrow">MARK MANAGEMENT / RECOGNITION</div><h1>Hall of Excellence</h1><p class="page-intro">Rankings use the official calculated results for the selected week.</p></div><button class="button button-outline" data-page="reports">Open weekly publishing</button></div><section class="panel registry-panel"><div class="attendance-toolbar"><div class="field"><label for="leaderWeek">Week starting (Monday)</label><input id="leaderWeek" type="date" value="'+week+'"></div><button class="button button-outline" id="leaderLoad">Load leaderboard</button></div><div class="table-scroll"><table class="registry-table"><thead><tr><th>RANK</th><th>STUDENT</th><th>WEEKLY NET</th><th>LIFETIME BALANCE</th></tr></thead><tbody id="leaderRows"><tr><td colspan="4">Loading…</td></tr></tbody></table></div><p id="leaderInfo" class="registry-disclaimer">Only published weekly results are ranked.</p></section>';
 if(!db){showToast("Database connection is unavailable.");return;}
 const input=document.getElementById("leaderWeek"),body=document.getElementById("leaderRows"),info=document.getElementById("leaderInfo");
 async function load(){
  if(disciplineMonday(input.value)!==input.value){info.textContent="Choose a Monday.";body.innerHTML='<tr><td colspan="4">Invalid week start.</td></tr>';return;}
  const r=await db.from("weekly_results").select("student_id,weekly_net,lifetime_balance,published_at,students(full_name,student_code)").eq("week_start",input.value).not("published_at","is",null).order("weekly_net",{ascending:false}).order("lifetime_balance",{ascending:false});
  if(r.error){info.textContent="Could not load leaderboard: "+r.error.message;return;}
  const rows=r.data||[];
  body.innerHTML=rows.map((x,i)=>'<tr><td><strong>#'+(i+1)+'</strong></td><td><strong>'+escapeHTML(x.students?.full_name||"Student")+'</strong><small class="registry-email">'+escapeHTML(x.students?.student_code||"")+'</small></td><td class="'+(x.weekly_net>=0?"positive-text":"negative-text")+'">'+(x.weekly_net>0?"+":"")+x.weekly_net+'</td><td>'+x.lifetime_balance+'</td></tr>').join("")||'<tr><td colspan="4">No published results for this week. Publish the weekly results first.</td></tr>';
  info.textContent=rows.length+" published student result(s) · Week starting "+input.value+".";
 }
 document.getElementById("leaderLoad").addEventListener("click",load);input.addEventListener("change",load);await load();
}

async function renderIncidents(){
 const db=window.disciplineSupabase;
 const dateParts=new Intl.DateTimeFormat("en-CA",{timeZone:"Asia/Kolkata",year:"numeric",month:"2-digit",day:"2-digit",hour:"2-digit",minute:"2-digit",hourCycle:"h23"}).formatToParts(new Date()),dt={};
 dateParts.forEach(x=>dt[x.type]=x.value);
 const localDateTime=dt.year+"-"+dt.month+"-"+dt.day+"T"+dt.hour+":"+dt.minute;
 const categories=[["noise_disturbance","Noise / disturbance"],["fighting_aggression","Fighting / aggression"],["disrespect","Disrespect"],["misbehaviour","Misbehaviour"],["safety","Safety concern"],["abusive_language","Abusive language"],["cleanliness","Cleanliness"],["bullying","Bullying"],["other","Other"]];
 pageContent.innerHTML='<div class="registry-head"><div><div class="eyebrow">BEHAVIOUR / PRIVATE ADMIN RECORDS</div><h1>Incident Center</h1><p class="page-intro">Record factual observations privately. New incidents are not automatically shared with parents.</p></div></div><section class="panel registry-panel"><div class="panel-heading"><div><h3>Record an incident</h3><p>Use neutral language and include only details you have verified.</p></div></div><form id="incidentForm"><div class="form-grid"><div class="field"><label for="incidentStudent">Student *</label><select id="incidentStudent" required><option value="">Loading students…</option></select></div><div class="field"><label for="incidentCategory">Category *</label><select id="incidentCategory">'+categories.map(x=>'<option value="'+x[0]+'">'+x[1]+'</option>').join("")+'</select></div><div class="field"><label for="incidentSeverity">Severity *</label><select id="incidentSeverity"><option value="low">Low</option><option value="moderate">Moderate</option><option value="high">High</option><option value="critical">Critical</option></select></div><div class="field"><label for="incidentWhen">Date and time *</label><input id="incidentWhen" type="datetime-local" value="'+localDateTime+'" required></div><div class="field"><label for="incidentSession">Journey session (optional)</label><select id="incidentSession"><option value="">Not linked</option></select></div><div class="field"><label for="incidentDeduction">Deduction marks (optional)</label><input id="incidentDeduction" type="number" min="0" max="10000" step="1" value="0"></div><div class="field full"><label for="incidentDescription">Factual description *</label><textarea id="incidentDescription" rows="4" maxlength="3000" required placeholder="Describe only what was observed, without assumptions."></textarea></div><div class="field full"><label for="incidentExactWords">Exact words (only when essential and verified)</label><textarea id="incidentExactWords" rows="2" maxlength="1000" placeholder="Optional. Restricted to administrator records until separately reviewed."></textarea></div><div class="field full"><label for="incidentAction">Action taken</label><textarea id="incidentAction" rows="2" maxlength="1000" placeholder="Optional action or follow-up."></textarea></div></div><div class="registry-form-actions"><button class="button button-primary" id="saveIncident" type="submit">Save private incident</button><span id="incidentMessage" class="registry-disclaimer" role="status"></span></div></form></section><section class="panel registry-panel"><div class="panel-heading"><div><h3>Recent incidents</h3><p>Administrator-only view. Parent publication is not enabled from this screen.</p></div></div><div class="table-scroll"><table class="registry-table"><thead><tr><th>DATE</th><th>STUDENT</th><th>CATEGORY</th><th>SEVERITY</th><th>OBSERVATION</th><th>DEDUCTION</th></tr></thead><tbody id="incidentRows"><tr><td colspan="6">Loading…</td></tr></tbody></table></div></section>';
 if(!db){showToast("Database connection is unavailable.");return;}
 const studentSelect=document.getElementById("incidentStudent"),sessionSelect=document.getElementById("incidentSession"),body=document.getElementById("incidentRows");
 const [students,sessions]=await Promise.all([
  db.from("students").select("id,student_code,full_name").eq("is_active",true).order("full_name"),
  db.from("journey_sessions").select("id,session_type,session_date").order("session_date",{ascending:false}).limit(30)
 ]);
 if(students.error)throw students.error;
 studentSelect.innerHTML='<option value="">Choose a student</option>'+(students.data||[]).map(x=>'<option value="'+x.id+'">'+escapeHTML(x.student_code)+' — '+escapeHTML(x.full_name)+'</option>').join("");
 if(!sessions.error)(sessions.data||[]).forEach(x=>{const o=document.createElement("option");o.value=x.id;o.textContent=x.session_type+" · "+x.session_date;sessionSelect.appendChild(o);});
 async function load(){
  const r=await db.from("incidents").select("id,student_id,category,severity,factual_description,occurred_at,mark_transaction_id,students(full_name,student_code)").order("occurred_at",{ascending:false}).limit(100);
  if(r.error){body.innerHTML='<tr><td colspan="6">Could not load incidents: '+escapeHTML(r.error.message)+'</td></tr>';return;}
  body.innerHTML=(r.data||[]).map(x=>'<tr><td>'+escapeHTML(new Date(x.occurred_at).toLocaleString("en-IN"))+'</td><td><strong>'+escapeHTML(x.students?.full_name||"Student")+'</strong><small class="registry-email">'+escapeHTML(x.students?.student_code||"")+'</small></td><td>'+escapeHTML(x.category)+'</td><td>'+escapeHTML(x.severity)+'</td><td>'+escapeHTML(x.factual_description)+'</td><td>'+(x.mark_transaction_id?"Recorded":"—")+'</td></tr>').join("")||'<tr><td colspan="6">No incidents have been recorded.</td></tr>';
 }
 document.getElementById("incidentForm").addEventListener("submit",async e=>{
  e.preventDefault();
  const btn=document.getElementById("saveIncident"),msg=document.getElementById("incidentMessage");
  const amount=Number(document.getElementById("incidentDeduction").value||0);
  if(!studentSelect.value){msg.textContent="Choose a student.";return;}
  if(!Number.isInteger(amount)||amount<0||amount>10000){msg.textContent="Deduction must be a whole number from 0 to 10,000.";return;}
  btn.disabled=true;btn.textContent="Saving…";msg.textContent="";
  try{
   const when=new Date(document.getElementById("incidentWhen").value+":00+05:30");
   if(Number.isNaN(when.getTime()))throw new Error("Enter a valid date and time.");
   const description=document.getElementById("incidentDescription").value.trim();
   if(description.length<5)throw new Error("Please provide a factual description of at least 5 characters.");
   const result=await db.rpc("admin_record_incident",{
    p_student_id:studentSelect.value,
    p_session_id:sessionSelect.value||null,
    p_category:document.getElementById("incidentCategory").value,
    p_severity:document.getElementById("incidentSeverity").value,
    p_factual_description:description,
    p_exact_words:document.getElementById("incidentExactWords").value.trim()||null,
    p_action_taken:document.getElementById("incidentAction").value.trim()||null,
    p_occurred_at:when.toISOString(),
    p_deduction:amount
   });
   if(result.error)throw result.error;
   msg.textContent="Incident and any deduction were saved together. The record remains private to administrators.";
   e.target.reset();document.getElementById("incidentWhen").value=localDateTime;
   await load();
   showToast("Incident saved privately and consistently.");
  }catch(err){msg.textContent="Not saved: "+err.message;showToast("Incident save failed: "+err.message);}
  finally{btn.disabled=false;btn.textContent="Save private incident";}
 });
 await load();
}

async function renderAnalytics(){
 const db=window.disciplineSupabase,week=disciplineMonday(disciplineToday()),next=new Date(week+"T12:00:00");
 next.setDate(next.getDate()+7);
 const end=next.getFullYear()+"-"+String(next.getMonth()+1).padStart(2,"0")+"-"+String(next.getDate()).padStart(2,"0");
 pageContent.innerHTML='<div class="registry-head"><div><div class="eyebrow">REPORTING / LIVE MEASURES</div><h1>Performance Analytics</h1><p class="page-intro">A factual summary of activity recorded during the current Monday–Sunday week.</p></div><button class="button button-outline" data-page="reports">Weekly results</button></div><div class="stats-grid"><article class="stat-card"><div class="stat-label">Awards</div><div class="stat-value" id="analyticsAwards">—</div></article><article class="stat-card"><div class="stat-label">Deductions</div><div class="stat-value" id="analyticsDeductions">—</div></article><article class="stat-card"><div class="stat-label">Net mark movement</div><div class="stat-value" id="analyticsNet">—</div></article><article class="stat-card"><div class="stat-label">Recorded incidents</div><div class="stat-value" id="analyticsIncidents">—</div></article></div><section class="panel registry-panel"><div class="panel-heading"><div><h3>Daily mark activity</h3><p id="analyticsWeek">Loading…</p></div></div><div class="table-scroll"><table class="registry-table"><thead><tr><th>DATE</th><th>AWARDS</th><th>DEDUCTIONS</th><th>NET (ALL TRANSACTIONS)</th></tr></thead><tbody id="analyticsRows"><tr><td colspan="4">Loading…</td></tr></tbody></table></div></section>';
 if(!db){showToast("Database connection is unavailable.");return;}
 const [tx,inc]=await Promise.all([
  db.from("mark_transactions").select("transaction_type,amount,balance_delta,occurred_at").gte("occurred_at",week+"T00:00:00+05:30").lt("occurred_at",end+"T00:00:00+05:30"),
  db.from("incidents").select("id",{count:"exact",head:true}).gte("occurred_at",week+"T00:00:00+05:30").lt("occurred_at",end+"T00:00:00+05:30")
 ]);
 if(tx.error)throw tx.error;if(inc.error)throw inc.error;
 const rows=tx.data||[],awards=rows.filter(x=>x.transaction_type==="award").reduce((n,x)=>n+x.amount,0),deductions=rows.filter(x=>x.transaction_type==="deduction").reduce((n,x)=>n+x.amount,0),net=rows.reduce((n,x)=>n+x.balance_delta,0),byDay={};
 rows.forEach(x=>{const day=new Intl.DateTimeFormat("en-CA",{timeZone:"Asia/Kolkata",year:"numeric",month:"2-digit",day:"2-digit"}).format(new Date(x.occurred_at));if(!byDay[day])byDay[day]={awards:0,deductions:0,net:0};if(x.transaction_type==="award")byDay[day].awards+=x.amount;if(x.transaction_type==="deduction")byDay[day].deductions+=x.amount;byDay[day].net+=x.balance_delta;});
 document.getElementById("analyticsAwards").textContent=awards;document.getElementById("analyticsDeductions").textContent=deductions;document.getElementById("analyticsNet").textContent=(net>0?"+":"")+net;document.getElementById("analyticsIncidents").textContent=inc.count??0;document.getElementById("analyticsWeek").textContent="Week "+week+" to "+new Date(end+"T12:00:00").toLocaleDateString("en-IN");
 document.getElementById("analyticsRows").innerHTML=Object.keys(byDay).sort().map(day=>'<tr><td>'+day+'</td><td>+'+byDay[day].awards+'</td><td>−'+byDay[day].deductions+'</td><td class="'+(byDay[day].net>=0?"positive-text":"negative-text")+'">'+(byDay[day].net>0?"+":"")+byDay[day].net+'</td></tr>').join("")||'<tr><td colspan="4">No mark activity recorded this week.</td></tr>';
}

function renderPortals(){
 pageContent.innerHTML='<div class="registry-head"><div><div class="eyebrow">ACCESS / ROLE PORTALS</div><h1>Portal Overview</h1><p class="page-intro">Student and parent accounts use the same secure sign-in page and are routed by their assigned role.</p></div></div><section class="panel registry-panel"><h3>Student portal</h3><p>Students can view their own mark balance, recent mark history, published weekly results and relevant records. They cannot create or change marks.</p></section><section class="panel registry-panel"><h3>Parent portal</h3><p>Parents can view only their linked child’s published results and permitted reports. Parent accounts must be created by the administrator.</p></section><section class="panel registry-panel"><h3>Manage access</h3><p>Use Portal Accounts to send an invitation. The invited person sets their own password; never ask them to share it.</p><button class="button button-primary" data-page="accounts">Open Portal Accounts</button></section>';
}
function renderSettings(){
 pageContent.innerHTML='<div class="registry-head"><div><div class="eyebrow">ADMINISTRATION / SYSTEM</div><h1>Settings</h1><p class="page-intro">Current system rules and security boundaries.</p></div></div><section class="panel registry-panel"><h3>Weekly scoring period</h3><p>Monday 00:00 through Sunday 23:59 · Asia/Kolkata. Negative balances are allowed; historical transactions are retained.</p></section><section class="panel registry-panel"><h3>Roles and permissions</h3><p>Administrator: full control. Student: own records, view only. Parent: linked child records, view only. Parent and student accounts are created by the administrator.</p></section><section class="panel registry-panel"><h3>Data protection</h3><p>Mark changes are stored in the transaction ledger. Incident records start private and are not automatically published to parents. Do not store passwords, private keys or unnecessary personal details in this application.</p></section>';
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
  if(actionBtn&&actionBtn.dataset.action==="add-student")setActivePage("students");
  if(e.target.closest(".notice-dismiss"))e.target.closest(".notice-banner").remove();
  if(e.target.closest("#dateButton"))showToast("Weekly period: Monday to Sunday · Asia/Kolkata");
  if(e.target.closest("#notificationButton"))showToast("No live notifications in local preview.");
});
// Navigation is handled once by the delegated document click listener above.
document.getElementById("menuToggle").addEventListener("click",()=>{document.getElementById("sidebar").classList.add("open");document.getElementById("sidebarBackdrop").classList.add("show");});
document.getElementById("closeSidebar").addEventListener("click",closeSidebar);
document.getElementById("sidebarBackdrop").addEventListener("click",closeSidebar);
document.getElementById("modalClose").addEventListener("click",closeModal);
modalBackdrop.addEventListener("click",e=>{if(e.target===modalBackdrop)closeModal();});
document.addEventListener("keydown",e=>{if(e.key==="Escape"){closeModal();closeSidebar();}});
// The authenticated role controller opens the requested hash route after sign-in.
