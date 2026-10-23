insert into public.groups (name) values ('קבוצה א'), ('קבוצה ב');

-- Bootstrap the admin once their auth user exists:
--   insert into public.profiles (id, full_name, role)
--   values ('<auth user uuid>', 'מנהלת', 'admin');
