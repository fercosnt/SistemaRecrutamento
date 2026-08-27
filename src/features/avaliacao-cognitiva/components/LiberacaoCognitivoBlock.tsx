/**
 * Bloco do hub do RH para liberar a avaliação de raciocínio a UM candidato.
 *
 * ⚠ POR QUE ESTE BOTÃO EXISTE, e por que ele é o único caminho.
 *
 * SJT e Big Five são aplicados por VAGA: todo candidato que chega em
 * `avaliacao_assincrona` faz os mesmos, e é isso que mantém os scores comparáveis —
 * `pesos_avaliacao` pressupõe que todos passaram pela mesma régua.
 *
 * A avaliação de raciocínio é diferente por decisão de 2026-08-26: aplicação
 * PRESENCIAL, a poucos finalistas. Um instrumento aplicado a alguns não pode entrar
 * no agregado que compara todos — seria medir quem fez contra quem nunca teve a
 * chance. Por isso ela fica fora de `testes_aplicaveis`, fora dos pesos, e só existe
 * por liberação nominal, com quem liberou e quando gravados.
 *
 * @module features/avaliacao-cognitiva/components/LiberacaoCognitivoBlock
 */
import { Glass } from '@/components/ui/glass'
import { Skeleton } from '@/components/ui/skeleton'
import { Brain, CheckCircle2, Undo2 } from 'lucide-react'
import {
  useLiberacaoCognitivo,
  useLiberarCognitivo,
  useRevogarCognitivo,
} from '../hooks/useLiberacaoCognitivo'

export interface LiberacaoCognitivoBlockProps {
  candidaturaId: string
}

function dataCurta(iso: string | null): string {
  if (!iso) return ''
  try {
    return new Date(iso).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    })
  } catch {
    return ''
  }
}

export function LiberacaoCognitivoBlock({ candidaturaId }: LiberacaoCognitivoBlockProps) {
  const { data, isLoading } = useLiberacaoCognitivo(candidaturaId)
  const liberar = useLiberarCognitivo(candidaturaId)
  const revogar = useRevogarCognitivo(candidaturaId)

  if (isLoading) {
    return <Skeleton className="h-24 w-full rounded-xl" />
  }

  const concluido = data?.concluido === true
  const liberado = data?.liberado === true

  return (
    <Glass variant="dark" blur="lg" className="rounded-xl p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <Brain className="mt-0.5 h-5 w-5 text-[#35BFAD]" aria-hidden="true" />
          <div>
            <p className="text-sm font-semibold uppercase tracking-wide text-[#35BFAD]">
              Avaliação de raciocínio
            </p>
            <p className="mt-1 max-w-[62ch] text-sm text-white/70">
              Aplicação presencial, liberada candidato a candidato. Não entra no score
              comparativo da vaga — serve para aprofundar sobre quem já avançou.
            </p>

            {/* O estado é dito por extenso: "liberado" e "concluído" levam a ações
                diferentes, e um selo só não distinguiria os dois. */}
            {concluido ? (
              <p className="mt-3 inline-flex items-center gap-1.5 text-sm font-semibold text-[#35BFAD]">
                <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
                Concluída pelo candidato
              </p>
            ) : liberado ? (
              <p className="mt-3 text-sm text-white/80">
                Liberada em {dataCurta(data?.liberado_em ?? null)} — aguardando o candidato.
              </p>
            ) : data?.revogado_em ? (
              <p className="mt-3 text-sm text-white/60">
                Liberação revogada em {dataCurta(data.revogado_em)}.
              </p>
            ) : (
              <p className="mt-3 text-sm text-white/60">Ainda não liberada.</p>
            )}
          </div>
        </div>

        {/* Concluída não se revoga nem se libera de novo: o resultado já existe e
            refazer mudaria o que foi medido. */}
        {!concluido && (
          <div className="flex flex-wrap items-center gap-2">
            {liberado ? (
              <button
                type="button"
                onClick={() => revogar.mutate(undefined)}
                disabled={revogar.isPending}
                className="inline-flex min-h-[44px] items-center gap-1.5 rounded-xl border border-white/20 bg-white/5 px-4 text-sm font-semibold text-white/80 transition-colors hover:bg-white/10 disabled:opacity-60"
              >
                <Undo2 className="h-4 w-4" aria-hidden="true" />
                Revogar liberação
              </button>
            ) : (
              // ⚠ NÃO usar GlassButton aqui. Ele não declara cor de texto — herda do
              // contexto — e este bloco vive dentro de um `Glass variant="dark"`. O
              // resultado era texto cinza-escuro sobre fundo escuro: o botão existia,
              // era clicável, e o rótulo estava ilegível. Passou por type-check,
              // testes e build; só apareceu na tela. Cor explícita, como as demais
              // ações do hub já fazem.
              <button
                type="button"
                onClick={() => liberar.mutate(undefined)}
                disabled={liberar.isPending}
                className="inline-flex min-h-[44px] items-center rounded-xl bg-[#35BFAD] px-6 text-sm font-semibold text-white shadow-lg shadow-[#35BFAD]/30 transition-colors hover:bg-[#35BFAD]/90 disabled:opacity-60"
              >
                Liberar avaliação
              </button>
            )}
          </div>
        )}
      </div>
    </Glass>
  )
}
