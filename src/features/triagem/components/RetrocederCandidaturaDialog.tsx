/**
 * RetrocederCandidaturaDialog — regressão auditada de etapa (OPER-03).
 *
 * Dialog pequeno mountado por Kanban card + HubCandidatoRH: um destino `<Select>` que
 * lista SOMENTE etapas anteriores não-terminais (ordinal do funil menor que `etapaAtual`,
 * nunca `aprovado`/`rejeitado`, nunca uma etapa à frente) + uma justificativa `<Textarea>`
 * obrigatória NÃO-VAZIA (não o piso ≥50 — esse é só da rejeição). O confirm dispara o hook
 * ESTENDIDO `useUpdateCandidaturaEtapa`, que repassa `justificativa` ao serviço → o
 * `UPDATE candidaturas.etapa_atual` (+ `etapa_justificativa`) dispara o trigger
 * `avancar_etapa()`, cujo `RAISE 'Regressão de etapa exige justificativa preenchida'` é a
 * autoridade do servidor. Nenhum INSERT direto em `historico_candidatura` (o trigger é o
 * único escritor).
 *
 * Estilo NEUTRO (§Color): retroceder é um movimento lateral, não uma rejeição — sem
 * `bg-destructive`, sem o accent turquesa. O dialog renderiza na superfície LIGHT do
 * `AlertDialogContent` (tokens `foreground`/`muted-foreground`).
 *
 * @module features/triagem/components/RetrocederCandidaturaDialog
 * @see src/features/decisao/components/RegistrarDecisaoForm.tsx (Textarea + AlertDialog gate)
 * @see src/features/vagas/hooks/useCandidaturas.ts (useUpdateCandidaturaEtapa — repassa justificativa)
 * @see .planning/phases/31-avan-ar-rejeitar-em-todo-o-funil-reject-do-comparativo-funil/31-UI-SPEC.md
 */
import { useState } from 'react'
import { Loader2 } from 'lucide-react'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { AVISO_JUSTIFICATIVA_VISIVEL } from '../constants/avisoJustificativa'
import { useUpdateCandidaturaEtapa } from '@/features/vagas/hooks/useCandidaturas'
import {
  ETAPA_M2_LABELS,
  type EtapaFunilM2,
} from '../services/triagemService'

/**
 * Ordem do funil M2 — SOMENTE as etapas não-terminais (terminais `aprovado`/`rejeitado`
 * ficam de fora). O índice nesta lista define o ordinal usado no filtro de "etapa anterior".
 */
export const FUNNEL_ORDER: EtapaFunilM2[] = [
  'inscricao',
  'triagem',
  'avaliacao_assincrona',
  'entrevista_online',
  'entrevista_presencial',
  'decisao_final',
]

export interface RetrocederCandidaturaDialogProps {
  /** Candidatura alvo do retrocesso. */
  candidaturaId: string
  /** Nome do candidato (interpolado no título). */
  nome: string
  /** Etapa atual — define quais destinos anteriores aparecem. */
  etapaAtual: EtapaFunilM2
  /** Botão de disparo fornecido pelo host — casa com a chrome (glass) da superfície. */
  trigger: React.ReactNode
  /** Chamado após o retrocesso bem-sucedido (o host fecha/refaz fetch). */
  onDone?: () => void
}

/**
 * Dialog de retrocesso auditado. Destino restrito a etapas anteriores + justificativa
 * obrigatória não-vazia; o confirm dispara `useUpdateCandidaturaEtapa` com a justificativa.
 */
