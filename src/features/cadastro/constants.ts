/**
 * Cadastro-feature constants shared across components, hooks, and services.
 *
 * IMPORTANT: POLICY_VERSION must match supabase/functions/_shared/constants.ts.
 * When bumping version, update BOTH files in the same commit and grep the repo
 * for the old value to catch stray references. (D-16, Phase 2)
 */

export const POLICY_VERSION = 'v1.0-2026-04' as const

/**
 * Versão do TEXTO DAS AUTORIZAÇÕES que o candidato lê no cadastro (CONSENT-02).
 *
 * IMPORTANT: must match supabase/functions/_shared/constants.ts. O par tem teste
 * de paridade em `./__tests__/consentTextFonteUnica.test.ts` — o par
 * `POLICY_VERSION` ficou 4 meses sem nenhum, e um espelho sem teste é um espelho
 * que já divergiu e ninguém sabe.
 *
 * ⚠ NUNCA REUSAR `POLICY_VERSION` AQUI. São eixos INDEPENDENTES: a Política de
 * Privacidade muda sem que o rótulo de um checkbox mude, e vice-versa. Reusar
 * faria uma edição de política cunhar versões falsas de consentimento — linhas
 * afirmando que a pessoa leu um texto novo que nunca existiu.
 *
 * ⚠ POR QUE `v2` E NÃO `v1`: nenhuma linha do banco jamais carregará `v1`. As
 * linhas pré-enforcement carregam NULL, e é o NULL que as torna separáveis por
 * dado (SC#1 da Phase 43). O rótulo `v1-historico` fica reservado como
 * identificador DOCUMENTAL do texto que aquelas linhas de fato viram, capturado
 * verbatim em `supabase/functions/_shared/consent-text.v1-historico.json`.
 *
 * Bumpar esta constante é OBRIGATÓRIO em qualquer edição de `consent-text.json`,
 * no MESMO commit e nos DOIS arquivos: a entrada do hash inclui a versão, então
 * editar a copy sem bumpar produz linhas cujo hash não corresponde a texto nenhum.
 */
export const CONSENT_TEXT_VERSION = 'v2-2026-08' as const

/**
 * sessionStorage key for the cadastro draft. Suffix `v1` allows future schema
 * migrations — bump to `v2` to automatically invalidate stale drafts. (D-13)
 */
export const CADASTRO_DRAFT_KEY = 'cadastro:draft:v1' as const
