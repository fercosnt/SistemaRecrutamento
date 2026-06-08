/**
 * Phase 9 / Plan 09-06 — git→DB prompt-library sync (IA-01 / RF-PL-07).
 *
 * Deno script: the ONLY writer of new `prompt_versions` rows from the authoring
 * source. Reads the 7 templates in `docs/conhecimento/prompts/templates/*.md`,
 * Zod-validates each frontmatter (RF-PL-01), computes a deterministic content_hash
 * SHA-256 over `system + user + canonicalJSON(frontmatter-without-hash)` (RF-PL-02),
 * and UPSERTs each into `prompt_versions` at is_active=false + is_canary=false,
 * idempotent ON CONFLICT (content_hash) DO NOTHING (RF-PL-07).
 *
 * NEVER auto-activates a prompt — activation is one-time manual SQL per call_type
 * (orchestrator-decision #2 / canary path of the PRD). Runtime reads only the DB
 * (Plan 09-05); the filesystem is never read at runtime — only here, on merge to main.
 *
 * Hybrid contract with the seed migration (Plan 09-03):
 *   The seed wrote 7 v1.0.0 placeholder rows with a SENTINEL content_hash
 *   (`encode(digest('seed:<call_type>:1.0.0','sha256'),'hex')`) and placeholder
 *   bodies. This script computes the REAL canonical content_hash from the git
 *   templates; the first merge inserts the real rows (different hash → new row),
 *   and re-runs are no-ops via ON CONFLICT (content_hash) DO NOTHING.
 *
 * Run (CI): deno run --allow-read --allow-env --allow-net scripts/sync-prompts.ts
 * Test:     deno test --allow-read scripts/__tests__/sync-prompts.test.ts
 *
 * @see .planning/phases/09-ai-prompt-library-cost-infra/09-RESEARCH.md §Code Examples (content_hash)
 * @see docs/prds/m2-funil-rh/PRD-ai-prompt-library-m2.md §6.1 (RF-PL-01/02/07/11)
 */
import { z } from "npm:zod@3.25.76";
import { createClient, type SupabaseClient } from "npm:@supabase/supabase-js@2";

// ── The 7 canonical call_type values (mirrors llm_call_type enum + 00-shared-zod-schemas.ts) ──
export const CALL_TYPES = [
  "cv_summary",
  "cv_job_match",
  "comparative_ranking",
  "interview_guide",
  "transcript_analysis",
  "culture_fit_essay",
  "work_sample_sjt",
] as const;

// ── RF-PL-01 frontmatter schema (Zod). Rejects a missing field and a non-SemVer version. ──
export const frontmatterSchema = z.object({
  id: z.string().min(1),
  call_type: z.enum(CALL_TYPES),
  semver: z.string().regex(/^\d+\.\d+\.\d+$/, "semver must match ^\\d+\\.\\d+\\.\\d+$"),
  content_hash: z.string(),
  schema_version_required: z.string().regex(/^\d+\.\d+\.\d+$/),
  model_id: z.string().min(1),
  fallback_model_id: z.string().min(1),
  temperature: z.number(),
  max_tokens: z.number().int().positive(),
  change_summary: z.string().min(1),
  changed_by: z.string().min(1),
  created_at: z.string().min(1),
  // Optional cost annotation present on the templates' frontmatter — not load-bearing for the hash.
  estimated_cost_per_call_usd: z.number().optional(),
});

export type Frontmatter = z.infer<typeof frontmatterSchema>;

/**
 * RF-PL-01 — validate a frontmatter object. Returns a discriminated result so the
 * test (and callers) can branch on `.success` without a throw.
 */
export function validateFrontmatter(
  fm: Record<string, unknown>,
): { success: true; data: Frontmatter } | { success: false; error: unknown } {
  const parsed = frontmatterSchema.safeParse(fm);
  if (parsed.success) return { success: true, data: parsed.data };
  return { success: false, error: parsed.error };
}

/**
 * Canonical JSON: stringify with keys sorted, so a frontmatter object's key
 * INSERTION ORDER cannot change the hash (RF-PL-02 reproducibility). The RESEARCH
 * snippet used a bare JSON.stringify; the test asserts reorder-invariance, so we
 * sort keys here — a strict superset of that contract.
 */
function canonicalJSON(obj: Record<string, unknown>): string {
  const sortedKeys = Object.keys(obj).sort();
  const ordered: Record<string, unknown> = {};
  for (const k of sortedKeys) ordered[k] = obj[k];
  return JSON.stringify(ordered);
}

