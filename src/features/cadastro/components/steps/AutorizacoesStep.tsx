/**
 * Step 4: Autorizações do cadastro (LGPD)
 *
 * Phase 43 (CONSENT-01/02/03/05) — reescrito segundo a 43-UI-SPEC §AutorizacoesStep.
 * QUATRO blocos onde antes havia cinco:
 *   1. Uso de dados — obrigatório, checkbox, gate de submit (D-15)
 *   2. Avisos do processo — INFORMATIVO, sem controle nenhum (canal transacional)
 *   3. Divulgação de vagas — opcional, checkbox, desmarcado por padrão
 *   4. Guarda do currículo — opcional, checkbox, desmarcado por padrão
 *
 * ⚠ A COPY NÃO MORA NESTE ARQUIVO. Rótulos e descrições vêm do
 * `supabase/functions/_shared/consent-text.json`, que é a MESMA fonte que a Edge
 * Function `cadastrar-candidato` lê para calcular o SHA-256 gravado em
 * `public.autorizacoes.consent_text_hash`. Redigitar o texto aqui — ainda que
 * "igualzinho" — cria uma segunda verdade que diverge em silêncio na primeira
 * edição, e a linha gravada passa a afirmar que a pessoa leu um texto que ela
 * nunca viu. A afirmação falsa fica indistinguível da verdadeira: é o defeito
 * exato que o CONSENT-02 existe para tornar impossível.
 *
 * ⚠ O BLOCO 2 NÃO É UM CONTROLE, E ISSO É DELIBERADO. O canal transacional tem
 * base legal no Art. 7º, V (execução de procedimentos preliminares ao contrato),
 * não no consentimento do titular. Renderizá-lo como checkbox ou switch — um
 * controle que a pessoa não pode desligar — apresentaria como escolha algo que
 * não é escolha: a forma mais pura do dark pattern que este milestone existe para
 * curar (43-UI-SPEC, Invariante 3). Um leitor de tela tem de ouvir INFORMAÇÃO,
 * não "checkbox, desabilitado". Por isso: sem `Checkbox`, sem `Switch`, sem
 * `aria-checked`, sem `aria-disabled`, sem `<input disabled>`.
 *
 * ⚠ NADA NASCE MARCADO. Os `defaultValues` das três chaves são `false`
 * (`CADASTRO_DEFAULT_VALUES`). Um checkbox pré-marcado faria "a pessoa marcou" e
 * "a pessoa não desmarcou" gravarem a mesma linha — consentimento que não é
 * inequívoco (LGPD, Art. 5º, XII).
 *
 * ⚠ O BLOCO DE ANÁLISE DE VÍDEO SAIU INTEIRO (BD-2 / CONSENT-05), sem copy
 * substituta e sem nota explicativa: o sistema não faz essa análise, então não há
 * o que dizer ao candidato. A coluna permanece no banco com `COMMENT` — registro
 * técnico, não superfície.
 *
 * @see .planning/phases/43-consentimentos-honestos-pol-tica-de-reten-o/43-UI-SPEC.md
 */

import React from 'react'
import { useFormContext, Controller } from 'react-hook-form'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Info, Shield } from 'lucide-react'
import type { CandidatoFormData } from '../../types'
import { POLICY_VERSION, CONSENT_TEXT_VERSION } from '../../constants'
import consentText from '../../../../../supabase/functions/_shared/consent-text.json'

type ChaveAutorizacao = keyof CandidatoFormData['autorizacoes']

interface AutorizacaoItem {
  name: ChaveAutorizacao
  label: string
  description: string
  required: boolean
  icon?: React.ReactNode
}

/**
 * Os itens renderizados. `label` e `description` são LIDOS do arquivo de texto
 * único — este array carrega apenas o que é decisão de RENDERIZAÇÃO (ícone,
 * obrigatoriedade), nunca o texto em si.
 */
const AUTORIZACOES: AutorizacaoItem[] = consentText.consentimentos.map((c) => ({
  name: c.id as ChaveAutorizacao,
  label: c.rotulo,
  description: c.descricao,
  required: c.obrigatorio,
  icon: c.obrigatorio ? <Shield className="h-4 w-4" aria-hidden="true" /> : undefined,
}))

const OBRIGATORIAS = AUTORIZACOES.filter((a) => a.required)
const OPCIONAIS = AUTORIZACOES.filter((a) => !a.required)

const TRANSACIONAL = consentText.informativo_transacional

