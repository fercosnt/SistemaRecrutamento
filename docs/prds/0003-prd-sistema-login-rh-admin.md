# PRD-DEV-003: Sistema de Login RH/Admin

## 1. Introduction/Overview

The Sistema de Login RH/Admin enables HR professionals and system administrators to authenticate and access the administrative dashboard for managing candidates, viewing analytics, configuring system settings, and overseeing the recruitment process.

**Problem it solves:** Currently, there is no administrative interface to manage candidates, review test results, schedule interviews, or access recruitment analytics. HR staff need a secure authentication system separate from candidate authentication to access admin-only features with appropriate permission levels.

**Goal:** Implement a production-ready authentication system for HR and admin users that validates credentials, establishes role-based sessions, and provides access to administrative dashboards with appropriate permissions (RH básico, RH avançado, Admin).

## 2. Goals

1. Enable HR and admin users to log in using email and password
2. Validate credentials against Supabase Auth with role verification
3. Establish secure, role-based sessions that enforce permission levels
4. Redirect authenticated users to appropriate admin dashboard based on role
5. Provide "Remember Me" functionality for convenience
6. Display clear error messages for authentication and permission failures
7. Integrate with RLS policies to enforce admin-only data access
8. Support "Forgot Password" link to recovery flow
9. Track admin login events for security auditing and compliance
10. Prevent unauthorized access with multi-layer permission checks

## 3. User Stories

### Primary Flow
**As an** HR professional
**I want to** log in to the admin dashboard using my company email and password
**So that** I can manage candidates, review applications, and schedule interviews

**As a** system administrator
**I want to** log in with elevated admin privileges
**So that** I can configure system settings, manage HR users, and access all platform features

**As an** HR user
**I want to** see my permission level after login (básico vs avançado)
**So that** I understand which features I can access

### Secondary Flows
**As an** HR manager
**I want** my session to automatically expire after inactivity
**So that** unauthorized users cannot access the admin panel if I forget to log out

**As an** admin user
**I want** all login attempts (successful and failed) to be logged with timestamps
**So that** we can audit access to sensitive candidate data for compliance

**As an** HR user who forgot my password
**I want to** click a "Forgot Password" link and receive a recovery email
**So that** I can regain access to my account without contacting IT support

### Security & Compliance
**As a** system administrator
**I want** to see alerts when there are multiple failed login attempts for admin accounts
**So that** we can detect and prevent unauthorized access attempts

**As an** HR user
**I want** my account to be locked after repeated failed login attempts
**So that** brute force attacks are prevented

**As a** compliance officer
**I want** all admin logins to be logged with IP addresses and user agents
**So that** we can demonstrate LGPD compliance for accessing candidate personal data

## 4. Functional Requirements

### FR-001: Login Form Fields
The admin login form **must** include:
- **Email input:** Text field with email validation
- **Password input:** Password field (masked characters)
- **Remember Me checkbox:** Optional, default unchecked
- **Forgot Password link:** Navigates to admin password recovery
- **Login button:** Primary CTA, disabled until both fields are filled
- **Contact Support link:** Email/phone to IT support for access issues

### FR-002: Client-Side Validation
The system **must** validate inputs before submission:
- Email must be in valid format and belong to allowed domains
- Password must be at least 1 character (backend validates strength)
- Both fields are required
- Show inline error messages for validation failures
- Disable login button while validation errors exist

### FR-003: Authentication & Authorization Flow
The system **must** perform the following sequence:

1. **Collect Credentials:** Get email and password from form
2. **Call Supabase Auth:** Use `supabase.auth.signInWithPassword()`
3. **Handle Auth Response:**
   - **Success:** Receive user object + session token
   - **Failure:** Receive error object with error code