/**
 * RF-PL-02 — deterministic SHA-256 hex of `system + user + canonicalJSON(fmNoHash)`
 * via Web Crypto (Deno std). 64-char lowercase hex. Same algorithm class the seed
 * migration used (SHA-256), but over the REAL template content (the seed used a
 * `seed:<type>:<semver>` sentinel string deliberately).
 */
export async function contentHash(
  system: string,
  user: string,
  fmNoHash: Record<string, unknown>,
): Promise<string> {
  const payload = system + user + canonicalJSON(fmNoHash);
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(payload));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

export interface ParsedTemplate {
  frontmatter: Record<string, unknown>;
  system: string;
  user: string;
}

/**
 * Split a template .md into { frontmatter, system, user }:
 *   - frontmatter: the leading `--- ... ---` YAML block (minimal parser; the
 *     templates use scalar key: value pairs, with optional `"..."` quotes and
 *     `# inline comments`).
 *   - system: the body of the fenced ``` block under `## SYSTEM PROMPT`.
 *   - user:   the body of the fenced ``` block under `## USER MESSAGE TEMPLATE`.
 */
export function parseTemplate(md: string): ParsedTemplate {
  const fmMatch = md.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n/);
  if (!fmMatch) throw new Error("template missing frontmatter --- block");
  const frontmatter = parseYamlFrontmatter(fmMatch[1]);

  const system = extractFencedBlock(md, "SYSTEM PROMPT");
  const user = extractFencedBlock(md, "USER MESSAGE TEMPLATE");
  return { frontmatter, system, user };
}

/** Minimal scalar-only YAML frontmatter parser (no nested structures in the templates). */
function parseYamlFrontmatter(block: string): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const rawLine of block.split(/\r?\n/)) {
    const line = rawLine.trimEnd();
    if (!line.trim() || line.trim().startsWith("#")) continue;
    const colon = line.indexOf(":");
    if (colon === -1) continue;
    const key = line.slice(0, colon).trim();
    let value = line.slice(colon + 1).trim();
    if (value.startsWith('"') || value.startsWith("'")) {
      // Quoted value: take everything up to the matching closing quote, discard any
      // trailing ` # inline comment` that follows the closing quote.
      const quote = value[0];
      const close = value.indexOf(quote, 1);
      value = close === -1 ? value.slice(1) : value.slice(1, close);
    } else {
      // Unquoted value: strip a trailing ` # inline comment`.
      const hash = value.indexOf(" #");
      if (hash !== -1) value = value.slice(0, hash).trim();
    }
    out[key] = coerceScalar(value);
  }
  return out;
}

function coerceScalar(value: string): unknown {
  if (value === "true") return true;
  if (value === "false") return false;
  if (value !== "" && !Number.isNaN(Number(value)) && /^-?\d+(\.\d+)?$/.test(value)) return Number(value);
  return value;
}

/** Extract the body of the first fenced ``` block appearing after `## <heading>`. */
function extractFencedBlock(md: string, heading: string): string {
  const headingIdx = md.indexOf(`## ${heading}`);
  if (headingIdx === -1) throw new Error(`template missing ## ${heading} section`);
  const after = md.slice(headingIdx);
  const fence = after.match(/```[^\n]*\r?\n([\s\S]*?)\r?\n```/);
  if (!fence) throw new Error(`## ${heading} has no fenced code block`);
  return fence[1].trim();
}

export interface UpsertRow {
  call_type: string;
  semver: string;
  content_hash: string;
  system_template: string;
  user_template: string;
  model_id: string;
  fallback_model_id: string | null;
  temperature: number;
  max_tokens: number;
  schema_version_required: string;
  change_summary: string;
  changed_by: string;
  is_active: false;
  is_canary: false;
}

/**
 * RF-PL-07 — build the prompt_versions UPSERT row. ALWAYS is_active=false +
 * is_canary=false (no auto-activate — orchestrator-decision #2). Carries the
 * pre-computed content_hash so the caller's ON CONFLICT(content_hash) is idempotent.
 */
