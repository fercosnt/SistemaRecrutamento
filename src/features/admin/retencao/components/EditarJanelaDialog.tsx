/**
 * EditarJanelaDialog — a edição da janela de retenção de um estado (RETEN-02).
 *
 * ── O MODELO MENTAL, EM UMA FRASE ────────────────────────────────────────────────
 * Este diálogo **não impede** nada. Quem impede é `salvar_janela_retencao` no servidor.
 * O teto de 24, a recusa de no-op e o próprio direito de escrever são decididos lá — a
 * RPC recusa com `22023` (valor NULL, fora de `1..24`, etapa fora da matriz, ou NO-OP) e
 * com `42501` (papel não-administrador, guard NULL-safe), tudo provado por execução no
 * smoke do 43-07. O trabalho honesto desta tela é dizer a mesma coisa **antes** da ida à
 * rede, para o operador não receber de volta um SQLSTATE opaco.
 *
 * ── AS QUATRO REGRAS QUE UMA EDIÇÃO FUTURA MAIS PROVAVELMENTE QUEBRARIA ─────────
 *
 * 1. **O NO-OP É RECUSADO NOS DOIS LADOS.** Salvar o valor que já está lá escreveria uma
 *    linha de auditoria vazia — um registro de mudança sem mudança, que polui exatamente
 *    a trilha que a Phase 46 vai consultar para saber se alguém REALMENTE escolheu aqueles
 *    números. A tela desabilita o CTA; o servidor recusa. Uma regra que vive só na tela é
 *    uma regra que não existe.
 *
 * 2. **OS DOIS RECUOS TÊM RÓTULOS DISTINTOS, E NENHUM É O VERBO GENÉRICO.**
 *    · "Fechar sem salvar" (rodapé) → abandona a edição INTEIRA.
 *    · "Voltar" (confirmação aninhada) → recua UM passo, devolve ao formulário preenchido.
 *    Os dois podem estar visíveis no mesmo fluxo. "Cancelar" nos dois seria a mesma
 *    palavra para duas saídas diferentes.
 *
 * 3. **NENHUM VERBO DESTRUTIVO, EM CONTROLE NENHUM.** A ação mais forte desta interface —
 *    salvar uma janela — é ADITIVA e AUDITÁVEL e não apaga nada. Ela é gatilhada por
 *    `alert-dialog` mesmo assim, porque muda um número de POLÍTICA: a confirmação existe
 *    pelo peso da decisão, não pela irreversibilidade do efeito.
 *
 * 4. **O CORPO DA CONFIRMAÇÃO DIZ O QUE NÃO ACONTECE.** "Nenhum dado de candidato é
 *    apagado por esta alteração — e hoje nenhuma rotina deste sistema apaga dados de
 *    candidato automaticamente." Essa frase é verbatim da 43-UI-SPEC e é o segundo dos
 *    dois usos obrigatórios da palavra nesta página. Ela é honesta porque NEGA a exclusão
 *    automática; o portão de copy do 43-02 mantém `src/features/admin/` fora da allowlist
 *    do candidato exatamente para permitir esta frase.
 *
 * O foco vai para o primeiro controle ao abrir e volta ao gatilho ao fechar — o Radix já
 * cuida disso; não sobrescrever.
 *
 * @module features/admin/retencao/components/EditarJanelaDialog
 * @see src/features/revisao/components/ResponderRevisaoDialog.tsx (o molde: diálogo + confirmação aninhada)
 * @see .planning/phases/43-consentimentos-honestos-pol-tica-de-reten-o/43-UI-SPEC.md (copy verbatim)
 */
import { useEffect, useRef, useState } from 'react'
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { GlassButton } from '@/components/ui/glass'
import {
  JANELA_MESES_MAX,
  validarJanela,
} from '../schemas/janelaRetencaoSchema'
import { useSalvarJanela } from '../hooks/useSalvarJanela'
import { MATRIZ_COPY, rotularUltimaAlteracao, type LinhaMatriz } from './MatrizRetencaoTable'

