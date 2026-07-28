# Sistema de Recrutamento Beauty Smile

**Status:** 🚀 **Pronto para Desenvolvimento - Frontend + Backend Integrado**
**Projeto Supabase:** isljnozzlvckrgjjbjwp
**Data de Integração:** 2025-11-05

---

## 📋 Visão Geral

Sistema completo de recrutamento e seleção com interface moderna e backend robusto:

- 🎨 **Frontend React 18.3.1 + Vite** - 31 páginas completas com design glassmorphism
- 🔐 **Autenticação Supabase** - Gestão de candidatos e equipe RH
- 📝 **Sistema de Vagas** - Landing pages customizadas e candidaturas
- 🎯 **Pipeline de Recrutamento** - Processo seletivo com múltiplas etapas
- 🧠 **Testes Psicométricos** - Big Five, DISC, Raven (60 imagens)
- 💬 **Entrevistas** - Agendamento e gravação de entrevistas
- 📊 **Análise IA** - Integração com Claude AI via N8N
- 🔗 **Automações** - N8N workflows para análises e notificações

---

## 🏗️ Estrutura do Projeto

```
DB Sistema de recrutamento/
├── src/                          # Código-fonte React + TypeScript
│   ├── components/               # Componentes React
│   │   ├── pages/               # 31 páginas completas
│   │   └── ui/                  # 53 componentes shadcn/ui
│   ├── assets/                  # Imagens e recursos
│   │   └── images/raven/        # 60 imagens teste Raven
│   ├── lib/                     # Bibliotecas e utilitários
│   │   └── supabase/            # Cliente Supabase (a implementar)
│   ├── api/                     # Funções de API (a implementar)
│   ├── hooks/                   # Custom React Hooks (a implementar)
│   ├── types/                   # TypeScript types
│   └── utils/                   # Funções utilitárias
│
├── docs/                        # Documentação do projeto
│   ├── prds/                    # 27 Product Requirements Documents
│   │   ├── 0001-0021-prd-*.md  # PRDs de funcionalidades
│   │   ├── prd-db-*.md         # PRDs de banco de dados
│   │   └── tasks/              # Task lists de implementação
│   ├── technical/              # Documentação técnica
│   ├── validations/            # Relatórios de validação
│   ├── sql/                    # 47 migrations SQL do Supabase
│   ├── DOCUMENTACAO-TECNICA-BEAUTY-SMILE-V2.md
│   ├── INVENTARIO-SISTEMA-RECRUTAMENTO.md
│   └── create-prd.md           # Template para novos PRDs
│
├── database.types.ts           # TypeScript types do Supabase
├── package.json                # Dependências Node.js
├── vite.config.ts              # Configuração Vite
├── tsconfig.json               # Configuração TypeScript
├── tailwind.config.js          # Configuração Tailwind CSS
└── .env.local                  # Variáveis de ambiente (não versionado)
```

---

## ✅ Status de Implementação

### Backend Supabase: 100% Completo ✅

| Componente | Status | Quantidade |
|------------|--------|------------|
| **Database Schema** | ✅ 100% | 23 tabelas, 19 enums |
| **Migrations** | ✅ 100% | 47 migrations aplicadas |
| **RLS Policies** | ✅ 100% | 105 policies (100% coverage) |
| **Storage Buckets** | ✅ 100% | 3 buckets (avatars, curriculos, gravacoes) |
| **Functions SQL** | ✅ 100% | 24 functions |
| **Triggers** | ✅ 100% | 30+ triggers automáticos |
| **Views** | ✅ 100% | 9 views analíticas |
| **Índices** | ✅ 100% | 91 índices criados |

### Frontend React: 85% Completo 🟡

| Componente | Status | Quantidade |
|------------|--------|------------|
| **Páginas Candidato** | ✅ 100% | 17 páginas |
| **Páginas RH/Admin** | ✅ 100% | 14 páginas |
| **Componentes UI** | ✅ 100% | 53 componentes shadcn/ui |
| **Testes Psicométricos** | ✅ 100% | Big Five, DISC, Raven |
| **Design System** | ✅ 100% | Glassmorphism completo |
| **Integração Backend** | ❌ 0% | Aguardando implementação |
| **Autenticação** | ❌ 0% | Aguardando implementação |
| **Rotas** | ❌ 0% | Aguardando implementação |

---

## 🚀 Quick Start

### Pré-requisitos

- **Node.js 18+** (recomendado: 20.x)
- **NPM** 8+
- **Supabase Account** (projeto já criado: isljnozzlvckrgjjbjwp)

### 1. Clonar Repositório

```bash
git clone <repository-url>
cd "DB Sistema de recrutamento"
```

### 2. Instalar Dependências

```bash
npm install
```

### 3. Configurar Variáveis de Ambiente

Copie o arquivo de exemplo e preencha com suas credenciais:

```bash
cp .env.local.example .env.local
```

Edite `.env.local`:

