/**
 * Step 2: Endereço
 *
 * Campos:
 * - CEP (com integração ViaCEP - Task 2)
 * - Logradouro
 * - Número
 * - Complemento (opcional)
 * - Bairro
 * - Cidade
 * - Estado
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
import type { CandidatoFormData } from '../../types'

// TODO: Task 2 - Importar hook do ViaCEP
// import { useViaCEP } from '../../hooks/useViaCEP'

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
  } = useFormContext<CandidatoFormData>()

  // TODO: Task 2 - Integrar hook do ViaCEP
  // const { loading: cepLoading, error: cepError, buscarCEP } = useViaCEP()

  /**
   * Handler para busca de CEP
   * TODO: Task 2 - Implementar integração real com ViaCEP
   */
  const handleCEPChange = async (cep: string) => {
    // Formata CEP
    let formattedCEP = cep.replace(/\D/g, '')
    if (formattedCEP.length > 5) {
      formattedCEP = `${formattedCEP.slice(0, 5)}-${formattedCEP.slice(5, 8)}`
    }

    // Se tiver 9 caracteres (formato completo), buscar no ViaCEP
    // TODO: Task 2 - Implementar busca real
    // if (formattedCEP.replace(/\D/g, '').length === 8) {
    //   const data = await buscarCEP(formattedCEP)
    //   if (data) {
    //     setValue('endereco.logradouro', data.logradouro)
    //     setValue('endereco.bairro', data.bairro)
    //     setValue('endereco.cidade', data.localidade)
    //     setValue('endereco.estado', data.uf)
    //   }
    // }

    return formattedCEP
  }

  return (
    <div className="space-y-6">
      {/* CEP */}
      <Controller
        name="endereco.cep"
        control={control}
        render={({ field }) => (
          <div className="space-y-2">
            <Label htmlFor="cep" className="text-white">
              CEP *
            </Label>
            <Input
              {...field}
              id="cep"
              type="text"
              placeholder="00000-000"
              maxLength={9}
              onChange={async (e) => {
                const formatted = await handleCEPChange(e.target.value)
                field.onChange(formatted)
              }}
              className="bg-white/20 border-white/30 text-white placeholder:text-white/50"
            />
            {errors.endereco?.cep && (
              <p className="text-red-400 text-sm">
                {errors.endereco.cep.message}
              </p>
            )}
            <p className="text-white/60 text-xs">
              Preencha o CEP para autocompletar o endereço
            </p>
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
