# Feature: Cadastro de Candidatos

Esta feature implementa o sistema completo de cadastro de candidatos (PRD-0001).

## Estrutura

```
cadastro/
├── components/        # Componentes React específicos do cadastro
│   └── ...           # CadastroForm, CadastroSuccess, etc
├── hooks/            # Custom hooks
│   ├── useViaCep.ts          # Hook para busca de CEP
│   ├── useDuplicateCheck.ts  # Hook para verificação de duplicatas
│   └── index.ts              # Barrel export
├── services/         # Serviços de API e lógica de negócio
│   ├── viaCepService.ts      # Integração com ViaCEP
│   ├── candidatoService.ts   # CRUD de candidatos
│   ├── cadastroService.ts    # Lógica de cadastro completo
│   └── index.ts              # Barrel export
├── types/            # TypeScript types e interfaces
│   ├── formTypes.ts          # Types do formulário
│   └── index.ts              # Barrel export
├── schemas/          # Schemas Zod para validação
│   ├── candidatoSchema.ts    # Schema principal
│   └── index.ts              # Barrel export
├── utils/            # Funções utilitárias
│   ├── cpfValidator.ts       # Validação de CPF
│   ├── formToDatabase.ts     # Transformação de dados
│   └── index.ts              # Barrel export
└── README.md         # Este arquivo
```

## Fluxo de Cadastro

1. **Validação de Formulário** (Task 1)
   - Schema Zod com validações
   - Validação CPF com dígitos verificadores
   - Validação em tempo real

2. **Busca de CEP** (Task 2)
   - Integração com ViaCEP
   - Auto-preenchimento de endereço
   - Debounce de 500ms

3. **Verificação de Duplicatas** (Task 3)
   - Check de CPF/Email existente
   - Feedback em tempo real
   - Debounce de 300ms

4. **Criação de Usuário** (Task 4)
   - Supabase Auth signup
   - Geração de senha
   - Email de confirmação

5. **Transação Multi-tabela** (Task 5)
   - Inserção nas 5 tabelas
   - Rollback em caso de erro
   - Atomic transaction

6. **Webhook N8N** (Task 6)
   - Trigger de análise IA
   - Retry logic
   - Fire-and-forget

## Uso

```typescript
import {
  useCadastro,
  CadastroForm,
  candidatoSchema
} from '@/features/cadastro'

// Em um componente
function MinhaPagina() {
  const { cadastrar, isLoading } = useCadastro()

  const handleSubmit = async (data) => {
    await cadastrar(data)
  }

  return <CadastroForm onSubmit={handleSubmit} loading={isLoading} />
}
```

## Testes

- `cpfValidator.test.ts` - Testes TDD para validação CPF
- `cadastroService.test.ts` - Testes de transação
- `candidatoService.test.ts` - Testes de duplicate check
- `e2e/cadastro.spec.ts` - Testes E2E completos

## Task Master

Esta feature corresponde às tarefas 1-9 da tag `prd-0001` no Task Master.
