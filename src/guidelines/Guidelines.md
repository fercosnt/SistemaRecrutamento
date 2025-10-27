# Beauty Smile - Guidelines do Sistema de Recrutamento

## 📋 Visão Geral

Sistema de recrutamento para a Beauty Smile com duas áreas principais:
- **Área Pública**: Candidatos (landing pages, formulários, testes psicométricos)
- **Área Administrativa**: RH (dashboard, gestão de vagas e candidatos)

---

## 🎨 Design System

### Cores da Marca
```css
--brand-primary: #00109E;    /* Azul profundo */
--brand-secondary: #BB965B;  /* Dourado (uso limitado) */
--brand-accent: #35BFAD;     /* Turquesa */
```

### Regras de Uso
- ✅ **Fundos azul (#00109E)**: Área administrativa (RH)
- ✅ **Fundos turquesa (#35BFAD)**: Área pública (Candidatos)
- ⚠️ **Dourado (#BB965B)**: Apenas detalhes, evitar fundos
- 🚫 **Remover dourado de fundos**: Foco visual em azul e turquesa

### Tipografia
- **Família**: Helvetica Neue
- **Não usar classes Tailwind**: `text-{size}`, `font-{weight}`, `leading-{size}`
- **Configurações**: Definidas em `styles/globals.css`

---

## 💎 Liquid Glass Design

### Conceito
- Componentes translúcidos com efeito glassmorphism
- Backdrop blur + saturação + opacidade controlada
- Visual moderno e tecnológico

### Componentes Base
```tsx
import { Glass, GlassCard, GlassPanel, GlassButton } from './components/ui/glass';
```

### Opacidades
- **Glass sobre turquesa**: `bg-white/15` (melhor legibilidade)
- **Glass sobre azul**: `bg-white/15` (contraste perfeito)
- **Hover**: Escurece para `bg-white/25` (não clarear!)

### Text Shadows
```tsx
// Títulos principais
className="drop-shadow-lg"

// Subtítulos
className="drop-shadow-md"

// Textos
className="drop-shadow-sm"
```

---

## 🖼️ Backgrounds

### Uso por Área

#### Área Pública (Candidatos)
```tsx
<BackgroundImage 
  background="gradient"
  overlayColor="bg-black"
  overlayOpacity={15}
>
```
- Landing page
- Vagas
- Questionários
- Dashboard do candidato

#### Área Administrativa (RH)
```tsx
<BackgroundImage background="darkBlue">
```
- Login RH
- Dashboard RH
- Gestão de vagas
- Relatórios

---

## 📐 Sistema de Grid

- **Base**: Grid de 12 colunas
- **Gap padrão**: 24px (`gap-6`)
- **Responsividade**: Mobile-first

### Exemplos
```tsx
// 3 colunas
<div className="grid grid-cols-1 md:grid-cols-3 gap-6">

// 2 colunas
<div className="grid grid-cols-1 md:grid-cols-2 gap-6">

// 4 colunas (stats)
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
```

---

## 🎯 Componentes Reutilizáveis

### Cards
Ver: `/components/examples/CardExamples.tsx`
- FeatureCard
- StatCard
- VagaCard
- TestCard
- CandidatoCard
- InfoCard

### Layouts
Ver: `/components/examples/LayoutExamples.tsx`
- HeroLayout
- PageWithHeader
- LoginLayout
- DashboardLayout
- Grids (2, 3, 4 colunas)

---

## ⚡ Animações

### Duração Padrão
```tsx
// Rápido - botões, links
transition-all duration-200

// Médio - cards, hover
transition-all duration-300

// Lento - progress bars
transition-all duration-500
```

### Efeitos
- **Hover em cards**: `hover:bg-white/25`
- **Hover em botões**: `hover:bg-white/20 active:scale-95`
- **Scale suave**: `hover:scale-[1.02]` (opcional)

---

## ♿ Acessibilidade

### Contraste
- ✅ Overlay de 15% em gradientes turquesa
- ✅ Text shadow em textos brancos sobre turquesa
- ✅ Opacidade mínima de 15% em backgrounds glass
- ✅ Estados de focus visíveis

### Semântica
- Usar elementos HTML semânticos (`<nav>`, `<main>`, `<button>`)
- Labels associados a inputs
- Alt text em imagens
- Navegação por teclado

---

## 📱 Responsividade

### Breakpoints
- Mobile: < 768px
- Tablet: 768px - 1024px
- Desktop: > 1024px

### Padrões
```tsx
// Hide em mobile
className="hidden md:inline"

// Stack em mobile
className="flex flex-col md:flex-row"

// Grid responsivo
className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3"
```

---

## 🔒 Boas Práticas

### Performance
1. Otimizar imagens
2. Lazy loading quando apropriado
3. Memoizar componentes pesados
4. Evitar re-renders desnecessários

### Código
1. Componentes reutilizáveis
2. Props tipadas (TypeScript)
3. Comentários em funções complexas
4. Separar lógica de apresentação

### UX
1. Feedback visual em ações
2. Loading states
3. Error states
4. Empty states

---

## 📚 Documentação de Referência

### Arquivos Principais
- `/guidelines/DesignPatterns.md` - Padrões de design completos
- `/components/examples/README.md` - Componentes de exemplo
- `/components/ui/glass.tsx` - Sistema liquid glass
- `/components/BackgroundImage.tsx` - Backgrounds
- `/components/BeautySmileLogo.tsx` - Logos

### Estrutura de Diretórios
```
/components
  /pages          # Páginas do sistema
  /examples       # Componentes reutilizáveis
  /ui             # Componentes base (ShadCN + Glass)
  /figma          # Componentes do Figma
/assets
  /images         # Backgrounds
  /logos          # Logos SVG
/guidelines       # Documentação
/styles           # CSS global e tokens
```

---

## 🚀 Como Começar

### 1. Criar Nova Página
```tsx
import { PageWithHeader } from './components/examples/LayoutExamples';
import { FeatureCard } from './components/examples/CardExamples';

export function MinhaPage() {
  return (
    <PageWithHeader 
      title="Título"
      subtitle="Subtítulo"
    >
      <FeatureCard {...props} />
    </PageWithHeader>
  );
}
```

### 2. Adicionar ao App.tsx
```tsx
import { MinhaPage } from './components/pages/MinhaPage';

// Adicionar ao array de páginas e ao switch
```

### 3. Testar Responsividade
- Mobile: Cmd/Ctrl + Shift + M (DevTools)
- Tablet: Ajustar viewport
- Desktop: Tela normal

---

## ✅ Checklist de Componente

Ao criar um novo componente, verificar:
- [ ] Usa componentes Glass do design system
- [ ] Background correto (turquesa para público, azul para admin)
- [ ] Text shadow em textos brancos sobre turquesa
- [ ] Hover states funcionando
- [ ] Responsivo (mobile, tablet, desktop)
- [ ] Acessível (keyboard, screen readers)
- [ ] Transições suaves (200-300ms)
- [ ] Props tipadas
- [ ] Reutilizável

---

## 🎨 Showcase

Para visualizar todos os exemplos de design:
```tsx
// No App.tsx, navegar para:
<GlassShowcase />
```

Ou acessar o menu flutuante → 🎨 Design Showcase

---

**Versão**: 1.0  
**Última atualização**: 2025-01-27  
**Equipe**: Beauty Smile Development Team
