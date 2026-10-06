/**
 * Phase 44 / Plano 44-03 Task 2 — o contrato congelado do `export-allowlist.json`
 * (EXPORT-02 · EXPORT-04 · EXPORT-06 · SC#3 asserção 1).
 *
 * ⚠ ESTE TESTE NÃO SUBSTITUI O SMOKE SQL, E A DISTINÇÃO É O MOTIVO DE ELE EXISTIR.
 * Aqui se lê o ARTEFATO COMMITADO; o `docs/compliance/sql/05-export-allowlist-drift.sql`
 * lê o CATÁLOGO DO BANCO. São universos disjuntos. Uma coluna nova em PROD não move
 * um byte deste JSON, logo nenhuma asserção deste arquivo pode falhar por causa dela —
 * e essa é literalmente a falha que o SC#3 nomeia. Este projeto já embarcou uma vez a
 * classe "guarda que era dead code" (P39/CR-02); os dois guardas existem porque cada um
 * enxerga o que o outro é estruturalmente cego para ver.
 *
 * POR QUE A LISTA É CONGELADA
 * Cada string aqui é uma coluna que sai do banco na cópia de um titular. Uma linha a
 * mais no snapshot é uma coluna a mais em TODA cópia entregue, para sempre. O snapshot
 * inline (e não `.snap`) põe esse diff no meio do PR, no arquivo que o revisor já está
 * lendo — o `.snap` externo é o arquivo que ninguém abre.
 *
 * POR QUE AS ASSERÇÕES NEGATIVAS NÃO SÃO SNAPSHOT
 * `vitest -u` reescreve qualquer snapshot sem perguntar. Se a rede inteira fosse
 * snapshot, um `-u` distraído aprovaria um segredo entrando na cópia. As asserções (c)
 * e (d) são nomeadas, uma por token/coluna, e SOBREVIVEM a um `-u`: falham com o nome
 * do token no output, não dentro de um diff de 364 linhas.
 *
 * POR QUE OS TOKENS PROIBIDOS SÃO MONTADOS EM RUNTIME
 * Idioma estabelecido no 42-11: escrever o nome da credencial SMTP como literal dentro
 * do arquivo que o proíbe faz o literal proibido passar a existir — e um grep repo-wide
 * de auditoria bate no próprio guarda. Montar por `join('_')` mantém a asserção real
 * sem plantar a string. Este parágrafo obedece à própria regra: nenhum dos tokens
 * aparece escrito por extenso em lugar nenhum deste arquivo, nem em comentário.
 *
 * ⚠ `readFileSync`, nunca `import`. O teste tem de continuar valendo se o artefato
 * mudar de forma (e o `.ts` espelho é comparado como DADO, não como módulo).
 *
 * @see docs/compliance/sql/gen-export-allowlist.cjs (o gerador — os artefatos são saída de máquina)
 * @see docs/compliance/sql/05-export-allowlist-drift.sql (o outro guarda do SC#3)
 * @see src/features/revisao/services/__tests__/revisaoService.test.ts (o molde da allowlist congelada com negativas nomeadas)
 * @see .planning/phases/44-exporta-o-acesso/44-03-PLAN.md Task 2
 */
import { describe, it, expect } from 'vitest'
import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const REPO = resolve(__dirname, '..', '..', '..')
const CAMINHO_JSON = resolve(REPO, 'docs/compliance/export-allowlist.json')
const CAMINHO_TS = resolve(REPO, 'supabase/functions/_shared/exportAllowlist.ts')
const CAMINHO_CATALOGO = resolve(REPO, 'docs/compliance/catalogo-vivo-44.json')
const CAMINHO_SMOKE = resolve(REPO, 'docs/compliance/sql/05-export-allowlist-drift.sql')
// O MESMO predicado, na forma que FALHA ALTO (BD-14, 44-10). Os dois arquivos carregam
// os mesmos três `VALUES` e os mesmos cinco textos de veredito — (k) e (k2) prendem isso.
const CAMINHO_DRIFT_SMOKE = resolve(REPO, 'supabase/tests/p44_export_drift_smoke.sql')
const ARQUIVOS_DRIFT = [CAMINHO_SMOKE, CAMINHO_DRIFT_SMOKE] as const

interface TabelaAllowlist {
  chave_titular: string
  ligacao: string
  razao: string
  colunas: string[]
  proveniencia: Record<string, string>
  colunas_excluidas: Record<string, string>
}

interface Allowlist {
  meta: {
    versao: string
    medido_em: string
    consumidores: string[]
    escopo_declarado_nao_vivo: string[]
    totais: Record<string, number>
  }
  tabelas: Record<string, TabelaAllowlist>
  excluidas: Record<string, string>
}

const allowlist = (): Allowlist => JSON.parse(readFileSync(CAMINHO_JSON, 'utf8'))

/** `['tabela.coluna', …]` ordenado — o conjunto achatado do que sai na cópia. */
function chavesAchatadas(): string[] {
  const a = allowlist()
  return Object.entries(a.tabelas)
    .flatMap(([tabela, t]) => t.colunas.map((coluna) => `${tabela}.${coluna}`))
    .sort()
}

/**
 * `['tabela.coluna', …]` ordenado — o conjunto achatado do que FICOU DE FORA, com
 * veredito, de tabela que ESTÁ em escopo.
 *
 * Este conjunto é tão contratual quanto o de cima, por duas razões independentes:
 *  · o smoke SQL compara o catálogo vivo contra a UNIÃO dos dois (ver (k));
 *  · a Phase 45 consome este artefato como plano de exclusão (EXPORT-06), e um plano
 *    que não diz o que ficou de fora obriga a fase IRREVERSÍVEL a adivinhar.
 */
function excluidasAchatadas(): string[] {
  const a = allowlist()
  return Object.entries(a.tabelas)
    .flatMap(([tabela, t]) => Object.keys(t.colunas_excluidas ?? {}).map((coluna) => `${tabela}.${coluna}`))
    .sort()
}

/**
 * `['tabela.destino', …]` ordenado — a DISPOSIÇÃO de toda tabela que o artefato
 * conhece: `tabela.escopo_titular` para cada tabela em escopo e `tabela.<razao>`
 * para cada excluída. É o conjunto contra o qual o catálogo VIVO de tabelas é
 * comparado no SQL (BD-14, 44-10): tabela viva fora dele é tabela sem disposição.
 */
function disposicaoAchatada(): string[] {
  const a = allowlist()
  return [
    ...Object.keys(a.tabelas).map((tabela) => `${tabela}.escopo_titular`),
    ...Object.entries(a.excluidas).map(([tabela, razao]) => `${tabela}.${razao}`),
  ].sort()
}

/** O arquivo SQL sem as linhas de comentário (`--`), para os invariantes de código. */
function semComentario(caminho: string): string {
  expect(existsSync(caminho), `${caminho.slice(REPO.length + 1)}: arquivo ausente`).toBe(true)
  return readFileSync(caminho, 'utf8')
    .split('\n')
    .filter((l) => !l.trimStart().startsWith('--'))
    .join('\n')
}

