/**
 * TanStack Query hooks para o console de gestão de usuários RH (USR-01..05).
 *
 * Um `useQuery` sobre o roster (`listUsuariosRh`) + quatro `useMutation`s (criar /
 * mudarPapel / ativarDesativar / resetarSenha). TODA mutação `invalidateQueries` a
 * lista no sucesso — o reconcile default é refetch (não optimistic): a contagem
 * anti-lockout precisa refletir a verdade do servidor (UI-SPEC §States).
 *
 * Mapeamento de erro por `error_code` (carregado em `err.details.error_code` pelo
 * serviço): `LAST_ADMIN` → cópia do último-admin; `UNAUTHORIZED` → sessão-expirada
 * DISTINTA (não o balde genérico); demais → cópia genérica. `EMAIL_SEND_FAILED` é
 * sucesso-com-aviso (`toast.warning`, não erro). Os erros do CRIAR NÃO são toastados
 * aqui — o dialog é dono deles (roteamento de `EMAIL_EXISTS` → campo email via
 * `mutateAsync` + try/catch).
 *
 * @module features/admin/hooks/useUsuariosRh
 * @see src/features/admin/bias-audit/hooks/useBiasAudit.ts (keys + query + mutation + invalidate)
 * @see src/features/decisao/hooks/useRegistrarDecisao.ts (invalidate on success)
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import {
  listUsuariosRh,
  criarUsuario,
  mudarPapel,
  ativarDesativar,
  resetarSenha,
  type UsuarioRhRow,
  type CriarResult,
  type WriteResult,
} from '../services/usuariosRhService'
import type { NovoUsuarioForm, Papel } from '../schemas/usuarioRhSchemas'

/** Query keys hierárquicas (all → list). */
export const usuariosRhKeys = {
  all: ['usuarios-rh'] as const,
  list: () => [...usuariosRhKeys.all, 'list'] as const,
} as const

/** Lê o `error_code` da EF carregado em `err.details.error_code` pelo serviço. */
function errorCodeOf(err: unknown): string | undefined {
  return (err as { details?: { error_code?: string } } | null | undefined)?.details?.error_code
}

/** Toast de erro para as mutações de linha, mapeado por `error_code`. */
function toastRowError(err: unknown): void {
  const code = errorCodeOf(err)
  if (code === 'LAST_ADMIN') {
    toast.error('Não é possível remover o último administrador ativo do sistema.')
  } else if (code === 'UNAUTHORIZED') {
    toast.error('Sua sessão expirou. Entre novamente.')
  } else {
    toast.error('Não foi possível concluir a ação. Tente novamente.')
  }
}

/** Lê o roster de usuários RH (allowlist). Sem `onError` (v5) — a página renderiza o erro. */
export function useUsuariosRh() {
  return useQuery<UsuarioRhRow[], Error>({
    queryKey: usuariosRhKeys.list(),
    queryFn: () => listUsuariosRh(),
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    retry: 2,
  })
}

/**
 * Cria um usuário RH (USR-02). Sucesso → toast + invalidate; `EMAIL_SEND_FAILED` →
 * `toast.warning` (sucesso-com-aviso). SEM `onError` — o dialog trata `EMAIL_EXISTS`
 * (campo email) via `mutateAsync` + try/catch.
 */
export function useCriarUsuario() {
  const queryClient = useQueryClient()
  return useMutation<CriarResult, Error, NovoUsuarioForm>({
    mutationKey: [...usuariosRhKeys.all, 'criar'],
    mutationFn: (input) => criarUsuario(input),
    onSuccess: (result) => {
      if (result.warning === 'EMAIL_SEND_FAILED') {
        toast.warning(
          'Usuário criado, mas o e-mail para definir a senha não pôde ser enviado. Reenvie pela ação "Resetar senha".',
        )
      } else {
        toast.success('Usuário criado. Enviamos um e-mail para ele definir a senha.')
      }
      void queryClient.invalidateQueries({ queryKey: usuariosRhKeys.list() })
    },
  })
}

/** Muda o papel de um usuário (USR-03). Sucesso → toast + invalidate; erro → toast mapeado. */
export function useMudarPapel() {
  const queryClient = useQueryClient()
  return useMutation<WriteResult, Error, { targetId: string; novoPapel: Papel }>({
    mutationKey: [...usuariosRhKeys.all, 'mudar-papel'],
    mutationFn: ({ targetId, novoPapel }) => mudarPapel(targetId, novoPapel),
    onSuccess: () => {
      toast.success('Papel atualizado.')
      void queryClient.invalidateQueries({ queryKey: usuariosRhKeys.list() })
    },
    onError: toastRowError,
  })
}

/** Ativa/desativa um usuário (USR-04). Sucesso → toast (por verbo) + invalidate; erro → toast mapeado. */
export function useAtivarDesativar() {
  const queryClient = useQueryClient()
  return useMutation<WriteResult, Error, { targetId: string; ativar: boolean }>({
    mutationKey: [...usuariosRhKeys.all, 'ativar-desativar'],
    mutationFn: ({ targetId, ativar }) => ativarDesativar(targetId, ativar),
    onSuccess: (_result, variables) => {
      toast.success(variables.ativar ? 'Usuário reativado.' : 'Usuário desativado.')
      void queryClient.invalidateQueries({ queryKey: usuariosRhKeys.list() })
    },
    onError: toastRowError,
  })
}

/**
 * Dispara o reset de senha (USR-05). Sucesso → toast + invalidate; `EMAIL_SEND_FAILED`
 * → `toast.warning`; erro → toast mapeado.
 */
export function useResetarSenha() {
  const queryClient = useQueryClient()
  return useMutation<WriteResult, Error, string>({
    mutationKey: [...usuariosRhKeys.all, 'resetar-senha'],
    mutationFn: (targetId) => resetarSenha(targetId),
    onSuccess: (result) => {
      if (result.warning === 'EMAIL_SEND_FAILED') {
        toast.warning('Não foi possível enviar o e-mail de redefinição agora. Tente novamente em instantes.')
      } else {
        toast.success('E-mail de redefinição de senha enviado.')
      }
      void queryClient.invalidateQueries({ queryKey: usuariosRhKeys.list() })
    },
    onError: toastRowError,
  })
}
