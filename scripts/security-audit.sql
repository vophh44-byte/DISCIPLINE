-- DISCIPLINE live security and data-integrity audit
-- Read-only queries. Run in Supabase SQL Editor for the DISCIPLINE project.
-- This script does not create, update or delete application records.

-- 1) Show execute grants for public SECURITY DEFINER routines.
--    Review authenticated grants against auth.uid() and role checks in each routine.
select
  p.proname as function_name,
  pg_get_function_identity_arguments(p.oid) as arguments,
  p.prosecdef as security_definer,
  has_function_privilege('anon', p.oid, 'EXECUTE') as anon_can_execute,
  has_function_privilege('authenticated', p.oid, 'EXECUTE') as authenticated_can_execute,
  has_function_privilege('service_role', p.oid, 'EXECUTE') as service_role_can_execute
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public'
  and p.prosecdef = true
order by p.proname;

-- 2) Confirm RLS is enabled on public application tables.
select
  count(*) as public_tables,
  count(*) filter (where c.relrowsecurity) as tables_with_rls_enabled,
  count(*) filter (where not c.relrowsecurity) as tables_missing_rls
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public'
  and c.relkind in ('r', 'p');

-- 3) Confirm the one-audio-per-incident partial unique index exists.
select
  indexname,
  indexdef
from pg_indexes
where schemaname = 'public'
  and tablename = 'incident_evidence'
  and indexname = 'incident_evidence_one_audio_per_incident';

-- 4) Confirm critical verification privileges explicitly.
select
  has_function_privilege('anon',
    'public.admin_verify_incident_transcript(uuid,text,uuid,boolean)', 'EXECUTE') as anon_can_verify,
  has_function_privilege('authenticated',
    'public.admin_verify_incident_transcript(uuid,text,uuid,boolean)', 'EXECUTE') as authenticated_can_verify,
  has_function_privilege('service_role',
    'public.admin_verify_incident_transcript(uuid,text,uuid,boolean)', 'EXECUTE') as service_role_can_verify;

-- 5) Aggregate operational integrity checks. No names, emails or incident text are returned.
select
  (select count(*) from public.students where is_active = true) as active_students,
  (select count(*) from public.student_accounts) as student_portal_links,
  (select count(*) from public.parent_student_links) as parent_student_links,
  (select count(*) from public.profiles where role = 'driver' and is_active = true) as active_drivers,
  (select count(*) from public.driver_routes where is_active = true) as active_driver_routes,
  (select count(*) from public.incidents) as incidents,
  (select count(*) from public.incidents
    where published_to_parent_at is not null and transcript_verified is not true) as published_unverified_incidents,
  (select count(*) from public.incident_evidence
    where evidence_type = 'audio_temp'
      and storage_path is not null and audio_deleted_at is null) as pending_audio_evidence,
  (select count(*) from public.incident_evidence
    where evidence_type = 'audio_temp'
      and audio_deleted_at is not null and storage_path is not null) as audio_deletion_metadata_conflicts,
  (select count(*) from public.weekly_results
    where extract(isodow from week_start) <> 1) as non_monday_week_starts;
