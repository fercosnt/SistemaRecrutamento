#!/usr/bin/env node
/**
 * assert-no-secrets.mjs — the DELIV-02 build-output secret gate.
 *
 * Asserts that `npm run build` produced a public bundle carrying NO Resend
 * provider credential or endpoint. Reads ONLY the local `build/` output — no
 * untrusted input, no network, no eval — the same security posture as the
 * sibling assert-chunks.mjs: a security gate must never itself be a vector.
 *
 * Runs under the BUILD gate, NOT Vitest (`scripts/**` is excluded in vite.config.ts).
 * Invoke standalone: `node scripts/assert-no-secrets.mjs`. Chained FIRST in the
 * package.json `postbuild` (security before performance — if something leaked, the
 * chunk size is irrelevant) and re-run as a dedicated step in the CI `e2e` job so a
 * leak emits a clean, distinct failure signal.
 *
 * The 4 assertions (DELIV-02):
 *   1. No Resend API key of the documented shape `re_<id>_<secret>` in any text asset.
 *   2. No `re_`-prefixed long token — a format-drift safety net for a future key shape.
 *   3. No `api.resend.com` endpoint literal — the provider is called only from an
 *      Edge Function, never from the browser.
 *   4. No `RESEND_API_KEY` identifier — its presence means a VITE_-style inline.
 *
 * Hard-fail conditions (a gate that cannot verify must NOT pass silently):
 *   - `build/` missing or unreadable  -> exit 1, telling you to build first.
 *   - zero text files scanned         -> exit 1.
 *   - any pattern match               -> exit 1, all hits collected (no early abort).
 *
 * SAFETY: a hit is reported MASKED — relative path, byte offset, pattern name, match
 * length and AT MOST the first 4 characters. The matched value is NEVER printed: a
 * GitHub Actions log is retained and broadly readable, it is not a secret store.
 *
 * META-TEST — proves this gate is real and not a no-op (re-runnable at any time):
 *
 *   npm run build
 *   printf 're_c1tpEyD8_REDACTED_P36_SYNTHETIC' > build/__meta_test_secret.js
 *   node scripts/assert-no-secrets.mjs; echo "exit=$?"   # MUST print exit=1
 *   rm -f build/__meta_test_secret.js
 *   node scripts/assert-no-secrets.mjs; echo "exit=$?"   # MUST print exit=0
 *
 * The planted string is the public example key from the Resend documentation — it is
 * NOT a live credential. Never plant a real key here.
 *
 * @see .planning/phases/36-deliverability-sender-identity/36-RESEARCH.md (Q5 contract; Pitfalls 4-7)
 * @see scripts/assert-chunks.mjs (sibling build-output gate, PERF-03)
 */
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join, dirname, relative } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const REPO_ROOT = join(__dirname, '..')

// vite.config.ts:123 -> `outDir: 'build'`. Pointing this gate anywhere the build never
// writes would make it pass forever while verifying nothing (RESEARCH Pitfall 6), which
// is why the missing-directory branch below is a hard failure rather than a skip.
const BUILD_DIR = join(REPO_ROOT, 'build')

// Binary extensions are skipped; EVERYTHING else is scanned — html, js, css, svg, json,
// map, webmanifest and anything copied from public/. A leak in index.html is still a leak,
// so the walk is NOT limited to build/assets/*.
const BINARY_EXT = /\.(png|jpe?g|gif|webp|avif|ico|svgz|woff2?|ttf|otf|eot|mp4|webm|pdf|zip)$/i

// Resend key shape observed in the official docs: re_<8-12>_<24+>. The leading \b is
// load-bearing (RESEARCH Pitfall 4): without it, minified identifiers such as
// `measure_something` contain `re_something` and the gate is red on the first honest build.
const PATTERNS = [
  { name: 'resend-api-key', re: /\bre_[A-Za-z0-9]{6,12}_[A-Za-z0-9]{16,}\b/g },
  { name: 'resend-key-formatdrift', re: /\bre_[A-Za-z0-9_]{28,}\b/g },
  { name: 'resend-endpoint', re: /api\.resend\.com/g },
  { name: 'resend-key-identifier', re: /RESEND_API_KEY/g },
]
// NOTE: the sending domain is DELIBERATELY absent from PATTERNS (RESEARCH Pitfall 5).
// `recruta.beautysmile.com.br` already ships legitimately in the bundle — see
// src/components/pages/CriarEditarVagaPage.tsx:565 (slug preview), ErrorBoundary.tsx:202
// and AutorizacoesStep.tsx:188 (mailto links). Adding it here would make the gate red
// forever, and a gate that is always red gets deleted. Only key/endpoint/identifier.

