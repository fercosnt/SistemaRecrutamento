# PRD-DEV-007: Teste de Personalidade (Big Five)

## 1. Introduction/Overview

The Teste de Personalidade (Big Five) is a comprehensive psychometric assessment that measures five major personality dimensions: Openness, Conscientiousness, Extraversion, Agreeableness, and Neuroticism. This test is the second stage in the Beauty Smile recruitment process and consists of 120 questions.

**Problem it solves:** HR needs objective, scientifically-validated personality data to assess candidate fit for specific roles. Manual personality assessments are subjective and time-consuming. The Big Five test provides standardized, quantifiable personality insights.

**Goal:** Implement an interactive, timed Big Five personality assessment that candidates complete online, with results automatically stored in the database, sent to N8N for AI analysis, and made available to HR for candidate evaluation.

## 2. Goals

1. Present 120 Big Five personality questions in an engaging, user-friendly interface
2. Allow candidates to select responses on a 5-point Likert scale (1-5)
3. Implement progress tracking showing percentage complete and current question
4. Support save-and-resume functionality (candidates can pause and continue later)
5. Calculate raw scores for all five personality dimensions
6. Store results in Supabase `resultados_big_five` table
7. Trigger N8N webhook with results for AI-powered personality analysis
8. Send completion confirmation email to candidate
9. Update candidate's recruitment stage to next step (DISC)
10. Prevent duplicate test submissions (one test per candidate per application)

## 3. User Stories

### Primary Flow
**As a** candidate at the Big Five stage
**I want to** access the personality test from my dashboard
**So that** I can complete this required step in the recruitment process

**As a** candidate taking the test
**I want to** see clear instructions before starting
**So that** I understand how to answer honestly and what to expect

**As a** candidate answering questions
**I want to** see my progress as I complete questions
**So that** I know how much is left and stay motivated

**As a** candidate who needs to pause
**I want to** save my progress and resume later
**So that** I can complete the test when I have sufficient time

### Secondary Flow
**As a** candidate who completed the test
**I want to** receive confirmation that my responses were submitted
**So that** I have peace of mind that my effort wasn't wasted

**As an** HR professional
**I want** test results automatically sent to N8N for AI analysis
**So that** I receive detailed personality insights without manual processing

**As an** HR professional
**I want** to see raw scores and AI-generated personality reports
**So that** I can make informed decisions about candidate-role fit

### Edge Cases
**As a** candidate
**I want** to be prevented from skipping questions
**So that** my results are valid and complete

**As a** candidate who accidentally closes the browser
**I want** my progress to be saved automatically
**So that** I don't lose my answers

**As a** candidate who already completed the test
**I want** to be prevented from retaking it
**So that** test integrity is maintained

## 4. Functional Requirements

### FR-001: Test Access Control
The system **must** control access to the Big Five test:

**Access Rules:**
1. User must be authenticated
2. User's `etapa_atual` must be `big_five`
3. User must NOT have an existing completed test in `resultados_big_five`
4. If accessed via dashboard CTA, redirect to `/testes/big-five`

**Access Denied Scenarios:**
- If `etapa_atual !== 'big_five'`: Show message "Este teste ainda não está disponível para você. Complete as etapas anteriores."
- If test already completed: Show message "Você já completou este teste. Aguarde a análise dos resultados."
- If unauthenticated: Redirect to login

**URL:** `/testes/big-five`

### FR-002: Test Introduction Page
Before starting the test, display an introduction screen:

**Content:**
- **Título:** "Teste de Personalidade - Big Five"
- **Descrição:**
  ```
  Este teste avalia cinco dimensões principais da sua personalidade:
  • Abertura a Experiências: Criatividade e curiosidade
  • Conscienciosidade: Organização e responsabilidade
  • Extroversão: Sociabilidade e energia
  • Amabilidade: Cooperação e empatia
  • Neuroticismo: Estabilidade emocional

  O teste contém 120 afirmações. Para cada uma, indique o quanto você concorda usando a escala:
  1 = Discordo totalmente
  2 = Discordo parcialmente
  3 = Neutro
  4 = Concordo parcialmente
  5 = Concordo totalmente

  Não há respostas certas ou erradas. Seja honesto e responda conforme sua primeira intuição.
  ```

