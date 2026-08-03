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
 * sessionStorage key for the cadastro draft. O sufixo de versão é o mecanismo de
 * invalidação previsto desde a Phase 2 (D-13): bumpar a chave descarta rascunhos
 * cuja FORMA não existe mais.
 *
 * ⚠ BUMPADO PARA `v2` NA PHASE 43. O formulário mudou de forma: as autorizações
 * passaram de 4 chaves para 3 (`autorizacao_comunicacao` e
 * `autorizacao_analise_video` saíram — CONSENT-03 / BD-2) e
 * `autorizacao_marketing_vagas` ENTROU.
 *
 * ⚠ O SINTOMA É DO CLIENTE, NÃO DO SERVIDOR (code review IN-02). Uma versão anterior
 * deste comentário dizia que o envio bateria `400 VALIDATION` no `.strict()` do
 * servidor — e esse caminho é INALCANÇÁVEL: `handleFormSubmit` envia
 * `result.data.autorizacoes` de um `candidatoFormSchema.safeParse` NÃO-estrito, e o
 * Zod REMOVE as chaves desconhecidas antes de a requisição existir
 * (`CadastroMultiStepForm.tsx` → `cadastroService.ts`). As chaves velhas nunca
 * chegariam a viajar. Deixar a afirmação de pé seria pior que apagá-la: ela seria
 * citada depois como evidência sobre o contrato do servidor.
 *
 * O que um rascunho velho DE FATO produz é a falta de `autorizacao_marketing_vagas`,
 * que reprova na validação do CLIENTE — mensagem genérica de "há erros no
 * formulário", sobre um campo que a pessoa nunca viu porque o rascunho a devolveu
 * adiante dele. Falha opaca causada por um estado que ela não escolheu e não
 * consegue enxergar.
 *
 * Descartar o rascunho custa um formulário refeito; não descartar custa um
 * cadastro que não completa e ninguém sabe por quê. O bump está certo; a razão
 * escrita é que estava errada.
 */
export const CADASTRO_DRAFT_KEY = 'cadastro:draft:v2' as const
