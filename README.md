# DISCIPLINE

A responsive student conduct, attendance, journey and parent-communication application.

## Current application

DISCIPLINE is connected to Supabase for authenticated, role-scoped records. The administrator interface includes:

- Student registry and portal account management
- Attendance, journeys, driver routes and check-ins
- Mark awards, deductions and Monday-based weekly results
- Private incident records, factual descriptions and exact-word review
- Controlled publication of verified behaviour reports to linked parent accounts
- Parent notifications, responses, certificates and reporting

Student portal accounts are read-only. Parent accounts are created by an administrator and can access only linked student information allowed by the database policies.

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
- Backend: Supabase Auth, PostgreSQL with Row Level Security, Supabase Storage and Edge Functions.
- The browser uses only the Supabase publishable client key. Never place a Supabase secret or service-role key in frontend files or commit history.
- Incident audio is handled by the `incident-audio` Edge Function. It validates the signed-in administrator and performs private upload, short-lived playback URL creation, deletion and verification. Signed-in administrators have read-only access to evidence metadata; writes to evidence metadata are handled by the server-side function.
- Database migrations already exist in the connected project. Apply further schema changes as migrations and retain the existing RLS policies.

## Run locally

1. Clone or download this repository.
2. Serve the folder with a local static web server (for example, VS Code Live Server).
3. Sign in with an authorized portal account. A working internet connection is required for Supabase-backed features.
4. Audio recording requires a secure browser context (HTTPS or localhost) and microphone permission.

## Before production use

Review all database access policies, authentication settings, account recovery, backup/retention requirements and the institution's child-safeguarding policy. Test each role (administrator, parent, student and driver) with separate accounts and confirm that no account can access another user's records. New invite and recovery passwords are additionally checked in the DISCIPLINE setup page for 12+ characters plus uppercase, lowercase, a number and a symbol. This browser-side check is not a replacement for provider-side enforcement. This Supabase organization is on the Free plan; leaked-password screening against HaveIBeenPwned is available on Pro and above. Avoid password reuse and enable provider-level screening if the plan is upgraded.
