# PRD-DEV-001: Sistema de Cadastro de Candidatos

## 1. Introduction/Overview

The Sistema de Cadastro de Candidatos is the foundational feature that allows new candidates to register in the Beauty Smile recruitment system. This feature replaces the current mock authentication system with a real Supabase-powered registration flow, enabling candidates to create accounts, store their personal information securely, and begin the 7-stage recruitment process.

**Problem it solves:** Currently, the frontend uses 100% mock data with no real backend integration. Candidates cannot actually register, and no real data flows through the system. This blocks all other recruitment features from functioning.

**Goal:** Implement a production-ready candidate registration system that integrates with the existing Supabase backend (23 tables, 105 RLS policies already deployed) and initiates the recruitment workflow.

## 2. Goals

1. Enable candidates to self-register with CPF, email, and basic personal information
2. Validate and prevent duplicate registrations (CPF and email must be unique)
3. Create associated records in multiple related tables (candidatos, enderecos, dados_profissionais, disponibilidade, autorizacoes)
4. Trigger N8N webhook to initiate AI-powered candidate analysis
5. Set candidate status to "triagem" (first recruitment stage)
6. Send confirmation email upon successful registration
7. Provide clear error messages for validation failures
8. Ensure RLS policies protect candidate data from the moment of creation

## 3. User Stories

### Primary Flow
**As a** potential job candidate
**I want to** register an account on the Beauty Smile recruitment platform
**So that** I can apply for positions and go through the recruitment process

**As a** candidate
**I want to** provide my CPF, personal information, and contact details during registration
**So that** the HR team can identify me and contact me throughout the recruitment process

**As a** candidate
**I want to** receive immediate feedback if my CPF or email is already registered
**So that** I don't waste time filling out the entire form only to be rejected at the end

### Secondary Flows
**As a** system administrator
**I want** new candidate registrations to automatically trigger AI analysis
**So that** candidates can be evaluated immediately without manual HR intervention

**As an** HR manager
**I want** all candidate data to be immediately available in the admin dashboard
**So that** I can review new applicants as soon as they register

**As a** candidate
**I want** to receive a confirmation email after registering
**So that** I know my application was received and what the next steps are

## 4. Functional Requirements

### FR-001: Registration Form Fields
The registration form **must** collect the following information from candidates:

**Dados Pessoais:**
- CPF (required, validated format: XXX.XXX.XXX-XX)
- Nome completo (required)
- Email (required, validated email format)
- Telefone (required, validated format with DDD)
- Data de nascimento (required, age ≥ 16 years)
- Gênero (optional: Masculino, Feminino, Outro, Prefiro não informar)
- Estado civil (optional: Solteiro, Casado, Divorciado, Viúvo, União Estável)

**Endereço:**
- CEP (required, auto-fill via ViaCEP API)
- Rua/Logradouro (required)
- Número (required)
- Complemento (optional)
- Bairro (required)
- Cidade (required)
- Estado (required, dropdown UF)

**Dados Profissionais:**
- Escolaridade (required: Ensino Fundamental, Ensino Médio, Ensino Superior, Pós-graduação, Mestrado, Doutorado)
- Experiência anterior em odontologia (boolean, default: false)

**Disponibilidade:**
- Período preferencial (required: Manhã, Tarde, Noite, Integral)
- Disponibilidade para viagens (boolean, default: false)

**Autorizações:**
- Consentimento LGPD (required, checkbox: "Autorizo o uso dos meus dados para fins de recrutamento")
- Consentimento para análise de IA (required, checkbox: "Autorizo a análise dos meus dados por sistemas de IA")

### FR-002: Client-Side Validation
The system **must** validate all required fields before form submission:
- CPF must be valid (use validation algorithm for CPF check digits)
- Email must be in valid format
- Telefone must have valid DDD and number format
- Data de nascimento must result in age ≥ 16 years
- CEP must be 8 digits
- All required fields must be filled
- Both LGPD consents must be checked

### FR-003: Duplicate Prevention
The system **must** check for duplicate registrations:
- Query Supabase `candidatos` table for existing CPF
- Query Supabase `candidatos` table for existing email
- If CPF exists: Display error "CPF já cadastrado. Se você esqueceu sua senha, use a opção de recuperação."
- If email exists: Display error "Email já cadastrado. Se você esqueceu sua senha, use a opção de recuperação."
- Check should happen onBlur for CPF and email fields (real-time feedback)

