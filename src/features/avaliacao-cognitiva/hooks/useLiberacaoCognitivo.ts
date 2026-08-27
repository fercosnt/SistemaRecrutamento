/**
 * Liberação nominal da avaliação de raciocínio (Raven) — lado RH.
 *
 * A escrita passa pelas RPCs `liberar_cognitivo`/`revogar_cognitivo` porque
 * `cognitivo_liberacao` NÃO tem policy de INSERT/UPDATE: uma policy de escrita
 * permitiria liberar sem registrar quem liberou, e a liberação é um ato sobre uma
 * pessoa. As RPCs conferem papel (rh/administrador) e ownership (`rh` só na própria
 * vaga) dentro do corpo, porque RLS não se aplica a SECURITY DEFINER.
 *
 * @module features/avaliacao-cognitiva/hooks/useLiberacaoCognitivo
 */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase/client'
import { toast } from 'sonner'

export interface LiberacaoCognitivoRH {
  liberado: boolean
  liberado_em: string | null
  revogado_em: string | null
  concluido: boolean
  /**
   * O resultado, quando já existe. Sem isto o hub dizia apenas "concluída" e o RH
   * precisava sair para outra tela para saber COMO foi — na tela onde ele mesmo
   * liberou a prova. Um instrumento aplicado presencialmente a poucos finalistas é
   * lido logo depois de aplicado; o resultado pertence a este bloco.
   */
  resultado: {
    percentil: number | null
    classificacao: string | null
    total_acertos: number | null
    tempo_total_segundos: number | null
  } | null
}

export function useLiberacaoCognitivo(candidaturaId: string) {
  return useQuery<LiberacaoCognitivoRH>({
    queryKey: ['cognitivo', 'liberacao-rh', candidaturaId],
    enabled: !!candidaturaId,
    queryFn: async () => {
      const [lib, score] = await Promise.all([
        supabase
          .from('cognitivo_liberacao')
          .select('liberado_em, revogado_em')
          .eq('candidatura_id', candidaturaId)
          .maybeSingle(),
        supabase
          .from('scores_raven')
          .select('percentil, classificacao, total_acertos, tempo_total_segundos')
          .eq('candidatura_id', candidaturaId)
          .maybeSingle(),
      ])

      if (lib.error) throw new Error(lib.error.message)

      const revogadoEm = (lib.data?.revogado_em as string | null) ?? null
      const s = score.data as Record<string, unknown> | null
      return {
        // Uma linha REVOGADA continua existindo (o rastro sobrevive à revogação),
        // então "liberado" é ter linha E não estar revogada.
        liberado: !!lib.data && !revogadoEm,
        liberado_em: (lib.data?.liberado_em as string | null) ?? null,
        revogado_em: revogadoEm,
        concluido: !!s,
        resultado: s
          ? {
              percentil: (s.percentil as number | null) ?? null,
              classificacao: (s.classificacao as string | null) ?? null,
              total_acertos: (s.total_acertos as number | null) ?? null,
              tempo_total_segundos: (s.tempo_total_segundos as number | null) ?? null,
            }
          : null,
      }
    },
  })
}

export function useLiberarCognitivo(candidaturaId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (motivo?: string) => {
      const { error } = await supabase.rpc('liberar_cognitivo', {
        p_candidatura_id: candidaturaId,
        p_motivo: motivo,
      })
      if (error) throw error
    },
    onSuccess: () => {
      toast.success('Avaliação de raciocínio liberada para este candidato.')
      void qc.invalidateQueries({ queryKey: ['cognitivo', 'liberacao-rh', candidaturaId] })
    },
    onError: (e: { code?: string; message?: string }) => {
      // 42501 vem das duas guardas da RPC — papel insuficiente OU vaga de outro
      // recrutador. A mensagem cobre as duas sem revelar qual, que é o certo: dizer
      // "esta vaga não é sua" a quem não deveria nem saber que ela existe vaza
      // informação de escopo.
      toast.error(
        e?.code === '42501'
          ? 'Você não tem permissão para liberar esta avaliação.'
          : (e?.message ?? 'Não foi possível liberar a avaliação.'),
      )
    },
  })
}

export function useRevogarCognitivo(candidaturaId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (motivo?: string) => {
      const { error } = await supabase.rpc('revogar_cognitivo', {
        p_candidatura_id: candidaturaId,
        p_motivo: motivo,
      })
      if (error) throw error
    },
    onSuccess: () => {
      toast.success('Liberação revogada.')
      void qc.invalidateQueries({ queryKey: ['cognitivo', 'liberacao-rh', candidaturaId] })
    },
    onError: (e: { message?: string }) =>
      toast.error(e?.message ?? 'Não foi possível revogar a liberação.'),
  })
}
