/**
 * Step 5: Autorizações LGPD
 *
 * Campos:
 * - Autorização de Uso de Dados (obrigatório)
 * - Autorização de Comunicação
 * - Autorização de Retenção de Currículo
 * - Autorização de Análise de Vídeo
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
    label: 'Autorizo o uso dos meus dados pessoais',
    description:
      'Concordo que a Beauty Smile armazene e utilize meus dados pessoais para fins de participação no processo seletivo. Sem esta autorização não é possível prosseguir com a candidatura.',
    required: true,
    icon: <Shield className="w-5 h-5" />,
  },
  {
    name: 'autorizacao_comunicacao',
    label: 'Autorizo o recebimento de comunicações',
    description:
      'Concordo em receber emails e notificações sobre o andamento do processo seletivo, novas oportunidades de vagas e informações relevantes da empresa.',
    required: false,
  },
  {
    name: 'autorizacao_retencao_curriculo',
    label: 'Autorizo a retenção do meu currículo',
    description:
      'Concordo que a Beauty Smile mantenha meu currículo em banco de dados por até 2 anos para futuras oportunidades, mesmo que não seja selecionado(a) no processo atual.',
    required: false,
  },
  {
    name: 'autorizacao_analise_video',
    label: 'Autorizo a análise de vídeo-entrevistas',
    description:
      'Concordo que minhas entrevistas em vídeo sejam gravadas e analisadas por sistemas automatizados de IA para avaliação de perfil comportamental e comunicação.',
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
      {/* Header explicativo */}
      <Alert className="bg-blue-500/10 border-blue-400/30 text-white">
        <Info className="h-5 w-5 text-blue-400" />
        <AlertDescription className="text-white/90 ml-2">
          <strong>Lei Geral de Proteção de Dados (LGPD)</strong>
          <br />
          Seus dados pessoais são protegidos por lei. Você tem o direito de
          acessar, corrigir, excluir ou revogar qualquer autorização a qualquer
          momento através do nosso portal ou entrando em contato com a empresa.
        </AlertDescription>
      </Alert>

      {/* Lista de Autorizações */}
      <div className="space-y-6">
        {AUTORIZACOES.map((item) => (
          <Controller
            key={item.name}
            name={`autorizacoes.${item.name}`}
            control={control}
            render={({ field }) => (
              <div
                className={`p-5 rounded-lg ${
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
                      <div className="inline-flex items-center gap-1.5 px-2 py-1 bg-blue-500/20 rounded text-xs text-blue-300 font-medium">
                        <Shield className="w-3 h-3" />
                        Obrigatório
                      </div>
                    )}

                    {/* Erro de validação */}
                    {errors.autorizacoes?.[item.name] && (
                      <p className="text-red-400 text-sm font-medium">
                        {errors.autorizacoes[item.name]?.message}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            )}
          />
        ))}
      </div>

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
        <p className="text-white/60 text-xs pt-2">
          Para exercer seus direitos ou esclarecer dúvidas, entre em contato
          com nosso Encarregado de Dados através do email:{' '}
          <a
            href="mailto:lgpd@beautysmile.com.br"
            className="text-blue-400 hover:text-blue-300 underline"
          >
            lgpd@beautysmile.com.br
          </a>
        </p>
      </div>

      {/* Aviso final */}
      <Alert className="bg-amber-500/10 border-amber-400/30 text-white">
        <Info className="h-5 w-5 text-amber-400" />
        <AlertDescription className="text-white/90 ml-2">
          Ao finalizar o cadastro, você confirma que leu e compreendeu todas as
          autorizações acima e concorda com a{' '}
          <button
            type="button"
            className="text-blue-400 hover:text-blue-300 underline font-medium"
            onClick={() => window.open('/politica-privacidade', '_blank')}
          >
            Política de Privacidade
          </button>{' '}
          da Beauty Smile.
        </AlertDescription>
      </Alert>
    </div>
  )
}
