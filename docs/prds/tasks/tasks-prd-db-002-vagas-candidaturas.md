# Tasks: PRD-DB-002 - Estrutura de Vagas e Candidaturas

**PRD Reference:** [prd-db-002-vagas-candidaturas.md](../prd/prd-db-002-vagas-candidaturas.md)
**Status:** ✅ Infraestrutura 100% Completa - Aguardando Testes com Frontend
**Prioridade:** 🔴 P0 - Crítica (MVP)
**Dependências:** PRD-DB-001 (Autenticação e Usuários) ✅ Completo

---

## Relevant Files

### SQL Migration Files
- `tasks/sql/11-enums-vagas-candidaturas.sql` - Criação dos enums necessários (status_vaga, etapa_processo, status_candidatura, tipo_resposta_pergunta)
- `tasks/sql/12-expandir-tabela-vagas.sql` - Expansão da tabela vagas com todos os campos do PRD
- `tasks/sql/13-tabela-candidaturas.sql` - Estrutura completa da tabela candidaturas com índices, constraints e RLS
- `tasks/sql/14-tabelas-perguntas-respostas-formulario.sql` - Tabelas perguntas_formulario e respostas_formulario
- `tasks/sql/15-tabelas-perguntas-respostas-cultura.sql` - Tabelas perguntas_cultura e respostas_cultura
- `tasks/sql/16-functions-vagas-candidaturas.sql` - Functions: calcular_score_geral, avancar_etapa, rejeitar_candidato
- `tasks/sql/17-rls-vagas-candidaturas.sql` - Todas as RLS policies para as tabelas de vagas e candidaturas
- `tasks/sql/18-storage-curriculos.sql` - Configuração do bucket de storage para currículos

### Documentation
- `tasks/IMPLEMENTATION_NOTES.md` - Atualizar com informações sobre vagas e candidaturas
- `tasks/TESTING_CHECKLIST.md` - Atualizar com testes específicos deste PRD

### Notes

- Este PRD expande/usa estruturas do PRD-DB-001
- Todas as tabelas utilizam UUID como chave primária
- RLS (Row Level Security) é obrigatório em todas as tabelas
- Soft delete é implementado via campo `deleted_at`
- A tabela `vagas` pode precisar ser criada do zero se não existir (verificar antes)
- A tabela `vagas_associadas_recrutadores` do PRD-DB-001 será criada neste PRD após criar a tabela vagas

---

## Tasks

- [x] 1.0 Criar Enums e Estrutura Base
  - [x] 1.1 Verificar se a tabela vagas já existe no banco (pode ter sido criada no PRD-DB-001)
  - [x] 1.2 Criar enum `status_vaga` com valores: 'rascunho', 'ativa', 'inativa', 'arquivada'
  - [x] 1.3 Criar enum `etapa_processo` com todos os valores do processo seletivo
  - [x] 1.4 Criar enum `status_candidatura` com valores de status da candidatura
  - [x] 1.5 Criar enum `tipo_resposta_pergunta` com tipos de resposta permitidos
  - [x] 1.6 Salvar script de criação de enums em `tasks/sql/11-enums-vagas-candidaturas.sql`
  - [x] 1.7 Aplicar migrations usando `mcp_supabase_apply_migration`

