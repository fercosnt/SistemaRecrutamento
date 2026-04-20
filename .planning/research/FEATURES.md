# Feature Landscape: ATS Candidate Portal (MVP Candidato)

**Domain:** Applicant Tracking System - Candidate-facing portal
**Researched:** 2026-04-19
**Context:** Beauty Smile single-tenant ATS, Brazilian dental clinic network, mobile-first candidate persona (22-45, Instagram/WhatsApp sourced)

---

## Table Stakes

Features users expect. Missing = candidate abandons or feels the system is broken.

| # | Feature | Why Expected | Complexity | Notes |
|---|---------|--------------|------------|-------|
| T1 | **Email + password registration** | Universal baseline. Candidates from social media expect simple account creation | Low | Already built: `CadastroMultiStepForm` with 4 steps. Rebuild on secure auth foundation (no service_role) |
| T2 | **Multi-step registration with progress indicator** | Long forms without progress cause 74% drop-off. Visual progress bar is expected in 2025 | Low | Already built. Keep step indicator visible. 4 steps is acceptable for this domain (personal data, address, availability, LGPD consent) |
| T3 | **CPF + email duplicate detection (real-time)** | Brazilian users expect immediate feedback on duplicate CPF. Silent failure = support tickets | Low | Already built: `useDuplicateCheck` with debounce + abort. Reuse as-is |
| T4 | **CEP auto-fill (ViaCEP)** | Standard in Brazilian forms since 2018. Not having it feels broken | Low | Already built: `useViaCEP`. Reuse |
| T5 | **Email/password login with "Remember me"** | Candidates return to check status. Session persistence is expected | Low | Needs rebuild: unified `authStore` with `persistSession`. Current implementation has security issues |
| T6 | **Password recovery (forgot password flow)** | 100% expected. Supabase Auth handles the heavy lifting | Low | Supabase Auth native. Pages exist (`EsqueciSenhaPage`, `RedefinirSenhaPage`), need wiring to new auth |
| T7 | **Public job listing page** | Candidates arrive from Instagram/WhatsApp links. Must see active jobs without login | Low | Page exists (`VagasPublicasPage`). Filter by `status = 'ativa'` (not boolean `ativa`) |
| T8 | **Job detail page with "Apply" CTA** | Candidate needs to read requirements before applying. CTA must be prominent | Low | Page exists (`VagaDetalhePage`). Simple `/vagas/:slug` route. No WYSIWYG LP needed |
| T9 | **Resume/CV upload (PDF)** | Table stakes for any job application. PDF is standard in Brazil | Med | Supabase Storage bucket `curriculos`. Max 5MB. Accept PDF only (not .docx -- Brazilian candidates use PDF). Show upload progress bar on mobile |
| T10 | **Application submission with screening questions** | Recruiters need screening data. Candidates expect a short form after uploading CV | Med | `FormularioCandidaturaPage` exists. Needs real integration with `formularios_candidatura` table and dynamic questions from `perguntas_triagem_vaga` |
| T11 | **Duplicate application prevention** | Applying twice to same job confuses both candidate and RH | Low | DB constraint on `candidato_id + vaga_id`. Show clear message "Voce ja se candidatou a esta vaga" with link to status |
| T12 | **Application status visibility** | 66% of candidates cite communication as deciding factor. "Where am I?" must be answerable | Med | `MeuPerfilCandidatoPage` must show real candidaturas with `status` + `etapa_atual` + `data_atualizacao`. No mocks |
| T13 | **Profile page with personal data** | Candidates need to see and verify their own data | Low | Page exists. Needs real data from `candidatos` table via authenticated query |
| T14 | **Logout that works across tabs** | Broken logout = security concern. `onAuthStateChange` must propagate | Low | Supabase Auth `SIGNED_OUT` event must clear all state via `authStore` |
| T15 | **Mobile-responsive layout** | Beauty Smile candidates are mobile-first (Instagram sourced). 50%+ traffic is mobile | Med | Existing UI uses Tailwind + shadcn/ui. Verify touch targets (min 44px), form inputs don't zoom on iOS (font-size >= 16px) |
| T16 | **LGPD consent checkbox (explicit opt-in)** | Brazilian law (Lei 13.709/2018). Required before processing personal data | Low | Already in step 4 of registration. Must be recorded with timestamp in DB. Button disabled without consent |
| T17 | **Protected routes with redirect** | Unauthenticated access to `/candidato/*` must redirect to login with `?redirect=` param | Low | Critical gap today (9/21 E2E failing). `RoleGuard` must validate session + role from DB |
| T18 | **Auto-login after registration** | Completing a 4-step form and then being asked to login is a conversion killer | Low | Already specified in RF-07. Supabase `signUp` returns session automatically |

---

## Differentiators

Features that set the portal apart from competitors (Gupy, Quickin). Not expected, but valued.

