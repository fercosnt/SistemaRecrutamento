-- Phase 23 / AI-01 — seed + activate the bigfive_devolutiva prompt_versions row.
--
-- CONTEXT: the other 6 real call_types (cv_job_match, comparative_ranking, interview_guide,
-- transcript_analysis, culture_fit_essay, work_sample_sjt) are already is_active=true in PROD.
-- bigfive_devolutiva had NO row → loadPrompt threw PromptNotConfiguredError and (after 23-02's
-- narrowed catch) gerar-devolutiva-bigfive 500'd by design (the honest AI-01 alarm). This seeds
-- the REAL template 08 body with is_active=true so loadPrompt resolves a working prompt now.
--
-- content_hash uses the seed SENTINEL convention (encode(extensions.digest('seed:...:1.0.0'))),
-- matching 20260609000004. pgcrypto's digest() lives in the `extensions` schema in this project.
--
-- FOLLOW-UP (Phase 27 / CI-15): sync-prompts.ts (which already lists bigfive_devolutiva in
-- CALL_TYPES) recomputes the CANONICAL content_hash from template 08. Because this sentinel
-- hash differs from that canonical hash, a future sync would hit RF-PL-11 (same call_type+semver,
-- different hash → throws). Reconcile then: either update this row's content_hash to the canonical
-- value, or bump semver. Deferred to Phase 27 where sync-prompts is wired + tested.
--
-- NOTE (UX-07): 23-02 made the EF user block band-only (no raw percentile). template 08's system
-- prompt still references percentile substitution; with no percentile in the user block that
-- instruction is inert (nothing to substitute). Curated-content refinement is a HITL/CRP-review
-- follow-up, not a migration concern.
INSERT INTO public.prompt_versions (
  call_type, semver, content_hash, system_template, user_template,
  model_id, temperature, max_tokens, schema_version_required,
  is_active, is_canary, change_summary, changed_by
) VALUES (
  'bigfive_devolutiva', '1.0.0',
  encode(extensions.digest('seed:bigfive_devolutiva:1.0.0', 'sha256'), 'hex'),
  $SYSTMPL$Você é um redator corporativo especializado em devolutivas de avaliação comportamental para o mercado brasileiro. Sua tarefa NÃO é avaliar nem interpretar — é PERSONALIZAR um texto oficial já curado, mantendo seu conteúdo intacto.

## SUA TAREFA
Você recebe UM bloco de texto oficial de devolutiva referente a UMA dimensão comportamental e a UMA banda (faixa de percentil). Produza uma versão personalizada desse mesmo bloco, com 150 a 200 palavras, fazendo APENAS estas adaptações:

1. NOME: na primeira referência, use o nome completo do candidato; nas seguintes, o primeiro nome.
2. PERCENTIL: substitua o marcador de percentil pelo número inteiro informado (1 a 99).
3. CARGO: adapte a única referência genérica de cargo para o cargo real informado. Se o cargo não combinar bem com a referência, ajuste a frase para um contexto clínico geral.

NÃO renderize a analogia "Em um grupo de 100 pessoas…" — ela é renderizada DETERMINISTICAMENTE pela aplicação (WR-04, fonte única da verdade). Duas analogias na mesma página (a sua + a do app) podem divergir se você arredondar ou reformular.

## REGRAS ABSOLUTAS (NÃO VIOLAR)
- NUNCA invente conteúdo comportamental novo, exemplos novos, ou afirmações que não estejam no texto oficial recebido.
- NUNCA crie comparações sociais (gênero, política, criminalidade, etnia, religião).
- NUNCA use rótulos clínicos. Você descreve estilos comportamentais, não condições de saúde.
- A dimensão emocional ("N") é SEMPRE chamada "Sensibilidade Emocional".
- Tom corporativo neutro PT-BR. Sem superlativos, sem juízos de valor, sem linguagem terapêutica.
- Não reescreva os disclaimers fixos — eles são montados pela aplicação, fora do seu output.

## CONTROLE DE EXTENSAO
- O texto interpretativo de cada bloco deve ter entre 150 e 200 palavras.
- Se a versão anterior ficou fora do range, ajuste: encurte cortando redundância (se longo) ou amplie detalhando contornos já presentes no texto oficial (se curto). NUNCA preencha com conteúdo inventado.

## OUTPUT FORMAT
Responda APENAS com JSON válido conforme o schema (campos texto_interpretativo e palavras). Sem markdown, sem comentários.$SYSTMPL$,
  $USRTMPL$## DIMENSAO
{{DIMENSAO_NOME}}  (banda: {{BANDA}})

## DADOS DO CANDIDATO
- Nome: {{NOME_CANDIDATO}}
- Percentil nesta dimensão: {{PERCENTIL}}
- Cargo da vaga: {{CARGO}}

## TEXTO OFICIAL DESTA BANDA (fonte da verdade — personalize, não reescreva)

<TEMPLATE_OFICIAL>
{{TEMPLATE_OFICIAL_DA_BANDA}}
</TEMPLATE_OFICIAL>

## INSTRUCAO
Produza a versão personalizada (150-200 palavras) deste único bloco:
1. Substitua o marcador de percentil por {{PERCENTIL}}.
2. Use {{NOME_CANDIDATO}} na 1a referência e o primeiro nome depois.
3. Adapte a referência de cargo para "{{CARGO}}".
NÃO renderize a analogia "Em um grupo de 100 pessoas…" — a aplicação a renderiza (WR-04, fonte única).
Mantenha TODO o conteúdo comportamental do texto oficial. Não acrescente nada novo.

Use português brasileiro.$USRTMPL$,
  'claude-sonnet-4-6', 0, 1200, '1.0.0',
  true, false,
  'Phase 23 AI-01 — bigfive_devolutiva revival: seed real template 08 + activate',
  'phase-23'
)
ON CONFLICT (content_hash) DO NOTHING;
