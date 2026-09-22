/**
 * candidaturaEncerrada — o predicado canônico de «esta candidatura ACABOU», em TypeScript.
 *
 * É o espelho TS da função SQL `public.candidatura_encerrada(etapa, status)` (migration
 * `20260921000001_p48_candidatura_encerrada.sql`, plano 48-01, em PROD):
 *
 *   COALESCE(p_etapa IN ('aprovado','rejeitado'), false)
 *   OR COALESCE(p_status IN ('rejeitado','finalizado'), false)
 *
 * Os dois lados têm de dizer a mesma coisa. Se um mudar, o outro muda junto — a tabela-verdade
 * do SQL está no `p48_candidatura_encerrada_smoke.sql` (lida do `pg_enum`), e os MESMOS casos
 * estão testados nos dois runtimes sobre ESTA implementação: `__tests__/candidaturaEncerrada.test.ts`
 * (Deno, ao lado) e `src/lib/candidatura/__tests__/candidaturaEncerrada.test.ts` (vitest, pelo
 * reexport).
 *
 * ─── POR QUE ESTE ARQUIVO MORA EM `_shared` (Phase 49 / plano 49-03 · D-21) ────────────────
 *
 * Ele nasceu em `src/lib/candidatura/candidaturaEncerrada.ts` (plano 48-02), onde só o front o
 * alcançava. Quando o lado Deno passou a precisar do mesmo critério — a guarda de `avanco` da EF
 * `notificar-candidato` (49-03) e o comparativo (49-08) —, havia três caminhos, e dois deles
 * eram piores:
 *
 *   (a) uma CÓPIA em `supabase/functions/` — seria a segunda implementação TS da mesma
 *       allowlist, e cópias divergem em silêncio. É exatamente o defeito que a função SQL
 *       canônica do 48-01 existe para não ter (cinco `IN (...)` espalhados, D-11).
 *   (b) perguntar ao banco (`rpc('candidatura_encerrada')`) — uma ida ao banco por e-mail e,
 *       no comparativo, por candidatura, para reavaliar dois campos que o chamador JÁ TEM em mãos.
 *   (c) UMA implementação, aqui, importada pelos dois lados. É esta.
 *
 * A direção de import `src/` → `supabase/functions/_shared/` não é nova: é a que
 * `src/features/privacidade/services/exportacaoService.ts:61` já usa em produção para o
 * `EXPORT_ALLOWLIST`, pela mesma razão (uma fonte, dois consumidores). `src/lib/candidatura/
 * candidaturaEncerrada.ts` passou a ser um REEXPORT deste módulo — nenhum chamador do front
 * mudou de import.
 *
 * ⚠ ZERO IMPORTS POR DESIGN — o mesmo contrato de `_shared/email-config.ts:12-17`. Nenhum
 * `zod`, nenhum `https://deno.land/std`, nenhum `npm:`. Motivos: (a) as EFs consumidoras não
 * precisam de entrada de `import_map` no `config.toml`; (b) a suíte Deno deste módulo roda sem
 * `--allow-net` — nada aqui busca rede em tempo de import; (c) o front o importa por caminho
 * RELATIVO, e um import de `npm:`/`https:` aqui entraria no grafo do bundle do Vite.
 *
 * ─── O CRITÉRIO ───────────────────────────────────────────────────────────────────────────
 *
 * POR QUE `etapa` E `status`, e não só a etapa (JORN-26 / D-11): o knockout da inscrição
 * PRESERVA `etapa_atual='inscricao'` por desenho e só move `status` para `rejeitado`; e há
 * linhas legadas com `status='finalizado'` em etapa de trabalho (`triagem`, `entrevista_online`,
 * `decisao_final`). Todo código que decidia «acabou?» olhando só `etapa_atual` errava nesses
 * dois casos — o hub do RH oferecia «Avançar» a uma candidata eliminada, e isso a devolvia ao
 * funil (varredura `48-VARREDURA-ETAPA-ATUAL.md`, C1/C1b/C2).
 *
 * É uma ALLOWLIST de estados terminais, null-safe: valor desconhecido/nulo NÃO encerra.
 * `aprovado_proxima` não encerra — ali há de fato um próximo passo.
 *
 * `encerrada_a_pedido_em` fica FORA de propósito (D-34 / D-21): retirada a pedido NÃO é
 * encerrada por este predicado — a Invariante 9 da 45-UI-SPEC exige que a candidatura retirada
 * CONTINUE visível ao RH, e pô-la aqui a sumiria da fila.
 *
 * ⚠ O SERVIDOR É QUEM DECIDE. `rejeitar_candidatura` recusa candidatura encerrada (48-01, D3);
 * este helper serve para a tela não OFERECER uma ação que não faz sentido, e para uma Edge
 * Function não DISPARAR um efeito externo que não faz sentido (o e-mail de «avanço» de quem já
 * foi eliminado — 49-03 / D-35). Não use o resultado dele como autorização de nada.
 *
 * @module supabase/functions/_shared/candidaturaEncerrada
 * @see supabase/migrations/20260921000001_p48_candidatura_encerrada.sql (a função SQL espelhada)
 * @see src/lib/candidatura/candidaturaEncerrada.ts (o reexport para o front)
 * @see src/components/pages/DashboardCandidatoPage.tsx (origem da regra: o antigo `STATUS_TERMINAIS` local)
 */

/** Etapas que só existem depois de o processo acabar. */
export const ETAPAS_TERMINAIS: ReadonlySet<string> = new Set(["aprovado", "rejeitado"]);

/**
 * Status em que a candidatura acabou, esteja em que etapa estiver — `rejeitado` cobre o
 * knockout (etapa `inscricao`), `finalizado` cobre o legado em etapa de trabalho.
 */
export const STATUS_TERMINAIS: ReadonlySet<string> = new Set(["rejeitado", "finalizado"]);

/**
 * `true` se a candidatura acabou: etapa terminal OU status terminal. Null-safe — `null`/
 * `undefined` em qualquer um dos dois lados conta como «não terminal» naquele lado.
 */
export function candidaturaEncerrada(
  etapa: string | null | undefined,
  status: string | null | undefined,
): boolean {
  return (!!etapa && ETAPAS_TERMINAIS.has(etapa)) || (!!status && STATUS_TERMINAIS.has(status));
}