4. **Verify Admin Status:** Query `usuarios_rh` table to verify user exists and is active
5. **Check Role & Permissions:** Fetch user role (rh_basico, rh_avancado, admin)
6. **Validate Email Domain:** Ensure email belongs to `@beautysmile.com.br` or approved domains
7. **Log Login Event:** Insert record in `logs_acesso` table with timestamp, IP, user agent
8. **Store Session:** Save session token + role in Supabase client
9. **Update Global State:** Update auth store with user, role, and permissions
10. **Redirect:** Navigate to admin dashboard

**Pseudo-code:**
```typescript
// 1. Authenticate with Supabase
const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
  email: formData.email,
  password: formData.password,
})

if (authError) {
  handleAuthError(authError)
  logFailedAttempt(formData.email)
  return
}

// 2. Verify user is in usuarios_rh table (admin users only)
const { data: adminUser, error: adminError } = await supabase
  .from('usuarios_rh')
  .select('*, permissoes_rh(*)')
  .eq('user_id', authData.user.id)
  .eq('ativo', true)
  .eq('deleted_at', null)
  .single()

if (adminError || !adminUser) {
  showError('Você não tem permissão para acessar o painel administrativo.')
  await supabase.auth.signOut()
  logUnauthorizedAttempt(authData.user.email)
  return
}

// 3. Verify email domain (security layer)
const allowedDomains = ['beautysmile.com.br', 'beautysmile.com']
const emailDomain = authData.user.email.split('@')[1]
if (!allowedDomains.includes(emailDomain)) {
  showError('Domínio de email não autorizado.')
  await supabase.auth.signOut()
  return
}

// 4. Log successful login
await logLoginEvent({
  usuario_rh_id: adminUser.id,
  tipo_acesso: 'login',
  ip_address: await getClientIP(),
  user_agent: navigator.userAgent
})

// 5. Update global state with role and permissions
adminAuthStore.setState({
  user: authData.user,
  session: authData.session,
  adminUser: adminUser,
  role: adminUser.tipo_usuario, // 'rh_basico' | 'rh_avancado' | 'admin'
  permissions: adminUser.permissoes_rh,
  isAuthenticated: true,
  isAdmin: adminUser.tipo_usuario === 'admin'
})

// 6. Redirect to admin dashboard
navigate('/admin/dashboard')
```

### FR-004: Role-Based Access Control (RBAC)
The system **must** enforce the following permission levels:

| Role | Label | Permissions |
|------|-------|-------------|
| `rh_basico` | RH Básico | View candidates, view test results, schedule interviews, send basic communications |
| `rh_avancado` | RH Avançado | All básico permissions + edit candidate data, approve/reject candidates, configure email templates, access analytics |
| `admin` | Administrador | All permissions + manage HR users, configure system settings, access logs, manage vagas (jobs), delete data |

**Permission Matrix:**

| Feature | RH Básico | RH Avançado | Admin |
|---------|-----------|-------------|-------|
| View candidates | ✅ | ✅ | ✅ |
| Edit candidate data | ❌ | ✅ | ✅ |
| Approve/reject candidates | ❌ | ✅ | ✅ |
| Schedule interviews | ✅ | ✅ | ✅ |
| Access analytics | ❌ | ✅ | ✅ |
| Manage HR users | ❌ | ❌ | ✅ |
| Configure system settings | ❌ | ❌ | ✅ |
| Access audit logs | ❌ | ✅ | ✅ |
| Manage vagas (jobs) | ❌ | ✅ | ✅ |
| Delete data | ❌ | ❌ | ✅ |

### FR-005: Session Management
The system **must** handle sessions with enhanced security:

**Remember Me = Checked:**
- Session persistence: "local" (survives browser close)
- Session duration: 7 days (shorter than candidate sessions for security)
- Store session token in localStorage
- Auto-logout warning 5 minutes before expiration

**Remember Me = Unchecked:**
- Session persistence: "session" (cleared on browser close)
- Session duration: 8 hours (shorter for security)
- Store session token in sessionStorage
- Auto-logout warning 5 minutes before expiration

