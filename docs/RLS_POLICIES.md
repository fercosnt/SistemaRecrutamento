# Row Level Security (RLS) Policies - Complete Guide
**Last Updated:** 2025-11-13
**Total Policies:** 103 across 34 tables

---

## Overview

**Row Level Security (RLS)** is PostgreSQL's built-in security feature that filters database rows based on the current user's permissions. Every query automatically applies RLS policies, making it impossible for users to access unauthorized data.

### Key Benefits
✅ **Automatic enforcement** - No need to manually filter by user_id
✅ **Database-level security** - Cannot be bypassed by frontend
✅ **Centralized access control** - All rules in one place
✅ **Type-safe** - Enforced before queries execute

---

## User Roles

### 1. Anonymous (anon)
- **Not authenticated**
- Can view: Public job listings, form questions
- Can create: Duplicate checks for signup
- **Limited access** - read-only on public data

### 2. Authenticated Candidate (authenticated + candidatos)
- **Authenticated user** with candidato record
- Can view: Own profile, own applications, own test results
- Can create: Applications, test answers, form responses
- Can update: Own profile, draft applications
- **Self-access only** - cannot see other candidates

### 3. RH User (authenticated + usuarios_rh)
- **HR/Recruiter** role
- Can view: All candidates, all applications, all test results
- Can create: Jobs, interviews, evaluations
- Can update: Application status, evaluations, interviews
- **Full read access** to candidate data

### 4. Admin (authenticated + usuarios_rh with role='administrador')
- **Administrator** role
- Can do: Everything RH can + manage RH users
- Can create: RH users, system configurations
- Can update: System settings, webhooks, email templates
- **Full system access**

---

## Policy Patterns

### Pattern 1: Self-Access (Candidates)
```sql
-- Example: Candidates can read their own profile
USING (
  EXISTS (
    SELECT 1 FROM candidatos
    WHERE candidatos.id = table.candidato_id
      AND candidatos.user_id = auth.uid()
      AND candidatos.deleted_at IS NULL
  )
)
```

### Pattern 2: RH/Admin Access
```sql
-- Example: RH can read all records
USING (
  EXISTS (
    SELECT 1 FROM usuarios_rh
    WHERE usuarios_rh.user_id = auth.uid()
      AND usuarios_rh.ativo = true
      AND usuarios_rh.deleted_at IS NULL
  )
)
```

### Pattern 3: Admin-Only Access
```sql
-- Example: Only admins can create RH users
WITH CHECK (
  EXISTS (
    SELECT 1 FROM usuarios_rh
    WHERE usuarios_rh.user_id = auth.uid()
      AND usuarios_rh.role = 'administrador'
      AND usuarios_rh.ativo = true
  )
)
```

### Pattern 4: Public Read (Anonymous)
```sql
-- Example: Anyone can view active jobs
USING (
  status = 'ativa'
  AND deleted_at IS NULL
)
```

---

## Policies by Table

### Candidatos (5 policies)

| Policy | Operation | Role | Description |
|--------|-----------|------|-------------|
| Sistema pode criar candidatos | INSERT | public | Auth user can create own candidato record |
| Allow anonymous SELECT for duplicate check | SELECT | anon | Check email/CPF duplicates during signup |
| Candidatos podem ler seu próprio perfil | SELECT | public | Candidates read own profile only |
| RH pode ler todos os candidatos | SELECT | public | RH reads all candidate profiles |
| Candidatos podem atualizar seu próprio perfil | UPDATE | public | Candidates update own profile |

**Access Summary:**
- ✅ Candidates: Self-access (read/update own)
- ✅ RH: Full read access
- ✅ Anonymous: Duplicate check only

---

### Candidaturas (6 policies)

| Policy | Operation | Role | Description |
|--------|-----------|------|-------------|
| Candidato cria candidatura | INSERT | authenticated | Candidates create applications |
| Allow anonymous duplicate check | SELECT | anon | Check if already applied |
| Candidato vê próprias candidaturas | SELECT | authenticated | Candidates see own applications |
| RH vê candidaturas de suas vagas | SELECT | authenticated | RH sees applications to their jobs |
| Candidato atualiza rascunhos | UPDATE | authenticated | Candidates update draft applications |
| RH atualiza candidaturas | UPDATE | authenticated | RH updates application status |

