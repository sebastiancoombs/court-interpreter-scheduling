/**
 * Metabase one-shot setup — completes the /setup/welcome wizard
 * programmatically so a fresh `docker compose up` opens straight to
 * dashboards instead of an empty install screen.
 *
 * Idempotent — if Metabase is already set up (no setup-token returned),
 * exits cleanly with status 0.
 *
 * What it does:
 *   1. Polls Metabase /api/health until it returns ok
 *   2. Reads the setup-token from /api/session/properties
 *   3. POSTs /api/setup with admin user, EA Postgres data source, prefs
 *   4. Stores the resulting session id only as a transient log line
 *
 * Env (with defaults that match docker-compose):
 *   METABASE_SITE_URL              http://metabase:3000
 *   METABASE_ADMIN_EMAIL           admin@cis.local
 *   METABASE_ADMIN_PASSWORD        cisadminpw
 *   METABASE_ADMIN_FIRST_NAME      Court
 *   METABASE_ADMIN_LAST_NAME       Interpreter
 *   METABASE_DB_NAME               EasyAppointments (display name)
 *   METABASE_DB_HOST               postgres
 *   METABASE_DB_PORT               5432
 *   METABASE_DB_DBNAME             easyappointments
 *   METABASE_DB_USER               easyappointments
 *   METABASE_DB_PASSWORD           easyappointments
 */

const env = (k: string, d?: string): string => {
  const v = process.env[k];
  if (v === undefined || v === '') {
    if (d === undefined) throw new Error(`Missing required env var: ${k}`);
    return d;
  }
  return v;
};

const SITE = env('METABASE_SITE_URL', 'http://metabase:3000').replace(/\/$/, '');
const ADMIN = {
  email:       env('METABASE_ADMIN_EMAIL',      'admin@cis.local'),
  password:    env('METABASE_ADMIN_PASSWORD',   'cisadminpw'),
  first_name:  env('METABASE_ADMIN_FIRST_NAME', 'Court'),
  last_name:   env('METABASE_ADMIN_LAST_NAME',  'Interpreter'),
};
const DB = {
  name:     env('METABASE_DB_NAME',     'EasyAppointments'),
  host:     env('METABASE_DB_HOST',     'postgres'),
  port:     parseInt(env('METABASE_DB_PORT', '5432'), 10),
  dbname:   env('METABASE_DB_DBNAME',   'easyappointments'),
  user:     env('METABASE_DB_USER',     'easyappointments'),
  password: env('METABASE_DB_PASSWORD', 'easyappointments'),
};

async function waitForHealth(timeoutMs = 120_000): Promise<void> {
  const deadline = Date.now() + timeoutMs;
  let lastErr: unknown = null;
  while (Date.now() < deadline) {
    try {
      const res = await fetch(`${SITE}/api/health`);
      if (res.ok) return;
      lastErr = new Error(`HTTP ${res.status}`);
    } catch (e) {
      lastErr = e;
    }
    await new Promise((r) => setTimeout(r, 2_000));
  }
  throw new Error(`Metabase /api/health did not come up: ${String(lastErr)}`);
}

async function getSetupToken(): Promise<string | null> {
  const res = await fetch(`${SITE}/api/session/properties`);
  if (!res.ok) throw new Error(`/api/session/properties returned HTTP ${res.status}`);
  const json: any = await res.json();
  return typeof json['setup-token'] === 'string' ? json['setup-token'] : null;
}

async function runSetup(token: string): Promise<void> {
  const body = {
    token,
    user: {
      first_name:        ADMIN.first_name,
      last_name:         ADMIN.last_name,
      email:             ADMIN.email,
      password:          ADMIN.password,
      password_confirm:  ADMIN.password,
      site_name:         'JCC Court Interpreter Scheduling',
    },
    database: {
      engine: 'postgres',
      name:   DB.name,
      details: {
        host:               DB.host,
        port:               DB.port,
        dbname:             DB.dbname,
        user:               DB.user,
        password:           DB.password,
        ssl:                false,
        'tunnel-enabled':   false,
        'advanced-options': false,
      },
      is_full_sync: true,
    },
    prefs: {
      site_name:               'JCC Court Interpreter Scheduling',
      site_locale:             'en',
      allow_tracking:          false,
    },
  };

  const res = await fetch(`${SITE}/api/setup`, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify(body),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`/api/setup returned HTTP ${res.status}: ${text.slice(0, 500)}`);
  }
  const json: any = await res.json().catch(() => ({}));
  console.log(`[metabase-setup] setup complete; admin=${ADMIN.email} session=${json.id ? json.id.slice(0, 8) + '…' : '<n/a>'}`);
}

(async () => {
  console.log(`[metabase-setup] target=${SITE}`);
  await waitForHealth();
  const token = await getSetupToken();
  if (!token) {
    console.log('[metabase-setup] already set up — nothing to do');
    return;
  }
  console.log(`[metabase-setup] running first-time setup with token=${token.slice(0, 8)}…`);
  await runSetup(token);
})().catch((e) => {
  console.error('[metabase-setup] failed:', e);
  process.exit(1);
});
