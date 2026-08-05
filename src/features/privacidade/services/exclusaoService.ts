/**
 * exclusaoService — o lado cliente do direito de eliminação (ERASE-05 / ERASE-06).
 *
 * Molde: `exportacaoService.ts`, o irmão desta mesma feature — a ponte de tipos, a
 * allowlist nomeada de colunas, a classe de erro com `code` de vocabulário fechado e
 * o tradutor com fallback TOTAL.
 *
 * ── ⚠ A COPY DESTA FASE É A ÚLTIMA COISA QUE ALGUÉM LÊ ANTES DO IRREVERSÍVEL ──
 * O operador decidiu, com data, **não ligar o PITR** (D-45-10): os backups cobrem 7
 * dias e **excluem o Storage inteiramente**. Um currículo apagado por engano é
 * irrecuperável por qualquer meio. Quem "melhorar" a redação de uma linha da
 * §Copywriting Contract sem passar pela 45-UI-SPEC não está editando texto — está
 * alterando o consentimento sob o qual um dado é destruído.
 *
 * ── A INVARIANTE MAIS PERIGOSA: A MENÇÃO AO CANCELAMENTO ────────────────────
 * *"Você pode cancelar a qualquer momento"*, **sozinha**, promete um desfazer que
 * não existe: cancelar interrompe a exclusão dos DADOS e **não reabre** as
 * candidaturas que o pedido já encerrou (D-45-06). Por isso a Invariante 3 da
 * 45-UI-SPEC transformou isso num ban de **COOCORRÊNCIA**, não de ausência — a
 * menção é legítima acompanhada. As duas constantes que a mencionam
 * (`cancelamento` e `agendadoNota`) carregam o qualificador, e o teste (w10) o exige
 * no MESMO render.
 *
 * @module features/privacidade/services/exclusaoService
 * @see src/features/privacidade/services/exportacaoService.ts (o molde)
 * @see .planning/phases/45-motor-de-exclus-o-anonimiza-o/45-UI-SPEC.md (§Seção 4)
 */
import { supabase } from '@/lib/supabase/client'
import { ENCARREGADO_EMAIL } from '../constants/encarregado'

// ══════════════════════════════════════════════════════════════════════════════
// COPY — constante única, verbatim da 45-UI-SPEC §Seção 4
// ══════════════════════════════════════════════════════════════════════════════

/**
 * ⚠ UMA STRING POR CAUSA, DE UMA CONSTANTE. É o que torna executáveis os greps de
 * escopo da UI-SPEC e o que impede duas verdades sobre o mesmo fato. Nunca literal
 * no JSX.
 */