**Inactivity Timeout:**
- After 30 minutes of no activity, show warning modal: "Sua sessão expirará em 5 minutos por inatividade"
- User can click "Continuar conectado" to extend session
- If no action, auto-logout and redirect to login with message: "Sessão encerrada por inatividade"

### FR-006: Error Handling
The system **must** handle the following error scenarios:

| Error Code | Supabase Message | User-Friendly Message | Action |
|------------|------------------|----------------------|--------|
| `invalid_credentials` | "Invalid login credentials" | "Email ou senha incorretos. Verifique seus dados e tente novamente." | Show error + log attempt |
| `user_not_found` | "User not found" | "Credenciais inválidas ou conta não autorizada." | Show error + log attempt |
| `email_not_confirmed` | "Email not confirmed" | "Seu email ainda não foi verificado. Verifique sua caixa de entrada." | Show error + "Reenviar email" button |
| `too_many_requests` | "Too many requests" | "Muitas tentativas de login. Sua conta foi temporariamente bloqueada. Tente novamente em 1 hora." | Show error + contact support link |
| `user_banned` | "User is banned" | "Sua conta foi desativada. Entre em contato com o administrador do sistema." | Show error + IT contact |
| `insufficient_permissions` | Custom | "Você não tem permissão para acessar o painel administrativo. Contate o administrador." | Show error + sign out |
| Network error | Any network failure | "Erro de conexão. Verifique sua internet e tente novamente." | Show error + retry button |

**Additional Security Checks:**
- If user exists in Supabase Auth but NOT in `usuarios_rh`: Show "insufficient_permissions" error
- If user is in `usuarios_rh` but `ativo = false`: Show "user_banned" error
- If email domain is not whitelisted: Show "insufficient_permissions" error

### FR-007: Login Event Logging
The system **must** log all login attempts to `logs_acesso` table:

**Successful Login:**
```sql
INSERT INTO logs_acesso (
  usuario_rh_id,
  tipo_acesso,
  ip_address,
  user_agent,
  navegador,
  sistema_operacional,
  dispositivo,
  sucesso
) VALUES (
  :usuario_rh_id,
  'login',
  :ip_address,
  :user_agent,
  :navegador,      -- Parse from user agent
  :sistema_operacional,  -- Parse from user agent
  :dispositivo,    -- Parse from user agent
  true
)
```

**Failed Login:**
```sql
INSERT INTO logs_acesso (
  email_tentativa,  -- Store email even if user doesn't exist
  tipo_acesso,
  ip_address,
  user_agent,
  navegador,
  sistema_operacional,
  dispositivo,
  sucesso,
  motivo_falha
) VALUES (
  :email,
  'login_falho',
  :ip_address,
  :user_agent,
  :navegador,
  :sistema_operacional,
  :dispositivo,
  false,
  :error_message
)
```

**Security Alert Triggers:**
- 5 failed attempts for same email in 30 minutes → Send alert email to security team
- 10 failed attempts from same IP in 1 hour → Block IP temporarily
- Login from new country/region → Send notification email to user

### FR-008: Protected Admin Routes
The system **must** protect all admin routes:

**Authentication Check:**
- All routes under `/admin/*` require authentication
- Unauthenticated requests redirect to `/admin/login`

**Authorization Check (Role-Based):**
- `/admin/dashboard` - All roles (rh_basico, rh_avancado, admin)
- `/admin/candidatos` - All roles
- `/admin/candidatos/:id/edit` - rh_avancado, admin only
- `/admin/analytics` - rh_avancado, admin only
- `/admin/usuarios` - admin only
- `/admin/settings` - admin only
- `/admin/logs` - rh_avancado, admin only

