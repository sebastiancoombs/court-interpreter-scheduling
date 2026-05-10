// Auth bridge — verifies a Supabase JWT and exchanges it for downstream
// session tokens (EA cookie, Metabase JWT, bcgov passthrough).

import { Hono } from 'hono';
import { serve } from '@hono/node-server';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { env } from '../shared/env.ts';
import { admin } from '../shared/supabase.ts';
import { verifySupabaseJwt, signMetabaseJwt } from '../shared/jwt.ts';

const __dirname = dirname(fileURLToPath(import.meta.url));
const TOPBAR_CSS = readFileSync(join(__dirname, '..', 'topbar', 'topbar.css'), 'utf8');

const app = new Hono();

// Serve the unified topbar stylesheet so every subsystem (bcgov, EA,
// metabase) loads its chrome from one place. CORS open since bcgov is on
// :8080, EA on :8085, metabase on :8088.
app.get('/topbar.css', (c) => {
  c.header('Access-Control-Allow-Origin', '*');
  c.header('Cache-Control', 'public, max-age=60');
  c.header('Content-Type', 'text/css; charset=utf-8');
  return c.body(TOPBAR_CSS);
});

// Helper — pull "Authorization: Bearer …" off the request
async function requireUser(c: any) {
  const auth = c.req.header('authorization') ?? '';
  const token = auth.replace(/^Bearer\s+/i, '');
  if (!token) return null;
  try {
    return await verifySupabaseJwt(token);
  } catch {
    return null;
  }
}

app.get('/health', (c) => c.json({ ok: true }));

app.get('/me', async (c) => {
  const user = await requireUser(c);
  if (!user) return c.json({ error: 'unauthorized' }, 401);

  const { data: profile } = await admin.from('profiles').select('*').eq('user_id', user.sub).maybeSingle();
  const { data: roles } = await admin.from('roles').select('role, court_id').eq('user_id', user.sub);

  return c.json({ user, profile, roles });
});

// Exchange Supabase JWT → Easy!Appointments session cookie
app.post('/exchange/ea', async (c) => {
  const user = await requireUser(c);
  if (!user) return c.json({ error: 'unauthorized' }, 401);

  const { data: profile } = await admin.from('profiles').select('ea_user_id').eq('user_id', user.sub).maybeSingle();
  if (!profile?.ea_user_id) return c.json({ error: 'no_ea_link' }, 404);

  // TODO: call EA's admin API to mint a session for the linked ea_user_id.
  // EA does not ship native JWT auth, so this uses a service-account flow:
  //   1. Acquire EA admin session via EA_ADMIN_API_TOKEN.
  //   2. POST /api/v1/sessions/impersonate { user_id }  (custom EA plugin we add).
  //   3. Receive Set-Cookie: ea_session=…
  return c.json({ todo: 'ea_session_exchange', ea_user_id: profile.ea_user_id });
});

// Exchange Supabase JWT → Metabase embedding JWT
app.post('/exchange/metabase', async (c) => {
  const user = await requireUser(c);
  if (!user) return c.json({ error: 'unauthorized' }, 401);

  const { data: profile } = await admin.from('profiles').select('email, display_name, metabase_user_id').eq('user_id', user.sub).maybeSingle();
  if (!profile) return c.json({ error: 'no_profile' }, 404);

  const token = await signMetabaseJwt({
    email: profile.email,
    first_name: profile.display_name?.split(' ')[0] ?? 'User',
    last_name: profile.display_name?.split(' ').slice(1).join(' ') ?? '',
    groups: ['interpreters-program'],
  });

  return c.json({ token, expires_in: 600 });
});

const port = env.ports.authBridge;
serve({ fetch: app.fetch, port });
console.log(`[auth-bridge] listening on :${port}`);
