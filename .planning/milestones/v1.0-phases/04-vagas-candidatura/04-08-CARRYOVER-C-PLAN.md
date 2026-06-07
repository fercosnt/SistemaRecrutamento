---
phase: 04
plan: 08-carryover-c
type: execute
wave: 4-carryover
depends_on: ["04-08", "04-08-carryover", "04-08-carryover-b"]
files_modified:
  - src/features/vagas/schemas/candidaturaFormSchema.ts
  - src/features/vagas/schemas/__tests__/candidaturaFormSchema.test.ts
autonomous: true
requirements: [VAGA-03, CAND-01, CAND-02, CAND-03]
tags: [phase-04, schema-fix, rhf, zod, just-in-time-upload, hotfix, uat-carryover, plan-04-04-cleanup]

must_haves:
  truths:
    - "Schema buildCandidaturaSchema marca curriculo como .optional() (compatível com just-in-time upload do Plan 04-07)"
    - "Após click em 'Enviar candidatura' com 3 perguntas preenchidas + cvFile selecionado, RHF.handleSubmit invoca onSubmit (validação não bloqueia)"
    - "Gate de presença do CV permanece via submitDisabled = !cvFile (FormularioCandidaturaPage:461) + early return em onSubmit (FormularioCandidaturaPage:225)"
    - "Após onSubmit ser invocado, uploadCV roda quando cvPath null (FormularioCandidaturaPage:230-243), seta cvPath via setState, e segue para submitCandidaturaWithRespostas"
    - "Vitest atualizado: candidaturaFormSchema.test.ts deve cobrir o novo caso 'curriculo undefined still passes validation when respostas are valid' + manter os 17 cases existentes verdes"
    - "Vitest full suite mantém 337/338 PASS (sem regressão)"
    - "tsc --noEmit ≤ 320 (baseline)"
    - "npm run build exit 0"
  artifacts:
    - path: src/features/vagas/schemas/candidaturaFormSchema.ts
      provides: schema com curriculo opcional para suportar just-in-time upload
      contains: "curriculo:"
    - path: src/features/vagas/schemas/__tests__/candidaturaFormSchema.test.ts
      provides: cobertura adicional do caso curriculo opcional
      contains: "curriculo undefined"
  key_links:
    - from: src/features/vagas/schemas/candidaturaFormSchema.ts
      to: src/components/pages/FormularioCandidaturaPage.tsx
      via: "Page consome buildCandidaturaSchema via zodResolver. Schema agora alinhado ao pattern just-in-time upload (D-09 Plan 04-07)."
      pattern: "buildCandidaturaSchema"
    - from: src/components/pages/FormularioCandidaturaPage.tsx (onSubmit linha 225)
      to: src/components/pages/FormularioCandidaturaPage.tsx (onSubmit linha 230-243)
      via: "early return guard if !cvFile + uploadCV se cvPath null"
      pattern: "if \\(!cvFile"
---

<objective>
Carryover-A (commit ee0147f) substituiu `primary-NNN` por `bg-primary` (sintático).
Carryover-B (próximo commit pós beaec2d) substituiu `bg-primary` por `bg-[#00109E]` literal + integrou shell candidato. UAT-J01 visualmente passou (botão visível, glass cards, brand color, header).

UAT-J01 re-executado **ainda falha** — agora por bug diferente: clicar "Enviar candidatura" não dispara onSubmit, sem error visível. Diagnóstico via DOM inspection:

```
ERRO VISIVEL: (4 hits)
  - 3 são asteriscos `*` (visual só, sem texto)
  - 1 é slot de erro com mensagem em branco

inputs preenchidos:
  respostas.ccf3c7cd-...: value="adsf"
  respostas.10e15bb9-...: radio Imediata checked=true
  respostas.c0f8ec3b-...: value="3"

button[type="submit"]: disabled = false
form.dispatchEvent(submit) → returns false (preventDefault chamado)
```

**Causa raiz (F-04-08-F):** schema do Plan 04-04 (`buildCandidaturaSchema`) marca `curriculo` como REQUIRED com `z.string().min(1, 'Currículo obrigatório')` em `path`. Plan 04-07 implementou just-in-time upload (D-09 — não auto-upload on select para não desperdiçar bandwidth/storage), então `cvPath` só é setado DENTRO de `onSubmit` após `uploadCV` resolver. Mas validação Zod roda ANTES de onSubmit:

```
Click submit
  → form.handleSubmit(onSubmit)
  → Zod valida { curriculo: undefined, respostas: {...} }
  → ❌ curriculo.path falha .min(1) → "Currículo obrigatório"
  → onSubmit NUNCA chamado → uploadCV nunca roda → cvPath nunca setado
  → mensagem renderizada em slot vazio (sem PerguntaInput pra mostrar)
  → silêncio total
```

