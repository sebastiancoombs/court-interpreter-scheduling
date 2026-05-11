#!/usr/bin/env node
/**
 * Captures phone-viewport screenshots of every route with a mocked auth
 * session, so the inner admin pages render instead of redirecting to the
 * landing page.
 *
 * Routes every `/api/v1/*` request through Playwright's `route.fulfill()`
 * and returns a permissive super-admin user — enough to satisfy bcgov's
 * `SessionManager.getUserInfo` + the various admin guards. Empty payloads
 * for everything else so the page mounts without throwing.
 *
 * Usage:
 *   CIS_URL=https://cis-unified-production.up.railway.app \
 *     node scripts/mobile-shots.mjs
 */
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';

const BASE = (process.env.CIS_URL || 'http://localhost:8080').replace(/\/$/, '');
const OUT = process.env.CIS_SHOTS_DIR || '/tmp/cis-mobile-shots';
const VIEWPORT = { width: 375, height: 667 };
const ROUTES = ['/', '/bookings', '/create', '/directory', '/language', '/rates', '/audit-booking', '/user-role', '/update-geo'];

// Demo user — matches the shape mock-api/server.js returns. Roles cover
// every bcgov admin guard so the side-nav fully populates.
const NOW = new Date().toISOString();
const DEMO_USER = {
  user_id: 'kai-demo',
  email: 'kai.demo@sdcourt.ca.gov',
  display_name: 'Kai Demo',
  first_name: 'Kai',
  last_name: 'Demo',
  userId: 'kai-demo', // some bcgov guards check this lowercase form
  role: [
    { role_name: 'super-admin' },
    { role_name: 'cis-admin' },
    { role_name: 'cis-user' },
  ],
  location: {
    id: 1, addressLine1: '220 W Broadway', addressLine2: null, city: 'San Diego',
    createdAt: NOW, latitude: 32.7157, locationCode: 'SD', longitude: -117.1611,
    name: 'Hall of Justice', timezone: 'America/Los_Angeles', postalCode: '92101',
    shortDescription: 'San Diego', updatedAt: NOW,
  },
};
const DEMO_TOKEN = { access_token: 'mock-token', expires_at: NOW, logout_url: '/logout', login_url: '/login' };

mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch();
const ctx = await browser.newContext({
  viewport: VIEWPORT,
  deviceScaleFactor: 2,
  isMobile: true,
  hasTouch: true,
});

// Intercept the auth + data endpoints. Returns a permissive payload for
// known shapes, empty array/object for unknown. The page mounts; any data
// table renders an empty state rather than crashing.
await ctx.route('**/api/v1/**', async (route) => {
  const url = route.request().url();
  const path = new URL(url).pathname;
  const json = (body) => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(body) });
  if (path.endsWith('/api/v1/token'))                              return json(DEMO_TOKEN);
  if (path.endsWith('/api/v1/user-info') || path.endsWith('/api/v1/user-info/')) return json(DEMO_USER);
  if (path.endsWith('/api/v1/user-info/all'))                      return json([DEMO_USER]);
  if (path.endsWith('/api/v1/booking'))                            return json({ bookings: [], total: 0 });
  if (path.endsWith('/api/v1/interpreter') || path.endsWith('/api/v1/interpreter/'))   return json([]);
  if (path.endsWith('/api/v1/language'))                           return json([]);
  if (path.endsWith('/api/v1/rate'))                               return json([]);
  if (path.endsWith('/api/v1/location'))                           return json([DEMO_USER.location]);
  if (path.endsWith('/api/v1/court'))                              return json([]);
  // Unknown endpoint: empty object — keeps the v-for / v-if branches happy.
  return json({});
});

console.log(`Capturing ${ROUTES.length} routes at ${VIEWPORT.width}x${VIEWPORT.height} from ${BASE}`);
for (const route of ROUTES) {
  const page = await ctx.newPage();
  const slug = route === '/' ? 'landing' : route.replace(/^\//, '').replace(/\//g, '-');
  const file = join(OUT, `${slug}.png`);
  try {
    await page.goto(BASE + route, { waitUntil: 'domcontentloaded', timeout: 30_000 });
    // Give the SPA a beat after the mocked /token + /user-info round-trip.
    await page.waitForTimeout(2200);
    await page.screenshot({ path: file, fullPage: true });
    console.log(`  ✓ ${slug.padEnd(20)} → ${file}`);
  } catch (e) {
    console.log(`  ✗ ${slug.padEnd(20)} ${String(e?.message ?? e)}`);
  } finally {
    await page.close();
  }
}
await browser.close();
console.log(`\nShots in ${OUT}`);
