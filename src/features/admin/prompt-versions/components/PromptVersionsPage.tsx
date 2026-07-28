/**
 * /admin/prompt-versions — lista de versões de prompt por call_type + diff +
 * botões promote/rollback que chamam as RPCs SECURITY DEFINER.
 *
 * Gated por RoleGuard role="administrador" (rota). Lê via promptVersionsService
 * com allowlist explícito. As ações de mudança de estado abrem AlertDialog de
 * confirmação (UI-SPEC §Destructive Actions); falha de RPC surfaceia a mensagem
 * RAISE do servidor verbatim num toast Sonner; sucesso invalida a query.
 *
 * @module features/admin/prompt-versions/components/PromptVersionsPage
 */

import { useMemo, useState } from 'react'
import { toast } from 'sonner'
import { RHLayout } from '../../../../components/RHLayout'
import { GlassCard } from '../../../../components/ui/glass'
import { Badge } from '../../../../components/ui/badge'
import { Button } from '../../../../components/ui/button'
import { Skeleton } from '../../../../components/ui/skeleton'
import { ScrollArea } from '../../../../components/ui/scroll-area'
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '../../../../components/ui/accordion'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '../../../../components/ui/tooltip'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '../../../../components/ui/alert-dialog'
import {
  usePromptVersions,
  usePromoteToCanary,
  usePromoteCanaryToActive,
  useRollbackToVersion,
} from '../hooks/usePromptVersions'
import type { PromptVersionRow } from '../services/promptVersionsService'

const CALL_TYPE_LABELS: Record<string, string> = {
  cv_summary: 'Resumo de currículo',
  cv_job_match: 'Aderência à vaga',
  comparative_ranking: 'Ranking comparativo',
  interview_guide: 'Roteiro de entrevista',
  transcript_analysis: 'Análise de transcrição',
  culture_fit_essay: 'Fit cultural',
  work_sample_sjt: 'Amostra de trabalho',
}

type PendingAction =
  | { kind: 'canary'; row: PromptVersionRow }
  | { kind: 'active'; row: PromptVersionRow }
  | { kind: 'rollback'; row: PromptVersionRow }
  | null

function shortHash(hash: string): string {
  return hash.slice(0, 8)
}

function formatDate(iso: string | null): string {
  if (!iso) return '—'
  try {
    return new Date(iso).toLocaleDateString('pt-BR')
  } catch {
    return iso
  }
}

