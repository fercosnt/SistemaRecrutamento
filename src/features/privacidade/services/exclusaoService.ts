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
import { CANAL_PRIVACIDADE_EMAIL } from '../constants/canalPrivacidade'

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
  erroCorpo: `Tente novamente em alguns minutos — se continuar, escreva para o nosso canal de privacidade: ${CANAL_PRIVACIDADE_EMAIL}.`,

  /** §Estado A — a prévia do recibo, visível ANTES de confirmar. */
  oQueSaiTitulo: 'O que sai e o que fica',
  oQueSai:
    'Antes de confirmar, veja o que é apagado e o que a Beauty Smile é obrigada a manter:',
  /**
   * O motivo do CTA desabilitado quando a derivação do recibo falha (E4·empty). Um
   * recibo vazio ao lado de um botão que apaga seria a pior tela desta fase — então o
   * botão sai de cena com o motivo dito, em vez de a lista sumir em silêncio.
   */
  motivoFalhaDerivacao:
    'Não foi possível montar a lista do que sai e do que fica. Sem ela não dá para pedir a exclusão com segurança — recarregue a página e tente de novo.',

  agendadoTitulo: 'Exclusão agendada',
  agendadoLinha: (data: string) => `Seus dados serão apagados em ${data}.`,
  agendadoCorpo: (data: string) =>
    `Suas candidaturas em andamento já foram encerradas. Até ${data}, você pode cancelar a exclusão e seus dados continuam com a gente.`,
  /** A metade que a Invariante 3 obriga a coocorrer com qualquer menção a cancelar. */
  agendadoNota:
    'Cancelar não reabre as candidaturas encerradas — se quiser participar de novo, você se candidata de novo.',

  /**
   * ⚠ GLASS-BRANCO, NUNCA DESTRUCTIVE. Cancelar é a ação **construtiva** deste fluxo:
   * ela interrompe a destruição. Pintá-la de vermelho diria à pessoa que interromper
   * uma exclusão é a coisa perigosa a fazer.
   */
  cancelarCta: 'Cancelar a exclusão',
  cancelarEmVoo: 'Cancelando…',
  /**
   * O motivo irmão do botão em voo. Ele diz explicitamente que a data continua valendo:
   * sumir com a data durante o voo faria parecer que o cancelamento já valeu.
   */
  motivoCancelarEmVoo:
    'Estamos cancelando seu pedido. Até a confirmação chegar, a data acima continua valendo.',

  /** Sucesso PERSISTENTE, nunca toast — e ele nomeia o que NÃO foi desfeito. */
  canceladoTitulo: 'Exclusão cancelada.',
  canceladoCorpo:
    'Seus dados continuam com a Beauty Smile. Suas candidaturas encerradas não foram reabertas — se quiser participar de novo, você se candidata de novo.',

  /**
   * ⚠ O INVERSO EXATO DA COPY DE ERRO DO PEDIDO, E A ASSIMETRIA É DELIBERADA. Falhar
   * ao **pedir** deixa a pessoa segura ("Nada foi apagado"); falhar ao **cancelar**
   * deixa a pessoa **em risco**, e a tela tem de dizer isso de frente, com a data e com
   * uma saída humana. Um "tente novamente" genérico aqui seria a tela escondendo da
   * pessoa que o relógio continua correndo.
   *
   * ⚠ E "Nada foi apagado." é PROIBIDA aqui: ela só vale no erro de REGISTRO, que
   * acontece antes de qualquer mutação (Invariante 5).
   */
  cancelarErroTitulo: 'Não foi possível cancelar agora.',
  cancelarErroCorpo: (data: string) =>
    `Seu pedido continua agendado para ${data} — tente de novo, e se não conseguir até lá, escreva para o nosso canal de privacidade: ${CANAL_PRIVACIDADE_EMAIL}.`,
  /** §Formatação: sem data legível, a frase que a conteria degrada — nunca um travessão. */
  cancelarErroCorpoSemData: `Seu pedido continua agendado — tente de novo, e se não conseguir até lá, escreva para o nosso canal de privacidade: ${CANAL_PRIVACIDADE_EMAIL}.`,

  /**
   * §Estado C — execução em andamento. Alcançável em produção: a mutação
   * `Storage → Postgres → Auth` **não é atômica**, e o estado "Storage apagado,
   * Postgres ainda não" é real. Aqui a tela não oferece ação nenhuma e **não diz
   * nenhuma palavra de desfecho** (Invariante 5), nem porcentagem, nem qual sistema já
   * respondeu (Invariante 12).
   */
  executandoTitulo: 'Exclusão em andamento',
  executandoCorpo:
    'Estamos apagando seus dados. Isso pode levar alguns minutos e você não precisa fazer nada.',

  /**
   * ⚠ RETIDAS **SOMENTE** COMO ASSERÇÃO NEGATIVA DA EMENDA C. A 45-UI-SPEC previa aqui
   * o único vazio da fase; a Emenda C (2026-08-05) o RETIROU, porque o recibo gerado em
   * 45-02 mede **16 dos 20 itens como `sempre`** — não existe titular autenticado sem
   * dado a apagar, e suprimir o CTA negava um direito do Art. 18. Nenhum componente
   * renderiza estas duas strings; o teste (w8) as usa para provar que ninguém voltou a
   * renderizá-las.
   */
  vazioTitulo: 'Você ainda não se candidatou a nenhuma vaga.',
  vazioCorpo: 'Quando você se candidatar, esta opção aparece aqui.',
} as const

