# PRD-DEV-008: Teste DISC

## 1. Introduction/Overview

The Teste DISC is a behavioral assessment that identifies a candidate's primary behavioral style across four dimensions: Dominance, Influence, Steadiness, and Conscientiousness. This test is the third stage in the Beauty Smile recruitment process and consists of 28 questions with a unique "Most/Least" response format.

**Problem it solves:** HR needs to understand how candidates behave in workplace situations, communicate with others, and respond to challenges. The DISC test provides actionable behavioral insights that complement the Big Five personality assessment.

**Goal:** Implement an interactive DISC behavioral assessment where candidates select "Most like me" and "Least like me" from 4 options per question, with results automatically scored, stored, sent to N8N for AI analysis, and made available to HR for team fit evaluation.

## 2. Goals

1. Present 28 DISC questions with 4 behavioral descriptors each
2. Require candidates to select one "Most like me" and one "Least like me" per question
3. Prevent invalid selections (same option for both, or incomplete responses)
4. Track progress and display completion percentage
5. Complete test in single session (shorter than Big Five, no save-and-resume needed)
6. Calculate scores for D, I, S, C dimensions
7. Identify primary and secondary behavioral styles
8. Store results in `resultados_disc` table
9. Trigger N8N webhook for AI-powered behavioral analysis
10. Update candidate to next recruitment stage (Entrevista Online)

## 3. User Stories

### Primary Flow
**As a** candidate who completed Big Five
**I want to** access the DISC test from my dashboard
**So that** I can continue progressing in the recruitment process

**As a** candidate taking the DISC test
**I want to** see clear instructions on how to select Most/Least options
**So that** I understand the unique response format

**As a** candidate answering questions
**I want to** easily select one Most and one Least option per question
**So that** I can complete the test quickly without confusion

### Secondary Flow
**As an** HR professional
**I want** DISC results to show the candidate's primary behavioral style (D, I, S, or C)
**So that** I can quickly assess team fit and communication preferences

**As an** HR professional reviewing results
**I want** to see both numerical scores and descriptive behavioral profiles
**So that** I can match candidates to roles requiring specific behaviors

### Edge Cases
**As a** candidate
**I want** to be prevented from selecting the same option as both Most and Least
**So that** my responses are logically valid

**As a** candidate who accidentally clicks the wrong option
**I want** to easily change my selection
**So that** my answers accurately reflect my behavior

## 4. Functional Requirements

### FR-001: Test Access Control
Access rules (same as Big Five):
- User authenticated
- `etapa_atual = 'disc'`
- No existing completed DISC test
- URL: `/testes/disc`

Access denied scenarios show appropriate messages.

### FR-002: Test Introduction Page
**Content:**
- **Título:** "Teste DISC - Perfil Comportamental"
- **Descrição:**
  ```
  O teste DISC avalia seu estilo comportamental em quatro dimensões:

  🔴 D - Dominance (Dominância): Você é direto, orientado a resultados, decisivo?
  🟡 I - Influence (Influência): Você é sociável, comunicativo, persuasivo?
  🟢 S - Steadiness (Estabilidade): Você é paciente, leal, cooperativo?
  🔵 C - Conscientiousness (Conformidade): Você é analítico, preciso, organizado?

  Este teste contém 28 conjuntos de 4 palavras/frases cada.
  Para cada conjunto, selecione:
  • ✅ A palavra que MAIS descreve você
  • ❌ A palavra que MENOS descreve você

  Responda pensando em como você se comporta na maioria das situações.
  ```

- **Detalhes:**
  - ⏱️ Tempo estimado: 10-15 minutos
  - 📊 Total de questões: 28
  - 🚀 Sessão única: Complete em uma só vez (sem pausas)
  - 🔒 Confidencial: Resultados visíveis apenas para RH

- **CTA:** "Iniciar Teste DISC"

### FR-003: Question Database Structure
Fetch from `biblioteca_perguntas`:
```typescript
const { data: questions } = await supabase
  .from('biblioteca_perguntas')
  .select('*')
  .eq('tipo_teste', 'disc')
  .order('numero_questao', { ascending: true })
```

Each question has 4 options stored in `opcoes_resposta` JSONB:
```json
{
  "A": { "texto": "Assertivo", "dimensao": "D" },
  "B": { "texto": "Animado", "dimensao": "I" },
  "C": { "texto": "Atencioso", "dimensao": "S" },
  "D": { "texto": "Analítico", "dimensao": "C" }
}
```

### FR-004: Test Interface
**Header:**
- Progress: "Pergunta 5 de 28 (18% completo)"
- Timer (optional): Elapsed time

**Question Display:**
- Question number (large): "5"
- Instruction: "Selecione a característica que MAIS e MENOS descrevem você:"

