#!/usr/bin/env node
/**
 * Mobile-friendliness scanner for the bcgov Vue codebase.
 * Produces a punch list of every spot likely to break on a phone screen
 * — fixed pixel widths, b-tables missing `responsive`, b-cols missing
 * breakpoint variants, inline px styles, etc.
 *
 * Output:
 *   - Pretty CLI report grouped by severity + file
 *   - web/scripts/mobile-scan.report.json — machine-readable punch list
 *
 * Re-run after edits; entries disappear as the source improves. Zero
 * findings means the source is structurally responsive-ready (still
 * worth eyeballing in a phone emulator).
 *
 * Severity:
 *   blocker   — will overflow / cut content / fail tap targets on a phone
 *   review    — likely fine but a human should glance (e.g. cols=6 no breakpoint)
 *   cosmetic  — quality smell, won't break the layout
 */
import { readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { join, relative, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const WEB_ROOT = join(__dirname, '..');
const SRC_ROOT = join(WEB_ROOT, 'src');
const REPORT_PATH = join(__dirname, 'mobile-scan.report.json');

/** @type {Array<{ id: string, severity: 'blocker' | 'review' | 'cosmetic', description: string, test: RegExp, suggestion: string }>} */
const PATTERNS = [
  {
    id: 'fixed-width-px-large',
    severity: 'blocker',
    description: 'Fixed pixel width ≥ 320px — overflows narrow phone viewports',
    test: /(?:^|[^a-z-])(?:width|min-width)\s*:\s*(?:3[2-9]\d|[4-9]\d{2}|\d{4,})\s*px/i,
    suggestion: 'Use `max-width: 100%` + the desired px as `max-width` only, or switch to rem / percent / vw.',
  },
  {
    id: 'fixed-width-px-small',
    severity: 'review',
    description: 'Fixed pixel width 100-319px — may overflow on the smallest phones',
    test: /(?:^|[^a-z-])(?:width|min-width)\s*:\s*(?:1[0-9]\d|2\d{2}|3[01]\d)\s*px(?!\s*\))/i,
    suggestion: 'Audit on iPhone SE viewport (320px). Switch to max-width or breakpoint media queries.',
  },
  {
    id: 'inline-style-px-dimension',
    severity: 'blocker',
    description: 'Inline `style="...width|height: NNNpx..."` — hardest spot to make responsive',
    test: /style=["'][^"']*(?:width|height|min-width|min-height)\s*:\s*\d{3,}\s*px/i,
    suggestion: 'Move to a scoped class with responsive media queries. Inline styles can\'t be overridden by breakpoints.',
  },
  {
    id: 'btable-no-responsive',
    severity: 'blocker',
    description: '<b-table> missing the `responsive` prop — wide tables overflow on phones',
    test: /<b-table\b(?![^>]*\bresponsive\b)/i,
    suggestion: 'Add `responsive` (or `responsive="md"`) so the table gets a horizontal scrollbar instead of pushing the page wider than the viewport.',
  },
  {
    id: 'bcol-no-breakpoint',
    severity: 'review',
    description: '<b-col cols="N"> without any sm/md/lg breakpoint variant',
    test: /<b-col\b[^>]*\bcols=["']\d+["'](?![^>]*\b(?:xs|sm|md|lg|xl)=)/i,
    suggestion: 'Add a phone-first override: <b-col cols="6" sm="12"> so the column goes full-width below the sm breakpoint.',
  },
  {
    id: 'broken-flex-no-wrap',
    severity: 'review',
    description: 'Flex container without flex-wrap — children stay on one line + overflow',
    test: /(?:^|[^-])display\s*:\s*flex(?:[^;}]*(?!flex-wrap))/i,
    suggestion: 'Add `flex-wrap: wrap` for phone layouts that should stack.',
  },
  {
    id: 'fixed-height-tall',
    severity: 'review',
    description: 'Fixed pixel height ≥ 500px — content gets clipped on landscape phones',
    test: /(?:^|[^a-z-])(?:height|min-height)\s*:\s*(?:[5-9]\d{2}|\d{4,})\s*px/i,
    suggestion: 'Use `min-height: 100vh` or content-driven sizing.',
  },
  {
    id: 'absolute-position-px',
    severity: 'review',
    description: 'Absolutely-positioned element with large px offsets — may render off-screen',
    test: /position\s*:\s*(?:absolute|fixed)[^}]*(?:top|left|right|bottom)\s*:\s*\d{3,}\s*px/i,
    suggestion: 'Use relative units (%, vw, vh) for offsets or constrain to a max breakpoint.',
  },
  {
    id: 'tap-target-small',
    severity: 'review',
    description: 'Button / link with explicit width or height under 44px — fails iOS tap-target guidance',
    test: /(?:button|a|\.btn)[^{]*\{[^}]*(?:width|height)\s*:\s*(?:[1-3]\d|4[0-3])\s*px/i,
    suggestion: 'Minimum 44x44px touch target per Apple HIG. Combine padding + min-height.',
  },
  {
    id: 'font-size-px',
    severity: 'cosmetic',
    description: 'font-size declared in px — does not respect user font-size preferences',
    test: /font-size\s*:\s*\d+(\.\d+)?\s*px/i,
    suggestion: 'Convert to rem (e.g. 14px → 0.875rem; 16px → 1rem). Improves accessibility.',
  },
  {
    id: 'no-viewport-meta',
    severity: 'blocker',
    description: 'index.html missing or wrong `<meta name="viewport">` — phone defaults to desktop zoom',
    test: /<meta\s+name=["']viewport["'](?![^>]*width=device-width)/i,
    suggestion: 'Use `<meta name="viewport" content="width=device-width,initial-scale=1">`.',
  },
];

const SCAN_EXTENSIONS = new Set(['.vue', '.css', '.scss', '.sass', '.less', '.html']);
const SKIP_DIRS = new Set([
  'node_modules', 'dist', 'build', '.git', '.cache',
  // Vendored Bootstrap source ships with intentional pixel widths and
  // is patched by Bootstrap's own responsive utilities — scanning it
  // produces hundreds of false positives.
  'bootstrapCSS',
]);
const SKIP_FILES = new Set([
  // Bcgov ships compiled bootstrap CSS at this path — already gridded.
  'src/styles/bootstrapCSS.css',
  // The scanner script itself.
  'scripts/mobile-scan.mjs',
]);

function* walk(dir) {
  let entries;
  try { entries = readdirSync(dir); } catch { return; }
  for (const entry of entries) {
    if (SKIP_DIRS.has(entry)) continue;
    const full = join(dir, entry);
    let st;
    try { st = statSync(full); } catch { continue; }
    if (st.isDirectory()) yield* walk(full);
    else if (st.isFile()) {
      const dot = entry.lastIndexOf('.');
      if (dot >= 0 && SCAN_EXTENSIONS.has(entry.slice(dot))) yield full;
    }
  }
}

function scan() {
  /** @type {Array<{ file: string, line: number, patternId: string, severity: string, excerpt: string, suggestion: string }>} */
  const findings = [];
  for (const file of walk(SRC_ROOT)) {
    const rel = relative(WEB_ROOT, file);
    if (SKIP_FILES.has(rel)) continue;
    let lines;
    try { lines = readFileSync(file, 'utf8').split('\n'); }
    catch { continue; }
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      for (const p of PATTERNS) {
        if (p.test.test(line)) {
          findings.push({
            file: rel,
            line: i + 1,
            patternId: p.id,
            severity: p.severity,
            excerpt: line.trim().slice(0, 200),
            suggestion: p.suggestion,
          });
        }
      }
    }
  }
  // index.html viewport check — `<meta name="viewport" ...>` is commonly
  // split across multiple lines in HTML, so we read the whole file and
  // collapse whitespace before checking. Single-line regex over lines
  // (as the rest of the scanner does) false-positives here.
  const indexHtml = join(WEB_ROOT, 'public', 'index.html');
  const viewport = PATTERNS.find((p) => p.id === 'no-viewport-meta');
  try {
    const html = readFileSync(indexHtml, 'utf8').replace(/\s+/g, ' ');
    const hasOk = /<meta\s+name=["']viewport["'][^>]*width=device-width/i.test(html);
    if (!hasOk && viewport) {
      findings.push({
        file: relative(WEB_ROOT, indexHtml),
        line: 0,
        patternId: viewport.id,
        severity: viewport.severity,
        excerpt: '<no `width=device-width` viewport meta found>',
        suggestion: viewport.suggestion,
      });
    }
  } catch { /* index.html missing — odd but not the scanner's job to flag */ }
  return findings;
}

function color(sev, s) {
  const c = sev === 'blocker' ? '\x1b[31m' : sev === 'review' ? '\x1b[33m' : '\x1b[90m';
  return `${c}${s}\x1b[0m`;
}

function main() {
  const findings = scan();
  /** @type {Record<string, number>} */
  const byPattern = {};
  /** @type {Record<string, number>} */
  const byFile = {};
  const bySeverity = { blocker: 0, review: 0, cosmetic: 0 };
  for (const f of findings) {
    byPattern[f.patternId] = (byPattern[f.patternId] ?? 0) + 1;
    byFile[f.file] = (byFile[f.file] ?? 0) + 1;
    bySeverity[f.severity]++;
  }

  console.log('\n\x1b[1mbcgov Vue mobile-friendliness scanner\x1b[0m');
  console.log(`Source root: ${relative(WEB_ROOT, SRC_ROOT)}\n`);

  console.log('\x1b[1mBy severity\x1b[0m');
  for (const s of ['blocker', 'review', 'cosmetic']) {
    console.log(`  ${color(s, s.padEnd(9))} ${bySeverity[s]}`);
  }

  console.log('\n\x1b[1mBy pattern\x1b[0m');
  const patternRows = Object.entries(byPattern).sort((a, b) => b[1] - a[1]);
  for (const [id, count] of patternRows) {
    const p = PATTERNS.find((x) => x.id === id);
    console.log(`  ${color(p.severity, String(count).padStart(4))}  ${id.padEnd(28)} ${p.description}`);
  }

  console.log('\n\x1b[1mTop 15 affected files\x1b[0m');
  const fileRows = Object.entries(byFile).sort((a, b) => b[1] - a[1]).slice(0, 15);
  for (const [file, count] of fileRows) console.log(`  ${String(count).padStart(4)}  ${file}`);

  const report = {
    generatedAt: new Date().toISOString(),
    source: relative(WEB_ROOT, SRC_ROOT),
    summary: { bySeverity, byPattern, byFile },
    findings: findings.sort((a, b) => {
      const order = { blocker: 0, review: 1, cosmetic: 2 };
      if (a.severity !== b.severity) return order[a.severity] - order[b.severity];
      if (a.file !== b.file) return a.file.localeCompare(b.file);
      return a.line - b.line;
    }),
  };
  writeFileSync(REPORT_PATH, JSON.stringify(report, null, 2));
  console.log(`\nWrote ${findings.length} findings to ${relative(WEB_ROOT, REPORT_PATH)}`);

  if (bySeverity.blocker === 0) {
    console.log('\n\x1b[32m✓ No mobile blockers — structurally responsive.\x1b[0m\n');
  } else {
    console.log(`\n\x1b[31m✗ ${bySeverity.blocker} blockers will visibly break on a phone — patch before the demo.\x1b[0m\n`);
    process.exit(1);
  }
}

main();
