/**
 * Step 1: Dados Pessoais
 *
 * Campos:
 * - Nome Completo
 * - CPF (com validação algorítmica)
 * - Email
 * - Telefone
 * - Data de Nascimento
 * - Gênero
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
import { formatCPF } from '../../utils'
import type { CandidatoFormData } from '../../types'

export function DadosPessoaisStep() {
  const {
    control,
    formState: { errors },
  } = useFormContext<CandidatoFormData>()

  return (
    <div className="space-y-6">
      {/* Nome Completo */}
      <Controller
        name="dadosPessoais.nome_completo"
        control={control}
        render={({ field }) => (
          <div className="space-y-2">
            <Label htmlFor="nome_completo" className="text-white">
              Nome Completo *
            </Label>
            <Input
              {...field}
              id="nome_completo"
              type="text"
              placeholder="Digite seu nome completo"
              className="bg-white/20 border-white/30 text-white placeholder:text-white/50"
            />
            {errors.dadosPessoais?.nome_completo && (
              <p className="text-red-400 text-sm">
                {errors.dadosPessoais.nome_completo.message}
              </p>
            )}
          </div>
        )}
      />

      {/* CPF */}
      <Controller
        name="dadosPessoais.cpf"
        control={control}
        render={({ field }) => (
          <div className="space-y-2">
            <Label htmlFor="cpf" className="text-white">
              CPF *
            </Label>
            <Input
              {...field}
              id="cpf"
              type="text"
              placeholder="000.000.000-00"
              maxLength={14}
              onChange={(e) => {
                // Formata CPF enquanto digita
                const formatted = formatCPF(e.target.value)
                field.onChange(formatted)
              }}
              className="bg-white/20 border-white/30 text-white placeholder:text-white/50"
            />
            {errors.dadosPessoais?.cpf && (
              <p className="text-red-400 text-sm">
                {errors.dadosPessoais.cpf.message}
              </p>
            )}
            <p className="text-white/60 text-xs">
              Seu CPF será validado e verificado
            </p>
          </div>
        )}
      />

      {/* Email e Telefone (grid) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Email */}
        <Controller
          name="dadosPessoais.email"
          control={control}
          render={({ field }) => (
            <div className="space-y-2">
              <Label htmlFor="email" className="text-white">
                Email *
              </Label>
              <Input
                {...field}
                id="email"
                type="email"
                placeholder="seu@email.com"
                className="bg-white/20 border-white/30 text-white placeholder:text-white/50"
              />
              {errors.dadosPessoais?.email && (
                <p className="text-red-400 text-sm">
                  {errors.dadosPessoais.email.message}
                </p>
              )}
            </div>
          )}
        />

        {/* Telefone */}
        <Controller
          name="dadosPessoais.telefone"
          control={control}
          render={({ field }) => (
            <div className="space-y-2">
              <Label htmlFor="telefone" className="text-white">
                Telefone *
              </Label>
              <Input
                {...field}
                id="telefone"
                type="tel"
                placeholder="(11) 98765-4321"
                maxLength={15}
                onChange={(e) => {
                  // Formata telefone enquanto digita
                  let value = e.target.value.replace(/\D/g, '')
                  if (value.length > 0) {
                    value = value.replace(/^(\d{2})(\d)/g, '($1) $2')
                    value = value.replace(/(\d)(\d{4})$/, '$1-$2')
                  }
                  field.onChange(value)
                }}
                className="bg-white/20 border-white/30 text-white placeholder:text-white/50"
              />
              {errors.dadosPessoais?.telefone && (
                <p className="text-red-400 text-sm">
                  {errors.dadosPessoais.telefone.message}
                </p>
              )}
            </div>
          )}
        />
      </div>

      {/* Data de Nascimento e Gênero (grid) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Data de Nascimento */}
        <Controller
          name="dadosPessoais.data_nascimento"
          control={control}
          render={({ field }) => (
            <div className="space-y-2">
              <Label htmlFor="data_nascimento" className="text-white">
                Data de Nascimento *
              </Label>
              <Input
                {...field}
                id="data_nascimento"
                type="date"
                max={new Date().toISOString().split('T')[0]}
                className="bg-white/20 border-white/30 text-white placeholder:text-white/50"
              />
              {errors.dadosPessoais?.data_nascimento && (
                <p className="text-red-400 text-sm">
                  {errors.dadosPessoais.data_nascimento.message}
                </p>
              )}
              <p className="text-white/60 text-xs">
                Você deve ter no mínimo 16 anos
              </p>
            </div>
          )}
        />

        {/* Gênero */}
        <Controller
          name="dadosPessoais.genero"
          control={control}
          render={({ field }) => (
            <div className="space-y-2">
              <Label htmlFor="genero" className="text-white">
                Gênero *
              </Label>
              <Select onValueChange={field.onChange} value={field.value}>
                <SelectTrigger
                  id="genero"
                  className="bg-white/20 border-white/30 text-white"
                >
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="masculino">Masculino</SelectItem>
                  <SelectItem value="feminino">Feminino</SelectItem>
                  <SelectItem value="outro">Outro</SelectItem>
                  <SelectItem value="prefiro_nao_informar">
                    Prefiro não informar
                  </SelectItem>
                </SelectContent>
              </Select>
              {errors.dadosPessoais?.genero && (
                <p className="text-red-400 text-sm">
                  {errors.dadosPessoais.genero.message}
                </p>
              )}
            </div>
          )}
        />
      </div>
    </div>
  )
}
