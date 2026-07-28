# PRD-DEV-002: Sistema de Login Candidatos

## 1. Introduction/Overview

The Sistema de Login Candidatos enables registered candidates to authenticate and access their personal recruitment dashboard. This feature integrates with Supabase Auth to provide secure session management, replacing the current mock authentication system.

**Problem it solves:** Currently, the login page exists but uses 100% mock data with hardcoded credentials. Candidates cannot access their real data, and there's no persistent session management or security.

**Goal:** Implement a production-ready candidate authentication system that validates credentials against Supabase Auth, establishes secure sessions, and redirects authenticated candidates to their personalized dashboard.

## 2. Goals

1. Enable registered candidates to log in using email and password
2. Validate credentials against Supabase Auth backend
3. Establish secure, persistent sessions with configurable session duration
4. Redirect authenticated candidates to appropriate dashboard based on recruitment stage
5. Provide "Remember Me" functionality for convenience
6. Display clear, actionable error messages for authentication failures
7. Integrate with RLS policies to enforce data access control
8. Support "Forgot Password" link to recovery flow (PRD-DEV-004)
9. Prevent brute force attacks with rate limiting
10. Track login events for security auditing

## 3. User Stories

### Primary Flow
**As a** registered candidate
**I want to** log in to my account using my email and password
**So that** I can access my recruitment dashboard and continue the application process

**As a** candidate
**I want to** stay logged in across browser sessions
**So that** I don't have to re-enter my credentials every time I visit the platform

**As a** candidate
**I want to** see clear error messages when login fails
**So that** I understand what went wrong and how to fix it (wrong password, account not found, etc.)

### Secondary Flows
**As a** candidate
**I want to** click a "Forgot Password" link on the login page
**So that** I can recover access to my account if I forget my credentials

**As a** candidate on a shared computer
**I want to** opt out of "Remember Me" functionality
**So that** my session expires when I close the browser for security

**As a** system administrator
**I want** failed login attempts to be logged and rate-limited
**So that** we can prevent brute force attacks and maintain platform security

### Edge Cases
**As a** candidate who hasn't verified their email
**I want to** see a prompt to verify my email after login attempt
**So that** I know I need to check my inbox before accessing the platform

**As a** candidate whose account has been deactivated
**I want to** see a clear message that my account is inactive
**So that** I can contact HR for clarification

## 4. Functional Requirements

### FR-001: Login Form Fields
The login form **must** include:
- **Email input:** Text field with email validation
- **Password input:** Password field (masked characters)
- **Remember Me checkbox:** Optional, default unchecked
- **Forgot Password link:** Navigates to password recovery (PRD-DEV-004)
- **Create Account link:** Navigates to registration (PRD-DEV-001)
- **Login button:** Primary CTA, disabled until both fields are filled

### FR-002: Client-Side Validation
The system **must** validate inputs before submission:
- Email must be in valid format (regex: `^\S+@\S+\.\S+$`)
- Password must be at least 1 character (no min length on login, validation happens on backend)
- Both fields are required
- Show inline error messages for validation failures
- Disable login button while validation errors exist

### FR-003: Authentication Flow
The system **must** perform the following authentication sequence:

1. **Collect Credentials:** Get email and password from form
2. **Call Supabase Auth:** Use `supabase.auth.signInWithPassword()`
3. **Handle Response:**
   - **Success:** Receive user object + session token
   - **Failure:** Receive error object with error code
4. **Fetch Candidate Profile:** Query `candidatos` table using `user_id`
5. **Store Session:** Save session token in Supabase client (automatic)
6. **Update State:** Update global auth state (Zustand store)
7. **Redirect:** Navigate to appropriate dashboard based on candidate stage

