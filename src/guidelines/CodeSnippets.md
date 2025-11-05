# Beauty Smile - Snippets de Código

Coleção de snippets reutilizáveis para acelerar o desenvolvimento.

---

## 🎨 Estrutura Base de Página

### Página Pública (Candidatos)
```tsx
import React from 'react';
import { BackgroundImage } from '../BackgroundImage';
import { BeautySmileLogo } from '../BeautySmileLogo';
import { GlassCard, GlassButton } from '../ui/glass';

export function MinhaPagePublica() {
  return (
    <div className="relative min-h-screen">
      <BackgroundImage 
        background="gradient"
        overlayColor="bg-black"
        overlayOpacity={15}
        className="min-h-screen py-20"
      >
        <div className="container mx-auto px-4 space-y-8">
          {/* Header */}
          <div className="text-center mb-12">
            <BeautySmileLogo type="horizontal" size="xl" variant="white" className="mx-auto mb-4" />
            <h1 className="text-white text-5xl mb-2 drop-shadow-lg">Título</h1>
            <p className="text-white/90 text-xl drop-shadow-md">Subtítulo</p>
          </div>

          {/* Conteúdo */}
          {/* Adicione seus cards e conteúdo aqui */}
        </div>
      </BackgroundImage>
    </div>
  );
}
```

### Página Administrativa (RH)
```tsx
import React from 'react';
import { BackgroundImage } from '../BackgroundImage';
import { BeautySmileLogo } from '../BeautySmileLogo';
import { Glass, GlassPanel } from '../ui/glass';

export function MinhaPageAdmin() {
  return (
    <div className="relative min-h-screen">
      <BackgroundImage background="darkBlue" className="min-h-screen py-8">
        {/* Navbar */}
        <Glass variant="white" blur="xl" className="mx-4 mb-8 px-6 py-4">
          <div className="flex items-center justify-between">
            <BeautySmileLogo type="horizontal" size="md" variant="white" />
            <nav className="flex gap-6 text-white/80">
              <a href="#" className="hover:text-white transition-colors">Dashboard</a>
              <a href="#" className="hover:text-white transition-colors">Candidatos</a>
            </nav>
          </div>
        </Glass>

        {/* Conteúdo */}
        <div className="container mx-auto px-4 space-y-8">
          {/* Adicione seu conteúdo aqui */}
        </div>
      </BackgroundImage>
    </div>
  );
}
```

---

## 💎 Cards

### Card de Feature
```tsx
<GlassCard variant="white" blur="xl" hover className="text-white">
  <div className="space-y-3">
    <div className="w-16 h-16 rounded-full bg-white/20 flex items-center justify-center backdrop-blur-md">
      <span className="text-3xl">🌊</span>
    </div>
    <h3 className="text-2xl drop-shadow-md">Título</h3>
    <p className="text-white/90 drop-shadow-sm">
      Descrição do card
    </p>
    <GlassButton variant="white" className="w-full mt-4 text-white drop-shadow-sm">
      Ação →
    </GlassButton>
  </div>
</GlassCard>
```

### Card de Estatística
```tsx
<GlassCard variant="white" blur="xl" hover className="text-white text-center">
  <div className="space-y-2">
    <div className="w-14 h-14 rounded-full bg-white/20 flex items-center justify-center mx-auto backdrop-blur-md">
      <span className="text-2xl">👥</span>
    </div>
    <p className="text-4xl drop-shadow-md">142</p>
    <p className="text-white/80 drop-shadow-sm">Candidatos Ativos</p>
  </div>
</GlassCard>
```

### Card com Progresso
```tsx
<GlassCard variant="white" blur="xl" hover className="text-white">
  <div className="space-y-4">
    <div className="flex items-center gap-4">
      <div className="w-14 h-14 rounded-full bg-white/20 flex items-center justify-center backdrop-blur-md">
        <span className="text-2xl">🧠</span>
      </div>
      <div className="flex-1">
        <h3 className="text-2xl drop-shadow-md">Big Five</h3>
        <p className="text-white/80 drop-shadow-sm">Teste de Personalidade</p>
      </div>
      <div className="text-right">
        <div className="text-sm text-white/70 drop-shadow-sm">Em Progresso</div>
        <div className="text-2xl drop-shadow-md">45%</div>
      </div>
    </div>

    {/* Progress bar */}
    <div className="w-full bg-white/10 rounded-full h-2 overflow-hidden backdrop-blur-sm">
      <div 
        className="bg-white/60 h-full rounded-full drop-shadow-md transition-all duration-500" 
        style={{ width: '45%' }} 
      />
    </div>

    <GlassButton variant="white" className="w-full text-white drop-shadow-sm">
      Continuar Teste →
    </GlassButton>
  </div>
</GlassCard>
```

---

## 📊 Progress Bar

### Simples
```tsx
<div className="w-full bg-white/10 rounded-full h-3 overflow-hidden backdrop-blur-sm">
  <div 
    className="bg-white/60 h-full rounded-full transition-all duration-500 drop-shadow-md"
    style={{ width: '75%' }}
  />
</div>
```