export const COPY_EXCLUIR_DADOS = {
  abertura:
    'Você pode pedir que a Beauty Smile apague seus dados. É um direito seu (LGPD, Art. 18, VI).',

  oQueAconteceTitulo: 'O que acontece quando você pede',
  /**
   * ⚠ O `{n}` NUNCA é literal em componente: ele vem da MESMA linha de configuração
   * que o predicado de execução do motor lê (D-45-01). Sem a config, a frase que
   * conteria o número é substituída por uma que não o contém — nunca `NaN`, nunca um
   * número inventado, nunca a seção sumindo (§Formatação: "a frase que a conteria é
   * omitida").
   */
  oQueAcontece: (dias: number | null) =>
    dias === null
      ? 'Suas candidaturas em andamento são encerradas na hora. A exclusão dos seus dados acontece depois, e nesse intervalo você pode cancelar a exclusão por esta mesma página.'
      : `Suas candidaturas em andamento são encerradas na hora, e a exclusão dos seus dados acontece ${dias} dias depois. Nesse intervalo você pode cancelar a exclusão por esta mesma página.`,

  /** Invariante 3 — parágrafo PRÓPRIO, nunca embutido na frase acima. */
  cancelamentoTitulo: 'O que o cancelamento NÃO desfaz',
  cancelamento:
    'Cancelar interrompe a exclusão dos seus dados. Suas candidaturas encerradas não voltam — se quiser participar de novo, você se candidata de novo.',

  /** Invariante 2 — o ponteiro flui do irreversível para o mais brando, em TEXTO. */
  soQuerSairTitulo: 'Se você só quer sair de um processo',
  soQuerSair:
    'Se a sua intenção é sair de uma vaga e continuar com a gente, você não precisa apagar nada: no Painel, cada candidatura tem a opção Retirar minha candidatura.',

  cta: 'Apagar meus dados',
  ctaEmVoo: 'Registrando seu pedido…',
  /**
   * O motivo visível ao lado do botão EM VOO. Não é barra de progresso e não conta
   * o tempo — um `disabled` sem motivo é indistinguível de tela quebrada.
   */
  motivoEmVoo:
    'Estamos registrando seu pedido. Assim que ele for registrado, esta página mostra a data da exclusão.',
  /**
   * ⚠ AQUI O BLOCO DIVERGE DO IRMÃO `PedirCopiaBloco`, E A DIVERGÊNCIA É A DECISÃO.
   * Lá, leitura falha ⇒ o CTA renderiza e o servidor decide. Aqui não: um pedido
   * duplicado não é um download a mais, e a UI-SPEC (E1/error) manda DESABILITAR com
   * motivo em vez de renderizar "por via das dúvidas".
   */
  motivoLeituraFalhou:
    'Não foi possível carregar a situação do seu pedido. Sem essa informação não dá para registrar um pedido novo com segurança — recarregue a página e tente de novo.',

  /**
   * ⚠ "Nada foi apagado." É OBRIGATÓRIO AQUI E PROIBIDO DEPOIS. Esta é a falha do
   * REGISTRO do pedido, que acontece ANTES de qualquer mutação — o titular precisa
   * saber de que lado da linha o sistema parou. A partir do início da execução a
   * mesma frase seria ingarantível (Invariante 5), porque a mutação
   * Storage → Postgres → Auth não é atômica.
   */
  erroTitulo: 'Não foi possível registrar seu pedido. Nada foi apagado.',
  erroCorpo: `Tente novamente em alguns minutos — se continuar, escreva para o nosso Encarregado de Dados: ${ENCARREGADO_EMAIL}.`,

  agendadoTitulo: 'Exclusão agendada',
  agendadoLinha: (data: string) => `Seus dados serão apagados em ${data}.`,
  agendadoCorpo: (data: string) =>
    `Suas candidaturas em andamento já foram encerradas. Até ${data}, você pode cancelar a exclusão e seus dados continuam com a gente.`,
  /** A metade que a Invariante 3 obriga a coocorrer com qualquer menção a cancelar. */
  agendadoNota:
    'Cancelar não reabre as candidaturas encerradas — se quiser participar de novo, você se candidata de novo.',

  /** §Empty — o único vazio da fase. */
  vazioTitulo: 'Você ainda não se candidatou a nenhuma vaga.',
  vazioCorpo: 'Quando você se candidatar, esta opção aparece aqui.',
} as const

// ══════════════════════════════════════════════════════════════════════════════
// ERRO — vocabulário FECHADO, e nenhuma mensagem crua do transporte cruza
// ══════════════════════════════════════════════════════════════════════════════

/** A UI decide por `code`, nunca lendo a mensagem. */
export type CodigoExclusao =
  | 'UNAUTHORIZED'
  | 'FORBIDDEN'
  | 'VALIDATION'
  | 'SERVER_ERROR'
  | 'NETWORK'

/** Erro de serviço no padrão `camelCaseService.ts` (CLAUDE.md). */
export class ExclusaoError extends Error {
  constructor(
    message: string,
    public code: CodigoExclusao,
    /** Vocabulário fechado de domínio devolvido pela EF (nunca SQLSTATE, nunca HTTP). */
    public motivo?: string,
  ) {
    super(message)
    this.name = 'ExclusaoError'
  }
}

