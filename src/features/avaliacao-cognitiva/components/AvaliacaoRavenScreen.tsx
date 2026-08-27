/**
 * Avaliação cognitiva por Matrizes de Raven — tela do candidato.
 *
 * SEPARADA de `ProvaCognitivaScreen` de propósito. Aquela serve itens TEXTUAIS de
 * `cognitivo_itens` e é liberada pela vaga (`aplica_cognitivo`); esta serve matrizes
 * em IMAGEM de `questoes_raven` e é liberada NOMINALMENTE, por candidatura. Unir as
 * duas numa só encheria o arquivo de condicionais sobre qual instrumento está no ar.
 *
 * ⚠ 60 QUESTÕES, UMA POR VEZ, SEM VOLTAR. O instrumento pressupõe progressão de
 * dificuldade e resposta sem revisão — permitir voltar mudaria o que está sendo
 * medido. O original (app Teste_Inteligencia) faz igual.
 *
 * ⚠ O GABARITO NÃO ESTÁ AQUI e não pode estar. `resposta_correta` teve o SELECT
 * revogado para `authenticated` (migration 20260826000010); as questões vêm pela RPC
 * `get_questoes_raven()`, que não a projeta. O acerto é decidido no servidor, pelo
 * trigger que dispara na sexagésima resposta.
 *
 * @module features/avaliacao-cognitiva/components/AvaliacaoRavenScreen
 */
import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Glass, GlassButton } from '@/components/ui/glass'
import { Skeleton } from '@/components/ui/skeleton'
import { ArrowRight, CheckCircle2, Clock, Lock } from 'lucide-react'
import {
  listarQuestoesRaven,
  consultarLiberacao,
  submeterRaven,
  type QuestaoRaven,
} from '../services/ravenService'
import { useProctoring } from '../hooks/useProctoring'

const COPY = {
  titulo: 'Avaliação de raciocínio',
  subtitulo:
    'São 60 itens em ordem crescente de dificuldade. Escolha a peça que completa cada figura.',
  semVolta: 'Não é possível voltar a um item já respondido.',
  naoLiberado:
    'Esta avaliação ainda não foi liberada para você. Ela é aplicada presencialmente, e a equipe de recrutamento avisa quando for a hora.',
  jaRespondeu: 'Você já concluiu esta avaliação. O resultado fica com a equipe de recrutamento.',
  concluida: 'Avaliação concluída. Obrigado!',
  selecione: 'Escolha uma alternativa para continuar.',
  erroEnvio: 'Não foi possível enviar suas respostas agora. Tente novamente.',
  voltar: 'Voltar ao painel',
} as const

function hhmmss(total: number): string {
  const h = Math.floor(total / 3600)
  const m = Math.floor((total % 3600) / 60)
  const s = total % 60
  return [h, m, s].map((n) => String(n).padStart(2, '0')).join(':')
}

