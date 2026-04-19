# Convenções de Código

**Data da Análise:** 2026-04-19
**Escopo:** Sistema de Recrutamento Beauty Smile (Vite + React 18 + TypeScript + Supabase)

---

## 1. Idioma do Código

O projeto adota um **padrão misto pt-BR/en** bem consistente:

| Tipo | Idioma | Observação |
|------|--------|------------|
| Nomes de domínio (ex.: `Candidato`, `Vaga`, `Disponibilidade`, `Autorizacoes`) | **Português** | Reflete termos do banco de dados |
| Nomes técnicos (ex.: `useForm`, `handleSubmit`, `setLoading`) | **Inglês** | Padrão React/TypeScript |
| Comentários e JSDoc | **Português (pt-BR)** | Ex.: `/** Hook para verificação de duplicatas */` |
| Mensagens de erro/validação (Zod) | **Português** | Ex.: `"CPF inválido. Verifique os dígitos verificadores."` |
| Chaves de formulário/propriedades DB | **snake_case em pt-BR** | `nome_completo`, `data_nascimento`, `como_conheceu` |
| Nomes de funções utilitárias | **Inglês** | `validateCPF`, `formatCPF`, `cleanCPF` |
| Mensagens de toast (Sonner) | **Português** | Ex.: `"Login realizado com sucesso"` |
| Commit messages | **Português misturado com inglês** | Ex.: `feat: Task 9 - E2E Tests com Playwright` |

**Regra prática:** texto visível ao usuário final e campos de domínio = português; código, hooks, tipos e imports = inglês.

---

## 2. Estrutura de Arquivos e Nomenclatura

### 2.1 Arquivos e Pastas

| Tipo | Padrão | Exemplo |
|------|--------|---------|
| Componentes React | `PascalCase.tsx` | `CadastroMultiStepForm.tsx`, `LoginCandidatoPage.tsx`, `MetricCard.tsx` |
| Componentes shadcn/ui | `kebab-case.tsx` | `src/components/ui/button.tsx`, `alert-dialog.tsx` |
| Hooks customizados | `useCamelCase.ts` | `useDuplicateCheck.ts`, `useViaCEP.ts`, `useFormToast.ts`, `useVagas.ts`, `useSessionTimeout.ts` |
| Services | `camelCaseService.ts` | `cadastroService.ts`, `duplicateCheckService.ts`, `viaCepService.ts`, `errorHandlingService.ts` |
| Schemas Zod | `camelCaseSchema.ts` | `candidatoSchema.ts`, `loginSchema.ts`, `adminLoginSchema.ts`, `passwordRecoverySchema.ts` |
| Zustand stores | `camelCaseStore.ts` | `authStore.ts`, `adminAuthStore.ts` |
| Tipos TypeScript | `camelCase.ts` ou em `types/` | `vagasTypes.ts`, `src/features/cadastro/types/` |
| Utilitários | `camelCase.ts` | `cpfValidator.ts`, `src/lib/utils.ts` |
| Testes unitários | co-localizados em `__tests__/` | `src/features/cadastro/services/__tests__/cadastroService.test.ts` |
| Testes E2E | `kebab-case-flow.spec.ts` | `e2e/login-flow.spec.ts`, `e2e/cadastro-flow.spec.ts` |

### 2.2 Organização por Feature (feature-based)

O código de domínio é organizado em **`src/features/<feature>/`** com subpastas padronizadas:

```
src/features/cadastro/
├── components/           # Componentes visuais (+ steps/ para multi-step)
│   ├── __tests__/       # Testes de componente (vitest + RTL)
│   └── steps/
├── hooks/               # Hooks específicos da feature
├── schemas/             # Schemas Zod + re-export em index.ts
├── services/            # Lógica de negócio + integração Supabase
│   └── __tests__/       # Testes de serviço (vitest + mocks)
├── types/               # Tipos TypeScript do domínio
├── utils/               # Funções puras (CPF, formatação)
│   └── __tests__/
└── README.md
```