### Com Label
```tsx
<Glass variant="white" blur="sm" className="p-3">
  <div className="flex items-center gap-3">
    <span className="text-white/80 text-sm drop-shadow-sm">Progresso:</span>
    <div className="flex-1 bg-white/10 rounded-full h-2 overflow-hidden backdrop-blur-sm">
      <div 
        className="bg-white/60 h-full rounded-full drop-shadow-md transition-all duration-500"
        style={{ width: '75%' }}
      />
    </div>
    <span className="text-white drop-shadow-md">75%</span>
  </div>
</Glass>
```

---

## 🏷️ Badges

### Badge Simples
```tsx
<span className="px-3 py-1 rounded-full bg-white/20 text-white text-sm backdrop-blur-md drop-shadow-sm">
  Badge
</span>
```

### Badge com Match Score
```tsx
<span className="px-3 py-1 rounded-full bg-white/20 text-white text-sm backdrop-blur-md drop-shadow-sm">
  92% match
</span>
```

### Badge de Status
```tsx
<div className="flex gap-2">
  <span className="px-3 py-1 rounded-full bg-white/15 text-white/90 text-sm backdrop-blur-md border border-white/20 drop-shadow-sm">
    CRO ativo
  </span>
  <span className="px-3 py-1 rounded-full bg-white/15 text-white/90 text-sm backdrop-blur-md border border-white/20 drop-shadow-sm">
    5+ anos
  </span>
</div>
```

---

## 🔘 Botões

### Botão Primário
```tsx
<GlassButton 
  variant="white" 
  hover 
  className="px-8 py-4 text-white text-lg drop-shadow-sm"
  onClick={() => {}}
>
  Ação Principal →
</GlassButton>
```

### Botão Secundário
```tsx
<GlassButton 
  variant="white" 
  className="px-6 py-3 text-white drop-shadow-sm"
  onClick={() => {}}
>
  Ação Secundária
</GlassButton>
```

### Botão de Navegação
```tsx
<div className="flex justify-between items-center">
  <GlassButton variant="white" className="px-6 py-3 text-white drop-shadow-sm">
    ← Anterior
  </GlassButton>
  <GlassButton variant="white" className="px-6 py-3 text-white drop-shadow-sm">
    Próxima →
  </GlassButton>
</div>
```

---

## 📝 Formulários

### Input com Label
```tsx
import { Input } from '../ui/input';
import { Label } from '../ui/label';

<div className="space-y-2">
  <Label htmlFor="email" className="text-white">Email</Label>
  <Input
    id="email"
    type="email"
    placeholder="seu.email@exemplo.com"
    className="bg-white/10 border-white/30 text-white placeholder:text-white/50 backdrop-blur-sm"
  />
</div>
```

### Formulário Completo
```tsx
<Glass variant="white" blur="md" className="p-6 space-y-4">
  <div className="space-y-2">
    <Label htmlFor="nome" className="text-white">Nome Completo</Label>
    <Input
      id="nome"
      type="text"
      placeholder="Seu nome"
      className="bg-white/10 border-white/30 text-white placeholder:text-white/50 backdrop-blur-sm"
    />
  </div>

  <div className="space-y-2">
    <Label htmlFor="email" className="text-white">Email</Label>
    <Input
      id="email"
      type="email"
      placeholder="seu.email@exemplo.com"
      className="bg-white/10 border-white/30 text-white placeholder:text-white/50 backdrop-blur-sm"
    />
  </div>

  <GlassButton variant="white" hover className="w-full py-3 text-white">
    Enviar
  </GlassButton>
</Glass>
```

---

## 🎯 Escala de Resposta (Questionário)

```tsx
const [selectedValue, setSelectedValue] = useState<number>(3);

<div>
  <div className="flex items-center justify-between mb-4 text-sm text-white/80 drop-shadow-sm">
    <span>Discordo Totalmente</span>
    <span>Concordo Totalmente</span>
  </div>

  <div className="flex gap-3 justify-center">
    {[1, 2, 3, 4, 5].map((value) => (
      <button
        key={value}
        onClick={() => setSelectedValue(value)}
        className={`w-14 h-14 rounded-full backdrop-blur-md border-2 transition-all duration-200 drop-shadow-md ${
          selectedValue === value
            ? 'bg-white/40 border-white scale-110'
            : 'bg-white/10 border-white/30 hover:bg-white/20 hover:scale-105'
        }`}
      >
        <span className="text-white">{value}</span>
      </button>
    ))}
  </div>
</div>
```

---

## 📋 Lista de Itens

### Lista com Cards
```tsx
<div className="space-y-4">
  {items.map((item, index) => (
    <Glass key={index} variant="white" blur="lg" hover className="p-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center backdrop-blur-md">
            <span className="text-white text-lg">{item.icon}</span>
          </div>
          <div>
            <h3 className="text-white text-xl">{item.title}</h3>
            <p className="text-white/70">{item.subtitle}</p>
          </div>
        </div>
        <GlassButton variant="white" className="text-white">
          Ver Mais
        </GlassButton>
      </div>
    </Glass>
  ))}
</div>
```

