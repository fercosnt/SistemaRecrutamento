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
 * ── OS DOIS ARQUIVOS, E POR QUE O `.json` VAI NA FRENTE (44-06) ──────────────
 * O titular recebe **dois** arquivos do mesmo pedido: o `.json`, que é o artefato
 * do direito ("formato que permita a sua utilização", Art. 18, II), e o `.html`,
 * feito para uma pessoa ler. `dispararDownloads` recebe uma LISTA porque **a ordem
 * é contrato**: o `.json` primeiro, para que, se o navegador barrar o segundo
 * download, o que sobreviva seja o que a lei exige.
 *
 * A copy "Você recebe dois arquivos" só passou a existir na tela NESTE plano —
 * antes dele o `.html` não existia, e renderizá-la teria sido a tela afirmando ao
 * titular que recebeu mais do que recebeu (decisão registrada no 44-05).
 *
 * @module features/privacidade/services/exportacaoService
 * @see src/features/privacidade/services/privacidadeService.ts (o molde: classe de erro + tradutor privado)
 * @see src/features/agendamento/services/agendamentoCandidatoService.ts (o molde do disparo por Blob/anchor)
 */
import { supabase } from '@/lib/supabase/client'
// O endereço do canal de privacidade tem UMA fonte no projeto. Duplicá-lo aqui criaria duas
// verdades sobre o mesmo canal humano — e é o canal que a copy de erro oferece
// quando o caminho automático falha.
//
// ⚠ Vem da camada de CONSTANTES, nunca de um componente. Importar de
// `components/AutorizacoesLista` (como este módulo fazia) invertia a direção de
// camada e arrastava React e os primitivos glass para dentro do grafo de um
// serviço que se anuncia PURO e sem DOM — quebrando o próprio corte que torna os
// geradores testáveis sem simular um clique.
import { CANAL_PRIVACIDADE_EMAIL } from '../constants/canalPrivacidade'
// ⚠ O MESMO artefato gerado que a Edge Function projeta. A importação é o ponto:
// o que sai do arquivo legível passa a ser dado do artefato, não literal deste
// módulo — e o gerador reprova a coluna de endereço sem veredito. Ver
// `FORA_DO_ARQUIVO_LEGIVEL` abaixo.
import { EXPORT_ALLOWLIST } from '../../../../supabase/functions/_shared/exportAllowlist'

/**
 * O que a ausência de valor renderiza — nunca `null`, nunca `undefined`, nunca
 * `Invalid Date`. Idioma vivo do `FilaRevisoesTable.formatarData` e regra explícita
 * da §Formatação da 44-UI-SPEC.
 */
export const TRAVESSAO = '—'

/**
 * Escapa um valor do titular antes de ele entrar na string do arquivo legível.
 *
 * ⚠ **POR QUE ESTA FUNÇÃO EXISTE, E POR QUE NÃO HÁ LISTA DE CAMPOS SEGUROS.** O
 * `.html` entregue é aberto em `file://`, onde **não há CSP nenhuma** — nenhum
 * cabeçalho, nenhuma diretiva, nada entre a marcação e o interpretador. E o payload
 * do export é, por construção, texto livre digitado por humanos: `observacoes_rh`,
 * `motivo_rejeicao` e `feedback_rejeicao` são escritos por **terceiros** (a equipe
 * de recrutamento), não pelo titular. Um valor hostil digitado ali vira execução no
 * aparelho de quem abre a cópia.
 *
 * Uma lista de "campos seguros" é exatamente o tipo de coisa que envelhece mal: a
 * allowlist do export cresce por geração automática (44-01/44-03), e a coluna nova
 * entraria sem ninguém revisitar a lista. Por isso **todo** valor passa por aqui.
 *
 * A ORDEM das substituições não é estética: o `&` vai **primeiro**, senão as
 * entidades produzidas pelas outras quatro seriam re-escapadas (`<` → `&lt;` →
 * `&amp;lt;`), e o titular leria entidades cruas no lugar do próprio dado.
 */
export function escapeHtml(valor: unknown): string {
  if (valor === null || valor === undefined || valor === '') return TRAVESSAO
  return String(valor)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

/**
 * `aaaa-mm-dd` **sem componente de hora** — uma DATA, não um instante.
 *
 * ⚠ Separado do `PADRAO_ISO` de propósito, e a separação é a correção da CR-02.
 * Enquanto os dois casos compartilhavam um padrão só, toda data pura era
 * roteada para `formatarDataHoraPtBr` — que faz `new Date(iso)`. Por ECMA-262
 * uma data pura é parseada como **meia-noite UTC** e formatada em hora
 * **local**: em todo fuso negativo (isto é, o Brasil inteiro) o arquivo do
 * titular saía com o DIA ANTERIOR e uma hora que não existe no dado. Medido sob
 * `TZ=America/Sao_Paulo`: `1990-05-12` → `11/05/1990 às 21:00`, e
 * `2000-01-01` → `31/12/1999 às 22:00` — ano errado.
 *
 * Blast radius medido contra PROD em 2026-08-04: das colunas da allowlist, a
 * ÚNICA de tipo `date` é `candidatos.data_nascimento`. Todas as demais são
 * `timestamptz` — instantes de verdade, que continuam pelo caminho de baixo.
 */
const PADRAO_DATA_PURA = /^\d{4}-\d{2}-\d{2}$/

/** O ISO COMPLETO — só isto é instante, e só isto sofre conversão de fuso. */
const PADRAO_ISO = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2}(\.\d+)?)?(Z|[+-]\d{2}:?\d{2})?$/

/**
 * `dd/mm/aaaa às HH:mm` em pt-BR, 24 h — o formato do carimbo dos arquivos e da
 * hora de liberação do cooldown (§Formatação da 44-UI-SPEC).
 *
 * **Total:** entrada ausente ou ilegível resolve para travessão. Uma data inválida
 * na tela do titular é `Invalid Date`, e `Invalid Date` numa frase sobre um direito
 * lê como sistema quebrado.
 */