Features atuais: `auth/`, `cadastro/`, `vagas/`.

### 2.3 Componentes "Página" (legado)

`src/components/pages/*.tsx` contém telas inteiras em arquivos únicos (ex.: `VagasRHPage.tsx`, `LoginCandidatoPage.tsx`, `DashboardRHPage.tsx`). Este padrão pré-data a adoção do layout `src/features/` e ainda contém a maior parte do código da área RH.

### 2.4 Onde colocar novo código

| Tipo de código | Destino |
|----------------|---------|
| Nova página | `src/components/pages/NovaPagina.tsx` + rota em `src/router/routes.tsx` |
| Nova feature de domínio | `src/features/<feature>/` com subpastas |
| Hook compartilhado entre features | `src/hooks/useCamelCase.ts` |
| Service compartilhado | `src/services/xxxService.ts` |
| Componente shadcn novo | `src/components/ui/kebab-case.tsx` |
| Tipo global | `src/types/` (se houver) ou `database.types.ts` (gerado pelo Supabase CLI) |

---

## 3. Configuração TypeScript

`tsconfig.json`:

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true,
    "jsx": "react-jsx",
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "isolatedModules": true,
    "noEmit": true,
    "paths": { "@/*": ["./src/*"] }
  }
}
```

**Observações:**
- **strict mode totalmente ativo** (incluindo `noUnusedLocals`/`noUnusedParameters`).
- O script `npm run lint` roda apenas `tsc --noEmit` — **não há ESLint/Prettier configurados** no projeto (não existem `.eslintrc`, `eslint.config.js`, nem `.prettierrc`).
- Build com `noEmit: true`: tipos são verificados mas os arquivos finais vêm do `vite build` via `@vitejs/plugin-react-swc`.

---

## 4. Imports

### 4.1 Alias de caminho absoluto

Usa-se o alias **`@/*`** apontando para `./src/*` (configurado em `tsconfig.json` e `vite.config.ts`):

```typescript
import { supabase } from '@/lib/supabase/client'
import { useAuthStore } from '@/store/authStore'
import { useVagas } from '@/features/vagas/hooks/useVagas'
import { Button } from '@/components/ui/button'
import { loginSchema } from '@/schemas/loginSchema'
```

### 4.2 Imports relativos

Usados dentro da mesma feature (`../schemas`, `../../utils`).

### 4.3 Ordem de imports (convencional, não forçada por lint)

Ordem observada nos arquivos:

```typescript
// 1. React e bibliotecas core
import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'

// 2. Bibliotecas de terceiros
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { toast } from 'sonner'
import { z } from 'zod'

// 3. Imports absolutos @/
import { supabase } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'

// 4. Imports relativos (mesma feature)
import { candidatoFormSchema } from '../schemas'
import type { CandidatoFormData } from '../types'
```

### 4.4 Imports com versão embutida (legado Figma Make)

`src/components/ui/*.tsx` e alguns arquivos antigos ainda usam o padrão de **imports com versão** herdado do export do Figma Make:

```typescript
import { Slot } from "@radix-ui/react-slot@1.1.2"
import { cva } from "class-variance-authority@0.7.1"
import { toast } from 'sonner@2.0.3'
```

O `vite.config.ts` resolve estas strings via `resolve.alias` (ex.: `'sonner@2.0.3': 'sonner'`). **Em código novo usar sempre o nome sem versão** (`import { toast } from 'sonner'`).

---

## 5. Componentes React

### 5.1 Padrão funcional + hooks (sempre)

- Apenas **function components**. Nenhuma classe.
- `React.forwardRef` usado nos primitivos `src/components/ui/*` (ex.: `Button`, `Input`).
- Export nomeado (`export function LoginCandidatoPage()`) — raramente `export default`.

### 5.2 Estrutura típica de componente de página

```typescript
export function LoginCandidatoPage({ onEsqueciSenha }: LoginCandidatoPageProps = {}) {
  // 1. Hooks de estado local
  const [showPassword, setShowPassword] = useState(false)

  // 2. Hooks de roteamento
  const navigate = useNavigate()
  const location = useLocation()

  // 3. Hooks de store global (Zustand)
  const { setUser, setSession } = useAuthStore()

  // 4. React Hook Form + zodResolver
  const { register, handleSubmit, formState: { errors, isSubmitting, isValid } } =
    useForm<LoginFormData>({
      resolver: zodResolver(loginSchema),
      mode: 'all',
      reValidateMode: 'onChange',
      defaultValues: { email: '', password: '', rememberMe: false },
    })

  // 5. Handlers
  const onSubmit = async (data: LoginFormData) => { /* ... */ }

  // 6. JSX
  return (/* ... */)
}
```

### 5.3 Multi-step forms (padrão `CadastroMultiStepForm`)

Padrão usado em `src/features/cadastro/components/CadastroMultiStepForm.tsx`:

- Um único `useForm` no container, compartilhado via `FormProvider` do RHF.
- Array `FORM_STEPS` declarando `{ id, title, description, schema, component }`.
- Cada step (`src/features/cadastro/components/steps/*.tsx`) consome o form com `useFormContext<CandidatoFormData>()`.
- Validação **por step** com o schema correspondente antes de avançar.
- Navegação: botões "Voltar" / "Próximo" + step-indicators clicáveis (`aria-label="Dados Pessoais"`, etc.).
- Submit final dispara `LoadingProgress` (dialog com estágios: criar auth → salvar candidato → salvar disponibilidade → salvar autorizações).

---

## 6. Validação de Formulários (Zod + React Hook Form)

### 6.1 Localização dos schemas

- **Feature-scoped:** `src/features/<feature>/schemas/*Schema.ts`
- **Schemas globais:** `src/schemas/*.ts` (`loginSchema`, `adminLoginSchema`, `passwordRecoverySchema`)

### 6.2 Padrão de composição

Schemas são construídos em pedaços (primitivos → composição):

```typescript
// src/features/cadastro/schemas/candidatoSchema.ts
const cpfSchema = z.string()
  .min(1, 'CPF é obrigatório')
  .refine(validateCPF, { message: 'CPF inválido. Verifique os dígitos verificadores.' })

const telefoneSchema = z.string()
  .min(1, 'Telefone é obrigatório')
  .regex(/^\(?([1-9]{2})\)?\s?9?\d{4}-?\d{4}$/, 'Telefone inválido. Use formato: (11) 98765-4321')
  .transform((val) => val.replace(/\D/g, ''))   // normaliza para salvar só dígitos

export const dadosPessoaisSchema = z.object({
  nome_completo: z.string().min(3, '...').regex(/^[a-zA-ZÀ-ÿ\s]+$/, '...').transform(v => v.trim()),
  cpf: cpfSchema,
  email: emailSchema,
  // ...
}).refine(data => data.senha === data.confirmar_senha, {
  message: 'As senhas não coincidem',
  path: ['confirmar_senha'],
})
```

### 6.3 Convenções de schema

- **Mensagens em pt-BR** sempre (`'CPF é obrigatório'`, `'Idade deve estar entre 16 e 100 anos'`).
- **Transforms** usados para normalização (lowercase email, dígitos-only telefone, trim nome).
- **Cross-field validation** via `.refine()` com `path` apontando para o campo onde o erro deve aparecer.
- **Export do tipo** junto ao schema: `export type CandidatoFormData = z.infer<typeof candidatoFormSchema>`.
- **Índice da feature** re-exporta tudo: `src/features/cadastro/schemas/index.ts`.

### 6.4 Uso no componente

```typescript
const { register, handleSubmit, formState: { errors } } = useForm<LoginFormData>({
  resolver: zodResolver(loginSchema),
  mode: 'all',              // valida em change/blur/submit
  reValidateMode: 'onChange',
  defaultValues: { /* ... */ },
})
```

---

## 7. Camada de Serviços

### 7.1 Padrão arquitetural

Toda comunicação com Supabase, n8n ou APIs externas é encapsulada em **serviços puros** (`*Service.ts`) que:

1. Recebem dados já validados pelo Zod.
2. Retornam `Promise<T>` tipados.
3. Lançam **erros customizados** (classes derivadas de `Error`).
4. Não importam nenhum componente/hook — são chamados por hooks (`useMutation`) ou diretamente por handlers.

Exemplos em `src/features/cadastro/services/`: `authService.ts`, `cadastroService.ts`, `duplicateCheckService.ts`, `viaCepService.ts`, `n8nService.ts`.

### 7.2 Classes de erro customizadas

```typescript
// cadastroService.ts
export class CadastroError extends Error {
  constructor(
    message: string,
    public code:
      | 'AUTH_FAILED'
      | 'INSERT_FAILED'
      | 'ROLLBACK_FAILED'
      | 'VALIDATION_ERROR'
      | 'NETWORK_ERROR'
      | 'UNKNOWN_ERROR',
    public table?: string,
    public originalError?: unknown,
    public details?: unknown
  ) {
    super(message)
    this.name = 'CadastroError'
  }
}
```

Padrão também em `DuplicateCheckError`, `AuthError` (`authService.ts`), `ViaCEPError`, `N8nError`.

### 7.3 Supabase: dois clientes

`src/lib/supabase/client.ts` exporta dois clientes tipados com `Database` (de `database.types.ts`):

- `supabase` — cliente anon com persistência (`storage: window.localStorage`, `storageKey: 'sb-auth-token'`, `persistSession: true`, `flowType: 'pkce'`). **Usar em 99% dos casos.**
- `supabaseAdmin` — cliente service_role (`storageKey: 'sb-admin-auth-token'`, `persistSession: false`). **Usar APENAS para operações administrativas** (cadastro que precisa bypassar RLS, criação de usuários).

Helpers incluídos: `hasActiveSession()`, `getCurrentUser()`, `signOut()`.

### 7.4 Convenções RLS (docs/RLS_POLICIES.md)

O projeto tem **103 políticas em 34 tabelas** seguindo 4 papéis:

| Papel | Acesso |
|-------|--------|
| `anon` | Leitura pública (vagas, perguntas de formulário), criar duplicate check |
| Candidato autenticado | Próprio perfil/candidaturas/resultados apenas |
| RH (`usuarios_rh`) | Full read de candidatos, criar jobs/entrevistas/avaliações |
| Admin (`usuarios_rh.role='administrador'`) | Tudo + gestão de usuários RH |

Padrões SQL recorrentes:

```sql
-- Pattern 1: Self-access (candidato)
USING ( EXISTS (
  SELECT 1 FROM candidatos
  WHERE candidatos.id = table.candidato_id
    AND candidatos.user_id = auth.uid()
    AND candidatos.deleted_at IS NULL
))

