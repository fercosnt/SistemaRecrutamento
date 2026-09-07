/**
 * RetirarCandidaturaAcao — sair de UMA vaga sem apagar nada (ERASE-05).
 *
 * ── POR QUE ESTE COMPONENTE EXISTE EM VEZ DE VIVER NO CARD ──────────────────
 * Ele **encapsula o `stopPropagation`**. Expor essa responsabilidade ao
 * `DashboardCandidatoPage` a deixaria fácil de esquecer numa edição futura — e o
 * defeito que ela evita é invisível em teste de unidade ingênuo.
 *
 * ── ⚠ A ARMADILHA MEDIDA ────────────────────────────────────────────────────
 * O card inteiro é clicável (`GlassCard … onClick={() => handleVerVaga(vaga_id)}`,
 * `DashboardCandidatoPage.tsx:289`). Sem parar a propagação, um toque na ação abre
 * a confirmação **e navega para a vaga por baixo dela**.
 *
 * A propagação é parada em DOIS pontos, e o segundo parece desnecessário até deixar
 * de ser: o `AlertDialogContent` do Radix renderiza num **portal**, e eventos de
 * portal do React sobem pela **árvore React**, não pela do DOM. Um clique dentro do
 * diálogo aberto alcança o `onClick` do card mesmo estando fora dele no DOM.
 *
 * ── ⚠ ESTE DIÁLOGO NÃO É DESTRUCTIVE, E A ASSIMETRIA É O MECANISMO ──────────
 * Se os dois diálogos desta fase fossem vermelhos, o vermelho deixaria de significar
 * "isto não tem volta" e passaria a significar "isto é um diálogo" — e a distinção
 * que o ERASE-05 exige morreria no único lugar onde ela é lida sob pressão. Retirar
 * encerra um processo e **preserva os dados**: confirma em glass-branco.
 *
 * ── ⚠ O PARÁGRAFO DA DISTINÇÃO É NEGATIVO E SEM LINK ────────────────────────
 * Ele NOMEIA a página de dados e diz o que a retirada *não* faz. Um link ali
 * transformaria "quero sair desta vaga" num caminho de **dois cliques** até um
 * efeito irreversível — a escalada exata que esta fase existe para não construir
 * (Invariante 2).
 *
 * ── O CARD RETIRADO NÃO SOME ────────────────────────────────────────────────
 * Sumir seria (i) o titular perdendo o registro de uma ação que ele mesmo tomou e
 * (ii) a tela concordando com a leitura errada de que retirar apaga. Ele fica, com o
 * estado dito por escrito e a ação removida.
 *
 * @module features/vagas/components/RetirarCandidaturaAcao
 * @see .planning/phases/45-motor-de-exclus-o-anonimiza-o/45-UI-SPEC.md (§Retirar minha candidatura · §O AlertDialog de retirada · §Color)
 */
import { useId } from 'react'
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
  useRetirarCandidatura,
  type RetirarCandidaturaError,
} from '../hooks/useRetirarCandidatura'

/**
 * Copy verbatim da 45-UI-SPEC (§`/candidato/dashboard` · Retirar minha candidatura
 * e §O `AlertDialog` de retirada).
 *
 * ⚠ `paragrafo2` é a ÚNICA string desta constante que pode conter o verbo "apagar",
 * e ela o usa em forma NEGATIVA. É o parágrafo que carrega a distinção do ERASE-05.
 */
