// Supabase Edge Function — runs on pg_cron schedule.
// Finds interpreter certifications expiring in the next 30/60/90 days
// and queues outbound SMS + email notifications.
//
// Schedule (in supabase/migrations/.../seed_cron.sql):
//   select cron.schedule('cert-expirations-daily', '0 13 * * *',  -- 6am Pacific
//     $$ select net.http_post(url := '<edge_function_url>', ... ); $$ );

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

Deno.serve(async () => {
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  );

  const { data: rows, error } = await supabase
    .from('app.documents')
    .select('id, owner_user_id, kind, expires_on, app.profiles!inner(email, phone)')
    .lte('expires_on', new Date(Date.now() + 90 * 86400000).toISOString().slice(0, 10))
    .gte('expires_on', new Date().toISOString().slice(0, 10));

  if (error) return new Response(error.message, { status: 500 });

  for (const row of rows ?? []) {
    // TODO: send SMS via Twilio, email via Resend
    // TODO: insert app.messages row + audit_log entry
    console.log('expiring soon:', row);
  }

  return new Response(JSON.stringify({ checked: rows?.length ?? 0 }), {
    headers: { 'Content-Type': 'application/json' },
  });
});