-- Pattern 2: RH access
USING ( EXISTS (
  SELECT 1 FROM usuarios_rh
  WHERE usuarios_rh.user_id = auth.uid()
    AND usuarios_rh.ativo = true
    AND usuarios_rh.deleted_at IS NULL
))
```

Convenções: todas as tabelas usam **soft delete** (`deleted_at IS NULL`) e checagem de `ativo = true` quando aplicável.

---

## 8. Custom Hooks

### 8.1 Hooks de dados (TanStack Query)

Padrão em `src/features/vagas/hooks/useVagas.ts` e `useCandidaturas.ts`:

```typescript
// Query keys hierárquicas
export const vagasKeys = {
  all: ['vagas'] as const,
  lists: () => [...vagasKeys.all, 'list'] as const,
  list: (filters?, orderBy?, pagination?) =>
    [...vagasKeys.lists(), { filters, orderBy, pagination }] as const,
  details: () => [...vagasKeys.all, 'detail'] as const,
  detail: (id, candidatoId?) => [...vagasKeys.details(), id, candidatoId] as const,
  hasApplied: (candidatoId, vagaId) =>
    [...vagasKeys.all, 'hasApplied', candidatoId, vagaId] as const,
}

export function useVagas(filters?, orderBy = 'mais_recentes', pagination = { page: 1, limit: 12 }, options?) {
  return useQuery({
    queryKey: vagasKeys.list(filters, orderBy, pagination),
    queryFn: () => listVagas(filters, orderBy, pagination),
    ...options,
  })
}
```

Cliente global configurado em `src/App.tsx`:

```typescript
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,  // 5 min
      gcTime: 10 * 60 * 1000,    // 10 min
      retry: 2,
      refetchOnWindowFocus: false,
    },
  },
})
```

### 8.2 Hooks de estado UI

Ex.: `useDuplicateCheck(value, { field, debounceMs, onDuplicate, onUnique, onError, autoCheck })` — retorna `{ isDuplicate, loading, error, result, check }`. Encapsula debounce + chamada ao service + estado.

Outros: `useViaCEP`, `useFormToast`, `useSessionTimeout`.

### 8.3 Gerenciamento de estado global (Zustand)

`src/store/authStore.ts` e `src/store/adminAuthStore.ts` — stores separadas para candidato vs. admin/RH. Acessadas via `const { setUser, setSession } = useAuthStore()`.

---

## 9. Tratamento de Erros

Padrão em 3 camadas:

1. **Service layer:** lança `*Error` customizada com `code` enum.
2. **Hook/componente:** captura via `try/catch`, exibe toast pt-BR, preenche `form.setError` se relevante.
3. **ErrorBoundary global:** `src/components/ErrorBoundary.tsx` captura qualquer throw não tratado.

```typescript
try {
  await cadastroService.register(data)
  toast.success('Cadastro realizado com sucesso!')
} catch (error) {
  if (error instanceof CadastroError) {
    if (error.code === 'AUTH_FAILED') {
      form.setError('dadosPessoais.email', { message: 'Email já cadastrado' })
    }
    toast.error(error.message)
  } else {
    toast.error('Erro inesperado. Tente novamente.')
  }
}
```

Serviços auxiliares: `src/services/errorHandlingService.ts`, `src/services/logAccessService.ts`, `src/services/rateLimitService.ts`, `src/services/securityValidationService.ts`.

---

## 10. Estilização (Tailwind + shadcn/ui)

### 10.1 shadcn/ui

Componentes primitivos em `src/components/ui/` (50+ arquivos). Baseados em **Radix UI** + **class-variance-authority** (`cva`) para variantes. Cada componente usa o helper local `cn()` que combina `clsx` + `tailwind-merge`.

```typescript
// src/components/ui/utils.ts
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
```

Existem **dois `cn`** idênticos: `src/components/ui/utils.ts` (usado pelos primitivos shadcn) e `src/lib/utils.ts` (usado pelo resto da app). Convencionalmente, código novo deve importar de `@/lib/utils`.

### 10.2 Padrão `cva` para variantes

Exemplo canônico em `src/components/ui/button.tsx`:

```typescript
const buttonVariants = cva(
  "inline-flex items-center justify-center ... transition-all disabled:opacity-50 ...",
  {
    variants: {
      variant: { default: "...", destructive: "...", outline: "...", ghost: "...", link: "..." },
      size: { default: "h-9 px-4 py-2", sm: "h-8 ...", lg: "h-10 ...", icon: "size-9 ..." },
    },
    defaultVariants: { variant: "default", size: "default" },
  },
)
```

O `Button` aceita `isLoading` + `loadingText` como extensão custom do projeto (renderiza `<Loader2>` quando `isLoading`).

### 10.3 Organização de classes Tailwind

- Ordem observada: layout → box model → tipografia → cores → estados (`hover:` / `focus-visible:` / `disabled:`) → dark mode.
- Classes condicionais via `cn('base', condicao && 'classe')` ou spread via `cva`.
- Uso frequente de **tokens semânticos** do tema (`bg-primary`, `text-primary-foreground`, `border-input`, `ring-destructive/20`).
- Design system tem componentes "Glass" customizados (`src/components/ui/glass.tsx`) usados nas telas de login/cadastro.

---

## 11. Convenções de Comentários e Documentação

### 11.1 Cabeçalho JSDoc de arquivo

Quase todos os arquivos de feature começam com um bloco multilinha em pt-BR:

```typescript
/**
 * Schema Zod para validação do formulário de cadastro de candidatos
 *
 * Valida dados para inserção nas seguintes tabelas:
 * - candidatos (dados pessoais + auth)
 * - enderecos (endereço completo)
 * - dados_profissionais (experiência e formação)
 * ...
 */
