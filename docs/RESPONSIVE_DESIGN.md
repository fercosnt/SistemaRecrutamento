# Responsive Design Guidelines

## Overview

This document outlines the responsive design patterns and best practices used throughout the Beauty Smile recruitment system. All components follow a **mobile-first** approach with progressive enhancement for larger screens.

## Table of Contents

1. [Breakpoints](#breakpoints)
2. [Layout Patterns](#layout-patterns)
3. [Touch Targets](#touch-targets)
4. [Typography](#typography)
5. [Spacing](#spacing)
6. [Component Guidelines](#component-guidelines)
7. [Testing Checklist](#testing-checklist)
8. [Accessibility](#accessibility)

---

## Breakpoints

We use Tailwind CSS's default breakpoints:

```typescript
{
  'xs': '475px',   // Extra small devices (custom breakpoint)
  'sm': '640px',   // Small devices (landscape phones)
  'md': '768px',   // Medium devices (tablets)
  'lg': '1024px',  // Large devices (desktops)
  'xl': '1280px',  // Extra large devices
  '2xl': '1536px'  // 2X Extra large devices
}
```

### Usage Pattern

Always start with **mobile-first** (no prefix), then add breakpoint prefixes for larger screens:

```tsx
// ✅ Good: Mobile-first approach
<div className="text-sm sm:text-base md:text-lg">

// ❌ Bad: Desktop-first approach
<div className="text-lg md:text-base sm:text-sm">
```

---

## Layout Patterns

### Container Widths

```tsx
// Standard page container
<div className="w-full max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
```

### Grid Layouts

Grid layouts should collapse to single column on mobile:

```tsx
// 2-column grid
<div className="grid grid-cols-1 md:grid-cols-2 gap-6">

// 3-column grid
<div className="grid grid-cols-1 md:grid-cols-3 gap-6">

// Variable columns (e.g., CNH categories)
<div className="grid grid-cols-3 sm:grid-cols-5 gap-3">
```

### Flexbox Layouts

Stack vertically on mobile, horizontal on larger screens:

```tsx
// Navigation buttons
<div className="flex flex-col sm:flex-row justify-between gap-3 sm:gap-4">
  <Button className="w-full sm:w-auto">Voltar</Button>
  <Button className="w-full sm:w-auto">Próximo</Button>
</div>
```

---

## Touch Targets

### Minimum Size Requirements

Following **iOS Human Interface Guidelines** and **Material Design**:

- **Minimum touch target**: 44x44px (iOS) / 48x48px (Material)
- **Recommended**: 44x44px minimum for all interactive elements

### Implementation

```tsx
// Step navigation buttons
<button
  className={cn(
    'flex flex-col items-center gap-1 sm:gap-2 flex-1',
    'min-w-[44px] min-h-[44px]', // Minimum touch target
    'touch-manipulation' // Improves touch responsiveness
  )}
>
  {/* Button content */}
</button>
```

### Touch Manipulation

Always add `touch-manipulation` to interactive elements for better mobile performance:

```tsx
className="touch-manipulation cursor-pointer"
```

---

## Typography

### Heading Sizes

```tsx
// Page title
<h1 className="text-2xl sm:text-3xl md:text-4xl font-bold">

// Section heading
<h2 className="text-xl sm:text-2xl font-bold">

// Subsection heading
<h3 className="text-lg sm:text-xl font-semibold">
```

### Body Text

```tsx
// Regular text
<p className="text-sm sm:text-base">

// Small text (labels, hints)
<p className="text-xs sm:text-sm">

// Description text
<p className="text-sm sm:text-base text-white/80">
```

### Icon Sizes

Icons should scale with their container:

```tsx
// Button icons
<ChevronRight className="w-4 h-4 sm:w-5 sm:h-5" />

// Step indicator icons
<Check className="w-4 h-4 sm:w-5 sm:h-5" />

// Decorative icons
<AlertCircle className="w-5 h-5 sm:w-6 sm:h-6" />
```

---

## Spacing

### Padding

```tsx
// Container padding
<div className="px-4 sm:px-6 lg:px-8">

// Card padding
<div className="p-4 sm:p-6 md:p-8">

// Vertical spacing
<div className="py-4 sm:py-6">
```

### Gaps

```tsx
// Small gaps (between related items)
<div className="gap-2 sm:gap-3">

// Medium gaps (form fields)
<div className="gap-3 sm:gap-4">

// Large gaps (sections)
<div className="gap-4 sm:gap-6">
```

### Margins

```tsx
// Section spacing
<div className="space-y-4 sm:space-y-6">

// Content spacing
<div className="mb-4 sm:mb-6">
```

---

## Component Guidelines

### Buttons

```tsx
// Full-width on mobile, auto on desktop
<Button className="w-full sm:w-auto">
  Continuar
</Button>

// Icon positioning
<Button>
  <Icon className="w-4 h-4 mr-2" />
  Text
</Button>
```

### Forms

#### Input Fields

```tsx
<Input
  type="text"
  className="bg-white/20 border-white/30 text-white placeholder:text-white/50"
/>
```

#### Form Grids

```tsx
// Single field (full width)
<div className="space-y-2">
  <Label>Nome Completo</Label>
  <Input />
</div>

// Two fields side-by-side
<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
  <div className="space-y-2">
    <Label>Email</Label>
    <Input type="email" />
  </div>
  <div className="space-y-2">
    <Label>Telefone</Label>
    <Input type="tel" />
  </div>
</div>
```

### Step Navigation

```tsx
<div className="flex justify-between items-center gap-1 sm:gap-2">
  {steps.map((step, index) => (
    <button
      key={step.id}
      aria-label={step.title}
      className={cn(
        'flex flex-col items-center gap-1 sm:gap-2 flex-1',
        'min-w-[44px] min-h-[44px]',
        'touch-manipulation'
      )}
    >
      {/* Circle indicator */}
      <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full">
        {/* Content */}
      </div>

      {/* Title (hidden on mobile) */}
      <div className="hidden sm:block">
        <p className="text-xs">{step.title}</p>
      </div>
    </button>
  ))}
</div>
```

### Dialogs & Modals

```tsx
<Dialog>
  <DialogContent className="sm:max-w-md">
    <DialogHeader>
      <DialogTitle className="text-lg sm:text-xl">
        Title
      </DialogTitle>
    </DialogHeader>
    {/* Content */}
  </DialogContent>
</Dialog>
```

### Progress Indicators

```tsx
<div className="space-y-2">
  {/* Progress text */}
  <div className="flex justify-between text-xs sm:text-sm">
    <span>Etapa {current} de {total}</span>
    <span className="hidden xs:inline">{percent}% completo</span>
  </div>

  {/* Progress bar */}
  <Progress value={percent} className="h-2" />
</div>
```

---

## Testing Checklist

### Visual Testing

- [ ] **320px width** (iPhone SE) - smallest supported size
- [ ] **375px width** (iPhone 12/13 Mini)
- [ ] **390px width** (iPhone 14)
- [ ] **414px width** (iPhone 14 Plus)
- [ ] **768px width** (iPad Portrait)
- [ ] **1024px width** (iPad Landscape)
- [ ] **1280px width** (Desktop)

### Interaction Testing

- [ ] All touch targets are at least 44x44px
- [ ] No horizontal scrolling on any screen size
- [ ] Text is readable without zooming
- [ ] Buttons are easy to tap on mobile
- [ ] Forms are easy to fill on mobile
- [ ] Dialogs/modals work on mobile
- [ ] Step navigation works on mobile

### Keyboard Navigation

- [ ] Tab order is logical
- [ ] All interactive elements are focusable
- [ ] Focus indicators are visible
- [ ] Enter/Space work on buttons
- [ ] Escape closes dialogs
- [ ] Arrow keys work in selects/radio groups

### Performance

- [ ] Images are optimized for mobile
- [ ] No layout shift during loading
- [ ] Smooth scrolling on mobile
- [ ] Fast touch response (no 300ms delay)

---

## Accessibility

### Semantic HTML

Always use semantic HTML elements:

```tsx
// ✅ Good
<button onClick={handleClick}>Click me</button>

// ❌ Bad
<div onClick={handleClick}>Click me</div>
```

### ARIA Labels

Add aria-labels for icons and non-text buttons:

```tsx
<button
  aria-label="Próxima etapa"
  className="..."
>
  <ChevronRight />
</button>
```

### Focus Management

Ensure focus is managed properly:

```tsx
// Auto-focus next field after CEP lookup
setTimeout(() => {
  document.getElementById('numero')?.focus()
}, 100)
```

### Color Contrast

Maintain WCAG AA contrast ratios:

- **Normal text**: 4.5:1 minimum
- **Large text** (18pt+): 3:1 minimum
- **UI components**: 3:1 minimum

---

## Examples from Codebase

### CadastroMultiStepForm.tsx

**Container:**
```tsx
<div className="w-full max-w-4xl mx-auto space-y-4 sm:space-y-6 px-4 sm:px-6">
```

**Progress Bar:**
```tsx
<div className="flex justify-between text-xs sm:text-sm text-white/90">
  <span>Etapa {currentStepIndex + 1} de {FORM_STEPS.length}</span>
  <span className="hidden xs:inline">{Math.round(progress)}% completo</span>
</div>
```

**Step Circles:**
```tsx
<div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full">
  {isCompleted ? (
    <Check className="w-4 h-4 sm:w-5 sm:h-5" />
  ) : (
    <span className="text-xs sm:text-base font-semibold">{index + 1}</span>
  )}
</div>
```

**Content Card:**
```tsx
<div className="bg-white/10 backdrop-blur-lg rounded-lg p-4 sm:p-6 md:p-8">
  <h2 className="text-xl sm:text-2xl font-bold text-white mb-2">
    {currentStep.title}
  </h2>
  <p className="text-sm sm:text-base text-white/80">
    {currentStep.description}
  </p>
</div>
```

**Navigation Buttons:**
```tsx
<div className="flex flex-col sm:flex-row justify-between gap-3 sm:gap-4 pb-4 sm:pb-0">
  <Button className="w-full sm:w-auto">Voltar</Button>
  <Button className="w-full sm:w-auto">Próximo</Button>
</div>
```

### DadosPessoaisStep.tsx

**Form Grid:**
```tsx
<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
  <div className="space-y-2">
    <Label>Email</Label>
    <Input type="email" />
  </div>
  <div className="space-y-2">
    <Label>Telefone</Label>
    <Input type="tel" />
  </div>
</div>
```

### DisponibilidadeStep.tsx

**Radio Group:**
```tsx
<RadioGroup className="grid grid-cols-1 sm:grid-cols-2 gap-4">
  {options.map((option) => (
    <div key={option.value} className="flex items-center space-x-3">
      <RadioGroupItem value={option.value} />
      <Label>
        <p className="font-medium">{option.label}</p>
        <p className="text-sm text-white/70">{option.description}</p>
      </Label>
    </div>
  ))}
</RadioGroup>
```

---

## Best Practices Summary

1. ✅ **Always start mobile-first** - Base styles are for mobile, add breakpoint prefixes for larger screens
2. ✅ **Use semantic HTML** - button, input, label, etc.
3. ✅ **Ensure 44x44px minimum touch targets** - Especially important for navigation
4. ✅ **Add touch-manipulation** - Improves mobile touch performance
5. ✅ **Test on real devices** - Simulators don't always show real-world issues
6. ✅ **Use aria-labels** - For icons and non-text buttons
7. ✅ **Maintain logical tab order** - Test keyboard navigation
8. ✅ **Avoid horizontal scrolling** - Use responsive grids and flex
9. ✅ **Scale typography responsively** - Larger text on larger screens
10. ✅ **Use appropriate spacing** - More compact on mobile, more spacious on desktop

---

## Tools & Resources

### Testing Tools

- **Chrome DevTools** - Device mode for responsive testing
- **Firefox Responsive Design Mode** - Additional device presets
- **BrowserStack** - Real device testing
- **Lighthouse** - Mobile performance and accessibility audits

### Documentation

- [Tailwind CSS Responsive Design](https://tailwindcss.com/docs/responsive-design)
- [iOS Human Interface Guidelines](https://developer.apple.com/design/human-interface-guidelines/)
- [Material Design Touch Targets](https://material.io/design/usability/accessibility.html#layout-and-typography)
- [WCAG 2.1 Guidelines](https://www.w3.org/WAI/WCAG21/quickref/)

---

**Last Updated:** 2025-11-05
**Version:** 1.0.0
