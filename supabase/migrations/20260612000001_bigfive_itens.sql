-- =============================================================================
-- Migration: bigfive_itens (IPIP-NEO-120 item bank) + 120-item seed + RLS
--            + get_bigfive_itens() answer-key-safe reader
-- Date: 2026-06-12
-- Phase: 12 (big-five-devolutiva — Etapa 3 contextual assessment)
-- Requirement: AVAL-04 (RF-15) — Big Five IPIP-NEO-120 item bank
-- =============================================================================
--
-- PURPOSE
-- A dedicated item bank for the IPIP-NEO-120 PT-BR instrument (public-domain / CC0,
-- from docs/conhecimento/big-five/fontes/ipip-neo-120-questions-pt-br.json). Seeds
-- all 120 items. dimensao (OCEAN), faceta (1..30), reverse_keyed are the SCORING KEY:
-- faceta = ((id-1) % 30) + 1; reverse_keyed = id in the 55-id set (PESQUISA L289-294).
--
-- ANSWER-KEY PROTECTION (T-12-04 / [[reference_select_star_leaks_pii]]):
-- dimensao/faceta/reverse_keyed ARE the scoring key. RLS is row-level only and
-- cannot hide columns, so a candidato row-SELECT on this table would leak the key
-- (a candidate could reverse-engineer which items reverse → fake a profile).
-- Therefore bigfive_itens has NO candidato SELECT policy. The candidate reads items
-- ONLY via the SECURITY DEFINER function get_bigfive_itens(), which projects ONLY
-- (item_id, texto, ordem) — never dimensao/faceta/reverse_keyed. The scorer
-- (submit-bigfive-final / _shared/bigfive-scoring.ts) re-derives the key server-side.
-- Mirrors the Phase-11 get_opcoes_sjt() pattern.
--
-- LGPD-04: all 120 seed texts are neutral behavioral self-descriptions; none use the
-- product copy banned by RNF-12 (the clinical-label terms). The forbidden-strings
-- grep guard scans supabase/migrations.
--
-- NOTE: No explicit `BEGIN; ... COMMIT;` wrapper (D-22 — CLAUDE.md §Commands). The
-- Supabase CLI driver wraps each migration in its own implicit transaction; an outer
-- BEGIN/COMMIT combined with DDL + adjacent GRANT/policy + a $$ function body breaks
-- the prepared-statement boundary parser and raises SQLSTATE 42601 at push time.
-- This file has one $$ body (get_bigfive_itens) + adjacent GRANT/REVOKE → it is a
-- 42601-risk push; if `db push --linked` trips, apply via the D-22 SQL-Editor /
-- Supabase MCP execute_sql workaround + `migration repair --status applied`.
-- NOT applied here — application is the [BLOCKING] 12-06 apply wave (CONTEXT).
-- =============================================================================