**Access Summary:**
- ✅ Candidates: Create, read own, update drafts
- ✅ RH: Read all, update all
- ✅ Anonymous: Duplicate check

---

### Vagas (5 policies)

| Policy | Operation | Role | Description |
|--------|-----------|------|-------------|
| Admin e Gerente criam vagas | INSERT | authenticated | Admin/Manager create jobs |
| Público vê vagas ativas | SELECT | anon, authenticated | Everyone sees active jobs |
| RH vê todas vagas | SELECT | authenticated | RH sees all jobs (incl. drafts) |
| Admin deleta vagas | UPDATE | authenticated | Admin soft-deletes jobs |
| Admin e Gerente editam vagas | UPDATE | authenticated | Admin/Manager edit jobs |

**Access Summary:**
- ✅ Public: View active jobs
- ✅ RH: View all jobs
- ✅ Admin/Manager: Full CRUD

---

### Autorizacoes (3 policies) ✨ NEW

| Policy | Operation | Role | Description |
|--------|-----------|------|-------------|
| Candidatos podem ler suas autorizacoes | SELECT | authenticated | Candidates read own LGPD consents |
| RH pode ler todas as autorizacoes | SELECT | authenticated | RH reads all LGPD consents |
| Candidatos podem atualizar suas autorizacoes | UPDATE | authenticated | Candidates update own consents |

**Access Summary:**
- ✅ Candidates: Self-access (read/update own)
- ✅ RH: Full read access
- 🔒 **CRITICAL:** LGPD-protected data

---

### Disponibilidade (3 policies) ✨ NEW

| Policy | Operation | Role | Description |
|--------|-----------|------|-------------|
| Candidatos podem ler sua disponibilidade | SELECT | authenticated | Candidates read own availability |
| RH pode ler todas as disponibilidades | SELECT | authenticated | RH reads all availability |
| Candidatos podem atualizar sua disponibilidade | UPDATE | authenticated | Candidates update own availability |

**Access Summary:**
- ✅ Candidates: Self-access (read/update own)
- ✅ RH: Full read access

---

### Usuarios_RH (7 policies) ✨ RLS ENABLED

| Policy | Operation | Role | Description |
|--------|-----------|------|-------------|
| Administradores podem criar usuários RH | INSERT | public | Admins create RH users |
| Administradores podem ler todos os RH | SELECT | public | Admins read all RH users |
| RH pode ler seu próprio perfil | SELECT | public | RH reads own profile |
| usuarios_rh_authenticated_read | SELECT | authenticated | All authenticated can list RH |
| usuarios_rh_simple_read | SELECT | authenticated | Simplified read access |
| Administradores podem atualizar usuários RH | UPDATE | public | Admins update RH users |
| RH pode atualizar seu próprio perfil | UPDATE | public | RH updates own profile |

**Access Summary:**
- ✅ RH: Self-access (read/update own)
- ✅ Admin: Full CRUD
- ✅ All authenticated: List RH users

---

### Psychometric Tests (3 tables × 3 policies each)

#### Questoes (BigFive, DISC, Raven)
- **SELECT:** All authenticated users can view test questions
- **INSERT/UPDATE:** Only admins (via migration, not exposed)

#### Respostas (BigFive, DISC, Raven)
- **INSERT:** Candidates submit answers to their own applications
- **SELECT (Candidate):** View own answers
- **SELECT (RH):** View all answers

#### Scores (BigFive, DISC, Raven)
- **SELECT (Candidate):** View own scores
- **SELECT (RH):** View all scores
- **INSERT:** Auto-generated by triggers (no manual insert)

---

### Entrevistas (Online & Presencial)

#### Entrevistas Online (3 policies)
- **INSERT:** RH schedules interviews
- **SELECT:** RH sees all interviews
- **UPDATE:** RH updates interview details/status

#### Entrevistas Presenciais (4 policies)
- **INSERT:** RH schedules interviews
- **SELECT (Candidate):** See own interviews
- **SELECT (RH):** See all interviews
- **UPDATE:** RH updates interview details/status