/** O que a Edge Function devolve no caminho feliz de `pedir`. */
export interface RespostaPedirExclusao {
  ok: true
  acao: 'pedir'
  executar_em: string
  candidaturas_encerradas: number
}

/**
 * Traduz a recusa da EF com **fallback TOTAL** (molde de `privacidadeService`).
 *
 * ⚠ Invariante 12: nada de `solicitacao_id`, bucket, caminho de Storage, nome de
 * tabela, SQLSTATE ou código HTTP atravessa para a tela. Um código desconhecido
 * resolve para `SERVER_ERROR` — nunca para o texto cru, que é como um detalhe de
 * transporte acaba renderizado para o titular.
 */
function traduzirErro(codigo: unknown, motivo?: unknown): ExclusaoError {
  const cod = typeof codigo === 'string' ? codigo : ''
  const mot = typeof motivo === 'string' ? motivo : undefined
  const conhecidos: CodigoExclusao[] = [
    'UNAUTHORIZED',
    'FORBIDDEN',
    'VALIDATION',
    'SERVER_ERROR',
    'NETWORK',
  ]
  const escolhido = conhecidos.find((c) => c === cod) ?? 'SERVER_ERROR'
  return new ExclusaoError(COPY_EXCLUIR_DADOS.erroTitulo, escolhido, mot)
}

// ══════════════════════════════════════════════════════════════════════════════
// PONTE DE TIPOS — o idioma ÚNICO autorizado (Pitfall 10)
// ══════════════════════════════════════════════════════════════════════════════

/**
 * ⚠ **PONTE DE TIPOS TEMPORÁRIA**, idioma verbatim de `exportacaoService.ts:766-792`.
 * O `database.types.ts` **não foi regenerado** (auth gate do CLI, bloqueio nomeado no
 * 44-04), então o cliente tipado desconhece `solicitacoes_dados` e
 * `config_janela_exclusao`, e um `supabase.from(...)` tipado elevaria a contagem
 * `tsc` acima da baseline congelada de 97 — o `.husky/pre-commit` reprovaria, e
 * corretamente. `--no-verify` está proibido nesta fase.
 *
 * É a resposta MAIS ESTREITA possível: não é um cliente destipado. O nome da tabela
 * continua LITERAL no tipo — um erro de digitação nele ainda não compila. E a
 * conversão é do **objeto** cliente, **nunca** a extração do método: extrair perde o
 * `this` e derruba o `PostgrestClient` em runtime, defeito que os testes NÃO pegam
 * porque mockam o método inteiro.
 */
interface ConsultaExclusao {
  select(colunas: string): ConsultaExclusao
  eq(coluna: string, valor: string): ConsultaExclusao
  order(coluna: string, opcoes: { ascending: boolean }): ConsultaExclusao
  limit(n: number): ConsultaExclusao
  maybeSingle(): Promise<{ data: Record<string, unknown> | null; error: unknown }>
}

interface ClienteExclusao {
  from(tabela: 'solicitacoes_dados' | 'config_janela_exclusao'): ConsultaExclusao
}

const clienteExclusao = supabase as unknown as ClienteExclusao

// ══════════════════════════════════════════════════════════════════════════════
// LEITURAS — allowlist NOMEADA de colunas, e `null` é resultado válido
// ══════════════════════════════════════════════════════════════════════════════

/**
 * As colunas do estado do pedido. Allowlist nomeada — **nunca** projeção total, que
 * é a classe de vulnerabilidade nº 1 deste projeto (dois incidentes anteriores) e
 * que aqui traria para o cache do TanStack Query colunas que esta tela não usa.
 */
export const PEDIDO_EXCLUSAO_COLUNAS =
  'id, situacao, causa, solicitado_em, executar_em, cancelado_em, storage_concluido_em, postgres_concluido_em, auth_concluido_em'

/** O filtro que separa este direito do direito de ACESSO. */
export const TIPO_PEDIDO_EXCLUSAO = 'exclusao'

