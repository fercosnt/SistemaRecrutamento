#!/usr/bin/env node
/**
 * gen-recibo-exclusao.cjs — gera o recibo de exclusão em DUAS COLUNAS como
 * artefato derivado, e os seus TRÊS consumidores:
 *
 *   docs/compliance/recibo-exclusao.json                        (auditoria)
 *   supabase/functions/_shared/reciboExclusao.ts                (Edge Function)
 *   src/features/privacidade/constants/reciboExclusao.generated.ts  (frontend)
 *
 * Requirement: ERASE-07 · ERASE-09 · Phase 45 / Plan 45-02
 *
 * POR QUE A FONTE É `pii-inventory.yaml` E NÃO `exportAllowlist.ts`
 * A `45-UI-SPEC.md` §Invariante 4 nomeia `exportAllowlist.ts` +
 * `export-scope-rules.yaml` como fonte do recibo. A `45-RESEARCH.md` §C2 MEDIU
 * essa fonte e ela não serve: o `exportAllowlist.ts` cobre **30 de 69 tabelas**
 * e exclui, sob a razão `telemetria_interna`, oito tabelas que guardam PII do
 * titular — inclusive `ai_call_logs` e `logs_acesso`, DUAS das cinco do
 * ERASE-09. Um recibo derivado dele seria honesto sobre o que diz e **omisso
 * sobre o que não diz**, que é exatamente o modo de falha que a Invariante 4
 * existe para eliminar (§Pitfall 5).
 *
 * A fonte correta é `docs/compliance/pii-inventory.yaml`, que cobre o catálogo
 * inteiro e que **se declara insumo desta fase** (`pii-inventory.yaml:26`:
 * "Phase 45 — plano de exclusão/anonimização"). O `exportAllowlist.ts` continua
 * sendo a projeção derivada do EXPORT e não é lido por este script.
 *
 * O QUE ESTE SCRIPT GARANTE — as travas que fazem o recibo não mentir
 *
 *   1 · COBERTURA. Toda coluna explícita do inventário, de tabela em escopo do
 *       titular, tem de receber um veredito: linha da coluna «sai», linha da
 *       coluna «mantém», ou entrada em `FORA_DO_RECIBO` com razão de vocabulário
 *       fechado. Coluna sem veredito FALHA a geração nomeando a coluna.
 *
 *   2 · DIREÇÃO. Coluna classificada `apagar`/`anonimizar` TEM de aparecer na
 *       coluna «sai» — não pode ser silenciada por `FORA_DO_RECIBO` nem viver só
 *       no «mantém». É esta regra que arrasta as oito tabelas de telemetria para
 *       dentro do recibo. E coluna `preservar`/`preservar_com_ressalva` NÃO pode
 *       viver só no «sai»: prometer apagar o que sobrevive é a superestimação
 *       que o SC#5 proíbe.
 *
 *   3 · PASSO DO MOTOR. Toda linha da coluna «sai» carrega um `passo_motor` de
 *       um vocabulário FECHADO de sete valores, e cada um dos sete tem de ter ao
 *       menos uma linha. Um passo sem linha é um apagamento que o titular nunca
 *       soube que aconteceu; uma linha sem passo é uma promessa sem executor.
 *
 *   4 · BASE LEGAL. Toda linha da coluna «mantém» carrega base legal não-vazia,
 *       e as TRÊS linhas obrigatórias da UI-SPEC (regra 4 do §Recibo) existem.
 *
 *   5 · VOCABULÁRIO. Nenhum texto destinado ao titular contém termo de
 *       engenharia/jurista banido pela UI-SPEC, nem qualquer expressão de
 *       totalidade — a justificativa do recrutador sobrevive e a trilha de
 *       decisão sobrevive inteira, então «todos os seus dados» é factualmente
 *       falso.
 *
 * ESTE SCRIPT NÃO FALA COM O BANCO. Não abre conexão, não lê credencial, não
 * usa MCP. Só `fs` e `path` do Node, mais o `js-yaml` que o irmão já usa —
 * **zero dependência npm nova** (invariante do M8 herdada do M7).
 *
 * Rodar:  node docs/compliance/sql/gen-recibo-exclusao.cjs
 * Checar: node docs/compliance/sql/gen-recibo-exclusao.cjs --check
 */
const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');

// ---------------------------------------------------------------------------
// Caminhos — uma entrada, três saídas
// ---------------------------------------------------------------------------
const ROOT = path.resolve(__dirname, '..');
const REPO = path.resolve(__dirname, '..', '..', '..');

const INVENTARIO = path.join(ROOT, 'pii-inventory.yaml');

const OUT_JSON = path.join(ROOT, 'recibo-exclusao.json');
const OUT_TS_EF = path.join(REPO, 'supabase', 'functions', '_shared', 'reciboExclusao.ts');
const OUT_TS_APP = path.join(REPO, 'src', 'features', 'privacidade', 'constants', 'reciboExclusao.generated.ts');

const REL = (p) => path.relative(REPO, p).split(path.sep).join('/');
const GERADOR = REL(path.join(__dirname, 'gen-recibo-exclusao.cjs'));

function morrer(msg) {
  console.error(msg);
  process.exit(1);
}

/**
 * ⚠ `safeLoad`, NUNCA `load` — mesma razão do `gen-export-allowlist.cjs:77-85`:
 * em js-yaml 3.x o `load` usa o schema full. Script de compliance que carrega
 * YAML com schema full é o detalhe que uma auditoria futura marca.
 */
const lerYaml = (p) => yaml.safeLoad(fs.readFileSync(p, 'utf8'));

// ---------------------------------------------------------------------------
// VOCABULÁRIOS FECHADOS — o contrato que 45-07 e 45-10 assinam
// ---------------------------------------------------------------------------

/**
 * Os SETE passos do motor. Este array é o contrato: cada `passo_motor` citado
 * por uma linha do recibo é um caminho de código que 45-07 (tombstone/RPC) ou
 * 45-10 (Edge Function: Storage e Auth) TEM de implementar.
 *
 * Acrescentar valor aqui sem acrescentar a linha correspondente reprova a
 * geração; acrescentar linha com passo fora daqui também.
 */
const PASSOS_MOTOR = [
  'storage_remove',
  'tombstone_candidato',
  'tombstone_decisao_final',
  'severar_user_id',
  'severar_fks_set_null',
  'scrub_ledger_email',
  'auth_delete_user',
];

/** Onde cada passo é implementado — viaja no artefato para o mapeamento ser auditável. */
const PASSO_ONDE = {
  storage_remove: 'Edge Function (Storage Admin API) — plano 45-10',
  tombstone_candidato: 'RPC SECURITY DEFINER de anonimização — plano 45-07',
  tombstone_decisao_final: 'RPC SECURITY DEFINER de anonimização — plano 45-07 (D-45-02/03)',
  severar_user_id: 'migration S1 + tombstone — plano 45-07 (D-45-11)',
  severar_fks_set_null: 'tombstone — plano 45-07 (ERASE-09)',
  scrub_ledger_email: 'tombstone com sentinela — plano 45-07 (D-45-12)',
  auth_delete_user: 'Edge Function (Auth Admin API, hard delete) — plano 45-10 (D-45-09)',
};

/**
 * Aplicabilidade condicional. O componente (45-08) e o e-mail (45-10) OMITEM —
 * nunca renderizam vazia, nunca renderizam mesmo assim — a linha cujo predicado
 * não vale para o titular. Prometer apagar um arquivo que não existe é
 * superestimar na direção oposta, e é igualmente proibido pelo SC#5.
 */
