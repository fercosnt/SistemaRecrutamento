# Feature: Autenticação

Esta feature implementa o sistema de autenticação (Tasks 4 do PRD-0001 e PRDs 2, 3, 4).

## Estrutura

```
auth/
├── components/        # Componentes React de autenticação
│   └── ...           # LoginForm, PasswordReset, etc
├── hooks/            # Custom hooks
│   ├── useAuth.ts            # Hook principal de autenticação
│   └── index.ts              # Barrel export
├── services/         # Serviços de autenticação
│   ├── authService.ts        # Integração com Supabase Auth
│   └── index.ts              # Barrel export
├── types/            # TypeScript types
│   ├── authTypes.ts          # User, Session, AuthError
│   └── index.ts              # Barrel export
├── utils/            # Funções utilitárias
│   └── index.ts              # Barrel export
└── README.md         # Este arquivo
```

## Funcionalidades

- **Sign Up** - Criar conta de candidato
- **Sign In** - Login com email/senha
- **Sign Out** - Logout
- **Password Reset** - Recuperação de senha
- **Session Management** - Gerenciamento de sessão
- **Auth State** - Estado global de autenticação

## Uso

```typescript
import { useAuth } from '@/features/auth/hooks'

function MeuComponente() {
  const { user, signIn, signOut, isAuthenticated } = useAuth()

  if (!isAuthenticated) {
    return <LoginForm onSubmit={signIn} />
  }

  return <div>Olá, {user.email}</div>
}
```

## Integração com Zustand

O estado de autenticação é gerenciado globalmente usando Zustand para
persistência e reatividade em toda a aplicação.