export function formatarDataHoraPtBr(iso: string | null | undefined): string {
  if (!iso) return TRAVESSAO
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return TRAVESSAO
  const data = d.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })
  const hora = d.toLocaleTimeString('pt-BR', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  })
  return `${data} às ${hora}`
}

/**
 * `aaaa-mm-dd` → `dd/mm/aaaa`, **por fatia de string**.
 *
 * ⚠ **Nunca por `new Date`.** Uma data pura não tem relógio, logo não tem fuso a
 * converter: passá-la por um `Date` inventa uma meia-noite UTC e a re-lê em hora
 * local. A cópia que a lei exige passaria a afirmar a data de nascimento errada
 * do titular — silenciosamente, porque o `.json` (que carrega o valor cru)
 * continuaria certo e ninguém compara os dois arquivos.
 *
 * **Total**, no mesmo contrato de `formatarDataHoraPtBr`: entrada ausente ou
 * fora da forma resolve para travessão, nunca `Invalid Date`.
 */
export function formatarDataPuraPtBr(iso: string | null | undefined): string {
  if (!iso || !PADRAO_DATA_PURA.test(iso)) return TRAVESSAO
  const [ano, mes, dia] = iso.split('-')
  return `${dia}/${mes}/${ano}`
}

/**
 * Copy verbatim da 44-UI-SPEC (§"Os dois arquivos entregues são superfície de UI").
 *
 * Eles são lidos por uma pessoa, **fora do navegador, possivelmente meses depois** —
 * por isso têm contrato de copy, e por isso o carimbo e a versão da allowlist não
 * são cortesia: sem eles não há como distinguir uma cópia de hoje de uma do mês
 * passado, nem provar qual escopo estava vigente naquele dia.
 */
export const COPY_ARQUIVO = {
  titulo: 'Seus dados na Beauty Smile',
  carimbo: (quando: string) => `Cópia gerada em ${quando}.`,
  naoEstaTitulo: 'O que não está nesta cópia',
  naoFazTitulo: 'O que esta cópia não faz',
  naoFazCorpo:
    'Baixar esta cópia não altera nada nos seus dados. Ela é uma fotografia do que a Beauty Smile guardava sobre você na data acima.',
  /**
   * A frase fixa ao lado do currículo. O arquivo em si **nunca** entra: nem
   * conteúdo, nem base64, nem link (Invariante 4). Um link de 60 s dentro de um
   * arquivo que a pessoa abre amanhã é um link morto que parece mentira do export.
   */
  curriculoNota:
    'Seu currículo aparece aqui apenas pelo nome do arquivo e pela data de envio. O arquivo em si é baixado pela página Seus dados e autorizações, por um link gerado na hora.',
  semRegistro: 'Nenhum registro.',
  rodape: (versao: string, quando: string) =>
    `Versão da lista de dados exportados: ${versao}. Cópia gerada em ${quando}.`,
  /** Um rótulo legível por tabela da allowlist. Tabela nova cai no humanizador. */
  rotuloTabela: {
    candidatos: 'Seu cadastro',
    candidaturas: 'Suas candidaturas',
    autorizacoes: 'Suas autorizações',
    solicitacoes_dados: 'Seus pedidos de cópia dos dados',
    agendamentos_entrevista: 'Entrevistas agendadas',
    analise_candidato_vaga: 'Análises da sua candidatura',
    avaliacoes_rh: 'Avaliações feitas pela equipe de recrutamento',
    candidate_ai_decisions: 'Resultado e explicação da avaliação automatizada',
    cognitivo_respostas: 'Suas respostas na avaliação cognitiva',
    decisao_final: 'Decisão final de cada candidatura',
    decisao_final_historico: 'Histórico das decisões finais',
    devolutivas_candidato: 'Devolutivas enviadas a você',
    disponibilidade: 'Sua disponibilidade',
    entrevista_analises: 'Análises das entrevistas',
    entrevistas_online: 'Entrevistas online',
    entrevistas_presenciais: 'Entrevistas presenciais',
    historico_candidatura: 'Histórico de cada candidatura',
    recruiter_alerts: 'Avisos internos ligados a você',
    redacoes_candidato: 'Suas redações',
    redacoes_candidato_em_progresso: 'Redações começadas e não enviadas',
    respostas_avaliacao: 'Suas respostas nas avaliações',
    respostas_bigfive: 'Suas respostas na avaliação comportamental',
    respostas_cultura: 'Suas respostas sobre cultura',
    respostas_disc: 'Suas respostas no questionário de perfil comportamental',
    respostas_formulario: 'Suas respostas no formulário',
    respostas_raven: 'Suas respostas na avaliação de raciocínio',
    scores_bigfive: 'Resultados da avaliação comportamental',
    scores_candidato: 'Resultados das suas respostas',
    scores_disc: 'Resultados do perfil comportamental',
    scores_raven: 'Resultados da avaliação de raciocínio',
  } as Record<string, string>,
  /**
   * Rótulos só para as colunas cujo nome é técnico ou em inglês. As colunas de
   * domínio já nascem em pt-BR (CLAUDE.md) e o humanizador resolve — manter 365
   * rótulos à mão criaria um segundo inventário para apodrecer ao lado da allowlist.
   */
  rotuloColuna: {
    id: 'Identificador do registro',
    created_at: 'Criado em',
    updated_at: 'Atualizado em',
    deleted_at: 'Inativado em',
    user_id: 'Identificador da conta de acesso',
    candidato_id: 'Identificador do seu cadastro',
    candidatura_id: 'Identificador da candidatura',
    vaga_id: 'Identificador da vaga',
    email: 'E-mail',
    email_verificado: 'E-mail confirmado',
    cpf: 'CPF',
    cep: 'CEP',
    avatar_url: 'Foto do perfil',
    curriculo_nome_original: 'Currículo (nome do arquivo)',
    curriculo_tamanho_bytes: 'Currículo (tamanho em bytes)',
    observacoes_rh: 'Observações da equipe de recrutamento',
    motivo_rejeicao: 'Motivo registrado',
    feedback_rejeicao: 'Retorno registrado',
    is_favorito: 'Marcado como favorito',
    is_rascunho: 'Ainda em rascunho',
    is_read: 'Lido',
    call_type: 'Tipo do aviso',
    message: 'Mensagem',
    flags: 'Sinalizações',
    gaps: 'Lacunas apontadas',
    raw_responses: 'Respostas registradas',
    proctoring: 'Registros do acompanhamento da aplicação',
    completion_time_seconds: 'Tempo até concluir (segundos)',
    ai_composite_score: 'Pontuação geral da avaliação',
    ai_reasoning_summary: 'Explicação do resultado',
    ai_recommendation: 'Recomendação registrada',
    explanation_channel: 'Canal da explicação',
    score_agreeableness: 'Pontuação — cooperação',
    score_conscientiousness: 'Pontuação — organização',
    score_extraversion: 'Pontuação — extroversão',
    score_neuroticism: 'Pontuação — estabilidade emocional',
    score_openness: 'Pontuação — abertura ao novo',
  } as Record<string, string>,
} as const