/** Os três marcadores de CTE, NA ORDEM em que o arquivo os declara. */
const MARCADORES = [
  'allowlist(tabela, coluna) AS (',
  'excluidas(tabela, coluna) AS (',
  'disposicao_tabelas(tabela, destino) AS (',
] as const

/**
 * Extrai os pares dos TRÊS blocos `VALUES` de um arquivo SQL, cortando pelos três
 * marcadores na ordem: `allowlist` = do início ao 2º marcador; `excluidas` = do 2º
 * ao 3º; `tabelas` = do 3º ao fim.
 *
 * Linhas de comentário começam com `--` e nunca com quatro espaços, então o recorte
 * por indentação não confunde o exemplo do bloco META-TEST com o `VALUES` real.
 *
 * ⚠ CADA MARCADOR TEM DE OCORRER EXATAMENTE UMA VEZ — e isso é asserido aqui, com o
 * nome do arquivo e do marcador. Um marcador ausente faz `indexOf` devolver -1, o
 * recorte lê vazio, e a mensagem da (k) culparia o `VALUES` ERRADO («envelheceu —
 * rode --sql-values…») por um defeito que é de estrutura do arquivo.
 */
function paresDoArquivo(caminho: string): { allowlist: string[]; excluidas: string[]; tabelas: string[] } {
  const nome = caminho.slice(REPO.length + 1)
  expect(existsSync(caminho), `${nome}: arquivo ausente`).toBe(true)
  const sql = readFileSync(caminho, 'utf8')
  const cortes = MARCADORES.map((m) => {
    const i = sql.indexOf(m)
    expect(i, `${nome}: marcador de CTE \`${m}\` ausente`).not.toBe(-1)
    expect(sql.lastIndexOf(m), `${nome}: marcador de CTE \`${m}\` ocorre mais de uma vez`).toBe(i)
    return i
  })
  expect([...cortes].sort((x, y) => x - y), `${nome}: os três marcadores de CTE fora de ordem`).toEqual(cortes)
  const ler = (trecho: string) =>
    [...trecho.matchAll(/^ {4}\('([a-z0-9_]+)','([a-z0-9_]+)'\),?$/gim)].map((m) => `${m[1]}.${m[2]}`).sort()
  return {
    allowlist: ler(sql.slice(0, cortes[1])),
    excluidas: ler(sql.slice(cortes[1], cortes[2])),
    tabelas: ler(sql.slice(cortes[2])),
  }
}

// Tokens de segredo e de telemetria montados em runtime — ver docblock.
const TOKENS_PROIBIDOS: ReadonlyArray<readonly [string, string]> = [
  ['telemetria de LLM (prompt, custo, raw_response)', ['ai', 'call', 'logs'].join('_')],
  ['custo diário de LLM', ['ai', 'cost', 'daily'].join('_')],
  ['credencial SMTP', ['smtp', 'senha', 'encrypted'].join('_')],
  ['segredo de webhook', ['webhook', 'secret'].join('_')],
  ['token de sessão', ['session', 'token'].join('_')],
  ['hash anti-duplicata de CPF/e-mail', ['hash', 'cpf', 'email'].join('_')],
  ['PII de funcionário', ['usuarios', 'rh'].join('_')],
]

// As quatro colunas de consentimento versionado da Phase 43. O BD-6 mediu ZERO
// ocorrências delas no `pii-inventory.yaml`; são a dependência que o ROADMAP declara
// entre a Phase 44 e a Phase 43, e merecem falhar com o próprio nome no output.
const COLUNAS_BD6 = [
  'consent_text_version',
  'consent_text_hash',
  'consent_registrado_em',
  'autorizacao_marketing_vagas',
] as const

