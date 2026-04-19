# PRD-1: Checklist de Verificação Manual
## Sistema de Cadastro de Candidatos - Beauty Smile

> **Última atualização**: 06/11/2025
> **Status**: ✅ Todas as 9 tarefas implementadas
> **Ambiente de teste**: http://localhost:3000

---

## 📋 Como Usar Este Checklist

1. Abra o sistema no navegador em http://localhost:3000
2. Navegue até a página de cadastro de candidatos
3. Marque cada item com `[x]` conforme você verifica
4. Anote problemas encontrados na seção "Problemas Encontrados" no final

---

## ✅ Passo 1: Dados Pessoais (9 itens)

### Campos e Validações
- [ ] **Campo Nome Completo** aceita entrada de texto
- [ ] **Campo CPF** formata automaticamente para `000.000.000-00` enquanto digita
- [ ] **Verificação de CPF duplicado** mostra ícone de loading → check verde (único) ou alerta vermelho (duplicado)
- [ ] **Campo Email** valida formato correto (nome@dominio.com)
- [ ] **Verificação de Email duplicado** mostra ícone de loading → check verde (único) ou alerta vermelho (duplicado)
- [ ] **Campo Telefone** formata automaticamente para `(11) 98765-4321`
- [ ] **Campo Data de Nascimento** abre date picker e valida idade ≥16 anos
- [ ] **Campo Gênero** dropdown com 4 opções (Masculino, Feminino, Outro, Prefiro não informar)
- [ ] **Botão Próximo** fica desabilitado até todos campos obrigatórios preenchidos

⚠️ **Pontos críticos**: CPF e Email devem verificar duplicados em tempo real (onBlur)

---

## ✅ Passo 2: Endereço (10 itens)

### Integração ViaCEP
- [ ] **Campo CEP** formata automaticamente para `00000-000`
- [ ] **Digitando 8 dígitos** dispara busca automática no ViaCEP (aguarda 500ms de debounce)
- [ ] **Durante busca** exibe skeleton loaders nos campos (Logradouro, Bairro, Cidade, Estado)
- [ ] **Busca com sucesso** preenche automaticamente 4 campos: Logradouro, Bairro, Cidade, Estado
- [ ] **Ícone de sucesso** (check verde) aparece ao lado do CEP após preenchimento
- [ ] **CEP não encontrado** (ex: 99999-999) exibe mensagem de erro clara

### Campos do Formulário
- [ ] **Campo Logradouro** é editável mesmo após auto-preenchimento
- [ ] **Campo Número** é obrigatório (campo de texto livre)
- [ ] **Campo Complemento** é opcional
- [ ] **Select Estado** exibe todas as 27 UFs brasileiras

⚠️ **Teste obrigatório**: CEP válido `01310-100` deve preencher "Av. Paulista, Bela Vista, São Paulo, SP"

---

## ✅ Passo 3: Dados Profissionais (8 itens)

### Campos de Formação
- [ ] **Select Experiência** tem 5 opções (Nenhuma, Menos de 1 ano, 1-3 anos, 3-5 anos, Mais de 5 anos)
- [ ] **Select Escolaridade** tem 9 opções (Fundamental Incompleto até Doutorado)
- [ ] **Campo Instituição de Ensino** aceita texto livre (opcional)
- [ ] **Campo Curso** aceita texto livre (opcional)
- [ ] **Campo Ano de Conclusão** aceita 4 dígitos numéricos (opcional)

### CNH Condicional
- [ ] **Checkbox "Possui CNH"** revela/oculta seleção de categorias
- [ ] **Quando marcado** exibe botões para 9 categorias (A, B, C, D, E, AB, AC, AD, AE)
- [ ] **Permite múltipla seleção** de categorias de CNH

---

## ✅ Passo 4: Disponibilidade (6 itens)

### Preferências de Trabalho
- [ ] **Radio buttons Turno** com 4 opções (Manhã, Tarde, Noite, Integral)
- [ ] **Radio buttons Modelo** com 3 opções (Presencial, Remoto, Híbrido)
- [ ] **Checkbox Disponibilidade Imediata** revela/oculta campo de data
- [ ] **Campo Data de Disponibilidade** aparece apenas se "Imediata" = false
- [ ] **Checkbox Aceita Viajar** marca/desmarca
- [ ] **Checkbox Aceita Mudança** marca/desmarca

