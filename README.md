# DISCIPLINE

A responsive student conduct, attendance, journey and parent-communication application.

## Current application

DISCIPLINE is connected to Supabase for authenticated, role-scoped records. The administrator interface includes:

- Student registry and portal account management, including a live count-only Portal Accounts readiness snapshot and a searchable administrator directory of parent, student and driver profiles with active/inactive status, linked student/route summaries, Supabase invitation timestamps, email-confirmation timestamps and last sign-in time; auth timestamps are returned only through an active-administrator Edge Function, and an invitation timestamp is not proof of inbox delivery. The directory is read-only. Portal account setup also includes an administrator-only, non-mutating preflight that checks email/profile conflicts, active student links and current driver-route assignments before any invitation; final submission repeats the checks server-side. The shared validator is also unit-tested against mocked Supabase data to cover existing-account, student-link and driver-route conflict cases without creating test users or sending invitations. A failed post-invitation profile setup can be resumed against the same invited Auth user without issuing a duplicate email; unrelated sign-in records are not auto-claimed.
- Attendance, journeys, driver routes and check-ins
- Mark awards, deductions and Monday-based weekly results
- Private incident records, factual descriptions and exact-word review
- Controlled publication of verified behaviour reports to linked parent accounts
- Parent notifications, responses, certificates and reporting
- Administrator inbox with live counts of parent responses awaiting review and incidents awaiting verification; the inbox is restricted to administrator accounts
- Administrator Command Center includes a live, count-only review queue for pending parent responses, incidents awaiting transcript verification and verified reports waiting for parent publication, with one-click navigation and manual refresh; the three counts refresh automatically every 60 seconds while the Command Center is open
- Parent Management can export or print filtered parent communication history; reports include parent messages and review status but omit private administrator notes
- Weekly results export to CSV and a print-ready report; both actions respect the selected student search and publication-status filters
- First-time weekly result publication creates in-app notifications for active linked parents and student portal accounts; recalculations of already-published weeks do not send duplicate alerts
- Attendance registers export to CSV and print with daily status totals, saved notes and unmarked students
- Driver check-in reports filter by student, route, vehicle and status, then export to CSV or print the selected journey records
- Mark transaction history can be searched and filtered by transaction type, then exported to CSV or printed with positive/negative/net summaries and before/after balances
- Student Registry includes an administrator-only individual profile report combining lifetime marks, recent attendance, incident review/publication state, weekly results and certificates, with a print view
- Incident Center includes pending/verified review filters and confidential CSV/print reports with factual summaries and publication state; exact words, transcripts and temporary audio are excluded from these reports
- Achievement Certificates can be printed as designed A4 landscape documents using the saved certificate title, student name, achievement description and issue date

Student portal accounts are read-only and can view only their own published weekly scores and mark history. They do not see incident narratives, exact words or evidence. Incident deductions appear in shared mark history only as a generic label; factual descriptions and reviewed exact words remain in the protected incident record. Parent accounts are created by an administrator and can access only linked student information allowed by the database policies; incident details are visible to a parent only after administrator verification and publication. Parent journey updates are debounced so simultaneous route/check-in events refresh the family dashboard smoothly.

## Incident audio and transcript handling

- Audio is optional and manually started by an administrator. The application does not continuously monitor or record student speech.
- Before recording, the administrator must confirm that the required school/guardian permission and notice have been handled.
- Recordings are limited in the interface to 60 seconds and 8 MB. Accepted audio is stored in a private Supabase Storage bucket with administrator-only access.
- An administrator listens to the private recording, enters or corrects the transcript, and explicitly verifies it.
- On verification, the server deletes the temporary audio object first, then records verification and the deletion timestamp.
- Audio is not made available in parent or student portals. Parent publication is a separate administrator action after verification.
- Transcript text and reviewed incident details may remain in the permanent incident record according to the school's approved retention policy.
- There is no automated speech-to-text service in this implementation; transcript entry and verification are manual.

Use audio only when the institution has a lawful, appropriate basis and has followed its safeguarding, consent, notice and retention requirements. Do not use the feature for covert, continuous or indiscriminate recording.

## Technical notes

- Frontend: HTML, CSS and JavaScript; no frontend build step.
- The full workspace starts hidden, inert and excluded from assistive technology. Only a signed-in account with an active, supported portal role can reveal it; missing Supabase configuration, inactive accounts and role mismatches keep it closed.
- Temporary Supabase profile/session lookup failures do not automatically sign users out: the workspace stays hidden, the saved session is retained, and an accessible retry control lets the user re-check the account when connectivity returns.
- Backend: Supabase Auth, PostgreSQL with Row Level Security, Supabase Storage and Edge Functions.
- The browser uses only the Supabase publishable client key. Never place a Supabase secret or service-role key in frontend files or commit history.
- Unauthenticated `anon` database privileges are revoked for application tables, sequences and functions. The `postgres` migration owner's default privileges are also restricted so new public objects do not automatically grant anonymous access; authenticated portal roles retain the existing RLS-governed access.
- Incident audio is handled by the `incident-audio` Edge Function. It validates the signed-in administrator and performs private upload, short-lived playback URL creation, deletion and verification. Signed-in administrators have read-only access to evidence metadata; writes to evidence metadata are handled by the server-side function.
- The `create-portal-account` Edge Function permits the production GitHub Pages origin and local `localhost` / `127.0.0.1` development origins only; it responds to preflight requests with the headers required by the Supabase browser client. Its active version 8 also provides an administrator-only action that returns a minimal subset of Supabase Auth timestamps for portal account setup visibility.
- Database migrations already exist in the connected project. Apply further schema changes as migrations and retain the existing RLS policies.

## Automated quality checks

The repository runs lightweight, dependency-free checks on pushes and pull requests to `main`. The checks parse the browser JavaScript and verify the fail-closed authentication startup, portal-role boundaries, supported roles, student-to-profile linking, published-only weekly results, student-scoped mark history, parent-only incident/report handling, browser configuration secret hygiene, portal-account administrator authorization and link-conflict protections, incident-audio consent, file-limit, short-lived playback and administrator-only safeguards, administrator inbox role visibility and pending-item queries, filtered weekly CSV/print report exports, attendance-register exports, and filtered driver check-in exports, and filtered mark-ledger exports with before/after balance checks.

Run the same checks locally with Node.js 24 or newer:

```sh
node scripts/quality-checks.js
```

These are static regression checks, not a substitute for separate live administrator, parent, student and driver sign-in tests.

## Run locally

1. Clone or download this repository.
2. Serve the folder with a local static web server (for example, VS Code Live Server).
3. Sign in with an authorized portal account. A working internet connection is required for Supabase-backed features.
4. Audio recording requires a secure browser context (HTTPS or localhost) and microphone permission.

## Before production use

Review all database access policies, authentication settings, account recovery, backup/retention requirements and the institution's child-safeguarding policy. Test each role (administrator, parent, student and driver) with separate accounts and confirm that no account can access another user's records. New invite and recovery passwords are additionally checked in the DISCIPLINE setup page for 12+ characters plus uppercase, lowercase, a number and a symbol. This browser-side check is not a replacement for provider-side enforcement. This Supabase organization is on the Free plan; leaked-password screening against HaveIBeenPwned is available on Pro and above. Avoid password reuse and enable provider-level screening if the plan is upgraded.