---

## 📐 Grids

### 3 Colunas
```tsx
<div className="grid grid-cols-1 md:grid-cols-3 gap-6">
  <GlassCard>Item 1</GlassCard>
  <GlassCard>Item 2</GlassCard>
  <GlassCard>Item 3</GlassCard>
</div>
```

### 2 Colunas
```tsx
<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
  <GlassCard>Item 1</GlassCard>
  <GlassCard>Item 2</GlassCard>
</div>
```

### 4 Colunas (Stats)
```tsx
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
  <StatCard {...} />
  <StatCard {...} />
  <StatCard {...} />
  <StatCard {...} />
</div>
```

---

## 🎭 Navbar

### Navbar Fixa
```tsx
<Glass 
  variant="white" 
  blur="xl" 
  className="fixed top-0 left-0 right-0 z-50 mx-4 mt-4 px-6 py-4"
>
  <div className="flex items-center justify-between">
    <BeautySmileLogo type="horizontal" size="md" variant="white" />
    <nav className="flex gap-6 text-white/80">
      <a href="#" className="hover:text-white transition-colors">Link 1</a>
      <a href="#" className="hover:text-white transition-colors">Link 2</a>
      <a href="#" className="hover:text-white transition-colors">Link 3</a>
    </nav>
  </div>
</Glass>
```

### Navbar com Avatar
```tsx
<Glass variant="white" blur="xl" className="px-6 py-4">
  <div className="flex items-center justify-between">
    <BeautySmileLogo type="horizontal" size="md" variant="white" />
    <div className="flex items-center gap-6">
      <nav className="flex gap-6 text-white/80">
        <a href="#" className="hover:text-white transition-colors">Dashboard</a>
        <a href="#" className="hover:text-white transition-colors">Perfil</a>
      </nav>
      <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center backdrop-blur-md">
        <span className="text-white">RH</span>
      </div>
    </div>
  </div>
</Glass>
```

---

## 🏆 Hero Section

```tsx
<div className="flex items-center justify-center min-h-screen py-20">
  <GlassPanel variant="white" blur="xl" className="text-white text-center max-w-4xl mx-4">
    <div className="space-y-6">
      <div className="w-20 h-20 rounded-full bg-white/20 flex items-center justify-center mx-auto backdrop-blur-md">
        <BeautySmileLogo size="lg" variant="white" />
      </div>
      <h1 className="text-6xl mb-4 drop-shadow-lg">Beauty Smile</h1>
      <p className="text-2xl text-white/90 mb-8 drop-shadow-md">
        Sistema de Recrutamento Inteligente
      </p>
      <p className="text-white/90 text-lg mb-8 drop-shadow-sm">
        Tecnologia de ponta com design moderno em liquid glass.<br/>
        Encontre os melhores talentos para sua equipe odontológica.
      </p>
      <div className="flex gap-4 justify-center">
        <GlassButton variant="white" hover className="px-8 py-4 text-white text-lg drop-shadow-sm">
          Candidatar-se a uma Vaga
        </GlassButton>
        <GlassButton variant="white" hover className="px-8 py-4 text-white text-lg drop-shadow-sm">
          Área do RH
        </GlassButton>
      </div>
    </div>
  </GlassPanel>
</div>
```

---

## 💡 Dicas Úteis

### Espaçamento Consistente
```tsx
// Vertical
className="space-y-4"  // 16px
className="space-y-6"  // 24px
className="space-y-8"  // 32px

// Horizontal
className="space-x-4"  // 16px
className="space-x-6"  // 24px

// Grid/Flex Gap
className="gap-4"  // 16px
className="gap-6"  // 24px
```

### Arredondamento
```tsx
className="rounded-lg"    // 8px - inputs
className="rounded-xl"    // 12px - cards
className="rounded-full"  // circular - badges, avatares
```

### Transições
```tsx
className="transition-all duration-200"  // Rápido
className="transition-all duration-300"  // Médio
className="transition-all duration-500"  // Lento
className="transition-colors"            // Apenas cores
```

### Texto Responsivo
```tsx
// Hide em mobile
className="hidden md:inline"
className="hidden md:block"

// Show apenas em mobile
className="md:hidden"

// Texto menor em mobile
className="text-4xl md:text-6xl"
```

---

## 🎨 Classes Utilitárias

### Drop Shadows
```tsx
className="drop-shadow-sm"   // Texto pequeno
className="drop-shadow-md"   // Subtítulos
className="drop-shadow-lg"   // Títulos principais
```

### Backdrop
```tsx
className="backdrop-blur-sm"        // 4px
className="backdrop-blur-md"        // 12px
className="backdrop-blur-lg"        // 16px
className="backdrop-blur-xl"        // 24px
className="backdrop-saturate-150"   // +50% saturação
```

### Opacidade
```tsx
className="text-white"      // 100%
className="text-white/90"   // 90%
className="text-white/80"   // 80%
className="text-white/70"   // 70%
className="bg-white/10"     // 10%
className="bg-white/15"     // 15%
className="bg-white/20"     // 20%
```

---

**Última atualização**: 2025-01-27