/**
 * As colunas que ficam **fora do arquivo legível** — LIDAS DO ARTEFATO GERADO,
 * nunca escritas aqui.
 *
 * ── POR QUE ISTO NÃO É MAIS UM `Set` LITERAL ─────────────────────────────────
 * Era. E o literal tinha um item (`curriculo_url`) sob um docblock afirmando que
 * um item era a resposta completa. Eram quatro: `candidatos.avatar_url`,
 * `entrevistas_online.gravacao_url` e `entrevistas_online.link_videochamada` já
 * estavam na allowlist e atravessavam para o `<dd>` do arquivo que a pessoa
 * guarda no aparelho. O `escapeHtml` deste mesmo módulo já tinha escrito a razão,
 * 160 linhas acima: "uma lista de campos seguros é exatamente o tipo de coisa que
 * envelhece mal — a allowlist do export cresce por geração automática, e a coluna
 * nova entraria sem ninguém revisitar a lista". O argumento estava certo e não
 * tinha sido aplicado aqui.
 *
 * Agora o veredito é DADO: mora em `ponteiros_de_infra` do
 * `export-scope-rules.yaml`, com razão nomeada por coluna, e o gerador **reprova a
 * geração** quando uma coluna exportada com nome de endereço não tem veredito.
 * Uma `*_url` nova não entra no arquivo legível em silêncio — ela para a geração.
 *
 * ⚠ **Assimetria deliberada com o `.json`.** Lá o caminho permanece: aquele
 * arquivo é lido por máquina e o 44-05 registrou que ele é caminho, não link.
 * Aqui seria ruído com aparência de endereço — e a Invariante 4 é sobre o que a
 * pessoa lê. Nenhum dos dois carrega link assinado, que é a proibição de verdade.
 *
 * @see docs/compliance/export-scope-rules.yaml (§6b · PONTEIROS DE INFRAESTRUTURA)
 */
const FORA_DO_ARQUIVO_LEGIVEL: ReadonlyMap<string, ReadonlySet<string>> = new Map(
  Object.entries(EXPORT_ALLOWLIST.tabelas).map(([tabela, def]) => [
    tabela,
    new Set((def as { fora_do_arquivo_legivel?: readonly string[] }).fora_do_arquivo_legivel ?? []),
  ]),
)

/**
 * O padrão de NOME DE ENDEREÇO, lido do mesmo artefato — nunca recompilado a
 * partir de uma segunda cópia da regex.
 */
const PADRAO_NOME_DE_ENDERECO = new RegExp(EXPORT_ALLOWLIST.meta.padrao_nome_de_endereco)

/**
 * O artefato é a autoridade para toda tabela que ele declara. Para uma tabela que
 * ele **não** declara, a resposta é FECHADA, não aberta.
 *
 * O caso é alcançável e não é hipotético: a Edge Function roda uma versão
 * **implantada** do artefato e o cliente roda a versão **compilada no bundle**.
 * Elas divergem na janela entre um regenerar e o deploy seguinte. Se a EF projetar
 * uma tabela que este bundle não conhece, "não sei" tem de resolver para
 * **esconder o endereço**, nunca para imprimi-lo: o custo de errar para o lado
 * fechado é um `<dd>` a menos numa seção que continua inteira; o custo de errar
 * para o lado aberto é um caminho de Storage — talvez uma URL assinada — dentro de
 * um arquivo que a pessoa pode encaminhar.
 */
function foraDoArquivoLegivel(tabela: string, coluna: string): boolean {
  const declarada = FORA_DO_ARQUIVO_LEGIVEL.get(tabela)
  if (declarada) return declarada.has(coluna)
  return PADRAO_NOME_DE_ENDERECO.test(coluna)
}

/**
 * Ordem de LEITURA das seções — as quatro que respondem "quem sou eu aqui" vêm
 * primeiro; o resto segue a ordem que o servidor mandou (alfabética, da allowlist).
 * Não é filtro: nenhuma tabela do payload deixa de ser renderizada.
 */
const ORDEM_LEITURA = ['candidatos', 'candidaturas', 'autorizacoes', 'solicitacoes_dados']