---

## ✅ Passo 5: Autorizações LGPD (5 itens)

### Consentimentos
- [ ] **4 checkboxes de consentimento** visíveis com descrições detalhadas
- [ ] **Todos checkboxes** começam desmarcados
- [ ] **Link "Política de Privacidade"** abre em nova aba
- [ ] **Informações do Encarregado de Dados** visíveis (contato DPO)
- [ ] **Botão Finalizar** só habilita quando todos consentimentos marcados

⚠️ **LGPD compliance**: Todos os 4 consentimentos são obrigatórios

---

## 🧭 Navegação do Formulário (8 itens)

### Controles de Navegação
- [ ] **Botão Próximo** avança para próximo passo
- [ ] **Botão Voltar** retorna ao passo anterior mantendo dados preenchidos
- [ ] **Indicadores de passo** (círculos numerados 1-5) mostram progresso
- [ ] **Barra de progresso** preenche conforme avança (0% → 100%)
- [ ] **Passos concluídos** exibem ícone de check ✓
- [ ] **Passo atual** tem destaque visual (cor diferente)
- [ ] **Clique em passo concluído** navega de volta (dados persistem)
- [ ] **Clique em passo futuro** não funciona (precisa completar atual)

---

## 🔤 Auto-Formatação (3 itens)

### Máscaras de Entrada
- [ ] **CPF**: `12345678901` → `123.456.789-01`
- [ ] **Telefone**: `11987654321` → `(11) 98765-4321`
- [ ] **CEP**: `01310100` → `01310-100`

---

## 🔍 Verificação de Duplicados (7 itens)

### Comportamento em Tempo Real
- [ ] **CPF onBlur** dispara verificação (spinner visível)
- [ ] **CPF único** exibe check verde
- [ ] **CPF duplicado** exibe alerta vermelho + nome do candidato existente
- [ ] **Email onBlur** dispara verificação (spinner visível)
- [ ] **Email único** exibe check verde
- [ ] **Email duplicado** exibe alerta vermelho + nome do candidato existente
- [ ] **Com duplicado** não permite submissão do formulário

⚠️ **Teste com**: CPF e email já cadastrados no banco devem ser rejeitados

---

## ⏳ Estados de Loading (8 itens)

### Feedback Visual
- [ ] **Botão Finalizar** muda para "Finalizando..." com spinner durante submit
- [ ] **Dialog "Processando cadastro..."** abre após clicar Finalizar
- [ ] **7 etapas visíveis** no dialog: (1) Validação, (2) Criando usuário, (3) Salvando dados pessoais, (4) Salvando endereço, (5) Salvando dados profissionais, (6) Salvando disponibilidade, (7) Enviando para análise
- [ ] **Cada etapa** transita: pending (círculo cinza) → loading (spinner) → success (check verde)
- [ ] **Barra de progresso** preenche conforme etapas completam
- [ ] **Skeleton loaders** aparecem durante busca de CEP
- [ ] **Ao concluir** dialog mostra mensagem de sucesso
- [ ] **Link "Ir para Login"** visível na mensagem de sucesso

---

## ❌ Tratamento de Erros (8 itens)

### Validações e Mensagens
- [ ] **Campos vazios obrigatórios** exibem mensagem de erro embaixo do campo
- [ ] **Email inválido** (ex: teste@) mostra "Email inválido"
- [ ] **Menor de 16 anos** mostra "Você deve ter pelo menos 16 anos"
- [ ] **Senha fraca** (se aplicável) mostra requisitos não atendidos
- [ ] **CPF duplicado** mostra erro específico com nome do candidato
- [ ] **Email duplicado** mostra erro específico com nome do candidato
- [ ] **Erro de rede** mostra mensagem amigável (não código técnico)
- [ ] **Botão reabilita** após erro para permitir nova tentativa

---

## 📱 Responsividade - Mobile 375px (7 itens)

### Layout e Touch Targets
- [ ] **Sem scroll horizontal** em tela 375px de largura
- [ ] **Botões full-width** ocupam toda largura disponível
- [ ] **Touch targets ≥44x44px** (iOS guidelines) - botões fáceis de tocar
- [ ] **Texto legível** sem necessidade de zoom
- [ ] **Inputs full-width** com padding adequado
- [ ] **Sem elementos sobrepostos** ou cortados
- [ ] **Navegação fácil** (prev/next visíveis e grandes)

