# PRD-1: Guia de Teste Rápido
## Sistema de Cadastro de Candidatos - Beauty Smile

> **⚡ Objetivo**: Testar o fluxo completo em 5 minutos
> **🌐 URL**: http://localhost:3000
> **📋 Use com**: [PRD-1-VERIFICATION-CHECKLIST.md](./PRD-1-VERIFICATION-CHECKLIST.md)

---

## 🎯 Cenário 1: Fluxo Completo de Sucesso (3 min)

### Dados de Teste Pré-Preenchidos

**📋 Copie e cole estes dados:**

#### Passo 1: Dados Pessoais
```
Nome Completo: João da Silva Teste
CPF: 123.456.789-09 (use um válido não cadastrado)
Email: joao.teste@email.com
Telefone: (11) 98765-4321
Data de Nascimento: 01/01/2000
Gênero: Masculino
```

**⚠️ IMPORTANTE**:
- Use um CPF gerado por um gerador online (válido mas não cadastrado)
- Use um email único para cada teste
- Idade deve ser ≥16 anos

---

#### Passo 2: Endereço
```
CEP: 01310-100 (auto-preenche Av. Paulista, São Paulo)
Número: 1500
Complemento: Apto 42
```

**✅ O que esperar**:
- Digitar `01310100` → formata para `01310-100`
- Após 8 dígitos → skeleton loaders aparecem
- Em 1-2 segundos → preenche: "Av. Paulista", "Bela Vista", "São Paulo", "SP"
- Check verde aparece ao lado do CEP

---

#### Passo 3: Dados Profissionais
```
Experiência: 1-3 anos
Escolaridade: Ensino Superior Completo
Instituição: USP
Curso: Odontologia
Ano: 2022
Possui CNH: ✓ (marcar)
Categorias: B (selecionar)
```

---

#### Passo 4: Disponibilidade
```
Turno: Integral
Modelo: Presencial
Disponibilidade Imediata: ✓ (marcar)
Aceita Viajar: ✓
Aceita Mudança: ✗ (deixar desmarcado)
```

---

#### Passo 5: Autorizações
```
☑ Autorizo o tratamento dos meus dados pessoais
☑ Autorizo a análise dos meus dados por IA
☑ Autorizo receber comunicações
☑ Li e concordo com a Política de Privacidade
```

**⚠️ Marque TODOS os 4 checkboxes para habilitar "Finalizar"**

---

### Fluxo Passo a Passo

1. **Abrir**: http://localhost:3000/cadastro
2. **Passo 1**: Colar dados → verificar CPF/Email (checks verdes) → Próximo
3. **Passo 2**: Digitar CEP → aguardar auto-preenchimento → preencher Número → Próximo
4. **Passo 3**: Selecionar dropdowns → marcar CNH categoria B → Próximo
5. **Passo 4**: Selecionar radio buttons → marcar checkboxes → Próximo
6. **Passo 5**: Marcar todos 4 consentimentos → Finalizar
7. **Loading**: Assistir 7 etapas completarem (5-10 segundos)
8. **Sucesso**: Ver mensagem "Cadastro realizado com sucesso!"

**✅ Tempo esperado**: 2-3 minutos

---

## ⚠️ Cenário 2: Validações e Erros (2 min)

### Teste A: CPF/Email Duplicado

**Objetivo**: Verificar que sistema impede cadastros duplicados

1. **Passo 1**: Digite um CPF/Email JÁ cadastrado
2. **Sair do campo** (onBlur)
3. **Esperar**: Spinner → Alerta vermelho
4. **Ver mensagem**: "CPF já cadastrado para: [Nome do Candidato]"
5. **Tentar avançar**: Botão "Próximo" deve estar desabilitado

**✅ Comportamento esperado**: Não permite continuar com duplicados

---

### Teste B: CEP Inválido

**Objetivo**: Testar tratamento de erro do ViaCEP

1. **Passo 2**: Digite CEP `99999-999` (não existe)
2. **Aguardar**: Skeleton loaders → Mensagem de erro
3. **Ver**: "CEP não encontrado"
4. **Resultado**: Campos não são preenchidos, usuário pode digitar manualmente

**✅ Comportamento esperado**: Erro claro, permite continuar manualmente

