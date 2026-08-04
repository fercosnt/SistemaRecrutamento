/**
 * pedidosDadosService — a camada de dados da fila de pedidos de cópia de dados do RH
 * (EXPORT-05, LGPD Art. 18, II · prazo do Art. 19, II).
 *
 * Espelho estrutural de `revisaoService.ts`: classe de erro com `code` de vocabulário
 * pequeno, classificador total que nunca lança, allowlist nomeada com projeção na
 * fronteira, tipo da linha escrito à mão, e leitor de config que resolve erro para
 * `null`. Mesmo diretório-irmão, mesma persona, mesmo contrato de erro.
 *
 * ── A INVARIANTE DO BD-8, DO LADO DO CLIENTE ──────────────────────────────────
 *
 * A fila e o contador do menu leem as MESMAS duas RPCs `SECURITY DEFINER`, e o
 * predicado de escopo é do SERVIDOR — escrito uma vez no 44-02 e usado nas duas, com a
 * igualdade provada por impersonação real (smoke (m), dois recrutadores e um
 * administrador). A ÚNICA contribuição que este módulo pode dar a esse invariante é
 * **não ter predicado nenhum**: nem filtro, nem reordenação, nem repaginação, nem
 * pós-processamento. Um segundo predicado aqui produziria exatamente a divergência que
 * o BD-8 nomeia — um badge contando o que a tela deixou de mostrar, com o prazo de 15
 * dias correndo. A asserção (bd) do teste irmão prende isso pelo lado negativo: nenhuma
 * tabela é tocada por PostgREST nestes dois caminhos.
 *
 * Nenhuma leitura desta feature toca a tabela de registro de pedidos diretamente. O
 * nome do candidato vive em OUTRA tabela, e resolvê-lo por join do cliente furaria o
 * escopo, que só existe dentro do `SECURITY DEFINER`. As duas únicas portas são as duas
 * RPCs.
 *
 * ── ORDEM E CORTE SÃO CONTRATO DO SERVIDOR ────────────────────────────────────
 *
 * A ordenação composta (não atendidos do mais antigo ao mais recente; depois os
 * atendidos, do mais recente ao mais antigo) e o `LIMIT 200` vivem no banco. Reordenar
 * aqui daria uma segunda fonte de verdade para a promessa da tela, e as duas
 * divergiriam no primeiro corte do limite — as 200 linhas escolhidas pelo servidor não
 * são as 200 primeiras de uma ordenação nova. É a mesma razão já escrita em
 * `useFilaRevisoes.ts:8-13`, com uma consequência a mais aqui: é essa ordenação que
 * torna VERDADEIRA a copy do aviso de corte ("todos os não atendidos aparecem").
 *
 * ── ⚠ PONTE DE TIPOS TEMPORÁRIA (bloqueio nomeado no 44-04) ───────────────────
 *
 * O arquivo de tipos gerado do Supabase **não foi regenerado** no 44-04: o passo caiu
 * num auth gate do CLI (`SUPABASE_ACCESS_TOKEN` ausente, credencial de login ausente),
 * registrado lá como bloqueio em vez de contornado. Sem ele, o cliente tipado
 * desconhece os dois nomes de RPC e o nome da tabela de config, e o projeto reprovaria
 * no `tsc` (baseline congelada em 97).
 *
 * A ponte abaixo é a resposta MAIS ESTREITA possível: ela não é um cliente destipado.
 * Os dois nomes de RPC e o nome da tabela continuam LITERAIS no tipo — um erro de
 * digitação em qualquer um deles ainda não compila. E, ao contrário do idioma vivo em
 * `redacaoService.ts`/`duplicateCheckService.ts`, ela converte o **objeto** cliente em
 * vez de extrair o método `rpc`: extrair o método perde o `this` e derruba o
 * `PostgrestClient` em runtime — um defeito que os testes NÃO pegam, porque eles mockam
 * o método inteiro (a armadilha está documentada em `duplicateCheckService.ts:179-183`).
 *
 * Quando o auth gate abrir e os tipos forem regerados, apagar a interface e o `as` faz
 * o módulo voltar ao cliente tipado sem tocar em nenhuma linha de lógica.
 *
 * @module features/pedidos-dados/services/pedidosDadosService
 * @see src/features/revisao/services/revisaoService.ts (o molde: as cinco formas)
 * @see .planning/phases/44-exporta-o-acesso/44-04-SUMMARY.md (§Task 2 M3 — a autorização desta leitura)
 * @see .planning/phases/44-exporta-o-acesso/44-02-SUMMARY.md (§as sete colunas — o contrato do servidor)
 */
