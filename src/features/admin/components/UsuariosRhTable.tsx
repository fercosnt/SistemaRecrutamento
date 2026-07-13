/**
 * Phase 29 / Plan 29-03 — UsuariosRhTable (USR-01/03/04/05).
 *
 * The glass roster <table> + its per-row account actions. Every write goes through the
 * secure Phase-28 EF via the 29-01 mutations (useMudarPapel / useAtivarDesativar /
 * useResetarSenha) — the client NEVER writes `usuarios_rh` directly.
 *
 * Per row (allowlisted columns ONLY — no avatar_url/telefone/created_by, T-29-07):
 *   avatar-initial disc + nome_completo over email + a "(você)" self-marker on the
 *   logged-in admin's own row · cargo (or "—") · papel Badge (accent for administrador,
 *   neutral for recrutador, neutral fallback for legacy roles) · status Badge (Ativo green
 *   / Inativo muted) + an "Aguardando 1º acesso" amber chip when primeiro_acesso ·
 *   último acesso (dd/mm/aaaa, "Nunca acessou" for primeiro_acesso, else "—") · Ações menu.
 *
 * Row actions (UI-SPEC §Row Actions, order): Editar papel (opens EditarPapelDialog) ·
 * Ativar (DIRECT, non-destructive — no confirm) / Desativar (honest AlertDialog) ·
 * Resetar senha (honest AlertDialog — states only that an e-mail is dispatched, T-29-09).
 *
 * Anti-lockout (USR-07 UX, T-29-08): `activeAdminCount` is derived from the loaded roster;
 * on the SINGLE active administrador's row, Desativar is disabled + the keyboard-reachable
 * tooltip (TriagemTable `<span className="inline-flex">` idiom) and the demote path is
 * blocked via `isLastActiveAdmin` passed to EditarPapelDialog. The EF/trigger LAST_ADMIN
 * (Phase 28) is the AUTHORITATIVE guard — the client hint is UX; a race falls back to the
 * server toast (the 29-01 hook maps LAST_ADMIN).
 *
 * @module features/admin/components/UsuariosRhTable
 * @see src/features/triagem/components/TriagemTable.tsx (glass table + avatar disc + disabled-tooltip idiom)
 * @see src/components/pages/VagasRHPage.tsx (row-level DropdownMenu idiom)
 * @see src/features/decisao/components/RegistrarDecisaoForm.tsx (AlertDialog confirm + pending spinner)
 */
import { useState } from 'react'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { KeyRound, Loader2, MoreHorizontal, Pencil, UserCheck, UserX } from 'lucide-react'

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { cn } from '@/components/ui/utils'
import { useAuthStore } from '@/store/authStore'

import { useAtivarDesativar, useResetarSenha } from '../hooks/useUsuariosRh'
import type { UsuarioRhRow } from '../services/usuariosRhService'
import { EditarPapelDialog } from './EditarPapelDialog'

/** Anti-lockout tooltip copy — verbatim from UI-SPEC §Anti-Lockout. */
const ANTI_LOCKOUT_TOOLTIP =
  'Não é possível desativar ou rebaixar o último administrador ativo.'

/** Papel badge label + AA tint (UI-SPEC §Color). Neutral fallback for legacy roles. */
const PAPEL_BADGE: Record<string, { label: string; tint: string }> = {
  administrador: { label: 'Administrador', tint: 'border-[#35BFAD]/40 bg-[#35BFAD]/20 text-white' },
  recrutador: { label: 'Recrutador', tint: 'border-white/20 bg-white/10 text-white/80' },
}
const NEUTRAL_TINT = 'border-white/20 bg-white/10 text-white/80'

function papelBadge(role: string): { label: string; tint: string } {
  return PAPEL_BADGE[role] ?? { label: role, tint: NEUTRAL_TINT }
}

/** Último acesso: dd/mm/aaaa, or "Nunca acessou" for primeiro_acesso, else "—". */
function ultimoAcessoLabel(row: UsuarioRhRow): string {
  if (row.data_ultimo_login) {
    return format(new Date(row.data_ultimo_login), 'dd/MM/yyyy', { locale: ptBR })
  }
  return row.primeiro_acesso ? 'Nunca acessou' : '—'
}

interface UsuarioRowProps {
  row: UsuarioRhRow
  currentUserId: string | undefined
  isLastActiveAdmin: boolean
}

