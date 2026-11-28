-- Keep the database-side email check aligned with the public request validator.
-- Use position/length checks so the constraint does not depend on SQL string
-- escaping for a regular-expression dot.
alter table public.portal_signup_requests
  drop constraint if exists portal_signup_requests_email_check;

alter table public.portal_signup_requests
  add constraint portal_signup_requests_email_check check (
    email = lower(btrim(email))
    and char_length(email) <= 254
    and email !~ '[[:space:]]'
    and length(email) - length(replace(email, '@', '')) = 1
    and position('@' in email) > 1
    and position('.' in split_part(email, '@', 2)) > 1
    and position('.' in split_part(email, '@', 2)) < length(split_part(email, '@', 2))
  );
