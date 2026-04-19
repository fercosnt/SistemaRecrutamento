# Correções de Navegação - VagasRHPage

## O Que Foi Corrigido

### Problema Identificado
Você estava testando as páginas erradas porque a navegação não estava funcionando. Os botões em VagasRHPage apenas faziam `console.log` em vez de navegar para as páginas corretas.

### Correções Implementadas

#### 1. Conexão com Banco de Dados
**Arquivo:** `src/components/pages/VagasRHPage.tsx`

**Antes:**
```typescript
// Mock data - dados falsos codificados no arquivo
const vagas: Vaga[] = [
  { id: 1, titulo: 'Assistente Odontológico', ... },
  // ... 12 vagas mockadas
];
```

**Depois:**
```typescript
// Buscar vagas reais do banco de dados usando TanStack Query
const { data: vagasData, isLoading, error } = useVagas();

// Mapear dados do banco para interface do componente
const vagas: Vaga[] = (vagasData?.data || []).map((vagaDB) => {
  // Conversão dos dados do banco para formato do componente
  return {
    id: vagaDB.id,
    titulo: vagaDB.titulo || 'Sem título',
    localizacao: vagaDB.localizacao || 'Não especificado',
    tipoContrato: vagaDB.tipo_vaga || 'CLT',
    modalidade: vagaDB.modelo_trabalho || 'Presencial',
    // ... outros campos
  };
});
```

#### 2. Navegação Funcional
**Arquivo:** `src/components/pages/VagasRHPage.tsx`

**Antes:**
```typescript
const handleGerenciar = (vaga: Vaga) => {
  console.log('Gerenciar candidatos da vaga:', vaga.id); // ❌ Não fazia nada
};

const handleEditar = (vaga: Vaga) => {
  console.log('Editar vaga:', vaga.id); // ❌ Não fazia nada
};
```

**Depois:**
```typescript
const handleGerenciar = (vaga: Vaga) => {
  // ✅ Navega para página de candidatos da vaga
  navigate(`/rh/vagas/${vaga.id}/candidatos`);
};

const handleEditar = (vaga: Vaga) => {
  // ✅ Navega para página de edição
  navigate('/rh/vagas/nova', { state: { vagaId: vaga.id } });
};
```

#### 3. Estados de Loading e Erro
Adicionados estados de carregamento e erro para melhor UX:

```typescript
if (isLoading) {
  return <div>Carregando vagas...</div>;
}

if (error) {
  return <div>Erro ao carregar vagas: {error.message}</div>;
}
```

---

## Como Testar Corretamente

### Fluxo de Navegação Correto

```
Login RH → Dashboard RH → Vagas RH → Vaga Específica → Candidatos da Vaga
   ↓            ↓              ↓              ↓                   ↓
/rh/login   /rh/dashboard   /rh/vagas   [clica Gerenciar]   /rh/vagas/{id}/candidatos
                                                              ↑
                                                  ESTA É A PÁGINA CERTA!
                                              (VagaCandidatosRHPage)
```

### Páginas e Suas Funcionalidades

#### 1. `/rh/vagas` (VagasRHPage) - ✅ AGORA FUNCIONAL
**O que faz:**
- Lista TODAS as vagas do banco de dados
- Permite filtrar por status (Ativas, Inativas)
- Permite buscar por nome/localização
- Botão "Gerenciar" → Navega para `/rh/vagas/{id}/candidatos`
- Botão "Editar" → Navega para edição da vaga

**Como testar:**
1. Faça login como RH
2. Clique em "Vagas" no menu lateral
3. Verifique se as vagas do banco aparecem (não mais dados mock)
4. Use a busca e filtros
5. Clique em "Gerenciar" em uma vaga

#### 2. `/rh/vagas/{id}/candidatos` (VagaCandidatosRHPage) - ✅ JÁ ESTAVA FUNCIONAL
**O que faz:**
- Lista candidaturas de UMA vaga específica
- Botões "Aprovar" e "Rejeitar" → Abrem UpdateStatusModal
- Filtros por status de candidatura
- Busca por nome/email de candidato

