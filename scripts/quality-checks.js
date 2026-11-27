"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const root = path.resolve(__dirname, "..");
const read = (relativePath) => fs.readFileSync(path.join(root, relativePath), "utf8");
const auth = read("js/auth.js");
const app = read("js/app.js");
const html = read("index.html");
const styles = read("css/style.css");
const config = read("js/supabase-config.js");
const audioFunction = read("supabase/functions/incident-audio/index.ts");
const accountFunction = read("supabase/functions/create-portal-account/index.ts");
const accountPreflight = read("supabase/functions/create-portal-account/portal-account-preflight.mjs");
const anonAccessMigration = read("supabase/migrations/20261127115000_revoke_anon_public_application_access.sql");
const securityAudit = read("scripts/security-audit.sql");
const roleSmoke = read("scripts/rls-role-smoke.sql");
const weeklyPublishMigration = read("supabase/migrations/20261127132000_notify_linked_portals_when_weekly_results_first_published.sql");

let passed = 0;
function check(name, callback) {
  callback();
  passed += 1;
  process.stdout.write("PASS  " + name + "\n");
}

// Parse only; these files expect a browser and are not executed in Node.
for (const file of ["js/auth.js", "js/app.js", "js/supabase-config.js"]) {
  check(file + " parses", () => {
    new vm.Script(read(file), { filename: file });
  });
}

check("all four portal choices are present", () => {
  for (const role of ["admin", "parent", "student", "driver"]) {
    assert.match(auth, new RegExp('data-portal="' + role + '"'));
  }
});

check("only supported roles can open a session", () => {
  assert.match(auth, /const allowedRoles = \["admin","parent","student","driver"\]/);
});

check("application shell starts hidden, inert and unavailable to assistive technology", () => {
  assert.match(html, /<div class="app-shell" hidden aria-hidden="true" inert>/);
  assert.match(styles, /\.app-shell\[hidden\]\{display:none!important\}/);
});

check("a validated portal session explicitly releases the hidden application shell", () => {
  const start = auth.indexOf("function portalShell(");
  const end = auth.indexOf("async function renderReadOnlyPortal(", start);
  const shell = auth.slice(start, end);
  assert.ok(start >= 0 && end > start, "portal shell function missing");
  assert.match(shell, /appShell\.hidden = false/);
  assert.match(shell, /appShell\.removeAttribute\("aria-hidden"\)/);
  assert.match(shell, /appShell\.removeAttribute\("inert"\)/);
});

check("inactive, unsupported or mismatched accounts cannot release the application shell", () => {
  const start = auth.indexOf("async function openForSession(");
  const end = auth.indexOf('form.addEventListener("submit"', start);
  const openSession = auth.slice(start, end);
  assert.ok(start >= 0 && end > start, "session validation flow missing");
  assert.match(openSession, /profile\.is_active !== true/);
  assert.match(openSession, /!allowedRoles\.includes\(String\(profile\.role\)\)/);
  assert.match(openSession, /expectedPortal && profile\.role !== expectedPortal/);
  assert.ok(openSession.indexOf("const allowedRoles") < openSession.indexOf('if (profile.role === "admin")'));
  assert.ok(openSession.indexOf("expectedPortal && profile.role") < openSession.indexOf('if (profile.role === "admin")'));
});

