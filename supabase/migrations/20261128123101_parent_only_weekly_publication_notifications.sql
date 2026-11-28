-- Notify active linked parent accounts when a weekly result is first published.
-- Students access results through the Parent Portal; there are no student logins.

create or replace function public.admin_publish_weekly_results(p_week_start date)
returns jsonb
language plpgsql
security definer
set search_path to 'public', 'private'
as $function$
declare
  v_week_end date;
  v_count integer;
  v_notified integer := 0;
  v_newly_published uuid[];
begin
  if auth.uid() is null or not private.is_admin() then
    raise exception 'Administrator permission required.' using errcode='42501';
  end if;

  if p_week_start is null or extract(isodow from p_week_start) <> 1 then
    raise exception 'Choose a Monday as the week start date.';
  end if;

  v_week_end := p_week_start + 6;

  -- Snapshot students whose results have not previously been published.
  select coalesce(array_agg(s.id), array[]::uuid[])
    into v_newly_published
  from public.students s
  left join public.weekly_results wr
    on wr.student_id = s.id
   and wr.week_start = p_week_start
   and wr.published_at is not null
  where s.is_active = true
    and wr.student_id is null;

  insert into public.weekly_results(
    student_id, week_start, week_end, total_awards, total_deductions,
    total_received, total_transferred, weekly_net, lifetime_balance,
    calculated_at, published_at
  )
  select
    s.id, p_week_start, v_week_end,
    coalesce(sum(t.amount) filter(where t.transaction_type='award'),0)::integer,
    coalesce(sum(t.amount) filter(where t.transaction_type='deduction'),0)::integer,
    coalesce(sum(t.amount) filter(where t.transaction_type in ('transfer_in','appreciation')),0)::integer,
    coalesce(sum(t.amount) filter(where t.transaction_type='transfer_out'),0)::integer,
    coalesce(sum(t.balance_delta),0)::integer,
    s.starting_marks + coalesce((
      select sum(alltx.balance_delta)
      from public.mark_transactions alltx
      where alltx.student_id = s.id
    ),0)::integer,
    now(), now()
  from public.students s
  left join public.mark_transactions t
    on t.student_id = s.id
   and t.occurred_at >= (p_week_start::timestamp at time zone 'Asia/Kolkata')
   and t.occurred_at < ((v_week_end + 1)::timestamp at time zone 'Asia/Kolkata')
  where s.is_active = true
  group by s.id, s.starting_marks
  on conflict(student_id, week_start) do update set
    week_end = excluded.week_end,
    total_awards = excluded.total_awards,
    total_deductions = excluded.total_deductions,
    total_received = excluded.total_received,
    total_transferred = excluded.total_transferred,
    weekly_net = excluded.weekly_net,
    lifetime_balance = excluded.lifetime_balance,
    calculated_at = now(),
    published_at = now();

  get diagnostics v_count = row_count;

  if coalesce(cardinality(v_newly_published), 0) > 0 then
    insert into public.notifications(
      recipient_user_id, title, message, related_student_id
    )
    select recipients.recipient_user_id,
      'Weekly results published',
      'The official weekly results for ' || p_week_start::text || ' to ' ||
        v_week_end::text || ' are now available in the DISCIPLINE portal.',
      recipients.student_id
    from (
      select distinct l.parent_user_id as recipient_user_id, l.student_id
      from public.parent_student_links l
      join public.profiles p
        on p.user_id = l.parent_user_id
       and p.role = 'parent'::public.app_role
       and p.is_active = true
      where l.student_id = any(v_newly_published)

        and sa.user_id is not null
    ) recipients;

    get diagnostics v_notified = row_count;
  end if;

  return jsonb_build_object(
    'week_start', p_week_start,
    'week_end', v_week_end,
    'students_published', v_count,
    'notifications_sent', v_notified
  );
end;
$function$;
