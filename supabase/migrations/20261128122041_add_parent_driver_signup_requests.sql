-- Public self-registration is a request only. It never creates an Auth user,
-- activates a portal profile, or links a parent/driver to student records.
create table if not exists public.portal_signup_requests (
  id uuid primary key default gen_random_uuid(),
  display_name text not null check (char_length(btrim(display_name)) between 2 and 100),
  email text not null check (
    email = lower(btrim(email))
    and char_length(email) <= 254
    and email ~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'
  ),
  role text not null check (role in ('parent', 'driver')),
  phone text null check (phone is null or char_length(phone) <= 30),
  status text not null default 'pending'
    check (status in ('pending', 'reviewed', 'declined', 'fulfilled')),
  reviewed_at timestamptz null,
  reviewed_by uuid null references public.profiles(user_id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists portal_signup_requests_status_created_idx
  on public.portal_signup_requests (status, created_at desc);

-- Prevent repeated pending/reviewed submissions for the same email and role.
create unique index if not exists portal_signup_requests_one_open_per_email_role
  on public.portal_signup_requests (lower(email), role)
  where status in ('pending', 'reviewed');

alter table public.portal_signup_requests enable row level security;
revoke all on table public.portal_signup_requests from anon, authenticated;
grant all on table public.portal_signup_requests to service_role;

comment on table public.portal_signup_requests is
  'Private public-registration requests. Active portal accounts and student/route links are created only by an administrator.';
