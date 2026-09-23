/**
 * ProvenienciaIABadge — quem gerou este resultado de IA (D-27b / JORN-28).
 *
 * Phase 49 / plano 49-13. Molde: `SugestaoIABadge.tsx` (docblock com a regra, cópia
 * canônica exportada como constante, `Badge` com classes fixas, variantes
 * `compact`/`full`, export nomeado).
 *
 * ─── O QUE ESTAVA ERRADO (medido em PROD, só leitura) ─────────────────────────────────
 *
 * Em 2026-09-20 um comparativo de 6 candidatos estourou o `max_tokens` do Sonnet, o parse
 * falhou, e o ranking que o RH leu na tela **saiu do `gpt-4o-mini`** — registrado como
 * sucesso, sem nenhuma marca na interface. Um resultado de fallback é utilizável e, ao
 * mesmo tempo, não é o que foi pedido: o RH decidiu sobre pessoas achando que lia o modelo
 * configurado. O plano 49-08 passou a GRAVAR e DEVOLVER a proveniência; este componente é o
 * que a torna visível — na tela e, pela mesma cópia, no PDF que circula fora do sistema.
 *
 * ─── A REGRA, E ONDE ELA MORA ────────────────────────────────────────────────────────
 *
 * ⚠ **«É fallback» ⇔ `provedor_ia === 'openai'`.** Isso vale porque o primário do `callAi`
 * (`_shared/ai-client.ts`) é SEMPRE Anthropic e o único destino de contingência é a OpenAI —
 * o plano P1 (troca de primário) está fora do M8. **Se a P1 trocar o primário, esta regra
 * muda AQUI**, e em nenhum outro lugar: é por isso que o discriminante é uma linha só,
 * nomeada, neste arquivo, em vez de um `if` repetido em cada tela.
 *
 * ⚠ **`modelo_ia === null` ⇒ «modelo não registrado», NUNCA silêncio (D-30).** As linhas
 * anteriores à Phase 49 não têm o modelo gravado, e a causa real não é recuperável do log.
 * Dizer «não sei» é a única afirmação verdadeira disponível; omitir o selo faria a tela
 * parecer idêntica à de um resultado cuja proveniência está confirmada.
 *
 * ─── QUEM CONSOME ────────────────────────────────────────────────────────────────────
 *
 * Este é o selo ÚNICO de proveniência do produto. Consumidores: o comparativo da vaga
 * (`ComparativoScreen`, este plano) e o PDF (`exportComparativo`, este plano, pela cópia
 * exportada); a decisão final (49-22); a redação, o guia, a análise da triagem e a análise
 * de entrevista (49-15 / 49-16). Um segundo componente com a mesma função divergiria em
 * silêncio — que é exatamente o defeito que este arquivo remove.
 *
 * @module features/triagem/components/ProvenienciaIABadge
 * @see supabase/functions/_shared/ai-error-codes.ts (CAUSA_FALLBACK_ROTULO — a causa legível)
 * @see .planning/phases/49-consertos-da-jornada-bloco-2/49-08-SUMMARY.md (a EF que devolve estes campos)
 */

import { CircuitBoard, Cpu } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/components/ui/utils'
// ⚠ Caminho RELATIVO para `_shared`, de propósito: a tabela de causas legíveis tem UMA
// fonte, e é a mesma que a Edge Function escreve. O módulo tem contrato de ZERO IMPORTS
// justamente para poder ser importado daqui sem arrastar um especificador Deno para o
// bundle do Vite. Precedentes vivos: `exportacaoService.ts:61` (`EXPORT_ALLOWLIST`) e
// `AutorizacoesStep.tsx:50` (`consent-text.json`). Duas tabelas de causa divergiriam em
// silêncio, e o texto que o RH lê é o lado que ninguém iria conferir.
import { CAUSA_FALLBACK_ROTULO } from '../../../../supabase/functions/_shared/ai-error-codes'

/**
 * Cópia canônica da proveniência — a MESMA na tela e no PDF.
 *
 * `{modelo}` é o único ponto de substituição. Não alterar sem alterar os testes que a
 * pinam: é texto que o RH lê para decidir se confia no resultado.
 */
export const PROVENIENCIA_IA_COPY = {
  /** Resultado do modelo configurado. */
  primario: 'Gerado pelo modelo {modelo}',
  /** Resultado do modelo de contingência — o aviso que faltava até este plano. */
  contingencia: 'Gerado pelo modelo de contingência {modelo}',
  /** D-30: `modelo_ia` NULL. Ocupa o lugar de `{modelo}`. */
  modeloDesconhecido: 'modelo não registrado',
  /** Introduz a causa legível do fallback. */
  causaPrefixo: 'motivo: ',
} as const