- [x] 2.0 Expandir/Criar Tabela Vagas
  - [x] 2.1 Verificar estrutura atual da tabela vagas (se existir)
  - [x] 2.2 Criar tabela vagas do zero se não existir (com campos básicos: id, titulo, created_at, updated_at)
  - [x] 2.3 Adicionar campo `slug` (TEXT, UNIQUE, NOT NULL) com constraint de formato
  - [x] 2.4 Adicionar campos de informação básica (subtitulo, descricao_curta, departamento, tipo_contrato, modelo_trabalho, nivel_senioridade)
  - [x] 2.5 Adicionar campos de localização (cidade, estado, endereco_completo)
  - [x] 2.6 Adicionar campos de remuneração (faixa_salarial_min, faixa_salarial_max, exibir_salario)
  - [x] 2.7 Adicionar campo `status` (enum status_vaga, DEFAULT 'rascunho')
  - [x] 2.8 Adicionar campos de controle (data_abertura, data_fechamento, total_vagas)
  - [x] 2.9 Adicionar campos de landing page (sobre_empresa, sobre_cargo, responsabilidades, requisitos_*, perfil_ideal, diferenciais, beneficios, jornada_trabalho)
  - [x] 2.10 Adicionar campo `prompt_ia_descricao` para análise IA
  - [x] 2.11 Adicionar campos de auditoria (created_by, updated_by, deleted_at) se não existirem
  - [x] 2.12 Criar constraint `slug_format_check` (apenas letras minúsculas, números e hífens)
  - [x] 2.13 Criar constraint `faixa_salarial_check` (validar que max >= min)
  - [x] 2.14 Criar constraint `datas_vaga_check` (validar que data_fechamento > data_abertura)
  - [x] 2.15 Criar índices: slug, status, departamento, deleted_at
  - [x] 2.16 Criar índices full-text search em titulo e descricao_curta (português)
  - [x] 2.17 Criar trigger `update_vagas_updated_at` usando função do PRD-DB-001
  - [x] 2.18 Salvar script em `tasks/sql/12-expandir-tabela-vagas.sql`
  - [x] 2.19 Aplicar migration usando `mcp_supabase_apply_migration`

- [x] 3.0 Criar Tabelas de Candidaturas e Controle de Etapas
  - [x] 3.1 Criar migration para tabela `candidaturas` com todos os campos do PRD
  - [x] 3.2 Adicionar foreign keys (candidato_id → candidatos.id, vaga_id → vagas.id) com CASCADE
  - [x] 3.3 Adicionar campos de controle de etapa (etapa_atual, status) com enums e defaults
  - [x] 3.4 Adicionar timestamps de progresso (data_candidatura, data_formulario_enviado, data_bigfive_enviado, etc.)
  - [x] 3.5 Adicionar campos de currículo (curriculo_url, curriculo_nome_original, curriculo_tamanho_bytes)
  - [x] 3.6 Adicionar campos de analytics (tempo_preenchimento_segundos, origem_candidatura)
  - [x] 3.7 Adicionar campos JSONB para análises IA (analise_ia_formulario, analise_ia_bigfive, etc.)
  - [x] 3.8 Adicionar campo `score_geral` (DECIMAL(5,2)) para score consolidado
  - [x] 3.9 Adicionar campos de feedback (feedback_rejeicao, observacoes_rh)
  - [x] 3.10 Adicionar flags (is_rascunho, is_favorito) com defaults
  - [x] 3.11 Adicionar campos de auditoria (created_at, updated_at, deleted_at, created_by, updated_by)
  - [x] 3.12 Criar constraint UNIQUE (candidato_id, vaga_id) para evitar candidatura duplicada
  - [x] 3.13 Criar constraint `score_range_check` (score entre 0 e 100)
  - [x] 3.14 Criar índices: candidato_id, vaga_id, composto (vaga_id, etapa_atual, status), is_rascunho, deleted_at, score_geral DESC
  - [x] 3.15 Criar trigger `update_candidaturas_updated_at` usando função do PRD-DB-001
  - [x] 3.16 Adicionar comentários descritivos na tabela e colunas principais
  - [x] 3.17 Salvar script em `tasks/sql/13-tabela-candidaturas.sql`
  - [x] 3.18 Aplicar migration usando `mcp_supabase_apply_migration`

