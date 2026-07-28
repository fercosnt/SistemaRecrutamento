/**
 * Edge Function: cost-alerter
 *
 * Phase 9 / Plan 09-07 — IA-04. Sink for the cost-anomaly trigger.
 *
 * Architecture (RESEARCH.md §Architecture Pattern 3 — trigger → pg_net → EF):
 *   The AFTER INSERT/UPDATE trigger `notify_cost_anomaly()` on `ai_cost_daily`
 *   (migration 20260609000002) evaluates the PRD thresholds and, when violated,
 *   fires `net.http_post` to this EF with a Vault Bearer. This handler:
 *     1. Validates the Authorization Bearer against the shared Vault secret
 *        (edge_invoke_key == service_role JWT). The function is deployed with
 *        `--no-verify-jwt` (server-internal/cron — RESEARCH §Security, T-09-22),
 *        so the handler MUST authenticate itself; 401 on absent/mismatch.
 *     2. Dedups against `recruiter_alerts` for a same-(threshold_violated,
 *        vaga_id, date) row — returns 200 idempotent if one exists (Pitfall 7,
 *        T-09-23). The DB trigger also dedups, but a second check here closes
 *        the race between concurrent POSTs.
 *     3. ALWAYS INSERTs a `recruiter_alerts` row via the service_role client.
 *        This is the autonomously testable side effect — it is NOT gated on the
 *        RESEND_API_KEY branch (orchestrator-decision #3).
 *     4. Best-effort email via Resend: if RESEND_API_KEY is set, fire-and-forget
 *        a POST with a .catch that logs-and-skips; if absent, console.warn and
 *        skip. The handler NEVER crashes on a missing key or a failed email.
 *
 * Body shape (must match notify_cost_anomaly net.http_post body exactly):
 *   { alert_type, vaga_id, date, value, threshold }
 *   — `alert_type` maps to recruiter_alerts.threshold_violated.
 *   — the trigger does not send call_type / candidato_id (both nullable here).
 *
 * Security (T-09-24): the alert body carries only ids + numeric thresholds; logs
 *   emit code + summary only (no PII). pt-BR copy; no forbidden product terms.
 *
 * Deploy: `supabase functions deploy cost-alerter --no-verify-jwt` (Task 2,
 *   blocking human checkpoint — NOT deployed in Task 1).
 *
 * @module supabase/functions/cost-alerter
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
// AI-06 (Phase 23): CostAnomalyBody + alertMessage extraídos para um módulo puro,
// unit-testável sem Deno.serve (supabase/functions/_shared/__tests__/cost-alerter-messages.test.ts).
import { alertMessage, type CostAnomalyBody } from './messages.ts'

// ---------------------------------------------------------------------------
// CORS
// ---------------------------------------------------------------------------

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

type ErrorCode =
  | 'UNAUTHORIZED'
  | 'VALIDATION'
  | 'SERVER_ERROR'

function jsonResponse(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

function errorResponse(
  code: ErrorCode,
  message: string,
  status = 400,
): Response {
  return jsonResponse({ ok: false, error_code: code, message }, status)
}

// CostAnomalyBody + alertMessage → ./messages.ts (AI-06 extraction, byte-idêntico).

// ---------------------------------------------------------------------------
// Handler
// ---------------------------------------------------------------------------

Deno.serve(async (req: Request) => {
  // Preflight CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }
  if (req.method !== 'POST') {
    return errorResponse('SERVER_ERROR', 'Método não suportado', 405)
  }

  // ---- 1) Self-authenticate the Vault Bearer (T-09-22) ----------------------
  // Deployed --no-verify-jwt → the handler MUST validate the shared secret. The
  // trigger sends `Bearer <edge_invoke_key>`, which is the service_role JWT; we
  // compare it against SUPABASE_SERVICE_ROLE_KEY (same value, env-only — never
  // client-side, T-09-25).
  const SUPABASE_URL = Deno.env.get('SUPABASE_URL')
  const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  if (!SUPABASE_URL || !SERVICE_KEY) {
    console.error('[cost-alerter] Missing env vars')
    return errorResponse('SERVER_ERROR', 'Servidor mal configurado', 500)
  }

  const authHeader = req.headers.get('Authorization') ?? ''
  const bearer = authHeader.startsWith('Bearer ')
    ? authHeader.slice('Bearer '.length).trim()
    : ''
  // Accept the Vault edge_invoke_key (service_role JWT). An optional explicit
  // override (COST_ALERTER_SECRET) is supported for rotation without changing
  // the service_role key.
  const expectedSecret =
    Deno.env.get('COST_ALERTER_SECRET') ?? SERVICE_KEY
  if (!bearer || bearer !== expectedSecret) {
    console.warn('[cost-alerter] Rejected request: invalid/absent Bearer')
    return errorResponse('UNAUTHORIZED', 'Não autorizado.', 401)
  }

  // ---- 2) Parse + validate body --------------------------------------------
  let body: CostAnomalyBody
  try {
    const raw = await req.json()
    if (
      !raw ||
      typeof raw.alert_type !== 'string' ||
      typeof raw.date !== 'string' ||
      typeof raw.value !== 'number' ||
      typeof raw.threshold !== 'number'
    ) {
      return errorResponse('VALIDATION', 'Payload de alerta inválido.')
    }
    body = {
      alert_type: raw.alert_type,
      vaga_id: raw.vaga_id ?? null,
      date: raw.date,
      value: raw.value,
      threshold: raw.threshold,
    }
  } catch {
    return errorResponse('VALIDATION', 'Corpo da requisição inválido (JSON malformado).')
  }

  // service_role client — privileged read (dedup) + write (alert row).
  const supabaseAdmin = createClient(SUPABASE_URL, SERVICE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

  // ---- 3) Dedup (Pitfall 7 / T-09-23) --------------------------------------
  // Skip the INSERT/email if a same-(threshold_violated, vaga_id, date) alert
  // already exists. The day bucket is matched on created_at::date == body.date.
  // We bound created_at to [date, date+1) so the comparison uses the indexed
  // column (idx_recruiter_alerts_dedup).
  const dayStart = `${body.date}T00:00:00Z`
  const dayEndDate = new Date(`${body.date}T00:00:00Z`)
  dayEndDate.setUTCDate(dayEndDate.getUTCDate() + 1)
  const dayEnd = dayEndDate.toISOString()

  let dedupQuery = supabaseAdmin
    .from('recruiter_alerts')
    .select('id')
    .eq('threshold_violated', body.alert_type)
    .gte('created_at', dayStart)
    .lt('created_at', dayEnd)
  dedupQuery = body.vaga_id
    ? dedupQuery.eq('vaga_id', body.vaga_id)
    : dedupQuery.is('vaga_id', null)

  const { data: existing, error: dedupErr } = await dedupQuery.limit(1)
  if (dedupErr) {
    console.error('[cost-alerter] dedup query failed:', {
      code: (dedupErr as { code?: string }).code,
      message: (dedupErr as { message?: string }).message,
    })
    return errorResponse('SERVER_ERROR', 'Não foi possível verificar alertas existentes.', 500)
  }
  if (existing && existing.length > 0) {
    // Idempotent: an alert for this bucket already exists. No re-insert, no email.
    return jsonResponse({ ok: true, message: 'Alerta já registrado (idempotente).' }, 200)
  }

  // ---- 4) ALWAYS INSERT the recruiter_alerts row ---------------------------
  // This is the autonomously testable side effect — it is NOT inside the
  // RESEND_API_KEY branch. call_type / candidato_id are nullable and not sent
  // by the cost-anomaly trigger.
  const message = alertMessage(body)
  const { error: insertErr } = await supabaseAdmin
    .from('recruiter_alerts')
    .insert({
      call_type: null,
      threshold_violated: body.alert_type,
      vaga_id: body.vaga_id,
      candidato_id: null,
      value: body.value,
      threshold: body.threshold,
      channel: 'cost_anomaly',
      message,
      created_at: new Date().toISOString(),
    })
  if (insertErr) {
    console.error('[cost-alerter] recruiter_alerts INSERT failed:', {
      code: (insertErr as { code?: string }).code,
      message: (insertErr as { message?: string }).message,
    })
    return errorResponse('SERVER_ERROR', 'Não foi possível registrar o alerta.', 500)
  }

  // ---- 5) Best-effort email via Resend (graceful degradation) --------------
  // orchestrator-decision #3: the row INSERT above always happens; the email is
  // best-effort. If RESEND_API_KEY is absent, log-and-skip — NEVER crash. If
  // present, fire-and-forget with a .catch (mirror submit-candidatura).
  const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')
  if (!RESEND_API_KEY) {
    console.warn(
      '[cost-alerter] RESEND_API_KEY absent — alert row written, email skipped (graceful degradation).',
    )
  } else {
    const ALERT_FROM = Deno.env.get('COST_ALERTER_FROM') ?? 'alertas@beautysmile.app'
    const ALERT_TO = Deno.env.get('COST_ALERTER_TO') ?? 'dpo@beautysmile.app'
    fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: ALERT_FROM,
        to: ALERT_TO,
        subject: '[Beauty Smile] Alerta de custo de IA',
        // Body carries only ids + numeric thresholds (T-09-24) — no PII.
        text: `${message}\n\nVaga: ${body.vaga_id ?? '—'}\nData: ${body.date}\nTipo: ${body.alert_type}`,
      }),
    }).catch((e) =>
      console.warn(
        '[cost-alerter] Resend email failed (non-blocking):',
        (e as { message?: string })?.message ?? String(e),
      ),
    )
  }

  // ---- 6) Success ----------------------------------------------------------
  console.log('[cost-alerter] alert recorded:', {
    threshold_violated: body.alert_type,
    has_vaga: body.vaga_id !== null,
  })
  return jsonResponse({ ok: true, message: 'Alerta registrado.' }, 200)
})
