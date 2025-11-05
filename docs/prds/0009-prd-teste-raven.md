# PRD-DEV-009: Teste Raven (Raciocínio Lógico)

## 1. Introduction/Overview

The Teste Raven is a non-verbal intelligence assessment that measures abstract reasoning and problem-solving abilities through pattern recognition. This test is the fifth stage in the Beauty Smile recruitment process and consists of 60 progressive matrices questions.

**Problem it solves:** HR needs to assess candidates' cognitive abilities, logical reasoning, and problem-solving skills independently of language proficiency or cultural background. The Raven test provides an objective measure of fluid intelligence that predicts job performance in analytical roles.

**Goal:** Implement an interactive Raven Matrices test where candidates analyze visual patterns and select the missing piece from 6-8 options, with results automatically scored, stored, sent to N8N for analysis, and used to evaluate candidates' cognitive aptitude for their target roles.

## 2. Goals

1. Display 60 progressive matrix questions with increasing difficulty (Sets A, B, C, D, E)
2. Present each question as an image with a missing piece
3. Provide 6-8 multiple-choice options as images for selection
4. Track time per question and total test duration (optional analytics)
5. Calculate raw score (0-60 correct answers)
6. Convert raw score to percentile ranking based on normative data
7. Store results in `resultados_raven` table with detailed analytics
8. Trigger N8N webhook for cognitive profile analysis
9. Update candidate to next stage (Cultura/Entrevista Presencial)
10. Support image preloading for smooth, fast question transitions

## 3. User Stories

### Primary Flow
**As a** candidate who completed DISC and online interview
**I want to** access the Raven reasoning test from my dashboard
**So that** I can demonstrate my problem-solving abilities

**As a** candidate viewing a Raven matrix
**I want to** clearly see the pattern and available answer options
**So that** I can identify the correct missing piece

**As a** candidate taking the test
**I want to** see which set I'm in (A, B, C, D, E) and my progress
**So that** I understand how much is left and that difficulty is increasing

**As a** candidate who finds a question difficult
**I want to** skip and return to it later
**So that** I don't waste time on hard questions when easier ones remain

### Secondary Flow
**As an** HR professional
**I want** to see both raw scores (0-60) and percentile rankings
**So that** I can compare candidates' cognitive abilities objectively

**As an** HR professional evaluating results
**I want** to see which sets candidates struggled with (time per set, accuracy per set)
**So that** I can identify specific reasoning weaknesses (visual patterns vs. abstract logic)

**As an** HR manager
**I want** Raven scores to correlate with job requirements
**So that** I can set minimum thresholds for different roles

### Edge Cases
**As a** candidate with slow internet
**I want** all question images to preload
**So that** I don't experience delays between questions

**As a** candidate who accidentally clicks the wrong option
**I want to** change my answer before moving to the next question
**So that** my score reflects my actual reasoning ability

**As a** candidate
**I want** a clear indication when time has been spent on a question
**So that** I can pace myself appropriately

## 4. Functional Requirements

### FR-001: Test Access Control
**Access Rules:**
- User authenticated
- `etapa_atual = 'raven'`
- No existing completed Raven test
- URL: `/testes/raven`

**Access Denied Scenarios:**
- Wrong stage: "Este teste estará disponível após completar a entrevista online"
- Already completed: "Você já completou este teste. Resultados em análise."

### FR-002: Test Introduction Page
**Content:**
- **Título:** "Teste Raven - Raciocínio Lógico"
- **Descrição:**
  ```
  O Teste Raven avalia sua capacidade de raciocínio abstrato e resolução de problemas.

  Como funciona:
  • Você verá 60 matrizes visuais com uma peça faltando
  • Identifique o padrão e selecione a peça que completa a matriz
  • As questões são organizadas em 5 conjuntos (A, B, C, D, E)
  • A dificuldade aumenta progressivamente

  Exemplo:
  [Imagem de exemplo mostrando uma matriz 3x3 com padrão simples]

  Dicas:
  ✓ Analise linhas, colunas e diagonais
  ✓ Procure por padrões de forma, cor, tamanho, rotação
  ✓ Use sua primeira intuição
  ✓ Você pode pular questões difíceis e retornar depois
  ```

- **Detalhes:**
  - ⏱️ Tempo sugerido: 40 minutos (não obrigatório)
  - 📊 Questões: 60 (12 por conjunto)
  - 🎯 Objetivo: Responder o máximo possível corretamente
  - 💡 Sem penalização: Chutes não reduzem pontuação

