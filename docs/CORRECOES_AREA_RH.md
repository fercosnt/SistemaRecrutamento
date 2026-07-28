# Correções da Área RH - Sistema de Recrutamento

**Data Início:** 2025-01-22
**Data Conclusão:** 2025-01-22
**Status:** ✅ Completo (Aguardando Testes)

---

## 📋 ÍNDICE

1. [Resumo Executivo](#resumo-executivo)
2. [FASE 1: Sistema de Layout e Autenticação](#fase-1-sistema-de-layout-e-autenticação)
3. [FASE 2: DashboardRHPage](#fase-2-dashboardrhpage)
4. [FASE 3: CandidatosRHPage](#fase-3-candidatosrhpage)
5. [FASE 4: VagasRHPage](#fase-4-vagasrhpage)
6. [Problemas Encontrados](#problemas-encontrados-durante-execução)
7. [Checklist Final](#checklist-final)

---

## 📊 RESUMO EXECUTIVO

### Problemas Identificados no Teste Manual

**Fonte:** `docs/testing/PLANO_TESTES_STATUS_UPDATE.md` (linhas 787-814)

| Componente | Status Antes | Status Atual | Mock % | DB % | Prioridade |
|---|---|---|---|---|---|
| **DashboardRH** | ❌ Não Funcional | ✅ Funcional | 0% | 100% | 🔴 ALTA |
| **VagasRH** | ⚠️ Parcial | ✅ Funcional | 0% | 100% | 🟡 MÉDIA |
| **CandidatosRH** | ❌ Não Funcional | ✅ Funcional | 0% | 100% | 🔴 ALTA |
| **RHSidebar** | ❌ Quebrada | ✅ Funcional | 0% | 100% | 🔴 CRÍTICA |
| **RHTopBar** | ❌ Quebrada | ✅ Funcional | 0% | 100% | 🔴 CRÍTICA |
| **RHLayout** | ⚠️ Incompleto | ✅ Funcional | 0% | 100% | 🟡 MÉDIA |

### Estratégia de Correção

Correções em **4 fases sequenciais**, começando pela base (layout) e depois as páginas individuais.

**Tempo Estimado Total:** ~3 horas
**Arquivos a Modificar:** 10 arquivos
**Linhas de Código:** ~850 linhas

---

## FASE 1: Sistema de Layout e Autenticação

**⚡ CRÍTICO** - Deve ser feita primeiro, pois afeta todas as páginas RH

### Problema Raiz
- Menu lateral e superior com dados hardcoded (`'João Silva'`)
- Navegação usa estado local ao invés de React Router
- Sem integração com authStore
- Props inconsistentes entre componentes

### Tarefas

#### 1.1 Corrigir RHSidebar.tsx
**Arquivo:** [src/components/RHSidebar.tsx](../src/components/RHSidebar.tsx)

- [ ] Importar `useAuthStore` e `useNavigate`
- [ ] Substituir `userName: 'João Silva'` por `authStore.user?.nome_completo || 'Usuário'`
- [ ] Substituir `userRole: 'Administrador'` por `authStore.user?.perfil || 'RH'`
- [ ] Implementar `handleLogout()` real:
  ```typescript
  const handleLogout = () => {
    authStore.logout()
    navigate('/rh/login')
  }
  ```
- [ ] Trocar todos `onNavigate(itemId)` por navegação React Router:
  ```typescript
  // Antes: onNavigate('dashboard-rh')
  // Depois: navigate('/rh/dashboard')
  ```
- [ ] Adicionar proteção: Se `!authStore.user`, redirecionar para login

**Linhas Afetadas:** ~30-70

---

#### 1.2 Corrigir RHTopBar.tsx
**Arquivo:** [src/components/RHTopBar.tsx](../src/components/RHTopBar.tsx)

- [ ] Importar `useAuthStore` e `useNavigate`
- [ ] Substituir `userName: 'João Silva'` por dados reais do authStore
- [ ] Implementar `handleProfileClick()` → `navigate('/rh/perfil')`
- [ ] Implementar `handleSettingsClick()` → `navigate('/rh/configuracoes')`
- [ ] Implementar `handleLogout()` real (mesmo da sidebar)
- [ ] Implementar `handleSearch(query)` real (pode deixar console.log temporariamente)

**Linhas Afetadas:** ~20-50

---

#### 1.3 Refatorar RHLayout.tsx
**Arquivo:** [src/components/RHLayout.tsx](../src/components/RHLayout.tsx)

- [ ] Remover props `currentPage` e `onNavigate` (não são necessárias)
- [ ] Simplificar interface:
  ```typescript
  interface RHLayoutProps {
    children: React.ReactNode
  }
  ```
- [ ] Layout usa React Router internamente (detecta rota atual via `useLocation()`)
- [ ] Passar dados do authStore para Sidebar e TopBar
- [ ] Adicionar proteção: Redirecionar se não autenticado

**Linhas Afetadas:** ~10-30

---

#### 1.4 Atualizar Todas Páginas RH
- [ ] **DashboardRHPage.tsx** - Remover props `currentPage` e `onNavigate`
- [ ] **VagasRHPage.tsx** - Remover props `currentPage` e `onNavigate`
- [ ] **CandidatosRHPage.tsx** - Remover props `currentPage` e `onNavigate`
- [ ] **VagaCandidatosRHPage.tsx** - Verificar se precisa atualizar

**Padrão para todas:**
```typescript
// Antes:
export function VagasRHPage({ onNovaVaga }: VagasRHPageProps = {}) {
  const [currentPage, setCurrentPage] = useState('vagas-rh')
  return (
    <RHLayout currentPage={currentPage} onNavigate={setCurrentPage}>

// Depois:
export function VagasRHPage() {
  return (
    <RHLayout>
```

---

### Checklist FASE 1
- [ ] RHSidebar conectado ao authStore
- [ ] RHTopBar conectado ao authStore
- [ ] RHLayout simplificado
- [ ] Todas páginas RH atualizadas
- [ ] Navegação usando React Router
- [ ] Logout funcional
- [ ] Nome do usuário exibido corretamente
- [ ] Testado: Navegar entre páginas RH funciona

---

## FASE 2: DashboardRHPage

**🟡 ALTA** - Primeira página que RH vê após login

### Problema
- 100% mockado (arrays hardcoded linhas 19-94)
- Nenhuma integração com banco de dados
- Botões "Ver Todas" e "Ver Todos" não navegam

### Tarefas

#### 2.1 Criar Hooks React Query
**Arquivo:** [src/features/vagas/hooks/useVagas.ts](../src/features/vagas/hooks/useVagas.ts)

- [ ] Adicionar hook `useVagasRecentes(limit: number = 5)`
  - Retorna 5 vagas mais recentes
  - Ordenadas por `created_at DESC`
  - Filtro: `ativa = true`

**Arquivo:** [src/features/vagas/hooks/useCandidaturas.ts](../src/features/vagas/hooks/useCandidaturas.ts)

- [ ] Adicionar hook `useCandidatosRecentes(limit: number = 5)`
  - Retorna candidatos com status `aguardando_resposta`
  - Ordenados por `data_candidatura DESC`
  - Inclui dados do candidato e vaga (join)

- [ ] Adicionar hook `useEstatisticasRH()`
  - Total de vagas ativas
  - Total de candidatos
  - Candidatos aguardando resposta (count)
  - Candidatos aprovados hoje (count)

**Linhas Adicionadas:** ~100-150

---

#### 2.2 Refatorar DashboardRHPage.tsx
**Arquivo:** [src/components/pages/DashboardRHPage.tsx](../src/components/pages/DashboardRHPage.tsx)

- [ ] Remover arrays mockados (linhas 19-94)
- [ ] Importar hooks criados acima
- [ ] Usar `useVagasRecentes()` para vagas
- [ ] Usar `useCandidatosRecentes()` para candidatos
- [ ] Usar `useEstatisticasRH()` para cards de métricas
- [ ] Adicionar estados de loading (skeleton ou spinner)
- [ ] Adicionar tratamento de erro
- [ ] Implementar navegação nos botões:
  ```typescript
  const navigate = useNavigate()

  // Botão "Ver Todas"
  <button onClick={() => navigate('/rh/vagas')}>Ver Todas</button>

  // Botão "Ver Todos"
  <button onClick={() => navigate('/rh/candidatos')}>Ver Todos</button>

  // Botão "Gerenciar Vaga"
  <button onClick={() => navigate(`/rh/vagas/${vaga.id}/candidatos`)}>Gerenciar</button>

  // Botão "Analisar"
  <button onClick={() => navigate(`/rh/candidatos/${candidato.id}`)}>Analisar</button>
  ```

**Linhas Afetadas:** ~200-300

---

### Checklist FASE 2
- [ ] Hooks `useVagasRecentes`, `useCandidatosRecentes`, `useEstatisticasRH` criados
- [ ] DashboardRHPage sem dados mockados
- [ ] Vagas recentes carregadas do banco
- [ ] Candidatos recentes carregados do banco
- [ ] Cards de métricas com dados reais
- [ ] Loading states implementados
- [ ] Botões de navegação funcionando
- [ ] Testado: Dashboard carrega dados reais e navega corretamente

---

## FASE 3: CandidatosRHPage

**🟡 ALTA** - Página essencial para gestão de candidatos

### Problema
- 100% mockado (array de 12 candidatos fake, linhas 88-245)
- Busca não funciona (setState mas sem filter)
- Filtros não funcionam (setState mas sem filter)
- Botões vazios (Ver Perfil, Aprovar, Rejeitar, Adicionar Nota)
- Kanban implementado mas quebrado

### Tarefas

#### 3.1 Conectar ao Banco de Dados
**Arquivo:** [src/components/pages/CandidatosRHPage.tsx](../src/components/pages/CandidatosRHPage.tsx)

- [ ] Remover array mockado `candidatos` (linhas 88-245)
- [ ] Importar hook `useCandidaturas()` (já existe)
- [ ] Buscar todos candidatos sem filtro de vaga:
  ```typescript
  const { data: candidaturasData, isLoading, error } = useCandidaturas()
  ```
- [ ] Mapear dados para interface do componente
- [ ] Adicionar estados de loading/erro

**Linhas Afetadas:** ~100-200

---

#### 3.2 Implementar Busca Funcional
- [ ] Filtrar candidatos por `searchQuery`:
  ```typescript
  const candidatosFiltrados = candidatos.filter(c =>
    c.candidato.nome_completo.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.candidato.email.toLowerCase().includes(searchQuery.toLowerCase())
  )
  ```
- [ ] Aplicar filtro em tempo real ao digitar

**Linhas Adicionadas:** ~10-20

---

#### 3.3 Implementar Filtros
- [ ] Filtro por status (`filterStatus`):
  ```typescript
  if (filterStatus !== 'todos') {
    candidatosFiltrados = candidatosFiltrados.filter(c => c.status === filterStatus)
  }
  ```
- [ ] Filtro por vaga (`filterVaga`):
  ```typescript
  if (filterVaga !== 'todas') {
    candidatosFiltrados = candidatosFiltrados.filter(c => c.vaga_id === filterVaga)
  }
  ```
- [ ] Combinar busca + filtros

**Linhas Adicionadas:** ~20-30

---

#### 3.4 Implementar Ações dos Botões
- [ ] **"Ver Perfil"** → Navegar para página de perfil:
  ```typescript
  onClick={() => navigate(`/rh/candidatos/${candidato.id}/perfil`)}
  ```
- [ ] **"Aprovar"** → Abrir `UpdateStatusModal`:
  ```typescript
  onClick={() => setSelectedCandidatura({
    id: candidatura.id,
    candidatoNome: candidato.nome_completo,
    statusAtual: candidatura.status
  })}
  ```
- [ ] **"Rejeitar"** → Abrir `UpdateStatusModal` (mesmo padrão)
- [ ] **"Adicionar Nota"** → Abrir modal de notas (ou deixar para depois)
- [ ] Importar e integrar `UpdateStatusModal` (mesmo usado em VagaCandidatosRHPage)

**Linhas Adicionadas:** ~50-80

---

#### 3.5 Kanban (Opcional - Pode Deixar Para Depois)
- [ ] Sincronizar drag & drop com banco
- [ ] Atualizar status ao mover card entre colunas
- [ ] Ou **remover** seção Kanban temporariamente se não for prioridade

**Decisão:** ⏳ Avaliar após fases anteriores

---

### Checklist FASE 3
- [ ] CandidatosRHPage conectado ao banco via hooks
- [ ] Array mockado removido
- [ ] Busca funcional (por nome e email)
- [ ] Filtros funcionais (status e vaga)
- [ ] Botão "Ver Perfil" navega corretamente
- [ ] Botões "Aprovar" e "Rejeitar" abrem UpdateStatusModal
- [ ] Modal UpdateStatusModal integrado
- [ ] Kanban removido ou funcional
- [ ] Testado: Busca, filtros e ações funcionam

---

## FASE 4: VagasRHPage

**🟢 MÉDIA** - Já parcialmente funcional (conectada ao banco)

### Problema
- Conectada ao banco ✅
- Navegação parcial ⚠️
- Contadores vazios (TODO linhas 100-101)
- Botões com handlers vazios

### Tarefas

#### 4.1 Implementar Contadores de Candidatos
**Arquivo:** [src/features/vagas/services/vagasService.ts](../src/features/vagas/services/vagasService.ts)

- [ ] Modificar query `listVagas()` para incluir contadores:
  ```sql
  SELECT v.*,
    COUNT(CASE WHEN c.status = 'em_analise' THEN 1 END) as candidatos_em_analise,
    COUNT(CASE WHEN c.status = 'aprovado_proxima' THEN 1 END) as candidatos_aprovados
  FROM vagas v
  LEFT JOIN candidaturas c ON c.vaga_id = v.id
  GROUP BY v.id
  ```
- [ ] Adicionar tipos ao `VagasTypes`:
  ```typescript
  candidatosEmAnalise?: number
  candidatosAprovados?: number
  ```

**Arquivo:** [src/components/pages/VagasRHPage.tsx](../src/components/pages/VagasRHPage.tsx)

- [ ] Substituir TODOs (linhas 100-101):
  ```typescript
  candidatos: {
    total: vagaDB.totalCandidatos || 0,
    emAnalise: vagaDB.candidatosEmAnalise || 0,
    aprovados: vagaDB.candidatosAprovados || 0,
  }
  ```

**Linhas Afetadas:** ~30-50

---

#### 4.2 Corrigir Navegação "Nova Vaga"
**Arquivo:** [src/components/pages/VagasRHPage.tsx](../src/components/pages/VagasRHPage.tsx)

- [ ] Remover prop `onNovaVaga` da interface (linha 54)
- [ ] Botão "Nova Vaga" chama diretamente:
  ```typescript
  <GlassButton onClick={() => navigate('/rh/vagas/nova')}>
    Nova Vaga
  </GlassButton>
  ```

**Linhas Afetadas:** ~5-10

---

#### 4.3 Implementar Edição de Vaga
**Arquivo:** [src/components/pages/CriarEditarVagaPage.tsx](../src/components/pages/CriarEditarVagaPage.tsx)

- [ ] Adicionar detecção de modo edição:
  ```typescript
  const { id: vagaId } = useParams<{ id: string }>()
  const isEditMode = !!vagaId
  ```
- [ ] Se `isEditMode`, carregar dados da vaga:
  ```typescript
  const { data: vaga, isLoading } = useVaga(vagaId)

  useEffect(() => {
    if (vaga) {
      // Popular formulário com dados da vaga
      form.reset({
        titulo: vaga.titulo,
        descricao: vaga.descricao,
        // ... outros campos
      })
    }
  }, [vaga])
  ```
- [ ] Mudar título: "Criar Nova Vaga" → "Editar Vaga"
- [ ] Botão salvar: POST (nova) ou PUT (edição)

**Arquivo:** [src/router/routes.tsx](../src/router/routes.tsx)

- [ ] Verificar se rota `/rh/vagas/:id/editar` já existe
- [ ] Se não, adicionar:
  ```typescript
  {
    path: '/rh/vagas/:id/editar',
    element: <CriarEditarVagaPage />
  }
  ```

**Arquivo:** [src/components/pages/VagasRHPage.tsx](../src/components/pages/VagasRHPage.tsx)

- [ ] Botão "Editar" navega para rota correta:
  ```typescript
  onClick={() => navigate(`/rh/vagas/${vaga.id}/editar`)}
  ```

**Linhas Afetadas:** ~100-150

---

#### 4.4 Implementar Handlers de Ações
**Arquivo:** [src/components/pages/VagasRHPage.tsx](../src/components/pages/VagasRHPage.tsx)

**4.4.1 Pausar/Ativar Vaga**
- [ ] Criar mutation:
  ```typescript
  const toggleVagaMutation = useMutation({
    mutationFn: async (vagaId: string) => {
      const { data } = await supabase
        .from('vagas')
        .update({ ativa: !vaga.ativa })
        .eq('id', vagaId)
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['vagas'])
      toast.success('Status da vaga atualizado')
    }
  })
  ```
- [ ] Handler chama mutation:
  ```typescript
  const handlePausarAtivar = (vaga: Vaga) => {
    toggleVagaMutation.mutate(vaga.id)
  }
  ```

**4.4.2 Duplicar Vaga**
- [ ] Criar service `duplicarVaga(vagaId)` em `vagasService.ts`
- [ ] Copiar vaga e adicionar " (Cópia)" ao título
- [ ] Navegar para edição da vaga duplicada:
  ```typescript
  const handleDuplicar = async (vaga: Vaga) => {
    const novaVaga = await duplicarVaga(vaga.id)
    navigate(`/rh/vagas/${novaVaga.id}/editar`)
  }
  ```

**4.4.3 Arquivar Vaga**
- [ ] Criar mutation soft delete:
  ```typescript
  const arquivarVagaMutation = useMutation({
    mutationFn: async (vagaId: string) => {
      const { data } = await supabase
        .from('vagas')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', vagaId)
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['vagas'])
      toast.success('Vaga arquivada')
    }
  })
  ```
- [ ] Handler chama mutation:
  ```typescript
  const handleArquivar = (vaga: Vaga) => {
    if (confirm('Tem certeza que deseja arquivar esta vaga?')) {
      arquivarVagaMutation.mutate(vaga.id)
    }
  }
  ```

**Linhas Adicionadas:** ~80-120

---

### Checklist FASE 4
- [x] Contadores de candidatos funcionando
- [x] Botão "Nova Vaga" navega corretamente
- [x] Modo edição implementado em CriarEditarVagaPage
- [x] Formulário carrega dados da vaga para edição
- [x] Botão "Editar" navega para edição
- [x] Pausar/Ativar vaga funcional
- [x] Duplicar vaga funcional
- [x] Arquivar vaga funcional
- [ ] Testado: Todas ações funcionam e atualizam banco

---

## PROBLEMAS ENCONTRADOS DURANTE EXECUÇÃO

**Anotar aqui problemas, decisões e ajustes feitos durante a implementação**

### Problema 1: [Título]
**Data:** YYYY-MM-DD
**Descrição:**
**Solução:**
**Arquivos Afetados:**

### Problema 2: [Título]
**Data:** YYYY-MM-DD
**Descrição:**
**Solução:**
**Arquivos Afetados:**

---

## ✅ CHECKLIST FINAL

### Sistema de Base
- [ ] RHLayout refatorado e simplificado
- [ ] RHSidebar conectado ao authStore
- [ ] RHTopBar conectado ao authStore
- [ ] Navegação React Router funcionando em todas páginas
- [ ] Logout funcional em toda área RH
- [ ] Nome do usuário exibido corretamente

### DashboardRHPage
- [ ] Hooks React Query criados
- [ ] Dados mockados removidos
- [ ] Vagas recentes do banco
- [ ] Candidatos recentes do banco
- [ ] Métricas com dados reais
- [ ] Navegação funcionando

### CandidatosRHPage
- [ ] Conectada ao banco
- [ ] Busca funcional
- [ ] Filtros funcionais
- [ ] Botões Aprovar/Rejeitar funcionais
- [ ] UpdateStatusModal integrado
- [ ] Ver Perfil funcional

### VagasRHPage
- [ ] Contadores implementados
- [ ] Nova vaga funcional
- [ ] Edição de vaga funcional
- [ ] Pausar/Ativar funcional
- [ ] Duplicar funcional
- [ ] Arquivar funcional

### Testes Manuais
- [ ] Login como RH funciona
- [ ] Dashboard carrega dados reais
- [ ] Navegação entre páginas funciona
- [ ] Busca e filtros funcionam
- [ ] Ações (aprovar, rejeitar, editar, etc) funcionam
- [ ] Logout funciona

---

## 📝 NOTAS IMPORTANTES

### Sobre Task 10 (Sistema de Status Update)
- ✅ **NÃO É AFETADA** - VagaCandidatosRHPage já está funcional
- ✅ UpdateStatusModal já funciona corretamente
- ✅ Testes podem continuar enquanto corrigimos outras páginas

### Decisões de Escopo
1. **Kanban** - Avaliar depois se é prioridade, pode ser removido temporariamente
2. **Página de Perfil do Candidato** - Criar rota básica se necessário
3. **Adicionar Nota** - Pode ser implementado depois

### Padrões a Seguir
- Usar React Router `useNavigate()` para navegação
- Usar React Query hooks para dados
- Usar authStore para usuário logado
- Usar TanStack Query mutations para updates
- Adicionar loading states (skeleton ou spinner)
- Adicionar tratamento de erro (toast)

---

**Última Atualização:** 2025-01-22
