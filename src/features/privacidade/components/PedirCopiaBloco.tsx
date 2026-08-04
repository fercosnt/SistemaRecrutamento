/**
 * PedirCopiaBloco — a seção 3 de `/candidato/privacidade` (EXPORT-01 / EXPORT-06).
 *
 * O botão daqui **é** o pedido, não uma confirmação sobre ele: sem controle não há
 * forma de expressar a intenção, e um direito cujo exercício depende de um controle
 * não pode ser exercido sem ele. É por isso que a 44-UI-SPEC §Emenda registra o CTA
 * primário nesta página sem violar a Invariante 4 da 43 ("zero fricção para
 * revogar") — aquela regra proíbe um controle entre a pessoa e uma intenção JÁ
 * expressa; aqui a relação é inversa.
 *
 * ── AS TRÊS RESTRIÇÕES QUE PROTEGEM A ÂNCORA VISUAL DA PÁGINA ────────────────
 * A âncora de `/candidato/privacidade` continua sendo a lista de autorizações
 * (declaração da 43-UI-SPEC, preservada). O executor não pode relaxar:
 *   1. o bloco é a TERCEIRA seção, abaixo das duas existentes;
 *   2. o CTA é glass-branco (`bg-white/20` → `bg-white/30`), **nunca accent**,
 *      **nunca full-bleed** — accent nesta fase tem UM uso, e é o item ativo da
 *      sidebar do RH;
 *   3. o molde do container é o mesmo dos blocos irmãos, verbatim
 *      (`rounded-lg border border-white/15 bg-white/5 p-4`). Um padding maior seria
 *      a forma silenciosa de roubar a âncora.
 *
 * ── OS CINCO ESTADOS, E O QUE CADA UM PROTEGE ────────────────────────────────
 *  1. **Disponível** — o CTA glass-branco, `min-h-[44px]`.
 *  2. **Em voo** — desabilitado, `aria-busy`, com o motivo ao lado (ver abaixo).
 *  3. **Sucesso, PERSISTENTE** — nomeia os DOIS arquivos e diz onde procurá-los.
 *     Nunca um toast: o sucesso aponta dois nomes que a pessoa vai caçar na pasta
 *     de downloads, e um toast some antes disso. `sonner` está instalado e **não é
 *     usado aqui**.
 *  4. **Cooldown** — desabilitado **com o motivo e a hora de liberação sempre
 *     visíveis ao lado**, ligados por `aria-describedby`.
 *  5. **Erro** — alerta inline `role="alert"`, persistente, abaixo do botão.
 *
 * ── O CLIENTE NUNCA DECIDE SE O PEDIDO É PERMITIDO ───────────────────────────
 * `useUltimoPedidoDados` **informa** a apresentação; o servidor **decide**. Se a
 * leitura falhar, o botão renderiza e a Edge Function recusa — precedente vivo do
 * 42-10, onde `responderRevisao` chama a RPC mesmo quando o guard vai recusar,
 * porque atalhar no cliente move a barreira para o cliente e qualquer DevTools a
 * desliga. É também por isso que a recusa 429 do servidor renderiza a **mesma**
 * `COPY_COOLDOWN` do estado local: um segundo texto para o mesmo limite viraria
 * duas verdades sobre o mesmo fato.
 *
 * ── UM `disabled` SEM MOTIVO É INDISTINGUÍVEL DE TELA QUEBRADA ───────────────
 * A Invariante 3(iii) fala do cooldown, mas a propriedade é estrutural: **todo**
 * botão desabilitado deste bloco carrega um irmão com o motivo em texto visível —
 * inclusive o "em voo". O teste (z3) percorre `button[disabled]` e exige o irmão,
 * de modo que um `disabled` acrescentado no futuro sem motivo reprove.
 *
 * ── PROIBIDO NESTA REGIÃO (44-UI-SPEC, não preferência) ──────────────────────
 * Diálogo de confirmação, pedido de motivo, "tem certeza?", contagem regressiva
 * animada, barra de progresso falsa, qualquer atraso artificial entre o clique e o
 * download — e **prometer** que o limite de 24 h vai mudar, que é roadmap e não
 * compromisso com o titular.
 *
 * @module features/privacidade/components/PedirCopiaBloco
 * @see src/features/privacidade/components/GuardaCurriculoBloco.tsx (o molde do container neutro)
 * @see .planning/phases/44-exporta-o-acesso/44-UI-SPEC.md (§Seção 3 · §O CTA e seus cinco estados)
 */
import { Loader2 } from 'lucide-react'
import { Glass, GlassButton } from '@/components/ui/glass'
import { useCandidato } from '@/store/authStore'
import { useExportarMeusDados } from '../hooks/useExportarMeusDados'
import { useUltimoPedidoDados } from '../hooks/useUltimoPedidoDados'
import {
  COPY_PEDIR_COPIA,
  COPY_COOLDOWN,
  ExportacaoError,
  calcularLiberacaoCooldown,
  nomesArquivosExport,
} from '../services/exportacaoService'

/** O `id` que liga o botão desabilitado ao motivo — `aria-describedby`, não `title`. */
const ID_MOTIVO = 'pedir-copia-motivo'