- **Detalhes:**
  - ⏱️ Tempo estimado: 20-30 minutos
  - 📊 Total de questões: 120
  - 💾 Salvamento automático: Sim, você pode pausar e continuar depois
  - 🔒 Privacidade: Suas respostas são confidenciais

- **CTA Buttons:**
  - Primary: "Iniciar Teste" → Begin test
  - Secondary: "Voltar ao Dashboard" → Go back

### FR-003: Question Database Structure
The system **must** fetch questions from the `biblioteca_perguntas` table:

**Query:**
```typescript
const { data: questions, error } = await supabase
  .from('biblioteca_perguntas')
  .select('*')
  .eq('tipo_teste', 'big_five')
  .eq('deleted_at', null)
  .order('numero_questao', { ascending: true })
```

**Expected Result:** 120 questions, each with:
- `id`: UUID
- `tipo_teste`: 'big_five'
- `numero_questao`: 1-120
- `texto_pergunta`: Question text (e.g., "Sou cheio de energia")
- `dimensao`: 'abertura' | 'conscienciosidade' | 'extroversao' | 'amabilidade' | 'neuroticismo'
- `inversa`: boolean (true if question should be reverse-scored)

**Distribution (typical):**
- Abertura: 24 questions
- Conscienciosidade: 24 questions
- Extroversão: 24 questions
- Amabilidade: 24 questions
- Neuroticismo: 24 questions

### FR-004: Test Interface
The test interface **must** include:

**Header:**
- Progress bar: "Pergunta 15 de 120 (12% completo)"
- Timer (optional): Time elapsed (informational only, not enforced)
- Save & Exit button: "Salvar e sair"

**Question Display:**
- Question number: Large, bold (e.g., "15")
- Question text: Clear, readable font size (18-20px)
- Example: "Sou cheio de energia e entusiasmo"

**Response Options (5-point Likert scale):**
Display as either:
- **Option A:** Radio buttons with labels
  ```
  ⚪ 1 - Discordo totalmente
  ⚪ 2 - Discordo parcialmente
  ⚪ 3 - Neutro
  ⚪ 4 - Concordo parcialmente
  ⚪ 5 - Concordo totalmente
  ```

- **Option B:** Visual scale with clickable buttons
  ```
  [1] [2] [3] [4] [5]
   ❌  ➖  😐  ➕  ✅
  ```

**Recommendation:** Option B for better visual hierarchy and mobile usability

**Navigation:**
- "Anterior" button (disabled on question 1)
- "Próxima" button (enabled only after selection)
- "Finalizar Teste" button (only on question 120)

**Auto-save:**
- Save answer to localStorage on every selection
- Save to Supabase on every 10th question OR when clicking "Salvar e sair"

### FR-005: Progress Tracking
The system **must** track and display progress:

**Progress Calculation:**
```typescript
const progress = (currentQuestionIndex + 1) / totalQuestions * 100
// Example: Question 30 of 120 = 25%
```

**Visual Indicators:**
- Progress bar at top (0-100%)
- Text: "Pergunta X de 120 (Y% completo)"
- Questions answered: "30/120 respostas"

**Motivational Milestones:**
- 25% (30 questions): "Ótimo progresso! Continue assim!"
- 50% (60 questions): "Você está na metade! Mantenha o foco!"
- 75% (90 questions): "Quase lá! Mais 30 questões!"
- 100%: "Parabéns! Teste concluído!"

### FR-006: Save and Resume Functionality
The system **must** support pausing and resuming:

**Save Progress:**
- Save to `respostas_temporarias` table (JSONB column)
- Structure:
  ```json
  {
    "candidato_id": 123,
    "tipo_teste": "big_five",
    "respostas": {
      "1": 4,
      "2": 5,
      "3": 2,
      ...
    },
    "ultima_questao": 30,
    "data_inicio": "2025-01-15T10:00:00Z",
    "data_atualizacao": "2025-01-15T10:15:00Z"
  }
  ```

