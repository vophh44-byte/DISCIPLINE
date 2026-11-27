-- DISCIPLINE authenticated-role RLS smoke test
-- Read-only: both simulated Auth contexts run inside transactions and roll back.
-- Run as the database migration owner (normally postgres) in Supabase SQL Editor.
-- The output includes aggregate row counts only; it does not return names or IDs.
-- This evaluates PostgreSQL RLS for existing parent/admin profiles. It is not a
-- substitute for signing into the website with separate browser accounts.

-- Parent portal: only the linked child's records and the parent's own profile/link
-- should be visible. Incident evidence is admin-only and must remain hidden.
begin;
select length(set_config(
  'request.jwt.claim.sub',
  (select user_id::text from public.profiles
   where role = 'parent' and is_active = true
   order by created_at limit 1),
  true
)) > 0 as parent_context_loaded;
select length(set_config('request.jwt.claim.role', 'authenticated', true)) > 0 as role_context_loaded;
set local role authenticated;
select jsonb_build_object(
  'portal_role', private.current_app_role()::text,
  'visible_profiles', (select count(*) from public.profiles),
  'visible_students', (select count(*) from public.students),
  'visible_mark_transactions', (select count(*) from public.mark_transactions),
  'visible_parent_links', (select count(*) from public.parent_student_links),
  'visible_incidents', (select count(*) from public.incidents),
  'visible_incident_evidence', (select count(*) from public.incident_evidence),
  'visible_weekly_results', (select count(*) from public.weekly_results)
) as parent_rls_result;
rollback;

-- Administrator portal: the active administrator should see all existing
-- application records needed for administration.
begin;
select length(set_config(
  'request.jwt.claim.sub',
  (select user_id::text from public.profiles
   where role = 'admin' and is_active = true
   order by created_at limit 1),
  true
)) > 0 as admin_context_loaded;
select length(set_config('request.jwt.claim.role', 'authenticated', true)) > 0 as role_context_loaded;
set local role authenticated;
select jsonb_build_object(
  'portal_role', private.current_app_role()::text,
  'visible_profiles', (select count(*) from public.profiles),
  'visible_students', (select count(*) from public.students),
  'visible_mark_transactions', (select count(*) from public.mark_transactions),
  'visible_parent_links', (select count(*) from public.parent_student_links),
  'visible_incidents', (select count(*) from public.incidents),
  'visible_incident_evidence', (select count(*) from public.incident_evidence)
) as admin_rls_result;
rollback;

-- Check the available roles for remaining manual browser tests.
select
  count(*) filter (where role = 'student' and is_active = true) as active_student_accounts,
  count(*) filter (where role = 'parent' and is_active = true) as active_parent_accounts,
  count(*) filter (where role = 'driver' and is_active = true) as active_driver_accounts
from public.profiles;