const APLICABILIDADE = ['sempre', 'tem_curriculo', 'tem_decisao_registrada'];

/**
 * Razões pelas quais uma coluna PRESERVADA não vira linha do recibo.
 * Vocabulário fechado de propósito: sem ele, `FORA_DO_RECIBO` viraria a porta
 * por onde um dado do titular sairia calado — a mesma omissão que a regra 2
 * (DIREÇÃO) impede do outro lado.
 *
 * ⚠ Só vale para `preservar` / `preservar_com_ressalva`. Coluna `apagar` ou
 * `anonimizar` NUNCA pode ser silenciada aqui.
 */
const RAZOES_FORA_DO_RECIBO = [
  'dado_de_funcionario',
  'chave_tecnica',
  'estado_do_processo',
  'conteudo_do_produto',
  'segredo',
  'linha_removida_com_a_conta',
];

/** Razões pelas quais uma TABELA inteira do inventário não entra no recibo do titular. */
const RAZOES_FORA_DO_ESCOPO = ['pii_de_funcionario', 'configuracao_da_empresa', 'tabela_sem_vinculo_com_titular'];

// ---------------------------------------------------------------------------
// BANIDOS — UI-SPEC §Copywriting Contract §Bans, escopo "superfície de exclusão"
// ---------------------------------------------------------------------------

/**
 * ⚠ ESCOPO: TEXTO DESTINADO AO TITULAR, e só ele.
 *
 * A palavra `tombstone` é banida da COPY e é, ao mesmo tempo, metade do
 * vocabulário `PASSOS_MOTOR` — identificador técnico que o titular nunca lê.
 * Por isso a asserção de banidos roda sobre os campos nomeados em
 * `CAMPOS_DE_TEXTO_DE_TITULAR`, nunca sobre o JSON inteiro. Uma varredura do
 * documento todo reprovaria o próprio vocabulário que este plano fecha.
 */
const CAMPOS_DE_TEXTO_DE_TITULAR = ['rotulo', 'texto_futuro', 'texto_passado', 'base_legal'];

/** Termos de engenharia e de jurista — nenhum é decodificável pela pessoa (BD-3). */
const BANIDOS_VOCABULARIO = [
  'anonimizado',
  'anonimizada',
  'pseudonimizado',
  'pseudonimizada',
  'tombstone',
  'desvinculado',
  'desvinculada',
  'hash',
  // Vocabulário de soft delete numa fase de HARD delete (D-45-09): prometeria
  // um estado recuperável que não vai existir.
  'desativar conta',
  'pausar conta',
  'conta suspensa',
  'conta inativa',
];

/** Totalidade — factualmente falso (D-45-02/03 + ERASE-08). Invariante 4. */
const BANIDOS_TOTALIDADE = [
  'todos os seus dados',
  'tudo o que temos sobre você',
  'todos os seus registros',
  'apagamos tudo',
];

/** Cabeçalhos fixos — UI-SPEC §Recibo, regra 2, verbatim. */
const CABECALHOS = {
  sai: { futuro: 'O que vai ser apagado', passado: 'O que é apagado' },
  mantem: {
    futuro: 'O que a Beauty Smile mantém — e por quê',
    passado: 'O que a Beauty Smile mantém — e por quê',
  },
};

// ---------------------------------------------------------------------------
// ESCOPO — tabelas do inventário que NÃO são do titular candidato
// ---------------------------------------------------------------------------
const FORA_DO_ESCOPO_DO_TITULAR = {
  // O próprio inventário diz: "PII de FUNCIONÁRIO, não de titular candidato …
  // a Phase 45 NÃO o toca" (`pii-inventory.yaml:405-408`).
  usuarios_rh: 'pii_de_funcionario',
  preferencias_notificacoes: 'pii_de_funcionario',
  configuracoes_empresa: 'configuracao_da_empresa',
  webhooks_config: 'configuracao_da_empresa',
  // ZUMBI confirmado no catálogo vivo (achado A-06): 4 colunas, nenhuma FK,
  // nenhum vínculo com titular. Deferida à Phase 47 (CONSOL-03).
  data_deletion_log: 'tabela_sem_vinculo_com_titular',
};

// ---------------------------------------------------------------------------
// Açúcar de autoria — nomes qualificados sem repetir a tabela
// ---------------------------------------------------------------------------
const q = (tabela, colunas) => colunas.map((c) => `${tabela}.${c}`);
const flat = (...listas) => [].concat(...listas);

