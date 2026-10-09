/**
 * Phase 15 / Plan 15-04 (DECISAO-04) — the candidate LGPD Art. 20 explanation page.
 *
 * A READ-MOSTLY variant of the `ProvaCognitivaScreen` glass-over-gradient shell
 * (BackgroundImage gradient + overlay 15% + max-w-2xl + py-20). It is a TRANSPARENCY
 * surface, NOT a numeric dump: the candidate sees a high-level result line + a
 * respectful NON-CLINICAL reason (derived from the RH justificativa, never raw) + the
 * LGPD Art. 20 revision-right block + the `SolicitarRevisaoCTA`. It NEVER renders a
 * numeric result, a quantile, or a psychometric verdict (RNF-07a / LGPD-04).
 *
 * Reachability (Pitfall 6 / T-15-14): the page is reachable only after a
 * `decisao_final` with `decisao='rejeitado'` exists (own-row RLS + the service
 * reachability gate). Any other state renders "Esta página não está disponível".
 * Visiting the page stamps `explicacao_solicitada_em` (the `useExplicacao` one-shot
 * visit stamp — transparency evidence, T-15-15).
 *
 * Route wiring (`/candidato/explicacao/:id`, `RoleGuard role="candidato"`) is deferred
 * to Plan 15-06.
 *
 * Phase 42 / Plan 42-11 (REVISAO-04) closes the Art. 20 round-trip on the candidate's
 * side: the block that used to render `revisao_resultado` as plain text became
 * `ResultadoRevisaoBloco` (eyebrow + verdict line + date + untruncated reasoning). See
 * that component's docblock for the four rules it encodes — they are the load-bearing
 * part, not the markup.
 *
 * @see src/features/avaliacao-cognitiva/components/ProvaCognitivaScreen.tsx (the ScreenShell + state machine this clones)
 * @see src/features/explicacao/hooks/useExplicacao.ts (useExplicacao — query + visit stamp)
 * @see src/features/explicacao/components/SolicitarRevisaoCTA.tsx (the revision CTA)
 * @see .planning/phases/15-decis-o-final-audit-vel-lgpd-art-20/15-UI-SPEC.md (§Candidate LGPD Art. 20 — verbatim copy)
 * @module features/explicacao/components/ExplicacaoCandidatoPage
 */
import { useNavigate, useParams } from 'react-router-dom'
import { BackgroundImage } from '@/components/BackgroundImage'
import { Glass, GlassButton, GlassPanel } from '@/components/ui/glass'
import { formatDataLimiteReabertura } from '@/lib/datetime/formatDataHoraSP'
import { useExplicacao, type RevisaoVeredito } from '../hooks/useExplicacao'
import { SolicitarRevisaoCTA } from './SolicitarRevisaoCTA'

