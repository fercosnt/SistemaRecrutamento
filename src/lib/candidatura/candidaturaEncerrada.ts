/**
 * candidaturaEncerrada — REEXPORT. A implementação não vive mais aqui.
 *
 * Phase 49 / plano 49-03 (D-21): quando o lado DENO passou a precisar do mesmo critério — a
 * guarda de `avanco` da EF `notificar-candidato` (49-03 / D-35) e o comparativo (49-08) —, a
 * escolha era entre uma segunda cópia TS da allowlist e uma fonte só. Uma cópia diverge em
 * silêncio, que é exatamente o defeito que a função SQL canônica do 48-01 existe para não ter.
 *
 * A implementação, o docblock com o POR QUÊ do critério e a tabela-verdade Deno estão em
 * `supabase/functions/_shared/candidaturaEncerrada.ts` — módulo SEM IMPORTS, importado daqui por
 * caminho relativo. A direção `src/` → `supabase/functions/_shared/` já é usada em produção por
 * `src/features/privacidade/services/exportacaoService.ts:61` (`EXPORT_ALLOWLIST`), pela mesma
 * razão: uma fonte, dois consumidores.
 *
 * ⚠ Este arquivo continua existindo porque o caminho `@/lib/candidatura/candidaturaEncerrada` é
 * o que 4 telas do candidato/RH importam (`DashboardCandidatoPage`, `HubCandidatoRH`,
 * `CandidatosRHPage`, e o teste vitest da tabela-verdade). Nenhum chamador mudou.
 *
 * ⚠ NÃO reescrever a allowlist aqui. Um conjunto de estados terminais construído NESTE arquivo é
 * a segunda verdade que o 49-03 removeu — e o `<verify>` do plano reprova pela forma
 * `new Set(` seguida de literal de lista, que é como uma cópia da allowlist se escreveria.
 * (⚠ E é por isso que a frase acima não a escreve por extenso: o portão lê o arquivo inteiro,
 * comentários incluídos, e não sabe distinguir prosa de código — ele mordeu esta própria linha
 * na primeira redação. Portão que confunde os dois é portão que se conserta na PROSA, nunca
 * afrouxando o padrão.)
 *
 * O teste `__tests__/candidaturaEncerrada.test.ts` (vitest) importa DESTE arquivo de propósito:
 * ele prova a tabela-verdade **através do reexport**, que é o caminho que o front usa de verdade.
 *
 * @module lib/candidatura/candidaturaEncerrada
 * @see supabase/functions/_shared/candidaturaEncerrada.ts (a implementação e o porquê do critério)
 * @see supabase/migrations/20260921000001_p48_candidatura_encerrada.sql (a função SQL espelhada)
 */
export {
  candidaturaEncerrada,
  ETAPAS_TERMINAIS,
  STATUS_TERMINAIS,
} from '../../../supabase/functions/_shared/candidaturaEncerrada'
