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

process.stdout.write("\n" + passed + " DISCIPLINE quality checks passed.\n");