// ══════════════════════════════════════════════════════════════════════════════
// ERRO — vocabulário FECHADO, e nenhuma mensagem crua do transporte cruza
// ══════════════════════════════════════════════════════════════════════════════

/**
 * A UI decide por `code`, nunca lendo a mensagem.
 *
 * `NOT_FOUND` entra com o cancelamento: a EF o usa (`index.ts:100-104`) e um código
 * conhecido resolvido como desconhecido cairia no fallback genérico, apagando a
 * distinção entre "não existe pedido" e "o servidor falhou".
 */
export type CodigoExclusao =
  | 'UNAUTHORIZED'
  | 'FORBIDDEN'
  | 'VALIDATION'
  | 'NOT_FOUND'
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

/** O que a Edge Function devolve no caminho feliz de `cancelar`. */
export interface RespostaCancelarExclusao {
  ok: true
  acao: 'cancelar'
  cancelado_em: string
}

/**
 * O código de domínio que a EF devolve quando **não há pedido cancelável** — já
 * executado, já cancelado, ou janela vencida (`index.ts:153`). É vocabulário FECHADO
 * de domínio, nunca SQLSTATE: a UI escolhe a copy por ele sem ler texto de transporte.
 */
export const MOTIVO_NAO_CANCELAVEL = 'PEDIDO_NAO_CANCELAVEL'

/**
 * Traduz a recusa da EF com **fallback TOTAL** (molde de `privacidadeService`).
 *
 * ⚠ Invariante 12: nada de `solicitacao_id`, bucket, caminho de Storage, nome de
 * tabela, SQLSTATE ou código HTTP atravessa para a tela. Um código desconhecido
 * resolve para `SERVER_ERROR` — nunca para o texto cru, que é como um detalhe de
 * transporte acaba renderizado para o titular.
 */