| # | Feature | Value Proposition | Complexity | Notes |
|---|---------|-------------------|------------|-------|
| D1 | **Real-time status timeline (not just current status)** | Most ATS show only current stage. A timeline showing "Triagem > Aprovado > Aguardando testes" with dates builds trust and reduces "where am I?" anxiety | Med | Render from `historico_candidatura` table. Each transition logged with timestamp. Visual: vertical timeline with stage dots |
| D2 | **Application confirmation with next-steps guidance** | After applying, show "O que acontece agora?" with expected timeline. 28% reduction in support tickets when implemented | Low | Static content page after successful candidatura submission. Set expectations: "Voce recebera retorno em ate 48h uteis" |
| D3 | **Save and resume long forms** | Progressive disclosure research shows users on mobile need ability to pause and return. Reduces drop-off by 20% | Med | Store partial form state in `localStorage` or Zustand persist. On return, pre-populate from last saved state. Clear on successful submission |
| D4 | **Optimistic upload feedback for CV** | Show progress bar + file preview (name + size) immediately. Candidates on 4G need confidence the file is uploading | Low | Supabase Storage supports upload progress events. Show percentage + cancel button |
| D5 | **Smart redirect after login** | If candidate arrived at `/vagas/dentista-sp` but wasn't logged in, redirect back to that job after login/registration, not to generic dashboard | Low | Already in spec (RF-12 `?redirect=`). Critical for Instagram-sourced traffic where user tapped a specific job link |
| D6 | **Account deletion (LGPD right to erasure)** | Goes beyond minimum compliance. Self-service deletion builds trust. Required by LGPD Art. 18 | Med | Soft-delete + anonymization. Email confirmation before execution. Cascade to `candidaturas`, `respostas_*`. Edge Function for privileged operation |
| D7 | **Email notification on status change** | Candidates check email, not the portal. Notify on stage transitions. Gupy does this; not having it feels like a gap | Med | Supabase Edge Function triggered by DB webhook on `candidaturas.etapa_atual` change. Template-based email via Supabase Auth or Resend |
| D8 | **Accessibility: screen reader + keyboard navigation** | Lighthouse Accessibility > 80 is already a target. Proper ARIA labels, focus management in multi-step form, skip links | Med | shadcn/ui + Radix primitives provide good baseline. Main work: form step transitions, error announcements, focus trap in modals |
| D9 | **Branded, warm UI (not generic ATS)** | Beauty Smile candidates should feel they're applying to a dental clinic, not using enterprise software. Glass UI design system already exists | Low | Already built with glass UI + Beauty Smile branding. Maintain and polish, don't strip to generic |

---

## Anti-Features

Features to explicitly NOT build. Building these wastes time, adds complexity, or creates problems.

| # | Anti-Feature | Why Avoid | What to Do Instead |
|---|--------------|-----------|-------------------|
| A1 | **Social login (Google/LinkedIn)** | Adds OAuth complexity, Supabase config, consent flow confusion. Beauty Smile candidates come from Instagram links, not LinkedIn. Email/password is simpler for this persona | Email + password only. Consider magic links in V3+ if drop-off data justifies |
| A2 | **Resume parsing / auto-fill from CV** | Requires NLP pipeline, costs money per parse, inaccurate for Brazilian CV formats. RH reviews CVs manually anyway | Simple PDF upload + manual screening questions. RH downloads and reads |
| A3 | **Rich text job descriptions (WYSIWYG editor)** | Complexity of editor, sanitization, rendering inconsistencies. Already decided: no VagaLPPage | Plain text + basic markdown rendering. RH enters description in textarea |
| A4 | **Chatbot / live chat with candidates** | WhatsApp manual channel already exists. Building a chatbot is scope creep and maintenance burden | Show WhatsApp contact link on job page and status page |
| A5 | **AI-powered job recommendations** | Single-tenant with <20 active jobs at a time. Recommendation engine is overkill. Candidates come for specific roles via direct links | Simple job listing page with optional city/role filter |
| A6 | **Video introduction / cover letter upload** | Adds storage costs, playback complexity, review burden. Not standard in Brazilian dental recruitment | Screening questions in text form capture what's needed |
| A7 | **Application via WhatsApp / SMS** | Fragmented data entry, no structured data, can't enforce required fields | Drive WhatsApp traffic to web form with deep link to specific job |
| A8 | **Multi-language support** | Single-tenant Brazilian company. All candidates speak Portuguese | Hardcode pt-BR. No i18n infrastructure needed |
| A9 | **Complex search/filter on public job listing** | <20 jobs at a time. Full-text search, faceted filters are overengineering | Simple list sorted by date. Optional city filter if jobs span multiple cities |
| A10 | **Candidate-to-candidate networking / community** | This is a recruitment tool, not LinkedIn. Social features distract from the core flow | Nothing. Focus on apply-and-track |

---

## Feature Dependencies