/** Verbatim pt-BR copy from 15-UI-SPEC §Candidate LGPD Art. 20 explanation page. */
const COPY = {
  heading: 'Sobre a sua candidatura',
  resultLine:
    'Após avaliarmos seu processo, decidimos não seguir com a sua candidatura nesta vaga.',
  /**
   * §7.18 — a linha de resultado do caminho AUTOMÁTICO. «Avaliamos seu processo» seria
   * falso aqui: não houve processo nem avaliação, e é justamente isso que o Art. 20 dá
   * ao titular o direito de saber. A frase diz que a decisão foi automática antes de
   * dizer qualquer outra coisa.
   */
  resultLineAutomatica:
    'Sua candidatura foi encerrada automaticamente na inscrição, sem avaliação de uma pessoa e sem passar pelas etapas do processo.',
  /**
   * JORN-22 / D-20 — a linha de resultado da rejeição HUMANA fora da decisão final. Nem a
   * do caminho automático (afirma «sem avaliação de uma pessoa», e aqui uma pessoa
   * decidiu) nem a da decisão final («Após avaliarmos seu processo» — sugere um processo
   * avaliado por inteiro). Diz quem decidiu, e não diz por quê.
   */
  resultLineHumanaTriagem:
    'Após a análise da sua candidatura por uma pessoa da nossa equipe, decidimos não seguir com ela nesta vaga.',
  reasonEyebrow: 'Por que esta decisão',
  // 51-12 (JORN-42 · D-01): os dois blocos sem-revisão (`semRevisaoBody` do knockout e
  // `semRevisaoBodyHumanaTriagem` da rejeição pelo RH) SAÍRAM. Eles existiam porque a
  // D-20 da 48 negava o pedido fora da decisão final e desviavam o titular para o canal de
  // privacidade. O operador revogou a D-20 em 29/09: o pedido existe nas três origens, pelo
  // registro próprio do pedido (`revisao_rejeicao`, 51-08), e «não há uma revisão a pedir
  // por aqui» passaria a ser falso. O canal de privacidade continua nas superfícies dele.
  gratitude: 'Agradecemos seu interesse e o tempo dedicado ao processo.',
  /**
   * 43-UI-SPEC (BD-3) — reescrita em linguagem que o titular decodifica, COM a citação
   * do artigo preservada ao lado. É esta linha que carrega a âncora legal da tela; o CTA
   * logo abaixo pode falar simples porque o direito está nomeado aqui.
   */
  revisionIntro:
    'Você pode pedir que uma pessoa da nossa equipe revise esta decisão. É um direito seu (LGPD, Art. 20).',
  revisionResultLabel: 'Resultado da revisão:',
  backToPanel: 'Voltar ao painel',
  notAvailableHeading: 'Esta página não está disponível.',
  notAvailableBody:
    'Ela aparece somente quando há uma decisão de não seguir com a candidatura.',
  loadFailedHeading: 'Não foi possível carregar esta página.',
  loadFailedBody: 'Verifique sua conexão e tente novamente.',
  retry: 'Tentar novamente',
} as const

/**
 * Verbatim pt-BR copy from 42-UI-SPEC §Superfície do candidato — REVISAO-04.
 *
 * The verdict line is split in two so the clause that ANSWERS the candidate's question
 * carries weight 600 while the sentence stays a single 16px/1.5 reading line. The two
 * halves concatenate to exactly the UI-SPEC string — the split is typographic, not
 * editorial.
 */
const COPY_REVISAO = {
  eyebrow: 'Resultado da revisão',
  vereditoPrefixo: 'Após a revisão, ',
  veredito: {
    mantida: () => 'a decisão foi mantida.',
    /**
     * 48-14 (JORN-19 · D-01) — o veredito `revertida` REABRE a candidatura (48-11), e esta
     * linha diz isso com a MESMA frase do e-mail (48-13, `COPY_REVISAO_REVERTIDA` em
     * `supabase/functions/_shared/email-templates.ts`): regra da 42-UI-SPEC, e-mail e página
     * dizem a mesma coisa. Prefixo + cláusula concatenam, letra por letra, para
     * «Após a revisão, sua candidatura foi reaberta e será decidida novamente até DD/MM/AAAA.»
     * — a data-limite em SP (prazo − 1 s). Sem prazo legível, a frase sai SEM data; nunca
     * uma data inventada. Reabrir não é aprovar (D-01, RNF-07a): nenhuma decisão foi tomada.
     */
    revertida: (dataLimite: string | null) =>
      dataLimite
        ? `sua candidatura foi reaberta e será decidida novamente até ${dataLimite}.`
        : 'sua candidatura foi reaberta e será decidida novamente.',
  },
  respondidaEm: (data: string) => `Respondida em ${data}`,
} as const

