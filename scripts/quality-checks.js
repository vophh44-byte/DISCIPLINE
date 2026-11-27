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
  assert.doesNotMatch(config, /service[_-]?role|sb_secret|SUPABASE_SERVICE_ROLE_KEY/i);
});

check("Supabase browser configuration loads before application scripts", () => {
  const configPosition = html.indexOf('src="js/supabase-config.js"');
  const appPosition = html.indexOf('src="js/app.js');
  const authPosition = html.indexOf('src="js/auth.js');
  assert.ok(configPosition >= 0 && appPosition > configPosition);
  assert.ok(authPosition > appPosition);
});

process.stdout.write("\n" + passed + " DISCIPLINE quality checks passed.\n");