import { supabase as clienteAnon } from '@/lib/supabase/client'
import type { LimiaresSlaDados } from '../constants/slaDados'

/** A cadeia de consulta usada pelo leitor de config — só o que este módulo chama. */
interface ConsultaConfigSlaDados {
  select(colunas: string): ConsultaConfigSlaDados
  eq(coluna: string, valor: string): ConsultaConfigSlaDados
  maybeSingle(): Promise<{ data: Record<string, unknown> | null; error: unknown }>
}

/**
 * A superfície EXATA do cliente que este módulo usa — três nomes literais e nada mais.
 * Ver a nota "ponte de tipos temporária" no docblock do módulo.
 */
interface ClientePedidosDados {
  rpc(
    fn: 'listar_pedidos_dados',
    args: Record<string, boolean>,
  ): Promise<{ data: unknown; error: unknown }>
  rpc(
    fn: 'contar_pedidos_dados_pendentes',
  ): Promise<{ data: number | null; error: unknown }>
  from(tabela: 'config_sla_dados'): ConsultaConfigSlaDados
}

const supabase = clienteAnon as unknown as ClientePedidosDados

/**
 * Erro de domínio da fila de pedidos de dados, na forma `camelCaseService.ts` do
 * projeto (CLAUDE.md), espelhando `RevisaoError`.
 *
 * `code` é deliberadamente pequeno — DOIS valores — porque a 44-UI-SPEC distingue dois
 * tratamentos nesta tela, não mais. Vocabulário maior aqui seria ramo que a tela nunca
 * consome.
 */
export class PedidosDadosError extends Error {
  constructor(
    message: string,
    public code: 'PERMISSAO' | 'DESCONHECIDO',
    public details?: unknown,
  ) {
    super(message)
    this.name = 'PedidosDadosError'
  }
}

/**
 * Traduz um erro cru das duas RPCs no `PedidosDadosError` que a UI sabe apresentar.
 * Total: qualquer entrada (inclusive `null`) resolve para um `PedidosDadosError`,
 * nunca lança.
 *
 * ⚠ A DISCRIMINAÇÃO POR MENSAGEM DO ANÁLOGO NÃO FOI COPIADA, e a ausência é a decisão.
 * Em `classificarErroRevisao` ela existe porque o servidor levanta o mesmo `42501` para
 * duas recusas semanticamente distintas. Aqui o `42501` das duas RPCs tem uma causa só —
 * o guard de papel. Copiar a heurística de mensagem criaria um ramo inalcançável, que é
 * a classe "guard que era dead code" (P39/CR-02) que este projeto já embarcou uma vez.
 *
 * A mensagem crua do transporte **nunca** entra na mensagem devolvida: ela carrega
 * SQLSTATE, nome de função e nome de tabela. Fica em `details`, para o console, e a tela
 * lê apenas `code` e `message`.
 */
export function classificarErroPedidosDados(error: unknown): PedidosDadosError {
  const code = (error as { code?: string } | null | undefined)?.code ?? ''

  if (code === '42501') {
    return new PedidosDadosError(
      'Você não tem permissão para ver os pedidos de dados.',
      'PERMISSAO',
      error,
    )
  }

  return new PedidosDadosError(
    'Não foi possível carregar a fila de pedidos de dados. Tente novamente.',
    'DESCONHECIDO',
    error,
  )
}

/**
 * As SETE colunas que a fila projeta — o espelho CLIENTE do `RETURNS TABLE` de
 * `listar_pedidos_dados` (44-02). Quem impõe o contrato é o servidor; esta constante é o
 * que TRAVA a expectativa, de modo que uma coluna acrescentada no servidor sem revisão
 * de privacidade quebre um teste antes de chegar à tela — ou ao cache do TanStack Query.
 *
 * ⚠ A fila é sobre o **PEDIDO**, não sobre o **DADO** (Invariante 5 da 44-UI-SPEC).
 * Não existe e-mail, CPF, documento nem caminho de Storage nesta camada, e não é por
 * esquecimento: a supervisão precisa de nome e de quando, e qualquer coluna a mais seria
 * PII acrescentada a uma tela que não a usa — além de uma segunda superfície de
 * exfiltração.
 */
export const FILA_PEDIDOS_DADOS_COLUNAS = [
  'id',
  'candidato_id',
  'candidato_nome',
  'situacao',
  'causa',
  'solicitado_em',
  'atendido_em',
] as const

/** O tipo das chaves projetadas pela fila (derivado da allowlist, nunca duplicado). */
export type ColunaFilaPedidoDados = (typeof FILA_PEDIDOS_DADOS_COLUNAS)[number]

