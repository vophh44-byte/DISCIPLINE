# DISCIPLINE — QA and release checklist

Use test accounts and fictional data only. Do not create, record, or publish an incident involving a real student as a test.

## Current automated / configuration checks

- [x] Frontend JavaScript parses: `js/app.js` and `js/auth.js`
- [x] GitHub Actions syntax and portal privacy regression checks pass; 33 checks passed on commit `05e06f6` using Node.js 24 ( [workflow run](https://github.com/vophh44-byte/DISCIPLINE/actions/runs/45961730706) )
- [x] GitHub Pages build and deploy succeeded for commit `05e06f6` ( [deployment run](https://github.com/vophh44-byte/DISCIPLINE/actions/runs/45961730460) )
- [x] All 24 previously unindexed foreign-key columns now have B-tree indexes; PostgreSQL catalog check confirms 42/42 public foreign-key constraints are indexed
- [x] Row Level Security is enabled on all 19 public application tables; role-specific access still requires the separate manual portal tests
- [x] Temporary audio bucket exists and is private
- [x] Audio bucket accepts only the configured audio MIME types and is limited to 8 MB
- [x] Storage object policies restrict read, upload and delete to active administrators
- [x] Incident verification RPC is executable only by the server-side service role
- [x] Signed-in administrators can read evidence metadata; evidence metadata writes are restricted to the server-side Edge Function
- [x] Database blocks verification or parent publication while temporary audio remains pending
- [x] Database blocks attaching new temporary audio to an already verified or published incident
- [x] Edge Function validates signed-in administrator role, requires permission confirmation for upload, and creates only a 60-second listening URL
- [x] Parent and student incident/evidence visibility remains governed by existing Row Level Security
- [x] Weekly-results RLS exposes only published rows to linked portal accounts; rollback-only checks confirmed parent 0 / admin 1 while unpublished, then parent 1 after publication
- [x] Incident deductions use a generic shared-ledger reason so factual narratives are not copied into parent/student mark history
- [ ] Browser microphone test on HTTPS with an appropriately consenting adult
- [x] Automated regression checks confirm multipart recording uploads forward explicit permission confirmation, the browser blocks recording without consent, consent is reconfirmed before upload, the 60-second stop and 8 MB limit remain in place, and server-side admin, MIME-type and short-lived playback guards remain
- [x] Both deployed Edge Functions are tracked in `supabase/functions`; account provisioning tests administrator authorization, supported roles, active-student validation and student-link conflicts
- [ ] Signed-in administrator → upload → review → verify → storage deletion end-to-end test
- [ ] Separate parent account test after publication
- [ ] Student portal read-only test with a student test account (portal selection, own published scores and mark history only; no incident narrative, exact words or evidence; no write actions)
- [ ] Verify GitHub Pages has finished publishing the latest main-branch commit
- [x] Invite/recovery password setup form requires 12+ characters with uppercase, lowercase, a number and a symbol (application-side check only)

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