**Pseudo-code:**
```typescript
const { data, error } = await supabase.auth.signInWithPassword({
  email: formData.email,
  password: formData.password,
})

if (error) {
  // Handle error (see FR-005)
  displayError(error.message)
  return
}

// Fetch candidate profile
const { data: candidato, error: profileError } = await supabase
  .from('candidatos')
  .select('*, enderecos(*), dados_profissionais(*)')
  .eq('user_id', data.user.id)
  .single()

if (profileError || !candidato) {
  displayError('Perfil de candidato não encontrado')
  return
}

// Update global state
authStore.setUser(data.user)
authStore.setCandidato(candidato)

// Redirect based on stage
redirectToDashboard(candidato.etapa_atual)
```

### FR-004: Session Management
The system **must** handle sessions as follows:

**Remember Me = Checked:**
- Set session persistence to "local" (survives browser close)
- Session duration: 30 days
- Store session token in localStorage

**Remember Me = Unchecked:**
- Set session persistence to "session" (cleared on browser close)
- Session duration: 24 hours
- Store session token in sessionStorage

**Implementation:**
```typescript
await supabase.auth.signInWithPassword({
  email: formData.email,
  password: formData.password,
}, {
  options: {
    persistSession: formData.rememberMe
  }
})
```

### FR-005: Error Handling
The system **must** handle the following error scenarios:

| Error Code | Supabase Message | User-Friendly Message | Action |
|------------|------------------|----------------------|--------|
| `invalid_credentials` | "Invalid login credentials" | "Email ou senha incorretos. Verifique seus dados e tente novamente." | Show error below form |
| `email_not_confirmed` | "Email not confirmed" | "Seu email ainda não foi verificado. Verifique sua caixa de entrada e clique no link de confirmação." | Show error + "Reenviar email" button |
| `user_not_found` | "User not found" | "Não encontramos uma conta com este email. Deseja criar uma nova conta?" | Show error + link to registration |
| `too_many_requests` | "Too many requests" | "Muitas tentativas de login. Aguarde 5 minutos e tente novamente." | Show error + countdown timer |
| `user_banned` | "User is banned" | "Sua conta foi desativada. Entre em contato com o RH para mais informações." | Show error + HR contact info |
| Network error | Any network failure | "Erro de conexão. Verifique sua internet e tente novamente." | Show error + retry button |
| Unknown error | Any other error | "Ocorreu um erro inesperado. Tente novamente em alguns instantes." | Show error + log to monitoring |

### FR-006: Redirect Logic
After successful authentication, the system **must** redirect based on `candidato.etapa_atual`:

| Etapa Atual | Redirect Destination | Reason |
|-------------|---------------------|--------|
| `triagem` | `/dashboard-candidato` | Default dashboard, awaiting Big Five |
| `big_five` | `/testes/big-five` | Resume Big Five test |
| `disc` | `/testes/disc` | Resume DISC test |
| `entrevista_online` | `/entrevistas/online` | Schedule or join online interview |
| `raven` | `/testes/raven` | Resume Raven test |
| `cultura` | `/entrevistas/cultura` | View culture fit results |
| `entrevista_presencial` | `/entrevistas/presencial` | Schedule in-person interview |
| `aprovado` | `/dashboard-candidato/aprovado` | View approval status |
| `reprovado` | `/dashboard-candidato/reprovado` | View rejection details |

### FR-007: Loading States
The system **must** provide visual feedback:
- **Submitting form:** Show spinner on login button, change text to "Entrando..."
- **Fetching profile:** Show loading overlay with "Carregando seu perfil..."
- **Page load:** Show skeleton screen for login form
- **Redirecting:** Show "Redirecionando..." message

### FR-008: Security Requirements
The system **must** implement security measures:
- **HTTPS only:** All authentication requests over TLS
- **Password masking:** Password field type="password"
- **No password logging:** Never log passwords to console or analytics
- **Rate limiting:** Supabase enforces 5 failed attempts per hour per IP
- **Session timeout:** Auto-logout after session expiration
- **CSRF protection:** Supabase handles CSRF tokens automatically
- **XSS prevention:** Sanitize all error messages before display