// ---------------------------------------------------------------------------
// A COLUNA «SAI» — cada linha com um passo do motor que a executa
// ---------------------------------------------------------------------------
const ITENS_SAI = [
  {
    item_id: 'arquivo_do_curriculo',
    rotulo: 'O arquivo do seu currículo',
    texto_futuro:
      'Vai ser apagado do nosso armazenamento. O arquivo em si deixa de existir, e não há como trazê-lo de volta depois.',
    texto_passado:
      'Foi apagado do nosso armazenamento. O arquivo em si deixou de existir, e não há como trazê-lo de volta.',
    aplicavel_quando: 'tem_curriculo',
    passo_motor: 'storage_remove',
    origens: q('candidaturas', ['curriculo_url']),
  },
  {
    item_id: 'outros_arquivos_enviados',
    rotulo: 'A sua foto de perfil e as gravações de entrevista',
    texto_futuro: 'Quando existirem, vão ser apagadas do nosso armazenamento junto com o currículo.',
    texto_passado: 'Quando existiam, foram apagadas do nosso armazenamento junto com o currículo.',
    aplicavel_quando: 'sempre',
    passo_motor: 'storage_remove',
    origens: flat(q('candidatos', ['avatar_url']), q('entrevistas_online', ['gravacao_url'])),
  },
  {
    item_id: 'dados_de_cadastro',
    rotulo: 'Os seus dados de cadastro',
    texto_futuro:
      'Nome, e-mail, telefone, CPF, data de nascimento, endereço, redes sociais e disponibilidade vão ser apagados do seu cadastro.',
    texto_passado:
      'Nome, e-mail, telefone, CPF, data de nascimento, endereço, redes sociais e disponibilidade foram apagados do seu cadastro.',
    aplicavel_quando: 'sempre',
    passo_motor: 'tombstone_candidato',
    origens: flat(
      q('candidatos', [
        'nome_completo',
        'email',
        'data_nascimento',
        'genero',
        'cidade',
        'estado',
        'created_by',
        'updated_by',
        'celular',
        'cpf',
        'cep',
        'logradouro',
        'numero',
        'complemento',
        'bairro',
        'instagram',
        'instagram_url',
        'linkedin',
        'linkedin_url',
        'como_conheceu_detalhes',
        'data_ultimo_acesso',
      ]),
      q('candidaturas', ['curriculo_nome_original']),
      q('disponibilidade', [
        'periodo_disponivel',
        'regime_trabalho',
        'disponibilidade_imediata',
        'data_disponibilidade',
      ]),
    ),
  },
  {
    item_id: 'respostas_e_producoes',
    rotulo: 'O que você escreveu, respondeu e falou no processo',
    texto_futuro:
      'As suas respostas das avaliações, os textos que você escreveu, as transcrições das entrevistas e a sua devolutiva vão ser apagados.',
    texto_passado:
      'As suas respostas das avaliações, os textos que você escreveu, as transcrições das entrevistas e a sua devolutiva foram apagados.',
    aplicavel_quando: 'sempre',
    passo_motor: 'tombstone_candidato',
    origens: flat(
      q('redacoes_candidato', ['texto']),
      q('redacoes_candidato_em_progresso', ['texto_em_progresso']),
      q('respostas_cultura', ['resposta_texto']),
      q('respostas_formulario', ['resposta_texto']),
      q('respostas_bigfive', ['resposta']),
      q('respostas_disc', ['mais_caracteristico', 'menos_caracteristico']),
      q('respostas_raven', ['resposta']),
      q('respostas_avaliacao', ['respostas']),
      q('cognitivo_respostas', ['raw_responses', 'proctoring']),
      q('entrevistas_online', ['transcricao', 'feedback_candidato', 'resumo_ia', 'link_videochamada']),
      q('entrevistas_presenciais', ['documentos_apresentados']),
      q('entrevista_analises', ['citacoes']),
      q('scores_candidato', ['citacoes']),
      q('devolutivas_candidato', ['conteudo_jsonb']),
    ),
  },
  {
    item_id: 'registros_de_acesso',
    rotulo: 'Os registros dos seus acessos',
    texto_futuro:
      'Endereço de IP, aparelho, navegador e cidade dos seus acessos vão ser apagados dos nossos registros técnicos.',
    texto_passado:
      'Endereço de IP, aparelho, navegador e cidade dos seus acessos foram apagados dos nossos registros técnicos.',
    aplicavel_quando: 'sempre',
    passo_motor: 'tombstone_candidato',
    origens: flat(
      q('logs_acesso', [
        'ip_address',
        'email_tentativa',
        'device_info',
        'browser',
        'operating_system',
        'device_type',
        'city',
      ]),
      q('logs_auditoria', ['ip_address', 'user_agent']),
      q('redacoes_candidato_em_progresso', ['user_agent']),
      q('rate_limit_check_duplicate', ['hash_cpf_email', 'x_forwarded_for']),
      q('autorizacoes', ['ip_aceite', 'user_agent_aceite']),
    ),
  },
  {
    item_id: 'dados_enviados_a_analise_automatica',
    rotulo: 'O que foi enviado para as análises automáticas',
    texto_futuro:
      'O conteúdo enviado para as análises automáticas e o texto que elas produziram sobre você vão ser apagados.',
    texto_passado:
      'O conteúdo enviado para as análises automáticas e o texto que elas produziram sobre você foram apagados.',
    aplicavel_quando: 'sempre',
    passo_motor: 'tombstone_candidato',
    origens: flat(
      q('ai_call_logs', ['raw_response', 'parsed_reasoning']),
      q('candidate_ai_decisions', ['ai_reasoning_summary']),
    ),
  },
  {
    item_id: 'enderecos_nos_registros_de_envio',
    rotulo: 'O seu endereço de e-mail nos registros de envio',
    texto_futuro:
      'O endereço para onde mandamos as mensagens vai ser apagado do registro de envios; fica só o registro de que houve um envio.',
    texto_passado:
      'O endereço para onde mandamos as mensagens foi apagado do registro de envios; ficou só o registro de que houve um envio.',
    aplicavel_quando: 'sempre',
    passo_motor: 'scrub_ledger_email',
    origens: q('notificacoes_enviadas', ['destinatario_email', 'destinatario_original']),
  },
  {
    item_id: 'vinculo_do_cadastro_com_a_conta',
    rotulo: 'A ligação entre o seu cadastro e a sua conta de acesso',
    texto_futuro: 'Vai ser cortada antes de a conta ser apagada, para que nada do que ficar aponte de volta para você.',
    texto_passado: 'Foi cortada antes de a conta ser apagada, e nada do que ficou aponta de volta para você.',
    aplicavel_quando: 'sempre',
    passo_motor: 'severar_user_id',
    origens: q('candidatos', ['user_id']),
  },
  {
    item_id: 'vinculos_nos_registros_que_ficam',
    rotulo: 'As ligações com você nos registros que ficam',
    texto_futuro: 'Os registros que a Beauty Smile é obrigada a manter vão deixar de apontar para você.',
    texto_passado: 'Os registros que a Beauty Smile é obrigada a manter deixaram de apontar para você.',
    aplicavel_quando: 'sempre',
    passo_motor: 'severar_fks_set_null',
    origens: flat(
      q('autorizacoes', ['user_id', 'candidato_id']),
      q('logs_acesso', ['user_id']),
      q('logs_auditoria', ['usuario_id']),
      q('historico_acoes', ['usuario_id']),
      q('notificacoes_enviadas', ['candidato_id']),
      q('ai_call_logs', ['candidato_id']),
      q('candidate_ai_decisions', ['candidato_id']),
      q('recruiter_alerts', ['candidato_id']),
      q('devolutivas_candidato', ['candidato_id']),
      q('disponibilidade', ['candidato_id']),
    ),
  },
  {
    item_id: 'ligacao_com_a_justificativa',
    rotulo: 'A ligação entre você e a justificativa escrita sobre a sua candidatura',
    texto_futuro:
      'Vai ser cortada: o texto continua guardado como prova de que a decisão não foi discriminatória, sem ligação com você.',
    texto_passado:
      'Foi cortada: o texto continua guardado como prova de que a decisão não foi discriminatória, sem ligação com você.',
    aplicavel_quando: 'tem_decisao_registrada',
    passo_motor: 'tombstone_decisao_final',
    origens: flat(q('decisao_final', ['justificativa']), q('decisao_final_historico', ['justificativa'])),
  },
  {
    item_id: 'sua_conta_de_acesso',
    rotulo: 'A sua conta de acesso e as sessões abertas',
    texto_futuro:
      'Vão deixar de existir. Você não vai conseguir mais entrar, e o seu e-mail fica livre para você se cadastrar de novo quando quiser.',
    texto_passado:
      'Deixaram de existir. Você não consegue mais entrar, e o seu e-mail está livre para você se cadastrar de novo quando quiser.',
    aplicavel_quando: 'sempre',
    passo_motor: 'auth_delete_user',
    origens: q('sessoes_ativas', [
      'session_token',
      'ip_address',
      'device_info',
      'browser',
      'operating_system',
      'device_type',
      'city',
      'country',
      'user_id',
    ]),
  },
];

// ---------------------------------------------------------------------------
// A COLUNA «MANTÉM» — cada linha com a base legal ao lado
// ---------------------------------------------------------------------------

/**
 * As TRÊS obrigatórias da UI-SPEC §Recibo regra 4. Identificadas por CHAVE
 * ESTÁVEL (`item_id`), nunca por casar o texto: uma edição de copy aprovada não
 * pode reprovar o gate, mas a remoção do item TEM de reprovar.
 */
const OBRIGATORIAS_MANTEM = ['justificativa_do_recrutador', 'historico_das_etapas', 'numeros_agregados'];