⚠️ **Teste em**: Chrome DevTools → Responsive → iPhone 12 (390px)

---

## 📱 Responsividade - Tablet 768px (2 itens)

### Layout Intermediário
- [ ] **Grid 2-3 colunas** onde aplicável (não tudo em coluna única)
- [ ] **Layout centralizado** com margens apropriadas

---

## 💻 Responsividade - Desktop 1280px+ (3 itens)

### Layout Amplo
- [ ] **Container max-width** (max-w-4xl) centralizado
- [ ] **Margens laterais** visíveis (px-6 ou mais)
- [ ] **Todas features visíveis** sem scroll excessivo

---

## ♿ Acessibilidade (8 itens)

### Navegação e Semântica
- [ ] **Todos inputs têm labels** visíveis
- [ ] **Tab order lógico** (esquerda→direita, cima→baixo)
- [ ] **Focus indicators** visíveis (outline azul ao focar com Tab)
- [ ] **Enter submete** formulário no último campo
- [ ] **Keyboard navega** todos controles (sem necessidade de mouse)
- [ ] **Mensagens de erro** anunciadas (para screen readers)
- [ ] **Cores com contraste** adequado (WCAG AA)
- [ ] **Ícones não são** único indicador (sempre com texto/label)

---

## 🎨 Backgrounds Carregando (NOVO - 3 itens)

### Imagens de Fundo
- [ ] **Background azul escuro** (.webp) carrega corretamente na página principal
- [ ] **Background dourado** (.png) carrega corretamente onde aplicável
- [ ] **Background gradiente** (.jpeg) carrega corretamente onde aplicável
- [ ] **Placeholder animado** aparece enquanto imagem carrega (gradiente pulsante)
- [ ] **Transição suave** (fade in) quando imagem termina de carregar

⚠️ **Se não carregar**: Verificar console do browser para erros de carregamento

---

## ✨ Fluxo Completo de Sucesso (5 itens)

### Teste End-to-End
- [ ] **Preencher todos 5 passos** com dados válidos
- [ ] **Submeter com sucesso** (todas 7 etapas completam)
- [ ] **Ver mensagem de sucesso** com email de confirmação mencionado
- [ ] **Ver próximos passos** (teste Big Five em 24h)
- [ ] **Clicar "Ir para Login"** navega para página de login

---

## 📊 Resumo de Verificação

**Total de itens**: 85
**Verificados**: [ ] / 85
**Problemas encontrados**: [ ] Nenhum

---

## 🐛 Problemas Encontrados

*Use esta seção para anotar qualquer problema durante os testes:*

1.
2.
3.

---

## 📸 Screenshots Recomendados

*Tire screenshots destas telas chave para documentação:*

- [ ] Passo 1 preenchido com validação de duplicados
- [ ] Passo 2 após auto-preenchimento do CEP
- [ ] Dialog de progresso durante submissão
- [ ] Mensagem de sucesso final
- [ ] Layout mobile (375px)
- [ ] Layout desktop (1280px)

---

## ✅ Critérios de Aceitação Final

Para considerar o PRD-1 **100% completo**, todos estes devem estar funcionando:

1. ✅ **Formulário multi-step** (5 passos) com navegação
2. ✅ **Validação client-side** (Zod + React Hook Form)
3. ✅ **Auto-formatação** (CPF, Telefone, CEP)
4. ✅ **ViaCEP integration** com auto-preenchimento
5. ✅ **Duplicate check** em tempo real (CPF + Email)
6. ✅ **Supabase Auth** criando usuário
7. ✅ **Multi-table transaction** (5 tabelas atomicamente)
8. ✅ **N8N webhook** disparado após cadastro
9. ✅ **Visual feedback** (loading, progress, success)
10. ✅ **Responsive design** (mobile-first)
11. ✅ **Backgrounds** carregando corretamente
12. ✅ **E2E tests** (12 testes Playwright passando)

---

**✍️ Testado por**: _______________
**📅 Data**: _______________
**✅ Status final**: [ ] Aprovado [ ] Reprovado (ver problemas)
