/**
 * MySQL-isms scanner — walks every companion in the repo (EA, bcgov,
 * integration, metabase-sso, supabase, docker, docs) and produces a punch
 * list of every code location that uses MySQL-specific SQL.
 *
 * Output:
 *   - Pretty CLI report grouped by subsystem + severity
 *   - integration/tests/ea-mysql-scan.report.json — machine-readable punch list
 *
 * Re-run the scanner after patches; entries disappear as code is fixed. When
 * blockers across all subsystems hit zero, the stack is structurally
 * Postgres-ready (modulo a smoke test against a real Postgres connection).
 *
 * Severity:
 *   blocker   — will fail on Postgres at runtime or migration time
 *   review    — likely portable but format/casing/edge cases need a human
 *   cosmetic  — MySQL mention in comments / strings, no functional impact
 */

import { readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { dirname } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(__dirname, '..', '..');
const REPORT_PATH = join(__dirname, 'ea-mysql-scan.report.json');

// Top-level directories the scanner walks. Each becomes a subsystem in the
// grouped report. Anything not listed here is skipped at the root.
const SCAN_ROOTS: Array<{ name: string; path: string }> = [
  { name: 'easyappointments', path: 'easyappointments/application' },
  { name: 'integration',      path: 'integration' },
  { name: 'web (bcgov)',      path: 'web/src' },
  { name: 'api (bcgov)',      path: 'api' },
  { name: 'supabase',         path: 'supabase' },
  { name: 'mock-api',         path: 'mock-api' },
  { name: 'docker',           path: 'docker' },
  { name: 'docs',             path: 'docs' },
];

type Severity = 'blocker' | 'review' | 'cosmetic';

interface Pattern {
  id: string;
  severity: Severity;
  description: string;
  // Pattern matched against a single line of source (with the file's full
  // contents available in `context` if needed).
  test: RegExp;
  // Suggested Postgres equivalent — empty string when manual review needed.
  suggestion: string;
}

const PATTERNS: Pattern[] = [
  {
    id: 'engine-innodb',
    severity: 'blocker',
    description: 'ENGINE=InnoDB is MySQL-only; Postgres rejects it as a syntax error',
    test: /ENGINE\s*=?\s*['"]?InnoDB/i,
    suggestion: 'Drop the ENGINE clause. CI dbforge for postgre ignores it but the raw query path includes it.',
  },
  {
    id: 'drop-foreign-key',
    severity: 'blocker',
    description: 'DROP FOREIGN KEY is MySQL syntax; Postgres uses DROP CONSTRAINT',
    test: /DROP\s+FOREIGN\s+KEY/i,
    suggestion: 'Replace with `ALTER TABLE … DROP CONSTRAINT <name>`. Add a dialect-aware helper to EA_Migration.',
  },
  {
    id: 'add-fk-raw',
    severity: 'blocker',
    description: 'Raw `ADD CONSTRAINT … FOREIGN KEY` with backtick identifiers — backticks fail on Postgres',
    test: /ADD\s+CONSTRAINT[^\n;]*FOREIGN\s+KEY/i,
    suggestion: 'Use a dialect-aware helper that emits double-quoted identifiers for postgre.',
  },
  {
    id: 'backtick-identifiers',
    severity: 'blocker',
    description: 'Backtick-quoted identifiers in raw SQL — Postgres uses double quotes',
    test: /\$this->db->query\([^)]*`/,
    suggestion: 'Replace `name` with "name" (or use Query Builder which handles quoting per-driver).',
  },
  {
    id: 'on-duplicate-key',
    severity: 'blocker',
    description: 'ON DUPLICATE KEY UPDATE is MySQL-only',
    test: /ON\s+DUPLICATE\s+KEY/i,
    suggestion: 'Rewrite as `INSERT … ON CONFLICT (col) DO UPDATE SET …` for Postgres.',
  },
  {
    id: 'mysql-fn-ifnull',
    severity: 'blocker',
    description: 'IFNULL() — Postgres uses COALESCE()',
    test: /\bIFNULL\s*\(/i,
    suggestion: 'IFNULL(x, y) → COALESCE(x, y)',
  },
  {
    id: 'mysql-fn-unix-timestamp',
    severity: 'blocker',
    description: 'UNIX_TIMESTAMP() — Postgres has no direct equivalent',
    test: /\bUNIX_TIMESTAMP\s*\(/i,
    suggestion: 'UNIX_TIMESTAMP(ts) → EXTRACT(EPOCH FROM ts)::bigint; UNIX_TIMESTAMP() → EXTRACT(EPOCH FROM NOW())::bigint',
  },
  {
    id: 'mysql-fn-group-concat',
    severity: 'blocker',
    description: 'GROUP_CONCAT() — Postgres uses STRING_AGG()',
    test: /\bGROUP_CONCAT\s*\(/i,
    suggestion: 'GROUP_CONCAT(x) → STRING_AGG(x::text, \',\')',
  },
  {
    id: 'mysql-fn-date-format',
    severity: 'review',
    description: 'DATE_FORMAT() — Postgres uses TO_CHAR with different format-string syntax',
    test: /\bDATE_FORMAT\s*\(/i,
    suggestion: 'Manual translation: MySQL %Y-%m-%d → Postgres YYYY-MM-DD; %H:%i:%s → HH24:MI:SS; etc.',
  },
  {
    id: 'mysql-fn-str-to-date',
    severity: 'review',
    description: 'STR_TO_DATE() — Postgres uses TO_TIMESTAMP/TO_DATE with different format strings',
    test: /\bSTR_TO_DATE\s*\(/i,
    suggestion: 'STR_TO_DATE(s, fmt) → TO_TIMESTAMP(s, fmt) with format-string translation.',
  },
  {
    id: 'mysql-fn-find-in-set',
    severity: 'blocker',
    description: 'FIND_IN_SET() — no Postgres equivalent',
    test: /\bFIND_IN_SET\s*\(/i,
    suggestion: 'FIND_IN_SET(needle, csv) → needle = ANY(string_to_array(csv, \',\'))',
  },
  {
    id: 'mysql-limit-comma',
    severity: 'review',
    description: 'MySQL `LIMIT offset, count` — Postgres requires `LIMIT count OFFSET offset`',
    test: /\bLIMIT\s+\d+\s*,\s*\d+/i,
    suggestion: 'LIMIT a, b → LIMIT b OFFSET a (or use $this->db->limit($count, $offset) which is dialect-aware).',
  },
  {
    id: 'mysql-charset-utf8',
    severity: 'review',
    description: 'CHARACTER SET / COLLATE in DDL — MySQL syntax, ignored or invalid on Postgres',
    // Anchor to ALTER/CREATE/CONVERT TO context so we don't trip on i18n strings.
    test: /(?:ALTER\s+TABLE|CREATE\s+TABLE|CONVERT\s+TO)[^\n;]*?(?:CHARACTER\s+SET|COLLATE\s+\w+)/i,
    suggestion: 'Drop the clause for Postgres (server-level encoding handles this).',
  },
  {
    id: 'mysql-auto-increment-keyword',
    severity: 'review',
    description: 'AUTO_INCREMENT keyword in raw SQL (dbforge handles it via attribute, raw queries do not)',
    test: /\bAUTO_INCREMENT\b/,
    suggestion: 'In raw SQL: replace with GENERATED BY DEFAULT AS IDENTITY or SERIAL.',
  },
  {
    id: 'mysql-comment-mention',
    severity: 'cosmetic',
    description: 'Code comment mentions MySQL/MariaDB — purely informational',
    test: /\/[\/\*][^\n]*\b(MySQL|MariaDB|mysqli)\b/i,
    suggestion: '',
  },
];

interface Finding {
  subsystem: string;
  file: string;
  line: number;
  patternId: string;
  severity: Severity;
  excerpt: string;
  suggestion: string;
}

// Source extensions across every companion's stack — PHP (EA), TS/JS
// (integration + web), Python (bcgov api), SQL (supabase migrations + any
// dashboard-bundled queries), JSON/YAML (Metabase dashboard exports + compose
// files), Vue SFCs (bcgov), and Markdown (docs that may quote SQL).
const SCAN_EXTENSIONS = new Set([
  '.php', '.sql', '.py', '.ts', '.js', '.json', '.yml', '.yaml', '.vue', '.md',
]);
// `application/language/*/db_lang.php` carries CodeIgniter's user-facing
// database error message translations ("Unable to set client connection
// character set: %s") — these match the charset regex but are not DDL.
const SKIP_DIRS = new Set([
  'logs', 'cache', 'storage', 'vendor', 'node_modules',
  'language', 'dist', 'build', '__pycache__', '.git',
  // Alembic auto-generates env.py/versions/*.py for bcgov api; those are
  // already Postgres-targeted, so include them in scanning. No skip.
]);
// Specific files that legitimately contain MySQL syntax — they're the
// dialect shims themselves, so flagging their internals is a false positive.
const SKIP_FILES = new Set<string>([
  'easyappointments/application/core/EA_Migration.php',
]);

function* walk(dir: string): Generator<string> {
  let entries: string[];
  try { entries = readdirSync(dir); } catch { return; }
  for (const entry of entries) {
    if (SKIP_DIRS.has(entry)) continue;
    const full = join(dir, entry);
    let st: ReturnType<typeof statSync>;
    try { st = statSync(full); } catch { continue; }
    if (st.isDirectory()) yield* walk(full);
    else if (st.isFile()) {
      const dot = entry.lastIndexOf('.');
      if (dot >= 0 && SCAN_EXTENSIONS.has(entry.slice(dot))) yield full;
    }
  }
}

function scan(): Finding[] {
  const findings: Finding[] = [];
  // Skip the scanner itself + its own report file; both naturally match the
  // patterns we declare and we'd otherwise flag ourselves on every run.
  const SELF = relative(REPO_ROOT, fileURLToPath(import.meta.url));
  const REPORT_REL = relative(REPO_ROOT, REPORT_PATH);
  for (const root of SCAN_ROOTS) {
    const absRoot = join(REPO_ROOT, root.path);
    let entries: Generator<string>;
    try { entries = walk(absRoot); }
    catch { continue; }
    for (const file of entries) {
      const rel = relative(REPO_ROOT, file);
      if (rel === SELF || rel === REPORT_REL || SKIP_FILES.has(rel)) continue;
      let lines: string[];
      try { lines = readFileSync(file, 'utf8').split('\n'); }
      catch { continue; }
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        for (const p of PATTERNS) {
          if (p.test.test(line)) {
            findings.push({
              subsystem: root.name,
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
  }
  return findings;
}

function summarize(findings: Finding[]): {
  bySeverity: Record<Severity, number>;
  byPattern: Record<string, number>;
  byFile: Record<string, number>;
  bySubsystem: Record<string, Record<Severity, number>>;
} {
  const bySeverity = { blocker: 0, review: 0, cosmetic: 0 } as Record<Severity, number>;
  const byPattern: Record<string, number> = {};
  const byFile: Record<string, number> = {};
  const bySubsystem: Record<string, Record<Severity, number>> = {};
  for (const f of findings) {
    bySeverity[f.severity]++;
    byPattern[f.patternId] = (byPattern[f.patternId] ?? 0) + 1;
    byFile[f.file] = (byFile[f.file] ?? 0) + 1;
    bySubsystem[f.subsystem] ??= { blocker: 0, review: 0, cosmetic: 0 };
    bySubsystem[f.subsystem][f.severity]++;
  }
  return { bySeverity, byPattern, byFile, bySubsystem };
}

function color(sev: Severity, s: string): string {
  const c = sev === 'blocker' ? '\x1b[31m' : sev === 'review' ? '\x1b[33m' : '\x1b[90m';
  return `${c}${s}\x1b[0m`;
}

function main() {
  const findings = scan();
  const summary = summarize(findings);

  console.log('\n\x1b[1mMySQL-isms scanner — cross-companion Postgres-port punch list\x1b[0m');
  console.log(`Roots scanned: ${SCAN_ROOTS.map((r) => r.path).join(', ')}\n`);

  console.log('\x1b[1mBy severity (overall)\x1b[0m');
  for (const s of ['blocker', 'review', 'cosmetic'] as Severity[]) {
    console.log(`  ${color(s, s.padEnd(9))} ${summary.bySeverity[s]}`);
  }

  console.log('\n\x1b[1mBy subsystem\x1b[0m');
  // Iterate every walked root so clean subsystems still appear with a ✓ — that
  // way the report explicitly confirms which companions are Postgres-clean,
  // not just which ones have outstanding work.
  for (const root of SCAN_ROOTS) {
    const sev = summary.bySubsystem[root.name] ?? { blocker: 0, review: 0, cosmetic: 0 };
    const tag = sev.blocker > 0 ? '\x1b[31m✗\x1b[0m' : sev.review > 0 ? '\x1b[33m~\x1b[0m' : '\x1b[32m✓\x1b[0m';
    console.log(`  ${tag} ${root.name.padEnd(20)} blocker=${String(sev.blocker).padStart(3)}  review=${String(sev.review).padStart(3)}  cosmetic=${String(sev.cosmetic).padStart(3)}`);
  }

  console.log('\n\x1b[1mBy pattern\x1b[0m');
  const patternRows = Object.entries(summary.byPattern).sort((a, b) => b[1] - a[1]);
  for (const [id, count] of patternRows) {
    const p = PATTERNS.find((x) => x.id === id)!;
    console.log(`  ${color(p.severity, String(count).padStart(4))}  ${id.padEnd(28)} ${p.description}`);
  }

  console.log('\n\x1b[1mTop affected files\x1b[0m');
  const fileRows = Object.entries(summary.byFile).sort((a, b) => b[1] - a[1]).slice(0, 15);
  for (const [file, count] of fileRows) {
    console.log(`  ${String(count).padStart(4)}  ${file}`);
  }

  // Write the machine-readable report so the punch list survives between
  // runs and a follow-up patch session can grep through it.
  const report = {
    generatedAt: new Date().toISOString(),
    roots: SCAN_ROOTS.map((r) => r.path),
    summary,
    findings: findings.sort((a, b) => {
      if (a.severity !== b.severity) {
        const order: Record<Severity, number> = { blocker: 0, review: 1, cosmetic: 2 };
        return order[a.severity] - order[b.severity];
      }
      if (a.file !== b.file) return a.file.localeCompare(b.file);
      return a.line - b.line;
    }),
  };
  writeFileSync(REPORT_PATH, JSON.stringify(report, null, 2));

  console.log(`\nWrote ${findings.length} findings to ${relative(REPO_ROOT, REPORT_PATH)}`);
  console.log(
    summary.bySeverity.blocker === 0
      ? '\n\x1b[32m✓ No blockers — EA source is structurally Postgres-ready.\x1b[0m\n'
      : `\n\x1b[31m✗ ${summary.bySeverity.blocker} blockers remaining; EA will fail on Postgres until these are patched.\x1b[0m\n`
  );

  // Non-zero exit when blockers exist so this can be wired into CI later.
  if (summary.bySeverity.blocker > 0) process.exit(1);
}

main();
