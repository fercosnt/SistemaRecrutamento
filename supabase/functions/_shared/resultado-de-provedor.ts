/**
 * `_shared/resultado-de-provedor.ts` — a pergunta «ALGUM modelo respondeu isto?», em UM lugar.
 *
 * Phase 49 / plano 49-26 · D-21 («reusar, não recriar») · JORN-28 / JORN-39.
 *
 * ─── POR QUE ESTE ARQUIVO EXISTE ──────────────────────────────────────────────────────────
 *
 * `callAi` (`_shared/ai-client.ts`) tem caminhos que NUNCA tocam provedor nenhum: o teto HARD
 * de custo diário por vaga (AI-06) e a detecção de injeção no input do candidato (RF-PL-18).
 * Nos dois, `CallAiResult.provider` vale `"none"`, `model` vale `null` — e `parsed` **NÃO é
 * nulo**. Ele carrega um stub (uma recomendação de «segurar» mais o marcador de revisão
 * humana) que existe para o chamador não precisar tratar `null` e para preservar a RNF-07a:
 * o sistema nunca rejeita um candidato por causa de gasto.
 *
 * Esse stub é a razão pela qual toda guarda escrita como «o resultado veio nulo?» é uma guarda
 * que NÃO guarda. Um objeto não nulo passa por ela, e o bloqueio segue para o caminho de
 * sucesso: a linha é persistida com cara de resultado de IA, com o conteúdo vazio. Medido duas
 * vezes na Phase 49, em duas Edge Functions diferentes (`WINDOWS` 60 e 65) — o mesmo defeito,
 * a mesma causa, descoberto em dois lugares separados porque a pergunta estava escrita duas
 * vezes. Ela agora está escrita **aqui**, uma vez.
 *
 * ─── POR QUE A PERGUNTA É PELO PROVEDOR ───────────────────────────────────────────────────
 *
 * A alternativa tentadora é comparar `error_code` contra os códigos de bloqueio conhecidos.
 * É a forma «iteração sobre lista literal» que o CLAUDE.md §«Portões» descreve: ela cobre os
 * bloqueios que existiam no dia em que foi escrita e deixa o próximo **fora da vigilância**,
 * com o caminho seguindo verde. Foi exatamente assim que o teto de custo passou — a lista
 * conhecia só a injeção. (A forma retirada não é reproduzida aqui de propósito: os portões
 * estáticos desta fase a procuram NO DISCO, e citá-la a deixaria encontrável no arquivo que
 * existe para não tê-la.)
 *
 * «Nenhum provedor respondeu» é ESTRUTURAL: cobre os dois bloqueios de hoje e qualquer um de
 * amanhã por construção, porque um bloqueio anterior ao provedor não tem como não ser um
 * resultado sem provedor. O `error_code` continua valendo — como **diagnóstico** (o que vai
 * para a flag / a coluna, para quem ler depois saber a causa), nunca como gatilho.
 *
 * ⚠ ESTE PREDICADO NÃO SUBSTITUI a checagem de conteúdo. Provedor que respondeu ainda pode
 * ter devolvido um `parsed` nulo (parse falho, schema recusado). As duas perguntas são
 * independentes e os chamadores fazem as duas: «alguém respondeu?» **e** «o que veio serve?».
 *
 * ─── ZERO IMPORTS POR DESIGN ──────────────────────────────────────────────────────────────
 *
 * O mesmo contrato de `_shared/email-config.ts:12-17`, `_shared/candidaturaEncerrada.ts` e
 * `_shared/ai-error-codes.ts`: nenhum `npm:`, nenhum `https://deno.land/std`, nenhum `.ts`.
 * Assim (a) as EFs consumidoras não precisam de entrada nova no `import_map`, (b) a suíte
 * deste módulo roda sem `--allow-net`, e (c) o front poderia importá-lo por caminho relativo
 * sem arrastar nada para o grafo do Vite. Não acrescentar imports sem revisitar isso.
 *
 * @see supabase/functions/_shared/ai-client.ts (os retornos sem provedor)
 * @see supabase/functions/_shared/ai-error-codes.ts (o vocabulário do diagnóstico)
 * @see supabase/functions/_shared/__tests__/resultado-de-provedor.test.ts (a tabela-verdade)
 */

/**
 * Valor de `CallAiResult.provider` quando NENHUM provedor foi chamado.
 *
 * Existe como constante nomeada porque a string crua estava espalhada por seis Edge Functions,
 * e porque ela **não é nome de provedor**: gravá-la numa coluna de proveniência faria um leitor
 * futuro procurar um modelo chamado assim. Quem persiste proveniência mapeia este caso para
 * `NULL` — o vocabulário que `redacoes_candidato`, `scores_candidato` e `entrevista_guias` já
 * usam para «não registrado» (D-30).
 */
export const PROVEDOR_NENHUM = "none" as const;

/** A fatia de `CallAiResult` que este predicado precisa — nada além do provedor. */
export interface ResultadoComProvedor {
  provider?: string | null;
}

/**
 * `true` quando ALGUM provedor de IA de fato produziu este resultado.
 *
 * `false` significa que o resultado é um artefato nosso, não uma resposta de modelo: ele não
 * pode ser persistido como conteúdo de IA, não pode receber proveniência e não pode entrar
 * numa fila de revisão humana como se fosse uma avaliação que alguém precisa revisar.
 *
 * O provedor vazio/ausente entra no mesmo ramo — é o idioma que `avaliar-redacao` (49-11) já
 * usa: na dúvida sobre quem respondeu, a EF NÃO afirma que há resultado. Hoje esse cinto é
 * inalcançável (todo retorno de `callAi` carrega um literal não vazio, e o único de origem
 * externa lê `ai_call_logs.provider`, que é o enum `llm_provider` NOT NULL em PROD), e ele fica
 * porque inalcançável por construção não é o mesmo que dispensável — e porque a sua remoção
 * reprova no teste, em vez de sair verde e voltar como defeito silencioso.
 */
export function algumProvedorRespondeu(resultado: ResultadoComProvedor): boolean {
  return !!resultado.provider && resultado.provider !== PROVEDOR_NENHUM;
}