```

### 11.2 JSDoc em funções exportadas

```typescript
/**
 * Hook para listar vagas com filtros, ordenação e paginação
 *
 * @param filters - Filtros a aplicar
 * @param orderBy - Tipo de ordenação
 * @returns Query result com lista de vagas
 * @example
 * const { data, isLoading } = useVagas({ tipo_vaga: 'tempo_integral' })
 */
export function useVagas(...) { /* ... */ }
```

### 11.3 TODOs e notas

- `// TODO:` usado para débito conhecido (ex.: `// TODO: Implementar lógica de redirecionamento por etapa quando tabela candidaturas estiver disponível`).
- `// NOTA:` para esclarecer decisões arquiteturais (ex.: "dados_profissionais não é mais inserido durante cadastro (Opção B)").
- Uso de emojis em logs/docs (`✅`, `⚠️`, `❌`, `📝`) é aceito — refletindo o estilo markdown do projeto.

---

## 12. Convenções de Nomenclatura (resumo)

| Item | Convenção | Exemplo |
|------|-----------|---------|
| Componente React | `PascalCase` | `LoginCandidatoPage`, `CadastroMultiStepForm` |
| Hook | `useCamelCase` | `useDuplicateCheck`, `useVagas` |
| Função utilitária | `camelCase` | `validateCPF`, `formatCPF`, `cleanCPF` |
| Variável | `camelCase` | `isSubmitting`, `cpfDuplicate` |
| Constante module-level | `SCREAMING_SNAKE_CASE` | `TEST_USER`, `INVALID_CREDENTIALS`, `FORM_STEPS`, `COMMON_PASSWORDS` |
| Tipo/Interface | `PascalCase` | `CandidatoFormData`, `UseDuplicateCheckOptions`, `CadastroCompleteResult` |
| Enum literal (string unions) | `snake_case` em pt-BR | `'tempo_integral'`, `'prefiro_nao_informar'`, `'mais_recentes'` |
| Chave de form / coluna DB | `snake_case` em pt-BR | `nome_completo`, `data_nascimento`, `como_conheceu_detalhes` |
| Classe de erro | `PascalCaseError` | `CadastroError`, `DuplicateCheckError`, `AuthError` |
| Query key | `camelCaseKeys` | `vagasKeys.list(...)`, `candidaturasKeys.detail(id)` |

---

## 13. Roteamento

- **React Router v6** com `createBrowserRouter` (ver `src/App.tsx` e `src/router/routes.tsx`).
- Rotas protegidas via wrappers: `src/components/ProtectedRoute.tsx` (candidato) e `src/components/ProtectedAdminRoute.tsx` (RH/admin).
- Durante dev existe um **menu flutuante** (`DevNavigationMenu` em `App.tsx`) com atalhos para todas as páginas — deve ser removido/escondido em produção.

---

## 14. Configuração de Ambiente

- Variáveis sempre prefixadas com **`VITE_`** (exposto pelo Vite): `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `VITE_SUPABASE_SERVICE_ROLE_KEY`.
- Acesso via `import.meta.env.VITE_...`.
- Arquivos: `.env.local` (desenvolvimento) e `.env.test` (testes E2E, carregado via `dotenv` no `playwright.config.ts`).

---

*Análise de convenções concluída em 2026-04-19.*