/**
 * Uma linha da fila, do lado do cliente.
 *
 * ⚠ POR QUE ESTE TIPO É ESCRITO À MÃO e não derivado do arquivo de tipos gerado: o
 * gerador do Supabase declara TODA coluna de um `RETURNS TABLE` como não-nula, porque a
 * assinatura SQL não carrega nulidade. Na prática `candidato_nome` É nulo — o `LEFT
 * JOIN` da RPC não encontra correspondência para todo pedido, e esse é exatamente o caso
 * que a tela resolve para "Não identificado" (44-09), nunca para o UUID e nunca para o
 * travessão. O 44-04 registrou isso NOMINALMENTE para que este plano não adotasse o tipo
 * gerado por engano. Confiar nele produziria uma chamada de método sobre nulo em
 * produção com o compilador calado.
 *
 * As chaves são as mesmas de `FILA_PEDIDOS_DADOS_COLUNAS`; a nulidade é honesta.
 */
export interface FilaPedidoDadosRow {
  id: string
  candidato_id: string
  /** Nulo quando o nome não é resolvível — a tela mostra "Não identificado". */
  candidato_nome: string | null
  situacao: string
  /** Vocabulário fechado por CHECK, ou NULL quando o pedido foi atendido. */
  causa: string | null
  solicitado_em: string
  atendido_em: string | null
}

/**
 * O único filtro da fila, e o nome é do domínio da TELA — o toggle "Mostrar só os não
 * atendidos" da 44-UI-SPEC.
 */
export interface FiltrosFilaPedidosDados {
  soNaoAtendidos: boolean
}

/**
 * Projeta uma linha crua da RPC nas chaves da allowlist — nada mais atravessa.
 *
 * Defesa em profundidade, não redundância: o `RETURNS TABLE` é o contrato primário, mas
 * um `CREATE OR REPLACE` futuro que acrescente uma coluna passaria a trafegar sem que
 * nada no cliente reclamasse. Coluna ausente vira `null` (nunca `undefined`, nunca chave
 * faltando), para que a tela não distinga "não veio" de "veio nulo" por acidente.
 */
function projetarLinhaPedido(linha: Record<string, unknown>): FilaPedidoDadosRow {
  const projetada: Record<string, unknown> = {}
  for (const coluna of FILA_PEDIDOS_DADOS_COLUNAS) {
    projetada[coluna] = coluna in linha ? linha[coluna] : null
  }
  return projetada as unknown as FilaPedidoDadosRow
}

/**
 * Lê a fila de pedidos de cópia de dados pela RPC `listar_pedidos_dados` (EXPORT-05).
 *
 * ⚠ A NEGAÇÃO ABAIXO É O PONTO MAIS ESCORREGADIO DESTA FEATURE, E ELA EXISTE UMA VEZ SÓ,
 * AQUI. O filtro da tela é "mostrar só os não atendidos"; o parâmetro do servidor é
 * "incluir os atendidos". As polaridades são OPOSTAS de propósito: nesta fila a linha
 * nasce **atendida** (o export é self-service), então abrir filtrado mostraria tela vazia
 * em praticamente todo acesso — e uma fila que quase sempre aparece vazia deixa de ser
 * consultada, o que mata a supervisão inteira. A tela abre na visão completa; o toggle
 * ISOLA as falhas.
 *
 * Qualquer outro ponto do cliente que precise dessa polaridade tem de importar daqui —
 * nunca renegar por conta própria. O `COMMENT` do 44-02 e a asserção (az) do teste irmão,
 * que prende os dois sentidos, são os dois lados dessa trava.
 */
export async function listarFilaPedidosDados(
  filtros: FiltrosFilaPedidosDados,
): Promise<FilaPedidoDadosRow[]> {
  const { data, error } = await supabase.rpc('listar_pedidos_dados', {
    p_incluir_atendidos: !filtros.soNaoAtendidos,
  })
  if (error) throw classificarErroPedidosDados(error)
  const linhas = (data ?? []) as Array<Record<string, unknown>>
  return linhas.map(projetarLinhaPedido)
}

/**
 * Conta os pedidos ainda não atendidos no escopo do chamador, para o badge do menu.
 *
 * ⚠ ESTA FUNÇÃO E A DE LISTAGEM NÃO PODEM GANHAR FILTRO, PREDICADO OU PÓS-PROCESSAMENTO
 * ALGUM. A igualdade fila ≡ contador é provada no SERVIDOR (smoke (m) do 44-02, sob
 * impersonação real), e a única forma de o cliente quebrá-la é acrescentar um segundo
 * predicado de um dos dois lados.
 *
 * Retorno nulo resolve para `0`; quem decide que `0` significa badge oculto é
 * `formatarBadgePendentes` (reusada de `revisaoService` no 44-09), não este módulo.
 */
