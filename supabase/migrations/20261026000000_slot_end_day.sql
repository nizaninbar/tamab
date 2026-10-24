-- A slot can span days within the week: (day, start_time) → (end_day, end_time).
alter table public.schedule_slots add column end_day smallint;
update public.schedule_slots set end_day = day;
alter table public.schedule_slots alter column end_day set not null;

alter table public.schedule_slots drop constraint schedule_slots_check;
alter table public.schedule_slots add constraint schedule_slots_span_check
  check (end_day between 0 and 6 and (end_day > day or (end_day = day and end_time > start_time)));