const ITENS_MANTEM = [
  {
    item_id: 'justificativa_do_recrutador',
    rotulo: 'A justificativa escrita pelo recrutador sobre a decisão',
    texto_futuro: 'Fica guardada sem ligação com você. Ela é a prova de que a decisão não foi discriminatória.',
    texto_passado: 'Ficou guardada sem ligação com você. Ela é a prova de que a decisão não foi discriminatória.',
    aplicavel_quando: 'tem_decisao_registrada',
    base_legal: 'LGPD, Art. 7º, VI',
    origens: flat(
      q('decisao_final', ['justificativa']),
      q('decisao_final_historico', ['justificativa']),
      q('candidaturas', ['motivo_rejeicao']),
      q('avaliacoes_rh', ['justificativa_recomendacao']),
    ),
  },
  {
    item_id: 'historico_das_etapas',
    rotulo: 'O histórico das etapas do processo',
    texto_futuro: 'Fica guardado como registro do processo, sem ligação com você.',
    texto_passado: 'Ficou guardado como registro do processo, sem ligação com você.',
    aplicavel_quando: 'sempre',
    base_legal: 'LGPD, Art. 7º, VI',
    origens: q('historico_candidatura', ['etapa_de', 'etapa_para', 'auto_rejeitado', 'criterio_texto']),
  },
  {
    item_id: 'numeros_agregados',
    rotulo: 'Números agregados usados no relatório de não-discriminação',
    texto_futuro: 'Entram só em contagens, junto com outras pessoas. Ninguém consegue chegar a você a partir deles.',
    texto_passado: 'Entraram só em contagens, junto com outras pessoas. Ninguém consegue chegar a você a partir deles.',
    aplicavel_quando: 'sempre',
    base_legal: 'LGPD, Art. 7º, VI — grupos com menos de 5 pessoas são suprimidos do relatório',
    origens: flat(q('candidatos', ['como_conheceu']), q('entrevista_analises', ['bias_flags'])),
  },
  {
    item_id: 'prova_do_consentimento',
    rotulo: 'O registro das autorizações que você deu',
    texto_futuro:
      'Fica guardado sem ligação com você, como prova de que a Beauty Smile pediu e recebeu a sua autorização.',
    texto_passado:
      'Ficou guardado sem ligação com você, como prova de que a Beauty Smile pediu e recebeu a sua autorização.',
    aplicavel_quando: 'sempre',
    base_legal: 'LGPD, Art. 8º, §1º',
    origens: q('autorizacoes', [
      'autorizacao_uso_dados',
      'autorizacao_comunicacao',
      'autorizacao_retencao_curriculo',
      'autorizacao_analise_video',
      'policy_version',
    ]),
  },
  {
    item_id: 'registro_da_decisao',
    rotulo: 'O registro de que uma pessoa decidiu sobre a sua candidatura',
    texto_futuro:
      'Fica guardado, com a data, sem ligação com você. É a prova de que nenhuma decisão foi tomada por um sistema sozinho.',
    texto_passado:
      'Ficou guardado, com a data, sem ligação com você. É a prova de que nenhuma decisão foi tomada por um sistema sozinho.',
    aplicavel_quando: 'tem_decisao_registrada',
    base_legal: 'LGPD, Art. 20',
    origens: flat(
      q('decisao_final', ['decisao', 'em', 'explicacao_solicitada_em', 'revisao_solicitada_em']),
      q('decisao_final_historico', ['decisao', 'decidido_em', 'arquivado_em']),
      q('candidate_ai_decisions', ['human_decision', 'human_overrode_ai']),
    ),
  },
  {
    item_id: 'anotacoes_da_equipe',
    rotulo: 'As anotações que a equipe escreveu durante o processo',
    texto_futuro: 'Ficam guardadas sem ligação com você, como registro de como o processo foi conduzido.',
    texto_passado: 'Ficaram guardadas sem ligação com você, como registro de como o processo foi conduzido.',
    aplicavel_quando: 'sempre',
    base_legal: 'LGPD, Art. 7º, VI',
    origens: flat(
      q('candidatos', ['bloqueado_motivo']),
      q('candidaturas', ['observacoes_rh', 'feedback_rejeicao', 'etapa_justificativa']),
      q('decisao_final', ['revisao_resultado']),
      q('entrevistas_online', ['notas_durante', 'notas_preparacao', 'observacoes_gerais']),
      q('entrevistas_presenciais', ['primeira_impressao', 'notas_durante', 'notas_preparacao', 'observacoes_gerais']),
      q('entrevista_analises', ['notas_humanas']),
      q('redacoes_candidato', ['notas_revisor']),
      q('agendamentos_entrevista', ['observacoes_rh']),
      q('avaliacoes_rh', ['observacoes', 'pontos_fortes', 'pontos_fracos']),
      q('candidate_ai_decisions', ['human_notes']),
      q('recruiter_alerts', ['message']),
    ),
  },
  {
    item_id: 'avaliacoes_e_analises',
    rotulo: 'As avaliações e as análises feitas no processo',
    texto_futuro: 'Ficam guardadas sem ligação com você, como registro de como a sua candidatura foi avaliada.',
    texto_passado: 'Ficaram guardadas sem ligação com você, como registro de como a sua candidatura foi avaliada.',
    aplicavel_quando: 'sempre',
    base_legal: 'LGPD, Art. 7º, VI',
    origens: flat(
      q('candidaturas', [
        'analise_ia_bigfive',
        'analise_ia_cultura',
        'analise_ia_disc',
        'analise_ia_entrevista_online',
        'analise_ia_entrevista_presencial',
        'analise_ia_formulario',
        'analise_ia_raven',
      ]),
      q('entrevistas_online', ['analise_ia']),
      q('entrevista_analises', ['competencias', 'scores_humanos']),
      q('redacoes_candidato', ['analise_ia', 'scores_dimensao', 'scores_humanos']),
      q('scores_bigfive', ['analise_ia']),
      q('scores_disc', ['analise_ia']),
      q('scores_raven', ['analise_ia']),
      q('scores_candidato', ['red_flags', 'metadata']),
      q('respostas_formulario', ['resposta_opcoes']),
      q('ai_call_logs', ['parsed_score']),
      q('candidate_ai_decisions', ['ai_composite_score', 'ai_recommendation']),
      q('comparativo_solicitado', ['ranking']),
    ),
  },
  {
    item_id: 'trilha_de_auditoria',
    rotulo: 'A trilha de auditoria do sistema',
    texto_futuro:
      'Fica guardada sem ligação com você. Ela registra o que mudou no sistema e quando, e é o que permite auditar este próprio pedido.',
    texto_passado:
      'Ficou guardada sem ligação com você. Ela registra o que mudou no sistema e quando, e é o que permite auditar este próprio pedido.',
    aplicavel_quando: 'sempre',
    base_legal: 'LGPD, Art. 16, I',
    origens: flat(
      q('logs_auditoria', ['acao', 'dados_antes', 'dados_depois', 'descricao']),
      q('historico_acoes', ['descricao', 'metadata']),
      q('webhooks_logs', ['payload_enviado', 'resposta_recebida']),
    ),
  },
  {
    item_id: 'registros_tecnicos_sem_identificacao',
    rotulo: 'Os registros técnicos que não apontam para você',
    texto_futuro: 'Ficam guardados o país e o tipo de cada evento, sem nada que aponte para você.',
    texto_passado: 'Ficaram guardados o país e o tipo de cada evento, sem nada que aponte para você.',
    aplicavel_quando: 'sempre',
    base_legal: 'LGPD, Art. 7º, IX',
    origens: flat(
      q('logs_acesso', ['country', 'evento', 'erro_mensagem']),
      q('notificacoes_enviadas', ['ultimo_erro']),
    ),
  },
];