- **CTA:** "Iniciar Teste Raven"

### FR-003: Question Database Structure
**Query:**
```typescript
const { data: questions } = await supabase
  .from('biblioteca_perguntas')
  .select('*')
  .eq('tipo_teste', 'raven')
  .order('numero_questao', { ascending: true })
```

**Question Structure:**
Each question contains:
- `numero_questao`: 1-60
- `conjunto`: 'A' | 'B' | 'C' | 'D' | 'E' (12 questions per set)
- `imagem_matriz_url`: URL to main matrix image (3x3 grid with missing piece)
- `opcoes_imagens`: JSONB array of option image URLs (6-8 images)
- `resposta_correta`: Index of correct option (0-based)
- `nivel_dificuldade`: 1-5 (increases within each set)

**Example:**
```json
{
  "numero_questao": 13,
  "conjunto": "B",
  "imagem_matriz_url": "https://storage.supabase.co/raven/set-b/question-13-matrix.png",
  "opcoes_imagens": [
    "https://storage.supabase.co/raven/set-b/q13-opt-1.png",
    "https://storage.supabase.co/raven/set-b/q13-opt-2.png",
    "https://storage.supabase.co/raven/set-b/q13-opt-3.png",
    "https://storage.supabase.co/raven/set-b/q13-opt-4.png",
    "https://storage.supabase.co/raven/set-b/q13-opt-5.png",
    "https://storage.supabase.co/raven/set-b/q13-opt-6.png"
  ],
  "resposta_correta": 2
}
```

### FR-004: Test Interface
**Layout:**

**Header:**
- Progress: "Conjunto B - Questão 13 de 60 (22%)"
- Timer: "Tempo decorrido: 08:34" (informational, no limit)
- Skip button: "Pular" (marks as skipped, can return later)

**Main Content:**
```
┌─────────────────────────────────────────┐
│                                         │
│  Qual peça completa o padrão?           │
│                                         │
│  [Matrix Image - 3x3 grid with one      │
│   piece missing, marked with "?"]       │
│                                         │
│         400x400px, centered             │
│                                         │
└─────────────────────────────────────────┘

Selecione a resposta:

┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐
│  1  │ │  2  │ │  3  │ │  4  │
│ [img] │ [img] │ [img] │ [img] │
└─────┘ └─────┘ └─────┘ └─────┘

┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐
│  5  │ │  6  │ │  7  │ │  8  │
│ [img] │ [img] │ [img] │ [img] │
└─────┘ └─────┘ └─────┘ └─────┘

Each option: 100x100px, clickable
```

**Selection Behavior:**
- Click on option: Highlight with blue border
- Selected option: Thicker border + checkmark overlay
- Hover effect: Slight scale + shadow
- Click again to deselect

**Navigation:**
- "Anterior" button (review previous, if answered)
- "Próxima" button (enabled after selection OR if skipped)
- "Revisar" button (shows overview of all questions at end)

### FR-005: Image Preloading
**Critical for UX:**
All images must preload before test starts to prevent delays.

**Preload Strategy:**
```typescript
async function preloadImages(questions: RavenQuestion[]) {
  const allImageUrls: string[] = []

  questions.forEach(q => {
    allImageUrls.push(q.imagem_matriz_url)
    allImageUrls.push(...q.opcoes_imagens)
  })

  const promises = allImageUrls.map(url => {
    return new Promise((resolve, reject) => {
      const img = new Image()
      img.onload = resolve
      img.onerror = reject
      img.src = url
    })
  })

  await Promise.all(promises)
}
```

**Loading Screen:**
Show progress during preload:
```
Carregando teste...
[██████████████████░░░░] 80%
Carregando imagens: 192 de 240
```

**Fallback:**
If preload fails for some images:
- Retry failed images (max 3 attempts)
- If still failing, show error: "Erro ao carregar imagens. Verifique sua conexão."

### FR-006: Skip and Review Functionality
**Skip Question:**
- "Pular" button marks question as skipped
- Stores null answer (or -1 to differentiate from unanswered)
- Moves to next question
- Question marked with ⚠️ icon in review screen

