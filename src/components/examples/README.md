# Beauty Smile - Componentes de Exemplo

Este diretório contém componentes reutilizáveis baseados no Design System da Beauty Smile.

## 📦 Índice de Componentes

### 🎴 Cards (`CardExamples.tsx`)

#### 1. FeatureCard
Card com ícone, título, descrição e botão de ação.
```tsx
<FeatureCard 
  icon="🌊"
  title="Questionários"
  description="Testes psicométricos com design moderno"
  action={{ label: "Iniciar", onClick: () => {} }}
/>
```

#### 2. StatCard
Card de estatística com ícone, valor e label.
```tsx
<StatCard 
  icon="👥"
  value="142"
  label="Candidatos Ativos"
/>
```

#### 3. VagaCard
Card completo de vaga com match score.
```tsx
<VagaCard 
  titulo="Dentista Sênior"
  local="São Paulo, SP"
  tipo="Tempo integral"
  salario="R$ 8.000 - R$ 12.000"
  match={92}
  onCandidatar={() => {}}
/>
```

#### 4. TestCard
Card de teste com progresso e status.
```tsx
<TestCard 
  icon="🧠"
  titulo="Big Five"
  subtitulo="Teste de Personalidade"
  progresso={45}
  status="em-progresso"
  onAction={() => {}}
/>
```

#### 5. CandidatoCard
Card de candidato para área RH.
```tsx
<CandidatoCard 
  nome="Ana Silva"
  vaga="Dentista"
  score={92}
  status="Entrevista agendada"
  onVerPerfil={() => {}}
/>
```

#### 6. InfoCard
Card de informação com ícone lateral.
```tsx
<InfoCard 
  icon="🔒"
  title="Conexão Segura"
  description="Seus dados estão protegidos"
/>
```

---

### 📐 Layouts (`LayoutExamples.tsx`)

#### 1. HeroLayout
Hero section centralizado com logo e ações.
```tsx
<HeroLayout 
  title="Beauty Smile"
  subtitle="Sistema de Recrutamento Inteligente"
  description="Tecnologia de ponta..."
  actions={[
    { label: "Começar", onClick: () => {} },
    { label: "Saiba Mais", onClick: () => {} }
  ]}
/>
```

#### 2. PageWithHeader
Página com header, título e conteúdo.
```tsx
<PageWithHeader 
  background="gradient"
  title="Vagas Disponíveis"
  subtitle="Encontre sua próxima oportunidade"
>
  {/* Seu conteúdo aqui */}
</PageWithHeader>
```

#### 3. ThreeColumnGrid
Grid responsivo de 3 colunas.
```tsx
<ThreeColumnGrid>
  <FeatureCard {...} />
  <FeatureCard {...} />
  <FeatureCard {...} />
</ThreeColumnGrid>
```

#### 4. TwoColumnGrid
Grid responsivo de 2 colunas.
```tsx
<TwoColumnGrid>
  <VagaCard {...} />
  <VagaCard {...} />
</TwoColumnGrid>
```

#### 5. FourColumnGrid
Grid responsivo de 4 colunas (stats).
```tsx
<FourColumnGrid>
  <StatCard {...} />
  <StatCard {...} />
  <StatCard {...} />
  <StatCard {...} />
</FourColumnGrid>
```

#### 6. LoginLayout
Layout de login centralizado.
```tsx
<LoginLayout 
  title="Área RH"
  subtitle="Acesse o sistema de recrutamento"
>
  {/* Formulário aqui */}
</LoginLayout>
```

#### 7. DashboardLayout
Layout de dashboard com navbar.
```tsx
<DashboardLayout 
  navItems={[
    { label: "Dashboard", href: "#", active: true },
    { label: "Candidatos", href: "#" },
    { label: "Vagas", href: "#" }
  ]}
  userInitials="RH"
>
  {/* Conteúdo do dashboard */}
</DashboardLayout>
```

#### 8. SectionWithAction
Seção com título e botão de ação.
```tsx
<SectionWithAction 
  title="Candidatos em Destaque"
  action={{ label: "Ver Todos →", onClick: () => {} }}
>
  {/* Lista de candidatos */}
</SectionWithAction>
```

#### 9. StackedList
Lista com espaçamento vertical.
```tsx
<StackedList gap={4}>
  <CandidatoCard {...} />
  <CandidatoCard {...} />
  <CandidatoCard {...} />
</StackedList>
```

#### 10. CenteredContainer
Container centralizado com max-width.
```tsx
<CenteredContainer maxWidth="max-w-4xl">
  {/* Conteúdo centralizado */}
</CenteredContainer>
```

---

## 🎨 Como Usar

### 1. Importar componentes
```tsx
import { FeatureCard, StatCard } from './components/examples/CardExamples';
import { PageWithHeader, ThreeColumnGrid } from './components/examples/LayoutExamples';
```

### 2. Compor uma página
```tsx
export function MinhaNovaPage() {
  return (
    <PageWithHeader 
      title="Minha Página"
      subtitle="Descrição da página"
    >
      <ThreeColumnGrid>
        <FeatureCard 
          icon="🎯"
          title="Feature 1"
          description="Descrição"
        />
        <FeatureCard 
          icon="💡"
          title="Feature 2"
          description="Descrição"
        />
        <FeatureCard 
          icon="🚀"
          title="Feature 3"
          description="Descrição"
        />
      </ThreeColumnGrid>
    </PageWithHeader>
  );
}
```

---

## 📚 Documentação Completa

Para informações detalhadas sobre o Design System, consulte:
- `/guidelines/DesignPatterns.md` - Padrões de design completos
- `/guidelines/Guidelines.md` - Diretrizes gerais do projeto
- `/components/ui/glass.tsx` - Componentes base liquid glass

---

## 🎯 Princípios

1. **Reutilização**: Use estes componentes como base
2. **Consistência**: Mantenha o design system
3. **Flexibilidade**: Adapte conforme necessário
4. **Acessibilidade**: Sempre priorize a experiência do usuário
5. **Performance**: Otimize para carregamento rápido

---

## 🔄 Atualizações

Sempre que criar um novo padrão de componente reutilizável:
1. Adicione ao arquivo apropriado (`CardExamples.tsx` ou `LayoutExamples.tsx`)
2. Documente aqui no README
3. Adicione exemplo de uso
4. Teste em diferentes telas (mobile, tablet, desktop)

---

**Última atualização**: 2025-01-27