export function AvaliacaoRavenScreen() {
  const navigate = useNavigate()
  const { candidaturaId } = useParams<{ candidaturaId: string }>()
  const voltarAoPainel = () => navigate('/candidato/dashboard')

  const liberacaoQuery = useQuery({
    queryKey: ['raven', 'liberacao', candidaturaId],
    queryFn: () => consultarLiberacao(candidaturaId as string),
    enabled: !!candidaturaId,
  })

  const liberado = liberacaoQuery.data?.liberado === true
  const jaRespondeu = liberacaoQuery.data?.ja_respondeu === true

  // As questões só são buscadas quando há liberação ativa — não adianta carregar 60
  // imagens para alguém que não vai responder.
  const questoesQuery = useQuery({
    queryKey: ['raven', 'questoes'],
    queryFn: listarQuestoesRaven,
    enabled: liberado && !jaRespondeu,
    staleTime: 30 * 60 * 1000, // o instrumento não muda durante a sessão
  })

  const questoes = useMemo<QuestaoRaven[]>(() => questoesQuery.data ?? [], [questoesQuery.data])

  const [index, setIndex] = useState(0)
  const [respostas, setRespostas] = useState<Record<string, number>>({})
  const [escolha, setEscolha] = useState<number | null>(null)
  const [enviando, setEnviando] = useState(false)
  const [concluida, setConcluida] = useState(false)

  const { seconds, pasteBlockHandler } = useProctoring({
    enabled: liberado && !jaRespondeu && !concluida,
  })

  const questao = questoes[index]
  const progresso = questoes.length > 0 ? ((index + 1) / questoes.length) * 100 : 0

  // Some navegadores restauram a rolagem entre itens; cada matriz deve abrir no topo.
  useEffect(() => {
    window.scrollTo({ top: 0 })
  }, [index])

  const avancar = async () => {
    if (escolha === null) {
      toast.info(COPY.selecione)
      return
    }
    const respostasAtualizadas = { ...respostas, [questao.id]: escolha }
    setRespostas(respostasAtualizadas)
    setEscolha(null)

    if (index + 1 < questoes.length) {
      setIndex(index + 1)
      return
    }

    // Última: envia tudo de uma vez. Ou entram as 60, ou não entra nenhuma — um envio
    // parcial deixaria linhas sem nunca disparar o cálculo do score.
    setEnviando(true)
    try {
      await submeterRaven(candidaturaId as string, respostasAtualizadas, seconds)
      setConcluida(true)
    } catch (e) {
      const msg = e instanceof Error ? e.message : COPY.erroEnvio
      toast.error(msg)
    } finally {
      setEnviando(false)
    }
  }

  // ── Estados que não são a prova ────────────────────────────────────────────
  if (liberacaoQuery.isLoading) {
    return (
      <div className="mx-auto max-w-3xl p-6">
        <Skeleton className="h-40 w-full rounded-xl" />
      </div>
    )
  }

  if (concluida || jaRespondeu) {
    return (
      <div className="mx-auto max-w-2xl p-6">
        <Glass variant="white" blur="lg" className="rounded-xl p-8 text-center">
          <CheckCircle2 className="mx-auto mb-4 h-12 w-12 text-[#35BFAD]" aria-hidden="true" />
          <h1 className="mb-2 text-2xl font-bold text-slate-900">
            {concluida ? COPY.concluida : COPY.jaRespondeu}
          </h1>
          <GlassButton onClick={voltarAoPainel} className="mt-6">
            {COPY.voltar}
          </GlassButton>
        </Glass>
      </div>
    )
  }

  if (!liberado) {
    return (
      <div className="mx-auto max-w-2xl p-6">
        <Glass variant="white" blur="lg" className="rounded-xl p-8 text-center">
          <Lock className="mx-auto mb-4 h-10 w-10 text-slate-400" aria-hidden="true" />
          <h1 className="mb-2 text-xl font-bold text-slate-900">{COPY.titulo}</h1>
          <p className="mx-auto max-w-[52ch] text-slate-700">{COPY.naoLiberado}</p>
          <GlassButton onClick={voltarAoPainel} className="mt-6">
            {COPY.voltar}
          </GlassButton>
        </Glass>
      </div>
    )
  }

  if (questoesQuery.isLoading || !questao) {
    return (
      <div className="mx-auto max-w-3xl p-6">
        <Skeleton className="h-96 w-full rounded-xl" />
      </div>
    )
  }

  const nOpcoes = questao.opcoes_imagens.length

  return (
    <div className="mx-auto max-w-4xl p-4 sm:p-6" onPaste={pasteBlockHandler}>
      {/* Cabeçalho — progresso e tempo. O tempo é informativo: não há limite, e o
          instrumento não é cronometrado para corte. */}
      <Glass variant="white" blur="lg" className="mb-4 rounded-xl p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Item {index + 1} de {questoes.length} · Série {questao.serie}
            </p>
            <h1 className="text-lg font-bold text-slate-900">{COPY.titulo}</h1>
          </div>
          <div className="flex items-center gap-2 text-slate-600">
            <Clock className="h-4 w-4" aria-hidden="true" />
            <span className="tabular-nums">{hhmmss(seconds)}</span>
          </div>
        </div>
        <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-slate-200">
          <div
            className="h-full rounded-full bg-[#35BFAD] transition-all duration-300"
            style={{ width: `${progresso}%` }}
          />
        </div>
        <p className="mt-2 text-xs text-slate-500">{COPY.semVolta}</p>
      </Glass>

      {/* A matriz */}
      <Glass variant="white" blur="lg" className="mb-4 rounded-xl p-4">
        <img
          src={questao.imagem_matriz_url}
          alt={`Item ${questao.numero_questao} da série ${questao.serie}`}
          className="mx-auto max-h-[46vh] w-auto max-w-full object-contain"
          loading="eager"
        />
      </Glass>

      {/* As alternativas. Séries A/B trazem 6; C/D/E trazem 8 — o grid segue o
          número real de opções em vez de assumir um dos dois. */}
      <Glass variant="white" blur="lg" className="rounded-xl p-4">
        <div
          className={`grid gap-3 ${nOpcoes > 6 ? 'grid-cols-4' : 'grid-cols-3'} sm:${
            nOpcoes > 6 ? 'grid-cols-8' : 'grid-cols-6'
          }`}
        >
          {questao.opcoes_imagens.map((url, i) => {
            const numero = i + 1
            const ativa = escolha === numero
            return (
              <button
                key={`${questao.id}-${numero}`}
                type="button"
                onClick={() => setEscolha(numero)}
                aria-pressed={ativa}
                aria-label={`Alternativa ${numero}`}
                className={`rounded-lg border-2 p-1 transition-all ${
                  ativa
                    ? 'border-[#35BFAD] bg-[#35BFAD]/10 ring-2 ring-[#35BFAD]/40'
                    : 'border-slate-200 hover:border-slate-400'
                }`}
              >
                {url ? (
                  <img src={url} alt="" className="h-full w-full object-contain" />
                ) : (
                  <span className="block py-4 text-sm font-semibold text-slate-700">{numero}</span>
                )}
              </button>
            )
          })}
        </div>

        <div className="mt-5 flex justify-end">
          <GlassButton onClick={avancar} disabled={enviando}>
            {index + 1 < questoes.length ? 'Próximo item' : 'Concluir avaliação'}
            <ArrowRight className="ml-2 h-4 w-4" aria-hidden="true" />
          </GlassButton>
        </div>
      </Glass>
    </div>
  )
}
