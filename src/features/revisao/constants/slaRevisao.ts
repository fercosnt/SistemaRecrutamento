/**
 * Faixas de acompanhamento da fila de revisão de decisão (REVISAO-02).
 *
 * `classifyRevisaoSla` transforma uma contagem de dias em espera em uma de quatro
 * faixas que o `RevisaoSlaBadge` renderiza (42-UI-SPEC §Faixas do badge de SLA):
 *
 *   em_dia     → dias < diasAtencao                 (verde    "Em dia · {n}d")
 *   atencao    → diasAtencao <= dias < diasAtraso   (âmbar    "Atenção · {n}d")
 *   atrasado   → dias >= diasAtraso                 (vermelho "Atrasado · {n}d")
 *   degenerado → configuração ausente ou ilegível   (sem badge, só a contagem)
 *
 * ── INVARIANTE DE TOTALIDADE (a razão de este módulo existir) ──────────────────
 * Este classificador é puro e **TOTAL**: ele nunca lança, para nenhuma entrada.
 * O motivo é mecânico, não estético — diferente do molde da Phase 34, aqui os
 * limiares NÃO são constantes compiladas: vêm de uma tabela de configuração do
 * servidor, alterável sem deploy (D-P42-02). Isso significa que uma linha ausente,
 * um limiar apagado para `0`, ou uma inversão de ordem digitada por um humano são
 * estados ALCANÇÁVEIS em produção. Se qualquer um deles virasse exceção, a fila
 * inteira do RH cairia por causa de uma célula de configuração — o modo de falha
 * que a faixa `degenerado` existe para absorver. Degradar para a apresentação
 * neutra (a contagem de dias, sem badge) é sempre preferível a uma tela de erro.
 *
 * Este módulo **não** importa a tabela de limiares por etapa compilada da Phase 34
 * (`src/features/funil/constants/slaThresholds.ts`): aquela é do funil de trabalho e
 * é chaveada por etapa; os limiares desta fila vêm do servidor.
 *
 * ── INVARIANTE COLORBLIND-SAFE (regra `ScoreCell` / T-34-04-03) ────────────────
 * `ROTULOS_FAIXA_SLA_REVISAO` garante que cada faixa nominal carregue um rótulo
 * TEXTUAL ao lado da contagem — cor nunca é o único canal de informação.
 *
 * @module features/revisao/constants/slaRevisao
 * @see src/features/funil/constants/slaThresholds.ts (o molde: classifySla + diasNaEtapa)
 * @see .planning/phases/42-invent-rio-gates-fila-art-20/42-UI-SPEC.md (§Faixas do badge de SLA)
 */
import { differenceInCalendarDays } from 'date-fns'

/** A faixa de acompanhamento em que uma revisão pendente se classifica. */
export type FaixaSlaRevisao = 'em_dia' | 'atencao' | 'atrasado' | 'degenerado'

/**
 * Os dois limiares (em dias) lidos da tabela de configuração do servidor.
 * A relação válida é estritamente `0 < diasAtencao < diasAtraso`; qualquer outra
 * combinação é tratada como configuração ilegível → faixa `degenerado`.
 */
export interface LimiaresSlaRevisao {
  /** A partir de quantos dias em espera a linha entra na faixa âmbar. */
  diasAtencao: number
  /** A partir de quantos dias em espera a linha entra na faixa vermelha. */
  diasAtraso: number
}

/**
 * Classifica uma contagem de dias em espera contra os limiares configurados.
 *
 * Puro e **total** — devolve `'degenerado'` (nunca lança) quando a configuração
 * está ausente, tem limiar não finito ou não-positivo, ou está com a ordem
 * invertida/igual; e também quando a própria contagem de dias não é finita.
 */
export function classifyRevisaoSla(
  dias: number,
  cfg?: LimiaresSlaRevisao | null,
): FaixaSlaRevisao {
  // (1) Configuração ausente — a linha de config pode simplesmente não existir.
  if (cfg === undefined || cfg === null) return 'degenerado'

  const { diasAtencao, diasAtraso } = cfg

  // (2) Limiar não finito ou não-positivo — um `0` digitado colocaria TODA a fila
  //     em âmbar/vermelho; é ruído, não sinal.
  if (!Number.isFinite(diasAtencao) || diasAtencao <= 0) return 'degenerado'
  if (!Number.isFinite(diasAtraso) || diasAtraso <= 0) return 'degenerado'

  // (3) Ordem invertida ou igual — a faixa âmbar seria vazia ou negativa.
  if (diasAtraso <= diasAtencao) return 'degenerado'

  // (4) Contagem não finita (NaN vindo de uma data inválida a montante).
  if (!Number.isFinite(dias)) return 'degenerado'

  // (5) Faixas nominais — fronteiras INCLUSIVAS na borda inferior de cada faixa.
  if (dias >= diasAtraso) return 'atrasado'
  if (dias >= diasAtencao) return 'atencao'
  return 'em_dia'
}

/**
 * Dias corridos inteiros que uma revisão está em espera desde `desdeIso`.
 *
 * Clampa negativos em `0` — o mesmo clamp de `diasNaEtapa` (Phase 34): um
 * timestamp no futuro (desvio de relógio entre o banco e o navegador) jamais pode
 * aparecer como um número negativo de dias na tela. Data inválida também resolve
 * para `0`, nunca `NaN` e nunca uma exceção.
 */
export function diasEmEspera(desdeIso: string, now: Date = new Date()): number {
  const desde = new Date(desdeIso)
  if (Number.isNaN(desde.getTime())) return 0
  const dias = differenceInCalendarDays(now, desde)
  if (!Number.isFinite(dias)) return 0
  return dias < 0 ? 0 : dias
}

/**
 * Prefixo textual de cada faixa — o 2º canal (não-cor) do badge.
 * A faixa `degenerado` é intencionalmente vazia: sem configuração legível não há
 * afirmação honesta a fazer sobre o acompanhamento, então a célula mostra apenas a
 * contagem de dias, sem badge.
 */
export const ROTULOS_FAIXA_SLA_REVISAO: Record<FaixaSlaRevisao, string> = {
  em_dia: 'Em dia',
  atencao: 'Atenção',
  atrasado: 'Atrasado',
  degenerado: '',
}
