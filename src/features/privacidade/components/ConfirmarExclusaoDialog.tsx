/**
 * ConfirmarExclusaoDialog — a última coisa que alguém lê antes do irreversível (ERASE-06).
 *
 * ── POR QUE ESTE ARQUIVO NÃO É "MAIS UM DIÁLOGO" ─────────────────────────────
 * O operador decidiu, com data, **não ligar o PITR** (D-45-10): os backups cobrem 7
 * dias e **excluem o Storage inteiramente**. Um currículo apagado por engano é
 * irrecuperável por qualquer meio — não existe segunda rede. Quem "melhorar" a redação
 * de uma linha de `COPY_CONFIRMAR_EXCLUSAO` sem passar pela 45-UI-SPEC não está
 * editando texto: está alterando o consentimento sob o qual um dado é destruído.
 *
 * ── AS CINCO REGRAS QUE UMA EDIÇÃO FUTURA MAIS PROVAVELMENTE QUEBRARIA ───────
 *
 * 1. **QUATRO RÓTULOS DE SAÍDA, TODOS DISTINTOS, NENHUM GENÉRICO.** Herdada verbatim
 *    da regra 2 do `EditarJanelaDialog` — e aqui a colisão seria **pior**: nesta fase a
 *    palavra genérica de recuo significaria TRÊS coisas (fechar esta janela / recuar um
 *    passo / **cancelar a exclusão já agendada**, que é o nome da ação do Estado B). A
 *    mesma palavra para três saídas diferentes, numa superfície irreversível, é a
 *    fábrica de erro que esta fase existe para não construir.
 *      · "Fechar sem apagar nada" (rodapé, nível 1) → abandona a leitura inteira.
 *      · "Continuar para a confirmação" (nível 1) → **não apaga nada**, abre o portão.
 *      · "Voltar" (nível 2) → recua UM passo, devolve à leitura.
 *      · "Sim, apagar meus dados" (nível 2, destructive) → o único que age.
 *
 * 2. **SEM DIGITAÇÃO-REFÉM** (Invariante 7), e a justificativa é jurídica, não
 *    ergonômica: exigir transcrição de uma palavra para exercer um direito do Art. 18 é
 *    fricção **sobre um direito**, numa superfície mobile-first. A rede de segurança
 *    desta fase é a **janela cancelável** — ela protege sem obstruir.
 *
 * 3. **O PONTEIRO PARA O EXPORT É TEXTO, SEM LINK E SEM BOTÃO.** O único momento em que
 *    o titular ainda pode salvar os próprios dados é ANTES de confirmar, e é neste
 *    instante que ele está pensando no assunto — oferecer o export depois seria oferecer
 *    o resgate ao lado do naufrágio. Mas o ponteiro manda **fechar** esta janela, não
 *    navegar dentro dela (Invariante 2 na direção segura).
 *
 * 4. **O DIÁLOGO NÃO FAZ LEITURA PRÓPRIA.** A data chega resolvida pelo bloco. Um
 *    diálogo destrutivo que carrega dados enquanto está aberto pode mudar a frase
 *    debaixo do dedo de quem já leu (E3·loading). Sem data legível, a frase que a
 *    conteria degrada para a variante sem data — nunca um travessão, nunca `NaN`
 *    (§Formatação).
 *
 * 5. **⚠ WR-09 — O `AlertDialogContent` É MONTADO SEM CONDIÇÃO NENHUMA.** No molde, uma
 *    condição mais estrita que a do gatilho produziu um diálogo vazio: *"sem confirmação,
 *    sem erro, sem salvar"*. Aqui o efeito seria um titular que confirma e não acontece
 *    nada, numa tela cuja premissa inteira é honestidade. Não condicionar é a forma mais
 *    forte de "não mais estrita que o gatilho".
 *
 * ── FOCO ────────────────────────────────────────────────────────────────────
 * Delegado ao Radix — **não sobrescrever**. A única garantia autorada é de ORDEM: o
 * recuo vem antes do confirmar no DOM, de modo que um `Enter` reflexo não confirme uma
 * exclusão.
 *
 * ── O QUE ESTE COMPONENTE HERDA E NÃO CONTROLA ──────────────────────────────
 * `DialogContent` (primitivo vendorizado) renderiza um "X" próprio com texto `sr-only`
 * em inglês e sem `min-h-[44px]`. É primitivo compartilhado por todos os diálogos do app
 * desde o M1; mudá-lo está fora do escopo deste plano (ver `deferred-items.md`).
 *
 * @module features/privacidade/components/ConfirmarExclusaoDialog
 * @see src/features/admin/retencao/components/EditarJanelaDialog.tsx (o molde ESTRUTURAL — nunca a copy)
 * @see .planning/phases/45-motor-de-exclus-o-anonimiza-o/45-UI-SPEC.md (§O `AlertDialog` de confirmação)
 */
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { GlassButton } from '@/components/ui/glass'

