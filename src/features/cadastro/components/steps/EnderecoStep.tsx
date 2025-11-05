/**
 * Step 2: Endereço
 *
 * Campos:
 * - CEP (com integração ViaCEP) ✅
 * - Logradouro (auto-preenchido)
 * - Número
 * - Complemento (opcional)
 * - Bairro (auto-preenchido)
 * - Cidade (auto-preenchida)
 * - Estado (auto-preenchido)
 */

import React from 'react'
import { useFormContext, Controller } from 'react-hook-form'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Loader2, CheckCircle2, AlertCircle } from 'lucide-react'
import { useViaCEP } from '../../hooks/useViaCEP'
import { mapViaCEPToForm } from '../../services/viaCepService'
import type { CandidatoFormData } from '../../types'

const ESTADOS_BRASILEIROS = [
  'AC',
  'AL',
  'AP',
  'AM',
  'BA',
  'CE',
  'DF',
  'ES',
  'GO',
  'MA',
  'MT',
  'MS',
  'MG',
  'PA',
  'PB',
  'PR',
  'PE',
  'PI',
  'RJ',
  'RN',
  'RS',
  'RO',
  'RR',
  'SC',
  'SP',
  'SE',
  'TO',
]

export function EnderecoStep() {
  const {
    control,
    formState: { errors },
    setValue,
    watch,
  } = useFormContext<CandidatoFormData>()

  // Observar campo CEP
  const cep = watch('endereco.cep')

  // Integração com ViaCEP
  const { data: viaCepData, loading: cepLoading, error: cepError } = useViaCEP(
    cep || '',
    {
      debounceMs: 500,
      onSuccess: (data) => {
        // Auto-preencher campos de endereço
        const formData = mapViaCEPToForm(data)
        setValue('endereco.logradouro', formData.logradouro)
        setValue('endereco.bairro', formData.bairro)
        setValue('endereco.cidade', formData.cidade)
        setValue('endereco.estado', formData.estado)

        // Focar no campo número após preencher
        setTimeout(() => {
          document.getElementById('numero')?.focus()
        }, 100)
      },
    }
  )

  /**
   * Handler para formatação de CEP
   */
  const handleCEPChange = (cep: string) => {
    // Formata CEP enquanto digita
    let formattedCEP = cep.replace(/\D/g, '')
    if (formattedCEP.length > 5) {
      formattedCEP = `${formattedCEP.slice(0, 5)}-${formattedCEP.slice(5, 8)}`
    }
    return formattedCEP
  }

  return (
    <div className="space-y-6">
      {/* CEP com loading e feedback */}
      <Controller
        name="endereco.cep"
        control={control}
        render={({ field }) => (
          <div className="space-y-2">
            <Label htmlFor="cep" className="text-white">
              CEP *
            </Label>
            <div className="relative">
              <Input
                {...field}
                id="cep"
                type="text"
                placeholder="00000-000"
                maxLength={9}
                onChange={(e) => {
                  const formatted = handleCEPChange(e.target.value)
                  field.onChange(formatted)
                }}
                className="bg-white/20 border-white/30 text-white placeholder:text-white/50 pr-10"
              />
              {/* Loading/Success/Error Icons */}
              <div className="absolute right-3 top-1/2 -translate-y-1/2">
                {cepLoading && (
                  <Loader2 className="w-5 h-5 text-blue-400 animate-spin" />
                )}
                {!cepLoading && viaCepData && !cepError && (
                  <CheckCircle2 className="w-5 h-5 text-green-400" />
                )}
                {!cepLoading && cepError && (
                  <AlertCircle className="w-5 h-5 text-red-400" />
                )}
              </div>
            </div>

            {/* Mensagens de erro */}
            {errors.endereco?.cep && (
              <p className="text-red-400 text-sm">
                {errors.endereco.cep.message}
              </p>
            )}
            {cepError && (
              <p className="text-red-400 text-sm flex items-center gap-1">
                <AlertCircle className="w-4 h-4" />
                {cepError.message}
              </p>
            )}

            {/* Hint de sucesso */}
            {viaCepData && !cepError && (
              <p className="text-green-400 text-sm flex items-center gap-1">
                <CheckCircle2 className="w-4 h-4" />
                Endereço encontrado! Preencha o número.
              </p>
            )}

            {/* Hint padrão */}
            {!cepLoading && !viaCepData && !cepError && (
              <p className="text-white/60 text-xs">
                Digite o CEP para autocompletar o endereço
              </p>
            )}
          </div>
        )}
      />

      {/* Logradouro e Número (grid) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Logradouro */}
        <Controller
          name="endereco.logradouro"
          control={control}
          render={({ field }) => (
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="logradouro" className="text-white">
                Logradouro *
              </Label>
              <Input
                {...field}
                id="logradouro"
                type="text"
                placeholder="Rua, Avenida, etc"
                className="bg-white/20 border-white/30 text-white placeholder:text-white/50"
              />
              {errors.endereco?.logradouro && (
                <p className="text-red-400 text-sm">
                  {errors.endereco.logradouro.message}
                </p>
              )}
            </div>
          )}
        />

        {/* Número */}
        <Controller
          name="endereco.numero"
          control={control}
          render={({ field }) => (
            <div className="space-y-2">
              <Label htmlFor="numero" className="text-white">
                Número *
              </Label>
              <Input
                {...field}
                id="numero"
                type="text"
                placeholder="123"
                className="bg-white/20 border-white/30 text-white placeholder:text-white/50"
              />
              {errors.endereco?.numero && (
                <p className="text-red-400 text-sm">
                  {errors.endereco.numero.message}
                </p>
              )}
            </div>
          )}
        />
      </div>

      {/* Complemento */}
      <Controller
        name="endereco.complemento"
        control={control}
        render={({ field }) => (
          <div className="space-y-2">
            <Label htmlFor="complemento" className="text-white">
              Complemento <span className="text-white/60">(opcional)</span>
            </Label>
            <Input
              {...field}
              value={field.value || ''}
              id="complemento"
              type="text"
              placeholder="Apto, Bloco, etc"
              className="bg-white/20 border-white/30 text-white placeholder:text-white/50"
            />
            {errors.endereco?.complemento && (
              <p className="text-red-400 text-sm">
                {errors.endereco.complemento.message}
              </p>
            )}
          </div>
        )}
      />

      {/* Bairro, Cidade e Estado (grid) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Bairro */}
        <Controller
          name="endereco.bairro"
          control={control}
          render={({ field }) => (
            <div className="space-y-2">
              <Label htmlFor="bairro" className="text-white">
                Bairro *
              </Label>
              <Input
                {...field}
                id="bairro"
                type="text"
                placeholder="Seu bairro"
                className="bg-white/20 border-white/30 text-white placeholder:text-white/50"
              />
              {errors.endereco?.bairro && (
                <p className="text-red-400 text-sm">
                  {errors.endereco.bairro.message}
                </p>
              )}
            </div>
          )}
        />

        {/* Cidade */}
        <Controller
          name="endereco.cidade"
          control={control}
          render={({ field }) => (
            <div className="space-y-2">
              <Label htmlFor="cidade" className="text-white">
                Cidade *
              </Label>
              <Input
                {...field}
                id="cidade"
                type="text"
                placeholder="Sua cidade"
                className="bg-white/20 border-white/30 text-white placeholder:text-white/50"
              />
              {errors.endereco?.cidade && (
                <p className="text-red-400 text-sm">
                  {errors.endereco.cidade.message}
                </p>
              )}
            </div>
          )}
        />

        {/* Estado */}
        <Controller
          name="endereco.estado"
          control={control}
          render={({ field }) => (
            <div className="space-y-2">
              <Label htmlFor="estado" className="text-white">
                Estado *
              </Label>
              <Select onValueChange={field.onChange} value={field.value}>
                <SelectTrigger
                  id="estado"
                  className="bg-white/20 border-white/30 text-white"
                >
                  <SelectValue placeholder="UF" />
                </SelectTrigger>
                <SelectContent>
                  {ESTADOS_BRASILEIROS.map((estado) => (
                    <SelectItem key={estado} value={estado}>
                      {estado}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.endereco?.estado && (
                <p className="text-red-400 text-sm">
                  {errors.endereco.estado.message}
                </p>
              )}
            </div>
          )}
        />
      </div>
    </div>
  )
}
