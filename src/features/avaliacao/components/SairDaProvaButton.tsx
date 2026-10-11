/**
 * Phase 52 / Plan 52-02 (JORN-60 — D-24, D-36, D-52-U14, D-52-U15) — o botão de saída
 * DURANTE a prova. Um componente só para as seis telas de prova (as cinco do container
 * aqui no 52-02; o Raven no 52-03).
 *
 * A regra da D-24 (lista corrigida pela D-36): **rascunho → sai direto; memória → confirma.**
 * «Rascunho» quer dizer rascunho que a tela RELÊ quando o candidato volta — gravar não basta.
 *  - A Redação é a única tela que relê (`loadResposta`): passa `temRespostaNaoSalva={false}`
 *    e um `antesDeSair` que espera o flush antes de navegar. O flush de desmontagem do
 *    `useAutosaveAvaliacao` é fogo-e-esquece; o de saída não pode ser.
 *  - Telas cujas respostas vivem só na memória (SJT MC, Prova cognitiva, Raven, e também
 *    Big Five e Caso prático — que gravam pelo autosave, mas nunca releem; CR-01 do
 *    52-REVIEW-PORTAO-1, decisão do operador em 52-14-DECISAO-RODADA-1) passam
 *    `temRespostaNaoSalva` derivado das respostas: com ≥1 marcada (ou texto não-branco)
 *    abre a confirmação de perda; sem nenhuma, sai direto — um diálogo dizendo «não serão
 *    salvas» seria falso quando não há nada a perder (D-52-U15).
 *
 * Sair é navegação local: não há estado novo de falha. Se o flush rejeitar, a tela sai
 * assim mesmo — o rascunho pendente segue o fluxo do `useAutosaveAvaliacao` (buffer em
 * sessionStorage). O botão voltar do NAVEGADOR não é interceptado: a D-24 trata o botão
 * da tela (UI-SPEC, «O que esta fase deliberadamente NÃO faz»).
 *
 * Frases verbatim da D-24 («com Sair e Continuar») + D-52-U14 («Ir ao painel» no Raven),
 * travadas pela UI-SPEC §Copy. Texto só por nó React.
 *
 * @see .planning/phases/52-hub-do-rh-dados-e-contato/52-UI-SPEC.md (Telas do candidato; Copy)
 * @module features/avaliacao/components/SairDaProvaButton
 */
import { useNavigate } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { GlassButton } from '@/components/ui/glass'
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

export const COPY_SAIR_DA_PROVA = {
  voltarAvaliacoes: 'Voltar às avaliações',
  irAoPainel: 'Ir ao painel',
  titulo: 'Sair da avaliação?',
  corpo: 'Se sair agora, as respostas desta prova não serão salvas.',
  continuar: 'Continuar',
  sair: 'Sair',
} as const

export interface SairDaProvaButtonProps {
  /** O rótulo diz o destino: «Voltar às avaliações» → lista; «Ir ao painel» → painel. */
  rotulo: 'voltarAvaliacoes' | 'irAoPainel'
  destino: string
  /** Respostas que só existem na memória da tela — se `true`, confirma antes de sair. */
  temRespostaNaoSalva: boolean
  /** Gravação a esperar antes de navegar (o `flushNow` do rascunho). */
  antesDeSair?: () => Promise<void>
}

const CLASSE_GATILHO = 'inline-flex min-h-[44px] items-center gap-2 text-sm font-semibold text-white'

export function SairDaProvaButton({
  rotulo,
  destino,
  temRespostaNaoSalva,
  antesDeSair,
}: SairDaProvaButtonProps) {
  const navigate = useNavigate()
  const texto = COPY_SAIR_DA_PROVA[rotulo]

  const conteudo = (
    <>
      <ArrowLeft className="h-4 w-4" aria-hidden="true" />
      {texto}
    </>
  )

  if (!temRespostaNaoSalva) {
    const sairDireto = async () => {
      try {
        await antesDeSair?.()
      } catch {
        // Sair é navegação local: uma gravação que falhou não prende o candidato na
        // prova. O rascunho continua no buffer do useAutosaveAvaliacao.
      } finally {
        navigate(destino)
      }
    }
    return (
      <GlassButton
        variant="white"
        onClick={() => void sairDireto()}
        className={CLASSE_GATILHO}
        data-testid="sair-da-prova"
      >
        {conteudo}
      </GlassButton>
    )
  }

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <GlassButton variant="white" className={CLASSE_GATILHO} data-testid="sair-da-prova">
          {conteudo}
        </GlassButton>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{COPY_SAIR_DA_PROVA.titulo}</AlertDialogTitle>
          <AlertDialogDescription>{COPY_SAIR_DA_PROVA.corpo}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          {/* O Cancel recebe o foco inicial do Radix: o caminho seguro é o padrão. */}
          <AlertDialogCancel>{COPY_SAIR_DA_PROVA.continuar}</AlertDialogCancel>
          <AlertDialogAction
            onClick={() => navigate(destino)}
            className="bg-[#EF4444] text-white hover:bg-[#EF4444]/90"
          >
            {COPY_SAIR_DA_PROVA.sair}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
