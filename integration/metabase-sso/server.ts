// Metabase SSO sidecar — reverse-proxies Metabase at :METABASE_SSO_PORT/metabase/*,
// auto-provisions a Metabase session from a Supabase JWT (TODO), AND injects
// the unified JCC topbar into every HTML response so Metabase wears the same
// chrome as bcgov + EA.
//
// Skip topbar injection when the request includes `?layout=embed` or the
// `X-Embedded-In` header — leaves Metabase bare for iframe consumption.

import express from 'express';
import { createProxyMiddleware, responseInterceptor } from 'http-proxy-middleware';
import { env } from '../shared/env.ts';
import { verifySupabaseJwt } from '../shared/jwt.ts';
import { renderTopbar } from './topbar.ts';

const app = express();

// Serve a health endpoint outside the /metabase prefix so the cohesion test
// can hit it without going through the proxy.
app.get('/health', (_req, res) => res.json({ ok: true }));

app.use('/metabase', async (req, res, next) => {
  const auth = (req.headers.authorization ?? '').replace(/^Bearer\s+/i, '');
  const cookie = req.headers.cookie ?? '';
  const sessionPresent = /metabase\.SESSION=/.test(cookie);

  if (!sessionPresent && auth) {
    try {
      await verifySupabaseJwt(auth);
      // TODO: POST /api/session to Metabase with bridge JWT, receive metabase.SESSION cookie,
      //       attach to res via Set-Cookie before proxying.
    } catch (e) {
      return res.status(401).json({ error: 'invalid_supabase_jwt' });
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