function traduzirErro(
  codigo: unknown,
  motivo?: unknown,
  titulo: string = COPY_EXCLUIR_DADOS.erroTitulo,
): ExclusaoError {
  const cod = typeof codigo === 'string' ? codigo : ''
  const mot = typeof motivo === 'string' ? motivo : undefined
  const conhecidos: CodigoExclusao[] = [
    'UNAUTHORIZED',
    'FORBIDDEN',
    'VALIDATION',
    'NOT_FOUND',
    'SERVER_ERROR',
    'NETWORK',
  ]
  const escolhido = conhecidos.find((c) => c === cod) ?? 'SERVER_ERROR'
  return new ExclusaoError(titulo, escolhido, mot)
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
 * O RECORTE do titular — os três fatos que decidem **quais linhas do recibo se aplicam
 * a ele**, e nada além disso.
 *
 * ⚠ **POR QUE OS TRÊS SAEM DE UMA LEITURA SÓ, E POR QUE ELES SÃO MEDIDOS.** O recibo é
 * derivado (Invariante 4) e o SC#5 proíbe superestimar **nas duas direções**: prometer
 * apagar um currículo que não existe é tão proibido quanto omitir algo que sai. Um
 * padrão "otimista" (`temCurriculo = true` por conveniência) prometeria destruir um
 * arquivo inexistente; um padrão "pessimista" omitiria uma linha que se aplica. A única
 * saída honesta é **medir** — e medir com as leituras own-row que o próprio titular já
 * pode fazer.
 *
 * ⚠ **NÃO reusa `listarMeusCurriculos`**, e a recusa é medida: aquela leitura filtra
 * `.not('curriculo_url','is',null)`, então um titular COM candidaturas e SEM currículo
 * devolveria lista vazia — e a tela concluiria "nunca se candidatou", que é falso. Aqui
 * a lista vem SEM filtro e os dois fatos são derivados dela.
 */
export interface RecorteTitular {
  /** Governa apenas o ponteiro "só quer sair de um processo" (Emenda C). */
  temCandidatura: boolean
  /** Governa a linha `arquivo_do_curriculo` da coluna «sai». */
  temCurriculo: boolean
  /** Governa as linhas que dependem de uma decisão já registrada. */
  temDecisaoRegistrada: boolean
}

/** Allowlist NOMEADA — nunca projeção total (a classe de vulnerabilidade nº 1 daqui). */
export const CANDIDATURA_RECORTE_COLUNAS = 'id, curriculo_url'

export async function lerRecorteDoTitular(
  candidatoId: string | undefined,
): Promise<RecorteTitular> {
  const vazio: RecorteTitular = {
    temCandidatura: false,
    temCurriculo: false,
    temDecisaoRegistrada: false,
  }
  if (!candidatoId) return vazio

  const { data, error } = await supabase
    .from('candidaturas')
    .select(CANDIDATURA_RECORTE_COLUNAS)
    .eq('candidato_id', candidatoId)
    .is('deleted_at', null)
  if (error) return vazio

  const candidaturas = (data ?? []) as { id: string; curriculo_url: string | null }[]
  if (candidaturas.length === 0) return vazio

  // ⚠ A leitura de `decisao_final` é own-row por RLS: a policy
  // `candidato_le_propria_decisao` (migration 20260607000003) escopa por
  // `candidaturas.candidato_id -> candidatos.user_id = auth.uid()`, e sobreviveu
  // intacta ao re-escopo de RH da Phase 15. O titular lê a EXISTÊNCIA da própria
  // decisão — nunca o conteúdo dela, que esta tela não pede e não mostra.
  const { data: decisoes, error: erroDecisao } = await supabase
    .from('decisao_final')
    .select('id')
    .in(
      'candidatura_id',
      candidaturas.map((c) => c.id),
    )
    .limit(1)

  return {
    temCandidatura: true,
    temCurriculo: candidaturas.some((c) => Boolean(c.curriculo_url)),
    // Falha de leitura resolve para `false`: o recibo **não afirma** o que não pôde
    // medir, e a linha que dependeria disso é omitida em vez de prometida.
    temDecisaoRegistrada: erroDecisao ? false : (decisoes ?? []).length > 0,
  }
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

/**
 * Invoca a Edge Function para **cancelar** o pedido agendado.
 *
 * ⚠ **NÃO RECEBE `solicitacaoId`, E A AUSÊNCIA É O CONTROLE.** O plano previa a
 * assinatura `invocarCancelarExclusao(solicitacaoId)`; a EF **medida** recusa esse
 * desenho por escrito (`executar-direito-titular/index.ts:190-197`): *"Nenhum
 * identificador vindo do corpo é lido em lugar nenhum desta função"* — o titular sai de
 * `auth.uid()` e o pedido a cancelar sai de uma consulta escopada por ele. Mandar o id
 * daqui seria (i) inerte, porque o servidor o ignora, e (ii) pior que inerte, porque
 * sugeriria à próxima pessoa que o cliente é a autoridade sobre QUAL pedido é cancelado
 * — a superfície de Tampering T-32-03 / T-45-08-05. O que não é enviado não pode ser
 * forjado, e a Invariante 12 já garante que o cliente sequer precise conhecer o id.
 *
 * A copy de erro deste caminho é a do CANCELAMENTO, nunca a do pedido: falhar ao
 * cancelar deixa a pessoa em risco, e a tela tem de dizer isso com a data.
 */
export async function invocarCancelarExclusao(): Promise<RespostaCancelarExclusao> {
  const { data, error } = await supabase.functions.invoke('executar-direito-titular', {
    body: { acao: 'cancelar' },
  })

  // Corpo lido UMA única vez — o de uma `Response` só pode ser consumido uma vez.
  const contexto = (error as { context?: { json?: () => Promise<unknown> } } | null)?.context
  if (contexto?.json) {
    try {
      const corpo = (await contexto.json()) as { error_code?: unknown; motivo?: unknown }
      if (corpo?.error_code) {
        throw traduzirErro(corpo.error_code, corpo.motivo, COPY_EXCLUIR_DADOS.cancelarErroTitulo)
      }
    } catch (e) {
      if (e instanceof ExclusaoError) throw e
      /* corpo não-JSON: degrada para o caminho genérico, nunca lança o erro cru */
    }
  }

  if (error) throw new ExclusaoError(COPY_EXCLUIR_DADOS.cancelarErroTitulo, 'NETWORK')
  if (!data || (data as { ok?: unknown }).ok !== true) {
    throw new ExclusaoError(COPY_EXCLUIR_DADOS.cancelarErroTitulo, 'SERVER_ERROR')
  }
  return data as RespostaCancelarExclusao
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
