/**
 * Step 1: Dados Pessoais
 *
 * Phase 8 / Plan 08-02 (D-02, D-03, INSCR-01, LGPD-01): Etapa 1 LGPD-clean —
 * CPF e Gênero NÃO são mais coletados. Dedup é EMAIL-only.
 *
 * Campos (allowlist INSCR-01):
 * - Nome Completo
 * - Email (com verificação de duplicata) ✅
 * - Telefone
 * - Data de Nascimento
 * - Como conheceu a vaga
 * - Instagram (opcional)
 * - LinkedIn (opcional)
 * - Senha (com toggle show/hide)
 * - Confirmar Senha (com toggle show/hide)
 */

import React from 'react'
import { useFormContext, Controller } from 'react-hook-form'
import { useNavigate } from 'react-router-dom'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Loader2, CheckCircle2, AlertCircle, Eye, EyeOff } from 'lucide-react'
import { useDuplicateCheck } from '../../hooks/useDuplicateCheck'
import { useFormToast } from '../../hooks/useFormToast'
import type { CandidatoFormData } from '../../types'

export function DadosPessoaisStep() {
  const navigate = useNavigate()
  const {
    control,
    formState: { errors },
    watch,
    setError,
    clearErrors,
  } = useFormContext<CandidatoFormData>()

  // Observar campo Email para verificação de duplicata (email-only — D-03)
  const email = watch('dadosPessoais.email')

  // Toast hook
  const toast = useFormToast()

  // Verificação de duplicata de Email
  const {
    isDuplicate: emailDuplicate,
    loading: emailLoading,
    error: emailError,
    result: emailResult,
  } = useDuplicateCheck(email || '', {
    field: 'email',
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

  // Estados para controlar visibilidade das senhas
  const [mostrarSenha, setMostrarSenha] = React.useState(false)
  const [mostrarConfirmarSenha, setMostrarConfirmarSenha] = React.useState(false)

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
                <div className="space-y-2">
                  <p className="text-red-400 text-sm flex items-center gap-1">
                    <AlertCircle className="w-4 h-4" />
                    {errors.dadosPessoais.email.message}
                  </p>
                  {emailDuplicate && (
                    <button
                      type="button"
                      onClick={() => navigate('/auth/login')}
                      className="text-sm text-blue-400 hover:text-blue-300 hover:underline transition-colors"
                    >
                      Já possui cadastro? Fazer login →
                    </button>
                  )}
                </div>
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
                <p className="text-white text-xs">
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

      {/* Data de Nascimento e Como conheceu (grid) — Gênero removido (D-02/LGPD-01) */}
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
                className="bg-white/20 border-white/30 text-white placeholder:text-white/50 [&::-webkit-calendar-picker-indicator]:filter [&::-webkit-calendar-picker-indicator]:invert [&::-webkit-calendar-picker-indicator]:brightness-0 [&::-webkit-calendar-picker-indicator]:contrast-100"
              />
              {errors.dadosPessoais?.data_nascimento && (
                <p className="text-red-400 text-sm">
                  {errors.dadosPessoais.data_nascimento.message}
                </p>
              )}
              <p className="text-white text-xs">
                Você deve ter no mínimo 16 anos
              </p>
            </div>
          )}
        />

        {/* Como conheceu a vaga */}
        <Controller
          name="dadosPessoais.como_conheceu"
          control={control}
          render={({ field }) => (
            <div className="space-y-2">
              <Label htmlFor="como_conheceu" className="text-white">
                Como conheceu a vaga? *
              </Label>
              <Select onValueChange={field.onChange} value={field.value}>
                <SelectTrigger
                  id="como_conheceu"
                  className="bg-white/10 border-white/20 text-white hover:bg-white/15 backdrop-blur-md data-[placeholder]:text-white/50"
                >
                  <SelectValue placeholder="Selecione uma opção" />
                </SelectTrigger>
                <SelectContent className="bg-white/15 backdrop-blur-xl border-white/20 text-white shadow-lg">
                  <SelectItem
                    value="instagram"
                    className="text-sm cursor-pointer focus:bg-white/20 data-[highlighted]:bg-white/20 text-white"
                  >
                    Instagram
                  </SelectItem>
                  <SelectItem
                    value="facebook"
                    className="text-sm cursor-pointer focus:bg-white/20 data-[highlighted]:bg-white/20 text-white"
                  >
                    Facebook
                  </SelectItem>
                  <SelectItem
                    value="linkedin"
                    className="text-sm cursor-pointer focus:bg-white/20 data-[highlighted]:bg-white/20 text-white"
                  >
                    LinkedIn
                  </SelectItem>
                  <SelectItem
                    value="indicacao"
                    className="text-sm cursor-pointer focus:bg-white/20 data-[highlighted]:bg-white/20 text-white"
                  >
                    Indicação
                  </SelectItem>
                  <SelectItem
                    value="google"
                    className="text-sm cursor-pointer focus:bg-white/20 data-[highlighted]:bg-white/20 text-white"
                  >
                    Google
                  </SelectItem>
                  <SelectItem
                    value="catho"
                    className="text-sm cursor-pointer focus:bg-white/20 data-[highlighted]:bg-white/20 text-white"
                  >
                    Catho
                  </SelectItem>
                  <SelectItem
                    value="vagas_com"
                    className="text-sm cursor-pointer focus:bg-white/20 data-[highlighted]:bg-white/20 text-white"
                  >
                    Vagas.com
                  </SelectItem>
                  <SelectItem
                    value="solides"
                    className="text-sm cursor-pointer focus:bg-white/20 data-[highlighted]:bg-white/20 text-white"
                  >
                    Solides
                  </SelectItem>
                  <SelectItem
                    value="outros"
                    className="text-sm cursor-pointer focus:bg-white/20 data-[highlighted]:bg-white/20 text-white"
                  >
                    Outros
                  </SelectItem>
                </SelectContent>
              </Select>
              {errors.dadosPessoais?.como_conheceu && (
                <p className="text-red-400 text-sm">
                  {errors.dadosPessoais.como_conheceu.message}
                </p>
              )}
            </div>
          )}
        />
      </div>

      {/* Campo de detalhes - Aparece apenas se "Outros" for selecionado */}
      {watch('dadosPessoais.como_conheceu') === 'outros' && (
        <Controller
          name="dadosPessoais.como_conheceu_detalhes"
          control={control}
          render={({ field }) => (
            <div className="space-y-2">
              <Label htmlFor="como_conheceu_detalhes" className="text-white">
                Especifique como conheceu a vaga *
              </Label>
              <Input
                {...field}
                value={field.value || ''}
                id="como_conheceu_detalhes"
                type="text"
                placeholder="Descreva como conheceu a vaga"
                className="bg-white/20 border-white/30 text-white placeholder:text-white/50"
              />
              {errors.dadosPessoais?.como_conheceu_detalhes && (
                <p className="text-red-400 text-sm">
                  {errors.dadosPessoais.como_conheceu_detalhes.message}
                </p>
              )}
            </div>
          )}
        />
      )}

      {/* Instagram e LinkedIn (grid) - Campos Opcionais */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Instagram */}
        <Controller
          name="dadosPessoais.instagram"
          control={control}
          render={({ field }) => (
            <div className="space-y-2">
              <Label htmlFor="instagram" className="text-white">
                Instagram (opcional)
              </Label>
              <Input
                {...field}
                value={field.value || ''}
                id="instagram"
                type="text"
                placeholder="@seu_usuario"
                className="bg-white/20 border-white/30 text-white placeholder:text-white/50"
              />
              {errors.dadosPessoais?.instagram && (
                <p className="text-red-400 text-sm">
                  {errors.dadosPessoais.instagram.message}
                </p>
              )}
              <p className="text-white text-xs">
                Use: @usuario ou instagram.com/usuario
              </p>
            </div>
          )}
        />

        {/* LinkedIn */}
        <Controller
          name="dadosPessoais.linkedin"
          control={control}
          render={({ field }) => (
            <div className="space-y-2">
              <Label htmlFor="linkedin" className="text-white">
                LinkedIn (opcional)
              </Label>
              <Input
                {...field}
                value={field.value || ''}
                id="linkedin"
                type="text"
                placeholder="linkedin.com/in/seu-perfil"
                className="bg-white/20 border-white/30 text-white placeholder:text-white/50"
              />
              {errors.dadosPessoais?.linkedin && (
                <p className="text-red-400 text-sm">
                  {errors.dadosPessoais.linkedin.message}
                </p>
              )}
              <p className="text-white text-xs">
                Use: linkedin.com/in/seu-perfil
              </p>
            </div>
          )}
        />
      </div>

      {/* Senha e Confirmar Senha */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Senha */}
        <Controller
          name="dadosPessoais.senha"
          control={control}
          render={({ field }) => (
            <div className="space-y-2">
              <Label htmlFor="senha" className="text-white">
                Senha *
              </Label>
              <div className="relative">
                <Input
                  {...field}
                  value={field.value || ''}
                  id="senha"
                  type={mostrarSenha ? 'text' : 'password'}
                  placeholder="Digite sua senha"
                  className="bg-white/20 border-white/30 text-white placeholder:text-white/50 pr-10"
                />
                <button
                  type="button"
                  onClick={() => setMostrarSenha(!mostrarSenha)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-white/60 hover:text-white transition-colors"
                  aria-label={mostrarSenha ? 'Ocultar senha' : 'Mostrar senha'}
                >
                  {mostrarSenha ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
              {errors.dadosPessoais?.senha && (
                <p className="text-red-400 text-sm">
                  {errors.dadosPessoais.senha.message}
                </p>
              )}
              <p className="text-white text-xs">
                Mínimo 8 caracteres, incluindo maiúscula, minúscula e número
              </p>
            </div>
          )}
        />

        {/* Confirmar Senha */}
        <Controller
          name="dadosPessoais.confirmar_senha"
          control={control}
          render={({ field }) => (
            <div className="space-y-2">
              <Label htmlFor="confirmar_senha" className="text-white">
                Confirmar Senha *
              </Label>
              <div className="relative">
                <Input
                  {...field}
                  value={field.value || ''}
                  id="confirmar_senha"
                  type={mostrarConfirmarSenha ? 'text' : 'password'}
                  placeholder="Confirme sua senha"
                  className="bg-white/20 border-white/30 text-white placeholder:text-white/50 pr-10"
                />
                <button
                  type="button"
                  onClick={() => setMostrarConfirmarSenha(!mostrarConfirmarSenha)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-white/60 hover:text-white transition-colors"
                  aria-label={mostrarConfirmarSenha ? 'Ocultar senha' : 'Mostrar senha'}
                >
                  {mostrarConfirmarSenha ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
              {errors.dadosPessoais?.confirmar_senha && (
                <p className="text-red-400 text-sm">
                  {errors.dadosPessoais.confirmar_senha.message}
                </p>
              )}
            </div>
          )}
        />
      </div>
    </div>
  )
}