check("temporary profile lookup failures preserve sessions and keep the application hidden", () => {
  const start = auth.indexOf("async function openForSession(");
  const end = auth.indexOf("async function restoreSavedSession()", start);
  const flow = auth.slice(start, end);
  assert.match(flow, /if \(profileResult\.error\)[\s\S]*?throw new Error\("Account verification is temporarily unavailable/);
  assert.doesNotMatch(flow, /if \(profileResult\.error\)[\s\S]{0,220}client\.auth\.signOut/);
  assert.match(flow, /hideApplicationShell\(\)/);
  assert.match(auth, /Check your internet connection and retry; your sign-in has not been cleared/);
});

check("saved-session startup catches auth errors and offers an accessible retry", () => {
  assert.match(auth, /async function restoreSavedSession\(\)/);
  const start = auth.indexOf("async function restoreSavedSession()");
  const end = auth.indexOf('form.addEventListener("submit"', start);
  const flow = auth.slice(start, end);
  assert.match(flow, /client\.auth\.getSession\(\)/);
  assert.match(flow, /catch \(_\)/);
  assert.match(flow, /showSessionAlert\(/);
  assert.match(auth, /id = "authSessionAlert"/);
  assert.match(auth, /setAttribute\("role", "alert"\)/);
  assert.match(auth, /Retry account check/);
  assert.match(auth, /restoreSavedSession\(\);/);
});

check("choosing a fresh portal sign-in clears stale session retry notices", () => {
  const start = auth.indexOf("function showLogin(role)");
  const end = auth.indexOf('document.querySelectorAll("[data-portal]")', start);
  const handler = auth.slice(start, end);
  assert.match(handler, /getElementById\("authSessionAlert"\)/);
  assert.match(handler, /staleSessionAlert\.remove\(\)/);
});

check("portal render failures hide partial content and leave a safe retry path", () => {
  const start = auth.indexOf("async function openForSession(");
  const end = auth.indexOf("async function restoreSavedSession()", start);
  const flow = auth.slice(start, end);
  assert.match(flow, /catch \(error\)[\s\S]*hideApplicationShell\(\)[\s\S]*showPicker\(\)[\s\S]*throw new Error\("Your account was verified/);
});

check("session retry notices have responsive accessible visual styling", () => {
  assert.match(styles, /\.auth-session-alert\{[^}]*border:[^}]*background:/);
  assert.match(styles, /\.auth-session-alert \.button\{width:100%/);
});

check("selected portal must match the signed-in account role", () => {
  assert.match(auth, /if \(expectedPortal && profile\.role !== expectedPortal\)/);
});

check("student route opens the read-only portal", () => {
  assert.match(auth, /renderReadOnlyPortal\("student", profile, session\.user\)/);
  assert.match(auth, /PRIVATE STUDENT PORTAL · VIEW ONLY/);
});

check("student account is linked to the signed-in user", () => {
  assert.match(
    auth,
    /client\.from\("student_accounts"\)\.select\("student_id"\)\.eq\("user_id", user\.id\)/
  );
});

check("student dashboard loads only its linked student profiles", () => {
  assert.match(
    auth,
    /client\.from\("students"\)[\s\S]{0,180}\.in\("id", links\)/
  );
});

check("weekly score query is student-scoped and published-only", () => {
  assert.match(
    auth,
    /client\.from\("weekly_results"\)[\s\S]{0,500}\.eq\("student_id", student\.id\)[\s\S]{0,180}\.not\("published_at",\s*"is",\s*null\)/
  );
});

check("mark history query is scoped to the linked student", () => {
  assert.match(
    auth,
    /client\.from\("mark_transactions"\)[\s\S]{0,300}\.eq\("student_id", student\.id\)/
  );
});

check("non-parent portal exits before incident and parent-only report queries", () => {
  const nonParentGuard = auth.indexOf('if (role !== "parent") {');
  const guardedContinue = auth.indexOf("continue;", nonParentGuard);
  const incidentQuery = auth.indexOf('client.from("incidents")', guardedContinue);
  assert.ok(nonParentGuard >= 0, "non-parent guard missing");
  assert.ok(guardedContinue > nonParentGuard, "non-parent guard must continue");
  assert.ok(incidentQuery > guardedContinue, "parent incident query must follow the guard");
});

check("parent response writes are inside parent-only handling", () => {
  const parentInsert = auth.indexOf('client.from("parent_responses").insert(payload)');
  const parentGuard = auth.lastIndexOf('if (role === "parent")', parentInsert);
  assert.ok(parentInsert >= 0, "parent response insert missing");
  assert.ok(parentGuard >= 0 && parentGuard < parentInsert, "parent-only guard missing");
});

check("student account provisioning is available as view-only", () => {
  assert.match(app, /option value="student">Student \(view only\)<\/option>/);
  assert.match(app, /isStudent=roleSelect\.value==="student"/);
});

check("browser config uses a publishable key and contains no server secret", () => {
  assert.match(config, /publishableKey\s*:/);
  assert.doesNotMatch(config, /\bservice_role\b|\bsb_secret_[A-Za-z0-9]+\b|SUPABASE_SERVICE_ROLE_KEY/i);
});

check("Supabase browser configuration loads before application scripts", () => {
  const configPosition = html.indexOf('src="js/supabase-config.js"');
  const appPosition = html.indexOf('src="js/app.js');
  const authPosition = html.indexOf('src="js/auth.js');
  assert.ok(configPosition >= 0 && appPosition > configPosition);
  assert.ok(authPosition > appPosition);
});

check("multipart incident audio forwards the permission confirmation", () => {
  assert.match(audioFunction, /consent_confirmed:\s*String\(form\.get\("consent_confirmed"\)\s*\|\|\s*""\)/);
});

check("audio upload still requires explicit permission confirmation", () => {
  assert.match(audioFunction, /String\(input\.consent_confirmed\s*\|\|\s*""\)\s*!==\s*"true"/);
});

check("audio uploads remain type- and size-limited", () => {
  assert.match(audioFunction, /audio\/webm/);
  assert.match(audioFunction, /file\.size\s*>\s*8\s*\*\s*1024\s*\*\s*1024/);
});

check("audio listening links remain short-lived", () => {
  assert.match(audioFunction, /createSignedUrl\(evidence\.storage_path,\s*60\)/);
});

check("audio function requires an active administrator", () => {
  assert.match(audioFunction, /caller\.role !== "admin" \|\| caller\.is_active !== true/);
  assert.match(audioFunction, /auth\.getUser\(\)/);
});

check("portal account function authenticates the caller with their bearer token", () => {
  assert.match(accountFunction, /authHeader\.startsWith\("Bearer "\)/);
  assert.match(accountFunction, /userClient\.auth\.getUser\(\)/);
});

check("portal account creation requires an active administrator", () => {
  assert.match(accountFunction, /caller\.role !== "admin" \|\| caller\.is_active !== true/);
});

check("auth status listing is an administrator-only branch after bearer and active-role validation", () => {
  const authCheck=accountFunction.indexOf("userClient.auth.getUser()");
  const adminCheck=accountFunction.indexOf('caller.role !== "admin" || caller.is_active !== true');
  const listBranch=accountFunction.indexOf('input.action === "list_auth_status"');
  assert.ok(authCheck>=0&&adminCheck>authCheck&&listBranch>adminCheck,"auth status list must follow authentication and admin authorization");
});

check("auth status endpoint queries Supabase Auth metadata and returns only minimal setup timestamps", () => {
  const start=accountFunction.indexOf('if (input.action === "list_auth_status")');
  const end=accountFunction.indexOf('const email = (input.email || "")',start);
  const branch=accountFunction.slice(start,end);
  assert.match(branch,/auth\.admin\.listUsers\(\{ page: 1, perPage: 1000 \}\)/);
  for(const field of ["user_id","invited_at","email_confirmed_at","last_sign_in_at"]) assert.ok(branch.includes(field),"auth status response missing "+field);
  assert.doesNotMatch(branch,/password|recovery_token|confirmation_token|serviceKey/);
});

check("auth status endpoint filters results to parent, student and driver portal profiles", () => {
  const start=accountFunction.indexOf('if (input.action === "list_auth_status")');
  const end=accountFunction.indexOf('const email = (input.email || "")',start);
  const branch=accountFunction.slice(start,end);
  assert.match(branch,/\.in\("role", \["parent", "student", "driver"\]\)/);
  assert.match(branch,/portalUserIds\.has\(user\.id\)/);
  assert.match(branch,/filter\(user => portalUserIds\.has\(user\.id\)\)/);
});

check("Portal Accounts requests authentication timestamps without blocking profile directory on failure", () => {
  const start=app.indexOf("async function loadPortalDirectory()");
  const end=app.indexOf("directorySearch.addEventListener",start);
  const flow=app.slice(start,end);
  assert.match(flow,/functions\.invoke\("create-portal-account",\{body:\{action:"list_auth_status"\}\}\)/);
  assert.match(flow,/let authStatusResult=\{data:null,error:/);
  assert.match(flow,/catch\(authStatusError\)/);
  assert.ok(flow.indexOf("if(failed)throw failed.error")<flow.indexOf("let authStatusResult="));
  assert.match(flow,/authStatusAvailable=!authStatusResult\.error/);
  assert.match(flow,/Authentication timestamps unavailable for this refresh/);
});

check("Portal account directory labels confirmation and invitation timestamps accurately", () => {
  assert.match(app,/auth\.email_confirmed_at\?"Email confirmed":auth\.invited_at\?"Invitation issued · not confirmed":"No invitation timestamp"/);
  assert.match(app,/An invitation timestamp does not prove inbox delivery/);
  assert.match(app,/Last sign-in:/);
});

check("portal account function supports production and local development CORS safely", () => {
  assert.match(accountFunction, /function corsHeaders\(req: Request\)/);
  assert.match(accountFunction, /https:\/\/vophh44-byte\.github\.io/);
  assert.match(accountFunction, /localhost/);
  assert.match(accountFunction, /127\\.0\\.0\\.1/);
  assert.match(accountFunction, /Vary.*Origin/);
  assert.match(accountFunction, /x-retry-count, traceparent, tracestate, baggage/);
  assert.match(accountFunction, /req\.method === "OPTIONS"/);
});

check("portal account function rejects unsupported account roles", () => {
  assert.match(accountFunction, /role !== "student" && role !== "parent" && role !== "driver"/);
});

check("portal account function accepts only active student profiles", () => {
  assert.match(accountFunction, /student\.is_active !== true/);
  assert.match(accountFunction, /routeStudents\.some\(\(s: \{is_active:boolean\}\) => s\.is_active !== true\)/);
});

check("student account provisioning prevents conflicting user/profile links", () => {
  assert.match(accountFunction, /\.from\("student_accounts"\)[\s\S]{0,180}\.eq\("student_id", studentId\)/);
  assert.match(accountFunction, /\.eq\("user_id", userId\)/);
});

check("portal invitations return to the password setup screen", () => {
  assert.match(accountFunction, /redirectTo:\s*"https:\/\/vophh44-byte\.github\.io\/DISCIPLINE\/\?setup=1"/);
  assert.match(accountFunction, /inviteUserByEmail\(email/);
});
check("Portal Accounts shows a live count-only setup readiness snapshot", () => {
  for (const id of ["accountsReadinessStatus","accountsReadyStudents","accountsReadyStudentLogins","accountsReadyParents","accountsReadyDrivers","accountsReadyRoutes","accountsReadinessNote"]) {
    assert.ok(app.includes('id="' + id + '"'), "missing readiness field: " + id);
  }
  assert.match(app, /student_accounts"\)\.select\("student_id,user_id"\)/);
  assert.match(app, /parent_student_links"\)\.select\("student_id,parent_user_id"\)/);
  assert.match(app, /driver_routes"\)\.select\("id,driver_user_id"\)\.eq\("is_active",true\)/);
  assert.match(app, /driver_route_students"\)\.select\("route_id,student_id,valid_from,valid_to"\)/);
});

check("Portal readiness counts only active role profiles and current active route assignments", () => {
  assert.match(app, /profiles"\)\.select\("user_id,role,is_active"\)\.in\("role",\["parent","student","driver"\]\)/);
  assert.match(app, /profile\.is_active===true/);
  assert.match(app, /assignment\.valid_from<=today&&\(!assignment\.valid_to\|\|assignment\.valid_to>=today\)/);
  assert.match(app, /activeRouteIds\.has\(assignment\.route_id\)/);
  assert.match(app, /activeStudentIds\.has\(assignment\.student_id\)/);
});

check("Portal readiness displays aggregate totals and does not display emails or raw account identifiers", () => {
  const start=app.indexOf("// Show only aggregate counts;");
  const end=app.indexOf("const directorySearch=document.getElementById",start);
  const block=app.slice(start,end);
  assert.ok(start>=0&&end>start,"readiness loader missing");
  assert.match(block,/textContent=activeStudentIds\.size/);
  assert.match(block,/textContent=studentLoginCount/);
  assert.match(block,/textContent=activeParentIds\.size/);
  assert.match(block,/textContent=activeDriverIds\.size/);
  assert.match(block,/textContent=activeRoutes\.length/);
  assert.doesNotMatch(block,/innerHTML|\.email|display_name/);
});

check("Portal readiness errors are non-blocking and never pretend a failed query is zero", () => {
  const start=app.indexOf("// Show only aggregate counts;");
  const end=app.indexOf("const directorySearch=document.getElementById",start);
  const block=app.slice(start,end);
  assert.match(block,/if\(failedReadiness\)/);
  assert.match(block,/Snapshot unavailable/);
  assert.match(block,/You can still use the form/);
  assert.match(block,/catch\(readinessError\)/);
});

check("Portal readiness responsive layout includes a two-column mobile state", () => {
  assert.match(styles,/\.accounts-readiness-grid\{display:grid;grid-template-columns:repeat\(5,minmax\(0,1fr\)\)/);
  const mobileStart=styles.indexOf("@media(max-width:560px){.accounts-readiness-panel");
  assert.ok(mobileStart>=0,"readiness mobile media rule missing");
  const mobileStyles=styles.slice(mobileStart,Math.min(styles.length,mobileStart+700));
  assert.match(mobileStyles,/\.accounts-readiness-grid\{grid-template-columns:repeat\(2,minmax\(0,1fr\)\)/);
});

check("Portal account directory shows accessible search, role and profile-status filters", () => {
  for (const id of ["portalDirectorySearch","portalDirectoryRole","portalDirectoryStatusFilter","refreshPortalDirectory","portalDirectoryStatus","portalDirectoryRows"]) {
    assert.ok(app.includes('id="' + id + '"'), "missing directory control: " + id);
  }
  assert.match(app, /aria-labelledby="portalDirectoryTitle"/);
  assert.match(app, /<th>ACCOUNT<\/th><th>PORTAL<\/th><th>PROFILE STATUS<\/th>/);
});

check("Portal account directory loads profiles and all linked record sources", () => {
  const start=app.indexOf("async function loadPortalDirectory()");
  const end=app.indexOf("directorySearch.addEventListener",start);
  const flow=app.slice(start,end);
  assert.ok(start>=0&&end>start,"directory loader missing");
  for(const source of ['from("profiles")','from("parent_student_links")','from("student_accounts")','from("driver_routes")','from("driver_route_students")','from("students")']) {
    assert.ok(flow.includes(source),"directory query missing "+source);
  }
  assert.match(flow,/await Promise\.all\(/);
});

check("Portal account directory filters by name, email, role and active profile state", () => {
  const start=app.indexOf("function renderPortalDirectory()");
  const end=app.indexOf("async function loadPortalDirectory()",start);
  const flow=app.slice(start,end);
  assert.match(flow,/display_name/);
  assert.match(flow,/profile\.email/);
  assert.match(flow,/profile\.role===roleFilter/);
  assert.match(flow,/statusFilter==="active"\?profile\.is_active:!profile\.is_active/);
});

check("Portal account directory safely escapes user-controlled profile and route text", () => {
  const start=app.indexOf("function renderPortalDirectory()");
  const end=app.indexOf("async function loadPortalDirectory()",start);
  const renderer=app.slice(start,end);
  assert.match(renderer,/escapeHTML\(profile\.display_name/);
  assert.match(renderer,/escapeHTML\(profile\.email/);
  const loaderStart=app.indexOf("async function loadPortalDirectory()",start);
  const loaderEnd=app.indexOf("directorySearch.addEventListener",loaderStart);
  const loader=app.slice(loaderStart,loaderEnd);
  assert.match(loader,/escapeHTML\(route\.route_name\)/);
  assert.match(loader,/escapeHTML\(student\.full_name\)/);
});

check("Portal account directory does not imply email delivery or invitation acceptance", () => {
  const start=app.indexOf("async function renderAccounts()");
  const end=app.indexOf("\nfunction disciplineToday()",start);
  const flow=app.slice(start,end);
  assert.ok(start>=0&&end>start,"Portal Accounts view missing");
  assert.match(flow,/Profile status does not confirm invitation delivery or password setup/);
  const loaderStart=flow.indexOf("async function loadPortalDirectory()");
  const loaderEnd=flow.indexOf("directorySearch.addEventListener",loaderStart);
  const loader=flow.slice(loaderStart,loaderEnd);
  assert.doesNotMatch(loader,/inviteUserByEmail|email_confirmed_at|last_sign_in_at/);
});

check("Portal account directory errors are visible and refresh controls recover", () => {
  const start=app.indexOf("async function loadPortalDirectory()");
  const end=app.indexOf("const roleSelect=document.getElementById(\"portalRole\")",start);
  const flow=app.slice(start,end);
  assert.match(flow,/catch\(error\)/);
  assert.match(flow,/Account list unavailable/);
  assert.match(flow,/directoryRefresh\.disabled=false/);
  assert.match(flow,/directoryRefresh\.addEventListener\("click",loadPortalDirectory\)/);
});

check("Portal directory management actions navigate to the role's existing admin section", () => {
  assert.match(app,/profile\.role==="parent"\?"parents":profile\.role==="student"\?"students":"driverroutes"/);
  assert.ok(app.includes("data-page=\"'+target+'\">"),"directory row should navigate to the selected admin section");
});

check("Portal account directory responsive filters stack on small screens", () => {
  assert.match(styles,/\.accounts-directory-filters\{display:grid;grid-template-columns:minmax\(220px,1\.5fr\)/);
  const mobileStart=styles.indexOf("@media(max-width:560px){.accounts-directory-panel");
  assert.ok(mobileStart>=0,"directory mobile media rule missing");
  const mobileStyles=styles.slice(mobileStart,Math.min(styles.length,mobileStart+500));
  assert.match(mobileStyles,/\.accounts-directory-filters\{grid-template-columns:1fr\}/);
});

check("Portal Accounts always restores its submit button after invitation errors", () => {
  const start = app.indexOf('portalAccountForm.addEventListener("submit"');
  const end = app.indexOf("\n}", start);
  const handler = app.slice(start, end);
  assert.ok(start >= 0 && end > start, "portal account form handler missing");
  assert.match(handler, /try\s*\{/);
  assert.match(handler, /catch\(error\)/);
  assert.match(handler, /finally\s*\{[\s\S]*btn\.disabled=false;[\s\S]*btn\.textContent="Create \/ link account"/);
  assert.match(handler, /Could not contact the invitation service/);
});


check("Portal Accounts exposes a manual non-mutating preflight control", () => {
  assert.match(app, /id="checkPortalReadiness" type="button">Check readiness/);
  assert.match(app, /id="portalPreflightResult" role="status" aria-live="polite"/);
  assert.match(app, /No account was created and no invitation email was sent by this preview/);
});

check("Portal account preflight is protected by the active administrator check", () => {
  const adminGate=accountFunction.indexOf('caller.role !== "admin"');
  const preflight=accountFunction.indexOf('if (input.action === "preflight")');
  assert.ok(adminGate>=0&&preflight>adminGate,"preflight must run after the administrator authorization gate");
  assert.match(accountFunction, /if \(input\.action === "preflight"\)[\s\S]*validatePortalAccountReadiness/);
});

check("Portal preview and final submission share the same read-only validator before invitation", () => {
  assert.match(accountFunction, /validatePortalAccountReadiness = \(\) => validatePortalAccountPreflight/);
  assert.match(accountFunction, /if \(input\.action === "preflight"\)[\s\S]*validatePortalAccountReadiness/);
  assert.match(accountFunction, /const readiness = await validatePortalAccountReadiness\(\)/);
  assert.match(accountFunction, /inviteUserByEmail\(email/);
  assert.match(accountPreflight, /export async function validatePortalAccountPreflight/);
  assert.match(accountPreflight, /return \{ ready: blockers\.length === 0, checks, blockers, resumeAuthUserId \}/);
});

check("Invitation recovery is limited to Auth users with a prior invitation timestamp", () => {
  assert.match(accountPreflight, /matchingAuthUser\?\.invited_at/);
  assert.match(accountPreflight, /resumeAuthUserId = matchingAuthUser\.id/);
  assert.match(accountPreflight, /not created through an invitation/);
});

check("Recovered invitations reuse the existing Auth user and skip inviteUserByEmail", () => {
  const recovery=accountFunction.indexOf("const recoveredInvitation = !!readiness.resumeAuthUserId");
  const invite=accountFunction.indexOf("inviteUserByEmail(email");
  const upsert=accountFunction.indexOf('from("profiles").upsert',recovery);
  assert.ok(recovery>=0&&invite>recovery&&upsert>invite);
  assert.match(accountFunction, /if \(!userId\) \{[\s\S]*inviteUserByEmail\(email/);
  assert.match(accountFunction, /recovered_invitation: recoveredInvitation/);
});

check("Portal Accounts reports recovered invitations without claiming another email was sent", () => {
  assert.match(app, /data\.recovered_invitation/);
  assert.match(app, /no second email was sent/);
});

check("Student portal preflight catches an existing student or user link", () => {
  assert.match(accountPreflight, /from\("student_accounts"\)\.select\("student_id,user_id"\)\.eq\("student_id", studentId\)/);
  assert.match(accountPreflight, /eq\("user_id", existingUserId\)/);
  assert.match(accountPreflight, /Student portal link/);
});

check("Driver preflight blocks students assigned to another active route before invitation", () => {
  assert.match(accountPreflight, /from\("driver_route_students"\)\.select\("student_id,route_id"\)/);
  assert.match(accountPreflight, /from\("driver_routes"\)[\s\S]{0,180}\.eq\("is_active", true\)/);
  assert.match(accountPreflight, /already have an active assignment with another driver/);
});

check("Portal Account form automatically repeats preflight before account creation", () => {
  const start=app.indexOf("portalAccountForm.addEventListener(\"submit\",async e=>{");
  const end=app.indexOf("\n  });",start);
  const handler=app.slice(start,end);
  assert.ok(start>=0&&end>start,"portal account submit handler missing");
  assert.match(handler, /await runPortalPreflight\(payload\)/);
  assert.ok(handler.indexOf("await runPortalPreflight(payload)")<handler.indexOf('functions.invoke("create-portal-account",{body:payload})'));
  assert.match(handler, /finally\{[\s\S]*btn\.disabled=false/);
});

check("Portal preflight displays returned details as escaped text and clears stale previews on edits", () => {
  assert.match(app, /escapeHTML\(check\.label/);
  assert.match(app, /escapeHTML\(check\.detail/);
  assert.match(app, /portalAccountForm\.addEventListener\("input",\(\)=>\{preflightResult\.hidden=true;\}\)/);
  assert.match(app, /portalAccountForm\.addEventListener\("change",\(\)=>\{preflightResult\.hidden=true;\}\)/);
});

check("Portal preflight controls remain usable on narrow screens", () => {
  assert.match(styles, /\.accounts-preflight-actions\{display:flex/);
  assert.match(styles, /@media\(max-width:560px\)\{\.accounts-preflight-actions\{align-items:stretch;flex-direction:column\}/);
});

check("Driver multi-select instructions cover Windows and Mac keyboards", () => {
  assert.match(app, /Ctrl on Windows or Command on Mac/);
});

check("recording consent checkbox starts unchecked", () => {
  assert.match(app, /<input id="incidentAudioConsent" type="checkbox">/);
});

check("microphone access is blocked until consent is checked", () => {
  const guard = app.indexOf("if(!audioConsent.checked){");
  const microphone = app.indexOf("navigator.mediaDevices.getUserMedia", guard);
  assert.ok(guard >= 0 && microphone > guard, "consent guard must precede microphone access");
});

check("incident save requires consent to be reconfirmed before upload", () => {
  const formGuard = app.indexOf("if(recordedAudioBlob&&!audioConsent.checked){");
  const uploadCall = app.indexOf('db.functions.invoke("incident-audio",{body:formData})');
  assert.ok(formGuard >= 0 && uploadCall > formGuard, "save-time consent guard must precede upload");
});

check("browser recording automatically stops after 60 seconds", () => {
  assert.match(app, /setTimeout\(\(\)=>\{if\(activeRecorder\?\.state==="recording"\)activeRecorder\.stop\(\);\},60000\)/);
});

check("microphone tracks are stopped when recording ends", () => {
  assert.match(app, /activeStream\?\.getTracks\(\)\.forEach\(track=>track\.stop\(\)\)/);
});

check("browser rejects audio clips larger than 8 MB", () => {
  assert.match(app, /blob\.size>8\*1024\*1024/);
});


check("temporary audio cannot be attached after verification or parent publication", () => {
  assert.match(audioFunction, /incident\.transcript_verified === true \|\| incident\.published_to_parent_at/);
});

check("a second temporary audio upload for the same incident is rejected", () => {
  assert.match(audioFunction, /\.eq\("evidence_type", "audio_temp"\)\.maybeSingle\(\)/);
  assert.match(audioFunction, /This incident already has temporary audio evidence/);
});

check("failed evidence metadata insertion removes the just-uploaded audio object", () => {
  assert.match(
    audioFunction,
    /if \(evidenceError\) \{\s*await adminClient\.storage\.from\(bucket\)\.remove\(\[storagePath\]\);\s*throw evidenceError;\s*\}/
  );
});

check("audio verification requires a non-empty reviewed transcript when audio exists", () => {
  assert.match(audioFunction, /if \(hasStoredAudio && !transcript\)/);
});

check("audio verification fails closed when storage deletion state cannot be checked", () => {
  const verifyStart = audioFunction.indexOf('if (action === "verify")');
  const listCall = audioFunction.indexOf('.from(bucket).list(folder', verifyStart);
  const listError = audioFunction.indexOf("if (listError)", listCall);
  const verifyRpc = audioFunction.indexOf('adminClient.rpc("admin_verify_incident_transcript"', verifyStart);
  assert.ok(verifyStart >= 0 && listCall > verifyStart);
  assert.ok(listError > listCall && verifyRpc > listError);
  assert.match(audioFunction.slice(listError, verifyRpc), /return respond\([\s\S]*?, 502\)/);
});

check("audio verification fails closed when object removal fails", () => {
  const removeCall = audioFunction.indexOf('.remove([storedPath])');
  const removeError = audioFunction.indexOf("if (removeError)", removeCall);
  const verifyRpc = audioFunction.indexOf('adminClient.rpc("admin_verify_incident_transcript"');
  assert.ok(removeCall >= 0 && removeError > removeCall && verifyRpc > removeError);
  assert.match(audioFunction.slice(removeError, verifyRpc), /return respond\([\s\S]*?, 502\)/);
});

check("temporary audio is deleted before the privileged transcript-verification RPC", () => {
  const removeCall = audioFunction.indexOf('.remove([storedPath])');
  const verifyRpc = audioFunction.indexOf('adminClient.rpc("admin_verify_incident_transcript"');
  assert.ok(removeCall >= 0 && verifyRpc > removeCall);
  assert.match(audioFunction, /p_audio_deleted:\s*hasStoredAudio/);
  assert.doesNotMatch(audioFunction, /userClient\.rpc\("admin_verify_incident_transcript"/);
});

check("listening is blocked after the evidence deletion marker is set", () => {
  assert.match(audioFunction, /if \(!evidence\?\.storage_path \|\| evidence\.audio_deleted_at\)/);
});

check("an existing active portal account is linked without sending another invitation", () => {
  const existingBranch = accountFunction.indexOf("if (matchingProfiles?.length === 1)");
  const existingSuccess = accountFunction.indexOf("existing_account: true", existingBranch);
  const invite = accountFunction.indexOf("inviteUserByEmail(email");
  assert.ok(existingBranch >= 0 && existingSuccess > existingBranch && invite > existingSuccess);
  assert.doesNotMatch(accountFunction.slice(existingBranch, invite), /inviteUserByEmail/);
});


check("anonymous table privileges are revoked from existing public application tables", () => {
  assert.match(anonAccessMigration, /REVOKE ALL PRIVILEGES ON ALL TABLES IN SCHEMA public FROM anon/i);
});

check("anonymous sequence and function privileges are revoked", () => {
  assert.match(anonAccessMigration, /REVOKE ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public FROM anon/i);
  assert.match(anonAccessMigration, /REVOKE EXECUTE ON ALL FUNCTIONS IN SCHEMA public FROM anon/i);
});

check("future public objects created by postgres do not grant anonymous privileges", () => {
  assert.match(anonAccessMigration, /ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public[\s\S]*REVOKE ALL PRIVILEGES ON TABLES FROM anon/i);
  assert.match(anonAccessMigration, /ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public[\s\S]*REVOKE ALL PRIVILEGES ON SEQUENCES FROM anon/i);
  assert.match(anonAccessMigration, /ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public[\s\S]*REVOKE EXECUTE ON FUNCTIONS FROM anon/i);
});

check("anonymous access hardening leaves authenticated permissions untouched", () => {
  assert.doesNotMatch(anonAccessMigration, /REVOKE[\s\S]{0,180}FROM authenticated/i);
});

check("repeatable database audit checks anonymous table and function access", () => {
  assert.match(securityAudit, /tables_with_anonymous_access/);
  assert.match(securityAudit, /anon_executable_functions/);
  assert.match(securityAudit, /anon_table_defaults/);
  assert.match(securityAudit, /authenticated_select_tables/);
});

check("repeatable database audit checks the private temporary incident audio bucket", () => {
  assert.match(securityAudit, /discipline-temp-audio/);
  assert.match(securityAudit, /file_size_limit/);
  assert.match(securityAudit, /allowed_mime_types/);
  assert.match(securityAudit, /tablename = 'objects'/);
  assert.match(securityAudit, /schemaname = 'storage'/);
  assert.match(securityAudit, /matching_storage_policy_count/);
});


check("RLS role smoke test exercises parent and admin in rollback-only transactions", () => {
  assert.match(roleSmoke, /where role = 'parent' and is_active = true/);
  assert.match(roleSmoke, /where role = 'admin' and is_active = true/);
  assert.equal((roleSmoke.match(/set local role authenticated;/g) || []).length, 4);
  assert.equal((roleSmoke.match(/rollback;/g) || []).length, 3);
});

check("RLS smoke test inspects profile, student, mark, incident and evidence boundaries", () => {
  for (const field of ["visible_profiles", "visible_students", "visible_mark_transactions", "visible_parent_links", "visible_incidents", "visible_incident_evidence"]) {
    assert.ok(roleSmoke.includes(field), "missing RLS smoke result: " + field);
  }
  assert.ok(roleSmoke.includes("not a") && roleSmoke.includes("substitute for signing into the website"));
});
check("RLS role smoke test covers linked-parent route, run and check-in visibility", () => {
  for (const table of ["driver_routes", "driver_route_students", "driver_route_runs", "driver_journey_checkins"]) {
    assert.ok(roleSmoke.includes("insert into public." + table), "missing temporary parent journey fixture: " + table);
  }
  for (const field of ["visible_linked_route", "visible_linked_assignment", "visible_linked_route_run", "visible_linked_driver_checkin",
    "visible_unlinked_route", "visible_unlinked_assignment", "visible_unlinked_route_run", "visible_unlinked_driver_checkin"]) {
    assert.ok(roleSmoke.includes(field), "missing parent journey RLS result: " + field);
  }
  assert.match(roleSmoke, /delete from public\.parent_student_links/);
  assert.match(roleSmoke, /parent_unlinked_journey_rls_result/);
  assert.match(roleSmoke, /set_config\('test\.parent_route_id'/);
  assert.match(roleSmoke, /parent_student as materialized/);
  assert.match(roleSmoke, /p\.role = 'parent'/);
  assert.match(roleSmoke, /p\.is_active = true/);
  assert.match(roleSmoke, /cross join parent_student/);
  assert.equal((roleSmoke.match(/rollback;/g) || []).length, 3);
});


check("administrator inbox panel is present and labelled for assistive technology", () => {
  assert.match(html, /id="notificationCenter"/);
  assert.match(html, /id="adminNotificationPanel"[^>]*aria-label="Administrator inbox"/);
  assert.match(html, /aria-controls="adminNotificationPanel"/);
});

check("administrator inbox opens and closes accessibly from the notification button", () => {
  assert.match(app, /function toggleAdminNotificationPanel\(\)/);
  assert.match(app, /button\.setAttribute\("aria-expanded","true"\)/);
  assert.match(app, /function closeAdminNotificationPanel\(\)/);
  assert.match(app, /button\.setAttribute\("aria-expanded","false"\)/);
});

check("administrator inbox loads unreviewed parent responses only", () => {
  assert.match(app, /from\("parent_responses"\)[\s\S]{0,350}\.is\("reviewed_at",null\)/);
});

check("administrator inbox surfaces incidents awaiting transcript verification", () => {
  assert.match(app, /from\("incidents"\)[\s\S]{0,300}\.eq\("transcript_verified",false\)/);
});
check("administrator Command Center shows live parent and incident follow-up queues", () => {
  const start = app.indexOf("async function refreshDashboardAttentionQueue()");
  const end = app.indexOf("async function renderDashboard()", start);
  const queue = app.slice(start, end);
  const dashboardStart = end;
  const dashboardEnd = app.indexOf("\nfunction escapeHTML", dashboardStart);
  const dashboard = app.slice(dashboardStart, dashboardEnd);
  assert.ok(start >= 0 && end > start, "dashboard review queue loader missing");
  assert.match(queue, /from\("parent_responses"\)[\s\S]{0,250}\.is\("reviewed_at",null\)/);
  assert.match(queue, /from\("incidents"\)[\s\S]{0,250}\.eq\("transcript_verified",false\)/);
  assert.match(queue, /eq\("transcript_verified",true\)\.is\("published_to_parent_at",null\)/);
  assert.match(dashboard, /id="dashAttention"/);
  assert.match(queue, /target:"parents"/);
  assert.match(queue, /target:"incidents"/);
  assert.match(queue, /select\("id",\{count:"exact",head:true\}\)/);
  assert.doesNotMatch(queue, /exact_words|factual_description|transcript_text|storage_path|audio evidence|parent message/i);
});
check("Command Center review queue refreshes manually and polls only while open", () => {
  assert.match(app, /id="dashAttentionRefresh"/);
  assert.match(app, /await refreshDashboardAttentionQueue\(\)/);
  assert.match(app, /window\.setInterval\([\s\S]{0,160}60000\)/);
  assert.match(app, /clearInterval\(dashboardAttentionTimer\)/);
  assert.match(app, /finally\{attentionRefresh\.disabled=false;attentionRefresh\.textContent="↻";\}/);
  assert.match(app, /aria-live="polite"/);
});

check("Command Center review queue is responsive and keyboard accessible", () => {
  assert.match(styles, /\.dash-attention-grid\{display:grid;grid-template-columns:repeat\(3,minmax\(0,1fr\)\)/);
  assert.match(styles, /\.dash-attention-refresh:focus-visible/);
  assert.match(styles, /\.dash-attention-card:focus-visible/);
  assert.match(styles, /@media\(max-width:1000px\)\{\.dash-attention-grid\{grid-template-columns:1fr\}\}/);
});

check("administrator inbox updates parent and incident navigation counts", () => {
  assert.match(html, /id="parentResponseNavCount"/);
  assert.match(html, /id="incidentReviewNavCount"/);
  assert.match(app, /function updateAdminNavBadges\(parentCount, incidentCount\)/);
});

check("parent and student portals do not display the administrator inbox", () => {
  assert.match(auth, /notificationCenter\.hidden = role !== "admin"/);
});

check("administrator inbox safely escapes parent messages and student names", () => {
  assert.match(app, /escapeHTML\(message\)/);
  assert.match(app, /escapeHTML\(parent\)/);
  assert.match(app, /escapeHTML\(student\)/);
  assert.match(app, /escapeHTML\(row\.severity/);
});


check("weekly results provides print and CSV export controls", () => {
  assert.match(app, /id="weeklyPrintButton"/);
  assert.match(app, /id="weeklyExportButton"/);
  assert.match(app, /function exportWeeklyResults\(\)/);
  assert.match(app, /function printWeeklyResults\(\)/);
});

check("weekly CSV and print exports respect the current search and publication filters", () => {
  assert.match(app, /function filteredWeeklyResults\(\)/);
  assert.match(app, /const rows=filteredWeeklyResults\(\)/);
});

check("weekly CSV export prevents spreadsheet formula execution in text fields", () => {
  assert.match(app, /const safe=isText&&\/\^\[=\+\\-@\]\/\.test\(raw\)/);
  assert.match(app, /text\/csv;charset=utf-8/);
});

check("weekly CSV export names the file for its selected Monday", () => {
  assert.match(app, /discipline-weekly-results-"\+input\.value\+"\.csv/);
});

check("weekly print report escapes student data before writing a print document", () => {
  assert.match(app, /escapeHTML\(x\.students\?\.full_name\|\|"Student"\)/);
  assert.match(app, /escapeHTML\(x\.students\?\.student_code\|\|""\)/);
  assert.match(app, /popup\.document\.write\(printHtml\)/);
});

check("weekly print report includes date range, score totals and a responsive print layout", () => {
  assert.match(app, /Official Monday–Sunday scoring summary/);
  assert.match(app, /total\("total_awards"\)/);
  assert.match(app, /@media print/);
});


check("weekly results page exposes print and CSV actions", () => {
  assert.match(app, /id="weeklyPrintButton"/);
  assert.match(app, /id="weeklyExportButton"/);
});

check("weekly report export and print share the current student/status filter", () => {
  assert.match(app, /function filteredWeeklyResults\(\)/);
  assert.equal((app.match(/filteredWeeklyResults\(\)/g) || []).length >= 3, true);
});

check("weekly CSV export escapes text cells and protects formula-like values", () => {
  assert.match(app, /const csvCell=\(value,isText=false\)=>/);
  assert.match(app, /isText&&\/\^\[=\+\\-@\]\/\.test\(raw\)/);
  assert.match(app, /text\/csv;charset=utf-8/);
});

check("weekly CSV export uses a date-specific filename and UTF-8 BOM", () => {
  assert.match(app, /discipline-weekly-results-\"\+input\.value\+\"\.csv/);
  assert.match(app, /new Blob\(\[\"\\uFEFF\"\+csvRows\.join\(\"\\r\\n\"\)\]/);
});

check("weekly print report writes an escaped student table to a separate window", () => {
  assert.match(app, /const popup=window\.open\(\"\",\"_blank\"\)/);
  assert.match(app, /popup\.document\.write\(printHtml\)/);
  assert.match(app, /escapeHTML\(x\.students\?\.full_name\|\|\"Student\"\)/);
  assert.match(app, /escapeHTML\(x\.students\?\.student_code\|\|\"\"\)/);
});

check("weekly print report includes scoring period, totals and print-specific layout", () => {
  assert.match(app, /Official Monday–Sunday scoring summary/);
  assert.match(app, /total\(\"total_awards\"\)/);
  assert.match(app, /total\(\"total_deductions\"\)/);
  assert.match(app, /@media print/);
});


check("attendance page provides print and CSV export controls", () => {
  assert.match(app, /id="attendancePrintRegister"/);
  assert.match(app, /id="attendanceExportCsv"/);
});

check("attendance export uses the same student search filter as the visible register", () => {
  assert.match(app, /function filteredAttendanceStudents\(\)/);
  assert.match(app, /const visible=filteredAttendanceStudents\(\)/);
  assert.match(app, /rows\.innerHTML=filteredAttendanceStudents\(\)\.map/);
});

check("attendance CSV includes saved status and notes and guards formula-like values", () => {
  assert.match(app, /const safe=\/\^\[\\s\]\*\[=\+\\-@\]\/\.test\(raw\)/);
  assert.match(app, /entry\.status\|\|"Not marked"/);
  assert.match(app, /entry\.notes\|\|""/);
  assert.match(app, /discipline-attendance-\"\+date\.value\+\"\.csv/);
});

check("attendance CSV is UTF-8 and opens as a spreadsheet", () => {
  assert.match(app, /new Blob\(\[\"\\uFEFF\"\+csvRows\.join\(\"\\r\\n\"\)\]/);
  assert.match(app, /text\/csv;charset=utf-8/);
});

check("attendance print sheet includes marked, present, absent, late and unmarked totals", () => {
  for (const value of ["count(\"present\")", "count(\"absent\")", "count(\"late\")", "count(\"excused\")", "count(\"not_marked\")"]) {
    assert.ok(app.includes(value), "missing attendance total: " + value);
  }
});

check("attendance print sheet escapes student and note content before opening print view", () => {
  assert.match(app, /escapeHTML\(student\.full_name\)/);
  assert.match(app, /escapeHTML\(student\.student_code\)/);
  assert.match(app, /escapeHTML\(entry\.notes\|\|""\)/);
  assert.match(app, /popup\.document\.write\(html\)/);
});


check("driver check-in screen exposes search, status filter, print and CSV controls", () => {
  for (const id of ["driverCheckinSearch","driverCheckinStatusFilter","driverCheckinPrint","driverCheckinExport"]) {
    assert.ok(app.includes('id="' + id + '"'), "missing driver report control: " + id);
  }
});

check("driver check-in search matches student, class, route, vehicle, status and note", () => {
  assert.match(app, /function filteredDriverCheckins\(\)/);
  for (const field of ["s.full_name","s.student_code","s.class_group","r.route_name","r.vehicle_label","x.status","x.note"]) {
    assert.ok(app.includes(field), "driver filter missing field: " + field);
  }
});

check("driver check-in filter dropdown limits rows to the selected status", () => {
  assert.match(app, /\(!status\|\|x\.status===status\)/);
  assert.match(app, /rows\.innerHTML=visible\.map/);
});

check("driver CSV export includes route, vehicle, driver, status, note and journey details", () => {
  for (const field of ["Date","Journey","Student name","Route","Vehicle","Driver","Status","Note","Updated at"]) {
    assert.ok(app.includes('"' + field + '"'), "driver CSV missing column: " + field);
  }
  assert.match(app, /discipline-driver-checkins-/);
});

check("driver CSV export quotes text, guards formula-like values and uses UTF-8", () => {
  assert.match(app, /function driverCsvCell\(value\)/);
  assert.match(app, /\^\[\\s\]\*\[=\+\\-@\]/);
  assert.match(app, /text\/csv;charset=utf-8/);
  assert.match(app, /new Blob\(\[\"\\uFEFF\"\+csv\.join\(\"\\r\\n\"\)\]/);
});

check("driver print report includes status totals and safely escapes all dynamic record details", () => {
  for (const value of ['count("boarded")','count("dropped_off")','count("late")','count("absent")','count("not_on_vehicle")']) {
    assert.ok(app.includes(value), "driver report missing status count: " + value);
  }
  for (const value of ["s.full_name||\"Student\"","s.student_code||\"\"","r.route_name||\"—\"","r.vehicle_label||\"—\"","x.note||\"—\""]) {
    assert.ok(app.includes("escapeHTML("+value+")"), "driver print missing escaped field: " + value);
  }
  assert.match(app, /popup\.document\.write\(html\)/);
});


check("mark ledger exposes search, type filter, print and CSV controls", () => {
  for (const id of ["markHistorySearch","markHistoryType","markHistoryPrint","markHistoryExport"]) {
    assert.ok(app.includes('id="' + id + '"'), "missing mark ledger control: " + id);
  }
});

check("mark ledger history search covers student, student ID, reason and transaction type", () => {
  assert.match(app, /function filteredMarkTransactions\(\)/);
  for (const field of ["t.students?.full_name","t.students?.student_code","t.reason","t.transaction_type"]) {
    assert.ok(app.includes(field), "mark ledger search missing: " + field);
  }
});

check("mark ledger type filter is applied to the displayed and exported records", () => {
  assert.match(app, /!type\|\|t\.transaction_type===type/);
  assert.match(app, /const visible=filteredMarkTransactions\(\)/);
});

check("mark ledger CSV contains reason, amount and before/after balances", () => {
  for (const field of ["Date and time","Student ID","Transaction type","Reason","Amount","Balance change","Balance before","Balance after"]) {
    assert.ok(app.includes('"' + field + '"'), "mark CSV missing column: " + field);
  }
  assert.match(app, /discipline-mark-ledger-/);
});

check("mark ledger CSV quotes and guards formula-like text values and uses UTF-8", () => {
  assert.match(app, /function markCsvCell\(value\)/);
  assert.match(app, /\^\[\\s\]\*\[=\+\\-@\]/);
  assert.match(app, /text\/csv;charset=utf-8/);
  assert.match(app, /new Blob\(\[\"\\uFEFF\"\+csv\.join\(\"\\r\\n\"\)\]/);
});

check("mark print report includes positive, negative and net summaries and escapes record content", () => {
  assert.match(app, /function printMarkHistory\(\)/);
  assert.match(app, /Positive changes/);
  assert.match(app, /Negative changes/);
  assert.match(app, /Net change/);
  for (const value of ["t.students?.full_name||\"Student\"","t.students?.student_code||\"\"","t.reason||\"—\""]) {
    assert.ok(app.includes("escapeHTML(" + value + ")"), "mark print missing escaped data: " + value);
  }
  assert.match(app, /popup\.document\.write\(html\)/);
});

check("mark transaction table includes both balance-before and balance-after columns", () => {
  assert.match(app, /<th>BALANCE BEFORE<\/th><th>BALANCE AFTER<\/th>/);
  assert.match(app, /Number\(t\.balance_before\)/);
  assert.match(app, /Number\(t\.balance_after\)/);
});


check("student registry offers a View profile action and a hidden detail panel", () => {
  assert.match(app, /data-view-student=/);
  assert.match(app, /id="studentProfilePanel" hidden/);
  assert.match(app, /function viewStudentProfile\(student\)/);
});

check("student profile loads marks, attendance, incidents, weekly results and certificates for the selected student", () => {
  for (const table of ["mark_transactions","attendance","incidents","weekly_results","certificates","student_accounts","parent_student_links"]) {
    assert.ok(app.includes('db.from("' + table + '")'), "student profile missing source: " + table);
  }
  assert.match(app, /\.eq\("student_id",student\.id\)/);
});

check("student profile lifetime balance adds starting marks to the full saved mark ledger", () => {
  assert.match(app, /student\.starting_marks\|\|0\)\+\(allMarks\.data\|\|\[\]\)\.reduce/);
});

check("student profile summarizes recent attendance and portal links", () => {
  assert.match(app, /db\.from\("attendance"\)/);
  assert.match(app, /\.order\("recorded_at",\{ascending:false\}\)\.limit\(20\)/);
  assert.match(app, /studentAccount\.data\?"Student linked":"No student login"/);
  assert.match(app, /parentLinks\.data\|\|\[\]/);
});

check("student profile shows incident review and publication state without loading exact words", () => {
  assert.match(app, /transcript_verified,published_to_parent_at/);
  assert.match(app, /Exact words and temporary evidence are not included/);
  const profileStart=app.indexOf("async function viewStudentProfile");
  const profileEnd=app.indexOf("function resetForm",profileStart);
  assert.ok(profileStart>=0 && profileEnd>profileStart, "student profile function boundaries missing");
  assert.doesNotMatch(app.slice(profileStart,profileEnd), /exact_words/);
});

check("student profile displays recent weekly results and certificates", () => {
  assert.match(app, /weekly\.data\|\|\[\]/);
  assert.match(app, /certificates\.data\|\|\[\]/);
  assert.match(app, /Weekly results · latest 8/);
  assert.match(app, /Certificates · latest 8/);
});

check("student profile print report escapes student and guardian data", () => {
  assert.match(app, /escapeHTML\(student\.full_name\)/);
  assert.match(app, /escapeHTML\(guardian\.phone\|\|\"—\"\)/);
  assert.match(app, /escapeHTML\(guardian\.email\|\|\"—\"\)/);
  assert.match(app, /popup\.document\.write\([\s\S]*report\.innerHTML/);
});


check("certificate register offers a print action for every saved record", () => {
  assert.match(app, /data-print-certificate=/);
  assert.match(app, /function printCertificate\(record\)/);
  assert.match(app, /records\.find\(x=>x\.id===print\.dataset\.printCertificate\)/);
});

check("certificate print output is designed for A4 landscape", () => {
  assert.match(app, /@page\{size:A4 landscape;margin:0\}/);
  assert.match(app, /class=\\"certificate\\"/);
  assert.match(app, /Certificate of Achievement/);
});

check("certificate print output uses the saved institute, student and certificate details", () => {
  for (const value of ["Usmania Institute Of Excellence","record.title","student.full_name","record.description","record.issued_at"]) {
    assert.ok(app.includes(value), "certificate print missing: " + value);
  }
});

check("certificate print output escapes dynamic text and opens the browser print view", () => {
  assert.match(app, /escapeHTML\(record\.title\)/);
  assert.match(app, /escapeHTML\(student\.full_name\|\|\"Student\"\)/);
  assert.match(app, /escapeHTML\(record\.description\|\|/);
  assert.match(app, /popup\.document\.write\(html\)/);
  assert.match(app, /popup\.print\(\)/);
});


check("Incident Center offers pending/verified review-state filtering and report controls", () => {
  assert.match(app, /id="incidentReviewFilter"/);
  assert.match(app, /id="incidentPrintReport"/);
  assert.match(app, /id="incidentExportCsv"/);
  assert.match(app, /id="incidentAwaitingReview"/);
});

check("incident review filter combines parent visibility, verification state and search", () => {
  const start=app.indexOf("function filteredIncidentRecords()");
  const end=app.indexOf("function drawIncidentRows()",start);
  assert.ok(start>=0 && end>start);
  const filter=app.slice(start,end);
  assert.match(filter, /reviewState==="verified"\?verified:!verified/);
  assert.match(filter, /visibility==="published"\?published:!published/);
  assert.match(filter, /x\.factual_description/);
  assert.match(filter, /x\.students\?\.full_name/);
});

check("incident awaiting-review counter is based on unverified records", () => {
  assert.match(app, /incidentAwaitingReview[^\n]*incidentRecords\.filter\(x=>!x\.transcript_verified\)/);
});

check("incident CSV export uses the same filtered rows and includes review/publication status", () => {
  const start=app.indexOf("function exportIncidentReport()");
  const end=app.indexOf("function printIncidentReport()",start);
  assert.ok(start>=0 && end>start);
  const csv=app.slice(start,end);
  assert.match(csv, /filteredIncidentRecords\(\)/);
  for (const field of ["Factual description","Administrator review","Parent visibility","Mark deduction recorded","Action taken"]) {
    assert.ok(csv.includes('"' + field + '"'), "incident CSV missing column: " + field);
  }
});

check("incident CSV export excludes exact words and transcript evidence", () => {
  const start=app.indexOf("function exportIncidentReport()");
  const end=app.indexOf("function printIncidentReport()",start);
  const csv=app.slice(start,end);
  assert.doesNotMatch(csv, /exact_words|transcript_text|audio_temp|storage_path/);
  assert.match(csv, /text\/csv;charset=utf-8/);
  const cellGuardStart=app.indexOf("function incidentCsvCell");
  const cellGuardEnd=app.indexOf("function exportIncidentReport()",cellGuardStart);
  assert.ok(cellGuardStart>=0 && cellGuardEnd>cellGuardStart);
  assert.match(app.slice(cellGuardStart,cellGuardEnd), /\.test\(raw\)/);
});

check("incident print report explicitly excludes exact words, transcript and temporary audio", () => {
  const start=app.indexOf("function printIncidentReport()");
  const end=app.indexOf('document.getElementById("incidentExportCsv")',start);
  assert.ok(start>=0 && end>start);
  const report=app.slice(start,end);
  assert.match(report, /excludes exact recorded words, transcript text and temporary audio evidence/);
  assert.doesNotMatch(report, /x\.exact_words|transcript_text|audio_temp|storage_path/);
  assert.match(report, /popup\.document\.write\(html\)/);
});

check("incident print report escapes student and factual descriptions", () => {
  const start=app.indexOf("function printIncidentReport()");
  const end=app.indexOf('document.getElementById("incidentExportCsv")',start);
  const report=app.slice(start,end);
  assert.match(report, /escapeHTML\(x\.students\?\.full_name\|\|\"Student\"\)/);
  assert.match(report, /escapeHTML\(x\.factual_description\|\|\"—\"\)/);
});

check("incident review-state change redraws the register without changing saved records", () => {
  assert.match(app, /incidentReviewFilter\"\)\.addEventListener\(\"change\",drawIncidentRows\)/);
});


check("weekly result publication snapshots only results that have not been published before", () => {
  assert.match(weeklyPublishMigration, /wr\.published_at is not null/);
  assert.match(weeklyPublishMigration, /wr\.student_id is null/);
  assert.match(weeklyPublishMigration, /v_newly_published uuid\[\]/);
});

check("weekly publication notifications target active linked parents and student accounts", () => {
  assert.match(weeklyPublishMigration, /public\.parent_student_links/);
  assert.match(weeklyPublishMigration, /p\.role = 'parent'::public\.app_role/);
  assert.match(weeklyPublishMigration, /p\.role = 'student'::public\.app_role/);
  assert.match(weeklyPublishMigration, /p\.is_active = true/);
});

check("weekly publication notifications are scoped to newly published students and include week dates", () => {
  assert.match(weeklyPublishMigration, /l\.student_id = any\(v_newly_published\)/);
  assert.match(weeklyPublishMigration, /sa\.student_id = any\(v_newly_published\)/);
  assert.match(weeklyPublishMigration, /p_week_start::text/);
  assert.match(weeklyPublishMigration, /v_week_end::text/);
  assert.match(weeklyPublishMigration, /get diagnostics v_notified = row_count/);
});

check("weekly publication success message shows the number of notifications sent", () => {
  assert.match(app, /Number\(r\.data\.notifications_sent\|\|0\)/);
  assert.match(app, /portal notification\(s\) to linked families and students/);
});


check("Parent Management provides print and CSV history controls", () => {
  assert.match(app, /id="parentResponsePrint"/);
  assert.match(app, /id="parentResponseExport"/);
  assert.match(app, /function exportParentResponses\(\)/);
  assert.match(app, /function printParentResponses\(\)/);
});

check("parent response export and print use the same pending/all/reviewed and search filters", () => {
  assert.match(app, /function filteredParentResponses\(\)/);
  const start=app.indexOf("function exportParentResponses()");
  const end=app.indexOf("function printParentResponses()",start);
  const csv=app.slice(start,end);
  assert.match(csv, /filteredParentResponses\(\)/);
  const printStart=app.indexOf("function printParentResponses()");
  const printEnd=app.indexOf('document.getElementById("parentResponseExport")',printStart);
  assert.match(app.slice(printStart,printEnd), /filteredParentResponses\(\)/);
});

check("parent response CSV includes parent, student, message and review state but omits private admin notes", () => {
  const start=app.indexOf("function exportParentResponses()");
  const end=app.indexOf("function printParentResponses()",start);
  const csv=app.slice(start,end);
  for (const field of ["Parent email","Student ID","Parent message","Review status","Reviewed at"]) {
    assert.ok(csv.includes('"' + field + '"'), "parent response CSV missing column: " + field);
  }
  assert.doesNotMatch(csv, /admin_note|Private administrator note/);
  assert.match(csv, /text\/csv;charset=utf-8/);
});

check("parent response print report excludes private administrator notes", () => {
  const start=app.indexOf("function printParentResponses()");
  const end=app.indexOf('document.getElementById("parentResponseExport")',start);
  const report=app.slice(start,end);
  assert.doesNotMatch(report, /admin_note|x\.admin_note/);
  assert.match(report, /Private administrator notes are intentionally omitted/);
  assert.match(report, /popup\.document\.write\(html\)/);
});

check("parent response print report escapes parent, student and message content", () => {
  const start=app.indexOf("function printParentResponses()");
  const end=app.indexOf('document.getElementById("parentResponseExport")',start);
  const report=app.slice(start,end);
  assert.match(report, /escapeHTML\(x\.profiles\?\.display_name\|\|\"Parent\"\)/);
  assert.match(report, /escapeHTML\(x\.students\?\.full_name\|\|\"Student\"\)/);
  assert.match(report, /escapeHTML\(x\.message\|\|\"—\"\)/);
});

check("parent response review changes refresh the administrator inbox badge", () => {
  const start=app.indexOf("async function renderParents()");
  const end=app.indexOf("async function renderLedger()",start);
  assert.match(app.slice(start,end), /await refreshAdminNotificationBadge\(\)/);
});


check("student portal queries notifications for the signed-in student account and current linked student", () => {
  assert.match(auth, /role === "student" \? client\.from\("notifications"\)/);
  assert.match(auth, /\.eq\("recipient_user_id", user\.id\)\.eq\("related_student_id", student\.id\)/);
});

check("student portal displays notification titles, messages, timestamps and unread counts", () => {
  assert.match(auth, /studentNotificationPanelHtml/);
  assert.match(auth, /studentNotifications\.map/);
  assert.match(auth, /studentUnreadNotifications/);
  assert.match(auth, /Updates for this student only/);
});

check("student portal mark-read actions are restricted to the signed-in recipient", () => {
  const start=auth.indexOf('if (role !== "parent")');
  const end=auth.indexOf('const [incidentResult, responseResult',start);
  const studentBranch=auth.slice(start,end);
  assert.match(studentBranch, /\.eq\("recipient_user_id", user\.id\)/);
  assert.match(studentBranch, /\.eq\("id", button\.dataset\.markNotificationRead\)/);
  assert.match(studentBranch, /\.eq\("related_student_id", studentId\)/);
});

check("student portal notification controls mark one or all notifications read", () => {
  const start=auth.indexOf('if (role !== "parent")');
  const end=auth.indexOf('const [incidentResult, responseResult',start);
  const studentBranch=auth.slice(start,end);
  assert.match(studentBranch, /data-mark-notification-read/);
  assert.match(studentBranch, /data-mark-all-notifications-read/);
  const panelStart = auth.indexOf("const studentNotificationPanelHtml");
  assert.notEqual(panelStart, -1);
  assert.match(auth.slice(panelStart, start), /Mark all read/);
});
check("parent journey realtime events are debounced before refreshing the portal", () => {
  assert.match(auth, /let parentJourneyRefreshTimer = null/);
  const start = auth.indexOf("const refreshParentJourney = () =>");
  const end = auth.indexOf("parentJourneyChannel = client.channel", start);
  const handler = auth.slice(start, end);
  assert.ok(start >= 0 && end > start, "parent realtime handler missing");
  assert.match(handler, /window\.clearTimeout\(parentJourneyRefreshTimer\)/);
  assert.match(handler, /window\.setTimeout\(/);
  assert.match(handler, /}, 350\)/);
  assert.match(handler, /renderReadOnlyPortal\("parent", profile, user\)/);
  assert.match(handler, /console\.error\("Parent journey refresh failed:"/);
});


async function runPortalPreflightUnitTests() {
  const { pathToFileURL } = require("node:url");
  const moduleUrl = pathToFileURL(path.join(root, "supabase/functions/create-portal-account/portal-account-preflight.mjs")).href;
  const { validatePortalAccountPreflight } = await import(moduleUrl);
  const STUDENT = "11111111-1111-4111-8111-111111111111";
  const OTHER_STUDENT = "22222222-2222-4222-8222-222222222222";
  const DRIVER_A = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
  const DRIVER_B = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
  const USER_PARENT = "cccccccc-cccc-4ccc-8ccc-cccccccccccc";
  const USER_STUDENT = "dddddddd-dddd-4ddd-8ddd-dddddddddddd";
  const TODAY = "2026-11-27";

  function makeClient(seed = {}) {
    const state = {
      profiles: seed.profiles || [],
      students: seed.students || [{ id: STUDENT, is_active: true }, { id: OTHER_STUDENT, is_active: true }],
      student_accounts: seed.student_accounts || [],
      driver_route_students: seed.assignments || [],
      driver_routes: seed.routes || [],
      authUsers: seed.authUsers || [],
      errors: seed.errors || {},
      calls: [],
      writes: 0
    };
    function match(row, filters) {
      return Object.entries(filters).every(([key, filter]) => {
        if (filter.kind === "eq") return row[key] === filter.value;
        if (filter.kind === "ilike") return String(row[key] || "").toLowerCase() === filter.value.toLowerCase().replace(/\\/g, "");
        if (filter.kind === "in") return filter.value.includes(row[key]);
        if (filter.kind === "lte") return String(row[key] || "") <= filter.value;
        if (filter.kind === "activeWindow") return row.valid_to == null || String(row.valid_to) >= filter.value;
        return true;
      });
    }
    class Query {
      constructor(table) { this.table=table; this.filters={}; this.limitValue=null; }
      select() { this.stateSelect=true; return this; }
      eq(key,value) { this.filters[key]={kind:"eq",value}; return this; }
      ilike(key,value) { this.filters[key]={kind:"ilike",value}; return this; }
      in(key,value) { this.filters[key]={kind:"in",value}; return this; }
      lte(key,value) { this.filters[key]={kind:"lte",value}; return this; }
      or(expression) {
        const date=expression.split("valid_to.gte.")[1];
        this.filters.valid_to={kind:"activeWindow",value:date};
        return this;
      }
      limit(value) { this.limitValue=value; return this; }
      result(single) {
        state.calls.push({table:this.table,filters:this.filters,single});
        const error=state.errors[this.table] || null;
        if(error)return {data:null,error:{message:error}};
        let rows=(state[this.table]||[]).filter(row=>match(row,this.filters));
        if(this.limitValue!=null)rows=rows.slice(0,this.limitValue);
        if(single){
          if(rows.length>1)return {data:null,error:{message:"Multiple rows"}};
          return {data:rows[0]||null,error:null};
        }
        return {data:rows,error:null};
      }
      maybeSingle() { return Promise.resolve(this.result(true)); }
      then(resolve,reject) { return Promise.resolve(this.result(false)).then(resolve,reject); }
    }
    const client={
      from(table) { return new Query(table); },
      auth:{admin:{
        async listUsers({page,perPage}) {
          state.calls.push({table:"auth.users",page});
          if(state.errors["auth.users"])return {data:null,error:{message:state.errors["auth.users"]}};
          return {data:{users:state.authUsers.slice((page-1)*perPage,page*perPage)},error:null};
        },
        async inviteUserByEmail() { state.writes++; throw new Error("preflight must never invite"); }
      }},
      async rpc() { state.writes++; throw new Error("preflight must never call RPC"); }
    };
    return {client,state};
  }
  function payload(overrides={}) {
    return {
      email:"new.person@example.com",displayName:"New Person",role:"parent",
      studentId:STUDENT,routeName:"North Route",vehicleLabel:"Van 1",
      rawDriverStudentIds:[STUDENT],today:TODAY, ...overrides
    };
  }
  async function expect(name, run) {
    await run();
    passed++;
    process.stdout.write("PASS  " + name + "\n");
  }

  await expect("Preflight rejects invalid input before making database calls", async () => {
    const {client,state}=makeClient();
    const result=await validatePortalAccountPreflight({...payload({email:"bad",displayName:""}),adminClient:client});
    assert.equal(result.ready,false);
    assert.equal(state.calls.length,0);
    assert.equal(state.writes,0);
  });
  await expect("New parent account passes when email is unused and student is active", async () => {
    const {client,state}=makeClient();
    const result=await validatePortalAccountPreflight({...payload(),adminClient:client});
    assert.equal(result.ready,true);
    assert.ok(result.checks.some(x=>x.label==="Student profile"&&x.status==="ok"));
    assert.equal(state.writes,0);
  });
  await expect("Existing active parent account may be linked without a new invitation", async () => {
    const {client,state}=makeClient({profiles:[{user_id:USER_PARENT,email:"new.person@example.com",role:"parent",is_active:true}]});
    const result=await validatePortalAccountPreflight({...payload(),adminClient:client});
    assert.equal(result.ready,true);
    assert.equal(state.calls.some(x=>x.table==="auth.users"),false);
    assert.equal(state.writes,0);
  });
  await expect("Inactive or mismatched portal profiles block account setup", async () => {
    for(const profile of [
      {user_id:USER_PARENT,email:"new.person@example.com",role:"parent",is_active:false},
      {user_id:USER_PARENT,email:"new.person@example.com",role:"driver",is_active:true}
    ]){
      const {client}=makeClient({profiles:[profile]});
      const result=await validatePortalAccountPreflight({...payload(),adminClient:client});
      assert.equal(result.ready,false);
      assert.ok(result.blockers.some(x=>/inactive|already has a driver account/.test(x)));
    }
  });
  await expect("Uninvited Auth users without a portal profile remain blocked for review", async () => {
    const {client,state}=makeClient({authUsers:[{id:USER_PARENT,email:"new.person@example.com"}]});
    const result=await validatePortalAccountPreflight({...payload(),adminClient:client});
    assert.equal(result.ready,false);
    assert.match(result.blockers.join(" "),/not created through an invitation/);
    assert.equal(result.resumeAuthUserId,null);
    assert.equal(state.writes,0);
  });
  await expect("An existing invited Auth user without a profile can safely resume without a second invitation", async () => {
    const {client,state}=makeClient({
      authUsers:[{id:USER_PARENT,email:"new.person@example.com",invited_at:"2026-11-26T12:00:00Z"}]
    });
    const result=await validatePortalAccountPreflight({...payload(),adminClient:client});
    assert.equal(result.ready,true);
    assert.equal(result.resumeAuthUserId,USER_PARENT);
    assert.ok(result.checks.some(x=>x.label==="Existing invitation"&&x.status==="ok"));
    assert.equal(state.writes,0);
  });
  await expect("Student portal preflight blocks a student already linked to another login", async () => {
    const {client}=makeClient({student_accounts:[{student_id:STUDENT,user_id:USER_STUDENT}]});
    const result=await validatePortalAccountPreflight({...payload({role:"student"}),adminClient:client});
    assert.equal(result.ready,false);
    assert.match(result.blockers.join(" "),/already linked/);
  });
  await expect("Student portal preflight allows an existing matching account link", async () => {
    const {client}=makeClient({
      profiles:[{user_id:USER_STUDENT,email:"new.person@example.com",role:"student",is_active:true}],
      student_accounts:[{student_id:STUDENT,user_id:USER_STUDENT}]
    });
    const result=await validatePortalAccountPreflight({...payload({role:"student"}),adminClient:client});
    assert.equal(result.ready,true);
  });
  await expect("Archived student profiles fail closed", async () => {
    const {client}=makeClient({students:[{id:STUDENT,is_active:false}]});
    const result=await validatePortalAccountPreflight({...payload(),adminClient:client});
    assert.equal(result.ready,false);
    assert.match(result.blockers.join(" "),/archived/);
  });
  await expect("Driver preflight rejects an assignment on another active route", async () => {
    const {client}=makeClient({
      assignments:[{student_id:STUDENT,route_id:"route-1",valid_from:"2026-01-01",valid_to:null}],
      routes:[{id:"route-1",driver_user_id:DRIVER_A,is_active:true}]
    });
    const result=await validatePortalAccountPreflight({...payload({role:"driver"}),adminClient:client});
    assert.equal(result.ready,false);
    assert.match(result.blockers.join(" "),/already have an active assignment/);
  });
  await expect("Driver preflight allows current assignments under the same driver", async () => {
    const {client}=makeClient({
      profiles:[{user_id:DRIVER_A,email:"new.person@example.com",role:"driver",is_active:true}],
      assignments:[{student_id:STUDENT,route_id:"route-1",valid_from:"2026-01-01",valid_to:null}],
      routes:[{id:"route-1",driver_user_id:DRIVER_A,is_active:true}]
    });
    const result=await validatePortalAccountPreflight({...payload({role:"driver"}),adminClient:client});
    assert.equal(result.ready,true);
  });
  await expect("Assignments on inactive routes do not block a new driver", async () => {
    const {client}=makeClient({
      assignments:[{student_id:STUDENT,route_id:"route-old",valid_from:"2026-01-01",valid_to:null}],
      routes:[{id:"route-old",driver_user_id:DRIVER_A,is_active:false}]
    });
    const result=await validatePortalAccountPreflight({...payload({role:"driver"}),adminClient:client});
    assert.equal(result.ready,true);
  });
  await expect("Database lookup failures fail closed for account and route conflict checks", async () => {
    const {client}=makeClient({errors:{profiles:"temporary profiles error"}});
    const result=await validatePortalAccountPreflight({...payload(),adminClient:client});
    assert.equal(result.ready,false);
    const {client:driverClient}=makeClient({errors:{driver_route_students:"temporary assignment error"}});
    const driverResult=await validatePortalAccountPreflight({...payload({role:"driver"}),adminClient:driverClient});
    assert.equal(driverResult.ready,false);
    assert.match(driverResult.blockers.join(" "),/Could not check current driver assignments/);
  });
  await expect("Preflight does not mutate Auth, profiles, student links or driver routes", async () => {
    const scenarios=[
      makeClient(),
      makeClient({profiles:[{user_id:USER_PARENT,email:"new.person@example.com",role:"parent",is_active:true}]}),
      makeClient({assignments:[{student_id:STUDENT,route_id:"route-1",valid_from:"2026-01-01",valid_to:null}],routes:[{id:"route-1",driver_user_id:DRIVER_A,is_active:true}]})
    ];
    for(const {client,state} of scenarios){
      await validatePortalAccountPreflight({...payload(),adminClient:client});
      assert.equal(state.writes,0);
      assert.ok(state.calls.every(call=>!["insert","update","upsert","delete","rpc","inviteUserByEmail"].includes(call.operation)));
    }
  });
}

runPortalPreflightUnitTests().then(() => {
  process.stdout.write("\n" + passed + " DISCIPLINE quality checks passed.\n");
}).catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

