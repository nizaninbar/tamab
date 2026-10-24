-- RLS checks. Run on a local DB: psql "$DB_URL" -f supabase/tests/rls.sql   (rolls back)
begin;

insert into public.groups (id, name) values
  ('00000000-0000-0000-0000-0000000000a1', 'A'), ('00000000-0000-0000-0000-0000000000b1', 'B');
insert into auth.users (id, instance_id, aud, role) values
  ('00000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-000000000000','authenticated','authenticated'),
  ('00000000-0000-0000-0000-000000000002','00000000-0000-0000-0000-000000000000','authenticated','authenticated'),
  ('00000000-0000-0000-0000-000000000003','00000000-0000-0000-0000-000000000000','authenticated','authenticated'),
  ('00000000-0000-0000-0000-000000000009','00000000-0000-0000-0000-000000000000','authenticated','authenticated');
insert into public.profiles (id, full_name, role, group_id) values
  ('00000000-0000-0000-0000-000000000001','T1','teacher','00000000-0000-0000-0000-0000000000a1'),
  ('00000000-0000-0000-0000-000000000002','T2','teacher','00000000-0000-0000-0000-0000000000a1'),
  ('00000000-0000-0000-0000-000000000003','T3','teacher','00000000-0000-0000-0000-0000000000b1'),
  ('00000000-0000-0000-0000-000000000009','Admin','admin',null);
insert into public.weekly_reports (teacher_id, week_start, is_private) values
  ('00000000-0000-0000-0000-000000000002','2026-10-18', true),
  ('00000000-0000-0000-0000-000000000002','2026-10-25', false);
insert into public.students (id, group_id, full_name) values
  ('00000000-0000-0000-0000-0000000000c1','00000000-0000-0000-0000-0000000000a1','SA'),
  ('00000000-0000-0000-0000-0000000000c2','00000000-0000-0000-0000-0000000000b1','SB');
-- gap on T2's private report (group A)
insert into public.report_gaps (report_id, student_id, description)
  select r.id, '00000000-0000-0000-0000-0000000000c1', 'gap A'
  from public.weekly_reports r where r.teacher_id = '00000000-0000-0000-0000-000000000002' and r.is_private;
update public.weekly_reports set submitted_at = now();
insert into public.weekly_schedules (teacher_id, week_start) values
  ('00000000-0000-0000-0000-000000000002','2026-10-25');

create function pg_temp.as_user(uid text) returns void language plpgsql as $$
begin
  perform set_config('request.jwt.claims', json_build_object('sub', uid, 'role', 'authenticated')::text, true);
  set local role authenticated;
end $$;

do $$
declare n int;
begin
  -- T1 (same group as T2): sees only T2's public report
  perform pg_temp.as_user('00000000-0000-0000-0000-000000000001');
  select count(*) into n from public.weekly_reports;
  assert n = 1, 'T1 should see exactly 1 report, got ' || n;
  select count(*) into n from public.weekly_schedules;
  assert n = 1, 'T1 should see all schedules';
  select count(*) into n from public.group_gaps();
  assert n = 1, 'T1 should see the same-group gap from a private report, got ' || n;
  reset role;

  -- T3 (other group): sees no reports, cannot promote self, cannot read access_links
  perform pg_temp.as_user('00000000-0000-0000-0000-000000000003');
  select count(*) into n from public.weekly_reports;
  assert n = 0, 'T3 must not see other group reports, got ' || n;
  begin
    update public.profiles set role = 'admin' where id = auth.uid();
    assert false, 'T3 promoted itself';
  exception when raise_exception then null;
  end;
  select count(*) into n from public.access_links;
  assert n = 0, 'access_links must be hidden';
  select count(*) into n from public.group_gaps();
  assert n = 0, 'T3 must not see other group gaps, got ' || n;
  reset role;

  -- anon cannot call group_gaps()
  set local role anon;
  begin
    perform public.group_gaps();
    assert false, 'anon executed group_gaps()';
  exception when insufficient_privilege then null;
  end;
  reset role;

  -- Admin sees all
  perform pg_temp.as_user('00000000-0000-0000-0000-000000000009');
  select count(*) into n from public.weekly_reports;
  assert n = 2, 'admin should see all reports';
  reset role;

  raise notice 'RLS tests passed';
end $$;

rollback;
