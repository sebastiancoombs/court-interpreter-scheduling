import 'dotenv/config';

function req(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Missing required env var: ${name}`);
  return v;
}
function opt(name: string, fallback = ''): string {
  return process.env[name] ?? fallback;
}

export const env = {
  supabase: {
    url: req('SUPABASE_URL'),
    anonKey: opt('SUPABASE_ANON_KEY'),
    serviceRoleKey: req('SUPABASE_SERVICE_ROLE_KEY'),
    jwtSecret: req('SUPABASE_JWT_SECRET'),
  },
  ea: {
    baseUrl: req('EA_BASE_URL'),
    adminToken: opt('EA_ADMIN_API_TOKEN'),
    // EA now reads from the same Postgres instance as the rest of the
    // stack — the `db` block here is kept only for legacy callers (e.g.,
    // the deprecated ea-sync worker). New code should use the unified
    // `database.url` Postgres connection below.
    db: {
      host: opt('EA_DB_HOST', 'postgres'),
      port: parseInt(opt('EA_DB_PORT', '5432'), 10),
      database: opt('EA_DB_NAME', 'easyappointments'),
      user: opt('EA_DB_USER', 'easyappointments'),
      password: opt('EA_DB_PASSWORD', 'easyappointments'),
    },
  },
  // Single Postgres connection shared across EA, Metabase (separate
  // database in the same instance), and Supabase-Cloud-mirrored writes.
  database: {
    url: opt(
      'DATABASE_URL',
      'postgres://easyappointments:easyappointments@postgres:5432/easyappointments',
    ),
  },
  bcgov: { baseUrl: opt('BCGOV_BASE_URL', 'http://localhost:8080') },
  metabase: {
    siteUrl: req('METABASE_SITE_URL'),
    embeddingSecret: opt('METABASE_EMBEDDING_SECRET'),
  },
  ports: {
    authBridge: parseInt(opt('AUTH_BRIDGE_PORT', '8090'), 10),
    metabaseSso: parseInt(opt('METABASE_SSO_PORT', '8091'), 10),
    eaSync: parseInt(opt('EA_SYNC_PORT', '8092'), 10),
  },
  authBridge: {
    topbarCssUrl: opt(
      'TOPBAR_CSS_URL',
      `http://localhost:${parseInt(opt('AUTH_BRIDGE_PORT', '8090'), 10)}/topbar.css`,
    ),
  },
};
