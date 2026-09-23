-- =============================================================================
-- Phase 49 / Plano 49-12 — PÓS-ESTADO das escritas retroativas
--                          (D-46 aplicada · D-47 RECUSADA · D-43 aplicada)
-- =============================================================================
-- ⚠ SÓ LEITURA. Não escreve nada. Termina SEMPRE em `RAISE EXCEPTION` — a exceção
-- aborta a requisição e a MENSAGEM é o veredito (mesmo idioma do
-- `p49_retroativos_ensaio.sql`; a Management API não devolve `RAISE NOTICE`).
-- Saída esperada do `p46apply`: código ≠ 0 com `POS-ESTADO OK:` no texto.
-- `POS-ESTADO DIVERGE:` é reprovação, e diz qual medida divergiu.
--
-- ══ POR QUE ESTE ARQUIVO EXISTE, e não a consulta que o plano trazia.
--
-- O `<verify>` original do 49-12 Task 3 media `d46`, `d47` e `d43` e reprovava se
-- QUALQUER um fosse diferente de zero. Isso era correto enquanto as três escritas
-- eram candidatas à aprovação — e virou ERRADO no instante em que o operador
-- **recusou a D-47** em 2026-09-23. Um instrumento que exige `d47 = 0` passa a
-- afirmar, como critério de sucesso, exatamente o que o operador declinou: ele
-- reprovaria o plano por a trilha de auditoria NÃO ter sido editada.
--
-- É a mesma classe de defeito que o CLAUDE.md §«Portões: varra pela FORMA»
-- descreve — o portão que reprova trabalho correto com diagnóstico falso —, só que
-- aqui a fotografia congelada não é um número de seed: é uma DECISÃO que mudou.
-- Um portão que não distingue «não mudou porque foi recusado» de «não mudou porque
-- falhou» produz, nos dois casos, a mesma mensagem vermelha. E a leitura óbvia
-- dela («a escrita quebrou») é a leitura errada — a que levaria alguém a "consertar"
-- aplicando a D-47 que foi recusada.
--
-- Então este instrumento declara, por decisão, o valor ESPERADO e o PORQUÊ:
--   · d46  esperado 0  — APROVADA e aplicada (`20260922000009`).
--   · d47  esperado 5  — **RECUSADA**. As 5 linhas de `historico_candidatura`
--                        continuam com a justificativa da decisão final, de
--                        propósito. ⚠ `d47 = 0` também REPROVA aqui: significaria
--                        que alguém aplicou uma escrita sem autorização.
--   · d43  esperado 0 grupos `(candidatura, tipo)` com mais de uma vigente —
--                        APROVADA e aplicada (`20260922000011`).
--   · dfh  esperado 11 — D-45: o arquivo de snapshots não cresce NEM encolhe.
--   · proveniência esperada 5 de 6 análises com `ai_call_log_id`, `texto_hash`,
--                        `provedor_ia` e `modelo_ia`; a 6ª (`48f0351e…`, sem log)
--                        com os quatro NULL, sob a D-30.
--   · `tipo` e `solicitado_por` esperados NULL nas 6 — continuam sob a D-30.
--   · a vaga `4601d000-…-0003` esperada `arquivada` — o operador RECUSOU mexer
--                        nela; o conserto do `p46_purga_smoke` é do plano 49-28.
--
-- COMO RODAR: `node p46apply.cjs run supabase/tests/p49_12_pos_estado.sql`
-- =============================================================================

DO $$
DECLARE
  -- ⚠ O ESPERADO É DECLARADO UMA VEZ SÓ, e o comparador e a mensagem leem daqui.
  -- Escrever o número duas vezes (no `IF` e na prosa do `format`) é uma duplicação
  -- que envelhece em silêncio: as três mutações que provaram este instrumento em
  -- 2026-09-23 mudavam só o comparador, e as mensagens saíam dizendo «esperado 5»
  -- enquanto o comparador exigia 0. A mensagem contradizia o portão que ela
  -- explicava — e é essa contradição, não o número, que faz alguém consertar a
  -- coisa errada.
  c_esp_d46  constant int := 0;   -- APROVADA e aplicada (20260922000009)
  c_esp_d47  constant int := 5;   -- RECUSADA: as 5 linhas ficam como estavam
  c_esp_d43  constant int := 0;   -- APROVADA e aplicada (20260922000011)
  c_esp_dfh  constant int := 11;  -- D-45: nem cresce nem encolhe
  c_esp_prov constant int := 5;   -- 5 de 6; a 6a e NULL honesto sob a D-30
  c_esp_vaga constant text := 'arquivada';  -- UPDATE RECUSADO (conserto no 49-28)

  v_d46 int; v_d47 int; v_d43 int; v_dfh int;
  v_prov int; v_log int; v_hash int; v_modelo int;
  v_orfa_ok boolean; v_d30_ok boolean;
  v_vaga text;
  v_falhas text[] := '{}'::text[];
