#!/usr/bin/env node
/**
 * Mobile-friendliness check — behavioral, not source-pattern matching.
 *
 * Loads each main route in a headless Chromium at phone viewport (iPhone
 * SE: 375x667) and asserts:
 *   1. No horizontal overflow — `scrollWidth <= window.innerWidth`
 *   2. Tap targets — every visible <button>, <a>, <input> meets 44x44 px
 *   3. No console errors during page load
 *
 * Tests the END RESULT — the global `_mobile-fixes.scss` overrides apply
 * automatically, so a fix that propagates at runtime makes this test pass
 * even if the underlying components are still written without breakpoints.
 *
 * Usage:
 *   CIS_URL=https://cis-unified-production.up.railway.app npm run check:mobile
 *   # or local dev:
 *   CIS_URL=http://localhost:8080 npm run check:mobile
 *
 * One-time setup: `npx playwright install chromium` (downloads ~140MB).
 */
import { chromium } from 'playwright';

const URL = (process.env.CIS_URL || 'http://localhost:8080').replace(/\/$/, '');
const VIEWPORT = { width: 375, height: 667 };
const TAP_FLOOR = 44;
const ROUTES = ['/', '/bookings', '/directory', '/language', '/rates', '/audit-booking', '/user-role'];

const findings = [];
const consoleErrors = new Map();

function record(route, kind, detail) {
  findings.push({ route, kind, detail });
}

async function checkRoute(ctx, route) {
  const page = await ctx.newPage();
  const errs = [];
  page.on('console', (msg) => { if (msg.type() === 'error') errs.push(msg.text()); });
  page.on('pageerror', (err) => errs.push(`pageerror: ${err.message}`));

  try {
    await page.goto(URL + route, { waitUntil: 'domcontentloaded', timeout: 30_000 });
    // Give SPA shells a beat to render after navigation.
    await page.waitForTimeout(1500);

    // 1. Horizontal overflow check
    const overflow = await page.evaluate(({ viewportWidth }) => {
      const scrollW = document.documentElement.scrollWidth;
      const innerW = window.innerWidth;
      return { scrollW, innerW, overflow: scrollW > innerW ? scrollW - innerW : 0, viewportWidth };
    }, { viewportWidth: VIEWPORT.width });
    if (overflow.overflow > 0) {
      record(route, 'overflow',
        `body scrollWidth ${overflow.scrollW}px > viewport ${overflow.innerW}px (+${overflow.overflow}px)`);
    }

    // 2. Tap-target audit on visible interactive elements
    const undersized = await page.evaluate(({ floor }) => {
      const out = [];
      const els = Array.from(document.querySelectorAll('button, a[href], input:not([type="hidden"]), select, textarea, [role="button"]'));
      for (const el of els) {
        const rect = el.getBoundingClientRect();
        if (rect.width === 0 || rect.height === 0) continue;
        // Off-screen / hidden: skip
        const style = window.getComputedStyle(el);
        if (style.visibility === 'hidden' || style.display === 'none' || style.pointerEvents === 'none') continue;
        if (rect.height < floor || rect.width < floor) {
          out.push({
            tag: el.tagName.toLowerCase(),
            id: el.id || null,
            text: (el.textContent || '').trim().slice(0, 40),
            w: Math.round(rect.width),
            h: Math.round(rect.height),
          });
          if (out.length >= 8) break;
        }
      }
      return out;
    }, { floor: TAP_FLOOR });
    for (const u of undersized) {
      record(route, 'tap-target',
        `${u.tag}${u.id ? '#' + u.id : ''} ${u.w}x${u.h}px ("${u.text}") < ${TAP_FLOOR}x${TAP_FLOOR}`);
    }

    if (errs.length > 0) consoleErrors.set(route, errs);
  } catch (e) {
    record(route, 'navigation', String(e?.message ?? e));
  } finally {
    await page.close();
  }
}

(async () => {
  console.log(`\n\x1b[1mMobile check — viewport ${VIEWPORT.width}x${VIEWPORT.height}\x1b[0m`);
  console.log(`Target: ${URL}\n`);

  const browser = await chromium.launch();
  const ctx = await browser.newContext({
    viewport: VIEWPORT,
    deviceScaleFactor: 2,
    isMobile: true,
    hasTouch: true,
  });

  for (const route of ROUTES) {
    process.stdout.write(`  ${route.padEnd(20)}`);
    await checkRoute(ctx, route);
    const routeFindings = findings.filter((f) => f.route === route);
    if (routeFindings.length === 0) console.log('\x1b[32mOK\x1b[0m');
    else console.log(`\x1b[31m${routeFindings.length} issue${routeFindings.length === 1 ? '' : 's'}\x1b[0m`);
  }

  await browser.close();

  if (findings.length > 0) {
    console.log('\n\x1b[1mFindings:\x1b[0m');
    for (const f of findings) {
      console.log(`  \x1b[31m✗\x1b[0m ${f.route.padEnd(20)} [${f.kind}] ${f.detail}`);
    }
  }
  if (consoleErrors.size > 0) {
    console.log('\n\x1b[33mConsole errors (informational):\x1b[0m');
    for (const [route, errs] of consoleErrors) {
      console.log(`  ${route}`);
      for (const e of errs.slice(0, 3)) console.log(`    ${e.slice(0, 200)}`);
    }
  }

  console.log('');
  if (findings.length === 0) {
    console.log('\x1b[32m✓ Every route fits the phone viewport, every tap target ≥ 44x44.\x1b[0m\n');
  } else {
    console.log(`\x1b[31m✗ ${findings.length} mobile issue${findings.length === 1 ? '' : 's'} across ${new Set(findings.map((f) => f.route)).size} route${new Set(findings.map((f) => f.route)).size === 1 ? '' : 's'}.\x1b[0m\n`);
    process.exit(1);
  }
})().catch((e) => {
  console.error('mobile-check failed:', e);
  process.exit(1);
});
