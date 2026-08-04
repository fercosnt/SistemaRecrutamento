/**
 * exportacaoService — o lado cliente do direito de acesso (LGPD, Art. 18, II).
 *
 * Phase 44 / Plano 44-05 (o TRACER). Clona a postura de `privacidadeService`:
 * classe de erro própria com vocabulário PEQUENO, tradutor privado, e **nenhuma
 * mensagem crua do transporte cruzando para a tela**.
 *
 * ── O CORTE QUE É O PONTO DESTE MÓDULO ───────────────────────────────────────
 * `gerarJsonExport` é **pura** (objeto dentro, string fora) e `dispararDownloads` é
 * o único lugar que toca o navegador. É o mesmo corte que
 * `gerarIcsAgendamento` / `baixarIcsAgendamento` já estabeleceram nesta base, e é
 * ele que torna o gerador do arquivo que a lei exige testável sem simular um clique.
 *
 * ── TRÊS PROIBIÇÕES QUE NÃO SÃO DETALHE DE IMPLEMENTAÇÃO ─────────────────────
 *
 *  1. **Nenhum `candidato_id` sai daqui.** A Edge Function não lê o corpo do
 *     request; mandar o id daria a impressão de que ele importa — e é exatamente o
 *     id que a superfície de Tampering T-32-03 / T-44-02 gostaria de receber. A
 *     invocação é literalmente sem opções.
 *
 *  2. **Nenhuma URL assinada entra no arquivo entregue** (Invariante 4 da
 *     44-UI-SPEC). O que a allowlist projeta de `candidaturas` é o CAMINHO de
 *     Storage do currículo, não um link: um link de 60 s dentro de um arquivo que a
 *     pessoa abre amanhã é um link morto que parece mentira do export. O arquivo em
 *     si é aberto à parte, pelo cliente (BD-7 / plano 44-07).
 *
 *  3. **Zero PII no nome do arquivo** (Invariante 9). O nome aparece na barra de
 *     downloads e na pasta compartilhada do aparelho: `beauty-smile-meus-dados-
 *     {aaaa-mm-dd}.{ext}`, sem nome, e-mail, CPF ou id.
 *
 * ── O ESCOPO DESTA FATIA, E O QUE FICA DE FORA POR HONESTIDADE ───────────────
 * Aqui o titular recebe **um** arquivo, o `.json`. A copy "Você recebe dois
 * arquivos" da 44-UI-SPEC entra no 44-06, **junto com o `.html` que a torna
 * verdadeira** — renderizá-la agora seria a tela afirmando ao titular que recebeu
 * mais do que recebeu, que é precisamente a mentira que esta fase existe para não
 * cometer. `dispararDownloads` já recebe uma LISTA porque a ordem é contrato: o
 * `.json` primeiro, e se o navegador barrar o segundo download o que sobrevive é o
 * que a lei exige.
 *
 * @module features/privacidade/services/exportacaoService
 * @see src/features/privacidade/services/privacidadeService.ts (o molde: classe de erro + tradutor privado)
 * @see src/features/agendamento/services/agendamentoCandidatoService.ts (o molde do disparo por Blob/anchor)
 */
import { supabase } from '@/lib/supabase/client'
// O endereço do Encarregado tem UMA fonte no projeto. Duplicá-lo aqui criaria duas
// verdades sobre o mesmo canal humano — e é o canal que a copy de erro oferece
// quando o caminho automático falha.
import { ENCARREGADO_EMAIL } from '../components/AutorizacoesLista'

/**
 * Copy verbatim da 44-UI-SPEC (§`/candidato/privacidade` · Seção 3 e §O CTA e seus
 * cinco estados) — fonte única desta tela e do arquivo entregue.
 *
 * Ela é o que o sistema **afirma** ao titular sobre o tratamento dos dados dele;
 * "melhorar" a redação sem passar pela spec é alterar uma declaração de compliance.
 * É também o que torna executáveis os greps de ban da §Copywriting — e o que faz o
 * ESCOPO deles importar.
 */