export async function contarPedidosDadosPendentes(): Promise<number> {
  const { data, error } = await supabase.rpc('contar_pedidos_dados_pendentes')
  if (error) throw classificarErroPedidosDados(error)
  return data ?? 0
}

/** A chave da única linha de configuração semeada pelo 44-02. */
export const CHAVE_SLA_DADOS = 'acesso_dados'

/** A allowlist do leitor de config — três colunas nomeadas, nunca projeção total. */
export const CONFIG_SLA_DADOS_COLUNAS = 'chave, dias_atencao, dias_atraso'

/**
 * Lê os dois limiares de acompanhamento interno da tabela de configuração.
 *
 * ⚠ NÃO LANÇA, NUNCA. Erro de transporte, linha ausente ou limiar não numérico resolvem
 * para `null`, que é um resultado VÁLIDO — o consumidor trata `null` como a faixa
 * degenerada (a contagem de dias, sem badge). A razão é de proporção: uma célula de
 * configuração ilegível não pode derrubar a fila inteira do RH. É por isso que a config
 * não participa nem do carregamento nem do erro da tabela (E6/loading da 44-UI-SPEC).
 *
 * A autorização desta leitura é a policy RH-only lida no catálogo VIVO — o retrato do M3
 * no `44-04-SUMMARY.md`, não o arquivo de migration, porque o arquivo não é o objeto
 * vivo. O limiar é config interna e não pode ser legível por `anon`, senão a Invariante 8
 * da UI-SPEC cai por baixo da tela.
 */
export async function lerConfigSlaDados(): Promise<LimiaresSlaDados | null> {
  const { data, error } = await supabase
    .from('config_sla_dados')
    .select(CONFIG_SLA_DADOS_COLUNAS)
    .eq('chave', CHAVE_SLA_DADOS)
    .maybeSingle()

  if (error || !data) return null

  const { dias_atencao, dias_atraso } = data
  if (typeof dias_atencao !== 'number' || typeof dias_atraso !== 'number') return null

  return { diasAtencao: dias_atencao, diasAtraso: dias_atraso }
}

/** Copy verbatim da 44-UI-SPEC (§Coluna "O que aconteceu") — fonte única desta coluna. */
export const COPY_CAUSA = {
  falha_geracao: 'Falha ao gerar o arquivo.',
  curriculo_ausente: 'Currículo não encontrado no armazenamento.',
  permissao: 'Falha de permissão.',
} as const

/** O fallback total da coluna — nunca célula em branco, nunca o token cru. */
export const COPY_CAUSA_AUSENTE = 'Motivo não registrado.'

/**
 * Traduz o token de causa para a copy da coluna "O que aconteceu". Total sobre o
 * vocabulário fechado pelo CHECK do banco; causa nula, vazia ou desconhecida resolve
 * para `COPY_CAUSA_AUSENTE`.
 *
 * ⚠ AQUI O FALLBACK DIVERGE DO ANÁLOGO, E A DIVERGÊNCIA É DELIBERADA. `rotularDecisao`
 * (`FilaRevisoesTable.tsx:128-131`) resolve token desconhecido para o VALOR CRU, porque
 * lá o token é vocabulário de produto que o RH reconhece. A causa desta fila nomeia o
 * **caminho de falha interno**; mostrá-la crua seria detalhe de infraestrutura numa tela
 * que a 44-UI-SPEC §O que a fila NUNCA mostra proíbe nominalmente. Sem esta nota, a
 * próxima leitura "uniformiza" com o análogo e reintroduz o vazamento.
 *
 * ⚠ ESTA FUNÇÃO NÃO COBRE A LINHA ATENDIDA. A copy do caminho feliz interpola data e hora
 * ("Cópia entregue em …") e é formatação de APRESENTAÇÃO: ela mora na tabela (44-09),
 * junto do formatador de data que já resolve data inválida para travessão. A fronteira
 * está declarada aqui para que o 44-09 não a duplique nem a reinvente.
 */
export function traduzirCausa(causa: string | null | undefined): string {
  if (!causa) return COPY_CAUSA_AUSENTE
  return COPY_CAUSA[causa as keyof typeof COPY_CAUSA] ?? COPY_CAUSA_AUSENTE
}

/** Export namespaced (convenção `camelCaseService`). */
export const pedidosDadosService = {
  classificarErroPedidosDados,
  listarFilaPedidosDados,
  contarPedidosDadosPendentes,
  lerConfigSlaDados,
  traduzirCausa,
}
