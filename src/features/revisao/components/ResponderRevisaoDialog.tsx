/**
 * ResponderRevisaoDialog — o registro da resposta à revisão de decisão (REVISAO-03) e a
 * face de interface do guard REVISAO-05 (LGPD Art. 20).
 *
 * ── O MODELO MENTAL, EM UMA FRASE ─────────────────────────────────────────────────
 * Este diálogo **não impede** nada. Quem impede é `responder_revisao_decisao` no
 * servidor. Tudo o que aqui parece um controle de acesso (o botão primário desabilitado,
 * o `pode_responder` que a fila leu) é **cosmético**, no mesmo idioma do comentário
 * `D-13` em `RHSidebar`. O trabalho honesto desta tela é **refletir** a recusa quando ela
 * acontece — e refleti-la sem prometer uma saída que não existe.
 *
 * ── AS TRÊS REGRAS QUE UMA EDIÇÃO FUTURA MAIS PROVAVELMENTE QUEBRARIA ─────────────
 *
 * 1. **A recusa do guard é estado TERMINAL, não erro recuperável.** Quando a mutação
 *    falha com `GUARD_DECISOR`, o diálogo permanece aberto, o texto é preservado, o botão
 *    primário fica desabilitado e um alerta inline destrutivo aparece acima do rodapé.
 *    É **PROIBIDO** nessa região: oferecer "tentar novamente", reenviar o mesmo conteúdo,
 *    ou sugerir que outra tentativa/outro privilégio resolveria. Não existe sobreposição
 *    por administrador, não existe fallback "se só houver um RH". Tentar de novo NUNCA
 *    vai funcionar, porque a recusa é sobre QUEM é o usuário, não sobre o estado do
 *    pedido. Prometer o contorno é o defeito — pior que o bloqueio, porque produz
 *    tentativa repetida e desconfiança do controle.
 *
 * 2. **OS DOIS RECUOS TÊM RÓTULOS DISTINTOS, E NENHUM É O VERBO GENÉRICO.**
 *    · "Fechar sem registrar" (rodapé do diálogo) → abandona a resposta INTEIRA.
 *    · "Voltar" (confirmação aninhada) → recua UM passo e devolve ao formulário preenchido.
 *    Os dois podem estar visíveis no mesmo fluxo. Um operador que leia o mesmo verbo nos
 *    dois não sabe qual saída está tomando — e a diferença entre elas é perder ou não
 *    perder um texto de 50+ caracteres que ele acabou de escrever.
 *
 * 3. **O tint de `revertida` é ÂMBAR, nunca destrutivo.** Nada é apagado: a resposta é
 *    aditiva e auditável, e reverter uma decisão é o Art. 20 funcionando como deve. Pintar
 *    isso de vermelho leria o direito exercido como falha do sistema.
 *
 * ⚠ EFEITO EXTERNO IRREVERSÍVEL: um sucesso aqui dispara `trg_notif_revisao_respondida`
 * → EF `notificar-candidato` → e-mail REAL ao candidato. Não há desfazer. É por isso que
 * a confirmação aninhada existe e roda ANTES da chamada, não depois.
 *
 * @module features/revisao/components/ResponderRevisaoDialog
 * @see src/features/decisao/components/RegistrarDecisaoForm.tsx (o molde: radio-cartão + contador + confirmação)
 * @see src/features/revisao/hooks/useResponderRevisao.ts (por que GUARD_DECISOR não vira toast)
 * @see .planning/phases/42-invent-rio-gates-fila-art-20/42-UI-SPEC.md (§Diálogo · §Confirmação · §Recusa do servidor)
 */
import { useEffect, useState } from 'react'
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
import { Label } from '@/components/ui/label'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Textarea } from '@/components/ui/textarea'
import { GlassButton } from '@/components/ui/glass'
import { cn } from '@/components/ui/utils'
import {
  JUSTIFICATIVA_MIN,
  responderRevisaoSchema,
  VEREDITO_OPTIONS,
  type ResponderRevisaoFormValues,
} from '../schemas/responderRevisaoSchema'
import { RevisaoError, type FilaRevisaoRow } from '../services/revisaoService'
import { useResponderRevisao } from '../hooks/useResponderRevisao'
import { VereditoBadge } from './VereditoBadge'