export const COPY_RETIRAR_CANDIDATURA = {
  acao: 'Retirar minha candidatura',
  emVoo: 'Retirando…',
  motivoEmVoo: 'Estamos registrando a retirada da sua candidatura.',
  titulo: (tituloVaga: string) => `Retirar sua candidatura para ${tituloVaga}?`,
  /** Vaga sem título resolvível — nunca UUID, nunca "Vaga não encontrada". */
  vagaSemTitulo: 'esta vaga',
  paragrafo1: 'Você sai deste processo seletivo agora. A equipe de recrutamento é avisada.',
  paragrafo2:
    'Seus dados continuam com a Beauty Smile. Isto não é o mesmo que apagar seus dados — apagar é outra coisa, e fica na página Seus dados e autorizações.',
  paragrafo3: 'Se quiser participar desta vaga de novo, será preciso se candidatar novamente.',
  confirmar: 'Sim, retirar minha candidatura',
  recuar: 'Voltar',
  estadoApos: (data: string) => `Você retirou sua candidatura em ${data}.`,
  erro: 'Não foi possível retirar sua candidatura. Tente novamente em instantes.',
  /**
   * A recusa de DOMÍNIO (`NAO_RETIRAVEL`), que a genérica acima descrevia errado.
   *
   * ⚠ A diferença que importa não é de tom, é de VERDADE: «tente novamente em
   * instantes» é uma instrução que o titular **nunca** conseguirá satisfazer quando a
   * candidatura já teve desfecho. É a mesma forma do WR-05 (a recusa de alcance da
   * revisão que virava «tente novamente» retryable) — e a saída honesta é a mesma:
   * dizer que não há o que tentar. Não usa o verbo «apagar»: a distinção do ERASE-05
   * mora em `paragrafo2` e em nenhum outro lugar desta constante.
   */
  erroNaoRetiravel:
    'Esta candidatura não pode mais ser retirada — ela já foi encerrada ou já teve um desfecho. Tentar de novo não muda isso.',
} as const

export interface RetirarCandidaturaAcaoProps {
  candidaturaId: string
  /** Título já resolvido pelo card — o diálogo não faz leitura própria (E7·loading). */
  tituloVaga?: string | null
  /** `encerrada_a_pedido_em` (ISO) ou `null` quando a candidatura segue aberta. */
  encerradaEm?: string | null
  /** `true` só quando a candidatura está em andamento (nem decidida, nem removida). */
  emAndamento: boolean
}

/**
 * `dd/mm/aaaa` ou `null`. §Formatação: data ilegível ⇒ a frase que a conteria é
 * OMITIDA — nunca um travessão, nunca `Invalid Date`, nunca `NaN`.
 */