### FR-009: Session Persistence Check
On app initialization, the system **must**:
1. Check for existing Supabase session
2. If session exists and is valid:
   - Fetch candidate profile
   - Update global auth state
   - Redirect to appropriate dashboard
3. If session expired:
   - Clear session storage
   - Redirect to login page
4. If no session:
   - Show login page

**Implementation:**
```typescript
// In App.tsx or router initialization
useEffect(() => {
  supabase.auth.getSession().then(({ data: { session } }) => {
    if (session) {
      // Restore user state
      fetchCandidateProfile(session.user.id)
    }
  })

  // Listen for auth state changes
  supabase.auth.onAuthStateChange((_event, session) => {
    if (session) {
      authStore.setUser(session.user)
    } else {
      authStore.clearUser()
    }
  })
}, [])
```

### FR-010: Logout Functionality
The system **must** provide logout capability:
- **Logout button** in candidate dashboard navigation
- Clicking logout:
  1. Calls `supabase.auth.signOut()`
  2. Clears global auth state
  3. Redirects to login page
  4. Shows success toast: "Você saiu da sua conta com sucesso"

### FR-011: Protected Routes
The system **must** protect authenticated routes:
- All routes under `/dashboard-candidato/*` require authentication
- All routes under `/testes/*` require authentication
- All routes under `/entrevistas/*` require authentication
- If unauthenticated user tries to access protected route:
  - Redirect to `/login`
  - Show message: "Faça login para acessar esta página"
  - Store attempted URL to redirect after successful login

## 5. Non-Goals (Out of Scope)

The following are **NOT** part of this PRD:

1. **Social login** (Google, Facebook, LinkedIn) - Future enhancement
2. **Two-factor authentication (2FA)** - Future security enhancement
3. **Biometric authentication** (Face ID, fingerprint) - Future mobile feature
4. **Single Sign-On (SSO)** - Enterprise feature
5. **Password reset flow** - Separate PRD (PRD-DEV-004)
6. **Email verification flow** - Part of PRD-DEV-001
7. **Account lockout after failed attempts** - Supabase handles basic rate limiting
8. **Login with CPF** - Only email login for MVP
9. **"Remember this device" functionality** - Future enhancement
10. **Login activity history** - Audit logs exist but no user-facing feature

## 6. Design Considerations

### UI/UX Requirements
- **Page:** Use existing `LoginPage.tsx` (currently mock implementation)
- **Form Layout:** Centered card layout with logo at top
- **Component Library:** shadcn/ui components (Input, Checkbox, Button, Alert)
- **Styling:** Tailwind CSS following existing design system
- **Responsive:** Mobile-first design, optimized for all screen sizes
- **Accessibility:**
  - All inputs have proper labels
  - Error messages announced to screen readers
  - Keyboard navigation fully supported
  - Focus management for errors
  - ARIA labels for password toggle (if implemented)

### Visual Design
- **Reference:** Figma design at `/paginas/01-login-candidato.tsx`
- **Brand Colors:** Beauty Smile primary colors
- **Logo:** Beauty Smile logo at top center
- **Background:** Subtle gradient or branded background image
- **Form:** White card with shadow, centered on page
- **Error Messages:** Red text below relevant field
- **Success State:** Smooth transition to loading state

### Form Behavior
- **Auto-focus:** Email field auto-focused on page load
- **Enter key:** Submit form when Enter pressed in any field
- **Password visibility toggle:** Optional show/hide password icon
- **Inline validation:** Real-time validation as user types
- **Error persistence:** Errors clear when user starts typing in error field

### Loading Animation
- **Button state:** Spinner replaces icon, text changes to "Entrando..."
- **Overlay:** Full-screen overlay with "Carregando seu perfil..." during profile fetch
- **Redirect:** Brief "Redirecionando..." message before navigation

## 7. Technical Considerations

### Frontend Stack
- **Framework:** React 18.3.1 with TypeScript
- **Build Tool:** Vite 6.3.5
- **State Management:** Zustand for global auth state
- **Form Handling:** React Hook Form + Zod for validation
- **API Client:** Supabase JS SDK v2
- **Routing:** React Router with protected routes