export function ExplicacaoCandidatoPage() {
  const navigate = useNavigate()
  const { id } = useParams<{ id: string }>()

  const backToPanel = () => navigate('/candidato/dashboard')

  // Own-row allowlist read (reachability-gated) + the one-shot visit stamp.
  const { data: explicacao, isLoading, isError, refetch } = useExplicacao(id)

  // ── Loading ─────────────────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <ScreenShell>
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <Glass key={i} variant="white" blur="md" className="p-6 animate-pulse h-16">
              <span />
            </Glass>
          ))}
        </div>
      </ScreenShell>
    )
  }

  // ── Load error (retry) ────────────────────────────────────────────────────────
  if (isError) {
    return (
      <ScreenShell>
        <GlassPanel
          variant="white"
          blur="xl"
          className="text-white text-center p-12 space-y-4"
        >
          <p className="text-white text-xl font-semibold drop-shadow-md">
            {COPY.loadFailedHeading}
          </p>
          <p className="text-white/80">{COPY.loadFailedBody}</p>
          <GlassButton
            variant="white"
            hover
            onClick={() => refetch()}
            className="text-white min-h-[44px]"
          >
            {COPY.retry}
          </GlassButton>
        </GlassPanel>
      </ScreenShell>
    )
  }

  // ── Not available — no rejection / wrong candidatura (reachability gate) ────────
  if (!explicacao) {
    return (
      <ScreenShell>
        <GlassPanel
          variant="white"
          blur="xl"
          className="text-white text-center p-12 space-y-4"
        >
          <p className="text-white text-xl font-semibold drop-shadow-md">
            {COPY.notAvailableHeading}
          </p>
          <p className="text-white/80">{COPY.notAvailableBody}</p>
          <GlassButton
            variant="white"
            hover
            onClick={backToPanel}
            className="text-white min-h-[44px]"
          >
            {COPY.backToPanel}
          </GlassButton>
        </GlassPanel>
      </ScreenShell>
    )
  }

  // ── Content — high-level result + non-clinical reason + revision right ─────────
  // NEVER a numeric result / quantile / psychometric verdict here (RNF-07a / LGPD-04).
  //
  // O discriminador vem do SERVIDOR (§7.18): do lado do cliente, a rejeição humana na
  // triagem e o knockout automático são a mesma linha, e derivar isto aqui daria a uma
  // decisão escrita por uma pessoa o texto da automática.
  //
  // Três origens: `humana` (decisão final), `automatica` (knockout) e `humana_triagem`
  // (uma pessoa rejeitou fora da decisão final, em qualquer etapa — JORN-22). 51-12
  // (JORN-42 · D-01): as três são IGUAIS no direito — todas têm o pedido de revisão — e
  // DIFERENTES no relato de quem decidiu: cada uma tem a sua linha de resultado.
  const { origem } = explicacao
  // 48-14 (JORN-19 · D-01): a candidatura REABERTA. O status/`decisao` não diz se a
  // rejeição ainda vale; quem diz é `reaberta_em`. E o veredito `revertida` também conta —
  // ele SEMPRE reabre (48-11 na decisão final; 51-08 no registro do pedido), e mostrar
  // «decidimos não seguir» ao lado de «sua candidatura foi reaberta» seria a contradição
  // que o 48-14 existe para eliminar. 51-12 (armadilha 3 do RESEARCH): vale para QUALQUER
  // origem — a leitura parte do registro do pedido, não do status, então a página do
  // knockout ou da rejeição pelo RH revertidos continua mostrando a resposta e a data.
  // Reaberta ⇒ sem linha de rejeição, sem razão, sem CTA (não há decisão vigente a
  // revisar); o bloco de resultado da revisão passa a ser a informação principal.
  const reaberta =
    Boolean(explicacao.reaberta_em) || explicacao.revisao_veredito === 'revertida'
  const resultLine =
    origem === 'automatica'
      ? COPY.resultLineAutomatica
      : origem === 'humana_triagem'
        ? COPY.resultLineHumanaTriagem
        : COPY.resultLine

  return (
    <ScreenShell>
      <GlassPanel
        variant="white"
        blur="xl"
        className="text-white space-y-6"
        data-testid={origem === 'humana_triagem' ? 'explicacao-humana-triagem' : undefined}
      >
        <h1 className="text-3xl md:text-4xl font-semibold drop-shadow-md">
          {COPY.heading}
        </h1>

        {/* High-level, non-clinical result line — a do caminho automático diz, na
            primeira frase, que não houve pessoa nem avaliação (§7.18); a da rejeição
            humana na triagem diz que uma pessoa decidiu (JORN-22). Numa candidatura
            reaberta (48-14) a rejeição não é mais vigente: nem a linha, nem a razão. */}
        {!reaberta && (
          <>
            <p className="text-base leading-relaxed text-white">{resultLine}</p>

            {/* Respectful templated reason (derived server-side; never the raw justificativa). */}
            <div className="space-y-2">
              <p className="text-sm font-semibold text-white/70 uppercase tracking-wide">
                {COPY.reasonEyebrow}
              </p>
              <p className="text-base leading-relaxed text-white/90">{explicacao.reason}</p>
            </div>

            <p className="text-base leading-relaxed text-white/80">{COPY.gratitude}</p>
          </>
        )}

        {/* The Art. 20 review OUTCOME (REVISAO-04) — gated on `revisao_respondida_em`,
            the SAME column the 42-08 trigger watches to send the candidate's e-mail, so
            the panel and the e-mail can never disagree about whether an answer exists.
            Falls back to the pre-42-11 plain-text block for any legacy row that carries a
            result WITHOUT an answer stamp: this is a transparency surface, and silently
            dropping text a candidate can read today would be the regression. */}
        {explicacao.revisao_respondida_em ? (
          <ResultadoRevisaoBloco
            veredito={explicacao.revisao_veredito}
            respondidaEm={explicacao.revisao_respondida_em}
            justificativa={explicacao.revisao_resultado}
            prazoNovaDecisaoEm={explicacao.prazo_nova_decisao_em}
          />
        ) : (
          explicacao.revisao_resultado && (
            <div className="rounded-lg border border-white/15 bg-white/5 p-4 space-y-1">
              <p className="text-sm font-semibold text-white/70">
                {COPY.revisionResultLabel}
              </p>
              <p className="text-base leading-relaxed text-white/90">
                {explicacao.revisao_resultado}
              </p>
            </div>
          )
        )}

        {/* LGPD Art. 20 revision-right block + the CTA — nas TRÊS origens (51-12, JORN-42
            · D-01; a D-20 da 48 foi revogada pelo operador em 29/09). A ORIGEM que o
            servidor deu vai ao CTA e escolhe a RPC do pedido: `humana` → o ciclo da
            decisão final; `automatica` / `humana_triagem` → o registro próprio do pedido
            (51-08). Numa candidatura reaberta não há decisão vigente a revisar. */}
        {reaberta ? null : (
          <div className="space-y-3 border-t border-white/15 pt-6">
            <p className="text-base leading-relaxed text-white/90">
              {COPY.revisionIntro}
            </p>
            <SolicitarRevisaoCTA
              candidaturaId={id as string}
              origem={origem}
              revisaoSolicitadaEm={explicacao.revisao_solicitada_em}
              revisaoRespondidaEm={explicacao.revisao_respondida_em}
            />
          </div>
        )}

        {/* Back nav. */}
        <div className="pt-2">
          <GlassButton
            variant="white"
            onClick={backToPanel}
            className="text-white min-h-[44px]"
          >
            {COPY.backToPanel}
          </GlassButton>
        </div>
      </GlassPanel>
    </ScreenShell>
  )
}

