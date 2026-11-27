# DISCIPLINE — QA and release checklist

Use test accounts and fictional data only. Do not create, record, or publish an incident involving a real student as a test.

## Current automated / configuration checks

- [x] Frontend JavaScript parses: `js/app.js` and `js/auth.js`
- [x] The workspace starts hidden/inert/aria-hidden; the authenticated portal shell releases it only after the signed-in profile is confirmed active and its role is supported
- [x] Temporary Supabase/session lookup failures preserve the saved session, keep the workspace closed and offer an accessible retry; automated regression tests passed in the 136-check CI run
- [ ] Manually simulate an offline/profile lookup failure in a browser, restore the connection and confirm Retry account check opens the same session
- [x] Latest GitHub Actions quality run passed **136 DISCIPLINE checks** on commit `b82b93f5a7c981df57f5efb9657dff0cf50b0165` ([run](https://github.com/vophh44-byte/DISCIPLINE/actions/runs/46013339176)); includes saved-session recovery and retry regression checks
- [x] GitHub Pages build and deployment completed successfully for the session-recovery app build on commit `b82b93f5a7c981df57f5efb9657dff0cf50b0165` ([deployment run](https://github.com/vophh44-byte/DISCIPLINE/actions/runs/46013339029))
- [x] Fail-closed startup and session-recovery hardening are green in CI and deployed; signed-in browser smoke tests for all four roles remain a separate manual release check
- [x] All 24 previously unindexed foreign-key columns now have B-tree indexes; PostgreSQL catalog check confirms 42/42 public foreign-key constraints are indexed
- [x] Row Level Security is enabled on all 19 public application tables; parent route/assignment/run/check-in visibility has also been exercised under the authenticated parent role with rollback-only fixture records
- [x] Removed `anon` table privileges from all 19 public application tables; fresh live grant audit confirms zero anonymous SELECT/INSERT/UPDATE/DELETE privileges
- [x] Fresh live function audit: all 14 public functions were checked and zero allow `anon` execution
- [x] Removed anonymous execute privileges from all public functions; live query confirms zero anon-executable functions
- [x] Rollback-only PostgreSQL RLS smoke test run under the existing parent role: visible scope is one linked student, own profile/link, two mark-ledger rows, and no incident/evidence rows
- [x] Rollback-only PostgreSQL RLS smoke test run under the existing administrator role: visible scope includes the current two profiles, one student, one parent link and two mark-ledger rows
- [x] Rollback-only student RLS simulation confirmed one profile, one linked student, two mark-ledger rows and zero incident/evidence rows; temporary student link and role change were rolled back
- [x] Rollback-only driver journey simulation loaded the assigned roster, started a route run, recorded a check-in and finished the run; completed status was confirmed and all temporary rows were rolled back
- [x] Rollback-only parent journey RLS test inserted a temporary route, linked assignment, current-day run and boarding check-in, then confirmed the signed-in parent could see exactly the linked route, assignment, run and check-in (1 each); transaction rolled back; after temporarily removing the family link inside the same transaction, the parent saw 0 routes, assignments, runs and check-ins. A post-test query confirmed no temporary QA rows remained.
- [x] Portal-account Edge Function CORS allow-list deployed as active version 7 with JWT verification enabled; production GitHub Pages and localhost development origins are supported
- [x] Fresh GitHub Actions quality run passed for the session-recovery hardening changes (136 checks)
- [x] Rollback-only incident lifecycle smoke test used the real incident creation and transcript-verification RPCs: parent visibility was 0 before publication and 1 after verification/publication, with reviewed exact words visible; transaction rolled back
- [x] Rollback-only Monday publication smoke test published the week starting 2026-11-23, exposed the result to the linked parent and created one parent notification; transaction rolled back
- [x] Repeatable script added at `scripts/rls-role-smoke.sql`; it simulates signed-in database claims and rolls back all three transactions, including temporary parent journey fixtures, without retaining test records
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
- [ ] Driver portal browser test with a separate driver account (assigned roster only, start/check-in/finish a route, and parent journey notifications)
- [x] GitHub Pages build and deploy jobs succeeded for the fail-closed app-code release commit; authenticated browser smoke tests remain outstanding
- [x] Invite/recovery password setup form requires 12+ characters with uppercase, lowercase, a number and a symbol (application-side check only)

## Administrator Command Center review queue

1. Sign in through the Administrator portal and open Command Center.
2. Confirm the three live queue cards load from Supabase: unanswered parent responses, incidents awaiting transcript verification, and verified incidents awaiting parent publication.
3. Confirm counts reflect the corresponding administrator lists and show zero when there are no matching records.
4. Select each card and confirm it opens Parent Management or Incident Center as appropriate.
5. Use the refresh control and confirm only the queue reloads without re-rendering the dashboard.
6. Leave Command Center open and confirm the counts update automatically within 60 seconds; navigate to another section and confirm background polling stops.
7. At a narrow mobile width, confirm the cards stack in one column and all labels/counts remain readable.
8. Confirm the dashboard shows counts and category labels only; do not display parent messages, student incident narratives, exact words, transcript text, or temporary audio evidence in this summary.

### Parent journey live-update behavior

1. Sign in with a linked parent test account and leave the parent portal open.
2. Start a test route and record a student check-in in quick succession.
3. Confirm journey status and check-in history update automatically without repeated flicker or duplicate dashboard content.
4. Confirm several database events arriving within a short burst result in one consolidated parent portal refresh.
5. Navigate away or sign out and confirm the old portal is no longer refreshed.

### Portal invitation retry behaviour

1. Open Portal Accounts as an administrator and complete a test invitation form using a controlled test inbox and a fictional test student.
2. In browser developer tools, simulate an offline/network failure before submitting. Confirm the page displays a service-connection error and the submit button becomes available again.
3. Restore the connection and retry. Confirm a successful response gives a clear invitation or existing-account result.
4. Confirm the form never asks the administrator to enter or share the invited user's password.

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

### 0. Fail-closed authentication startup

6. In a local development copy, simulate a temporary `profiles` query failure or block the Supabase API after sign-in. Confirm DISCIPLINE does not sign the user out, keeps the application hidden and displays a Retry account check control.
7. Restore the connection and select Retry account check. Confirm the same saved session opens the correct portal without entering the password again.
8. Simulate a temporary portal-data loading error after role verification. Confirm partial portal content is hidden and a retry is offered.

1. Open DISCIPLINE in a fresh private/incognito browser session. Confirm only the portal picker is visible; the local-preview workspace and its sample figures must remain hidden.
2. Use keyboard Tab navigation and a screen reader to confirm the hidden workspace is not focusable or exposed before sign-in.
3. In a local development copy only, block the Supabase config script or Supabase client CDN and reload. Confirm the authentication error remains visible and the workspace stays hidden.
4. Try an inactive test account and a role-mismatched portal sign-in. Confirm neither reveals the workspace.
5. Sign in with a valid test account for each role. Confirm the correct portal appears; sign out and reload, then confirm the workspace is hidden again until authentication.

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