**Como testar:**
1. Na página VagasRHPage, clique em "Gerenciar" em uma vaga
2. Você será redirecionado para `/rh/vagas/{UUID}/candidatos`
3. Verá a lista de candidatos que aplicaram para aquela vaga
4. Clique em "Aprovar" ou "Rejeitar" em um candidato
5. O modal UpdateStatusModal abrirá ✅
6. Preencha o formulário e salve

---

## UpdateStatusModal - Onde Ele Está

O modal **UpdateStatusModal** está implementado em:
- **Localização:** `src/components/modals/UpdateStatusModal.tsx`
- **Usado em:** `src/components/pages/VagaCandidatosRHPage.tsx` (linha 377-387)

**Ele SÓ aparece quando:**
1. Você está na página `/rh/vagas/{id}/candidatos`
2. Clica em "Aprovar" ou "Rejeitar" em um candidato

**Ele NÃO aparece quando:**
- Você está em `/rh/vagas` (página de lista de vagas)
- Você está em `/rh/candidatos` (outra página diferente)

---

## Sobre o Webhook N8N

### Para Que Serve o Webhook?

**Arquivo:** `src/features/vagas/services/candidaturasService.ts` (linhas 508-549)

**Propósito:**
O webhook envia notificações automáticas por **email** para os candidatos quando o status da candidatura muda.

**Quando é disparado:**
- Quando você muda o status de uma candidatura (Ex: Aprovar, Rejeitar)
- Quando você marca "Notificar candidato" no modal

**O que ele envia para o N8N:**
```json
{
  "event": "candidatura.status_updated",
  "timestamp": "2025-01-22T10:30:00.000Z",
  "data": {
    "candidatura": {
      "status_anterior": "em_analise",
      "status_novo": "aprovado_proxima",
      "motivo_rejeicao": "Não possui experiência na área" // (se rejeitado)
    },
    "candidato": {
      "email": "candidato@email.com",
      "nome": "João Silva"
    },
    "vaga": {
      "titulo": "Assistente Odontológico",
      "localizacao": "São Paulo, SP"
    }
  }
}
```

**O que o N8N faz:**
1. Recebe o webhook
2. Formata um email baseado no template
3. Envia o email para o candidato informando a mudança de status

**Exemplo de Email Enviado:**
```
Assunto: Atualização sobre sua candidatura - Assistente Odontológico

Olá João Silva,

Sua candidatura para a vaga de Assistente Odontológico em São Paulo, SP
foi atualizada.

Novo status: Aprovado para Próxima Etapa

Em breve entraremos em contato.

Atenciosamente,
Equipe de RH
```

---

## Novo Plano de Testes

### Cenário 1: Testar VagasRHPage (Corrigida)

#### 1.1 Acesso e Dados do Banco
- [ ] Fazer login como RH
- [ ] Clicar em "Vagas" no menu lateral
- [ ] Verificar se a página carrega (sem erro de "undefined")
- [ ] Verificar se as vagas mostradas são do BANCO DE DADOS (não os dados mockados antigos)
- [ ] Verificar o contador de vagas total

#### 1.2 Filtros e Busca
- [ ] Testar filtro "Ativas" - deve mostrar apenas vagas com ativa=true
- [ ] Testar filtro "Inativas" - deve mostrar apenas vagas com ativa=false
- [ ] Testar busca por nome de vaga
- [ ] Testar busca por localização

#### 1.3 Navegação para Candidatos
- [ ] Clicar em "Gerenciar" em uma vaga
- [ ] Verificar se navega para `/rh/vagas/{UUID}/candidatos`
- [ ] Verificar se a página VagaCandidatosRHPage carrega
- [ ] Verificar se o título da vaga aparece no topo

---

### Cenário 2: Testar VagaCandidatosRHPage

#### 2.1 Listagem de Candidatos
- [ ] Verificar se candidatos da vaga aparecem
- [ ] Verificar informações: Nome, Email, Telefone, Status, Etapa
- [ ] Verificar botões "Ver Perfil", "Aprovar", "Rejeitar"