**Fix:** tornar `curriculo` opcional no schema. Gate de presença permanece via `submitDisabled = !cvFile` (FormularioCandidaturaPage:461) + early return em `onSubmit` linha 225 (`if (!cvFile || !user || !candidato || !vaga) return`). Schema responsabilidade fica só sobre respostas; CV é orquestrado pelo componente.

**Plan 04-04 ↔ 04-07 inconsistência:** schema escrito antes do componente decidir o pattern just-in-time. Carryover-C harmoniza.
</objective>

<threat_model>
- Risco: tornar `curriculo` opcional no schema pode permitir submit sem CV em algum caminho não-coberto pelo `submitDisabled` gate. Mitigação:
  - `submitDisabled = !cvFile || cvUploading || form.formState.isSubmitting` permanece (linha 461).
  - `onSubmit` early return: `if (!cvFile || !user || !candidato || !vaga) return` permanece (linha 225).
  - EF `submit-candidatura` server-side valida `curriculo_url` schema D-10 (`{auth.uid()}/{uuid}.pdf`) → defesa em profundidade (Pitfall 10).
  - Sem caminho conhecido pra contornar os 3 gates.
- Risco: testes existentes `candidaturaFormSchema.test.ts` podem assumir curriculo required em alguns cases. Mitigação: ler e atualizar os cases que validam `curriculo: undefined` para esperar success em vez de error.
- Risco: tipo `CandidaturaFormData` (z.infer) muda de `curriculo: { path, name, size }` para `curriculo: { path, name, size } | undefined`. Consumidores precisam handling. Mitigação: o único consumidor é FormularioCandidaturaPage, que já trata cvFile/cvPath localmente — type narrowing dentro de onSubmit já funciona pelo early return.
- Não-risco: onSubmit (FormularioCandidaturaPage:197+) já está preparado para uploadar se `cvPath` null, então não precisa de mudança no componente. Apenas o schema.
</threat_model>

<task id="1" type="fix" depends_on="">
<title>Tornar curriculo opcional em buildCandidaturaSchema</title>

<context>
Arquivo: `src/features/vagas/schemas/candidaturaFormSchema.ts` linha 132-146 aproximadamente.

Estado atual (problemático):
```ts
return z.object({
  curriculo: z.object(
    {
      path: z.string().min(1, 'Currículo obrigatório'),
      name: z.string().min(1),
      size: z.number().int().nonnegative(),
    }
  ),
  respostas: z.object(respostasShape),
  respostas_outros: z.object(respostasOutrosShape).optional(),
})
```

Estado alvo:
```ts
return z.object({
  curriculo: z.object(
    {
      path: z.string().min(1, 'Currículo obrigatório'),
      name: z.string().min(1),
      size: z.number().int().nonnegative(),
    }
  ).optional(),  // <-- ADD .optional()
  respostas: z.object(respostasShape),
  respostas_outros: z.object(respostasOutrosShape).optional(),
})
```

Mudança mínima: adicionar `.optional()` ao final do `z.object({path, name, size})` block.
</context>

<acceptance_criteria>
1. `grep -nE "curriculo: z\.object" src/features/vagas/schemas/candidaturaFormSchema.ts` mostra `.optional()` no final do bloco.
2. Type `CandidaturaFormData` derivado via `z.infer<>` agora tem `curriculo` como `{...} | undefined`.
3. Schema continua aceitando objetos completos `{path, name, size}` válidos (não regrediu).
4. Schema agora aceita `curriculo: undefined` quando todas as respostas estão válidas.
</acceptance_criteria>
</task>

<task id="2" type="test" depends_on="1">
<title>Atualizar tests para cobrir curriculo opcional + manter cobertura existente</title>

<context>
Arquivo: `src/features/vagas/schemas/__tests__/candidaturaFormSchema.test.ts` (17 cases existentes).

Casos a revisar/adicionar:

1. **Adicionar:** `'curriculo undefined passes when respostas are valid'`
   ```ts
   it('curriculo undefined passes when respostas are valid', () => {
     const schema = buildCandidaturaSchema(perguntasFixture)
     const result = schema.safeParse({
       curriculo: undefined,
       respostas: { /* respostas válidas */ },
     })
     expect(result.success).toBe(true)
   })
   ```

2. **Verificar cases existentes:** se algum testa `curriculo: undefined → expect error`, atualizar para `expect success`. Provavelmente algum case T1.x ou similar.

