#!/usr/bin/env node
/**
 * check-resend-dominio.mjs — the DELIV-01 opt-in sending-domain reporter.
 *
 * ⚠️ NEVER run this in CI. NUNCA. This is the only script in the repo that talks to
 * the network, and it needs a live Resend credential to do anything useful. CI runs
 * WITHOUT a live key by decision of DELIV-03 (the sender is mocked in the Deno suite),
 * so wiring this into `.github/workflows/ci.yml`, into `postbuild`, or into a git hook
 * would force a live key into the GitHub Secrets — trading a documentation gap for a
 * credential-exposure surface (threat T-36-03-03). It is opt-in ONLY:
 *
 *     RESEND_API_KEY=… npm run check:resend-dominio
 *     RESEND_API_KEY=… node scripts/check-resend-dominio.mjs
 *
 * Security posture: read-only by default (two GET calls). The state-changing
 * `POST /domains/:id/verify` is reachable ONLY behind the explicit `--verify` flag
 * (T-36-03-04: a premature verify just produces noisy `pending`/`failed` states).
 * The API key is NEVER printed — not in the report, not in an error path, not on a
 * 401 (T-36-03-02). No key in env ⇒ no-op with a clear notice and exit 0: this is a
 * convenience reporter, not a gate.
 *
 * What it reports (RESEARCH § Q2):
 *   1. Whether `rh.beautysmile.com.br` exists in the Resend account at all.
 *   2. The aggregate domain `status` and the `region` (expected `sa-east-1`).
 *   3. `open_tracking` / `click_tracking` (both expected `false` — RESEARCH § Q1).
 *   4. Per-record status, so "not verified" becomes "the SPF TXT on `send` is missing".
 *
 * What it CANNOT report: whether the mail lands in the inbox instead of spam (human,
 * see `36-HUMAN-UAT.md`) and the DMARC TXT (Resend does not publish it, so it never
 * shows up in `records[]` — check it with `dig`, see the reminder printed at the end).
 *
 * @see docs/runbooks/resend-dominio-envio.md (the operator procedure this reports on)
 * @see .planning/phases/36-deliverability-sender-identity/36-RESEARCH.md § Q1/Q2
 */

// --- Canonical values (36-CONTEXT.md § Identidade de Remetente) --------------
const DOMAIN = 'rh.beautysmile.com.br'
const EXPECTED_REGION = 'sa-east-1'
const DMARC_RECORD = '_dmarc.rh.beautysmile.com.br'
const RUNBOOK = 'docs/runbooks/resend-dominio-envio.md'

// Resend marks both domains and individual records with this status on success.
const OK_STATUS = 'verified'
const REQUEST_TIMEOUT_MS = 15_000

// The one flag that unlocks the state-changing call. Default path is read-only.
const WANT_VERIFY = process.argv.includes('--verify')

// Message built as a const so no `console.*` call ever interpolates credential
// material on its own line (grep-checkable hygiene rule of Task 1).
const NO_KEY_NOTICE =
  '\n⚠ check-resend-dominio: no Resend key in the environment — nothing to check (no-op).\n' +
  '\n  This reporter is OPT-IN. Provide the key on the invocation only, never committed:\n' +
  '\n      RESEND_API_KEY=<sua-chave> npm run check:resend-dominio\n' +
  '\n  Where to get the key and how the sending domain is set up:\n' +
  `      ${RUNBOOK}\n` +
  '\n  Exiting 0 — the absence of a key is not a failure.\n'

const apiKey = (process.env.RESEND_API_KEY ?? '').trim()
if (apiKey === '') {
  console.warn(NO_KEY_NOTICE)
  process.exit(0)
}

// --- Networking -------------------------------------------------------------

/** Abort with a readable message. Never echoes the credential. */
function die(lines) {
  console.error('\ncheck-resend-dominio FAILED:')
  for (const l of lines) console.error(`  ${l}`)
  console.error('')
  process.exit(1)
}

async function callResend(url, method = 'GET') {
  let res
  try {
    res = await fetch(url, {
      method,
      headers: {
        Authorization: `Bearer ${apiKey}`,
        Accept: 'application/json',
      },
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    })
  } catch (err) {
    // No stack trace: the message is enough and the trace adds nothing actionable.
    const reason = err && typeof err.message === 'string' ? err.message : 'unknown network error'
    die([
      `✗ could not reach the Resend API (${method} ${url}): ${reason}`,
      'Check your connection and retry. This script is opt-in — a network failure is not a build failure.',
    ])
  }

  if (res.status === 401) {
    // Deliberately opaque: we report the condition, never the credential (T-36-03-02).
    die([
      '✗ 401 — chave inválida ou ausente.',
      `Generate a notification-dedicated key in the Resend dashboard (see ${RUNBOOK}, Passo 6).`,
    ])
  }
  if (!res.ok) {
    die([`✗ Resend API responded ${res.status} ${res.statusText} for ${method} ${url}.`])
  }

  try {
    return await res.json()
  } catch {
    die([`✗ Resend API returned a non-JSON body for ${method} ${url}.`])
  }
}

// --- 1) Locate the domain in the account ------------------------------------
console.log(`\ncheck-resend-dominio — reporting on ${DOMAIN}\n`)

const list = await callResend('https://api.resend.com/domains')
const entries = Array.isArray(list?.data) ? list.data : []
const match = entries.find((d) => d?.name === DOMAIN)