**Resume Flow:**
1. On test page load, check for existing progress:
   ```typescript
   const { data: savedProgress } = await supabase
     .from('respostas_temporarias')
     .select('*')
     .eq('candidato_id', candidato.id)
     .eq('tipo_teste', 'big_five')
     .single()
   ```

2. If found, show modal:
   ```
   Você tem um teste em andamento.
   Questão: 30 de 120
   Última atualização: há 2 horas

   [Continuar de onde parei] [Recomeçar do início]
   ```

3. If "Continuar", load saved answers and navigate to `ultima_questao + 1`
4. If "Recomeçar", delete saved progress and start from question 1

**Auto-save Frequency:**
- On every answer selection (to localStorage)
- On every 10th question (to Supabase)
- On "Salvar e sair" button click
- On page unload (beforeunload event)

### FR-007: Answer Validation
The system **must** validate responses:

**Required Selection:**
- User must select 1-5 for current question before proceeding
- "Próxima" button disabled until selection made
- If user tries to navigate without selecting: Show tooltip "Selecione uma resposta para continuar"

**No Skipping:**
- Questions must be answered sequentially
- Cannot jump to question 50 without answering 1-49
- "Anterior" button allows review and change of previous answers

**Change Previous Answers:**
- User can navigate back and change answers
- Warning on change: "Você alterou sua resposta anterior. Tem certeza?"

### FR-008: Test Completion and Scoring
Upon clicking "Finalizar Teste" on question 120:

**Validation:**
1. Ensure all 120 questions have answers
2. If any missing: Show error "Algumas questões não foram respondidas. Por favor, revise suas respostas."

**Score Calculation:**
```typescript
function calculateBigFiveScores(respostas: Record<number, number>, questions: Question[]) {
  const scores = {
    abertura: 0,
    conscienciosidade: 0,
    extroversao: 0,
    amabilidade: 0,
    neuroticismo: 0
  }

  questions.forEach((q, index) => {
    const resposta = respostas[q.numero_questao]
    const score = q.inversa ? (6 - resposta) : resposta
    scores[q.dimensao] += score
  })

  // Normalize to 0-100 scale
  // Each dimension has 24 questions, max score = 24 * 5 = 120, min = 24 * 1 = 24
  return {
    abertura: Math.round((scores.abertura - 24) / (120 - 24) * 100),
    conscienciosidade: Math.round((scores.conscienciosidade - 24) / (120 - 24) * 100),
    extroversao: Math.round((scores.extroversao - 24) / (120 - 24) * 100),
    amabilidade: Math.round((scores.amabilidade - 24) / (120 - 24) * 100),
    neuroticismo: Math.round((scores.neuroticismo - 24) / (120 - 24) * 100)
  }
}
```

**Store Results:**
```typescript
const { data: resultado, error } = await supabase
  .from('resultados_big_five')
  .insert([{
    candidato_id: candidato.id,
    candidatura_id: candidaturaAtual.id, // If applicable
    pontuacao_abertura: scores.abertura,
    pontuacao_conscienciosidade: scores.conscienciosidade,
    pontuacao_extroversao: scores.extroversao,
    pontuacao_amabilidade: scores.amabilidade,
    pontuacao_neuroticismo: scores.neuroticismo,
    respostas_completas: respostas, // JSONB
    data_conclusao: new Date(),
    tempo_conclusao_minutos: Math.floor((Date.now() - startTime) / 60000)
  }])
  .select()
  .single()
```

### FR-009: Post-Completion Actions
After successful test completion:

**Database Updates:**
1. Insert results to `resultados_big_five`
2. Update `candidatos.etapa_atual = 'disc'` (move to next stage)
3. Update `candidatos.progresso_processo = 28` (28% = 2/7 stages complete)
4. Delete `respostas_temporarias` for this candidate/test
5. Mark Big Five as complete in candidate record

**Webhook Trigger:**
```typescript
await fetch('https://fernandocosta.app.n8n.cloud/webhook/big-five-completo', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    candidato_id: candidato.id,
    resultado_id: resultado.id,
    pontuacoes: scores,
    data_conclusao: new Date()
  })
})
```

