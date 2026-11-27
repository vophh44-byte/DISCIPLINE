# DISCIPLINE — QA and release checklist

Use test accounts and fictional data only. Do not create, record, or publish an incident involving a real student as a test.

## Current automated / configuration checks

- [x] Frontend JavaScript parses: `js/app.js` and `js/auth.js`
- [x] GitHub Actions syntax, portal privacy, audio cleanup, invitation, anonymous-grant, role-smoke, admin inbox, weekly report, attendance, driver check-in, mark-ledger, student-profile, certificate, incident-report, weekly-notification and parent-response-export regression checks pass; 121 checks passed on the latest feature commit using Node.js 24
- [x] GitHub Pages build and deploy succeeded for commit `05e06f6` ( [latest deployment run](https://github.com/vophh44-byte/DISCIPLINE/actions/runs/46006180307) )
- [x] All 24 previously unindexed foreign-key columns now have B-tree indexes; PostgreSQL catalog check confirms 42/42 public foreign-key constraints are indexed
- [x] Row Level Security is enabled on all 19 public application tables; role-specific access still requires the separate manual portal tests
- [x] Removed `anon` table privileges from all 19 public application tables; live grant query confirms zero anonymous SELECT/INSERT/UPDATE/DELETE privileges while authenticated SELECT remains available on all 19
- [x] Removed anonymous execute privileges from all public functions; live query confirms zero anon-executable functions
- [x] Rollback-only PostgreSQL RLS smoke test run under the existing parent role: visible scope is one linked student, own profile/link, two mark-ledger rows, and no incident/evidence rows
- [x] Rollback-only PostgreSQL RLS smoke test run under the existing administrator role: visible scope includes the current two profiles, one student, one parent link and two mark-ledger rows
- [x] Rollback-only student RLS simulation confirmed one profile, one linked student, two mark-ledger rows and zero incident/evidence rows; temporary student link and role change were rolled back
- [x] Rollback-only driver journey simulation loaded the assigned roster, started a route run, recorded a check-in and finished the run; completed status was confirmed and all temporary rows were rolled back
- [x] Portal-account Edge Function CORS allow-list deployed as active version 7 with JWT verification enabled; production GitHub Pages and localhost development origins are supported
- [x] Latest GitHub Actions quality run passed 121 regression checks and the latest GitHub Pages deployment completed successfully
- [x] Repeatable script added at `scripts/rls-role-smoke.sql`; it simulates signed-in database claims and rolls back both transactions without changing records
- [x] Revoked anonymous default privileges for future public tables, sequences and functions created by the `postgres` migration owner; platform-managed `supabase_admin` defaults were not changed
- [x] Temporary audio bucket exists and is private
- [x] Audio bucket accepts only the configured audio MIME types and is limited to 8 MB
- [x] Storage object policies restrict read, upload and delete to active administrators
- [x] Incident verification RPC is executable only by the server-side service role
- [x] Live PostgreSQL privilege review: all 11 security-definer functions executable by `authenticated` bind checks to `auth.uid()` and the appropriate administrator/driver role; the leaderboard is limited to admin/student roles and published rows
- [x] Transcript-verification RPC is not executable by `anon` or `authenticated`; only `service_role` has execute permission
- [x] A partial unique index enforces one `audio_temp` evidence row per incident
- [x] Expanded static checks cover verified/published upload blocks, duplicate audio prevention, orphan cleanup on evidence insert failure, transcript requirement, fail-closed storage checks, deletion-before-verification ordering, deleted-audio playback blocking and no duplicate invitations
- [x] Signed-in administrators can read evidence metadata; evidence metadata writes are restricted to the server-side Edge Function
- [x] Database blocks verification or parent publication while temporary audio remains pending
- [x] Database blocks attaching new temporary audio to an already verified or published incident
- [x] Edge Function validates signed-in administrator role, requires permission confirmation for upload, and creates only a 60-second listening URL
- [x] Parent and student incident/evidence visibility remains governed by existing Row Level Security
- [x] Weekly-results RLS exposes only published rows to linked portal accounts; rollback-only checks confirmed parent 0 / admin 1 while unpublished, then parent 1 after publication
- [x] Incident deductions use a generic shared-ledger reason so factual narratives are not copied into parent/student mark history
- [ ] Browser microphone test on HTTPS with an appropriately consenting adult
- [x] Automated regression checks confirm multipart recording uploads forward explicit permission confirmation, the browser blocks recording without consent, consent is reconfirmed before upload, the 60-second stop and 8 MB limit remain in place, and server-side admin, MIME-type and short-lived playback guards remain
- [x] Administrator inbox loads pending parent responses and incidents awaiting transcript verification; live counts appear in the Parent Management and Incident Center navigation badges
- [x] Administrator inbox is hidden from parent, student and driver portals and escapes user-provided message/name content before display
- [x] Weekly results support CSV export and print-ready report output; both respect the current student search and publication-status filters
- [x] Weekly CSV export quotes text fields, guards formula-like text values, uses UTF-8 BOM and includes the selected Monday in the filename
- [x] Weekly print report escapes student names/IDs, includes scoring period and totals, and uses a responsive print layout
- [x] Attendance register supports CSV export and printing; both use the active student search and include not-marked students, saved statuses and notes
- [x] Attendance CSV uses UTF-8 BOM, date-specific filename, quoted cells and formula-like text protection
- [x] Attendance print report includes present, absent, late, excused and unmarked totals, with student details safely escaped
- [x] Driver check-in register supports student/route/vehicle/note search, status filtering, CSV export and print reports
- [x] Driver check-in exports include journey date/type, student, route, vehicle, driver, status, note and timestamp; print view includes status totals and safely escaped details
- [x] Mark Management transaction history can be searched by student, ID, reason and transaction type
- [x] Mark ledger CSV includes amount, balance change, before and after balances; quotes values and guards spreadsheet-formula text
- [x] Mark ledger print report includes positive, negative and net change totals and escapes student/reason content
- [x] Student Registry provides an administrator-only View profile action with mark, attendance, incident summary, weekly-results and certificate data
- [x] Student profile lifetime balance is calculated from starting marks plus all saved ledger balance changes
- [x] Student profile incident section shows factual summary and verification/publication state without loading exact words or evidence
- [x] Student profile print report escapes student and guardian data and omits temporary audio and exact-word content
- [x] Certificate register has a print action for private and published certificates; print output uses saved title, student name, description and issue date
- [x] Certificate print page is formatted for A4 landscape and escapes dynamic certificate/student text before writing the print document
- [x] Incident Center can filter by awaiting verification/verified state as well as parent visibility and search terms
- [x] Incident CSV and print reports share the active filters and include factual descriptions, review state, publication state and deduction linkage
- [x] Incident reports exclude exact words, transcript text and temporary audio evidence and escape dynamic student/description content
- [x] First-time weekly result publication sends in-app notifications to active linked parents and student portal accounts
- [x] Weekly publication notification migration only notifies students whose result was not previously published; recalculations of already-published weeks do not send duplicate alerts
- [x] Weekly publication result message reports the number of portal notifications created
- [x] Parent Management exports and prints the currently filtered parent communication history, including parent messages and review state
- [x] Parent communication reports exclude private administrator notes and safely escape parent, student and message content
- [x] Parent communication export respects pending/all/reviewed and search filters; administrator inbox count refreshes after review status changes
- [x] Both deployed Edge Functions are tracked in `supabase/functions`; account provisioning tests administrator authorization, supported roles, active-student validation and student-link conflicts
- [ ] Signed-in administrator → upload → review → verify → storage deletion end-to-end test
- [ ] Separate parent account test after publication
- [ ] Student portal read-only test with a student test account (portal selection, own published scores and mark history only; no incident narrative, exact words or evidence; no write actions)
- [ ] Verify GitHub Pages has finished publishing the latest main-branch commit
- [x] Invite/recovery password setup form requires 12+ characters with uppercase, lowercase, a number and a symbol (application-side check only)

## Repeatable database audit

Run [`scripts/security-audit.sql`](scripts/security-audit.sql) in the Supabase SQL Editor while connected to the DISCIPLINE project. It is read-only and returns function execute grants, RLS table coverage, the temporary-audio uniqueness index, verification-RPC privileges and aggregate integrity counts. It does not return student names, parent emails or incident narratives. Review each authenticated-executable SECURITY DEFINER routine's definition to confirm it binds authorization to `auth.uid()` and the intended role.

### Individual student profile report

1. Sign in as an administrator and open Student Registry.
2. Search for a student and select View profile.
3. Confirm lifetime balance equals starting marks plus the saved mark ledger.
4. Review recent attendance, incident review/publication state, weekly results and certificates.
5. Confirm exact recorded words and temporary audio are not shown in the general profile summary.
6. Open Print record and check the student/guardian details and saved report sections.

### Confidential incident report export and print

1. Open Incident Center and select the required parent-visibility filter.
2. Choose Awaiting verification or Verified, and enter a student/category/description search if needed.
3. Export CSV and confirm the report includes factual description, category, severity, review state, parent visibility, deduction linkage and action taken.
4. Print the report and confirm the same filtered records and summary counts are shown.
5. Confirm neither export contains exact recorded words, transcript text or temporary audio evidence.

### Parent communication history export and print

1. Open Parent Management.
2. Select Pending review, All responses or Reviewed, and enter a search term if needed.
3. Export CSV and confirm parent, student, topic, message and review state match the current filters.
4. Print history and confirm the same filtered parent messages and review counts are shown.
5. Confirm private administrator follow-up notes are not present in the export or print report.

### Achievement certificate print

1. Open Achievement Certificates as an administrator.
2. Issue or select a saved certificate for a student.
3. Use Print certificate and confirm the A4 landscape layout, saved student name, title, description and issue date.
4. Confirm the print action works for both private drafts and published certificates without changing portal visibility.

### Weekly publication notifications

1. Use a fictional test week and test student with a linked parent/student portal account.
2. Publish that Monday–Sunday result period.
3. Confirm an in-app notification is created for each active linked parent and active linked student account.
4. Re-run publication for the same already-published week and confirm no duplicate notification is created for those existing published rows.
5. Confirm the administrator result message shows the number of notifications sent.

### Weekly result export and print

1. Sign in as an administrator and open Weekly Results.
2. Select a Monday and load the saved result records for that scoring week.
3. Enter a student search and/or select a publication-status filter.
4. Export CSV and confirm the downloaded rows match the current filters and the selected Monday appears in the filename.
5. Open Print report and confirm the same filtered rows, date range, score totals and portal publication status appear in the print preview.

### Attendance register export and print

1. Open Morning Attendance and select the required date.
2. Load or start the register so saved attendance statuses are shown.
3. Use the search field to narrow the student list.
4. Export CSV and confirm only the matching students are included, with saved statuses, notes and "Not marked" entries.
5. Print the register and confirm the summary shows present, absent, late, excused and unmarked counts.

### Driver check-in export and print

1. Open Driver Check-ins & Trips and select a date and morning/evening journey.
2. Search by student, ID, class, route, vehicle, status or note.
3. Select a specific status when needed.
4. Export CSV and confirm the date, journey, driver, route, vehicle, student, status, note and update time are included.
5. Print the report and confirm the status totals and filtered check-in rows match the selected criteria.

### Mark ledger export and print

1. Open Award & Deduct Marks and wait for the latest 50 mark transactions to load.
2. Search by student name, student ID or reason, and optionally choose one transaction type.
3. Export CSV and confirm the reason, amount, balance change, balance before and balance after are included.
4. Open Print report and confirm positive, negative and net totals match the filtered rows.
5. Confirm the report keeps the before/after balances and transaction reason for each entry.

## Manual test procedure

### 1. Administrator incident workflow

1. Sign in using a dedicated administrator test account.
2. Open Incident Center and create an incident using fictional details and a test student profile.
3. Confirm the new record remains private and is not visible to parent or student accounts.
4. For audio testing only, use a consenting adult speaker. Confirm the required institutional permission/notice checkbox, start recording, speak a short test phrase, and stop.
5. Preview the recording. Save the incident and confirm the audio appears as temporary evidence.
6. Open Review & verify, play the short-lived recording link, and enter the correct test transcript.
7. Confirm verification. The UI should report that the recording was deleted.
8. Confirm the evidence row has `audio_deleted_at` set and `storage_path` cleared, and that the object is absent from `discipline-temp-audio`.
9. Confirm the exact reviewed words are stored on the incident record and the record is marked verified.
10. Attempt to open the old listening URL after expiry; it should no longer be usable.

### 2. Parent access

1. Sign in using a separate parent test account linked only to the test student.
2. Before publication, confirm the incident is not visible and the shared mark history shows only the generic “Incident deduction” label, not the factual narrative.
3. Publish the verified test incident from the administrator account.
4. Confirm only the linked parent can see the report and its reviewed exact words.
5. Confirm the parent cannot open, list, or download temporary audio.
6. Sign in as a different parent test account and confirm the report is not visible.
7. Confirm parent accounts cannot edit incidents, mark transactions, student profiles, or evidence.

### 3. Student access

1. From Portal Accounts, create a Student (view only) invitation for a fictional test student and an email inbox controlled by the tester. Complete password setup from the invitation.
2. Choose Student on the welcome screen and sign in using that separate student test account linked to the test student.
3. Confirm the student can view only their own published weekly score and mark history; any incident-related mark entry uses only the generic “Incident deduction” label.
4. Confirm the student cannot see incident narratives, exact words, parent-only responses, or evidence.
5. Confirm the student cannot create or modify incidents, exact words, marks, parent publication, or evidence.
6. Confirm the student cannot list or download temporary audio.

### 4. Negative tests

- Upload without the required permission confirmation: must be rejected.
- Upload an unsupported MIME type or a file over 8 MB: must be rejected.
- Request a recording as a non-administrator: must be rejected.
- Attempt to verify while the audio object is still present: must not mark the incident verified.
- Attempt to publish an unverified incident: must be rejected by the database.
- Attempt to insert, update or delete incident-evidence metadata directly as a signed-in administrator: must be rejected; use the secured Edge Function.
- Attempt to attach audio to an already verified or published incident: must be rejected.
- Attempt to access another student's records: must return no rows or an authorization error under RLS.

## Important operational notes

- Audio capture is optional, user-initiated and not continuous.
- No automated speech-to-text service is configured. Transcription is entered and checked by an administrator.
- Audio deletion is performed by the server before the verification flag is committed. If storage deletion fails, verification must fail closed.
- Parent publication is a separate administrator action after verification.
- Keep the Supabase service-role key in Edge Function secrets only. Never place it in the frontend or repository.
- Enable leaked-password protection in Supabase Auth when the project plan supports it. Review the institution's safeguarding, consent, notice and record-retention requirements before production use.
