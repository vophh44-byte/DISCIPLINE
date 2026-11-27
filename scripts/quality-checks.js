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
const config = read("js/supabase-config.js");
const audioFunction = read("supabase/functions/incident-audio/index.ts");
const accountFunction = read("supabase/functions/create-portal-account/index.ts");
const anonAccessMigration = read("supabase/migrations/20261127115000_revoke_anon_public_application_access.sql");
const securityAudit = read("scripts/security-audit.sql");
const roleSmoke = read("scripts/rls-role-smoke.sql");

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


check("RLS role smoke test exercises parent and admin in rollback-only transactions", () => {
  assert.match(roleSmoke, /where role = 'parent' and is_active = true/);
  assert.match(roleSmoke, /where role = 'admin' and is_active = true/);
  assert.equal((roleSmoke.match(/set local role authenticated;/g) || []).length, 2);
  assert.equal((roleSmoke.match(/rollback;/g) || []).length, 2);
});

check("RLS smoke test inspects profile, student, mark, incident and evidence boundaries", () => {
  for (const field of ["visible_profiles", "visible_students", "visible_mark_transactions", "visible_parent_links", "visible_incidents", "visible_incident_evidence"]) {
    assert.ok(roleSmoke.includes(field), "missing RLS smoke result: " + field);
  }
  assert.ok(roleSmoke.includes("not a") && roleSmoke.includes("substitute for signing into the website"));
});

process.stdout.write("\n" + passed + " DISCIPLINE quality checks passed.\n");
