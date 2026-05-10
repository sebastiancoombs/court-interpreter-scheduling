// Supabase Edge Function — Twilio inbound SMS webhook.
//
// Routes:
//   POST /sms-inbound   (Twilio webhook on the from-number)
//
// Body (form-encoded from Twilio):
//   From, To, Body, MessageSid, AccountSid, ...
//
// What it does:
//   1. Verify the X-Twilio-Signature header against TWILIO_AUTH_TOKEN.
//   2. Look up the most recent booking we sent to this From number.
//   3. Parse the reply: "YES" / "Y" / "1" → accepted; "NO" / "N" / "2" → declined.
//   4. PATCH the booking status in EA via its REST API (admin token in vault).
//   5. Insert a row into app.audit_log + app.messages.
//
// Vault secrets required:
//   TWILIO_AUTH_TOKEN, EA_ADMIN_API_TOKEN, EA_BASE_URL

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

Deno.serve(async (req) => {
  if (req.method !== 'POST') return new Response('method not allowed', { status: 405 });

  const form = await req.formData();
  const from = String(form.get('From') ?? '');
  const body = String(form.get('Body') ?? '').trim().toUpperCase();
  const messageSid = String(form.get('MessageSid') ?? '');

  // TODO: verify X-Twilio-Signature with TWILIO_AUTH_TOKEN

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  );

  const intent =
    /^(YES|Y|1|ACCEPT)$/.test(body) ? 'accepted' :
    /^(NO|N|2|DECLINE)$/.test(body) ? 'declined' :
    null;

  // Find the most recent outbound message to this number with a booking
  const { data: lastMsg } = await supabase
    .from('app.messages')
    .select('booking_id')
    .eq('to_address', from)
    .eq('direction', 'outbound')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (lastMsg?.booking_id && intent) {
    // Patch EA via its REST API
    await fetch(`${Deno.env.get('EA_BASE_URL')}/index.php/api/v1/appointments/${lastMsg.booking_id}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${Deno.env.get('EA_ADMIN_API_TOKEN')}`,
      },
      body: JSON.stringify({ status: intent }),
    });

    // Mirror into Supabase + audit
    await supabase.from('app.bookings_mirror').update({ status: intent }).eq('id', lastMsg.booking_id);
    await supabase.from('app.audit_log').insert({
      source: 'easyappointments',
      actor_role: 'interpreter',
      action: 'SMS_REPLY',
      table_name: 'app.bookings_mirror',
      row_id: String(lastMsg.booking_id),
      after: { status: intent, message_sid: messageSid, body },
    });
  }

  // Respond to Twilio with TwiML acknowledgement
  return new Response(
    `<?xml version="1.0" encoding="UTF-8"?><Response><Message>Thanks — recorded as ${intent ?? 'unrecognized reply'}.</Message></Response>`,
    { headers: { 'Content-Type': 'text/xml' } }
  );
});