**Implementation:**
```typescript
// ProtectedAdminRoute.tsx
export function ProtectedAdminRoute({
  children,
  requiredRole
}: {
  children: React.ReactNode
  requiredRole?: 'rh_basico' | 'rh_avancado' | 'admin'
}) {
  const { isAuthenticated, role, isLoading } = useAdminAuthStore()

  if (isLoading) return <LoadingSpinner />

  if (!isAuthenticated) {
    return <Navigate to="/admin/login" replace />
  }

  // Check role hierarchy: admin > rh_avancado > rh_basico
  if (requiredRole) {
    const roleHierarchy = { admin: 3, rh_avancado: 2, rh_basico: 1 }
    if (roleHierarchy[role] < roleHierarchy[requiredRole]) {
      return <Navigate to="/admin/unauthorized" replace />
    }
  }

  return <>{children}</>
}
```

### FR-009: Logout Functionality
The system **must** provide logout capability:
- **Logout button** in admin navigation header
- Clicking logout:
  1. Confirm with modal: "Deseja realmente sair?"
  2. Log logout event to `logs_acesso`
  3. Call `supabase.auth.signOut()`
  4. Clear global admin auth state
  5. Redirect to `/admin/login`
  6. Show success toast: "Logout realizado com sucesso"

### FR-010: Multi-Tab Sync
The system **must** sync auth state across browser tabs:
- If user logs out in Tab A, all other tabs detect and redirect to login
- If session expires in Tab A, all tabs show expiration warning
- Use Supabase `onAuthStateChange` listener + BroadcastChannel API

## 5. Non-Goals (Out of Scope)

The following are **NOT** part of this PRD:

1. **Self-service HR account creation** - Admin must create HR accounts manually
2. **Password strength requirements UI** - Supabase handles password validation
3. **Two-factor authentication (2FA)** - Future security enhancement
4. **Single Sign-On (SSO)** with Google Workspace - Future enterprise feature
5. **Granular permission customization** - Fixed 3-tier role system for MVP
6. **IP whitelisting** - Future security feature
7. **Biometric authentication** - Future mobile feature
8. **Login with CPF** - Email only for admin users
9. **Session transfer between devices** - Each device requires separate login
10. **Custom session duration per user** - Fixed durations for all users

## 6. Design Considerations

### UI/UX Requirements
- **Page:** New admin login page at `/admin/login` (separate from candidate login)
- **Form Layout:** Centered card layout with Beauty Smile admin logo
- **Component Library:** shadcn/ui components (Input, Checkbox, Button, Alert)
- **Styling:** Admin theme (different color scheme from candidate interface)
- **Branding:** Clearly labeled "Painel Administrativo Beauty Smile"
- **Accessibility:**
  - WCAG 2.1 AA compliance
  - All inputs have proper labels
  - Error messages announced to screen readers
  - Keyboard navigation fully supported

### Visual Design
- **Admin Branding:** Distinct from candidate interface (darker theme, professional)
- **Logo:** Beauty Smile logo with "Administração" subtitle
- **Background:** Professional gradient (navy blue to teal)
- **Form Card:** White card with shadow, centered on page
- **Error Messages:** Red alert banner above form
- **Security Badge:** Small badge showing "Acesso Seguro" with SSL icon

### Loading States
- **Button:** Spinner + "Autenticando..." text during submission
- **Full Page:** Loading overlay with "Verificando permissões..." during role check
- **Redirect:** "Redirecionando para o painel..." before navigation

## 7. Technical Considerations

### Frontend Stack
- **Framework:** React 18.3.1 with TypeScript
- **State Management:** Zustand for admin auth state (separate from candidate auth)
- **Form Handling:** React Hook Form + Zod
- **Routing:** React Router with admin-specific protected routes
- **API Client:** Supabase JS SDK v2

### Backend Integration
- **Auth Provider:** Supabase Auth
- **Database Tables:**
  - `usuarios_rh` - HR user profiles and roles
  - `permissoes_rh` - Detailed permissions per user (if custom)
  - `logs_acesso` - Login event logging