### FR-004: Multi-Table Record Creation
Upon successful validation, the system **must** create records in the following tables in a **single Supabase transaction**:

1. **candidatos** table:
   - user_id: Generated by Supabase Auth
   - cpf: Formatted without dots/dashes
   - nome_completo
   - email
   - telefone
   - data_nascimento
   - genero
   - estado_civil
   - status_processo: "triagem"
   - etapa_atual: "triagem"
   - progresso_processo: 0
   - data_cadastro: NOW()

2. **enderecos** table:
   - candidato_id: FK to candidatos
   - cep
   - rua
   - numero
   - complemento
   - bairro
   - cidade
   - estado
   - tipo_endereco: "residencial"
   - endereco_principal: true

3. **dados_profissionais** table:
   - candidato_id: FK to candidatos
   - escolaridade
   - experiencia_odontologia

4. **disponibilidade** table:
   - candidato_id: FK to candidatos
   - periodo_preferencial
   - disponibilidade_viagens

5. **autorizacoes** table:
   - candidato_id: FK to candidatos
   - consentimento_lgpd: true
   - data_consentimento_lgpd: NOW()
   - consentimento_ia: true
   - data_consentimento_ia: NOW()

### FR-005: Supabase Auth Integration
The system **must** create a Supabase Auth user:
- Use `supabase.auth.signUp()` with email and password
- Password must be auto-generated or prompted separately (see Open Questions)
- Auth user email must match candidatos table email
- Store returned `user.id` as `user_id` in candidatos table
- Handle auth errors (email already registered, weak password, etc.)

### FR-006: N8N Webhook Trigger
After successful registration, the system **must**:
- Call the N8N webhook for "Novo Cadastro de Candidato"
- Webhook endpoint: `https://fernandocosta.app.n8n.cloud/webhook/novo-cadastro`
- Send payload with candidato_id and nome_completo
- Webhook triggers AI analysis workflow (Big Five initial scoring)
- Log webhook call success/failure in browser console (development) or monitoring service (production)

### FR-007: Confirmation Email
The system **must** send a confirmation email using the existing Supabase email template:
- Template: "candidato-cadastro-confirmacao"
- Variables: nome_completo, email, cpf
- Email sent automatically via Supabase trigger `enviar_email_novo_cadastro_candidato()`
- Content: Welcome message, next steps (check email for Big Five test link), timeline expectations

### FR-008: Success Feedback
Upon successful registration, the system **must**:
- Display success message: "Cadastro realizado com sucesso! Enviamos um email de confirmação para {email}."
- Show next steps: "Aguarde o envio do link para realizar o teste Big Five (Personalidade) em até 24 horas."
- Provide button to navigate to login page
- Clear all form fields

### FR-009: Error Handling
The system **must** handle and display user-friendly errors for:
- Network failures (Supabase unreachable)
- Transaction rollback failures (partial data created)
- Auth failures (user already exists, password too weak)
- Webhook failures (N8N unreachable) - should NOT block registration
- Validation errors (display field-specific messages)

### FR-010: Loading States
The system **must** provide visual feedback during:
- Form submission (disable submit button, show spinner)
- CEP lookup (show loading indicator in address fields)
- CPF/email duplicate checks (show loading indicator on fields)
- Overall page load (skeleton screens)

## 5. Non-Goals (Out of Scope)

The following are **NOT** part of this PRD:

1. **Social login** (Google, Facebook) - Future enhancement
2. **Phone number verification** (SMS OTP) - Future enhancement
3. **Document upload during registration** (RG, CPF scan) - Will be in future PRD
4. **Candidate profile editing** - Separate PRD (PRD-DEV-008)
5. **Password reset flow** - Separate PRD (PRD-DEV-004)
6. **Multi-step form wizard** - Current scope is single-page form
7. **Vacancy selection during registration** - Candidates register first, apply later
8. **Referral codes** - Future enhancement
9. **Admin approval of registrations** - Auto-approved, HR reviews in triagem stage
10. **Custom email templates** - Use existing Supabase template

## 6. Design Considerations

### UI/UX Requirements
- **Page:** Use existing `CadastroPage.tsx` (currently at 60% mock implementation)
- **Form Layout:** Single-page form with logical sections (Dados Pessoais, Endereço, Dados Profissionais, Disponibilidade, Autorizações)
- **Component Library:** shadcn/ui components (Input, Select, Checkbox, Button)
- **Styling:** Tailwind CSS following existing design system
- **Accessibility:**
  - All inputs must have proper labels
  - Error messages must be announced to screen readers
  - Form must be keyboard-navigable
  - Focus management for validation errors

