/**
 * Phase 17 / Plan 17-01 Task 2 — Wave 0 RED legacy-cleanup grep guard (D-12).
 *
 * Asserts that the confirmed-dead components are fully removed from `src/router/routes.tsx`
 * (no `import`, no route element, no `devNavigationPages` entry) — the three-reference scrub
 * that Plan 17-05 performs (Pitfall 6). The guard is RED now (the dead components are still
 * imported + routed) and flips GREEN once 17-05 deletes them.
 *
 * Two shapes of dead component:
 *   (A) ROUTE-COUPLED (still in routes.tsx today, 2 refs each = import + element): the
 *       /testes/* tree, QuestionarioPage, QuestionarioCulturaPage, InscricaoPage,
 *       GlassShowcase. Guard: ZERO name references in routes.tsx after the strip → RED today.
 *   (B) UNROUTED (VagaLPPage — 0 routes.tsx refs already; it is dead by having no route at
 *       all): asserting "zero routes.tsx refs" would be GREEN-today (mis-calibrated), so the
 *       guard instead asserts the FILE still exists today and is hard-deleted by 17-05 →
 *       RED today (file present), GREEN after 17-05 removes the file.
 *
 * POSITIVE CONTROL (over-deletion guard): `MeuPerfilPage` (`/rh/perfil`) is NOT dead — it has
 * a LIVE in-app entry (RHTopBar.tsx:38 `navigate('/rh/perfil')`). The guard asserts it stays
 * referenced (>0) in routes.tsx so an over-aggressive 17-05 deletion fails loud.
 *
 * Why node:fs + regex (mirrors src/__tests__/guards/devnav-gate.grep.test.ts):
 *   - Pure read-only scan; deterministic across macOS / Linux / CI. No child_process.
 *   - Comment lines are stripped BEFORE counting so a comment mentioning a dead name does
 *     not self-invalidate the gate.
 *
 * @see .planning/phases/17-navegacao-arquitetura-informacao/17-RESEARCH.md (§Legacy Cleanup Verdicts)
 * @see src/__tests__/guards/devnav-gate.grep.test.ts (the grep-guard idiom mirrored here)
 */
import { describe, it, expect } from 'vitest'
import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'

// This file lives at src/__tests__/guards/legacy-routes.grep.test.ts — 3 levels from root.
const ROOT = resolve(__dirname, '../../..')
const ROUTES_TSX = resolve(ROOT, 'src/router/routes.tsx')
const VAGA_LP_PAGE = resolve(ROOT, 'src/components/pages/VagaLPPage.tsx')

/** Read routes.tsx with comment-only lines stripped (so a comment mentioning a dead
 * component name cannot self-invalidate the zero-reference assertion). A line is treated
 * as a comment when, after optional leading whitespace, it begins with a line-comment
 * marker or a block-comment marker/continuation (see the regex below). */
function readRoutesSansComments(): string {
  const raw = readFileSync(ROUTES_TSX, 'utf-8')
  return raw
    .split('\n')
    .filter((line) => !/^\s*(\/\/|\*|\/\*|\*\/)/.test(line))
    .join('\n')
}

/** Count whole-word references to a component name. The regex is built via string
 * concatenation (no template literal) to keep the SWC parser happy. */
function countRefs(source: string, name: string): number {
  const pattern = '\\b' + name + '\\b'
  const matches = source.match(new RegExp(pattern, 'g'))
  return matches ? matches.length : 0
}

// (A) Route-coupled confirmed-dead set — RESEARCH §Legacy Cleanup Verdicts.
const DEAD_ROUTE_COUPLED = [
  'TesteBigFivePage',
  'TesteDISCPage',
  'TesteRavenPage',
  'InstrucoesBigFivePage',
  'InstrucoesDISCPage',
  'InstrucoesRavenPage',
  'ConclusaoTestesPage',
  'QuestionarioPage',
  'QuestionarioCulturaPage',
  'InscricaoPage',
  'GlassShowcase',
]

describe('Legacy cleanup grep guard — confirmed-dead components removed (D-12)', () => {
  it.each(DEAD_ROUTE_COUPLED)(
    'routes.tsx tem ZERO referências a %s (RED até 17-05 remover import + rota)',
    (name) => {
      const source = readRoutesSansComments()
      // RED hoje: cada componente tem 2 refs (import + elemento). GREEN após 17-05.
      expect(countRefs(source, name)).toBe(0)
    },
  )

  it('VagaLPPage.tsx (unrouted, 1213 LoC) foi hard-deletado (RED até 17-05 remover o arquivo)', () => {
    // VagaLPPage não tem rota — é morto por NÃO ter entrada. Aqui validamos a remoção do
    // ARQUIVO (não refs em routes.tsx, que já são zero). RED hoje: o arquivo existe.
    expect(existsSync(VAGA_LP_PAGE)).toBe(false)
  })

  it('CONTROLE POSITIVO — MeuPerfilPage CONTINUA referenciado em routes.tsx (KEEP, não deletar)', () => {
    // MeuPerfilPage (/rh/perfil) tem entrada viva (RHTopBar.tsx:38). Guarda contra
    // deleção excessiva no 17-05. Este controle é GREEN hoje e DEVE permanecer GREEN.
    const source = readRoutesSansComments()
    expect(countRefs(source, 'MeuPerfilPage')).toBeGreaterThan(0)
  })
})