/** A single roster row + its Ações menu, confirms and edit dialog (own local state). */
function UsuarioRow({ row, currentUserId, isLastActiveAdmin }: UsuarioRowProps) {
  const [editOpen, setEditOpen] = useState(false)
  const [confirm, setConfirm] = useState<null | 'desativar' | 'resetar'>(null)

  const ativarDesativar = useAtivarDesativar()
  const resetarSenha = useResetarSenha()

  const papel = papelBadge(row.role)
  const isSelf = !!currentUserId && row.user_id === currentUserId

  const handleAtivar = () => {
    void ativarDesativar.mutateAsync({ targetId: row.id, ativar: true }).catch(() => {
      // O hook toasta o erro mapeado; nada a fazer aqui.
    })
  }

  const handleDesativar = () => {
    void ativarDesativar
      .mutateAsync({ targetId: row.id, ativar: false })
      .then(() => setConfirm(null))
      .catch(() => {
        // O hook toasta (LAST_ADMIN autoritativo do servidor). Mantém o confirm.
      })
  }

  const handleResetar = () => {
    void resetarSenha
      .mutateAsync(row.id)
      .then(() => setConfirm(null))
      .catch(() => {
        // O hook toasta o erro mapeado.
      })
  }

  const desativarItem = (
    <DropdownMenuItem
      onClick={() => setConfirm('desativar')}
      className="cursor-pointer text-red-300 hover:bg-white/10"
    >
      <UserX className="mr-2 h-4 w-4" aria-hidden="true" />
      Desativar
    </DropdownMenuItem>
  )

  return (
    <TableRow className="min-h-[44px] border-white/10 text-white hover:bg-white/10">
      {/* Usuário — avatar disc + name/email (+ "(você)") */}
      <TableCell>
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-white/20 bg-gradient-to-br from-[#35BFAD] to-[#00109E] text-sm font-semibold text-white">
            {row.nome_completo.charAt(0).toUpperCase() || '?'}
          </div>
          <div className="flex flex-col">
            <span className="flex items-center gap-1 text-sm text-white">
              {row.nome_completo}
              {isSelf && <span className="text-xs text-white/50">(você)</span>}
            </span>
            <span className="text-xs text-white/60">{row.email}</span>
          </div>
        </div>
      </TableCell>

      {/* Cargo */}
      <TableCell className="text-sm text-white/70">{row.cargo || '—'}</TableCell>

      {/* Papel */}
      <TableCell>
        <Badge className={cn('text-xs font-semibold', papel.tint)}>{papel.label}</Badge>
      </TableCell>

      {/* Status + primeiro_acesso chip */}
      <TableCell>
        <div className="flex flex-wrap items-center gap-2">
          <Badge
            className={cn(
              'text-xs font-semibold',
              row.ativo
                ? 'border-green-500/30 bg-green-500/20 text-green-300'
                : 'border-white/20 bg-white/10 text-white/50',
            )}
          >
            {row.ativo ? 'Ativo' : 'Inativo'}
          </Badge>
          {row.primeiro_acesso && (
            <Badge className="border-amber-400/30 bg-amber-500/15 text-xs font-semibold text-amber-100">
              Aguardando 1º acesso
            </Badge>
          )}
        </div>
      </TableCell>

      {/* Último acesso */}
      <TableCell className="text-sm text-white/70">{ultimoAcessoLabel(row)}</TableCell>

      {/* Ações */}
      <TableCell className="text-right">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              aria-label="Ações"
              className="min-h-[44px] min-w-[44px] rounded-xl border border-white/20 bg-white/10 p-0 text-white hover:bg-white/20"
            >
              <MoreHorizontal className="h-5 w-5" aria-hidden="true" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            align="end"
            className="z-50 border-white/20 bg-[#00109E]/95 text-white backdrop-blur-xl"
          >
            <DropdownMenuItem
              onClick={() => setEditOpen(true)}
              className="cursor-pointer hover:bg-white/10"
            >
              <Pencil className="mr-2 h-4 w-4" aria-hidden="true" />
              Editar papel
            </DropdownMenuItem>

            <DropdownMenuSeparator className="bg-white/20" />

            {row.ativo ? (
              isLastActiveAdmin ? (
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <span className="inline-flex w-full">
                        <DropdownMenuItem
                          disabled
                          className="w-full cursor-not-allowed text-red-300/60"
                        >
                          <UserX className="mr-2 h-4 w-4" aria-hidden="true" />
                          Desativar
                        </DropdownMenuItem>
                      </span>
                    </TooltipTrigger>
                    <TooltipContent>{ANTI_LOCKOUT_TOOLTIP}</TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              ) : (
                desativarItem
              )
            ) : (
              <DropdownMenuItem
                onClick={handleAtivar}
                className="cursor-pointer hover:bg-white/10"
              >
                <UserCheck className="mr-2 h-4 w-4" aria-hidden="true" />
                Ativar
              </DropdownMenuItem>
            )}

            <DropdownMenuItem
              onClick={() => setConfirm('resetar')}
              className="cursor-pointer hover:bg-white/10"
            >
              <KeyRound className="mr-2 h-4 w-4" aria-hidden="true" />
              Resetar senha
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Desativar confirm (honest — reactivation is possible) */}
        <AlertDialog
          open={confirm === 'desativar'}
          onOpenChange={(next: boolean) => {
            if (!next) setConfirm(null)
          }}
        >
          <AlertDialogContent className="border-white/25 bg-[#00109E]/95 text-white backdrop-blur-xl">
            <AlertDialogHeader>
              <AlertDialogTitle>Desativar usuário?</AlertDialogTitle>
              <AlertDialogDescription className="text-white/70">
                {row.nome_completo} perderá o acesso ao painel imediatamente. Você pode
                reativar depois.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel className="min-h-[44px]">Cancelar</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDesativar}
                disabled={ativarDesativar.isPending}
                className="min-h-[44px] bg-red-500/80 text-white hover:bg-red-500"
              >
                {ativarDesativar.isPending ? (
                  <span className="flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                    Desativando…
                  </span>
                ) : (
                  'Desativar'
                )}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Resetar senha confirm (honest — only dispatches an e-mail; current password stays valid) */}
        <AlertDialog
          open={confirm === 'resetar'}
          onOpenChange={(next: boolean) => {
            if (!next) setConfirm(null)
          }}
        >
          <AlertDialogContent className="border-white/25 bg-[#00109E]/95 text-white backdrop-blur-xl">
            <AlertDialogHeader>
              <AlertDialogTitle>Enviar e-mail de redefinição de senha?</AlertDialogTitle>
              <AlertDialogDescription className="text-white/70">
                Enviaremos um e-mail para {row.email} redefinir a senha. A senha atual
                continua válida até o usuário definir uma nova.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel className="min-h-[44px]">Cancelar</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleResetar}
                disabled={resetarSenha.isPending}
                className="min-h-[44px]"
              >
                {resetarSenha.isPending ? (
                  <span className="flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                    Enviando…
                  </span>
                ) : (
                  'Enviar e-mail'
                )}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Editar papel — demote-last-admin blocked via isLastActiveAdmin */}
        <EditarPapelDialog
          open={editOpen}
          onOpenChange={setEditOpen}
          user={row}
          isLastActiveAdmin={isLastActiveAdmin}
        />
      </TableCell>
    </TableRow>
  )
}

