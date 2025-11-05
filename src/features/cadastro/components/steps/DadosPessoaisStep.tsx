/**
 * Step 1: Dados Pessoais
 *
 * Campos:
 * - Nome Completo
 * - CPF (com validação algorítmica + verificação de duplicata) ✅
 * - Email (com verificação de duplicata) ✅
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
import { Loader2, CheckCircle2, AlertCircle } from 'lucide-react'
import { formatCPF } from '../../utils'
import { useDuplicateCheck } from '../../hooks/useDuplicateCheck'
import { useFormToast } from '../../hooks/useFormToast'
import type { CandidatoFormData } from '../../types'

export function DadosPessoaisStep() {
  const {
    control,
    formState: { errors },
    watch,
    setError,
    clearErrors,
  } = useFormContext<CandidatoFormData>()

  // Observar campos CPF e Email para verificação de duplicata
  const cpf = watch('dadosPessoais.cpf')
  const email = watch('dadosPessoais.email')

  // Toast hook
  const toast = useFormToast()

  // Verificação de duplicata de CPF
  const {
    isDuplicate: cpfDuplicate,
    loading: cpfLoading,
    error: cpfError,
    result: cpfResult,
  } = useDuplicateCheck(cpf || '', {
    field: 'cpf',
    debounceMs: 800,
    onDuplicate: (result) => {
      // Definir erro customizado no formulário
      setError('dadosPessoais.cpf', {
        type: 'duplicate',
        message: `CPF já cadastrado por ${result.existingCandidate?.nome_completo}`,
      })

      // Mostrar toast de erro
      toast.messages.cpfDuplicate(result.existingCandidate?.nome_completo || 'outro candidato')
    },
    onUnique: () => {
      // Limpar erro de duplicata se existir
      if (errors.dadosPessoais?.cpf?.type === 'duplicate') {
        clearErrors('dadosPessoais.cpf')
      }

      // Mostrar toast de sucesso
      toast.messages.cpfAvailable()
    },
  })

  // Verificação de duplicata de Email
  const {
    isDuplicate: emailDuplicate,
    loading: emailLoading,
    error: emailError,
    result: emailResult,
  } = useDuplicateCheck(email || '', {
    field: 'email',
    debounceMs: 800,
    onDuplicate: (result) => {
      // Definir erro customizado no formulário
      setError('dadosPessoais.email', {
        type: 'duplicate',
        message: `Email já cadastrado por ${result.existingCandidate?.nome_completo}`,
      })

      // Mostrar toast de erro
      toast.messages.emailDuplicate(result.existingCandidate?.nome_completo || 'outro candidato')
    },
    onUnique: () => {
      // Limpar erro de duplicata se existir
      if (errors.dadosPessoais?.email?.type === 'duplicate') {
        clearErrors('dadosPessoais.email')
      }

      // Mostrar toast de sucesso
      toast.messages.emailAvailable()
    },
  })

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

      {/* CPF com verificação de duplicata */}
      <Controller
        name="dadosPessoais.cpf"
        control={control}
        render={({ field }) => (
          <div className="space-y-2">
            <Label htmlFor="cpf" className="text-white">
              CPF *
            </Label>
            <div className="relative">
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
                className="bg-white/20 border-white/30 text-white placeholder:text-white/50 pr-10"
              />
              {/* Loading/Success/Error Icons */}
              <div className="absolute right-3 top-1/2 -translate-y-1/2">
                {cpfLoading && (
                  <Loader2 className="w-5 h-5 text-blue-400 animate-spin" />
                )}
                {!cpfLoading && cpfResult && !cpfDuplicate && !cpfError && (
                  <CheckCircle2 className="w-5 h-5 text-green-400" />
                )}
                {!cpfLoading && (cpfDuplicate || cpfError) && (
                  <AlertCircle className="w-5 h-5 text-red-400" />
                )}
              </div>
            </div>

            {/* Mensagens de erro */}
            {errors.dadosPessoais?.cpf && (
              <p className="text-red-400 text-sm flex items-center gap-1">
                <AlertCircle className="w-4 h-4" />
                {errors.dadosPessoais.cpf.message}
              </p>
            )}
            {cpfError && !errors.dadosPessoais?.cpf && (
              <p className="text-red-400 text-sm flex items-center gap-1">
                <AlertCircle className="w-4 h-4" />
                {cpfError.message}
              </p>
            )}

            {/* Hint de sucesso */}
            {cpfResult && !cpfDuplicate && !cpfError && !errors.dadosPessoais?.cpf && (
              <p className="text-green-400 text-sm flex items-center gap-1">
                <CheckCircle2 className="w-4 h-4" />
                CPF válido e disponível!
              </p>
            )}

            {/* Hint padrão */}
            {!cpfLoading && !cpfResult && !cpfError && (
              <p className="text-white/60 text-xs">
                Seu CPF será validado e verificado no banco de dados
              </p>
            )}
          </div>
        )}
      />

      {/* Email e Telefone (grid) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Email com verificação de duplicata */}
        <Controller
          name="dadosPessoais.email"
          control={control}
          render={({ field }) => (
            <div className="space-y-2">
              <Label htmlFor="email" className="text-white">
                Email *
              </Label>
              <div className="relative">
                <Input
                  {...field}
                  id="email"
                  type="email"
                  placeholder="seu@email.com"
                  className="bg-white/20 border-white/30 text-white placeholder:text-white/50 pr-10"
                />
                {/* Loading/Success/Error Icons */}
                <div className="absolute right-3 top-1/2 -translate-y-1/2">
                  {emailLoading && (
                    <Loader2 className="w-5 h-5 text-blue-400 animate-spin" />
                  )}
                  {!emailLoading && emailResult && !emailDuplicate && !emailError && (
                    <CheckCircle2 className="w-5 h-5 text-green-400" />
                  )}
                  {!emailLoading && (emailDuplicate || emailError) && (
                    <AlertCircle className="w-5 h-5 text-red-400" />
                  )}
                </div>
              </div>

              {/* Mensagens de erro */}
              {errors.dadosPessoais?.email && (
                <p className="text-red-400 text-sm flex items-center gap-1">
                  <AlertCircle className="w-4 h-4" />
                  {errors.dadosPessoais.email.message}
                </p>
              )}
              {emailError && !errors.dadosPessoais?.email && (
                <p className="text-red-400 text-sm flex items-center gap-1">
                  <AlertCircle className="w-4 h-4" />
                  {emailError.message}
                </p>
              )}

              {/* Hint de sucesso */}
              {emailResult && !emailDuplicate && !emailError && !errors.dadosPessoais?.email && (
                <p className="text-green-400 text-sm flex items-center gap-1">
                  <CheckCircle2 className="w-4 h-4" />
                  Email válido e disponível!
                </p>
              )}

              {/* Hint padrão */}
              {!emailLoading && !emailResult && !emailError && (
                <p className="text-white/60 text-xs">
                  Seu email será verificado no banco de dados
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