export function PedirCopiaBloco() {
  const candidato = useCandidato()
  const ultimo = useUltimoPedidoDados(candidato?.id)
  const exportar = useExportarMeusDados()

  const emVoo = exportar.isPending
  const erro = exportar.error instanceof ExportacaoError ? exportar.error : null
  const recusaDoServidor = erro?.code === 'COOLDOWN'

  // O estado local é PALPITE informado; a recusa do servidor é FATO. Quando as duas
  // existem, vence a do servidor — é ela que acabou de acontecer.
  const liberadoLocal = calcularLiberacaoCooldown(ultimo.data?.solicitado_em)
  const emCooldown = recusaDoServidor || liberadoLocal !== null
  const liberadoEm = recusaDoServidor ? (erro?.liberadoEm ?? null) : liberadoLocal

  const desabilitado = emVoo || emCooldown
  // UMA string por causa, de UMA constante. Ver §Fonte única da copy de cooldown.
  const motivo = emCooldown
    ? `${COPY_COOLDOWN.titulo} ${COPY_COOLDOWN.corpo(liberadoEm)}`
    : emVoo
      ? COPY_PEDIR_COPIA.motivoEmVoo
      : null

  // Erro genérico: tudo o que NÃO é a recusa por cooldown, que tem tratamento
  // próprio. Mostrar os dois seria dizer duas coisas sobre um fato só.
  const mostrarErro = exportar.isError && !recusaDoServidor
  const nomes = exportar.data ? nomesArquivosExport(exportar.data) : null

  return (
    <div
      data-bloco="pedir-copia"
      className="space-y-2 rounded-lg border border-white/15 bg-white/5 p-4"
    >
      {/* Prosa de escopo: leitura de CARGA, nunca legenda. É o texto que impede o
          titular de acreditar que recebeu mais do que recebeu — encolhê-lo para
          `text-sm` seria encolher a declaração. */}
      <p className="text-base leading-relaxed text-white/90">{COPY_PEDIR_COPIA.abertura}</p>

      {/* Esta linha só é VERDADEIRA a partir do 44-06: antes dele existia um
          arquivo só, e dizer "dois" teria sido a tela afirmando ao titular que
          recebeu mais do que recebeu. */}
      <p className="text-sm font-semibold text-white">{COPY_PEDIR_COPIA.comoChegaTitulo}</p>
      <p className="text-base leading-relaxed text-white/90">{COPY_PEDIR_COPIA.comoChega}</p>

      <p className="text-sm font-semibold text-white">{COPY_PEDIR_COPIA.oQueEstaTitulo}</p>
      <p className="text-base leading-relaxed text-white/90">{COPY_PEDIR_COPIA.oQueEsta}</p>

      <p className="text-sm font-semibold text-white">{COPY_PEDIR_COPIA.oQueNaoEstaTitulo}</p>
      <p className="text-base leading-relaxed text-white/90">{COPY_PEDIR_COPIA.oQueNaoEsta}</p>

      {ultimo.isLoading ? (
        /* Enquanto o estado do cooldown está em voo, a ALTURA é preservada pelo
           mesmo `Glass` pulsante de uma linha que a seção 2 já usa. O CTA não
           aparece meio-renderizado — um botão que pisca entre habilitado e
           desabilitado convida ao clique que o servidor vai recusar. */
        <div className="pt-2">
          <Glass variant="white" blur="md" className="h-16 animate-pulse p-6">
            <span />
          </Glass>
        </div>
      ) : (
        <div className="space-y-2 pt-2">
          <GlassButton
            variant="white"
            hover
            disabled={desabilitado}
            aria-busy={emVoo}
            aria-describedby={motivo ? ID_MOTIVO : undefined}
            onClick={() => exportar.mutate()}
            className="min-h-[44px] text-white"
          >
            {emVoo ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                {COPY_PEDIR_COPIA.ctaEmVoo}
              </>
            ) : (
              COPY_PEDIR_COPIA.cta
            )}
          </GlassButton>

          {/* IRMÃO do botão, e é por isso que ele está aqui dentro: o backstop
              estrutural procura o motivo entre os irmãos do `button[disabled]`.
              Texto VISÍVEL — um motivo que só existe em hover é inalcançável em
              toque e em leitor de tela, e este é o único estado em que a pessoa é
              impedida de exercer um direito. `text-sm font-semibold` porque é
              ESTADO, não prosa. */}
          {motivo && (
            <p
              id={ID_MOTIVO}
              data-motivo
              className="text-sm font-semibold leading-relaxed text-white"
            >
              {motivo}
            </p>
          )}
        </div>
      )}

      {/* Sucesso PERSISTENTE: nomeia os dois arquivos e diz onde procurá-los.
          Os nomes vêm do MESMO instante do servidor que batizou os downloads. */}
      {exportar.isSuccess && nomes && (
        <div className="mt-3 space-y-1 rounded-lg border border-white/15 bg-white/5 p-4">
          <p className="text-sm font-semibold text-white">{COPY_PEDIR_COPIA.sucessoTitulo}</p>
          <p className="text-base leading-relaxed text-white/90">
            {COPY_PEDIR_COPIA.sucessoCorpo(nomes.html, nomes.json)}
          </p>
        </div>
      )}

      {/* Alerta INLINE e persistente, nunca toast: este é o caso em que a pessoa
          precisa saber que o arquivo NÃO veio, e um toast some em ~4 segundos.
          Idioma verbatim de `ConsentimentoSwitchRow`. */}
      {mostrarErro && (
        <div
          role="alert"
          className="mt-3 space-y-1 rounded-lg border border-destructive/40 bg-destructive/10 p-3"
        >
          <p className="text-sm font-semibold text-white">{COPY_PEDIR_COPIA.erroTitulo}</p>
          <p className="text-base leading-relaxed text-white/90">{COPY_PEDIR_COPIA.erroCorpo}</p>
        </div>
      )}
    </div>
  )
}