if (!match) {
  const known = entries.map((d) => d?.name).filter(Boolean)
  die([
    `✗ ${DOMAIN} does not exist in this Resend account yet.`,
    known.length > 0
      ? `Domains found instead: ${known.join(', ')}.`
      : 'This account has no domains at all.',
    `Run Passo 1 of ${RUNBOOK} (Add Domain, region ${EXPECTED_REGION}, tracking OFF).`,
  ])
}

// --- 2) Full detail (records[] + tracking flags) ------------------------------
const detail = await callResend(`https://api.resend.com/domains/${match.id}`)

const failures = []
const notes = []

const domainStatus = detail?.status ?? match?.status ?? 'unknown'
if (domainStatus === OK_STATUS) {
  notes.push(`✓ domain status: ${domainStatus}`)
} else {
  failures.push(
    `✗ domain status: ${domainStatus} (expected "${OK_STATUS}"). ` +
      '"pending" is normal right after Verify; "temporary_failure" means retry later; ' +
      `"failed" AFTER dig-confirmed propagation is the only real error signal (${RUNBOOK}, Passo 4).`,
  )
}

const region = detail?.region ?? match?.region ?? 'unknown'
if (region === EXPECTED_REGION) {
  notes.push(`✓ region: ${region}`)
} else {
  failures.push(
    `✗ region: ${region} (expected "${EXPECTED_REGION}"). ` +
      'The region is fixed at domain creation and determines the MX hostname — ' +
      'changing it requires deleting and RE-VERIFYING the whole domain.',
  )
}

// Only an EXPLICIT `true` is a violation. A missing flag is not: the payload shape of
// `GET /domains/:id` varies by account/API version, and treating "not reported" as
// "tracking is on" made this reporter exit 1 on a correctly-configured domain — a
// checker that is permanently red is a checker that gets ignored (the same reasoning
// assert-no-secrets.mjs:81-85 uses to keep the sending domain out of its PATTERNS).
// The `?? match?.[flag]` fallback to the GET /domains entry mirrors what `status`
// and `region` above already do; its absence here was an internal asymmetry.
let trackingConfirmedOff = true
for (const flag of ['open_tracking', 'click_tracking']) {
  const value = detail?.[flag] ?? match?.[flag]
  if (value === false) {
    notes.push(`✓ ${flag}: false`)
  } else if (value === undefined || value === null) {
    trackingConfirmedOff = false
    notes.push(
      `… ${flag}: not reported by this API version — not a violation, but confirm it is OFF ` +
        `in Domain Settings (${RUNBOOK}, Passo 1, item 6).`,
    )
  } else {
    failures.push(
      `✗ ${flag}: ${String(value)} (expected false). Tracking adds a links.<domain> CNAME ` +
        'and a link/domain mismatch that trips spam filters — turn it off in Domain Settings.',
    )
  }
}

// --- 3) Per-record table ------------------------------------------------------
const records = Array.isArray(detail?.records) ? detail.records : []
if (records.length === 0) {
  failures.push('✗ the Resend API returned no DNS records for this domain — nothing to publish or verify.')
} else {
  console.log('DNS records emitted by Resend (publish these EXACTLY as shown in the dashboard):')
  const col = (v, w) => String(v ?? '—').padEnd(w)
  console.log(`  ${col('mark', 4)}${col('record', 10)}${col('type', 7)}${col('name', 42)}status`)
  for (const r of records) {
    const ok = r?.status === OK_STATUS
    console.log(`  ${col(ok ? '✓' : '✗', 4)}${col(r?.record, 10)}${col(r?.type, 7)}${col(r?.name, 42)}${r?.status ?? 'unknown'}`)
    if (!ok) {
      failures.push(
        `✗ record ${r?.record ?? '?'} ${r?.type ?? '?'} on "${r?.name ?? '?'}" is "${r?.status ?? 'unknown'}" — ` +
          'publish it in the DNS zone and confirm with dig before clicking Verify.',
      )
    }
  }
  console.log('')
}

// --- 4) Optional, explicitly-requested state change ---------------------------
if (WANT_VERIFY) {
  console.log('--verify passed → triggering an ASYNCHRONOUS verification (this CHANGES provider state).')
  await callResend(`https://api.resend.com/domains/${match.id}/verify`, 'POST')
  console.log('  verification requested — the domain moves to "pending"; re-run this script in a few minutes.\n')
} else {
  notes.push('✓ read-only run (pass --verify to trigger verification; it changes provider state).')
}

// --- Report -------------------------------------------------------------------
for (const n of notes) console.log(n)

console.log(
  `\nReminder: the DMARC record is NOT in records[] above — Resend does not publish it.\n` +
    `Check it separately:\n\n    dig +short TXT ${DMARC_RECORD}\n\n` +
    `Expected: v=DMARC1; p=none; rua=mailto:dmarc@beautysmile.com.br  (see ${RUNBOOK}, Passo 3)\n`,
)

if (failures.length > 0) {
  console.error('check-resend-dominio FAILED:')
  for (const f of failures) console.error(`  ${f}`)
  console.error(`\n  Fix the items above by following ${RUNBOOK}.\n`)
  process.exit(1)
}

console.log(
  `✓ check-resend-dominio PASSED — ${DOMAIN} is verified, in ${EXPECTED_REGION}, ` +
    `${trackingConfirmedOff ? 'tracking off' : 'tracking NOT reported by the API (confirm in Domain Settings)'}.\n`,
)
process.exit(0)