// ---------------------------------------------------------------------------
// FORA_DO_RECIBO — coluna PRESERVADA que não é linha do recibo, com a razão
// ---------------------------------------------------------------------------
// ⚠ Cada chave é literal `tabela.coluna`. Não há curinga de tabela, e a ausência
// é a decisão: um curinga engoliria em silêncio a PRÓXIMA coluna que nascer na
// tabela, que é exatamente o drift que o fecho existe para pegar.
const FORA_DO_RECIBO = Object.assign(
  {},
  mapa(q('candidatos', ['email_verificado', 'bloqueado', 'ativo']), 'estado_do_processo'),
  mapa(q('candidaturas', ['curriculo_tamanho_bytes', 'origem_candidatura']), 'estado_do_processo'),
  mapa(q('decisao_final', ['por_usuario']), 'dado_de_funcionario'),
  mapa(q('decisao_final', ['candidatura_id']), 'chave_tecnica'),
  mapa(q('decisao_final_historico', ['por_usuario']), 'dado_de_funcionario'),
  mapa(q('decisao_final_historico', ['candidatura_id']), 'chave_tecnica'),
  // `ator` é quem MOVEU a etapa — o trigger `avancar_etapa()` só dispara em
  // UPDATE de `etapa_atual`, que é ação de RH (invariante do M2/Phase 6).
  mapa(q('historico_candidatura', ['ator']), 'dado_de_funcionario'),
  // A linha inteira de `sessoes_ativas` morre com a conta (FK CASCADE para
  // auth.users, VIVO). Não há o que "manter" para prometer ao titular.
  mapa(q('sessoes_ativas', ['revogado_por']), 'linha_removida_com_a_conta'),
  mapa(q('notificacoes_enviadas', ['dedupe_key', 'provider_message_id', 'candidatura_id']), 'chave_tecnica'),
  mapa(q('notificacoes_enviadas', ['evento', 'status']), 'estado_do_processo'),
  mapa(q('notificacoes_enviadas', ['template']), 'conteudo_do_produto'),
  mapa(q('entrevistas_online', ['gravacao_tamanho_mb']), 'estado_do_processo'),
  mapa(q('entrevistas_online', ['agendado_por', 'realizado_por']), 'dado_de_funcionario'),
  mapa(
    q('entrevistas_presenciais', ['documentos_necessarios', 'instrucoes_acesso', 'local_entrevista', 'sala_numero']),
    'conteudo_do_produto',
  ),
  mapa(q('entrevista_analises', ['revisada_por']), 'dado_de_funcionario'),
  mapa(q('redacoes_candidato', ['revisada_por']), 'dado_de_funcionario'),
  mapa(q('redacoes_candidato', ['texto_hash']), 'chave_tecnica'),
  mapa(q('redacoes_candidato', ['decisao_revisor']), 'estado_do_processo'),
  mapa(q('respostas_formulario', ['resposta_numerica']), 'estado_do_processo'),
  mapa(q('ai_call_logs', ['system_prompt', 'user_prompt_template']), 'conteudo_do_produto'),
  mapa(q('ai_call_logs', ['prompt_hash', 'retain_until']), 'chave_tecnica'),
  mapa(q('candidate_ai_decisions', ['ai_call_log_ids']), 'chave_tecnica'),
  mapa(q('candidate_ai_decisions', ['reviewer_id']), 'dado_de_funcionario'),
  mapa(q('agendamentos_entrevista', ['entrevistador']), 'dado_de_funcionario'),
  mapa(q('agendamentos_entrevista', ['local_ou_link']), 'conteudo_do_produto'),
  mapa(q('agendamentos_entrevista', ['compareceu']), 'estado_do_processo'),
  mapa(q('avaliacoes_rh', ['avaliador_id']), 'dado_de_funcionario'),
  mapa(q('cognitivo_respostas', ['shuffle_seed']), 'chave_tecnica'),
  mapa(q('comparativo_solicitado', ['candidatura_ids']), 'chave_tecnica'),
  mapa(q('comparativo_solicitado', ['solicitado_por']), 'dado_de_funcionario'),
);

function mapa(chaves, razao) {
  const o = {};
  for (const k of chaves) o[k] = razao;
  return o;
}

