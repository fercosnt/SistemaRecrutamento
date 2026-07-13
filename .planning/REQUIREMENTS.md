# Requirements: Sistema de Recrutamento Beauty Smile — M5 (v5.0)

**Defined:** 2026-07-13
**Milestone:** v5.0 — M5 · Gestão de Usuários & Perfil RH (feature-work, **não** hardening)
**Core Value:** Candidato se cadastra, se candidata a uma vaga e acompanha seu status sem fricção — e o RH consegue triar, avaliar e decidir num único sistema rastreável com scores comparáveis.
**Fontes:** `.planning/M4-PRODUCT-EVALUATION.md` (achados **A14** gestão de usuários RH real + **A37** perfil RH real — diferidos do M4, onde foram apenas *gateados/ocultados*) · `.planning/M5-DRAFT.md` (grupo FEATURE-DEBT). O escopo maior "Operação & Comunicação" do M5-DRAFT foi resequenciado p/ M6.

> **Eixo do milestone — segurança:** A14/A37 são superfície de **escalonamento de privilégio** (criar usuário, atribuir papel `administrador`). Invariantes: toda escrita privilegiada roda numa **Edge Function service_role authenticate-THEN-authorize** (nunca service_role no client — regra de ouro do projeto); RLS de `usuarios_rh` só `administrador` lê/escreve, preservando a policy `auth_admin_le_usuarios_rh` do `custom_access_token_hook` (declarada em migration file no M4/SEC-09 — **não re-migrar**); LGPD via **soft-delete/desativação** + trilha de auditoria (nunca hard-delete de identidade).

## v1 Requirements

Requirements desta release. Cada um mapeia p/ uma fase do roadmap.

### 👥 USR — Gestão de Usuários RH (A14)

*`/rh/configuracoes` — hoje um empty-state ("Gestão de usuários ainda não disponível"). RH shell + header + route + `RoleGuard(administrador)` já existem; o M5 preenche o conteúdo real.*

- [ ] **USR-01**: `administrador` visualiza a lista de usuários RH (nome, email, papel, status ativo/inativo). `(A14)`
- [ ] **USR-02**: `administrador` cria um novo usuário RH (email + papel); o novo usuário consegue definir a própria senha e acessar o painel RH. `(A14)`
- [ ] **USR-03**: `administrador` altera o papel de um usuário RH (`recrutador` ↔ `administrador`), e a mudança reflete no JWT/role no próximo acesso. `(A14)`
- [ ] **USR-04**: `administrador` desativa/reativa um usuário RH (soft, sem hard-delete); um usuário desativado não consegue mais acessar o painel RH. `(A14)`
- [ ] **USR-05**: `administrador` dispara um reset de senha para um usuário RH (o usuário recebe o caminho de redefinição). `(A14)`
- [x] **USR-06**: Toda ação de gestão de usuários (criar, mudar papel, desativar/reativar, reset) grava uma trilha de auditoria append-only (ator, alvo, ação, timestamp). `(A14, LGPD)`
- [ ] **USR-07**: Guarda anti-lockout server-enforced — o sistema impede remover, rebaixar ou desativar o **último `administrador` ativo**. `(A14)`

### 🙋 PERFIL — Meu Perfil RH (A37)

*`MeuPerfilPage` — hoje um stub ("Edição de perfil em breve"). Fluxo self-service do próprio usuário RH; separado de A14 p/ impedir auto-escalonamento.*

- [ ] **PERFIL-01**: Usuário RH edita o próprio perfil (nome de exibição). `(A37)`
- [ ] **PERFIL-02**: Usuário RH troca a própria senha, exigindo a senha atual (re-autenticação). `(A37)`
- [ ] **PERFIL-03**: Usuário RH faz upload/troca da própria foto de perfil (storage privado + RLS own-row). `(A37)`

### 🔒 SEG — Segurança & Autorização (eixo cross-cutting)

*Invariantes verificáveis pelo `/gsd-secure-phase` de cada fase.*

- [ ] **SEG-01**: Toda escrita privilegiada de usuários (criar / mudar papel / desativar / reset de senha de terceiro) roda numa Edge Function service_role **authenticate-THEN-authorize** (`getUser()` → papel `administrador` → então age); zero operação com service_role no client-side. `(A14, invariante do projeto)`
- [x] **SEG-02**: RLS de `usuarios_rh` mantém "só `administrador` lê a lista / escreve"; `recrutador` e candidato não leem a lista de usuários; a policy `auth_admin_le_usuarios_rh` (dependência do auth-hook) é **preservada** (não removida/quebrada). `(A14, SEC-09-M4)`
- [ ] **SEG-03**: Anti-privilege-escalation — o caminho de perfil (A37) **nunca** altera `role`; nenhuma rota (UI/API/RLS) permite um `recrutador` se auto-promover a `administrador`. `(A37)`