/** Formats an ISO timestamp as dd/mm/aaaa (pt-BR) — the idiom already used by the CTA. */
function formatarDataPtBr(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  return d.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })
}

/**
 * The Art. 20 review-outcome block (REVISAO-04) — the candidate reads the verdict, the
 * date, and the reasoning written by the person who reviewed the decision.
 *
 * FOUR RULES THIS BLOCK ENCODES, none of them cosmetic:
 *
 *  1. THE VERDICT LINE IS THE ANCHOR of this block — it is the first thing read and the
 *     one that answers the question that brings the candidate here. The eyebrow and the
 *     date are subordinated by COLOUR AND CASE (`text-white/50`, uppercase), never by a
 *     smaller size: the declared type scale has four sizes and the label role is 14px
 *     (42-UI-SPEC §Typography — the 12px role was eliminated). The block itself stays
 *     subordinate to the page H1; this phase does not contest the screen's anchor.
 *  2. THE REASONING IS LOAD-BEARING READING: 16px / line-height 1.5, line breaks
 *     preserved, and NEVER truncated — no fixed height, no inner scroll, the block grows
 *     vertically. Truncating the review's reasoning would hollow out the very right the
 *     Art. 20 grants, so the layout risk is accepted deliberately (T-42-40).
 *  3. HONESTY: the system writes NO promise of its own about next steps beyond what code
 *     executes. Since 48-11 the `revertida` verdict DOES reopen the candidatura (it returns
 *     to the final decision with a 10-day internal deadline, D-10, and 48-13 alerts the RH
 *     when it expires) — so the D-01 sentence ("sua candidatura foi reaberta e será
 *     decidida novamente até DD/MM/AAAA.") is a promise backed by code, and it is the ONLY
 *     one. Anything else ("entraremos em contato", "você voltará ao processo") would be a
 *     promise with no code that executes it — exactly what the Phase-47 CONSOL-04
 *     checklist exists to hunt down.
 *  4. IDENTITY: the reviewer's name does NOT appear, and the reviewer id is not even read
 *     by the candidate's client (it is absent from `DECISAO_EXPLICACAO_ALLOWLIST`). And
 *     NOTHING from the RH-side follow-up threshold reaches here — no band, no band
 *     colour, no waiting-day count, no late label, not in text and not in an attribute
 *     (D-P42-03 / invariante 1 da 42-UI-SPEC). The Art. 20 fixes no deadline; the only
 *     date here is the reopening's own internal deadline (D-10), the same the e-mail says.
 */