```env
# Supabase Configuration
VITE_SUPABASE_URL=https://isljnozzlvckrgjjbjwp.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# N8N Webhook Configuration
VITE_N8N_WEBHOOK_URL=https://fernandocosta.app.n8n.cloud/webhook/novo-cadastro

# Environment
VITE_ENVIRONMENT=development
```

### 4. Iniciar Servidor de Desenvolvimento

```bash
npm run dev
```

Acesse: `http://localhost:5173`

### 5. Build para Produção

```bash
npm run build
npm run preview
```

---

## 📦 Tecnologias Utilizadas

### Frontend
- **React 18.3.1** - Biblioteca UI
- **Vite 6.3.5** - Build tool e dev server
- **TypeScript 5.3.3** - Type safety
- **Tailwind CSS 3.4.0** - Styling framework
- **shadcn/ui** - 53 componentes UI
- **React Hook Form 7.55.0** - Formulários
- **Zod 3.22.4** - Validação de schemas
- **Zustand 4.5.2** - State management
- **React Router 6.28.0** - Navegação
- **Lucide React** - Ícones
- **Recharts 2.15.2** - Gráficos e visualizações

### Backend
- **Supabase** - PostgreSQL + Auth + Storage + Realtime
- **PostgreSQL 15** - Banco de dados relacional
- **Row Level Security** - 105 policies de segurança
- **PostgREST** - API REST automática
- **pgvector** - Busca semântica (futuro)

### Integrations
- **N8N** - Automação de workflows
- **Claude AI** - Análise de candidatos
- **ViaCEP** - Busca de endereços (Brasil)

---

## 📚 Próximos Passos (Fase 3)

Para começar a implementação dos PRDs, siga a ordem:

### 1. PRD-0001: Sistema de Cadastro de Candidatos
- Localização: `/docs/prds/0001-prd-sistema-cadastro-candidatos.md`
- Tarefas: Criar Supabase client, implementar formulário, integrar N8N

### 2. PRD-0002: Sistema de Login (Candidatos)
- Localização: `/docs/prds/0002-prd-sistema-login-candidatos.md`
- Tarefas: Auth Supabase, protected routes, session management

### 3. PRD-0003: Sistema de Login (RH/Admin)
- Localização: `/docs/prds/0003-prd-sistema-login-rh-admin.md`
- Tarefas: Multi-role auth, admin dashboard access

Continue seguindo a sequência dos 21 PRDs em `/docs/prds/`.

---

## 🔧 Scripts Disponíveis

```bash
# Desenvolvimento
npm run dev              # Inicia dev server (port 5173)

# Build
npm run build            # Build para produção
npm run preview          # Preview do build

# Linting
npm run lint             # Verifica tipos TypeScript

# Supabase
npx supabase gen types typescript --project-id isljnozzlvckrgjjbjwp > database.types.ts
```

---

## 📖 Documentação Adicional

- **Documentação Técnica Completa**: [`/docs/DOCUMENTACAO-TECNICA-BEAUTY-SMILE-V2.md`](docs/DOCUMENTACAO-TECNICA-BEAUTY-SMILE-V2.md)
- **Inventário de Páginas**: [`/docs/INVENTARIO-SISTEMA-RECRUTAMENTO.md`](docs/INVENTARIO-SISTEMA-RECRUTAMENTO.md)
- **PRDs Funcionais**: [`/docs/prds/`](docs/prds/)
- **Guias Técnicos**: [`/docs/technical/`](docs/technical/)
- **Validações e Testes**: [`/docs/validations/`](docs/validations/)
- **Migrations SQL**: [`/docs/sql/`](docs/sql/)

---

## 🔐 Segurança

- **Row Level Security (RLS)**: 100% de cobertura em todas as tabelas
- **Autenticação**: Supabase Auth com JWT
- **Validação**: Client-side (Zod) + Server-side (RLS policies)
- **CORS**: Configurado para domínios específicos
- **Rate Limiting**: Implementado via Supabase

---

## 📊 Supabase Project Info

- **Project ID**: isljnozzlvckrgjjbjwp
- **Region**: US East (Ohio)
- **Database**: PostgreSQL 15.x
- **Storage**: 3 buckets configurados
- **Auth**: Email + Password (pode adicionar OAuth)
- **API**: REST + GraphQL + Realtime

---

## 🤝 Contribuindo

1. Leia o PRD correspondente em `/docs/prds/`
2. Crie uma branch para a feature: `git checkout -b feature/PRD-00XX`
3. Implemente seguindo as especificações do PRD
4. Teste localmente
5. Commit: `git commit -m "feat(PRD-00XX): descrição"`
6. Push: `git push origin feature/PRD-00XX`

---

## 📝 Licença

Propriedade de Beauty Smile - Sistema Interno

---

## 📞 Suporte

- **Desenvolvedor**: Fernando Costa
- **Email**: fernandinho.costa.neto@gmail.com
- **GitHub**: [@fercosnt](https://github.com/fercosnt)

---

**Última Atualização**: 2025-11-05
**Versão**: 2.0.0 (Frontend + Backend Integrado)