export const COPY_PEDIR_COPIA = {
  cta: 'Baixar uma cópia dos meus dados',
  ctaEmVoo: 'Preparando sua cópia…',
  abertura:
    'Você pode baixar uma cópia dos dados que a Beauty Smile guarda sobre você. É um direito seu (LGPD, Art. 18, II).',
  oQueEstaTitulo: 'O que está na cópia',
  oQueEsta:
    'Seu cadastro, suas candidaturas, o que você autorizou, suas entrevistas agendadas, o histórico de cada candidatura, e o resultado e a explicação das avaliações que você fez.',
  oQueNaoEstaTitulo: 'O que não está na cópia',
  oQueNaoEsta:
    'Não entram os registros internos de funcionamento do sistema — por exemplo, o tempo e o custo de processamento das nossas ferramentas de tecnologia. Eles descrevem o sistema, não você.',
  erroTitulo: 'Não foi possível preparar sua cópia.',
  erroCorpo: `Tente novamente em alguns minutos. Se continuar, escreva para o nosso Encarregado de Dados: ${ENCARREGADO_EMAIL}.`,
} as const

/** Vocabulário FECHADO — a UI decide por `code`, nunca lendo a mensagem. */
export type CodigoExportacao =
  | 'UNAUTHORIZED'
  | 'FORBIDDEN'
  | 'COOLDOWN'
  | 'SERVER_ERROR'
  | 'NETWORK'

/** Erro de serviço no padrão `camelCaseService.ts` (CLAUDE.md). */
export class ExportacaoError extends Error {
  constructor(
    message: string,
    public code: CodigoExportacao,
    /**
     * ISO do instante em que o titular pode pedir de novo — presente APENAS em
     * `COOLDOWN`. Vem do SERVIDOR (a EF o calcula), e é por isso que a copy de
     * cooldown do servidor e a do cliente podem ser a MESMA frase com a MESMA hora
     * (Invariante 3 da 44-UI-SPEC). Renderizado a partir do 44-06.
     */
    public liberadoEm?: string,
  ) {
    super(message)
    this.name = 'ExportacaoError'
  }
}

/** O que a Edge Function devolve no caminho feliz. */
export interface RespostaExport {
  ok: true
  versao_allowlist: string
  gerado_em: string
  /** Um bloco por tabela da allowlist, sempre uma lista (vazia quando não há linha). */
  payload: Record<string, unknown[]>
}

/** Um arquivo pronto para o disparo — string em memória, nunca um caminho remoto. */
export interface ArquivoExport {
  nome: string
  conteudo: string
  tipo: string
}

/** A recusa da EF, lida do corpo UMA vez. */
interface RecusaEf {
  error_code?: unknown
  liberado_em?: unknown
}

/**
 * Lê a recusa do corpo da resposta **uma única vez**.
 *
 * ⚠ Não reusa `@/lib/efErrors.extractEfErrorCode` de propósito: aquele helper
 * devolve SÓ o código e descarta o resto — correto para os consumidores dele, e
 * insuficiente aqui, porque `liberado_em` é o dado que a copy de cooldown
 * renderiza. E o corpo de uma `Response` só pode ser consumido uma vez: chamar os
 * dois leria o segundo sobre um stream já esgotado.
 */
async function lerRecusa(data: unknown, error: unknown): Promise<RecusaEf | null> {
  const contexto = (error as { context?: { json?: () => Promise<unknown> } } | null)?.context
  if (contexto?.json) {
    try {
      const corpo = await contexto.json()
      if (corpo && typeof corpo === 'object') return corpo as RecusaEf
    } catch {
      /* corpo não-JSON: degrada para o caminho genérico, nunca lança */
    }
  }
  if (data && typeof data === 'object' && 'error_code' in data) return data as RecusaEf
  return null
}

/**
 * Traduz a recusa para o vocabulário fechado. A mensagem exibida é SEMPRE a copy do
 * projeto — a do transporte fica de fora inteira, nunca em `message`, nunca em
 * `details` que a tela leia (idioma do `traduzirErro` de `privacidadeService`).
 */
