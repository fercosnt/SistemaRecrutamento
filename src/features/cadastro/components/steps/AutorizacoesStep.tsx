/**
 * Step 4: Autorizações LGPD
 *
 * Campos:
 * - Autorização de Uso de Dados (obrigatório)
 * - Autorização de Comunicação (opcional)
 * - Autorização de Retenção de Currículo (opcional)
 * - Autorização de Análise de Vídeo-entrevistas (opcional)
 *
 * Phase 2 Plan 02-06 (D-15 / D-16 UI compliance):
 * - Layout stacked-cards com a row obrigatória emphasizada (blue tint + Shield
 *   icon + "Obrigatório" badge + red asterisk).
 * - POLICY_VERSION caption abaixo do link "Política de Privacidade" e no banner
 *   LGPD (rastreabilidade da versão da política no momento do consentimento).
 * - Microcopy UI-SPEC § LGPD Checkbox Labels & Descriptions — usa linguagem
 *   "avaliação comportamental e de comunicação" per CLAUDE.md + PROJECT.md
 *   constraint (evita terminologia de inteligência-artificial ou psicométrica).
 * - `<fieldset><legend class="sr-only">Autorizações LGPD</legend>` para screen
 *   readers (UI-SPEC a11y).
 *
 * IMPORTANTE: De acordo com a LGPD, todos os consentimentos devem ser:
 * - Informados (explica para que serve)
 * - Inequívocos (claramente marcados)
 * - Específicos (separados por finalidade)
 * - Revogáveis (pode ser alterado depois)
 */

import React from 'react'
import { useFormContext, Controller } from 'react-hook-form'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Info, Shield } from 'lucide-react'
import type { CandidatoFormData } from '../../types'
import { POLICY_VERSION } from '../../constants'

interface AutorizacaoItem {
  name: keyof CandidatoFormData['autorizacoes']
  label: string
  description: string
  required: boolean
  icon?: React.ReactNode
}

const AUTORIZACOES: AutorizacaoItem[] = [
  {
    name: 'autorizacao_uso_dados',
    label: 'Autorizo o uso dos meus dados',
    description:
      'Concordo que a Beauty Smile armazene e utilize meus dados pessoais para participação no processo seletivo. Sem esta autorização não é possível criar a conta.',
    required: true,
    icon: <Shield className="h-4 w-4" aria-hidden="true" />,
  },
  {
    name: 'autorizacao_comunicacao',
    label: 'Autorizo receber comunicações',
    description:
      'Concordo em receber emails e notificações sobre o andamento do processo seletivo e novas oportunidades de vagas da Beauty Smile.',
    required: false,
  },
  {
    name: 'autorizacao_retencao_curriculo',
    label: 'Autorizo manter meu currículo',
    description:
      'Concordo que a Beauty Smile mantenha meu currículo em banco de dados por até 2 anos para futuras oportunidades, mesmo que eu não seja selecionado(a) no processo atual.',
    required: false,
  },
  {
    name: 'autorizacao_analise_video',
    label: 'Autorizo análise de vídeo-entrevistas',
    description:
      'Concordo que minhas entrevistas em vídeo sejam gravadas e analisadas para avaliação comportamental e de comunicação.',
    required: false,
  },
]

export function AutorizacoesStep() {
  const {
    control,
    formState: { errors },
  } = useFormContext<CandidatoFormData>()

  return (
    <div className="space-y-6">
      {/* Banner LGPD (topo) */}
      <Alert className="bg-blue-500/10 border-blue-400/30 text-white">
        <Info className="h-5 w-5 text-blue-400" aria-hidden="true" />
        <AlertDescription className="text-white/90 ml-2">
          <strong>Lei Geral de Proteção de Dados (LGPD)</strong>
          <br />
          Seus dados pessoais são protegidos por lei. Você tem o direito de
          acessar, corrigir, excluir ou revogar qualquer autorização a qualquer
          momento através do nosso portal ou entrando em contato com a empresa.
        </AlertDescription>
      </Alert>

      {/*
        Lista de Autorizações — UI-SPEC § LGPD Checkboxes Layout (Stacked Cards).
        fieldset + sr-only legend satisfaz o contrato de a11y (UI-SPEC § Screen
        Reader Specific) sem alterar o visual.
      */}
      <fieldset className="space-y-6 border-0 p-0 m-0">
        <legend className="sr-only">Autorizações LGPD</legend>
        {AUTORIZACOES.map((item) => (
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
                  {/* Checkbox */}
                  <Checkbox
                    id={item.name}
                    checked={field.value}
                    onCheckedChange={field.onChange}
                    aria-required={item.required ? 'true' : 'false'}
                    className="bg-white/20 border-white/30 data-[state=checked]:bg-[#00109E] data-[state=checked]:border-[#00109E] mt-1"
                  />

                  {/* Conteúdo */}
                  <div className="flex-1 space-y-2">
                    {/* Label com ícone */}
                    <div className="flex items-center gap-2">
                      {item.icon && (
                        <span className="text-blue-400">{item.icon}</span>
                      )}
                      <Label
                        htmlFor={item.name}
                        className="text-white font-semibold cursor-pointer"
                      >
                        {item.label}
                        {item.required && (
                          <span className="text-red-400 ml-1">*</span>
                        )}
                      </Label>
                    </div>

                    {/* Descrição */}
                    <p className="text-white/70 text-sm leading-relaxed">
                      {item.description}
                    </p>

                    {/* Badge de obrigatório */}
                    {item.required && (
                      <div className="inline-flex items-center gap-1.5 px-2 py-1 bg-blue-500/20 rounded text-xs text-blue-300 font-semibold">
                        <Shield className="w-3 h-3" aria-hidden="true" />
                        Obrigatório
                      </div>
                    )}

                    {/* Erro de validação */}
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
        ))}
      </fieldset>

      {/* Footer informativo */}
      <div className="pt-4 space-y-3">
        <p className="text-white/80 text-sm">
          <strong>Seus direitos:</strong>
        </p>
        <ul className="text-white/70 text-sm space-y-2 list-disc list-inside">
          <li>Acessar seus dados a qualquer momento</li>
          <li>Solicitar correção de dados incorretos</li>
          <li>Solicitar exclusão dos seus dados (direito ao esquecimento)</li>
          <li>Revogar qualquer autorização</li>
          <li>Solicitar portabilidade dos seus dados</li>
        </ul>
        <p className="text-white/70 text-xs pt-2">
          Para exercer seus direitos ou esclarecer dúvidas, entre em contato
          com nosso Encarregado de Dados através do email:{' '}
          <a
            href="mailto:lgpd@beautysmile.com.br"
            className="text-blue-400 hover:text-blue-300 underline"
          >
            lgpd@beautysmile.com.br
          </a>
        </p>
        {/* D-16: versão da política visível ao usuário */}
        <p className="text-white/70 text-sm mt-2">
          Esta política está na versão <strong>{POLICY_VERSION}</strong>.
        </p>
      </div>

      {/* Aviso final + link "Política de Privacidade" + POLICY_VERSION caption */}
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
          <span className="text-white/70 text-xs">Versão {POLICY_VERSION}</span>
        </AlertDescription>
      </Alert>
    </div>
  )
}