export interface PedidoExclusao {
  id: string
  situacao: string
  causa: string | null
  solicitado_em: string
  executar_em: string | null
  cancelado_em: string | null
  storage_concluido_em: string | null
  postgres_concluido_em: string | null
  auth_concluido_em: string | null
}

/**
 * Lê o pedido de exclusão em aberto do titular. `null` é resultado válido.
 *
 * ⚠ O FILTRO `tipo = 'exclusao'` É SIMÉTRICO ao `tipo = 'acesso'` de
 * `lerUltimoPedidoDados`, e o docblock daquela função já escreveu este corolário:
 * sem o filtro, um pedido de exclusão consumiria o cooldown do direito de ACESSO em
 * silêncio — e vice-versa. Dois direitos e dois prazos legais na mesma leitura.
 */
export async function lerPedidoExclusaoAberto(
  candidatoId: string | undefined,
): Promise<PedidoExclusao | null> {
  if (!candidatoId) return null
  const { data, error } = await clienteExclusao
    .from('solicitacoes_dados')
    .select(PEDIDO_EXCLUSAO_COLUNAS)
    .eq('candidato_id', candidatoId)
    .eq('tipo', TIPO_PEDIDO_EXCLUSAO)
    .order('solicitado_em', { ascending: false })
    .limit(1)
    .maybeSingle()
  if (error || !data) return null
  return data as unknown as PedidoExclusao
}

/**
 * Lê a janela de arrependimento (em dias). `null` = **config ausente**, e é um
 * resultado válido que a tela sabe apresentar (a data alvo, sem a contagem de dias).
 * Nunca lança: uma configuração ilegível não pode virar tela de erro.
 */
export async function lerJanelaExclusao(): Promise<number | null> {
  const { data, error } = await clienteExclusao
    .from('config_janela_exclusao')
    .select('chave, dias')
    .eq('chave', 'exclusao_arrependimento')
    .maybeSingle()
  if (error || !data) return null
  const dias = Number((data as { dias?: unknown }).dias)
  return Number.isFinite(dias) && dias > 0 ? dias : null
}

/**
 * Existe alguma candidatura do titular? É o que decide entre o CTA e o estado vazio.
 *
 * ⚠ **NÃO reusa `listarMeusCurriculos`**, e a recusa é medida: aquela leitura filtra
 * `.not('curriculo_url','is',null)`, então um titular COM candidaturas e SEM currículo
 * devolveria lista vazia — e a tela diria "Você ainda não se candidatou a nenhuma
 * vaga", que é falso. Numa página cuja premissa inteira é honestidade, reusar a
 * leitura errada por ela estar à mão é como a mentira entra.
 */
export async function titularTemCandidatura(
  candidatoId: string | undefined,
): Promise<boolean> {
  if (!candidatoId) return false
  const { data, error } = await supabase
    .from('candidaturas')
    .select('id')
    .eq('candidato_id', candidatoId)
    .is('deleted_at', null)
    .limit(1)
  if (error) return false
  return (data ?? []).length > 0
}

// ══════════════════════════════════════════════════════════════════════════════
// MUTAÇÃO — a EF é a única porta; o titular sai de `auth.uid()` no servidor
// ══════════════════════════════════════════════════════════════════════════════

/**
 * Invoca a Edge Function para registrar o pedido.
 *
 * ⚠ **NENHUM IDENTIFICADOR VIAJA NO CORPO.** O titular é resolvido no servidor a
 * partir de `auth.uid()`; um `candidato_id` mandado daqui seria a superfície de
 * Tampering T-32-03 — e a EF o ignoraria de qualquer modo. O que não é enviado não
 * pode ser forjado.
 */