### Backend Integration
- **Auth Provider:** Supabase Auth
- **Session Storage:** Supabase handles session tokens automatically
- **Database Query:** `candidatos` table joined with `enderecos`, `dados_profissionais`
- **RLS Policies:** `candidatos_select_own` policy enforces user can only see their own data

### API Calls
```typescript
// 1. Sign in with email and password
const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
  email: formData.email,
  password: formData.password,
})

if (authError) {
  handleAuthError(authError)
  return
}

// 2. Fetch candidate profile with related data
const { data: candidato, error: profileError } = await supabase
  .from('candidatos')
  .select(`
    *,
    enderecos(*),
    dados_profissionais(*),
    disponibilidade(*),
    autorizacoes(*)
  `)
  .eq('user_id', authData.user.id)
  .eq('deleted_at', null)
  .single()

if (profileError || !candidato) {
  showError('Erro ao carregar perfil. Contate o suporte.')
  await supabase.auth.signOut() // Clean up auth session
  return
}

// 3. Update global state
authStore.setState({
  user: authData.user,
  session: authData.session,
  candidato: candidato,
  isAuthenticated: true
})

// 4. Redirect to appropriate dashboard
navigate(getDashboardRoute(candidato.etapa_atual))
```

### Zustand Auth Store Structure
```typescript
interface AuthState {
  user: User | null
  session: Session | null
  candidato: Candidato | null
  isAuthenticated: boolean
  isLoading: boolean

  // Actions
  setUser: (user: User) => void
  setCandidato: (candidato: Candidato) => void
  clearUser: () => void
  logout: () => Promise<void>
}
```

### Environment Variables
- `VITE_SUPABASE_URL`: Supabase project URL (already configured)
- `VITE_SUPABASE_ANON_KEY`: Supabase anonymous key (already configured)

### Protected Route Implementation
```typescript
// ProtectedRoute.tsx
export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuthStore()
  const location = useLocation()

  if (isLoading) {
    return <LoadingSpinner />
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  return <>{children}</>
}

// Usage in router
<Route path="/dashboard-candidato" element={
  <ProtectedRoute>
    <DashboardCandidatoPage />
  </ProtectedRoute>
} />
```

### Error Logging
- Log authentication errors to monitoring service (e.g., Sentry)
- Include error code, timestamp, and user email (hashed for privacy)
- Never log passwords or session tokens
- Track failed login attempts by email (anonymized) for security monitoring

### Performance Requirements
- Login form submission must complete within 2 seconds (95th percentile)
- Profile fetch must complete within 1 second after authentication
- Page load time < 1.5 seconds
- Redirect navigation < 500ms

### Session Recovery
- On page refresh, check for existing session in < 500ms
- If session exists, restore user state and redirect to dashboard
- If session expired, show toast: "Sua sessão expirou. Faça login novamente."

## 8. Success Metrics

### Primary Metrics
1. **Login Success Rate:** ≥ 95% of login attempts succeed (excluding intentional wrong credentials)
2. **Average Login Time:** ≤ 2 seconds from submit to dashboard load
3. **Session Persistence:** ≥ 90% of "Remember Me" sessions still active after 7 days
4. **Error Rate:** ≤ 5% of logins encounter technical errors (not credential errors)

### Secondary Metrics
1. **Failed Login Rate:** Track percentage of failed logins by error type
2. **Password Reset Requests:** ≤ 10% of login page visitors click "Forgot Password"
3. **Multi-Device Usage:** Track percentage of users logging in from multiple devices
4. **Session Duration:** Median session duration ≥ 15 minutes

### User Experience Metrics
1. **Login Abandonment:** ≤ 5% of users who start entering credentials abandon login
2. **Mobile Login Success:** Mobile login success rate within 5% of desktop
3. **Error Message Clarity:** ≤ 3% of failed logins result in support tickets
4. **Time to First Interaction:** ≤ 3 seconds from page load to user can type

