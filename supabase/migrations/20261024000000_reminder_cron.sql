-- Hourly call to the send-reminders Edge Function. The function itself decides
-- whether the current Israel day/hour matches `settings`.
-- Needs a vault secret named 'cron_secret' equal to the CRON_SECRET function secret
-- (created out of band, never committed).
create extension if not exists pg_cron;
create extension if not exists pg_net;

select cron.schedule(
  'send-reminders-hourly',
  '0 * * * *',
  $$
  select net.http_post(
    url := 'https://vhaonognazlgibohxioe.supabase.co/functions/v1/send-reminders',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-cron-secret', (select decrypted_secret from vault.decrypted_secrets where name = 'cron_secret')
    ),
    body := '{}'::jsonb
  );
  $$
);