export function PromptVersionsPage() {
  const { data, isLoading, isError, refetch } = usePromptVersions()
  const promoteCanary = usePromoteToCanary()
  const promoteActive = usePromoteCanaryToActive()
  const rollback = useRollbackToVersion()

  const [selected, setSelected] = useState<string[]>([])
  const [pending, setPending] = useState<PendingAction>(null)

  const rows = useMemo(() => data ?? [], [data])

  const grouped = useMemo(() => {
    const map = new Map<string, PromptVersionRow[]>()
    for (const row of rows) {
      const list = map.get(row.call_type) ?? []
      list.push(row)
      map.set(row.call_type, list)
    }
    return map
  }, [rows])

  const selectedRows = useMemo(
    () => rows.filter((r) => selected.includes(r.id)),
    [rows, selected]
  )
  const canCompare = selectedRows.length === 2

  function toggleSelect(id: string) {
    setSelected((prev) => {
      if (prev.includes(id)) return prev.filter((x) => x !== id)
      if (prev.length >= 2) return [prev[1], id]
      return [...prev, id]
    })
  }

  async function runPending() {
    if (!pending) return
    const { row, kind } = pending
    const label = CALL_TYPE_LABELS[row.call_type] ?? row.call_type
    try {
      if (kind === 'canary') {
        await promoteCanary.mutateAsync({ callType: row.call_type, semver: row.semver })
        toast.success(`Versão ${row.semver} de ${label} promovida para canário com sucesso.`)
      } else if (kind === 'active') {
        await promoteActive.mutateAsync({ callType: row.call_type, semver: row.semver })
        toast.success(`Versão ${row.semver} de ${label} promovida para ativa com sucesso.`)
      } else {
        await rollback.mutateAsync({ callType: row.call_type, semver: row.semver })
        toast.success(`Versão ${row.semver} de ${label} revertida com sucesso.`)
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Erro desconhecido'
      const acao = kind === 'rollback' ? 'reverter' : 'promover'
      toast.error(`Falha ao ${acao}: ${msg}.`)
    } finally {
      setPending(null)
    }
  }

  const pendingCopy = useMemo(() => {
    if (!pending) return null
    const { row, kind } = pending
    const label = CALL_TYPE_LABELS[row.call_type] ?? row.call_type
    if (kind === 'canary') {
      return {
        title: 'Promover para canário?',
        body: `Roteará 10% do tráfego de ${label} para ${row.semver}. Confirmar?`,
        confirm: 'Promover',
      }
    }
    if (kind === 'active') {
      return {
        title: 'Promover para ativa?',
        body: `Isto torna ${row.semver} a versão ativa de ${label} e deprecia a versão atual. Propagação em <60s, sem redeploy. Confirmar?`,
        confirm: 'Promover',
      }
    }
    return {
      title: 'Reverter prompt ativo?',
      body: `A versão ativa de ${label} será desativada e a versão ${row.semver} reativada. Esta ação é registrada na trilha de auditoria (data_deletion_log). Confirmar?`,
      confirm: 'Reverter',
    }
  }, [pending])

  return (
    <RHLayout>
      <div className="space-y-8">
        <header>
          <h1 className="text-[28px] font-semibold leading-tight text-white">Versões de prompt</h1>
        </header>

        <GlassCard>
          {isLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : isError ? (
            <div className="flex flex-col items-center gap-4 py-12 text-center">
              <p className="text-base text-white/80">
                Não foi possível carregar os dados. Verifique sua conexão e tente novamente.
              </p>
              <Button onClick={() => refetch()}>Tentar novamente</Button>
            </div>
          ) : rows.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-12 text-center">
              <h2 className="text-xl font-semibold text-white">
                Nenhuma versão de prompt sincronizada
              </h2>
              <p className="max-w-2xl text-base text-white/70">
                As versões são hidratadas pelo CI (sync-prompts) ao mergear templates em main. Rode o
                sync ou faça merge de um template para ver as versões aqui.
              </p>
            </div>
          ) : (
            <Accordion type="multiple" className="w-full">
              {Array.from(grouped.entries()).map(([callType, versions]) => (
                <AccordionItem key={callType} value={callType}>
                  <AccordionTrigger className="text-white">
                    {CALL_TYPE_LABELS[callType] ?? callType}{' '}
                    <span className="ml-2 text-white/60">({versions.length})</span>
                  </AccordionTrigger>
                  <AccordionContent>
                    <div className="space-y-2">
                      {versions.map((row) => (
                        <div
                          key={row.id}
                          className="flex flex-wrap items-center gap-3 rounded-md border border-white/10 bg-white/5 p-3"
                        >
                          <input
                            type="checkbox"
                            checked={selected.includes(row.id)}
                            onChange={() => toggleSelect(row.id)}
                            aria-label={`Selecionar versão ${row.semver}`}
                          />
                          <span className="font-mono text-sm text-white">{row.semver}</span>
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <span className="font-mono text-sm text-white/70">
                                  {shortHash(row.content_hash)}
                                </span>
                              </TooltipTrigger>
                              <TooltipContent>
                                <span className="font-mono text-sm">{row.content_hash}</span>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                          {row.is_active && <Badge>ativa</Badge>}
                          {row.is_canary && (
                            <Badge variant="secondary">
                              canário {row.canary_pct != null ? `${row.canary_pct}%` : ''}
                            </Badge>
                          )}
                          <span className="text-sm text-white/60">
                            deploy {formatDate(row.deployed_at)}
                          </span>
                          {row.deprecated_at && (
                            <span className="text-sm text-white/60">
                              depreciada {formatDate(row.deprecated_at)}
                            </span>
                          )}
                          <div className="ml-auto flex gap-2">
                            <Button
                              disabled={row.is_canary || row.is_active}
                              onClick={() => setPending({ kind: 'canary', row })}
                              className="bg-white/10 text-white hover:bg-white/20"
                            >
                              Promover para canário (10%)
                            </Button>
                            <Button
                              disabled={!row.is_canary}
                              onClick={() => setPending({ kind: 'active', row })}
                              className="bg-accent text-accent-foreground hover:bg-accent/90"
                            >
                              Promover para ativa
                            </Button>
                            <Button
                              disabled={!row.deprecated_at}
                              onClick={() => setPending({ kind: 'rollback', row })}
                              className="bg-destructive text-white hover:bg-destructive/90"
                            >
                              Reverter
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          )}
        </GlassCard>

        {/* Diff de duas versões selecionadas */}
        {rows.length > 0 && (
          <GlassCard className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold text-white">Comparar versões</h2>
              {!canCompare && (
                <span className="text-sm text-white/60">
                  Selecione duas versões para comparar
                </span>
              )}
            </div>
            {canCompare && (
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                {selectedRows.map((row) => (
                  <div key={row.id} className="space-y-3">
                    <h3 className="font-mono text-sm font-semibold text-white">
                      {row.semver} ({CALL_TYPE_LABELS[row.call_type] ?? row.call_type})
                    </h3>
                    <div className="space-y-1">
                      <span className="text-sm text-white/60">system_template</span>
                      <ScrollArea className="h-40 rounded-md border p-3">
                        <pre className="whitespace-pre-wrap font-mono text-sm">
                          {row.system_template}
                        </pre>
                      </ScrollArea>
                    </div>
                    <div className="space-y-1">
                      <span className="text-sm text-white/60">user_template</span>
                      <ScrollArea className="h-40 rounded-md border p-3">
                        <pre className="whitespace-pre-wrap font-mono text-sm">
                          {row.user_template}
                        </pre>
                      </ScrollArea>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </GlassCard>
        )}
      </div>

      {/* Confirmação de ação (AlertDialog) */}
      <AlertDialog open={!!pending} onOpenChange={(open: boolean) => !open && setPending(null)}>
        <AlertDialogContent>
          {pendingCopy && (
            <>
              <AlertDialogHeader>
                <AlertDialogTitle>{pendingCopy.title}</AlertDialogTitle>
                <AlertDialogDescription>{pendingCopy.body}</AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                <AlertDialogAction onClick={runPending}>{pendingCopy.confirm}</AlertDialogAction>
              </AlertDialogFooter>
            </>
          )}
        </AlertDialogContent>
      </AlertDialog>
    </RHLayout>
  )
}