const failures = []
const notes = []
const textFiles = []

function kb(bytes) {
  return `${(bytes / 1024).toFixed(2)} kB`
}

/** Mask a match: at most the first 4 characters, never the value. */
function mask(value) {
  return `${value.slice(0, 4)}...`
}

function walk(dir) {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry)
    const st = statSync(full)
    if (st.isDirectory()) walk(full)
    else if (st.isFile() && !BINARY_EXT.test(entry)) textFiles.push({ path: full, bytes: st.size })
  }
}

// --- Read the build output (a missing build/ FAILS, it never passes) --------
try {
  walk(BUILD_DIR)
} catch {
  console.error(
    `\n✗ assert-no-secrets: could not read ${BUILD_DIR}\n` +
      `  Run \`npm run build\` first, then re-run \`node scripts/assert-no-secrets.mjs\`.\n` +
      `  A secret gate that cannot read the build output must fail, not pass (DELIV-02).\n`,
  )
  process.exit(1)
}

if (textFiles.length === 0) {
  console.error(
    `\n✗ assert-no-secrets: 0 text files found under ${BUILD_DIR}\n` +
      `  Run \`npm run build\` first. Scanning nothing is not a green build (DELIV-02).\n`,
  )
  process.exit(1)
}

// --- Human-readable inventory (a visible "0 files scanned" is the antidote to
//     a silent no-op) ------------------------------------------------------
const byExt = new Map()
for (const f of textFiles) {
  const ext = /\.([A-Za-z0-9]+)$/.exec(f.path)?.[1].toLowerCase() ?? '(none)'
  const acc = byExt.get(ext) ?? { count: 0, bytes: 0 }
  acc.count += 1
  acc.bytes += f.bytes
  byExt.set(ext, acc)
}
console.log('\nassert-no-secrets — build/ text-asset inventory:')
for (const [ext, { count, bytes }] of [...byExt].sort((a, b) => b[1].bytes - a[1].bytes)) {
  console.log(`  ${String(count).padStart(4)} .${ext.padEnd(12)} ${kb(bytes).padStart(12)}`)
}
console.log(`  ${textFiles.length} files scanned\n`)

// --- Scan every text asset against every pattern (collect all hits) --------
let bytesRead = 0
for (const file of textFiles) {
  const rel = relative(REPO_ROOT, file.path)
  let source
  try {
    source = readFileSync(file.path, 'utf8')
  } catch {
    failures.push(`✗ unreadable: ${rel} — the gate could not verify this asset (DELIV-02).`)
    continue
  }
  bytesRead += Buffer.byteLength(source, 'utf8')

  for (const { name, re } of PATTERNS) {
    re.lastIndex = 0
    let m
    while ((m = re.exec(source)) !== null) {
      const byteOffset = Buffer.byteLength(source.slice(0, m.index), 'utf8')
      failures.push(
        `✗ ${name}: ${rel} @byte ${byteOffset} (${m[0].length} chars, starts "${mask(m[0])}") — ` +
          `a Resend credential or endpoint reached the public bundle (DELIV-02).`,
      )
      if (m[0].length === 0) re.lastIndex += 1
    }
  }
}

notes.push(`✓ ${textFiles.length} text assets scanned (${kb(bytesRead)} read) under build/.`)
notes.push(`✓ ${PATTERNS.length} patterns applied: ${PATTERNS.map((p) => p.name).join(', ')}.`)

// --- Report ----------------------------------------------------------------
for (const n of notes) console.log(n)
if (failures.length > 0) {
  console.error('\nassert-no-secrets FAILED:')
  for (const f of failures) console.error(`  ${f}`)
  console.error(
    '\n  Matches are shown masked on purpose — inspect the offending file locally, never\n' +
      '  the CI log. Fix: the provider key lives ONLY in the Supabase Vault and is read\n' +
      '  server-side by an Edge Function. Never expose it through a VITE_-prefixed env\n' +
      '  var, and never call the provider API from the browser (DELIV-02 / DELIV-03).\n',
  )
  process.exit(1)
}

console.log('\n✓ assert-no-secrets PASSED — no Resend key/endpoint in the public bundle (DELIV-02).\n')
process.exit(0)