function ResultadoRevisaoBloco({
  veredito,
  respondidaEm,
  justificativa,
  prazoNovaDecisaoEm,
}: {
  veredito: RevisaoVeredito | null
  respondidaEm: string
  justificativa: string | null
  prazoNovaDecisaoEm: string | null
}) {
  const data = formatarDataPtBr(respondidaEm)
  const dataLimite = formatDataLimiteReabertura(prazoNovaDecisaoEm)

  return (
    <div className="rounded-lg border border-white/15 bg-white/5 p-4 space-y-2">
      <p className="text-sm font-semibold uppercase tracking-wide text-white/50">
        {COPY_REVISAO.eyebrow}
      </p>

      {/* Anchor: 16px/1.5, with the answering clause at weight 600. A verdict outside the
          closed vocabulary renders NOTHING rather than echoing a raw server token. */}
      {veredito && (
        <p className="text-base leading-relaxed text-white">
          {COPY_REVISAO.vereditoPrefixo}
          <span className="font-semibold">{COPY_REVISAO.veredito[veredito](dataLimite)}</span>
        </p>
      )}

      {data && (
        <p className="text-sm font-semibold text-white/50">
          {COPY_REVISAO.respondidaEm(data)}
        </p>
      )}

      {justificativa && (
        <p
          data-corpo-revisao
          className="text-base leading-relaxed whitespace-pre-wrap text-white/90"
        >
          {justificativa}
        </p>
      )}
    </div>
  )
}

/** Shared glass shell — mobile-first narrow column (verbatim ProvaCognitivaScreen). */
function ScreenShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative min-h-screen">
      <BackgroundImage
        background="gradient"
        className="min-h-screen py-20"
        overlayColor="bg-black"
        overlayOpacity={15}
      >
        <div className="container mx-auto px-4 max-w-2xl mt-8">{children}</div>
      </BackgroundImage>
    </div>
  )
}
