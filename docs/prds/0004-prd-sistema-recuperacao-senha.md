# PRD-DEV-004: Sistema de Recuperação de Senha

## 1. Introduction/Overview

The Sistema de Recuperação de Senha enables both candidates and HR/admin users to reset their passwords when they forget their credentials or want to change them for security reasons. This feature uses Supabase Auth's built-in password recovery flow with email verification.

**Problem it solves:** Users who forget their passwords currently have no way to regain access to their accounts. Without a password recovery system, support teams must manually reset passwords, creating security risks and poor user experience.

**Goal:** Implement a secure, self-service password recovery system that allows users to reset passwords via email verification links, supports both candidate and admin users, and meets security best practices for password management.

## 2. Goals

1. Enable users to initiate password reset via email address
2. Send secure, time-limited password reset links via email
3. Validate reset tokens and prevent token reuse
4. Allow users to set new passwords meeting security requirements
5. Confirm password changes with success messages and email notifications
6. Support both candidate and HR/admin users with appropriate branding
7. Prevent abuse with rate limiting (max 3 reset requests per hour)
8. Log all password reset events for security auditing
9. Provide clear error messages for invalid/expired tokens
10. Ensure seamless redirect to login after successful password reset

## 3. User Stories

### Primary Flow
**As a** candidate or HR user
**I want to** request a password reset by entering my email address
**So that** I can receive a secure link to create a new password

**As a** user who requested a password reset
**I want to** receive an email with a password reset link within 5 minutes
**So that** I can quickly regain access to my account

**As a** user clicking a password reset link
**I want to** be taken to a secure page where I can enter a new password
**So that** I can set a password I'll remember

### Secondary Flows
**As a** user who successfully reset my password
**I want to** receive a confirmation email about the password change
**So that** I'm alerted if someone else changed my password without authorization

**As a** security-conscious user
**I want** the password reset link to expire after 1 hour
**So that** an old link cannot be used if someone gains access to my email later

**As a** user who requested multiple password resets
**I want** only the most recent reset link to work
**So that** old links are automatically invalidated for security

### Security & Edge Cases
**As a** user who enters an email that doesn't exist in the system
**I want** the system to NOT reveal whether the account exists
**So that** attackers cannot enumerate valid email addresses

**As a** malicious user attempting to spam password resets
**I want** the system to rate-limit my requests
**So that** I cannot abuse the password reset system

**As a** user who received a password reset email by mistake
**I want** to be able to ignore it safely
**So that** my account remains secure if I didn't request the reset

## 4. Functional Requirements

### FR-001: Password Reset Request Page
The system **must** provide a password reset request page accessible from both candidate and admin login pages:

**URL Routes:**
- Candidate: `/recuperar-senha`
- Admin: `/admin/recuperar-senha`

**Form Fields:**
- Email address (required, validated format)
- Submit button: "Enviar link de recuperação"
- Back to login link

**Branding:**
- Candidate page: Uses candidate theme
- Admin page: Uses admin theme with "Painel Administrativo" branding

### FR-002: Email Validation & Submission
The system **must** validate and process password reset requests:

**Client-Side Validation:**
- Email must be in valid format
- Email field is required
- Show inline error if email format is invalid

