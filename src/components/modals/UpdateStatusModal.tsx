/**
 * Modal de Atualização de Status de Candidatura (HR)
 *
 * Features:
 * - Dropdown de status com validação de transições
 * - Rejeição roteada pelo caminho auditado `registrar_decisao` (FUNIL-02): exige
 *   uma justificativa ≥50 caracteres e grava uma linha auditável (RNF-07a/LGPD-02),
 *   nunca um status-only write que escapa da trilha (A9). Transições não-rejeição
 *   seguem no `useUpdateCandidaturaStatus`.
 * - Nota verdadeira sobre e-mail (48-16 / JORN-15): mudar o status aqui NÃO envia e-mail.
 *   A antiga opção «Notificar candidato por email» não tinha efeito — nenhum código a honra
 *   desde a aposentadoria do n8n (P39) — e foi removida, junto com o campo do payload.
 * - Nenhum atalho sem trilha (49-05 / JORN-34 · D-67): este modal não REABRE
 *   (`rejeitado → em_analise`) nem ENCERRA (`aprovado_proxima → finalizado`) uma candidatura.
 *   As duas escreviam só o `status`, e com `etapa_atual` igual o `avancar_etapa` sai no
 *   early-return — zero histórico, zero autor, zero justificativa. Reabrir é pelo pedido de
 *   revisão da decisão (`responder_revisao_decisao`, D-01); encerrar é pela decisão final.
 *   Sem destino, o select não é renderizado: a tela diz a razão.
 *
 * @module components/modals/UpdateStatusModal
 * @see src/features/revisao/services/revisaoService.ts (`responder_revisao_decisao` — a reabertura auditada)
 */

import React, { useState, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select'
import { Label } from '../ui/label'
import { Textarea } from '../ui/textarea'
import { GlassButton } from '../ui/glass'
import { Alert, AlertDescription } from '../ui/alert'
import { useUpdateCandidaturaStatus } from '@/features/vagas/hooks/useCandidaturas'
import { useRegistrarDecisao } from '@/features/decisao/hooks/useRegistrarDecisao'
import { JUSTIFICATIVA_MIN } from '@/features/decisao/schemas/decisaoSchema'
import type { StatusCandidatura } from '@/features/vagas/types/vagasTypes'
import { AlertCircle, CheckCircle2, Info } from 'lucide-react'
import { cn } from '@/lib/utils'

/**
 * Labels de status em português
 */
const STATUS_LABELS: Record<StatusCandidatura, string> = {
  aguardando_resposta: 'Aguardando Resposta',
  em_analise: 'Em Análise',
  aprovado_proxima: 'Aprovado para Próxima Etapa',
  rejeitado: 'Rejeitado',
  finalizado: 'Finalizado',
}

/**
 * Fluxo de transições válidas por status
 * IMPORTANTE: Apenas status que existem no enum status_candidatura do banco!
 *
 * ⚠ 49-05 / JORN-34 · D-67: duas transições SAÍRAM daqui, e as duas pela MESMA razão de forma —
 * elas escreviam só o `status` e por isso gravavam ZERO histórico. O `avancar_etapa` sai no
 * early-return quando `etapa_atual` não muda, então um `UPDATE` de status puro não deixa
 * rastro nenhum: nem linha de histórico, nem justificativa, nem autor.
 *
 * A tela deixa de OFERECER. A defesa no banco (a trava de «candidatura encerrada» no
 * `avancar_etapa`) é o plano 49-06 — é ela que impede o caminho, não este arquivo.
 */
const VALID_TRANSITIONS: Record<StatusCandidatura, StatusCandidatura[]> = {
  aguardando_resposta: ['em_analise', 'rejeitado'],
  em_analise: ['aprovado_proxima', 'rejeitado'],
  // D-67: `finalizado` SAIU. Encerrar por status é encerrar sem trilha — e é a origem
  // plausível das 3 linhas `status='finalizado'` em etapa de TRABALHO medidas em PROD em
  // 2026-09-22 (`triagem`, `entrevista_online`, `decisao_final`), as mesmas que o Kanban
  // passou a selar como «Encerrada» na Task 1 deste plano. Quem encerra é a decisão final
  // (`registrar_decisao`), que grava `decisao_final` com autor e justificativa.
  aprovado_proxima: ['em_analise', 'rejeitado'],
  // JORN-34: `em_analise` SAIU. Era reabrir uma candidatura encerrada por um atalho sem
  // histórico e sem justificativa. Reabrir tem caminho próprio e AUDITADO desde a Phase 48:
  // o pedido de revisão da decisão (`responder_revisao_decisao`), cuja transição
  // `rejeitado → decisao_final` é sancionada de propósito (D-01).
  rejeitado: [],
  finalizado: [], // Final state
}

interface UpdateStatusModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  candidaturaId: string
  candidatoNome: string
  statusAtual: StatusCandidatura
  onSuccess?: () => void
}