type Veredito = ResponderRevisaoFormValues['veredito']

/** Copy verbatim da 42-UI-SPEC — fonte ÚNICA desta tela, sem deriva. */
const DIALOGO_COPY = {
  titulo: 'Responder revisão',
  descricao:
    'A resposta fica registrada na trilha de auditoria e o candidato é notificado por e-mail.',
  // A UI-SPEC não especifica o cabeçalho do modo somente-leitura (ela descreve só o
  // fluxo de escrita). Estes dois são derivados dela — mesmo registro, tempo passado.
  tituloLeitura: 'Resposta da revisão',
  descricaoLeitura:
    'Esta revisão já foi respondida. O registro abaixo está na trilha de auditoria e o candidato foi notificado por e-mail.',
  contexto: {
    candidato: 'Candidato',
    vaga: 'Vaga',
    decisao: 'Decisão original',
    quemDecidiu: 'Quem decidiu',
    pedidoEm: 'Pedido feito em',
  },
  rotuloVeredito: 'Resultado da revisão',
  rotuloVereditoObrigatorio: '(obrigatório)',
  rotuloJustificativa: 'Justificativa',
  rotuloJustificativaAjuda: '(obrigatória — mínimo 50 caracteres)',
  placeholder:
    'Descreva o que foi reexaminado e a base desta resposta. Este texto é enviado ao candidato.',
  erroMinimo: 'A justificativa precisa de pelo menos 50 caracteres.',
  avisoRodape: 'Este texto será exibido ao candidato exatamente como escrito.',
  ctaPrimario: 'Registrar resposta',
  ctaEnviando: 'Enviando…',
  /** Regra 2 do docblock: NÃO é o verbo genérico, e é distinto do "Voltar" aninhado. */
  ctaSecundario: 'Fechar sem registrar',
  ctaFecharLeitura: 'Fechar',
  eyebrowResultado: 'Resultado da revisão',
  respondidaEm: 'Respondida em',
  /** Regra 1: copy VERBATIM, e o que ela NÃO diz é tão travado quanto o que diz. */
  recusa: {
    forte: 'O servidor recusou esta resposta.',
    corpo:
      'Quem registrou a decisão não pode responder à revisão dela. Encaminhe este pedido a outra pessoa do RH ou a um administrador.',
  },
  decisao: {
    aprovado: 'Aprovado',
    rejeitado: 'Rejeitado',
    em_espera: 'Em espera',
  } as Record<string, string>,
  semValor: '—',
  naoIdentificado: 'Não identificado',
} as const

/** A confirmação aninhada ramifica por veredito — título, corpo E rótulo do botão. */
const CONFIRMACAO_COPY: Record<
  Veredito,
  { titulo: string; forte: string; corpo: string; confirmar: string }
> = {
  mantida: {
    titulo: 'Registrar resposta?',
    forte: 'A decisão original será mantida.',
    corpo:
      'A resposta fica registrada na trilha de auditoria e o candidato é notificado por e-mail.',
    confirmar: 'Registrar resposta',
  },
  revertida: {
    titulo: 'Reverter a decisão?',
    forte: 'A decisão original deixará de valer.',
    corpo:
      'A resposta fica registrada na trilha de auditoria e o candidato é notificado por e-mail.',
    confirmar: 'Registrar reversão',
  },
}

/**
 * Tints do estado selecionado (42-UI-SPEC §Estado selecionado do veredito).
 * `revertida` é ÂMBAR informativo — urgência-não-alarme. Ver regra 3 do docblock.
 */