**Email Confirmation:**
Send email via Supabase trigger or N8N:
- Template: `candidato-big-five-concluido`
- Subject: "Teste Big Five concluído - Próximos passos"
- Content: Confirmation + link to DISC test

**Success Screen:**
Show full-screen success message:
```
🎉 Teste de Personalidade Concluído!

Suas respostas foram enviadas com sucesso.

Próximos passos:
1. Nossa equipe de IA analisará seu perfil de personalidade
2. Você receberá o próximo teste (DISC) em breve
3. Acompanhe seu progresso no dashboard

[Ver meu dashboard] [Iniciar teste DISC agora]
```

### FR-010: Test Integrity & Security
The system **must** enforce test integrity:

**Prevent Duplicate Tests:**
- RLS policy prevents inserting duplicate results
- Frontend check before allowing test start
- If duplicate detected: Redirect to dashboard with message

**Timeout Warning (optional):**
- If test takes >60 minutes, show warning: "Você está levando muito tempo. Responda com sua primeira intuição."
- No hard timeout (test can take as long as needed)

**Browser Close Warning:**
```typescript
window.addEventListener('beforeunload', (e) => {
  if (testInProgress && !testCompleted) {
    e.preventDefault()
    e.returnValue = 'Seu progresso foi salvo automaticamente. Deseja realmente sair?'
  }
})
```

**No Test Preview:**
- Candidates cannot view questions without starting the test
- Test questions should not be accessible via direct URL without proper state

## 5. Non-Goals (Out of Scope)

The following are **NOT** part of this PRD:

1. **Detailed personality reports for candidates** - Only HR sees detailed analysis
2. **Test retakes** - One attempt only, no re-testing
3. **Time limit enforcement** - Test can take as long as needed
4. **Question randomization** - Questions in fixed order for all candidates
5. **Adaptive testing** - All 120 questions required, no CAT (Computer Adaptive Testing)
6. **Comparison with others** - No norm tables or percentile rankings shown to candidates
7. **Downloadable results** - No PDF export for candidates
8. **Test in multiple languages** - Portuguese only for MVP
9. **Voice-based answers** - Text/selection only, no speech input
10. **Test proctoring** - No webcam monitoring or anti-cheating measures

## 6. Design Considerations

### UI/UX Requirements

**Visual Design:**
- Clean, distraction-free interface
- Large, readable fonts (minimum 18px for questions)
- High contrast for accessibility
- Calming color palette (avoid red/harsh colors)

**Mobile Optimization:**
- Touch-friendly answer buttons (minimum 44x44px tap targets)
- Swipe gestures for next/previous (optional)
- Portrait orientation lock (prevent landscape mode issues)

**Accessibility:**
- WCAG 2.1 AA compliance
- Keyboard navigation (tab through options, enter to select)
- Screen reader support for questions and progress
- High contrast mode support

**Component Library:**
- shadcn/ui: Progress, Button, Radio, Alert
- Framer Motion: Smooth transitions between questions
- Lucide React: Icons (CheckCircle, AlertCircle, etc.)

### Question Transition Animation
- Fade out current question (200ms)
- Fade in next question (200ms)
- Slide animation (optional, but avoid motion sickness)

### Loading States
- Initial load: Skeleton for question and options
- Saving: Subtle spinner on "Salvar e sair" button
- Submitting: Full-screen loading overlay "Processando suas respostas..."

## 7. Technical Considerations

### Frontend Stack
- **Framework:** React 18.3.1 + TypeScript
- **State Management:** Zustand for test state (current question, answers, progress)
- **Form Handling:** Custom state (no React Hook Form needed, simple selection)
- **Animations:** Framer Motion for transitions
- **Storage:** localStorage for temporary saves, Supabase for persistence

### Backend Integration

**Database Tables:**
- `biblioteca_perguntas` - 120 Big Five questions (already populated)
- `resultados_big_five` - Test results and scores
- `respostas_temporarias` - Temporary progress saves (JSONB)
- `candidatos` - Update etapa_atual after completion

