-- Add B-tree indexes for foreign-key columns identified by the Supabase database linter.
-- These are additive indexes; no table data or access policies are changed.

create index if not exists idx_attendance_recorded_by
  on public.attendance (recorded_by);

create index if not exists idx_audit_logs_actor_user_id
  on public.audit_logs (actor_user_id);

create index if not exists idx_certificates_issued_by
  on public.certificates (issued_by);
create index if not exists idx_certificates_student_id
  on public.certificates (student_id);

create index if not exists idx_driver_journey_checkins_recorded_by
  on public.driver_journey_checkins (recorded_by);
create index if not exists idx_driver_journey_checkins_student_id
  on public.driver_journey_checkins (student_id);

create index if not exists idx_driver_route_runs_finished_by
  on public.driver_route_runs (finished_by);
create index if not exists idx_driver_route_runs_started_by
  on public.driver_route_runs (started_by);

create index if not exists idx_incident_evidence_created_by
  on public.incident_evidence (created_by);
create index if not exists idx_incident_evidence_incident_id
  on public.incident_evidence (incident_id);

create index if not exists idx_incidents_mark_transaction_id
  on public.incidents (mark_transaction_id);
create index if not exists idx_incidents_recorded_by
  on public.incidents (recorded_by);
create index if not exists idx_incidents_session_id
  on public.incidents (session_id);

create index if not exists idx_journey_sessions_created_by
  on public.journey_sessions (created_by);

create index if not exists idx_mark_transactions_created_by
  on public.mark_transactions (created_by);
create index if not exists idx_mark_transactions_related_transaction_id
  on public.mark_transactions (related_transaction_id);
create index if not exists idx_mark_transactions_session_id
  on public.mark_transactions (session_id);

create index if not exists idx_notifications_related_incident_id
  on public.notifications (related_incident_id);
create index if not exists idx_notifications_related_student_id
  on public.notifications (related_student_id);

create index if not exists idx_parent_responses_incident_id
  on public.parent_responses (incident_id);
create index if not exists idx_parent_responses_parent_user_id
  on public.parent_responses (parent_user_id);
create index if not exists idx_parent_responses_reviewed_by
  on public.parent_responses (reviewed_by);
create index if not exists idx_parent_responses_student_id
  on public.parent_responses (student_id);
create index if not exists idx_parent_responses_weekly_result_id
  on public.parent_responses (weekly_result_id);