## v2 Requirements

Rastreados, fora do roadmap atual.

### Gestão de Usuários (expansão)

- **USR-08**: Troca de email do próprio usuário RH (exige re-auth + confirmação por email — GoTrue email-change flow). *(complexidade de fluxo de confirmação; fora do escopo enxuto do M5)*
- **USR-09**: Convite por email com expiração + reenvio (invite lifecycle completo), caso o M5 tenha optado por create-com-senha-temporária.
- **USR-10**: Página de auditoria navegável/filtrável das ações de gestão (o M5 grava a trilha USR-06; a UI de consulta rica fica pra depois).

### Operação & Comunicação (M6 — ex M5-DRAFT)

- Pipeline de notificação ao candidato (EF `notificar-candidato`), agendamento de entrevista, relatórios/KPIs, banco de talentos, retenção/exclusão LGPD, fila de revisão Art. 20, substância psicométrica (SJT/normas/BARS/CC0). Ver `.planning/M5-DRAFT.md`.

## Out of Scope

Explicitamente excluído neste milestone.

| Feature | Motivo |
|---------|--------|
| Troca de email do usuário RH | Requer fluxo de confirmação GoTrue (re-auth + double-opt-in); escopo enxuto do M5 fica em nome/foto/senha → v2 (USR-08) |
| Auto-cadastro/self-signup de RH | Contas RH são internas, criadas por `administrador` — nunca self-service (superfície de privilégio) |
| Hard-delete de usuário RH | LGPD/auditoria — desativação é soft (USR-04); identidade nunca é destruída |
| SSO / OAuth para RH | Fora do escopo; login RH continua email+senha via `usuarios_rh`/auth-hook |
| MFA/2FA para RH | Deferido; não é pré-requisito do feature-debt A14/A37 |
| Gestão de permissões granulares (além de recrutador/administrador) | O modelo de 2 papéis do PRD atende; RBAC fino não é do M5 |
| DBMIG-01 baseline+rebuild · SEC-03 Vault secret · CC0-01 seed cognitivo | Débito carregado do M4 → M6/backlog (environment-gated / resolve-por-substituição / trilha PSICO) |

## Traceability

Qual fase cobre qual requirement. Preenchido na criação do roadmap.

| Requirement | Phase | Status |
|-------------|-------|--------|
| USR-01 | Phase 29 | Pending |
| USR-02 | Phase 29 | Pending |
| USR-03 | Phase 29 | Pending |
| USR-04 | Phase 29 | Pending |
| USR-05 | Phase 29 | Pending |
| USR-06 | Phase 28 | Complete |
| USR-07 | Phase 28 | Pending |
| PERFIL-01 | Phase 30 | Pending |
| PERFIL-02 | Phase 30 | Pending |
| PERFIL-03 | Phase 30 | Pending |
| SEG-01 | Phase 28 | Pending |
| SEG-02 | Phase 28 | Complete |
| SEG-03 | Phase 30 | Pending |

**Coverage:**
- v1 requirements: 13 total (USR ×7 · PERFIL ×3 · SEG ×3)
- Mapped to phases: 13 ✓ (Phase 28 ×4 · Phase 29 ×5 · Phase 30 ×4)
- Unmapped: 0 ✓

**Por fase:**
- **Phase 28 — Gestão de Usuários RH · Núcleo Seguro** (backend + segurança): USR-06, USR-07, SEG-01, SEG-02
- **Phase 29 — Console de Gestão de Usuários RH** (A14 UI): USR-01, USR-02, USR-03, USR-04, USR-05
- **Phase 30 — Meu Perfil RH** (A37 self-service): PERFIL-01, PERFIL-02, PERFIL-03, SEG-03

---

*Escopo deliberadamente enxuto (A14 + A37). Segurança é o eixo — Phase 28 (núcleo seguro), Phase 29 (console A14) e Phase 30 (perfil A37) são candidatas a `/gsd-secure-phase`. Numeração de fases continua a partir da **Phase 28** (M4 terminou na Phase 27).*