BEGIN
  -- (1) D-46 — APROVADA: nenhuma candidatura carrega justificativa grudada.
  SELECT count(*)::int INTO v_d46
    FROM public.candidaturas WHERE etapa_justificativa IS NOT NULL;
  IF v_d46 <> c_esp_d46 THEN
    v_falhas := v_falhas || format('d46=%s, esperado %s (APROVADA em 2026-09-23 e aplicada pela 20260922000009 — este numero e uma FALHA real)', v_d46, c_esp_d46);
  END IF;

  -- (2) D-47 — RECUSADA: as 5 linhas continuam como estavam, de proposito.
  SELECT count(*)::int INTO v_d47
    FROM public.historico_candidatura h
   WHERE EXISTS (SELECT 1 FROM public.decisao_final d
                  WHERE d.candidatura_id = h.candidatura_id
                    AND d.justificativa = h.criterio_texto)
      OR EXISTS (SELECT 1 FROM public.decisao_final_historico a
                  WHERE a.candidatura_id = h.candidatura_id
                    AND a.justificativa = h.criterio_texto);
  IF v_d47 <> c_esp_d47 THEN
    IF v_d47 < c_esp_d47 THEN
      v_falhas := v_falhas || format('d47=%s, esperado %s — a D-47 foi RECUSADA pelo operador; um numero MENOR significa que a trilha de auditoria foi editada SEM autorizacao', v_d47, c_esp_d47);
    ELSE
      v_falhas := v_falhas || format('d47=%s, esperado %s — a D-47 foi RECUSADA e o conjunto CRESCEU: nasceu copia nova da justificativa na trilha, e o conserto de codigo do 49-06 deveria impedir isso', v_d47, c_esp_d47);
    END IF;
  END IF;

  -- (3) D-43 — APROVADA: nenhum grupo com duas vigentes.
  SELECT count(*)::int INTO v_d43
    FROM (SELECT candidatura_id, coalesce(tipo, '(sem tipo)') t
            FROM public.entrevista_analises
           WHERE public.entrevista_analise_vigente(superada_em, status_analise, competencias)
           GROUP BY 1, 2 HAVING count(*) > 1) x;
  IF v_d43 <> c_esp_d43 THEN
    v_falhas := v_falhas || format('d43=%s grupo(s) com mais de uma vigente, esperado %s (APROVADA e aplicada pela 20260922000011 — FALHA real)', v_d43, c_esp_d43);
  END IF;

  -- (4) D-45 — o arquivo de snapshots intocado.
  SELECT count(*)::int INTO v_dfh FROM public.decisao_final_historico;
  IF v_dfh <> c_esp_dfh THEN
    v_falhas := v_falhas || format('dfh=%s, esperado %s (D-45: o arquivo de snapshots nao cresce nem encolhe)', v_dfh, c_esp_dfh);
  END IF;

  -- (5) A proveniencia reconstruida — 5 de 6, e a 6a NULL por honestidade.
  SELECT count(*) FILTER (WHERE provedor_ia    IS NOT NULL)::int,
         count(*) FILTER (WHERE ai_call_log_id IS NOT NULL)::int,
         count(*) FILTER (WHERE texto_hash     IS NOT NULL)::int,
         count(*) FILTER (WHERE modelo_ia      IS NOT NULL)::int
    INTO v_prov, v_log, v_hash, v_modelo
    FROM public.entrevista_analises;
  IF v_prov <> c_esp_prov OR v_log <> c_esp_prov OR v_hash <> c_esp_prov OR v_modelo <> c_esp_prov THEN
    v_falhas := v_falhas || format('proveniencia: prov=%s log=%s hash=%s modelo=%s, esperado %s em cada (alargamento da D-30 aprovado em 2026-09-23)', v_prov, v_log, v_hash, v_modelo, c_esp_prov);
  END IF;

  SELECT provedor_ia IS NULL AND modelo_ia IS NULL
         AND texto_hash IS NULL AND ai_call_log_id IS NULL
    INTO v_orfa_ok
    FROM public.entrevista_analises
   WHERE id = '48f0351e-f485-4916-9f62-4892a6348c27';
  IF v_orfa_ok IS DISTINCT FROM true THEN
    v_falhas := v_falhas || 'a analise 48f0351e (sem log correspondente) NAO esta com os quatro campos NULL — proveniencia inventada viola a D-30';
  END IF;

  -- (6) O que continua sob a D-30 e nao foi tocado.
  SELECT count(*) FILTER (WHERE tipo IS NOT NULL) = 0
         AND count(*) FILTER (WHERE solicitado_por IS NOT NULL) = 0
    INTO v_d30_ok
    FROM public.entrevista_analises;
  IF v_d30_ok IS DISTINCT FROM true THEN
    v_falhas := v_falhas || 'tipo ou solicitado_por deixaram de ser NULL — sao genuinamente irrecuperaveis e a D-30 os governa; nada neste plano deveria preenche-los';
  END IF;

  -- (7) A vaga seed — UPDATE RECUSADO pelo operador (conserto no 49-28).
  SELECT status::text INTO v_vaga FROM public.vagas
   WHERE id = '4601d000-0000-4000-8000-000000000003';
  IF v_vaga IS DISTINCT FROM c_esp_vaga THEN
    v_falhas := v_falhas || format('a vaga seed 4601d000-...-0003 esta %s, esperado %s — o operador RECUSOU mexer nela; abrir uma vaga sintetica a torna visivel ao publico', coalesce(v_vaga, 'ausente'), c_esp_vaga);
  END IF;

  IF cardinality(v_falhas) > 0 THEN
    RAISE EXCEPTION 'POS-ESTADO DIVERGE: %', array_to_string(v_falhas, ' ;; ');
  END IF;

  RAISE EXCEPTION 'POS-ESTADO OK: d46=%/% (APROVADA) d47=%/% (RECUSADA — BD-9 meio-fechada de proposito) d43=%/% grupos com >1 vigente (APROVADA) dfh=%/% (D-45 intocado) proveniencia prov=%/% log=%/% hash=%/% modelo=%/% orfa_48f0351e_null=% d30_tipo_e_solicitado_por_null=% vaga_seed=%/% (RECUSADA, conserto no 49-28)',
    v_d46, c_esp_d46, v_d47, c_esp_d47, v_d43, c_esp_d43, v_dfh, c_esp_dfh,
    v_prov, c_esp_prov, v_log, c_esp_prov, v_hash, c_esp_prov, v_modelo, c_esp_prov,
    v_orfa_ok, v_d30_ok, v_vaga, c_esp_vaga;
END
$$;
