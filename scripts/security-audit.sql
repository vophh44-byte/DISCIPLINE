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

-- 6) Anonymous roles should have no direct table privileges; signed-in
--    portal accounts retain SELECT permission on all application tables.
select
  count(*) as public_tables,
  count(*) filter (where
    has_table_privilege('anon', c.oid, 'SELECT') or
    has_table_privilege('anon', c.oid, 'INSERT') or
    has_table_privilege('anon', c.oid, 'UPDATE') or
    has_table_privilege('anon', c.oid, 'DELETE') or
    has_table_privilege('anon', c.oid, 'TRUNCATE')
  ) as tables_with_anonymous_access,
  count(*) filter (where has_table_privilege('authenticated', c.oid, 'SELECT')) as authenticated_select_tables
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public' and c.relkind in ('r', 'p');

-- 7) Confirm no anonymous execution remains on public functions.
select
  count(*) as public_functions,
  count(*) filter (where has_function_privilege('anon', p.oid, 'EXECUTE')) as anon_executable_functions
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public';

-- 8) Check default privileges owned by postgres for future public objects.
--    Supabase-managed supabase_admin defaults are intentionally not changed.
select
  count(*) filter (where d.defaclobjtype = 'r') as anon_table_defaults,
  count(*) filter (where d.defaclobjtype = 'S') as anon_sequence_defaults,
  count(*) filter (where d.defaclobjtype = 'f') as anon_function_defaults
from pg_default_acl d
cross join lateral aclexplode(d.defaclacl) a
where d.defaclrole = 'postgres'::regrole
  and d.defaclnamespace = 'public'::regnamespace
  and a.grantee = 'anon'::regrole;

-- 9) Confirm temporary incident audio is stored in the intended private bucket.
--    The expected bucket is private, limited to 8 MB, and accepts only the
--    configured browser audio formats. The storage policies are administrator-only.
select
  b.id as bucket_id,
  b.public as is_public,
  b.file_size_limit,
  b.allowed_mime_types,
  (select count(*) from pg_policies p
    where p.schemaname = 'storage'
      and p.tablename = 'objects'
      and (
        coalesce(p.qual, '') ilike '%discipline-temp-audio%'
        or coalesce(p.with_check, '') ilike '%discipline-temp-audio%'
      )
  ) as matching_storage_policy_count
from storage.buckets b
where b.id = 'discipline-temp-audio';

select
  policyname,
  cmd,
  roles,
  qual,
  with_check
from pg_policies
where schemaname = 'storage'
  and tablename = 'objects'
  and (
    coalesce(qual, '') ilike '%discipline-temp-audio%'
    or coalesce(with_check, '') ilike '%discipline-temp-audio%'
  )
order by policyname;
