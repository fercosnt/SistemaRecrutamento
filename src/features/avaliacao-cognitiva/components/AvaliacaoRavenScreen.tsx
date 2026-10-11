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
import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Glass, GlassButton } from '@/components/ui/glass'
import { Skeleton } from '@/components/ui/skeleton'
import { BackgroundImage } from '@/components/BackgroundImage'
import { ArrowRight, CheckCircle2, Clock, Lock } from 'lucide-react'
import {
  listarQuestoesRaven,
  consultarLiberacao,
  submeterRaven,
  type LiberacaoRaven,
  type QuestaoRaven,
} from '../services/ravenService'
import { useProctoring } from '../hooks/useProctoring'
import { avaliacaoStatusKey } from '../hooks/useStatusRavenCandidato'
import type { AvaliacaoStatus } from '@/features/avaliacao/services/avaliacaoService'
// Importação direta, nunca pelo barrel `components/index.ts` (ciclo de import — 52-02).
import { SairDaProvaButton } from '@/features/avaliacao/components/SairDaProvaButton'

const COPY = {
  // Phase 51 / D-15: distinct from the textual «Prova cognitiva» of the vaga.
  titulo: 'Raciocínio lógico (Matrizes)',
  subtitulo:
    'São 60 itens em ordem crescente de dificuldade. Escolha a peça que completa cada figura.',
  semVolta: 'Não é possível voltar a um item já respondido.',
  naoLiberado:
    'Esta avaliação ainda não foi liberada para você. Ela é aplicada presencialmente, e a equipe de recrutamento avisa quando for a hora.',
  jaRespondeu: 'Você já concluiu esta avaliação. O resultado fica com a equipe de recrutamento.',
  concluida: 'Avaliação concluída. Obrigado!',
  selecione: 'Escolha uma alternativa para continuar.',
  erroEnvio: 'Não foi possível enviar suas respostas agora. Tente novamente.',
  // D-37: this screen lives OUTSIDE the assessment container → its way back is the panel.
  voltar: 'Ir ao painel',
} as const

/**
 * 52-03 (51-UI-REVIEW, Pilar 2) — a shell do candidato, a mesma do `ScreenShell` do SJT MC
 * (`BackgroundImage` gradient + overlay preto 15%), com `max-w-4xl`: a grade de 8 alternativas
 * das séries C/D/E pede a largura. Todos os estados da tela vivem nela.
 */
