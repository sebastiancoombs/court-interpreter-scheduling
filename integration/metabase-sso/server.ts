// Metabase SSO sidecar — auto-provisions a Metabase session from a Supabase JWT.
// Sits in front of Metabase as a reverse proxy at :8091/metabase/* → http://metabase:3000/*

import express from 'express';
import { createProxyMiddleware } from 'http-proxy-middleware';
import { env } from '../shared/env.ts';
import { verifySupabaseJwt } from '../shared/jwt.ts';

const app = express();

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

app.use(
  '/metabase',
  createProxyMiddleware({
    target: env.metabase.siteUrl,
    changeOrigin: true,
    pathRewrite: { '^/metabase': '' },
  })
);

app.get('/health', (_req, res) => res.json({ ok: true }));

const port = env.ports.metabaseSso;
app.listen(port, () => console.log(`[metabase-sso] proxying ${env.metabase.siteUrl} on :${port}`));