describe('export-allowlist.json — o contrato congelado da cópia do titular', () => {
  it('(a) o conjunto de TABELAS do export está congelado', () => {
    expect(Object.keys(allowlist().tabelas).sort()).toMatchInlineSnapshot(`
      [
        "agendamentos_entrevista",
        "analise_candidato_vaga",
        "autorizacoes",
        "avaliacoes_rh",
        "candidate_ai_decisions",
        "candidatos",
        "candidaturas",
        "cognitivo_liberacao",
        "cognitivo_respostas",
        "decisao_final",
        "decisao_final_historico",
        "devolutivas_candidato",
        "disponibilidade",
        "entrevista_analises",
        "entrevistas_online",
        "entrevistas_presenciais",
        "historico_candidatura",
        "recruiter_alerts",
        "redacoes_candidato",
        "redacoes_candidato_em_progresso",
        "respostas_avaliacao",
        "respostas_bigfive",
        "respostas_cultura",
        "respostas_disc",
        "respostas_formulario",
        "respostas_raven",
        "retencao_hold",
        "scores_bigfive",
        "scores_candidato",
        "scores_disc",
        "scores_raven",
        "solicitacoes_dados",
      ]
    `)
  })

  it('(b) o conjunto achatado `tabela.coluna` está congelado', () => {
    // ⚠ Phase 49 (49-17, Task 1): este snapshot cresceu DE PROPÓSITO em DUAS chaves —
    // `entrevista_analises.superada_em` e `.tipo`, as únicas colunas criadas pela fase
    // com veredito `export: true`. As outras cinco da mesma tabela foram para o
    // snapshot (j). Nenhuma outra linha se moveu, e o diff de um par de commits é a
    // prova disso: um snapshot atualizado sem diff auditável é o mesmo que nenhum.
    //
    // ⚠ Phase 44 (44-11, 2026-10-06, G5 — BD-9..BD-13): cresceu DE PROPÓSITO em
    // DEZESSETE chaves, zero removidas — 5 de `cognitivo_liberacao` (`id`,
    // `candidatura_id`, `liberado_em`, `revogado_em`, `motivo`; BD-9), 5 de
    // `retencao_hold` (`id`, `candidatura_id`, `motivo`, `criado_em`,
    // `liberado_em`; BD-10), `candidatos.faixa_etaria_materializada` (BD-13 iii),
    // `candidaturas.encerrada_a_pedido_em` e `solicitacoes_dados.executar_em`/
    // `.cancelado_em` (BD-13 i) e os três `solicitacoes_dados.*_concluido_em`
    // (BD-13 iv, operador). As outras sete do G5 foram para o snapshot (j).
    expect(chavesAchatadas()).toMatchInlineSnapshot(`
      [
        "agendamentos_entrevista.candidatura_id",
        "agendamentos_entrevista.compareceu",
        "agendamentos_entrevista.created_at",
        "agendamentos_entrevista.data_hora",
        "agendamentos_entrevista.deleted_at",
        "agendamentos_entrevista.id",
        "agendamentos_entrevista.local_ou_link",
        "agendamentos_entrevista.observacoes_rh",
        "agendamentos_entrevista.status",
        "agendamentos_entrevista.tipo",
        "agendamentos_entrevista.updated_at",
        "agendamentos_entrevista.vaga_id",
        "analise_candidato_vaga.candidatura_id",
        "analise_candidato_vaga.created_at",
        "analise_candidato_vaga.descartada_em",
        "analise_candidato_vaga.descartada_motivo",
        "analise_candidato_vaga.flags",
        "analise_candidato_vaga.gaps",
        "analise_candidato_vaga.id",
        "analise_candidato_vaga.pontos_fortes",
        "analise_candidato_vaga.resumo_cv",
        "analise_candidato_vaga.resumo_respostas",
        "analise_candidato_vaga.score_match",
        "analise_candidato_vaga.status",
        "analise_candidato_vaga.updated_at",
        "analise_candidato_vaga.vaga_id",
        "autorizacoes.autorizacao_analise_video",
        "autorizacoes.autorizacao_comunicacao",
        "autorizacoes.autorizacao_marketing_vagas",
        "autorizacoes.autorizacao_retencao_curriculo",
        "autorizacoes.autorizacao_uso_dados",
        "autorizacoes.candidato_id",
        "autorizacoes.consent_registrado_em",
        "autorizacoes.consent_text_hash",
        "autorizacoes.consent_text_version",
        "autorizacoes.created_at",
        "autorizacoes.id",
        "autorizacoes.ip_aceite",
        "autorizacoes.policy_version",
        "autorizacoes.updated_at",
        "autorizacoes.user_agent_aceite",
        "autorizacoes.user_id",
        "avaliacoes_rh.adequacao_cultural",
        "avaliacoes_rh.adequacao_tecnica",
        "avaliacoes_rh.candidatura_id",
        "avaliacoes_rh.competencias",
        "avaliacoes_rh.created_at",
        "avaliacoes_rh.deleted_at",
        "avaliacoes_rh.entrevista_id",
        "avaliacoes_rh.id",
        "avaliacoes_rh.justificativa_recomendacao",
        "avaliacoes_rh.observacoes",
        "avaliacoes_rh.pontos_fortes",
        "avaliacoes_rh.pontos_fracos",
        "avaliacoes_rh.potencial_crescimento",
        "avaliacoes_rh.recomendacao",
        "avaliacoes_rh.score_geral",
        "avaliacoes_rh.tipo_entrevista",
        "avaliacoes_rh.updated_at",
        "candidate_ai_decisions.ai_composite_score",
        "candidate_ai_decisions.ai_reasoning_summary",
        "candidate_ai_decisions.ai_recommendation",
        "candidate_ai_decisions.candidato_id",
        "candidate_ai_decisions.created_at",
        "candidate_ai_decisions.explanation_channel",
        "candidate_ai_decisions.explanation_delivered_at",
        "candidate_ai_decisions.human_decision",
        "candidate_ai_decisions.human_notes",
        "candidate_ai_decisions.human_overrode_ai",
        "candidate_ai_decisions.id",
        "candidate_ai_decisions.review_requested_at",
        "candidate_ai_decisions.reviewed_at",
        "candidate_ai_decisions.status",
        "candidate_ai_decisions.updated_at",
        "candidate_ai_decisions.vaga_id",
        "candidatos.ativo",
        "candidatos.avatar_url",
        "candidatos.bairro",
        "candidatos.bloqueado",
        "candidatos.bloqueado_motivo",
        "candidatos.celular",
        "candidatos.cep",
        "candidatos.cidade",
        "candidatos.como_conheceu",
        "candidatos.como_conheceu_detalhes",
        "candidatos.complemento",
        "candidatos.cpf",
        "candidatos.created_at",
        "candidatos.data_nascimento",
        "candidatos.data_ultimo_acesso",
        "candidatos.deleted_at",
        "candidatos.email",
        "candidatos.email_verificado",
        "candidatos.estado",
        "candidatos.faixa_etaria_materializada",
        "candidatos.genero",
        "candidatos.id",
        "candidatos.instagram",
        "candidatos.instagram_url",
        "candidatos.linkedin",
        "candidatos.linkedin_url",
        "candidatos.logradouro",
        "candidatos.nome_completo",
        "candidatos.numero",
        "candidatos.updated_at",
        "candidatos.user_id",
        "candidaturas.analise_ia_bigfive",
        "candidaturas.analise_ia_cultura",
        "candidaturas.analise_ia_disc",
        "candidaturas.analise_ia_entrevista_online",
        "candidaturas.analise_ia_entrevista_presencial",
        "candidaturas.analise_ia_formulario",
        "candidaturas.analise_ia_raven",
        "candidaturas.candidato_id",
        "candidaturas.created_at",
        "candidaturas.curriculo_nome_original",
        "candidaturas.curriculo_tamanho_bytes",
        "candidaturas.curriculo_url",
        "candidaturas.data_bigfive_enviado",
        "candidaturas.data_candidatura",
        "candidaturas.data_cultura_enviado",
        "candidaturas.data_decisao_final",
        "candidaturas.data_disc_enviado",
        "candidaturas.data_entrevista_online",
        "candidaturas.data_entrevista_presencial",
        "candidaturas.data_formulario_enviado",
        "candidaturas.data_raven_enviado",
        "candidaturas.deleted_at",
        "candidaturas.encerrada_a_pedido_em",
        "candidaturas.etapa_atual",
        "candidaturas.etapa_justificativa",
        "candidaturas.feedback_rejeicao",
        "candidaturas.id",
        "candidaturas.is_favorito",
        "candidaturas.is_rascunho",
        "candidaturas.motivo_rejeicao",
        "candidaturas.observacoes_rh",
        "candidaturas.opcao_knockout_id",
        "candidaturas.origem_candidatura",
        "candidaturas.score_geral",
        "candidaturas.status",
        "candidaturas.tempo_preenchimento_segundos",
        "candidaturas.updated_at",
        "candidaturas.vaga_id",
        "cognitivo_liberacao.candidatura_id",
        "cognitivo_liberacao.id",
        "cognitivo_liberacao.liberado_em",
        "cognitivo_liberacao.motivo",
        "cognitivo_liberacao.revogado_em",
        "cognitivo_respostas.candidatura_id",
        "cognitivo_respostas.completion_time_seconds",
        "cognitivo_respostas.created_at",
        "cognitivo_respostas.id",
        "cognitivo_respostas.proctoring",
        "cognitivo_respostas.raw_responses",
        "cognitivo_respostas.shuffle_seed",
        "decisao_final.candidatura_id",
        "decisao_final.decisao",
        "decisao_final.em",
        "decisao_final.explicacao_solicitada_em",
        "decisao_final.id",
        "decisao_final.prazo_nova_decisao_em",
        "decisao_final.reaberta_em",
        "decisao_final.revisao_respondida_em",
        "decisao_final.revisao_resultado",
        "decisao_final.revisao_solicitada_em",
        "decisao_final.revisao_veredito",
        "decisao_final_historico.arquivado_em",
        "decisao_final_historico.candidatura_id",
        "decisao_final_historico.decidido_em",
        "decisao_final_historico.decisao",
        "decisao_final_historico.explicacao_solicitada_em",
        "decisao_final_historico.id",
        "decisao_final_historico.prazo_nova_decisao_em",
        "decisao_final_historico.reaberta_em",
        "decisao_final_historico.revisao_respondida_em",
        "decisao_final_historico.revisao_resultado",
        "decisao_final_historico.revisao_solicitada_em",
        "decisao_final_historico.revisao_veredito",
        "devolutivas_candidato.candidato_id",
        "devolutivas_candidato.candidatura_id",
        "devolutivas_candidato.conteudo_jsonb",
        "devolutivas_candidato.created_at",
        "devolutivas_candidato.id",
        "disponibilidade.candidato_id",
        "disponibilidade.created_at",
        "disponibilidade.data_disponibilidade",
        "disponibilidade.disponibilidade_imediata",
        "disponibilidade.id",
        "disponibilidade.periodo_disponivel",
        "disponibilidade.regime_trabalho",
        "disponibilidade.updated_at",
        "entrevista_analises.bias_flags",
        "entrevista_analises.bloqueio_avanco",
        "entrevista_analises.candidatura_id",
        "entrevista_analises.citacoes",
        "entrevista_analises.competencias",
        "entrevista_analises.created_at",
        "entrevista_analises.id",
        "entrevista_analises.notas_humanas",
        "entrevista_analises.revisao_confirmada_em",
        "entrevista_analises.scores_humanos",
        "entrevista_analises.status_analise",
        "entrevista_analises.superada_em",
        "entrevista_analises.tipo",
        "entrevistas_online.analise_ia",
        "entrevistas_online.avaliacao_candidato_score",
        "entrevistas_online.candidatura_id",
        "entrevistas_online.created_at",
        "entrevistas_online.data_agendada",
        "entrevistas_online.data_fim_real",
        "entrevistas_online.data_inicio_real",
        "entrevistas_online.deleted_at",
        "entrevistas_online.duracao_estimada_minutos",
        "entrevistas_online.duracao_real_minutos",
        "entrevistas_online.feedback_candidato",
        "entrevistas_online.gravacao_tamanho_mb",
        "entrevistas_online.gravacao_url",
        "entrevistas_online.id",
        "entrevistas_online.link_videochamada",
        "entrevistas_online.notas_durante",
        "entrevistas_online.notas_preparacao",
        "entrevistas_online.observacoes_gerais",
        "entrevistas_online.plataforma",
        "entrevistas_online.resumo_ia",
        "entrevistas_online.status",
        "entrevistas_online.transcricao",
        "entrevistas_online.updated_at",
        "entrevistas_presenciais.candidatura_id",
        "entrevistas_presenciais.created_at",
        "entrevistas_presenciais.data_agendada",
        "entrevistas_presenciais.data_fim_real",
        "entrevistas_presenciais.data_inicio_real",
        "entrevistas_presenciais.deleted_at",
        "entrevistas_presenciais.documentos_apresentados",
        "entrevistas_presenciais.documentos_necessarios",
        "entrevistas_presenciais.duracao_estimada_minutos",
        "entrevistas_presenciais.duracao_real_minutos",
        "entrevistas_presenciais.id",
        "entrevistas_presenciais.instrucoes_acesso",
        "entrevistas_presenciais.local_entrevista",
        "entrevistas_presenciais.notas_durante",
        "entrevistas_presenciais.notas_preparacao",
        "entrevistas_presenciais.observacoes_gerais",
        "entrevistas_presenciais.primeira_impressao",
        "entrevistas_presenciais.sala_numero",
        "entrevistas_presenciais.status",
        "entrevistas_presenciais.updated_at",
        "historico_candidatura.auto_rejeitado",
        "historico_candidatura.candidatura_id",
        "historico_candidatura.criado_em",
        "historico_candidatura.criterio_texto",
        "historico_candidatura.etapa_de",
        "historico_candidatura.etapa_para",
        "historico_candidatura.id",
        "recruiter_alerts.call_type",
        "recruiter_alerts.candidato_id",
        "recruiter_alerts.created_at",
        "recruiter_alerts.id",
        "recruiter_alerts.is_read",
        "recruiter_alerts.message",
        "recruiter_alerts.resolved_at",
        "recruiter_alerts.threshold",
        "recruiter_alerts.threshold_violated",
        "recruiter_alerts.vaga_id",
        "recruiter_alerts.value",
        "redacoes_candidato.analise_ia",
        "redacoes_candidato.bloqueio_avanco",
        "redacoes_candidato.candidatura_id",
        "redacoes_candidato.classificacao_cor",
        "redacoes_candidato.decisao_revisor",
        "redacoes_candidato.eh_pergunta_padrao",
        "redacoes_candidato.flags",
        "redacoes_candidato.ia_processada_em",
        "redacoes_candidato.id",
        "redacoes_candidato.notas_revisor",
        "redacoes_candidato.ordem",
        "redacoes_candidato.pergunta_id",
        "redacoes_candidato.red_flag_etico",
        "redacoes_candidato.revisada_em",
        "redacoes_candidato.score_ponderado_0_100",
        "redacoes_candidato.scores_dimensao",
        "redacoes_candidato.scores_humanos",
        "redacoes_candidato.status_analise",
        "redacoes_candidato.submetida_em",
        "redacoes_candidato.tempo_gasto_segundos",
        "redacoes_candidato.texto",
        "redacoes_candidato.texto_hash",
        "redacoes_candidato.word_count",
        "redacoes_candidato_em_progresso.candidatura_id",
        "redacoes_candidato_em_progresso.completou_em",
        "redacoes_candidato_em_progresso.id",
        "redacoes_candidato_em_progresso.iniciado_em",
        "redacoes_candidato_em_progresso.pergunta_id",
        "redacoes_candidato_em_progresso.texto_em_progresso",
        "redacoes_candidato_em_progresso.ultima_atividade_em",
        "redacoes_candidato_em_progresso.user_agent",
        "redacoes_candidato_em_progresso.word_count",
        "respostas_avaliacao.candidatura_id",
        "respostas_avaliacao.id",
        "respostas_avaliacao.respostas",
        "respostas_avaliacao.teste",
        "respostas_avaliacao.updated_at",
        "respostas_bigfive.candidatura_id",
        "respostas_bigfive.created_at",
        "respostas_bigfive.questao_id",
        "respostas_bigfive.resposta",
        "respostas_bigfive.tempo_resposta_segundos",
        "respostas_cultura.candidatura_id",
        "respostas_cultura.created_at",
        "respostas_cultura.id",
        "respostas_cultura.pergunta_id",
        "respostas_cultura.resposta_texto",
        "respostas_cultura.tempo_resposta_segundos",
        "respostas_cultura.updated_at",
        "respostas_disc.candidatura_id",
        "respostas_disc.created_at",
        "respostas_disc.mais_caracteristico",
        "respostas_disc.menos_caracteristico",
        "respostas_disc.questao_id",
        "respostas_disc.tempo_resposta_segundos",
        "respostas_formulario.candidatura_id",
        "respostas_formulario.created_at",
        "respostas_formulario.id",
        "respostas_formulario.pergunta_id",
        "respostas_formulario.resposta_numerica",
        "respostas_formulario.resposta_opcoes",
        "respostas_formulario.resposta_texto",
        "respostas_formulario.updated_at",
        "respostas_raven.candidatura_id",
        "respostas_raven.created_at",
        "respostas_raven.questao_id",
        "respostas_raven.resposta",
        "respostas_raven.tempo_resposta_segundos",
        "retencao_hold.candidatura_id",
        "retencao_hold.criado_em",
        "retencao_hold.id",
        "retencao_hold.liberado_em",
        "retencao_hold.motivo",
        "scores_bigfive.analise_ia",
        "scores_bigfive.candidatura_id",
        "scores_bigfive.created_at",
        "scores_bigfive.score_agreeableness",
        "scores_bigfive.score_conscientiousness",
        "scores_bigfive.score_extraversion",
        "scores_bigfive.score_neuroticism",
        "scores_bigfive.score_openness",
        "scores_bigfive.tempo_total_segundos",
        "scores_bigfive.updated_at",
        "scores_candidato.candidatura_id",
        "scores_candidato.citacoes",
        "scores_candidato.created_at",
        "scores_candidato.id",
        "scores_candidato.metadata",
        "scores_candidato.pergunta_id",
        "scores_candidato.red_flags",
        "scores_candidato.score",
        "scores_candidato.score_max",
        "scores_candidato.status",
        "scores_candidato.subtipo",
        "scores_candidato.tipo",
        "scores_candidato.updated_at",
        "scores_disc.analise_ia",
        "scores_disc.candidatura_id",
        "scores_disc.created_at",
        "scores_disc.perfil_primario",
        "scores_disc.perfil_secundario",
        "scores_disc.score_c",
        "scores_disc.score_d",
        "scores_disc.score_i",
        "scores_disc.score_s",
        "scores_disc.tempo_total_segundos",
        "scores_disc.updated_at",
        "scores_raven.acertos_por_serie",
        "scores_raven.analise_ia",
        "scores_raven.candidatura_id",
        "scores_raven.classificacao",
        "scores_raven.created_at",
        "scores_raven.percentil",
        "scores_raven.percentual_acerto",
        "scores_raven.tempo_total_segundos",
        "scores_raven.total_acertos",
        "scores_raven.updated_at",
        "solicitacoes_dados.atendido_em",
        "solicitacoes_dados.auth_concluido_em",
        "solicitacoes_dados.cancelado_em",
        "solicitacoes_dados.candidato_id",
        "solicitacoes_dados.causa",
        "solicitacoes_dados.executar_em",
        "solicitacoes_dados.id",
        "solicitacoes_dados.postgres_concluido_em",
        "solicitacoes_dados.situacao",
        "solicitacoes_dados.solicitado_em",
        "solicitacoes_dados.storage_concluido_em",
        "solicitacoes_dados.tipo",
      ]
    `)
  })

  it('(c) NENHUM token de segredo ou de telemetria atravessa a SUPERFÍCIE projetada', () => {
    const a = allowlist()

    // ⚠ O ALVO É A SUPERFÍCIE PROJETADA — nomes de tabela e de coluna que de fato saem
    // do banco — e NÃO o JSON inteiro. A primeira versão deste teste varria
    // `JSON.stringify(tabelas)` e falhou contra prosa: as razões de `colunas_excluidas`
    // CITAM pelo nome as tabelas proibidas, de propósito ("mesma família da tabela de
    // telemetria de LLM, fora do escopo" — com o nome dela por extenso, no artefato).
    // Um guarda que reprova a documentação da própria exclusão ensina a
    // silenciá-lo, e este projeto já pagou duas vezes pelo grep que reprova a spec que
    // o exige (43, "automaticamente"). O alvo estreito é o alvo correto.
    const superficie = [...Object.keys(a.tabelas), ...chavesAchatadas()].join('\n')
    for (const [rotulo, token] of TOKENS_PROIBIDOS) {
      expect(superficie, `token proibido na superfície projetada — ${rotulo}: ${token}`).not.toContain(token)
    }

    // META-TEST — prova que este gate é real e não um no-op, no idioma de
    // `scripts/assert-no-secrets.mjs:33-45`. Um token digitado errado passaria verde
    // para sempre, e ninguém descobriria: o teste é verde nos dois mundos. Estes dois
    // tokens TÊM de ser encontráveis em algum lugar do artefato — se não forem, a
    // grafia mudou no banco e a rede está furada exatamente onde parece intacta.
    const artefatoInteiro = JSON.stringify(a)
    for (const token of [['ai', 'call', 'logs'].join('_'), ['usuarios', 'rh'].join('_')]) {
      expect(
        artefatoInteiro,
        `token \`${token}\` não existe em lugar nenhum do artefato — a asserção negativa acima é um no-op`,
      ).toContain(token)
    }
  })

  it('(d) as QUATRO colunas do BD-6 estão na cópia — a dependência da Phase 43, verificável', () => {
    const autorizacoes = allowlist().tabelas.autorizacoes
    expect(autorizacoes, 'a tabela `autorizacoes` sumiu da allowlist').toBeDefined()
    for (const coluna of COLUNAS_BD6) {
      expect(autorizacoes.colunas, `coluna do BD-6 ausente da cópia: autorizacoes.${coluna}`).toContain(coluna)
    }
  })

  /**
   * ⚠ A VERSÃO ANTERIOR DESTA ASSERÇÃO ERA OCA (advisory da verificação de 2026-10-06).
   * Ela se chamava «declara a Phase 45 como consumidora» e testava só que a substring
   * «Phase 45» aparecesse em `meta.consumidores`. Desde 2026-09-27 essa substring
   * aparece na frase que NEGA o consumo — e a asserção seguia verde pelo motivo
   * oposto ao do seu título, e seguiria verde se a Phase 45 voltasse a ser declarada
   * consumidora. O contrato agora é o EXPORT-06 reescrito (aprovado em 2026-10-04):
   * a negação é o que se testa.
   */
  it('(e) `meta` declara que a Phase 45 NÃO consome este escopo (EXPORT-06, redação de 2026-10-04) e carrega versão semântica', () => {
    const meta = allowlist().meta
    const daPhase45 = meta.consumidores.filter((c) => c.includes('Phase 45'))
    expect(daPhase45, 'exatamente UMA entrada de meta.consumidores deve citar a Phase 45').toHaveLength(1)
    expect(daPhase45[0], 'a entrada da Phase 45 deve NEGAR o consumo').toContain('NÃO consome')
    expect(daPhase45[0], 'a entrada da Phase 45 deve remeter ao insumo real do motor').toContain('pii-inventory.yaml')
    expect(
      meta.consumidores.some((c) => c.includes('exportar-meus-dados')),
      'a consumidora real (EF exportar-meus-dados) não está declarada em meta.consumidores',
    ).toBe(true)
    expect(meta.versao).toMatch(/^\d+\.\d+\.\d+$/)
  })

  it('(f) `meta.medido_em` é idêntico ao do catálogo commitado (proveniência, T-44-13)', () => {
    const catalogo = JSON.parse(readFileSync(CAMINHO_CATALOGO, 'utf8'))
    const medido = allowlist().meta.medido_em
    expect(medido).toBe(catalogo.meta.medido_em)
    expect(Number.isNaN(Date.parse(medido))).toBe(false)
  })

  it('(g) toda tabela do export tem `chave_titular` não-vazia', () => {
    for (const [tabela, t] of Object.entries(allowlist().tabelas)) {
      // Chave vazia produziria leitura vazia SILENCIOSA em runtime: um export
      // honesto por acidente de estar em branco.
      expect(t.chave_titular, `chave_titular vazia em \`${tabela}\``).toBeTruthy()
      expect(t.colunas, `\`${tabela}\` entrou na allowlist sem coluna nenhuma`).not.toHaveLength(0)
      expect(t.colunas, `\`${tabela}\` não projeta a própria chave \`${t.chave_titular}\``).toContain(t.chave_titular)
    }
  })

  it('(h) o espelho `_shared/exportAllowlist.ts` está em sincronia com o `.json`', () => {
    // Dois artefatos, uma fonte. O modo de falha de ter dois é um apodrecer calado —
    // e é o `.ts` que a Edge Function importa, então o que apodrece é o que executa.
    const ts = readFileSync(CAMINHO_TS, 'utf8')
    const corpo = ts.slice(ts.indexOf('{'), ts.lastIndexOf('}') + 1)
    expect(JSON.parse(corpo)).toEqual(allowlist())
  })

  it('(i) `solicitacoes_dados` nunca some do radar: ou está na cópia, ou está declarada não-viva', () => {
    // A tabela é declarada em `escopo_titular` e nasce no 44-04. Hoje ela não existe no
    // catálogo, logo nenhuma coluna dela entra — e o risco não é vazamento, é ESQUECIMENTO:
    // a allowlist ser regerada depois do 44-04 sem que ninguém dê veredito às colunas dela.
    // A asserção é estável nos dois lados do 44-04 de propósito: falha só se a tabela
    // desaparecer das DUAS listas, que é exatamente o silêncio a evitar.
    const a = allowlist()
    const presente = Object.keys(a.tabelas).includes('solicitacoes_dados')
    const declaradaNaoViva = (a.meta.escopo_declarado_nao_vivo ?? []).includes('solicitacoes_dados')
    expect(
      presente || declaradaNaoViva,
      '`solicitacoes_dados` sumiu da allowlist E de `meta.escopo_declarado_nao_vivo`',
    ).toBe(true)
  })

  it('(j) o conjunto do que FICOU DE FORA com veredito também está congelado', () => {
    const a = allowlist()

    // Uma coluna NOVA no banco que receba veredito `false` não move o snapshot (b) —
    // ela nunca esteve lá. Sem este terceiro snapshot, a superfície de compliance
    // poderia crescer em silêncio pelo lado da exclusão, e o smoke SQL (que compara
    // contra a UNIÃO) ficaria verde o tempo todo. É o mesmo raciocínio de universos
    // disjuntos que separa este arquivo do smoke, aplicado dentro do artefato.
    //
    // ⚠ Phase 49 (49-17, Task 1): cresceu DE PROPÓSITO em CINCO chaves de
    // `entrevista_analises` — `provedor_ia`, `modelo_ia`, `texto_hash`,
    // `ai_call_log_id` (as quatro por `decisoes_por_coluna`) e `solicitado_por`
    // (pela R2, sem veredito próprio). É exatamente o crescimento silencioso «pelo
    // lado da exclusão» que o parágrafo acima descreve: nenhuma delas jamais
    // apareceu no snapshot (b), e sem este terceiro snapshot a entrada delas não
    // moveria um byte de teste nenhum.
    //
    // ⚠ Phase 44 (44-11, 2026-10-06, G5 — BD-9..BD-13): cresceu DE PROPÓSITO em
    // SETE chaves, zero removidas — `retencao_hold.detalhe` (BD-10, por
    // `decisoes_por_coluna`), `retencao_hold.criado_por`/`.liberado_por` e
    // `cognitivo_liberacao.liberado_por`/`.revogado_por` (pela R2 de
    // `ponteiros.de_terceiro`, sem veredito próprio), `solicitacoes_dados.plano`
    // (BD-13 ii) e `solicitacoes_dados.recibo_enviado_em` (BD-13 iv, operador).
    expect(excluidasAchatadas()).toMatchInlineSnapshot(`
      [
        "agendamentos_entrevista.agendado_por",
        "agendamentos_entrevista.entrevistador",
        "agendamentos_entrevista.updated_by",
        "analise_candidato_vaga.erro",
        "analise_candidato_vaga.modelo_ia",
        "analise_candidato_vaga.provedor_ia",
        "avaliacoes_rh.avaliador_id",
        "candidate_ai_decisions.ai_call_log_ids",
        "candidate_ai_decisions.review_requested_by",
        "candidate_ai_decisions.reviewer_id",
        "candidatos.created_by",
        "candidatos.updated_by",
        "candidaturas.created_by",
        "candidaturas.updated_by",
        "cognitivo_liberacao.liberado_por",
        "cognitivo_liberacao.revogado_por",
        "decisao_final.alerta_prazo_enviado_em",
        "decisao_final.justificativa",
        "decisao_final.por_usuario",
        "decisao_final.revisao_por_usuario",
        "decisao_final_historico.alerta_prazo_enviado_em",
        "decisao_final_historico.justificativa",
        "decisao_final_historico.por_usuario",
        "decisao_final_historico.revisao_por_usuario",
        "devolutivas_candidato.modelo_ia",
        "devolutivas_candidato.prompt_version",
        "entrevista_analises.ai_call_log_id",
        "entrevista_analises.modelo_ia",
        "entrevista_analises.prompt_version",
        "entrevista_analises.provedor_ia",
        "entrevista_analises.revisada_por",
        "entrevista_analises.solicitado_por",
        "entrevista_analises.texto_hash",
        "entrevistas_online.agendado_por",
        "entrevistas_online.realizado_por",
        "entrevistas_presenciais.agendado_por",
        "entrevistas_presenciais.realizado_por",
        "historico_candidatura.ator",
        "recruiter_alerts.channel",
        "redacoes_candidato.cost_tokens_input",
        "redacoes_candidato.cost_tokens_output",
        "redacoes_candidato.input_hash",
        "redacoes_candidato.model_version",
        "redacoes_candidato.modelo_ia",
        "redacoes_candidato.prompt_version",
        "redacoes_candidato.provedor_ia",
        "redacoes_candidato.referencia_match",
        "redacoes_candidato.revisada_por",
        "redacoes_candidato.rubrica_versao",
        "retencao_hold.criado_por",
        "retencao_hold.detalhe",
        "retencao_hold.liberado_por",
        "solicitacoes_dados.aviso_cancelamento_enviado_em",
        "solicitacoes_dados.aviso_pedido_enviado_em",
        "solicitacoes_dados.plano",
        "solicitacoes_dados.recibo_enviado_em",
      ]
    `)

    // Nenhuma coluna nos DOIS lados. Um par duplicado inflaria a CTE `com_veredito`
    // do smoke e mascararia uma sumida — o `FULL OUTER JOIN` casaria pela outra ponta.
    for (const [tabela, t] of Object.entries(a.tabelas)) {
      const dentro = new Set(t.colunas)
      for (const fora of Object.keys(t.colunas_excluidas ?? {})) {
        expect(dentro.has(fora), `\`${tabela}.${fora}\` está em \`colunas\` E em \`colunas_excluidas\``).toBe(false)
      }
      // Toda exclusão carrega razão NOMEADA. Uma exclusão sem motivo é a omissão
      // silenciosa que todo este mecanismo existe para impedir, só que por dentro.
      for (const [fora, motivo] of Object.entries(t.colunas_excluidas ?? {})) {
        expect(String(motivo).trim(), `\`${tabela}.${fora}\` foi excluída sem razão nomeada`).not.toBe('')
      }
    }

    // A identidade que o smoke verifica contra `information_schema`:
    // exportadas + excluídas = colunas vivas das tabelas em escopo.
    expect(a.meta.totais.colunas_com_veredito_em_escopo).toBe(
      a.meta.totais.colunas_exportadas + a.meta.totais.colunas_excluidas_em_escopo,
    )
    expect(chavesAchatadas().length + excluidasAchatadas().length).toBe(
      a.meta.totais.colunas_com_veredito_em_escopo,
    )
  })

  it('(k) os três `VALUES` do relatório E do smoke de drift estão em sincronia com o artefato', () => {
    // ⚠ ESTA ASSERÇÃO NASCEU DE UM DEFEITO REAL, e a lição não é sobre sincronia.
    // A primeira versão do smoke definia drift como `viva AND NOT IN allowlist` e
    // devolveu 34 linhas contra PROD em 2026-08-03T19:58:54Z — as 34 exclusões
    // deliberadas. Um relatório que sempre mostra 34 treina todo mundo a ignorá-lo, e
    // a linha 35 (o vazamento real) passa despercebida: a imagem espelhada do
    // P39/CR-02. O predicado passou a comparar contra `allowlist ∪ excluídas`.
    //
    // O cabeçalho do smoke AVISA que toda regeração obriga a regerar os dois blocos.
    // Um aviso que depende de alguém lembrar de obedecê-lo é promessa sem código que
    // a execute — e esta fase inteira gira em torno de não escrever mais uma dessas.
    // Aqui o aviso vira asserção: os dois `VALUES` são extraídos do .sql e comparados
    // com o artefato. Um bloco envelhecido é falso positivo no gate que grita e falso
    // NEGATIVO no gate que protege — o pior par possível.
    //
    // ⚠ 44-10 (G5 / BD-14): TRÊS blocos. O terceiro, `disposicao_tabelas`, é a
    // disposição de toda tabela conhecida; o SQL o compara com o catálogo VIVO de
    // tabelas. Antes dele, o universo de tabelas do relatório vinha da própria
    // allowlist, e seis tabelas novas ficaram invisíveis a todo portão automático.
    //
    // E são DOIS arquivos: o relatório (`05`, lista as linhas) e o smoke (falha
    // alto). Um smoke com `VALUES` envelhecido aprovaria em silêncio o que o
    // relatório acusa — os dois são vigiados pela mesma asserção.
    for (const caminho of ARQUIVOS_DRIFT) {
      const arquivo = caminho.slice(REPO.length + 1)
      const doArquivo = paresDoArquivo(caminho)
      expect(
        doArquivo.allowlist,
        `${arquivo}: o \`VALUES\` da CTE \`allowlist\` envelheceu — rode --sql-values`,
      ).toEqual(chavesAchatadas())
      expect(
        doArquivo.excluidas,
        `${arquivo}: o \`VALUES\` da CTE \`excluidas\` envelheceu — rode --sql-values-excluidas`,
      ).toEqual(excluidasAchatadas())
      expect(
        doArquivo.tabelas,
        `${arquivo}: o \`VALUES\` da CTE \`disposicao_tabelas\` envelheceu — rode --sql-values-tabelas`,
      ).toEqual(disposicaoAchatada())

      // READ-ONLY em PROD, e isso é invariante do arquivo, não do runbook.
      expect(semComentario(caminho), `${arquivo}: palavra de escrita fora de comentário`).not.toMatch(
        /\b(INSERT|UPDATE|DELETE|CREATE|ALTER|DROP|GRANT|REVOKE)\b/i,
      )
    }
  })

  it('(k2) o relatório e o smoke de drift usam os MESMOS cinco textos de veredito', () => {
    // O smoke copia o predicado do relatório. Se um dos dois ganhar uma direção
    // (ou perder uma, ou reescrever uma frase), o portão que falha alto e o
    // relatório que se lê passam a medir coisas diferentes — e a divergência só
    // apareceria no dia em que um aprovasse o que o outro acusa.
    const literais = (caminho: string) =>
      [...new Set([...semComentario(caminho).matchAll(/'((?:COLUNA|TABELA) [^']*)'/g)].map((m) => m[1]))].sort()
    const doRelatorio = literais(CAMINHO_SMOKE)
    const doSmoke = literais(CAMINHO_DRIFT_SMOKE)
    expect(doRelatorio, 'o relatório deveria ter 3 vereditos de coluna + 2 de tabela').toHaveLength(5)
    expect(doSmoke, 'os textos de veredito do smoke divergem dos do relatório').toEqual(doRelatorio)
  })

  /**
   * (l) AS DECISÕES DO G5 (44-11, BD-9..BD-13) PRESAS POR NOME — e não por snapshot.
   *
   * POR QUE NÃO BASTAM OS SNAPSHOTS (b) E (j): os dois são aprovados por um `vitest -u`
   * distraído. Uma coluna vetada que voltasse para a cópia apareceria como «+1 linha»
   * num diff de mais de 400, e o `-u` a aceitaria sem perguntar. Aqui ela falha com o
   * próprio nome no output.
   *
   * A ARMADILHA DA R1 (achado M1 do 49-17): toda coluna `*_em` de tabela em escopo
   * ENTRA pela R1 mesmo sem veredito. Se o veredito explícito de uma delas for apagado
   * do `export-scope-rules.yaml`, o gerador regera sem reclamar (o fecho só exige que
   * toda coluna viva tenha disposição, e a R1 é uma disposição), a coluna continua na
   * cópia, e o snapshot (b) nem se move. O que muda é só a PROVENIÊNCIA — e é ela que
   * esta asserção prende: as colunas que o G5 decidiu POR ESCRITO têm de continuar
   * decididas por escrito. Um veredito que some calado é uma decisão do operador que
   * deixou de existir sem ninguém decidir isso.
   *
   * FORA DA ASSERÇÃO DE PROVENIÊNCIA, DE PROPÓSITO: `id` e `candidatura_id` de
   * `retencao_hold` e `cognitivo_liberacao`. Elas entram pela R1, como em TODA tabela
   * em escopo (são as chaves da linha e da ponte), e nunca receberam veredito
   * explícito — exigir `decisoes_por_coluna` delas reprovaria o artefato correto.
   *
   * As listas abaixo são LITERAIS porque a asserção É sobre esses nomes. Não são
   * fotografia de um escopo que envelhece: são o registro das decisões BD-9..BD-13, e
   * mudar uma delas é mudar uma decisão — o que exige editar este arquivo.
   */
  it('(l) proibições nomeadas do G5 (44-11) — sobrevivem a um `vitest -u`', () => {
    const a = allowlist()

    // [tabela, coluna, prefixo da razão em `colunas_excluidas`]
    const VETADAS: ReadonlyArray<readonly [string, string, string]> = [
      ['retencao_hold', 'detalhe', 'decisoes_por_coluna:'], // BD-10, operador
      ['retencao_hold', 'criado_por', 'pii_de_terceiro (R2)'], // UUID de funcionário
      ['retencao_hold', 'liberado_por', 'pii_de_terceiro (R2)'],
      ['cognitivo_liberacao', 'liberado_por', 'pii_de_terceiro (R2)'],
      ['cognitivo_liberacao', 'revogado_por', 'pii_de_terceiro (R2)'],
      ['solicitacoes_dados', 'plano', 'decisoes_por_coluna:'], // BD-13 (ii)
      ['solicitacoes_dados', 'recibo_enviado_em', 'decisoes_por_coluna:'], // BD-13 (iv), operador
    ]
    const TABELAS_FORA: ReadonlyArray<readonly [string, string]> = [
      ['purga_execucao_itens', 'telemetria_interna'], // BD-11
      ['purga_execucoes', 'telemetria_interna'], // BD-11
      ['config_purga', 'configuracao_do_produto'], // BD-12, medido sem chave do titular
      ['config_janela_exclusao', 'configuracao_do_produto'], // BD-12
    ]
    // As 13 que ENTRAM por veredito explícito (as `*_em` entrariam caladas pela R1).
    const VEREDITO_EXPLICITO: ReadonlyArray<readonly [string, string]> = [
      ['candidatos', 'faixa_etaria_materializada'], // BD-13 (iii)
      ['candidaturas', 'encerrada_a_pedido_em'], // BD-13 (i)
      ['solicitacoes_dados', 'executar_em'], // BD-13 (i)
      ['solicitacoes_dados', 'cancelado_em'], // BD-13 (i)
      ['solicitacoes_dados', 'storage_concluido_em'], // BD-13 (iv), operador
      ['solicitacoes_dados', 'postgres_concluido_em'],
      ['solicitacoes_dados', 'auth_concluido_em'],
      ['retencao_hold', 'motivo'], // BD-10
      ['retencao_hold', 'criado_em'],
      ['retencao_hold', 'liberado_em'],
      ['cognitivo_liberacao', 'liberado_em'], // BD-9 (adendo 2026-10-06)
      ['cognitivo_liberacao', 'revogado_em'],
      ['cognitivo_liberacao', 'motivo'],
    ]

    // META: uma lista vazia, ou uma tabela renomeada no artefato, faria os laços abaixo
    // passarem por vacuidade — verdes por não terem o que testar.
    for (const [nome, lista] of [
      ['VETADAS', VETADAS],
      ['TABELAS_FORA', TABELAS_FORA],
      ['VEREDITO_EXPLICITO', VEREDITO_EXPLICITO],
    ] as const) {
      expect(lista.length, `G5 (l): a lista ${nome} está vazia — a asserção seria um no-op`).toBeGreaterThan(0)
    }
    for (const [tabela] of [...VETADAS, ...VEREDITO_EXPLICITO]) {
      expect(a.tabelas[tabela], `G5 (l): ${tabela} sumiu de \`tabelas\` — os laços da (l) passariam vazios`).toBeDefined()
    }

    for (const [tabela, coluna, prefixo] of VETADAS) {
      const t = a.tabelas[tabela]
      expect(
        t.colunas,
        `G5 (l): ${tabela}.${coluna} está na CÓPIA — o G5 a vetou (fora da cópia do titular)`,
      ).not.toContain(coluna)
      expect(
        Object.keys(t.colunas_excluidas ?? {}),
        `G5 (l): ${tabela}.${coluna} não está em \`colunas_excluidas\` — o veto perdeu o registro`,
      ).toContain(coluna)
      expect(
        (t.colunas_excluidas ?? {})[coluna]?.startsWith(prefixo),
        `G5 (l): ${tabela}.${coluna} — a razão do veto deveria começar por «${prefixo}», veio «${(t.colunas_excluidas ?? {})[coluna]?.slice(0, 40)}»`,
      ).toBe(true)
    }

    for (const [tabela, razao] of TABELAS_FORA) {
      expect(a.tabelas[tabela], `G5 (l): ${tabela} entrou em escopo — o G5 a deixou FORA (${razao})`).toBeUndefined()
      expect(a.excluidas[tabela], `G5 (l): ${tabela} — a razão de exclusão decidida é «${razao}»`).toBe(razao)
    }

    for (const [tabela, coluna] of VEREDITO_EXPLICITO) {
      const t = a.tabelas[tabela]
      expect(t.colunas, `G5 (l): ${tabela}.${coluna} saiu da cópia — o G5 decidiu que ela ENTRA`).toContain(coluna)
      expect(
        t.proveniencia[coluna],
        `G5 (l): ${tabela}.${coluna} — proveniência deveria ser «decisoes_por_coluna»: o veredito escrito sumiu e a coluna entra calada pela R1 (o fecho do gerador não reprova isso; esta asserção sim)`,
      ).toBe('decisoes_por_coluna')
    }
  })
})