- **RLS Policies:**
  - `usuarios_rh_select_self` - Users can view their own record
  - `usuarios_rh_admin_all` - Admins can view all HR users
  - `logs_acesso_admin_only` - Only admins can query access logs

### API Calls
```typescript
// 1. Authenticate
const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
  email: formData.email,
  password: formData.password,
})

// 2. Verify admin status and fetch role
const { data: adminUser, error: adminError } = await supabase
  .from('usuarios_rh')
  .select('*, permissoes_rh(*)')
  .eq('user_id', authData.user.id)
  .eq('ativo', true)
  .single()

// 3. Log login event
const { error: logError } = await supabase
  .from('logs_acesso')
  .insert([{
    usuario_rh_id: adminUser.id,
    tipo_acesso: 'login',
    ip_address: clientIP,
    user_agent: navigator.userAgent,
    navegador: parseBrowser(navigator.userAgent),
    sistema_operacional: parseOS(navigator.userAgent),
    dispositivo: parseDevice(navigator.userAgent),
    sucesso: true
  }])
```

### Admin Auth Store Structure
```typescript
interface AdminAuthState {
  user: User | null
  session: Session | null
  adminUser: UsuarioRH | null
  role: 'rh_basico' | 'rh_avancado' | 'admin' | null
  permissions: PermissoesRH | null
  isAuthenticated: boolean
  isAdmin: boolean
  isLoading: boolean

  // Actions
  setAdminUser: (user: UsuarioRH) => void
  clearAdminUser: () => void
  logout: () => Promise<void>
  hasPermission: (permission: string) => boolean
}
```

### Permission Check Helper
```typescript
// usePermission.ts hook
export function usePermission(permission: string): boolean {
  const { role, permissions } = useAdminAuthStore()

  // Admin has all permissions
  if (role === 'admin') return true

  // Check specific permission in permissions object
  return permissions?.[permission] === true
}

// Usage in components
const canEditCandidates = usePermission('edit_candidates')
if (!canEditCandidates) {
  return <div>Você não tem permissão para editar candidatos</div>
}
```

### Client IP Detection
```typescript
// Use external API to get client IP (Supabase doesn't expose it directly)
async function getClientIP(): Promise<string> {
  try {
    const response = await fetch('https://api.ipify.org?format=json')
    const data = await response.json()
    return data.ip
  } catch {
    return 'unknown'
  }
}
```

### Security Headers
Ensure the following headers are set in hosting (Vercel/Netlify):
```
Content-Security-Policy: default-src 'self'; script-src 'self' 'unsafe-inline'
X-Frame-Options: DENY
X-Content-Type-Options: nosniff
Referrer-Policy: strict-origin-when-cross-origin
Permissions-Policy: geolocation=(), microphone=(), camera=()
```

## 8. Success Metrics

### Primary Metrics
1. **Login Success Rate:** ≥ 98% of valid admin logins succeed
2. **Average Login Time:** ≤ 2 seconds from submit to dashboard
3. **Unauthorized Access Attempts:** 0 successful unauthorized logins
4. **Session Persistence:** ≥ 95% of "Remember Me" sessions remain active for 7 days

### Secondary Metrics
1. **Failed Login Rate:** ≤ 2% of login attempts fail due to technical errors (excluding wrong credentials)
2. **Inactivity Timeout Effectiveness:** ≥ 80% of inactive sessions auto-logout
3. **Multi-Tab Sync:** 100% of logout events sync across open tabs within 1 second
4. **Role Assignment Accuracy:** 100% of users have correct role assigned

### Security Metrics
1. **Brute Force Prevention:** 100% of IPs with ≥ 10 failed attempts blocked
2. **Audit Log Completeness:** 100% of login events logged with IP and timestamp
3. **Unauthorized Domain Attempts:** 0 logins from non-whitelisted email domains
4. **Session Hijacking:** 0 reported incidents