// ---------------------------------------------------------------------------
// Fecho
// ---------------------------------------------------------------------------
function construir() {
  const inv = lerYaml(INVENTARIO);
  const erros = [];

  if (!inv || !inv.tabelas || typeof inv.tabelas !== 'object') {
    morrer(`ERRO: ${REL(INVENTARIO)} sem o bloco \`tabelas:\` — não há de onde derivar o recibo.`);
  }
  if (!inv.classificacoes || typeof inv.classificacoes !== 'object') {
    morrer(`ERRO: ${REL(INVENTARIO)} sem o bloco \`classificacoes:\` — o vocabulário de veredito é a fonte do lado.`);
  }
  const VOCAB_CLASSIFICACAO = Object.keys(inv.classificacoes).sort();
  for (const esperada of ['apagar', 'anonimizar', 'preservar', 'preservar_com_ressalva']) {
    if (!VOCAB_CLASSIFICACAO.includes(esperada)) {
      erros.push(
        `${REL(INVENTARIO)}: \`classificacoes\` não declara \`${esperada}\`. O mapeamento ` +
          `classificação → coluna do recibo depende das quatro; um vocabulário mudado tem de parar a geração.`,
      );
    }
  }
  if (erros.length) morrer(erros.join('\n'));

  // --- inventário → mapa `tabela.coluna` → classificacao ---------------------
  // Toda coluna explícita, de toda tabela explícita. Uma coluna SEM
  // `classificacao` (nem direta nem por `regra`) é veredito ausente e para a
  // geração — é a trava 1 do docblock.
  const classificacaoPor = new Map();
  const colunasPorTabela = new Map();
  const REGRA_PARA_CLASSIFICACAO = {};
  for (const r of inv.regras_padrao || []) {
    if (r && r.id && r.classificacao) REGRA_PARA_CLASSIFICACAO[r.id] = r.classificacao;
  }

  for (const tabela of Object.keys(inv.tabelas).sort()) {
    const decl = inv.tabelas[tabela] || {};
    const colunas = decl.colunas || {};
    if (!Object.keys(colunas).length) {
      erros.push(
        `ERRO DE FECHAMENTO (tabela): \`${tabela}\` está em \`tabelas:\` do ${REL(INVENTARIO)} e não ` +
          `declara coluna nenhuma. Uma tabela sem coluna produziria uma linha de recibo vazia que parece honesta.`,
      );
      continue;
    }
    const nomes = [];
    for (const coluna of Object.keys(colunas).sort()) {
      const e = colunas[coluna] || {};
      const cls = e.classificacao || (e.regra ? REGRA_PARA_CLASSIFICACAO[e.regra] : undefined);
      if (!cls) {
        erros.push(
          `ERRO DE FECHAMENTO (veredito): \`${tabela}.${coluna}\` não tem \`classificacao\` no ` +
            `${REL(INVENTARIO)} e a \`regra\` citada não resolve. O recibo é derivado do veredito — ` +
            `sem veredito ele afirmaria por conta própria.`,
        );
        continue;
      }
      if (!VOCAB_CLASSIFICACAO.includes(cls)) {
        erros.push(
          `ERRO DE FECHAMENTO (vocabulário): \`${tabela}.${coluna}\` tem classificação \`${cls}\`, ` +
            `fora do vocabulário declarado (${VOCAB_CLASSIFICACAO.join(' | ')}).`,
        );
        continue;
      }
      classificacaoPor.set(`${tabela}.${coluna}`, cls);
      nomes.push(coluna);
    }
    colunasPorTabela.set(tabela, nomes);
  }

  // --- escopo do titular ----------------------------------------------------
  for (const [tabela, razao] of Object.entries(FORA_DO_ESCOPO_DO_TITULAR)) {
    if (!colunasPorTabela.has(tabela)) {
      erros.push(
        `VEREDITO ÓRFÃO (fora do escopo): \`${tabela}\` está declarada fora do escopo do titular e NÃO ` +
          `existe em \`tabelas:\` do ${REL(INVENTARIO)}. Uma exclusão órfã deixa de excluir sem avisar.`,
      );
    }
    if (!RAZOES_FORA_DO_ESCOPO.includes(razao)) {
      erros.push(
        `fora_do_escopo.${tabela}: razão \`${razao}\` fora do vocabulário fechado ` +
          `(${RAZOES_FORA_DO_ESCOPO.join(' | ')}).`,
      );
    }
  }
  const emEscopo = [...colunasPorTabela.keys()].filter((t) => !FORA_DO_ESCOPO_DO_TITULAR[t]).sort();

  // --- resolução das reivindicações dos itens -------------------------------
  const reivindicado = new Map(); // 'tabela.coluna' → { sai: [item_id], mantem: [item_id] }
  const marcar = (chave, lado, item_id) => {
    if (!reivindicado.has(chave)) reivindicado.set(chave, { sai: [], mantem: [] });
    reivindicado.get(chave)[lado].push(item_id);
  };

  function resolverItens(itens, lado) {
    const vistos = new Set();
    return itens.map((it) => {
      if (!it.item_id || vistos.has(it.item_id)) {
        erros.push(`item ${lado}: \`item_id\` ausente ou repetido — \`${it.item_id}\`.`);
      }
      vistos.add(it.item_id);

      if (!APLICABILIDADE.includes(it.aplicavel_quando)) {
        erros.push(
          `item ${lado}.${it.item_id}: \`aplicavel_quando\` = \`${it.aplicavel_quando}\` fora do ` +
            `vocabulário fechado (${APLICABILIDADE.join(' | ')}). O consumidor OMITE a linha inaplicável; ` +
            `um predicado desconhecido faria a linha ser renderizada mesmo assim.`,
        );
      }
      for (const campo of CAMPOS_DE_TEXTO_DE_TITULAR) {
        const v = it[campo];
        if (campo === 'base_legal' && lado === 'sai') continue;
        if (typeof v !== 'string' || v.trim() === '') {
          erros.push(
            `item ${lado}.${it.item_id}: \`${campo}\` vazio ou ausente. Linha de recibo com texto vazio é ` +
              `pior que linha ausente — o consumidor renderizaria uma promessa em branco.`,
          );
        }
      }
      if (lado === 'sai') {
        if (!it.passo_motor) {
          erros.push(
            `item sai.${it.item_id}: sem \`passo_motor\`. Uma linha que afirma um apagamento sem passo do ` +
              `motor que o execute é a superestimação que o SC#5 proíbe.`,
          );
        } else if (!PASSOS_MOTOR.includes(it.passo_motor)) {
          erros.push(
            `item sai.${it.item_id}: \`passo_motor\` = \`${it.passo_motor}\` fora do vocabulário fechado ` +
              `(${PASSOS_MOTOR.join(' | ')}). 45-07 e 45-10 assinam ESTE vocabulário.`,
          );
        }
      } else if (typeof it.base_legal !== 'string' || it.base_legal.trim() === '') {
        erros.push(
          `item mantem.${it.item_id}: \`base_legal\` vazia. Uma retenção sem base legal declarada é uma ` +
            `retenção que o titular não tem como contestar.`,
        );
      }

      const origens = [...new Set(it.origens || [])].sort();
      if (!origens.length) {
        erros.push(`item ${lado}.${it.item_id}: \`origens\` vazio — a linha não é derivada de coluna nenhuma.`);
      }
      for (const chave of origens) {
        const [tabela] = String(chave).split('.');
        if (!classificacaoPor.has(chave)) {
          erros.push(
            `VEREDITO ÓRFÃO (origem): \`${chave}\` é citada por \`${it.item_id}\` e NÃO é coluna explícita ` +
              `do ${REL(INVENTARIO)}. Se a coluna foi renomeada, a linha do recibo continua afirmando ` +
              `sobre uma coluna que não existe mais.`,
          );
          continue;
        }
        if (FORA_DO_ESCOPO_DO_TITULAR[tabela]) {
          erros.push(
            `ORIGEM FORA DE ESCOPO: \`${chave}\` é citada por \`${it.item_id}\` e a tabela \`${tabela}\` ` +
              `está declarada fora do escopo do titular (${FORA_DO_ESCOPO_DO_TITULAR[tabela]}).`,
          );
          continue;
        }
        marcar(chave, lado, it.item_id);
      }

      const base = {
        item_id: it.item_id,
        rotulo: it.rotulo,
        texto_futuro: it.texto_futuro,
        texto_passado: it.texto_passado,
        aplicavel_quando: it.aplicavel_quando,
        colunas_origem: origens,
        classificacoes_origem: [...new Set(origens.map((c) => classificacaoPor.get(c)).filter(Boolean))].sort(),
      };
      if (lado === 'sai') {
        base.passo_motor = it.passo_motor;
        base.passo_motor_onde = PASSO_ONDE[it.passo_motor] || null;
      } else {
        base.base_legal = it.base_legal;
        base.obrigatorio = OBRIGATORIAS_MANTEM.includes(it.item_id);
      }
      return base;
    });
  }

  const colunas_sai = resolverItens(ITENS_SAI, 'sai');
  const colunas_mantem = resolverItens(ITENS_MANTEM, 'mantem');

  // --- FORA_DO_RECIBO: órfãos e vocabulário --------------------------------
  for (const [chave, razao] of Object.entries(FORA_DO_RECIBO)) {
    const [tabela] = chave.split('.');
    if (!RAZOES_FORA_DO_RECIBO.includes(razao)) {
      erros.push(
        `FORA_DO_RECIBO.${chave}: razão \`${razao}\` fora do vocabulário fechado ` +
          `(${RAZOES_FORA_DO_RECIBO.join(' | ')}).`,
      );
    }
    if (!classificacaoPor.has(chave)) {
      erros.push(
        `VEREDITO ÓRFÃO (FORA_DO_RECIBO): \`${chave}\` tem razão declarada e NÃO é coluna explícita do ` +
          `${REL(INVENTARIO)}. Um veredito órfão deixa de valer em silêncio.`,
      );
      continue;
    }
    if (FORA_DO_ESCOPO_DO_TITULAR[tabela]) {
      erros.push(
        `FORA_DO_RECIBO.${chave}: a tabela \`${tabela}\` já está fora do escopo do titular — o veredito ` +
          `por coluna é inerte e confunde a auditoria.`,
      );
      continue;
    }
    const cls = classificacaoPor.get(chave);
    if (cls === 'apagar' || cls === 'anonimizar') {
      erros.push(
        `SILÊNCIO PROIBIDO: \`${chave}\` está classificada \`${cls}\` no ${REL(INVENTARIO)} e foi posta em ` +
          `FORA_DO_RECIBO. O motor mexe nela — o titular tem de ser informado. É o Pitfall 5 tentando ` +
          `entrar pela porta dos fundos.`,
      );
    }
  }

  // --- COBERTURA e DIREÇÃO --------------------------------------------------
  for (const tabela of emEscopo) {
    for (const coluna of colunasPorTabela.get(tabela)) {
      const chave = `${tabela}.${coluna}`;
      const cls = classificacaoPor.get(chave);
      const r = reivindicado.get(chave) || { sai: [], mantem: [] };
      const silenciada = FORA_DO_RECIBO[chave] !== undefined;

      if (!r.sai.length && !r.mantem.length && !silenciada) {
        erros.push(
          `ERRO DE FECHAMENTO (cobertura): \`${chave}\` (${cls}) não aparece em linha nenhuma do recibo ` +
            `nem tem razão em FORA_DO_RECIBO. Omitir em silêncio é o defeito que este gerador existe para ` +
            `impedir — dê a ela uma linha ou uma razão.`,
        );
        continue;
      }
      if ((cls === 'apagar' || cls === 'anonimizar') && !r.sai.length) {
        erros.push(
          `DIREÇÃO ERRADA: \`${chave}\` está classificada \`${cls}\` e NÃO tem linha na coluna «sai». ` +
            `O motor mexe nela; um recibo que não diz isso afirma MENOS do que o motor faz.`,
        );
      }
      if ((cls === 'preservar' || cls === 'preservar_com_ressalva') && !r.mantem.length && !silenciada) {
        erros.push(
          `DIREÇÃO ERRADA: \`${chave}\` está classificada \`${cls}\` e só aparece na coluna «sai». ` +
            `Prometer apagar o que sobrevive é a superestimação que o SC#5 proíbe.`,
        );
      }
      if (r.sai.length > 1) {
        erros.push(`ORIGEM DUPLICADA: \`${chave}\` é reivindicada por mais de uma linha «sai» (${r.sai.join(', ')}).`);
      }
      if (r.mantem.length > 1) {
        erros.push(
          `ORIGEM DUPLICADA: \`${chave}\` é reivindicada por mais de uma linha «mantém» (${r.mantem.join(', ')}).`,
        );
      }
    }
  }

  // --- os SETE passos precisam TODOS de linha -------------------------------
  // Um passo do motor sem linha de recibo é um apagamento que o titular nunca
  // soube que aconteceu. É a metade do backstop E4·error que um snapshot de
  // texto não pega.
  for (const passo of PASSOS_MOTOR) {
    if (!colunas_sai.some((i) => i.passo_motor === passo)) {
      erros.push(
        `PASSO SEM LINHA: \`${passo}\` está no vocabulário fechado e nenhuma linha da coluna «sai» o cita. ` +
          `O motor faria algo que o recibo não conta.`,
      );
    }
  }

  // --- as TRÊS obrigatórias -------------------------------------------------
  for (const item_id of OBRIGATORIAS_MANTEM) {
    if (!colunas_mantem.some((i) => i.item_id === item_id)) {
      erros.push(
        `LINHA OBRIGATÓRIA AUSENTE: \`${item_id}\` é uma das três da UI-SPEC §Recibo regra 4 e não está ` +
          `no artefato. Omiti-la é a superestimação que o SC#5 proíbe.`,
      );
    }
  }

  // --- BANIDOS sobre o texto de titular -------------------------------------
  const textosDeTitular = [];
  for (const [onde, valor] of [
    ['cabecalhos.sai.futuro', CABECALHOS.sai.futuro],
    ['cabecalhos.sai.passado', CABECALHOS.sai.passado],
    ['cabecalhos.mantem.futuro', CABECALHOS.mantem.futuro],
    ['cabecalhos.mantem.passado', CABECALHOS.mantem.passado],
  ]) {
    textosDeTitular.push([onde, valor]);
  }
  for (const [lado, itens] of [
    ['sai', colunas_sai],
    ['mantem', colunas_mantem],
  ]) {
    for (const it of itens) {
      for (const campo of CAMPOS_DE_TEXTO_DE_TITULAR) {
        if (typeof it[campo] === 'string') textosDeTitular.push([`${lado}.${it.item_id}.${campo}`, it[campo]]);
      }
    }
  }
  for (const [onde, texto] of textosDeTitular) {
    const t = texto.toLowerCase();
    for (const b of BANIDOS_VOCABULARIO) {
      if (t.includes(b)) {
        erros.push(
          `BANIDO DE VOCABULÁRIO em \`${onde}\`: «${b}». Termo de engenharia ou de jurista não é ` +
            `decodificável pela pessoa cujo dado está sendo tratado (BD-3). A expressão travada é ` +
            `«sem ligação com você».`,
        );
      }
    }
    for (const b of BANIDOS_TOTALIDADE) {
      if (t.includes(b)) {
        erros.push(
          `BANIDO DE TOTALIDADE em \`${onde}\`: «${b}». É factualmente falso — a justificativa do ` +
            `recrutador sobrevive (D-45-02/03) e a trilha de decisão sobrevive inteira (ERASE-08).`,
        );
      }
    }
  }

  if (erros.length) {
    console.error(`FECHAMENTO REPROVADO — ${erros.length} pendência(s):\n`);
    for (const e of erros) console.error('  · ' + e);
    console.error(
      `\nA geração NÃO produziu artefato. Isto é o mecanismo da Invariante 4 funcionando:\n` +
        `o recibo é derivado, e uma derivação que não fecha nunca vira texto mostrado ao titular.`,
    );
    process.exit(1);
  }

  // --- números honestos -----------------------------------------------------
  const colunasEmEscopo = emEscopo.reduce((a, t) => a + colunasPorTabela.get(t).length, 0);
  const colunasNoRecibo = [...reivindicado.keys()].length;
  const colunasSilenciadas = Object.keys(FORA_DO_RECIBO).length;

  return {
    meta: {
      requirement: 'ERASE-07',
      fase: 45,
      plano: '45-02',
      gerador: GERADOR,
      // ⚠ A fonte, e a razão de NÃO ser o exportAllowlist.ts, viajam no artefato:
      // quem auditar o recibo daqui a um ano não vai ter a 45-RESEARCH aberta.
      fonte_classificacao: REL(INVENTARIO),
      fonte_recusada: {
        arquivo: 'supabase/functions/_shared/exportAllowlist.ts',
        razao:
          'Cobre 30 de 69 tabelas (45-RESEARCH §C2) e exclui, como telemetria_interna, oito tabelas ' +
          'com PII do titular — inclusive ai_call_logs e logs_acesso, duas das cinco do ERASE-09. ' +
          'Um recibo derivado dele seria omisso sobre o que não diz (§Pitfall 5).',
      },
      // Carimbo de EXECUÇÃO; em `--check` é pinado a partir do artefato em disco,
      // senão toda checagem divergiria pelo relógio.
      gerado_em: new Date().toISOString(),
      inventario_coletado_em: (inv.meta && inv.meta.coletado_em) || null,
      consumidores: [
        'supabase/functions/_shared/reciboExclusao.ts — Edge Function de execução (45-10)',
        'src/features/privacidade/constants/reciboExclusao.generated.ts — ReciboExclusao (45-08)',
      ],
      campos_de_texto_de_titular: CAMPOS_DE_TEXTO_DE_TITULAR,
      banidos_vocabulario: BANIDOS_VOCABULARIO,
      banidos_totalidade: BANIDOS_TOTALIDADE,
      totais: {
        tabelas_no_inventario: colunasPorTabela.size,
        tabelas_em_escopo_do_titular: emEscopo.length,
        tabelas_fora_do_escopo_do_titular: Object.keys(FORA_DO_ESCOPO_DO_TITULAR).length,
        colunas_em_escopo_do_titular: colunasEmEscopo,
        // A identidade que fecha: toda coluna em escopo tem linha OU razão.
        colunas_com_linha_no_recibo: colunasNoRecibo,
        colunas_com_razao_de_silencio: colunasSilenciadas,
        colunas_com_veredito: colunasNoRecibo + colunasSilenciadas,
        linhas_sai: colunas_sai.length,
        linhas_mantem: colunas_mantem.length,
      },
    },
    passos_motor: PASSOS_MOTOR,
    passos_motor_onde: PASSO_ONDE,
    aplicabilidade: APLICABILIDADE,
    cabecalhos: CABECALHOS,
    colunas_sai,
    colunas_mantem,
    fora_do_recibo: FORA_DO_RECIBO,
    fora_do_escopo_do_titular: FORA_DO_ESCOPO_DO_TITULAR,
    // Declaradas sem PII de titular pela própria regra do inventário — não viram
    // linha, mas ficam nomeadas para a ausência ser auditável em vez de tácita.
    tabelas_sem_pii_titular: {
      regra_aplicada: (inv.tabelas_sem_pii_titular && inv.tabelas_sem_pii_titular.regra_aplicada) || null,
      lista: ((inv.tabelas_sem_pii_titular && inv.tabelas_sem_pii_titular.lista) || []).slice().sort(),
    },
  };
}

