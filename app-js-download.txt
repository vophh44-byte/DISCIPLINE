const pageMeta = {
 dashboard:{title:"Command Center",desc:"Your daily system overview.",icon:"▦"},
 students:{title:"Student Registry",desc:"Create and manage student profiles.",icon:"♙"},
 parents:{title:"Parent Management",desc:"Manage parent accounts and family links.",icon:"♧"},
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