/** Folha de estilo do documento entregue — fluxo puro, sem altura fixa (E4/overflow). */
const ESTILO = [
  'body{font-family:"Helvetica Neue",Helvetica,Arial,sans-serif;line-height:1.5;color:#1F2430;background:#FFFFFF;margin:0;padding:24px;max-width:900px}',
  'h1{color:#00109E;font-size:28px;line-height:1.2;margin:0 0 8px}',
  'h2{color:#00109E;font-size:20px;line-height:1.2;margin:32px 0 8px;border-top:1px solid #DCDFE6;padding-top:16px}',
  'h3{font-size:14px;font-weight:600;color:#6B6D70;margin:16px 0 4px}',
  'p{font-size:16px;margin:0 0 8px}',
  'dl{margin:0 0 16px}',
  'dt{font-size:14px;font-weight:600;color:#6B6D70;margin-top:8px}',
  'dd{margin:0;font-size:16px;overflow-wrap:anywhere}',
  'pre{white-space:pre-wrap;overflow-wrap:anywhere;font-size:14px;background:#F4F5F7;padding:8px;margin:0}',
  'footer{margin-top:32px;border-top:1px solid #DCDFE6;padding-top:16px;font-size:14px;color:#6B6D70}',
  '.carimbo{font-weight:600}',
  '.nota,.vazio{color:#6B6D70}',
].join('')

/** Humaniza `snake_case` em pt-BR quando não há rótulo explícito. */
function rotularColuna(coluna: string): string {
  const explicito = COPY_ARQUIVO.rotuloColuna[coluna]
  if (explicito) return explicito
  const texto = coluna.replace(/_/g, ' ')
  return texto.charAt(0).toUpperCase() + texto.slice(1)
}

/** Idem para a tabela — tabela nova nunca some, ela aparece com o nome humanizado. */
function rotularTabela(tabela: string): string {
  return COPY_ARQUIVO.rotuloTabela[tabela] ?? rotularColuna(tabela)
}

/**
 * Renderiza UM valor. Texto livre entra **íntegro**: truncar a cópia dos dados de
 * alguém é entregar uma cópia falsa (E4/long-text). Estrutura aninhada vira JSON
 * legível dentro de `<pre>` com quebra livre — o `.html` não pode perder o que o
 * `.json` carrega.
 */
function renderizarValor(valor: unknown): string {
  if (typeof valor === 'boolean') return escapeHtml(valor ? 'Sim' : 'Não')
  // A DATA PURA vem primeiro e nunca cai no caminho do instante: ela não tem
  // hora para exibir nem fuso para converter (ver `PADRAO_DATA_PURA`).
  if (typeof valor === 'string' && PADRAO_DATA_PURA.test(valor)) {
    return escapeHtml(formatarDataPuraPtBr(valor))
  }
  if (typeof valor === 'string' && PADRAO_ISO.test(valor)) {
    return escapeHtml(formatarDataHoraPtBr(valor))
  }
  if (valor !== null && typeof valor === 'object') {
    return `<pre>${escapeHtml(JSON.stringify(valor, null, 2))}</pre>`
  }
  return escapeHtml(valor)
}

/**
 * Um registro (uma linha da tabela) como lista de definição.
 *
 * ⚠ Recebe `tabela` porque o veredito de ponteiro é por `tabela.coluna`, não por
 * nome de coluna solto: `local_ou_link` é endereço da entrevista e FICA visível,
 * enquanto `link_videochamada`, na mesma linha do mesmo pedido, não fica.
 */
function renderizarRegistro(
  tabela: string,
  linha: unknown,
  indice: number,
  total: number,
): string {
  if (linha === null || typeof linha !== 'object') {
    return `<article><p>${renderizarValor(linha)}</p></article>`
  }
  const campos = Object.entries(linha as Record<string, unknown>)
    .filter(([coluna]) => !foraDoArquivoLegivel(tabela, coluna))
    .map(
      ([coluna, valor]) =>
        `<dt>${escapeHtml(rotularColuna(coluna))}</dt><dd>${renderizarValor(valor)}</dd>`,
    )
    .join('')
  const cabecalho = total > 1 ? `<h3>Registro ${indice + 1} de ${total}</h3>` : ''
  return `<article>${cabecalho}<dl>${campos}</dl></article>`
}

/** Uma seção por tabela — inclusive as vazias, que dizem "nenhum registro". */
function renderizarSecao(tabela: string, linhas: unknown): string {
  const partes = [`<section><h2>${escapeHtml(rotularTabela(tabela))}</h2>`]
  if (tabela === 'candidaturas') {
    partes.push(`<p class="nota">${escapeHtml(COPY_ARQUIVO.curriculoNota)}</p>`)
  }
  const lista = Array.isArray(linhas) ? linhas : []
  if (lista.length === 0) {
    partes.push(`<p class="vazio">${escapeHtml(COPY_ARQUIVO.semRegistro)}</p>`)
  } else {
    for (const [i, linha] of lista.entries()) {
      partes.push(renderizarRegistro(tabela, linha, i, lista.length))
    }
  }
  partes.push('</section>')
  return partes.join('\n')
}

/**
 * Monta o arquivo `.html` entregue ao titular — **função pura**, sem DOM, sem
 * relógio (o carimbo sai de `gerado_em`, que é o instante do SERVIDOR).
 *
 * ── ZERO NPM, E AS TRÊS RECUSAS SÃO DELIBERADAS ──────────────────────────────
 * String-building hand-rolled, no idioma de `_shared/email-templates.ts`. **Não
 * PDF** (exigiria dependência nova, banida no M8). **Não CSV** (perderia o
 * aninhamento e viraria um arquivo que só um sistema lê — que é justamente o papel
 * do `.json`). **Não ZIP** (o caminho "óbvio" para entregar os dois num só, e
 * dependência nova do mesmo jeito).
 *
 * ── AS DUAS SEÇÕES DE FRONTEIRA NÃO SÃO OPCIONAIS ────────────────────────────
 * "O que não está nesta cópia" carrega a MESMA razão nomeada que a tela mostra —
 * uma fronteira só, dita nos dois lugares. "O que esta cópia não faz" existe
 * porque baixar **não apaga**: o motor de exclusão é a Phase 45 e não existe hoje,
 * e um arquivo que sugerisse o contrário seria uma afirmação falsa sobre o
 * tratamento dos dados de uma pessoa.
 */