**RLS Policies:**
- `resultados_big_five_insert_own` - Candidates can insert their own results
- `resultados_big_five_select_own` - Candidates can view their own results
- `resultados_big_five_select_hr` - HR can view all results

### State Management

**Zustand Store Structure:**
```typescript
interface BigFiveTestState {
  questions: Question[]
  currentQuestionIndex: number
  answers: Record<number, number> // question_number -> selected_value (1-5)
  startTime: number
  isLoading: boolean
  isSaving: boolean

  // Actions
  loadQuestions: () => Promise<void>
  setAnswer: (questionNumber: number, value: number) => void
  nextQuestion: () => void
  previousQuestion: () => void
  saveProgress: () => Promise<void>
  submitTest: () => Promise<void>
}
```

### API Calls

**Fetch Questions:**
```typescript
const { data: questions, error } = await supabase
  .from('biblioteca_perguntas')
  .select('*')
  .eq('tipo_teste', 'big_five')
  .order('numero_questao', { ascending: true })
```

**Load Saved Progress:**
```typescript
const { data: savedProgress } = await supabase
  .from('respostas_temporarias')
  .select('*')
  .eq('candidato_id', candidato.id)
  .eq('tipo_teste', 'big_five')
  .single()
```

**Save Progress:**
```typescript
await supabase
  .from('respostas_temporarias')
  .upsert({
    candidato_id: candidato.id,
    tipo_teste: 'big_five',
    respostas: answers,
    ultima_questao: currentQuestionIndex,
    data_atualizacao: new Date()
  })
```

**Submit Results:**
```typescript
// 1. Calculate scores
const scores = calculateBigFiveScores(answers, questions)

// 2. Insert results
const { data: resultado, error } = await supabase
  .from('resultados_big_five')
  .insert([{
    candidato_id: candidato.id,
    pontuacao_abertura: scores.abertura,
    pontuacao_conscienciosidade: scores.conscienciosidade,
    pontuacao_extroversao: scores.extroversao,
    pontuacao_amabilidade: scores.amabilidade,
    pontuacao_neuroticismo: scores.neuroticismo,
    respostas_completas: answers,
    data_conclusao: new Date()
  }])
  .select()
  .single()

// 3. Update candidate stage
await supabase
  .from('candidatos')
  .update({
    etapa_atual: 'disc',
    progresso_processo: 28
  })
  .eq('id', candidato.id)

// 4. Delete temporary progress
await supabase
  .from('respostas_temporarias')
  .delete()
  .eq('candidato_id', candidato.id)
  .eq('tipo_teste', 'big_five')

// 5. Trigger webhook
await fetch('https://fernandocosta.app.n8n.cloud/webhook/big-five-completo', {
  method: 'POST',
  body: JSON.stringify({ candidato_id: candidato.id, resultado_id: resultado.id })
})
```

### Performance Optimization
- **Question pre-loading:** Load all 120 questions on test start (single query)
- **Local state:** Store answers in memory, sync to Supabase periodically
- **Debounced saves:** Debounce auto-save to prevent excessive API calls
- **Memoization:** Memoize score calculation function

### Error Handling
- Network errors during save: Retry with exponential backoff, fallback to localStorage
- Submission failure: Allow retry, show error message with support contact
- Question loading failure: Show error screen with reload button

## 8. Success Metrics

### Primary Metrics
1. **Test Completion Rate:** ≥ 85% of candidates who start the test complete it
2. **Average Completion Time:** 20-30 minutes (median)
3. **Save-and-Resume Usage:** ≥ 30% of candidates use save-and-resume feature
4. **Submission Success Rate:** ≥ 99% of completed tests successfully submit

### Secondary Metrics
1. **Abandonment Point:** Track which question number has highest drop-off
2. **Answer Distribution:** Ensure all 5 options used (not just 1 and 5)
3. **Mobile Completion:** Mobile completion rate within 15% of desktop
4. **Time per Question:** Average ≤ 15 seconds per question

