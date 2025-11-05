# PRD-FRONTEND: Página "Meu Perfil" - Hub de Navegação do Candidato

**Versão:** 1.0
**Data:** 03 de Novembro de 2025
**Autor:** Equipe Beauty Smile
**Status:** 📋 Especificação Técnica
**Prioridade:** 🔴 P0 - Crítica (MVP)
**Categoria:** Frontend - UX/Navegação
**Dependências:** PRD-DB-001 (Autenticação), PRD-DB-002 (Candidaturas)

---

## 1. Visão Geral

### 1.1 Contexto da Mudança

**MUDANÇA DE ARQUITETURA:** Este PRD documenta uma mudança fundamental no fluxo de navegação do sistema:

**❌ Abordagem Anterior (Descartada):**
- Após login → Redirect baseado em contexto (de onde veio)
- Diferentes destinos dependendo da origem do acesso

**✅ Nova Abordagem (Implementar):**
- **Após login → SEMPRE redirecionar para "Meu Perfil"**
- "Meu Perfil" atua como **hub centralizado de navegação**
- Progresso visual com etapas bloqueadas/desbloqueadas
- Botão da próxima ação sempre visível

### 1.2 Problema que Resolve

1. **Confusão de navegação:** Candidato não sabe onde vai estar após login
2. **Perda de contexto:** Difícil voltar após dias/semanas
3. **Falta de clareza de progresso:** Candidato não vê onde está no processo
4. **Experiência fragmentada:** Múltiplos pontos de entrada geram inconsistência

### 1.3 Objetivo

Criar uma **página "Meu Perfil"** que:
- Seja o **único destino pós-login** para candidatos
- Mostre **visualmente o progresso** no processo seletivo
- **Habilite/desabilite botões** baseado na etapa atual
- Centralize **todas as ações** disponíveis para o candidato

---

## 2. Especificação Técnica

### 2.1 Rota e Navegação

**Rota:** `/meu-perfil` ou `/candidato/perfil`

**Redirecionamentos que levam para "Meu Perfil":**
1. ✅ Após signup (criar conta)
2. ✅ Após login
3. ✅ Após completar qualquer teste (Big Five, DISC, Raven, Cultura)
4. ✅ Após enviar formulário de triagem
5. ✅ Ao clicar em "Voltar ao Perfil" de qualquer página interna

**RH NÃO usa esta página:**
- RH continua indo para dashboard RH próprio após login

---

### 2.2 Query de Dados (Supabase)

A página precisa buscar:

```typescript
// 1. Dados do candidato
const { data: candidato } = await supabase
  .from('candidatos')
  .select('id, nome_completo, email, avatar_url')
  .eq('user_id', userId)
  .single();

// 2. Candidaturas ativas (com informações da vaga)
const { data: candidaturas } = await supabase
  .from('candidaturas')
  .select(`
    id,
    etapa_atual,
    status,
    score_geral,
    data_candidatura,
    is_rascunho,
    vaga:vagas (
      id,
      titulo,
      slug,
      cidade,
      estado
    )
  `)
  .eq('candidato_id', candidato.id)
  .is('deleted_at', null)
  .order('created_at', { ascending: false });

// 3. Para cada candidatura, determinar próximo passo
```

---

### 2.3 Lógica de Estado das Etapas

Cada candidatura tem uma `etapa_atual` (enum):

```typescript
type EtapaProcesso =
  | 'triagem'
  | 'bigfive'
  | 'disc'
  | 'entrevista_online'
  | 'raven'
  | 'cultura'
  | 'entrevista_presencial'
  | 'aprovado'
  | 'rejeitado';
```

**Regra de Exibição:**