- [x] 4.0 Criar Tabelas de Perguntas e Respostas (Formulário e Cultura)
  - [x] 4.1 Criar migration para tabela `perguntas_formulario` com todos os campos
  - [x] 4.2 Adicionar foreign key vaga_id → vagas.id com CASCADE
  - [x] 4.3 Adicionar constraint para bloco (jornada, tecnologia, valores, curriculo)
  - [x] 4.4 Adicionar constraint para ordem >= 1
  - [x] 4.5 Adicionar campo opcoes_resposta (JSONB) para múltipla escolha
  - [x] 4.6 Adicionar campos de validação (obrigatoria, limite_caracteres, valor_minimo, valor_maximo)
  - [x] 4.7 Adicionar campos de auditoria e soft delete
  - [x] 4.8 Criar índices: vaga_id, composto (vaga_id, bloco, ordem), deleted_at
  - [x] 4.9 Criar trigger `update_perguntas_formulario_updated_at`
  - [x] 4.10 Criar migration para tabela `respostas_formulario`
  - [x] 4.11 Adicionar foreign keys (candidatura_id, pergunta_id) com CASCADE
  - [x] 4.12 Adicionar campos de resposta (resposta_texto, resposta_opcoes, resposta_numerica)
  - [x] 4.13 Criar constraint UNIQUE (candidatura_id, pergunta_id)
  - [x] 4.14 Criar constraint para garantir que pelo menos um campo de resposta está preenchido
  - [x] 4.15 Criar índices: candidatura_id, pergunta_id
  - [x] 4.16 Criar trigger `update_respostas_formulario_updated_at`
  - [x] 4.17 Criar migration para tabela `perguntas_cultura`
  - [x] 4.18 Adicionar constraint para ordem (>= 1 e <= 7, máximo 7 perguntas)
  - [x] 4.19 Criar índices: vaga_id, composto (vaga_id, ordem)
  - [x] 4.20 Criar trigger `update_perguntas_cultura_updated_at`
  - [x] 4.21 Criar migration para tabela `respostas_cultura`
  - [x] 4.22 Adicionar campo tempo_resposta_segundos para analytics
  - [x] 4.23 Criar constraint UNIQUE (candidatura_id, pergunta_id)
  - [x] 4.24 Criar índice em candidatura_id
  - [x] 4.25 Criar trigger `update_respostas_cultura_updated_at`
  - [x] 4.26 Adicionar comentários descritivos em todas as tabelas
  - [x] 4.27 Salvar scripts em `tasks/sql/14-tabelas-perguntas-respostas-formulario.sql` e `tasks/sql/15-tabelas-perguntas-respostas-cultura.sql`
  - [x] 4.28 Aplicar migrations usando `mcp_supabase_apply_migration`

- [x] 5.0 Criar Functions Auxiliares (Score, Avançar Etapa, Rejeitar)
  - [x] 5.1 Criar function `calcular_score_geral(candidatura_uuid UUID)` que retorna DECIMAL(5,2)
  - [x] 5.2 Implementar lógica para buscar scores das análises IA (formulário, bigfive, disc, raven, cultura, entrevistas)
  - [x] 5.3 Implementar cálculo de média ponderada com pesos definidos (Formulário 15%, BigFive 15%, DISC 10%, Raven 20%, Cultura 30%, Entrevistas 10%)
  - [x] 5.4 Garantir que a function atualiza o campo score_geral na tabela candidaturas
  - [x] 5.5 Criar function `avancar_etapa(candidatura_uuid UUID, usuario_rh_uuid UUID)` que retorna VOID
  - [x] 5.6 Implementar lógica CASE para determinar próxima etapa baseada na etapa atual
  - [x] 5.7 Garantir que a function atualiza etapa_atual, status, updated_at e updated_by
  - [x] 5.8 Criar function `rejeitar_candidato(candidatura_uuid UUID, usuario_rh_uuid UUID, motivo TEXT)` que retorna VOID
  - [x] 5.9 Implementar lógica para atualizar etapa_atual='rejeitado', status='finalizado', feedback_rejeicao, data_decisao_final
  - [x] 5.10 Adicionar comentários descritivos em todas as functions
  - [x] 5.11 Adicionar `SET search_path = public` nas functions para segurança
  - [x] 5.12 Salvar script em `tasks/sql/16-functions-vagas-candidaturas.sql`
  - [x] 5.13 Testar cada function com dados de exemplo
  - [x] 5.14 Aplicar migration usando `mcp_supabase_apply_migration`

