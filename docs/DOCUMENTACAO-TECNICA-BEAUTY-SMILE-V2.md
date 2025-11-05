# Documentação Técnica Completa - Sistema de Recrutamento Beauty Smile

**Versão:** 2.0 - Baseada em Implementação Figma Make  
**Data:** 02 de Novembro de 2025  
**Status:** Documentação de Sistema Implementado  
**Repositório:** https://github.com/fercosnt/SistemaRecrutamento

---

## 📋 Informações Importantes

- ✅ **Design 100% pronto** no Figma Make
- ✅ **Código exportado** para repositório GitHub
- ⚠️ **Documento focado em:** Funcionalidades, fluxos, validações, comportamentos
- ⚠️ **NÃO documenta:** Aspectos visuais (já definidos no design)
- 🔴 **Destaque:** Itens marcados com ❌ são pendências/melhorias identificadas

---

## 🗂️ Índice

1. [Stack Tecnológico](#stack-tecnológico)
2. [Área Pública - Candidato](#área-pública---candidato)
3. [Área RH/Admin](#área-rhadmin)
4. [Integrações e Automações](#integrações-e-automações)
5. [Pendências e Melhorias](#pendências-e-melhorias)

---

## Stack Tecnológico

```
Frontend:  Next.js 14 (App Router) + TypeScript
Backend:   Supabase (PostgreSQL + Auth)
Deploy:    Vercel
Automação: n8n (webhooks + análises IA)
IA:        Claude API (via n8n)
Storage:   Supabase Storage (currículos, fotos)
```

---

# ÁREA PÚBLICA - CANDIDATO

## 1. LandingPage.tsx

**URL:** `/` (home pública)

**Funcionalidade:**
- Landing page institucional
- Lista vagas abertas
- CTA para candidatar-se

**Observação:** Detalhes não especificados na transcrição.

---

## 2. VagasPublicasPage.tsx

**URL:** `/vagas`

**Funcionalidade:**
- Lista todas as vagas ativas publicamente
- Permite filtrar/buscar vagas
- Cards clicáveis redirecionam para `VagaLPPage.tsx`

**Observação:** Detalhes não especificados na transcrição.

---

## 3. VagaLPPage.tsx

**URL:** `/vaga/[slug]`

**Exemplo:** `/vaga/assistente-odontologico`

### Estrutura da Página

#### Cabeçalho
- Logo Beauty Smile
- Título da vaga
- Subtítulo da vaga

#### Blocos de Conteúdo (Editáveis via Admin)

**1. Sobre a Beauty Smile**
- Texto institucional

**2. O Cargo**
- Descrição da posição

**3. Suas Principais Responsabilidades**
- Lista de atividades

**4. O Que Você Precisa Ter** (4 sub-blocos)
- Formação
- Experiência
- Conhecimentos Técnicos
- Habilidades Essenciais

**5. Você É a Pessoa Certa Para Esse Cargo Se...**
- Características desejadas

**6. Seria Incrível Se Você Também Tivesse**
- Diferenciais (não obrigatórios)

**7. O Que Oferecemos**
- Benefícios e remuneração

**8. Local e Horário de Trabalho**
- Endereço (fixo, vem de Configurações)
- Jornada

#### CTA
- **Botão:** "Quero me candidatar"
- **Ação:** Redireciona para `LoginCandidatoPage.tsx`

#### Rodapé
- Contatos da clínica

**Observações Técnicas:**
- Conteúdo editado via `CriarEditarVagaPage.tsx` (aba Landing Page)
- Suporta Rich Text e Markdown
- Cada vaga tem landing page única

---

## 4. InscricaoPage.tsx

**URL:** `/cadastro-candidato`

**Acesso:** Candidato que não tem conta clica em "Cadastre-se"

### Campos do Formulário

| Campo | Tipo | Obrigatório | Validação |
|-------|------|-------------|-----------|
| Nome Completo | Text | Sim | - |
| E-mail | Email | Sim | Formato válido |
| CPF | Text | Sim | **Apenas formato**, NÃO valida CPF real |
| Celular | Tel | Sim | Formato: (00) 00000-0000 |
| Cidade | Dropdown | Sim | - |
| Estado | Dropdown | Sim | UF |
| Senha | Password | Sim | Min 8 chars, 1 maiúscula, 1 número |
| Confirmar Senha | Password | Sim | Deve coincidir |

### Validações
- ❌ **NÃO** valida se CPF é válido (apenas formato)
- ❌ **NÃO** usa captcha
- ❌ **NÃO** tem limite de tentativas
- ✅ E-mail não pode estar duplicado

### Ações
- **Botão "Criar Conta"**
  - Cria usuário no Supabase Auth
  - Sucesso: Redireciona para `InstrucoesFormularioPage.tsx` da vaga específica
  - Erro: Mensagem inline

**Observações:**
- Candidato pode se candidatar para múltiplas vagas com mesmo login

---

## 5. LoginCandidatoPage.tsx

**URL:** `/login-candidato`

### Campos
- E-mail
- Senha
- Checkbox: "Lembrar-me"

### Links
- "Esqueci minha senha" → `EsqueciSenhaPage.tsx`
- "Não tem conta? Cadastre-se" → `InscricaoPage.tsx`

### Fluxo Pós-Login
- **Se primeira vez nesta vaga:** → `InstrucoesFormularioPage.tsx` da vaga
- **Se já candidatou:** → Dashboard ou próximo teste pendente

### Segurança
- Autenticação via Supabase Auth
- ❌ **NÃO** tem limite de tentativas
- ❌ **NÃO** tem bloqueio temporário

---

## 6. EsqueciSenhaPage.tsx

**URL:** `/esqueci-senha`

### Campo
- E-mail

### Fluxo
1. Usuário digita e-mail
2. Clica "Enviar instruções"
3. Recebe e-mail com link
4. Link: `RedefinirSenhaPage.tsx?token=xxx`

### E-mail Contém
- Instruções
- Link com token temporário
- Tempo de expiração (24h)

---

## 7. RedefinirSenhaPage.tsx

**URL:** `/redefinir-senha?token=xxx`

### Campos
- Nova Senha (mesmos requisitos do cadastro)
- Confirmar Nova Senha

### Validações
- Token válido e não expirado
- Senhas coincidem
- Requisitos de senha cumpridos

### Ação
- **Botão "Redefinir Senha"**
  - Atualiza senha
  - Redireciona para login

---

## 8. InstrucoesFormularioPage.tsx

**URL:** `/instrucoes-formulario/[vaga-id]`

### Conteúdo
- Nome do candidato (exibido no topo)
- Vídeo YouTube (embed) - Explicativo
- Texto instrucional
- Tempo estimado: "15-20 minutos"

### Ação
- **Botão "Iniciar Formulário"** → `FormularioCandidaturaPage.tsx`

**Observações:**
- Mesma página visual para todas as vagas
- Formulário em si é específico por vaga

---

## 9. FormularioCandidaturaPage.tsx

**URL:** `/formulario-candidatura/[vaga-id]`

### Cabeçalho
- Mensagem: "Bem-vindo(a), [Nome do Candidato]"
- Barra de progresso (% de conclusão)

### Estrutura (4 Blocos)

**BLOCO 1: Sua Jornada Profissional**
- Perguntas sobre experiência, trajetória

**BLOCO 2: Tecnologia e Inovação**
- Perguntas sobre ferramentas, adaptação

**BLOCO 3: Nossos Valores e Sua Essência**
- Perguntas sobre alinhamento cultural

**BLOCO 4: Upload do Currículo**
- Formato: PDF ou DOCX
- Tamanho máximo: 5 MB

### Tipos de Pergunta

| Tipo | Descrição | Exemplo |
|------|-----------|---------|
| Single Selection | Radio buttons (1 opção) | Qual seu nível de experiência? |
| Multiple Selection | Checkboxes (múltiplas) | Quais sistemas conhece? |
| Texto Curto | Input linha única (~200 chars) | Nome da empresa anterior |
| Texto Longo | Textarea (~1000 chars) | Descreva sua experiência |
| Numérico | Input number | Anos de experiência |

### Estrutura de Pergunta

```
[Número]. [Texto da Pergunta]*  (* = obrigatória)
[Texto de Ajuda/Instrução] (opcional, em cinza)
[Campo de Resposta]
```

**Exemplo:**
```
3. Qual o seu nível de experiência profissional?*
Considere sua experiência geral no mercado de trabalho

( ) Menos de 1 ano
( ) 1 a 3 anos
( ) 3 a 5 anos
( ) Mais de 5 anos
```

### Funcionalidade Especial: Opção "Outros"

Quando admin inclui "Outros" em Single/Multiple Selection:
- Ao selecionar "Outros", aparece campo de texto adicional
- Exemplo: `(•) Outros: [campo de texto livre]`

### Campo LinkedIn
- Pergunta específica pedindo URL do perfil
- Input de texto

### Timer Oculto
- Registra tempo entre início e "Enviar Candidatura"
- **Candidato NÃO vê**
- Salvo no banco para análise

### Validações
- Campos com * são obrigatórios
- Upload valida formato (PDF/DOCX) e tamanho (5MB)
- Botão "Enviar" só habilita se tudo preenchido

### Ações

**Botão "Salvar Rascunho"** (opcional)
- Salva progresso parcial
- Candidato pode voltar depois

**Botão "Enviar Candidatura"**
- Valida todos campos
- Salva no Supabase
- Dispara webhook n8n (análise IA)
- Redireciona para `ConclusaoTestesPage.tsx`

### Webhook Enviado (n8n)

```json
{
  "candidato_id": "uuid",
  "vaga_id": "uuid",
  "respostas": [...],
  "curriculo_url": "url_supabase_storage",
  "tempo_preenchimento": "00:15:32",
  "timestamp": "2025-11-02T10:30:00Z"
}
```

**❌ PENDÊNCIA: Blocos não estão organizados visualmente**
- Atualmente perguntas aparecem soltas
- Desejado: Separação visual clara entre os 4 blocos

---

## 10. InstrucoesBigFivePage.tsx

**URL:** `/instrucoes-bigfive`

**Acesso:**
- Candidato recebe e-mail com link
- Link redireciona para login (se necessário)
- Após login, cai diretamente nesta página

### Conteúdo

**Explicação do Teste:**
- O que é Big Five
- 5 dimensões da personalidade
- Não há respostas certas/erradas

**Instruções:**
- Total: 120 questões
- Tempo estimado: 15-20 minutos
- Formato: Escala Likert 5 pontos
- **Não pode voltar** para questões anteriores

**Dimensões:**
1. Abertura à Experiência
2. Conscienciosidade
3. Extroversão
4. Amabilidade
5. Neuroticismo

### Ação
- Checkbox: "Compreendo as instruções acima" (obrigatório)
- **Botão "Iniciar Teste"** (desabilitado até marcar checkbox)
  - Redireciona para `TesteBigFivePage.tsx`

---

## 11. TesteBigFivePage.tsx

**URL:** `/teste-bigfive`

### Cabeçalho
- Nome do candidato
- Título: "Teste Big Five - Personalidade"

### Barra de Progresso
- Indicador: "Questão X de 120"
- Barra visual: X%

### Questão Atual

**Estrutura:**
```
[Número]. [Afirmação]

Exemplo: "15. Eu me considero uma pessoa organizada"
```

### Opções de Resposta (Escala Likert)

Radio buttons (apenas 1 selecionável):
1. Discordo Totalmente (valor: 1)
2. Discordo Parcialmente (valor: 2)
3. Neutro (valor: 3)
4. Concordo Parcialmente (valor: 4)
5. Concordo Totalmente (valor: 5)

### Comportamento
- Botão "Próxima" só habilita após selecionar
- ❌ **NÃO** permite voltar
- ❌ **NÃO** permite pular

### Navegação
- Questões 1-119: Botão "Próxima"
- Questão 120: Botão "Finalizar Teste"

### Timer Oculto
- Registra tempo total
- **NÃO** visível para candidato

### Ação ao Finalizar
1. Salva respostas no Supabase
2. Dispara webhook para n8n:

```json
{
  "candidato_id": "uuid",
  "vaga_id": "uuid",
  "teste": "bigfive",
  "respostas": [1,4,3,5,2,...], // 120 valores
  "tempo_conclusao": "00:18:45",
  "timestamp": "2025-11-02T11:00:00Z"
}
```

3. Redireciona para `ConclusaoTestesPage.tsx`

### E-mail Pós-Conclusão (via n8n)
- Agradecimento
- "Resultado em até 1 hora"
- "Aguarde contato para próximas etapas"

---

## 12. InstrucoesDISCPage.tsx

**URL:** `/instrucoes-disc`

### Conteúdo

**Explicação:**
- O que é DISC
- 4 dimensões: Dominância, Influência, Estabilidade, Conformidade

**Instruções:**
- Total: 28 grupos de afirmações
- Tempo estimado: 10-12 minutos
- Formato: Escolha forçada (1 de 4 por grupo)
- Escolha afirmação que MAIS descreve você

### Ação
- Checkbox: "Compreendo as instruções"
- **Botão "Iniciar Teste"** → `TesteDISCPage.tsx`

---

## 13. TesteDISCPage.tsx

**URL:** `/teste-disc`

### Cabeçalho
- Nome do candidato
- Título: "Teste DISC - Perfil Comportamental"

### Barra de Progresso
- Indicador: "Questão X de 28"
- Barra visual: X%

### Questão Atual

**Estrutura:**
```
Escolha a afirmação que MAIS descreve você:

( ) Eu sou assertivo e gosto de desafios [D]
( ) Eu sou comunicativo e entusiasta [I]
( ) Eu sou paciente e bom ouvinte [S]
( ) Eu sou detalhista e preciso [C]
```

Cada grupo tem 4 afirmações (1 por dimensão DISC).

### Comportamento
- Radio buttons (1 selecionável)
- Botão "Próxima" só habilita após selecionar
- ❌ **NÃO** permite voltar

### Navegação
- Questões 1-27: Botão "Próxima"
- Questão 28: Botão "Finalizar Teste"

### Ação ao Finalizar
1. Salva respostas no Supabase
2. Dispara webhook para n8n
3. n8n calcula perfil DISC
4. Redireciona para `ConclusaoTestesPage.tsx`

---

## 14. InstrucoesRavenPage.tsx

**URL:** `/instrucoes-raven`

**Acesso:**
- Durante entrevista online
- Recrutador orienta candidato
- Link enviado durante videochamada

### Conteúdo

**Explicação:**
- O que é Matrizes Progressivas de Raven
- Avalia raciocínio lógico não-verbal
- Identifica padrões visuais

**Instruções:**
- Total: 60 questões (5 séries: A, B, C, D, E)
- 12 questões por série
- Sem limite de tempo (mas é cronometrado)
- Formato: Múltipla escolha (6 ou 8 opções)

**Como Funciona:**
1. Imagem grande com parte faltando
2. Opções de peças embaixo
3. Escolha peça que completa o padrão
4. Não pode voltar

### Ação
- Checkbox: "Compreendo as instruções"
- **Botão "Iniciar Teste"** → `TesteRavenPage.tsx`

---

## 15. TesteRavenPage.tsx

**URL:** `/teste-raven`

### Cabeçalho
- Nome do candidato
- Título: "Teste de Raciocínio Lógico - Matrizes de Raven"

### Barra de Progresso
- Indicador: "Questão X de 60 (Série Y)"
- Barra visual: X%

### Área da Questão

**📌 VERSÃO ATUAL (Implementada):**
- Imagem única em WebP contendo:
  - Matriz principal (com parte faltante)
  - Opções de resposta (6 ou 8 peças numeradas)
- Botões numerados: 1, 2, 3, 4, 5, 6 (ou até 8)
- Candidato clica no número

**❌ VERSÃO DESEJADA (Futura):**
- Imagem grande: Apenas matriz com faltante
- Botões com imagens: Cada botão = peça visual
- Candidato clica diretamente na peça
- Mais intuitivo

### Estrutura de Questões

| Série | Questões | Dificuldade |
|-------|----------|-------------|
| A | 1-12 | Mais fáceis |
| B | 13-24 | - |
| C | 25-36 | Média |
| D | 37-48 | - |
| E | 49-60 | Mais difíceis |

### Navegação
- Botão "Próxima" após selecionar
- Questão 60: Botão "Finalizar Teste"

### Timer Oculto
- Registra tempo total
- Tempo médio esperado: 40-60 min

### Gabarito
- Armazenado no backend
- Usado para calcular score após finalização

### Ação ao Finalizar
1. Compara respostas com gabarito
2. Calcula:
   - Acertos (ex: 45/60)
   - Percentual (75%)
   - Classificação Raven (Percentil)
   - Performance por série
3. Salva no Supabase
4. Dispara webhook n8n:

```json
{
  "candidato_id": "uuid",
  "vaga_id": "uuid",
  "teste": "raven",
  "acertos": 45,
  "total": 60,
  "percentual": 75,
  "tempo_conclusao": "00:42:18",
  "performance_series": {
    "A": 11,
    "B": 10,
    "C": 9,
    "D": 8,
    "E": 7
  }
}
```

5. Redireciona para `ConclusaoTestesPage.tsx`

---

## 16. ManifestoPage.tsx

**URL:** `/manifesto`

**Acesso:**
- Após entrevista presencial
- Candidato recebe computador na clínica
- Link fornecido pelo RH

### Conteúdo

**Instruções:**
- "Leia com atenção nosso manifesto institucional"
- "Reflete nossos valores e cultura"
- "Em seguida, responderá questões"

**Manifesto Beauty Smile:**
- Texto completo (editável em `ConfiguracoesPage.tsx`)
- Seções:
  1. Missão
  2. Visão
  3. Valores (4 principais)
  4. Cultura e Comportamentos
  5. Propósito

- Rich Text formatado
- Tempo leitura: 10-15 min

### Ação
- Checkbox: "Li e compreendi o manifesto"
- **Botão "Entendi e Continuar"** (desabilitado até marcar)
  - Redireciona para `QuestionarioCulturaPage.tsx`

---

## 17. QuestionarioCulturaPage.tsx

**URL:** `/questionario-cultura`

### Cabeçalho
- Nome do candidato
- Título: "Avaliação de Fit Cultural"

### Barra de Progresso
- Indicador: "Questão X de 7"
- Barra visual: X%

### Questão Atual

**Estrutura:**
```
1. [Pergunta dissertativa baseada nos valores]*

[Campo de texto longo com contadores]
```

**Exemplo:**
```
1. Como você demonstraria empatia e acolhimento 
   no atendimento a um paciente ansioso?

[Campo de texto]

Parágrafos: 0/5
Caracteres: 0/1500
```

### Funcionalidades do Campo de Texto

**Contadores Visíveis:**
- Parágrafos: 0 a 5 (máximo)
- Caracteres: 0 a 1500 (máximo)

**❌ PENDÊNCIA: Botão Expandir**
- Seria interessante ter ícone de fullscreen
- Expandir campo para tela cheia
- Melhor experiência de escrita
- **NÃO IMPLEMENTADO AINDA**

### Validações
- Máximo 5 parágrafos
- Máximo 1500 caracteres
- Alerta visual quando limites atingidos

### Total de Questões
- 7 questões (configurável por vaga)

### Navegação
- Questões 1-6: Botão "Próxima"
- Questão 7: Botão "Concluir Avaliação"

### Timer Oculto
- Registra tempo por questão
- Tempo total

### Ação ao Finalizar
1. Salva respostas no Supabase
2. Dispara webhook para n8n:

```json
{
  "candidato_id": "uuid",
  "vaga_id": "uuid",
  "teste": "cultura",
  "respostas": [
    {
      "questao_id": 1,
      "pergunta": "Como você demonstraria...",
      "resposta": "Texto da resposta...",
      "paragrafos": 3,
      "caracteres": 450,
      "tempo_resposta": "00:03:20"
    }
  ],
  "tempo_total": "00:25:15"
}
```

3. n8n faz análise IA:
   - Alinhamento com valores
   - Score de fit cultural
   - Palavras-chave
   - Análise por questão

4. Redireciona para `ConclusaoTestesPage.tsx`

---

## 18. ConclusaoTestesPage.tsx

**URL:** `/conclusao-teste`

### Conteúdo
- Nome do candidato (topo)
- Ícone de Sucesso ✅
- Mensagem: "Formulário/Teste enviado com sucesso!"
- Informações:
  - "Você receberá e-mail de confirmação"
  - "Aguarde nosso contato"
  - "Tempo de resposta: até 5 dias úteis"

### Elementos Adicionais

**❌ PENDÊNCIA: Botão "Meu Perfil"**
- Deveria ter no topo direito
- Redireciona para `MeuPerfilCandidatoPage.tsx`
- Permite trocar senha, ver vagas
- **NÃO IMPLEMENTADO AINDA**

**Observações:**
- Mesma página para conclusão de:
  - Formulário inicial
  - Big Five
  - DISC
  - Raven
  - Cultura
- Mensagem adapta conforme contexto

---

## 19. QuestionarioPage.tsx

**URL:** `/questionario`

**❌ STATUS: PÁGINA SEM FUNÇÃO**
- Criada por erro
- Não tem conteúdo
- Não faz parte do fluxo
- **IGNORAR/DELETAR**

---

## 20. DashboardCandidatoPage.tsx

**URL:** `/dashboard-candidato`

**❌ STATUS: PÁGINA SEM FUNÇÃO**
- Criada por erro
- Não tem utilidade
- Não faz parte do fluxo
- **IGNORAR/DELETAR**

---

## 21. MeuPerfilCandidatoPage.tsx

**URL:** `/meu-perfil-candidato`

**Acesso:** Botão no topo após login

### Seção: Foto e Dados Principais
- Foto de perfil (circular)
- Ícone câmera sobreposto
- Clique para alterar foto
- Upload direto (Supabase Storage)
- Nome, E-mail, Telefone exibidos

### Seção: Dados Pessoais (Editáveis)

**Campos:**
- Nome Completo (editável)
- E-mail (somente leitura - **NÃO** editável)
- Telefone (editável)

### Seção: Alterar Senha

**Campos:**
- Senha Atual* (obrigatório)
- Nova Senha* (mesmos requisitos)
- Confirmar Nova Senha*

**Validações:**
- Senha atual deve estar correta
- Nova senha cumpre requisitos
- Confirmação coincide

### Cards Informativos

**Card 1: Vagas que Você Está Participando**
- Lista vagas aplicadas
- Status cada candidatura:
  - Em análise
  - Aprovado para próxima etapa
  - Aguardando teste
  - Concluído
- Link para cada vaga

**Card 2: Testes Realizados**
```
✅ Formulário Inicial - Concluído
✅ Big Five - Concluído
✅ DISC - Concluído
⏳ Raven - Pendente
⏳ Cultura - Pendente
```

### Ações
- **Botão "Salvar Alterações"** (fixo no rodapé)
  - Salva dados pessoais + senha (se alterada)
  - Toast de sucesso

---

# ÁREA RH/ADMIN

## ELEMENTOS FIXOS (Todas Páginas RH)

### Barra Superior (Navbar)

**Esquerda:**
- Logo Beauty Smile

**Centro:**
- Campo de Busca Global
- Placeholder: "Buscar candidato, vaga..."
- Busca em: nomes, e-mails, títulos
- Autocomplete com sugestões

**Direita:**
- Nome do usuário logado
- Role (Administrador, Recrutador, etc.)
- Dropdown ao clicar:
  - 👤 Meu Perfil → `MeuPerfilPage.tsx`
  - ⚙️ Configurações → `ConfiguracoesPage.tsx`
  - 🚪 Sair (Logout)

### Barra Lateral (Sidebar)

**Menu de Navegação:**
1. 📊 Dashboard → `DashboardRHPage.tsx`
2. 👥 Candidatos → `CandidatosRHPage.tsx`
3. 💼 Vagas → `VagasRHPage.tsx`
4. 🆘 Suporte → `SuporteRHPage.tsx`
5. ⚙️ Configurações → `ConfiguracoesPage.tsx`

**Comportamento:**
- Botão toggle (colapsar/expandir)
- Desktop: Expandida por padrão
- Mobile: Hamburger menu na navbar
- Item ativo destacado
- Expandido: Ícones + texto
- Colapsado: Apenas ícones

---

## 22. LoginRHPage.tsx

**URL:** `/login-rh` ou `/admin/login`

### Campos
- E-mail*
- Senha*
- Checkbox: "Lembrar-me"

### Links
- "Esqueci minha senha" → `EsqueciSenhaPage.tsx` (mesmo fluxo candidato)
- "Não tem acesso? Solicitar credenciais"
  - Abre cliente de e-mail
  - Destinatário: rh@beautysmile.com.br
  - Assunto: "Solicitação de Acesso - Sistema"

### Fluxo Pós-Login
- Verifica role (Admin, Gerente, Recrutador, Visualizador)
- Redireciona para `DashboardRHPage.tsx`

### Segurança
- Autenticação via Supabase Auth
- Sessão com expiração
- Suporta MFA (futuro)

**Observação:**
- **Cadastro RH:** Apenas via Admin na página Usuários
- ❌ **NÃO** existe página pública de cadastro RH

---

## 23. DashboardRHPage.tsx

**URL:** `/dashboard-rh`

### Seção 1: Cards de Resumo (KPIs)

**Card 1: Vagas Ativas**
- Número de vagas status "Ativa"
- Ícone: 💼
- Cor: Azul

**Card 2: Candidatos Cadastrados**
- Total de candidatos
- Ícone: 👥
- Cor: Verde

**Card 3: Candidatos Aprovados**
- Status "Aprovado"
- Ícone: ✅
- Cor: Verde claro

**Card 4: Em Análise**
- Aguardando ação RH
- Ícone: ⏳
- Cor: Amarelo

### Seção 2: Vagas Recentes

**Tabela:**

| Vaga | Candidatos | Em Análise | Aprovados | Ações |
|------|------------|------------|-----------|-------|
| Assistente Odonto | 45 | 12 | 3 | [Gerenciar] |

**Cada linha:**
- Nome da vaga
- Nº candidatos (total)
- Em análise
- Aprovados
- **Botão "Gerenciar"** → Página vaga específica

**Rodapé:**
- Link "Ver Todas" → `VagasRHPage.tsx`

### Seção 3: Candidatos Aguardando Análise

**Card de Candidato:**
```
┌─────────────────────────────┐
│ 👤 Maria Silva              │
│ 📍 São Paulo, SP            │
│ 💼 Assist. Odontológico     │
│ 📊 Score: 85/100            │
│ ⏰ Aplicou há 2 horas       │
│ [Analisar]                  │
└─────────────────────────────┘
```

**Informações:**
- Nome, Cidade/Estado
- Vaga aplicada
- Score geral (se disponível)
- Tempo desde aplicação

**Ações:**
- **Botão "Analisar"** → `PerfilCandidatoRHPage.tsx/[id]`

**Rodapé:**
- Link "Ver Todos" → `CandidatosRHPage.tsx?filtro=aguardando`

---

## 24. CandidatosRHPage.tsx

**URL:** `/candidatos-rh`

### Barra de Ferramentas Superior

**Campo de Busca:**
- Placeholder: "Buscar por nome, e-mail, vaga..."
- Busca em tempo real (debounce 300ms)

**Filtros:**

**1. Por Status:**
- Dropdown multi-select
- Opções:
  - ✅ Ativo
  - 📦 Arquivado
  - ❌ Cancelado

**2. Por Vaga:**
- Dropdown
- Lista vagas ativas
- Multi-select

**3. Por Etapa do Processo:**
- Dropdown multi-select
- Opções:
  - Triagem (Formulário)
  - Teste Big Five
  - Teste DISC
  - Entrevista Online
  - Teste Raven
  - Cultura
  - Entrevista Presencial
  - Aprovado
  - Rejeitado

**4. Por Status de Avaliação:**
- Aprovado
- Pendente
- Rejeitado
- Investigar

**Botões Globais:**
- 🔄 Limpar Filtros
- 📥 Exportar CSV (candidatos filtrados)

### Sistema de Abas (3 Tabs)

#### **TAB 1: TODOS**

Mostra todos candidatos com toggle de visualização.

**Toggle Visualização:**
- 🔲 Cards (padrão)
- 📋 Tabela

---

**VISUALIZAÇÃO: CARDS**

**Controles:**
- **Ordenar por:**
  - Mais Recente (padrão)
  - Mais Antigo
  - Nome A-Z
  - Nome Z-A
  - Maior Score
  - Menor Score

- **Itens por página:**
  - 10, 20, 50

**Card de Candidato:**

```
┌────────────────────────────────┐
│ 👤 Maria Silva         ⭐ [⋮] │
│ 📍 São Paulo, SP               │
│ 💼 Assistente Odonto           │
│ 📊 Score: 85/100 [████░] ⚠️   │
│ ⏰ 2 horas atrás               │
│                                │
│ 🧠 Big Five: 82                │
│ 🎯 DISC: 88                    │
│ 💡 Inteligência: 75            │
│ 🌟 Cultura: 90                 │
│                                │
│ Status: 🟡 Em Análise          │
│                                │
│ [Ver Perfil]                   │
└────────────────────────────────┘
```

**Elementos:**

**⭐ Botão Estrela:**
- Favoritar/desfavoritar
- Favoritos ficam no topo

**[⋮] Menu 3 Pontos:**
- ✅ Aprovar para Próxima Etapa
- ❌ Rejeitar Candidato
- 📝 Adicionar Nota
- 📧 Enviar E-mail
- 💬 Enviar WhatsApp
- 📄 Exportar PDF
- 👁️ Ver Perfil Completo

**Score Geral:**
- 85/100 com barra progresso
- **❌ FALTA** indicador "FALTA" quando testes pendentes

**Scores Individuais:**
- Big Five, DISC, Inteligência, Cultura
- **❌ FALTA** no card (só aparece na tabela)

**Paginação:**
- Rodapé: "Página 1 de 5"
- Botões: ⬅️ Anterior | Próxima ➡️

---

**VISUALIZAÇÃO: TABELA**

**Colunas:**

| Foto | Nome | Cidade/Estado | Vaga | Aplicou | Score | Status | Ações |
|------|------|---------------|------|---------|-------|--------|-------|
| 👤 | Maria | SP, SP | Assist | 2h | 82/100 | 🟡 | [⋮] |

**Coluna "Ações" (Menu 3 Pontos):**
- Mesmas opções do card

**Ordenação:**
- Clique nos cabeçalhos
- Ascendente/descendente

**❌ PENDÊNCIA:**
- Score geral aparece na tabela mas NÃO no card
- Deve aparecer nos dois

---

#### **TAB 2: POR VAGA**

**Seletor de Vaga:**
- Dropdown no topo
- Lista vagas ativas
- Contador: "Assistente Odontológico (45 candidatos)"

**Funil de Etapas:**

```
┌─────────┬─────────┬──────┬──────────┐
│ TRIAGEM │ BIG     │ DISC │ENTREVISTA│
│   45    │ FIVE    │  24  │ ONLINE   │
│         │   32    │      │    12    │
├─────────┼─────────┼──────┼──────────┤
│ [Cards] │ [Cards] │[Cards│ [Cards]  │
└─────────┴─────────┴──────┴──────────┘

┌─────────┬─────────┬──────────┬──────────┐
│  RAVEN  │ CULTURA │ENTREVISTA│APROVADOS │
│    8    │    5    │PRESENCIAL│    2     │
│         │         │    3     │          │
├─────────┼─────────┼──────────┼──────────┤
│ [Cards] │ [Cards] │ [Cards]  │ [Cards]  │
└─────────┴─────────┴──────────┴──────────┘
```

**Cada Coluna:**
- Header: Nome etapa + contador
- Body: Cards candidatos naquela etapa
- Scroll vertical se muitos

**Card Resumido:**
```
┌──────────────┐
│ Maria Silva  │
│ Score: 85/100│
│ Aprovado     │
└──────────────┘
```

**Interações:**
- Clique → Abre perfil candidato

---

#### **TAB 3: KANBAN**

**Filtro de Vaga:**
- **Obrigatório** selecionar vaga (dropdown)
- Mostra apenas candidatos daquela vaga

**Layout:**

```
┌─────────┬─────────┬───────────┬──────────┐
│ TRIAGEM │ TESTES  │ENTREVISTAS│APROVADOS │
│  (15)   │  (10)   │    (5)    │   (2)    │
├─────────┼─────────┼───────────┼──────────┤
│ Card 1  │ Card 1  │  Card 1   │ Card 1   │
│ Card 2  │ Card 2  │  Card 2   │ Card 2   │
│  ...    │  ...    │   ...     │          │
└─────────┴─────────┴───────────┴──────────┘
```

**Colunas:**
1. **Triagem** - Aguardando análise formulário
2. **Testes** - Big Five, DISC, Raven, Cultura
3. **Entrevistas** - Online e Presencial
4. **Aprovados** - Finalizados

**Card Kanban:**
```
┌──────────────────┐
│ 👤 Maria Silva   │
│ 💼 Assist. Odonto│
│ 📊 Score: 85/100 │
│ [████░░░░░░] 80% │
│                  │
│ Status: ✅       │
└──────────────────┘
```

**Drag & Drop:**
- Arrasta card entre colunas
- Sistema atualiza etapa automaticamente
- Confirmação via toast
- Dispara ações:
  - Envia e-mail candidato
  - Registra histórico
  - Atualiza auditoria

**Status por Card:**
- 🟢 Aprovado (verde)
- 🟡 Pendente (amarelo)
- 🔴 Rejeitado (vermelho)
- 🔵 Investigar (azul)

---

## 25. PerfilCandidatoRHPage.tsx

**URL:** `/perfil-candidato-rh/[candidato-id]`

### Cabeçalho da Página

**Botão Voltar:**
- ⬅️ "Voltar para Candidatos"
- Retorna para `CandidatosRHPage.tsx` com filtros preservados

**Informações Principais:**
```
┌──────────────────────────────────────┐
│ 👤 Maria Silva           ⭐ Favorito │
│ 💼 Vaga: Assist. Odontológico        │
│ 📍 São Paulo, SP                     │
│ 📧 maria.silva@email.com             │
│ 📱 (11) 98765-4321                   │
│ 📅 Candidatou: 28/10/2025 às 14:30  │
│                                      │
│ Status: 🟡 Em Avaliação - Big Five  │
│                                      │
│ [Próxima Etapa] [Rejeitar] [Nota]   │
└──────────────────────────────────────┘
```

**Botões de Ação Principal:**

**1. "Próxima Etapa"** (verde)
- Lógica:
  - Triagem → Envia link Big Five
  - Big Five → Envia link DISC
  - DISC → Agenda Entrevista Online
  - Entrevista Online → Envia link Raven
  - Raven → Envia link Cultura
  - Cultura → Agenda Entrevista Presencial
  - Entrevista Presencial → "Aprovado"
- Dispara e-mail automático

**2. "Rejeitar"** (vermelho)
- Abre modal confirmação
- Campo opcional: "Motivo rejeição" (interno)
- Envia e-mail rejeição (template configurável)
- Move para "Rejeitados"

**3. "Adicionar Nota"** (azul)
- Abre modal
- Campo de texto
- Salva nota interna RH

### Seção: Reenviar Links/Convites

**Checkboxes:**
- ☐ Formulário Inicial
- ☐ Manifesto
- ☐ Big Five
- ☐ DISC
- ☐ Entrevista Online
- ☐ Raven
- ☐ Entrevista Presencial
- ☐ Cultura

**Botões:**

**📧 Enviar por E-mail**
- Abre cliente de e-mail
- Assunto e corpo pré-preenchidos
- Links únicos para testes selecionados

**💬 Enviar por WhatsApp**
- Abre WhatsApp Web/App
- Mensagem pré-formatada com links

**Template:**
```
Olá [Nome],

Seguem os links para dar continuidade:

📝 Formulário: [link]
🧠 Big Five: [link]

Att, Equipe Beauty Smile RH
```

### Botões de Contato Rápido

- 📧 **E-mail** → Abre Outlook/Gmail
- 💬 **WhatsApp** → Abre WhatsApp Web

---

### Sistema de Abas (10 Abas)

```
┌────────┬─────────┬────────┬─────┬───────┬────────┬──────┬──────┬────────┬──────┐
│ Visão  │Formulári│Big Five│DISC │Intelig│Cultura │Entre-│Entre-│Históric│Notas │
│ Geral  │         │        │     │(Raven)│        │online│pres. │        │      │
└────────┴─────────┴────────┴─────┴───────┴────────┴──────┴──────┴────────┴──────┘
```

---

### **ABA 1: VISÃO GERAL**

**Bloco 1: Score Geral**

```
┌─────────────────────┐
│ Score Compatibilid. │
│                     │
│      ⚪⚫⚫⚫⚪      │
│     ⚪  85  ⚪     │
│    ⚫ /100  ⚫     │
│     ⚪⚫⚫⚫⚪      │
│                     │
│   🎯 EXCELENTE     │
└─────────────────────┘
```

**Classificação:**
- 90-100: Excelente 🎯
- 80-89: Muito Bom ⭐
- 70-79: Bom ✅
- 60-69: Regular ⚠️
- 0-59: Abaixo ❌

**Bloco 2: Resumo do Processo (Timeline)**

```
✅ Triagem - 28/10 14:30
   Score: 8.5/10

🟡 Big Five - 29/10 10:15
   Aguardando análise

⏳ DISC - Não iniciado

⏳ Entrevista - Não agendada
```

**Bloco 3: Dados Pessoais**

- Nome, E-mail, Telefone
- CPF, Cidade/Estado
- **Botão:** 📄 Baixar Currículo (PDF)

**Bloco 4: Recomendação Geral IA**

```
┌────────────────────────────────┐
│ 🤖 ANÁLISE IA - GERAL          │
├────────────────────────────────┤
│ Compatibilidade: 85/100        │
│                                │
│ Candidata demonstra excelente  │
│ alinhamento. Destaca-se por:   │
│                                │
│ ✅ Alta empatia                │
│ ✅ Perfil organizado           │
│ ✅ Trabalho em equipe          │
│                                │
│ Pontos de Atenção:             │
│ ⚠️ Pouca exp. gestão conflitos│
│                                │
│ 💡 Recomendação:               │
│ APROVAR PARA ENTREVISTA        │
│                                │
│ [Atualizado: 29/10 às 16:45]   │
└────────────────────────────────┘
```

**📌 Observações:**

**Análise IA - Atualizações:**
- **Primeira:** Após formulário inicial
- **Progressiva:** A cada teste completado

**⚠️ DECISÃO A TOMAR:**
- Opção 1: Análise completa atualiza a cada etapa (mais caro)
- Opção 2: Análise parcial por etapa, consolidação final (mais barato)

**Baseada em:**
- Respostas formulário
- Scores testes
- Alinhamento vaga
- Manifesto cultural

---

### **ABA 2: FORMULÁRIO**

**Bloco 1: Análise IA - Triagem**

```
┌────────────────────────────────┐
│ 🤖 ANÁLISE IA - FORMULÁRIO     │
├────────────────────────────────┤
│ Score Triagem: 8.5/10          │
│                                │
│ Candidata apresentou respostas │
│ bem estruturadas e alinhadas.  │
│                                │
│ Destaques:                     │
│ • Experiência em atendimento   │
│ • Conhecimento sistemas        │
│ • Disponibilidade horário      │
│                                │
│ ⏱ Tempo: 18 minutos            │
└────────────────────────────────┘
```

**Bloco 2: Respostas**

```
Q1. Nível de experiência?
✅ 3 a 5 anos

Q2. Experiência atendimento?
✅ Sim, 2 anos recepcionista

Q3. Disponibilidade?
✅ Sim, 8h às 18h

[... continua]
```

**Informações Adicionais:**
- Total perguntas respondidas
- Tempo médio por pergunta
- Palavras-chave IA

---

### **ABA 3: BIG FIVE**

**Bloco 1: Interpretação IA**

```
┌────────────────────────────────┐
│ 🤖 ANÁLISE IA - BIG FIVE       │
├────────────────────────────────┤
│ Score Geral: 82/100            │
│                                │
│ Perfil:                        │
│ • Alta Conscienciosidade       │
│ • Média-Alta Amabilidade       │
│ • Média Extroversão            │
│                                │
│ 🎯 Adequação Vaga:             │
│ Perfil adequado. Organização e │
│ empatia necessárias presentes. │
│                                │
│ ⏱ Tempo: 16 minutos            │
└────────────────────────────────┘
```

**Bloco 2: Resultados por Dimensão**

| Dimensão | Score | Barra | Interpretação |
|----------|-------|-------|---------------|
| 🌟 Abertura | 75/100 | ███████░░░ | Média-Alta |
| 📋 Conscienciosidade | 88/100 | █████████░ | Alta |
| 🎭 Extroversão | 62/100 | ██████░░░░ | Média |
| 💚 Amabilidade | 79/100 | ████████░░ | Alta |
| 😌 Neuroticismo | 45/100 | █████░░░░░ | Baixo (bom) |

**Gráfico Radar:**
```
       Abertura
           |
Neurot. ---+--- Consci.
           |
      Amabil. Extrov.
```

**Bloco 3: Subdivisões por Dimensão**

**Exemplo: Abertura à Experiência**
```
├─ Imaginação: 78/100 ████████░░
├─ Interesse Artístico: 65/100 ███████░░░
├─ Emocionalidade: 72/100 ███████░░░
├─ Aventura: 68/100 ███████░░░
├─ Intelecto: 82/100 ████████░░
└─ Liberalismo: 70/100 ███████░░░
```

Mesma estrutura para as 5 dimensões.

**Bloco 4: Detalhamento**

```
┌────────────────────────────────┐
│ 💪 PONTOS FORTES               │
├────────────────────────────────┤
│ • Alta organização             │
│ • Confiabilidade               │
│ • Empatia e cooperação         │
│ • Estabilidade emocional       │
└────────────────────────────────┘

┌────────────────────────────────┐
│ ⚠️ PONTOS DE ATENÇÃO           │
├────────────────────────────────┤
│ • Precisa incentivo novas      │
│   ideias                       │
│ • Menos confortável situações  │
│   muito sociais                │
└────────────────────────────────┘

┌────────────────────────────────┐
│ 🔍 PONTOS FRACOS               │
├────────────────────────────────┤
│ • Pode ser excessivamente      │
│   cautelosa                    │
│ • Resistência mudanças bruscas │
└────────────────────────────────┘
```

---

### **ABA 4: DISC**

**Bloco 1: Interpretação IA**

```
┌────────────────────────────────┐
│ 🤖 ANÁLISE IA - DISC           │
├────────────────────────────────┤
│ Perfil: IS (Influente-Estável) │
│                                │
│ Características:               │
│ • Comunicativa e empática      │
│ • Trabalha bem em equipe       │
│ • Prefere ambiente estável     │
│ • Orientada para pessoas       │
│                                │
│ 🎯 Adequação:                  │
│ Perfil ideal atendimento.      │
│ Combina comunicação eficaz com │
│ paciência e estabilidade.      │
│                                │
│ ⏱ Tempo: 9 minutos             │
└────────────────────────────────┘
```

**Bloco 2: Resultado por Dimensão**

```
D (Dominância)    ████░░░░░░ 35
I (Influência)    ████████░░ 78
S (Estabilidade)  █████████░ 82
C (Conformidade)  ██████░░░░ 58
```

**Interpretação:**
- D: 35 - Baixa, prefere colaboração
- I: 78 - Alta, comunicativa
- S: 82 - Alta, consistente
- C: 58 - Média, equilibra regras

**Bloco 3: Características**

```
┌────────────────────────────────┐
│ 💪 PONTOS FORTES               │
├────────────────────────────────┤
│ • Comunicação interpessoal     │
│ • Ambiente positivo            │
│ • Paciência atendimento        │
│ • Trabalha bem sob supervisão  │
└────────────────────────────────┘

┌────────────────────────────────┐
│ ⚠️ PONTOS DE ATENÇÃO           │
├────────────────────────────────┤
│ • Pode evitar confrontos       │
│ • Precisa direcionamento claro │
└────────────────────────────────┘

┌────────────────────────────────┐
│ 🔍 PONTOS FRACOS               │
├────────────────────────────────┤
│ • Dificuldade decisões difíceis│
│ • Pode ser influenciada outros │
└────────────────────────────────┘
```

---

### **ABA 5: INTELIGÊNCIA (Raven)**

**Bloco 1: Análise Geral**

```
┌────────────────────────────────┐
│ 📊 RESULTADO - RAVEN           │
├────────────────────────────────┤
│ Acertos: 45 de 60 (75%)        │
│                                │
│ Classificação: MÉDIA-SUPERIOR  │
│                                │
│ Percentil: 85º                 │
│ (Melhor que 85% candidatos)    │
│                                │
│ ⏱ Tempo: 42 minutos            │
└────────────────────────────────┘
```

**Bloco 2: Comparativo**

```
┌────────────────────────────────┐
│ 📈 COMPARAÇÃO                  │
├────────────────────────────────┤
│ Candidata: 75% acertos         │
│ Média geral: 58%               │
│ Top 10%: 80%+                  │
│                                │
│ Status: ACIMA DA MÉDIA ✅      │
└────────────────────────────────┘
```

**Bloco 3: Análise IA**

```
┌────────────────────────────────┐
│ 🤖 ANÁLISE IA                  │
├────────────────────────────────┤
│ Candidata demonstrou capacidade│
│ cognitiva adequada. Score 75%  │
│ indica bom raciocínio lógico.  │
│                                │
│ ✅ Recomendação: ADEQUADA      │
└────────────────────────────────┘
```

**Bloco 4: Desempenho por Série**

| Série | Acertos | Total | % | Dificuldade |
|-------|---------|-------|---|-------------|
| A | 11 | 12 | 92% | ⭐ Fácil |
| B | 10 | 12 | 83% | ⭐⭐ Média |
| C | 9 | 12 | 75% | ⭐⭐ Média |
| D | 8 | 12 | 67% | ⭐⭐⭐ Difícil |
| E | 7 | 12 | 58% | ⭐⭐⭐⭐ Muito |

**Gráfico:**
```
A: ███████████░ 92%
B: ██████████░░ 83%
C: █████████░░░ 75%
D: ████████░░░░ 67%
E: ███████░░░░░ 58%
```

**Bloco 5: Classificação Raven**

```
┌────────────────────────────────┐
│ 📊 CLASSIFICAÇÃO RAVEN         │
├────────────────────────────────┤
│ Percentil 85º = GRAU III SUP   │
│                                │
│ Distribuição:                  │
│ ████ Grau I: 5% (Superior)     │
│ ████ Grau II+: 10%             │
│ ████ Grau II: 15%              │
│ ████ Grau III+: 20% ◄─ VOCÊ   │
│ ████ Grau III: 20%             │
│ ████ Grau IV: 15%              │
│ ████ Grau IV-: 10%             │
│ ████ Grau V: 5%                │
└────────────────────────────────┘
```

**Bloco 6: Interpretação Padrão**

Texto dinâmico baseado no percentil:

```
🎯 O QUE SIGNIFICA ESTE RESULTADO?

Percentil 85% = desempenho melhor 
que 85% das pessoas no teste.

Demonstra:
✅ Capacidade cognitiva acima média
✅ Bom raciocínio lógico/abstrato
✅ Adequada para demandas vaga

Capacidade de:
• Identificar padrões complexos
• Resolver problemas novos
• Aprender novas tarefas facilmente
```

---

### **ABA 6: CULTURA**

**Bloco 1: Análise Geral IA**

```
┌────────────────────────────────┐
│ 🤖 ANÁLISE IA - FIT CULTURAL   │
├────────────────────────────────┤
│ Score Geral: 88/100            │
│                                │
│ Alinhamento: ALTO ⭐⭐⭐⭐      │
│                                │
│ Candidata demonstrou profundo  │
│ entendimento valores Beauty    │
│ Smile. Respostas evidenciam    │
│ genuíno alinhamento empatia,   │
│ qualidade, melhoria contínua.  │
│                                │
│ ⏱ Tempo: 28 minutos            │
└────────────────────────────────┘
```

**Bloco 2: Análise por Questão**

**Estrutura (7 questões):**

```
┌────────────────────────────────┐
│ QUESTÃO 1                      │
├────────────────────────────────┤
│ Como demonstraria empatia?     │
│                                │
│ 📝 RESPOSTA:                   │
│ "Acredito que empatia começa   │
│  em ouvir atentamente..."      │
│ [texto completo]               │
│                                │
│ 🎯 Alinhamento Manifesto: 92%  │
│                                │
│ 🤖 ANÁLISE IA:                 │
│ Resposta demonstra compreensão │
│ profunda empatia aplicada.     │
│                                │
│ 🏷️ CARACTERÍSTICAS:            │
│ ┌─────┬─────────┬────────┐    │
│ │Empat│Acolhimen│Escuta  │    │
│ └─────┴─────────┴────────┘    │
│ ┌─────────┬──────────┐        │
│ │Qualidade│Valorização│        │
│ └─────────┴──────────┘        │
└────────────────────────────────┘
```

Repetir para as 7 questões.

**Bloco 3: Comparação Manifesto**

```
┌────────────────────────────────┐
│ 🎯 ALINHAMENTO VALORES         │
├────────────────────────────────┤
│ Valor 1: Empatia & Acolhimento │
│ ████████████░░░░░░░░ 88%      │
│                                │
│ Valor 2: Qualidade & Excelência│
│ ████████████████░░░░ 85%      │
│                                │
│ Valor 3: Melhoria Contínua     │
│ ██████████████████░░ 92%      │
│                                │
│ Valor 4: Trabalho em Equipe    │
│ ███████████████░░░░░ 79%      │
│                                │
│ ─────────────────────────      │
│ SCORE GERAL: 86%               │
└────────────────────────────────┘

┌────────────────────────────────┐
│ 📊 ALINHAMENTO POR CATEGORIA   │
├────────────────────────────────┤
│ Atendimento Cliente: 90%       │
│ Desenvolvimento Pessoal: 85%   │
│ Cultura Organizacional: 88%    │
│ Postura Profissional: 82%      │
└────────────────────────────────┘
```

---

### **ABA 7: ENTREVISTA ONLINE**

**Bloco 1: Status**

```
┌────────────────────────────────┐
│ 📹 ENTREVISTA ONLINE           │
├────────────────────────────────┤
│ Status: ✅ REALIZADA           │
│ Data: 30/10/2025 às 10:00      │
│ Duração: 35 minutos            │
│ Entrevistador: João Silva      │
│                                │
│ [📧 E-mail] [💬 WhatsApp]      │
└────────────────────────────────┘
```

**Estados Possíveis:**
- ⏳ Não Realizada
- 📅 Agendada (Data: DD/MM HH:MM)
- ✅ Realizada
- ❌ Cancelada (Motivo)

**❌ PENDÊNCIA: Indicadores de Status**
- Seria interessante ter em todas as abas
- Formulário: Não realizado, Aguardando, Realizado
- Big Five: idem
- DISC: idem
- Inteligência: idem
- Cultura: idem
- **NÃO IMPLEMENTADO**

**Bloco 2: Transcrição**

```
┌────────────────────────────────┐
│ 📝 TRANSCRIÇÃO                 │
├────────────────────────────────┤
│ [Campo texto grande - editável]│
│ Cole a transcrição...          │
│                                │
│ [Salvar Transcrição]           │
└────────────────────────────────┘
```

**Funcionalidade:**
1. RH cola transcrição (Otter.ai, Fireflies, Google Meet)
2. Clica "Salvar Transcrição"
3. Salva no Supabase
4. **Dispara webhook n8n**
5. n8n envia para Claude IA

**Bloco 3: Análise IA**

```
┌────────────────────────────────┐
│ 🤖 ANÁLISE IA - ENTREVISTA     │
├────────────────────────────────┤
│ Score: 8.2/10                  │
│                                │
│ 📋 RESUMO:                     │
│ Candidata demonstrou boa       │
│ comunicação, clareza, entusiasm│
│ Experiências alinham com vaga. │
│                                │
│ 💪 PONTOS FORTES:              │
│ • Comunicação clara            │
│ • Experiência relevante        │
│ • Motivação genuína            │
│                                │
│ ⚠️ PONTOS ATENÇÃO:             │
│ • Pouca exp. sistemas          │
│ • Expectativa salário alto     │
│                                │
│ 🎯 RECOMENDAÇÃO:               │
│ AVANÇAR PRÓXIMA ETAPA          │
└────────────────────────────────┘
```

**❌ FALTA IMPLEMENTAR:**
- Campo de análise IA
- Ou resumo da entrevista
- Atualmente só tem transcrição
- **PENDENTE**

**Webhook:**
```json
{
  "candidato_id": "uuid",
  "vaga_id": "uuid",
  "tipo": "entrevista_online",
  "transcricao": "texto completo...",
  "duracao_minutos": 35,
  "timestamp": "2025-10-30T10:00:00Z"
}
```

**n8n Retorna:**
```json
{
  "score": 8.2,
  "resumo": "texto...",
  "pontos_fortes": [...],
  "pontos_atencao": [...],
  "recomendacao": "avançar"
}
```

---

### **ABA 8: ENTREVISTA PRESENCIAL**

**Estrutura IDÊNTICA à Entrevista Online:**

**Bloco 1: Status**
```
Status: 📅 AGENDADA
Data: 05/11/2025 às 14:00
Local: Clínica Centro - Sala 3
Entrevistador: Dr. Carlos Mendes
```

**Bloco 2: Transcrição**
- Campo para colar
- Botão "Salvar Transcrição"

**Bloco 3: Análise IA**
- Mesma estrutura online
- Score, resumo, pontos, recomendação

**❌ FALTA IMPLEMENTAR:**
- Campo análise IA
- **PENDENTE** (igual online)

---

### **ABA 9: HISTÓRICO**

Timeline completa de ações/eventos.

```
┌────────────────────────────────┐
│ 📜 HISTÓRICO COMPLETO          │
├────────────────────────────────┤
│                                │
│ 📅 05/11/2025 - 14:30          │
│ ✅ Aprovado entrevista pres.   │
│ Por: João Silva (Recrutador)   │
│                                │
│ ────────────────────────       │
│                                │
│ 📅 03/11/2025 - 10:15          │
│ 📝 Nota adicionada             │
│ "Candidata educada entrevista" │
│ Por: João Silva                │
│                                │
│ ────────────────────────       │
│                                │
│ 📅 02/11/2025 - 16:45          │
│ ✅ Completou DISC              │
│ Score: 82/100                  │
│                                │
│ ────────────────────────       │
│                                │
│ [continua...]                  │
└────────────────────────────────┘
```

**Tipos de Eventos:**
- ✅ Cadastro criado
- 📝 Formulário preenchido
- ✅ Teste completado (Big Five, DISC, Raven, Cultura)
- 📧 E-mail enviado
- 💬 WhatsApp enviado
- ✅ Aprovado próxima etapa
- ❌ Rejeitado
- 📝 Nota adicionada/editada
- ⭐ Marcado favorito
- 📅 Entrevista agendada
- ✅ Entrevista realizada
- 👤 Perfil visualizado por [Nome RH]

**Informações:**
- Data/hora precisa
- Tipo evento (ícone + texto)
- Responsável (quando aplicável)
- Detalhes relevantes

---

### **ABA 10: NOTAS**

Sistema notas internas RH.

```
┌────────────────────────────────┐
│ 📝 ADICIONAR NOVA NOTA         │
├────────────────────────────────┤
│ [Campo texto grande]           │
│ Digite sua nota...             │
│                                │
│ [Adicionar Nota]               │
└────────────────────────────────┘

┌────────────────────────────────┐
│ 📌 NOTAS ANTERIORES            │
├────────────────────────────────┤
│ ┌────────────────────────┐    │
│ │ 📅 05/11 - 15:45       │    │
│ │ 👤 João Silva          │    │
│ │                        │    │
│ │ "Candidata demonstrou  │    │
│ │  muito interesse."     │    │
│ │                        │    │
│ │ [✏️ Editar] [🗑️ Deletar│    │
│ └────────────────────────┘    │
│                                │
│ [mais notas...]                │
└────────────────────────────────┘
```

**Funcionalidades:**

**1. Adicionar:**
- Campo texto livre
- Sem limite caracteres
- Salva com timestamp + autor
- Aparece no topo

**2. Editar:**
- Abre modal
- Campo pré-preenchido
- Salva alterações
- ❌ **NÃO** mantém histórico edições

**3. Deletar:**
- Modal confirmação
- Exclusão permanente
- Não registra no histórico

**Permissões:**
- ✅ Todos RH veem todas notas
- ✅ Cada usuário edita/deleta suas notas
- ⚠️ Admin edita/deleta qualquer nota

**Observação:**
- Notas são **internas** (candidato nunca vê)
- ❌ **NÃO** há histórico edições
- Não mostra "quem editou" ou "quando editou"

---

**❌ QUESTÃO A DEFINIR: Status do Candidato**

Precisa definir critérios:
- **"Em Avaliação"** = respondeu teste E RH não clicou em próxima/rejeitar?
- **"Aguardando Avaliação"** = outra coisa?
- Quais são todos os status possíveis?
- Como mudam automaticamente?

**Sugestão de Status:**
- Aguardando Resposta (enviou link, não respondeu)
- Em Análise (completou etapa, RH não decidiu)
- Aprovado (para próxima etapa)
- Rejeitado
- Finalizado (processo completo)

---

## 26. VagasRHPage.tsx

**URL:** `/vagas-rh`

### Barra de Ferramentas

**Campo de Busca:**
- Placeholder: "Buscar vaga..."
- Busca: título, área, cidade

**Botão Principal:**
- 📝 **Nova Vaga** (verde, destaque)
  - Redireciona para `CriarEditarVagaPage.tsx`

**Filtro por Status:**
- Dropdown
- Opções:
  - 🟢 Todas
  - ✅ Ativas
  - ⏸️ Inativas
  - 📝 Rascunho

### Lista de Vagas (Cards Grid)

**Layout:**
- 2-3 colunas (responsivo)

**Card de Vaga:**

```
┌──────────────────────────────────┐
│ 💼 Assistente Odonto      [⋮]   │
│                                  │
│ 🟢 ATIVA                         │
│                                  │
│ 📍 São Paulo, SP                 │
│ 💰 CLT - Presencial              │
│ 📅 Publicada há 5 dias           │
│                                  │
│ ──────────────────────           │
│                                  │
│ 👥 Candidatos: 45                │
│ ⏳ Em Análise: 12                │
│ ✅ Aprovados: 3                  │
│                                  │
│ [Gerenciar] [Editar]             │
└──────────────────────────────────┘
```

**Elementos:**

**1. Cabeçalho:**
- Ícone 💼
- Título vaga
- **[⋮] Menu 3 Pontos**

**2. Status Visual:**
- 🟢 ATIVA (verde)
- ⏸️ INATIVA (cinza)
- 📝 RASCUNHO (amarelo)

**3. Informações:**
- Cidade/Estado
- Tipo Contrato + Modalidade
- Tempo desde publicação

**4. Métricas:**
- Total candidatos
- Em análise
- Aprovados

**5. Botões:**

**"Gerenciar"** (primário, azul)
- Vai para página visualização completa vaga
- Mostra landing page, questões, análises
- **❌ PÁGINA NÃO CRIADA AINDA**

**"Editar"** (secundário, cinza)
- Vai para `CriarEditarVagaPage.tsx/[vaga-id]`
- Modo edição, campos pré-preenchidos

---

**Menu 3 Pontos ([⋮]):**

Dropdown ações rápidas:
- ✅ Ativar Vaga (se inativa/rascunho)
- ⏸️ Inativar Vaga (se ativa)
- 📝 Marcar como Rascunho
- 📄 Exportar PDF (landing page + info)
- 🗑️ Arquivar Vaga

**❌ PENDÊNCIA:**
- Menu 3 pontos NÃO TEM FUNCIONALIDADE
- Botão existe mas não faz nada
- **IMPLEMENTAR**

---

**Número de Vagas:**
- Indicador ao lado: "Vagas (15)"

**Paginação:**
- Rodapé: "Mostrando 1-9 de 15 vagas"
- Botões: ⬅️ Anterior | Próxima ➡️

---

## 27. CriarEditarVagaPage.tsx

**URLs:**
- Criar: `/criar-vaga`
- Editar: `/criar-editar-vaga/[vaga-id]`

### Cabeçalho Dinâmico

**Modo Criar:**
```
📝 Nova Vaga
Preencha as informações para criar vaga
```

**Modo Editar:**
```
✏️ Editar Vaga
Altere as informações para atualizar vaga
```

### Sistema de Abas (5 Abas)

```
┌─────────┬────────┬────────┬────────┬────┐
│Informaçõ│Landing │Triagem │Cultura │ IA │
│         │ Page   │        │        │    │
└─────────┴────────┴────────┴────────┴────┘
```

### Botões Ação (Rodapé Fixo)

Sempre visíveis em todas abas:

**[Cancelar]** (cinza)
- Descarta mudanças
- Modal confirmação se houver alterações

**[Salvar Rascunho]** (amarelo)
- Salva status "Rascunho"
- Não fica visível publicamente
- Permite continuar depois

**[Publicar]** (verde, primário)
- Valida campos obrigatórios
- Muda status para "Ativa"
- Gera landing page pública
- Dispara webhook n8n (opcional: notificação)

---

### **ABA 1: INFORMAÇÕES**

Campos básicos da vaga:

| Campo | Tipo | Obrigatório | Observação |
|-------|------|-------------|------------|
| Título da Vaga | Text | Sim | - |
| URL Personalizada (Slug) | Text | Sim | Gerado auto do título, editável |
| Área da Vaga | Dropdown | Sim | Clínico, Comercial, Marketing, RH, TI, Financeiro, Administrativo |
| Cidade | Dropdown | Sim | Lista todas cidades |
| Estado | Dropdown | Sim | UF |
| Tipo de Contrato | Dropdown | Sim | CLT, PJ, Estágio, Temporário, Freelancer |
| Modalidade | Dropdown | Sim | Presencial, Remoto, Híbrido |
| Salário | Number | Sim | R$ com botões +/- |
| Jornada de Trabalho | Dropdown | Sim | 20h, 30h, 40h, 44h/semana, Flexível |
| Status da Vaga | Dropdown | Sim | 🟢 Ativa, ⏸️ Inativa, 📝 Rascunho |

**Validações:**
- Campos com * obrigatórios
- Slug único (não pode duplicar)
- Salário > 0
- Ao alterar título, slug atualiza auto (mas editável)

---

### **ABA 2: LANDING PAGE**

Editar blocos de texto da landing page pública.

**Funcionalidade:**
- Rich Text Editor com barra ferramentas
- Suporta Markdown
- Seleção parcial (formatar parte do texto)

**Barra de Ferramentas:**
- **B** - Negrito
- **I** - Itálico
- **H1 H2 H3** - Tamanhos título
- Lista • (bullets)
- Lista 1. (numerada)

**Campos Editáveis:**

```
1. Título da Vaga*
   [Rich Text Editor]

2. Subtítulo
   [Rich Text Editor]

3. Sobre a Beauty Smile*
   [Rich Text Editor - área grande]

4. O Cargo - O Que Você Vai Fazer*
   [Rich Text Editor - área grande]

5. Suas Principais Responsabilidades*
   [Rich Text Editor - área grande]

6. O Que Você Precisa Ter* (4 sub-blocos)
   6.1 Formação*
       [Rich Text Editor]
   6.2 Experiência*
       [Rich Text Editor]
   6.3 Conhecimentos Técnicos*
       [Rich Text Editor]
   6.4 Habilidades Essenciais*
       [Rich Text Editor]

7. Você É a Pessoa Certa Se...*
   [Rich Text Editor - área grande]

8. Seria Incrível Se Você Tivesse
   [Rich Text Editor - área média]

9. O Que Oferecemos*
   [Rich Text Editor - área grande]

10. Local e Horário de Trabalho*
    [Rich Text Editor - área média]

11. Convite Final
    [Rich Text Editor - área média]
```

**Campos NÃO Editáveis (Fixos):**
- Endereço clínica (vem de `ConfiguracoesPage.tsx` → Empresa)
- Informações contato (vem de Configurações)

**Suporte Markdown:**
- RH pode colar texto Markdown
- Renderiza corretamente
- Exemplo: `**negrito**` → **negrito**

---

### **ABA 3: TRIAGEM**

Criar/editar perguntas formulário inicial.

```
┌────────────────────────────────┐
│ 📋 FORMULÁRIO DE TRIAGEM       │
├────────────────────────────────┤
│                                │
│ Perguntas exibidas no          │
│ formulário inicial.            │
│                                │
│ [➕ Adicionar] [📚 Biblioteca] │
│                                │
│ ──────────────────────         │
│                                │
│ PERGUNTA 1            [❌]     │
│                                │
│ Pergunta*                      │
│ [Qual seu nível experiência?]  │
│                                │
│ Texto de Ajuda                 │
│ [Considere experiência geral...│
│                                │
│ Tipo de Resposta*              │
│ [▼ Dropdown]                   │
│ • Única Escolha                │
│ • Múltipla Escolha             │
│ • Texto Curto                  │
│ • Texto Longo                  │
│ • Numérico                     │
│                                │
│ [SE Única/Múltipla:]           │
│                                │
│ Opções*                        │
│ [Menos 1 ano; 1-3 anos; 3-5;   │
│  Mais 5; Outros]               │
│                                │
│ Separe opções com ;            │
│ "Outros" = campo texto livre   │
│                                │
│ Obrigatória?                   │
│ ☑️ Sim  ☐ Não                 │
│                                │
│ ──────────────────────         │
│                                │
│ [➕ Adicionar Outra]           │
└────────────────────────────────┘
```

**Funcionalidade "Outros":**
- Admin inclui "Outros" na lista
- Candidato seleciona = aparece campo texto
- Exemplo: `(•) Outros: [Tenho 6 meses]`

**❌ PENDÊNCIA: Blocos**

Atualmente perguntas não organizadas em blocos.

**Desejado:**
```
BLOCO 1: Sua Jornada Profissional
[Perguntas 1-5]

BLOCO 2: Tecnologia e Inovação
[Perguntas 6-10]

BLOCO 3: Nossos Valores
[Perguntas 11-15]

BLOCO 4: Upload Currículo
[Campo upload - fixo]
```

**Opções para Implementar:**
1. Ter seletor "Qual bloco?" para cada pergunta
2. OU: Ter abas separadas, uma por bloco

**NÃO IMPLEMENTADO**

**Botão "Usar da Biblioteca":**
- ❌ **NÃO IMPLEMENTADO**
- Ideia: Biblioteca perguntas pré-cadastradas
- RH seleciona prontas
- Acelera criação

**Drag & Drop (Futuro):**
- Arrastar perguntas reordenar
- Visual intuitivo
- **NÃO IMPLEMENTADO**

---

### **ABA 4: CULTURA**

Criar/editar perguntas dissertativas fit cultural.

**Estrutura IDÊNTICA à aba Triagem:**

```
[➕ Adicionar] [📚 Biblioteca]

PERGUNTA 1                [❌]

Pergunta*
[Como demonstraria empatia...]

Texto de Ajuda
[Considere situações reais...]

Tipo de Resposta*
[Texto Longo - FIXO]

Obrigatória?
☑️ Sim (sempre)

──────────────────────

[➕ Adicionar Outra]
```

**Diferenças da Triagem:**
- **Tipo:** Sempre "Texto Longo"
- **Sem opções** de Single/Multiple
- **Sempre obrigatória**

**Gera:** `QuestionarioCulturaPage.tsx`

**Botão "Usar da Biblioteca":**
- ❌ **NÃO IMPLEMENTADO**

**Número de Questões:**
- 7 questões (configurável por vaga)

---

### **ABA 5: IA**

Descrição da vaga para análise IA.

```
┌────────────────────────────────┐
│ 🤖 DESCRIÇÃO PARA ANÁLISE IA   │
├────────────────────────────────┤
│                                │
│ Esta descrição será usada pela │
│ IA para analisar fit candidatos│
│ com a vaga nos testes:         │
│ • Big Five                     │
│ • DISC                         │
│ • Inteligência (Raven)         │
│ • Cultura                      │
│                                │
│ Escreva pensando em agente IA. │
│ NÃO precisa ser completa como  │
│ landing page.                  │
│                                │
│ ──────────────────────         │
│                                │
│ Descrição da Vaga (para IA)*   │
│ [Campo texto grande]           │
│                                │
│ Exemplo:                       │
│ "Buscamos profissional com:    │
│ - Alta organização             │
│ - Empatia excepcional          │
│ - Capacidade trabalho equipe   │
│ - Atenção aos detalhes         │
│ - Adaptabilidade               │
│                                │
│ Contexto: Clínica odontológica │
│ alto padrão. Atendimento       │
│ pacientes ansiosos. Ambiente   │
│ dinâmico."                     │
└────────────────────────────────┘
```

**Objetivo:**
- Texto otimizado para Claude IA
- Destacar soft skills necessárias
- Contexto do ambiente trabalho
- Desafios específicos da vaga

**Usado em:**
- Análise Big Five vs vaga
- Análise DISC vs vaga
- Análise Cultura vs vaga
- Análise Inteligência vs demandas vaga

---

## 28. ConfiguracoesPage.tsx

**URL:** `/configuracoes`

### Sistema de Abas (5 Abas)

```
┌────────┬────────┬───────────┬─────────┬─────────┐
│Empresa │E-mails │Integrações│Usuários │Auditoria│
└────────┴────────┴───────────┴─────────┴─────────┘
```

---

### **ABA 1: EMPRESA**

Dados institucionais:

| Campo | Tipo | Obrigatório |
|-------|------|-------------|
| Nome da Empresa | Text | Sim |
| E-mail de Contato | Email | Sim |
| Telefone do RH | Tel | Sim |
| Site da Empresa | URL | Não |

**Campo Especial: Manifesto**

```
┌────────────────────────────────┐
│ 📜 MANIFESTO INSTITUCIONAL     │
├────────────────────────────────┤
│ [Campo texto muito grande]     │
│                                │
│ Cole aqui o manifesto completo │
│ da Beauty Smile.               │
│                                │
│ Este texto será exibido na     │
│ página ManifestoPage.tsx       │
│                                │
│ Candidatos lerão antes de      │
│ responder questionário cultura.│
└────────────────────────────────┘
```

**Ações:**
- Botão "Salvar Alterações"

---

### **ABA 2: TEMPLATES DE E-MAIL**

Editar templates e-mails automáticos.

**Templates Disponíveis:**

1. Confirmação de Candidatura
2. Convite para Teste
3. Avançou para Próxima Fase
4. Aprovação (Final)
5. Rejeição

**Lista:**

```
┌────────────────────────────────┐
│ 📧 TEMPLATES DE E-MAIL         │
├────────────────────────────────┤
│                                │
│ 1. Confirmação Candidatura     │
│    [Editar]                    │
│                                │
│ 2. Convite para Teste          │
│    [Editar]                    │
│                                │
│ 3. Avançou Próxima Fase        │
│    [Editar]                    │
│                                │
│ 4. Aprovação                   │
│    [Editar]                    │
│                                │
│ 5. Rejeição                    │
│    [Editar]                    │
└────────────────────────────────┘
```

**Ao Clicar "Editar":**

Abre pop-up:

```
┌────────────────────────────────┐
│ ✏️ EDITAR TEMPLATE             │
├────────────────────────────────┤
│                                │
│ Assunto*                       │
│ [Confirmação de Candidatura]   │
│                                │
│ Corpo do E-mail*               │
│ [Campo texto grande]           │
│                                │
│ Olá {nome_candidato},          │
│                                │
│ Recebemos sua candidatura para │
│ a vaga de {nome_vaga}.         │
│                                │
│ Em breve entraremos em contato.│
│                                │
│ Att, Equipe Beauty Smile       │
│                                │
│ ──────────────────────         │
│                                │
│ 💡 Variáveis Disponíveis:      │
│ {nome_candidato}               │
│ {nome_vaga}                    │
│ {link_teste}                   │
│ {data_entrevista}              │
│                                │
│ [Preview] [Salvar] [Cancelar]  │
└────────────────────────────────┘
```

**Funcionalidades:**
- Campo Assunto
- Campo Corpo (texto)
- Variáveis dinâmicas
- **Botão "Preview"** → Visualiza e-mail formatado
- Botão "Salvar Template"

**Templates enviados via n8n**

---

### **ABA 3: INTEGRAÇÕES E WEBHOOKS**

Configurar automações n8n.

```
┌────────────────────────────────┐
│ 🔗 WEBHOOKS N8N                │
├────────────────────────────────┤
│                                │
│ Configure webhooks para enviar │
│ dados e acionar automações.    │
│                                │
│ ──────────────────────         │
│                                │
│ 1. Webhook Big Five            │
│    [https://n8n...bigfive]     │
│    [Salvar]                    │
│                                │
│ 2. Webhook DISC                │
│    [https://n8n...disc]        │
│    [Salvar]                    │
│                                │
│ 3. Webhook Raven               │
│    [https://n8n...raven]       │
│    [Salvar]                    │
│                                │
│ 4. Webhook Cultura             │
│    [https://n8n...cultura]     │
│    [Salvar]                    │
│                                │
│ 5. Webhook Formulário          │
│    [https://n8n...formulario]  │
│    [Salvar]                    │
│                                │
│ 6. Webhook Entrevista Online   │
│    [https://n8n...entrevista]  │
│    [Salvar]                    │
└────────────────────────────────┘
```

**Funcionalidade:**
- Admin cola URL webhook n8n
- Salva no Supabase
- Sistema usa para enviar dados
- n8n processa e retorna análise IA

**Fluxo:**
1. Candidato completa teste
2. Sistema salva no Supabase
3. Sistema envia webhook com dados
4. n8n recebe → envia para Claude IA
5. n8n retorna análise
6. Sistema salva análise no Supabase

**❌ PENDÊNCIA: Webhook Suporte**

Na transcrição menciona webhook para suporte.

- Enviar solicitações suporte para n8n
- n8n faz análise da solicitação
- n8n cadastra no Notion com análise

**NÃO ESTÁ NA LISTA**
- Adicionar webhook para `SuporteRHPage.tsx`

---

### **ABA 4: USUÁRIOS**

Gerenciar usuários RH.

**Cabeçalho:**

```
┌────────────────────────────────┐
│ 👥 GERENCIAR USUÁRIOS          │
├────────────────────────────────┤
│                                │
│ [➕ Criar Novo Usuário]        │
│                                │
│ [🔍 Buscar...]                 │
│                                │
│ Filtro: [▼ Todos]              │
│ • Todos                        │
│ • Ativos                       │
│ • Inativos                     │
└────────────────────────────────┘
```

**Ao Clicar "Criar Novo Usuário":**

Pop-up:

```
┌────────────────────────────────┐
│ ➕ ADICIONAR USUÁRIO           │
├────────────────────────────────┤
│                                │
│ Nome Completo*                 │
│ [João Silva]                   │
│                                │
│ E-mail*                        │
│ [joao.silva@beautysmile.com.br]│
│                                │
│ Nível de Acesso*               │
│ [▼ Dropdown]                   │
│ • Visualizador                 │
│ • Recrutador                   │
│ • Gerente                      │
│ • Administrador                │
│                                │
│ [Cancelar] [Adicionar Usuário] │
└────────────────────────────────┘
```

**Ao Adicionar:**
- Cria usuário no Supabase Auth
- Envia e-mail com link para definir senha
- Adiciona à lista

**Lista de Usuários:**

```
┌────────────────────────────────┐
│ USUÁRIOS CADASTRADOS           │
├────────────────────────────────┤
│                                │
│ 👤 João Silva                  │
│ 📧 joao@beautysmile.com.br     │
│ 🎭 Recrutador                  │
│ 🟢 Ativo                       │
│ [⋮]                            │
│                                │
│ ───────────────────            │
│                                │
│ 👤 Maria Santos                │
│ 📧 maria@beautysmile.com.br    │
│ 🎭 Gerente                     │
│ 🟢 Ativo                       │
│ [⋮]                            │
│                                │
│ [... mais usuários]            │
└────────────────────────────────┘
```

**Menu [⋮] de Opções:**

Dropdown:

**1. Permissões**
- Abre pop-up
- Checkboxes para cada permissão sistema
- Exemplo:
  ```
  ☑️ Visualizar candidatos
  ☑️ Aprovar candidatos
  ☐ Criar vagas
  ☑️ Editar vagas
  ☐ Deletar vagas
  ☑️ Adicionar notas
  ☐ Gerenciar usuários
  ☐ Configurações sistema
  ```
- Botão "Salvar Permissões"

**2. Associar Vagas**
- Abre pop-up
- Lista todas vagas ativas
- Checkboxes
- Usuário só vê vagas/candidatos associados
- Exemplo:
  ```
  ☑️ Assistente Odontológico
  ☐ Recepcionista
  ☑️ Dentista Clínico Geral
  ```
- Botão "Salvar Associações"

**3. Redefinir Senha**
- Envia e-mail com link redefinição
- Link temporário 24h

**4. Desativar**
- Modal confirmação
- Usuário perde acesso
- Mantém histórico
- Pode reativar depois

**5. Excluir**
- Modal confirmação
- **Exclusão permanente**
- Remove histórico (cuidado!)
- **Não recomendado** (melhor desativar)

---

### **ABA 5: AUDITORIA**

Log de todas alterações sistema.

```
┌────────────────────────────────┐
│ 📊 LOG DE AUDITORIA            │
├────────────────────────────────┤
│                                │
│ [🔍 Buscar...]                 │
│                                │
│ Filtro Usuário: [▼ Todos]      │
│ Filtro Ação: [▼ Todas]         │
│ Filtro Vaga: [▼ Todas]         │
│                                │
│ ───────────────────            │
│                                │
│ 📅 02/11/2025 - 15:30          │
│ 👤 João Silva (Recrutador)     │
│ ✅ Aprovou candidato           │
│ 💼 Vaga: Assistente Odonto     │
│ 👥 Candidato: Maria Silva      │
│ 🌐 IP: 192.168.1.100           │
│                                │
│ ───────────────────            │
│                                │
│ 📅 02/11/2025 - 14:20          │
│ 👤 Admin (Administrador)       │
│ 📝 Criou nova vaga             │
│ 💼 Vaga: Recepcionista         │
│ 🌐 IP: 192.168.1.50            │
│                                │
│ ───────────────────            │
│                                │
│ [mais logs...]                 │
│                                │
│ [⬅️ Anterior] [Próxima ➡️]     │
│ Página 1 de 50                 │
└────────────────────────────────┘
```

**Informações Registradas:**
- Data/hora precisa
- Usuário responsável
- Ação realizada
- Vaga relacionada (se aplicável)
- Candidato relacionado (se aplicável)
- IP do usuário

**Tipos de Ação Rastreadas:**
- Criou vaga
- Editou vaga
- Ativou/inativou vaga
- Aprovou candidato
- Rejeitou candidato
- Adicionou nota
- Editou permissões usuário
- Criou usuário
- Desativou usuário
- Alterou configurações
- Editou template e-mail

**Filtros:**
- Por usuário
- Por tipo de ação
- Por vaga
- Por período (data)

---

## 29. MeuPerfilPage.tsx

**URL:** `/meu-perfil-rh`

**Acesso:** Dropdown navbar (Meu Perfil)

### Seção: Foto e Dados

- Foto perfil (circular)
- Ícone câmera sobreposto
- Clique → alterar foto
- Nome, E-mail, Role exibidos

### Seção: Dados Pessoais (Editáveis)

| Campo | Tipo | Editável |
|-------|------|----------|
| Nome Completo | Text | Sim |
| E-mail | Email | Não (somente leitura) |
| Telefone | Tel | Sim |

### Seção: Alterar Senha

**Campos:**
- Senha Atual*
- Nova Senha*
- Confirmar Nova Senha*

**Validações:**
- Senha atual correta
- Nova senha cumpre requisitos
- Confirmação coincide

### Ações

**Botão "Salvar Dados"**
- Salva alterações dados pessoais

**Botão "Alterar Senha"**
- Atualiza senha

**OU**

**Botão "Salvar Todas Alterações"**
- Salva dados + senha (se alterada)

---

## 30. SuporteRHPage.tsx

**URL:** `/suporte-rh`

**Funcionalidade:**
Sistema para RH reportar bugs/dúvidas/melhorias.

### Formulário

```
┌────────────────────────────────┐
│ 🆘 SOLICITAÇÃO DE SUPORTE      │
├────────────────────────────────┤
│                                │
│ Tipo de Solicitação*           │
│ [▼ Dropdown]                   │
│ • Erro                         │
│ • Bug                          │
│ • Dúvida                       │
│ • Melhoria                     │
│ • Outro                        │
│                                │
│ Título*                        │
│ [Sistema não carrega...]       │
│                                │
│ Resumo                         │
│ [Breve descrição...]           │
│                                │
│ Severidade*                    │
│ [▼ Dropdown]                   │
│ • Menor                        │
│ • Afeta o Uso                  │
│ • Impede Funcionamento         │
│ • Sistema Travado              │
│                                │
│ Página Afetada*                │
│ [▼ Dropdown - todas páginas]   │
│ • Dashboard                    │
│ • Candidatos                   │
│ • Vagas                        │
│ • Perfil Candidato             │
│ • ...                          │
│                                │
│ Navegador*                     │
│ [▼ Dropdown]                   │
│ • Google Chrome                │
│ • Mozilla Firefox              │
│ • Safari                       │
│ • Edge                         │
│ • Outro                        │
│                                │
│ Descrição Detalhada*           │
│ [Campo texto grande]           │
│ Descreva o problema...         │
│                                │
│ Anexos                         │
│ [📎 Adicionar Anexo]           │
│                                │
│ [Limpar] [Enviar Solicitação]  │
└────────────────────────────────┘
```

### Ação ao Enviar

**Fluxo Automação:**

1. Sistema envia para n8n via webhook

**Webhook Payload:**
```json
{
  "usuario": "João Silva",
  "email": "joao@beautysmile.com.br",
  "tipo": "bug",
  "titulo": "Sistema não carrega...",
  "severidade": "afeta_uso",
  "pagina": "dashboard",
  "navegador": "chrome",
  "descricao": "Texto completo...",
  "anexos": ["url1", "url2"],
  "timestamp": "2025-11-02T10:00:00Z"
}
```

2. n8n recebe dados

3. n8n envia para Claude IA:
   - "Analise esta solicitação de suporte"
   - "Sugira possível causa do problema"
   - "Sugira possível solução"

4. Claude retorna análise

5. n8n cadastra no Notion:
   - Página no database "Bugs"
   - Campos:
     - Título
     - Tipo
     - Severidade
     - Descrição
     - **Análise IA** (sugestão correção)
     - **Possível Causa** (IA)
     - **Possível Solução** (IA)
     - Status: Pendente
     - Responsável: -
     - Data Criação
   - Anexos vinculados

6. Admin/Dev vê no Notion
   - Já com análise IA
   - Facilita triagem
   - Agiliza correção

**Observação:**
- Solicitações NÃO ficam visíveis no sistema
- Apenas envia para Notion
- RH recebe e-mail confirmação

**❌ PENDÊNCIA:**
- Webhook para suporte NÃO está em `ConfiguracoesPage.tsx`
- Precisa adicionar na aba "Integrações"

---

## 31. VagasPage.tsx

**URL:** `/vagas` (?)

**Observação:**
- Página existe no repositório
- **NÃO** mencionada na transcrição
- Provavelmente duplicata de `VagasRHPage.tsx` ou `VagasPublicasPage.tsx`
- **VERIFICAR** se é necessária

---

# INTEGRAÇÕES E AUTOMAÇÕES

## Sistema de Webhooks

### Webhooks Configurados

Todos configurados em `ConfiguracoesPage.tsx` → Integrações:

1. **Formulário Inicial**
   - Dispara: Ao enviar candidatura
   - Envia: Respostas + currículo + tempo
   - n8n: Análise IA inicial

2. **Big Five**
   - Dispara: Ao finalizar teste
   - Envia: 120 respostas + tempo
   - n8n: Calcula scores + análise IA

3. **DISC**
   - Dispara: Ao finalizar teste
   - Envia: 28 respostas + tempo
   - n8n: Calcula perfil + análise IA

4. **Raven**
   - Dispara: Ao finalizar teste
   - Envia: Respostas + gabarito + tempo
   - n8n: Calcula acertos + análise IA

5. **Cultura**
   - Dispara: Ao finalizar questionário
   - Envia: 7 respostas longas + tempo
   - n8n: Análise IA fit cultural

6. **Entrevista Online**
   - Dispara: Ao salvar transcrição
   - Envia: Texto transcrição + duração
   - n8n: Análise IA + resumo + score

7. **Entrevista Presencial**
   - Dispara: Ao salvar transcrição
   - Envia: Texto transcrição + duração
   - n8n: Análise IA + resumo + score

8. **Suporte** ❌ (FALTA CONFIGURAR)
   - Dispara: Ao enviar solicitação
   - Envia: Dados solicitação
   - n8n: Análise IA + cadastra Notion

---

## Fluxos n8n

### 1. Análise de Testes

**Trigger:** Webhook recebe dados teste

**Steps:**
1. Recebe dados
2. Busca descrição vaga (aba IA)
3. Monta prompt para Claude:
   ```
   Analise este candidato:
   
   Vaga: [descrição IA]
   Teste: [tipo]
   Respostas: [dados]
   
   Forneça:
   - Score geral /100
   - Análise adequação vaga
   - Pontos fortes
   - Pontos atenção
   - Recomendação (aprovar/investigar/rejeitar)
   ```
4. Envia para Claude API
5. Recebe análise
6. Salva no Supabase
7. Retorna confirmação

### 2. E-mails Automáticos

**Trigger:** Ação RH (aprovar, rejeitar, etc.)

**Steps:**
1. Sistema dispara evento
2. n8n identifica template apropriado
3. Busca template em Supabase
4. Substitui variáveis:
   - `{nome_candidato}`
   - `{nome_vaga}`
   - `{link_teste}`
   - `{data_entrevista}`
5. Envia e-mail via provider (SendGrid, etc.)
6. Registra envio no histórico

### 3. Lembretes Entrevistas

**Trigger:** Cron job (diário)

**Steps:**
1. Busca entrevistas próximas 24h
2. Para cada:
   - Envia e-mail RH
   - Envia e-mail candidato
   - Envia WhatsApp RH (link)
   - Envia WhatsApp candidato (link)
3. Marca como "lembrete enviado"

### 4. Suporte → Notion

**Trigger:** Webhook solicitação suporte

**Steps:**
1. Recebe dados solicitação
2. Envia para Claude IA:
   ```
   Analise esta solicitação de suporte:
   
   Tipo: [tipo]
   Página: [página]
   Descrição: [descrição]
   
   Forneça:
   - Possível causa
   - Possível solução
   - Prioridade sugerida
   ```
3. Recebe análise IA
4. Cria página no Notion:
   - Database: "Bugs"
   - Preenche campos
   - Anexa análise IA
5. Envia e-mail confirmação usuário

---

# PENDÊNCIAS E MELHORIAS

## ❌ Páginas Sem Função

**Deletar:**
1. `QuestionarioPage.tsx` - Criada por erro, sem função
2. `DashboardCandidatoPage.tsx` - Criada por erro, sem utilidade

---

## ❌ Funcionalidades Não Implementadas

### FormularioCandidaturaPage.tsx
- [ ] Blocos visualmente separados (4 blocos)
- [ ] Indicador qual bloco candidato está

### QuestionarioCulturaPage.tsx
- [ ] Botão expandir campo texto (fullscreen)

### ConclusaoTestesPage.tsx
- [ ] Botão "Meu Perfil" no topo

### CandidatosRHPage.tsx (Cards)
- [ ] Score geral visível no card
- [ ] Indicador "FALTA" quando testes pendentes

### PerfilCandidatoRHPage.tsx
- [ ] Indicadores de status em todas abas testes
  - Formulário: ⏳/✅
  - Big Five: ⏳/✅
  - DISC: ⏳/✅
  - Inteligência: ⏳/✅
  - Cultura: ⏳/✅
- [ ] Campo análise IA em Entrevista Online
- [ ] Campo análise IA em Entrevista Presencial

### VagasRHPage.tsx
- [ ] Funcionalidade menu 3 pontos [⋮]
  - Ativar/Inativar
  - Marcar Rascunho
  - Exportar PDF
  - Arquivar
- [ ] Página "Gerenciar Vaga" (visualização completa)

### CriarEditarVagaPage.tsx (Aba Triagem)
- [ ] Organização perguntas em blocos
- [ ] Botão "Usar da Biblioteca"
- [ ] Drag & Drop reordenar perguntas

### CriarEditarVagaPage.tsx (Aba Cultura)
- [ ] Botão "Usar da Biblioteca"

### ConfiguracoesPage.tsx (Integrações)
- [ ] Webhook para Suporte

### TesteRavenPage.tsx
- [ ] Versão desejada: Botões com imagens das peças
  - Atualmente: Botões numerados 1-8
  - Desejado: Botões com imagem da peça

---

## ⚠️ Decisões a Tomar

### Status do Candidato

**Definir critérios:**
- [ ] O que significa "Em Avaliação"?
  - Candidato respondeu teste E RH não decidiu?
- [ ] O que significa "Aguardando Avaliação"?
- [ ] Todos status possíveis do candidato
- [ ] Como status mudam automaticamente
- [ ] Quando dispara notificação RH

**Sugestão Status:**
1. Aguardando Resposta (link enviado, não respondeu)
2. Em Análise (completou etapa, RH não decidiu)
3. Aprovado (para próxima etapa)
4. Rejeitado
5. Finalizado (processo completo - aprovado/rejeitado)

### Análise IA - Custo vs Frequência

**Decisão:**
- [ ] Opção 1: Análise completa atualiza a cada etapa (mais caro)
- [ ] Opção 2: Análise parcial por etapa + consolidação final (mais barato)

**Impacto:**
- PerfilCandidatoRHPage.tsx → Aba Visão Geral → Recomendação IA
- Se Opção 1: Recomendação atualiza sempre
- Se Opção 2: Recomendação só completa no final

### Agendamento de Entrevistas

**Pendente:**
- [ ] Sistema de calendário para entrevistas
- [ ] Opções:
  1. Integração Calendly/Google Calendar
  2. Calendário customizado no sistema
  3. Apenas envio manual de links
- [ ] Como candidato agenda?
- [ ] Como RH visualiza agenda?

**Páginas afetadas:**
- PerfilCandidatoRHPage.tsx (agendar entrevistas)
- E-mails automáticos (datas entrevistas)

---

## 🔧 Melhorias Sugeridas

### UX
- [ ] Loading states em todos formulários
- [ ] Skeleton screens ao carregar listas
- [ ] Toasts de confirmação em todas ações
- [ ] Confirmação antes de ações destrutivas
- [ ] Breadcrumbs em páginas RH
- [ ] Atalhos de teclado (ex: Ctrl+S = salvar)

### Performance
- [ ] Lazy loading em listas longas
- [ ] Infinite scroll em vez paginação
- [ ] Cache de imagens candidatos
- [ ] Debounce em campos busca
- [ ] Otimização imagens Raven (WebP otimizado)

### Segurança
- [ ] Rate limiting em formulários
- [ ] Validação backend todos inputs
- [ ] Sanitização campos texto
- [ ] CSP headers
- [ ] Logs tentativas acesso negado

### Acessibilidade
- [ ] ARIA labels todos elementos
- [ ] Navegação por teclado completa
- [ ] Alto contraste
- [ ] Leitores de tela
- [ ] Textos alternativos imagens

### Mobile
- [ ] Versão mobile todas páginas RH
- [ ] Gestos touch (swipe, etc.)
- [ ] Menu hamburguer otimizado
- [ ] Campos responsivos
- [ ] Testes diferentes tamanhos tela

---

## 📊 Métricas Sugeridas

### Analytics (Futuro)
- [ ] Tempo médio por teste
- [ ] Taxa abandono por etapa
- [ ] Taxa conversão triagem → aprovado
- [ ] Scores médios por vaga
- [ ] Vagas com mais candidatos
- [ ] Recrutadores mais ativos
- [ ] Tempo médio processo seletivo

---

## 🔄 Integrações Futuras

### Desejadas
- [ ] WhatsApp Business API (envio direto, não link)
- [ ] Google Calendar (agendamento automático)
- [ ] LinkedIn (puxar dados candidato)
- [ ] ATS externos (BambooHR, Gupy)
- [ ] Slack (notificações RH)
- [ ] Zapier/Make (automações adicionais)

---

## 📝 Observações Finais

### Estrutura Código
- Framework: Next.js 14 (App Router)
- Componentes: TypeScript
- Estilização: Tailwind CSS + shadcn/ui (presumido)
- Estado: React Hooks + Context API (presumido)

### Deploy
- Plataforma: Vercel
- CI/CD: GitHub Actions (presumido)
- Variáveis ambiente: `.env` (Supabase, n8n, Claude API)

### Banco de Dados
- Provider: Supabase (PostgreSQL)
- Auth: Supabase Auth
- Storage: Supabase Storage (currículos, fotos)
- Migrations: Supabase CLI

### Testes
- ❌ Testes não mencionados
- Sugestão: Jest + React Testing Library
- E2E: Playwright/Cypress

---

**FIM DA DOCUMENTAÇÃO**

**Próximos Passos:**
1. Revisar este documento com time
2. Priorizar pendências
3. Definir decisões em aberto
4. Planejar sprints implementação
5. Comparar com análise Claude Code do repositório

---

**Changelog:**
- v2.0 (02/11/2025): Documentação completa baseada em transcrição áudio + estrutura repositório GitHub
