/**
 * Modal de Atualização de Status de Candidatura (HR)
 *
 * Features:
 * - Dropdown de status com validação de transições
 * - Textarea para motivo de rejeição (obrigatório se rejeitando)
 * - Checkbox "Notificar candidato"
 * - Integração com useUpdateCandidaturaStatus hook
 *
 * @module components/modals/UpdateStatusModal
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
import { Checkbox } from '../ui/checkbox'
import { GlassButton } from '../ui/glass'
import { Alert, AlertDescription } from '../ui/alert'
import { useUpdateCandidaturaStatus } from '@/features/vagas/hooks/useCandidaturas'
import type { StatusCandidatura } from '@/features/vagas/types/vagasTypes'
import { AlertCircle, CheckCircle2 } from 'lucide-react'

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
 */
const VALID_TRANSITIONS: Record<StatusCandidatura, StatusCandidatura[]> = {
  aguardando_resposta: ['em_analise', 'rejeitado'],
  em_analise: ['aprovado_proxima', 'rejeitado'],
  aprovado_proxima: ['em_analise', 'finalizado', 'rejeitado'],
  rejeitado: ['em_analise'], // Permite reconsiderar candidato rejeitado
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
  const [notificarCandidato, setNotificarCandidato] = useState(true)
  const [validationError, setValidationError] = useState<string | null>(null)

  const { mutate: updateStatus, isPending } = useUpdateCandidaturaStatus({
    onSuccess: () => {
      // Resetar form
      setNovoStatus('')
      setMotivoRejeicao('')
      setNotificarCandidato(true)
      setValidationError(null)

      // Fechar modal
      onOpenChange(false)

      // Callback opcional
      onSuccess?.()
    },
  })

  // Resetar form quando modal abre/fecha
  useEffect(() => {
    if (!open) {
      setNovoStatus('')
      setMotivoRejeicao('')
      setNotificarCandidato(true)
      setValidationError(null)
    }
  }, [open])

  // Transições válidas a partir do status atual
  const transicoesValidas = VALID_TRANSITIONS[statusAtual] || []

  // Validar se motivo de rejeição é necessário
  const precisaMotivoRejeicao = novoStatus === 'rejeitado'

  // Handler de submit
  const handleSubmit = () => {
    setValidationError(null)

    // Validação: precisa selecionar novo status
    if (!novoStatus) {
      setValidationError('Selecione um status para continuar')
      return
    }

    // Validação: motivo de rejeição obrigatório
    if (precisaMotivoRejeicao && !motivoRejeicao.trim()) {
      setValidationError('Motivo da rejeição é obrigatório')
      return
    }

    // Validação: não pode ser o mesmo status
    if (novoStatus === statusAtual) {
      setValidationError('Selecione um status diferente do atual')
      return
    }

    // Executar mutation
    updateStatus({
      candidaturaId,
      status_candidatura: novoStatus,
      motivo_rejeicao: precisaMotivoRejeicao ? motivoRejeicao.trim() : undefined,
      notificar_candidato: notificarCandidato,
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

          {/* Novo Status */}
          <div className="space-y-2">
            <Label htmlFor="novo-status" className="text-white drop-shadow-sm">
              Novo Status <span className="text-red-400">*</span>
            </Label>
            <Select
              value={novoStatus}
              onValueChange={(value) => setNovoStatus(value as StatusCandidatura)}
              disabled={isPending || transicoesValidas.length === 0}
            >
              <SelectTrigger 
                id="novo-status"
                className="bg-white/10 border-white/20 text-white data-[placeholder]:text-white/50 focus:bg-white/15 focus:border-white/30 [&_svg]:text-white/70"
              >
                <SelectValue placeholder="Selecione o novo status..." />
              </SelectTrigger>
              <SelectContent className="bg-[#00109E]/95 backdrop-blur-xl border-white/20 text-white">
                {transicoesValidas.length === 0 ? (
                  <SelectItem value="_none" disabled className="text-white/50">
                    Nenhuma transição disponível
                  </SelectItem>
                ) : (
                  transicoesValidas.map((status) => (
                    <SelectItem 
                      key={status} 
                      value={status}
                      className="text-white hover:bg-white/10 focus:bg-white/20 cursor-pointer"
                    >
                      {STATUS_LABELS[status]}
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
            {transicoesValidas.length === 0 && (
              <p className="text-xs text-white/70 drop-shadow-sm">
                Este status é final. Não é possível fazer novas transições.
              </p>
            )}
          </div>

          {/* Motivo de Rejeição (condicional) */}
          {novoStatus === 'rejeitado' && (
            <div className="space-y-2">
              <Label htmlFor="motivo-rejeicao" className="text-white drop-shadow-sm">
                Motivo da Rejeição <span className="text-red-400">*</span>
              </Label>
              <Textarea
                id="motivo-rejeicao"
                placeholder="Descreva o motivo da rejeição para o candidato..."
                value={motivoRejeicao}
                onChange={(e) => setMotivoRejeicao(e.target.value)}
                disabled={isPending}
                rows={4}
                className="resize-none bg-white/10 border-white/20 text-white placeholder:text-white/50 focus:bg-white/15 focus:border-white/30"
              />
              <p className="text-xs text-white/70 drop-shadow-sm">
                Seja específico e profissional. Este motivo será enviado ao candidato se a
                notificação estiver ativada.
              </p>
            </div>
          )}

          {/* Checkbox Notificar Candidato */}
          <div className="flex items-start space-x-3 p-4 bg-white/10 border-white/20 border backdrop-blur-sm rounded-md">
            <Checkbox
              id="notificar"
              checked={notificarCandidato}
              onCheckedChange={(checked) => setNotificarCandidato(checked as boolean)}
              disabled={isPending}
              className="border-white/30 data-[state=checked]:bg-[#35BFAD] data-[state=checked]:border-[#35BFAD]"
            />
            <div className="space-y-1 flex-1">
              <Label
                htmlFor="notificar"
                className="text-sm font-medium text-white drop-shadow-sm cursor-pointer leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
              >
                Notificar candidato por email
              </Label>
              <p className="text-xs text-white/70 drop-shadow-sm">
                O candidato receberá um email informando sobre a mudança de status
              </p>
            </div>
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
            disabled={isPending || !novoStatus || transicoesValidas.length === 0}
            className="text-white"
          >
            {isPending ? 'Salvando...' : 'Salvar Alterações'}
          </GlassButton>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
