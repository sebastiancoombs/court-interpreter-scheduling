// Metabase SSO sidecar — reverse-proxies Metabase at :METABASE_SSO_PORT/metabase/*,
// auto-mints a Metabase session for the proxied user, AND injects the unified
// JCC topbar into every HTML response so Metabase wears the same chrome as
// bcgov + EA.
//
// Skip topbar injection when the request includes `?layout=embed` or the
// `X-Embedded-In` header — leaves Metabase bare for iframe consumption.
//
// Auto-login model:
//   - If a Supabase JWT is present, verify it; reject on invalid.
//   - Mint (and cache) a Metabase session by POST /api/session with the
//     shared service-account email/password configured via env. Inject
//     `Cookie: metabase.SESSION=<id>` on the upstream request and set the
//     same cookie on the response so the browser stores it for follow-ups.
//
// This is the OSS-Metabase path. For Pro/Enterprise deploys with paid JWT
// SSO, swap the cached-session pattern for a per-request POST to
// /api/session/sso?jwt=<signed-jwt> using a per-user JWT minted by the
// auth-bridge. The interceptor surface stays identical.

import express from 'express';
import { createProxyMiddleware, responseInterceptor } from 'http-proxy-middleware';
import { env } from '../shared/env.ts';
import { verifySupabaseJwt } from '../shared/jwt.ts';
import { renderTopbar } from './topbar.ts';

const app = express();

const METABASE_AUTOLOGIN_EMAIL    = process.env.METABASE_AUTOLOGIN_EMAIL    ?? 'admin@cis.local';
const METABASE_AUTOLOGIN_PASSWORD = process.env.METABASE_AUTOLOGIN_PASSWORD ?? 'cisadminpw';
// Metabase sessions default to 14 days (1 209 600 s); refresh a day early.
const SESSION_LIFETIME_MS = 13 * 24 * 60 * 60 * 1000;

let cachedSession: { id: string; expiresAt: number } | null = null;

async function getOrCreateSession(): Promise<string | null> {
  if (cachedSession && Date.now() < cachedSession.expiresAt) return cachedSession.id;
  try {
    const res = await fetch(`${env.metabase.siteUrl}/api/session`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ username: METABASE_AUTOLOGIN_EMAIL, password: METABASE_AUTOLOGIN_PASSWORD }),
    });
    if (!res.ok) {
      console.warn(`[metabase-sso] auto-login HTTP ${res.status} — falling back to anonymous proxy`);
      return null;
    }
    const json: any = await res.json();
    if (typeof json?.id !== 'string') return null;
    cachedSession = { id: json.id, expiresAt: Date.now() + SESSION_LIFETIME_MS };
    console.log(`[metabase-sso] auto-login ok; cached session ${json.id.slice(0, 8)}…`);
    return json.id;
  } catch (e) {
    console.warn('[metabase-sso] auto-login error:', e);
    return null;
  }
}

// Serve a health endpoint outside the /metabase prefix so the cohesion test
// can hit it without going through the proxy.
app.get('/health', (_req, res) => res.json({ ok: true }));

app.use('/metabase', async (req, res, next) => {
  const auth = (req.headers.authorization ?? '').replace(/^Bearer\s+/i, '');
  const cookie = req.headers.cookie ?? '';
  const sessionPresent = /metabase\.SESSION=/.test(cookie);

  // If a JWT was supplied, verify it. Reject on invalid; the user must
  // re-authenticate with Supabase. Absent JWT is fine — we still do the
  // shared-account auto-login below.
  if (auth) {
    try { await verifySupabaseJwt(auth); }
    catch (e) { return res.status(401).json({ error: 'invalid_supabase_jwt' }); }
  }

  if (!sessionPresent) {
    const sessionId = await getOrCreateSession();
    if (sessionId) {
      // Inject the cookie on the upstream request so Metabase sees the
      // user as logged-in for THIS request. Setting the same cookie on
      // the response means the browser keeps it for follow-ups.
      req.headers.cookie = cookie ? `${cookie}; metabase.SESSION=${sessionId}` : `metabase.SESSION=${sessionId}`;
      res.cookie('metabase.SESSION', sessionId, {
        path:     '/',
        httpOnly: true,
        sameSite: 'lax',
      });
    }
  }

  next();
});

const isHtml = (contentType: string | undefined): boolean =>
  !!contentType && contentType.toLowerCase().includes('text/html');

const shouldSkipInjection = (req: express.Request): boolean => {
  if (req.query.layout === 'embed') return true;
  if (req.headers['x-embedded-in']) return true;
  return false;
};

app.use(
  '/metabase',
  createProxyMiddleware({
    target: env.metabase.siteUrl,
    changeOrigin: true,
    pathRewrite: { '^/metabase': '' },
    selfHandleResponse: true,
    on: {
      proxyRes: responseInterceptor(async (responseBuffer, proxyRes, req) => {
        if (!isHtml(proxyRes.headers['content-type'])) return responseBuffer;
        if (shouldSkipInjection(req as express.Request)) return responseBuffer;

        const html = responseBuffer.toString('utf8');
        const topbar = renderTopbar({ active: 'reports' });

        // Inject CSS link in <head>, topbar markup right after <body>.
        // Use replace-once semantics so we don't double-inject if Metabase
        // ever sends nested <head>/<body> tags in templates.
        const cssLink = `<link rel="stylesheet" href="${env.authBridge.topbarCssUrl}">`;
        const inlineCss =
          `<style id="cis-metabase-overrides">` +
          `nav.Nav, .Nav, [data-testid="main-navbar-root"]{display:none!important;}` +
          `body{padding-top:0!important;}` +
          `</style>`;

        let out = html;
        if (out.includes('</head>')) {
          out = out.replace('</head>', `${cssLink}${inlineCss}</head>`);
        } else {
          out = `${cssLink}${inlineCss}${out}`;
        }
        if (out.includes('<body')) {
          // insert after the opening <body ...> tag
          out = out.replace(/<body\b[^>]*>/i, (match) => `${match}${topbar}`);
        } else {
          out = `${topbar}${out}`;
        }
        return out;
      }),
    },
  })
);

const port = env.ports.metabaseSso;
app.listen(port, () => console.log(`[metabase-sso] proxying ${env.metabase.siteUrl} on :${port} — injecting unified topbar`));
