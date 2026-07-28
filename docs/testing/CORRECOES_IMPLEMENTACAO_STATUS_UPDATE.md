# Correções Realizadas - Sistema de Atualização de Status

**Data:** 2025-01-22  
**Task:** PRD-0005 - Task 10  
**Status:** ✅ Correções Aplicadas

---

## 🔧 Problemas Identificados e Corrigidos

### 1. ✅ Erro 400 na Query de Candidaturas

**Problema:**
- Query estava tentando ordenar por campos relacionados (`candidato.nome_completo` e `vaga.titulo`)
- Supabase não permite ordenação por campos de tabelas relacionadas em queries com joins

**Correção:**
- Alterado ordenação para usar `data_candidatura` em vez de campos relacionados
- Arquivo: `src/features/vagas/services/candidaturasService.ts`
- Linhas corrigidas: 712 e 974

**Antes:**
```typescript
case 'vaga':
  query = query.order('candidato.nome_completo', { ascending: true })
  break
```

**Depois:**
```typescript
case 'vaga':
  // Ordena por data de candidatura (não podemos ordenar por campo relacionado no Supabase)
  query = query.order('data_candidatura', { ascending: false })
  break
```

---

### 2. ✅ Campo de Motivo de Rejeição Incorreto

**Problema:**
- Código estava usando `motivo_rejeicao` mas o banco de dados usa `feedback_rejeicao`
- Isso causaria erro ao tentar atualizar o motivo de rejeição

**Correção:**
- Mapeamento correto do campo no update
- Arquivo: `src/features/vagas/services/candidaturasService.ts`
- Linha corrigida: 808

**Antes:**
```typescript
...(motivo_rejeicao && { motivo_rejeicao }),
```

**Depois:**
```typescript
...(motivo_rejeicao && { feedback_rejeicao: motivo_rejeicao }),
```

**Nota:** O TypeScript continua usando `motivo_rejeicao` como nome do parâmetro (isso está correto), mas na hora de salvar no banco, mapeia para `feedback_rejeicao`.

---

## ✅ Verificações Realizadas

### Campos do Banco de Dados
- ✅ Campo `status` existe e está correto (não `status_candidatura`)
- ✅ Campo `feedback_rejeicao` existe e está correto
- ✅ Enum `status_candidatura` está correto com valores: `aguardando_resposta`, `em_analise`, `aprovado_proxima`, `rejeitado`, `finalizado`, `desistente`

### Implementação do Modal
- ✅ `UpdateStatusModal.tsx` está usando os campos corretos
- ✅ Validações de transição de status estão corretas
- ✅ Validação de motivo de rejeição obrigatório está funcionando

### Webhook N8N
- ✅ URL do webhook está correta: `https://fernandocosta.app.n8n.cloud/webhook/status-candidatura`
- ✅ Payload está sendo construído corretamente com `status_anterior` e `status_novo`
- ✅ Campo `motivo_rejeicao` está sendo incluído no payload quando necessário

---

## 📋 Próximos Passos para Teste

1. **Testar Query de Candidaturas:**
   - Acessar `/rh/vagas`
   - Clicar em "Gerenciar" em uma vaga
   - Verificar se a lista de candidatos carrega sem erro 400

2. **Testar Atualização de Status:**
   - Abrir modal de atualização de status
   - Selecionar novo status
   - Verificar se salva corretamente no banco

3. **Testar Motivo de Rejeição:**
   - Selecionar status "Rejeitado"
   - Preencher motivo de rejeição
   - Verificar se salva no campo `feedback_rejeicao` do banco

4. **Testar Webhook N8N:**
   - Atualizar status com notificação marcada
   - Verificar logs do console para webhook
   - Verificar se email é enviado ao candidato

---

## 🔍 Arquivos Modificados

1. `src/features/vagas/services/candidaturasService.ts`
   - Correção de ordenação em `listCandidaturasByVaga` (linha 974)
   - Correção de ordenação em `listCandidaturas` (linha 712)
   - Correção de mapeamento de campo `motivo_rejeicao` → `feedback_rejeicao` (linha 808)

---

## ⚠️ Observações Importantes

1. **Ordenação por Campos Relacionados:**
   - Supabase não suporta ordenação direta por campos de tabelas relacionadas
   - Se necessário ordenar por nome do candidato, seria preciso fazer isso no frontend após receber os dados

2. **Nomenclatura de Campos:**
   - O TypeScript usa `motivo_rejeicao` como nome do parâmetro (mais legível)
   - O banco de dados usa `feedback_rejeicao` (nome do campo real)
   - O serviço faz o mapeamento correto entre os dois

3. **Status vs Status Candidatura:**
   - O campo no banco é `status` (não `status_candidatura`)
   - O enum é `status_candidatura` (tipo TypeScript)
   - O código está usando corretamente `status` nas queries

---

## ✅ Checklist de Validação

- [x] Erro 400 corrigido na query de candidaturas
- [x] Campo `feedback_rejeicao` mapeado corretamente
- [x] Ordenação corrigida para não usar campos relacionados
- [x] Webhook N8N configurado corretamente
- [x] Validações do modal verificadas
- [ ] Teste manual completo realizado
- [ ] Webhook N8N testado e funcionando
- [ ] Email de notificação testado

---

**Próxima Ação:** Realizar testes manuais conforme o documento `PLANO_TESTES_STATUS_UPDATE.md`