export function gerarHtmlExport(resposta: RespostaExport): string {
  const quando = formatarDataHoraPtBr(resposta.gerado_em)
  const chaves = Object.keys(resposta.payload ?? {})
  const primeiras = ORDEM_LEITURA.filter((t) => chaves.includes(t))
  const ordenadas = [...primeiras, ...chaves.filter((t) => !primeiras.includes(t))]

  return [
    '<!doctype html>',
    '<html lang="pt-BR">',
    '<head>',
    '<meta charset="utf-8">',
    '<meta name="viewport" content="width=device-width, initial-scale=1">',
    `<title>${escapeHtml(COPY_ARQUIVO.titulo)}</title>`,
    `<style>${ESTILO}</style>`,
    '</head>',
    '<body>',
    `<h1>${escapeHtml(COPY_ARQUIVO.titulo)}</h1>`,
    `<p class="carimbo">${escapeHtml(COPY_ARQUIVO.carimbo(quando))}</p>`,
    `<p>${escapeHtml(COPY_PEDIR_COPIA.abertura)}</p>`,
    ...ordenadas.map((tabela) => renderizarSecao(tabela, resposta.payload[tabela])),
    `<section><h2>${escapeHtml(COPY_ARQUIVO.naoEstaTitulo)}</h2>`,
    `<p>${escapeHtml(COPY_PEDIR_COPIA.oQueNaoEsta)}</p></section>`,
    `<section><h2>${escapeHtml(COPY_ARQUIVO.naoFazTitulo)}</h2>`,
    `<p>${escapeHtml(COPY_ARQUIVO.naoFazCorpo)}</p></section>`,
    `<footer><p>${escapeHtml(COPY_ARQUIVO.rodape(resposta.versao_allowlist, quando))}</p></footer>`,
    '</body>',
    '</html>',
  ].join('\n')
}

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
  /**
   * O motivo visível ao lado do botão desabilitado EM VOO. Existe porque a
   * Invariante 3(iii) da 44-UI-SPEC — "um botão desabilitado nunca aparece sem o
   * motivo em texto visível ao lado" — é estrutural, não uma regra sobre o
   * cooldown: um `disabled` sem motivo é indistinguível de uma tela quebrada,
   * qualquer que seja a causa. Não é barra de progresso e não conta o tempo.
   */
  motivoEmVoo:
    'Estamos montando os dois arquivos. O download começa assim que eles ficarem prontos.',
  abertura:
    'Você pode baixar uma cópia dos dados que a Beauty Smile guarda sobre você. É um direito seu (LGPD, Art. 18, II).',
  comoChegaTitulo: 'Como a cópia chega',
  comoChega:
    'Você recebe dois arquivos: um feito para você ler e outro em formato de dados, caso queira levar suas informações para outro lugar. Seu navegador pode pedir permissão para baixar mais de um arquivo — é normal, e os dois vêm do mesmo pedido.',
  oQueEstaTitulo: 'O que está na cópia',
  oQueEsta:
    'Seu cadastro, suas candidaturas, o que você autorizou, suas entrevistas agendadas, o histórico de cada candidatura, e o resultado e a explicação das avaliações que você fez.',
  oQueNaoEstaTitulo: 'O que não está na cópia',
  oQueNaoEsta:
    'Não entram os registros internos de funcionamento do sistema — por exemplo, o tempo e o custo de processamento das nossas ferramentas de tecnologia. Eles descrevem o sistema, não você.',
  /**
   * ⚠ NÃO RENDERIZADA NESTA FASE, e a ausência é a decisão. Ela nomeia "o botão
   * abaixo" — o `CurriculosBloco` do 44-07, que ainda não existe. Renderizá-la
   * antes do botão seria a tela apontando o titular para um controle inexistente,
   * a mesma classe de afirmação falsa que fez o 44-05 adiar `comoChega`. Mora aqui
   * para que o 44-07 a renderize desta fonte única, sem reescrevê-la.
   */
  sobreCurriculoTitulo: 'Sobre o currículo',
  sobreCurriculo:
    'Seu currículo não vem dentro desses dois arquivos. Ele é baixado à parte, pelo botão abaixo, por um link gerado na hora e válido por poucos segundos — é assim que ele fica protegido.',
  sucessoTitulo: 'Pronto. Sua cópia foi baixada em dois arquivos:',
  /**
   * O sucesso NOMEIA os dois arquivos que a pessoa vai procurar na pasta de
   * downloads — é por isso que ele persiste na tela e nunca é um toast. Os nomes
   * são os MESMOS que `dispararDownloads` usou (derivados de `gerado_em`), não uma
   * segunda derivação do relógio do navegador.
   */
  sucessoCorpo: (nomeHtml: string, nomeJson: string) =>
    `${nomeHtml}, para leitura, e ${nomeJson}, em formato de dados. Se não encontrar, procure na pasta de downloads do seu aparelho.`,
  erroTitulo: 'Não foi possível preparar sua cópia.',
  erroCorpo: `Tente novamente em alguns minutos. Se continuar, escreva para o nosso canal de privacidade: ${CANAL_PRIVACIDADE_EMAIL}.`,
} as const

/**
 * A copy do **cooldown**, com UM consumidor de cada lado da mesma barreira: o
 * estado local (lido de `solicitacoes_dados`) e a tradução da recusa 429 da Edge
 * Function. Um segundo texto para o mesmo fato viraria **duas verdades sobre o
 * mesmo limite** — e a que o titular veria dependeria de qual caminho falhou.
 *
 * A hora de liberação é interpolada; quando ela não é conhecível (leitura de
 * estado degradada, recusa sem `liberado_em`), a frase degrada para uma que
 * continua verdadeira, em vez de exibir `Invalid Date` ou um travessão solto no
 * meio de uma sentença.
 */