### User Experience Metrics
1. **Confusion Indicators:** ≤ 5% of candidates contact support during test
2. **Browser Close Events:** ≤ 10% of candidates trigger beforeunload warning
3. **Answer Changes:** Average ≤ 5 answer changes per test (low indicates clear questions)

### Business Metrics
1. **AI Analysis Success:** ≥ 95% of results successfully analyzed by N8N
2. **Candidate Progression:** ≥ 80% of Big Five completers advance to DISC test
3. **Data Quality:** ≥ 90% of results show varied answer patterns (not all 3's or all 5's)

## 9. Open Questions

### Critical (Must Resolve Before Development)
1. **Question Order:** Should questions be randomized or fixed order?
   - Option A: Fixed order (consistent experience, easier debugging)
   - Option B: Randomized order (reduces cheating risk)
   - **Recommendation:** Option A for MVP (fixed order)

2. **Reverse Scoring:** How many questions use reverse scoring?
   - Need to ensure `inversa` field is correctly set in database
   - **Action:** Validate all 120 questions have correct `inversa` value

3. **Score Interpretation:** What score ranges define high/medium/low for each dimension?
   - Example: Abertura 0-33 (low), 34-66 (medium), 67-100 (high)
   - **Recommendation:** Define thresholds for N8N AI analysis prompts

### Medium Priority (Can Resolve During Development)
4. **Timer Display:** Should we show elapsed time to candidates?
   - **Recommendation:** Yes, informational only (no pressure)

5. **Answer Review:** Allow final review screen before submission?
   - **Recommendation:** Yes, show summary: "You answered all 120 questions. Ready to submit?"

6. **Progress Persistence:** How long should saved progress be retained?
   - **Recommendation:** 7 days, then auto-delete

7. **Question Text Length:** Should we enforce character limits?
   - **Recommendation:** Current questions are concise, no enforcement needed

### Low Priority (Nice to Have)
8. **Motivational Messages:** Should we show encouraging messages during test?
   - **Recommendation:** Yes, at 25%, 50%, 75% milestones

9. **Background Music:** Calming music during test?
   - **Recommendation:** Not for MVP (distraction risk)

10. **Accessibility Mode:** High contrast / large text mode?
    - **Recommendation:** Post-MVP, use browser accessibility features for now

---

## Acceptance Criteria Summary

**This feature is considered complete when:**

✅ Authenticated candidates at `etapa_atual = 'big_five'` can access the test
✅ Introduction screen explains the test clearly with instructions
✅ All 120 questions load from `biblioteca_perguntas` table
✅ Questions display one at a time with 5-point Likert scale
✅ Progress bar shows percentage complete (0-100%)
✅ Answers are saved to localStorage on every selection
✅ Answers are saved to Supabase every 10 questions and on "Salvar e sair"
✅ Save-and-resume functionality allows pausing and continuing later
✅ "Próxima" button only enabled after answer selection
✅ "Anterior" button allows reviewing and changing previous answers
✅ Scores are calculated correctly with reverse scoring for `inversa` questions
✅ Results are stored in `resultados_big_five` table
✅ N8N webhook is triggered with test results
✅ Candidate's `etapa_atual` is updated to `disc` after completion
✅ Confirmation email is sent after successful submission
✅ Success screen displays with link to dashboard and next test
✅ Duplicate tests are prevented (frontend and RLS)
✅ Browser close warning appears if test in progress
✅ Test is fully responsive on mobile and desktop
✅ All loading and error states provide clear feedback
✅ Manual QA testing passes with 0 critical bugs
✅ Automated E2E test covers full test flow (start, answer, save, resume, complete)

---

**Target Audience:** Junior Frontend Developer
**Estimated Effort:** 4-5 days
**Dependencies:**
- ✅ Supabase backend with `biblioteca_perguntas` table (120 Big Five questions populated)
- ✅ `resultados_big_five` table
- ✅ N8N webhook for big-five-completo
- ⏳ PRD-DEV-002 (Login) for authentication
- ⏳ PRD-DEV-006 (Dashboard) for test access CTA
**Blocker Status:** 🚨 CRITICAL - Second stage in recruitment process, blocks progression to DISC and subsequent stages