### Compliance Metrics
1. **LGPD Audit Trail:** 100% of admin access to candidate data logged
2. **Data Access Tracking:** All admin actions on sensitive data logged with user ID
3. **Log Retention:** Logs retained for minimum 2 years for compliance

## 9. Open Questions

### Critical (Must Resolve Before Development)
1. **HR User Creation Process:** How are new HR users created?
   - Option A: Admin manually creates accounts via admin panel
   - Option B: Invite system (send email with signup link)
   - **Recommendation:** Option A for MVP (admins create via Supabase dashboard), Option B for post-MVP

2. **Email Domain Whitelist:** What domains are allowed for admin users?
   - Proposed: `beautysmile.com.br`, `beautysmile.com`
   - Should we allow external consultants with different domains?
   - **Recommendation:** Hardcode domains for MVP, add whitelist config later

3. **Default Role for New HR Users:** What role should be assigned by default?
   - **Recommendation:** `rh_basico` (least privilege principle)

4. **Session Timeout Duration:** Confirm session durations:
   - Remember Me: 7 days (proposed)
   - No Remember Me: 8 hours (proposed)
   - Inactivity timeout: 30 minutes (proposed)
   - Need security team approval

### Medium Priority (Can Resolve During Development)
5. **Password Complexity:** Should we enforce specific password requirements?
   - Supabase default: Minimum 6 characters
   - Should we require uppercase, lowercase, numbers, symbols?
   - **Recommendation:** Use Supabase default for MVP

6. **Login Notification Emails:** Should we send emails on successful login from new device/location?
   - **Recommendation:** Yes for security, implement post-MVP

7. **Account Lockout Duration:** After failed attempts, how long should account be locked?
   - **Recommendation:** 1 hour (Supabase rate limit handles this)

8. **Multi-Device Policy:** Should we limit concurrent sessions per admin user?
   - **Recommendation:** Allow unlimited for MVP (Supabase default)

### Low Priority (Nice to Have)
9. **Login Page Branding:** Should we show HR team photos or company values on login page?
   - **Recommendation:** Not for MVP

10. **Session Activity Monitoring:** Should we show "Active Sessions" in user profile?
    - Example: "You are logged in on 3 devices: Chrome (Windows), Safari (iPhone), Firefox (Mac)"
    - **Recommendation:** Post-MVP feature

---

## Acceptance Criteria Summary

**This feature is considered complete when:**

✅ An HR user can successfully log in with valid email/password
✅ User role (rh_basico, rh_avancado, admin) is correctly identified and stored
✅ Invalid credentials show user-friendly error message
✅ Users not in `usuarios_rh` table are blocked with "insufficient permissions" error
✅ Email domain whitelist blocks non-authorized domains
✅ Successful login redirects to `/admin/dashboard`
✅ All login attempts (success and failure) are logged to `logs_acesso`
✅ Session management works with "Remember Me" (7 days) and without (8 hours)
✅ Inactivity timeout (30 minutes) auto-logs out idle users
✅ Protected routes enforce authentication and role-based permissions
✅ Logout clears session and redirects to admin login
✅ Multi-tab sync ensures logout in one tab affects all tabs
✅ Page is responsive and accessible (WCAG 2.1 AA)
✅ Form is fully keyboard navigable
✅ All error scenarios display user-friendly messages
✅ No passwords or session tokens logged to console
✅ Security alerts trigger for suspicious login patterns
✅ Manual QA testing passes with 0 critical bugs
✅ Automated E2E tests cover login, logout, session persistence, and role checks

---

**Target Audience:** Junior Frontend Developer
**Estimated Effort:** 3-4 days
**Dependencies:**
- ✅ Supabase Auth configured
- ✅ usuarios_rh table with role and permissions
- ✅ logs_acesso table for audit logging
- ⏳ PRD-DEV-004 (Password Recovery) for "Forgot Password" link
**Blocker Status:** 🚨 CRITICAL - Required for all HR/admin features (candidate management, analytics, system configuration)
