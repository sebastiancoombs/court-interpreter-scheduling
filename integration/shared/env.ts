import { config as loadDotenv } from 'dotenv';
import { dirname, resolve } from 'node:path';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

// Load env files in priority order:
//   1. integration/.env             (this package's local config)
//   2. <repo-root>/.env.local       (cross-package secrets — Supabase keys etc.)
// `dotenv.config` doesn't override values that already exist in process.env,
// so the order means later files only fill in gaps. Both files are gitignored.
const here = dirname(fileURLToPath(import.meta.url));
loadDotenv({ path: resolve(here, '..', '.env') });
const repoEnvLocal = resolve(here, '..', '..', '.env.local');
if (existsSync(repoEnvLocal)) loadDotenv({ path: repoEnvLocal });

// Alias common Next.js / Vite frontend conventions to the bare names our
// backend reads. Lets a single .env.local serve both the SPA and the
// integration services without copy-paste.
const ALIASES: Record<string, string[]> = {
  SUPABASE_URL:      ['NEXT_PUBLIC_SUPABASE_URL', 'VITE_SUPABASE_URL', 'VUE_APP_SUPABASE_URL'],
  SUPABASE_ANON_KEY: ['NEXT_PUBLIC_SUPABASE_ANON_KEY', 'VITE_SUPABASE_ANON_KEY', 'VUE_APP_SUPABASE_ANON_KEY'],
};
for (const [canonical, aliases] of Object.entries(ALIASES)) {
  if (process.env[canonical]) continue;
  for (const a of aliases) if (process.env[a]) { process.env[canonical] = process.env[a]; break; }
}

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
    // JWKS URL for asymmetric-signing projects (the default for new
    // Supabase projects). Falls back to deriving from SUPABASE_URL.
    jwksUrl: opt(
      'SUPABASE_JWKS_URL',
      `${process.env.SUPABASE_URL ?? ''}/auth/v1/.well-known/jwks.json`,
    ),
    // Optional — only set on legacy projects that still sign HS256, or
    // for cohesion-test self-signed tokens.
    jwtSecret: opt('SUPABASE_JWT_SECRET'),
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