export function AutorizacoesStep() {
  const {
    control,
    formState: { errors },
  } = useFormContext<CandidatoFormData>()

  const renderCartao = (item: AutorizacaoItem) => (
    <Controller
      key={item.name}
      name={`autorizacoes.${item.name}`}
      control={control}
      render={({ field }) => (
        <div
          className={`p-5 rounded-lg space-y-2 ${
            item.required
              ? 'bg-blue-500/10 border-2 border-blue-400/30'
              : 'bg-white/5 border border-white/10'
          }`}
        >
          <div className="flex items-start space-x-4">
            <Checkbox
              id={item.name}
              checked={field.value}
              onCheckedChange={field.onChange}
              aria-required={item.required ? 'true' : 'false'}
              className="bg-white/20 border-white/30 data-[state=checked]:bg-[#00109E] data-[state=checked]:border-[#00109E] mt-1"
            />

            <div className="flex-1 space-y-2">
              <div className="flex items-center gap-2">
                {item.icon && <span className="text-blue-400">{item.icon}</span>}
                <Label
                  htmlFor={item.name}
                  className="text-white font-semibold cursor-pointer"
                >
                  {/*
                    O rótulo vive num elemento PRÓPRIO, sem o asterisco dentro:
                    o teste de identidade compara a string COMPLETA contra o
                    arquivo, e um `*` grudado no textContent faria a comparação
                    exigir um texto que o arquivo não tem.
                  */}
                  <span data-testid={`consent-label-${item.name}`}>{item.label}</span>
                  {item.required && <span className="text-red-400 ml-1">*</span>}
                </Label>
              </div>

              {/*
                `text-base` (16px), não `text-sm`: esta descrição é leitura de
                carga E é o texto cujo hash é gravado. Encolher a prova é
                encolher a chance de ela ser lida.
              */}
              <p
                data-testid={`consent-desc-${item.name}`}
                className="text-white/70 text-base leading-relaxed"
              >
                {item.description}
              </p>

              {item.required && (
                <div className="inline-flex items-center gap-1.5 px-2 py-1 bg-blue-500/20 rounded text-xs text-blue-300 font-semibold">
                  <Shield className="w-3 h-3" aria-hidden="true" />
                  Obrigatório
                </div>
              )}

              {errors.autorizacoes?.[item.name] && (
                <p className="text-red-400 text-sm" role="alert">
                  {errors.autorizacoes[item.name]?.message}
                </p>
              )}
            </div>
          </div>
        </div>
      )}
    />
  )

  return (
    <div className="space-y-6">
      {/*
        Banner LGPD — reescrito (Invariante 1). A frase anterior prometia um
        "portal" com quatro verbos que não existe. Prometer mecanismo inexistente
        na tela do consentimento é a mentira mais cara possível: ela é lida
        exatamente no momento em que a pessoa decide confiar.
      */}
      <Alert className="bg-blue-500/10 border-blue-400/30 text-white">
        <Info className="h-5 w-5 text-blue-400" aria-hidden="true" />
        {/*
          ⚠ Os dois <p> NAO sao cosmetica: `AlertDescription` e
          `grid justify-items-start gap-1` (ui/alert.tsx), entao CADA FILHO vira uma
          LINHA do grid. Com nos soltos — <strong>, <br />, texto, <strong>, "." — a
          frase quebrava em cinco linhas e o ponto final aparecia SOZINHO na ultima,
          numa tela cujo assunto e justamente clareza. Observado em producao em
          2026-08-03.
          Envolver em <p> devolve o fluxo inline (um <p> = um item de grid) e ativa o
          `[&_p]:leading-relaxed` que o proprio componente ja declara — ou seja, <p>
          sempre foi o filho que ele esperava. O `gap-1` do grid substitui o <br />.
        */}
        <AlertDescription className="text-white/90 ml-2">
          <p>
            <strong>Lei Geral de Proteção de Dados (LGPD)</strong>
          </p>
          <p>
            Seus dados pessoais são protegidos por lei. Depois de criar sua conta,
            você pode ver e mudar suas autorizações quando quiser, na página{' '}
            <strong>Seus dados e autorizações</strong>.
          </p>
        </AlertDescription>
      </Alert>

      {/* Bloco 1 — obrigatório. Âncora visual da tela, FORA do fieldset de escolhas. */}
      {OBRIGATORIAS.map(renderCartao)}

      {/*
        Bloco 2 — canal transacional. INFORMAÇÃO, não opção (ver ⚠ no topo).
        Nenhum elemento aqui dentro pode ser um controle.
      */}
      <div
        data-testid="transacional-informativo"
        className="p-5 rounded-lg space-y-2 bg-blue-500/10 border border-blue-400/30"
      >
        <div className="flex items-start space-x-4">
          <Info className="h-4 w-4 text-blue-400 mt-1 shrink-0" aria-hidden="true" />
          <div className="flex-1 space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <span
                data-testid="transacional-rotulo"
                className="text-white font-semibold"
              >
                {TRANSACIONAL.rotulo}
              </span>
              {/*
                Estado em texto, 14px/600 — não é badge de alarme. A pessoa
                precisa saber que não dá para desligar, sem que isso pareça erro.
              */}
              <span
                data-testid="transacional-estado"
                className="text-white/70 text-sm font-semibold"
              >
                {TRANSACIONAL.estado}
              </span>
            </div>
            <p
              data-testid="transacional-descricao"
              className="text-white/70 text-base leading-relaxed"
            >
              {TRANSACIONAL.descricao}
            </p>
            <p data-testid="transacional-base-legal" className="text-white/60 text-sm">
              {TRANSACIONAL.base_legal}
            </p>
            {/*
              A fronteira é a linha que impede a assimetria de virar dark pattern:
              ela diz em voz alta que o canal SEM opt-out não é usado para aquilo
              que TEM opt-out. Sem ela, "não é possível desativar" ao lado de
              "avisos por e-mail" soaria como marketing obrigatório.
            */}
            <p
              data-testid="transacional-fronteira"
              className="text-white/70 text-sm leading-relaxed"
            >
              {TRANSACIONAL.fronteira}
            </p>
          </div>
        </div>
      </div>

      {/*
        Blocos 3 e 4 — as ESCOLHAS. O fieldset envolve apenas o que é escolha:
        agrupar o obrigatório ou o informativo aqui dentro faria o leitor de tela
        anunciar como "opcionais" coisas que não são.
      */}
      <fieldset className="space-y-6 border-0 p-0 m-0">
        <legend className="sr-only">Autorizações opcionais</legend>
        {OPCIONAIS.map(renderCartao)}
      </fieldset>

      {/* Rodapé — os direitos permanecem; o que muda é o CANAL, que antes mentia. */}
      <div className="pt-4 space-y-3">
        <p className="text-white/80 text-sm">
          <strong>Seus direitos:</strong>
        </p>
        <ul className="text-white/70 text-sm space-y-2 list-disc list-inside">
          <li>Acessar seus dados</li>
          <li>Solicitar correção de dados incorretos</li>
          {/*
            "(direito ao esquecimento)" saiu: não é o termo da LGPD — o Art. 18,
            VI fala em ELIMINAÇÃO — e importava conceito de outra jurisdição.
          */}
          <li>Solicitar a eliminação dos seus dados</li>
          <li>Revogar as autorizações opcionais</li>
          <li>Solicitar a portabilidade dos seus dados</li>
        </ul>
        <p className="text-white/70 text-sm pt-2">
          Hoje, revogar as autorizações opcionais você faz sozinho(a), na página{' '}
          <strong>Seus dados e autorizações</strong>. Para os demais direitos,
          escreva para o nosso canal de privacidade:{' '}
          <a
            href="mailto:lgpd@beautysmile.com.br"
            className="text-blue-400 hover:text-blue-300 underline"
          >
            lgpd@beautysmile.com.br
          </a>{' '}
          — respondemos por e-mail.
        </p>
        {/*
          DUAS versões, cada uma NOMEADA. São eixos independentes: a Política de
          Privacidade muda sem que o rótulo de um checkbox mude. Um "Versão X"
          solto ao lado de duas versões diferentes não identifica coisa nenhuma.
        */}
        <p data-testid="legenda-versoes" className="text-white/70 text-sm mt-2">
          Política de Privacidade na versão <strong>{POLICY_VERSION}</strong> · texto
          destas autorizações na versão <strong>{CONSENT_TEXT_VERSION}</strong>.
        </p>
      </div>

      {/* Aviso final — copy inalterada; só a legenda de versão passou a se nomear. */}
      <Alert className="bg-amber-500/10 border-amber-400/30 text-white">
        <Info className="h-5 w-5 text-amber-400" aria-hidden="true" />
        <AlertDescription className="text-white/90 ml-2">
          Ao finalizar o cadastro, você confirma que leu e compreendeu todas as
          autorizações acima e concorda com a{' '}
          <button
            type="button"
            className="text-blue-400 hover:text-blue-300 underline font-semibold"
            onClick={() => window.open('/politica-privacidade', '_blank')}
          >
            Política de Privacidade
          </button>{' '}
          da Beauty Smile.
          <br />
          <span data-testid="aviso-versao-politica" className="text-white/70 text-sm">
            Política de Privacidade, versão {POLICY_VERSION}
          </span>
        </AlertDescription>
      </Alert>
    </div>
  )
}
