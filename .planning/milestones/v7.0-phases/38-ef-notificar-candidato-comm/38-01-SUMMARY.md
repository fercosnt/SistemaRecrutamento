---
phase: 38-ef-notificar-candidato-comm
plan: 01
subsystem: edge-functions
tags: [deno, ics, rfc5545, port, base64, email-attachment]

# Dependency graph
requires:
  - phase: M6/Phase 35
    provides: "src/features/agendamento/services/agendamentoCandidatoService.ts::gerarIcsAgendamento — gerador .ics RFC-5545 puro (fonte do port verbatim)"
provides:
  - "supabase/functions/_shared/ics.ts — gerarIcsAgendamento (port verbatim, METHOD:PUBLISH, CRLF, fold ≤75 octetos) + icsParaBase64 UTF-8-safe + IcsAgendamentoInput + IcsGenerationError, zero imports"
  - "supabase/functions/_shared/__tests__/ics.test.ts — 6 testes deno (estrutura, CRLF, LOCATION condicional, DTEND+1h, guard, round-trip base64)"
affects: [38-03]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Port verbatim src→Deno de função pura (sem import compartilhável cross-runtime): copia byte-a-byte a lógica, adapta só o erro (IcsGenerationError local no lugar de MeuAgendamentoServiceError)"
    - "Base64 UTF-8-safe em Deno sem npm: btoa(String.fromCharCode(...new TextEncoder().encode(s))) — btoa direto lançaria em acento"
    - "Módulo _shared zero-import (espelha email-config.ts): roda deno test sem --allow-net"

key-files:
  created:
    - supabase/functions/_shared/ics.ts
    - supabase/functions/_shared/__tests__/ics.test.ts
  modified: []

key-decisions:
  - "IcsAgendamentoInput reduz a superfície a 3 campos (id, data_hora, local_ou_link) — os únicos que o gerador usa — em vez de portar o MeuAgendamentoRow do M6 (7 colunas, carrega campos irrelevantes ao .ics)"
  - "METHOD:PUBLISH preservado do M6 (resolve a questão aberta do roadmap por consistência do port, não por reabertura): evita a semântica RSVP/ATTENDEE que REQUEST exigiria"
  - "icsParaBase64 vive aqui (não na EF): o helper de encoding é testado junto com o gerador; round-trip provado com 'São Paulo' acentuado"

# Verification
verification:
  automated: "deno test _shared/__tests__/ics.test.ts --allow-env --allow-read → 6 passed / 0 failed"
  acceptance: "ics.ts: zero imports, METHOD:PUBLISH + PRODID Beauty Smile presentes, exporta gerarIcsAgendamento + icsParaBase64, join CRLF"
  lint: "tsc src/** 97→97 (EF/Deno não é type-checked pelo tsc do src; deno check verde)"
---

# 38-01 — Port `.ics` para `_shared/ics.ts` (COMM-04 mecânica)

Portei o gerador `.ics` RFC-5545 do M6 (`gerarIcsAgendamento`) para `supabase/functions/_shared/ics.ts` como função pura, byte-idêntico na lógica — mesmas linhas VCALENDAR/VEVENT, `METHOD:PUBLISH`, `PRODID:-//Beauty Smile//Recrutamento//PT-BR`, fold de linha a ≤75 octetos e join CRLF (`\r\n`). Portei junto os helpers (`toIcsUtc`, `escapeIcsText`, `foldIcsLine`) e as constantes (`ICS_SUMMARY`, `UMA_HORA_MS`). A única adaptação foi o erro: `IcsGenerationError` local com a mesma mensagem do `MeuAgendamentoServiceError` do M6 (guard de `data_hora` inválida preservado).

Adicionei `icsParaBase64` (UTF-8-safe via `TextEncoder`+`btoa`) — o helper que a EF do convite (38-03) usa para o campo `content` do anexo do Resend, provado por round-trip que preserva acento.

6 testes deno verdes cobrem estrutura RFC-5545, CRLF, LOCATION condicional, DTEND=DTSTART+1h, o guard de data inválida e o round-trip base64. Zero npm novo, zero imports no módulo.

**Deviations:** nenhuma. **Next:** a EF (38-03) importa `gerarIcsAgendamento` + `icsParaBase64` daqui.
