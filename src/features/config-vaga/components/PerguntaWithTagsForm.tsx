/**
 * Phase 7 / VAGACFG-03 — PerguntaWithTagsForm (Tag Wizard, D-10/D-11).
 *
 * Renders per-option tag rows ONLY for `single_choice` / `multiple_choice`
 * perguntas. Each row: a tag `Select` (5 `enum_tag_opcao` values, badge-colored
 * per the UI-SPEC taxonomy) + a `peso` numeric input (-999..100, default 0) +
 * a nullable `nota_ia` text input. An unmarked option = neutro/0/null
 * ("informativa"). Non-choice perguntas (texto/numerico) render the empty-state
 * copy ("Nenhuma pergunta de escolha nesta vaga").
 *
 * @see .planning/phases/07-configura-o-de-vaga-tags/07-UI-SPEC.md §Copywriting
 * @see .planning/phases/07-configura-o-de-vaga-tags/07-CONTEXT.md (D-10, D-11)
 * @module features/config-vaga/components/PerguntaWithTagsForm
 */
import { useState } from 'react'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { GlassButton } from '@/components/ui/glass'
import { cn } from '@/components/ui/utils'
import { TAGS_OPCAO } from '../schemas/tagOpcaoSchema'
import type { TagOpcaoEnum } from '../types/configVagaTypes'
import { BulkMarkDialog, type BulkMarkOpcao } from './BulkMarkDialog'

/** A choice pergunta option in the wizard (with its current tag metadata). */
export interface WizardOpcao {
  opcao_id: string
  texto: string
  tag?: TagOpcaoEnum
  peso?: number
  nota_ia?: string | null
}

export interface WizardPergunta {
  id: string
  texto_pergunta: string
  tipo_resposta: string
  opcoes: WizardOpcao[]
}

export interface PerguntaWithTagsFormProps {
  pergunta: WizardPergunta
  /** Emits the full updated option list whenever any field changes. */
  onChange: (opcoes: WizardOpcao[]) => void
}

const CHOICE_TYPES = new Set(['single_choice', 'multiple_choice'])

/** pt-BR labels for the 5 tags + their taxonomy badge color (UI-SPEC §Color). */
const TAG_META: Record<TagOpcaoEnum, { label: string; color: string }> = {
  knockout: { label: 'Eliminatória (knockout)', color: '#EF4444' },
  atencao: { label: 'Atenção', color: '#F59E0B' },
  neutro: { label: 'Informativa (neutro)', color: '#86898C' },
  pontua: { label: 'Pontua', color: '#10B981' },
  fortemente_pontua: { label: 'Pontua fortemente', color: '#35BFAD' },
}

/** Normalize an option to its persisted metadata defaults (unmarked = neutro/0/null). */
function withDefaults(o: WizardOpcao): Required<
  Pick<WizardOpcao, 'tag' | 'peso' | 'nota_ia'>
> &
  WizardOpcao {
  return {
    ...o,
    tag: o.tag ?? 'neutro',
    peso: o.peso ?? 0,
    nota_ia: o.nota_ia ?? null,
  }
}