| Etapa Atual | Botão Habilitado | Etapas Completas (✅) | Etapas Bloqueadas (🔒) |
|-------------|------------------|----------------------|------------------------|
| `triagem` | "Preencher Formulário" | Nenhuma | Big Five, DISC, Raven, Cultura, Entrevistas |
| `bigfive` | "Fazer Teste Big Five" | Triagem | DISC, Raven, Cultura, Entrevistas |
| `disc` | "Fazer Teste DISC" | Triagem, Big Five | Raven, Cultura, Entrevistas |
| `entrevista_online` | "Agendar Entrevista Online" | Triagem, Big Five, DISC | Raven, Cultura, Entrevista Presencial |
| `raven` | "Fazer Teste Raven" | Triagem, Big Five, DISC, Entrevista Online | Cultura, Entrevista Presencial |
| `cultura` | "Responder Cultura" | Triagem, Big Five, DISC, Entrevista Online, Raven | Entrevista Presencial |
| `entrevista_presencial` | "Agendar Entrevista Presencial" | Todas anteriores | Nenhuma |
| `aprovado` | Nenhum (processo concluído) | Todas | Nenhuma |
| `rejeitado` | Nenhum (processo encerrado) | Conforme progresso | Todas |

---

### 2.4 Layout da Página

#### Estrutura Visual

```
┌─────────────────────────────────────────────────────────────┐
│                    HEADER (Navbar)                          │
│  Logo    |    Meu Perfil    |    Minhas Candidaturas   | 👤│
└─────────────────────────────────────────────────────────────┘
┌─────────────────────────────────────────────────────────────┐
│  HERO SECTION                                               │
│  ┌──────────────┐                                           │
│  │ 👤 Avatar    │  Olá, João Silva!                         │
│  └──────────────┘  Bem-vindo de volta 👋                    │
└─────────────────────────────────────────────────────────────┘
┌─────────────────────────────────────────────────────────────┐
│  CANDIDATURAS ATIVAS                                        │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  📄 Assistente Odontológico · São Paulo, SP         │   │
│  │  Candidatura enviada em: 01/11/2025                │   │
│  │                                                      │   │
│  │  ─────────────── PROGRESSO ───────────────           │   │
│  │                                                      │   │
│  │  ✅ Triagem Completa (Score: 85%)                   │   │
│  │  🔓 Próximo: Teste Big Five                         │   │
│  │  🔒 DISC                                             │   │
│  │  🔒 Entrevista Online                                │   │
│  │  🔒 Raven                                            │   │
│  │  🔒 Cultura                                          │   │
│  │  🔒 Entrevista Presencial                            │   │
│  │                                                      │   │
│  │  [📝 Fazer Teste Big Five]  ← BOTÃO PRIMÁRIO        │   │
│  └─────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
┌─────────────────────────────────────────────────────────────┐
│  AÇÕES RÁPIDAS                                              │
│  [✏️ Editar Perfil]  [📄 Ver Currículo]  [🔔 Notificações] │
└─────────────────────────────────────────────────────────────┘
```

---

### 2.5 Componentes React

#### 2.5.1 Componente Principal

```typescript
// MeuPerfilPage.tsx
import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useCandidaturas } from '@/hooks/useCandidaturas';

export default function MeuPerfilPage() {
  const { user } = useAuth();
  const { candidaturas, loading } = useCandidaturas(user.id);

  if (loading) return <LoadingSpinner />;

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {/* Hero Section */}
      <HeroSection candidato={user} />

      {/* Lista de Candidaturas */}
      {candidaturas.length === 0 ? (
        <NenhumaCandidaturaCard />
      ) : (
        <div className="space-y-6">
          {candidaturas.map((candidatura) => (
            <CandidaturaCard
              key={candidatura.id}
              candidatura={candidatura}
            />
          ))}
        </div>
      )}

      {/* Ações Rápidas */}
      <AcoesRapidas />
    </div>
  );
}
```

#### 2.5.2 Card de Candidatura