/**
 * Copy verbatim da 45-UI-SPEC § "O `AlertDialog` de confirmação" (linhas 508-531).
 *
 * ⚠ QUATRO STRINGS SÃO AUTORADAS ALÉM DA TABELA, e o motivo está registrado:
 *  · `fechar` e `avancar` — a tabela da spec dá dois rótulos (confirmar/recuar), e a
 *    própria spec exige **quatro distintos** nos dois níveis. Os dois que faltavam são
 *    autorados aqui, e ambos dizem o que fazem sem prometer efeito nenhum.
 *  · `confirmacaoTitulo` e `confirmacaoCorpo` — o segundo nível precisa de título e de
 *    descrição acessível próprios (exigência do Radix e da §Acessibilidade). O corpo
 *    REPETE a frase da ausência de cópia de reserva de propósito: é a última linha antes
 *    do clique que destrói.
 *
 * As variantes `…SemData` existem porque a §Formatação manda **omitir a frase** que
 * conteria uma data ilegível — nunca um travessão no lugar da data de uma exclusão
 * irreversível. Mesmo idioma de `COPY_EXCLUIR_DADOS.oQueAcontece(dias)`.
 */
export const COPY_CONFIRMAR_EXCLUSAO = {
  titulo: 'Apagar seus dados da Beauty Smile?',

  paragrafo1: (data: string) =>
    `Suas candidaturas em andamento são encerradas agora. Seus dados são apagados em ${data} — até lá você pode cancelar por esta página.`,
  paragrafo1SemData:
    'Suas candidaturas em andamento são encerradas agora. Seus dados são apagados depois, e até lá você pode cancelar por esta página.',

  /** A caixa de consequência — item 1 da lista reservada de TRÊS do destructive. */
  consequenciaTitulo: 'Isto não tem volta.',
  consequencia: (data: string) =>
    `Depois de ${data}, seu currículo e seu cadastro não podem ser recuperados — nem por você, nem pela Beauty Smile, nem pelo nosso suporte.`,
  consequenciaSemData:
    'Seu currículo e seu cadastro não podem ser recuperados — nem por você, nem pela Beauty Smile, nem pelo nosso suporte.',
  /**
   * ⚠ A TRADUÇÃO HONESTA DO D-45-10, E ELA NÃO É NEGOCIÁVEL. O operador aceitou e datou
   * o risco de não ligar o PITR; a pessoa cujo arquivo será destruído tem o direito de
   * saber que a rede não existe **antes** de decidir, e não depois. Dita em linguagem de
   * pessoa — sem "PITR", sem "backup", sem "Storage".
   */
  consequenciaSemRede: 'Não existe cópia de reserva do seu currículo.',

  /** Invariante 3 — repetido aqui de propósito: a menção a cancelar nunca anda sozinha. */
  paragrafo2:
    'Cancelar depois interrompe a exclusão, mas as candidaturas encerradas não voltam.',

  /** O ponteiro honesto para o direito vizinho — TEXTO, sem link e sem botão. */
  paragrafo3:
    'Se quiser guardar uma cópia dos seus dados antes, feche esta janela e use Pedir uma cópia dos seus dados, na seção acima.',

  /** Recuo LARGO (nível 1): abandona a leitura inteira. */
  fechar: 'Fechar sem apagar nada',
  /** Gatilho do nível 2: diz explicitamente que ainda não apaga nada. */
  avancar: 'Continuar para a confirmação',

  confirmacaoTitulo: 'Confirmar a exclusão dos seus dados?',
  confirmacaoCorpo: (data: string) =>
    `Ao confirmar, suas candidaturas em andamento são encerradas agora e seus dados são apagados em ${data}. Não existe cópia de reserva do seu currículo.`,
  confirmacaoCorpoSemData:
    'Ao confirmar, suas candidaturas em andamento são encerradas agora e seus dados são apagados depois. Não existe cópia de reserva do seu currículo.',

  /** Recuo CURTO (nível 2): um passo atrás, devolve à leitura. */
  recuar: 'Voltar',
  /** O único controle desta fase com tratamento destructive (item 2 da lista reservada). */
  confirmar: 'Sim, apagar meus dados',
} as const

export interface ConfirmarExclusaoDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  /**
   * A data alvo **já resolvida pelo bloco** (`dd/mm/aaaa`), ou `null` quando não há data
   * legível. O diálogo não lê nada por conta própria (regra 4 do docblock).
   */
  dataAlvo: string | null
  /** Dispara o pedido. O diálogo não conhece a mutação — ele só pergunta. */
  onConfirmar: () => void
}

