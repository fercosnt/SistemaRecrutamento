-- =============================================================================
-- Phase 45 / Plano 45-03 — ERASE-05 + ERASE-06
-- O pedido de exclusão vira ESTADO: a janela de arrependimento como CONFIGURAÇÃO
-- lida pelo titular, as colunas de execução que o motor vai carimbar, e o
-- encerramento da candidatura como FATO ADITIVO — nunca como rejeição.
-- =============================================================================
--
-- Requirement:          ERASE-05, ERASE-06
-- Decisão de origem:    45-CONTEXT D-45-01 (janela de 15 dias, cancelável pelo
--                       titular) · D-45-06 / D-45-07 (o encerramento é IMEDIATO;
--                       "esperar o funil fechar sozinho" foi recusado) ·
--                       D-45-13 (o encerramento vive em `candidaturas`, coluna
--                       aditiva) · 45-UI-SPEC Invariantes 3 e 9
-- Milestone:            M8 — Dados do Candidato & Direitos do Titular (LGPD-OPS)
-- Autoria:              plano 45-03, Task 1 (a fatia TRACER, deliberadamente
--                       não-destrutiva)
--
-- ⚠ ESCOPO NEGATIVO, EM UMA LINHA:
-- **ESTA MIGRATION NÃO APAGA NADA, NÃO ANONIMIZA NADA E NÃO SEVERA VÍNCULO ALGUM.**
--
-- Ela cria UMA tabela de configuração (vazia, semeada com uma linha), acrescenta
-- SETE colunas nullable a `solicitacoes_dados` (que tem ZERO linhas vivas em PROD,
-- medido na SONDA 4), recria DOIS CHECK de vocabulário fechado sobre essa mesma
-- tabela vazia, e acrescenta UMA coluna nullable a `candidaturas`. Nenhum `DELETE`,
-- nenhum `DROP TABLE`, nenhum `DROP COLUMN`, nenhum `UPDATE` sobre PII. Toda linha
-- viva do banco continua exatamente como está depois deste apply.
--
-- O que é irreversível — Storage, tombstone, `deleteUser` — está FORA desta
-- migration por desenho e entra em 45-07/45-10, sobre um esqueleto já provado.
--
-- -----------------------------------------------------------------------------
-- (1) PROTOCOLO DE APPLY — `supabase db push` É PROIBIDO NESTE PROJETO
-- -----------------------------------------------------------------------------
-- O apply é EXCLUSIVAMENTE por MCP `apply_migration`, pelo ORQUESTRADOR (subagentes
-- GSD não recebem os tools MCP do Supabase — bug upstream anthropics/claude-code#13898).
-- É o plano **45-06** que aplica; o plano 45-03 apenas AUTORA este arquivo.
--
-- ⚠ **ESTA É A PRIMEIRA DAS DUAS MIGRATIONS DO 45-03, E A ORDEM É O CONTROLE.**
-- Esta aqui **não tem corpo delimitado por cifrões** — nenhuma função, nenhum bloco
-- anônimo. A `20260805000002` tem os dois, cercados de `REVOKE`/`GRANT`/`COMMENT`:
-- exatamente a combinação que o transaction pooler recusa com SQLSTATE 42601
-- ("cannot insert multiple commands into a prepared statement"), CLAUDE.md
-- §Migrations. Se o procedimento estiver errado, ele falha AQUI, sobre uma tabela de
-- configuração recém-criada, e não sobre as funções que registram um direito.
--
-- Pela mesma razão de higiene herdada da `20260804000001:45-48`: o par de cifrões
-- **não é escrito literalmente em lugar nenhum deste arquivo**, nem dentro de
-- comentário.
--
-- **Sem wrapper `BEGIN;`/`COMMIT;`**: o driver já envolve cada migration na sua
-- própria transação implícita, e o BEGIN/COMMIT externo é o gatilho documentado do
-- 42601.
--
-- ⚠ REPARO OBRIGATÓRIO DO LEDGER. `apply_migration` carimba a PRÓPRIA `version` —
-- um timestamp do instante do apply, não o do nome deste arquivo. Logo após:
--
--   UPDATE supabase_migrations.schema_migrations
--      SET version = '20260805000001'
--    WHERE name LIKE '%p45_pedido_exclusao%';
--
-- Sem o reparo, o CLI leria este arquivo como NÃO aplicado e tentaria reaplicá-lo —
-- e `CREATE TABLE` puro (e `ADD COLUMN` sem `IF NOT EXISTS`) falha alto na segunda
-- vez, que é a propriedade desejada, mas num momento inconveniente.
--
-- ⚠ FIDELIDADE DO CONTEÚDO. O ledger guarda o SQL literalmente aplicado em
-- `supabase_migrations.schema_migrations.statements text[]`. Duas das cinco
-- migrations do M8 chegaram a PROD com os comentários descartados por essa via.
-- Aqui a perda de um `COMMENT` NÃO é benigna: eles são o único lugar dentro do banco
-- onde estão escritos (i) por que a janela mora em tabela separada de
-- `config_sla_dados`, (ii) o destino da linha de pedido no tombstone, e (iii) as
-- TRÊS modelagens recusadas do encerramento, com a razão medida de cada recusa.
-- Conferir após o apply:
--
--   SELECT md5(statements[1]) FROM supabase_migrations.schema_migrations
--    WHERE version = '20260805000001';
--
-- -----------------------------------------------------------------------------
-- (2) PROVENIÊNCIA — o que foi copiado, e o que foi DELIBERADAMENTE NÃO
-- -----------------------------------------------------------------------------
--   · `20260804000001_p44_config_sla_dados.sql:117-204` — o MOLDE ESTRUTURAL da
--     tabela singleton: PK textual, CHECK de domínio na coluna numérica, RLS ligada,
--     UMA policy de SELECT, NENHUMA policy de escrita, seed
--     `ON CONFLICT DO NOTHING`, trigger `tocar_atualizado_em()` REUSADA.
--
--   · `20260804000002_p44_solicitacoes_dados.sql:112-163` — o molde de `COMMENT`
--     como documentação-in-loco, incluindo o idioma do vocabulário fechado
--     ("o que acontece quando cliente e banco divergem").
--
--   · ⚠ **A RLS do molde NÃO é copiada, e a divergência é o ponto desta migration.**
--     `config_sla_dados` é RH-only por desenho, e o docblock dela
--     (`20260804000001:132-134`) PROÍBE copiar a RLS pública de `config_sla_etapa`
--     para ela. Mas a janela desta fase é lida pelo **TITULAR** — o `{n}` da
--     45-UI-SPEC vem do servidor. Herdar a RLS do molde por reflexo deixaria o `{n}`
--     ilegível ao titular e a tela cairia em silêncio no fallback ("data alvo sem
--     contagem de dias"). Por isso a janela nasce em TABELA PRÓPRIA, com leitura
--     para `authenticated` sem escopo de papel. Ver o COMMENT da tabela.
--
--   · ⚠ **`config_sla_dados` NÃO É REUSADA como tabela**, e não é só por causa da
--     RLS: a FORMA dela (`dias_atencao`/`dias_atraso` com
--     `CHECK (dias_atraso > dias_atencao)`) é a de um PAR de limiares de SLA, não a
--     de uma janela única. E os dois números descrevem fatos jurídicos distintos que
--     hoje coincidem em "15": lá é o TETO do Art. 19, II (resposta a pedido de
--     acesso); aqui é política interna de arrependimento. Fundi-los criaria ligação
--     falsa entre um prazo legal e uma escolha da empresa. **Esta fase não edita a
--     string de 15 dias da fila do RH.**
--
-- -----------------------------------------------------------------------------
-- (3) O QUE ESTA MIGRATION DEIXA PRONTO PARA AS FASES SEGUINTES
-- -----------------------------------------------------------------------------
-- `plano`, `storage_concluido_em`, `postgres_concluido_em`, `auth_concluido_em` e
-- `recibo_enviado_em` nascem AQUI e ficam NULOS até o 45-10. Elas são a máquina de
-- estados que torna retomável uma mutação que não é atômica (ERASE-04): a ordem
-- `Storage -> Postgres -> Auth` **não é imposta pela plataforma** (SONDA 2: NÃO
-- existe FK de `storage.objects` para `auth.users`), é disciplina que o motor impõe
-- a si mesmo, e o modo de falha é SILENCIOSO. Sem carimbo por sistema, uma execução
-- interrompida no meio é indistinguível de uma que nunca começou.
-- =============================================================================


-- ---------------------------------------------------------------------------
-- 1 · public.config_janela_exclusao — a janela de arrependimento como DADO
-- ---------------------------------------------------------------------------
-- Singleton no molde de `config_sla_dados`: chave textual, um inteiro, descrição e
-- carimbo. UMA linha, e é ela que a copy da tela E o predicado de execução do motor
-- leem — que é o que torna auditável a decisão D-45-01.
CREATE TABLE public.config_janela_exclusao (
  chave         text        PRIMARY KEY,
  dias          integer     NOT NULL CHECK (dias > 0),
  descricao     text,
  atualizado_em timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.config_janela_exclusao ENABLE ROW LEVEL SECURITY;

-- UMA única policy, de LEITURA, para `authenticated` SEM escopo de papel — e a
-- divergência em relação ao molde RH-only é deliberada e está justificada no
-- cabeçalho §(2) e no COMMENT abaixo. NENHUMA policy de escrita: mudar a janela é
-- migration ou `UPDATE` de banco, nunca preferência de UI.
CREATE POLICY config_janela_exclusao_leitura ON public.config_janela_exclusao
  FOR SELECT TO authenticated
  USING (true);

COMMENT ON TABLE public.config_janela_exclusao IS
  'Phase 45 / ERASE-06 (D-45-01): a janela de ARREPENDIMENTO entre o pedido de exclusao e a '
  'execucao dele, em dias. Singleton no molde de config_sla_dados, alteravel por UPDATE sem '
  'deploy. '
  '⚠ POR QUE ESTA TABELA EXISTE SEPARADA DE config_sla_dados, e a separacao e a decisao: '
  '(i) config_sla_dados e RH-ONLY por desenho e o proprio arquivo dela PROIBE abrir leitura de '
  'titular naquela tabela — mas esta linha e lida pelo TITULAR, na secao 4 de '
  '/candidato/privacidade; (ii) a FORMA daquela tabela e a de um PAR de limiares de SLA '
  '(dias_atencao/dias_atraso com CHECK de ordem), nao a de uma janela unica; e (iii) os 15 dias '
  'da fila do RH sao o TETO LEGAL do Art. 19, II (prazo de RESPOSTA a pedido de acesso), '
  'enquanto os 15 dias daqui sao POLITICA INTERNA de arrependimento. Sao fatos distintos que '
  'hoje coincidem no numero; fundi-los numa linha so criaria ligacao falsa entre um prazo '
  'estatutario e uma escolha da empresa, e mudar um mexeria no outro sem que nada no schema '
  'dissesse que isso aconteceu. Esta fase NAO edita a string de 15 dias da fila do RH. '
  'RLS: uma policy de SELECT para authenticated SEM escopo de papel — a linha e politica '
  'publica da empresa (um inteiro de dias e uma descricao), nao PII, e a exposicao minima que a '
  'copy do titular exige. ZERO policy de escrita: default-deny.';

COMMENT ON COLUMN public.config_janela_exclusao.chave IS
  'Identificador do conjunto. Unico valor em uso: exclusao_arrependimento.';

COMMENT ON COLUMN public.config_janela_exclusao.dias IS
  '⚠ ESTA LINHA E LIDA POR DOIS CONSUMIDORES, E E ISSO QUE A TORNA AUDITAVEL (D-45-01, na sua '
  'leitura operacional): (1) a COPY da secao 4 de /candidato/privacidade, que diz ao titular em '
  'quantos dias os dados dele serao apagados; e (2) o PREDICADO DE EXECUCAO do motor, que compara '
  'solicitacoes_dados.executar_em com now(). As duas do MESMO lugar — uma fonte a auditar em vez '
  'de duas a divergir. '
  '⚠ NENHUM DOS DOIS PODE TER UM NUMERO COMPILADO. Um default embutido na RPC ou um literal no '
  'componente seria uma segunda verdade sobre o mesmo fato, e a divergencia apareceria justamente '
  'entre o que foi PROMETIDO ao titular e o que foi EXECUTADO sobre os dados dele. A RPC '
  'registrar_pedido_exclusao levanta excecao quando esta linha esta ausente, em vez de assumir '
  'um valor; a tela renderiza a DATA ALVO sem a contagem de dias, nunca um numero inventado.';

-- Seed único. `ON CONFLICT DO NOTHING`, JAMAIS upsert: re-seedar sobrescreveria em
-- produção um número que o operador pode ter ajustado (decisão travada desde a P37,
-- repetida na P42 e na P44).
INSERT INTO public.config_janela_exclusao (chave, dias, descricao)
VALUES (
  'exclusao_arrependimento',
  15,
  'Dias entre o pedido de exclusao e a execucao dele. Politica INTERNA de arrependimento (D-45-01), nao o teto do Art. 19, II. Durante esta janela o titular pode cancelar a exclusao dos dados — mas as candidaturas ja encerradas NAO voltam (D-45-06).'
)
ON CONFLICT (chave) DO NOTHING;

-- ---------------------------------------------------------------------------
-- 2 · Trigger de atualizado_em — TRABALHO HERDADO, não trabalho novo
-- ---------------------------------------------------------------------------
-- A função de carimbo existe desde a P37 (`20260722000002:144`) e é reutilizável tal
-- como está: sem privilégio elevado, com search_path vazio e referência totalmente
-- qualificada. Ela **NÃO é redefinida aqui** — redefini-la criaria divergência com a
-- versão viva sem ganho nenhum, e arrastaria um corpo delimitado por cifrões para
-- dentro de uma migration cuja premissa é justamente não ter nenhum (§(1)).
--
-- `CREATE TRIGGER` PURO, sem DROP prévio: idioma deliberado da P37/P42/P44, que
-- prefere FALHAR ALTO contra um trigger inesperado a substituí-lo em silêncio. Numa
-- tabela criada uma seção acima não pode haver trigger algum.
CREATE TRIGGER trg_config_janela_exclusao_atualizado_em
  BEFORE UPDATE ON public.config_janela_exclusao
  FOR EACH ROW EXECUTE FUNCTION public.tocar_atualizado_em();


-- ---------------------------------------------------------------------------
-- 3 · public.solicitacoes_dados — as SETE colunas de estado do pedido
-- ---------------------------------------------------------------------------
-- Todas nullable, todas aditivas. A tabela tem ZERO linhas vivas (SONDA 4 §4e), então
-- nenhuma linha é afetada — mas a propriedade que importa não é essa: é que estas
-- colunas continuariam sendo aditivas mesmo com a tabela cheia.
--
-- ⚠ **SEM `IF NOT EXISTS`, e a ausência é a decisão.** O idioma
-- `ADD COLUMN IF NOT EXISTS` é a causa MEDIDA do drift de `candidatos.user_id`
-- (`FK-AUDIT-LIVE.md:14`): ele transforma "esta coluna já existe com OUTRA forma" num
-- no-op silencioso, e o schema passa a divergir do arquivo sem que nada acuse. Um
-- apply que falha alto aqui é informação; um que passa em silêncio é dívida.
ALTER TABLE public.solicitacoes_dados ADD COLUMN executar_em timestamptz;
ALTER TABLE public.solicitacoes_dados ADD COLUMN cancelado_em timestamptz;
ALTER TABLE public.solicitacoes_dados ADD COLUMN plano jsonb;
ALTER TABLE public.solicitacoes_dados ADD COLUMN storage_concluido_em timestamptz;
ALTER TABLE public.solicitacoes_dados ADD COLUMN postgres_concluido_em timestamptz;
ALTER TABLE public.solicitacoes_dados ADD COLUMN auth_concluido_em timestamptz;
ALTER TABLE public.solicitacoes_dados ADD COLUMN recibo_enviado_em timestamptz;

COMMENT ON COLUMN public.solicitacoes_dados.executar_em IS
  'Phase 45 / ERASE-06: o instante a partir do qual o motor pode executar a exclusao. Calculado '
  'UMA vez, no registro do pedido, como solicitado_em + (config_janela_exclusao.dias). NULL para '
  'pedidos de tipo acesso. '
  '⚠ NAO E EMPURRADO PARA FRENTE. Um segundo pedido do mesmo titular com pedido ja agendado e '
  'no-op observavel: devolve a MESMA data. Empurrar o prazo a cada clique transformaria a janela '
  'de arrependimento num relogio que o proprio titular nao consegue esgotar. '
  '⚠ O MOTOR FALHA FECHADO NO ILEGIVEL: um executar_em que nao se sabe ler NUNCA libera a '
  'execucao (molde de exportar-meus-dados/index.ts:205-215).';

COMMENT ON COLUMN public.solicitacoes_dados.cancelado_em IS
  'Quando o titular cancelou o pedido, dentro da janela. NULL enquanto nao houve cancelamento. '
  '⚠ CANCELAR NAO REABRE CANDIDATURA ALGUMA (D-45-06). A janela e cancelavel quanto a EXCLUSAO '
  'DOS DADOS e NAO quanto ao ENCERRAMENTO DOS PROCESSOS, que ja aconteceu no instante do pedido. '
  'A tela e obrigada a dizer isso ANTES do primeiro clique (Invariante 3 da 45-UI-SPEC), e a RPC '
  'cancelar_pedido_exclusao nao contem escrita alguma sobre candidaturas.';

COMMENT ON COLUMN public.solicitacoes_dados.plano IS
  'Phase 45 / ERASE-04: o inventario capturado ANTES da primeira mutacao — em particular os '
  'caminhos de Storage enumerados, que deixam de ser enumeraveis depois do tombstone. Nasce NULO '
  'nesta fase; quem o preenche e o 45-10. Existe aqui porque capturar depois de comecar a apagar '
  'e capturar um mundo que ja mudou.';

COMMENT ON COLUMN public.solicitacoes_dados.storage_concluido_em IS
  'Carimbo do passo 1 (Storage). Parte da maquina de estados que torna RETOMAVEL uma mutacao que '
  'NAO e atomica (ERASE-04): o estado "Storage apagado, Postgres ainda nao" e alcancavel em '
  'producao, nao hipotetico. ⚠ E a plataforma NAO impoe a ordem: a SONDA 2 mediu que storage.objects '
  'NAO tem FK para auth.users, entao apagar o usuario com objetos vivos nao levanta erro nenhum — '
  'apenas orfana o blob para sempre, sem PITR e sem backup de Storage (D-45-10). A ordem e '
  'disciplina do motor, e estes carimbos sao a unica evidencia dela.';

COMMENT ON COLUMN public.solicitacoes_dados.postgres_concluido_em IS
  'Carimbo do passo 2 (a metade Postgres: tombstone + anonimizacao, em UMA transacao). NULL ate o '
  '45-10.';

COMMENT ON COLUMN public.solicitacoes_dados.auth_concluido_em IS
  'Carimbo do passo 3 (auth.admin.deleteUser, hard delete — D-45-09). NULL ate o 45-10. '
  '⚠ Depois deste carimbo NAO EXISTE SESSAO e NAO EXISTE TELA para o titular: e por isso que o '
  'recibo e e-mail, e nao uma pagina.';

COMMENT ON COLUMN public.solicitacoes_dados.recibo_enviado_em IS
  'Carimbo do envio do recibo ao titular. ⚠ E ELE QUE FAZ O PAPEL DE CLAIM DE IDEMPOTENCIA nesta '
  'fase, no lugar de uma linha em notificacoes_enviadas (D-45-12, saida R1): aquela tabela tem '
  'destinatario_email e destinatario_original AMBOS NOT NULL, e gravar o recibo la seria o '
  'endereco do titular SOBREVIVENDO a propria exclusao — um recibo que prova a exclusao enquanto '
  'retem o dado excluido. O cinto secundario e o header Idempotency-Key no transporte.';


-- ---------------------------------------------------------------------------
-- 4 · Os dois CHECK de vocabulário fechado, recriados
-- ---------------------------------------------------------------------------
-- `DROP` sem `IF EXISTS`: se a constraint não estiver lá com este nome exato, o
-- apply tem de falhar alto. A tabela está vazia (SONDA 4 §4e), então a revalidação
-- do `ADD` é trivial e não há risco de constraint violada por linha viva.
ALTER TABLE public.solicitacoes_dados DROP CONSTRAINT ck_solicitacoes_dados_situacao;

ALTER TABLE public.solicitacoes_dados
  ADD CONSTRAINT ck_solicitacoes_dados_situacao
  CHECK (situacao IN ('atendido', 'pendente', 'agendado', 'cancelado', 'executando', 'concluido'));

COMMENT ON CONSTRAINT ck_solicitacoes_dados_situacao ON public.solicitacoes_dados IS
  'Vocabulario FECHADO de SEIS valores. Os dois primeiros sao da Phase 44 e pertencem ao direito '
  'de ACESSO: atendido | pendente. Os quatro novos sao da Phase 45 e pertencem ao direito de '
  'EXCLUSAO: agendado (pedido registrado, janela correndo), cancelado (o titular desistiu dentro '
  'da janela), executando (o motor comecou e a mutacao NAO e atomica), concluido (os tres '
  'sistemas confirmaram). '
  '⚠ O QUE ACONTECE QUANDO CLIENTE E BANCO DIVERGEM: o cliente traduz com fallback TOTAL e o '
  'CHECK fecha o vocabulario aqui. Uma divergencia produz estado sem tratamento na tela — que e '
  'PIOR que um token cru, porque parece dado ausente em vez de vocabulario dessincronizado. '
  '⚠ INVARIANTE DA 45-UI-SPEC (Invariante 5): a tela NUNCA declara desfecho antes de situacao '
  'chegar a concluido. Enquanto ela e executando, a copy diz "em andamento" — nunca "concluido", '
  '"apagado" ou "pronto". Acrescentar aqui um valor que signifique desfecho parcial sem emendar '
  'aquela invariante e como a tela passa a mentir.';

ALTER TABLE public.solicitacoes_dados DROP CONSTRAINT ck_solicitacoes_dados_causa;

ALTER TABLE public.solicitacoes_dados
  ADD CONSTRAINT ck_solicitacoes_dados_causa
  CHECK (causa IS NULL OR causa IN (
    'falha_geracao', 'curriculo_ausente', 'permissao',
    'falha_storage', 'falha_postgres', 'falha_auth', 'falha_recibo'
  ));

COMMENT ON CONSTRAINT ck_solicitacoes_dados_causa ON public.solicitacoes_dados IS
  'Vocabulario FECHADO de SETE valores. Os tres primeiros sao da Phase 44 (falha_geracao, '
  'curriculo_ausente, permissao). Os quatro novos nomeiam EM QUAL DOS TRES SISTEMAS a mutacao '
  'nao-atomica parou: falha_storage, falha_postgres, falha_auth, falha_recibo. '
  '⚠ A GRANULARIDADE POR SISTEMA E O REQUISITO, nao detalhe: com uma causa generica seria '
  'impossivel saber, olhando a linha, se o curriculo ja foi destruido — e essa e exatamente a '
  'pergunta que alguem vai fazer as 3 da manha, sobre um arquivo que nao tem copia de reserva '
  '(D-45-10, PITR desligado, Storage fora de todo backup). '
  '⚠ O QUE ACONTECE QUANDO CLIENTE E BANCO DIVERGEM: mesma leitura do CHECK de situacao — o '
  'cliente traduz com fallback TOTAL, e a divergencia vira celula em branco em vez de token cru. '
  'NUNCA guarda mensagem crua do transporte, codigo HTTP, SQLSTATE, stack ou caminho de Storage '
  '(Invariante 12 da 45-UI-SPEC).';


-- ---------------------------------------------------------------------------
-- 5 · A dívida que a Phase 44 endereçou a esta fase, FECHADA
-- ---------------------------------------------------------------------------
-- `20260804000002:126-131` deixou escrito, in loco: *"A decisao de o pedido de acesso
-- sobreviver ou nao ao tombstone do candidato pertence a PHASE 45, que e quem carrega
-- o portao destrutivo e quem vai ter lido o proprio problema."* Lido, e decidido: a
-- linha SOBREVIVE. A FK continua **sem cláusula `ON DELETE`** (= `NO ACTION`) — o que
-- muda é que a ausência deixa de ser adiamento e passa a ser escolha registrada.
COMMENT ON CONSTRAINT fk_solicitacoes_dados_candidato ON public.solicitacoes_dados IS
  '⚠ DIVIDA DA PHASE 44 FECHADA PELA PHASE 45 (plano 45-03). Continua SEM clausula ON DELETE '
  '(= NO ACTION), e agora por DECISAO e nao por adiamento: o pedido do titular SOBREVIVE ao '
  'tombstone do candidato. '
  'POR QUE: esta linha e a PROVA DATADA de que um direito do Art. 18 foi exercido, com o instante '
  'em que foi pedido e o instante em que foi cumprido. Apaga-la junto com o titular destruiria a '
  'evidencia do proprio cumprimento — e e ela que a Phase 47 (auditoria) vai ler. Ela nao carrega '
  'PII: candidato_id, tipo, situacao, causa e carimbos. '
  'O QUE MORRE NO TOMBSTONE E O VINCULO DE SESSAO, NAO A LINHA. A anonimizacao da Phase 45 e '
  'UPDATE in-place sobre public.candidatos (ERASE-02), nao DELETE — a linha de candidatos '
  'permanece, entao esta FK permanece satisfeita e nada aqui e alcancado. O que deixa de existir '
  'e candidatos.user_id apontando para uma linha viva do Auth, e com ele a policy own-row de '
  'leitura desta tabela deixa de casar para aquele titular. Isso e o COMPORTAMENTO DESEJADO '
  '(D-45-11), nao um defeito a consertar: depois da exclusao nao ha sessao, nao ha tela e nao ha '
  'a quem mostrar a linha. Quem a le e a auditoria, por RPC, nunca por policy.';


-- ---------------------------------------------------------------------------
-- 6 · public.candidaturas.encerrada_a_pedido_em — o encerramento como FATO ADITIVO
-- ---------------------------------------------------------------------------
-- D-45-13. Sem `IF NOT EXISTS`, pela mesma razão da seção 3.
ALTER TABLE public.candidaturas ADD COLUMN encerrada_a_pedido_em timestamptz;

COMMENT ON COLUMN public.candidaturas.encerrada_a_pedido_em IS
  'Phase 45 / ERASE-05 (D-45-06 + D-45-13): o instante em que esta candidatura foi encerrada A '
  'PEDIDO DO PROPRIO CANDIDATO — pela retirada avulsa ou pelo pedido de exclusao dos dados, que '
  'encerra IMEDIATAMENTE toda candidatura em andamento do titular. NULL em toda candidatura que '
  'nao foi encerrada assim. Coluna ADITIVA: ela ACRESCENTA um fato, sem apagar nem mover nenhum. '
  '⚠ O ENCERRAMENTO E IMEDIATO E A JANELA CORRE A PARTIR DELE (D-45-06). A alternativa "esperar '
  'o funil fechar sozinho" foi RECUSADA EXPLICITAMENTE (D-45-07): um funil parado deixaria o '
  'pedido pendente indefinidamente, e o Art. 18 nao tem clausula de "quando der". '
  '⚠ AS TRES MODELAGENS RECUSADAS, com a razao MEDIDA de cada recusa — quem for editar isto '
  'precisa ler as tres antes: '
  '(a) NAO e uma linha em historico_candidatura. Aquela tabela tem UM UNICO ESCRITOR desde o M2 / '
  'Phase 6 — o trigger de avanco de etapa, que so dispara em UPDATE OF etapa_atual. Escrever a '
  'linha a mao exigiria um SEGUNDO escritor que toda leitura futura da trilha precisaria conhecer, '
  'e o encerramento a pedido nao e uma transicao de etapa: a etapa nao mudou, o processo acabou. '
  'Pior: o caminho que passa por etapa_atual e o caminho da REJEICAO, e ele grava '
  'auto_rejeitado = true para escrita de sistema — fabricando, na tabela que existe para provar '
  'que ninguem e rejeitado por maquina (RNF-07a), exatamente a evidencia do contrario. E o '
  'trigger de notificacao de transicao mandaria e-mail de DECISAO para quem acabou de pedir para '
  'ser esquecido. '
  '(b) NAO e deleted_at. Cinco servicos de RH filtram .is(''deleted_at'', null) — triagemService, '
  'candidaturasService (tres leituras), avaliacaoService e agendamentoService. Um soft delete '
  'faria a candidatura DESAPARECER de todas essas telas em silencio, e o e-mail de aviso ao RH '
  'levaria o recrutador a uma lista onde nao ha nada para ver (Invariante 9 da 45-UI-SPEC). O '
  'recrutador precisa saber que o processo acabou; ele nao pode descobrir isso por ausencia. '
  '(c) NAO e um valor novo no enum etapa_processo. Um estado novo deixaria a candidatura '
  'encerrada dentro da FILA DE TRABALHO do RH (as telas iteram sobre as etapas do funil) e, ao '
  'mesmo tempo, a faria sumir da retencao em silencio, porque o predicado da Phase 46 faz INNER '
  'JOIN com config_retencao_etapa e uma etapa sem linha na matriz nao entra no JOIN. '
  '⚠ DEPENDENCIA DECLARADA PARA A PHASE 46, e ela NAO deve ser descoberta la: a clausula desta '
  'coluna precisa ser ACRESCENTADA EXPLICITAMENTE a public.candidaturas_alem_da_janela(). Aquele '
  'predicado ancora a contagem no instante em que a candidatura entrou na etapa atual; uma '
  'candidatura encerrada a pedido continua na mesma etapa para sempre, entao ela envelhece '
  'normalmente na janela daquela etapa — o que pode estar certo, mas e uma DECISAO DE POLITICA '
  'que a Phase 46 tem de tomar com o parecer juridico, nunca herdar por acidente de implementacao. '
  'A lista de excecoes daquela funcao ja se declara "EXTENSIVEL E INCOMPLETA POR DESENHO".';