```typescript
// CandidaturaCard.tsx
interface CandidaturaCardProps {
  candidatura: {
    id: string;
    etapa_atual: EtapaProcesso;
    status: StatusCandidatura;
    score_geral: number | null;
    vaga: {
      titulo: string;
      cidade: string;
      estado: string;
    };
  };
}

export function CandidaturaCard({ candidatura }: CandidaturaCardProps) {
  const proximaAcao = getProximaAcao(candidatura.etapa_atual);
  const etapasCompletas = getEtapasCompletas(candidatura.etapa_atual);
  const etapasBloqueadas = getEtapasBloqueadas(candidatura.etapa_atual);

  return (
    <Card>
      <CardHeader>
        <h3>{candidatura.vaga.titulo}</h3>
        <p>{candidatura.vaga.cidade}, {candidatura.vaga.estado}</p>
      </CardHeader>

      <CardBody>
        {/* Progresso Visual */}
        <ProgressoEtapas
          etapasCompletas={etapasCompletas}
          etapaAtual={candidatura.etapa_atual}
          etapasBloqueadas={etapasBloqueadas}
        />

        {/* Score (se disponível) */}
        {candidatura.score_geral && (
          <ScoreBadge score={candidatura.score_geral} />
        )}

        {/* Botão de Ação Principal */}
        <Button
          size="lg"
          onClick={() => handleProximaEtapa(proximaAcao)}
        >
          {proximaAcao.label}
        </Button>
      </CardBody>
    </Card>
  );
}
```

#### 2.5.3 Progresso Visual de Etapas

```typescript
// ProgressoEtapas.tsx
const ETAPAS_ORDEM = [
  { key: 'triagem', label: 'Formulário de Triagem' },
  { key: 'bigfive', label: 'Teste Big Five' },
  { key: 'disc', label: 'Teste DISC' },
  { key: 'entrevista_online', label: 'Entrevista Online' },
  { key: 'raven', label: 'Teste Raven' },
  { key: 'cultura', label: 'Fit Cultural' },
  { key: 'entrevista_presencial', label: 'Entrevista Presencial' },
];

export function ProgressoEtapas({ etapasCompletas, etapaAtual, etapasBloqueadas }) {
  return (
    <div className="space-y-2">
      <h4 className="font-semibold text-gray-700">Progresso no Processo Seletivo</h4>

      {ETAPAS_ORDEM.map((etapa) => {
        const status = getStatusEtapa(etapa.key, etapasCompletas, etapaAtual, etapasBloqueadas);

        return (
          <div
            key={etapa.key}
            className={`flex items-center gap-3 p-2 rounded ${
              status === 'completa' ? 'bg-green-50' :
              status === 'atual' ? 'bg-blue-50 border-2 border-blue-500' :
              'bg-gray-50'
            }`}
          >
            {status === 'completa' && <CheckCircle className="text-green-600" />}
            {status === 'atual' && <Circle className="text-blue-600 fill-current" />}
            {status === 'bloqueada' && <Lock className="text-gray-400" />}

            <span className={`
              ${status === 'completa' ? 'text-green-700' : ''}
              ${status === 'atual' ? 'text-blue-700 font-semibold' : ''}
              ${status === 'bloqueada' ? 'text-gray-400' : ''}
            `}>
              {etapa.label}
            </span>
          </div>
        );
      })}
    </div>
  );
}
```

---

### 2.6 Helpers e Utilit

ários

