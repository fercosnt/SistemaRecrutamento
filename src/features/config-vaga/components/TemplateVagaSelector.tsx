/**
 * Phase 7 / VAGACFG-01 — TemplateVagaSelector (D-04).
 *
 * Renders the 8 cargo templates as selectable Glass cards. Selecting one
 * DEEP-COPIES its `pesos_avaliacao` + `testes_aplicaveis` into the parent form
 * state via `onSelect` (override happens on the vaga, never on the template).
 * Re-selecting a DIFFERENT template surfaces the "Trocar template" AlertDialog
 * (overwrite confirm) BEFORE applying — pesos+testes are overwritten, tags kept.
 *
 * Visual: Glass `variant="white"` cards, white text on the dark `#00109E` shell;
 * the selected card carries the accent `#35BFAD` active state (UI-SPEC §Color).
 *
 * @see .planning/phases/07-configura-o-de-vaga-tags/07-UI-SPEC.md §Interaction Notes
 * @see .planning/phases/07-configura-o-de-vaga-tags/07-CONTEXT.md (D-04)
 * @module features/config-vaga/components/TemplateVagaSelector
 */
import { useState } from 'react'
import { Check } from 'lucide-react'
import { toast } from 'sonner'
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
import { cn } from '@/components/ui/utils'
import {
  cargoTemplates,
  getCargoTemplateDefaults,
  type CargoSlug,
  type CargoTemplate,
} from '../templates/cargoTemplates'
import type { VagaConfig } from '../types/configVagaTypes'

export interface TemplateVagaSelectorProps {
  /** The slug of the currently-applied template (null = none chosen yet). */
  selectedSlug: CargoSlug | null
  /** Invoked with a DEEP COPY of the template defaults to copy INTO the vaga. */
  onSelect: (config: VagaConfig, slug: CargoSlug) => void
}

const TEMPLATE_LIST: CargoTemplate[] = Object.values(cargoTemplates)

export function TemplateVagaSelector({
  selectedSlug,
  onSelect,
}: TemplateVagaSelectorProps) {
  // The template a re-select is pending confirmation for (gated by AlertDialog).
  const [pendingSlug, setPendingSlug] = useState<CargoSlug | null>(null)

  const applyTemplate = (slug: CargoSlug) => {
    // getCargoTemplateDefaults returns a fresh deep copy (D-04 mutation isolation).
    onSelect(getCargoTemplateDefaults(slug), slug)
    toast.success(
      `Template ${cargoTemplates[slug].label} aplicado. Você pode ajustar pesos e testes nesta vaga.`
    )
  }

  const handleCardClick = (slug: CargoSlug) => {
    // Re-selecting a DIFFERENT template overwrites pesos+testes → gate behind the
    // "Trocar template" confirm. First-ever selection applies immediately.
    if (selectedSlug && selectedSlug !== slug) {
      setPendingSlug(slug)
      return
    }
    if (selectedSlug === slug) return // no-op re-click of the active card
    applyTemplate(slug)
  }

  const confirmSwap = () => {
    if (pendingSlug) applyTemplate(pendingSlug)
    setPendingSlug(null)
  }

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-white drop-shadow-sm text-xl font-semibold">
          Template de cargo
        </h3>
        <p className="text-white/60 drop-shadow-sm text-sm">
          Escolha um cargo para pré-preencher os pesos e testes. Você pode
          ajustar tudo nesta vaga depois.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {TEMPLATE_LIST.map((tpl) => {
          const isSelected = selectedSlug === tpl.slug
          return (
            <button
              key={tpl.slug}
              type="button"
              onClick={() => handleCardClick(tpl.slug)}
              aria-pressed={isSelected}
              className={cn(
                'min-h-[44px] text-left rounded-xl border p-4 transition-all duration-200',
                'backdrop-blur-lg backdrop-saturate-150 shadow-lg',
                isSelected
                  ? 'bg-[#35BFAD]/20 border-[#35BFAD]'
                  : 'bg-white/15 border-white/25 hover:bg-white/25'
              )}
            >
              <div className="flex items-start justify-between gap-2">
                <span className="text-white drop-shadow-sm font-semibold text-sm">
                  {tpl.label}
                </span>
                {isSelected && (
                  <Check className="w-4 h-4 text-[#35BFAD] shrink-0" />
                )}
              </div>
            </button>
          )
        })}
      </div>

      {/* Trocar template — destructive-overwrite confirm (UI-SPEC §Copywriting). */}
      <AlertDialog
        open={pendingSlug !== null}
        onOpenChange={(open) => {
          if (!open) setPendingSlug(null)
        }}
      >
        <AlertDialogContent className="bg-[#00109E]/95 backdrop-blur-xl border-white/25 text-white">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-white">
              Trocar template?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-white/70">
              Trocar o template vai sobrescrever os pesos e testes atuais desta
              vaga pelos padrões do novo template. As tags marcadas nas
              perguntas são mantidas.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-white/10 border-white/25 text-white hover:bg-white/20">
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmSwap}
              className="bg-[#35BFAD] text-white hover:bg-[#35BFAD]/90"
            >
              Sim, sobrescrever
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