/** Copy verbatim da 43-UI-SPEC (§Diálogo · §Confirmação, linhas 546-576). */
export const DIALOGO_JANELA_COPY = {
  titulo: 'Editar janela de retenção',
  descricao:
    'Define por quanto tempo os dados de uma candidatura neste estado ficam guardados. A alteração fica registrada na trilha de auditoria.',
  contexto: {
    estado: 'Estado',
    janelaAtual: 'Janela atual',
    ultimaAlteracao: 'Última alteração',
  },
  rotuloCampo: 'Janela de retenção',
  rotuloCampoUnidade: '(em meses)',
  ajudaCampo: {
    inicio: 'Máximo de ',
    forte: `${JANELA_MESES_MAX} meses`,
    resto: ' — o teto que o candidato já leu e aceitou no cadastro.',
  },
  ctaPrimario: 'Salvar janela de retenção',
  ctaEnviando: 'Salvando…',
  /** Regra 2 do docblock: NÃO é o verbo genérico, e é distinto do "Voltar" aninhado. */
  ctaSecundario: 'Fechar sem salvar',
  confirmacao: {
    titulo: 'Salvar janela de retenção?',
    confirmar: 'Salvar janela de retenção',
    /** Regra 2: recuo CURTO — um passo atrás, devolve ao formulário preenchido. */
    recuar: 'Voltar',
    escopo:
      'Nenhum dado de candidato é apagado por esta alteração — e hoje nenhuma rotina deste sistema apaga dados de candidato automaticamente.',
  },
} as const

/** Micro-rótulo em caixa alta no papel de label de 14px (nunca um 5º tamanho). */
const EYEBROW = 'text-sm font-semibold uppercase tracking-wide text-white/50'

const ID_CAMPO = 'janela-retencao-meses'

/** Um par rótulo/valor do bloco de contexto somente leitura. */
function Contexto({ rotulo, valor }: { rotulo: string; valor: string }) {
  return (
    <div className="space-y-1">
      <p className={EYEBROW}>{rotulo}</p>
      <p className="text-base text-white">{valor}</p>
    </div>
  )
}