export async function invocarPedirExclusao(): Promise<RespostaPedirExclusao> {
  const { data, error } = await supabase.functions.invoke('executar-direito-titular', {
    body: { acao: 'pedir' },
  })

  // A recusa é lida do corpo UMA única vez — o corpo de uma `Response` só pode ser
  // consumido uma vez, e ler duas vezes leria a segunda sobre um stream esgotado.
  const contexto = (error as { context?: { json?: () => Promise<unknown> } } | null)?.context
  if (contexto?.json) {
    try {
      const corpo = (await contexto.json()) as { error_code?: unknown; motivo?: unknown }
      if (corpo?.error_code) throw traduzirErro(corpo.error_code, corpo.motivo)
    } catch (e) {
      if (e instanceof ExclusaoError) throw e
      /* corpo não-JSON: degrada para o caminho genérico, nunca lança o erro cru */
    }
  }

  if (error) throw new ExclusaoError(COPY_EXCLUIR_DADOS.erroTitulo, 'NETWORK')
  if (!data || (data as { ok?: unknown }).ok !== true) {
    throw new ExclusaoError(COPY_EXCLUIR_DADOS.erroTitulo, 'SERVER_ERROR')
  }
  return data as RespostaPedirExclusao
}

// ══════════════════════════════════════════════════════════════════════════════
// FORMATAÇÃO
// ══════════════════════════════════════════════════════════════════════════════

/**
 * A data alvo em `dd/mm/aaaa`, ou `null` quando não há data legível.
 *
 * ⚠ **DEVOLVE `null`, NÃO UM TRAVESSÃO**, e a divergência do `formatarDataPuraPtBr`
 * vizinho é a decisão: a §Formatação da 45-UI-SPEC manda **omitir a frase** que
 * conteria a data, porque *"um travessão no lugar da data de uma exclusão
 * irreversível é pior que a frase ausente"*. Aquele helper serve a uma tabela, onde
 * a célula precisa existir; aqui a frase é uma afirmação, e uma afirmação com um
 * buraco no meio é pior que nenhuma.
 *
 * O fuso é explícito para que a data não dependa do relógio de quem renderiza — o
 * leitor é o titular, no Brasil, e um `executar_em` perto da meia-noite UTC mostraria
 * o dia errado.
 */
export function formatarDataAlvo(iso: string | null | undefined): string | null {
  if (!iso) return null
  const quando = new Date(iso)
  if (Number.isNaN(quando.getTime())) return null
  return quando.toLocaleDateString('pt-BR', {
    timeZone: 'America/Sao_Paulo',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })
}

/**
 * A data que o pedido teria **se fosse registrado agora** — hoje + a janela em dias.
 *
 * ⚠ **POR QUE ELA EXISTE, E QUAL É O SEU LIMITE.** Antes do registro não há
 * `executar_em`: ele nasce no servidor, dentro de `registrar_pedido_exclusao`. Mas a
 * 45-UI-SPEC § "O `AlertDialog` de confirmação" exige a data **por extenso** no corpo
 * do diálogo — e a exigência é justa: "seus dados são apagados um dia desses" não é
 * consentimento informado. A projeção usa **exatamente a mesma `dias`** que o predicado
 * de execução do motor lê (D-45-01, "uma fonte a auditar em vez de duas a divergir"),
 * então ela não pode divergir da política; o que ela pode é cair num dia vizinho quando
 * o clique acontece perto da virada. A data **autoritativa** é a do Estado B, que vem
 * do servidor — e é a que o titular relê durante os dias em que pode se arrepender.
 *
 * `dias` ausente (config ilegível) devolve `null`, e a §Formatação manda **omitir a
 * frase** que conteria a data — nunca um travessão, nunca um número inventado.
 */
export function projetarDataAlvo(
  dias: number | null | undefined,
  agora: Date = new Date(),
): string | null {
  if (dias === null || dias === undefined) return null
  if (!Number.isFinite(dias) || dias <= 0) return null
  const alvo = new Date(agora.getTime())
  if (Number.isNaN(alvo.getTime())) return null
  alvo.setDate(alvo.getDate() + Math.trunc(dias))
  return formatarDataAlvo(alvo.toISOString())
}
