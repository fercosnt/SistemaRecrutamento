#!/usr/bin/env node
/**
 * assert-chunks.mjs — the PERF-03 build-output gate harness.
 *
 * Asserts that `npm run build` produced a properly code-split bundle (Plan 19-02's
 * manualChunks + React.lazy route split + call-site dynamic jsPDF import). Reads
 * ONLY the local `build/assets/*.js` output — no untrusted input, no network, no
 * eval (T-19-01-01: pure fs read of git-ignored build output).
 *
 * Runs under the BUILD gate, NOT Vitest (`scripts/**` is excluded in vite.config.ts).
 * Invoke standalone: `node scripts/assert-chunks.mjs`. Plan 19-02 wires it after its
 * `npm run build`. Today (pre-split) it MUST exit non-zero against the monolith,
 * proving it is a real gate, not a no-op.
 *
 * The 4 assertions (RESEARCH L365-373 / Validation Architecture):
 *   1. A `react-vendor-*.js` chunk exists (the narrow stable vendor split).
 *   2. The eager `index-*.js` is SMALLER than the pre-split baseline (2,788.27 kB).
 *   3. jsPDF/autotable bytes are NOT inside the eager `index-*.js` (only in a
 *      separate dynamic chunk reached via `await import('../pdf/exportComparativo')`).
 *   4. Lazy route chunks emit separately from the eager index chunk — heuristic:
 *      the build emits MORE js chunks than the pre-split monolith floor.
 *
 * @see .planning/phases/19-performance-bundle-cache/19-RESEARCH.md (chunk assertion L365-373; baseline 2,788.27 kB)
 * @see .planning/phases/19-performance-bundle-cache/19-PATTERNS.md (build-output assertion L432-440)
 */
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ASSETS_DIR = join(__dirname, '..', 'build', 'assets')

// The pre-split eager monolith size (RESEARCH L372): index-CphRg52V.js = 2,788.27 kB.
// The new eager index chunk MUST be visibly smaller once the split lands.
const BASELINE_INDEX_BYTES = 2_788_270

// Pre-split build floor: the monolith currently emits 4 js chunks
// (index + index.es[recharts] + html2canvas.esm + purify.es). A real route/vendor
// split MUST exceed this (react-vendor + per-page lazy /rh/* /admin/* chunks).
const PRESPLIT_CHUNK_FLOOR = 4

// jsPDF marker strings that must NOT appear in the eager index chunk if jsPDF is
// behind the dynamic import boundary. Kept broad enough to catch the lib's banner.
const JSPDF_MARKERS = ['jspdf', 'jsPDF', 'addImage', 'autoTable']

const failures = []
const notes = []

function kb(bytes) {
  return `${(bytes / 1024).toFixed(2)} kB`
}

// --- Read the build output (tolerate a missing build/) ---------------------
let jsFiles
try {
  jsFiles = readdirSync(ASSETS_DIR).filter((f) => f.endsWith('.js'))
} catch {
  console.error(
    `\n✗ assert-chunks: could not read ${ASSETS_DIR}\n` +
      `  Run \`npm run build\` first, then re-run \`node scripts/assert-chunks.mjs\`.\n`,
  )
  process.exit(1)
}

if (jsFiles.length === 0) {
  console.error(
    `\n✗ assert-chunks: no .js chunks found in ${ASSETS_DIR}\n` +
      `  Run \`npm run build\` first.\n`,
  )
  process.exit(1)
}

// --- Human-readable chunk inventory ----------------------------------------
console.log('\nassert-chunks — build/assets/*.js inventory:')
const sized = jsFiles
  .map((f) => ({ name: f, bytes: statSync(join(ASSETS_DIR, f)).size }))
  .sort((a, b) => b.bytes - a.bytes)
for (const { name, bytes } of sized) {
  console.log(`  ${kb(bytes).padStart(12)}  ${name}`)
}
console.log(`  ${String(jsFiles.length).padStart(9)} chunks total\n`)

// --- Assertion 1: react-vendor chunk exists --------------------------------
const reactVendor = jsFiles.find((f) => /^react-vendor[-.]/.test(f))
if (reactVendor) {
  notes.push(`✓ react-vendor chunk present: ${reactVendor}`)
} else {
  failures.push(
    '✗ no react-vendor-*.js chunk found — add build.rollupOptions.output.manualChunks (Plan 19-02 / PERF-03).',
  )
}

// --- Locate the eager index chunk ------------------------------------------
const indexChunks = sized.filter((c) => /^index[-.]/.test(c.name))
const eagerIndex = indexChunks.length > 0 ? indexChunks[0] : null

if (!eagerIndex) {
  failures.push('✗ no eager index-*.js chunk found in build/assets.')
} else {
  // --- Assertion 2: eager index < baseline ---------------------------------
  if (eagerIndex.bytes < BASELINE_INDEX_BYTES) {
    notes.push(
      `✓ eager ${eagerIndex.name} = ${kb(eagerIndex.bytes)} < baseline ${kb(BASELINE_INDEX_BYTES)}.`,
    )
  } else {
    failures.push(
      `✗ eager ${eagerIndex.name} = ${kb(eagerIndex.bytes)} is NOT smaller than the ` +
        `${kb(BASELINE_INDEX_BYTES)} pre-split baseline — the code split did not shrink the candidate first-paint chunk (PERF-03).`,
    )
  }

  // --- Assertion 3: jsPDF NOT in the eager index chunk ---------------------
  const indexSource = readFileSync(join(ASSETS_DIR, eagerIndex.name), 'utf8')
  const leakedMarker = JSPDF_MARKERS.find((m) => indexSource.includes(m))
  if (leakedMarker) {
    failures.push(
      `✗ jsPDF marker "${leakedMarker}" found INSIDE the eager ${eagerIndex.name} — ` +
        `jsPDF must be reached only via a call-site dynamic import (Plan 19-02 / Pitfall 3). ` +
        `A stale top-level value import keeps it in the candidate chunk.`,
    )
  } else {
    notes.push(`✓ no jsPDF markers in the eager ${eagerIndex.name} (jsPDF is behind the dynamic boundary).`)
  }
}

// --- Assertion 4: lazy route chunks emitted separately ---------------------
if (jsFiles.length > PRESPLIT_CHUNK_FLOOR) {
  notes.push(
    `✓ ${jsFiles.length} js chunks emitted (> ${PRESPLIT_CHUNK_FLOOR} pre-split floor) — ` +
      `lazy /rh/* + /admin/* route chunks split out from the eager index.`,
  )
} else {
  failures.push(
    `✗ only ${jsFiles.length} js chunks (≤ ${PRESPLIT_CHUNK_FLOOR} pre-split floor) — ` +
      `the /rh/* + /admin/* routes are NOT lazy-split into separate chunks (Plan 19-02 / PERF-03).`,
  )
}

// --- Report ----------------------------------------------------------------
for (const n of notes) console.log(n)
if (failures.length > 0) {
  console.error('\nassert-chunks FAILED:')
  for (const f of failures) console.error(`  ${f}`)
  console.error('')
  process.exit(1)
}

console.log('\n✓ assert-chunks PASSED — all PERF-03 chunk conditions met.\n')
process.exit(0)