function traduzirRecusa(recusa: RecusaEf): ExportacaoError {
  const codigo = typeof recusa.error_code === 'string' ? recusa.error_code : ''
  if (codigo === 'COOLDOWN') {
    const liberado = typeof recusa.liberado_em === 'string' ? recusa.liberado_em : undefined
    return new ExportacaoError(COPY_PEDIR_COPIA.erroTitulo, 'COOLDOWN', liberado)
  }
  if (codigo === 'UNAUTHORIZED') {
    return new ExportacaoError(COPY_PEDIR_COPIA.erroTitulo, 'UNAUTHORIZED')
  }
  if (codigo === 'FORBIDDEN') {
    return new ExportacaoError(COPY_PEDIR_COPIA.erroTitulo, 'FORBIDDEN')
  }
  // Código desconhecido cai no tratamento genérico — nunca fecha a superfície e
  // nunca ecoa o token cru para a pessoa.
  return new ExportacaoError(COPY_PEDIR_COPIA.erroTitulo, 'SERVER_ERROR')
}

/**
 * Invoca a Edge Function `exportar-meus-dados`.
 *
 * **Sem corpo.** Ver a proibição 1 no docblock do módulo.
 */
export async function invocarExportMeusDados(): Promise<RespostaExport> {
  const { data, error } = await supabase.functions.invoke('exportar-meus-dados')

  const recusa = await lerRecusa(data, error)
  if (recusa?.error_code) throw traduzirRecusa(recusa)

  if (error) {
    // Transporte caiu sem corpo legível: é falha de rede, não recusa de domínio.
    throw new ExportacaoError(COPY_PEDIR_COPIA.erroTitulo, 'NETWORK')
  }
  if (!data || (data as { ok?: unknown }).ok !== true) {
    throw new ExportacaoError(COPY_PEDIR_COPIA.erroTitulo, 'SERVER_ERROR')
  }

  return data as RespostaExport
}

/**
 * Monta a string do arquivo `.json` — **função pura**, sem DOM, sem relógio.
 *
 * O envelope carrega os metadados que tornam o arquivo interpretável meses depois:
 * a data em que a cópia foi gerada e a versão da allowlist vigente naquele dia. A
 * fronteira do EXPORT-06 viaja DENTRO do arquivo pela mesma razão — um `.json`
 * aberto fora do navegador precisa dizer sozinho o que não estava nele.
 */
export function gerarJsonExport(resposta: RespostaExport): string {
  return JSON.stringify(
    {
      gerado_em: resposta.gerado_em,
      versao_allowlist: resposta.versao_allowlist,
      o_que_nao_esta_nesta_copia: COPY_PEDIR_COPIA.oQueNaoEsta,
      dados: resposta.payload,
    },
    null,
    2,
  )
}

/**
 * Nome do arquivo entregue. Datado em `aaaa-mm-dd` (ordenável na pasta de
 * downloads — é o único lugar onde a ordem é invertida, e é de propósito) e **sem
 * nenhuma PII interpolada** (Invariante 9).
 */
export function nomeArquivoExport(extensao: 'json' | 'html', agora: Date = new Date()): string {
  const dia = [
    agora.getUTCFullYear(),
    String(agora.getUTCMonth() + 1).padStart(2, '0'),
    String(agora.getUTCDate()).padStart(2, '0'),
  ].join('-')
  return `beauty-smile-meus-dados-${dia}.${extensao}`
}

/**
 * Dispara o download dos arquivos, na ordem recebida — idioma `Blob` → object URL →
 * anchor → clique → revoke, verbatim de `baixarIcsAgendamento`.
 *
 * A assinatura já aceita uma LISTA nesta fatia de um arquivo só porque **a ordem é
 * contrato**: o 44-06 acrescenta o `.html`, e o `.json` — o artefato do direito
 * legal — vai na frente.
 */
export function dispararDownloads(arquivos: readonly ArquivoExport[]): void {
  for (const arquivo of arquivos) {
    const blob = new Blob([arquivo.conteudo], { type: arquivo.tipo })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = arquivo.nome
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }
}

/** Export nomeado do namespace (convenção `camelCaseService`). */
export const exportacaoService = {
  invocarExportMeusDados,
  gerarJsonExport,
  nomeArquivoExport,
  dispararDownloads,
}