export function buildUpsertRow(args: {
  system: string;
  user: string;
  frontmatter: Record<string, unknown>;
  contentHash: string;
}): UpsertRow {
  const fm = args.frontmatter as Partial<Frontmatter> & Record<string, unknown>;
  return {
    call_type: String(fm.call_type),
    semver: String(fm.semver),
    content_hash: args.contentHash,
    system_template: args.system,
    user_template: args.user,
    model_id: String(fm.model_id),
    fallback_model_id: fm.fallback_model_id != null ? String(fm.fallback_model_id) : null,
    temperature: Number(fm.temperature),
    max_tokens: Number(fm.max_tokens),
    schema_version_required: String(fm.schema_version_required ?? "1.0.0"),
    change_summary: String(fm.change_summary ?? ""),
    changed_by: String(fm.changed_by ?? ""),
    is_active: false,
    is_canary: false,
  };
}

/** RF-PL-11 — message thrown when a (call_type, semver) already exists with a DIFFERENT hash. */
export function semverCollisionMessage(semver: string): string {
  return `Cannot publish semver ${semver} — existing row has different content_hash. Either bump SemVer or revert change.`;
}

/**
 * Read every *.md template in `templatesDir`, validate frontmatter (throw on invalid
 * → fails the CI build before any write), compute content_hash, and UPSERT each into
 * prompt_versions at is_active=false (ON CONFLICT(content_hash) DO NOTHING).
 *
 * RF-PL-11: if a row with the same (call_type, semver) but a DIFFERENT content_hash
 * exists, throw — the author must bump SemVer or revert.
 */
export async function syncAll(
  supabaseAdmin: SupabaseClient,
  templatesDir: string,
): Promise<{ call_type: string; semver: string; content_hash: string; inserted: boolean }[]> {
  const results: { call_type: string; semver: string; content_hash: string; inserted: boolean }[] = [];

  const files: string[] = [];
  for await (const entry of Deno.readDir(templatesDir)) {
    if (entry.isFile && entry.name.endsWith(".md")) files.push(entry.name);
  }
  files.sort();

  for (const name of files) {
    const md = await Deno.readTextFile(`${templatesDir}/${name}`);
    const { frontmatter, system, user } = parseTemplate(md);

    const validated = validateFrontmatter(frontmatter);
    if (!validated.success) {
      throw new Error(`Invalid frontmatter in ${name}: ${JSON.stringify(validated.error)}`);
    }
    const fm = validated.data;

    // content_hash over canonical frontmatter WITHOUT the hash field itself (RF-PL-02).
    const { content_hash: _drop, ...fmNoHash } = fm as Record<string, unknown>;
    const hash = await contentHash(system, user, fmNoHash);

    // RF-PL-11 — same (call_type, semver) with a DIFFERENT hash is a forbidden silent edit.
    const { data: existing, error: selErr } = await supabaseAdmin
      .from("prompt_versions")
      .select("content_hash")
      .eq("call_type", fm.call_type)
      .eq("semver", fm.semver)
      .maybeSingle();
    if (selErr) throw selErr;
    if (existing && existing.content_hash !== hash) {
      throw new Error(semverCollisionMessage(fm.semver));
    }

    const row = buildUpsertRow({ system, user, frontmatter: fm, contentHash: hash });

    // RF-PL-07 — idempotent UPSERT ON CONFLICT(content_hash) DO NOTHING. Never auto-activate.
    const { error: upErr } = await supabaseAdmin
      .from("prompt_versions")
      .upsert(row, { onConflict: "content_hash", ignoreDuplicates: true });
    if (upErr) throw upErr;

    results.push({ call_type: fm.call_type, semver: fm.semver, content_hash: hash, inserted: !existing });
  }

  return results;
}

// ── CLI entrypoint: only runs when invoked directly (never during `deno test` import). ──
if (import.meta.main) {
  const url = Deno.env.get("SUPABASE_URL");
  // service_role key — server-side only. NEVER VITE_-prefixed (CLAUDE.md hard rule).
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !serviceKey) {
    console.error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY env vars.");
    Deno.exit(1);
  }
  const supabaseAdmin = createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const templatesDir = new URL("../docs/conhecimento/prompts/templates", import.meta.url).pathname;

  try {
    const synced = await syncAll(supabaseAdmin, templatesDir);
    const inserted = synced.filter((r) => r.inserted).length;
    console.log(
      `sync-prompts: ${synced.length} templates processed, ${inserted} new version(s) inserted (is_active=false). ` +
        `Activation is one-time manual SQL per call_type.`,
    );
  } catch (err) {
    console.error(`sync-prompts FAILED: ${err instanceof Error ? err.message : String(err)}`);
    Deno.exit(1);
  }
}