**Review Screen (End of Test):**
```
Revisão das Respostas

Conjunto A (12 questões):
[✓][✓][✓][✓][✓][✓][✓][✓][✓][✓][✓][✓]

Conjunto B (12 questões):
[✓][✓][⚠️][✓][✓][✓][✓][✓][✓][✓][✓][✓]

Conjunto C (12 questões):
[✓][✓][✓][ ][ ][ ][ ][ ][ ][ ][ ][ ]

Total respondidas: 38 de 60
Puladas: 1
Não respondidas: 21

[Continuar respondendo] [Finalizar teste]
```

**Click on Question Number:**
- Jumps to that question
- Allows answering/changing answer
- Return to review screen after

### FR-007: Score Calculation
**Raw Score:**
```typescript
function calculateRavenScore(respostas: number[], questions: RavenQuestion[]) {
  let rawScore = 0
  let scoresBySet = { A: 0, B: 0, C: 0, D: 0, E: 0 }

  respostas.forEach((resposta, index) => {
    if (resposta === questions[index].resposta_correta) {
      rawScore++
      scoresBySet[questions[index].conjunto]++
    }
  })

  return { rawScore, scoresBySet }
}
```

**Percentile Conversion:**
Use normative table (based on age/education):
```typescript
const percentileTable = {
  // Age 18-25, High School
  18: [10, 15, 20, 25, 30, 35, 40, 45, 50, 55, 60], // Raw scores for percentiles 10, 20, ..., 100
  // Add more age/education groups
}

function convertToPercentile(rawScore: number, age: number): number {
  // Lookup logic
  // Returns percentile (0-100)
}
```

**Classification:**
- 0-25%: Abaixo da média
- 26-40%: Média baixa
- 41-60%: Média
- 61-75%: Média alta
- 76-100%: Acima da média

### FR-008: Time Tracking
**Track:**
- `tempo_por_questao`: Array of milliseconds per question
- `tempo_total_minutos`: Total test duration
- `tempo_por_conjunto`: Object with time per set (A, B, C, D, E)

**Use Cases:**
- HR analytics: Identify if candidate rushed or overthought
- Flagging: Suspiciously fast times (potential cheating detection)
- Future optimization: Remove questions with excessive time

**Implementation:**
```typescript
const questionStartTime = Date.now()

function recordQuestionTime() {
  const timeSpent = Date.now() - questionStartTime
  timePerQuestion[currentQuestionIndex] = timeSpent
}
```

### FR-009: Test Completion and Storage
**On "Finalizar Teste":**

**Store Results:**
```typescript
const { data: resultado } = await supabase
  .from('resultados_raven')
  .insert([{
    candidato_id: candidato.id,
    pontuacao_bruta: rawScore, // 0-60
    pontuacao_percentil: percentile, // 0-100
    classificacao: classification, // 'Acima da média', etc.
    pontuacao_conjunto_a: scoresBySet.A,
    pontuacao_conjunto_b: scoresBySet.B,
    pontuacao_conjunto_c: scoresBySet.C,
    pontuacao_conjunto_d: scoresBySet.D,
    pontuacao_conjunto_e: scoresBySet.E,
    respostas_completas: respostas, // JSONB
    tempo_total_minutos: totalMinutes,
    tempo_por_questao: timePerQuestion, // JSONB array
    data_conclusao: new Date(),
    questoes_puladas: skippedQuestions.length
  }])
  .select()
  .single()
```

**Update Candidate:**
```typescript
await supabase
  .from('candidatos')
  .update({
    etapa_atual: 'cultura', // Or 'entrevista_presencial'
    progresso_processo: 71 // 5/7 stages
  })
  .eq('id', candidato.id)
```

**Trigger Webhook:**
```typescript
await fetch('https://fernandocosta.app.n8n.cloud/webhook/raven-completo', {
  method: 'POST',
  body: JSON.stringify({
    candidato_id: candidato.id,
    resultado_id: resultado.id,
    pontuacao_bruta: rawScore,
    percentil: percentile,
    classificacao: classification
  })
})
```

### FR-010: Results Display
**Success Screen:**
```
🎉 Teste Raven Concluído!

Resultados:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Pontuação: 42 de 60 questões corretas
Classificação: Média Alta
Percentil: 68% (melhor que 68% dos candidatos)

Desempenho por conjunto:
Conjunto A (Básico):      ████████████ 12/12 ✓
Conjunto B (Intermediário): ██████████░░ 10/12
Conjunto C (Avançado):    ████████░░░░  8/12
Conjunto D (Difícil):     ██████░░░░░░  6/12
Conjunto E (Muito Difícil): ████░░░░░░░░  6/12

Tempo total: 38 minutos

Próximos passos:
Nossa equipe analisará seu perfil cognitivo e
você será contatado em breve para as próximas etapas.

[Voltar ao dashboard]
```

