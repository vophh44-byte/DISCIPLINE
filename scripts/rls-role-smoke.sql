-- DISCIPLINE authenticated-role RLS smoke test
-- Rollback-only: temporary test records and simulated Auth contexts are rolled back.
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

-- Parent journey portal: create a temporary route, assignment, run and check-in
-- for the linked child, then prove that the authenticated parent can see those
-- four related records. All temporary writes are rolled back at the end.
begin;
with parent_student as materialized (
  select l.parent_user_id, l.student_id
    from public.parent_student_links l
    join public.profiles p
      on p.user_id = l.parent_user_id
     and p.role = 'parent'
     and p.is_active = true
    limit 1
),
driver as materialized (
  select user_id
    from public.profiles
   where is_active = true
   order by created_at
   limit 1
),
parent_guard as materialized (
  select case when exists(select 1 from parent_student)
              then true else 1 / 0 = 0 end as ok
),
driver_guard as materialized (
  select case when exists(select 1 from driver)
              then true else 1 / 0 = 0 end as ok
),
new_route as (
  insert into public.driver_routes(route_name, vehicle_label, driver_user_id, is_active)
  select 'QA Temporary Route', 'QA Vehicle', driver.user_id, true
    from driver cross join driver_guard
  returning id, driver_user_id
),
new_assignment as (
  insert into public.driver_route_students(route_id, student_id, valid_from)
  select new_route.id, parent_student.student_id, (timezone('Asia/Kolkata', now()))::date
    from new_route cross join parent_student cross join parent_guard
  returning route_id, student_id
),
new_run as (
  insert into public.driver_route_runs(route_id, journey_date, journey_type, status, started_by)
  select new_route.id, (timezone('Asia/Kolkata', now()))::date, 'morning', 'in_progress', new_route.driver_user_id
    from new_route
  returning id, route_id
),
new_checkin as (
  insert into public.driver_journey_checkins(
    route_id, student_id, journey_date, journey_type, status, recorded_by, driver_route_run_id
  )
  select new_assignment.route_id, new_assignment.student_id,
         (timezone('Asia/Kolkata', now()))::date, 'morning', 'boarded',
         new_route.driver_user_id, new_run.id
    from new_assignment
    cross join new_run
    cross join new_route
  returning route_id, student_id
)
select
  length(set_config('request.jwt.claim.sub', parent_student.parent_user_id::text, true)) > 0 as parent_context_loaded,
  length(set_config('request.jwt.claim.role', 'authenticated', true)) > 0 as role_context_loaded,
  length(set_config('test.parent_route_id', new_route.id::text, true)) > 0 as route_fixture_loaded,
  length(set_config('test.parent_student_id', parent_student.student_id::text, true)) > 0 as student_fixture_loaded
from parent_student
cross join new_route
where exists(select 1 from new_checkin);
set local role authenticated;
select jsonb_build_object(
  'portal_role', private.current_app_role()::text,
  'visible_linked_route', (
    select count(*) from public.driver_routes
    where id = current_setting('test.parent_route_id')::uuid
  ),
  'visible_linked_assignment', (
    select count(*) from public.driver_route_students
    where route_id = current_setting('test.parent_route_id')::uuid
      and student_id = current_setting('test.parent_student_id')::uuid
  ),
  'visible_linked_route_run', (
    select count(*) from public.driver_route_runs
    where route_id = current_setting('test.parent_route_id')::uuid
  ),
  'visible_linked_driver_checkin', (
    select count(*) from public.driver_journey_checkins
    where route_id = current_setting('test.parent_route_id')::uuid
      and student_id = current_setting('test.parent_student_id')::uuid
  )
) as parent_journey_rls_result;
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