export interface UsuariosRhTableProps {
  rows: UsuarioRhRow[]
}

/**
 * The RH user roster. Derives `activeAdminCount` from the loaded rows and marks the single
 * active administrador so its row disables Desativar/demote (the server LAST_ADMIN remains
 * authoritative).
 */
export function UsuariosRhTable({ rows }: UsuariosRhTableProps) {
  const currentUserId = useAuthStore((s) => s.user?.id)

  const activeAdmins = rows.filter((r) => r.role === 'administrador' && r.ativo)
  const lastActiveAdminId = activeAdmins.length === 1 ? activeAdmins[0].id : undefined

  return (
    <div className="overflow-x-auto rounded-xl border border-white/10">
      <Table>
        <TableHeader>
          <TableRow className="border-white/10 bg-white/10 hover:bg-white/10">
            <TableHead className="text-xs font-semibold text-white/80">Usuário</TableHead>
            <TableHead className="text-xs font-semibold text-white/80">Cargo</TableHead>
            <TableHead className="text-xs font-semibold text-white/80">Papel</TableHead>
            <TableHead className="text-xs font-semibold text-white/80">Status</TableHead>
            <TableHead className="text-xs font-semibold text-white/80">Último acesso</TableHead>
            <TableHead className="text-right text-xs font-semibold text-white/80">Ações</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row) => (
            <UsuarioRow
              key={row.id}
              row={row}
              currentUserId={currentUserId}
              isLastActiveAdmin={row.id === lastActiveAdminId}
            />
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