**For HR (Admin Dashboard):**
- Full breakdown: Raw score, percentile, time analytics
- Score comparison: Compare to other candidates, role benchmarks
- Pattern analysis: Which sets caused difficulty
- Time flags: Unusually fast/slow responses

## 5. Non-Goals (Out of Scope)

1. **Adaptive testing** - All 60 questions required, no CAT
2. **Timed test** - No enforced time limit
3. **Question feedback** - No "correct/incorrect" shown during test
4. **Custom difficulty** - Fixed 5 sets (A-E), no customization
5. **Practice test** - No free practice questions before real test
6. **Multiple test versions** - Single question set for all candidates
7. **Detailed cognitive report for candidates** - Basic score only
8. **Image editing tools** - No zoom, rotate, or annotation
9. **Colorblind mode** - Assume patterns work for all (validated during question design)
10. **Offline mode** - Requires internet for image loading

## 6. Design Considerations

### Visual Design
**Matrix Display:**
- Clean white background
- Clear borders around matrix cells
- Missing piece clearly marked with "?" or dashed border
- High-resolution images (400x400px minimum)

**Option Display:**
- Grid layout: 2 rows x 4 columns (for 8 options) or 2x3 (for 6 options)
- Equal spacing between options
- Numbered labels (1-8) below each option
- Hover effect: Subtle shadow + border

**Color Scheme:**
- Neutral: Grays and whites for interface
- Accent: Blue for selected option
- Warning: Amber for skipped questions

### Accessibility
- Keyboard navigation: Number keys 1-8 select options
- Screen reader: Describe matrix pattern (challenging for non-visual users, may need alternative)
- High contrast mode: Ensure patterns remain distinguishable

### Performance
- Image optimization: WebP format, compressed
- Lazy loading: Load only current + next 5 questions
- Caching: Browser cache for repeated images

## 7. Technical Considerations

### Frontend Stack
- React + TypeScript
- Image preloading: Custom hook `useImagePreloader`
- State: Zustand for test state
- Animation: Framer Motion for transitions

### Image Storage
- **Supabase Storage:** Public bucket `raven-images/`
- **Structure:**
  ```
  raven-images/
    set-a/
      question-1-matrix.png
      q1-opt-1.png
      q1-opt-2.png
      ...
    set-b/
      ...
  ```

**Image Requirements:**
- Format: PNG with transparency OR WebP
- Matrix: 400x400px, 72dpi
- Options: 100x100px, 72dpi
- Max file size: 50KB per image (compression required)

### Database Schema
**resultados_raven table:**
```sql
CREATE TABLE resultados_raven (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  candidato_id UUID REFERENCES candidatos(id),
  pontuacao_bruta INTEGER, -- 0-60
  pontuacao_percentil INTEGER, -- 0-100
  classificacao TEXT, -- 'Abaixo da média', etc.
  pontuacao_conjunto_a INTEGER,
  pontuacao_conjunto_b INTEGER,
  pontuacao_conjunto_c INTEGER,
  pontuacao_conjunto_d INTEGER,
  pontuacao_conjunto_e INTEGER,
  respostas_completas JSONB, -- Array of selected options
  tempo_total_minutos INTEGER,
  tempo_por_questao JSONB, -- Array of milliseconds
  questoes_puladas INTEGER,
  data_conclusao TIMESTAMP DEFAULT NOW(),
  created_at TIMESTAMP DEFAULT NOW()
);
```

### Score Calculation Validation
**Test with sample data:**
- All correct: 60/60 → Percentile ~99%
- Half correct: 30/60 → Percentile ~50%
- All wrong: 0/60 → Percentile ~1%

**Edge cases:**
- Skipped questions count as incorrect
- Unanswered questions count as incorrect
- Time spent on skipped questions still tracked

## 8. Success Metrics

### Primary Metrics
1. **Completion Rate:** ≥ 85% of starters complete all 60 questions
2. **Average Score:** 30-40 correct (50-67% percentile range)
3. **Average Time:** 35-45 minutes
4. **Skip Rate:** ≤ 10% of questions skipped on average