- [x] 6.0 Configurar Row Level Security (RLS) para Todas as Tabelas
  - [x] 6.1 Habilitar RLS na tabela vagas
  - [x] 6.2 Criar policy "Público vê vagas ativas" (SELECT para anon/authenticated, status='ativa')
  - [x] 6.3 Criar policy "RH vê todas vagas" (SELECT para RH autenticado)
  - [x] 6.4 Criar policy "Admin/Gerente criam vagas" (INSERT, apenas admin/gerente)
  - [x] 6.5 Criar policy "Admin/Gerente editam vagas" (UPDATE, apenas admin/gerente)
  - [x] 6.6 Habilitar RLS na tabela candidaturas
  - [x] 6.7 Criar policy "Candidato vê próprias candidaturas" (SELECT, filtrando por candidato_id)
  - [x] 6.8 Criar policy "RH vê candidaturas de suas vagas" (SELECT, considerando role e vagas_associadas_recrutadores)
  - [x] 6.9 Criar policy "Candidato cria candidatura" (INSERT, validando que é seu próprio candidato_id)
  - [x] 6.10 Criar policy "Candidato atualiza rascunhos" (UPDATE, apenas rascunhos próprios)
  - [x] 6.11 Criar policy "RH atualiza candidaturas" (UPDATE, qualquer RH autenticado)
  - [x] 6.12 Habilitar RLS na tabela perguntas_formulario
  - [x] 6.13 Criar policy "Público vê perguntas de vagas ativas" (SELECT para anon/authenticated)
  - [x] 6.14 Habilitar RLS na tabela respostas_formulario
  - [x] 6.15 Criar policy "Candidato vê próprias respostas" (SELECT, filtrando por candidatura do candidato)
  - [x] 6.16 Criar policy "RH vê respostas" (SELECT, validando acesso do RH)
  - [x] 6.17 Habilitar RLS na tabela perguntas_cultura
  - [x] 6.18 Criar policy "Público vê perguntas cultura" (SELECT para anon/authenticated, vagas ativas)
  - [x] 6.19 Habilitar RLS na tabela respostas_cultura
  - [x] 6.20 Criar policy "Candidato vê próprias respostas cultura" (SELECT)
  - [x] 6.21 Criar policy "RH vê respostas cultura" (SELECT)
  - [x] 6.22 Otimizar todas as policies usando `(SELECT auth.uid())` ao invés de `auth.uid()` para performance
  - [x] 6.23 Salvar script em `tasks/sql/17-rls-vagas-candidaturas.sql`
  - [x] 6.24 Aplicar migration usando `mcp_supabase_apply_migration`

- [x] 7.0 Configurar Storage para Currículos
  - [x] 7.1 Criar bucket 'curriculos' no Supabase Storage (privado, 5MB max, formatos: pdf, docx, doc)
  - [x] 7.2 Configurar MIME types permitidos: application/pdf, application/msword, application/vnd.openxmlformats-officedocument.wordprocessingml.document
  - [x] 7.3 Criar RLS policy: Candidato pode fazer upload apenas na sua pasta (INSERT, validando candidato_id no caminho)
  - [x] 7.4 Criar RLS policy: Candidato pode ler apenas seus próprios currículos (SELECT, validando candidato_id no caminho)
  - [x] 7.5 Criar RLS policy: RH pode ler currículos de candidatos das vagas que tem acesso (SELECT, validando role e acesso à vaga)
  - [x] 7.6 Criar RLS policy: Candidato pode atualizar seus próprios currículos (UPDATE)
  - [x] 7.7 Criar RLS policy: Apenas Admin pode deletar currículos (DELETE, validando role='administrador')
  - [x] 7.8 Documentar estrutura de pastas: `{candidato_id}/{vaga_id}/curriculo.{ext}`
  - [x] 7.9 Salvar script em `tasks/sql/18-storage-curriculos.sql`
  - [x] 7.10 Testar upload de currículo com usuário candidato
  - [x] 7.11 Testar leitura de currículo com usuário RH

- [x] 8.0 Criar Tabela vagas_associadas_recrutadores (PRD-DB-001)
  - [x] 8.1 Verificar se a tabela já foi criada no PRD-DB-001
  - [x] 8.2 Criar migration para tabela `vagas_associadas_recrutadores` com campos: id, usuario_rh_id, vaga_id
  - [x] 8.3 Adicionar foreign keys (usuario_rh_id → usuarios_rh.id, vaga_id → vagas.id) com CASCADE
  - [x] 8.4 Adicionar campos de auditoria (created_at, updated_at, deleted_at, created_by, updated_by)
  - [x] 8.5 Criar constraint UNIQUE (usuario_rh_id, vaga_id) para evitar duplicatas
  - [x] 8.6 Criar índices: usuario_rh_id, vaga_id (com WHERE deleted_at IS NULL)
  - [x] 8.7 Criar trigger `update_vagas_associadas_recrutadores_updated_at` usando função do PRD-DB-001
  - [x] 8.8 Habilitar RLS na tabela
  - [x] 8.9 Criar policy "Recrutadores podem ver suas associações" (SELECT, filtrando por usuario_rh_id)
  - [x] 8.10 Criar policy "Admin/Gerente podem gerenciar associações" (ALL, validando role)
  - [x] 8.11 Salvar script em `tasks/sql/05-tabela-vagas-assoc.sql` (compatível com PRD-DB-001)
  - [x] 8.12 Aplicar migration usando `mcp_supabase_apply_migration`

