const pageMeta = {
 dashboard:{title:"Command Center",desc:"Your daily system overview.",icon:"▦"},
 students:{title:"Student Registry",desc:"Create and manage student profiles.",icon:"♙"},
 parents:{title:"Parent Management",desc:"Manage parent accounts and family links.",icon:"♧"},
 accounts:{title:"Portal Accounts",desc:"Create parent, student and driver accounts and assign routes.",icon:"◎"},
 drivercheckins:{title:"Driver Check-ins",desc:"Review morning and evening check-ins submitted by drivers.",icon:"↗"},
 driverroutes:{title:"Drivers & Routes",desc:"Manage driver accounts, routes and assigned students.",icon:"▣"},
 attendance:{title:"Morning Attendance",desc:"Record attendance for the institute-bound journey.",icon:"✓"},
 journeys:{title:"Journey Sessions",desc:"Manage morning and evening journey records.",icon:"↗"},
 marks:{title:"Award & Deduct Marks",desc:"Record positive contributions and discipline deductions.",icon:"＋"},
 dedications:{title:"Dedication Hall",desc:"Manage mark transfers and appreciation dedications.",icon:"◇"},
 leaderboard:{title:"Hall of Excellence",desc:"Explore weekly and lifetime student rankings.",icon:"♜"},
 ledger:{title:"Discipline Ledger",desc:"Review the complete history of mark transactions.",icon:"▤"},
 incidents:{title:"Incident Center",desc:"Record behaviour concerns and verified incident details.",icon:"!"},
 analytics:{title:"Performance Analytics",desc:"Understand weekly trends and student improvement.",icon:"⌁"},
 reports:{title:"Weekly Results",desc:"Calculate and publish official Monday–Sunday student results.",icon:"▧"},
 certificates:{title:"Certificates",desc:"Issue and publish student achievement certificates.",icon:"✦"},
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

function updateAdminNavBadges(parentCount, incidentCount){
  const parentBadge=document.getElementById("parentResponseNavCount");
  const incidentBadge=document.getElementById("incidentReviewNavCount");
  const bellCount=document.getElementById("adminNotificationCount");
  const dot=document.getElementById("adminNotificationDot");
  const total=Math.max(0,Number(parentCount||0))+Math.max(0,Number(incidentCount||0));
  if(parentBadge){parentBadge.textContent=parentCount>99?"99+":String(parentCount);parentBadge.hidden=!parentCount;}
  if(incidentBadge){incidentBadge.textContent=incidentCount>99?"99+":String(incidentCount);incidentBadge.hidden=!incidentCount;}
  if(bellCount){bellCount.textContent=total>99?"99+":String(total);bellCount.hidden=!total;}
  if(dot)dot.hidden=true;
  const button=document.getElementById("notificationButton");
  if(button)button.setAttribute("aria-label",total?("Administrator inbox, "+total+" pending item(s)"):"Administrator inbox, no pending items");
}
async function refreshAdminNotificationBadge(){
  const center=document.getElementById("notificationCenter");
  const db=window.disciplineSupabase;
  if(!center||center.hidden||!db||!document.body.classList.contains("is-authenticated"))return;
  try{
    const [responses,incidents]=await Promise.all([
      db.from("parent_responses").select("id",{count:"exact",head:true}).is("reviewed_at",null),
      db.from("incidents").select("id",{count:"exact",head:true}).eq("transcript_verified",false)
    ]);
    if(responses.error)throw responses.error;
    if(incidents.error)throw incidents.error;
    updateAdminNavBadges(responses.count||0,incidents.count||0);
  }catch(error){
    console.error("Could not refresh administrator inbox count:",error);
  }
}
function closeAdminNotificationPanel(){
  const panel=document.getElementById("adminNotificationPanel");
  const button=document.getElementById("notificationButton");
  if(panel)panel.hidden=true;
  if(button)button.setAttribute("aria-expanded","false");
}
async function loadAdminNotifications(){
  const db=window.disciplineSupabase;
  const content=document.getElementById("adminNotificationContent");
  const refresh=document.getElementById("refreshAdminNotifications");
  if(!db||!content)return;
  if(refresh){refresh.disabled=true;refresh.textContent="…";}
  content.innerHTML='<p class="admin-notification-empty">Loading your pending items…</p>';
  try{
    const [responses,incidents]=await Promise.all([
      db.from("parent_responses")
        .select("id,response_type,message,created_at,profiles(display_name),students(full_name,student_code)",{count:"exact"})
        .is("reviewed_at",null).order("created_at",{ascending:false}).limit(5),
      db.from("incidents")
        .select("id,category,severity,occurred_at,students(full_name,student_code)",{count:"exact"})
        .eq("transcript_verified",false).order("occurred_at",{ascending:false}).limit(5)
    ]);
    if(responses.error)throw responses.error;
    if(incidents.error)throw incidents.error;
    const parentRows=responses.data||[],incidentRows=incidents.data||[];
    updateAdminNavBadges(responses.count||0,incidents.count||0);
    const parentHtml=parentRows.map(row=>{
      const parent=row.profiles?.display_name||"Parent";
      const student=row.students?.full_name||"Student";
      const kind=String(row.response_type||"response").replaceAll("_"," ");
      const message=String(row.message||"No additional message").slice(0,150);
      return '<button type="button" class="admin-notification-item" data-page="parents"><span class="admin-notification-kind">Parent response · '+escapeHTML(kind)+'</span><strong>'+escapeHTML(parent)+' · '+escapeHTML(student)+'</strong><p>'+escapeHTML(message)+'</p><small>'+escapeHTML(new Date(row.created_at).toLocaleString("en-IN"))+'</small></button>';
    }).join("");
    const incidentHtml=incidentRows.map(row=>{
      const student=row.students?.full_name||"Student";
      const category=String(row.category||"incident").replaceAll("_"," ");
      return '<button type="button" class="admin-notification-item" data-page="incidents"><span class="admin-notification-kind">Incident · review required</span><strong>'+escapeHTML(student)+' · '+escapeHTML(category)+'</strong><p>Severity: '+escapeHTML(row.severity||"Not specified")+' · The incident has not yet been verified.</p><small>'+escapeHTML(new Date(row.occurred_at).toLocaleString("en-IN"))+'</small></button>';
    }).join("");
    const parentCount=responses.count||0,incidentCount=incidents.count||0;
    content.innerHTML=
      '<section class="admin-notification-group"><h3 class="admin-notification-group-title">Parent responses <span>'+parentCount+' pending</span></h3>'+
      (parentHtml||'<p class="admin-notification-empty">No parent responses awaiting review.</p>')+
      (parentCount>5?'<button type="button" class="text-button" data-page="parents">View all '+parentCount+' parent responses →</button>':'')+'</section>'+
      '<section class="admin-notification-group"><h3 class="admin-notification-group-title">Incident reviews <span>'+incidentCount+' pending</span></h3>'+
      (incidentHtml||'<p class="admin-notification-empty">No incidents awaiting verification.</p>')+
      (incidentCount>5?'<button type="button" class="text-button" data-page="incidents">Review all '+incidentCount+' incidents →</button>':'')+'</section>';
  }catch(error){
    content.innerHTML='<p class="admin-notification-error">The administrator inbox could not be loaded. '+escapeHTML(error.message||"Please refresh and try again.")+'</p>';
  }finally{
    if(refresh){refresh.disabled=false;refresh.textContent="↻";}
  }
}
function toggleAdminNotificationPanel(){
  const panel=document.getElementById("adminNotificationPanel");
  const button=document.getElementById("notificationButton");
  if(!panel||!button)return;
  if(!panel.hidden){closeAdminNotificationPanel();return;}
  panel.hidden=false;
  button.setAttribute("aria-expanded","true");
  loadAdminNotifications();
}
function setActivePage(page){
  if(!pageMeta[page]) page="dashboard";
  document.querySelectorAll(".nav-item").forEach(btn=>btn.classList.toggle("active",btn.dataset.page===page));
  breadcrumbCurrent.textContent=(pageMeta[page]||pageMeta.dashboard).title;
  location.hash=page==="dashboard"?"":page;
  const renderers={
    dashboard:renderDashboard,students:renderStudents,parents:renderParents,accounts:renderAccounts,
    attendance:renderAttendance,journeys:renderJourneys,drivercheckins:renderDriverCheckins,driverroutes:renderDriverRoutes,marks:renderMarks,dedications:renderDedications,
    leaderboard:renderLeaderboard,ledger:renderLedger,incidents:renderIncidents,
    analytics:renderAnalytics,reports:renderWeeklyReports,certificates:renderCertificates,portals:renderPortals,settings:renderSettings
  };
  try{
    const task=(renderers[page]||(()=>renderPlaceholder(page)))();
    if(task&&typeof task.catch==="function") task.catch(error=>showPageError(error));
  }catch(error){showPageError(error);}
  if(document.getElementById("notificationCenter")&&!document.getElementById("notificationCenter").hidden)refreshAdminNotificationBadge();
  closeAdminNotificationPanel();
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
 const today=disciplineToday(),week=disciplineMonday(today),next=new Date(week+"T12:00:00");
 next.setDate(next.getDate()+7);
 const weekEnd=next.getFullYear()+"-"+String(next.getMonth()+1).padStart(2,"0")+"-"+String(next.getDate()).padStart(2,"0");
 const prettyDate=new Intl.DateTimeFormat("en-IN",{weekday:"long",day:"numeric",month:"long",year:"numeric",timeZone:"Asia/Kolkata"}).format(new Date(today+"T12:00:00+05:30"));
 pageContent.innerHTML=`
  <div class="dash-welcome">
   <div><div class="eyebrow"><span class="eyebrow-line"></span> DISCIPLINE / OVERVIEW</div><h1>Good ${new Date().getHours()<12?"morning":new Date().getHours()<17?"afternoon":"evening"}, Administrator</h1><p class="page-intro">${prettyDate} · Here is what is happening across your institute.</p></div>
   <button class="button button-primary" data-page="students">＋ Add student</button>
  </div>
  <section class="dash-stats" aria-label="Key system figures">
   <article class="dash-stat"><span class="dash-stat-label">Active students</span><div class="dash-stat-value" id="dashStudents">—</div><small>Currently registered</small></article>
   <article class="dash-stat"><span class="dash-stat-label">Morning attendance</span><div class="dash-stat-value" id="dashAttendance">—</div><small id="dashAttendanceNote">Today's register</small></article>
   <article class="dash-stat"><span class="dash-stat-label">Marks awarded</span><div class="dash-stat-value" id="dashAwards">—</div><small>This week</small></article>
   <article class="dash-stat"><span class="dash-stat-label">Marks deducted</span><div class="dash-stat-value" id="dashDeductions">—</div><small>This week</small></article>
  </section>
  <div class="dash-main-grid">
   <section class="panel dash-panel">
    <div class="dash-section-head"><div><h2>Recent mark activity</h2><p>The latest changes recorded in the system</p></div><button class="text-button" data-page="ledger">View ledger →</button></div>
    <div class="table-scroll"><table class="registry-table dash-table"><thead><tr><th>STUDENT</th><th>ACTIVITY</th><th>MARKS</th><th>DATE</th></tr></thead><tbody id="dashRecent"><tr><td colspan="4">Loading activity…</td></tr></tbody></table></div>
   </section>
   <aside class="dash-side">
    <section class="panel dash-panel">
     <div class="dash-section-head"><div><h2>Quick actions</h2><p>Common administrator tasks</p></div></div>
     <div class="dash-action-list">
      <button class="dash-action" data-page="attendance"><span class="dash-action-icon">✓</span><span><strong>Take attendance</strong><small>Record today's morning register</small></span><b>›</b></button>
      <button class="dash-action" data-page="marks"><span class="dash-action-icon">＋</span><span><strong>Award or deduct marks</strong><small>Update a student's discipline score</small></span><b>›</b></button>
      <button class="dash-action" data-page="driverroutes"><span class="dash-action-icon">↗</span><span><strong>Manage journeys</strong><small>Drivers, vehicles and routes</small></span><b>›</b></button>
      <button class="dash-action" data-page="reports"><span class="dash-action-icon">▤</span><span><strong>Weekly results</strong><small>Review and publish student results</small></span><b>›</b></button>
     </div>
    </section>
    <section class="dash-note"><span class="dash-note-mark">i</span><div><strong>A simple daily routine</strong><p>Record attendance, update marks when needed, then review weekly results before publishing.</p></div></section>
   </aside>
  </div>
  <footer class="page-footer"><span>DISCIPLINE · Administrator workspace</span><span>All figures are based on saved records.</span></footer>`;
 if(!db){pageContent.insertAdjacentHTML("beforeend",'<p class="registry-disclaimer">Database connection is not ready. Refresh after signing in.</p>');return;}
 try{
  const [students,session,weeklyTx,recent]=await Promise.all([
   db.from("students").select("id",{count:"exact",head:true}).eq("is_active",true),
   db.from("journey_sessions").select("id").eq("session_type","morning").eq("session_date",today).maybeSingle(),
   db.from("mark_transactions").select("transaction_type,amount,balance_delta").gte("occurred_at",week+"T00:00:00+05:30").lt("occurred_at",weekEnd+"T00:00:00+05:30"),
   db.from("mark_transactions").select("transaction_type,amount,balance_delta,reason,occurred_at,students(full_name,student_code)").order("occurred_at",{ascending:false}).limit(7)
  ]);
  if(students.error)throw students.error;if(session.error)throw session.error;if(weeklyTx.error)throw weeklyTx.error;if(recent.error)throw recent.error;
  document.getElementById("dashStudents").textContent=students.count??0;
  if(session.data){
   const at=await db.from("attendance").select("status").eq("session_id",session.data.id);
   if(at.error)throw at.error;
   const records=at.data||[],present=records.filter(x=>x.status==="present"||x.status==="late").length;
   document.getElementById("dashAttendance").textContent=present+" / "+records.length;
   document.getElementById("dashAttendanceNote").textContent=records.length?Math.round(present/records.length*100)+"% present or late":"Register started · no entries yet";
  }else{
   document.getElementById("dashAttendance").textContent="—";
   document.getElementById("dashAttendanceNote").textContent="Not started today";
  }
  const tx=weeklyTx.data||[];
  document.getElementById("dashAwards").textContent=tx.filter(x=>x.transaction_type==="award").reduce((n,x)=>n+Number(x.amount||0),0);
  document.getElementById("dashDeductions").textContent=tx.filter(x=>x.transaction_type==="deduction").reduce((n,x)=>n+Number(x.amount||0),0);
  document.getElementById("dashRecent").innerHTML=(recent.data||[]).map(x=>{
   const delta=Number(x.balance_delta||0),student=x.students||{};
   return '<tr><td><strong>'+escapeHTML(student.full_name||"Student")+'</strong><small class="registry-email">'+escapeHTML(student.student_code||"")+'</small></td><td><span class="dash-activity-tag '+(delta>=0?"is-award":"is-deduction")+'">'+escapeHTML(x.transaction_type==="award"?"Award":x.transaction_type==="deduction"?"Deduction":x.transaction_type)+'</span><small class="registry-email">'+escapeHTML(x.reason||"")+'</small></td><td class="'+(delta>=0?"positive-text":"negative-text")+'"><strong>'+(delta>0?"+":"")+delta+'</strong></td><td>'+escapeHTML(new Date(x.occurred_at).toLocaleDateString("en-IN"))+'</td></tr>';
  }).join("")||'<tr><td colspan="4" class="dash-empty">No mark activity yet. Your latest transactions will appear here.</td></tr>';
 }catch(e){
  console.error("Dashboard data error:",e);
  document.getElementById("dashRecent").innerHTML='<tr><td colspan="4" class="dash-empty">Some dashboard figures could not be loaded. Please refresh or check your connection.</td></tr>';
  showToast("Some dashboard information could not be loaded.");
 }
}

function escapeHTML(value){
  return String(value ?? "").replace(/[&<>"']/g, ch => ({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"}[ch]));
}