```typescript
// utils/etapas.ts

export function getProximaAcao(etapaAtual: EtapaProcesso) {
  const acoes = {
    triagem: { label: '📝 Preencher Formulário', rota: '/candidatura/formulario' },
    bigfive: { label: '🧠 Fazer Teste Big Five', rota: '/testes/bigfive' },
    disc: { label: '🎯 Fazer Teste DISC', rota: '/testes/disc' },
    entrevista_online: { label: '🎥 Agendar Entrevista Online', rota: '/entrevistas/online' },
    raven: { label: '🧩 Fazer Teste Raven', rota: '/testes/raven' },
    cultura: { label: '💡 Responder Fit Cultural', rota: '/testes/cultura' },
    entrevista_presencial: { label: '👥 Agendar Entrevista Presencial', rota: '/entrevistas/presencial' },
    aprovado: { label: '🎉 Processo Concluído!', rota: null },
    rejeitado: { label: '❌ Processo Encerrado', rota: null },
  };

  return acoes[etapaAtual];
}

export function getEtapasCompletas(etapaAtual: EtapaProcesso): string[] {
  const ordem = ['triagem', 'bigfive', 'disc', 'entrevista_online', 'raven', 'cultura', 'entrevista_presencial'];
  const indexAtual = ordem.indexOf(etapaAtual);

  // Todas as etapas antes da atual estão completas
  return ordem.slice(0, indexAtual);
}

export function getEtapasBloqueadas(etapaAtual: EtapaProcesso): string[] {
  const ordem = ['triagem', 'bigfive', 'disc', 'entrevista_online', 'raven', 'cultura', 'entrevista_presencial'];
  const indexAtual = ordem.indexOf(etapaAtual);

  // Todas as etapas depois da atual estão bloqueadas
  return ordem.slice(indexAtual + 1);
}

export function getStatusEtapa(
  etapaKey: string,
  completas: string[],
  atual: string,
  bloqueadas: string[]
): 'completa' | 'atual' | 'bloqueada' {
  if (completas.includes(etapaKey)) return 'completa';
  if (etapaKey === atual) return 'atual';
  return 'bloqueada';
}
```

---

## 3. Casos de Uso Detalhados

### 3.1 Candidato Novo (Acabou de se Cadastrar)

**Contexto:** Candidato criou conta pela primeira vez após clicar em "Quero me candidatar"

**Estado:**
- `etapa_atual` = 'triagem'
- Nenhuma resposta de formulário ainda

**Tela "Meu Perfil" mostra:**
```
🎯 Próximo Passo: Preencher Formulário de Triagem

Você foi convidado para a vaga de Assistente Odontológico!
Complete o formulário inicial para avançar no processo.

Progresso:
🔓 Formulário de Triagem ← VOCÊ ESTÁ AQUI
🔒 Teste Big Five
🔒 Teste DISC
🔒 Entrevista Online
🔒 Teste Raven
🔒 Fit Cultural
🔒 Entrevista Presencial

[📝 Iniciar Formulário] ← Botão Grande e Destacado
```

---

### 3.2 Candidato com Formulário Completo (Aguardando RH)

**Contexto:** Candidato enviou formulário, mas RH ainda não aprovou para próxima etapa

**Estado:**
- `etapa_atual` = 'triagem'
- `status` = 'em_analise'
- Formulário já enviado

**Tela "Meu Perfil" mostra:**
```
⏳ Aguardando Avaliação do RH

Obrigado por completar o formulário!
Nossa equipe está analisando suas respostas.

Progresso:
✅ Formulário de Triagem (Completo - Aguardando Análise)
🔒 Teste Big Five
🔒 Teste DISC
...

[Nenhum botão de ação - apenas mensagem de aguardo]
```

---

### 3.3 Candidato Aprovado para Próxima Etapa

**Contexto:** RH aprovou candidato para fazer Big Five

**Estado:**
- `etapa_atual` = 'bigfive'
- `status` = 'aguardando_resposta'

**Tela "Meu Perfil" mostra:**
```
🎯 Próximo Passo: Teste de Personalidade Big Five

Parabéns! Você foi aprovado para a próxima etapa.
Faça o teste Big Five para avaliarmos seu perfil comportamental.

Progresso:
✅ Formulário de Triagem
🔓 Teste Big Five ← VOCÊ ESTÁ AQUI
🔒 Teste DISC
🔒 Entrevista Online
...

[🧠 Fazer Teste Big Five] ← Botão Habilitado
```

---

### 3.4 Candidato com Múltiplas Candidaturas

