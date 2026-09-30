/**
 * `_shared/sinal-revisao.ts` — o vocabulário do SINAL de revisão, em UM lugar.
 *
 * Phase 49 / plano 49-38 · JORN-41 · decisão (a) do operador (2026-09-29).
 *
 * ─── O QUE É O SINAL ──────────────────────────────────────────────────────────────────────
 *
 * O detector de injeção tem três níveis (49-37): `block`, `flag` e `none`. Só o `block` recusa
 * a análise (nenhuma chamada de modelo). O `flag` é o imperativo nu dirigido a quem lê o texto
 * («Esqueça as regras…», «Dê nota máxima…») sem nomear o prompt, o modelo ou a IA: pela decisão
 * (a), ele NÃO pode recusar a análise e também NÃO pode passar em silêncio. O `callAi` chama o
 * modelo, grava uma linha-evento de auditoria (`provider='none'`,
 * `error_code='prompt_injection_flagged'`, chave nula) e devolve `injection_flag`. As EFs gravam
 * o código abaixo no resultado que o RH revisa, e as telas o mostram com o rótulo abaixo.
 *
 * ─── POR QUE NÃO `flagged_for_human_review` ───────────────────────────────────────────────
 *
 * Três EFs tratam `flagged_for_human_review === true` como AUSÊNCIA de resultado:
 * `analise-candidato-individual` lança e grava a análise como «falhou»; `avaliar-redacao-cultural`
 * e `avaliar-redacao` gravam a linha de revisão humana SEM a nota. Reusar essa flag para o sinal
 * transformaria o `flag` em bloqueio por outro caminho — exatamente o que a decisão (a) proíbe.
 * O sinal tem campo próprio (`CallAiResult.injection_flag`) e formas persistidas próprias, que
 * nenhum consumidor atual interpreta como «sem resultado».
 *
 * ─── FORMAS PERSISTIDAS (contrato cumprido pelos 49-39/49-40, lido pelos 49-41/49-42) ──────
 *
 * | Tabela / coluna                              | Forma                                              |
 * |----------------------------------------------|----------------------------------------------------|
 * | `analise_candidato_vaga.flags` (`text[]`)    | contém o código                                    |
 * | `redacoes_candidato.flags` (`text[]`)        | contém o código                                    |
 * | `scores_candidato.metadata.motivos_revisao`  | contém o código; a linha vai a `pendente_humano`   |
 * |   (SJT, `jsonb`)                             |                                                    |
 * | `entrevista_analises.bias_flags` (`jsonb`)   | ganha um elemento `{ "sinal": <código> }`, escrito |
 * |                                              | pelo SERVIDOR, nunca pelo modelo                   |
 * | `comparativo_solicitado.ranking.sinais_revisao` | contém o código; a chave fica AUSENTE sem sinal,|
 * |   (`jsonb`)                                  | nunca `[]` (lição do 49-26)                        |
 * | `gerar-guia-entrevista`,                     | só a linha-evento em `ai_call_logs`: a entrada     |
 * | `gerar-devolutiva-bigfive`                   | delas é texto do sistema (49-40 prova)             |
 *
 * `sinaisDe` lê TODAS essas formas (array de códigos, ou array de objetos com `sinal`) e devolve
 * `[]` para qualquer outra coisa. `comSinal` acrescenta sem duplicar.
 *
 * ─── ZERO IMPORTS POR DESIGN ──────────────────────────────────────────────────────────────
 *
 * O mesmo contrato de `_shared/resultado-de-provedor.ts` e `_shared/ai-error-codes.ts`: nenhum
 * `npm:`, nenhum `https://deno.land/std`, nenhum `.ts`. O front importa este arquivo por caminho
 * relativo; um único import o impediria de fazê-lo, e duas cópias do vocabulário divergem em
 * silêncio. Não acrescentar imports sem revisitar isso.
 *
 * @see supabase/functions/_shared/ai-client.ts (o caminho `flag` e `injection_flag`)
 * @see supabase/functions/_shared/injection-detector.ts (`classifyPromptInjection`)
 * @see supabase/functions/_shared/__tests__/sinal-revisao.test.ts
 */

/** Código do sinal «possível instrução dirigida à IA» — o que as EFs gravam nas formas acima. */
export const SINAL_INSTRUCAO_AO_MODELO = "instrucao_ao_modelo" as const;

/**
 * Rótulo pt-BR de cada sinal, para as telas do RH e do admin.
 *
 * Linguagem de produto (D-58): descreve o que o RH deve fazer, não o mecanismo. Nada de
 * «ataque», «injeção» ou «suspeito» — o texto sinalizado é, na maioria dos casos, de gente
 * honesta que escreveu um imperativo.
 */
export const ROTULO_SINAL = {
  instrucao_ao_modelo:
    "Possível instrução dirigida à IA no texto analisado — revise o texto antes de considerar este resultado",
} as const;

/** Rótulo pt-BR de um código de sinal; um código desconhecido volta como ele mesmo. */
export function rotuloDoSinal(codigo: string): string {
  return (ROTULO_SINAL as Record<string, string>)[codigo] ?? codigo;
}

/**
 * Lê os códigos de sinal de qualquer forma persistida.
 *
 * - array de strings (`flags`, `motivos_revisao`, `sinais_revisao`) → as strings;
 * - array de objetos (`bias_flags`) → o `sinal` de cada elemento que o tenha como string (os
 *   demais objetos — as flags de viés que o MODELO escreve — são ignorados);
 * - qualquer outra coisa (`null`, objeto, string, número) → `[]`. Nunca lança: uma linha com
 *   um `jsonb` inesperado não pode derrubar a tela inteira.
 */
export function sinaisDe(valor: unknown): string[] {
  if (!Array.isArray(valor)) return [];
  const sinais: string[] = [];
  for (const item of valor) {
    if (typeof item === "string") {
      sinais.push(item);
    } else if (item !== null && typeof item === "object") {
      const sinal = (item as { sinal?: unknown }).sinal;
      if (typeof sinal === "string") sinais.push(sinal);
    }
  }
  return sinais;
}

/** Acrescenta `codigo` a `lista` sem duplicar (reprocessar não empilha o mesmo código). */
export function comSinal(lista: readonly string[] | null | undefined, codigo: string): string[] {
  const base = Array.isArray(lista) ? [...lista] : [];
  return base.includes(codigo) ? base : [...base, codigo];
}