---

### Teste C: Validações de Campos

**Objetivo**: Testar validação client-side

1. **Email inválido**: Digite `teste@` → Ver erro "Email inválido"
2. **Menor de idade**: Selecione data < 16 anos → Ver erro "Mínimo 16 anos"
3. **Campos vazios**: Tentar avançar sem preencher → Botão desabilitado

**✅ Comportamento esperado**: Validações impedem envio inválido

---

## 🚀 Cenário 3: Features Críticas (2 min)

### 10 Features Mais Importantes para Verificar

**Prioridade Alta:**

1. ✅ **Auto-formatação funciona** (CPF: `000.000.000-00`)
   - Digite: `12345678909`
   - Resultado: `123.456.789-09`

2. ✅ **Duplicate check funciona** (tempo real)
   - Digite CPF → Sair do campo → Ver spinner → Check verde

3. ✅ **ViaCEP auto-preenche** (CEP válido)
   - Digite: `01310100`
   - Resultado: 4 campos preenchidos automaticamente

4. ✅ **Navegação entre passos** mantém dados
   - Preencha Passo 1 → Avança → Volta → Dados preservados

5. ✅ **Progress bar atualiza**
   - Observe barra superior: 0% → 20% → 40% → 60% → 80% → 100%

6. ✅ **Loading states visíveis**
   - Ao finalizar: Dialog com 7 etapas progredindo

7. ✅ **Mensagem de sucesso clara**
   - Após submit: Ver "Cadastro realizado com sucesso!"

8. ✅ **Backgrounds carregam**
   - Verificar imagem de fundo (não cor sólida)
   - Observar transição suave (fade in)

9. ✅ **Responsivo no mobile**
   - DevTools → Responsive → 375px
   - Botões full-width, sem scroll horizontal

10. ✅ **Acessibilidade básica**
    - Navegue com Tab (ordem lógica)
    - Focus visível (outline azul)

---

## ⌨️ Atalhos de Teclado para Teste Rápido

### Navegação
- **Tab** → Próximo campo
- **Shift + Tab** → Campo anterior
- **Enter** → Avançar para próximo passo (quando habilitado)
- **Esc** → Fechar dialogs

### DevTools (Chrome)
- **Cmd/Ctrl + Shift + C** → Inspecionar elemento
- **Cmd/Ctrl + Shift + M** → Toggle device toolbar (responsive)
- **Cmd/Ctrl + Shift + I** → Abrir DevTools

---

## 📱 Teste de Responsividade Rápido

### Desktop (1280px)
```
1. Abrir Chrome DevTools (F12)
2. Responsive Mode (Cmd/Ctrl + Shift + M)
3. Selecionar: "Responsive" → Largura: 1280px
4. Verificar: Container centralizado, margens laterais
```

### Tablet (768px)
```
1. Selecionar: "iPad" ou "Responsive" → 768px
2. Verificar: Layout em 2-3 colunas (não tudo empilhado)
```

### Mobile (375px)
```
1. Selecionar: "iPhone 12" ou "Responsive" → 375px
2. Verificar: Botões full-width, touch targets grandes
3. Verificar: Sem scroll horizontal
```

---

## 🎨 Verificação de Backgrounds

### Como Verificar se Imagens Carregaram

1. **Abrir DevTools** (F12) → Aba "Network"
2. **Filtrar**: Images (ícone de imagem)
3. **Recarregar página**: Cmd/Ctrl + R
4. **Ver**: Requisições para `.webp`, `.jpeg`, `.png`
5. **Status 200**: Imagem carregou com sucesso

**Arquivos esperados:**
- `5feab6fe2a4e5e85a5b01894d30667ea3a06a9d0.webp` (background azul)
- `91b67d31b9aa67c340ac4a375a9832d8c0284448.png` (background dourado)
- `72212e27083bc5aff34e367036bc5f1a36b908b7.jpeg` (background gradiente)

**Visual esperado:**
- ✅ Background com imagem (textura/gradiente visível)
- ❌ Background cor sólida (imagem não carregou)

---

## 🔍 Inspeção Rápida do Console

### Console Limpo = Aplicação Saudável