// ---------------------------------------------------------------------------
// Serialização determinística — é o que torna o `--check` possível
// ---------------------------------------------------------------------------
function ordenar(v) {
  if (Array.isArray(v)) return v.map(ordenar);
  if (v && typeof v === 'object') {
    const o = {};
    for (const k of Object.keys(v).sort()) o[k] = ordenar(v[k]);
    return o;
  }
  return v;
}

const serializarJson = (doc) => JSON.stringify(ordenar(doc), null, 2) + '\n';

/**
 * Os DOIS espelhos `.ts` carregam o MESMO corpo e diferem só na linha que nomeia
 * o consumidor. O `--check` confere cada um separadamente do `.json` e um do
 * outro: um `--check` que olhasse só um deixaria os outros apodrecer.
 */
function serializarTs(doc, consumidor) {
  return (
    `/**\n` +
    ` * reciboExclusao.ts — ESPELHO GERADO do recibo de exclusão em duas colunas.\n` +
    ` *\n` +
    ` * Requirement: ERASE-07 · ERASE-09 · Phase 45\n` +
    ` * Consumidor: ${consumidor}\n` +
    ` *\n` +
    ` * ⚠ ARQUIVO GERADO por \`${GERADOR}\`.\n` +
    ` * NÃO EDITAR À MÃO — \`--check\` reprova qualquer divergência, e reprova\n` +
    ` * este arquivo SEPARADAMENTE do \`.json\` e do outro espelho: um \`--check\`\n` +
    ` * que olhasse só um dos três deixaria os outros apodrecer.\n` +
    ` *\n` +
    ` * POR QUE UM MÓDULO .ts E NÃO O IMPORT DO .json\n` +
    ` * Import estático de JSON saindo do diretório da Edge Function é a assunção\n` +
    ` * A1 da 44-RESEARCH e pode NÃO sobreviver ao bundler do deploy; e o frontend\n` +
    ` * não alcança \`supabase/functions/\` nem \`docs/\` (\`@/\` aponta para \`src/\`).\n` +
    ` * Uma fonte só (o gerador), três artefatos, os três sob \`--check\`.\n` +
    ` *\n` +
    ` * O recibo é DERIVADO, nunca digitado (45-UI-SPEC §Invariante 4): nenhuma\n` +
    ` * linha pode afirmar um apagamento sem um \`passo_motor\` que o execute.\n` +
    ` *\n` +
    ` * Regenerar: node ${GERADOR}\n` +
    ` */\n` +
    `export const PASSOS_MOTOR = ${JSON.stringify(doc.passos_motor, null, 2)} as const;\n` +
    `\n` +
    `export type PassoMotor = (typeof PASSOS_MOTOR)[number];\n` +
    `\n` +
    `export const RECIBO_EXCLUSAO = ${JSON.stringify(ordenar(doc), null, 2)} as const;\n`
  );
}

