-- Teachers see all gaps of their group's students, also from private reports.
-- Only the gap text is exposed; report RLS is unchanged.
create function public.group_gaps()
returns table (id uuid, description text, student_id uuid, student_name text, week_start date, teacher_name text)
  language sql stable security definer set search_path = '' as $$
  select g.id, g.description, s.id, s.full_name, r.week_start, p.full_name
  from public.report_gaps g
  join public.students s on s.id = g.student_id
  join public.weekly_reports r on r.id = g.report_id
  join public.profiles p on p.id = r.teacher_id
  where r.submitted_at is not null and s.group_id = public.my_group()
$$;

revoke execute on function public.group_gaps() from public, anon;
grant execute on function public.group_gaps() to authenticated;