function RavenShell({ children }: { children: ReactNode }) {
  return (
    <div className="relative min-h-screen">
      <BackgroundImage
        background="gradient"
        className="min-h-screen py-20"
        overlayColor="bg-black"
        overlayOpacity={15}
      >
        <div className="container mx-auto px-4 max-w-4xl mt-8">{children}</div>
      </BackgroundImage>
    </div>
  )
}

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
  const queryClient = useQueryClient()

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
  // Tempo gasto em CADA item, não só o total. O total é a soma, e o servidor não tem
  // como derivá-lo dos `created_at`: as 60 linhas entram na mesma transação.
  const [tempos, setTempos] = useState<Record<string, number>>({})
  const [marcoItem, setMarcoItem] = useState(0)
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
    // `seconds` é acumulado desde o início; o tempo DESTE item é o que passou desde
    // o marco do anterior. Nunca negativo, mesmo se o cronômetro for reiniciado.
    const temposAtualizados = { ...tempos, [questao.id]: Math.max(0, seconds - marcoItem) }
    setRespostas(respostasAtualizadas)
    setTempos(temposAtualizados)
    setMarcoItem(seconds)
    setEscolha(null)

    if (index + 1 < questoes.length) {
      setIndex(index + 1)
      return
    }

    // Última: envia tudo de uma vez. Ou entram as 60, ou não entra nenhuma — um envio
    // parcial deixaria linhas sem nunca disparar o cálculo do score.
    setEnviando(true)
    try {
      await submeterRaven(candidaturaId as string, respostasAtualizadas, temposAtualizados)
      // 51-07 (D-13 · C-4): concluída é FATO do servidor a partir daqui — as 60 entram numa
      // transação, e o trigger da sexagésima grava o score nela. O painel (card do Raven) e
      // esta tela leem do cache, com staleTime de 5 min: sem escrever a conclusão nas duas
      // entradas, o candidato voltava ao painel e encontrava o MESMO convite «Fazer a
      // avaliação», e a tela reabria a prova pela leitura de antes. A entrada do status é
      // invalidada também, para o servidor confirmar na próxima leitura.
      const id = candidaturaId as string
      queryClient.setQueryData<LiberacaoRaven>(['raven', 'liberacao', id], (old) =>
        old ? { ...old, ja_respondeu: true } : old,
      )
      queryClient.setQueryData<AvaliacaoStatus>(avaliacaoStatusKey(id), (old) =>
        old ? { ...old, raven: { ...old.raven, registrado: true } } : old,
      )
      void queryClient.invalidateQueries({ queryKey: avaliacaoStatusKey(id) })
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
      <RavenShell>
        <Skeleton className="h-40 w-full rounded-xl" />
      </RavenShell>
    )
  }

  if (concluida || jaRespondeu) {
    return (
      <RavenShell>
        <Glass variant="white" blur="lg" className="mx-auto max-w-2xl rounded-xl p-8 text-center">
          <CheckCircle2 className="mx-auto mb-4 h-12 w-12 text-[#35BFAD]" aria-hidden="true" />
          <h1 className="mb-2 text-2xl font-semibold text-white">
            {concluida ? COPY.concluida : COPY.jaRespondeu}
          </h1>
          <GlassButton
            onClick={voltarAoPainel}
            className="mt-6 min-h-[44px] text-sm font-semibold text-white"
          >
            {COPY.voltar}
          </GlassButton>
        </Glass>
      </RavenShell>
    )
  }

  if (!liberado) {
    return (
      <RavenShell>
        <Glass variant="white" blur="lg" className="mx-auto max-w-2xl rounded-xl p-8 text-center">
          <Lock className="mx-auto mb-4 h-10 w-10 text-white/70" aria-hidden="true" />
          <h1 className="mb-2 text-2xl font-semibold text-white">{COPY.titulo}</h1>
          <p className="mx-auto max-w-[52ch] text-base text-white/80">{COPY.naoLiberado}</p>
          <GlassButton
            onClick={voltarAoPainel}
            className="mt-6 min-h-[44px] text-sm font-semibold text-white"
          >
            {COPY.voltar}
          </GlassButton>
        </Glass>
      </RavenShell>
    )
  }

  if (questoesQuery.isLoading || !questao) {
    return (
      <RavenShell>
        <Skeleton className="h-96 w-full rounded-xl" />
      </RavenShell>
    )
  }

  const nOpcoes = questao.opcoes_imagens.length
  // Classes INTEIRAS no fonte: o JIT do Tailwind só gera a classe que aparece escrita por
  // completo. O template antigo interpolava o sufixo depois do prefixo `sm:`: punha
  // «sm:grid-cols-8» no DOM, mas a classe nunca existia no CSS — a grade ficava em 3/4
  // colunas também no desktop.
  const classeGrade = nOpcoes > 6 ? 'grid-cols-4 sm:grid-cols-8' : 'grid-cols-3 sm:grid-cols-6'

  return (
    <RavenShell>
      <div onPaste={pasteBlockHandler}>
        {/* Cabeçalho — saída, progresso, tempo e instruções. O tempo é informativo: não há
            limite, e o instrumento não é cronometrado para corte. */}
        <Glass variant="white" blur="lg" className="mb-4 rounded-xl p-4 text-white">
          {/* 52-03 / D-24 + D-52-U14: saída durante a prova. O Raven vive fora do container,
              então o caminho dele é o painel. As respostas só existem na memória (nenhum
              rascunho): a escolha do item atual, ainda não enviada, também se perde — por
              isso conta para a confirmação (T-52-06). */}
          <div className="mb-3 flex justify-start">
            <SairDaProvaButton
              rotulo="irAoPainel"
              destino="/candidato/dashboard"
              temRespostaNaoSalva={Object.keys(respostas).length > 0 || escolha !== null}
            />
          </div>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-white/70">
                Item {index + 1} de {questoes.length} · Série {questao.serie}
              </p>
              <h1 className="text-2xl font-semibold text-white">{COPY.titulo}</h1>
            </div>
            <div className="flex items-center gap-2 text-white/80">
              <Clock className="h-4 w-4" aria-hidden="true" />
              <span className="tabular-nums">{hhmmss(seconds)}</span>
            </div>
          </div>
          {/* 52-03: as instruções estavam definidas no COPY e nunca apareciam. Ficam em
              todo item — o candidato que volta à aba no item 40 lê de novo a regra. */}
          <p className="mt-2 text-base text-white/80">{COPY.subtitulo}</p>
          <p className="mt-1 text-sm text-white/70">{COPY.semVolta}</p>
          <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-white/20">
            <div
              className="h-full rounded-full bg-[#35BFAD] transition-all duration-300"
              style={{ width: `${progresso}%` }}
            />
          </div>
        </Glass>

        {/* A matriz — desenho preto sobre branco: fica num ladrilho branco sólido, que o
            glass translúcido não garante. */}
        <Glass variant="white" blur="lg" className="mb-4 rounded-xl p-4">
          <div className="rounded-lg bg-white p-2">
            <img
              src={questao.imagem_matriz_url}
              alt={`Item ${questao.numero_questao} da série ${questao.serie}`}
              className="mx-auto max-h-[46vh] w-auto max-w-full object-contain"
              loading="eager"
            />
          </div>
        </Glass>

        {/* As alternativas. Séries A/B trazem 6; C/D/E trazem 8 — o grid segue o
            número real de opções em vez de assumir um dos dois. */}
        <Glass variant="white" blur="lg" className="rounded-xl p-4">
          <div className={`grid gap-3 ${classeGrade}`}>
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
                  className={`rounded-lg border-2 bg-white p-2 transition-all ${
                    ativa
                      ? 'border-[#35BFAD] ring-2 ring-[#35BFAD]/40'
                      : 'border-white/30 hover:border-white/70'
                  }`}
                >
                  {url ? (
                    <img src={url} alt="" className="h-full w-full object-contain" />
                  ) : (
                    // Sobre o ladrilho BRANCO: o número fica escuro, não na escala branca.
                    <span className="block py-4 text-sm font-semibold text-slate-900">{numero}</span>
                  )}
                </button>
              )
            })}
          </div>

          <div className="mt-5 flex justify-end">
            {/* Accent sólido (UI-SPEC §Color 5): é a ação repetida 60 vezes. */}
            <GlassButton
              onClick={avancar}
              disabled={enviando}
              className="min-h-[44px] bg-[#35BFAD] text-sm font-semibold text-white hover:bg-[#35BFAD]/90"
            >
              {index + 1 < questoes.length ? 'Próximo item' : 'Concluir avaliação'}
              <ArrowRight className="ml-2 h-4 w-4" aria-hidden="true" />
            </GlassButton>
          </div>
        </Glass>
      </div>
    </RavenShell>
  )
}