const TINT_SELECIONADO: Record<Veredito, string> = {
  mantida: 'border-white/30 bg-white/20 text-white',
  revertida: 'border-amber-400/30 bg-amber-500/15 text-amber-200',
}

const TINT_NAO_SELECIONADO = 'border-white/15 bg-white/5 text-white/70 hover:bg-white/10'

/** Micro-rótulo em caixa alta no papel de label de 14px (nunca um 5º tamanho). */
const EYEBROW = 'text-sm font-semibold uppercase tracking-wide text-white/50'

/** Data em `dd/mm/aaaa` (idioma já usado na fila e em `SolicitarRevisaoCTA`). */
function formatarData(iso: string | null): string {
  if (!iso) return DIALOGO_COPY.semValor
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return DIALOGO_COPY.semValor
  return d.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })
}

function rotularDecisao(decisao: string | null): string {
  if (!decisao) return DIALOGO_COPY.semValor
  return DIALOGO_COPY.decisao[decisao] ?? decisao
}

/** Um par rótulo/valor do bloco de contexto somente leitura. */
function Contexto({ rotulo, valor }: { rotulo: string; valor: string }) {
  return (
    <div className="space-y-1">
      <p className={EYEBROW}>{rotulo}</p>
      <p className="text-base text-white">{valor}</p>
    </div>
  )
}

