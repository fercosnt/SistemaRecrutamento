# Beauty Smile - Padrões de Design System

## 📋 Índice
1. [Cores da Marca](#cores-da-marca)
2. [Backgrounds](#backgrounds)
3. [Componentes Liquid Glass](#componentes-liquid-glass)
4. [Tipografia](#tipografia)
5. [Logos](#logos)
6. [Padrões de Layout](#padrões-de-layout)
7. [Estados Interativos](#estados-interativos)
8. [Acessibilidade](#acessibilidade)

---

## 🎨 Cores da Marca

### Paleta Principal
```css
--brand-primary: #00109E;    /* Azul profundo - Confiança, profissionalismo */
--brand-secondary: #BB965B;  /* Dourado - Premium, elegância (uso limitado) */
--brand-accent: #35BFAD;     /* Turquesa - Modernidade, tecnologia */
```

### Uso das Cores
- **Azul (#00109E)**: Backgrounds da área administrativa (RH)
- **Turquesa (#35BFAD)**: Backgrounds da área pública (Candidatos)
- **Dourado (#BB965B)**: Apenas detalhes sutis, evitar uso em fundos

### Overlays para Legibilidade
```tsx
// Gradiente turquesa - overlay 15% preto
<BackgroundImage 
  background="gradient"
  overlayColor="bg-black"
  overlayOpacity={15}
/>

// Azul escuro - sem overlay necessário
<BackgroundImage background="darkBlue" />
```

---

## 🖼️ Backgrounds

### Tipos Disponíveis
```tsx
import { backgrounds } from './assets/images/backgrounds';

// Tipos: 'darkBlue' | 'gradient' | 'blueGradient'
```

### Quando Usar Cada Background

#### 1. **darkBlue** - Área Administrativa
```tsx
<BackgroundImage background="darkBlue" className="min-h-screen">
  {/* Login RH, Dashboard RH */}
</BackgroundImage>
```
- Login RH
- Dashboard RH
- Gestão de vagas (admin)
- Relatórios

#### 2. **gradient** - Área Pública
```tsx
<BackgroundImage 
  background="gradient"
  overlayColor="bg-black"
  overlayOpacity={15}
>
  {/* Landing, Vagas, Questionários */}
</BackgroundImage>
```
- Landing page
- Vagas públicas
- Questionários
- Dashboard do candidato

#### 3. **blueGradient** - Alternativa
- Páginas especiais
- Onboarding
- Páginas de sucesso

---

## 💎 Componentes Liquid Glass

### Glass Base
```tsx
import { Glass } from './components/ui/glass';

<Glass 
  variant="white"      // 'white' | 'primary' | 'accent' | 'dark'
  blur="xl"            // 'sm' | 'md' | 'lg' | 'xl'
  border={true}        // boolean
  hover={false}        // boolean
>
  {children}
</Glass>
```

### Variantes e Opacidades

#### Fundo Turquesa (Público)
```tsx
// Cards principais
<GlassCard variant="white" blur="xl" className="text-white">
  {/* bg-white/15 - melhor legibilidade */}
</GlassCard>

// Hover escurece
hover && 'hover:bg-white/25'
```

#### Fundo Azul Escuro (Admin)
```tsx
// Cards
<GlassCard variant="white" blur="xl">
  {/* bg-white/15 - contraste perfeito */}
</GlassCard>
```

### Componentes Pré-configurados

#### GlassCard
```tsx
<GlassCard variant="white" blur="xl" hover className="text-white">
  <h3>Título</h3>
  <p>Conteúdo</p>
</GlassCard>
```

#### GlassPanel
```tsx
<GlassPanel variant="white" blur="xl" className="text-white">
  <h2>Seção</h2>
  <div className="grid grid-cols-3 gap-6">
    {/* Stats */}
  </div>
</GlassPanel>
```

#### GlassButton
```tsx
<GlassButton 
  variant="white" 
  hover 
  className="text-white drop-shadow-sm"
>
  Ação →
</GlassButton>
```

#### GlassNavbar
```tsx
<GlassNavbar variant="white">
  <nav>Menu items</nav>
</GlassNavbar>
```

#### GlassModal
```tsx
<GlassModal variant="white" blur="xl" onClose={() => {}}>
  <div className="p-8">
    <h2>Modal Content</h2>
  </div>
</GlassModal>
```

---

## 📝 Tipografia

### Hierarquia de Texto com Text Shadow

#### Fundo Turquesa (precisa de shadow)
```tsx
// Títulos principais
<h1 className="text-6xl text-white drop-shadow-lg">

// Subtítulos
<h2 className="text-3xl text-white drop-shadow-md">

// Títulos de seção
<h3 className="text-2xl text-white drop-shadow-md">

// Parágrafos
<p className="text-white/90 drop-shadow-sm">

// Textos auxiliares
<span className="text-white/80 drop-shadow-sm">
```

#### Fundo Azul Escuro (não precisa shadow)
```tsx
// Contraste natural é suficiente
<h1 className="text-6xl text-white">
<p className="text-white/90">
```

### Quando NÃO usar classes de font
⚠️ **IMPORTANTE**: Não usar classes Tailwind de:
- `text-{size}` (tamanho)
- `font-{weight}` (peso)
- `leading-{size}` (altura da linha)

Exceto quando especificamente solicitado pelo usuário. As configurações estão em `styles/globals.css`.

---

## 🎭 Logos

### Tipos Disponíveis
```tsx
import { BeautySmileLogo } from './components/BeautySmileLogo';

<BeautySmileLogo 
  type="horizontal"    // 'horizontal' | 'vertical' | 'icon'
  size="lg"           // 'sm' | 'md' | 'lg' | 'xl'
  variant="white"     // 'white' | 'primary' | 'accent'
/>
```

### Uso Recomendado

#### Horizontal
- Headers
- Navbars
- Landing pages
- Emails

#### Vertical
- Páginas de login
- Páginas centralizadas
- Modais

#### Icon
- Favicons
- Avatares
- Ícones de menu
- Notificações

---

## 📐 Padrões de Layout

### Container Padrão
```tsx
<div className="container mx-auto px-4 space-y-8">
  {/* Conteúdo */}
</div>
```

### Grid de Cards
```tsx
// 3 colunas
<div className="grid grid-cols-1 md:grid-cols-3 gap-6">
  <GlassCard>...</GlassCard>
  <GlassCard>...</GlassCard>
  <GlassCard>...</GlassCard>
</div>

// 2 colunas
<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
  <GlassCard>...</GlassCard>
  <GlassCard>...</GlassCard>
</div>
```

### Hero Section
```tsx
<div className="flex items-center justify-center min-h-screen py-20">
  <GlassPanel variant="white" blur="xl" className="text-white text-center max-w-4xl">
    {/* Hero content */}
  </GlassPanel>
</div>
```

### Card com Ícone e Ação
```tsx
<GlassCard variant="white" blur="xl" hover className="text-white">
  <div className="space-y-3">
    {/* Ícone */}
    <div className="w-16 h-16 rounded-full bg-white/20 flex items-center justify-center backdrop-blur-md">
      <span className="text-3xl">🌊</span>
    </div>
    
    {/* Conteúdo */}
    <h3 className="text-2xl drop-shadow-md">Título</h3>
    <p className="text-white/90 drop-shadow-sm">Descrição</p>
    
    {/* Ação */}
    <GlassButton variant="white" className="w-full text-white drop-shadow-sm">
      Ação →
    </GlassButton>
  </div>
</GlassCard>
```

### Progress Bar
```tsx
<div className="w-full bg-white/10 rounded-full h-3 overflow-hidden backdrop-blur-sm">
  <div 
    className="bg-white/60 h-full rounded-full transition-all duration-500 drop-shadow-md"
    style={{ width: '75%' }}
  />
</div>
```

### Badge de Status
```tsx
<span className="px-3 py-1 rounded-full bg-white/20 text-white text-sm backdrop-blur-md drop-shadow-sm">
  {status}
</span>
```

---

## 🎯 Estados Interativos

### Hover States

#### Cards
```tsx
// Escurecer no hover (não clarear!)
hover && 'hover:bg-white/25'

// Com escala (opcional)
hover && 'hover:bg-white/25 hover:scale-[1.02]'
```

#### Botões
```tsx
<GlassButton 
  variant="white"
  hover
  className="hover:bg-white/20 active:scale-95"
>
  Botão
</GlassButton>
```

#### Links
```tsx
<a className="text-white/80 hover:text-white transition-colors">
  Link
</a>
```

### Transições
```css
/* Padrão do sistema */
transition-all duration-200  /* Rápido - botões, links */
transition-all duration-300  /* Médio - cards, hover */
transition-all duration-500  /* Lento - progress bars, animações */
```

---

## ♿ Acessibilidade

### Contraste de Cores

#### ✅ Boas Práticas
```tsx
// Texto branco sobre glass com overlay
<BackgroundImage overlayColor="bg-black" overlayOpacity={15}>
  <p className="text-white drop-shadow-sm">Legível</p>
</BackgroundImage>

// Opacidade adequada no glass
<Glass variant="white" blur="xl">  {/* bg-white/15 */}
  <p className="text-white">Legível</p>
</Glass>
```

#### ❌ Evitar
```tsx
// Texto branco sem overlay em fundo claro
<BackgroundImage background="gradient">
  <p className="text-white">Difícil de ler</p>
</BackgroundImage>

// Glass muito transparente
<Glass opacity={5}>  {/* bg-white/5 - muito claro */}
  <p className="text-white">Difícil de ler</p>
</Glass>
```

### Labels e Inputs
```tsx
<div className="space-y-2">
  <Label htmlFor="email" className="text-white">
    Email
  </Label>
  <Input
    id="email"
    type="email"
    className="bg-white/10 border-white/30 text-white placeholder:text-white/50"
  />
</div>
```

### Navegação por Teclado
- Todos os botões e links devem ser focáveis
- Usar elementos semânticos (`<button>`, `<nav>`, `<main>`)
- Estados de focus visíveis

---

## 📱 Responsividade

### Breakpoints
```tsx
// Mobile first
className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3"

// Hide em mobile
className="hidden md:inline"

// Stack em mobile
className="flex flex-col md:flex-row"
```

### Container Responsivo
```tsx
<div className="container mx-auto px-4 md:px-6 lg:px-8">
  {/* Conteúdo */}
</div>
```

---

## 🎨 Exemplos Completos

### Landing Page Hero
```tsx
<BackgroundImage 
  background="gradient"
  overlayColor="bg-black"
  overlayOpacity={15}
  className="min-h-screen"
>
  <div className="flex items-center justify-center min-h-screen py-20">
    <GlassPanel variant="white" blur="xl" className="text-white text-center max-w-4xl mx-4">
      <BeautySmileLogo type="horizontal" size="xl" variant="white" className="mx-auto mb-6" />
      <h1 className="text-6xl mb-4 drop-shadow-lg">Beauty Smile</h1>
      <p className="text-2xl text-white/90 mb-8 drop-shadow-md">
        Sistema de Recrutamento Inteligente
      </p>
      <div className="flex gap-4 justify-center">
        <GlassButton variant="white" hover className="px-8 py-4 text-white text-lg">
          Começar
        </GlassButton>
      </div>
    </GlassPanel>
  </div>
</BackgroundImage>
```

### Card de Vaga
```tsx
<GlassCard variant="white" blur="xl" hover className="text-white">
  <div className="flex items-start justify-between mb-4">
    <div className="flex-1">
      <h3 className="text-3xl mb-2 drop-shadow-md">Dentista Sênior</h3>
      <div className="flex gap-4 text-white/80 drop-shadow-sm">
        <span>📍 São Paulo, SP</span>
        <span>💰 R$ 8.000 - R$ 12.000</span>
      </div>
    </div>
    <span className="px-3 py-1 rounded-full bg-white/20 text-white text-sm backdrop-blur-md">
      92% match
    </span>
  </div>
  <p className="text-white/90 mb-4 drop-shadow-sm">
    Descrição da vaga...
  </p>
  <GlassButton variant="white" hover className="w-full text-white">
    Candidatar-se
  </GlassButton>
</GlassCard>
```

### Dashboard Stats
```tsx
<GlassPanel variant="white" blur="xl" className="text-white">
  <h2 className="text-3xl mb-6 drop-shadow-md">Estatísticas</h2>
  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
    <Glass variant="white" blur="lg" className="p-6 text-center">
      <p className="text-5xl mb-2 drop-shadow-md">85%</p>
      <p className="text-white/90 drop-shadow-sm">Compatibilidade</p>
    </Glass>
    {/* Mais stats... */}
  </div>
</GlassPanel>
```

---

## 🔧 Utilitários

### Classe CN Helper
```tsx
import { cn } from './components/ui/utils';

<div className={cn(
  'base-classes',
  condition && 'conditional-classes',
  className
)} />
```

### Classes Comuns
```tsx
// Espaçamento
'space-y-4'   // Entre filhos verticais
'gap-6'       // Grid/Flex gap

// Arredondamento
'rounded-xl'  // Cards
'rounded-full' // Badges, avatares

// Blur
'backdrop-blur-xl'  // Glass effect

// Shadow
'drop-shadow-lg'  // Títulos
'drop-shadow-md'  // Subtítulos
'drop-shadow-sm'  // Textos
```

---

## 📚 Recursos

### Arquivos Principais
- `/components/ui/glass.tsx` - Componentes glass
- `/components/BackgroundImage.tsx` - Sistema de backgrounds
- `/components/BeautySmileLogo.tsx` - Logos
- `/assets/images/backgrounds.ts` - Backgrounds
- `/styles/globals.css` - Tokens CSS

### Design System
- **Cores**: Primary #00109E, Accent #35BFAD, Secondary #BB965B
- **Tipografia**: Helvetica Neue
- **Grid**: 12 colunas, gap de 24px
- **Animações**: 200-300ms
- **Bordas**: rounded-xl (12px)
- **Shadows**: lg, md, sm

---

**Última atualização**: 2025-01-27
**Versão**: 1.0
**Autor**: Beauty Smile Design System Team