### Visual Design
- **Reference:** Figma design already implemented (see DOCUMENTACAO-TECNICA-BEAUTY-SMILE-V2.md)
- **Brand Colors:** Beauty Smile color palette (primary, secondary, accent)
- **Responsive:** Mobile-first design, works on 320px to 1920px viewports
- **Loading States:** Use skeleton screens and spinners from design system

### Form Behavior
- **Auto-fill CEP:** Use ViaCEP API to auto-populate address fields when CEP is entered
- **Progressive disclosure:** Show address fields only after valid CEP is entered
- **Real-time validation:** CPF and email duplicate checks on blur
- **Inline error messages:** Show validation errors below each field
- **Success animation:** Confetti or success icon on successful registration

## 7. Technical Considerations

### Frontend Stack
- **Framework:** React 18.3.1 with TypeScript
- **Build Tool:** Vite 6.3.5
- **State Management:** Zustand (already configured in codebase)
- **Form Handling:** React Hook Form + Zod for validation
- **API Client:** Supabase JS SDK v2
- **Routing:** React Router (navigate to /login after success)

### Backend Integration
- **Database:** Supabase PostgreSQL (already deployed with schema)
- **Tables Used:** candidatos, enderecos, dados_profissionais, disponibilidade, autorizacoes
- **RLS Policies:** Already created (105 policies deployed)
  - Policy: `candidatos_insert_own` allows authenticated users to insert their own record
  - Policy: `candidatos_select_own` allows candidates to view only their own data
- **Triggers:** Already deployed
  - `enviar_email_novo_cadastro_candidato()` sends confirmation email
  - Other triggers handle AI analysis initiation

### API Calls
```typescript
// 1. Create Supabase Auth user
const { data: authData, error: authError } = await supabase.auth.signUp({
  email: formData.email,
  password: generatedPassword, // See Open Questions
  options: {
    data: {
      nome_completo: formData.nome_completo,
      cpf: formData.cpf
    }
  }
})

// 2. Insert candidatos record (gets user_id from auth)
const { data: candidato, error: candidatoError } = await supabase
  .from('candidatos')
  .insert([{
    user_id: authData.user.id,
    cpf: formData.cpf,
    nome_completo: formData.nome_completo,
    email: formData.email,
    // ... other fields
    status_processo: 'triagem',
    etapa_atual: 'triagem',
    progresso_processo: 0
  }])
  .select()
  .single()

// 3. Insert related records (enderecos, dados_profissionais, etc.)
// Use candidato.id as FK

// 4. Trigger N8N webhook
await fetch('https://fernandocosta.app.n8n.cloud/webhook/novo-cadastro', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    candidato_id: candidato.id,
    nome_completo: candidato.nome_completo,
    email: candidato.email
  })
})
```

### Environment Variables
- `VITE_SUPABASE_URL`: Already configured
- `VITE_SUPABASE_ANON_KEY`: Already configured
- `VITE_N8N_WEBHOOK_URL`: New, for webhook endpoint

### Error Scenarios
1. **Transaction Failure:** If any insert fails, Supabase transaction should rollback all changes
2. **Webhook Failure:** Log error but allow registration to complete (webhook is async)
3. **Email Send Failure:** Log error but allow registration to complete (trigger handles retries)

### Dependencies
- **Supabase Auth:** Must be enabled in Supabase project
- **Email Templates:** Template "candidato-cadastro-confirmacao" must exist
- **N8N Workflow:** Workflow must be active and listening
- **ViaCEP API:** Public API for CEP lookup (no auth required)

### Performance Requirements
- Form submission must complete within 3 seconds (95th percentile)
- CEP lookup must complete within 1 second
- Page load time < 2 seconds
- Real-time validation (duplicate checks) < 500ms

### Security Requirements
- **Password Handling:** Never log or display generated passwords
- **CPF Storage:** Store CPF without formatting (numbers only) in database
- **RLS Enforcement:** All queries must respect RLS policies (authenticated users only)
- **HTTPS Only:** All API calls must use HTTPS
- **Input Sanitization:** Prevent SQL injection (Supabase handles this)
- **XSS Prevention:** Sanitize all user inputs before display (React handles this)