// ---------------------------------------------------------------------------
// Modos
// ---------------------------------------------------------------------------
const args = process.argv.slice(2);

if (args.includes('--check')) {
  let discoJson = null;
  try {
    discoJson = JSON.parse(fs.readFileSync(OUT_JSON, 'utf8'));
  } catch {
    morrer(`DIVERGENTE: ${REL(OUT_JSON)} ausente ou ilegível.\n  Rode: node ${GERADOR}`);
  }
  const doc = construir();
  // Pina o carimbo de execução do disco: sem isso o `--check` divergiria pelo
  // relógio e nunca poderia sair 0 — um gate que nunca passa não é um gate.
  doc.meta.gerado_em = discoJson.meta && discoJson.meta.gerado_em;

  if (fs.readFileSync(OUT_JSON, 'utf8') !== serializarJson(doc)) {
    morrer(`DIVERGENTE: ${REL(OUT_JSON)} não corresponde à fonte.\n  Rode: node ${GERADOR}`);
  }
  for (const [saida, consumidor] of [
    [OUT_TS_EF, 'Edge Function de execução (supabase/functions/_shared/)'],
    [OUT_TS_APP, 'ReciboExclusao do frontend (src/features/privacidade/)'],
  ]) {
    const disco = fs.existsSync(saida) ? fs.readFileSync(saida, 'utf8') : '';
    if (disco !== serializarTs(doc, consumidor)) {
      morrer(
        `DIVERGENTE: ${REL(saida)} ${disco === '' ? 'ausente' : 'não corresponde'} à fonte.\n` +
          `  O espelho .ts é gerado, não escrito à mão.\n  Rode: node ${GERADOR}`,
      );
    }
  }
  console.log(`OK: ${REL(OUT_JSON)}, ${REL(OUT_TS_EF)} e ${REL(OUT_TS_APP)} estão em sincronia com ${REL(INVENTARIO)}.`);
  process.exit(0);
}

const doc = construir();
for (const saida of [OUT_JSON, OUT_TS_EF, OUT_TS_APP]) {
  fs.mkdirSync(path.dirname(saida), { recursive: true });
}
fs.writeFileSync(OUT_JSON, serializarJson(doc));
fs.writeFileSync(OUT_TS_EF, serializarTs(doc, 'Edge Function de execução (supabase/functions/_shared/)'));
fs.writeFileSync(OUT_TS_APP, serializarTs(doc, 'ReciboExclusao do frontend (src/features/privacidade/)'));

const t = doc.meta.totais;
console.log(
  `recibo-exclusao.json gerado — ${t.linhas_sai} linha(s) na coluna «sai», ` +
    `${t.linhas_mantem} na coluna «mantém», ${t.colunas_com_veredito} de ` +
    `${t.colunas_em_escopo_do_titular} colunas em escopo com veredito ` +
    `(inventário coletado em ${doc.meta.inventario_coletado_em}).`,
);
console.log(`espelhos ${REL(OUT_TS_EF)} e ${REL(OUT_TS_APP)} gerados.`);