export function RetrocederCandidaturaDialog({
  candidaturaId,
  nome,
  etapaAtual,
  trigger,
  onDone,
}: RetrocederCandidaturaDialogProps) {
  const [open, setOpen] = useState(false)
  const [destino, setDestino] = useState<EtapaFunilM2 | null>(null)
  const [justificativa, setJustificativa] = useState('')
  const { mutate, isPending } = useUpdateCandidaturaEtapa()

  // Somente etapas ESTRITAMENTE anteriores à atual (ordinal menor). Se `etapaAtual` for
  // terminal/desconhecida, indexOf → -1 e slice(0, 0) devolve lista vazia.
  //
  // ⚠ O comentário aqui dizia "o host oculta a ação de retroceder para terminais de
  // qualquer forma" — e o host NÃO ocultava. Medido em 2026-08-26 com uma candidatura
  // em `aprovado`: o botão Retroceder aparecia, o diálogo abria, e o select ficava
  // VAZIO. O RH não conseguia retroceder nem entender por quê.
  //
  // Um componente confiando numa filtragem que o outro não faz. Agora `FUNNEL_ORDER`
  // é exportada e o host decide com ela (`podeRetroceder`), em vez de duas listas
  // implícitas discordando em silêncio.
  const currentIndex = FUNNEL_ORDER.indexOf(etapaAtual)
  const destinos = FUNNEL_ORDER.slice(0, Math.max(currentIndex, 0))

  // Retrocesso exige justificativa NÃO-VAZIA (não o piso ≥50 — esse é só da rejeição).
  const justificativaOk = justificativa.trim().length > 0
  const canSubmit = destino !== null && justificativaOk && !isPending

  function handleConfirm() {
    if (destino === null || !justificativaOk) return
    mutate(
      { candidaturaId, novaEtapa: destino, justificativa },
      {
        onSuccess: () => {
          setOpen(false)
          setDestino(null)
          setJustificativa('')
          onDone?.()
        },
      },
    )
  }

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger asChild>{trigger}</AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Retroceder {nome} para uma etapa anterior?</AlertDialogTitle>
          <AlertDialogDescription>
            Selecione a etapa de destino e explique o motivo. O retorno fica registrado na
            trilha de auditoria.
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="space-y-6">
          {/* Destino — apenas etapas anteriores não-terminais. */}
          <div className="space-y-2">
            <label
              htmlFor="destino-retrocesso"
              className="text-sm font-semibold text-foreground"
            >
              Etapa de destino{' '}
              <span className="font-normal text-muted-foreground">(obrigatória)</span>
            </label>
            <Select
              value={destino ?? undefined}
              onValueChange={(v: string) => setDestino(v as EtapaFunilM2)}
            >
              <SelectTrigger
                id="destino-retrocesso"
                aria-label="Etapa de destino"
                className="w-full"
              >
                <SelectValue placeholder="Selecione a etapa de destino" />
              </SelectTrigger>
              <SelectContent>
                {destinos.map((etapa) => (
                  <SelectItem key={etapa} value={etapa}>
                    {ETAPA_M2_LABELS[etapa]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Justificativa — obrigatória não-vazia (sem piso ≥50). */}
          <div className="space-y-2">
            <label
              htmlFor="justificativa-retrocesso"
              className="text-sm font-semibold text-foreground"
            >
              Justificativa{' '}
              <span className="font-normal text-muted-foreground">(obrigatória)</span>
            </label>
            <Textarea
              id="justificativa-retrocesso"
              value={justificativa}
              onChange={(e) => setJustificativa(e.target.value)}
              placeholder="Explique por que o candidato está voltando para esta etapa."
              rows={4}
              aria-describedby="justificativa-retrocesso-visivel"
            />
            {/* §7.22: o retrocesso grava `etapa_justificativa` pelo mesmo caminho da
                rejeição — e esse campo entra na cópia de dados do Art. 18. */}
            <p id="justificativa-retrocesso-visivel" className="text-sm text-muted-foreground">
              {AVISO_JUSTIFICATIVA_VISIVEL}
            </p>
          </div>
        </div>

        <AlertDialogFooter>
          <AlertDialogCancel disabled={isPending}>Cancelar</AlertDialogCancel>
          {/* preventDefault → o dialog fica aberto durante o pending; fecha no onSuccess.
              Estilo NEUTRO (default buttonVariants) — nem destructive, nem accent. */}
          <AlertDialogAction
            onClick={(e) => {
              e.preventDefault()
              handleConfirm()
            }}
            disabled={!canSubmit}
            className="min-h-[44px]"
          >
            {isPending ? (
              <span className="flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" /> Retrocedendo…
              </span>
            ) : (
              'Retroceder etapa'
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
