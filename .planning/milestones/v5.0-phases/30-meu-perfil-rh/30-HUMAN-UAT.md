# Phase 30 — HUMAN-UAT (deferred live round-trips)

**Status:** deferred (verification at code + PROD-smoke level; these are live GoTrue/storage/visual round-trips). No gaps.
**Account:** `e2e.admin@beautysmile.com.br` (+ the first recrutador from Phase 29).

1. **Password change (PERFIL-02):** at `/rh/perfil` → Senha → wrong current password shows a field error; correct current + valid new → success toast, session NOT dropped, re-login works with the new password.
2. **Avatar upload (PERFIL-03):** upload a ≤2MB png/jpeg/webp → preview + signed-URL renders; the photo appears in the RH shell (top bar/sidebar) panel-wide; >2MB / wrong type rejected.
3. **Name propagation (PERFIL-01, Success Criterion #1):** edit the display name → it persists and appears across the RH panel chrome (top bar + sidebar) WITHOUT a re-login.
4. **Visual / AA sweep:** axe-core Tier-A on the live profile page; confirm the glass admin theme + AA badge/text contrast (Phase-29 values).