3. **Adicionar:** `'curriculo with full {path,name,size} still passes (regression guard)'`
   ```ts
   it('curriculo full object still passes', () => {
     const schema = buildCandidaturaSchema(perguntasFixture)
     const result = schema.safeParse({
       curriculo: { path: 'uid/abc.pdf', name: 'cv.pdf', size: 12345 },
       respostas: { /* válidas */ },
     })
     expect(result.success).toBe(true)
   })
   ```

4. **Adicionar:** `'curriculo with empty path still fails (when present)'`
   ```ts
   it('curriculo with empty path still fails when present', () => {
     const schema = buildCandidaturaSchema(perguntasFixture)
     const result = schema.safeParse({
       curriculo: { path: '', name: 'cv.pdf', size: 100 },  // path vazio
       respostas: { /* válidas */ },
     })
     expect(result.success).toBe(false)
   })
   ```
</context>

<acceptance_criteria>
1. `npm run test:run -- candidaturaFormSchema` retorna ≥ 18 cases (17 existentes + ≥ 1 novo) — todos PASS.
2. Cases novos cobrem: undefined OK, full object OK (regression), empty path FAIL.
</acceptance_criteria>
</task>

<task id="3" type="verify" depends_on="2">
<title>Gates finais + UAT prep</title>

<acceptance_criteria>
1. `npm run build` → exit 0.
2. `npm run lint` (tsc --noEmit) ≤ 320 erros.
3. `npm run test:run` → 337/338 PASS (1 FAIL pre-existing LoadingProgress) + os ≥ 1 case novo do schema PASS.
4. Commit: `fix(04-08-carryover-c): make curriculo optional in buildCandidaturaSchema (F-04-08-F — just-in-time upload alignment)`.
</acceptance_criteria>
</task>

<execution_strategy>
Fix mecânico mínimo:

1. Read `src/features/vagas/schemas/candidaturaFormSchema.ts` linhas ~125-150.
2. Edit pontual: adicionar `.optional()` após `})` que fecha o `z.object({path, name, size})`.
3. Read `src/features/vagas/schemas/__tests__/candidaturaFormSchema.test.ts` para ver shape dos cases existentes (perguntasFixture, etc).
4. Adicionar bloco `describe('F-04-08-F — curriculo optional')` com os 3 cases (undefined OK, full OK, empty path FAIL).
5. Rodar `npm run test:run -- candidaturaFormSchema` para validar.
6. Rodar `npm run build` + `npm run lint`.
7. Commit.
8. Próximo passo é executor humano: re-executar UAT-J01..J06.
</execution_strategy>

<verification_steps>
1. Build verde + lint baseline + tests verdes (gates Task 3).
2. Iniciar/refresh dev server. Login candidato → `/vagas/teste-asb-shopping-riomar` → "Candidatar-se".
3. Anexar PDF (1-4 MB) → preencher 3 perguntas → click "Enviar candidatura".
4. Esperado: botão muda pra "Enviando..." (spinner) → toast verde → redirect `/candidato/perfil`.
5. UAT-J01 PASS → proceder com UAT-J02..J06.
6. Após 6/6 PASS: commit final do runbook + reply `approved` no GSD.
</verification_steps>

<rollback>
`git revert <sha>` reverte o `.optional()`. Estado restaurado ao Carryover-B (visual OK mas submit ainda quebrado por F-04-08-F). Reverter só faz sentido se schema opcional introduzir regressão de validação genuína nos respostas (improvável — não tocamos respostasShape).
</rollback>

<followups>
- **F-04-08-F retroactive plan checker review:** o Plan checker do 04-07 passou sem testar submit real end-to-end. Se Phase 4 tivesse spec/UI-SPEC documentando "happy path: select PDF → fill perguntas → submit → toast → redirect", o checker teria pego. Phase 5 follow-up: adicionar regra de "smoke test manual antes de marcar plan complete".
- Considerar adicionar Vitest específico que monta o componente FormularioCandidaturaPage com Testing Library e simula click + valida onSubmit é chamado. Cobertura E2E em Playwright (Plan 04-08 spec promotion) já existe via `B-J06..B-J11` mas estão behind opt-in env var → não rodam em CI default → não pegariam regressão automaticamente.
- Decisão D-26 carryover (Tailwind --primary token broken) ainda em backlog Phase 5.
- Decisão D-27 carryover (page-level shell integration deve replicar canonical persona pattern) ainda em backlog Phase 5.
- D-28 NEW: schema dynamic factories (Plan 04-04 pattern) devem ser desenhados com awareness do upload pattern do componente consumer. Just-in-time upload exige campos opcionais no schema. Documentar como Phase 4 learning.
</followups>