**Submission Process:**
1. Validate email format
2. Show loading state on button ("Enviando...")
3. Call Supabase `resetPasswordForEmail()`
4. Always show success message (even if email doesn't exist - security)
5. Log the request attempt (with anonymized email for non-existent accounts)

**Success Message (Generic):**
"Se existe uma conta com este email, você receberá um link de recuperação de senha em alguns minutos. Verifique sua caixa de entrada e pasta de spam."

**Rate Limiting:**
- Max 3 requests per email per hour
- If exceeded, show: "Você já solicitou a recuperação de senha recentemente. Aguarde alguns minutos antes de tentar novamente."

### FR-003: Password Reset Email
The system **must** send password reset emails using Supabase email templates:

**Email Template (Candidates):**
- Template name: `candidato-recuperacao-senha`
- Subject: "Recuperação de senha - Beauty Smile Recrutamento"
- From: `noreply@beautysmile.com.br`
- Content:
  ```
  Olá [nome_completo ou 'Candidato'],

  Recebemos uma solicitação para redefinir a senha da sua conta Beauty Smile.

  Clique no link abaixo para criar uma nova senha:
  [RESET_LINK]

  Este link expira em 1 hora.

  Se você não solicitou esta redefinição, ignore este email. Sua senha permanecerá inalterada.

  Atenciosamente,
  Equipe Beauty Smile
  ```

**Email Template (HR/Admin):**
- Template name: `admin-recuperacao-senha`
- Subject: "Recuperação de senha - Painel Administrativo Beauty Smile"
- Content: Similar to candidate template but with admin branding

**Reset Link Format:**
```
https://[APP_URL]/auth/reset-password?token=[RESET_TOKEN]&type=recovery
```

**Email Delivery:**
- Must be sent within 5 minutes of request
- Use Supabase SMTP configuration
- Track delivery status (sent, failed)
- Retry failed emails up to 3 times

### FR-004: Password Reset Page
The system **must** provide a password reset page that handles the token:

**URL:** `/auth/reset-password` (shared by candidates and admin)
**Query Parameters:**
- `token`: Reset token from email link (required)
- `type`: Must be "recovery" (validated)

**Form Fields:**
- New password (required, type="password")
- Confirm password (required, type="password")
- Show/hide password toggle (eye icon)
- Submit button: "Redefinir senha"

**Client-Side Validation:**
- New password must be at least 8 characters
- Passwords must match
- Show password strength indicator (weak, medium, strong)
- Display validation errors inline

**Password Strength Indicator:**
- Weak: 8-11 characters, no complexity
- Medium: 12-15 characters OR 8+ chars with uppercase + lowercase + numbers
- Strong: 16+ characters with uppercase + lowercase + numbers + symbols

### FR-005: Password Reset Submission
The system **must** process password resets as follows:

**Validation:**
1. Verify token is present and valid format
2. Verify passwords match
3. Verify new password meets minimum requirements (8 characters)
4. Check password is not in common password list (optional, post-MVP)

**Submission Process:**
```typescript
const { data, error } = await supabase.auth.updateUser({
  password: newPassword
})

if (error) {
  if (error.message.includes('token')) {
    showError('Link de recuperação inválido ou expirado. Solicite um novo link.')
  } else {
    showError('Erro ao redefinir senha. Tente novamente.')
  }
  return
}

// Success: Log event and redirect
await logPasswordReset(data.user.id)
showSuccess('Senha redefinida com sucesso! Redirecionando para login...')
setTimeout(() => navigate('/login'), 3000)
```

**Success Actions:**
1. Update password in Supabase Auth
2. Invalidate all existing sessions (force re-login)
3. Log password reset event to `logs_acesso` or security log
4. Send confirmation email (see FR-006)
5. Show success message
6. Redirect to appropriate login page after 3 seconds

### FR-006: Password Change Confirmation Email
The system **must** send a confirmation email after password reset:

**Email Template:**
- Template name: `confirmacao-alteracao-senha`
- Subject: "Sua senha foi alterada - Beauty Smile"
- Content:
  ```
  Olá [nome_completo],

  Sua senha foi alterada com sucesso em [DATA_HORA].

  Dispositivo: [DISPOSITIVO]
  Localização aproximada: [IP_ADDRESS]

  Se você não realizou esta alteração, entre em contato imediatamente com nossa equipe de suporte.

  Atenciosamente,
  Equipe Beauty Smile
  ```

**Trigger:** Automatically sent after successful password reset via Supabase trigger or application code

### FR-007: Error Handling
The system **must** handle errors gracefully:

| Error Scenario | Error Message | Action |
|----------------|---------------|--------|
| Invalid/expired token | "Link de recuperação inválido ou expirado. Solicite um novo link de recuperação." | Show error + link to request page |
| Token already used | "Este link de recuperação já foi utilizado. Solicite um novo link se necessário." | Show error + link to request page |
| Passwords don't match | "As senhas não coincidem. Verifique e tente novamente." | Highlight confirm password field |
| Password too weak | "Senha muito fraca. Use pelo menos 8 caracteres." | Show requirements below field |
| Network error | "Erro de conexão. Verifique sua internet e tente novamente." | Show error + retry button |
| Rate limit exceeded | "Muitas tentativas. Aguarde alguns minutos antes de tentar novamente." | Show error with countdown |
| Email not found | (Generic message) "Se existe uma conta com este email, você receberá um link..." | Don't reveal if email exists |

### FR-008: Security Logging
The system **must** log password reset events for security auditing:

**Log Password Reset Request:**
```typescript
await supabase.from('logs_acesso').insert({
  email_tentativa: email, // Anonymize if user doesn't exist
  tipo_acesso: 'password_reset_request',
  ip_address: clientIP,
  user_agent: navigator.userAgent,
  sucesso: true,
  timestamp: new Date()
})
```

**Log Successful Password Reset:**
```typescript
await supabase.from('logs_acesso').insert({
  usuario_id: user.id, // For candidates: candidato.user_id
  usuario_rh_id: adminUser?.id, // For HR: usuarios_rh.id
  tipo_acesso: 'password_reset_completed',
  ip_address: clientIP,
  user_agent: navigator.userAgent,
  dispositivo: parseDevice(navigator.userAgent),
  sucesso: true,
  timestamp: new Date()
})
```

**Security Alerts:**
- If 5+ reset requests from same IP in 1 hour → Alert security team
- If password changed from unusual location → Send warning email to user
- If multiple failed token validations → Log potential attack

### FR-009: Token Expiration
The system **must** enforce token expiration:
- **Token validity:** 1 hour from request time
- **Token reuse:** Single-use only (invalidated after password change)
- **Token invalidation:** All previous tokens invalidated when new request made
- **Expired token message:** "Link expirado. Solicite um novo link de recuperação."

### FR-010: User Differentiation
The system **must** handle both candidate and admin users:

**After successful password reset:**
- If user is in `candidatos` table → Redirect to `/login` (candidate login)
- If user is in `usuarios_rh` table → Redirect to `/admin/login` (admin login)
- If user is in both (shouldn't happen) → Redirect based on email domain

**Implementation:**
```typescript
// After successful password reset
const { data: candidato } = await supabase
  .from('candidatos')
  .select('id')
  .eq('user_id', user.id)
  .single()

const { data: adminUser } = await supabase
  .from('usuarios_rh')
  .select('id')
  .eq('user_id', user.id)
  .single()

if (adminUser) {
  navigate('/admin/login')
} else if (candidato) {
  navigate('/login')
} else {
  // Edge case: user exists in Auth but not in either table
  navigate('/login') // Default to candidate login
}
```

## 5. Non-Goals (Out of Scope)

The following are **NOT** part of this PRD:

1. **Account recovery via SMS** - Email-only for MVP
2. **Security questions** - Not using security questions (less secure than email verification)
3. **Password expiration policy** - No forced password changes every N days
4. **Password history** - No requirement to not reuse last N passwords
5. **Admin-initiated password resets** - Admins cannot reset user passwords manually (Supabase limitation)
6. **Custom password complexity rules** - Using Supabase defaults (min 8 chars)
7. **Password strength meter libraries** - Using simple built-in strength check
8. **Magic link authentication** - Separate feature, not password reset
9. **Account lockout after failed resets** - No lockout for failed password change attempts
10. **Multi-factor recovery** - No MFA for MVP

## 6. Design Considerations

### UI/UX Requirements

**Request Password Reset Page:**
- Minimal, focused design
- Clear heading: "Recuperar senha" (candidates) or "Recuperar senha - Painel Admin" (admin)
- Single email input field
- Large, prominent submit button
- Link back to login page
- Help text: "Digite o email cadastrado e enviaremos um link para redefinir sua senha"

**Reset Password Page:**
- Clean, secure-looking design
- Heading: "Criar nova senha"
- Two password input fields (new password, confirm password)
- Password strength indicator (visual bar: red = weak, yellow = medium, green = strong)
- Password requirements list:
  - ✅ Mínimo 8 caracteres
  - ✅ Letras maiúsculas e minúsculas (recommended)
  - ✅ Números (recommended)
  - ✅ Caracteres especiais (recommended)
- Show/hide password toggle icons
- Submit button: "Redefinir senha"

**Success Page:**
- Large success icon (green checkmark)
- Message: "Senha redefinida com sucesso!"
- Auto-redirect countdown: "Redirecionando para login em 3 segundos..."
- Manual link: "Clique aqui para fazer login agora"

### Visual Design
- **Candidate Pages:** Use Beauty Smile candidate brand colors
- **Admin Pages:** Use admin theme (darker, professional)
- **Email Design:** Responsive HTML emails with Beauty Smile branding
- **Accessibility:** WCAG 2.1 AA compliant

### Form Behavior
- **Auto-focus:** Email field on request page, new password field on reset page
- **Enter key:** Submit form
- **Real-time validation:** Show password strength as user types
- **Error persistence:** Errors clear when user starts typing
- **Password reveal:** Toggle icon in input field

## 7. Technical Considerations

### Frontend Stack
- **Framework:** React 18.3.1 with TypeScript
- **Form Handling:** React Hook Form + Zod
- **Routing:** React Router
- **API Client:** Supabase JS SDK v2
- **Password Strength:** zxcvbn library (optional) or custom regex-based check

### Backend Integration
- **Auth Provider:** Supabase Auth
- **Email Service:** Supabase Auth emails (uses project's SMTP or Supabase default)
- **Database Logging:** `logs_acesso` table for security events

### API Calls

**Request Password Reset:**
```typescript
const { data, error } = await supabase.auth.resetPasswordForEmail(email, {
  redirectTo: `${window.location.origin}/auth/reset-password`,
})

if (error) {
  console.error('Reset request error:', error)
  // Still show generic success message for security
}

// Always show success message (don't reveal if email exists)
showSuccess('Se existe uma conta com este email, você receberá um link...')
```

**Update Password:**
```typescript
const { data, error } = await supabase.auth.updateUser({
  password: newPassword
})

if (error) {
  if (error.message.includes('session') || error.message.includes('token')) {
    showError('Link inválido ou expirado. Solicite um novo link.')
  } else {
    showError('Erro ao redefinir senha. Tente novamente.')
  }
  return
}

// Success
showSuccess('Senha alterada com sucesso!')
await logPasswordReset(data.user.id)
navigate('/login')
```

### Environment Variables
- `VITE_SUPABASE_URL`: Supabase project URL
- `VITE_SUPABASE_ANON_KEY`: Supabase anonymous key
- `VITE_APP_URL`: Application base URL (for email redirect links)

### Email Templates
Supabase email templates must be configured in Supabase Dashboard:
1. Go to Authentication → Email Templates
2. Update "Reset Password" template
3. Customize HTML with Beauty Smile branding
4. Set email sender name: "Beauty Smile Recrutamento"
5. Set reply-to email: `noreply@beautysmile.com.br`

**Template Variables Available:**
- `{{ .ConfirmationURL }}` - Reset password link
- `{{ .Token }}` - Reset token (if building custom link)
- `{{ .Email }}` - User's email address

### Security Headers
- Ensure reset password page is served over HTTPS only
- Add CSP headers to prevent XSS
- Include HSTS headers for transport security

### Rate Limiting
Implement client-side rate limiting:
```typescript
const resetAttempts = JSON.parse(localStorage.getItem('resetAttempts') || '{}')
const lastAttempt = resetAttempts[email]

if (lastAttempt && Date.now() - lastAttempt < 3600000) { // 1 hour
  const attemptsCount = resetAttempts[`${email}_count`] || 0
  if (attemptsCount >= 3) {
    showError('Muitas tentativas. Aguarde 1 hora.')
    return
  }
}

// Track attempt
resetAttempts[email] = Date.now()
resetAttempts[`${email}_count`] = (resetAttempts[`${email}_count`] || 0) + 1
localStorage.setItem('resetAttempts', JSON.stringify(resetAttempts))
```

Note: Supabase also has server-side rate limiting, but client-side prevents unnecessary requests.

## 8. Success Metrics

### Primary Metrics
1. **Reset Success Rate:** ≥ 90% of password reset requests result in successful password change
2. **Email Delivery Rate:** ≥ 98% of reset emails delivered within 5 minutes
3. **Token Expiration Rate:** ≤ 10% of tokens expire before use
4. **Time to Reset:** Median time from request to password change ≤ 5 minutes

### Secondary Metrics
1. **Abandonment Rate:** ≤ 20% of users abandon after receiving reset email
2. **Invalid Token Rate:** ≤ 5% of reset attempts use invalid/expired tokens
3. **Password Strength:** ≥ 70% of new passwords rated "medium" or "strong"
4. **Support Ticket Reduction:** ≤ 2% of password resets result in support contact

### Security Metrics
1. **Abuse Detection:** 100% of suspicious reset patterns flagged and logged
2. **Rate Limit Effectiveness:** 0 successful abuse attempts bypassing rate limits
3. **Token Reuse Attempts:** 0 successful token reuse (all blocked)
4. **Confirmation Email Delivery:** 100% of successful resets trigger confirmation email

### User Experience Metrics
1. **Error Clarity:** ≤ 5% of users retry with same invalid token (indicates clear error messaging)
2. **Mobile Completion:** Mobile password reset completion within 10% of desktop
3. **Time on Reset Page:** Median ≤ 30 seconds (quick, clear process)

## 9. Open Questions

### Critical (Must Resolve Before Development)
1. **Email Delivery Provider:** Is Supabase default email service sufficient or should we use custom SMTP?
   - Supabase default: Limited to 3 emails/hour in free tier
   - Custom SMTP (SendGrid, AWS SES): Higher limits, better deliverability
   - **Recommendation:** Use custom SMTP for production (configure in Supabase settings)

2. **Password Requirements:** Should we enforce stricter password requirements?
   - Current: Minimum 8 characters (Supabase default)
   - Proposed: 12 characters minimum + complexity rules?
   - **Recommendation:** Keep 8 chars minimum for MVP, recommend 12+ with strength indicator

3. **Session Invalidation:** Should password reset invalidate ALL existing sessions?
   - Option A: Yes, force re-login on all devices (more secure)
   - Option B: No, only require re-login on device where password changed
   - **Recommendation:** Option A (Supabase default behavior)

### Medium Priority (Can Resolve During Development)
4. **Reset Link Expiration:** Confirm 1 hour is acceptable?
   - Alternative: 30 minutes (more secure) or 24 hours (more convenient)
   - **Recommendation:** 1 hour (balance security and UX)

5. **Email Branding:** Should candidate and admin reset emails look different?
   - **Recommendation:** Yes, use different templates for clear differentiation

6. **Password Strength Library:** Use zxcvbn or custom regex?
   - zxcvbn: More accurate, larger bundle size (~800KB)
   - Custom: Lighter, less accurate
   - **Recommendation:** Custom regex for MVP (lightweight)

7. **Redirect After Reset:** Should we auto-redirect to login or require manual click?
   - **Recommendation:** Auto-redirect after 3 seconds + manual link for immediate access

### Low Priority (Nice to Have)
8. **Password History:** Should we prevent reusing the last password?
   - **Recommendation:** Not for MVP (requires storing password hashes)

9. **Reset Analytics:** Should we track which users reset passwords most frequently?
   - **Recommendation:** Yes, add to analytics dashboard post-MVP

10. **Custom Error Pages:** Should expired tokens show a custom branded page?
    - **Recommendation:** Yes, but can use generic error page for MVP

---

## Acceptance Criteria Summary

**This feature is considered complete when:**

✅ A user can request password reset by entering their email
✅ Password reset request shows success message (generic, doesn't reveal if email exists)
✅ Password reset email is sent within 5 minutes with valid reset link
✅ Reset link expires after 1 hour
✅ Clicking reset link opens password reset page with token in URL
✅ User can enter new password and confirm password on reset page
✅ Password strength indicator shows weak/medium/strong rating in real-time
✅ Validation ensures passwords match and meet minimum requirements
✅ Invalid/expired tokens show clear error message with link to request new reset
✅ Successful password reset logs event to security log
✅ Confirmation email is sent after successful password change
✅ All existing sessions are invalidated after password reset
✅ User is redirected to appropriate login page (candidate or admin) after 3 seconds
✅ Rate limiting prevents abuse (max 3 requests per email per hour)
✅ Both candidate and admin users can use password reset
✅ All error scenarios display user-friendly messages
✅ Page is responsive and accessible (WCAG 2.1 AA)
✅ Form is fully keyboard navigable
✅ No sensitive data logged to console or analytics
✅ Manual QA testing passes with 0 critical bugs
✅ Automated E2E tests cover request, reset, and error scenarios

---

**Target Audience:** Junior Frontend Developer
**Estimated Effort:** 2-3 days
**Dependencies:**
- ✅ Supabase Auth configured with email templates
- ✅ SMTP service configured (Supabase default or custom)
- ✅ Email templates created and branded
- ⏳ PRD-DEV-001 (Registration) for candidate user creation
- ⏳ PRD-DEV-002 (Candidate Login) for redirect after reset
- ⏳ PRD-DEV-003 (Admin Login) for redirect after admin reset
**Blocker Status:** 🟡 HIGH PRIORITY - Required for user account recovery, blocks user adoption