**Contexto:** Candidato se candidatou a 2 vagas diferentes

**Estado:**
- Candidatura 1: `etapa_atual` = 'disc'
- Candidatura 2: `etapa_atual` = 'triagem'

**Tela "Meu Perfil" mostra:**
```
📄 Minhas Candidaturas (2 ativas)

┌─────────────────────────────────────────┐
│ Assistente Odontológico · São Paulo     │
│ Progresso: 40% (DISC)                   │
│ [🎯 Fazer Teste DISC]                   │
└─────────────────────────────────────────┘

┌─────────────────────────────────────────┐
│ Recepcionista · Rio de Janeiro          │
│ Progresso: 15% (Triagem)                │
│ [📝 Preencher Formulário]               │
└─────────────────────────────────────────┘
```

---

## 4. Estados Especiais

### 4.1 Candidato Rejeitado

**Estado:**
- `etapa_atual` = 'rejeitado'
- `feedback_rejeicao` pode ou não estar preenchido

**Tela mostra:**
```
❌ Processo Encerrado

Infelizmente, não seguiremos com sua candidatura para esta vaga.

[Mensagem de feedback do RH, se disponível]

Mas não desanime! Continue acompanhando nossas vagas.

[🔍 Ver Outras Vagas]
```

---

### 4.2 Candidato Aprovado

**Estado:**
- `etapa_atual` = 'aprovado'

**Tela mostra:**
```
🎉 Parabéns! Você foi aprovado!

Ficamos muito felizes em tê-lo(a) em nossa equipe!
Em breve, nossa equipe de RH entrará em contato com os próximos passos.

✅ Todas as etapas concluídas

[📧 Contatar RH] [📄 Baixar Documentos]
```

---

## 5. Considerações de Implementação

### 5.1 Performance

- **Cache de etapa_atual:** Guardar no localStorage para evitar flicker
- **Polling:** Não fazer polling automático (apenas refresh manual ou ao voltar à página)
- **Imagens:** Lazy load de avatares e ícones

### 5.2 Acessibilidade

- **Navegação por teclado:** Todos os botões acessíveis via Tab
- **Screen readers:** Anunciar mudanças de etapa
- **Contraste:** Garantir contraste mínimo de 4.5:1

### 5.3 Responsividade

- **Mobile:** Cards de candidatura em coluna única
- **Tablet:** Layout 2 colunas se houver múltiplas candidaturas
- **Desktop:** Máximo 3 cards por linha

---

## 6. Testes Necessários

### 6.1 Testes Unitários

- ✅ `getProximaAcao()` retorna ação correta para cada etapa
- ✅ `getEtapasCompletas()` retorna lista correta
- ✅ `getEtapasBloqueadas()` retorna lista correta
- ✅ `getStatusEtapa()` determina status correto

### 6.2 Testes de Integração

- ✅ Redireciona para "Meu Perfil" após login
- ✅ Redireciona para "Meu Perfil" após signup
- ✅ Carrega candidaturas corretamente
- ✅ Botões navegam para rotas corretas
- ✅ Atualiza estado após completar teste

### 6.3 Testes E2E

- ✅ Fluxo completo: signup → triagem → bigfive → disc → aprovado
- ✅ Candidato com múltiplas candidaturas vê ambas
- ✅ Candidato rejeitado vê mensagem correta
- ✅ Candidato aguardando análise não vê botão de ação

---

## 7. Dependências de Backend

### 7.1 Queries Supabase Necessárias

```sql
-- Query principal: Buscar candidaturas ativas com vaga
SELECT
  c.id,
  c.etapa_atual,
  c.status,
  c.score_geral,
  c.data_candidatura,
  c.is_rascunho,
  v.id as vaga_id,
  v.titulo,
  v.slug,
  v.cidade,
  v.estado
FROM candidaturas c
JOIN vagas v ON c.vaga_id = v.id
WHERE c.candidato_id = $1
  AND c.deleted_at IS NULL
ORDER BY c.created_at DESC;
```