#### 2.2 Abrir Modal de Atualização
- [ ] Clicar em "Aprovar" em um candidato
- [ ] Verificar se modal UpdateStatusModal abre ✅
- [ ] Verificar se mostra nome do candidato
- [ ] Verificar se mostra status atual
- [ ] Verificar se dropdown de novo status funciona

#### 2.3 Atualizar Status - Aprovação
- [ ] Selecionar "Aprovado para Próxima Etapa"
- [ ] Deixar checkbox "Notificar candidato" marcado
- [ ] Clicar em "Salvar Alterações"
- [ ] Verificar se modal fecha
- [ ] Verificar se lista atualiza com novo status
- [ ] Verificar se webhook foi enviado (logs do N8N)

#### 2.4 Atualizar Status - Rejeição
- [ ] Clicar em "Rejeitar" em outro candidato
- [ ] Selecionar "Rejeitado"
- [ ] Verificar se campo "Motivo da Rejeição" aparece (obrigatório)
- [ ] Tentar salvar SEM preencher motivo → deve mostrar erro
- [ ] Preencher motivo: "Não possui experiência necessária"
- [ ] Salvar
- [ ] Verificar se webhook foi enviado com motivo de rejeição

#### 2.5 Validações
- [ ] Tentar salvar sem selecionar novo status → deve mostrar erro
- [ ] Tentar selecionar mesmo status atual → deve mostrar erro
- [ ] Verificar que status final (rejeitado, finalizado) não permite transições

---

## Diferenças Entre as Páginas

| Aspecto | VagasRHPage | VagaCandidatosRHPage |
|---------|-------------|----------------------|
| **URL** | `/rh/vagas` | `/rh/vagas/{id}/candidatos` |
| **O que mostra** | Lista de VAGAS | Lista de CANDIDATOS de UMA vaga |
| **Filtros** | Por status da vaga | Por status da candidatura |
| **Botões** | Gerenciar, Editar, ... | Ver Perfil, Aprovar, Rejeitar |
| **Modal** | Nenhum | UpdateStatusModal ✅ |
| **Webhook** | Não | Sim (ao mudar status) |

---

## Status Atual

### ✅ O Que Está Funcionando

1. **VagasRHPage conectada ao banco de dados**
   - Dados reais substituíram dados mock
   - Loading e error states implementados

2. **Navegação implementada**
   - Botão "Gerenciar" → `/rh/vagas/{id}/candidatos` ✅
   - Botão "Editar" → `/rh/vagas/nova` ✅

3. **VagaCandidatosRHPage (já estava pronta)**
   - Lista candidatos de uma vaga
   - Filtros por status funcionam
   - Botões Aprovar/Rejeitar funcionam

4. **UpdateStatusModal (já estava pronto)**
   - Abre corretamente
   - Validações funcionam
   - Integração com banco funciona
   - Webhook N8N funciona

### ⚠️ Ainda Falta Implementar (TODO)

1. Contadores de candidatos por status em VagasRHPage
   - Atualmente mostra 0 em "Em Análise" e "Aprovados"
   - Precisa contar candidaturas por status de cada vaga

2. Página de edição de vaga
   - `/rh/vagas/nova` em modo edição

3. Toggle pausar/ativar vaga
   - Botão existe mas apenas faz console.log

4. Duplicar vaga
   - Botão existe mas apenas faz console.log

5. Arquivar vaga
   - Botão existe mas apenas faz console.log

---

## Próximos Passos

1. **Testar o fluxo completo novamente** seguindo este guia
2. **Anotar resultados** no plano de testes
3. **Reportar qualquer erro** encontrado
4. Se tudo funcionar, marcar **Tarefa 10 como concluída** no TaskMaster

---

## Comandos Úteis

### Iniciar aplicação em desenvolvimento:
```bash
npm run dev
```

### Verificar logs do servidor (para debug):
```bash
# No console do navegador (F12)
# Veja requisições na aba Network
```

### Verificar webhook N8N:
- Acesse painel do N8N
- Veja workflows ativos
- Confira logs de execução
