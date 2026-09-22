/**
 * proximaEtapaDeTrabalho — a resposta ÚNICA para «qual é a próxima etapa de trabalho?».
 *
 * ─── POR QUE ESTE ARQUIVO EXISTE (Phase 49 / plano 49-05 · D-36) ───────────────────────────
 *
 * Três telas do RH oferecem «Avançar», e até este plano cada uma respondia essa pergunta por
 * conta própria:
 *
 *   - `KanbanBoard.tsx`     — lista local de 6 etapas + `indexOf + 1`;
 *   - `HubCandidatoRH.tsx`  — `TIMELINE.slice(0, 6)` + `indexOf + 1` (a MESMA aritmética, escrita
 *                             de outro jeito, a partir de outra lista);
 *   - `ComparativoCandidatosPage.tsx` — nem calculava: gravava sempre
 *                             `PROXIMA_ETAPA_APOS_TRIAGEM` (`avaliacao_assincrona`), qualquer que
 *                             fosse a etapa do candidato. Esse é o defeito que o D-36 nomeia, e o
 *                             conserto dele (plano 49-22) consome ESTE util.
 *
 * Duas implementações da mesma regra divergem em silêncio; uma terceira que não implementa regra
 * nenhuma mente. A varredura C1 do `49-VARREDURA-KICKOFF.md` (#4) mediu as três.
 *
 * ⚠ ESTE UTIL NÃO AUTORIZA NADA. Ele só diz qual é a etapa seguinte na ordem do funil. Quem
 * ACEITA ou RECUSA o avanço é o servidor — o trigger `avancar_etapa`, que valida e audita (e que
 * ganha a trava de «candidatura encerrada» no plano 49-06 / D-35). Uma tela que use este resultado
 * como permissão está errada pela mesma razão que `candidaturaEncerrada` não é autorização.
 *
 * ⚠ E ele NÃO é portão de evidência (D8 da `JORNADA-GUIADA.md`): avançar não exige que a etapa
 * atual tenha produzido nota, análise ou parecer. A pergunta aqui é «qual é a próxima», nunca
 * «pode?».
 *
 * ─── O QUE FICA DE FORA, DE PROPÓSITO ──────────────────────────────────────────────────────
 *
 * - As duas etapas TERMINAIS (`aprovado`, `rejeitado`) não estão na lista: não se «avança» para
 *   elas pelo funil — quem as grava é `registrar_decisao` / `rejeitar_candidatura`, pelo caminho
 *   auditado. Por isso `proximaEtapaDeTrabalho('decisao_final')` é `undefined`: depois da decisão
 *   final não há etapa de trabalho, há decisão.
 * - `FUNNEL_ORDER` (`RetrocederCandidaturaDialog.tsx:55`) NÃO foi unificada com esta lista, apesar
 *   de os seis valores coincidirem hoje. Ela responde a outra pergunta — quais etapas ANTERIORES
 *   são destino de retrocesso — e as duas perguntas terem a mesma resposta é coincidência da
 *   ordem, não um invariante. Fundi-las faria uma mudança de escopo de retrocesso mexer no avanço.
 * - `TIMELINE` (`HubCandidatoRH.tsx:63`, as 8 etapas) fica: ela DESENHA a linha do tempo, incluindo
 *   os terminais. Desenhar e decidir são coisas diferentes.
 *
 * @module lib/candidatura/proximaEtapa
 * @see src/features/triagem/services/triagemService.ts (`EtapaFunilM2` — o enum `etapa_processo` do DB)
 * @see src/lib/candidatura/candidaturaEncerrada.ts (o predicado irmão: «esta candidatura acabou?»)
 */
import type { EtapaFunilM2 } from '@/features/triagem/services/triagemService'

/**
 * As 6 etapas de trabalho do funil M2, NA ORDEM (UI-SPEC §1). É a lista que decide o avanço, e a
 * mesma que o Kanban usa para montar as suas colunas.
 *
 * `as const satisfies` de propósito: o `satisfies` prova em tempo de compilação que todo valor
 * aqui é um `EtapaFunilM2` (um erro de digitação não compila), e o `as const` preserva a tupla
 * literal — sem ela, `EtapaDeTrabalho` colapsaria em `EtapaFunilM2` e o `Record<EtapaDeTrabalho,…>`
 * do Kanban voltaria a exigir chaves para os terminais.
 */
export const ETAPAS_DE_TRABALHO = [
  'inscricao',
  'triagem',
  'avaliacao_assincrona',
  'entrevista_online',
  'entrevista_presencial',
  'decisao_final',
] as const satisfies readonly EtapaFunilM2[]

/** Uma das 6 etapas de trabalho — o subconjunto de `EtapaFunilM2` sem os terminais. */
export type EtapaDeTrabalho = (typeof ETAPAS_DE_TRABALHO)[number]

/**
 * A próxima etapa de trabalho depois de `etapa`, ou `undefined` quando não há próxima.
 *
 * Aceita `string | null | undefined` (e não só `EtapaFunilM2`) porque os chamadores leem
 * `candidaturas.etapa_atual` de um payload do PostgREST, onde o valor pode ser nulo ou um rótulo
 * legado que o enum atual não conhece. Null-safe e allowlist: o que não está na lista não tem
 * próxima etapa.
 *
 * `undefined` em: `decisao_final` (última etapa de trabalho), etapa terminal (`aprovado`,
 * `rejeitado`), `null`/`undefined`, e qualquer valor desconhecido.
 */
export function proximaEtapaDeTrabalho(
  etapa: string | null | undefined,
): EtapaDeTrabalho | undefined {
  if (!etapa) return undefined
  const indice = (ETAPAS_DE_TRABALHO as readonly string[]).indexOf(etapa)
  if (indice < 0) return undefined
  return ETAPAS_DE_TRABALHO[indice + 1]
}