async function renderStudents(){
  const db = window.disciplineSupabase;
  pageContent.innerHTML = `
    <div class="registry-head student-page-head">
      <div><div class="eyebrow"><span class="eyebrow-line"></span> WORKSPACE / STUDENTS</div><h1>Student Registry</h1><p class="page-intro">One clear place to register students and keep guardian details organized.</p></div>
      <span class="demo-pill"><span class="pulse-dot"></span> SECURE RECORDS</span>
    </div>
    <div class="registry-stats student-summary">
      <article class="stat-card"><div class="stat-label">Active students</div><div class="stat-value" id="activeStudentCount">—</div><small>Currently enrolled</small></article>
      <article class="stat-card"><div class="stat-label">Archived profiles</div><div class="stat-value" id="archivedStudentCount">—</div><small>Kept for record history</small></article>
    </div>
    <section class="panel registry-panel">
      <div class="student-panel-heading"><div><span class="student-step">STUDENT DETAILS</span><h2 id="studentFormHeading">Register a student</h2><p>Enter the student and guardian information below.</p></div></div>
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
      <div class="student-list-head"><div><span class="student-step">RECORDS</span><h2>Student profiles</h2><p id="studentListCaption">Loading records…</p></div><div class="student-list-tools"><label class="student-search-wrap"><span>⌕</span><input class="registry-search" id="studentSearch" type="search" placeholder="Search name, ID or class…" aria-label="Search students"></label><button class="button button-outline" type="button" id="exportStudents">↓ Export CSV</button></div></div>
      <div class="table-scroll"><table class="registry-table"><thead><tr><th>STUDENT</th><th>STUDENT ID</th><th>CLASS / GROUP</th><th>PARENT / GUARDIAN</th><th>CONTACT</th><th>STATUS</th><th>ACTIONS</th></tr></thead><tbody id="studentRows"></tbody></table></div>
      <p class="registry-empty" id="studentEmpty" hidden>No student profiles found.</p>
    </section>
     <section class="panel registry-panel student-profile-panel" id="studentProfilePanel" hidden><div id="studentProfileContent"></div></section>
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
        <td><div class="registry-actions"><button type="button" class="button button-quiet" data-view-student="${escapeHTML(s.id)}">View profile</button><button type="button" class="button button-quiet" data-edit-student="${escapeHTML(s.id)}">Edit</button><button type="button" class="button button-quiet registry-archive" data-archive-student="${escapeHTML(s.id)}">Archive</button></div></td>
      </tr>`;
    }).join("");
    document.getElementById("studentEmpty").hidden=list.length>0;
    document.getElementById("studentListCaption").textContent=list.length+" active profile(s)";
  }

  async function loadRecords(){
    rows.innerHTML='<tr><td colspan="7">Loading…</td></tr>';
    const {data,error}=await db.from("students")
      .select("id,student_code,full_name,class_group,starting_marks,is_active,created_at,student_guardians(guardian_name,phone,email)")
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

  async function viewStudentProfile(student){
    const panel=document.getElementById("studentProfilePanel"),body=document.getElementById("studentProfileContent"),guardian=guardianOf(student);
    panel.hidden=false;body.innerHTML='<p class="registry-disclaimer">Loading the saved student record…</p>';panel.scrollIntoView({behavior:"smooth",block:"start"});
    try{
      const [marks,allMarks,attendance,incidents,weekly,certificates,studentAccount,parentLinks]=await Promise.all([
        db.from("mark_transactions").select("transaction_type,amount,balance_delta,reason,balance_before,balance_after,occurred_at").eq("student_id",student.id).order("occurred_at",{ascending:false}).limit(15),
        db.from("mark_transactions").select("balance_delta").eq("student_id",student.id),
        db.from("attendance").select("status,notes,recorded_at,journey_sessions(session_type,session_date)").eq("student_id",student.id).order("recorded_at",{ascending:false}).limit(20),
        db.from("incidents").select("category,severity,factual_description,occurred_at,transcript_verified,published_to_parent_at").eq("student_id",student.id).order("occurred_at",{ascending:false}).limit(8),
        db.from("weekly_results").select("week_start,week_end,total_awards,total_deductions,weekly_net,lifetime_balance,published_at").eq("student_id",student.id).order("week_start",{ascending:false}).limit(8),
        db.from("certificates").select("title,description,issued_at,published_at").eq("student_id",student.id).order("issued_at",{ascending:false}).limit(8),
        db.from("student_accounts").select("user_id").eq("student_id",student.id).maybeSingle(),
        db.from("parent_student_links").select("id").eq("student_id",student.id)
      ]);
      const failed=[marks,allMarks,attendance,incidents,weekly,certificates,studentAccount,parentLinks].find(x=>x.error);
      if(failed)throw failed.error;
      const lifetime=Number(student.starting_marks||0)+(allMarks.data||[]).reduce((sum,row)=>sum+Number(row.balance_delta||0),0);
      const present=(attendance.data||[]).filter(x=>x.status==="present").length;
      const absent=(attendance.data||[]).filter(x=>x.status==="absent").length;
      const late=(attendance.data||[]).filter(x=>x.status==="late").length;
      const label=value=>String(value||"").replaceAll("_"," ").replace(/\b\w/g,x=>x.toUpperCase());
      const transactionRows=(marks.data||[]).map(x=>'<tr><td>'+escapeHTML(new Date(x.occurred_at).toLocaleString("en-IN"))+'</td><td>'+escapeHTML(label(x.transaction_type))+'</td><td>'+escapeHTML(x.reason||"—")+'</td><td>'+((Number(x.balance_delta)>0?"+":"")+Number(x.balance_delta))+'</td><td>'+Number(x.balance_before)+'</td><td>'+Number(x.balance_after)+'</td></tr>').join("")||'<tr><td colspan="6">No mark transactions recorded.</td></tr>';
      const attendanceRows=(attendance.data||[]).map(x=>'<tr><td>'+escapeHTML(x.journey_sessions?.session_date||new Date(x.recorded_at).toLocaleDateString("en-IN"))+'</td><td>'+escapeHTML(label(x.journey_sessions?.session_type||"Attendance"))+'</td><td>'+escapeHTML(label(x.status))+'</td><td>'+escapeHTML(x.notes||"—")+'</td></tr>').join("")||'<tr><td colspan="4">No attendance entries recorded.</td></tr>';
      const incidentRows=(incidents.data||[]).map(x=>'<tr><td>'+escapeHTML(new Date(x.occurred_at).toLocaleString("en-IN"))+'</td><td>'+escapeHTML(label(x.category))+'</td><td>'+escapeHTML(label(x.severity))+'</td><td>'+escapeHTML(x.factual_description||"—")+'</td><td>'+(x.transcript_verified?"Verified":"Awaiting review")+'</td><td>'+(x.published_to_parent_at?"Published":"Private")+'</td></tr>').join("")||'<tr><td colspan="6">No incident records.</td></tr>';
      const weeklyRows=(weekly.data||[]).map(x=>'<tr><td>'+escapeHTML(x.week_start)+' – '+escapeHTML(x.week_end)+'</td><td>+'+Number(x.total_awards||0)+'</td><td>−'+Number(x.total_deductions||0)+'</td><td>'+(Number(x.weekly_net)>0?"+":"")+Number(x.weekly_net||0)+'</td><td>'+Number(x.lifetime_balance||0)+'</td><td>'+(x.published_at?"Published":"Private")+'</td></tr>').join("")||'<tr><td colspan="6">No weekly results saved.</td></tr>';
      const certificateRows=(certificates.data||[]).map(x=>'<tr><td>'+escapeHTML(x.title)+'</td><td>'+escapeHTML(x.description||"—")+'</td><td>'+escapeHTML(new Date(x.issued_at).toLocaleDateString("en-IN"))+'</td><td>'+(x.published_at?"Published":"Private")+'</td></tr>').join("")||'<tr><td colspan="4">No certificates issued.</td></tr>';
      body.innerHTML='<div class="student-profile-head"><div><span class="student-step">STUDENT RECORD / PROFILE SUMMARY</span><h2>'+escapeHTML(student.full_name)+'</h2><p>'+escapeHTML(student.student_code)+' · '+escapeHTML(student.class_group||"Class not set")+'</p></div><div class="student-profile-actions"><button class="button button-outline" type="button" id="printStudentProfile">Print record</button><button class="button button-quiet" type="button" id="closeStudentProfile">Close</button></div></div>'+
       '<div class="student-profile-report"><div class="student-profile-summary"><article><small>LIFETIME MARK BALANCE</small><strong>'+lifetime+'</strong></article><article><small>RECENT ATTENDANCE · LAST 20</small><strong>'+present+' present · '+absent+' absent</strong><span>'+late+' late</span></article><article><small>PORTAL CONNECTIONS</small><strong>'+(studentAccount.data?"Student linked":"No student login")+'</strong><span>'+(parentLinks.data||[]).length+' parent link(s)</span></article></div>'+
       '<section class="student-profile-section"><h3>Personal and guardian details</h3><div class="student-profile-details"><p><small>Student ID</small><strong>'+escapeHTML(student.student_code)+'</strong></p><p><small>Class / group</small><strong>'+escapeHTML(student.class_group||"—")+'</strong></p><p><small>Guardian</small><strong>'+escapeHTML(guardian.guardian_name||"—")+'</strong></p><p><small>Guardian phone</small><strong>'+escapeHTML(guardian.phone||"—")+'</strong></p><p><small>Guardian email</small><strong>'+escapeHTML(guardian.email||"—")+'</strong></p><p><small>Profile status</small><strong>'+(student.is_active?"Active":"Archived")+'</strong></p></div></section>'+
       '<section class="student-profile-section"><h3>Recent mark history</h3><div class="table-scroll"><table class="registry-table"><thead><tr><th>DATE</th><th>TYPE</th><th>REASON</th><th>CHANGE</th><th>BEFORE</th><th>AFTER</th></tr></thead><tbody>'+transactionRows+'</tbody></table></div></section>'+
       '<section class="student-profile-section"><h3>Recent attendance · latest 20 entries</h3><div class="table-scroll"><table class="registry-table"><thead><tr><th>DATE</th><th>JOURNEY</th><th>STATUS</th><th>NOTE</th></tr></thead><tbody>'+attendanceRows+'</tbody></table></div></section>'+
       '<section class="student-profile-section"><h3>Incident summaries · administrator record</h3><p class="registry-disclaimer">Exact words and temporary evidence are not included in this general profile summary.</p><div class="table-scroll"><table class="registry-table"><thead><tr><th>DATE</th><th>CATEGORY</th><th>SEVERITY</th><th>FACTUAL SUMMARY</th><th>REVIEW</th><th>PORTAL</th></tr></thead><tbody>'+incidentRows+'</tbody></table></div></section>'+
       '<section class="student-profile-section"><h3>Weekly results · latest 8</h3><div class="table-scroll"><table class="registry-table"><thead><tr><th>SCORING WEEK</th><th>AWARDS</th><th>DEDUCTIONS</th><th>NET</th><th>LIFETIME</th><th>STATUS</th></tr></thead><tbody>'+weeklyRows+'</tbody></table></div></section>'+
       '<section class="student-profile-section"><h3>Certificates · latest 8</h3><div class="table-scroll"><table class="registry-table"><thead><tr><th>CERTIFICATE</th><th>DESCRIPTION</th><th>ISSUED</th><th>PORTAL STATUS</th></tr></thead><tbody>'+certificateRows+'</tbody></table></div></section>'+
       '<p class="student-profile-generated">Generated '+escapeHTML(new Date().toLocaleString("en-IN"))+' · DISCIPLINE administrator record</p></div>';
      document.getElementById("closeStudentProfile").addEventListener("click",()=>{panel.hidden=true;});
      document.getElementById("printStudentProfile").addEventListener("click",()=>{
        const report=panel.querySelector(".student-profile-report"),popup=window.open("","_blank");
        if(!popup){showToast("Allow pop-ups to print this student record.");return;}
        popup.opener=null;popup.document.open();
        popup.document.write('<!doctype html><html lang="en"><head><meta charset="utf-8"><title>Student record · '+escapeHTML(student.student_code)+'</title><style>body{font:11px Arial,sans-serif;color:#24364d;margin:24px}h2{font-size:23px;margin:4px 0}h3{font-size:14px;margin:0 0 10px}p{margin:4px 0}.student-profile-summary{display:flex;gap:9px;margin:16px 0}.student-profile-summary article,.student-profile-section{border:1px solid #dce3ec;border-radius:7px;padding:12px;margin:0 0 13px}.student-profile-summary article{flex:1}.student-profile-summary small,.student-profile-details small{display:block;color:#687a90;font-size:9px}.student-profile-summary strong{display:block;font-size:17px;margin-top:5px}.student-profile-details{display:grid;grid-template-columns:repeat(3,1fr);gap:8px}.student-profile-details p{padding:7px;background:#f7f9fb}.student-profile-details strong{display:block;margin-top:4px}table{width:100%;border-collapse:collapse;font-size:9px;margin-top:5px}th{text-align:left;background:#edf2f7;color:#51647c}td,th{padding:6px 5px;border-bottom:1px solid #e4eaf0;vertical-align:top}tr{break-inside:avoid}.student-profile-generated{color:#738298;font-size:9px}@media print{body{margin:10mm}.student-profile-section{break-inside:avoid}}</style></head><body><h2>'+escapeHTML(student.full_name)+'</h2><p>'+escapeHTML(student.student_code)+' · '+escapeHTML(student.class_group||"")+'</p>'+report.innerHTML+'</body></html>');
        popup.document.close();popup.focus();setTimeout(()=>popup.print(),350);
      });
    }catch(error){
      body.innerHTML='<p class="registry-error">Could not load the student record: '+escapeHTML(error.message||"Unknown error")+'</p><button type="button" class="button button-quiet" id="closeStudentProfile">Close</button>';
      document.getElementById("closeStudentProfile").addEventListener("click",()=>{panel.hidden=true;});
    }
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
  document.getElementById("exportStudents").addEventListener("click",()=>{
    const q=search.value.trim().toLowerCase();
    const exportRows=records.filter(s=>s.is_active).filter(s=>{
      const g=guardianOf(s);
      return [s.full_name,s.student_code,s.class_group,g.guardian_name,g.phone,g.email].join(" ").toLowerCase().includes(q);
    });
    if(!exportRows.length){showToast("There are no active student records to export.");return;}
    const csvCell=value=>'"'+String(value??"").replace(/"/g,'""')+'"';
    const headings=["Student name","Student ID","Class / group","Guardian name","Guardian phone","Guardian email","Status"];
    const lines=[headings,...exportRows.map(s=>{
      const g=guardianOf(s);
      return [s.full_name,s.student_code,s.class_group,g.guardian_name,g.phone,g.email,"Active"];
    })].map(row=>row.map(csvCell).join(","));
    const blob=new Blob(["\uFEFF"+lines.join("\r\n") ],{type:"text/csv;charset=utf-8;"});
    const url=URL.createObjectURL(blob);
    const link=document.createElement("a");
    link.href=url;
    link.download="discipline-students-"+disciplineToday()+".csv";
    document.body.appendChild(link);link.click();link.remove();
    URL.revokeObjectURL(url);
    showToast(exportRows.length+" active student record(s) exported.");
  });
  rows.addEventListener("click",async e=>{
     const view=e.target.closest("[data-view-student]");
     if(view){const student=records.find(x=>x.id===view.dataset.viewStudent);if(student)await viewStudentProfile(student);return;}
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
    <div class="accounts-admin-head"><div><div class="eyebrow"><span class="eyebrow-line"></span> ADMINISTRATION / ACCESS CONTROL</div><h1>Portal Accounts</h1><p class="page-intro">Give every parent, student and driver secure access to the right part of DISCIPLINE.</p></div><div class="accounts-secure-tag"><span>✦</span> Secure account setup</div></div>
    <div class="accounts-overview">
      <div class="accounts-overview-card"><span class="accounts-overview-icon">01</span><div><strong>Choose a role</strong><small>Parent, student or route driver</small></div></div>
      <div class="accounts-overview-card"><span class="accounts-overview-icon accounts-icon-blue">02</span><div><strong>Connect records</strong><small>Link students or route riders</small></div></div>
      <div class="accounts-overview-card"><span class="accounts-overview-icon accounts-icon-green">03</span><div><strong>Send invitation</strong><small>They create their own password</small></div></div>
    </div>
    <div class="accounts-workspace">
      <section class="panel accounts-create-panel">
        <div class="accounts-panel-heading"><div><span class="accounts-step-label">ACCOUNT DETAILS</span><h2>Create or link an account</h2><p>Enter the person's details, then connect their student records.</p></div><span class="accounts-heading-symbol">＋</span></div>
        <form id="portalAccountForm">
          <div class="accounts-form-section"><div class="accounts-form-section-title"><span>1</span><div><strong>Person and portal</strong><small>Who will sign in to DISCIPLINE?</small></div></div>
            <div class="form-grid accounts-form-grid">
              <div class="field"><label for="portalRole">Account type</label><select id="portalRole" required><option value="parent">Parent / Guardian</option><option value="student">Student (view only)</option><option value="driver">Driver</option></select></div>
              <div class="field"><label for="portalName">Full name</label><input id="portalName" required maxlength="100" placeholder="Full name"></div>
              <div class="field accounts-email-field"><label for="portalEmail">Email address</label><input id="portalEmail" type="email" required maxlength="254" placeholder="name@example.com"></div>
              <div class="field" id="driverRouteFields" hidden><label for="portalRouteName">Route name</label><input id="portalRouteName" maxlength="100" placeholder="e.g. North Route"></div>
              <div class="field" id="driverVehicleFields" hidden><label for="portalVehicleLabel">Vehicle label (optional)</label><input id="portalVehicleLabel" maxlength="80" placeholder="e.g. Van 1"></div>
            </div>
          </div>
          <div class="accounts-form-section accounts-student-section"><div class="accounts-form-section-title"><span>2</span><div><strong>Student connection</strong><small>Choose the linked child, student profile or route riders.</small></div></div>
            <div class="field"><label for="portalStudent" id="portalStudentLabel">Link to student</label><select id="portalStudent" required><option value="">Loading student profiles…</option></select><small class="registry-disclaimer" id="portalStudentHint">Choose the child linked to this parent.</small></div>
          </div>
          <div class="accounts-security-note"><span class="accounts-security-icon">✓</span><div><strong>Password safety is built in</strong><p>Users receive an invitation email and create their own password. Never enter or share their password here.</p></div></div>
          <div class="accounts-submit-row"><p id="portalAccountMessage" class="auth-message" role="status"></p><button class="button button-primary" id="createPortalAccount" type="submit">Create / link account <span>→</span></button></div>
        </form>
      </section>
      <aside class="accounts-guide-column">
        <section class="panel accounts-guide-panel"><div class="accounts-guide-heading"><span>BEFORE YOU INVITE</span><span class="accounts-guide-check">✓</span></div><h3>A quick checklist</h3><p class="accounts-guide-intro">A few checks help keep family and journey records connected correctly.</p><ul class="accounts-check-list"><li><span>✓</span><div><strong>Register the student first</strong><small>Add the student in Student Registry before creating an account.</small></div></li><li><span>✓</span><div><strong>Confirm the email address</strong><small>Use an inbox the parent or driver can access.</small></div></li><li><span>✓</span><div><strong>Use separate parent logins</strong><small>Create a separate account for each parent email.</small></div></li><li><span>✓</span><div><strong>Check student assignments</strong><small>Parent accounts link to one student in this first release. Drivers can be assigned multiple students.</small></div></li></ul></section>
        <section class="accounts-help-card"><span>NEED TO MAKE A CHANGE?</span><strong>Manage family connections</strong><p>Use Parent Management to review parent-to-student links and family responses.</p></section>
      </aside>
    </div>
    <footer class="page-footer"><span>© 2026 DISCIPLINE.</span><span>SECURE ACCOUNT PROVISIONING</span></footer>`;
  const select=document.getElementById("portalStudent");
  const {data:students,error}=await window.disciplineSupabase.from("students").select("id,student_code,full_name,class_group").eq("is_active",true).order("full_name");
  if(error){select.innerHTML='<option value="">Could not load students</option>';document.getElementById("portalAccountMessage").textContent=error.message;return;}
  select.innerHTML='<option value="">Choose a student</option>'+(students||[]).map(s=>'<option value="'+s.id+'">'+escapeHTML(s.student_code)+' — '+escapeHTML(s.full_name)+(s.class_group?' ('+escapeHTML(s.class_group)+')':'')+'</option>').join("");
  const roleSelect=document.getElementById("portalRole");
  const routeFields=document.getElementById("driverRouteFields");
  const vehicleFields=document.getElementById("driverVehicleFields");
  const routeNameInput=document.getElementById("portalRouteName");
  const studentLabel=document.getElementById("portalStudentLabel");
  const studentHint=document.getElementById("portalStudentHint");
  function updateAccountForm(){
    const isDriver=roleSelect.value==="driver";
    const isStudent=roleSelect.value==="student";
    select.multiple=isDriver;
    select.size=isDriver?6:1;
    select.value="";
    routeFields.hidden=!isDriver;
    vehicleFields.hidden=!isDriver;
    routeNameInput.required=isDriver;
    studentLabel.textContent=isDriver?"Students assigned to this driver":"Link to student";
    studentHint.textContent=isDriver?"Select every student who travels on this route (use Ctrl to select more than one).":isStudent?"Choose the student profile for this login. Student access is view-only.":"Choose the child linked to this parent.";
    select.setAttribute("aria-label",isDriver?"Select students assigned to this driver":isStudent?"Choose the student profile for this login":"Choose the linked student");
  }
  roleSelect.addEventListener("change",updateAccountForm);
  updateAccountForm();
  document.getElementById("portalAccountForm").addEventListener("submit",async e=>{
    e.preventDefault();
    const btn=document.getElementById("createPortalAccount"),msg=document.getElementById("portalAccountMessage");
    btn.disabled=true;btn.textContent="Sending invitation…";msg.textContent="";
    const role=roleSelect.value;
    const payload={role,display_name:document.getElementById("portalName").value.trim(),email:document.getElementById("portalEmail").value.trim()};
    if(role==="driver"){
      payload.route_name=routeNameInput.value.trim();
      payload.vehicle_label=document.getElementById("portalVehicleLabel").value.trim();
      payload.student_ids=Array.from(select.selectedOptions).map(option=>option.value).filter(Boolean);
      if(!payload.student_ids.length){msg.textContent="Select at least one student for this route.";btn.disabled=false;btn.textContent="Create / link account";return;}
    }else{
      payload.student_id=select.value;
    }
    const {data,error}=await window.disciplineSupabase.functions.invoke("create-portal-account",{body:payload});
    if(error||!data||!data.success){msg.textContent=(data&&data.error)||error?.message||"Could not create or link account. Please try again.";}
    else {
      msg.style.color="#7ed6a5";
      msg.textContent=data.existing_account
        ?"Existing "+data.role+" account for "+data.email+" is linked. No new invitation was sent."
        :"Invitation sent to "+data.email+". The user must open the email and set a password.";
      e.target.reset();
      updateAccountForm();
    }
    btn.disabled=false;btn.textContent="Create / link account";
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
 pageContent.innerHTML='<div class="attendance-head"><div><div class="eyebrow"><span class="eyebrow-line"></span> DAILY REGISTER / INSTITUTE</div><h1>Morning Attendance</h1><p class="page-intro">Home → Institute · Keep an accurate record of every student’s morning attendance.</p></div><span class="attendance-secure-tag">ADMINISTRATOR REGISTER</span></div><section class="attendance-summary"><article class="attendance-summary-card"><span class="attendance-summary-icon">01</span><div><small>ACTIVE STUDENTS</small><strong id="attendanceStudentCount">—</strong><span>Enrolled profiles</span></div></article><article class="attendance-summary-card"><span class="attendance-summary-icon present">02</span><div><small>MARKED TODAY</small><strong id="attendanceMarkedCount">—</strong><span>Attendance entries saved</span></div></article><article class="attendance-summary-card"><span class="attendance-summary-icon pending">03</span><div><small>NOT YET MARKED</small><strong id="attendanceRemainingCount">—</strong><span>Awaiting a status</span></div></article></section><section class="panel registry-panel attendance-control-panel"><div class="attendance-panel-heading"><div><span class="attendance-step">STEP 1 · SESSION</span><h2>Register controls</h2><p>Select the date and open the register before entering attendance.</p></div><span class="attendance-panel-mark">A</span></div><div class="attendance-toolbar"><div class="field"><label for="attendanceDate">ATTENDANCE DATE</label><input id="attendanceDate" type="date" value="'+disciplineToday()+'"></div><div class="attendance-actions"><button class="button button-outline" id="startMorningSession">Start morning register</button><button class="button button-primary" id="saveAttendance" disabled>Save attendance</button></div></div><p id="attendanceInfo" class="attendance-info" role="status">Loading attendance records…</p></section><section class="panel registry-panel attendance-list-panel"><div class="attendance-list-heading"><div><span class="attendance-step">STEP 2 · STUDENTS</span><h2>Student attendance register</h2><p>Choose a status for each student. Notes are optional.</p></div><div class="attendance-register-tools"><input class="registry-search" id="attendanceSearch" type="search" placeholder="Search name, ID or class…" aria-label="Search attendance"><button class="button button-outline" id="attendancePrintRegister" type="button">Print register</button><button class="button button-quiet" id="attendanceExportCsv" type="button">Export CSV</button></div></div><div class="table-scroll"><table class="registry-table attendance-table"><thead><tr><th>STUDENT</th><th>STUDENT ID</th><th>CLASS / GROUP</th><th>ATTENDANCE STATUS</th><th>NOTE (OPTIONAL)</th></tr></thead><tbody id="attendanceRows"></tbody></table></div><p class="attendance-footnote">Changes are saved only when you select “Save attendance”.</p></section><footer class="page-footer"><span>DISCIPLINE · Morning attendance</span><span>SUPABASE · ADMINISTRATOR ACCESS</span></footer>';
 if(!db){showToast("Database is unavailable.");return;}
 const sr=await db.from("students").select("id,student_code,full_name,class_group").eq("is_active",true).order("full_name");
 if(sr.error){showToast(sr.error.message);return;}
 const students=sr.data||[],rows=document.getElementById("attendanceRows"),date=document.getElementById("attendanceDate"),info=document.getElementById("attendanceInfo"),save=document.getElementById("saveAttendance"),start=document.getElementById("startMorningSession");
 let session=null,existing={};
  function filteredAttendanceStudents(){
   const q=document.getElementById("attendanceSearch").value.trim().toLowerCase();
   return students.filter(x=>(x.full_name+" "+x.student_code+" "+(x.class_group||"")).toLowerCase().includes(q));
  }
 function draw(){
  const marked=students.filter(x=>!!(existing[x.id]&&existing[x.id].status)).length;
  document.getElementById("attendanceStudentCount").textContent=students.length;
  document.getElementById("attendanceMarkedCount").textContent=marked;
  document.getElementById("attendanceRemainingCount").textContent=Math.max(0,students.length-marked);
  rows.innerHTML=filteredAttendanceStudents().map(x=>{
   const a=existing[x.id]||{},disabled=!session||session.ends_at?"disabled":"";
   return '<tr><td data-label="Student"><strong>'+escapeHTML(x.full_name)+'</strong></td><td data-label="Student ID">'+escapeHTML(x.student_code)+'</td><td data-label="Class / group">'+escapeHTML(x.class_group||"—")+'</td><td data-label="Attendance status"><select '+disabled+' data-status="'+x.id+'"><option value="">Not marked</option>'+["present","absent","late","excused"].map(v=>'<option value="'+v+'" '+(a.status===v?"selected":"")+'>'+v.charAt(0).toUpperCase()+v.slice(1)+'</option>').join("")+'</select></td><td data-label="Note"><input '+disabled+' data-note="'+x.id+'" maxlength="300" value="'+escapeHTML(a.notes||"")+'" placeholder="Add an optional note"></td></tr>';
  }).join("")||'<tr><td colspan="5" class="registry-empty">No students match your search.</td></tr>';
  save.disabled=!session||!!session.ends_at;
 }
  function attendanceCsvCell(value){
   const raw=String(value??"");
   const safe=/^[\s]*[=+\-@]/.test(raw)?"'"+raw:raw;
   return '"'+safe.replace(/"/g,'""')+'"';
  }
  function exportAttendanceCsv(){
   const visible=filteredAttendanceStudents();
   if(!visible.length){showToast("There are no students matching the attendance search.");return;}
   const csvRows=[
    ["Student name","Student ID","Class / group","Attendance date","Status","Note"].map(x=>attendanceCsvCell(x)).join(","),
    ...visible.map(student=>{
     const entry=existing[student.id]||{};
     return [student.full_name,student.student_code,student.class_group||"",date.value,entry.status||"Not marked",entry.notes||""].map(attendanceCsvCell).join(",");
    })
   ];
   const blob=new Blob(["\uFEFF"+csvRows.join("\r\n")],{type:"text/csv;charset=utf-8;"});
   const url=URL.createObjectURL(blob),link=document.createElement("a");
   link.href=url;link.download="discipline-attendance-"+date.value+".csv";
   document.body.appendChild(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(url),1200);
   showToast(visible.length+" attendance row(s) exported.");
  }
  function printAttendanceRegister(){
   const visible=filteredAttendanceStudents();
   if(!visible.length){showToast("There are no students matching the attendance search.");return;}
   const count=status=>visible.filter(student=>(existing[student.id]?.status||"not_marked")===status).length;
   const marked=count("present")+count("absent")+count("late")+count("excused");
   const printRows=visible.map(student=>{
    const entry=existing[student.id]||{};
    const status=entry.status?entry.status.charAt(0).toUpperCase()+entry.status.slice(1):"Not marked";
    return "<tr><td>"+escapeHTML(student.full_name)+"</td><td>"+escapeHTML(student.student_code)+"</td><td>"+escapeHTML(student.class_group||"—")+"</td><td>"+escapeHTML(status)+"</td><td>"+escapeHTML(entry.notes||"")+"</td><td>________________</td></tr>";
   }).join("");
   const popup=window.open("","_blank");
   if(!popup){showToast("Allow pop-ups to print the attendance register.");return;}
   popup.opener=null;
   const html="<!doctype html><html lang=\"en\"><head><meta charset=\"utf-8\"><meta name=\"viewport\" content=\"width=device-width,initial-scale=1\"><title>DISCIPLINE Attendance Register</title>"+
    "<style>body{font-family:Arial,sans-serif;color:#24364d;margin:26px}header{display:flex;justify-content:space-between;gap:15px;align-items:flex-start;border-bottom:2px solid #c7a56b;padding-bottom:13px;margin-bottom:17px}h1{font-size:22px;margin:0 0 6px}p{margin:4px 0;color:#697a90;font-size:10px}.meta{text-align:right;font-size:10px;color:#697a90}.summary{display:flex;gap:10px;flex-wrap:wrap;margin:16px 0}.summary span{border:1px solid #dce3ec;border-radius:6px;padding:8px 10px;font-size:10px}.summary strong{font-size:14px;margin-left:5px}table{width:100%;border-collapse:collapse;font-size:10px}th{background:#edf2f7;text-align:left;color:#50637b;font-size:8px;letter-spacing:.4px}th,td{padding:8px 6px;border-bottom:1px solid #e5eaf0}footer{margin-top:18px;padding-top:10px;border-top:1px solid #dce3ec;color:#718096;font-size:9px}@media print{body{margin:12mm}tr{break-inside:avoid}}@media(max-width:680px){body{margin:10px}table{font-size:8px}th,td{padding:5px 3px}}</style></head><body>"+
    "<header><div><h1>DISCIPLINE · Morning Attendance Register</h1><p>Home to institute · Daily student roll</p></div><div class=\"meta\"><strong>Date</strong><br>"+escapeHTML(date.value)+"<br><br>Register: "+(session?(session.ends_at?"Closed":"Open"):"Not started")+"</div></header>"+
    "<div class=\"summary\"><span>Students <strong>"+visible.length+"</strong></span><span>Marked <strong>"+marked+"</strong></span><span>Present <strong>"+count("present")+"</strong></span><span>Absent <strong>"+count("absent")+"</strong></span><span>Late <strong>"+count("late")+"</strong></span><span>Excused <strong>"+count("excused")+"</strong></span><span>Not marked <strong>"+count("not_marked")+"</strong></span></div>"+
    "<table><thead><tr><th>STUDENT</th><th>STUDENT ID</th><th>CLASS / GROUP</th><th>STATUS</th><th>NOTE</th><th>TEACHER INITIALS</th></tr></thead><tbody>"+printRows+"</tbody></table>"+
    "<footer>DISCIPLINE · Attendance register · Printed "+escapeHTML(new Date().toLocaleString("en-IN"))+"</footer></body></html>";
   popup.document.open();popup.document.write(html);popup.document.close();popup.focus();
   window.setTimeout(()=>popup.print(),350);
  }
  document.getElementById("attendanceExportCsv").addEventListener("click",exportAttendanceCsv);
  document.getElementById("attendancePrintRegister").addEventListener("click",printAttendanceRegister);

 async function load(){
  try{
   session=await disciplineSession(db,"morning",date.value,false);existing={};
   if(session){const a=await db.from("attendance").select("student_id,status,notes").eq("session_id",session.id);if(a.error)throw a.error;(a.data||[]).forEach(x=>existing[x.student_id]=x);}
   info.textContent=session?"Register "+(session.ends_at?"closed":"open")+" · "+Object.keys(existing).length+" saved record(s) · "+date.value: "No register exists for this date. Start the morning register to begin.";
   info.className="attendance-info "+(session&&session.ends_at?"is-closed":session?"is-open":"is-pending");
   start.disabled=!!session;start.textContent=session?"Session created":"Start morning register";draw();
  }catch(e){info.textContent="Could not load attendance: "+e.message;info.className="attendance-info is-error";}
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
 pageContent.innerHTML='<div class="journeys-head"><div><div class="eyebrow"><span class="eyebrow-line"></span> DAILY OPERATIONS / JOURNEY CONTROL</div><h1>Journey Sessions</h1><p class="page-intro">Open and close the institute’s morning and evening journey registers.</p></div><span class="journeys-admin-tag">SESSION MANAGEMENT</span></div><section class="journeys-date-panel"><div><span class="journeys-step">SESSION DATE</span><h2>Choose an operating date</h2><p>Review or manage the journey sessions for the selected day.</p></div><div class="field"><label for="journeyDate">DATE</label><input id="journeyDate" type="date" value="'+disciplineToday()+'"></div></section><div class="journeys-section-heading"><div><span class="journeys-step">TWO DAILY JOURNEYS</span><h2>Session control</h2></div><p>Each journey has its own independent register.</p></div><div class="journey-management-grid"><section class="panel registry-panel journey-management-card journey-morning"><div class="journey-card-top"><span class="journey-card-icon">AM</span><span class="journey-card-route">HOME → INSTITUTE</span></div><span class="journey-card-kicker">MORNING JOURNEY</span><h3>Morning session</h3><p class="journey-card-description">Manage the institute-bound journey and its attendance register.</p><div id="morningStatus" class="journey-status">Loading…</div><div class="journey-time-block"><span>SESSION TIMING</span><p id="morningTime" class="journey-time">Loading session times…</p></div><button class="button button-primary" id="morningAction">Loading…</button></section><section class="panel registry-panel journey-management-card journey-evening"><div class="journey-card-top"><span class="journey-card-icon">PM</span><span class="journey-card-route">INSTITUTE → HOME</span></div><span class="journey-card-kicker">EVENING JOURNEY</span><h3>Evening session</h3><p class="journey-card-description">Manage the return journey and its daily session record.</p><div id="eveningStatus" class="journey-status">Loading…</div><div class="journey-time-block"><span>SESSION TIMING</span><p id="eveningTime" class="journey-time">Loading session times…</p></div><button class="button button-primary" id="eveningAction">Loading…</button></section></div><p class="journeys-note">Session times are displayed in your local browser time. Closing a session records its end time.</p><footer class="page-footer"><span>DISCIPLINE · Journey operations</span><span>SUPABASE · ADMINISTRATOR ACCESS</span></footer>';
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
async function renderDriverRoutes(){
 const db=window.disciplineSupabase;
 pageContent.innerHTML='<div class="driver-routes-head"><div><div class="eyebrow"><span class="eyebrow-line"></span> ADMINISTRATION / TRANSPORT</div><h1>Drivers & Routes</h1><p class="page-intro">Manage driver access, organise student assignments and control active routes.</p></div><button class="button button-primary" data-page="accounts">＋ Create driver account</button></div><div class="driver-route-metrics"><article class="driver-route-metric"><span class="driver-route-metric-icon">01</span><div><small>DRIVER ACCOUNTS</small><strong id="driverRouteDrivers">—</strong><span>Registered drivers</span></div></article><article class="driver-route-metric"><span class="driver-route-metric-icon blue">02</span><div><small>ACTIVE ROUTES</small><strong id="driverRouteActive">—</strong><span>Routes in service</span></div></article><article class="driver-route-metric"><span class="driver-route-metric-icon green">03</span><div><small>STUDENTS ASSIGNED</small><strong id="driverRouteStudents">—</strong><span>Current assignments</span></div></article></div><div class="driver-route-statusline"><span class="driver-route-status-dot"></span><span id="driverRouteMessage" role="status">Loading driver routes…</span></div><div id="driverRouteCards"></div><div id="driverRouteEditor"></div><footer class="page-footer"><span>© 2026 DISCIPLINE.</span><span>DRIVER ACCESS MANAGEMENT</span></footer>';
 if(!db){document.getElementById("driverRouteMessage").textContent="Database connection unavailable. Refresh and try again.";return;}
 const message=document.getElementById("driverRouteMessage"),cards=document.getElementById("driverRouteCards"),editor=document.getElementById("driverRouteEditor");
 let drivers=[],routes=[],assignments=[],students=[];
 const today=disciplineToday();
 async function load(){
  message.textContent="Loading driver routes…";
  const results=await Promise.all([
   db.from("profiles").select("user_id,display_name,email,is_active").eq("role","driver").order("display_name"),
   db.from("driver_routes").select("id,driver_user_id,route_name,vehicle_label,is_active,created_at,updated_at").order("created_at",{ascending:false}),
   db.from("driver_route_students").select("id,route_id,student_id,valid_from,valid_to"),
   db.from("students").select("id,student_code,full_name,class_group,is_active").order("full_name")
  ]);
  const failed=results.find(x=>x.error);
  if(failed){message.textContent="Could not load driver management data: "+failed.error.message;cards.innerHTML="";return false;}
  drivers=results[0].data||[];routes=results[1].data||[];assignments=results[2].data||[];students=results[3].data||[];
  const driverMap=new Map(drivers.map(x=>[x.user_id,x]));
  const studentMap=new Map(students.map(x=>[x.id,x]));
  const activeRoutes=routes.filter(x=>x.is_active);
  const activeAssignments=assignments.filter(x=>!x.valid_to||x.valid_to>=today).filter(x=>x.valid_from<=today);
  document.getElementById("driverRouteDrivers").textContent=drivers.length;
  document.getElementById("driverRouteActive").textContent=activeRoutes.length;
  document.getElementById("driverRouteStudents").textContent=new Set(activeAssignments.filter(x=>activeRoutes.some(r=>r.id===x.route_id)).map(x=>x.student_id)).size;
  message.textContent=drivers.length+" driver account(s) · "+activeRoutes.length+" active route(s)";
  if(!drivers.length){
    cards.innerHTML='<section class="panel registry-panel"><h3>No driver accounts yet</h3><p class="page-intro">Create a Driver account in Portal Accounts, then assign its route and students.</p><button class="button button-primary" data-page="accounts">Create first driver</button></section>';
    return true;
  }
  cards.innerHTML=drivers.map(driver=>{
   const driverRoutes=routes.filter(r=>r.driver_user_id===driver.user_id);
   const routeHtml=driverRoutes.length?driverRoutes.map(route=>{
    const routeAssignments=assignments.filter(a=>a.route_id===route.id);
    const current=routeAssignments.filter(a=>!a.valid_to||a.valid_to>=today).filter(a=>a.valid_from<=today);
    const names=current.map(a=>studentMap.get(a.student_id)).filter(Boolean).map(s=>escapeHTML(s.full_name)+" <small>("+escapeHTML(s.student_code)+")</small>").join(", ");
    const hasOtherActiveRoute=!route.is_active&&routes.some(other=>other.driver_user_id===route.driver_user_id&&other.is_active);
    return '<article class="driver-route-card"><div class="driver-route-card-head"><div><span class="stat-label">'+(route.is_active?"ACTIVE ROUTE":"PAUSED ROUTE")+'</span><h3>'+escapeHTML(route.route_name)+'</h3><p>'+escapeHTML(route.vehicle_label||"Vehicle not specified")+'</p></div><span class="session-status '+(route.is_active?"completed":"")+'">'+(route.is_active?"Active":"Paused")+'</span></div><div class="driver-route-meta"><span><strong>'+current.length+'</strong> assigned student(s)</span><span>Created '+escapeHTML(new Date(route.created_at).toLocaleDateString("en-IN"))+'</span></div><p class="driver-route-students">'+(names||"No active student assignments")+'</p><div class="attendance-actions"><button type="button" class="button button-outline" data-edit-driver-route="'+route.id+'" '+(!route.is_active?"disabled":"")+'>Edit route</button><button type="button" class="button '+(route.is_active?"button-quiet":"button-outline")+'" data-toggle-driver-route="'+route.id+'" data-active="'+(route.is_active?"true":"false")+'" '+(hasOtherActiveRoute?'disabled title="Pause the driver’s current route before resuming this one"':'')+'>'+(route.is_active?"Pause route":"Resume route")+'</button></div></article>';
   }).join(""):'<article class="driver-route-card"><h3>No route assigned</h3><p>This driver account does not have an active route yet.</p><button class="button button-outline" data-page="accounts">Assign route in Portal Accounts</button></article>';
   return '<section class="panel registry-panel driver-account-group"><div class="panel-heading"><div><h2>'+escapeHTML(driver.display_name||"Driver")+'</h2><p>'+escapeHTML(driver.email||"No email on file")+(driver.is_active?"":" · Account inactive")+'</p></div><span class="session-status '+(driver.is_active?"completed":"")+'">'+(driver.is_active?"Account active":"Account inactive")+'</span></div>'+routeHtml+'</section>';
  }).join("");
  return true;
 }
 function openEditor(routeId){
  const route=routes.find(x=>x.id===routeId);
  if(!route||!route.is_active){message.textContent="Only active routes can be edited here. Resume a paused route or create a new route for this driver.";return;}
  const driver=drivers.find(x=>x.user_id===route.driver_user_id);
  if(!driver){message.textContent="The driver profile could not be found.";return;}
  const activeIds=assignments.filter(a=>a.route_id===route.id&&a.valid_from<=today&&(!a.valid_to||a.valid_to>=today)).map(a=>a.student_id);
  const activeStudents=students.filter(s=>s.is_active);
  editor.innerHTML='<section class="panel registry-panel driver-route-editor"><div class="panel-heading"><div><h2>Edit route</h2><p>Changes affect future check-ins. Previously saved journey records remain.</p></div><button class="button button-quiet" type="button" id="closeDriverRouteEditor">Close</button></div><form id="driverRouteEditForm"><div class="form-grid"><div class="field"><label>Driver name</label><input value="'+escapeHTML(driver.display_name||"")+'" disabled></div><div class="field"><label>Driver email</label><input value="'+escapeHTML(driver.email||"")+'" disabled></div><div class="field"><label for="editDriverRouteName">Route name</label><input id="editDriverRouteName" required maxlength="100" value="'+escapeHTML(route.route_name)+'"></div><div class="field"><label for="editDriverVehicle">Vehicle label</label><input id="editDriverVehicle" maxlength="80" value="'+escapeHTML(route.vehicle_label||"")+'" placeholder="Optional"></div></div><div class="field driver-editor-students"><label for="editDriverStudents">Assigned students</label><select id="editDriverStudents" multiple size="8" required>'+activeStudents.map(s=>'<option value="'+s.id+'" '+(activeIds.includes(s.id)?"selected":"")+'>'+escapeHTML(s.student_code)+' — '+escapeHTML(s.full_name)+(s.class_group?" ("+escapeHTML(s.class_group)+")":"")+'</option>').join("")+'</select><small class="registry-disclaimer">Select at least one active student. On this route, changes to existing assignments take effect after today.</small></div><div class="attendance-actions"><button class="button button-primary" id="saveDriverRoute" type="submit">Save route changes</button><span id="driverRouteEditStatus" class="registry-disclaimer" role="status"></span></div></form></section>';
  editor.scrollIntoView({behavior:"smooth",block:"start"});
  document.getElementById("closeDriverRouteEditor").addEventListener("click",()=>{editor.innerHTML="";});
  document.getElementById("driverRouteEditForm").addEventListener("submit",async event=>{
   event.preventDefault();
   const save=document.getElementById("saveDriverRoute"),status=document.getElementById("driverRouteEditStatus");
   const selected=Array.from(document.getElementById("editDriverStudents").selectedOptions).map(x=>x.value);
   const routeName=document.getElementById("editDriverRouteName").value.trim();
   const vehicle=document.getElementById("editDriverVehicle").value.trim();
   if(!selected.length){status.textContent="Select at least one student.";return;}
   save.disabled=true;save.textContent="Saving…";status.textContent="Updating assignments…";
   try{
    const {data,error}=await db.functions.invoke("create-portal-account",{body:{role:"driver",display_name:driver.display_name||"Driver",email:driver.email,route_name:routeName,vehicle_label:vehicle,student_ids:selected}});
    if(error||!data||!data.success)throw new Error((data&&data.error)||error?.message||"Could not save route changes.");
    status.textContent="Route updated successfully.";
    editor.innerHTML="";
    const ok=await load();
    if(ok)message.textContent="Route changes saved. Historical journey check-ins were retained.";
    showToast("Driver route updated.");
   }catch(error){status.textContent=error.message||"Could not save route changes.";save.disabled=false;save.textContent="Save route changes";}
  });
 }
 cards.addEventListener("click",async event=>{
  const edit=event.target.closest("[data-edit-driver-route]");
  if(edit){openEditor(edit.dataset.editDriverRoute);return;}
  const toggle=event.target.closest("[data-toggle-driver-route]");
  if(toggle){
   const route=routes.find(x=>x.id===toggle.dataset.toggleDriverRoute);
   if(!route)return;
   const next=!route.is_active;
   if(!next){
    const {data:openRun,error:runError}=await db.from("driver_route_runs").select("id").eq("route_id",route.id).eq("journey_date",disciplineToday()).eq("status","in_progress").limit(1).maybeSingle();
    if(runError){message.textContent="Could not verify the active trip before pausing: "+runError.message;return;}
    if(openRun){message.textContent="Finish this driver's active journey before pausing the route.";showToast("Active journey must be finished first.");return;}
   }
   if(!confirm((next?"Resume":"Pause")+" "+route.route_name+"? "+(next?"The assigned driver will regain access to this route.":"The driver will lose access to this route. Existing journey records will be kept.")))return;
   toggle.disabled=true;
   const {error}=await db.from("driver_routes").update({is_active:next,updated_at:new Date().toISOString()}).eq("id",route.id);
   if(error){message.textContent="Could not change route status: "+error.message;toggle.disabled=false;return;}
   await load();
   showToast(next?"Route resumed.":"Route paused.");
  }
 });
 await load();
}

async function renderDriverCheckins(){
 const db=window.disciplineSupabase;
 pageContent.innerHTML='<div class="driver-checkins-head"><div><div class="eyebrow"><span class="eyebrow-line"></span> JOURNEY CONTROL / DRIVER ACTIVITY</div><h1>Driver Check-ins & Trips</h1><p class="page-intro">Track route progress and review student journey updates for any date.</p></div></div>' +
 '<section class="driver-checkin-filter panel"><div class="driver-checkin-filter-title"><span class="driver-checkin-filter-icon">⌕</span><div><strong>Journey activity filters</strong><small>Choose a date and journey to view the records.</small></div></div><div class="driver-toolbar"><div class="field"><label for="driverCheckinDate">DATE</label><input type="date" id="driverCheckinDate" value="'+disciplineToday()+'"></div><div class="field"><label for="driverCheckinJourney">JOURNEY</label><select id="driverCheckinJourney"><option value="morning">Morning · Home to institute</option><option value="evening">Evening · Institute to home</option></select></div></div><p id="driverCheckinInfo" class="driver-checkin-info" role="status">Loading trip activity…</p></section>' +
 '<div class="driver-checkin-section-label"><div><span>AT A GLANCE</span><h2>Journey summary</h2></div><small>Based on the selected filters</small></div><div class="driver-checkin-metrics"><article class="driver-checkin-metric"><span class="driver-checkin-metric-icon">01</span><div><small>TOTAL CHECK-INS</small><strong id="driverCheckinTotal">—</strong><span>Student updates</span></div></article><article class="driver-checkin-metric"><span class="driver-checkin-metric-icon green">02</span><div><small>BOARDED</small><strong id="driverCheckinBoarded">—</strong><span>Marked as boarded</span></div></article><article class="driver-checkin-metric"><span class="driver-checkin-metric-icon amber">03</span><div><small>OTHER STATUSES</small><strong id="driverCheckinOther">—</strong><span>Other driver updates</span></div></article><article class="driver-checkin-metric"><span class="driver-checkin-metric-icon blue">04</span><div><small>TRIPS STARTED</small><strong id="driverRunTotal">—</strong><span>Route journeys</span></div></article><article class="driver-checkin-metric"><span class="driver-checkin-metric-icon green">05</span><div><small>IN PROGRESS</small><strong id="driverRunActive">—</strong><span>Currently underway</span></div></article><article class="driver-checkin-metric"><span class="driver-checkin-metric-icon slate">06</span><div><small>COMPLETED TRIPS</small><strong id="driverRunCompleted">—</strong><span>Finished journeys</span></div></article></div>' +
 '<section class="panel driver-checkin-panel"><div class="driver-checkin-panel-head"><div><span>ROUTE MONITOR</span><h2>Route trip progress</h2><p>Start and finish times for each driver route on the selected date.</p></div><span class="driver-checkin-panel-mark">01</span></div><div id="driverRunRows" class="driver-run-admin-list"><p class="registry-empty">Loading trip records…</p></div></section>' +
  '<section class="panel driver-checkin-panel"><div class="driver-checkin-panel-head"><div><span>STUDENT ACTIVITY</span><h2>Submitted journey records</h2><p>Latest saved status for each assigned student.</p></div><span class="driver-checkin-panel-mark">02</span></div><div class="driver-checkin-tools"><input id="driverCheckinSearch" class="registry-search" type="search" placeholder="Search student, route or note…" aria-label="Search driver check-ins"><select id="driverCheckinStatusFilter" aria-label="Filter by driver check-in status"><option value="">All statuses</option><option value="boarded">Boarded</option><option value="dropped_off">Dropped off</option><option value="late">Late</option><option value="absent">Absent</option><option value="not_on_vehicle">Not on vehicle</option></select><button class="button button-outline" id="driverCheckinPrint" type="button">Print report</button><button class="button button-quiet" id="driverCheckinExport" type="button">Export CSV</button></div><div class="table-scroll"><table class="registry-table driver-roster-table driver-mobile-cards"><thead><tr><th>STUDENT</th><th>ROUTE / VEHICLE</th><th>STATUS</th><th>NOTE</th><th>UPDATED</th></tr></thead><tbody id="driverCheckinRows"><tr><td colspan="5">Loading…</td></tr></tbody></table></div></section>';

  let checkinRecords=[],checkinDate="",checkinJourney="morning",driverNames=new Map();
  function filteredDriverCheckins(){
   const q=document.getElementById("driverCheckinSearch").value.trim().toLowerCase(),status=document.getElementById("driverCheckinStatusFilter").value;
   return checkinRecords.filter(x=>{const s=x.students||{},r=x.driver_routes||{};return (!status||x.status===status)&&[s.full_name,s.student_code,s.class_group,r.route_name,r.vehicle_label,x.status,x.note].join(" ").toLowerCase().includes(q);});
  }
  function drawDriverCheckins(){
   const visible=filteredDriverCheckins();
   rows.innerHTML=visible.map(x=>{const s=x.students||{},r=x.driver_routes||{};return '<tr><td data-label="Student"><strong>'+escapeHTML(s.full_name||"Student")+'</strong><small class="registry-email">'+escapeHTML(s.student_code||"")+(s.class_group?" · "+escapeHTML(s.class_group):"")+'</small></td><td data-label="Route / vehicle">'+escapeHTML(r.route_name||"—")+'<small class="registry-email">'+escapeHTML(r.vehicle_label||"")+(driverNames.get(r.driver_user_id)?" · "+escapeHTML(driverNames.get(r.driver_user_id)):"")+'</small></td><td data-label="Status"><span class="activity-type '+(x.status==="absent"||x.status==="not_on_vehicle"?"negative":x.status==="late"?"neutral":"positive")+'">'+escapeHTML(x.status.replaceAll("_"," "))+'</span></td><td data-label="Note">'+escapeHTML(x.note||"—")+'</td><td data-label="Updated">'+escapeHTML(new Date(x.recorded_at).toLocaleTimeString("en-IN",{hour:"2-digit",minute:"2-digit"}))+'</td></tr>';}).join("")||'<tr><td colspan="5">No check-ins match the current filters.</td></tr>';
   info.textContent=checkinRecords.length+" saved check-in(s) · "+visible.length+" shown · "+(journey.value==="morning"?"Morning":"Evening")+" journey · "+date.value;
  }
 const date=document.getElementById("driverCheckinDate"),journey=document.getElementById("driverCheckinJourney"),info=document.getElementById("driverCheckinInfo"),rows=document.getElementById("driverCheckinRows"),runRows=document.getElementById("driverRunRows");
 async function load(){
  info.textContent="Loading trip activity…";rows.innerHTML='<tr><td colspan="5">Loading…</td></tr>';runRows.innerHTML='<p class="registry-empty">Loading trip records…</p>';
  const [checkinsResult,runsResult,driversResult]=await Promise.all([
   db.from("driver_journey_checkins").select("id,journey_date,journey_type,status,note,recorded_at,students(full_name,student_code,class_group),driver_routes(route_name,vehicle_label)").eq("journey_date",date.value).eq("journey_type",journey.value).order("recorded_at",{ascending:false}),
   db.from("driver_route_runs").select("id,journey_date,journey_type,status,started_at,finished_at,driver_routes(route_name,vehicle_label,driver_user_id)").eq("journey_date",date.value).eq("journey_type",journey.value).order("started_at",{ascending:false}),
   db.from("profiles").select("user_id,display_name").eq("role","driver")
  ]);
  const failed=checkinsResult.error||runsResult.error||driversResult.error;
  if(failed){info.textContent="Could not load trip activity: "+failed.message;rows.innerHTML='<tr><td colspan="5">Records unavailable.</td></tr>';runRows.innerHTML='<p class="registry-empty">Trip progress unavailable.</p>';return;}
   const list=checkinsResult.data||[],runs=runsResult.data||[];checkinRecords=list;checkinDate=date.value;checkinJourney=journey.value;driverNames=new Map((driversResult.data||[]).map(x=>[x.user_id,x.display_name||"Driver"]));const drivers=driverNames;
  const boarded=list.filter(x=>x.status==="boarded").length,activeRuns=runs.filter(x=>x.status==="in_progress").length,completedRuns=runs.filter(x=>x.status==="completed").length;
  document.getElementById("driverCheckinTotal").textContent=list.length;
  document.getElementById("driverCheckinBoarded").textContent=boarded;
  document.getElementById("driverCheckinOther").textContent=list.length-boarded;
  document.getElementById("driverRunTotal").textContent=runs.length;
  document.getElementById("driverRunActive").textContent=activeRuns;
  document.getElementById("driverRunCompleted").textContent=completedRuns;
  runRows.innerHTML=runs.map(run=>{
   const route=run.driver_routes||{},status=run.status==="completed"?"Completed":"In progress";
   const startTime=new Date(run.started_at).toLocaleTimeString("en-IN",{hour:"2-digit",minute:"2-digit"});
   const finishTime=run.finished_at?new Date(run.finished_at).toLocaleTimeString("en-IN",{hour:"2-digit",minute:"2-digit"}):"Not finished";
   return '<article class="driver-run-admin-card"><div class="driver-run-admin-main"><span class="stat-label">'+escapeHTML(drivers.get(route.driver_user_id)||"Driver")+'</span><strong>'+escapeHTML(route.route_name||"Route")+'</strong><small>'+escapeHTML(route.vehicle_label||"Vehicle not specified")+'</small></div><span class="session-status '+(run.status==="completed"?"completed":"in-progress")+'">'+status+'</span><div class="driver-run-admin-times"><span>Started <strong>'+escapeHTML(startTime)+'</strong></span><span>Finished <strong>'+escapeHTML(finishTime)+'</strong></span></div></article>';
  }).join("")||'<p class="registry-empty">No driver has started this journey yet.</p>';
   drawDriverCheckins();
 }
 date.addEventListener("change",()=>load().catch(e=>{info.textContent=e.message;}));
 journey.addEventListener("change",()=>load().catch(e=>{info.textContent=e.message;}));
  function driverCsvCell(value){const raw=String(value??"");const safe=/^[\s]*[=+\-@]/.test(raw)?"'"+raw:raw;return '"'+safe.replace(/"/g,'""')+'"';}
  function exportDriverCheckins(){
   const visible=filteredDriverCheckins();if(!visible.length){showToast("There are no driver check-ins matching the current filters.");return;}
   const csv=[["Date","Journey","Student name","Student ID","Class / group","Route","Vehicle","Driver","Status","Note","Updated at"].map(driverCsvCell).join(","),...visible.map(x=>{const s=x.students||{},r=x.driver_routes||{};return [date.value,journey.value,s.full_name||"Student",s.student_code||"",s.class_group||"",r.route_name||"",r.vehicle_label||"",driverNames.get(r.driver_user_id)||"",x.status,x.note||"",new Date(x.recorded_at).toLocaleString("en-IN")].map(driverCsvCell).join(",");})];
   const blob=new Blob(["\uFEFF"+csv.join("\r\n")],{type:"text/csv;charset=utf-8;"}),url=URL.createObjectURL(blob),link=document.createElement("a");link.href=url;link.download="discipline-driver-checkins-"+date.value+"-"+journey.value+".csv";document.body.appendChild(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(url),1200);showToast(visible.length+" driver check-in(s) exported.");
  }
  function printDriverCheckins(){
   const visible=filteredDriverCheckins();if(!visible.length){showToast("There are no driver check-ins matching the current filters.");return;}
   const count=status=>visible.filter(x=>x.status===status).length;
   const printRows=visible.map(x=>{const s=x.students||{},r=x.driver_routes||{};return "<tr><td>"+escapeHTML(s.full_name||"Student")+"</td><td>"+escapeHTML(s.student_code||"")+"</td><td>"+escapeHTML(r.route_name||"—")+"</td><td>"+escapeHTML(r.vehicle_label||"—")+"</td><td>"+escapeHTML(driverNames.get(r.driver_user_id)||"—")+"</td><td>"+escapeHTML(x.status.replaceAll("_"," "))+"</td><td>"+escapeHTML(x.note||"—")+"</td><td>"+escapeHTML(new Date(x.recorded_at).toLocaleTimeString("en-IN",{hour:"2-digit",minute:"2-digit"}))+"</td></tr>";}).join("");
   const popup=window.open("","_blank");if(!popup){showToast("Allow pop-ups to print the driver report.");return;}popup.opener=null;
   const html="<!doctype html><html lang=\"en\"><head><meta charset=\"utf-8\"><meta name=\"viewport\" content=\"width=device-width,initial-scale=1\"><title>DISCIPLINE Driver Check-ins</title><style>body{font-family:Arial,sans-serif;color:#24364d;margin:26px}header{display:flex;justify-content:space-between;gap:15px;align-items:flex-start;border-bottom:2px solid #c7a56b;padding-bottom:13px;margin-bottom:17px}h1{font-size:22px;margin:0 0 6px}p{margin:4px 0;color:#697a90;font-size:10px}.meta{text-align:right;font-size:10px;color:#697a90}.summary{display:flex;gap:10px;flex-wrap:wrap;margin:16px 0}.summary span{border:1px solid #dce3ec;border-radius:6px;padding:8px 10px;font-size:10px}.summary strong{font-size:14px;margin-left:5px}table{width:100%;border-collapse:collapse;font-size:10px}th{background:#edf2f7;text-align:left;color:#50637b;font-size:8px}th,td{padding:8px 6px;border-bottom:1px solid #e5eaf0}footer{margin-top:18px;padding-top:10px;border-top:1px solid #dce3ec;color:#718096;font-size:9px}@media print{body{margin:12mm}tr{break-inside:avoid}}@media(max-width:680px){body{margin:10px}table{font-size:8px}th,td{padding:5px 3px}}</style></head><body><header><div><h1>DISCIPLINE · Driver Journey Report</h1><p>"+(journey.value==="morning"?"Morning · Home to institute":"Evening · Institute to home")+"</p></div><div class=\"meta\"><strong>Date</strong><br>"+escapeHTML(date.value)+"<br><br>Generated "+escapeHTML(new Date().toLocaleString("en-IN"))+"</div></header><div class=\"summary\"><span>Check-ins <strong>"+visible.length+"</strong></span><span>Boarded <strong>"+count("boarded")+"</strong></span><span>Dropped off <strong>"+count("dropped_off")+"</strong></span><span>Late <strong>"+count("late")+"</strong></span><span>Absent <strong>"+count("absent")+"</strong></span><span>Not on vehicle <strong>"+count("not_on_vehicle")+"</strong></span></div><table><thead><tr><th>STUDENT</th><th>ID</th><th>ROUTE</th><th>VEHICLE</th><th>DRIVER</th><th>STATUS</th><th>NOTE</th><th>TIME</th></tr></thead><tbody>"+printRows+"</tbody></table><footer>DISCIPLINE · Driver activity · Includes only the currently filtered check-ins.</footer></body></html>";
   popup.document.open();popup.document.write(html);popup.document.close();popup.focus();setTimeout(()=>popup.print(),350);
  }
  document.getElementById("driverCheckinExport").addEventListener("click",exportDriverCheckins);
  document.getElementById("driverCheckinPrint").addEventListener("click",printDriverCheckins);
  document.getElementById("driverCheckinSearch").addEventListener("input",drawDriverCheckins);
  document.getElementById("driverCheckinStatusFilter").addEventListener("change",drawDriverCheckins);

 await load();
}

async function renderMarks(){
 const db=window.disciplineSupabase;
 pageContent.innerHTML='<div class="marks-head"><div><div class="eyebrow"><span class="eyebrow-line"></span> SCORE MANAGEMENT / ADMINISTRATION</div><h1>Award & Deduct Marks</h1><p class="page-intro">Recognise positive contributions and record fair, documented deductions.</p></div><span class="marks-secure-tag">AUDITABLE RECORDS</span></div><section class="marks-guidance"><span class="marks-guidance-icon">i</span><div><strong>Every mark change is recorded.</strong><p>Transactions are saved with a reason and before-and-after balance for a clear history.</p></div></section><section class="panel registry-panel marks-entry-panel"><div class="marks-section-heading"><div><span class="marks-step">STEP 1 · NEW TRANSACTION</span><h2>Record a mark change</h2><p>Only administrators can create mark transactions.</p></div><span class="marks-heading-mark">01</span></div><form id="markEntryForm"><div class="marks-form-grid"><div class="field"><label for="markStudent">STUDENT *</label><select id="markStudent" required><option value="">Loading students…</option></select></div><div class="field"><label for="markType">TRANSACTION TYPE *</label><select id="markType" required><option value="award">Award marks (+)</option><option value="deduction">Deduct marks (−)</option></select></div><div class="field"><label for="markAmount">NUMBER OF MARKS *</label><input id="markAmount" type="number" min="1" max="10000" step="1" required placeholder="e.g. 5"></div><div class="field"><label for="markSession">LINK TO JOURNEY SESSION</label><select id="markSession"><option value="">Not linked to a session</option></select></div><div class="field full"><label for="markReason">REASON / EXPLANATION *</label><textarea id="markReason" rows="3" maxlength="500" required placeholder="Write a clear, factual reason (3–500 characters)"></textarea></div></div><div class="marks-form-footer"><div><button class="button button-primary" id="saveMarkButton" type="submit">Save mark transaction</button><span id="markFormMessage" class="marks-form-message" role="status"></span></div><small>Check the student, mark type, amount and reason before saving.</small></div></form></section><section class="panel registry-panel marks-balance-panel"><div class="marks-section-heading"><div><span class="marks-step">STEP 2 · CURRENT SCORES</span><h2>Student mark balances</h2><p>Starting marks plus all saved transactions.</p></div><input class="registry-search" id="markStudentSearch" type="search" placeholder="Search students…" aria-label="Search student balances"></div><div class="table-scroll"><table class="registry-table"><thead><tr><th>STUDENT</th><th>STUDENT ID</th><th>STARTING MARKS</th><th>LIFETIME BALANCE</th></tr></thead><tbody id="markBalanceRows"><tr><td colspan="4">Loading…</td></tr></tbody></table></div></section><section class="panel registry-panel marks-history-panel"><div class="marks-section-heading"><div><span class="marks-step">STEP 3 · AUDIT TRAIL</span><h2>Recent transactions</h2><p>Latest 50 saved mark entries.</p></div><div class="marks-history-tools"><span class="marks-history-tag">LATEST ACTIVITY</span><input id="markHistorySearch" class="registry-search" type="search" placeholder="Search student or reason…" aria-label="Search mark transactions"><select id="markHistoryType" aria-label="Filter mark transaction type"><option value="">All transaction types</option><option value="award">Awards</option><option value="deduction">Deductions</option><option value="transfer_out">Transfers sent</option><option value="transfer_in">Transfers received</option><option value="appreciation">Appreciation</option><option value="correction">Corrections</option></select><button class="button button-outline" id="markHistoryPrint" type="button">Print report</button><button class="button button-quiet" id="markHistoryExport" type="button">Export CSV</button></div></div><p id="markHistoryCaption" class="registry-disclaimer">Latest 50 saved transactions.</p><div class="table-scroll"><table class="registry-table"><thead><tr><th>DATE</th><th>STUDENT</th><th>TYPE</th><th>REASON</th><th>CHANGE</th><th>BALANCE BEFORE</th><th>BALANCE AFTER</th></tr></thead><tbody id="markHistoryRows"><tr><td colspan="6">Loading…</td></tr></tbody></table></div></section><footer class="page-footer"><span>DISCIPLINE · Mark management</span><span>SUPABASE · ADMINISTRATOR ACCESS</span></footer>';
 if(!db){showToast("Database is unavailable.");return;}
 const studentSelect=document.getElementById("markStudent"),sessionSelect=document.getElementById("markSession"),balanceRows=document.getElementById("markBalanceRows"),historyRows=document.getElementById("markHistoryRows");
 const sr=await db.from("students").select("id,student_code,full_name,class_group,starting_marks").eq("is_active",true).order("full_name");
 if(sr.error){showToast("Could not load students: "+sr.error.message);return;}
 const students=sr.data||[];
  let transactionRecords=[];
  function filteredMarkTransactions(){
   const q=document.getElementById("markHistorySearch").value.trim().toLowerCase();
   const type=document.getElementById("markHistoryType").value;
   return transactionRecords.filter(t=>(!type||t.transaction_type===type)&&[t.students?.full_name,t.students?.student_code,t.reason,t.transaction_type].join(" ").toLowerCase().includes(q));
  }
  function drawMarkHistory(){
   const visible=filteredMarkTransactions();
   historyRows.innerHTML=visible.map(t=>'<tr><td>'+escapeHTML(new Date(t.occurred_at).toLocaleString("en-IN"))+'</td><td>'+escapeHTML(t.students?.full_name||"Student")+'<small class="registry-email">'+escapeHTML(t.students?.student_code||"")+'</small></td><td>'+escapeHTML(t.transaction_type.replaceAll("_"," "))+'</td><td>'+escapeHTML(t.reason||"—")+'</td><td class="'+(t.balance_delta>0?"positive-text":"negative-text")+'">'+(t.balance_delta>0?"+":"")+Number(t.balance_delta)+'</td><td>'+Number(t.balance_before)+'</td><td>'+Number(t.balance_after)+'</td></tr>').join("")||'<tr><td colspan="7">No transactions match the current filters.</td></tr>';
   document.getElementById("markHistoryCaption").textContent="Showing "+visible.length+" of "+transactionRecords.length+" latest transaction(s)";
  }
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
  transactionRecords=tr.data||[];drawMarkHistory();
 }
 document.getElementById("markStudentSearch").addEventListener("input",loadMarkData);
   document.getElementById("markHistorySearch").addEventListener("input",drawMarkHistory);
  document.getElementById("markHistoryType").addEventListener("change",drawMarkHistory);
  function markCsvCell(value){
   const raw=String(value??"");
   const safe=/^[\s]*[=+\-@]/.test(raw)?"'"+raw:raw;
   return '"'+safe.replace(/"/g,'""')+'"';
  }
  function exportMarkHistory(){
   const visible=filteredMarkTransactions();
   if(!visible.length){showToast("There are no mark transactions matching the current filters.");return;}
   const csv=[
    ["Date and time","Student","Student ID","Transaction type","Reason","Amount","Balance change","Balance before","Balance after"].map(markCsvCell).join(","),
    ...visible.map(t=>[
     new Date(t.occurred_at).toLocaleString("en-IN"),t.students?.full_name||"Student",t.students?.student_code||"",
     t.transaction_type,t.reason||"",t.amount,t.balance_delta,t.balance_before,t.balance_after
    ].map(markCsvCell).join(","))
   ];
   const blob=new Blob(["\uFEFF"+csv.join("\r\n")],{type:"text/csv;charset=utf-8;"}),url=URL.createObjectURL(blob),link=document.createElement("a");
   link.href=url;link.download="discipline-mark-ledger-"+disciplineToday()+".csv";
   document.body.appendChild(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(url),1200);
   showToast(visible.length+" mark transaction(s) exported.");
  }
  function printMarkHistory(){
   const visible=filteredMarkTransactions();
   if(!visible.length){showToast("There are no mark transactions matching the current filters.");return;}
   const positive=visible.filter(x=>Number(x.balance_delta)>0).reduce((n,x)=>n+Number(x.balance_delta),0);
   const negative=visible.filter(x=>Number(x.balance_delta)<0).reduce((n,x)=>n+Math.abs(Number(x.balance_delta)),0);
   const table=visible.map(t=>"<tr><td>"+escapeHTML(new Date(t.occurred_at).toLocaleString("en-IN"))+"</td><td>"+escapeHTML(t.students?.full_name||"Student")+"</td><td>"+escapeHTML(t.students?.student_code||"")+"</td><td>"+escapeHTML(t.transaction_type.replaceAll("_"," "))+"</td><td>"+escapeHTML(t.reason||"—")+"</td><td>"+(Number(t.balance_delta)>0?"+":"")+Number(t.balance_delta)+"</td><td>"+Number(t.balance_before)+"</td><td>"+Number(t.balance_after)+"</td></tr>").join("");
   const popup=window.open("","_blank");if(!popup){showToast("Allow pop-ups to print the mark report.");return;}popup.opener=null;
   const html="<!doctype html><html lang=\"en\"><head><meta charset=\"utf-8\"><meta name=\"viewport\" content=\"width=device-width,initial-scale=1\"><title>DISCIPLINE Mark Ledger</title><style>body{font-family:Arial,sans-serif;color:#24364d;margin:26px}header{display:flex;justify-content:space-between;gap:15px;align-items:flex-start;border-bottom:2px solid #c7a56b;padding-bottom:13px;margin-bottom:17px}h1{font-size:22px;margin:0 0 6px}p{margin:4px 0;color:#697a90;font-size:10px}.meta{text-align:right;font-size:10px;color:#697a90}.summary{display:flex;gap:10px;flex-wrap:wrap;margin:16px 0}.summary span{border:1px solid #dce3ec;border-radius:6px;padding:8px 10px;font-size:10px}.summary strong{font-size:14px;margin-left:5px}table{width:100%;border-collapse:collapse;font-size:9px}th{background:#edf2f7;text-align:left;color:#50637b;font-size:8px}th,td{padding:7px 5px;border-bottom:1px solid #e5eaf0}footer{margin-top:18px;padding-top:10px;border-top:1px solid #dce3ec;color:#718096;font-size:9px}@media print{body{margin:12mm}tr{break-inside:avoid}}@media(max-width:680px){body{margin:10px}table{font-size:8px}th,td{padding:5px 3px}}</style></head><body><header><div><h1>DISCIPLINE · Mark Transaction Ledger</h1><p>Administrator audit report · Latest 50 loaded transactions</p></div><div class=\"meta\">Generated "+escapeHTML(new Date().toLocaleString("en-IN"))+"</div></header><div class=\"summary\"><span>Transactions <strong>"+visible.length+"</strong></span><span>Positive changes <strong>+"+positive+"</strong></span><span>Negative changes <strong>−"+negative+"</strong></span><span>Net change <strong>"+(positive-negative>0?"+":"")+(positive-negative)+"</strong></span></div><table><thead><tr><th>DATE</th><th>STUDENT</th><th>ID</th><th>TYPE</th><th>REASON</th><th>CHANGE</th><th>BEFORE</th><th>AFTER</th></tr></thead><tbody>"+table+"</tbody></table><footer>DISCIPLINE · This report includes only the current filtered ledger rows.</footer></body></html>";
   popup.document.open();popup.document.write(html);popup.document.close();popup.focus();setTimeout(()=>popup.print(),350);
  }
  document.getElementById("markHistoryExport").addEventListener("click",exportMarkHistory);
  document.getElementById("markHistoryPrint").addEventListener("click",printMarkHistory);
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
 pageContent.innerHTML='<div class="dedications-head"><div><div class="eyebrow"><span class="eyebrow-line"></span> STUDENT RECOGNITION / GENEROSITY</div><h1>Dedication Hall</h1><p class="page-intro">Celebrate generosity, recognise kindness and record positive student connections.</p></div><span class="dedications-tag">MARK TRANSFERS & APPRECIATION</span></div><section class="dedications-guidance"><span class="dedications-guidance-icon">✦</span><div><strong>Make recognition meaningful.</strong><p>Transfers move marks from one student to another. Appreciation adds marks to the recipient without deducting from the optional recogniser.</p></div></section><section class="panel registry-panel dedication-entry-panel"><div class="dedication-section-heading"><div><span class="dedication-step">STEP 1 · CREATE</span><h2>Make a dedication</h2><p>Choose the type of recognition and complete the details.</p></div><span class="dedication-heading-mark">01</span></div><form id="dedicationForm"><div class="dedication-mode-wrap"><div class="field"><label for="dedicationMode">DEDICATION TYPE *</label><select id="dedicationMode"><option value="transfer">Transfer marks — giver loses marks</option><option value="appreciation">Appreciation — recipient gains marks</option></select></div><p class="dedication-mode-note" id="dedicationModeNote">A transfer reduces the giver’s balance and increases the recipient’s balance by the same amount.</p></div><div class="dedication-form-grid"><div class="field" id="dedicationFromWrap"><label for="dedicationFrom">Giving / appreciating student</label><select id="dedicationFrom"><option value="">Choose student</option></select><small id="dedicationFromHelp" class="registry-disclaimer">For transfers, this student’s balance will decrease.</small></div><div class="field"><label for="dedicationTo">RECIPIENT STUDENT *</label><select id="dedicationTo" required><option value="">Choose student</option></select></div><div class="field"><label for="dedicationAmount">MARKS *</label><input id="dedicationAmount" type="number" min="1" max="10000" step="1" required placeholder="e.g. 3"></div><div class="field full"><label for="dedicationReason">REASON / MESSAGE *</label><textarea id="dedicationReason" rows="3" maxlength="500" required placeholder="Explain the reason for this dedication (3–500 characters)"></textarea></div></div><div class="dedication-form-footer"><div><button class="button button-primary" id="saveDedication" type="submit">Save dedication</button><span id="dedicationMessage" class="dedication-form-message" role="status"></span></div><small>Review the selected students and mark amount before saving.</small></div></form></section><section class="panel registry-panel dedication-history-panel"><div class="dedication-section-heading"><div><span class="dedication-step">STEP 2 · HISTORY</span><h2>Recent dedication records</h2><p>Transfers and appreciation marks recorded in the live ledger.</p></div><span class="dedication-history-tag">LATEST 100</span></div><div class="table-scroll"><table class="registry-table"><thead><tr><th>DATE</th><th>STUDENT</th><th>TYPE</th><th>DETAIL</th><th>MARKS</th><th>BALANCE AFTER</th></tr></thead><tbody id="dedicationHistory"><tr><td colspan="6">Loading…</td></tr></tbody></table></div></section><footer class="page-footer"><span>DISCIPLINE · Dedication Hall</span><span>SUPABASE · ADMINISTRATOR ACCESS</span></footer>';
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
  document.getElementById("dedicationModeNote").textContent=appreciation?"Appreciation adds marks to the recipient; the recogniser’s balance is not reduced.":"A transfer reduces the giver’s balance and increases the recipient’s balance by the same amount.";
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
 pageContent.innerHTML=`
  <div class="weekly-head">
   <div><div class="eyebrow"><span class="eyebrow-line"></span> REPORTING / OFFICIAL SCORES</div><h1>Weekly Results</h1><p class="page-intro">Review the selected Monday–Sunday scoring period, then publish its official results to the linked student and parent portals.</p></div>
   <span class="weekly-admin-tag">ADMINISTRATOR CONTROL</span>
  </div>
  <section class="weekly-publish-panel">
   <div class="weekly-publish-copy"><span class="weekly-step">01 · SELECT & PUBLISH</span><h2>Choose a scoring week</h2><p>Choose a Monday as the start date. Publishing runs the official calculation for that week and makes the resulting scores visible in linked portals.</p></div>
   <div class="weekly-publish-controls">
    <div class="field"><label for="weeklyStart">Week starting · Monday</label><input id="weeklyStart" type="date" value="${monday}"></div>
    <div class="weekly-publish-actions"><button class="button button-outline" id="loadWeeklyResults" type="button">Load results</button><button class="button button-primary" id="publishWeeklyResults" type="button">Publish weekly results</button></div>
   </div>
   <div id="weeklyPublishInfo" class="weekly-publish-message" role="status">Loading saved results for the current week…</div>
  </section>
  <section class="weekly-overview" aria-label="Selected week summary">
   <article class="weekly-stat"><span>Student results</span><strong id="weeklyStudentCount">—</strong><small>Calculated result records</small></article>
   <article class="weekly-stat"><span>Published to portals</span><strong id="weeklyPublishedCount">—</strong><small>Visible to linked users</small></article>
   <article class="weekly-stat"><span>Awaiting publication</span><strong id="weeklyPendingCount">—</strong><small>Saved but not yet published</small></article>
   <article class="weekly-stat"><span>Combined weekly net</span><strong id="weeklyNetTotal">—</strong><small>Sum of displayed student net scores</small></article>
  </section>
  <section class="weekly-results-panel">
    <div class="weekly-section-heading"><div><span class="weekly-step">02 · REVIEW SCORES</span><h2>Student results register</h2><p>Check each student score breakdown and portal visibility before publishing.</p></div><div class="weekly-result-actions"><span class="weekly-register-label">SELECTED WEEK</span><button class="button button-outline" id="weeklyPrintButton" type="button">Print report</button><button class="button button-quiet" id="weeklyExportButton" type="button">Export CSV</button></div></div>
   <div class="weekly-filter-bar">
    <div class="field"><label for="weeklySearch">Find a student</label><input id="weeklySearch" type="search" placeholder="Search student name or ID…" aria-label="Search weekly results"></div>
    <div class="field"><label for="weeklyStatusFilter">Publication status</label><select id="weeklyStatusFilter"><option value="">All results</option><option value="published">Published</option><option value="pending">Not published</option></select></div>
   </div>
   <div class="weekly-results-line"><strong id="weeklyResultCaption">Loading result records…</strong><span>Amounts shown are marks.</span></div>
   <div class="table-scroll"><table class="registry-table weekly-results-table"><thead><tr><th>STUDENT</th><th>AWARDS</th><th>DEDUCTIONS</th><th>RECEIVED</th><th>TRANSFERRED</th><th>WEEKLY NET</th><th>LIFETIME</th><th>PORTAL STATUS</th></tr></thead><tbody id="weeklyResultRows"><tr><td colspan="8">Loading…</td></tr></tbody></table></div>
   <p class="weekly-table-note">Only published rows are available in student and parent portals. An unpublished result remains an administrator record until the official publishing action is completed.</p>
  </section>
  <section class="weekly-method-panel">
   <div class="weekly-section-heading"><div><span class="weekly-step">SCORING GUIDE</span><h2>How the score is calculated</h2><p>The displayed breakdown follows the institute's existing mark accounting rules.</p></div></div>
   <div class="weekly-method-grid">
    <article><strong>Weekly net</strong><p>All mark balance changes recorded during the selected Monday–Sunday period.</p></article>
    <article><strong>Received</strong><p>Incoming transfers and appreciation marks credited to the student.</p></article>
    <article><strong>Transferred</strong><p>Marks sent from the student to another student.</p></article>
    <article><strong>Lifetime balance</strong><p>Starting marks plus all saved mark transactions to date.</p></article>
   </div>
   <p class="weekly-method-footnote">Negative weekly and lifetime balances are permitted. This page displays saved calculations and does not manually adjust individual scores.</p>
  </section>
  <footer class="page-footer"><span>DISCIPLINE · Official weekly results</span><span>Administrator publishing · Monday–Sunday</span></footer>`;
 if(!db){showToast("Database is unavailable.");return;}
 const input=document.getElementById("weeklyStart"),tbody=document.getElementById("weeklyResultRows"),info=document.getElementById("weeklyPublishInfo"),publish=document.getElementById("publishWeeklyResults");
 let resultRecords=[];
  function filteredWeeklyResults(){
   const query=document.getElementById("weeklySearch").value.trim().toLowerCase(),status=document.getElementById("weeklyStatusFilter").value;
   return resultRecords.filter(x=>{
    const published=!!x.published_at;
    return (!status||(status==="published"?published:!published))&&[x.students?.full_name,x.students?.student_code].join(" ").toLowerCase().includes(query);
   });
  }
  function drawResults(){
   const filtered=filteredWeeklyResults();
  tbody.innerHTML=filtered.map(x=>{
   const published=!!x.published_at,net=Number(x.weekly_net||0);
   return '<tr><td><strong>'+escapeHTML(x.students?.full_name||"Student")+'</strong><small class="registry-email">'+escapeHTML(x.students?.student_code||"")+'</small></td><td class="weekly-positive">+'+Number(x.total_awards||0)+'</td><td class="weekly-negative">−'+Number(x.total_deductions||0)+'</td><td>+'+Number(x.total_received||0)+'</td><td>−'+Number(x.total_transferred||0)+'</td><td class="'+(net>=0?"positive-text":"negative-text")+'"><strong>'+(net>0?"+":"")+net+'</strong></td><td><strong>'+Number(x.lifetime_balance||0)+'</strong></td><td><span class="session-status '+(published?"completed":"pending")+'">'+(published?"Published":"Not published")+'</span></td></tr>';
  }).join("")||'<tr><td colspan="8" class="weekly-empty-cell">'+(resultRecords.length?"No students match the current search and filter.":"No calculated results are saved for this week yet. Use Publish weekly results to run the official calculation.")+'</td></tr>';
  document.getElementById("weeklyResultCaption").textContent="Showing "+filtered.length+" of "+resultRecords.length+" student result(s)";
 }
 async function load(){
  if(disciplineMonday(input.value)!==input.value){
   info.textContent="Select a Monday as the week start date. Other weekdays cannot be used as the start of a scoring period.";
   tbody.innerHTML='<tr><td colspan="8" class="weekly-empty-cell">Choose a Monday to load results.</td></tr>';
   publish.disabled=true;resultRecords=[];updateSummary();drawResults();return;
  }
  publish.disabled=false;
  const end=new Date(input.value+"T12:00:00");end.setDate(end.getDate()+6);const endText=end.getFullYear()+"-"+String(end.getMonth()+1).padStart(2,"0")+"-"+String(end.getDate()).padStart(2,"0");
  info.textContent="Loading saved results for "+input.value+" to "+endText+"…";
  tbody.innerHTML='<tr><td colspan="8">Loading student results…</td></tr>';
  const r=await db.from("weekly_results").select("student_id,total_awards,total_deductions,total_received,total_transferred,weekly_net,lifetime_balance,published_at,students(full_name,student_code)").eq("week_start",input.value).order("weekly_net",{ascending:false});
  if(r.error){info.textContent="Could not load results: "+r.error.message;tbody.innerHTML='<tr><td colspan="8" class="weekly-empty-cell">The saved results could not be loaded. Please try again.</td></tr>';return;}
  resultRecords=r.data||[];
  updateSummary();drawResults();
  info.textContent="Scoring period: "+input.value+" to "+endText+". "+resultRecords.length+" student result(s) currently saved.";
  if(resultRecords.some(x=>x.published_at))info.textContent+=" Published results are visible to linked portal users.";
 }
 function updateSummary(){
  const published=resultRecords.filter(x=>!!x.published_at).length;
  const net=resultRecords.reduce((n,x)=>n+Number(x.weekly_net||0),0);
  document.getElementById("weeklyStudentCount").textContent=resultRecords.length;
  document.getElementById("weeklyPublishedCount").textContent=published;
  document.getElementById("weeklyPendingCount").textContent=resultRecords.length-published;
  document.getElementById("weeklyNetTotal").textContent=(net>0?"+":"")+net;
 }
 document.getElementById("loadWeeklyResults").addEventListener("click",load);
 input.addEventListener("change",load);
 document.getElementById("weeklySearch").addEventListener("input",drawResults);
 document.getElementById("weeklyStatusFilter").addEventListener("change",drawResults);
 function exportWeeklyResults(){
  const rows=filteredWeeklyResults();
  if(!rows.length){showToast("There are no weekly results matching the current filters.");return;}
  const csvCell=(value,isText=false)=>{
   const raw=String(value??"");
   const safe=isText&&/^[=+\-@]/.test(raw)?"'"+raw:raw;
   return '"'+safe.replace(/"/g,'""')+'"';
  };
  const headings=["Student name","Student ID","Awards","Deductions","Received","Transferred","Weekly net","Lifetime balance","Publication status"];
  const csvRows=[headings.map(x=>csvCell(x,true)).join(","),...rows.map(x=>[
   csvCell(x.students?.full_name||"Student",true),
   csvCell(x.students?.student_code||"",true),
   Number(x.total_awards||0),Number(x.total_deductions||0),Number(x.total_received||0),
   Number(x.total_transferred||0),Number(x.weekly_net||0),Number(x.lifetime_balance||0),
   csvCell(x.published_at?"Published":"Not published",true)
  ].join(","))];
  const blob=new Blob(["\uFEFF"+csvRows.join("\r\n")],{type:"text/csv;charset=utf-8;"});
  const url=URL.createObjectURL(blob),link=document.createElement("a");
  link.href=url;link.download="discipline-weekly-results-"+input.value+".csv";
  document.body.appendChild(link);link.click();link.remove();
  setTimeout(()=>URL.revokeObjectURL(url),1200);
  showToast(rows.length+" weekly result(s) exported.");
 }
 function printWeeklyResults(){
  const rows=filteredWeeklyResults();
  if(!rows.length){showToast("There are no weekly results matching the current filters.");return;}
  const endDate=new Date(input.value+"T12:00:00");endDate.setDate(endDate.getDate()+6);
  const endText=endDate.getFullYear()+"-"+String(endDate.getMonth()+1).padStart(2,"0")+"-"+String(endDate.getDate()).padStart(2,"0");
  const total=field=>rows.reduce((sum,row)=>sum+Number(row[field]||0),0);
  const printRows=rows.map(x=>"<tr><td><strong>"+escapeHTML(x.students?.full_name||"Student")+"</strong><small>"+escapeHTML(x.students?.student_code||"")+"</small></td><td>"+Number(x.total_awards||0)+"</td><td>"+Number(x.total_deductions||0)+"</td><td>"+Number(x.total_received||0)+"</td><td>"+Number(x.total_transferred||0)+"</td><td><strong>"+(Number(x.weekly_net)>0?"+":"")+Number(x.weekly_net||0)+"</strong></td><td>"+Number(x.lifetime_balance||0)+"</td><td>"+(x.published_at?"Published":"Not published")+"</td></tr>").join("");
  const popup=window.open("","_blank");
  if(!popup){showToast("Allow pop-ups to print the weekly report.");return;}
  popup.opener=null;
  const printHtml="<!doctype html><html lang=\"en\"><head><meta charset=\"utf-8\"><meta name=\"viewport\" content=\"width=device-width,initial-scale=1\"><title>DISCIPLINE Weekly Results</title>"+
   "<style>body{font-family:Arial,sans-serif;color:#203047;margin:28px}header{display:flex;justify-content:space-between;align-items:flex-start;border-bottom:2px solid #c7a56b;padding-bottom:14px;margin-bottom:18px}h1{font-size:23px;margin:0 0 6px}p{margin:4px 0;color:#65758a;font-size:11px}.meta{text-align:right;font-size:10px;color:#65758a}.summary{display:grid;grid-template-columns:repeat(4,1fr);gap:8px;margin:18px 0}.summary div{border:1px solid #dce3ec;border-radius:7px;padding:10px}.summary small{display:block;color:#718096;font-size:9px}.summary strong{display:block;font-size:17px;margin-top:4px}table{width:100%;border-collapse:collapse;font-size:10px}th{background:#edf2f7;text-align:left;color:#50637b;font-size:8px;letter-spacing:.5px}th,td{padding:8px 6px;border-bottom:1px solid #e5eaf0}td small{display:block;color:#718096;margin-top:3px}footer{margin-top:18px;padding-top:10px;border-top:1px solid #dce3ec;color:#718096;font-size:9px}@media print{body{margin:12mm}tr{break-inside:avoid}}@media(max-width:700px){body{margin:12px}.summary{grid-template-columns:repeat(2,1fr)}table{font-size:8px}th,td{padding:5px 3px}}</style></head><body>"+
   "<header><div><h1>DISCIPLINE · Weekly Student Results</h1><p>Official Monday–Sunday scoring summary</p></div><div class=\"meta\"><strong>Scoring period</strong><br>"+escapeHTML(input.value)+" to "+escapeHTML(endText)+"<br><br>Generated "+escapeHTML(new Date().toLocaleString("en-IN"))+"</div></header>"+
   "<section class=\"summary\"><div><small>Students shown</small><strong>"+rows.length+"</strong></div><div><small>Total awards</small><strong>"+total("total_awards")+"</strong></div><div><small>Total deductions</small><strong>"+total("total_deductions")+"</strong></div><div><small>Combined weekly net</small><strong>"+(total("weekly_net")>0?"+":"")+total("weekly_net")+"</strong></div></section>"+
   "<table><thead><tr><th>STUDENT</th><th>AWARDS</th><th>DEDUCTIONS</th><th>RECEIVED</th><th>TRANSFERRED</th><th>WEEKLY NET</th><th>LIFETIME</th><th>PORTAL STATUS</th></tr></thead><tbody>"+printRows+"</tbody></table>"+
   "<footer>DISCIPLINE · Administrator report · Exports include the currently filtered student results.</footer></body></html>";
  popup.document.open();popup.document.write(printHtml);popup.document.close();popup.focus();
  window.setTimeout(()=>popup.print(),350);
 }
 document.getElementById("weeklyExportButton").addEventListener("click",exportWeeklyResults);
 document.getElementById("weeklyPrintButton").addEventListener("click",printWeeklyResults);
 publish.addEventListener("click",async()=>{
  if(disciplineMonday(input.value)!==input.value){showToast("Choose a Monday first.");return;}
  if(resultRecords.some(x=>x.published_at)&&!confirm("This week already has published results. Re-run the official publishing calculation for the selected week?"))return;
  publish.disabled=true;publish.textContent="Publishing…";info.textContent="Calculating the selected week and publishing official results…";
  try{const r=await db.rpc("admin_publish_weekly_results",{p_week_start:input.value});if(r.error)throw r.error;
   info.textContent="Published "+r.data.students_published+" student result(s) for "+r.data.week_start+" to "+r.data.week_end+". Sent "+Number(r.data.notifications_sent||0)+" portal notification(s) to linked families and students.";
   showToast("Weekly results published to linked portals.");await load();
  }catch(e){info.textContent="Could not publish: "+e.message;showToast("Publishing failed: "+e.message);}
  finally{publish.disabled=false;publish.textContent="Publish weekly results";}
 });
 await load();
}


async function renderParents(){
 const db=window.disciplineSupabase;
 pageContent.innerHTML=`
  <div class="parent-admin-head">
   <div><div class="eyebrow"><span class="eyebrow-line"></span> WORKSPACE / FAMILY CONNECTIONS</div><h1>Parent Management</h1><p class="page-intro">Keep family connections organised and respond to parent feedback in one place.</p></div>
   <button class="button button-primary" data-page="accounts"><span>＋</span> Create parent account</button>
  </div>
  <section class="parent-admin-summary" aria-label="Parent management overview">
   <article class="parent-summary-card"><span class="parent-summary-icon">♧</span><div><small>Linked families</small><strong id="parentLinkCount">—</strong><span>Parent-to-student connections</span></div></article>
   <article class="parent-summary-card"><span class="parent-summary-icon parent-summary-blue">♙</span><div><small>Linked students</small><strong id="parentStudentCount">—</strong><span>Students with a family link</span></div></article>
   <article class="parent-summary-card"><span class="parent-summary-icon parent-summary-amber">◷</span><div><small>Awaiting review</small><strong id="pendingParentResponseCount">—</strong><span>Parent responses to follow up</span></div></article>
  </section>
  <section class="panel registry-panel parent-links-panel">
   <div class="parent-section-heading"><div><span class="student-step">FAMILY DIRECTORY</span><h2>Parent-to-student links</h2><p>Check which parent account is connected to each student.</p></div><label class="parent-search"><span>⌕</span><input id="parentSearch" class="registry-search" placeholder="Search parent or student…" aria-label="Search family links"></label></div>
   <div class="table-scroll"><table class="registry-table"><thead><tr><th>PARENT / GUARDIAN</th><th>EMAIL ADDRESS</th><th>LINKED STUDENT</th><th>STUDENT ID</th><th>RELATIONSHIP</th></tr></thead><tbody id="parentRows"><tr><td colspan="5">Loading family links…</td></tr></tbody></table></div>
  </section>
  <section class="panel registry-panel parent-responses-panel">
   <div class="parent-section-heading parent-response-heading"><div><span class="student-step">INBOX & FOLLOW-UP</span><h2>Parent responses</h2><p>Review acknowledgements, clarification requests and requests for review. Private notes are visible only to administrators.</p></div><div class="parent-response-tools"><label class="parent-filter-label"><span>Show</span><select id="parentResponseFilter"><option value="pending">Pending review</option><option value="all">All responses</option><option value="reviewed">Reviewed</option></select></label><label class="parent-search"><span>⌕</span><input id="parentResponseSearch" class="registry-search" placeholder="Search responses…" aria-label="Search parent responses"></label></div></div>
   <div class="parent-response-counts"><span><strong id="totalParentResponseCount">—</strong> total responses</span><span>Private administrator follow-up</span></div>
   <div class="table-scroll"><table class="registry-table parent-response-table"><thead><tr><th>DATE</th><th>PARENT</th><th>STUDENT</th><th>ABOUT</th><th>RESPONSE</th><th>PARENT MESSAGE</th><th>PRIVATE ADMIN NOTE</th><th>STATUS / ACTION</th></tr></thead><tbody id="parentResponseRows"><tr><td colspan="8">Loading parent responses…</td></tr></tbody></table></div>
   <p id="parentResponseInfo" class="registry-disclaimer">Pending responses appear first. Mark a response reviewed only after the administrator has followed up as needed.</p>
  </section>
  <footer class="page-footer"><span>DISCIPLINE · Family connections</span><span>ADMINISTRATOR ACCESS · PRIVATE RECORDS</span></footer>`;
 if(!db){showToast("Database connection is unavailable.");return;}
 const body=document.getElementById("parentRows"),responseBody=document.getElementById("parentResponseRows");
 const [links,responses]=await Promise.all([
  db.from("parent_student_links").select("parent_user_id,relationship_label,created_at,profiles(display_name,email),students(full_name,student_code)").order("created_at",{ascending:false}),
  db.from("parent_responses").select("id,parent_user_id,student_id,incident_id,weekly_result_id,response_type,message,created_at,reviewed_at,reviewed_by,admin_note,profiles(display_name,email),students(full_name,student_code)").order("created_at",{ascending:false}).limit(300)
 ]);
 if(links.error){body.innerHTML='<tr><td colspan="5">Could not load parent links: '+escapeHTML(links.error.message)+'</td></tr>';}
 else{
  const rows=links.data||[];
  document.getElementById("parentLinkCount").textContent=rows.length;
  document.getElementById("parentStudentCount").textContent=new Set(rows.map(x=>x.students?.student_code||x.students?.full_name).filter(Boolean)).size;
  function drawLinks(){
   const q=document.getElementById("parentSearch").value.trim().toLowerCase();
   const filtered=rows.filter(x=>[x.profiles?.display_name,x.profiles?.email,x.students?.full_name,x.students?.student_code,x.relationship_label].join(" ").toLowerCase().includes(q));
   body.innerHTML=filtered.map(x=>'<tr><td><strong>'+escapeHTML(x.profiles?.display_name||"Parent")+'</strong></td><td>'+escapeHTML(x.profiles?.email||"—")+'</td><td>'+escapeHTML(x.students?.full_name||"Student")+'</td><td>'+escapeHTML(x.students?.student_code||"—")+'</td><td>'+escapeHTML(x.relationship_label||"—")+'</td></tr>').join("")||'<tr><td colspan="5">No linked parent accounts found. Create an account to add one.</td></tr>';
  }
  document.getElementById("parentSearch").addEventListener("input",drawLinks);drawLinks();
 }
 if(responses.error){responseBody.innerHTML='<tr><td colspan="8">Could not load parent responses: '+escapeHTML(responses.error.message)+'</td></tr>';return;}
 const responseRows=responses.data||[];
 document.getElementById("totalParentResponseCount").textContent=responseRows.length;
 document.getElementById("pendingParentResponseCount").textContent=responseRows.filter(x=>!x.reviewed_at).length;
    await refreshAdminNotificationBadge();
 function drawResponses(){
  const filter=document.getElementById("parentResponseFilter").value;
  const q=document.getElementById("parentResponseSearch").value.trim().toLowerCase();
  const filtered=responseRows.filter(x=>{
   const status=!x.reviewed_at?"pending":"reviewed";
   const search=[x.profiles?.display_name,x.profiles?.email,x.students?.full_name,x.students?.student_code,x.response_type,x.message,x.admin_note,x.incident_id?"incident report":"weekly result"].join(" ").toLowerCase();
   return (filter==="all"||filter===status)&&search.includes(q);
  });
  responseBody.innerHTML=filtered.map(x=>{
   const reviewed=!!x.reviewed_at;
   const about=x.incident_id?"Behaviour report":x.weekly_result_id?"Weekly result":"General parent response";
   return '<tr><td>'+escapeHTML(new Date(x.created_at).toLocaleString("en-IN"))+'</td><td><strong>'+escapeHTML(x.profiles?.display_name||"Parent")+'</strong><small class="registry-email">'+escapeHTML(x.profiles?.email||"")+'</small></td><td><strong>'+escapeHTML(x.students?.full_name||"Student")+'</strong><small class="registry-email">'+escapeHTML(x.students?.student_code||"")+'</small></td><td>'+about+'</td><td>'+escapeHTML(x.response_type.replaceAll("_"," "))+'</td><td>'+escapeHTML(x.message||"—")+'</td><td><textarea rows="2" maxlength="1000" data-admin-response-note="'+x.id+'" placeholder="Private follow-up note">'+escapeHTML(x.admin_note||"")+'</textarea><button class="button button-quiet" type="button" data-save-response-note="'+x.id+'">Save note</button></td><td><span class="session-status '+(reviewed?"completed":"pending")+'">'+(reviewed?"Reviewed":"Pending")+'</span><p><small>'+ (reviewed&&x.reviewed_at?escapeHTML(new Date(x.reviewed_at).toLocaleDateString("en-IN")):"Awaiting action")+'</small></p><button class="button button-outline" type="button" data-toggle-response-review="'+x.id+'" data-next-state="'+(reviewed?"pending":"reviewed")+'">'+(reviewed?"Reopen":"Mark reviewed")+'</button><small data-response-action-status="'+x.id+'" class="registry-disclaimer"></small></td></tr>';
  }).join("")||'<tr><td colspan="8">No responses match this filter.</td></tr>';
 }
 document.getElementById("parentResponseFilter").addEventListener("change",drawResponses);
 document.getElementById("parentResponseSearch").addEventListener("input",drawResponses);
 responseBody.addEventListener("click",async event=>{
  const save=event.target.closest("[data-save-response-note]");
  const toggle=event.target.closest("[data-toggle-response-review]");
  if(!save&&!toggle)return;
  const id=(save||toggle).dataset.saveResponseNote||(save||toggle).dataset.toggleResponseReview;
  const status=responseBody.querySelector('[data-response-action-status="'+id+'"]');
  const buttons=responseBody.querySelectorAll('[data-save-response-note="'+id+'"],[data-toggle-response-review="'+id+'"]');
  buttons.forEach(b=>b.disabled=true);
  try{
   let payload={};
   if(save){
    const note=responseBody.querySelector('[data-admin-response-note="'+id+'"]').value.trim();
    payload={admin_note:note||null};
   }else{
    const next=toggle.dataset.nextState;
    if(next==="reviewed"){
     if(!confirm("Mark this parent response as reviewed? This records the administrator review time."))return;
     payload={reviewed_at:new Date().toISOString(),reviewed_by:await disciplineAdminId(db)};
    }else{
     if(!confirm("Reopen this response as pending review?"))return;
     payload={reviewed_at:null,reviewed_by:null};
    }
   }
   const {error}=await db.from("parent_responses").update(payload).eq("id",id);
   if(error)throw error;
   const row=responseRows.find(x=>x.id===id);
   if(row)Object.assign(row,payload);
   document.getElementById("pendingParentResponseCount").textContent=responseRows.filter(x=>!x.reviewed_at).length;
   status.textContent=save?"Private note saved.":"Review status updated.";
   drawResponses();
   showToast(save?"Administrator note saved privately.":"Parent response status updated.");
  }catch(error){if(status)status.textContent="Could not save: "+error.message;showToast(error.message);}
  finally{buttons.forEach(b=>b.disabled=false);}
 });
 drawResponses();
}

async function renderLedger(){
 const db=window.disciplineSupabase;
 pageContent.innerHTML=`
  <div class="ledger-head">
   <div><div class="eyebrow"><span class="eyebrow-line"></span> ACCOUNTABILITY / AUDIT TRAIL</div><h1>Discipline Ledger</h1><p class="page-intro">A clear, searchable history of every saved award, deduction, transfer and correction.</p></div>
   <span class="ledger-live-tag">LIVE DATABASE · READ ONLY</span>
  </div>
  <section class="ledger-overview" aria-label="Ledger summary">
   <article class="ledger-stat"><span>Transactions loaded</span><strong id="ledgerTotal">—</strong><small>Latest 500 saved records</small></article>
   <article class="ledger-stat"><span>Positive balance changes</span><strong id="ledgerPositive">—</strong><small>Within the loaded records</small></article>
   <article class="ledger-stat"><span>Negative balance changes</span><strong id="ledgerNegative">—</strong><small>Within the loaded records</small></article>
  </section>
  <section class="ledger-records-panel">
   <div class="ledger-section-heading"><div><span class="ledger-step">TRANSACTION REGISTER</span><h2>All mark transactions</h2><p>Use the filters to find a student or review a particular transaction type.</p></div><span class="ledger-record-limit">LATEST 500</span></div>
   <div class="ledger-filter-bar">
    <div class="field ledger-type-filter"><label for="ledgerType">Transaction type</label><select id="ledgerType"><option value="">All types</option><option value="award">Awards</option><option value="deduction">Deductions</option><option value="transfer_out">Transfers sent</option><option value="transfer_in">Transfers received</option><option value="appreciation">Appreciation</option><option value="correction">Corrections</option></select></div>
    <div class="field ledger-search-filter"><label for="ledgerSearch">Search records</label><input id="ledgerSearch" class="registry-search" placeholder="Student name, ID or reason…" aria-label="Search ledger records"></div>
    <button class="button button-outline ledger-clear-button" id="ledgerClear" type="button">Clear filters</button>
   </div>
   <div class="ledger-results-line"><span id="ledgerResultCount">Loading transactions…</span><span>Balances are shown before and after each change.</span></div>
   <div class="table-scroll"><table class="registry-table ledger-table"><thead><tr><th>DATE & TIME</th><th>STUDENT</th><th>TYPE</th><th>REASON</th><th>CHANGE</th><th>BEFORE</th><th>AFTER</th></tr></thead><tbody id="ledgerRows"><tr><td colspan="7">Loading…</td></tr></tbody></table></div>
   <p class="ledger-footnote">This register displays the most recent 500 transactions. Historical entries are preserved; this screen does not edit or delete ledger records.</p>
  </section>
  <footer class="page-footer"><span>DISCIPLINE · Transaction audit trail</span><span>Saved records · Administrator access</span></footer>`;
 if(!db){showToast("Database connection is unavailable.");return;}
 const body=document.getElementById("ledgerRows");
 const r=await db.from("mark_transactions").select("id,student_id,transaction_type,amount,balance_delta,reason,balance_before,balance_after,occurred_at,students(full_name,student_code)").order("occurred_at",{ascending:false}).limit(500);
 if(r.error){body.innerHTML='<tr><td colspan="7">Could not load ledger: '+escapeHTML(r.error.message)+'</td></tr>';document.getElementById("ledgerResultCount").textContent="Ledger could not be loaded.";showToast("Could not load ledger.");return;}
 const rows=r.data||[];
 const positive=rows.filter(x=>Number(x.balance_delta)>0).reduce((n,x)=>n+Number(x.balance_delta||0),0);
 const negative=rows.filter(x=>Number(x.balance_delta)<0).reduce((n,x)=>n+Math.abs(Number(x.balance_delta||0)),0);
 document.getElementById("ledgerTotal").textContent=rows.length;
 document.getElementById("ledgerPositive").textContent="+"+positive;
 document.getElementById("ledgerNegative").textContent="−"+negative;
 function draw(){
  const q=document.getElementById("ledgerSearch").value.trim().toLowerCase(),type=document.getElementById("ledgerType").value;
  const filtered=rows.filter(x=>(!type||x.transaction_type===type)&&[x.students?.full_name,x.students?.student_code,x.reason,x.transaction_type].join(" ").toLowerCase().includes(q));
  body.innerHTML=filtered.map(x=>{
   const delta=Number(x.balance_delta||0),kind=String(x.transaction_type||"").replace(/_/g," ");
   return '<tr><td><span class="ledger-date">'+escapeHTML(new Date(x.occurred_at).toLocaleDateString("en-IN"))+'</span><small class="registry-email">'+escapeHTML(new Date(x.occurred_at).toLocaleTimeString("en-IN",{hour:"2-digit",minute:"2-digit"}))+'</small></td><td><strong>'+escapeHTML(x.students?.full_name||"Student")+'</strong><small class="registry-email">'+escapeHTML(x.students?.student_code||"")+'</small></td><td><span class="ledger-type-chip type-'+escapeHTML(x.transaction_type)+'">'+escapeHTML(kind)+'</span></td><td class="ledger-reason">'+escapeHTML(x.reason||"—")+'</td><td class="'+(delta>0?"positive-text":delta<0?"negative-text":"ledger-neutral")+'"><strong>'+(delta>0?"+":"")+delta+'</strong></td><td>'+escapeHTML(x.balance_before)+'</td><td><strong>'+escapeHTML(x.balance_after)+'</strong></td></tr>';
  }).join("")||'<tr><td colspan="7" class="ledger-empty-cell">No matching transactions. Try another search or clear the filters.</td></tr>';
  document.getElementById("ledgerResultCount").textContent="Showing "+filtered.length+" of "+rows.length+" loaded transaction(s)";
 }
 document.getElementById("ledgerSearch").addEventListener("input",draw);
 document.getElementById("ledgerType").addEventListener("change",draw);
 document.getElementById("ledgerClear").addEventListener("click",()=>{document.getElementById("ledgerSearch").value="";document.getElementById("ledgerType").value="";draw();});
 draw();
}
async function renderLeaderboard(){
 const db=window.disciplineSupabase,week=disciplineMonday(disciplineToday());
 pageContent.innerHTML=`
  <div class="leaderboard-head">
   <div><div class="eyebrow"><span class="eyebrow-line"></span> RECOGNITION / WEEKLY RESULTS</div><h1>Hall of Excellence</h1><p class="page-intro">Celebrate student achievement using the official published score for each selected week.</p></div>
   <div class="leaderboard-head-actions"><span class="leaderboard-secure-tag">PUBLISHED RESULTS ONLY</span><button class="button button-outline" data-page="reports">Manage weekly publishing</button></div>
  </div>
  <section class="leaderboard-control-panel">
   <div><span class="leaderboard-step">RANKING PERIOD</span><h2>Choose a results week</h2><p>Only results already published by the administrator appear here.</p></div>
   <div class="leaderboard-controls"><div class="field"><label for="leaderWeek">Week starting (Monday)</label><input id="leaderWeek" type="date" value="${week}"></div><button class="button button-primary" id="leaderLoad" type="button">Load leaderboard</button></div>
  </section>
  <section class="leaderboard-overview" aria-label="Leaderboard summary">
   <article class="leaderboard-stat"><span>Students ranked</span><strong id="leaderCount">—</strong><small>Published results</small></article>
   <article class="leaderboard-stat"><span>Top weekly score</span><strong id="leaderTopScore">—</strong><small id="leaderTopName">Leading student</small></article>
   <article class="leaderboard-stat"><span>Results week</span><strong id="leaderWeekLabel">—</strong><small>Monday start date</small></article>
  </section>
  <section class="leaderboard-podium-panel">
   <div class="leaderboard-section-heading"><div><span class="leaderboard-step">TOP PERFORMERS</span><h2>Weekly distinction</h2><p>The three highest published rankings for this week</p></div><span class="leaderboard-published-tag">Official ranking</span></div>
   <div class="leaderboard-podium" id="leaderPodium"><div class="leaderboard-loading">Loading published rankings…</div></div>
  </section>
  <section class="leaderboard-table-panel">
   <div class="leaderboard-section-heading"><div><span class="leaderboard-step">FULL RANKING</span><h2>Student leaderboard</h2><p>Up to 50 published student results, in official rank order</p></div><span class="leaderboard-list-tag">TOP 50</span></div>
   <div class="table-scroll"><table class="registry-table leaderboard-table"><thead><tr><th>RANK</th><th>STUDENT</th><th>PUBLISHED WEEKLY SCORE</th></tr></thead><tbody id="leaderRows"><tr><td colspan="3">Loading…</td></tr></tbody></table></div>
   <p id="leaderInfo" class="leaderboard-info" role="status">Only published weekly results are ranked.</p>
  </section>
  <footer class="page-footer"><span>DISCIPLINE · Hall of Excellence</span><span>Scores reflect published weekly results.</span></footer>`;
 if(!db){showToast("Database connection is unavailable.");return;}
 const input=document.getElementById("leaderWeek"),body=document.getElementById("leaderRows"),info=document.getElementById("leaderInfo");
 async function load(){
  const podium=document.getElementById("leaderPodium");
  if(disciplineMonday(input.value)!==input.value){info.textContent="Choose a Monday.";body.innerHTML='<tr><td colspan="3">Invalid week start.</td></tr>';podium.innerHTML='<p class="leaderboard-empty">Select a valid Monday to view the rankings.</p>';return;}
  const button=document.getElementById("leaderLoad");button.disabled=true;button.textContent="Loading…";
  try{
   const r=await db.rpc("get_published_student_leaderboard",{p_week_start:input.value,p_limit:50});
   if(r.error)throw r.error;
   const rows=r.data||[],top=rows[0];
   document.getElementById("leaderCount").textContent=rows.length;
   document.getElementById("leaderTopScore").textContent=top?((Number(top.weekly_net)>0?"+":"")+Number(top.weekly_net)):"—";
   document.getElementById("leaderTopName").textContent=top?(top.full_name||"Student"):"No published leader";
   document.getElementById("leaderWeekLabel").textContent=new Date(input.value+"T12:00:00").toLocaleDateString("en-IN",{day:"numeric",month:"short",year:"numeric"});
   const featured=rows.slice(0,3),positions=[1,0,2];
   podium.innerHTML=featured.length?positions.filter(i=>featured[i]).map(i=>{
    const x=featured[i],rank=Number(x.rank),score=Number(x.weekly_net||0);
    return '<article class="leaderboard-podium-card rank-'+rank+'"><span class="leaderboard-rank-label">'+(rank===1?"1ST PLACE":rank===2?"2ND PLACE":"3RD PLACE")+'</span><div class="leaderboard-medal">'+(rank===1?"01":rank===2?"02":"03")+'</div><h3>'+escapeHTML(x.full_name||"Student")+'</h3><p>'+escapeHTML(x.student_code||"")+'</p><strong class="leaderboard-podium-score '+(score>=0?"positive-text":"negative-text")+'">'+(score>0?"+":"")+score+'</strong><small>weekly net marks</small></article>';
   }).join(""):'<p class="leaderboard-empty">No published results for this week. Publish the weekly results first.</p>';
   body.innerHTML=rows.map(x=>'<tr><td><span class="leaderboard-rank-chip rank-chip-'+Number(x.rank)+'">#'+Number(x.rank)+'</span></td><td><strong>'+escapeHTML(x.full_name||"Student")+'</strong><small class="registry-email">'+escapeHTML(x.student_code||"")+'</small></td><td class="'+(Number(x.weekly_net)>=0?"positive-text":"negative-text")+'"><strong>'+(Number(x.weekly_net)>0?"+":"")+Number(x.weekly_net)+'</strong></td></tr>').join("")||'<tr><td colspan="3">No published results for this week. Publish the weekly results first.</td></tr>';
   info.textContent=rows.length+" published student result(s) · Week starting "+input.value+".";
  }catch(error){info.textContent="Could not load leaderboard: "+error.message;podium.innerHTML='<p class="leaderboard-empty">The published rankings could not be loaded. Please try again.</p>';showToast("Could not load leaderboard.");}
  finally{button.disabled=false;button.textContent="Load leaderboard";}
 }
 document.getElementById("leaderLoad").addEventListener("click",load);input.addEventListener("change",load);await load();
}

async function renderIncidents(){
 const db=window.disciplineSupabase;
 const dateParts=new Intl.DateTimeFormat("en-CA",{timeZone:"Asia/Kolkata",year:"numeric",month:"2-digit",day:"2-digit",hour:"2-digit",minute:"2-digit",hourCycle:"h23"}).formatToParts(new Date()),dt={};
 dateParts.forEach(x=>dt[x.type]=x.value);
 const localDateTime=dt.year+"-"+dt.month+"-"+dt.day+"T"+dt.hour+":"+dt.minute;
 const categories=[["noise_disturbance","Noise / disturbance"],["fighting_aggression","Fighting / aggression"],["disrespect","Disrespect"],["misbehaviour","Misbehaviour"],["safety","Safety concern"],["abusive_language","Abusive language"],["cleanliness","Cleanliness"],["bullying","Bullying"],["other","Other"]];
 pageContent.innerHTML=`
  <div class="incidents-head">
   <div><div class="eyebrow"><span class="eyebrow-line"></span> SAFEGUARDING / PRIVATE ADMIN RECORDS</div><h1>Incident Center</h1><p class="page-intro">Document verified observations carefully. Reports remain private until an administrator reviews and publishes them.</p></div>
   <span class="incidents-private-tag">PRIVATE BY DEFAULT</span>
  </div>
  <section class="incidents-guidance"><span class="incidents-guidance-mark">i</span><div><strong>Record facts, not assumptions</strong><p>Use neutral language, include only details you have verified, and share a report with parents only after reviewing its accuracy and relevance.</p></div></section>
  <section class="incidents-overview" aria-label="Incident register summary">
   <article class="incidents-stat"><span>Recent incidents</span><strong id="incidentTotal">—</strong><small>Latest 100 records</small></article>
   <article class="incidents-stat"><span>Private records</span><strong id="incidentPrivate">—</strong><small>Not currently visible to parents</small></article>
   <article class="incidents-stat"><span>Published reports</span><strong id="incidentPublished">—</strong><small>Visible to linked parent accounts</small></article>
    <article class="incidents-stat"><span>Awaiting review</span><strong id="incidentAwaitingReview">—</strong><small>Not yet transcript-verified</small></article>
  </section>
  <section class="incidents-form-panel">
   <div class="incidents-section-heading"><div><span class="incidents-step">STEP 01 · DOCUMENT</span><h2>Record an incident</h2><p>Complete the details below. Any optional deduction is recorded with the incident.</p></div><span class="incidents-form-mark">NEW RECORD</span></div>
   <form id="incidentForm">
    <div class="incidents-form-grid">
     <div class="field"><label for="incidentStudent">Student *</label><select id="incidentStudent" required><option value="">Loading students…</option></select></div>
     <div class="field"><label for="incidentCategory">Category *</label><select id="incidentCategory">${categories.map(x=>'<option value="'+x[0]+'">'+x[1]+'</option>').join("")}</select></div>
     <div class="field"><label for="incidentSeverity">Severity *</label><select id="incidentSeverity"><option value="low">Low</option><option value="moderate">Moderate</option><option value="high">High</option><option value="critical">Critical</option></select></div>
     <div class="field"><label for="incidentWhen">Date and time *</label><input id="incidentWhen" type="datetime-local" value="${localDateTime}" required></div>
     <div class="field"><label for="incidentSession">Journey session (optional)</label><select id="incidentSession"><option value="">Not linked</option></select></div>
     <div class="field"><label for="incidentDeduction">Deduction marks (optional)</label><input id="incidentDeduction" type="number" min="0" max="10000" step="1" value="0"><small>Enter 0 if no deduction is appropriate.</small></div>
     <div class="field full"><label for="incidentDescription">Factual description *</label><textarea id="incidentDescription" rows="4" maxlength="3000" required placeholder="Describe what was directly observed, when it happened and any relevant context."></textarea></div>
     <div class="field full"><label for="incidentExactWords">Exact words (only when essential and verified)</label><textarea id="incidentExactWords" rows="2" maxlength="1000" placeholder="Optional. Include exact wording only when necessary and accurately verified."></textarea><small>Exact words remain in the administrator record until separately reviewed.</small></div>
     <div class="field full"><label for="incidentAction">Action taken</label><textarea id="incidentAction" rows="2" maxlength="1000" placeholder="Optional action, support provided or follow-up required."></textarea></div>
     <div class="field full incidents-audio-capture">
      <strong>Optional temporary audio evidence</strong>
      <p>Record only when the school has obtained the required permission and everyone being recorded has been informed. Recording is manual, never continuous.</p>
      <label class="incidents-consent"><input id="incidentAudioConsent" type="checkbox"> I confirm the required school / guardian permission and notice have been handled.</label>
      <div class="incidents-audio-actions">
       <button class="button button-outline" id="incidentStartRecording" type="button">Start recording</button>
       <button class="button button-quiet" id="incidentStopRecording" type="button" disabled>Stop recording</button>
       <span id="incidentAudioStatus" role="status">No audio recorded.</span>
      </div>
      <audio id="incidentAudioPreview" controls hidden></audio>
      <small>Maximum 60 seconds and 8 MB. Audio stays private and is deleted immediately after an administrator verifies the transcript.</small>
     </div>
    </div>
    <div class="incidents-form-footer"><div><button class="button button-primary" id="saveIncident" type="submit">Save private incident</button><span id="incidentMessage" class="incidents-message" role="status"></span></div><small>New records are not automatically shared with parents.</small></div>
   </form>
  </section>
  <dialog id="incidentReviewDialog" class="incidents-review-dialog" aria-labelledby="incidentReviewTitle">
   <form id="incidentReviewForm">
    <span class="incidents-step">STEP 03 · ADMINISTRATOR REVIEW</span>
    <h2 id="incidentReviewTitle">Review incident evidence</h2>
    <p class="incidents-review-notice">Check the recording and transcript carefully. When you verify, temporary audio is permanently deleted before verification is saved. Parent publication remains a separate step.</p>
    <div id="incidentReviewAudioWrap" class="incidents-review-audio" hidden>
     <label for="incidentReviewAudio">Temporary audio · private administrator access</label>
     <audio id="incidentReviewAudio" controls></audio>
     <small id="incidentReviewAudioStatus"></small>
    </div>
    <label for="incidentReviewTranscript">Reviewed transcript / exact words (optional when no audio is attached)</label>
    <textarea id="incidentReviewTranscript" rows="4" maxlength="1000" placeholder="Correct the transcript after listening. Enter only wording you can verify."></textarea>
    <p id="incidentReviewMessage" class="incidents-message" role="status"></p>
    <div class="incidents-review-actions">
     <button class="button button-quiet" id="incidentReviewCancel" type="button">Cancel</button>
     <button class="button button-primary" id="incidentReviewVerify" type="submit">Verify transcript & delete audio</button>
    </div>
   </form>
  </dialog>
  <section class="incidents-records-panel">
   <div class="incidents-section-heading"><div><span class="incidents-step">STEP 02 · REVIEW</span><h2>Recent incident records</h2><p>Review details and control whether a verified report is visible to linked parents.</p></div><span class="incidents-record-limit">LATEST 100</span></div>
   <div class="incidents-filter-bar">
    <div class="field"><label for="incidentSearch">Search records</label><input id="incidentSearch" class="registry-search" type="search" placeholder="Student, ID, category or description…"></div>
    <div class="field"><label for="incidentVisibility">Parent visibility</label><select id="incidentVisibility"><option value="">All records</option><option value="private">Private only</option><option value="published">Published only</option></select></div>
     <div class="field"><label for="incidentReviewFilter">Administrator review</label><select id="incidentReviewFilter"><option value="">All review states</option><option value="pending">Awaiting verification</option><option value="verified">Verified</option></select></div><div class="incidents-report-actions"><button class="button button-outline" id="incidentPrintReport" type="button">Print report</button><button class="button button-quiet" id="incidentExportCsv" type="button">Export CSV</button></div></div>
   <div class="incidents-results-line" id="incidentResultCount">Loading records…</div>
   <div class="table-scroll"><table class="registry-table incidents-table"><thead><tr><th>DATE</th><th>STUDENT</th><th>CATEGORY / SEVERITY</th><th>OBSERVATION</th><th>DEDUCTION</th><th>PARENT ACCESS</th></tr></thead><tbody id="incidentRows"><tr><td colspan="6">Loading…</td></tr></tbody></table></div>
  </section>
  <footer class="page-footer"><span>DISCIPLINE · Incident Center</span><span>Private administrator records · Controlled parent publishing</span></footer>`;
 if(!db){showToast("Database connection is unavailable.");return;}
 const studentSelect=document.getElementById("incidentStudent"),sessionSelect=document.getElementById("incidentSession"),body=document.getElementById("incidentRows");
 const [students,sessions]=await Promise.all([
  db.from("students").select("id,student_code,full_name").eq("is_active",true).order("full_name"),
  db.from("journey_sessions").select("id,session_type,session_date").order("session_date",{ascending:false}).limit(30)
 ]);
 if(students.error)throw students.error;
 studentSelect.innerHTML='<option value="">Choose a student</option>'+(students.data||[]).map(x=>'<option value="'+x.id+'">'+escapeHTML(x.student_code)+' — '+escapeHTML(x.full_name)+'</option>').join("");
 if(!sessions.error)(sessions.data||[]).forEach(x=>{const o=document.createElement("option");o.value=x.id;o.textContent=x.session_type+" · "+x.session_date;sessionSelect.appendChild(o);});
 let incidentRecords=[],incidentEvidence=[];
 async function load(){
  const [r,evidenceResult]=await Promise.all([
   db.from("incidents").select("id,student_id,category,severity,factual_description,exact_words,action_taken,transcript_verified,published_to_parent_at,occurred_at,mark_transaction_id,students(full_name,student_code)").order("occurred_at",{ascending:false}).limit(100),
   db.from("incident_evidence").select("id,incident_id,evidence_type,storage_path,transcript_text,verified_at,audio_deleted_at").order("created_at",{ascending:false})
  ]);
  if(r.error){body.innerHTML='<tr><td colspan="6">Could not load incidents: '+escapeHTML(r.error.message)+'</td></tr>';showToast("Could not load incident records.");return;}
  if(evidenceResult.error){body.innerHTML='<tr><td colspan="6">Could not load evidence status: '+escapeHTML(evidenceResult.error.message)+'</td></tr>';showToast("Could not load incident evidence status.");return;}
  incidentRecords=r.data||[];
  incidentEvidence=evidenceResult.data||[];
  document.getElementById("incidentTotal").textContent=incidentRecords.length;
  document.getElementById("incidentPrivate").textContent=incidentRecords.filter(x=>!x.published_to_parent_at).length;
  document.getElementById("incidentPublished").textContent=incidentRecords.filter(x=>!!x.published_to_parent_at).length;
   document.getElementById("incidentAwaitingReview").textContent=incidentRecords.filter(x=>!x.transcript_verified).length;
  drawIncidentRows();
 }
  function filteredIncidentRecords(){
   const q=document.getElementById("incidentSearch").value.trim().toLowerCase(),visibility=document.getElementById("incidentVisibility").value,reviewState=document.getElementById("incidentReviewFilter").value;
   return incidentRecords.filter(x=>{
    const published=!!x.published_to_parent_at,verified=x.transcript_verified===true;
    return (!visibility||(visibility==="published"?published:!published))&&(!reviewState||(reviewState==="verified"?verified:!verified))&&[x.students?.full_name,x.students?.student_code,x.category,x.severity,x.factual_description,x.exact_words,x.action_taken].join(" ").toLowerCase().includes(q);
   });
  }
 function drawIncidentRows(){
   const filtered=filteredIncidentRecords();
  body.innerHTML=filtered.map(x=>{
   const audio=incidentEvidence.find(e=>e.incident_id===x.id&&e.evidence_type==="audio_temp");
   const hasAudio=!!(audio?.storage_path&&!audio.audio_deleted_at);
   const review=x.transcript_verified?'<span class="session-status completed">Verified</span>':'<button type="button" class="button button-outline" data-review-incident="'+x.id+'">Review & verify</button>';
   const parent=x.published_to_parent_at?'<span class="session-status completed">Published</span> <button type="button" class="button button-quiet" data-unpublish-incident="'+x.id+'">Unpublish</button>':(x.transcript_verified?'<button type="button" class="button button-quiet" data-publish-incident="'+x.id+'" data-student-id="'+x.student_id+'">Publish to parent</button>':'<small class="registry-email">Private until verified</small>');
   const audioState=hasAudio?'<small class="incidents-audio-pending">Temporary audio awaiting review</small>':(audio?.audio_deleted_at?'<small class="registry-email">Audio deleted after verification</small>':'');
   return '<tr><td>'+escapeHTML(new Date(x.occurred_at).toLocaleString("en-IN"))+'</td><td><strong>'+escapeHTML(x.students?.full_name||"Student")+'</strong><small class="registry-email">'+escapeHTML(x.students?.student_code||"")+'</small></td><td><strong>'+escapeHTML(x.category.replace(/_/g," "))+'</strong><small class="incidents-severity severity-'+escapeHTML(x.severity)+'">'+escapeHTML(x.severity)+'</small></td><td class="incidents-observation">'+escapeHTML(x.factual_description)+(x.exact_words?'<small class="registry-email">Verified words: '+escapeHTML(x.exact_words)+'</small>':'')+audioState+'</td><td>'+(x.mark_transaction_id?'<span class="incidents-deduction-recorded">Recorded</span>':'—')+'</td><td>'+review+parent+'</td></tr>';
  }).join("")||'<tr><td colspan="6" class="incidents-empty-cell">No matching incidents. Try changing the search or visibility filter.</td></tr>';
  document.getElementById("incidentResultCount").textContent="Showing "+filtered.length+" of "+incidentRecords.length+" recent incident record(s)";
 }
 document.getElementById("incidentSearch").addEventListener("input",drawIncidentRows);
 document.getElementById("incidentVisibility").addEventListener("change",drawIncidentRows);
  document.getElementById("incidentReviewFilter").addEventListener("change",drawIncidentRows);
  function incidentCsvCell(value){
   const raw=String(value??"");
   const safe=/^[\s]*[=+\-@]/.test(raw)?"'"+raw:raw;
   return '"'+safe.replace(/"/g,'""')+'"';
  }
  function exportIncidentReport(){
   const visible=filteredIncidentRecords();
   if(!visible.length){showToast("There are no incident records matching the current filters.");return;}
   const csv=[
    ["Date and time","Student","Student ID","Category","Severity","Factual description","Administrator review","Parent visibility","Mark deduction recorded","Action taken"].map(incidentCsvCell).join(","),
    ...visible.map(x=>[
     new Date(x.occurred_at).toLocaleString("en-IN"),x.students?.full_name||"Student",x.students?.student_code||"",
     x.category.replaceAll("_"," "),x.severity,x.factual_description||"",
     x.transcript_verified?"Verified":"Awaiting verification",x.published_to_parent_at?"Published":"Private",
     x.mark_transaction_id?"Yes":"No",x.action_taken||""
    ].map(incidentCsvCell).join(","))
   ];
   const blob=new Blob(["\uFEFF"+csv.join("\r\n")],{type:"text/csv;charset=utf-8;"}),url=URL.createObjectURL(blob),link=document.createElement("a");
   link.href=url;link.download="discipline-incident-register-"+disciplineToday()+".csv";
   document.body.appendChild(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(url),1200);
   showToast(visible.length+" incident record(s) exported.");
  }
  function printIncidentReport(){
   const visible=filteredIncidentRecords();
   if(!visible.length){showToast("There are no incident records matching the current filters.");return;}
   const pending=visible.filter(x=>!x.transcript_verified).length,published=visible.filter(x=>!!x.published_to_parent_at).length,privateCount=visible.length-published;
   const rows=visible.map(x=>"<tr><td>"+escapeHTML(new Date(x.occurred_at).toLocaleString("en-IN"))+"</td><td>"+escapeHTML(x.students?.full_name||"Student")+"<small>"+escapeHTML(x.students?.student_code||"")+"</small></td><td>"+escapeHTML(x.category.replaceAll("_"," "))+"</td><td>"+escapeHTML(x.severity)+"</td><td>"+escapeHTML(x.factual_description||"—")+"</td><td>"+(x.transcript_verified?"Verified":"Awaiting verification")+"</td><td>"+(x.published_to_parent_at?"Published":"Private")+"</td><td>"+(x.mark_transaction_id?"Yes":"No")+"</td></tr>").join("");
   const popup=window.open("","_blank");
   if(!popup){showToast("Allow pop-ups to print the incident report.");return;}
   popup.opener=null;
   const html="<!doctype html><html lang=\"en\"><head><meta charset=\"utf-8\"><meta name=\"viewport\" content=\"width=device-width,initial-scale=1\"><title>DISCIPLINE Incident Register</title><style>body{font-family:Arial,sans-serif;color:#24364d;margin:24px}header{display:flex;justify-content:space-between;gap:16px;align-items:flex-start;border-bottom:2px solid #c7a56b;padding-bottom:12px;margin-bottom:15px}h1{font-size:21px;margin:0 0 6px}p{margin:4px 0;color:#697a90;font-size:10px}.meta{text-align:right;color:#697a90;font-size:9px}.summary{display:flex;gap:9px;flex-wrap:wrap;margin:14px 0}.summary span{border:1px solid #dce3ec;border-radius:6px;padding:7px 9px;font-size:9px}.summary strong{font-size:13px;margin-left:4px}table{width:100%;border-collapse:collapse;font-size:8px}th{background:#edf2f7;text-align:left;color:#50637b;font-size:7px;letter-spacing:.3px}td,th{padding:6px 4px;border-bottom:1px solid #e5eaf0;vertical-align:top}td small{display:block;color:#718096;margin-top:2px}footer{margin-top:14px;padding-top:9px;border-top:1px solid #dce3ec;color:#718096;font-size:8px}.privacy-note{margin:8px 0;padding:8px;background:#f7f9fc;color:#64758a;font-size:9px}@media print{body{margin:10mm}tr{break-inside:avoid}}</style></head><body><header><div><h1>DISCIPLINE · Incident Register</h1><p>Administrator safeguarding review · Factual record summaries</p></div><div class=\"meta\">Generated "+escapeHTML(new Date().toLocaleString("en-IN"))+"<br>Current report filters applied</div></header><div class=\"privacy-note\">This report excludes exact recorded words, transcript text and temporary audio evidence. Use the private Incident Center review screen for restricted evidence.</div><div class=\"summary\"><span>Records <strong>"+visible.length+"</strong></span><span>Awaiting review <strong>"+pending+"</strong></span><span>Published <strong>"+published+"</strong></span><span>Private <strong>"+privateCount+"</strong></span></div><table><thead><tr><th>DATE</th><th>STUDENT</th><th>CATEGORY</th><th>SEVERITY</th><th>FACTUAL DESCRIPTION</th><th>REVIEW</th><th>PARENT ACCESS</th><th>DEDUCTION</th></tr></thead><tbody>"+rows+"</tbody></table><footer>DISCIPLINE · Confidential administrator report · Only filtered incident records are included.</footer></body></html>";
   popup.document.open();popup.document.write(html);popup.document.close();popup.focus();setTimeout(()=>popup.print(),350);
  }
  document.getElementById("incidentExportCsv").addEventListener("click",exportIncidentReport);
  document.getElementById("incidentPrintReport").addEventListener("click",printIncidentReport);

 const reviewDialog=document.getElementById("incidentReviewDialog");
 let reviewIncidentId=null;
 body.addEventListener("click",async event=>{
  const review=event.target.closest("[data-review-incident]");
  const publish=event.target.closest("[data-publish-incident]");
  const unpublish=event.target.closest("[data-unpublish-incident]");
  if(review){
   reviewIncidentId=review.dataset.reviewIncident;
   const incident=incidentRecords.find(x=>x.id===reviewIncidentId);
   const audioEvidence=incidentEvidence.find(x=>x.incident_id===reviewIncidentId&&x.evidence_type==="audio_temp");
   const transcriptEvidence=incidentEvidence.find(x=>x.incident_id===reviewIncidentId&&x.evidence_type==="transcript");
   const hasAudio=!!(audioEvidence?.storage_path&&!audioEvidence.audio_deleted_at);
   document.getElementById("incidentReviewTranscript").value=audioEvidence?.transcript_text||transcriptEvidence?.transcript_text||incident?.exact_words||"";
   document.getElementById("incidentReviewMessage").textContent=hasAudio?"Listen and correct the transcript. Verification permanently deletes the temporary audio.":"No temporary audio is attached. Review the incident details, then verify the record.";
   const audioWrap=document.getElementById("incidentReviewAudioWrap"),audioPlayer=document.getElementById("incidentReviewAudio");
   audioPlayer.pause();audioPlayer.removeAttribute("src");audioPlayer.load();audioWrap.hidden=!hasAudio;
   document.getElementById("incidentReviewAudioStatus").textContent="";
   if(hasAudio){
    document.getElementById("incidentReviewAudioStatus").textContent="Preparing a private 60-second listening link…";
    const signed=await db.functions.invoke("incident-audio",{body:{action:"listen",incident_id:reviewIncidentId}});
    if(signed.error||!signed.data?.signed_url){
     document.getElementById("incidentReviewAudioStatus").textContent="Audio could not be opened: "+(signed.error?.message||signed.data?.error||"Unknown error");
    }else{
     audioPlayer.src=signed.data.signed_url;
     document.getElementById("incidentReviewAudioStatus").textContent="This private link expires after 60 seconds.";
    }
   }
   reviewDialog.showModal();
   return;
  }
  if(publish){
   const incident=incidentRecords.find(x=>x.id===publish.dataset.publishIncident);
   if(!incident?.transcript_verified){showToast("Verify the incident before publishing it.");return;}
   if(!confirm("Publish this verified behaviour report to the linked parent account(s)? The report will include the reviewed exact words, if present."))return;
   publish.disabled=true;
   const {error}=await db.from("incidents").update({published_to_parent_at:new Date().toISOString()}).eq("id",publish.dataset.publishIncident);
   if(error){showToast("Could not publish incident: "+error.message);publish.disabled=false;return;}
   const links=await db.from("parent_student_links").select("parent_user_id").eq("student_id",publish.dataset.studentId);
   if(!links.error&&links.data?.length){
    const notices=links.data.map(x=>({recipient_user_id:x.parent_user_id,title:"Behaviour report available",message:"A new verified behaviour report has been published for your linked student. Sign in to review it.",related_student_id:publish.dataset.studentId,related_incident_id:publish.dataset.publishIncident}));
    const noticeResult=await db.from("notifications").insert(notices);
    if(noticeResult.error)showToast("Report published, but parent notification could not be saved: "+noticeResult.error.message);
   }
   await load();showToast("Incident verified and published to linked parent portal(s).");
  }else if(unpublish){
   if(!confirm("Remove this incident from the parent portal? The private administrator record and history will remain."))return;
   unpublish.disabled=true;
   const {error}=await db.from("incidents").update({published_to_parent_at:null}).eq("id",unpublish.dataset.unpublishIncident);
   if(error){showToast("Could not unpublish incident: "+error.message);unpublish.disabled=false;return;}
   await load();showToast("Incident removed from parent portal. Administrator history retained.");
  }
 });
 const reviewForm=document.getElementById("incidentReviewForm");
 document.getElementById("incidentReviewCancel").addEventListener("click",()=>reviewDialog.close());
 reviewForm.addEventListener("submit",async e=>{
  e.preventDefault();
  if(!reviewIncidentId)return;
  const verifyButton=document.getElementById("incidentReviewVerify"),message=document.getElementById("incidentReviewMessage");
  const incident=incidentRecords.find(x=>x.id===reviewIncidentId);
  const audioEvidence=incidentEvidence.find(x=>x.incident_id===reviewIncidentId&&x.evidence_type==="audio_temp");
  const hasAudio=!!(audioEvidence?.storage_path&&!audioEvidence.audio_deleted_at);
  const transcript=document.getElementById("incidentReviewTranscript").value.trim();
  if(hasAudio&&!transcript){message.textContent="A reviewed transcript is required before audio can be deleted.";return;}
  if(!confirm(hasAudio?"Verify this transcript and permanently delete the temporary audio now? This cannot be undone.":"Confirm that you have reviewed and verified the factual description and any exact words?"))return;
  verifyButton.disabled=true;verifyButton.textContent=hasAudio?"Deleting audio…":"Verifying…";message.textContent="Saving review…";
  try{
   const result=await db.functions.invoke("incident-audio",{body:{action:"verify",incident_id:reviewIncidentId,transcript_text:transcript}});
   if(result.error||result.data?.error)throw new Error(result.data?.error||result.error?.message||"Verification failed.");
   reviewDialog.close();reviewIncidentId=null;
   await load();await refreshAdminNotificationBadge();
   showToast(hasAudio?"Transcript verified. Temporary audio has been deleted.":"Incident review verified.");
  }catch(err){message.textContent="Not verified: "+err.message;showToast("Could not verify incident: "+err.message);}
  finally{verifyButton.disabled=false;verifyButton.textContent="Verify transcript & delete audio";}
 });
 let recordedAudioBlob=null,recordedAudioUrl=null,activeRecorder=null,activeStream=null,recordingTimer=null;
 const startRecording=document.getElementById("incidentStartRecording"),stopRecording=document.getElementById("incidentStopRecording"),audioConsent=document.getElementById("incidentAudioConsent"),audioStatus=document.getElementById("incidentAudioStatus"),audioPreview=document.getElementById("incidentAudioPreview");
 function clearRecordedAudio(){
  recordedAudioBlob=null;
  if(recordedAudioUrl){URL.revokeObjectURL(recordedAudioUrl);recordedAudioUrl=null;}
  audioPreview.pause();audioPreview.removeAttribute("src");audioPreview.load();audioPreview.hidden=true;
  audioStatus.textContent="No audio recorded.";
 }
 startRecording.addEventListener("click",async()=>{
  if(!audioConsent.checked){audioStatus.textContent="Confirm the required permission and notice before recording.";return;}
  if(!navigator.mediaDevices?.getUserMedia||!window.MediaRecorder){audioStatus.textContent="This browser does not support in-page audio recording.";return;}
  try{
   activeStream=await navigator.mediaDevices.getUserMedia({audio:true});
   const mimeType=["audio/webm;codecs=opus","audio/webm","audio/mp4","audio/ogg"].find(x=>MediaRecorder.isTypeSupported(x))||"";
   activeRecorder=new MediaRecorder(activeStream,mimeType?{mimeType}:undefined);
   const chunks=[];
   activeRecorder.ondataavailable=event=>{if(event.data&&event.data.size)chunks.push(event.data);};
   activeRecorder.onstop=()=>{
    activeStream?.getTracks().forEach(track=>track.stop());activeStream=null;
    const type=activeRecorder?.mimeType||"audio/webm";
    const blob=new Blob(chunks,{type});
    if(blob.size>8*1024*1024){
     clearRecordedAudio();audioStatus.textContent="Recording exceeded 8 MB. Record a shorter clip.";
    }else if(blob.size){
     clearRecordedAudio();recordedAudioBlob=blob;recordedAudioUrl=URL.createObjectURL(blob);
     audioPreview.src=recordedAudioUrl;audioPreview.hidden=false;audioStatus.textContent="Recording ready · "+Math.ceil(blob.size/1024)+" KB · temporary";
    }else{audioStatus.textContent="No audio data was captured.";}
    startRecording.disabled=false;stopRecording.disabled=true;stopRecording.textContent="Stop recording";
   };
   activeRecorder.start(1000);
   startRecording.disabled=true;stopRecording.disabled=false;audioStatus.textContent="Recording… maximum 60 seconds.";
   recordingTimer=setTimeout(()=>{if(activeRecorder?.state==="recording")activeRecorder.stop();},60000);
  }catch(err){
   activeStream?.getTracks().forEach(track=>track.stop());activeStream=null;
   startRecording.disabled=false;stopRecording.disabled=true;audioStatus.textContent="Could not start recording: "+err.message;
  }
 });
 stopRecording.addEventListener("click",()=>{
  if(recordingTimer)clearTimeout(recordingTimer);
  if(activeRecorder?.state==="recording"){activeRecorder.stop();audioStatus.textContent="Preparing recording…";}
 });
 document.getElementById("incidentForm").addEventListener("submit",async e=>{
  e.preventDefault();
  const btn=document.getElementById("saveIncident"),msg=document.getElementById("incidentMessage");
  if(activeRecorder?.state==="recording"){msg.textContent="Stop the audio recording before saving the incident.";return;}
  if(recordedAudioBlob&&!audioConsent.checked){msg.textContent="Reconfirm the required permission and notice before uploading the recording.";return;}
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
   const incidentId=result.data?.incident_id;
   let audioUploaded=false,audioUploadFailed=false;
   const hadRecordedAudio=!!recordedAudioBlob;
   if(recordedAudioBlob&&incidentId){
    const formData=new FormData();
    const extension=recordedAudioBlob.type.includes("mp4")?"mp4":recordedAudioBlob.type.includes("ogg")?"ogg":"webm";
    formData.append("action","upload");formData.append("incident_id",incidentId);
    formData.append("consent_confirmed",audioConsent.checked?"true":"false");
    formData.append("audio",recordedAudioBlob,"incident-audio."+extension);
    const upload=await db.functions.invoke("incident-audio",{body:formData});
    if(upload.error||upload.data?.error){
     audioUploadFailed=true;
     msg.textContent="Incident saved, but temporary audio upload failed: "+(upload.data?.error||upload.error?.message||"Unknown error");
     showToast("Incident saved; audio evidence was not uploaded. "+(upload.data?.error||upload.error?.message||""));
    }else{audioUploaded=true;msg.textContent="Incident and temporary audio saved privately. Review the transcript to delete the audio.";}
   }else{
    msg.textContent="Incident and any deduction were saved together. The record remains private until administrator review.";
   }
   if(recordedAudioBlob)clearRecordedAudio();
   e.target.reset();document.getElementById("incidentWhen").value=localDateTime;
   await load();await refreshAdminNotificationBadge();
   if(audioUploaded)showToast("Incident saved with private temporary audio. Verify transcript to delete it.");
   else if(!audioUploadFailed)showToast(hadRecordedAudio?"Incident saved, but no temporary audio was attached.":"Incident saved privately and consistently.");
  }catch(err){msg.textContent="Not saved: "+err.message;showToast("Incident save failed: "+err.message);}
  finally{btn.disabled=false;btn.textContent="Save private incident";}
 });
 await load();
}
async function renderAnalytics(){
 const db=window.disciplineSupabase,week=disciplineMonday(disciplineToday()),next=new Date(week+"T12:00:00");
 next.setDate(next.getDate()+7);
 const end=next.getFullYear()+"-"+String(next.getMonth()+1).padStart(2,"0")+"-"+String(next.getDate()).padStart(2,"0");
 pageContent.innerHTML=`
  <div class="analytics-head">
   <div><div class="eyebrow"><span class="eyebrow-line"></span> REPORTING / LIVE MEASURES</div><h1>Performance Analytics</h1><p class="page-intro">A clear, factual view of mark activity and recorded incidents for the current scoring week.</p></div>
   <button class="button button-outline" data-page="reports">Open weekly results</button>
  </div>
  <div class="analytics-period"><span class="analytics-period-mark">WEEKLY REPORT</span><strong id="analyticsWeek">Loading current week…</strong><small>Monday–Sunday · Asia/Kolkata</small></div>
  <section class="analytics-overview" aria-label="Weekly performance figures">
   <article class="analytics-stat"><span>Marks awarded</span><strong id="analyticsAwards">—</strong><small>Positive mark transactions</small></article>
   <article class="analytics-stat"><span>Marks deducted</span><strong id="analyticsDeductions">—</strong><small>Recorded deductions</small></article>
   <article class="analytics-stat"><span>Net mark movement</span><strong id="analyticsNet">—</strong><small>All transaction balance changes</small></article>
   <article class="analytics-stat"><span>Recorded incidents</span><strong id="analyticsIncidents">—</strong><small>Incidents logged this week</small></article>
  </section>
  <section class="analytics-panel">
   <div class="analytics-section-heading"><div><span class="analytics-step">WEEK AT A GLANCE</span><h2>Daily mark activity</h2><p>Daily totals are calculated from saved mark transactions.</p></div><span class="analytics-legend"><i class="legend-award"></i> Awards <i class="legend-deduction"></i> Deductions</span></div>
   <div class="table-scroll"><table class="registry-table analytics-table"><thead><tr><th>DATE</th><th>AWARDS</th><th>DEDUCTIONS</th><th>NET MOVEMENT</th></tr></thead><tbody id="analyticsRows"><tr><td colspan="4">Loading weekly activity…</td></tr></tbody></table></div>
   <p class="analytics-footnote">Figures reflect transactions recorded in the selected scoring week. Incident totals count incident records by occurrence date; they do not imply a mark deduction.</p>
  </section>
  <footer class="page-footer"><span>DISCIPLINE · Performance reporting</span><span>Based on saved records · Asia/Kolkata</span></footer>`;
 if(!db){showToast("Database connection is unavailable.");return;}
 const [tx,inc]=await Promise.all([
  db.from("mark_transactions").select("transaction_type,amount,balance_delta,occurred_at").gte("occurred_at",week+"T00:00:00+05:30").lt("occurred_at",end+"T00:00:00+05:30"),
  db.from("incidents").select("id",{count:"exact",head:true}).gte("occurred_at",week+"T00:00:00+05:30").lt("occurred_at",end+"T00:00:00+05:30")
 ]);
 if(tx.error)throw tx.error;if(inc.error)throw inc.error;
 const rows=tx.data||[],awards=rows.filter(x=>x.transaction_type==="award").reduce((n,x)=>n+x.amount,0),deductions=rows.filter(x=>x.transaction_type==="deduction").reduce((n,x)=>n+x.amount,0),net=rows.reduce((n,x)=>n+x.balance_delta,0),byDay={};
 rows.forEach(x=>{const day=new Intl.DateTimeFormat("en-CA",{timeZone:"Asia/Kolkata",year:"numeric",month:"2-digit",day:"2-digit"}).format(new Date(x.occurred_at));if(!byDay[day])byDay[day]={awards:0,deductions:0,net:0};if(x.transaction_type==="award")byDay[day].awards+=x.amount;if(x.transaction_type==="deduction")byDay[day].deductions+=x.amount;byDay[day].net+=x.balance_delta;});
 document.getElementById("analyticsAwards").textContent=awards;document.getElementById("analyticsDeductions").textContent=deductions;document.getElementById("analyticsNet").textContent=(net>0?"+":"")+net;document.getElementById("analyticsIncidents").textContent=inc.count??0;document.getElementById("analyticsWeek").textContent="Week "+week+" to "+new Date(end+"T12:00:00").toLocaleDateString("en-IN");
 const dayRows=Object.keys(byDay).sort().map(day=>'<tr><td>'+day+'</td><td class="analytics-award-value">+'+byDay[day].awards+'</td><td class="analytics-deduction-value">−'+byDay[day].deductions+'</td><td class="'+(byDay[day].net>=0?"positive-text":"negative-text")+'">'+(byDay[day].net>0?"+":"")+byDay[day].net+'</td></tr>').join("");
 document.getElementById("analyticsRows").innerHTML=dayRows||'<tr><td colspan="4" class="analytics-empty-cell">No mark activity has been recorded this week.</td></tr>';
}
async function renderCertificates(){
 const db=window.disciplineSupabase;
 pageContent.innerHTML=`
  <div class="certificates-head">
   <div><div class="eyebrow"><span class="eyebrow-line"></span> RECOGNITION / ACHIEVEMENT RECORDS</div><h1>Achievement Certificates</h1><p class="page-intro">Recognise a student's progress and achievements, then decide when the certificate is ready to appear in linked portals.</p></div>
   <span class="certificates-access-tag">PRIVATE BY DEFAULT</span>
  </div>
  <section class="certificates-guidance"><span class="certificates-guidance-mark">i</span><div><strong>Issue first. Publish after review.</strong><p>New certificates are saved as private drafts. Publishing makes the record visible to the linked student and parent portal accounts.</p></div></section>
  <section class="certificates-overview" aria-label="Certificate register summary">
   <article class="certificates-stat"><span>Certificates issued</span><strong id="certificateTotal">—</strong><small>Latest 300 saved records</small></article>
   <article class="certificates-stat"><span>Published</span><strong id="certificatePublished">—</strong><small>Visible in linked portals</small></article>
   <article class="certificates-stat"><span>Private drafts</span><strong id="certificatePrivate">—</strong><small>Administrator-only records</small></article>
  </section>
  <section class="certificates-form-panel">
   <div class="certificates-section-heading"><div><span class="certificates-step">01 · CREATE</span><h2>Issue an achievement certificate</h2><p>Add the recipient and a clear description of the achievement being recognised.</p></div><span class="certificates-form-label">NEW CERTIFICATE</span></div>
   <form id="certificateForm">
    <div class="certificates-form-grid">
     <div class="field"><label for="certificateStudent">Student *</label><select id="certificateStudent" required><option value="">Loading students…</option></select><small>Select the student who will receive this recognition.</small></div>
     <div class="field"><label for="certificateTitle">Certificate title *</label><input id="certificateTitle" type="text" maxlength="120" required placeholder="e.g. Outstanding Cooperation"><small>Use a short, specific title.</small></div>
     <div class="field full"><label for="certificateDescription">Achievement description</label><textarea id="certificateDescription" rows="3" maxlength="1000" placeholder="Describe the achievement in clear, encouraging language."></textarea><small>Optional · Maximum 1,000 characters.</small></div>
    </div>
    <div class="certificates-form-footer"><div><button class="button button-primary" id="issueCertificate" type="submit">Issue private certificate</button><span id="certificateMessage" class="certificates-message" role="status"></span></div><small>Saved as a private draft. You can publish it after reviewing the details.</small></div>
   </form>
  </section>
  <section class="certificates-records-panel">
   <div class="certificates-section-heading"><div><span class="certificates-step">02 · REVIEW & SHARE</span><h2>Certificate register</h2><p>Search issued certificates and control portal visibility for each record.</p></div><span class="certificates-record-limit">LATEST 300</span></div>
   <div class="certificates-filter-bar">
    <div class="field"><label for="certificateSearch">Search records</label><input id="certificateSearch" type="search" class="registry-search" placeholder="Student, ID or certificate title…"></div>
    <div class="field"><label for="certificateStatusFilter">Portal visibility</label><select id="certificateStatusFilter"><option value="">All certificates</option><option value="private">Private drafts</option><option value="published">Published</option></select></div>
   </div>
   <div class="certificates-results-line"><strong id="certificateResultCount">Loading certificates…</strong><span>Published records are visible to linked portal users.</span></div>
   <div class="table-scroll"><table class="registry-table certificates-table"><thead><tr><th>ISSUED</th><th>STUDENT</th><th>CERTIFICATE</th><th>DESCRIPTION</th><th>PORTAL STATUS</th><th>ACTION</th></tr></thead><tbody id="certificateRows"><tr><td colspan="6">Loading…</td></tr></tbody></table></div>
   <p class="certificates-footnote">This register shows the latest 300 saved certificates. Unpublishing hides a certificate from student and parent portals but retains the administrator record.</p>
  </section>
  <footer class="page-footer"><span>DISCIPLINE · Student recognition</span><span>Private drafts · Controlled portal publishing</span></footer>`;
 if(!db){showToast("Database connection is unavailable.");return;}
 const studentSelect=document.getElementById("certificateStudent"),body=document.getElementById("certificateRows");
 const students=await db.from("students").select("id,student_code,full_name").eq("is_active",true).order("full_name");
 if(students.error)throw students.error;
 studentSelect.innerHTML='<option value="">Choose a student</option>'+(students.data||[]).map(x=>'<option value="'+x.id+'">'+escapeHTML(x.student_code)+' — '+escapeHTML(x.full_name)+'</option>').join("");
 let records=[];
 async function load(){
  const r=await db.from("certificates").select("id,student_id,title,description,issued_at,published_at,students(full_name,student_code)").order("issued_at",{ascending:false}).limit(300);
  if(r.error){body.innerHTML='<tr><td colspan="6">Could not load certificates: '+escapeHTML(r.error.message)+'</td></tr>';document.getElementById("certificateResultCount").textContent="Certificate register could not be loaded.";return;}
  records=r.data||[];
  const published=records.filter(x=>!!x.published_at).length;
  document.getElementById("certificateTotal").textContent=records.length;
  document.getElementById("certificatePublished").textContent=published;
  document.getElementById("certificatePrivate").textContent=records.length-published;
  draw();
 }
 function draw(){
  const q=document.getElementById("certificateSearch").value.trim().toLowerCase(),status=document.getElementById("certificateStatusFilter").value;
  const filtered=records.filter(x=>{
   const published=!!x.published_at;
   return (!status||(status==="published"?published:!published))&&[x.title,x.description,x.students?.full_name,x.students?.student_code].join(" ").toLowerCase().includes(q);
  });
  body.innerHTML=filtered.map(x=>'<tr><td><span class="certificates-date">'+escapeHTML(new Date(x.issued_at).toLocaleDateString("en-IN"))+'</span></td><td><strong>'+escapeHTML(x.students?.full_name||"Student")+'</strong><small class="registry-email">'+escapeHTML(x.students?.student_code||"")+'</small></td><td><strong>'+escapeHTML(x.title)+'</strong></td><td class="certificates-description">'+escapeHTML(x.description||"—")+'</td><td><span class="session-status '+(x.published_at?"completed":"pending")+'">'+(x.published_at?"Published":"Private draft")+'</span></td><td><button class="button button-quiet" type="button" data-print-certificate="'+x.id+'">Print certificate</button>'+(x.published_at?'<button class="button button-outline" type="button" data-unpublish-certificate="'+x.id+'">Unpublish</button>':'<button class="button button-primary" type="button" data-publish-certificate="'+x.id+'" data-certificate-student="'+x.student_id+'">Publish to portals</button>')+'</td></tr>').join("")||'<tr><td colspan="6" class="certificates-empty-cell">'+(records.length?"No certificates match the current search and visibility filter.":"No certificates have been issued yet. Use the form above to recognise a student's achievement.")+'</td></tr>';
  document.getElementById("certificateResultCount").textContent="Showing "+filtered.length+" of "+records.length+" recent certificate record(s)";
 }
 document.getElementById("certificateSearch").addEventListener("input",draw);
 document.getElementById("certificateStatusFilter").addEventListener("change",draw);
 document.getElementById("certificateForm").addEventListener("submit",async e=>{
  e.preventDefault();
  const btn=document.getElementById("issueCertificate"),msg=document.getElementById("certificateMessage");
  const title=document.getElementById("certificateTitle").value.trim();
  if(!studentSelect.value||!title){msg.textContent="Choose a student and enter a certificate title.";return;}
  btn.disabled=true;btn.textContent="Issuing…";msg.textContent="";
  try{
   const uid=await disciplineAdminId(db);
   const r=await db.from("certificates").insert({
    student_id:studentSelect.value,title,
    description:document.getElementById("certificateDescription").value.trim()||null,
    issued_by:uid,published_at:null
   }).select("id").single();
   if(r.error)throw r.error;
   e.target.reset();msg.textContent="Certificate issued as a private draft. Publish it when ready.";
   await load();showToast("Certificate issued privately.");
  }catch(error){msg.textContent="Could not issue certificate: "+error.message;showToast(error.message);}
  finally{btn.disabled=false;btn.textContent="Issue private certificate";}
 });
  function printCertificate(record){
   if(!record)return;
   const student=record.students||{},popup=window.open("","_blank");
   if(!popup){showToast("Allow pop-ups to print the certificate.");return;}
   popup.opener=null;
   const issued=new Date(record.issued_at).toLocaleDateString("en-IN",{day:"numeric",month:"long",year:"numeric"});
   const html="<!doctype html><html lang=\"en\"><head><meta charset=\"utf-8\"><meta name=\"viewport\" content=\"width=device-width,initial-scale=1\"><title>Achievement Certificate · "+escapeHTML(record.title)+"</title><style>@page{size:A4 landscape;margin:0}*{box-sizing:border-box}html,body{margin:0;min-height:100%;font-family:Georgia,'Times New Roman',serif;color:#28364a;background:#fff}body{display:grid;place-items:center;padding:15mm}.certificate{position:relative;width:267mm;height:180mm;padding:17mm 20mm;border:3px double #bd9a5a;outline:1px solid #e7d8b8;outline-offset:5mm;text-align:center;display:flex;flex-direction:column;align-items:center;justify-content:center}.ornament{font-size:28px;color:#bd9a5a;line-height:1}.institution{font:700 17px Arial,sans-serif;letter-spacing:2.8px;text-transform:uppercase;color:#8a6c3d;margin:11px 0 7px}.rule{width:70%;height:1px;background:#d8c397;margin:8px auto 15px}.eyebrow{font:700 9px Arial,sans-serif;letter-spacing:3px;color:#8490a1;text-transform:uppercase}.title{font-size:34px;line-height:1.18;color:#263b56;margin:10px 0 5px}.intro{font:italic 14px Georgia,serif;color:#6d7b8d;margin:8px 0}.student{font-size:31px;color:#9a753e;margin:10px 0 5px;border-bottom:1px solid #d9c7a3;padding:0 26px 7px;min-width:55%}.description{font:14px/1.55 Arial,sans-serif;color:#526278;max-width:190mm;margin:9px auto 0}.footer{display:flex;justify-content:space-between;align-items:flex-end;width:100%;margin-top:18mm;gap:18mm}.signature{width:63mm;border-top:1px solid #8793a4;padding-top:7px;font:10px Arial,sans-serif;color:#67778c}.date{font:11px Arial,sans-serif;color:#607187}.seal{position:absolute;right:18mm;top:17mm;width:23mm;height:23mm;border:1px solid #c6a66d;border-radius:50%;display:grid;place-items:center;color:#a17b3e;font:700 8px Arial,sans-serif;letter-spacing:1px;text-align:center}@media screen{body{background:#edf1f5;min-height:100vh}.certificate{background:#fff;box-shadow:0 16px 48px rgba(30,48,70,.12)}}@media print{body{padding:0}.certificate{box-shadow:none;outline-offset:4mm;break-inside:avoid}}</style></head><body><main class=\"certificate\"><div class=\"ornament\">✦</div><div class=\"institution\">Usmania Institute Of Excellence</div><div class=\"rule\"></div><div class=\"eyebrow\">Certificate of Achievement</div><div class=\"title\">"+escapeHTML(record.title)+"</div><p class=\"intro\">This certificate is proudly presented to</p><div class=\"student\">"+escapeHTML(student.full_name||"Student")+"</div><p class=\"description\">"+escapeHTML(record.description||"In recognition of dedication, effort and positive contribution.")+"</p><div class=\"footer\"><div class=\"signature\">Authorized signature</div><div class=\"date\">Issued on "+escapeHTML(issued)+"</div><div class=\"signature\">Institute representative</div></div><div class=\"seal\">DISCIPLINE<br>AWARD</div></main></body></html>";
   popup.document.open();popup.document.write(html);popup.document.close();popup.focus();setTimeout(()=>popup.print(),400);
  }
 body.addEventListener("click",async event=>{
   const print=event.target.closest("[data-print-certificate]");
   if(print){printCertificate(records.find(x=>x.id===print.dataset.printCertificate));return;}
  const publish=event.target.closest("[data-publish-certificate]");
  const unpublish=event.target.closest("[data-unpublish-certificate]");
  if(!publish&&!unpublish)return;
  if(publish){
   if(!confirm("Publish this certificate to the linked student and parent portal(s)?"))return;
   publish.disabled=true;
   try{
    const {error}=await db.from("certificates").update({published_at:new Date().toISOString()}).eq("id",publish.dataset.publishCertificate);
    if(error)throw error;
    const linkRows=await db.from("parent_student_links").select("parent_user_id").eq("student_id",publish.dataset.certificateStudent);
    if(linkRows.error)throw linkRows.error;
    if((linkRows.data||[]).length){
     const row=records.find(x=>x.id===publish.dataset.publishCertificate);
     const notifications=linkRows.data.map(x=>({recipient_user_id:x.parent_user_id,title:"Achievement certificate published",message:"A new achievement certificate is available in your linked student's DISCIPLINE portal: "+(row?.title||"Achievement certificate")+".",related_student_id:publish.dataset.certificateStudent}));
     const notice=await db.from("notifications").insert(notifications);
     if(notice.error)showToast("Certificate published, but parent notification failed: "+notice.error.message);
    }
    await load();showToast("Certificate published to the linked portal(s).");
   }catch(error){showToast("Could not publish certificate: "+error.message);publish.disabled=false;}
  }else{
   if(!confirm("Unpublish this certificate from student and parent portals? The administrator record will remain."))return;
   unpublish.disabled=true;
   const {error}=await db.from("certificates").update({published_at:null}).eq("id",unpublish.dataset.unpublishCertificate);
   if(error){showToast("Could not unpublish certificate: "+error.message);unpublish.disabled=false;return;}
   await load();showToast("Certificate unpublished. Historical record retained.");
  }
 });
 await load();
}

function renderPortals(){
 pageContent.innerHTML='<div class="registry-head"><div><div class="eyebrow">ACCESS / ROLE PORTALS</div><h1>Portal Overview</h1><p class="page-intro">Student and parent accounts use the same secure sign-in page and are routed by their assigned role.</p></div></div><section class="panel registry-panel"><h3>Student portal</h3><p>Students can view their own mark balance, recent mark history, published weekly results and relevant records. They cannot create or change marks.</p></section><section class="panel registry-panel"><h3>Parent portal</h3><p>Parents can view only their linked child’s published results and permitted reports. Parent accounts must be created by the administrator.</p></section><section class="panel registry-panel"><h3>Manage access</h3><p>Use Portal Accounts to send an invitation. The invited person sets their own password; never ask them to share it.</p><button class="button button-primary" data-page="accounts">Open Portal Accounts</button></section>';
}
function renderSettings(){
 pageContent.innerHTML='<div class="registry-head"><div><div class="eyebrow">ADMINISTRATION / SYSTEM</div><h1>Settings</h1><p class="page-intro">Current system rules and security boundaries.</p></div></div><section class="panel registry-panel"><h3>Weekly scoring period</h3><p>Monday 00:00 through Sunday 23:59 · Asia/Kolkata. Negative balances are allowed; historical transactions are retained.</p></section><section class="panel registry-panel"><h3>Roles and permissions</h3><p>Administrator: full control. Student: own records, view only. Parent: linked child records, view only. Parent and student accounts are created by the administrator.</p></section><section class="panel registry-panel"><h3>Password setup rules</h3><p>New invitation and recovery passwords in DISCIPLINE must contain at least 12 characters, uppercase and lowercase letters, a number and a symbol. This is an application-side setup check; Supabase Auth remains the authoritative password service.</p></section><section class="panel registry-panel"><h3>Provider security limitation</h3><p>This Supabase organization is on the Free plan. Breached-password screening through HaveIBeenPwned is available on Pro and above, so it remains disabled until the project plan supports it. Do not reuse passwords; consider enabling provider-level screening before production onboarding.</p></section><section class="panel registry-panel"><h3>Data protection</h3><p>Mark changes are stored in the transaction ledger. Incident records start private and are not automatically published to parents. Temporary incident audio is private and deleted after transcript verification. Do not store passwords, private keys or unnecessary personal details in this application.</p></section>';
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
  const notificationBtn=e.target.closest("#notificationButton");
  const refreshBtn=e.target.closest("#refreshAdminNotifications");
  if(notificationBtn){e.preventDefault();toggleAdminNotificationPanel();return;}
  if(refreshBtn){e.preventDefault();loadAdminNotifications();return;}
  const pageBtn=e.target.closest("[data-page]");
  const actionBtn=e.target.closest("[data-action]");
  if(pageBtn){setActivePage(pageBtn.dataset.page);closeAdminNotificationPanel();}
  if(actionBtn&&actionBtn.dataset.action==="add-student")setActivePage("students");
  if(e.target.closest(".notice-dismiss"))e.target.closest(".notice-banner").remove();
  if(e.target.closest("#dateButton"))showToast("Weekly period: Monday to Sunday · Asia/Kolkata");
  if(!e.target.closest("#notificationCenter"))closeAdminNotificationPanel();
});
// Navigation is handled once by the delegated document click listener above.
document.getElementById("menuToggle").addEventListener("click",()=>{document.getElementById("sidebar").classList.add("open");document.getElementById("sidebarBackdrop").classList.add("show");});
document.getElementById("closeSidebar").addEventListener("click",closeSidebar);
document.getElementById("sidebarBackdrop").addEventListener("click",closeSidebar);
document.getElementById("modalClose").addEventListener("click",closeModal);
modalBackdrop.addEventListener("click",e=>{if(e.target===modalBackdrop)closeModal();});
document.addEventListener("keydown",e=>{if(e.key==="Escape"){closeModal();closeSidebar();closeAdminNotificationPanel();}});
// The authenticated role controller opens the requested hash route after sign-in.