export const COPY_COOLDOWN = {
  titulo: 'Você já pediu uma cópia nas últimas 24 horas.',
  corpo: (liberadoEm: string | null | undefined) => {
    const quando = formatarDataHoraPtBr(liberadoEm)
    const primeira =
      quando === TRAVESSAO
        ? 'Você poderá pedir outra assim que esse período passar.'
        : `Você pode pedir outra a partir de ${quando}.`
    return `${primeira} Esse limite existe para proteger a sua conta. Se precisar de uma cópia antes disso, escreva para o nosso canal de privacidade: ${CANAL_PRIVACIDADE_EMAIL}.`
  },
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
export function nomeArquivoExport(extensao: 'json' | 'html', quando: Date = new Date()): string {
  // Total: instante ilegível degrada para o relógio local em vez de produzir
  // `beauty-smile-meus-dados-NaN-NaN-NaN` na pasta de downloads do titular.
  const agora = Number.isNaN(quando.getTime()) ? new Date() : quando
  const dia = [
    agora.getUTCFullYear(),
    String(agora.getUTCMonth() + 1).padStart(2, '0'),
    String(agora.getUTCDate()).padStart(2, '0'),
  ].join('-')
  return `beauty-smile-meus-dados-${dia}.${extensao}`
}

/**
 * Os nomes dos DOIS arquivos de um mesmo pedido, derivados do MESMO instante — o
 * `gerado_em` do servidor, nunca o relógio do navegador em dois momentos.
 *
 * Existe para que "o texto de sucesso nomeia os arquivos que foram baixados" seja
 * um fato ESTRUTURAL e não uma coincidência: o disparo e a tela chamam esta função,
 * então não há como um derivar a data de um lugar e o outro de outro. Duas
 * derivações independentes divergiriam na virada de dia em UTC — e o titular
 * procuraria na pasta de downloads um nome que ninguém escreveu.
 */
export function nomesArquivosExport(resposta: RespostaExport): {
  json: string
  html: string
} {
  // ⚠ O instante é RESOLVIDO AQUI, uma vez — inclusive o fallback.
  //
  // Deixá-lo para `nomeArquivoExport` reabria, no caminho degradado, exatamente a
  // divergência que esta função existe para fechar: quando `gerado_em` é
  // ilegível, cada chamada faz o seu PRÓPRIO `new Date()`, e são duas leituras
  // independentes do relógio. Na virada de dia em UTC o `.json` e o `.html` saem
  // com datas diferentes — e `PedirCopiaBloco` renderiza o texto de sucesso a
  // partir de uma TERCEIRA invocação, então a tela pode nomear arquivos que
  // ninguém escreveu. O titular procuraria na pasta de downloads um nome que não
  // existe.
  const bruto = new Date(resposta.gerado_em)
  const quando = Number.isNaN(bruto.getTime()) ? new Date() : bruto
  return {
    json: nomeArquivoExport('json', quando),
    html: nomeArquivoExport('html', quando),
  }
}

/**
 * Dispara o download dos arquivos, na ordem recebida — idioma `Blob` → object URL →
 * anchor → clique → revoke, verbatim de `baixarIcsAgendamento`.
 *
 * **A ordem é contrato** e a lista a carrega: o `.json` — o artefato do direito
 * legal — vai na frente do `.html`. Se o navegador barrar o segundo download, o que
 * sobrevive é o que a lei exige.
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

// ══════════════════════════════════════════════════════════════════════════════
// O ESTADO DO COOLDOWN — leitura own-row que informa a apresentação e nada mais
// ══════════════════════════════════════════════════════════════════════════════

/**
 * A cadeia PostgREST que este módulo encadeia — e nada além dela.
 *
 * ⚠ **PONTE DE TIPOS TEMPORÁRIA**, idioma verbatim de `pedidosDadosService.ts`
 * (44-08). O arquivo de tipos gerado do Supabase **não foi regenerado** (auth gate
 * do CLI, bloqueio nomeado no 44-04), então o cliente tipado desconhece
 * `solicitacoes_dados` e o projeto reprovaria no `tsc` (baseline congelada em 97).
 *
 * Esta é a resposta MAIS ESTREITA possível: não é um cliente destipado. O nome da
 * tabela continua LITERAL no tipo — um erro de digitação nele ainda não compila. E
 * a conversão é do **objeto** cliente, nunca a extração do método: extrair perde o
 * `this` e derruba o `PostgrestClient` em runtime, defeito que os testes NÃO pegam
 * porque mockam o método inteiro (armadilha documentada em `duplicateCheckService`).
 */
interface ConsultaUltimoPedido {
  select(colunas: string): ConsultaUltimoPedido
  eq(coluna: string, valor: string): ConsultaUltimoPedido
  order(coluna: string, opcoes: { ascending: boolean }): ConsultaUltimoPedido
  limit(n: number): ConsultaUltimoPedido
  maybeSingle(): Promise<{ data: Record<string, unknown> | null; error: unknown }>
}

interface ClienteSolicitacoesDados {
  from(tabela: 'solicitacoes_dados'): ConsultaUltimoPedido
}

const clienteSolicitacoes = supabase as unknown as ClienteSolicitacoesDados

/**
 * As CINCO colunas que o estado do cooldown precisa — allowlist nomeada, nunca
 * projeção total. `RLS é row-level, não column-level`: uma projeção total aqui
 * traria colunas que esta tela não usa para dentro do cache do TanStack Query.
 */
export const ULTIMO_PEDIDO_COLUNAS = 'id, situacao, causa, solicitado_em, atendido_em'

/** O tipo do pedido cujo cooldown vale para esta tela — o Art. 18, II, não o 45. */
export const TIPO_PEDIDO_ACESSO = 'acesso'

/** A janela do limite. Constante da Edge Function (24 h), espelhada aqui. */
export const JANELA_COOLDOWN_MS = 24 * 60 * 60 * 1000

/** O último pedido de acesso do titular, na forma que a apresentação consome. */
export interface UltimoPedidoDados {
  id: string
  situacao: string
  causa: string | null
  solicitado_em: string
  atendido_em: string | null
}

/**
 * Lê o ÚLTIMO pedido de acesso do próprio candidato — own-row, por allowlist.
 *
 * **Nunca lança.** Erro de transporte, linha ausente ou `candidatoId` vazio
 * resolvem para `null`, que é resultado VÁLIDO: "não sei" e "nunca pediu" levam à
 * MESMA apresentação — o CTA renderiza e o servidor decide. Ver a Invariante 3.
 *
 * ⚠ O filtro `tipo = 'acesso'` não é decorativo. `solicitacoes_dados` nasce com
 * `tipo` para a Phase 45 (exclusão); sem o filtro, um futuro pedido de exclusão
 * consumiria o cooldown do direito de ACESSO em silêncio — dois direitos distintos
 * compartilhando um limite que nunca foi decidido para os dois.
 *
 * A autorização desta leitura é a policy own-row VIVA de `solicitacoes_dados`,
 * medida no retrato do M3 — o SUMMARY do 44-04, não o arquivo de migration: o
 * arquivo não é o objeto vivo.
 *
 * @see .planning/phases/44-exporta-o-acesso/44-04-SUMMARY.md (§retrato do M3)
 */
export async function lerUltimoPedidoDados(
  candidatoId: string | undefined,
): Promise<UltimoPedidoDados | null> {
  if (!candidatoId) return null

  const { data, error } = await clienteSolicitacoes
    .from('solicitacoes_dados')
    .select(ULTIMO_PEDIDO_COLUNAS)
    .eq('candidato_id', candidatoId)
    .eq('tipo', TIPO_PEDIDO_ACESSO)
    .order('solicitado_em', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (error || !data) return null
  return data as unknown as UltimoPedidoDados
}

/**
 * O instante em que o titular volta a poder pedir, ou `null` quando não há limite
 * em vigor. **Pura e total** — nenhuma entrada produz `NaN` nem `Invalid Date`.
 *
 * ⚠ Isto **não** decide se o pedido é permitido: decide o que a tela DIZ. A
 * autoridade é o servidor, que reavalia o limite no clique com a mesma janela.
 * Data ilegível resolve para "sem cooldown" de propósito: travar o botão por causa
 * de um valor que o cliente não conseguiu ler moveria a barreira para o cliente, e
 * qualquer DevTools a desliga (precedente vivo do 42-10).
 */
export function calcularLiberacaoCooldown(
  solicitadoEm: string | null | undefined,
  agora: Date = new Date(),
): string | null {
  if (!solicitadoEm) return null
  const pedido = new Date(solicitadoEm)
  if (Number.isNaN(pedido.getTime())) return null

  const liberacao = pedido.getTime() + JANELA_COOLDOWN_MS
  if (liberacao <= agora.getTime()) return null
  return new Date(liberacao).toISOString()
}

// ══════════════════════════════════════════════════════════════════════════════
// O CV DO TITULAR — leitura own-row + cunhagem CLIENT-SIDE (EXPORT-03, BD-7)
// ══════════════════════════════════════════════════════════════════════════════

/** O bucket dos currículos. Constante nomeada: o literal solto não é contrato. */
export const BUCKET_CURRICULOS = 'curriculos'

/**
 * A duração da URL assinada do currículo, em segundos.
 *
 * É o MESMO número de `get-curriculo-url/index.ts:206`, que é a duração canônica de
 * URL assinada sobre PII neste projeto. O `3600` de `perfilRhService.ts:294` **não**
 * é precedente: aquilo é foto de perfil, que não é PII do titular sob o Art. 18, II.
 * Um segundo número aqui exigiria justificar por que o CV do próprio dono merece
 * janela mais frouxa que o CV visto pela equipe de recrutamento — e não há resposta.
 */
export const TTL_CURRICULO_SEGUNDOS = 60

/**
 * Allowlist NOMEADA da lista de currículos do titular — inclusive o embed da vaga,
 * que traz **só** o título.
 *
 * Cada coluna a mais é payload que atravessa a rede e senta no cache do TanStack
 * Query mesmo sem nunca ser renderizada: `RLS é row-level, não column-level`. É a
 * lição literal do comentário T-08-09 de `candidaturasService.ts`, e a classe de
 * vulnerabilidade nº 1 deste projeto.
 */
export const CURRICULOS_ALLOWLIST = 'id, curriculo_url, created_at, vaga:vagas ( titulo )'

/** Uma candidatura com currículo, na forma que a apresentação consome. */
export interface LinhaCurriculo {
  /** Id da candidatura — é a chave do estado por linha do bloco. */
  id: string
  /** Caminho de Storage. O único produtor legítimo do argumento da cunhagem. */
  caminho: string
  enviadoEm: string
  /** `null` quando a vaga não tem título resolvível — nunca `undefined`. */
  vagaTitulo: string | null
}

/** A forma crua que o PostgREST devolve, antes da normalização. */
interface LinhaCurriculoBruta {
  id?: unknown
  curriculo_url?: unknown
  created_at?: unknown
  vaga?: unknown
}

/**
 * Normaliza o embed de vaga num lugar SÓ.
 *
 * O embed de relação um-para-um do PostgREST chega ora como objeto, ora como lista
 * de um elemento, conforme a tipagem gerada — e um componente que conheça as duas
 * formas é um componente que vai renderizar `[object Object]` no dia em que a
 * tipagem mudar. Normalização defensiva no serviço (precedente 42-11).
 */
function tituloDaVaga(vaga: unknown): string | null {
  const alvo = Array.isArray(vaga) ? vaga[0] : vaga
  if (!alvo || typeof alvo !== 'object') return null
  const titulo = (alvo as { titulo?: unknown }).titulo
  return typeof titulo === 'string' && titulo.trim() !== '' ? titulo : null
}

/**
 * Lista as candidaturas do titular **que têm currículo** — own-row, por allowlist.
 *
 * ⚠ **NÃO esconde candidatura removida de forma suave, e isso é decisão.** O
 * predicado oposto existe em `get-curriculo-url/index.ts:164` (WR-03) e serve a
 * outro fato: lá o leitor é um RH, e o controle impede que ele veja o CV de uma
 * candidatura retirada — um fato entre pessoas diferentes. Aqui o leitor é o **dono
 * do arquivo**; o arquivo continua no Storage porque nenhuma rotina apaga dado de
 * candidato hoje, e negar ao dono a existência de um arquivo que a empresa guarda é
 * a mentira oposta à que este milestone existe para corrigir. A razão já está
 * escrita, verbatim, no docblock de `obterGuardaCurriculo`
 * (`privacidadeService.ts:212-220`).
 */
export async function listarMeusCurriculos(
  candidatoId: string | undefined,
): Promise<LinhaCurriculo[]> {
  if (!candidatoId) return []

  const { data, error } = await supabase
    .from('candidaturas')
    .select(CURRICULOS_ALLOWLIST)
    .eq('candidato_id', candidatoId)
    .not('curriculo_url', 'is', null)
    .order('created_at', { ascending: false })

  if (error) {
    // A mensagem crua do transporte fica de fora inteira (idioma do tradutor
    // privado de `privacidadeService`). A tela decide por `code`, nunca pelo texto.
    const status = (error as { code?: string })?.code
    throw new ExportacaoError(
      COPY_PEDIR_COPIA.erroTitulo,
      status === '42501' ? 'FORBIDDEN' : 'SERVER_ERROR',
    )
  }

  const linhas = (data ?? []) as unknown as LinhaCurriculoBruta[]
  return linhas
    .filter((linha) => typeof linha?.curriculo_url === 'string' && linha.curriculo_url !== '')
    .map((linha) => ({
      id: String(linha.id),
      caminho: linha.curriculo_url as string,
      enviadoEm: typeof linha.created_at === 'string' ? linha.created_at : '',
      vagaTitulo: tituloDaVaga(linha.vaga),
    }))
}

/**
 * A copy da falha da LINHA (44-UI-SPEC §Sub-bloco "Seu currículo"). Mora no serviço
 * porque é ele quem lança — e assim há uma frase só para o fato, do lado que a
 * produz e do lado que a mostra.
 */
export const COPY_CURRICULO_ERRO = 'Não foi possível abrir este currículo.'

/**
 * Cunha a URL assinada do currículo do PRÓPRIO titular — client anon, JWT dele,
 * `service_role` fora do caminho inteiro (BD-7).
 *
 * Três fatos tornam esta função defensável, e nenhum deles é óbvio:
 *
 * 1. **`get-curriculo-url` devolve 403 a candidato** (`index.ts:139-141`) e seu único
 *    sítio vivo é uma tela de RH. Sem saber disso, o próximo executor "reusa o
 *    `CvButton` inteiro" e o titular leva 403. O `CvButton` é molde de **mecanismo**
 *    (abrir aba dentro do gesto), nunca de fonte de dados (44-RESEARCH §Achado #1).
 * 2. **As duas policies de SELECT do bucket são OR'd** e cobrem convenções de pasta
 *    diferentes — `candidatos.id` e `auth.uid()` (44-MEASUREMENTS §M4). É o que
 *    autoriza a cunhagem sem `service_role`, e é uma propriedade MELHOR do que a
 *    pesquisa supôs: o titular lê o próprio CV sob qualquer das duas convenções.
 * 3. **n = 3** (§M5): três CVs vivos, três com prefixo `auth.uid()`, zero com o
 *    outro. Três linhas não provam um formato — por isso "o titular lê o próprio CV"
 *    é asserção testada em runtime, com **falha por linha e visível**, jamais
 *    invariante assumido.
 *
 * ⚠ **O parâmetro é caminho de Storage, e o único produtor legítimo dele é
 * `listarMeusCurriculos`.** Nunca id de candidatura, nunca parâmetro de rota, nunca
 * entrada de usuário: um segundo produtor de caminho é literalmente como o acesso
 * horizontal entra neste desenho, e do lado do servidor a única coisa que o impede é
 * a RLS medida no M4 — que é o lado que vale.
 *
 * A URL é o RETORNO desta função e morre no chamador. Este módulo não registra
 * nada em lugar nenhum (sonda de texto-fonte (af)): um registro acrescentado depois
 * transformaria um TTL de 60 s num link ao alcance de quem estiver olhando a tela.
 */
export async function mintarUrlCurriculoProprio(caminho: string): Promise<string> {
  const { data, error } = await supabase.storage
    .from(BUCKET_CURRICULOS)
    .createSignedUrl(caminho, TTL_CURRICULO_SEGUNDOS)

  if (error || !data?.signedUrl) {
    throw new ExportacaoError(COPY_CURRICULO_ERRO, 'SERVER_ERROR')
  }
  return data.signedUrl
}

/** Export nomeado do namespace (convenção `camelCaseService`). */
export const exportacaoService = {
  invocarExportMeusDados,
  gerarJsonExport,
  gerarHtmlExport,
  escapeHtml,
  formatarDataHoraPtBr,
  formatarDataPuraPtBr,
  nomeArquivoExport,
  dispararDownloads,
  lerUltimoPedidoDados,
  calcularLiberacaoCooldown,
  listarMeusCurriculos,
  mintarUrlCurriculoProprio,
}
