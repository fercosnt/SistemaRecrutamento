/**
 * Step 3: Dados Profissionais
 *
 * Campos:
 * - Experiência na Área
 * - Nível de Escolaridade
 * - Instituição de Ensino (opcional)
 * - Curso (opcional)
 * - Ano de Conclusão (opcional)
 * - Possui CNH
 * - Categorias CNH (condicional)
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
import type { CandidatoFormData } from '../../types'

const EXPERIENCIA_OPTIONS = [
  { value: 'nenhuma', label: 'Nenhuma experiência' },
  { value: 'menos_1_ano', label: 'Menos de 1 ano' },
  { value: '1_3_anos', label: '1 a 3 anos' },
  { value: '3_5_anos', label: '3 a 5 anos' },
  { value: 'mais_5_anos', label: 'Mais de 5 anos' },
]

const ESCOLARIDADE_OPTIONS = [
  { value: 'fundamental_incompleto', label: 'Fundamental Incompleto' },
  { value: 'fundamental_completo', label: 'Fundamental Completo' },
  { value: 'medio_incompleto', label: 'Médio Incompleto' },
  { value: 'medio_completo', label: 'Médio Completo' },
  { value: 'superior_incompleto', label: 'Superior Incompleto' },
  { value: 'superior_completo', label: 'Superior Completo' },
  { value: 'pos_graduacao', label: 'Pós-graduação' },
  { value: 'mestrado', label: 'Mestrado' },
  { value: 'doutorado', label: 'Doutorado' },
]

const CATEGORIAS_CNH = ['A', 'B', 'C', 'D', 'E', 'AB', 'AC', 'AD', 'AE']

export function DadosProfissionaisStep() {
  const {
    control,
    formState: { errors },
    watch,
  } = useFormContext<CandidatoFormData>()

  // Observar campo possui_cnh para mostrar/esconder categorias
  const possuiCNH = watch('dadosProfissionais.possui_cnh')

  return (
    <div className="space-y-6">
      {/* Experiência e Escolaridade (grid) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Experiência na Área */}
        <Controller
          name="dadosProfissionais.experiencia_area"
          control={control}
          render={({ field }) => (
            <div className="space-y-2">
              <Label htmlFor="experiencia_area" className="text-white">
                Experiência na Área *
              </Label>
              <Select onValueChange={field.onChange} value={field.value}>
                <SelectTrigger
                  id="experiencia_area"
                  className="bg-white/20 border-white/30 text-white data-[placeholder]:text-white/50"
                >
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  {EXPERIENCIA_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.dadosProfissionais?.experiencia_area && (
                <p className="text-red-400 text-sm">
                  {errors.dadosProfissionais.experiencia_area.message}
                </p>
              )}
            </div>
          )}
        />

        {/* Nível de Escolaridade */}
        <Controller
          name="dadosProfissionais.nivel_escolaridade"
          control={control}
          render={({ field }) => (
            <div className="space-y-2">
              <Label htmlFor="nivel_escolaridade" className="text-white">
                Escolaridade *
              </Label>
              <Select onValueChange={field.onChange} value={field.value}>
                <SelectTrigger
                  id="nivel_escolaridade"
                  className="bg-white/20 border-white/30 text-white data-[placeholder]:text-white/50"
                >
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  {ESCOLARIDADE_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.dadosProfissionais?.nivel_escolaridade && (
                <p className="text-red-400 text-sm">
                  {errors.dadosProfissionais.nivel_escolaridade.message}
                </p>
              )}
            </div>
          )}
        />
      </div>

      {/* Instituição e Curso (grid) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Instituição de Ensino */}
        <Controller
          name="dadosProfissionais.instituicao_ensino"
          control={control}
          render={({ field }) => (
            <div className="space-y-2">
              <Label htmlFor="instituicao_ensino" className="text-white">
                Instituição de Ensino{' '}
                <span className="text-white/60">(opcional)</span>
              </Label>
              <Input
                {...field}
                value={field.value || ''}
                id="instituicao_ensino"
                type="text"
                placeholder="Nome da instituição"
                className="bg-white/20 border-white/30 text-white placeholder:text-white/50"
              />
              {errors.dadosProfissionais?.instituicao_ensino && (
                <p className="text-red-400 text-sm">
                  {errors.dadosProfissionais.instituicao_ensino.message}
                </p>
              )}
            </div>
          )}
        />

        {/* Curso */}
        <Controller
          name="dadosProfissionais.curso"
          control={control}
          render={({ field }) => (
            <div className="space-y-2">
              <Label htmlFor="curso" className="text-white">
                Curso <span className="text-white/60">(opcional)</span>
              </Label>
              <Input
                {...field}
                value={field.value || ''}
                id="curso"
                type="text"
                placeholder="Nome do curso"
                className="bg-white/20 border-white/30 text-white placeholder:text-white/50"
              />
              {errors.dadosProfissionais?.curso && (
                <p className="text-red-400 text-sm">
                  {errors.dadosProfissionais.curso.message}
                </p>
              )}
            </div>
          )}
        />
      </div>

      {/* Ano de Conclusão */}
      <Controller
        name="dadosProfissionais.ano_conclusao"
        control={control}
        render={({ field }) => (
          <div className="space-y-2">
            <Label htmlFor="ano_conclusao" className="text-white">
              Ano de Conclusão <span className="text-white/60">(opcional)</span>
            </Label>
            <Input
              {...field}
              value={field.value || ''}
              id="ano_conclusao"
              type="number"
              min={1950}
              max={new Date().getFullYear() + 10}
              placeholder="Ex: 2024"
              className="bg-white/20 border-white/30 text-white placeholder:text-white/50"
              onChange={(e) => {
                const value = e.target.value ? parseInt(e.target.value) : null
                field.onChange(value)
              }}
            />
            {errors.dadosProfissionais?.ano_conclusao && (
              <p className="text-red-400 text-sm">
                {errors.dadosProfissionais.ano_conclusao.message}
              </p>
            )}
          </div>
        )}
      />

      {/* Divider */}
      <div className="border-t border-white/20 pt-6">
        <h3 className="text-white font-semibold mb-4">Habilitação (CNH)</h3>
      </div>

      {/* Possui CNH */}
      <Controller
        name="dadosProfissionais.possui_cnh"
        control={control}
        render={({ field }) => (
          <div className="flex items-center space-x-3">
            <Checkbox
              id="possui_cnh"
              checked={field.value}
              onCheckedChange={field.onChange}
              className="bg-white/20 border-white/30 data-[state=checked]:bg-[#00109E] data-[state=checked]:border-[#00109E]"
            />
            <Label
              htmlFor="possui_cnh"
              className="text-white cursor-pointer font-normal"
            >
              Possuo Carteira Nacional de Habilitação (CNH)
            </Label>
          </div>
        )}
      />

      {/* Categorias CNH (condicional) */}
      {possuiCNH && (
        <Controller
          name="dadosProfissionais.categorias_cnh"
          control={control}
          render={({ field }) => (
            <div className="space-y-3">
              <Label className="text-white">Categorias da CNH</Label>
              <div className="grid grid-cols-3 sm:grid-cols-5 gap-3">
                {CATEGORIAS_CNH.map((categoria) => (
                  <div key={categoria} className="flex items-center space-x-2">
                    <Checkbox
                      id={`categoria_${categoria}`}
                      checked={(field.value || []).includes(categoria)}
                      onCheckedChange={(checked) => {
                        const current = field.value || []
                        if (checked) {
                          field.onChange([...current, categoria])
                        } else {
                          field.onChange(
                            current.filter((c) => c !== categoria)
                          )
                        }
                      }}
                      className="bg-white/20 border-white/30 data-[state=checked]:bg-[#00109E] data-[state=checked]:border-[#00109E]"
                    />
                    <Label
                      htmlFor={`categoria_${categoria}`}
                      className="text-white cursor-pointer font-normal"
                    >
                      {categoria}
                    </Label>
                  </div>
                ))}
              </div>
              {errors.dadosProfissionais?.categorias_cnh && (
                <p className="text-red-400 text-sm">
                  {errors.dadosProfissionais.categorias_cnh.message}
                </p>
              )}
            </div>
          )}
        />
      )}
    </div>
  )
}