function formatarData(iso: string | null | undefined): string | null {
  if (!iso) return null
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return null
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

export function RetirarCandidaturaAcao({
  candidaturaId,
  tituloVaga,
  encerradaEm,
  emAndamento,
}: RetirarCandidaturaAcaoProps) {
  const retirar = useRetirarCandidatura()
  const idMotivo = useId()

  // ── Estado APÓS: o card permanece, com o fato por escrito e sem a ação ─────
  if (encerradaEm) {
    const data = formatarData(encerradaEm)
    return (
      <div className="mt-3 border-t border-white/10 pt-3" onClick={pararPropagacao}>
        {data ? (
          <p className="text-sm font-semibold text-white/80">
            {COPY_RETIRAR_CANDIDATURA.estadoApos(data)}
          </p>
        ) : null}
      </div>
    )
  }

  // Candidatura já decidida ou removida: oferecer saída de um processo encerrado
  // seria oferecer uma ação que não faz nada.
  if (!emAndamento) return null

  const titulo = tituloVaga?.trim()
    ? tituloVaga.trim()
    : COPY_RETIRAR_CANDIDATURA.vagaSemTitulo

  return (
    <div className="mt-3 border-t border-white/10 pt-3" onClick={pararPropagacao}>
      <AlertDialog>
        <AlertDialogTrigger asChild>
          {/*
            Peso SUBORDINADO ao CTA de funil do card (§Âncora visual): 14px/600, e
            NUNCA um `GlassButton variant="white"` do mesmo peso. `min-h-[44px]` é o
            piso de alvo tátil; a quebra é livre para o rótulo crescer em altura a
            320px em vez de estourar (E6·long-text).
          */}
          <button
            type="button"
            disabled={retirar.isPending}
            aria-busy={retirar.isPending}
            aria-describedby={retirar.isPending ? idMotivo : undefined}
            onClick={pararPropagacao}
            className="inline-flex min-h-[44px] items-center justify-center gap-2 whitespace-normal rounded-lg border border-white/20 bg-white/5 px-4 py-2 text-sm font-semibold text-white/80 transition-colors hover:bg-white/15 disabled:cursor-not-allowed disabled:opacity-70"
          >
            {retirar.isPending ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                {COPY_RETIRAR_CANDIDATURA.emVoo}
              </>
            ) : (
              COPY_RETIRAR_CANDIDATURA.acao
            )}
          </button>
        </AlertDialogTrigger>

        {/*
          ⚠ WR-09 herdado: SEM condição de montagem. No molde, um `AlertDialogContent`
          condicionado por regra mais estrita que a do gatilho produziu um diálogo
          vazio — "sem confirmação, sem erro, sem salvar".

          O `onClick` aqui é a SEGUNDA metade do `stopPropagation`, e é a que parece
          desnecessária: o portal do Radix está fora do card no DOM, mas eventos de
          portal do React sobem pela árvore REACT.
        */}
        <AlertDialogContent
          onClick={pararPropagacao}
          className="border-white/25 bg-[#00109E]/95 text-white backdrop-blur-xl sm:max-w-lg"
        >
          <AlertDialogHeader>
            <AlertDialogTitle className="text-xl font-semibold text-white">
              {COPY_RETIRAR_CANDIDATURA.titulo(titulo)}
            </AlertDialogTitle>
            <AlertDialogDescription className="text-base leading-relaxed text-white/90">
              {COPY_RETIRAR_CANDIDATURA.paragrafo1}
            </AlertDialogDescription>
          </AlertDialogHeader>

          {/*
            O parágrafo da distinção do ERASE-05. Forma NEGATIVA, e sem `<a>` e sem
            `<button>` para a rota de privacidade — ele NOMEIA a página e diz o que a
            retirada não faz (Invariante 2).
          */}
          <p className="text-base leading-relaxed text-white/90">
            {COPY_RETIRAR_CANDIDATURA.paragrafo2}
          </p>

          <p className="text-base leading-relaxed text-white/90">
            {COPY_RETIRAR_CANDIDATURA.paragrafo3}
          </p>

          <AlertDialogFooter>
            {/* O recuo vem primeiro no DOM: recebe o foco, e um `Enter` reflexo não confirma. */}
            <AlertDialogCancel className="min-h-[44px]">
              {COPY_RETIRAR_CANDIDATURA.recuar}
            </AlertDialogCancel>
            {/*
              ⚠ GLASS-BRANCO, NUNCA destructive (§Color). Retirar encerra um processo
              e PRESERVA os dados — o vermelho desta fase é reservado à exclusão.
            */}
            <AlertDialogAction
              onClick={() => retirar.mutate(candidaturaId)}
              className="min-h-[44px] border border-white/30 bg-white/20 text-white hover:bg-white/30"
            >
              {COPY_RETIRAR_CANDIDATURA.confirmar}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Motivo irmão do estado desabilitado, em TEXTO VISÍVEL e ligado por
          `aria-describedby` — `title` é inalcançável em toque e em leitor de tela. */}
      {retirar.isPending ? (
        <p id={idMotivo} className="mt-2 text-sm text-white/70">
          {COPY_RETIRAR_CANDIDATURA.motivoEmVoo}
        </p>
      ) : null}

      {/* Erro POR CARD — retirar numa candidatura não bloqueia nem suja as demais.
          A recusa de DOMÍNIO ganha texto próprio: o hook já a traduz para o código
          `NAO_RETIRAVEL` (DI-45-12-01), e era só a tela que jogava tudo na mesma
          frase retryable (WINDOWS 23). */}
      {retirar.isError ? (
        <p
          role="alert"
          className="mt-2 rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-sm font-semibold text-white"
        >
          {(retirar.error as RetirarCandidaturaError | null)?.code === 'NAO_RETIRAVEL'
            ? COPY_RETIRAR_CANDIDATURA.erroNaoRetiravel
            : COPY_RETIRAR_CANDIDATURA.erro}
        </p>
      ) : null}
    </div>
  )
}

/** O `stopPropagation` encapsulado — a razão de este componente existir. */
function pararPropagacao(e: { stopPropagation: () => void }) {
  e.stopPropagation()
}