export interface EditarJanelaDialogProps {
  /** A linha da matriz em foco. `null` fecha o diálogo sem renderizar conteúdo. */
  linha: LinhaMatriz | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function EditarJanelaDialog({ linha, open, onOpenChange }: EditarJanelaDialogProps) {
  const atual = linha?.janelaMeses ?? null
  const [texto, setTexto] = useState(atual === null ? '' : String(atual))
  const campoRef = useRef<HTMLInputElement>(null)
  const salvar = useSalvarJanela()

  // O diálogo é montado UMA vez pela página e reusado para todas as linhas: sem este
  // reset, abrir a linha B mostraria o rascunho da linha A — e o operador salvaria, no
  // estado errado, um número que ele acha que já revisou. O valor atual entra
  // pré-preenchido e SELECIONADO: digitar substitui, em vez de concatenar.
  const etapa = linha?.etapa ?? null
  useEffect(() => {
    if (!open) return
    setTexto(atual === null ? '' : String(atual))
    campoRef.current?.select()
  }, [open, etapa, atual])

  if (!linha) return null

  const { meses, erro } = validarJanela(texto)
  // O no-op NÃO é erro de validação: não há o que corrigir, só nada a salvar. Por isso ele
  // desabilita o CTA sem produzir mensagem sob o campo (regra 1 do docblock).
  const semMudanca = erro === null && meses !== null && meses === atual
  const podeSalvar = erro === null && meses !== null && !semMudanca && !salvar.isPending

  function confirmar() {
    if (!podeSalvar || meses === null || !linha) return
    salvar.mutate(
      { etapa: linha.etapa, meses },
      { onSuccess: () => onOpenChange(false) },
    )
  }

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
            {DIALOGO_JANELA_COPY.titulo}
          </DialogTitle>
          <DialogDescription className="text-base text-white/70">
            {DIALOGO_JANELA_COPY.descricao}
          </DialogDescription>
        </DialogHeader>

        {/* Bloco de contexto — SOMENTE LEITURA. */}
        <div className="grid gap-4 rounded-lg border border-white/15 bg-white/5 p-4 sm:grid-cols-3">
          <Contexto
            rotulo={DIALOGO_JANELA_COPY.contexto.estado}
            valor={linha.rotulo}
          />
          <Contexto
            rotulo={DIALOGO_JANELA_COPY.contexto.janelaAtual}
            valor={
              atual === null
                ? MATRIZ_COPY.janelaNaoDefinida
                : MATRIZ_COPY.janelaMeses(atual)
            }
          />
          <Contexto
            rotulo={DIALOGO_JANELA_COPY.contexto.ultimaAlteracao}
            valor={rotularUltimaAlteracao(linha)}
          />
        </div>

        <div className="space-y-2">
          <label
            htmlFor={ID_CAMPO}
            className="text-sm font-semibold text-white"
          >
            {DIALOGO_JANELA_COPY.rotuloCampo}{' '}
            <span className="font-normal text-white/60">
              {DIALOGO_JANELA_COPY.rotuloCampoUnidade}
            </span>
          </label>
          <Input
            id={ID_CAMPO}
            ref={campoRef}
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
            // Sem texto livre: teclado numérico no toque e dois dígitos no máximo — o
            // teto tem dois dígitos, então um terceiro só poderia ser recusa.
            inputMode="numeric"
            maxLength={2}
            autoComplete="off"
            aria-invalid={erro !== null || undefined}
            aria-describedby={`${ID_CAMPO}-ajuda`}
            className="max-w-[120px] border-white/15 bg-white/5 text-white"
          />
          <p id={`${ID_CAMPO}-ajuda`} className="text-sm text-white/60">
            {DIALOGO_JANELA_COPY.ajudaCampo.inicio}
            <span className="font-semibold text-white/80">
              {DIALOGO_JANELA_COPY.ajudaCampo.forte}
            </span>
            {DIALOGO_JANELA_COPY.ajudaCampo.resto}
          </p>
          {erro !== null ? (
            <p role="alert" className="text-sm font-semibold text-red-300">
              {erro}
            </p>
          ) : null}
        </div>

        <DialogFooter>
          {/* Recuo LARGO: abandona a edição inteira. Distinto do "Voltar". */}
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="inline-flex min-h-[44px] items-center justify-center rounded-lg border border-white/30 bg-white/10 px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-white/20"
          >
            {DIALOGO_JANELA_COPY.ctaSecundario}
          </button>

          <AlertDialog>
            <AlertDialogTrigger asChild>
              <GlassButton
                variant="white"
                hover
                disabled={!podeSalvar}
                className="min-h-[44px] text-white"
              >
                {salvar.isPending ? (
                  <span className="flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                    {DIALOGO_JANELA_COPY.ctaEnviando}
                  </span>
                ) : (
                  DIALOGO_JANELA_COPY.ctaPrimario
                )}
              </GlassButton>
            </AlertDialogTrigger>
            {meses !== null && atual !== null ? (
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>
                    {DIALOGO_JANELA_COPY.confirmacao.titulo}
                  </AlertDialogTitle>
                  <AlertDialogDescription>
                    O estado <span className="font-semibold">{linha.rotulo}</span> passa de{' '}
                    <span className="font-semibold">{MATRIZ_COPY.janelaMeses(atual)}</span>{' '}
                    para{' '}
                    <span className="font-semibold">{MATRIZ_COPY.janelaMeses(meses)}</span>.{' '}
                    {DIALOGO_JANELA_COPY.confirmacao.escopo}
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  {/* Recuo CURTO: um passo atrás, devolve ao formulário preenchido. */}
                  <AlertDialogCancel className="min-h-[44px]">
                    {DIALOGO_JANELA_COPY.confirmacao.recuar}
                  </AlertDialogCancel>
                  <AlertDialogAction className="min-h-[44px]" onClick={confirmar}>
                    {DIALOGO_JANELA_COPY.confirmacao.confirmar}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            ) : null}
          </AlertDialog>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
