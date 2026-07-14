/**
 * TanStack Query hooks for the "Meu Perfil RH" self-service page (PERFIL-01/02/03).
 *
 * One `useQuery` over the caller's OWN row (`readMeuPerfil`) + three `useMutation`s
 * (atualizarPerfil / alterarSenha / uploadAvatar). Every mutation `invalidateQueries` the
 * own-row query on success.
 *
 * TWO load-bearing contracts:
 *
 *  1. authStore refresh (BLOCKER / Success Criterion #1): `useAtualizarPerfil` onSuccess
 *     ALSO refreshes the Zustand store — it merges the edited `nome_completo`/`avatar_url`
 *     onto the current `adminUser` and calls `setAdminUser(merged)` so the RH panel chrome
 *     (RHTopBar / RHSidebar) reflects the new name/avatar WITHOUT a re-login. `setAdminUser`
 *     already routes a `nome_completo`-bearing UsuarioRHRow into `adminUser`/`profile`/`role`.
 *
 *  2. Avatar-always-carries-nome (WARNING #3): `useUploadAvatar` returns ONLY the storage
 *     path — it does NOT persist on its own. The caller MUST then call
 *     `atualizarPerfil({ nome: <current loaded nome>, avatarPath })`. The RPC SET on `p_nome`
 *     is UNCONDITIONAL, so an avatar-only save that omitted the nome would blank
 *     `nome_completo`. Persisting the avatar ALWAYS flows through `atualizarPerfil` carrying
 *     the currently-loaded nome.
 *
 * Error ownership: `useAlterarSenha` has NO `onError` toast for the field error —
 * `WRONG_CURRENT` is routed to the "Senha atual" field by the SenhaSection (30-05) via
 * `mutateAsync` + try/catch, NOT a toast. Only the success toast lives here.
 *
 * @module features/perfil-rh/hooks/usePerfilRh
 * @see src/features/admin/hooks/useUsuariosRh.ts (keys + query + mutation + invalidate idiom)
 * @see src/store/authStore.ts (setAdminUser routes a nome_completo-bearing row into adminUser)
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { useUser, useAuthStore } from '@/store/authStore'
import {
  readMeuPerfil,
  atualizarPerfil,
  alterarSenha,
  uploadAvatar,
  type PerfilRhRow,
} from '../services/perfilRhService'

/** Query keys hierárquicas (all → me(uid)). */
export const perfilRhKeys = {
  all: ['perfil-rh'] as const,
  me: (uid: string | undefined) => [...perfilRhKeys.all, 'me', uid] as const,
} as const

/** Variables for the name/avatar save — nome is ALWAYS present (WARNING #3). */
export interface AtualizarPerfilVars {
  nome: string
  avatarPath?: string | null
}

/** Variables for the change-password mutation. */
export interface AlterarSenhaVars {
  email: string
  senhaAtual: string
  novaSenha: string
}

/**
 * Reads the caller's OWN profile row (allowlist). Enabled once the uid is known.
 * Sem `onError` (v5) — a página renderiza o estado de erro.
 */
export function usePerfilRh() {
  const user = useUser()
  const uid = user?.id
  return useQuery<PerfilRhRow, Error>({
    queryKey: perfilRhKeys.me(uid),
    queryFn: () => readMeuPerfil(uid as string),
    enabled: !!uid,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    retry: 2,
  })
}

/**
 * Saves the caller's name (+ optional avatar path) via the RPC. On success:
 *  - toasts + invalidates the own-row query, AND
 *  - refreshes the authStore `adminUser` (merge edited fields → `setAdminUser`) so the RH
 *    panel chrome updates WITHOUT a re-login (BLOCKER / Success Criterion #1).
 *
 * The caller ALWAYS passes the currently-loaded nome (WARNING #3) — an avatar-only save
 * still carries the nome so the unconditional RPC SET never blanks `nome_completo`.
 */
export function useAtualizarPerfil() {
  const queryClient = useQueryClient()
  const user = useUser()
  const uid = user?.id
  return useMutation<void, Error, AtualizarPerfilVars>({
    mutationKey: [...perfilRhKeys.all, 'atualizar'],
    mutationFn: ({ nome, avatarPath }) => atualizarPerfil(nome, avatarPath ?? null),
    onSuccess: (_result, variables) => {
      toast.success('Perfil atualizado.')

      // Refresh the shell identity WITHOUT a re-login — merge the edited fields onto the
      // current adminUser and route it back through setAdminUser (adminUser/profile/role).
      const adminUser = useAuthStore.getState().adminUser
      if (adminUser) {
        useAuthStore.getState().setAdminUser({
          ...adminUser,
          nome_completo: variables.nome,
          avatar_url: variables.avatarPath ?? adminUser.avatar_url,
          updated_at: new Date().toISOString(),
        })
      }

      void queryClient.invalidateQueries({ queryKey: perfilRhKeys.me(uid) })
    },
  })
}

/**
 * Changes the caller's password (PERFIL-02). Success → toast. NO `onError` toast: the
 * `WRONG_CURRENT` field error is owned by the SenhaSection (30-05) via `mutateAsync` +
 * try/catch (it sets the "Senha atual" field), so toasting it here would double-signal.
 */
export function useAlterarSenha() {
  return useMutation<void, Error, AlterarSenhaVars>({
    mutationKey: [...perfilRhKeys.all, 'alterar-senha'],
    mutationFn: ({ email, senhaAtual, novaSenha }) => alterarSenha(email, senhaAtual, novaSenha),
    onSuccess: () => {
      toast.success('Senha alterada com sucesso.')
    },
  })
}

/**
 * Uploads a new avatar (PERFIL-03). Returns ONLY the storage PATH — it does NOT persist
 * on its own (WARNING #3). The caller MUST follow with
 * `atualizarPerfil({ nome: <current loaded nome>, avatarPath })` so the avatar is written
 * to `usuarios_rh.avatar_url` WITHOUT ever sending a null/blank nome to the unconditional
 * RPC SET. Invalidates the own-row query on success (the path change is reflected on refetch).
 */
export function useUploadAvatar() {
  const queryClient = useQueryClient()
  const user = useUser()
  const uid = user?.id
  return useMutation<string, Error, File>({
    mutationKey: [...perfilRhKeys.all, 'upload-avatar'],
    mutationFn: (file) => uploadAvatar(file, uid as string),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: perfilRhKeys.me(uid) })
    },
  })
}