### 7.2 Real-time (Opcional - P2)

Subscrever a mudanças em `candidaturas` para atualizar UI em tempo real:

```typescript
const subscription = supabase
  .channel('candidaturas-changes')
  .on('postgres_changes', {
    event: 'UPDATE',
    schema: 'public',
    table: 'candidaturas',
    filter: `candidato_id=eq.${candidatoId}`
  }, (payload) => {
    // Atualizar UI com novo etapa_atual
  })
  .subscribe();
```

---

## 8. Cronograma de Implementação

### Fase 1 (Sprint 1) - MVP
- ✅ Criar rota `/meu-perfil`
- ✅ Implementar redirecionamento pós-login
- ✅ Buscar e exibir candidaturas
- ✅ Mostrar progresso visual básico
- ✅ Botão de próxima ação habilitado

### Fase 2 (Sprint 2) - Refinamento
- ✅ Múltiplas candidaturas
- ✅ Estados especiais (rejeitado, aprovado)
- ✅ Animações de transição
- ✅ Loading states

### Fase 3 (Sprint 3) - Melhorias
- ✅ Real-time updates (opcional)
- ✅ Notificações push
- ✅ Histórico de ações
- ✅ Exportar progresso (PDF)

---

## 9. Métricas de Sucesso

| Métrica | Objetivo | Como Medir |
|---------|----------|------------|
| **Taxa de retorno após login** | > 90% vão para Meu Perfil | Analytics rota `/meu-perfil` |
| **Taxa de conclusão de etapas** | > 60% completam próxima etapa | Conversão de clique no botão → teste completo |
| **Tempo médio na página** | 30-60 segundos | Analytics tempo de permanência |
| **Taxa de bounce** | < 20% | Analytics bounce rate |

---

## 10. Anexos

### Anexo A: Mockup Visual (ASCII)

```
┌────────────────────────────────────────────────────────┐
│  Logo  |  Meu Perfil  |  Vagas  |  Notificações  | 👤 │
├────────────────────────────────────────────────────────┤
│                                                        │
│  👤 Avatar                                             │
│  Olá, João Silva! Bem-vindo de volta 👋                │
│  joao.silva@email.com                                  │
│                                                        │
├────────────────────────────────────────────────────────┤
│  📄 Minhas Candidaturas (1 ativa)                      │
│                                                        │
│  ┌──────────────────────────────────────────────────┐ │
│  │  Assistente Odontológico                         │ │
│  │  📍 São Paulo, SP                                 │ │
│  │  📅 Candidatura enviada em: 01/11/2025           │ │
│  │                                                  │ │
│  │  ──────── Progresso no Processo ────────         │ │
│  │                                                  │ │
│  │  ✅ Formulário de Triagem (Score: 85%)           │ │
│  │  🔓 Teste Big Five ← Próxima etapa               │ │
│  │  🔒 Teste DISC                                   │ │
│  │  🔒 Entrevista Online                            │ │
│  │  🔒 Teste Raven                                  │ │
│  │  🔒 Fit Cultural                                 │ │
│  │  🔒 Entrevista Presencial                        │ │
│  │                                                  │ │
│  │  ┌──────────────────────────────────────────┐   │ │
│  │  │  🧠 Fazer Teste Big Five                 │   │ │
│  │  └──────────────────────────────────────────┘   │ │
│  └──────────────────────────────────────────────────┘ │
│                                                        │
├────────────────────────────────────────────────────────┤
│  🚀 Ações Rápidas                                      │
│  [✏️ Editar Perfil]  [📄 Ver Currículo]  [🔍 Vagas]  │
└────────────────────────────────────────────────────────┘
```

---

**FIM DO PRD-FRONTEND: Página Meu Perfil**

**Versão:** 1.0
**Status:** 📋 Pronto para Implementação
**Data:** 03 de Novembro de 2025
