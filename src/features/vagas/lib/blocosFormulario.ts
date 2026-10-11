/**
 * blocosFormulario — os grupos (`bloco`) das perguntas do formulário de inscrição, numa cópia só
 * (Phase 52 / Plan 52-24; D-19). Extraído de `FormularioCandidaturaPage.tsx`, onde nasceu na
 * Phase 4 (D-13); o formulário do candidato e o hub do RH («Respostas da inscrição») importam
 * daqui, para o RH ver as perguntas agrupadas EXATAMENTE como o candidato as viu.
 *
 * @module features/vagas/lib/blocosFormulario
 */

/** O bloco de quem chega sem `bloco` (vazio ou só espaço). */
export const DEFAULT_BLOCO = 'Geral'

/**
 * Rótulo humano para cada `bloco`.
 *
 * ⚠ Os valores de `perguntas_formulario.bloco` são um CHECK fechado — quatro
 * strings feitas para o BANCO: `curriculo`, `jornada`, `tecnologia`, `valores`.
 * Até 2026-08-26 elas apareciam CRUAS como título de seção no formulário, em
 * minúsculo e sem acento, para o candidato ler. Visto em produção durante o teste
 * E2E.
 *
 * Um valor sem rótulo aqui cai no próprio nome do bloco — degrada para o
 * comportamento antigo em vez de sumir com a seção, que seria pior: o candidato
 * perderia a separação entre grupos de perguntas.
 */
export const ROTULO_BLOCO: Record<string, string> = {
  curriculo: 'Sobre sua experiência',
  jornada: 'Disponibilidade',
  tecnologia: 'Ferramentas e rotina',
  valores: 'Motivação',
}

export function rotuloDoBloco(bloco: string): string {
  return ROTULO_BLOCO[bloco] ?? bloco
}

/**
 * D-13 — group perguntas by `bloco`. Empty/whitespace bloco falls back to 'Geral'.
 * Insertion order is preserved by Map semantics, which matches the SQL
 * `ORDER BY ordem ASC` of whoever read the perguntas (useVagaPerguntas no formulário;
 * a EF `ler-cadastro-candidato-rh` no hub).
 */
export function groupByBloco<T extends { bloco: string | null }>(
  perguntas: readonly T[]
): Map<string, T[]> {
  const groups = new Map<string, T[]>()
  for (const p of perguntas) {
    const key = p.bloco && p.bloco.trim() ? p.bloco : DEFAULT_BLOCO
    if (!groups.has(key)) groups.set(key, [])
    groups.get(key)!.push(p)
  }
  return groups
}