```
T5 (Auth/Login) ──────────────────────┐
T17 (Protected Routes) ──────────────►├── Foundation Layer (Phase 1)
T14 (Logout) ─────────────────────────┘
                                       │
T1 (Registration) ────────────────────►├── Registration (Phase 2)
T2 (Multi-step form) ─────────────────┤
T3 (Duplicate check) ─────────────────┤
T4 (ViaCEP auto-fill) ────────────────┤
T16 (LGPD consent) ───────────────────┤
T18 (Auto-login after registration) ──┘
                                       │
T6 (Password recovery) ──────────────►├── Auth Completion (Phase 2)
D5 (Smart redirect) ──────────────────┘
                                       │
T7 (Job listing) ─────────────────────►├── Job Browsing (Phase 3)
T8 (Job detail) ──────────────────────┘    (no auth required)
                                       │
T9 (CV upload) ───────────────────────►├── Application Flow (Phase 4)
T10 (Screening questions) ────────────┤    (requires auth + job browsing)
T11 (Duplicate prevention) ───────────┤
D2 (Confirmation + next steps) ───────┤
D4 (Upload progress) ─────────────────┘
                                       │
T12 (Status visibility) ─────────────►├── Profile & Tracking (Phase 5)
T13 (Profile page) ───────────────────┤    (requires candidaturas to exist)
D1 (Status timeline) ─────────────────┤
D6 (Account deletion) ────────────────┤
D7 (Email notifications) ─────────────┘
                                       │
T15 (Mobile responsive) ─────────────►├── Cross-cutting (all phases)
D8 (Accessibility) ───────────────────┤
D9 (Branded UI) ──────────────────────┤
D3 (Save/resume forms) ──────────────►└── Enhancement (Phase 2-4)
```

---

## MVP Recommendation

### Must Ship (Phases 1-5, M1 scope)

**Priority 1 -- Auth Foundation (without this, nothing works):**
1. T5: Login with unified authStore (no service_role in client)
2. T17: Protected routes with RoleGuard + redirect
3. T14: Logout across tabs
4. T6: Password recovery

**Priority 2 -- Registration (candidate enters the system):**
5. T1 + T2: Multi-step registration with progress
6. T3: CPF/email duplicate check
7. T4: ViaCEP auto-fill
8. T16: LGPD consent
9. T18: Auto-login after registration

**Priority 3 -- Job Discovery (candidate finds jobs):**
10. T7: Public job listing
11. T8: Job detail with CTA

**Priority 4 -- Application (candidate applies):**
12. T9: CV upload (PDF, Supabase Storage)
13. T10: Screening questions form
14. T11: Duplicate application prevention
15. D2: Confirmation with next steps
16. D5: Smart redirect after login

**Priority 5 -- Profile & Status (candidate tracks progress):**
17. T12: Application status visibility (real data)
18. T13: Profile page
19. T15: Mobile responsive (Lighthouse mobile > 80)

### Defer to V2+

- D1 (Status timeline): Nice-to-have. Simple status text works for MVP
- D3 (Save/resume forms): Only if drop-off data shows need. 4-step form is short enough
- D6 (Account deletion): LGPD requires it but can be manual request via email for MVP. Self-service in V2
- D7 (Email notifications): Critical for candidate experience but depends on email infrastructure. Phase 10 (n8n) or earlier via Supabase Edge Functions
- D8 (Accessibility): Baseline from Radix/shadcn. Deep audit in V2

### Never Build

All anti-features (A1-A10). These decisions are validated by project constraints (single-tenant, <20 jobs, Brazilian dental clinics, WhatsApp as existing channel).

---

## Competitive Context (Brazil)

| Feature | Gupy (market leader) | Beauty Smile ATS | Gap? |
|---------|---------------------|-----------------|------|
| Registration flow | Social login + email | Email only | No -- simpler is better for this persona |
| Job listing | Full search + filters | Simple list | No -- <20 jobs |
| Application | CV + video + screening | CV + screening | No -- video is anti-feature |
| Status tracking | Email notifications + portal | Portal only (MVP) | Yes -- email notifications needed in V2 |
| Behavioral tests | AI-powered assessments | DISC + Big Five + ICAR + Fit Cultural | Advantage -- more comprehensive, open-source tests |
| Mobile | Responsive web + app | Responsive web | No -- app is anti-feature |
| LGPD | Compliant | Compliant | Parity |

---

## Sources

- [ReadyATS: Top 7 ATS Features 2025](https://power.readyats.com/top-7-powerful-ats-features-to-look-for-in-2025/)
- [Talentera: 10 ATS Best Practices 2025](https://www.talentera.com/en/blog/10-ats-best-practices-2025/)
- [peopleHum: Must-Have ATS Features 2025](https://www.peoplehum.com/blog/must-have-applicant-tracking-system-ats-features-for-hr)
- [WinTechHub: Candidate Transparency Dashboards](https://wintechub.com/candidate-transparency-dashboards-what-to-show-and-why/)
- [Onrec: 5-Minute Apply Blueprint for Mobile](https://onrec.com/news/news-archive/the-5-minute-apply-blueprint-a-mobile-first-fix-for-candidate-drop-without)
- [Authgear: Login & Signup UX 2025 Guide](https://www.authgear.com/post/login-signup-ux-guide)
- [Tracker: ATS Statistics 2026](https://www.tracker-rms.com/blog/applicant-tracking-system-statistics/)
- [ATZ CRM: Candidate Portal Features](https://atzcrm.com/feature/candidate-portal/)
- [Gupy Official Site](https://www.gupy.io/en/)
- [Lever: Modern ATS 2026](https://www.lever.co/blog/modern-applicant-tracking-systems-what-to-look-for-in-2026/)