export function ConfirmarExclusaoDialog({
  open,
  onOpenChange,
  dataAlvo,
  onConfirmar,
}: ConfirmarExclusaoDialogProps) {
  return (
    <Dialog
      open={open}
      onOpenChange={(proximo: boolean) => {
        if (!proximo) onOpenChange(false)
      }}
    >
      <DialogContent className="border-white/25 bg-[#00109E]/95 text-white backdrop-blur-xl sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold text-white">
            {COPY_CONFIRMAR_EXCLUSAO.titulo}
          </DialogTitle>
        </DialogHeader>

        {/* Prosa de CARGA — 16px/1.5, nunca `text-sm`, nunca truncada, nunca dentro de
            um accordion: encolher o texto que descreve um efeito irreversível é
            encolher o consentimento (§Typography). */}
        <p className="text-base leading-relaxed text-white/90">
          {dataAlvo
            ? COPY_CONFIRMAR_EXCLUSAO.paragrafo1(dataAlvo)
            : COPY_CONFIRMAR_EXCLUSAO.paragrafo1SemData}
        </p>

        {/* ⚠ A CAIXA DE CONSEQUÊNCIA **É** A DESCRIÇÃO DO DIÁLOGO, não um enfeite ao
            lado dela: sendo o `DialogDescription`, o Radix a liga ao conteúdo por
            `aria-describedby` — e é por isso que o `id` NÃO é passado à mão aqui (um id
            próprio quebraria a ligação que o próprio Radix montou). */}
        <DialogDescription className="rounded-lg border border-destructive/40 bg-destructive/10 p-4 text-base leading-relaxed text-white">
          <span className="font-semibold">{COPY_CONFIRMAR_EXCLUSAO.consequenciaTitulo}</span>{' '}
          {dataAlvo
            ? COPY_CONFIRMAR_EXCLUSAO.consequencia(dataAlvo)
            : COPY_CONFIRMAR_EXCLUSAO.consequenciaSemData}{' '}
          {COPY_CONFIRMAR_EXCLUSAO.consequenciaSemRede}
        </DialogDescription>

        <p className="text-base leading-relaxed text-white/90">
          {COPY_CONFIRMAR_EXCLUSAO.paragrafo2}
        </p>

        {/* Ponteiro TEXTUAL para o export. Sem `<a>`, sem `<button>`: ele manda FECHAR
            esta janela, não navegar dentro dela. */}
        <p className="text-base leading-relaxed text-white/90">
          {COPY_CONFIRMAR_EXCLUSAO.paragrafo3}
        </p>

        {/* O botão que leva ao vermelho fica no FIM do fluxo, depois do texto de
            consequência — confirmar sem ter podido rolar até a consequência é o pior
            arranjo possível aqui (E3·overflow). */}
        <DialogFooter>
          <button
            type="button"
            data-saida="fechar"
            onClick={() => onOpenChange(false)}
            className="inline-flex min-h-[44px] items-center justify-center rounded-lg border border-white/30 bg-white/10 px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-white/20"
          >
            {COPY_CONFIRMAR_EXCLUSAO.fechar}
          </button>

          <AlertDialog>
            <AlertDialogTrigger asChild>
              {/* Glass-branco: o gatilho NÃO é vermelho (Invariante 6). O peso
                  destrutivo vive onde a decisão acontece, um nível abaixo. */}
              <GlassButton
                variant="white"
                hover
                data-saida="avancar"
                className="min-h-[44px] text-white"
              >
                {COPY_CONFIRMAR_EXCLUSAO.avancar}
              </GlassButton>
            </AlertDialogTrigger>

            {/* ⚠ WR-09: SEM condição de montagem. Ver a regra 5 do docblock. */}
            <AlertDialogContent className="border-white/25 bg-[#00109E]/95 text-white backdrop-blur-xl sm:max-w-lg">
              <AlertDialogHeader>
                <AlertDialogTitle className="text-xl font-semibold text-white">
                  {COPY_CONFIRMAR_EXCLUSAO.confirmacaoTitulo}
                </AlertDialogTitle>
                <AlertDialogDescription className="text-base leading-relaxed text-white/90">
                  {dataAlvo
                    ? COPY_CONFIRMAR_EXCLUSAO.confirmacaoCorpo(dataAlvo)
                    : COPY_CONFIRMAR_EXCLUSAO.confirmacaoCorpoSemData}
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                {/* ⚠ O RECUO VEM PRIMEIRO NO DOM — é ele que recebe o foco, e é por isso
                    que um `Enter` reflexo não confirma uma exclusão. */}
                <AlertDialogCancel data-saida="recuar" className="min-h-[44px]">
                  {COPY_CONFIRMAR_EXCLUSAO.recuar}
                </AlertDialogCancel>
                <AlertDialogAction
                  data-saida="confirmar"
                  onClick={onConfirmar}
                  className="min-h-[44px] border border-destructive/40 bg-destructive text-white hover:bg-destructive/90"
                >
                  {COPY_CONFIRMAR_EXCLUSAO.confirmar}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