### Secondary Metrics
1. **Image Load Success:** ≥ 99% of images load without errors
2. **Set Difficulty Validation:** Average score decreases from Set A → E
3. **Mobile Completion:** Within 20% of desktop (harder on small screens)
4. **Answer Distribution:** Options 1-8 selected roughly equally (no pattern bias)

### Analytics Metrics
1. **Time per Set:** Set A fastest, Set E slowest (validates difficulty)
2. **Question Difficulty Index:** Identify questions with <30% correct (too hard)
3. **Discrimination Index:** Questions that separate high/low performers

### Business Metrics
1. **Correlation with Job Performance:** Raven scores predict performance in analytical roles
2. **Role Benchmarks:** Establish minimum scores for different positions
3. **Candidate Satisfaction:** ≥ 70% find test fair and relevant

## 9. Open Questions

### Critical (Must Resolve Before Development)
1. **Normative Data:** Which percentile table should we use?
   - Option A: Brazilian normative data (age + education)
   - Option B: International norms
   - Option C: Build our own over time
   - **Recommendation:** Start with Option A, track data for Option C

2. **Image Source:** Where to get 60 validated Raven matrices?
   - Option A: License official Raven's Progressive Matrices
   - Option B: Create similar matrices (legal review required)
   - Option C: Use open-source alternatives (e.g., Raven-inspired tests)
   - **Recommendation:** Option A for legal compliance and validity

3. **Minimum Pass Score:** What percentile qualifies candidates to continue?
   - Varies by role: Technical roles may require ≥50th percentile
   - **Action:** Define thresholds with HR before launch

### Medium Priority (Can Resolve During Development)
4. **Review Screen:** Show at end or allow continuous review during test?
   - **Recommendation:** Show at end only, with option to return to specific questions

5. **Colorblind Considerations:** Do patterns work for colorblind candidates?
   - **Action:** Test with colorblind team members, adjust if needed

6. **Mobile Support:** Should we allow Raven on mobile or desktop-only?
   - **Recommendation:** Allow mobile but warn that desktop is recommended

7. **Time Warning:** Alert if candidate taking too long (>60 min)?
   - **Recommendation:** Yes, show gentle reminder at 50 minutes

### Low Priority (Nice to Have)
8. **Practice Mode:** 3-5 practice questions before real test?
   - **Recommendation:** Yes, add Set A question 1-3 as practice

9. **Zoom Functionality:** Allow candidates to zoom into matrix?
   - **Recommendation:** Not needed if images are high resolution

10. **Results Explanation:** Show which questions were wrong?
    - **Recommendation:** No for candidates (prevents sharing answers), yes for HR

---

## Acceptance Criteria Summary

**This feature is considered complete when:**

✅ Raven test accessible at `etapa_atual = 'raven'`
✅ All 60 questions load with matrix and option images
✅ Images preload before test starts (<5 second wait)
✅ Progress shows current set (A-E) and question number
✅ Candidates can select one option per question
✅ Skip functionality allows marking questions for later review
✅ Review screen shows all answered, skipped, and unanswered questions
✅ Navigation allows returning to previous questions
✅ Time tracking records per-question and total time
✅ Raw score (0-60) calculated correctly
✅ Percentile ranking calculated from normative table
✅ Results stored in `resultados_raven` table
✅ N8N webhook triggered with results
✅ Candidate stage updated to next step
✅ Success screen shows score, percentile, and classification
✅ Set-by-set breakdown displayed
✅ Test prevents duplicate submissions
✅ All images display correctly on mobile and desktop
✅ Manual QA passes with 0 critical bugs
✅ E2E test covers full Raven flow (load, answer, skip, review, submit)

---

**Target Audience:** Junior Frontend Developer
**Estimated Effort:** 5-6 days (includes image integration complexity)
**Dependencies:**
- ✅ `biblioteca_perguntas` with 60 Raven questions + image URLs
- ✅ Supabase Storage bucket with all matrix/option images
- ✅ `resultados_raven` table
- ✅ N8N webhook for raven-completo
- ⏳ PRD-DEV-008 (DISC) must be complete first
- ⏳ Normative percentile table data
**Blocker Status:** 🟡 HIGH PRIORITY - Fifth stage, cognitive assessment critical for analytical roles
