/**
 * /admin/retencao — **Retenção de dados** (RETEN-01/02/04).
 *
 * ── O QUE ESTA PÁGINA É, E O QUE ELA NÃO É ───────────────────────────────────────
 * Ela é **configuração**. Nada nela apaga dado de candidato, e hoje **nenhuma rotina deste
 * sistema apaga dados de candidato automaticamente** — a purga nasce na Phase 46. A página
 * inteira é a declaração, em interface, de que esta fase configura e não destrói: nenhum
 * botão carrega verbo destrutivo, a prévia fica longe de qualquer gatilho, e o banner de
 * escopo diz isso em texto para quem não vai ler o código.
 *
 * ── OS DOIS BANNERS SÃO SEMPRE VISÍVEIS E NUNCA COLAPSÁVEIS ──────────────────────
 * Precedente direto do banner de limitação do `BiasAuditPage` (T-15-18). O do seed é onde
 * a **BD-1** é dita ao operador: os 24 meses não são recomendação técnica nem exigência
 * estatutária — são **o teto que o candidato já leu e aceitou na copy do cadastro**. Quem
 * lê essa frase é quem vai encurtar um prazo, e encurtá-lo é decisão que precisa de
 * parecer jurídico trabalhista. Um aviso atrás de "ver mais" é um aviso que ninguém lê.
 *
 * ── A PALAVRA `automaticamente` É OBRIGATÓRIA AQUI ───────────────────────────────
 * O portão de copy do 43-02 bane o futuro-de-máquina sobre exclusão **apenas na superfície
 * do candidato** (allowlist explícita: `cadastro/`, `privacidade/`, `explicacao/` e os
 * templates de e-mail). `src/features/admin/` está deliberadamente FORA dessa allowlist, e
 * o teste `copyPortoesLgpd.test.ts` tem uma asserção dedicada a isso. Aqui a palavra é
 * honesta: ela NEGA a exclusão automática em vez de prometê-la. Alargar aquele portão para
 * `src/` inteiro reprovaria a copy que a 43-UI-SPEC manda escrever — e um teste que reprova
 * o comportamento correto treina quem executa a desligá-lo.
 *
 * ── HIERARQUIA VISUAL (43-UI-SPEC §Âncora visual primária) ───────────────────────
 * A TABELA é a âncora. Os banners ficam acima dela, a prévia abaixo — a prévia é
 * consequência do que a tabela diz. H1 e subtítulo **não ganham card próprio**.
 *
 * @module features/admin/retencao/components/RetencaoPage
 * @see src/features/admin/bias-audit/components/BiasAuditPage.tsx (o molde ESTRUTURAL — copiar a estrutura, não o conteúdo)
 * @see .planning/phases/43-consentimentos-honestos-pol-tica-de-reten-o/43-UI-SPEC.md (§`/admin/retencao`)
 */
import { Info } from 'lucide-react'
import { RHLayout } from '@/components/RHLayout'
import { GlassCard } from '@/components/ui/glass'
import { MatrizRetencaoTable } from './MatrizRetencaoTable'

/** Copy verbatim da 43-UI-SPEC (§`/admin/retencao`, linhas 523-541). */
export const RETENCAO_PAGINA_COPY = {
  h1: 'Retenção de dados',
  subtitulo:
    'Por quanto tempo os dados de uma candidatura ficam guardados, por estado. Alterável aqui, sem deploy.',
  tituloTabela: 'Janela por estado da candidatura',
  bannerSeed: {
    forte:
      'Todos os estados nascem com 2 anos porque 2 anos é o teto que o candidato já leu e aceitou no cadastro',
    resto:
      ' — não é uma recomendação técnica. Encurtar o prazo de um estado é decisão que precisa de parecer jurídico trabalhista.',
  },
  bannerEscopo: {
    inicio: 'Esta matriz é ',
    forte: 'configuração',
    resto:
      '. Nada nesta página apaga dados, e hoje nenhuma rotina deste sistema apaga dados de candidato automaticamente.',
  },
} as const

export function RetencaoPage() {
  return (
    <RHLayout>
      <div className="space-y-8">
        {/* H1 + subtítulo SEM card próprio (43-UI-SPEC §Âncora visual primária). */}
        <header className="space-y-1">
          <h1 className="text-3xl font-semibold text-white md:text-4xl">
            {RETENCAO_PAGINA_COPY.h1}
          </h1>
          <p className="text-base text-white/70">{RETENCAO_PAGINA_COPY.subtitulo}</p>
        </header>

        <div className="space-y-4">
          {/* Banner do seed (BD-1) — ÂMBAR, sempre visível, nunca colapsável. */}
          <div
            data-testid="banner-seed"
            className="flex items-start gap-3 rounded-xl border border-amber-400/30 bg-amber-500/10 p-4 text-sm text-amber-100"
          >
            <Info className="mt-0.5 h-5 w-5 shrink-0 text-amber-300" aria-hidden="true" />
            <p className="leading-relaxed">
              <span className="font-semibold">
                {RETENCAO_PAGINA_COPY.bannerSeed.forte}
              </span>
              {RETENCAO_PAGINA_COPY.bannerSeed.resto}
            </p>
          </div>

          {/* Banner de escopo — NEUTRO, sempre visível. O que a página NÃO faz. */}
          <div
            data-testid="banner-escopo"
            className="flex items-start gap-3 rounded-lg border border-white/15 bg-white/5 p-4 text-sm text-white/80"
          >
            <Info className="mt-0.5 h-5 w-5 shrink-0 text-white/60" aria-hidden="true" />
            <p className="leading-relaxed">
              {RETENCAO_PAGINA_COPY.bannerEscopo.inicio}
              <span className="font-semibold text-white">
                {RETENCAO_PAGINA_COPY.bannerEscopo.forte}
              </span>
              {RETENCAO_PAGINA_COPY.bannerEscopo.resto}
            </p>
          </div>
        </div>

        <GlassCard variant="dark" blur="lg" className="space-y-4">
          <h2 className="text-xl font-semibold text-white">
            {RETENCAO_PAGINA_COPY.tituloTabela}
          </h2>
          <MatrizRetencaoTable />
        </GlassCard>
      </div>
    </RHLayout>
  )
}
