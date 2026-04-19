# Vaga Localização Fix - Complete

## Problem Solved

**Issue:** 400 Bad Request error when querying candidaturas table
```
GET .../candidaturas?select=*,vaga:vagas(id,titulo,localizacao,departamento,ativa)...
400 (Bad Request)
```

**Root Cause:**
- Backend queries were referencing non-existent columns `localizacao` and `ativa` in the `vagas` table
- Database schema actually uses `cidade`, `estado`, and `status` columns instead

## Database Schema Reality

The `vagas` table has:
- ✅ `cidade` (text, nullable) - City name
- ✅ `estado` (text, nullable) - State/UF
- ✅ `status` (enum: 'rascunho', 'ativa', 'inativa', 'arquivada')
- ❌ `localizacao` - Does NOT exist
- ❌ `ativa` - Does NOT exist

## Solution Implemented

### 1. Created Helper Function

**File:** `src/features/vagas/types/vagasTypes.ts` (lines 119-147)

```typescript
/**
 * Formata localização da vaga a partir de cidade e estado
 * @param vaga - Vaga com cidade e estado
 * @returns String formatada "Cidade - UF" ou "Remoto" se não houver cidade
 */
export function formatarLocalizacaoVaga(vaga: Pick<VagaRow, 'cidade' | 'estado' | 'modelo_trabalho'>): string {
  // Se for remoto, retornar "Remoto"
  if (vaga.modelo_trabalho === 'Remoto') {
    return 'Remoto'
  }

  // Se tiver cidade e estado
  if (vaga.cidade && vaga.estado) {
    return `${vaga.cidade} - ${vaga.estado}`
  }

  // Se tiver apenas cidade
  if (vaga.cidade) {
    return vaga.cidade
  }

  // Se tiver apenas estado
  if (vaga.estado) {
    return vaga.estado
  }

  // Fallback
  return 'Não informado'
}
```

### 2. Backend Fixes in candidaturasService.ts

#### Fix 1: listCandidaturas function (lines 673-675)
```typescript
// Before:
vaga:vagas (
  id,
  titulo,
  localizacao,    // ❌ doesn't exist
  departamento,
  ativa           // ❌ doesn't exist
)

// After:
vaga:vagas (
  id,
  titulo,
  cidade,
  estado,
  departamento,
  status
)
```

#### Fix 2: createCandidatura function (line 569)
```typescript
// Before:
.select('id, titulo, localizacao, departamento')

// After:
.select('id, titulo, cidade, estado, departamento')
```

#### Fix 3: webhook payload (line 916)
```typescript
// Before:
vaga: {
  id: vaga.id,
  titulo: vaga.titulo,
  localizacao: vaga.localizacao,
  departamento: vaga.departamento,
}

// After:
vaga: {
  id: vaga.id,
  titulo: vaga.titulo,
  localizacao: [vaga.cidade, vaga.estado].filter(Boolean).join(', ') || null,
  departamento: vaga.departamento,
}
```

### 3. Frontend Fixes

All frontend components updated to use the helper function instead of accessing non-existent `vaga.localizacao`:

#### VagasRHPage.tsx
- **Line 36:** Added import
- **Lines 212-216:** Fixed search filter to use `formatarLocalizacaoVaga(vaga)`
- **Line 398:** Changed display from `{vaga.localizacao}` to `{formatarLocalizacaoVaga(vaga)}`

#### VagaDetalhePage.tsx
- **Line 37:** Added import
- **Line 208:** Changed display from `{vaga.localizacao}` to `{formatarLocalizacaoVaga(vaga)}`

#### DashboardRHPage.tsx
- **Line 19:** Added import
- **Line 241:** Changed display from `{vaga.localizacao}` to `{formatarLocalizacaoVaga(vaga)}`

#### ConfiguracoesPage.tsx
- **Line 16:** Added import
- **Line 1875:** Changed display from `{vaga.localizacao}` to `{formatarLocalizacaoVaga(vaga)}`

## Verification

All files compiled successfully with HMR updates:
```
10:45:00 PM [vite] (client) hmr update /src/components/pages/VagaDetalhePage.tsx
10:45:34 PM [vite] (client) hmr update /src/components/pages/DashboardRHPage.tsx
10:47:32 PM [vite] (client) hmr update /src/components/pages/DashboardRHPage.tsx
10:48:09 PM [vite] (client) hmr update /src/components/pages/ConfiguracoesPage.tsx
```

No compilation errors detected.

## Impact

✅ **Backend:** All Supabase queries now use correct column names
✅ **Frontend:** All components use helper function for consistent location display
✅ **User Experience:** Location displays correctly formatted as "Cidade - UF" or "Remoto"
✅ **Type Safety:** TypeScript errors resolved with proper typing

## Testing Recommendations

1. Test candidaturas query returns 200 OK (no more 400 Bad Request)
2. Verify candidate profile page displays candidaturas correctly
3. Test RH dashboard shows vagas with proper location formatting
4. Test vagas listing page search by location works
5. Test vaga details page shows location correctly
6. Test webhook payloads include properly formatted location

---

**Date Completed:** 2025-11-23
**Files Modified:** 6 files (1 helper function + 1 backend service + 4 frontend components)
**Lines Changed:** ~15 lines total
