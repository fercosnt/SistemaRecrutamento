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
 * ── ESTA FATIA TEM TRÊS DOS CINCO ESTADOS, E A AUSÊNCIA NÃO É ESQUECIMENTO ───
 * Disponível, em voo e erro. Sucesso persistente e cooldown são o 44-06 — e a
 * ausência do cooldown aqui **não** viola a Invariante 3(iii) da 44-UI-SPEC ("um
 * botão desabilitado por cooldown nunca aparece sem o motivo ao lado"), porque
 * nesta fatia não existe caminho nenhum que desabilite o botão por cooldown: o
 * único `disabled` é o de "em voo", e ele vem com a copy do próprio estado.
 *
 * A copy de "Você recebe dois arquivos" também é 44-06, **junto com o `.html` que a
 * torna verdadeira**. Ver o docblock de `exportacaoService`.
 *
 * @module features/privacidade/components/PedirCopiaBloco
 * @see src/features/privacidade/components/GuardaCurriculoBloco.tsx (o molde do container neutro)
 * @see .planning/phases/44-exporta-o-acesso/44-UI-SPEC.md (§Seção 3 · §O CTA e seus cinco estados)
 */
import { Loader2 } from 'lucide-react'
import { GlassButton } from '@/components/ui/glass'
import { useExportarMeusDados } from '../hooks/useExportarMeusDados'
import { COPY_PEDIR_COPIA } from '../services/exportacaoService'

export function PedirCopiaBloco() {
  const exportar = useExportarMeusDados()
  const emVoo = exportar.isPending

  return (
    <div
      data-bloco="pedir-copia"
      className="space-y-2 rounded-lg border border-white/15 bg-white/5 p-4"
    >
      {/* Prosa de escopo: leitura de CARGA, nunca legenda. É o texto que impede o
          titular de acreditar que recebeu mais do que recebeu — encolhê-lo para
          `text-sm` seria encolher a declaração. */}
      <p className="text-base leading-relaxed text-white/90">{COPY_PEDIR_COPIA.abertura}</p>

      <p className="text-sm font-semibold text-white">{COPY_PEDIR_COPIA.oQueEstaTitulo}</p>
      <p className="text-base leading-relaxed text-white/90">{COPY_PEDIR_COPIA.oQueEsta}</p>

      <p className="text-sm font-semibold text-white">{COPY_PEDIR_COPIA.oQueNaoEstaTitulo}</p>
      <p className="text-base leading-relaxed text-white/90">{COPY_PEDIR_COPIA.oQueNaoEsta}</p>

      <div className="pt-2">
        <GlassButton
          variant="white"
          hover
          disabled={emVoo}
          aria-busy={emVoo}
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
      </div>

      {/* Alerta INLINE e persistente, nunca toast: este é o caso em que a pessoa
          precisa saber que o arquivo NÃO veio, e um toast some em ~4 segundos.
          Idioma verbatim de `ConsentimentoSwitchRow`. */}
      {exportar.isError && (
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