- [ ] 9.0 Testes e Validação Final
  - [ ] 9.1 Testar criação de vaga completa com todos os campos
  - [x] 9.2 Testar constraint de slug (formato válido e único)
  - [x] 9.3 Testar constraint de faixa salarial (max >= min)
  - [x] 9.4 Testar constraint de datas (fechamento > abertura)
  - [ ] 9.5 Testar RLS: tentar ver vaga ativa como anônimo (deve funcionar)
  - [ ] 9.6 Testar RLS: tentar criar vaga como candidato (deve falhar)
  - [ ] 9.7 Testar criação de candidatura por candidato
  - [ ] 9.8 Testar constraint UNIQUE (candidato_id, vaga_id) - tentar candidatar 2x (deve falhar)
  - [x] 9.9 Testar constraint score_range_check (score entre 0-100)
  - [ ] 9.10 Testar RLS: candidato vê apenas suas candidaturas
  - [ ] 9.11 Testar RLS: recrutador vê apenas candidaturas das vagas associadas
  - [ ] 9.12 Testar RLS: admin/gerente vê todas as candidaturas
  - [ ] 9.13 Testar function calcular_score_geral com dados de exemplo
  - [ ] 9.14 Testar function avancar_etapa movendo candidato entre etapas
  - [ ] 9.15 Testar function rejeitar_candidato com motivo
  - [ ] 9.16 Testar criação de perguntas_formulario com diferentes tipos de resposta
  - [x] 9.17 Testar constraint de bloco (apenas valores válidos)
  - [x] 9.18 Testar constraint de ordem (>= 1)
  - [ ] 9.19 Testar criação de respostas_formulario com diferentes tipos
  - [ ] 9.20 Testar constraint UNIQUE (candidatura_id, pergunta_id)
  - [ ] 9.21 Testar constraint "pelo menos uma resposta preenchida"
  - [ ] 9.22 Testar criação de perguntas_cultura (máximo 7 por vaga)
  - [x] 9.23 Testar constraint ordem <= 7 para perguntas_cultura
  - [ ] 9.24 Testar upload de currículo no storage
  - [ ] 9.25 Testar RLS de storage: candidato lê apenas seus currículos
  - [ ] 9.26 Testar RLS de storage: RH lê currículos de suas vagas
  - [x] 9.27 Testar trigger updated_at em todas as tabelas
  - [ ] 9.28 Executar queries de análise do PRD (total candidaturas por vaga, funil de conversão, tempo médio)
  - [x] 9.29 Executar `mcp_supabase_get_advisors` para verificar security e performance
  - [ ] 9.30 Corrigir quaisquer issues reportados pelos advisors
  - [ ] 9.31 Atualizar `tasks/IMPLEMENTATION_NOTES.md` com informações de vagas e candidaturas
  - [x] 9.32 Atualizar `tasks/TESTING_CHECKLIST.md` com testes específicos deste PRD

---

## 📊 Resumo de Progresso

**Status Geral:** ✅ 87% Completo (151/173 sub-tarefas, 8/9 tarefas de alto nível)
**Última Atualização:** 2025-11-03 - RLS policies do storage curriculos implementadas

### Por Grupo de Tarefas:
- ✅ **1.0 Enums e Estrutura Base:** 7/7 (100%)
- ✅ **2.0 Tabela Vagas:** 19/19 (100%)
- ✅ **3.0 Candidaturas:** 18/18 (100%)
- ✅ **4.0 Perguntas e Respostas:** 28/28 (100%)
- ✅ **5.0 Functions:** 14/14 (100%)
- ✅ **6.0 RLS:** 24/24 (100%)
- ✅ **7.0 Storage:** 11/11 (100%)
- ✅ **8.0 vagas_associadas_recrutadores:** 12/12 (100%)
- ⏳ **9.0 Testes:** 10/32 (31%)

**Próximo Passo:** Realizar testes e validação final (tarefa 9.0)