/**
 * Modal para atualizar status de candidatura
 */
export function UpdateStatusModal({
  open,
  onOpenChange,
  candidaturaId,
  candidatoNome,
  statusAtual,
  onSuccess,
}: UpdateStatusModalProps) {
  const [novoStatus, setNovoStatus] = useState<StatusCandidatura | ''>('')
  const [motivoRejeicao, setMotivoRejeicao] = useState('')
  const [validationError, setValidationError] = useState<string | null>(null)

  // Sucesso (qualquer caminho): reseta o form, fecha o modal, dispara o callback.
  const resetAndClose = () => {
    setNovoStatus('')
    setMotivoRejeicao('')
    setValidationError(null)
    onOpenChange(false)
    onSuccess?.()
  }

  const { mutate: updateStatus, isPending: isUpdatingStatus } =
    useUpdateCandidaturaStatus({ onSuccess: resetAndClose })

  // FUNIL-02: a rejeição escreve pelo caminho auditado `registrar_decisao` (que grava
  // `decisao_final` com `por_usuario := auth.uid()` + dispara `avancar_etapa`), nunca
  // um status-only write que escapa da trilha.
  const { mutate: registrarRejeicao, isPending: isRejecting } = useRegistrarDecisao()

  const isPending = isUpdatingStatus || isRejecting

  // Resetar form quando modal abre/fecha
  useEffect(() => {
    if (!open) {
      setNovoStatus('')
      setMotivoRejeicao('')
      setValidationError(null)
    }
  }, [open])

  // Transições válidas a partir do status atual
  const transicoesValidas = VALID_TRANSITIONS[statusAtual] || []

  // Validar se motivo de rejeição é necessário
  const precisaMotivoRejeicao = novoStatus === 'rejeitado'

  // A justificativa da rejeição precisa de ≥50 chars (espelha o CHECK do DB + a
  // re-asserção da RPC `registrar_decisao` — defense in depth; o servidor é a verdade).
  const justificativa = motivoRejeicao.trim()
  const justificativaValida = justificativa.length >= JUSTIFICATIVA_MIN

  // Handler de submit
  const handleSubmit = () => {
    setValidationError(null)

    // Validação: precisa selecionar novo status
    if (!novoStatus) {
      setValidationError('Selecione um status para continuar')
      return
    }

    // Validação: não pode ser o mesmo status
    if (novoStatus === statusAtual) {
      setValidationError('Selecione um status diferente do atual')
      return
    }

    // Rejeição → caminho auditado `registrar_decisao` (FUNIL-02), NUNCA status-only.
    if (precisaMotivoRejeicao) {
      if (!justificativaValida) {
        setValidationError(
          `A justificativa da rejeição precisa de pelo menos ${JUSTIFICATIVA_MIN} caracteres.`,
        )
        return
      }
      registrarRejeicao(
        { candidaturaId, decisao: 'rejeitado', justificativa },
        { onSuccess: resetAndClose },
      )
      return
    }

    // Transições não-rejeição: caminho de status inalterado.
    updateStatus({
      candidaturaId,
      status_candidatura: novoStatus,
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="backdrop-blur-xl backdrop-saturate-150 bg-white/15 border-white/25 border rounded-xl shadow-2xl text-white sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="text-white drop-shadow-lg font-bold">
            Atualizar Status da Candidatura
          </DialogTitle>
          <DialogDescription className="text-white/80 drop-shadow-sm">
            Altere o status de <span className="font-semibold text-white drop-shadow-sm">{candidatoNome}</span>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Status Atual */}
          <div className="space-y-2">
            <Label className="text-sm text-white drop-shadow-sm">Status Atual</Label>
            <div className="p-3 bg-white/10 border-white/20 border backdrop-blur-sm rounded-md">
              <span className="font-medium text-white drop-shadow-sm">{STATUS_LABELS[statusAtual]}</span>
            </div>
          </div>

          {/* Novo Status — ou, quando não há destino, a razão.

              49-05 / JORN-34 · D-67: com `rejeitado` e `finalizado` sem destino nenhum, o que
              havia aqui era um select ABERTO e vazio, com um item-fantasma desabilitado
              («Nenhuma transição disponível») e a frase «Este status é final», que para
              `rejeitado` era FALSA — há caminho, só não é este. Um controle que convida ao
              clique e não responde é pior que a ausência dele: o operador tenta, não entende, e
              procura outro atalho. Sem destino, o select não é renderizado. */}
          {transicoesValidas.length === 0 ? (
            <div
              data-testid="status-sem-transicao"
              className="space-y-2 p-4 bg-white/10 border-white/20 border backdrop-blur-sm rounded-md"
            >
              <p className="text-sm font-medium text-white drop-shadow-sm">
                O status desta candidatura não pode ser alterado por aqui.
              </p>
              {/* Frase NEUTRA de propósito: não promete ao candidato que a decisão será
                  revista, não cita nenhum canal externo, e não afirma «este é o fim» — diz o
                  que é verdade (mudar o status aqui não registra autor nem motivo) e nomeia o
                  caminho que registra. */}
              <p className="text-xs text-white/75 drop-shadow-sm">
                O processo já foi encerrado, e mudar apenas o status não registraria quem mudou
                nem por quê. Havendo o que rever, o caminho é o pedido de revisão da decisão,
                que fica no histórico da candidatura.
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              <Label htmlFor="novo-status" className="text-white drop-shadow-sm">
                Novo Status <span className="text-red-400">*</span>
              </Label>
              <Select
                value={novoStatus}
                onValueChange={(value) => setNovoStatus(value as StatusCandidatura)}
                disabled={isPending}
              >
                <SelectTrigger
                  id="novo-status"
                  className="bg-white/10 border-white/20 text-white data-[placeholder]:text-white/50 focus:bg-white/15 focus:border-white/30 [&_svg]:text-white/70"
                >
                  <SelectValue placeholder="Selecione o novo status..." />
                </SelectTrigger>
                <SelectContent className="bg-[#00109E]/95 backdrop-blur-xl border-white/20 text-white">
                  {transicoesValidas.map((status) => (
                    <SelectItem
                      key={status}
                      value={status}
                      className="text-white hover:bg-white/10 focus:bg-white/20 cursor-pointer"
                    >
                      {STATUS_LABELS[status]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Motivo de Rejeição (condicional) */}
          {novoStatus === 'rejeitado' && (
            <div className="space-y-2">
              <Label htmlFor="motivo-rejeicao" className="text-white drop-shadow-sm">
                Motivo da Rejeição <span className="text-red-400">*</span>
              </Label>
              <Textarea
                id="motivo-rejeicao"
                placeholder="Descreva o motivo da rejeição (mínimo 50 caracteres)..."
                value={motivoRejeicao}
                onChange={(e) => setMotivoRejeicao(e.target.value)}
                disabled={isPending}
                rows={4}
                aria-describedby="motivo-rejeicao-ajuda"
                className="resize-none bg-white/10 border-white/20 text-white placeholder:text-white/50 focus:bg-white/15 focus:border-white/30"
              />
              <div className="flex items-start justify-between gap-3">
                <p id="motivo-rejeicao-ajuda" className="text-xs text-white/70 drop-shadow-sm">
                  A rejeição é registrada como uma decisão auditável (RNF-07a/LGPD-02). Seja
                  específico e profissional — este motivo fica no registro interno e não é
                  enviado ao candidato, que recebe por e-mail uma mensagem neutra.
                </p>
                <span
                  className={cn(
                    'flex-shrink-0 text-xs tabular-nums drop-shadow-sm',
                    justificativaValida ? 'text-green-300' : 'text-white/60',
                  )}
                >
                  {justificativa.length}/{JUSTIFICATIVA_MIN}
                </span>
              </div>
            </div>
          )}

          {/* 48-16 (JORN-15 · D-09): o que de fato avisa o candidato — sem opção sem efeito. */}
          <div className="flex items-start space-x-3 p-4 bg-white/10 border-white/20 border backdrop-blur-sm rounded-md">
            <Info className="h-4 w-4 mt-0.5 flex-shrink-0 text-white/80" aria-hidden="true" />
            <p className="text-xs text-white/80 drop-shadow-sm">
              Mudar o status aqui não envia e-mail ao candidato. Ele é avisado por e-mail quando uma decisão é registrada ou quando há algo para ele fazer, e acompanha o resto pelo painel.
            </p>
          </div>

          {/* Validation Error */}
          {validationError && (
            <Alert 
              variant="destructive"
              className="bg-red-500/20 border-red-500/30 backdrop-blur-sm"
            >
              <AlertCircle className="h-4 w-4 text-red-400" />
              <AlertDescription className="text-red-200 drop-shadow-sm">
                {validationError}
              </AlertDescription>
            </Alert>
          )}

          {/* Info sobre etapas */}
          {novoStatus === 'aprovado_proxima' && (
            <Alert className="bg-green-500/20 border-green-500/30 backdrop-blur-sm">
              <CheckCircle2 className="h-4 w-4 text-green-400" />
              <AlertDescription className="text-green-200 drop-shadow-sm">
                O candidato será aprovado para a próxima etapa do processo seletivo.
              </AlertDescription>
            </Alert>
          )}
        </div>

        <DialogFooter className="gap-3">
          <GlassButton
            variant="white"
            onClick={() => onOpenChange(false)}
            disabled={isPending}
            className="text-white"
          >
            Cancelar
          </GlassButton>
          <GlassButton
            variant="secondary"
            onClick={handleSubmit}
            disabled={
              isPending ||
              !novoStatus ||
              transicoesValidas.length === 0 ||
              (precisaMotivoRejeicao && !justificativaValida)
            }
            className="text-white"
          >
            {isPending ? 'Salvando...' : 'Salvar Alterações'}
          </GlassButton>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