-- IPIP-NEO-120 item bank (NEW table) --------------------------------------------
CREATE TABLE public.bigfive_itens (
  item_id       int PRIMARY KEY,                                  -- 1..120 (canonical Johnson numbering)
  texto         text NOT NULL,
  dimensao      char(1) NOT NULL CHECK (dimensao IN ('O','C','E','A','N')),  -- SCORING KEY
  faceta        int NOT NULL CHECK (faceta BETWEEN 1 AND 30),                -- SCORING KEY
  reverse_keyed boolean NOT NULL,                                            -- SCORING KEY
  ordem         int NOT NULL,                                     -- presentation order (= item_id for V1)
  created_at    timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.bigfive_itens IS
  'Phase 12 / AVAL-04: IPIP-NEO-120 PT-BR item bank. dimensao/faceta/reverse_keyed ARE the scoring key — they must NEVER reach the candidato. NO candidato SELECT policy; the candidate reads items ONLY via get_bigfive_itens() (projects item_id+texto+ordem). The scorer re-derives the key server-side ([[reference_select_star_leaks_pii]]).';

CREATE INDEX idx_bigfive_itens_ordem ON public.bigfive_itens (ordem);

ALTER TABLE public.bigfive_itens ENABLE ROW LEVEL SECURITY;

-- RH/admin manage (live idiom — 'administrador', never 'admin'). NO candidato SELECT
-- policy → the scoring key never leaks to the candidato (read only via the RPC).
DROP POLICY IF EXISTS rh_gerencia_bigfive_itens ON public.bigfive_itens;
CREATE POLICY rh_gerencia_bigfive_itens ON public.bigfive_itens
  FOR ALL
  USING ((select auth.jwt() #>> '{app_metadata,role}') IN ('rh', 'administrador'))
  WITH CHECK ((select auth.jwt() #>> '{app_metadata,role}') IN ('rh', 'administrador'));

-- =============================================================================
-- SEED — all 120 IPIP-NEO-120 PT-BR items.
-- texto from ipip-neo-120-questions-pt-br.json; dimensao/faceta from
-- faceta=((id-1)%30)+1 + FACET_TO_DOMAIN (PESQUISA L342-348); reverse_keyed = id in
-- the 55-id set (PESQUISA L289-294). Seed count MUST be 120, reverse_keyed=true = 55
-- (the 12-SMOKES apply-wave check asserts both).
-- =============================================================================
INSERT INTO public.bigfive_itens (item_id, texto, dimensao, faceta, reverse_keyed, ordem) VALUES
  (1, 'Me preocupo com as coisas.', 'N', 1, false, 1),
  (2, 'Faço amigos com facilidade.', 'E', 2, false, 2),
  (3, 'Tenho imaginação vívida.', 'O', 3, false, 3),
  (4, 'Confio nos outros.', 'A', 4, false, 4),
  (5, 'Completo as tarefas que me são passadas.', 'C', 5, false, 5),
  (6, 'Me irrito facilmente.', 'N', 6, false, 6),
  (7, 'Amo festas grandes.', 'E', 7, false, 7),
  (8, 'Acredito na importância da arte.', 'O', 8, false, 8),
  (9, 'Uso os outros para alcançar meus objetivos.', 'A', 9, true, 9),
  (10, 'Gosta de organizar as coisas.', 'C', 10, false, 10),
  (11, 'Costumo me sentir desanimado(a).', 'N', 11, false, 11),
  (12, 'Assumo a liderança.', 'E', 12, false, 12),
  (13, 'Expresso minhas emoções intensamente.', 'O', 13, false, 13),
  (14, 'Gosto de ajudar os outros.', 'A', 14, false, 14),
  (15, 'Mantenho minhas promessas.', 'C', 15, false, 15),
  (16, 'Tenho dificuldade de me aproximar dos outros.', 'N', 16, false, 16),
  (17, 'Estou sempre ocupado(a).', 'E', 17, false, 17),
  (18, 'Prefiro variedade à rotina.', 'O', 18, false, 18),
  (19, 'Adoro uma boa luta.', 'A', 19, true, 19),
  (20, 'Trabalho duro.', 'C', 20, false, 20),
  (21, 'Cometo exageros.', 'N', 21, false, 21),
  (22, 'Busco adrenalina.', 'E', 22, false, 22),
  (23, 'Gosto de ler textos desafiadores.', 'O', 23, false, 23),
  (24, 'Acredito ser melhor que os outros.', 'A', 24, true, 24),
  (25, 'Estou sempre preparado.', 'C', 25, false, 25),
  (26, 'Entro em pânico facilmente.', 'N', 26, false, 26),
  (27, 'Irradio alegria.', 'E', 27, false, 27),
  (28, 'Tendo a votar em candidatos progressistas.', 'O', 28, false, 28),
  (29, 'Me preocupo com os desabrigados.', 'A', 29, false, 29),
  (30, 'Faço sem pensar.', 'C', 30, true, 30),
  (31, 'Temo o pior.', 'N', 1, false, 31),
  (32, 'Me sinto confortável no meio das pessoas.', 'E', 2, false, 32),
  (33, 'Adoro histórias fantásticas.', 'O', 3, false, 33),
  (34, 'Acredito que os outros são bem intencionados.', 'A', 4, false, 34),
  (35, 'Sou muito bom no que faço(a).', 'C', 5, false, 35),
  (36, 'Me irrito facilmente.', 'N', 6, false, 36),
  (37, 'Converso com muitas pessoas diferentes em festas.', 'E', 7, false, 37),
  (38, 'Vejo beleza em coisas que os outros não vêem.', 'O', 8, false, 38),
  (39, 'Trapaceio para tirar vantagem.', 'A', 9, true, 39),
  (40, 'Frequentemente esqueço de colocar as coisas de volta em seu lugar.', 'C', 10, true, 40),
  (41, 'Não gosto de mim.', 'N', 11, false, 41),
  (42, 'Tento liderar os outros.', 'E', 12, false, 42),
  (43, 'Sinto as emoções dos outros.', 'O', 13, false, 43),
  (44, 'Me preocupo com os outros.', 'A', 14, false, 44),
  (45, 'Digo a verdade.', 'C', 15, false, 45),
  (46, 'Tenho medo de chamar a atenção.', 'N', 16, false, 46),
  (47, 'Estou sempre preparado(a).', 'E', 17, false, 47),
  (48, 'Prefiro fazer apenas o que sei.', 'O', 18, true, 48),
  (49, 'Grito com os outros.', 'A', 19, true, 49),
  (50, 'Supero as expectativas.', 'C', 20, false, 50),
  (51, 'Dificilmente exagero.', 'N', 21, true, 51),
  (52, 'Busco aventura.', 'E', 22, false, 52),
  (53, 'Evito discussões filosóficas.', 'O', 23, true, 53),
  (54, 'Me tenho em grande estima.', 'A', 24, true, 54),
  (55, 'Transformo meus planos em realidade.', 'C', 25, false, 55),
  (56, 'Me sinto sobrecarregado em eventos.', 'N', 26, false, 56),
  (57, 'Me divirto bastante.', 'E', 27, false, 57),
  (58, 'Acredito que certo e errado são relativos.', 'O', 28, false, 58),
  (59, 'Sinto pena dos que são piores do que eu.', 'A', 29, false, 59),
  (60, 'Tomo decisões difíceis.', 'C', 30, true, 60),
  (61, 'Tenho medo de muitas coisas.', 'N', 1, false, 61),
  (62, 'Evito encontrar outras pessoas.', 'E', 2, true, 62),
  (63, 'Amo ficar no mundo da lua.', 'O', 3, false, 63),
  (64, 'Confio no que dizem.', 'A', 4, false, 64),
  (65, 'Executo as tarefas sem maiores problemas.', 'C', 5, false, 65),
  (66, 'Perco a cabeça.', 'N', 6, false, 66),
  (67, 'Prefiro ficar sozinho(a).', 'E', 7, true, 67),
  (68, 'Não gosto de poesia.', 'O', 8, true, 68),
  (69, 'Tiro vantagem dos outros.', 'A', 9, true, 69),
  (70, 'Meu quarto é uma bagunça.', 'C', 10, true, 70),
  (71, 'Estou sempre deprimido.', 'N', 11, false, 71),
  (72, 'Assumo controle das coisas.', 'E', 12, false, 72),
  (73, 'Raramente percebo minha própria reação emocional.', 'O', 13, true, 73),
  (74, 'Sou indiferente ao sentimento dos outros.', 'A', 14, true, 74),
  (75, 'Quebro as regras.', 'C', 15, true, 75),
  (76, 'Só me sinto bem com meus amigos(as).', 'N', 16, false, 76),
  (77, 'Faço muitas coisas no tempo livre.', 'E', 17, false, 77),
  (78, 'Sou avesso a mudanças.', 'O', 18, true, 78),
  (79, 'Insulto os outros.', 'A', 19, true, 79),
  (80, 'Faço apenas o necessário.', 'C', 20, true, 80),
  (81, 'Resisto a tentações facilmente.', 'N', 21, true, 81),
  (82, 'Gosto de ser inconsequente.', 'E', 22, false, 82),
  (83, 'Tenho dificuldade com ideias abstratas.', 'O', 23, true, 83),
  (84, 'Me considero muito bom(boa).', 'A', 24, true, 84),
  (85, 'Fico perdendo tempo.', 'C', 25, true, 85),
  (86, 'Acho que sou incapaz de lidar com as coisas.', 'N', 26, false, 86),
  (87, 'Amo a vida.', 'E', 27, false, 87),
  (88, 'Tende a votar em políticos conservadores.', 'O', 28, true, 88),
  (89, 'Não me interesso pelos problemas dos outros.', 'A', 29, true, 89),
  (90, 'Já saio fazendo.', 'C', 30, true, 90),
  (91, 'Me irrito facilmente.', 'N', 1, false, 91),
  (92, 'Mantenho distância dos outros.', 'E', 2, true, 92),
  (93, 'Me perco nos pensamentos.', 'O', 3, false, 93),
  (94, 'Desconfio das pessoas.', 'A', 4, true, 94),
  (95, 'Sei como fazer as coisas.', 'C', 5, false, 95),
  (96, 'Não sou incomodado facilmente.', 'N', 6, true, 96),
  (97, 'Evito multidões.', 'E', 7, true, 97),
  (98, 'Não gosto de ir ao museu de arte.', 'O', 8, true, 98),
  (99, 'Atrapalho os planos dos outros.', 'A', 9, true, 99),
  (100, 'Deixo minhas coisas espalhadas.', 'C', 10, true, 100),
  (101, 'Me sinto confortável comigo.', 'N', 11, true, 101),
  (102, 'Aguardo outras pessoas tomarem a liderança.', 'E', 12, true, 102),
  (103, 'Não entendo pessoas que agem emocionalmente.', 'O', 13, true, 103),
  (104, 'Não tiro tempo para os outros.', 'A', 14, true, 104),
  (105, 'Quebro minhas promessas.', 'C', 15, true, 105),
  (106, 'Não sou incomodado(a) por situações sociais difíceis.', 'N', 16, true, 106),
  (107, 'Gosto de pegar leve.', 'E', 17, true, 107),
  (108, 'Sou tradicional.', 'O', 18, true, 108),
  (109, 'Entro em contato com os outros.', 'A', 19, true, 109),
  (110, 'Dedico pouco tempo e esforço no meu trabalho.', 'C', 20, true, 110),
  (111, 'Controlo minhas vontades.', 'N', 21, true, 111),
  (112, 'Ajo de forma descontrolada.', 'E', 22, false, 112),
  (113, 'Não me interesso por discussões teóricas.', 'O', 23, true, 113),
  (114, 'Gosto de falar das minhas virtudes.', 'A', 24, true, 114),
  (115, 'Tenho dificuldade para começar as tarefas.', 'C', 25, true, 115),
  (116, 'Fico calmo(a) sob pressão.', 'N', 26, true, 116),
  (117, 'Vejo o lado bom da vida.', 'E', 27, false, 117),
  (118, 'Acredito que precisamos ser rígidos com o crime.', 'O', 28, true, 118),
  (119, 'Tento não pensar nos necessitados.', 'A', 29, true, 119),
  (120, 'Ajo sem pensar.', 'C', 30, true, 120);

-- =============================================================================
-- Answer-key-safe item reader for the candidate (mirror get_opcoes_sjt) --------
-- SECURITY DEFINER so it can read bigfive_itens (which the candidato cannot
-- row-SELECT). Projects ONLY item_id + texto + ordem — NEVER dimensao/faceta/
-- reverse_keyed (the scoring key). Returned in presentation order.
-- =============================================================================
CREATE OR REPLACE FUNCTION public.get_bigfive_itens()
RETURNS TABLE (item_id int, texto text, ordem int)
LANGUAGE sql
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT b.item_id, b.texto, b.ordem
    FROM public.bigfive_itens b
   ORDER BY b.ordem;
$$;

REVOKE ALL ON FUNCTION public.get_bigfive_itens() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_bigfive_itens() TO authenticated;