---

### Forms & Questions

#### Perguntas Formulario (4 policies)
- **INSERT:** Admin/Manager create questions
- **SELECT (Public):** View questions for active jobs
- **SELECT (RH):** View all questions
- **UPDATE:** Admin/Manager edit questions

#### Respostas Formulario (4 policies)
- **INSERT:** Candidates submit answers
- **SELECT (Candidate):** View own answers
- **SELECT (RH):** View all answers
- **UPDATE:** Candidates update draft answers

#### Perguntas Cultura (4 policies)
- Similar pattern to Perguntas Formulario

---

### Administrative Tables

#### Avaliacoes RH (3 policies)
- **INSERT:** RH creates evaluations
- **SELECT:** RH sees all evaluations
- **UPDATE:** RH updates own evaluations

#### Biblioteca Perguntas (3 policies)
- **INSERT:** RH creates questions
- **SELECT:** RH views library
- **UPDATE:** RH edits own questions

#### Historico Acoes (2 policies)
- **INSERT:** System logs actions (all authenticated)
- **SELECT:** RH views action history
- **UPDATE/DELETE:** Blocked by triggers (immutable log)

---

## Testing RLS Policies

### 1. Test as Candidate

```sql
-- Set session to candidate user
SET LOCAL role = authenticated;
SET LOCAL request.jwt.claims = '{"sub": "candidate-user-id"}';

-- This should return only YOUR candidaturas
SELECT * FROM candidaturas;

-- This should return only YOUR profile
SELECT * FROM candidatos WHERE user_id = 'candidate-user-id';

-- This should be EMPTY (cannot see other candidates)
SELECT * FROM candidatos WHERE user_id != 'candidate-user-id';
```

### 2. Test as RH User

```sql
-- Set session to RH user
SET LOCAL role = authenticated;
SET LOCAL request.jwt.claims = '{"sub": "rh-user-id"}';

-- This should return ALL candidatos
SELECT * FROM candidatos;

-- This should return ALL candidaturas
SELECT * FROM candidaturas;

-- This should return own RH profile
SELECT * FROM usuarios_rh WHERE user_id = 'rh-user-id';
```

### 3. Test as Anonymous

```sql
-- Remove authentication
RESET role;

-- This should return only ACTIVE vagas
SELECT * FROM vagas;

-- This should be EMPTY (no access to candidatos)
SELECT * FROM candidatos;

-- This should allow duplicate check
SELECT COUNT(*) FROM candidatos WHERE email = 'test@example.com';
```

---

## Frontend Integration

### Automatic RLS Enforcement

```typescript
import { supabase } from '@/lib/supabase'

// ✅ CORRECT: RLS automatically filters
const { data } = await supabase.from('candidaturas').select('*')
// Returns only YOUR candidaturas if you're a candidate
// Returns ALL candidaturas if you're RH

// ❌ WRONG: Don't manually filter by user_id
const { data } = await supabase
  .from('candidaturas')
  .select('*')
  .eq('candidato_id', candidatoId) // Redundant!
```

### Handling RLS Errors

```typescript
try {
  const { data, error } = await supabase
    .from('usuarios_rh')
    .insert({ ... })

  if (error) {
    if (error.code === 'PGRST301') {
      // RLS policy violation
      toast.error('Você não tem permissão para criar usuários RH')
      // User is not an admin
    }
  }
} catch (err) {
  console.error(err)
}
```

---

## Security Best Practices

### 1. Never Trust Frontend Filtering
❌ **Bad:** Filter data in React components
✅ **Good:** Let RLS filter in database

### 2. Always Use Authenticated Requests
❌ **Bad:** Use anon key for sensitive data
✅ **Good:** Require authentication for candidate/RH data

### 3. Test RLS Policies Thoroughly
- Test each role (anon, candidate, RH, admin)
- Verify unauthorized access is blocked
- Check edge cases (deleted records, inactive users)

### 4. Monitor RLS Policy Violations
```sql
-- Check for frequent policy violations (may indicate attack)
SELECT
  user_id,
  COUNT(*) as violation_count
FROM logs_acesso
WHERE erro LIKE '%PGRST301%'
GROUP BY user_id
HAVING COUNT(*) > 10;
```