## 8. Success Metrics

### Primary Metrics
1. **Registration Completion Rate:** ≥ 80% of users who start the form complete registration
2. **Form Submission Success Rate:** ≥ 99% of submissions succeed (no technical errors)
3. **Time to Complete Registration:** ≤ 5 minutes (median)
4. **Duplicate Prevention Accuracy:** 100% of duplicate CPF/email attempts blocked

### Secondary Metrics
1. **N8N Webhook Delivery Rate:** ≥ 95% of webhooks successfully delivered
2. **Email Delivery Rate:** ≥ 98% of confirmation emails delivered within 5 minutes
3. **Field Validation Error Rate:** ≤ 20% of users encounter validation errors before submission
4. **Mobile vs Desktop Completion Rate:** Difference ≤ 10%

### User Experience Metrics
1. **User Satisfaction:** Post-registration survey score ≥ 4.0/5.0
2. **Support Tickets:** ≤ 5% of registrations result in support contact
3. **Abandonment Analysis:** Track which form fields cause most drop-offs

### Business Metrics
1. **Daily New Registrations:** Track trend over time
2. **Conversion to First Test (Big Five):** ≥ 70% of registered candidates complete Big Five within 48 hours
3. **Data Quality:** ≤ 2% of registrations require manual data correction by HR

## 9. Open Questions

### Critical (Must Resolve Before Development)
1. **Password Handling:** How should candidate passwords be handled?
   - Option A: Auto-generate password, send via email, force change on first login
   - Option B: Prompt for password during registration (add password + confirm password fields)
   - Option C: Send "magic link" for passwordless authentication
   - **Recommendation:** Option B (most user-friendly, industry standard)

2. **Email Verification:** Should we require email verification before allowing login?
   - Option A: Send verification link, candidate must click before accessing dashboard
   - Option B: Allow immediate login, send verification link for records only
   - **Recommendation:** Option A (prevents fake emails, improves data quality)

3. **Vacancy Selection:** Should candidates select a specific vacancy during registration?
   - Currently marked as "non-goal" but need confirmation
   - Alternative: Allow general registration, candidate selects vacancy later in dashboard

### Medium Priority (Can Resolve During Development)
4. **Field Lengths:** What are maximum character limits for text fields?
   - Recommendation: Use database column limits from schema

5. **Phone Number Format:** Accept only mobile or include landlines?
   - Recommendation: Accept both, validate DDD + number length

6. **CPF Formatting:** Display with or without dots/dashes in success message?
   - Recommendation: Display formatted (XXX.XXX.XXX-XX) for readability

7. **Gender Options:** Current list is Masculino, Feminino, Outro, Prefiro não informar - is this sufficient?
   - Recommendation: Yes, aligns with Brazilian market standards

### Low Priority (Nice to Have)
8. **Analytics Tracking:** Should we track form field interactions with Google Analytics or Mixpanel?
   - Recommendation: Yes, track field abandonment and error rates

9. **A/B Testing:** Should we build in capability to test different form layouts?
   - Recommendation: Not for MVP, add in future iteration

10. **Progressive Profiling:** Should we split registration into multiple steps (basic info first, detailed info later)?
    - Recommendation: Not for MVP, current single-page form is acceptable

---

## Acceptance Criteria Summary

**This feature is considered complete when:**

✅ A candidate can successfully register with all required information
✅ Duplicate CPF/email registrations are prevented with clear error messages
✅ All 5 related tables (candidatos, enderecos, dados_profissionais, disponibilidade, autorizacoes) are populated
✅ Supabase Auth user is created and linked to candidatos.user_id
✅ N8N webhook is triggered and logged
✅ Confirmation email is sent and received
✅ Success message is displayed with next steps
✅ Form validation provides real-time feedback
✅ CEP auto-fill works correctly
✅ Page is responsive and accessible
✅ RLS policies prevent unauthorized data access
✅ All error scenarios display user-friendly messages
✅ Form can be completed on mobile devices
✅ Manual QA testing passes with 0 critical bugs
✅ Automated E2E test covers happy path and error scenarios

---

**Target Audience:** Junior Frontend Developer
**Estimated Effort:** 3-5 days (with existing backend infrastructure)
**Dependencies:** Supabase backend (✅ complete), N8N workflow (✅ deployed), Email templates (✅ configured)
**Blocker Status:** 🚨 CRITICAL - Blocks all other development work