export interface ResponderRevisaoDialogProps {
  /** A linha da fila em foco. `null` fecha o diálogo sem renderizar conteúdo. */
  linha: FilaRevisaoRow | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function ResponderRevisaoDialog({
  linha,
  open,
  onOpenChange,
}: ResponderRevisaoDialogProps) {
  const [veredito, setVeredito] = useState<Veredito | null>(null)
  const [justificativa, setJustificativa] = useState('')
  const responder = useResponderRevisao()

  // O diálogo é montado uma vez pela tabela e reusado para todas as linhas: sem este
  // reset, abrir a linha B mostraria o rascunho (e o erro) da linha A — e o operador
  // registraria, na candidatura errada, um texto que ele acha que já revisou.
  const candidaturaId = linha?.candidatura_id ?? null
  const { reset: resetMutacao } = responder
  useEffect(() => {
    if (open) {
      setVeredito(null)
      setJustificativa('')
      resetMutacao()
    }
  }, [open, candidaturaId, resetMutacao])

  if (!linha) return null

  const somenteLeitura = linha.revisao_respondida_em !== null

  // O contador e o gate usam o comprimento SEM espaços de borda porque o servidor usa
  // `btrim` — 60 espaços passariam num gate ingênuo e voltariam como `22023` opaco.
  const comprimento = justificativa.trim().length
  const curtaDemais = comprimento < JUSTIFICATIVA_MIN

  // A recusa do guard é o único erro que trava o formulário. Os demais deixam o operador
  // tentar de novo, porque para eles tentar de novo pode funcionar.
  const recusaDoGuard =
    responder.error instanceof RevisaoError && responder.error.code === 'GUARD_DECISOR'

  const valido = responderRevisaoSchema.safeParse({ veredito, justificativa })
  const podeEnviar = valido.success && !responder.isPending && !recusaDoGuard

  function confirmar() {
    if (!valido.success || responder.isPending || recusaDoGuard) return
    responder.mutate(
      {
        candidaturaId: linha!.candidatura_id,
        veredito: valido.data.veredito,
        justificativa: valido.data.justificativa,
      },
      { onSuccess: () => onOpenChange(false) },
    )
  }

  const confirmacao = veredito ? CONFIRMACAO_COPY[veredito] : null

  return (
    <Dialog
      open={open}
      onOpenChange={(proximo: boolean) => {
        if (!proximo) onOpenChange(false)
      }}
    >
      <DialogContent className="max-h-[85vh] overflow-y-auto border-white/25 bg-[#00109E]/95 text-white backdrop-blur-xl sm:max-w-xl">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold text-white">
            {somenteLeitura ? DIALOGO_COPY.tituloLeitura : DIALOGO_COPY.titulo}
          </DialogTitle>
          <DialogDescription className="text-base text-white/70">
            {somenteLeitura ? DIALOGO_COPY.descricaoLeitura : DIALOGO_COPY.descricao}
          </DialogDescription>
        </DialogHeader>

        {/* Bloco de contexto — SOMENTE LEITURA nos dois modos. */}
        <div className="grid gap-4 rounded-lg border border-white/15 bg-white/5 p-4 sm:grid-cols-2">
          <Contexto
            rotulo={DIALOGO_COPY.contexto.candidato}
            valor={linha.candidato_nome ?? DIALOGO_COPY.semValor}
          />
          <Contexto
            rotulo={DIALOGO_COPY.contexto.vaga}
            valor={linha.vaga_titulo ?? DIALOGO_COPY.semValor}
          />
          <Contexto
            rotulo={DIALOGO_COPY.contexto.decisao}
            valor={rotularDecisao(linha.decisao)}
          />
          {/* Invariante 4: nunca um UUID como identidade humana. */}
          <Contexto
            rotulo={DIALOGO_COPY.contexto.quemDecidiu}
            valor={linha.decidido_por_nome ?? DIALOGO_COPY.naoIdentificado}
          />
          <Contexto
            rotulo={DIALOGO_COPY.contexto.pedidoEm}
            valor={formatarData(linha.revisao_solicitada_em)}
          />
        </div>

        {somenteLeitura ? (
          // ── MODO SOMENTE-LEITURA ("Ver resposta") ─────────────────────────────
          <div className="space-y-2 rounded-lg border border-white/15 bg-white/5 p-4">
            <p className={EYEBROW}>{DIALOGO_COPY.eyebrowResultado}</p>
            <VereditoBadge veredito={linha.revisao_veredito} />
            <p className="text-sm font-semibold text-white/50">
              {DIALOGO_COPY.respondidaEm} {formatarData(linha.revisao_respondida_em)}
            </p>
            {/* Nunca truncada: truncar a justificativa da revisão esvaziaria o Art. 20. */}
            <p className="text-base leading-relaxed whitespace-pre-wrap text-white/90">
              {linha.revisao_resultado ?? DIALOGO_COPY.semValor}
            </p>
          </div>
        ) : (
          <>
            {/* ── VEREDITO — cartões-rótulo, molde de RegistrarDecisaoForm:105-131 ── */}
            <div className="space-y-2">
              <p className="text-sm font-semibold text-white">
                {DIALOGO_COPY.rotuloVeredito}{' '}
                <span className="font-normal text-white/60">
                  {DIALOGO_COPY.rotuloVereditoObrigatorio}
                </span>
              </p>
              <RadioGroup
                value={veredito ?? ''}
                onValueChange={(v: string) => setVeredito(v as Veredito)}
                aria-label={DIALOGO_COPY.rotuloVeredito}
                className="grid gap-3 sm:grid-cols-2"
              >
                {VEREDITO_OPTIONS.map((opt) => {
                  const selecionado = veredito === opt.value
                  return (
                    <Label
                      key={opt.value}
                      htmlFor={`veredito-${opt.value}`}
                      className={cn(
                        'flex min-h-[44px] cursor-pointer items-start gap-2 rounded-lg border px-4 py-3 transition-colors',
                        selecionado ? TINT_SELECIONADO[opt.value] : TINT_NAO_SELECIONADO,
                      )}
                    >
                      <RadioGroupItem
                        value={opt.value}
                        id={`veredito-${opt.value}`}
                        className="mt-1 border-current"
                      />
                      <span className="flex flex-col gap-1">
                        <span className="text-sm font-semibold">{opt.label}</span>
                        <span className="text-sm font-normal opacity-80">{opt.ajuda}</span>
                      </span>
                    </Label>
                  )
                })}
              </RadioGroup>
            </div>

            {/* ── JUSTIFICATIVA + contador ────────────────────────────────────── */}
            <div className="space-y-2">
              <div className="flex items-center justify-between gap-2">
                <label
                  htmlFor="revisao-justificativa"
                  className="text-sm font-semibold text-white"
                >
                  {DIALOGO_COPY.rotuloJustificativa}{' '}
                  <span className="font-normal text-white/60">
                    {DIALOGO_COPY.rotuloJustificativaAjuda}
                  </span>
                </label>
                <span
                  className={cn(
                    'text-sm font-semibold',
                    curtaDemais ? 'text-white/50' : 'text-white/80',
                  )}
                >
                  {comprimento} / {JUSTIFICATIVA_MIN} mín.
                </span>
              </div>
              <Textarea
                id="revisao-justificativa"
                value={justificativa}
                onChange={(e) => setJustificativa(e.target.value)}
                placeholder={DIALOGO_COPY.placeholder}
                rows={5}
                // Guarda de INTERFACE (= JUSTIFICATIVA_MAX). O servidor exige só o
                // mínimo; o teto existe porque uma justificativa é lida por uma pessoa
                // num e-mail, e um despejo de 40 mil caracteres não é transparência.
                maxLength={2000}
                className="border-white/15 bg-white/5 text-white placeholder:text-white/40"
              />
              {veredito !== null && curtaDemais ? (
                <p className="text-sm font-semibold text-red-300">
                  {DIALOGO_COPY.erroMinimo}
                </p>
              ) : null}
              <p className="text-sm text-white/60">{DIALOGO_COPY.avisoRodape}</p>
            </div>

            {/* ── RECUSA DO SERVIDOR — estado TERMINAL. Ver regra 1 do docblock. ──
                Nenhum botão de tentar novamente vive aqui, e nenhuma frase promete
                liberação, exceção ou sobreposição: esse caminho não existe. */}
            {recusaDoGuard ? (
              <div
                role="alert"
                className="rounded-lg border border-red-400/40 bg-red-500/15 p-4 text-base text-red-100"
              >
                <span className="font-semibold text-red-200">
                  {DIALOGO_COPY.recusa.forte}
                </span>{' '}
                {DIALOGO_COPY.recusa.corpo}
              </div>
            ) : null}
          </>
        )}

        <DialogFooter>
          {somenteLeitura ? (
            <GlassButton
              variant="white"
              hover
              onClick={() => onOpenChange(false)}
              className="min-h-[44px] text-white"
            >
              {DIALOGO_COPY.ctaFecharLeitura}
            </GlassButton>
          ) : (
            <>
              {/* Recuo LARGO: abandona a resposta inteira. Distinto do "Voltar". */}
              <button
                type="button"
                onClick={() => onOpenChange(false)}
                className="inline-flex min-h-[44px] items-center justify-center rounded-lg border border-white/30 bg-white/10 px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-white/20"
              >
                {DIALOGO_COPY.ctaSecundario}
              </button>

              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <GlassButton
                    variant="white"
                    hover
                    disabled={!podeEnviar}
                    className="min-h-[44px] text-white"
                  >
                    {responder.isPending ? (
                      <span className="flex items-center gap-2">
                        <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                        {DIALOGO_COPY.ctaEnviando}
                      </span>
                    ) : (
                      DIALOGO_COPY.ctaPrimario
                    )}
                  </GlassButton>
                </AlertDialogTrigger>
                {confirmacao ? (
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>{confirmacao.titulo}</AlertDialogTitle>
                      <AlertDialogDescription>
                        <span className="font-semibold">{confirmacao.forte}</span>{' '}
                        {confirmacao.corpo}
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      {/* Recuo CURTO: um passo atrás, devolve ao formulário preenchido. */}
                      <AlertDialogCancel className="min-h-[44px]">
                        Voltar
                      </AlertDialogCancel>
                      <AlertDialogAction className="min-h-[44px]" onClick={confirmar}>
                        {confirmacao.confirmar}
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                ) : null}
              </AlertDialog>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
