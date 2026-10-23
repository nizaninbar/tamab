-- tamab schema + RLS

create table public.groups (
  id uuid primary key default gen_random_uuid(),
  name text not null
);

create table public.profiles (
  id uuid primary key references auth.users on delete cascade,
  full_name text not null,
  role text not null default 'teacher' check (role in ('admin', 'teacher')),
  group_id uuid references public.groups on delete set null,
  avatar_emoji text not null default '🌸'
);

create table public.students (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.groups on delete cascade,
  full_name text not null,
  active boolean not null default true
);

create table public.weekly_reports (
  id uuid primary key default gen_random_uuid(),
  teacher_id uuid not null references public.profiles on delete cascade,
  week_start date not null,
  taught text not null default '',
  mood smallint check (mood between 1 and 10),
  notes text not null default '',
  is_private boolean not null default true,
  submitted_at timestamptz,
  unique (teacher_id, week_start)
);

create table public.report_gaps (
  id uuid primary key default gen_random_uuid(),
  report_id uuid not null references public.weekly_reports on delete cascade,
  student_id uuid not null references public.students on delete cascade,
  description text not null check (length(btrim(description)) > 0)
);

create table public.weekly_schedules (
  id uuid primary key default gen_random_uuid(),
  teacher_id uuid not null references public.profiles on delete cascade,
  week_start date not null,
  unique (teacher_id, week_start)
);

create table public.schedule_slots (
  id uuid primary key default gen_random_uuid(),
  schedule_id uuid not null references public.weekly_schedules on delete cascade,
  day smallint not null check (day between 0 and 6),
  start_time time not null,
  end_time time not null,
  note text not null check (length(btrim(note)) > 0),
  check (end_time > start_time)
);

create table public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles on delete cascade,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null
);

-- Hashed personal login links; only touched by Edge Functions (service role).
create table public.access_links (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles on delete cascade,
  token_hash text not null unique,
  created_at timestamptz not null default now(),
  revoked_at timestamptz
);

create table public.settings (
  id smallint primary key default 1 check (id = 1),
  reminder_day smallint not null default 4 check (reminder_day between 0 and 6),
  reminder_time time not null default '09:00',
  timezone text not null default 'Asia/Jerusalem'
);
insert into public.settings (id) values (1);

create index on public.profiles (group_id);
create index on public.students (group_id);
create index on public.report_gaps (report_id);
create index on public.report_gaps (student_id);
create index on public.schedule_slots (schedule_id);
create index on public.push_subscriptions (user_id);
create index on public.access_links (user_id);

-- Helpers (security definer so policies don't recurse into profiles RLS)
create function public.is_admin() returns boolean
  language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
$$;

create function public.my_group() returns uuid
  language sql stable security definer set search_path = '' as $$
  select group_id from public.profiles where id = auth.uid()
$$;

-- Non-admins may not change their own role or group
create function public.guard_profile_update() returns trigger
  language plpgsql security definer set search_path = '' as $$
begin
  if not public.is_admin() and (new.role <> old.role or new.group_id is distinct from old.group_id) then
    raise exception 'not allowed to change role or group';
  end if;
  return new;
end $$;
create trigger guard_profile_update before update on public.profiles
  for each row execute function public.guard_profile_update();

-- RLS
alter table public.groups enable row level security;
alter table public.profiles enable row level security;
alter table public.students enable row level security;
alter table public.weekly_reports enable row level security;
alter table public.report_gaps enable row level security;
alter table public.weekly_schedules enable row level security;
alter table public.schedule_slots enable row level security;
alter table public.push_subscriptions enable row level security;
alter table public.access_links enable row level security;
alter table public.settings enable row level security;

-- Admin: everything (access_links: no policies, service role only)
do $$
declare t text;
begin
  foreach t in array array['groups','profiles','students','weekly_reports','report_gaps',
    'weekly_schedules','schedule_slots','push_subscriptions','settings'] loop
    execute format('create policy admin_all on public.%I for all to authenticated
      using (public.is_admin()) with check (public.is_admin())', t);
  end loop;
end $$;

-- groups / settings: readable by any signed-in user
create policy groups_read on public.groups for select to authenticated using (true);
create policy settings_read on public.settings for select to authenticated using (true);

-- profiles: everyone signed in sees names (needed for schedules); edit own
create policy profiles_read on public.profiles for select to authenticated using (true);
create policy profiles_update_own on public.profiles for update to authenticated
  using (id = auth.uid()) with check (id = auth.uid());

-- students: own group only
create policy students_read on public.students for select to authenticated
  using (group_id = public.my_group());

-- reports: own CRUD; read public ones from same group
create policy reports_own on public.weekly_reports for all to authenticated
  using (teacher_id = auth.uid()) with check (teacher_id = auth.uid());
create policy reports_group_public on public.weekly_reports for select to authenticated
  using (
    not is_private
    and (select p.group_id from public.profiles p where p.id = teacher_id) = public.my_group()
  );

create policy gaps_own on public.report_gaps for all to authenticated
  using (exists (select 1 from public.weekly_reports r where r.id = report_id and r.teacher_id = auth.uid()))
  with check (
    exists (select 1 from public.weekly_reports r where r.id = report_id and r.teacher_id = auth.uid())
    and exists (select 1 from public.students s where s.id = student_id and s.group_id = public.my_group())
  );
create policy gaps_group_public on public.report_gaps for select to authenticated
  using (exists (
    select 1 from public.weekly_reports r
    join public.profiles p on p.id = r.teacher_id
    where r.id = report_id and not r.is_private and p.group_id = public.my_group()
  ));

-- schedules: own CRUD; all signed-in teachers can read everyone's
create policy schedules_own on public.weekly_schedules for all to authenticated
  using (teacher_id = auth.uid()) with check (teacher_id = auth.uid());
create policy schedules_read on public.weekly_schedules for select to authenticated using (true);

create policy slots_own on public.schedule_slots for all to authenticated
  using (exists (select 1 from public.weekly_schedules s where s.id = schedule_id and s.teacher_id = auth.uid()))
  with check (exists (select 1 from public.weekly_schedules s where s.id = schedule_id and s.teacher_id = auth.uid()));
create policy slots_read on public.schedule_slots for select to authenticated using (true);

-- push subscriptions: own
create policy push_own on public.push_subscriptions for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());
