/**
 * Phase 9 / Plan 09-01 Task 3 — Wave 0 RED scaffold for `scripts/sync-prompts.ts`.
 *
 * Gates IA-01 (hybrid git→DB prompt versioning). The CI sync script reads the 7
 * templates in `docs/conhecimento/prompts/templates/*.md`, Zod-validates their
 * frontmatter (RF-PL-01), computes a deterministic content_hash SHA-256 over
 * `system + user + JSON.stringify(frontmatter-without-hash)` (RF-PL-02), and
 * UPSERTs into `prompt_versions` with is_active=false + is_canary=false,
 * idempotent on ON CONFLICT(content_hash) DO NOTHING (RF-PL-07).
 *
 * Flips GREEN in Plan 09-06 when `scripts/sync-prompts.ts` lands.
 *
 * NO real DB call happens — the UPSERT shape is asserted via the exported
 * builder; the Supabase client is never constructed in this test.
 *
 * ── Why this is RED now ──
 * `../sync-prompts.ts` does not exist yet → the dynamic import throws
 * module-not-found at run time. That is the RED assertion.
 *
 * Run: deno test --allow-read scripts/__tests__/sync-prompts.test.ts
 *
 * @see docs/prds/m2-funil-rh/PRD-ai-prompt-library-m2.md §6.1 (RF-PL-01/02/07/11)
 * @see .planning/phases/09-ai-prompt-library-cost-infra/09-RESEARCH.md (§Code Examples — content_hash)
 */
import { assert, assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";

// RED until Plan 09-06.
async function loadSync() {
  const mod = await import("../sync-prompts.ts");
  // Double-cast through `unknown`: the real exports return the closed `UpsertRow`
  // interface (no index signature), which is not directly comparable to this
  // test-local `Record<string, unknown>` shape (TS2352). Narrowing through
  // `unknown` is the standard idiom for casting a dynamically-imported module to
  // a test-local shape and keeps `deno test` type-check ON (CI-15, no --no-check).
  return mod as unknown as {
    contentHash: (system: string, user: string, fmNoHash: Record<string, unknown>) => Promise<string>;
    validateFrontmatter: (fm: Record<string, unknown>) =>
      { success: true; data: Record<string, unknown> } | { success: false; error: unknown };
    buildUpsertRow: (args: {
      system: string;
      user: string;
      frontmatter: Record<string, unknown>;
      contentHash: string;
    }) => Record<string, unknown>;
  };
}

const VALID_FRONTMATTER = {
  id: "cv_summary",
  call_type: "cv_summary",
  semver: "1.0.0",
  content_hash: "tbd",
  schema_version_required: "1.0.0",
  model_id: "claude-haiku-4-5",
  fallback_model_id: "gpt-4o-mini",
  temperature: 0,
  max_tokens: 1500,
  change_summary: "v1",
  changed_by: "tech-lead@beauty-smile.com.br",
  created_at: "2026-04-27",
  estimated_cost_per_call_usd: 0.0028,
};

const SYSTEM = "You are an impartial recruiter assistant.";
const USER = "Resuma o CV a seguir em 4 paragrafos.";

Deno.test("RF-PL-02 — contentHash is a deterministic SHA-256 hex string", async () => {
  const { contentHash } = await loadSync();
  const { content_hash: _drop, ...fmNoHash } = VALID_FRONTMATTER;
  const h1 = await contentHash(SYSTEM, USER, fmNoHash);
  const h2 = await contentHash(SYSTEM, USER, fmNoHash);
  assertEquals(h1, h2, "same input must yield the same hash");
  assert(/^[0-9a-f]{64}$/.test(h1), "content_hash must be 64-char lowercase hex (SHA-256)");
});

Deno.test("RF-PL-02 — reordered-but-equal frontmatter yields the same hash (canonical)", async () => {
  const { contentHash } = await loadSync();
  const { content_hash: _d, ...fmNoHash } = VALID_FRONTMATTER;
  // Same keys, different insertion order.
  const reordered: Record<string, unknown> = {};
  for (const key of Object.keys(fmNoHash).reverse()) reordered[key] = (fmNoHash as Record<string, unknown>)[key];
  const h1 = await contentHash(SYSTEM, USER, fmNoHash);
  const h2 = await contentHash(SYSTEM, USER, reordered);
  assertEquals(h1, h2, "key order must not change the canonical hash");
});

Deno.test("RF-PL-02 — different content yields a different hash", async () => {
  const { contentHash } = await loadSync();
  const { content_hash: _d, ...fmNoHash } = VALID_FRONTMATTER;
  const h1 = await contentHash(SYSTEM, USER, fmNoHash);
  const h2 = await contentHash(SYSTEM + " changed", USER, fmNoHash);
  assert(h1 !== h2, "changing the system template must change the hash");
});

Deno.test("RF-PL-01 — frontmatter Zod validation rejects a missing required field", async () => {
  const { validateFrontmatter } = await loadSync();
  const { call_type: _missing, ...incomplete } = VALID_FRONTMATTER;
  const result = validateFrontmatter(incomplete);
  assertEquals(result.success, false, "missing call_type must fail validation");
});

Deno.test("RF-PL-01 — frontmatter Zod validation rejects a non-semver version", async () => {
  const { validateFrontmatter } = await loadSync();
  const result = validateFrontmatter({ ...VALID_FRONTMATTER, semver: "1.0" });
  assertEquals(result.success, false, "semver not matching ^\\d+\\.\\d+\\.\\d+$ must fail");
});

Deno.test("RF-PL-01 — valid frontmatter passes Zod validation", async () => {
  const { validateFrontmatter } = await loadSync();
  const result = validateFrontmatter(VALID_FRONTMATTER);
  assertEquals(result.success, true, "complete valid frontmatter must pass");
});

Deno.test("RF-PL-07 — UPSERT row defaults is_active=false + is_canary=false", async () => {
  const { buildUpsertRow } = await loadSync();
  const row = buildUpsertRow({
    system: SYSTEM, user: USER, frontmatter: VALID_FRONTMATTER, contentHash: "a".repeat(64),
  });
  assertEquals(row.is_active, false, "newly synced versions must default inactive");
  assertEquals(row.is_canary, false, "newly synced versions must default non-canary");
  assertEquals(row.content_hash, "a".repeat(64), "row must carry the computed content_hash");
});