export function PerguntaWithTagsForm({
  pergunta,
  onChange,
}: PerguntaWithTagsFormProps) {
  const [bulkOpen, setBulkOpen] = useState(false)

  // D-11: wizard only renders for choice perguntas.
  if (!CHOICE_TYPES.has(pergunta.tipo_resposta)) {
    return (
      <div className="rounded-xl border border-white/20 bg-white/10 p-6 space-y-1">
        <p className="text-white drop-shadow-sm text-base font-semibold">
          Nenhuma pergunta de escolha nesta vaga
        </p>
        <p className="text-white/60 drop-shadow-sm text-sm">
          O assistente de tags aparece só para perguntas de escolha única ou
          múltipla. Adicione perguntas na aba Perguntas para marcá-las aqui.
        </p>
      </div>
    )
  }

  const opcoes = pergunta.opcoes.map(withDefaults)

  const updateOpcao = (
    opcaoId: string,
    patch: Partial<Pick<WizardOpcao, 'tag' | 'peso' | 'nota_ia'>>
  ) => {
    onChange(
      opcoes.map((o) => (o.opcao_id === opcaoId ? { ...o, ...patch } : o))
    )
  }

  const bulkOpcoes: BulkMarkOpcao[] = opcoes.map((o) => ({
    opcao_id: o.opcao_id,
    texto: o.texto,
    tag: o.tag as TagOpcaoEnum,
    peso: o.peso as number,
    nota_ia: (o.nota_ia ?? null) as string | null,
  }))

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h4 className="text-white drop-shadow-sm text-base font-semibold">
            {pergunta.texto_pergunta}
          </h4>
          <p className="text-white/60 drop-shadow-sm text-sm">
            Marque cada opção. Opções não marcadas ficam como informativa.
          </p>
        </div>
        <GlassButton
          variant="white"
          onClick={(e) => {
            e.preventDefault()
            setBulkOpen(true)
          }}
          className="text-white text-sm shrink-0 min-h-[44px]"
        >
          Marcar tudo como informativa
        </GlassButton>
      </div>

      <div className="space-y-3">
        {opcoes.map((o) => {
          const meta = TAG_META[o.tag as TagOpcaoEnum]
          return (
            <div
              key={o.opcao_id}
              className="rounded-lg border border-white/20 bg-white/10 p-4 space-y-3"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-white drop-shadow-sm text-sm font-semibold">
                  {o.texto}
                </span>
                <span
                  className="inline-flex items-center rounded-md border px-2 py-0.5 text-xs text-white"
                  style={{ backgroundColor: meta.color, borderColor: meta.color }}
                >
                  {meta.label}
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                <div className="space-y-1">
                  <Label className="text-white/80 drop-shadow-sm text-xs">
                    Tag
                  </Label>
                  <Select
                    value={o.tag}
                    onValueChange={(v: string) =>
                      updateOpcao(o.opcao_id, { tag: v as TagOpcaoEnum })
                    }
                  >
                    <SelectTrigger className="min-h-[44px] bg-white/10 border-white/20 text-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-[#00109E]/95 backdrop-blur-xl border-white/20 text-white">
                      {TAGS_OPCAO.map((tag) => (
                        <SelectItem
                          key={tag}
                          value={tag}
                          className="hover:bg-white/10"
                        >
                          {TAG_META[tag].label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1">
                  <Label className="text-white/80 drop-shadow-sm text-xs">
                    Peso
                  </Label>
                  <Input
                    type="number"
                    min={-999}
                    max={100}
                    value={o.peso}
                    onChange={(e) =>
                      updateOpcao(o.opcao_id, {
                        peso: Number.parseInt(e.target.value, 10) || 0,
                      })
                    }
                    className={cn(
                      'bg-white/10 border-white/20 text-white placeholder:text-white/50'
                    )}
                  />
                </div>

                <div className="space-y-1">
                  <Label className="text-white/80 drop-shadow-sm text-xs">
                    Nota para a IA
                  </Label>
                  <Input
                    value={o.nota_ia ?? ''}
                    onChange={(e) =>
                      updateOpcao(o.opcao_id, {
                        nota_ia: e.target.value === '' ? null : e.target.value,
                      })
                    }
                    placeholder="Opcional"
                    className="bg-white/10 border-white/20 text-white placeholder:text-white/50"
                  />
                </div>
              </div>
            </div>
          )
        })}
      </div>

      <BulkMarkDialog
        open={bulkOpen}
        opcoes={bulkOpcoes}
        onCancel={() => setBulkOpen(false)}
        onConfirm={(reset) => {
          onChange(
            reset.map((r) => ({
              opcao_id: r.opcao_id ?? '',
              texto: r.texto,
              tag: r.tag,
              peso: r.peso,
              nota_ia: r.nota_ia,
            }))
          )
          setBulkOpen(false)
        }}
      />
    </div>
  )
}
