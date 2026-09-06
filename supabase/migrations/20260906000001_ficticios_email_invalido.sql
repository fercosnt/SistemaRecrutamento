-- =============================================================================
-- Migration: e-mails dos 6 candidatos FICTICIOS saem de @exemplo.com → @invalido.local
-- Date: 2026-09-06
-- =============================================================================
-- MEDIDO em 2026-09-06: `exemplo.com` NAO e dominio reservado (o reservado e
-- example.com) — tem MX (mail.h-email.net) e as 6 confirmacoes de inscricao dos
-- ficticios constam como `entregue`: nome ficticio, titulo da vaga e link do painel
-- foram parar num servidor de terceiros. Cada avanco de etapa mandaria mais.
--
-- `.local` nao resolve na internet (RFC 6762); `invalido` deixa claro no proprio
-- endereco. O mesmo padrao que a Phase 46 ja usa nas fixtures
-- (`fixture-p46+…@invalido.local`). Sem BEGIN/COMMIT (D-22).
-- =============================================================================

DO $mig$
DECLARE
  v_n int;
BEGIN
  SELECT count(*) INTO v_n FROM public.candidatos
   WHERE id::text LIKE 'f000000_-0000-4000-8000-00000000000_' AND email LIKE '%@exemplo.com';
  IF v_n <> 6 THEN
    RAISE EXCEPTION 'esperava 6 ficticios com @exemplo.com, achei %', v_n;
  END IF;

  UPDATE public.candidatos
     SET email = replace(email, '@exemplo.com', '@invalido.local'), updated_at = now()
   WHERE id::text LIKE 'f000000_-0000-4000-8000-00000000000_' AND email LIKE '%@exemplo.com';

  IF EXISTS (SELECT 1 FROM public.candidatos WHERE id::text LIKE 'f000000_-0000-4000-8000-00000000000_' AND email LIKE '%@exemplo.com') THEN
    RAISE EXCEPTION 'pos-condicao: ainda ha ficticio com @exemplo.com';
  END IF;
  RAISE NOTICE '6 ficticios agora em @invalido.local';
END
$mig$;
