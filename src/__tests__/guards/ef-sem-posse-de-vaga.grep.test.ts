/**
 * Phase 50 / Plan 50-06 Task 1 — SC3, metade das Edge Functions: nenhuma EF autoriza pela
 * autoria da vaga.
 *
 * D-01 (operador, 2026-10-05): o recrutador ATIVO vê e opera todas as vagas. A autoria da
 * vaga deixa de ser autorização. Nas EFs, a única autorização que resta é a linha VIVA de
 * `usuarios_rh` (`ativo = true`, `deleted_at IS NULL`, `recrutador→rh`,
 * `administrador→administrador`), o equivalente em EF de `public.is_active_rh_user()` (D-02).
 * As checagens de INTEGRIDADE (D-09) ficam: o bloco 3c do comparativo, MIXED_VAGA, o
 * cross-check candidatura↔vaga do gerar-guia e o filtro de soft-delete do currículo. Nenhuma
 * delas compara o autor da vaga com o chamador, então esta sonda não as vê.
 *
 * ── Por que varrer pela FORMA, e não por uma lista de arquivos ──
 * `pitfall7.grep.test.ts` itera sobre uma lista LITERAL de caminhos. É o anti-padrão que o
 * CLAUDE.md §Portões nomeia: um portão que itera sobre lista literal não reprova nada quando
 * nasce um objeto novo — a EF nova fica fora da vigilância e o portão segue verde. Esta sonda
 * percorre `supabase/functions/` com `readdirSync`, lê todo `.ts` que não é teste, e tem um
 * PISO que não envelhece: o número de `<slug>/index.ts` varridos tem de ser igual ao número de
 * diretórios de slug que contêm um `index.ts`, calculado na própria execução (nunca uma
 * constante), e maior que zero.
 *
 * ── Por que os comentários também contam ──
 * Um comentário que ainda descreve a posse da vaga como a autorização é um contrato
 * desatualizado: o próximo leitor acredita nele e o reintroduz. Por isso a sonda NÃO é
 * comment-aware (ao contrário de `no-service-role-src.grep.test.ts`). O texto que explica a
 * regra nova tem de ser escrito sem repetir a comparação antiga.
 *
 * ── Prova de que morde ──
 * (1) No tree anterior às edições das EFs (commit desta sonda, sozinho), o teste B ficou
 *     VERMELHO listando as 5 EFs: comparativo-candidatos, get-curriculo-url,
 *     consolidar-decisao-final, gerar-guia-entrevista, avaliar-transcricao-entrevista.
 * (2) O teste C prova, a cada execução, que a mesma regex casa as linhas antigas literais
 *     (comparativo-candidatos/index.ts:286 e consolidar-decisao-final/index.ts:337 antes da
 *     Phase 50). Este arquivo mora em `src/`, que a sonda não varre — não pode se acusar.
 *
 * Leitura apenas: `readdirSync`/`statSync`/`readFileSync`. Nenhum processo filho.
 *
 * @see .planning/phases/50-acesso-do-recrutador/50-CONTEXT.md (D-01, D-02, D-09)
 * @see .planning/phases/50-acesso-do-recrutador/50-06-PLAN.md
 * @see src/__tests__/guards/no-service-role-src.grep.test.ts (idioma node:fs)
 */
import { describe, it, expect } from 'vitest'
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs'
import { join, relative, resolve } from 'node:path'

// Este arquivo está em src/__tests__/guards/ — três níveis abaixo da raiz.
const ROOT = resolve(__dirname, '../../..')
const FUNCTIONS_DIR = join(ROOT, 'supabase', 'functions')

/**
 * Comparação de posse: o autor da vaga confrontado com o chamador, em qualquer ordem e com
 * qualquer operador de (des)igualdade, ou a leitura do campo de autoria na linha da vaga
 * buscada pela EF. UMA regex, a mesma da mordida (teste C).
 */
const POSSE_RE =
  /created_by\s*!==?\s*user\.id|user\.id\s*!==?\s*\S*created_by|created_by\s*===?\s*user\.id|vagaRow\.created_by|vagaRow\?\.created_by/

/** Linhas antigas, copiadas literalmente das EFs antes da Phase 50 (mordida). */
const FIXTURE_COMPARATIVO_286 = '      if (!vagaRow || vagaRow.created_by !== user.id) {'
const FIXTURE_CONSOLIDAR_337 = '    if (role === "rh" && vagaRow.created_by !== user.id) {'

function isTestFile(rel: string): boolean {
  return rel.endsWith('.test.ts') || rel.split('/').includes('__tests__')
}

/** Todo `.ts` não-teste sob supabase/functions/, por caminhada recursiva. */
function collectEfSources(dir: string): string[] {
  if (!existsSync(dir)) return []
  const out: string[] = []
  for (const entry of readdirSync(dir)) {
    if (entry === 'node_modules') continue
    const full = join(dir, entry)
    const st = statSync(full)
    if (st.isDirectory()) {
      out.push(...collectEfSources(full))
    } else if (st.isFile() && entry.endsWith('.ts')) {
      const rel = relative(FUNCTIONS_DIR, full).split('\\').join('/')
      if (!isTestFile(rel)) out.push(full)
    }
  }
  return out
}

/** Diretórios de slug (filhos diretos de supabase/functions/) que contêm um index.ts. */
function slugsComIndex(): string[] {
  if (!existsSync(FUNCTIONS_DIR)) return []
  return readdirSync(FUNCTIONS_DIR).filter((entry) => {
    const full = join(FUNCTIONS_DIR, entry)
    return statSync(full).isDirectory() && existsSync(join(full, 'index.ts'))
  })
}

describe('SC3 (EF) — nenhuma Edge Function autoriza pela autoria da vaga (Phase 50 / D-01)', () => {
  it('A — piso: todo <slug>/index.ts encontrado por readdir foi varrido (e há pelo menos um)', () => {
    const slugs = slugsComIndex()
    const varridos = collectEfSources(FUNCTIONS_DIR)
      .map((f) => relative(FUNCTIONS_DIR, f).split('\\').join('/'))
      .filter((rel) => /^[^/]+\/index\.ts$/.test(rel))
    expect(slugs.length).toBeGreaterThan(0)
    expect(varridos.sort()).toEqual(slugs.map((s) => `${s}/index.ts`).sort())
  })

  it('B — nenhum .ts não-teste sob supabase/functions compara a autoria da vaga com o chamador', () => {
    const achados: string[] = []
    for (const file of collectEfSources(FUNCTIONS_DIR)) {
      const linhas = readFileSync(file, 'utf-8').split('\n')
      linhas.forEach((texto, idx) => {
        if (POSSE_RE.test(texto)) {
          achados.push(`  ${relative(ROOT, file)}:${idx + 1}  →  ${texto.trim()}`)
        }
      })
    }
    if (achados.length > 0) {
      throw new Error(
        `SC3 (Phase 50 / D-01) — a autoria da vaga voltou a ser autorização numa Edge Function ` +
          `(código ou comentário):\n${achados.join('\n')}\n` +
          `A autorização é a linha viva de usuarios_rh (ativo, deleted_at nulo). Integridade ` +
          `(candidatura pertence à vaga do pedido) fica; posse não.`,
      )
    }
    expect(achados).toHaveLength(0)
  })

  it('C — mordida: a mesma regex casa as linhas antigas do comparativo e do consolidar', () => {
    expect(POSSE_RE.test(FIXTURE_COMPARATIVO_286)).toBe(true)
    expect(POSSE_RE.test(FIXTURE_CONSOLIDAR_337)).toBe(true)
  })
})
