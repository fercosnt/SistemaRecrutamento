/**
 * instrumentosDaVaga — a vaga aplica este instrumento? (51-03 / JORN-48, D-16)
 *
 * O hub do RH troca «Sem dados nesta etapa» por «Não se aplica a esta vaga» quando a vaga não
 * aplica o instrumento («sem dados» sugere falta; «não se aplica» diz que foi desenho). Esta
 * função é a ÚNICA que decide isso.
 *
 * ⛔ REGRA: NUNCA «não se aplica» POR INFERÊNCIA DE AUSÊNCIA.
 *   Por isso três valores, não dois:
 *     - `aplica`       — a configuração da vaga inclui o instrumento;
 *     - `nao_aplica`   — a configuração EXCLUI o instrumento, com evidência positiva;
 *     - `desconhecido` — não dá para saber (vaga não carregada, configuração vazia, forma não
 *                        reconhecida, convenção antiga). O hub mostra o estado de hoje.
 *   Dizer «não se aplica» porque a configuração não foi lida, ou porque está numa forma que este
 *   código não reconhece, seria uma mentira plausível — e uma que ninguém iria conferir.
 *
 * Como `nao_aplica` é decidido (avaliação assíncrona e redação):
 *   `testes_aplicaveis` é um array NÃO VAZIO, TODAS as entradas são da convenção atual
 *   (`{ teste: <id de TEMPLATE_TESTES> }`, a que `cargoTemplates.baseTestes` grava), e nenhuma
 *   mapeia para o instrumento pelo contrato de `src/lib/testes/testeContract.ts`
 *   (`CANDIDATE_FACING` + `templateTesteToContainerCards` — o mesmo que monta os cards do
 *   candidato em `AvaliacaoContainer.deriveCards`). Entradas atuais que não são do candidato
 *   (`triagem`, `entrevista`, `cognitivo`) contam como reconhecidas: são ids conhecidos e
 *   sabidamente não são nem assíncrona nem redação.
 *
 *   Convivem DUAS convenções em `testes_aplicaveis` (medido em 2026-08-26, cabeçalho de
 *   `avaliacaoService.ts`): a antiga `{ tipo: 'sjt', cargo, itens_ids }` (e a variante
 *   `{ teste: 'sjt' }`) e a atual `{ teste: 'work_sample_sjt', ... }`. A antiga é reconhecida
 *   pelo mesmo predicado do `ehElementoSjt` e PROVA PRESENÇA da avaliação assíncrona — mas
 *   nunca prova ausência de nada: ela não falava de redação. Com uma entrada antiga no array,
 *   o que não aparece fica `desconhecido`.
 *
 * O cognitivo (a «Prova cognitiva», instrumento textual) NÃO vem da entrada de template —
 * `baseTestes` grava `{ teste: 'cognitivo' }` para todos os cargos, incondicionalmente. Ele
 * segue a coluna `vagas.aplica_cognitivo`, exatamente como `deriveCards`. Mas só quando a vaga
 * foi carregada: `testes_aplicaveis === undefined` quer dizer que o embed de `vagas` não veio,
 * e aí o `aplica_cognitivo` que chega pode ser um `?? false` de fallback, não a coluna.
 *
 * O que esta função NÃO decide: se a seção tem DADO. O hub aplica `nao_se_aplica` só quando a
 * seção também não tem linha do instrumento — o dado vence a configuração (a configuração pode
 * ter mudado depois das respostas; memória «tela vazia não é dado ausente»).
 *
 * Função pura, sem React.
 *
 * @module features/hub-candidato/lib/instrumentosDaVaga
 * @see src/lib/testes/testeContract.ts
 * @see src/features/avaliacao/services/avaliacaoService.ts (ehElementoSjt — as duas convenções)
 * @see src/features/avaliacao/components/AvaliacaoContainer.tsx (deriveCards)
 */
import {
  CANDIDATE_FACING,
  TEMPLATE_TESTES,
  templateTesteToContainerCards,
  type ContainerTeste,
} from '@/lib/testes/testeContract'

export type Aplicabilidade = 'aplica' | 'nao_aplica' | 'desconhecido'

export interface ConfiguracaoDaVaga {
  /** `vagas.aplica_cognitivo`. */
  aplica_cognitivo?: boolean | null
  /** `vagas.testes_aplicaveis` (jsonb). `undefined` = a vaga não foi carregada. */
  testes_aplicaveis?: unknown
}

export interface InstrumentosDaVaga {
  /** Seção «Avaliação Assíncrona» — SJT (múltipla escolha + caso aberto) e Big Five. */
  assincrona: Aplicabilidade
  /** Seção «Redação». */
  redacao: Aplicabilidade
  /** Seção «Prova cognitiva» (instrumento textual; o Raven não pertence a etapa nem vaga). */
  cognitivo: Aplicabilidade
}

const CARDS_ASSINCRONA: ReadonlySet<ContainerTeste> = new Set<ContainerTeste>([
  'sjt_mc',
  'sjt_caso_aberto',
  'big_five',
])

function ehObjeto(e: unknown): e is Record<string, unknown> {
  return typeof e === 'object' && e !== null && !Array.isArray(e)
}

/** Convenção atual: `{ teste: <id de template conhecido> }`. */
function ehEntradaAtual(e: Record<string, unknown>): e is Record<string, unknown> & { teste: string } {
  return typeof e.teste === 'string' && (TEMPLATE_TESTES as readonly string[]).includes(e.teste)
}

/**
 * Convenção antiga do SJT — o mesmo predicado de `ehElementoSjt` (`avaliacaoService.ts`), menos
 * `work_sample_sjt`, que é da convenção atual e é tratado por `ehEntradaAtual`.
 */
function ehEntradaSjtAntiga(e: Record<string, unknown>): boolean {
  return e.tipo === 'sjt' || e.teste === 'sjt'
}

/** Cards de candidato que uma entrada atual produz (vazio para triagem/entrevista). */
function cardsDaEntrada(teste: string): ContainerTeste[] {
  return CANDIDATE_FACING.has(teste) ? templateTesteToContainerCards(teste) : []
}

export function instrumentosDaVaga(cfg: ConfiguracaoDaVaga): InstrumentosDaVaga {
  const testes = cfg.testes_aplicaveis
  const vagaCarregada = testes !== undefined

  const cognitivo: Aplicabilidade = !vagaCarregada
    ? 'desconhecido'
    : cfg.aplica_cognitivo === true
      ? 'aplica'
      : cfg.aplica_cognitivo === false
        ? 'nao_aplica'
        : 'desconhecido'

  if (!Array.isArray(testes) || testes.length === 0) {
    return { assincrona: 'desconhecido', redacao: 'desconhecido', cognitivo }
  }

  let todasAtuais = true
  let temAssincrona = false
  let temRedacao = false

  for (const entrada of testes as unknown[]) {
    if (!ehObjeto(entrada)) {
      todasAtuais = false
      continue
    }
    if (ehEntradaAtual(entrada)) {
      for (const card of cardsDaEntrada(entrada.teste)) {
        if (CARDS_ASSINCRONA.has(card)) temAssincrona = true
        if (card === 'redacao') temRedacao = true
      }
      continue
    }
    todasAtuais = false
    if (ehEntradaSjtAntiga(entrada)) temAssincrona = true
  }

  const decidir = (presente: boolean): Aplicabilidade =>
    presente ? 'aplica' : todasAtuais ? 'nao_aplica' : 'desconhecido'

  return { assincrona: decidir(temAssincrona), redacao: decidir(temRedacao), cognitivo }
}