---

## Common RLS Patterns

### Pattern: Join Through Candidaturas

Many tables use candidaturas as an access bridge:

```sql
-- Candidate can access test results for their own applications
USING (
  EXISTS (
    SELECT 1 FROM candidaturas c
    JOIN candidatos ca ON ca.id = c.candidato_id
    WHERE c.id = table.candidatura_id
      AND ca.user_id = auth.uid()
  )
)
```

This pattern is used in:
- respostas_bigfive
- respostas_disc
- respostas_raven
- respostas_formulario
- respostas_cultura
- scores_*

### Pattern: Soft Delete Awareness

Policies respect soft deletes:

```sql
USING (
  deleted_at IS NULL  -- Only show non-deleted records
  AND ...
)
```

### Pattern: Status-Based Access

Some policies check record status:

```sql
-- Candidates can only update DRAFT applications
USING (
  candidatura.status = 'rascunho'
  AND ...
)
```

---

## Troubleshooting

### Issue: Cannot Insert Record

**Error:** `new row violates row-level security policy`

**Cause:** Missing `WITH CHECK` policy for INSERT

**Solution:** Verify user role matches policy requirements:
```typescript
// Check current user
const { data: { user } } = await supabase.auth.getUser()

// Verify user has required role
const { data: rh } = await supabase
  .from('usuarios_rh')
  .select('role')
  .eq('user_id', user.id)
  .single()
```

### Issue: Cannot See Expected Records

**Error:** Query returns empty array

**Cause:** RLS filtering out records

**Solution:** Verify user authentication and role:
```typescript
// 1. Check authentication
const { data: { session } } = await supabase.auth.getSession()
if (!session) {
  console.error('Not authenticated')
}

// 2. Check role
const { data: candidato } = await supabase
  .from('candidatos')
  .select('id')
  .eq('user_id', session.user.id)
  .single()

if (!candidato) {
  console.error('User is not a candidate')
}
```

### Issue: RLS Performance

**Error:** Slow queries

**Solution:** RLS policies use indexes efficiently. Check:
1. Missing indexes on foreign keys
2. Complex policy conditions
3. Use `EXPLAIN ANALYZE` to debug:

```sql
EXPLAIN ANALYZE
SELECT * FROM candidaturas WHERE candidato_id = 'xxx';
```

---

## Migration History

### 2025-11-13: Critical RLS Fixes
- ✅ Enabled RLS on `usuarios_rh` (7 existing policies)
- ✅ Created 3 policies for `disponibilidade`
- ✅ Created 3 policies for `autorizacoes`
- ✅ Fixed LGPD violation (autorizacoes was public)

---

## Policy Summary

| Table | Total Policies | INSERT | SELECT | UPDATE | DELETE |
|-------|----------------|--------|--------|--------|--------|
| candidatos | 5 | 1 | 3 | 1 | 0 |
| candidaturas | 6 | 1 | 3 | 2 | 0 |
| vagas | 5 | 1 | 2 | 2 | 0 |
| autorizacoes | 3 | 0 | 2 | 1 | 0 |
| disponibilidade | 3 | 0 | 2 | 1 | 0 |
| usuarios_rh | 7 | 1 | 5 | 2 | 0 |
| avaliacoes_rh | 3 | 1 | 1 | 1 | 0 |
| entrevistas_online | 3 | 1 | 1 | 1 | 0 |
| entrevistas_presenciais | 4 | 1 | 2 | 1 | 0 |
| ... (25 more tables) | ... | ... | ... | ... | ... |

**Total:** 103 policies across 34 tables

---

## Next Steps

1. **Review policies** - Ensure they match business requirements
2. **Test all roles** - Verify candidate, RH, admin access
3. **Monitor violations** - Set up alerts for policy violations
4. **Document changes** - Update this file when policies change

For integration help, see:
- [INTEGRATION_GUIDE.md](./INTEGRATION_GUIDE.md)
- [API_ENDPOINTS.md](./API_ENDPOINTS.md)

---

**Security Status:** ✅ **100% RLS Coverage on All Tables**