**Response Options:**
Display 4 options as cards with two selection buttons each:

```
┌─────────────────────────────────────┐
│  Assertivo                          │
│  [✅ MAIS]  [❌ MENOS]             │
└─────────────────────────────────────┘

┌─────────────────────────────────────┐
│  Animado                            │
│  [✅ MAIS]  [❌ MENOS]             │
└─────────────────────────────────────┘

┌─────────────────────────────────────┐
│  Atencioso                          │
│  [✅ MAIS]  [❌ MENOS]             │
└─────────────────────────────────────┘

┌─────────────────────────────────────┐
│  Analítico                          │
│  [✅ MAIS]  [❌ MENOS]             │
└─────────────────────────────────────┘
```

**Selection Logic:**
- Clicking "MAIS" on option A:
  - Highlights option A as "Most"
  - Disables "MENOS" button on option A (can't be both)
  - Clears previous "Most" selection if any

- Clicking "MENOS" on option B:
  - Highlights option B as "Least"
  - Disables "MAIS" button on option B
  - Clears previous "Least" selection if any

**Validation:**
- "Próxima" button enabled only when both Most AND Least selected
- If only one selected: Tooltip "Selecione uma opção MAIS e uma MENOS"

**Navigation:**
- "Anterior" button (review previous questions)
- "Próxima" button
- "Finalizar" button (on question 28)

### FR-005: Response Validation
**Rules:**
1. Must select exactly one "Most" and one "Least" per question
2. Most and Least cannot be the same option
3. All 28 questions must be answered before submission
4. Changing previous answers is allowed

**Error States:**
- Same option selected for both: Auto-prevent (disable button)
- Incomplete response: Disable "Próxima" + show tooltip
- Missing questions: On submit, show "3 questões não respondidas. Por favor, complete todas."

### FR-006: Score Calculation
DISC scoring is unique:
- Each "Most" selection: +2 points to corresponding dimension
- Each "Least" selection: -1 point to corresponding dimension

```typescript
function calculateDISCScores(respostas: DISCResponse[], questions: Question[]) {
  const scores = { D: 0, I: 0, S: 0, C: 0 }

  respostas.forEach((resp, index) => {
    const question = questions[index]
    const mostOption = question.opcoes_resposta[resp.most]
    const leastOption = question.opcoes_resposta[resp.least]

    scores[mostOption.dimensao] += 2
    scores[leastOption.dimensao] -= 1
  })

  // Normalize to 0-100 scale
  // Max score: 28 questions * 2 points = 56
  // Min score: 28 questions * -1 point = -28
  // Range: -28 to 56 = 84 total

  return {
    D: Math.max(0, Math.min(100, Math.round((scores.D + 28) / 84 * 100))),
    I: Math.max(0, Math.min(100, Math.round((scores.I + 28) / 84 * 100))),
    S: Math.max(0, Math.min(100, Math.round((scores.S + 28) / 84 * 100))),
    C: Math.max(0, Math.min(100, Math.round((scores.C + 28) / 84 * 100)))
  }
}
```

**Determine Primary/Secondary Styles:**
```typescript
const sortedScores = Object.entries(scores)
  .sort(([,a], [,b]) => b - a)

const primaryStyle = sortedScores[0][0] // Highest score
const secondaryStyle = sortedScores[1][0] // Second highest

// Common combinations: DI, DS, DC, IS, IC, SC, etc.
const combinedProfile = `${primaryStyle}${secondaryStyle}`
```

### FR-007: Test Completion
On "Finalizar":

**Store Results:**
```typescript
const { data: resultado } = await supabase
  .from('resultados_disc')
  .insert([{
    candidato_id: candidato.id,
    pontuacao_d: scores.D,
    pontuacao_i: scores.I,
    pontuacao_s: scores.S,
    pontuacao_c: scores.C,
    estilo_primario: primaryStyle,
    estilo_secundario: secondaryStyle,
    perfil_combinado: combinedProfile,
    respostas_completas: respostas, // JSONB
    data_conclusao: new Date(),
    tempo_conclusao_minutos: elapsedMinutes
  }])
  .select()
  .single()
```

**Update Candidate:**
```typescript
await supabase
  .from('candidatos')
  .update({
    etapa_atual: 'entrevista_online',
    progresso_processo: 42 // 3/7 stages = 42%
  })
  .eq('id', candidato.id)
```

**Trigger Webhook:**
```typescript
await fetch('https://fernandocosta.app.n8n.cloud/webhook/disc-completo', {
  method: 'POST',
  body: JSON.stringify({
    candidato_id: candidato.id,
    resultado_id: resultado.id,
    pontuacoes: scores,
    perfil_primario: primaryStyle
  })
})
```

**Success Screen:**
```
🎉 Teste DISC Concluído!

Seu perfil comportamental foi identificado.

Perfil principal: [D - Dominância]
Você tende a ser direto, orientado a resultados e decisivo.

Próximos passos:
1. Nossa equipe analisará seu perfil DISC
2. Você será contatado para agendar a entrevista online
3. Acompanhe seu progresso no dashboard

[Voltar ao dashboard]
```

### FR-008: Mobile Optimization
**Responsive Design:**
- Stack option cards vertically on mobile
- Large tap targets for Most/Least buttons (min 48x48px)
- Swipe gesture for next/previous (optional)

**Performance:**
- Preload all 28 questions on test start
- No save-and-resume needed (short test)
- localStorage backup only (no Supabase saves mid-test)

### FR-009: Results Display (Brief)
**For Candidates (Success Screen):**
- Show primary style with brief description
- Example: "D - Você é orientado a resultados e decisivo"
- No detailed scores (HR only)

**For HR (Admin Dashboard):**
- Show all 4 scores as bar chart
- Primary/Secondary styles clearly labeled
- Behavioral profile description
- Team fit recommendations (from AI analysis)

### FR-010: Test Integrity
**Prevent Duplicates:**
- Check for existing `resultados_disc` before allowing test
- RLS policy prevents duplicate inserts
- If duplicate found: Redirect to dashboard

**No Timeout:**
- Test can take as long as needed
- Track completion time for analytics

**Browser Close:**
- Show warning if test in progress
- Answers saved to localStorage (recoverable if browser crashes)

## 5. Non-Goals (Out of Scope)

1. **Detailed DISC reports for candidates** - HR only
2. **Test retakes** - One attempt only
3. **Question randomization** - Fixed order
4. **Save-and-resume** - Short test, single session
5. **Graph customization** - Fixed DISC chart format
6. **Team DISC analysis** - Individual only for MVP
7. **DISC training modules** - Assessment only
8. **Multiple languages** - Portuguese only
9. **Adaptive DISC** - All 28 questions required
10. **Comparison charts** - No norm comparison for candidates

## 6. Design Considerations

**Visual Design:**
- Color-code dimensions: D=Red, I=Yellow, S=Green, C=Blue
- Clear visual distinction between Most (✅ green) and Least (❌ red) buttons
- Simple, clean card layout for options

**Accessibility:**
- High contrast for Most/Least buttons
- Keyboard navigation (tab + space/enter to select)
- Screen reader support

**Animations:**
- Smooth transitions between questions
- Button state changes (hover, active, selected)

## 7. Technical Considerations

**State Management:**
```typescript
interface DISCTestState {
  questions: DISCQuestion[]
  currentQuestionIndex: number
  answers: { most: string; least: string }[] // ['A', 'C'], ['B', 'D'], etc.
  startTime: number

  setAnswer: (most: string, least: string) => void
  nextQuestion: () => void
  previousQuestion: () => void
  submitTest: () => Promise<void>
}
```

**Performance:**
- All 28 questions loaded on start (single query)
- Answers stored in memory
- Submit all at once (no incremental saves)

## 8. Success Metrics

**Primary:**
1. Completion rate: ≥ 90% of starters finish
2. Avg completion time: 10-15 minutes
3. Submission success: ≥ 99%

**Secondary:**
1. Answer distribution: All 4 dimensions used (not just D/I)
2. Mobile completion: Within 10% of desktop
3. Error rate: ≤ 2% validation errors

## 9. Open Questions

1. **Option Presentation:** Cards or simple radio buttons?
   - **Recommendation:** Cards for better visual separation

2. **Results Preview:** Show DISC chart on success screen?
   - **Recommendation:** Yes, simple bar chart with primary style highlighted

---

## Acceptance Criteria Summary

✅ DISC test accessible at `etapa_atual = 'disc'`
✅ 28 questions load with 4 options each
✅ Most/Least buttons work correctly (mutual exclusion)
✅ Progress bar shows completion percentage
✅ All questions must be answered before submission
✅ Scores calculated correctly (Most +2, Least -1)
✅ Primary and secondary styles determined
✅ Results stored in `resultados_disc` table
✅ N8N webhook triggered
✅ Candidate stage updated to `entrevista_online`
✅ Success screen shows primary behavioral style
✅ Fully responsive on mobile
✅ Manual QA passes with 0 critical bugs
✅ E2E test covers full DISC flow

---

**Target Audience:** Junior Frontend Developer
**Estimated Effort:** 2-3 days
**Dependencies:**
- ✅ `biblioteca_perguntas` with 28 DISC questions
- ✅ `resultados_disc` table
- ✅ N8N webhook for disc-completo
- ⏳ PRD-DEV-007 (Big Five) must be complete first
**Blocker Status:** 🚨 CRITICAL - Third stage, blocks interview scheduling