1. **Abrir Console**: F12 → Aba "Console"
2. **Verificar**:
   - ✅ **0 erros vermelhos** (ideal)
   - ⚠️ **Warnings amarelos**: OK (não críticos)
   - ❌ **Erros vermelhos**: Investigar

**Erros comuns e soluções:**
```
❌ "Failed to load resource: 404" → Arquivo não encontrado
   Solução: Verificar caminho do arquivo

❌ "Network Error" → Backend não responde
   Solução: Verificar conexão Supabase

⚠️ "DevTools: ..." → Warning do React
   Solução: Pode ignorar (não impacta funcionalidade)
```

---

## 📊 Geradores de Dados de Teste

### CPF Válidos (Geradores Online)
- https://www.4devs.com.br/gerador_de_cpf
- https://www.geradordecpf.org

**⚠️ Use CPFs diferentes** para cada teste (evitar duplicados)

### CEPs Reais para Teste
```
01310-100 → Av. Paulista, São Paulo, SP
20040-020 → Centro, Rio de Janeiro, RJ
30130-100 → Belo Horizonte, MG
40015-000 → Salvador, BA
50010-000 → Recife, PE
```

### Emails de Teste
```
Padrão: teste+NUMERO@email.com
Exemplo: teste+001@email.com
         teste+002@email.com
         teste+003@email.com
```
**Dica**: Provedor de email reconhece `+` como alias (todos vão para teste@email.com)

---

## ✅ Checklist Rápido de 1 Minuto

**Teste ultra-rápido para verificar se sistema está funcionando:**

- [ ] Página abre sem erros no console
- [ ] Backgrounds carregam (verificar imagens de fundo)
- [ ] CPF formata enquanto digita
- [ ] CEP `01310-100` auto-preenche endereço
- [ ] Avançar/Voltar mantém dados preenchidos
- [ ] Conclui submissão e vê mensagem de sucesso

**Se todos OK** → ✅ Sistema funcionando!

---

## 🐛 Troubleshooting Rápido

### Problema: Backgrounds não aparecem
**Solução**:
1. Limpar cache: Cmd/Ctrl + Shift + R
2. Verificar console para erros 404
3. Confirmar arquivos existem em `/src/assets/`

### Problema: ViaCEP não funciona
**Solução**:
1. Testar CEP: 01310-100 (sempre funciona)
2. Verificar console para erro de CORS
3. Aguardar 500ms após digitar (debounce)

### Problema: Duplicate check não aparece
**Solução**:
1. **Sair do campo** (onBlur dispara verificação)
2. Aguardar 800ms (debounce)
3. Verificar conexão Supabase

### Problema: Formulário não submete
**Solução**:
1. Verificar todos campos obrigatórios preenchidos
2. Verificar todos consentimentos marcados (Passo 5)
3. Verificar console para erro de validação

---

## 📸 Screenshots Essenciais

**Tire screenshots destas 5 telas para documentação:**

1. ✅ **Passo 1** preenchido (com checks verdes de duplicate)
2. ✅ **Passo 2** após ViaCEP auto-preencher
3. ✅ **Dialog de loading** com etapas progredindo
4. ✅ **Mensagem de sucesso** após conclusão
5. ✅ **Layout mobile** (375px) com botões full-width

---

## 🎓 Dicas de Teste Profissional

### Teste Como Usuário Real
1. **Não use autofill do browser** → Digite manualmente
2. **Varie velocidade de digitação** → Rápido e lento
3. **Teste com erros intencionais** → Campo vazio, formato inválido
4. **Navegue com Tab** → Simule usuário sem mouse
5. **Redimensione janela** → Veja responsividade em ação

### Documentação Visual
1. **Grave screencast** → Cmd/Ctrl + Shift + 5 (macOS) ou OBS
2. **Anote timestamps** → Quando algo acontece
3. **Capture bugs** → Screenshot imediato ao encontrar problema

---

**📌 Próximo passo**: Use o [PRD-1-VERIFICATION-CHECKLIST.md](./PRD-1-VERIFICATION-CHECKLIST.md) para verificação detalhada de todos os 85 itens!

---

**✍️ Testado por**: _______________
**📅 Data**: _______________
**⏱️ Tempo gasto**: _____ minutos
**🐛 Bugs encontrados**: [ ] 0 [ ] 1-3 [ ] 4+
