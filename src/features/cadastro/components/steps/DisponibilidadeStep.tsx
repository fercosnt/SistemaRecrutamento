/**
 * Step 3: Disponibilidade
 *
 * Campos:
 * - Turno Preferido
 * - Modelo de Trabalho
 * - Disponibilidade Imediata
 * - Data de Disponibilidade (condicional)
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
import { Checkbox } from '@/components/ui/checkbox'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import type { CandidatoFormData } from '../../types'

const TURNO_OPTIONS = [
  { value: 'manha', label: 'Manhã', description: '06:00 - 14:00' },
  { value: 'tarde', label: 'Tarde', description: '14:00 - 22:00' },
  { value: 'noite', label: 'Noite', description: '22:00 - 06:00' },
  { value: 'integral', label: 'Integral', description: 'Qualquer horário' },
]

const MODELO_TRABALHO_OPTIONS = [
  {
    value: 'presencial',
    label: 'Presencial',
    description: 'Trabalho na empresa',
  },
  { value: 'remoto', label: 'Remoto', description: 'Trabalho de casa' },
  {
    value: 'hibrido',
    label: 'Híbrido',
    description: 'Misto presencial/remoto',
  },
]

export function DisponibilidadeStep() {
  const {
    control,
    formState: { errors },
    watch,
  } = useFormContext<CandidatoFormData>()

  // Observar disponibilidade_imediata para mostrar/esconder data
  const disponibilidadeImediata = watch(
    'disponibilidade.disponibilidade_imediata'
  )

  return (
    <div className="space-y-6">
      {/* Turno Preferido */}
      <Controller
        name="disponibilidade.turno_preferido"
        control={control}
        render={({ field }) => (
          <div className="space-y-3">
            <Label className="text-white text-base">
              Turno de Trabalho Preferido *
            </Label>
            <RadioGroup
              onValueChange={field.onChange}
              value={field.value}
              className="grid grid-cols-1 sm:grid-cols-2 gap-4"
            >
              {TURNO_OPTIONS.map((option) => (
                <div key={option.value} className="flex items-center space-x-3">
                  <RadioGroupItem
                    value={option.value}
                    id={`turno_${option.value}`}
                    className="border-white/30 text-white"
                  />
                  <Label
                    htmlFor={`turno_${option.value}`}
                    className="text-white cursor-pointer flex-1"
                  >
                    <div>
                      <p className="font-medium">{option.label}</p>
                      <p className="text-sm text-white/70">
                        {option.description}
                      </p>
                    </div>
                  </Label>
                </div>
              ))}
            </RadioGroup>
            {errors.disponibilidade?.turno_preferido && (
              <p className="text-red-400 text-sm">
                {errors.disponibilidade.turno_preferido.message}
              </p>
            )}
          </div>
        )}
      />

      {/* Modelo de Trabalho */}
      <Controller
        name="disponibilidade.modelo_trabalho"
        control={control}
        render={({ field }) => (
          <div className="space-y-3">
            <Label className="text-white text-base">
              Modelo de Trabalho *
            </Label>
            <RadioGroup
              onValueChange={field.onChange}
              value={field.value}
              className="grid grid-cols-1 sm:grid-cols-3 gap-4"
            >
              {MODELO_TRABALHO_OPTIONS.map((option) => (
                <div key={option.value} className="flex items-center space-x-3">
                  <RadioGroupItem
                    value={option.value}
                    id={`modelo_${option.value}`}
                    className="border-white/30 text-white"
                  />
                  <Label
                    htmlFor={`modelo_${option.value}`}
                    className="text-white cursor-pointer flex-1"
                  >
                    <div>
                      <p className="font-medium">{option.label}</p>
                      <p className="text-sm text-white/70">
                        {option.description}
                      </p>
                    </div>
                  </Label>
                </div>
              ))}
            </RadioGroup>
            {errors.disponibilidade?.modelo_trabalho && (
              <p className="text-red-400 text-sm">
                {errors.disponibilidade.modelo_trabalho.message}
              </p>
            )}
          </div>
        )}
      />

      {/* Divider */}
      <div className="border-t border-white/20 pt-6">
        <h3 className="text-white font-semibold mb-4">
          Quando pode começar?
        </h3>
      </div>

      {/* Disponibilidade Imediata */}
      <Controller
        name="disponibilidade.disponibilidade_imediata"
        control={control}
        render={({ field }) => (
          <div className="flex items-center space-x-3">
            <Checkbox
              id="disponibilidade_imediata"
              checked={field.value}
              onCheckedChange={field.onChange}
              className="bg-white/20 border-white/30 data-[state=checked]:bg-[#00109E] data-[state=checked]:border-[#00109E]"
            />
            <Label
              htmlFor="disponibilidade_imediata"
              className="text-white cursor-pointer font-normal"
            >
              Tenho disponibilidade imediata para começar
            </Label>
          </div>
        )}
      />

      {/* Data de Disponibilidade (condicional) */}
      {!disponibilidadeImediata && (
        <Controller
          name="disponibilidade.data_disponibilidade"
          control={control}
          render={({ field }) => (
            <div className="space-y-2">
              <Label htmlFor="data_disponibilidade" className="text-white">
                A partir de quando pode começar? *
              </Label>
              <Input
                {...field}
                value={field.value || ''}
                id="data_disponibilidade"
                type="date"
                min={new Date().toISOString().split('T')[0]}
                className="bg-white/20 border-white/30 text-white placeholder:text-white/50 [&::-webkit-calendar-picker-indicator]:filter [&::-webkit-calendar-picker-indicator]:invert [&::-webkit-calendar-picker-indicator]:brightness-0 [&::-webkit-calendar-picker-indicator]:contrast-100"
              />
              {errors.disponibilidade?.data_disponibilidade && (
                <p className="text-red-400 text-sm">
                  {errors.disponibilidade.data_disponibilidade.message}
                </p>
              )}
            </div>
          )}
        />
      )}
    </div>
  )
}