### Security Metrics
1. **Brute Force Attempts:** Track and alert on IPs with ≥ 10 failed attempts in 1 hour
2. **Session Hijacking:** 0 reported incidents of unauthorized session access
3. **Password Exposure:** 0 passwords logged in any system
4. **HTTPS Compliance:** 100% of auth requests over TLS

## 9. Open Questions

### Critical (Must Resolve Before Development)
1. **Email Verification Requirement:** Should we block login for unverified emails?
   - Option A: Allow login, show banner prompting verification
   - Option B: Block login until email verified, show error + resend link
   - **Recommendation:** Option B (better security, prevents fake registrations)

2. **Session Duration:** What should the session timeout be?
   - Remember Me checked: 30 days (proposed)
   - Remember Me unchecked: 24 hours (proposed)
   - Need confirmation from security/compliance team

3. **Multi-Device Sessions:** Should we allow multiple active sessions per user?
   - Option A: Allow unlimited concurrent sessions
   - Option B: Limit to 3 devices, oldest session invalidated
   - Option C: Single session, new login invalidates previous
   - **Recommendation:** Option A for MVP (Supabase default behavior)

### Medium Priority (Can Resolve During Development)
4. **Password Visibility Toggle:** Should we include an icon to show/hide password?
   - **Recommendation:** Yes, improves UX (industry standard)

5. **Account Lockout:** After how many failed attempts should we lock the account?
   - Supabase default: Rate limit after 5 attempts per hour
   - Should we add additional lockout logic?
   - **Recommendation:** Use Supabase default for MVP

6. **Redirect After Timeout:** If session expires while user is active, where to redirect?
   - **Recommendation:** Redirect to login, show "Sessão expirada" toast, store current URL for post-login redirect

7. **Remember Device:** Should we remember the device separately from session?
   - Future feature: "Don't ask me again on this device"
   - **Recommendation:** Not for MVP

### Low Priority (Nice to Have)
8. **Login Page Branding:** Should we show recruitment metrics on login page?
   - Example: "500+ candidates hired in 2024"
   - **Recommendation:** Not for MVP, focus on functionality

9. **Login Animation:** Should we add animated transitions?
   - **Recommendation:** Subtle fade-in only, avoid distracting animations

10. **Social Proof:** Show testimonials from hired candidates on login page?
    - **Recommendation:** Not for MVP

---

## Acceptance Criteria Summary

**This feature is considered complete when:**

✅ A registered candidate can successfully log in with valid email/password
✅ Invalid credentials show user-friendly error message
✅ Successful login redirects to appropriate dashboard based on recruitment stage
✅ "Remember Me" checkbox persists session across browser restarts
✅ Session without "Remember Me" expires when browser closes
✅ Forgot Password link navigates to recovery flow (PRD-DEV-004)
✅ Create Account link navigates to registration (PRD-DEV-001)
✅ All authentication errors display user-friendly messages
✅ Protected routes redirect unauthenticated users to login
✅ Existing sessions are restored on page refresh
✅ Logout functionality clears session and redirects to login
✅ Form is fully keyboard accessible
✅ Page is responsive on mobile and desktop
✅ Loading states provide clear feedback during login process
✅ Rate limiting prevents brute force attacks
✅ No passwords or sensitive data logged to console/analytics
✅ Manual QA testing passes with 0 critical bugs
✅ Automated E2E test covers login success, failure, and session persistence

---

**Target Audience:** Junior Frontend Developer
**Estimated Effort:** 2-3 days
**Dependencies:**
- ✅ Supabase Auth configured
- ✅ Candidatos table with user_id FK
- ⏳ PRD-DEV-001 (Registration) must be complete to have users to log in
- ⏳ PRD-DEV-004 (Password Recovery) for "Forgot Password" link
**Blocker Status:** 🚨 CRITICAL - Required for all authenticated features
