/**
 * Phase 30 / Plan 30-05 — PerfilSection (PERFIL-01 name + PERFIL-03 avatar + SEG-03 read-only).
 *
 * The "Perfil" GlassCard: an editable "Nome de exibição" (bare RHF + `zodResolver(perfilNomeSchema)`
 * — NOT the shadcn Form-field primitive, Phase-29 parity), the AvatarUpload block, and a READ-ONLY
 * definition-list rendering Email / Cargo / Papel as labelled context rows.
 *
 * SEG-03 (load-bearing): role / cargo / email are read-only context — there is NO input, select,
 * or button to change one's own role. The only editable identity field is `nome_completo`. The
 * component test asserts the ABSENCE of any role/cargo/email control.
 *
 * WARNING #3 (avatar never blanks nome): an avatar upload auto-saves immediately, ALWAYS carrying
 * the currently-loaded/edited nome — `atualizarPerfil({ nome, avatarPath })`. The RPC SET on
 * `p_nome` is unconditional, so an avatar-only save that omitted the nome would blank
 * `nome_completo`; here it never does.
 *
 * @module features/perfil-rh/components/PerfilSection
 * @see src/features/admin/components/NovoUsuarioDialog.tsx (bare-RHF + AA input styling idiom)
 * @see src/features/perfil-rh/hooks/usePerfilRh.ts (useAtualizarPerfil — toasts + refreshes chrome)
 */
import { useState } from 'react'
import { useForm, type Resolver } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Loader2 } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { GlassCard } from '@/components/ui/glass'

import { AvatarUpload } from './AvatarUpload'
import { useAtualizarPerfil } from '../hooks/usePerfilRh'
import { perfilNomeSchema, type PerfilNomeForm } from '../schemas/perfilRhSchemas'
import type { PerfilRhRow } from '../services/perfilRhService'

export interface PerfilSectionProps {
  /** The caller's OWN profile row (allowlist projection) loaded by usePerfilRh. */
  perfil: PerfilRhRow
}

/** Read-only display label for the (non-interactive) Papel badge. */
const PAPEL_LABEL: Record<string, string> = {
  administrador: 'Administrador',
  recrutador: 'Recrutador',
  rh: 'Recrutador',
}

export function PerfilSection({ perfil }: PerfilSectionProps) {
  const atualizar = useAtualizarPerfil()
  const [avatarPath, setAvatarPath] = useState<string | null>(perfil.avatar_url)

  const {
    register,
    handleSubmit,
    getValues,
    watch,
    formState: { errors },
  } = useForm<PerfilNomeForm>({
    resolver: zodResolver(perfilNomeSchema) as Resolver<PerfilNomeForm>,
    mode: 'onBlur',
    defaultValues: { nome_completo: perfil.nome_completo ?? '' },
  })

  const nomeAtual = watch('nome_completo') || perfil.nome_completo || ''

  // Avatar auto-saves immediately, ALWAYS carrying the currently-loaded/edited nome (WARNING #3).
  const handleUploaded = (path: string) => {
    setAvatarPath(path)
    const nome = getValues('nome_completo')?.trim() || perfil.nome_completo || ''
    atualizar.mutate({ nome, avatarPath: path })
  }

  const onSubmit = (values: PerfilNomeForm) => {
    atualizar.mutate({ nome: values.nome_completo, avatarPath })
  }

  const papelLabel = PAPEL_LABEL[perfil.role] ?? perfil.role

  return (
    <GlassCard variant="white" blur="md" className="rounded-xl">
      <div className="space-y-6">
        <div className="space-y-1">
          <h2 className="text-xl font-semibold text-white">Perfil</h2>
          <p className="text-sm text-white/70">Seu nome de exibição e sua foto.</p>
        </div>

        <AvatarUpload avatarPath={avatarPath} nome={nomeAtual} onUploaded={handleUploaded} />

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6" noValidate>
          {/* Nome de exibição — the ONLY editable identity field (SEG-03). */}
          <div className="space-y-2">
            <Label htmlFor="nome_completo" className="text-sm font-semibold text-white">
              Nome de exibição
            </Label>
            <Input
              id="nome_completo"
              {...register('nome_completo')}
              aria-invalid={!!errors.nome_completo}
              aria-describedby={errors.nome_completo ? 'nome_completo-error' : undefined}
              className="border-white/30 bg-white/20 text-white placeholder:text-white/60"
            />
            {errors.nome_completo && (
              <p
                id="nome_completo-error"
                role="alert"
                aria-live="assertive"
                className="text-sm text-red-400"
              >
                {errors.nome_completo.message}
              </p>
            )}
          </div>

          {/* Read-only SEG-03 context — NO input/select/button for email/cargo/role. */}
          <dl className="space-y-3 rounded-lg border border-white/15 bg-white/5 p-4">
            <div className="space-y-0.5">
              <dt className="text-xs text-white/60">E-mail</dt>
              <dd className="text-sm text-white/70">{perfil.email}</dd>
            </div>
            <div className="space-y-0.5">
              <dt className="text-xs text-white/60">Cargo</dt>
              <dd className="text-sm text-white/70">{perfil.cargo || '—'}</dd>
            </div>
            <div className="space-y-0.5">
              <dt className="text-xs text-white/60">Papel</dt>
              <dd>
                <Badge className="border-0 bg-[#35BFAD]/20 text-white">{papelLabel}</Badge>
              </dd>
            </div>
            <p className="text-xs text-white/60">
              Papel e cargo são geridos por um administrador.
            </p>
          </dl>

          <Button
            type="submit"
            disabled={atualizar.isPending}
            className="min-h-[44px] bg-[#35BFAD] text-[#04121F] hover:bg-[#2ba99a]"
          >
            {atualizar.isPending ? (
              <span className="flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                Salvando…
              </span>
            ) : (
              'Salvar'
            )}
          </Button>
        </form>
      </div>
    </GlassCard>
  )
}
