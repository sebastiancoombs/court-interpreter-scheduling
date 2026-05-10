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
    db: {
      host: req('EA_DB_HOST'),
      port: parseInt(opt('EA_DB_PORT', '3306'), 10),
      database: req('EA_DB_NAME'),
      user: req('EA_DB_USER'),
      password: req('EA_DB_PASSWORD'),
    },
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
};