/** Os três campos de proveniência que a EF devolve (plano 49-08). */
export interface ProvenienciaIABadgeProps {
  /** `'anthropic'` | `'openai'` | `null`. `'openai'` É o discriminante de fallback. */
  provedorIa: string | null | undefined
  /** O modelo que DE FATO respondeu. `null` ⇒ «modelo não registrado» (D-30). */
  modeloIa: string | null | undefined
  /** Causa crua do fallback (`anthropic_max_tokens`, …) ou `null`. */
  fallbackCause?: string | null
  /** `full` (default) = texto completo + causa; `compact` = só o modelo. */
  variant?: 'full' | 'compact'
  className?: string
}

/**
 * `true` quando o resultado veio do modelo de CONTINGÊNCIA.
 *
 * Exportada porque o PDF (`exportComparativo`) decide a mesma coisa e não pode decidir
 * diferente. Ver a advertência sobre a P1 no docblock do módulo.
 */
export function ehResultadoDeContingencia(provedorIa: string | null | undefined): boolean {
  return provedorIa === 'openai'
}

/** Rótulo pt-BR de uma causa de fallback, degradando para o próprio código se desconhecida. */
function rotuloDaCausaFallback(causa: string | null | undefined): string | null {
  if (!causa) return null
  return (CAUSA_FALLBACK_ROTULO as Record<string, string>)[causa] ?? causa
}

/**
 * Monta a frase de proveniência — a MESMA usada pela tela e pelo PDF.
 *
 * Nunca devolve string vazia: sem modelo, diz «modelo não registrado» (D-30). Um retorno
 * vazio aqui apagaria o selo inteiro, e o resultado sem proveniência voltaria a parecer um
 * resultado com proveniência confirmada.
 *
 * @param opts proveniência vinda da EF; `comCausa` = anexar «motivo: …» (default `true`).
 */
export function textoProveniencia(opts: {
  provedorIa: string | null | undefined
  modeloIa: string | null | undefined
  fallbackCause?: string | null
  comCausa?: boolean
}): string {
  const { provedorIa, modeloIa, fallbackCause, comCausa = true } = opts
  const modelo = modeloIa ?? PROVENIENCIA_IA_COPY.modeloDesconhecido
  const contingencia = ehResultadoDeContingencia(provedorIa)
  const base = (
    contingencia ? PROVENIENCIA_IA_COPY.contingencia : PROVENIENCIA_IA_COPY.primario
  ).replace('{modelo}', modelo)

  // A causa só acompanha o aviso de contingência: uma causa de falha do primário ao lado
  // de «gerado pelo modelo <primário>» descreveria uma falha que não houve.
  const causa = contingencia && comCausa ? rotuloDaCausaFallback(fallbackCause) : null
  return causa ? `${base} (${PROVENIENCIA_IA_COPY.causaPrefixo}${causa})` : base
}

/**
 * Selo de proveniência do resultado de IA.
 *
 * Âmbar quando o resultado veio do modelo de contingência; neutro quando veio do
 * configurado. A cor NÃO é de erro: o resultado é utilizável — o que ela sinaliza é que
 * não é o modelo que se esperava.
 */
export function ProvenienciaIABadge({
  provedorIa,
  modeloIa,
  fallbackCause,
  variant = 'full',
  className,
}: ProvenienciaIABadgeProps) {
  const contingencia = ehResultadoDeContingencia(provedorIa)
  const texto = textoProveniencia({
    provedorIa,
    modeloIa,
    fallbackCause,
    comCausa: variant === 'full',
  })
  const Icone = contingencia ? CircuitBoard : Cpu

  return (
    <Badge
      data-testid="proveniencia-ia-badge"
      data-contingencia={contingencia ? 'true' : 'false'}
      className={cn(
        'text-xs font-semibold leading-[1.4] gap-1',
        contingencia
          ? 'border-amber-400/50 bg-amber-400/15 text-amber-100'
          : 'border-white/20 bg-white/10 text-white/80',
        className,
      )}
    >
      <Icone
        className={cn('h-3 w-3', contingencia ? 'text-amber-300' : 'text-white/60')}
        aria-hidden="true"
      />
      {texto}
    </Badge>
  )
}
