/**
 * PrivacidadeCandidatoPage — `/candidato/privacidade`, **Seus dados e autorizações**
 * (CONSENT-04 + RETEN-03).
 *
 * É a primeira superfície em que um consentimento coletado por este sistema pode ser
 * desfeito pela própria pessoa, e a primeira em que `autorizacao_retencao_curriculo` é
 * lido por alguém. Ela é também a CASA que a Phase 44 (pedir cópia dos dados) e a
 * Phase 45 (pedir exclusão) vão ocupar — criá-la aqui evita que cada fase invente a sua.
 *
 * O `ScreenShell` é clonado VERBATIM de `ExplicacaoCandidatoPage` (a shell mobile-first
 * travada desde o M1): `BackgroundImage background="gradient"` + overlay 15% +
 * `container mx-auto px-4 max-w-2xl` + `GlassPanel variant="white" blur="xl"`. Nenhum
 * token novo, nenhum primitivo novo, nenhuma dependência nova.
 *
 * ⚠ **EMENDA DA PHASE 44 (44-UI-SPEC §Emenda registrada ao contrato da 43-UI-SPEC).**
 * Até a Phase 43 este docblock afirmava que a página não tinha CTA primário, por
 * desenho. **A seção 3 acrescenta um** — e a alteração é declarada, não deriva.
 *
 *  - **Por que não viola a Invariante 4 da 43** ("zero fricção para revogar"): aquela
 *    regra proíbe um controle que se interponha entre a pessoa e uma intenção JÁ
 *    expressa — o `switch` de marketing já É a revogação, e um "Salvar" ao lado dele
 *    seria fricção pura. Aqui a relação é inversa: **sem botão não existe forma de
 *    expressar a intenção.** O botão não é uma confirmação sobre o pedido; ele **é**
 *    o pedido.
 *  - **O que continua valendo, verbatim:** nenhum diálogo de confirmação, nenhum
 *    pedido de motivo, nenhum "tem certeza?", nenhuma contra-oferta, nenhum atraso
 *    artificial entre o clique e a entrega.
 *  - **Mitigação obrigatória da hierarquia visual:** a âncora da tela continua sendo
 *    a lista de autorizações (seção 1). Três restrições a protegem — o bloco é a
 *    TERCEIRA seção, o CTA é glass-branco e nunca accent, e o molde do container é o
 *    mesmo dos blocos irmãos. Ver o docblock de `PedirCopiaBloco`.
 *
 * @module features/privacidade/components/PrivacidadeCandidatoPage
 * @see src/features/explicacao/components/ExplicacaoCandidatoPage.tsx (a shell clonada + o skeleton de 3 blocos)
 * @see .planning/phases/43-consentimentos-honestos-pol-tica-de-reten-o/43-UI-SPEC.md (§`/candidato/privacidade`)
 * @see .planning/phases/44-exporta-o-acesso/44-UI-SPEC.md (§Emenda · §Seção 3)
 */
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { BackgroundImage } from '@/components/BackgroundImage'
import { Glass, GlassButton, GlassPanel } from '@/components/ui/glass'
import { useCandidato } from '@/store/authStore'
import { usePrivacidade, useGuardaCurriculo } from '../hooks/usePrivacidade'
import { useMeusCurriculos } from '../hooks/useMeusCurriculos'
import { useRevogarMarketing } from '../hooks/useRevogarMarketing'
import { AutorizacoesLista } from './AutorizacoesLista'
import { CurriculosBloco } from './CurriculosBloco'
import { ExcluirDadosBloco } from './ExcluirDadosBloco'
import { GuardaCurriculoBloco } from './GuardaCurriculoBloco'
import { PedirCopiaBloco } from './PedirCopiaBloco'

/** Copy verbatim da 43-UI-SPEC §`/candidato/privacidade` (linhas 462-468 e 343). */
export const COPY_PRIVACIDADE = {
  h1: 'Seus dados e autorizações',
  subtitulo:
    'Aqui você vê o que autorizou, muda o que é opcional e sabe por quanto tempo guardamos seus dados.',
  secao1: 'Suas autorizações',
  secao2: 'O que guardamos e por quê',
  /** Copy verbatim da 44-UI-SPEC §Seção 3 — a casa que a Phase 44 veio ocupar. */
  secao3: 'Pedir uma cópia dos seus dados',
  /** Copy verbatim da 45-UI-SPEC §Seção 4 (Emenda A) — a quarta e última seção. */
  secao4: 'Apagar meus dados',
  voltar: 'Voltar ao painel',
  erroTitulo: 'Não foi possível carregar suas autorizações.',
  erroCorpo: 'Verifique sua conexão e tente novamente.',
  /**
   * ⚠ AUTORADA (a 43-UI-SPEC é silenciosa sobre a falha ISOLADA da leitura de currículo).
   * Escopo de seção, não de página: quando só a leitura do currículo falha, a lista de
   * autorizações — a âncora da tela, e a razão pela qual a pessoa veio — continua
   * legível e o switch continua operante. Derrubar a página inteira por causa da seção
   * subordinada tiraria o direito de revogar por causa de uma informação de leitura.
   */
  erroGuardaTitulo: 'Não foi possível carregar esta informação.',
  tentarNovamente: 'Tentar novamente',
} as const

/**
 * Teto da espera pela hidratação do candidato, em ms. É o MESMO default de
 * `waitForCandidatoHydrated` (Phase 4.1, Pattern 2) — a espera por este fato já tem
 * duração canônica neste projeto e inventar uma segunda seria criar divergência.
 */
export const ESPERA_HIDRATACAO_MS = 3000

export function PrivacidadeCandidatoPage() {
  const navigate = useNavigate()
  const candidato = useCandidato()
  const candidatoId = candidato?.id

  /**
   * ⚠ "AINDA NÃO HIDRATOU" E "CARREGANDO DADO" SÃO FATOS DIFERENTES, e tratá-los como um
   * só produzia um skeleton SEM SAÍDA (code review WR-10): `usePrivacidade` é
   * `enabled: Boolean(candidatoId)`, então sem `candidatoId` a query nunca roda, `isError`
   * nunca fica true, e a tela pulsava para sempre — sem copy de erro, sem nova tentativa,
   * sem teto. O `RoleGuard role="candidato"` gateia pelo PAPEL do JWT, que é fato distinto
   * da linha `candidato` hidratada no store; a corrida entre os dois já é reconhecida no
   * projeto por `waitForCandidatoHydrated`. Numa tela cuja razão de existir é o exercício
   * de um direito, um carregamento irresolúvel é a degradação errada.
   */
  const [esperaEsgotada, setEsperaEsgotada] = useState(false)
  useEffect(() => {
    if (candidatoId) {
      setEsperaEsgotada(false)
      return
    }
    const relogio = setTimeout(() => setEsperaEsgotada(true), ESPERA_HIDRATACAO_MS)
    return () => clearTimeout(relogio)
  }, [candidatoId])

  const {
    data: autorizacoes,
    isLoading,
    isError,
    refetch,
  } = usePrivacidade(candidatoId)

  const guarda = useGuardaCurriculo(candidatoId)
  const revogar = useRevogarMarketing(candidatoId)
  /**
   * A lista de currículos por candidatura (44-07). Mora AQUI, no nível da página, ao
   * lado das outras leituras — é o que mantém o `CurriculosBloco` de apresentação
   * pura, com os estados de voo e de erro DA LEITURA tratados no idioma que a seção 2
   * já usa.
   */
  const curriculos = useMeusCurriculos(candidatoId)

  const voltarAoPainel = () => navigate('/candidato/dashboard')

  // ── Hidratação que não veio ─────────────────────────────────────────────────
  // O DESFECHO LIMITADO da espera acima. Reusa a copy de erro da spec de propósito: da
  // perspectiva de quem olha, "não carregou" é o mesmo fato, e inventar uma segunda
  // mensagem para uma causa interna seria explicar ao titular um detalhe de arquitetura.
  // A nova tentativa é recarregar a página, porque o que falta é a hidratação do store —
  // um `refetch` da query não a produz.
  if (!candidatoId && esperaEsgotada) {
    return (
      <ScreenShell>
        <GlassPanel
          variant="white"
          blur="xl"
          className="space-y-4 p-12 text-center text-white"
        >
          <p className="text-xl font-semibold text-white drop-shadow-md">
            {COPY_PRIVACIDADE.erroTitulo}
          </p>
          <p className="text-white/80">{COPY_PRIVACIDADE.erroCorpo}</p>
          <GlassButton
            variant="white"
            hover
            onClick={() => window.location.reload()}
            className="min-h-[44px] text-white"
          >
            {COPY_PRIVACIDADE.tentarNovamente}
          </GlassButton>
        </GlassPanel>
      </ScreenShell>
    )
  }

  // ── Carregando ──────────────────────────────────────────────────────────────
  // Skeleton de 3 blocos glass pulsantes (idioma verbatim do `ExplicacaoCandidatoPage`),
  // preservando a altura para não haver salto de layout. Agora com TETO: passados
  // `ESPERA_HIDRATACAO_MS` sem `candidatoId`, o ramo acima assume.
  if (!candidatoId || isLoading) {
    return (
      <ScreenShell>
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <Glass key={i} variant="white" blur="md" className="h-16 animate-pulse p-6">
              <span />
            </Glass>
          ))}
        </div>
      </ScreenShell>
    )
  }

  // ── Erro de leitura (com nova tentativa) ────────────────────────────────────
  // Copy própria da spec — nunca o texto cru do erro de transporte.
  if (isError) {
    return (
      <ScreenShell>
        <GlassPanel
          variant="white"
          blur="xl"
          className="space-y-4 p-12 text-center text-white"
        >
          <p className="text-xl font-semibold text-white drop-shadow-md">
            {COPY_PRIVACIDADE.erroTitulo}
          </p>
          <p className="text-white/80">{COPY_PRIVACIDADE.erroCorpo}</p>
          <GlassButton
            variant="white"
            hover
            onClick={() => refetch()}
            className="min-h-[44px] text-white"
          >
            {COPY_PRIVACIDADE.tentarNovamente}
          </GlassButton>
        </GlassPanel>
      </ScreenShell>
    )
  }

  return (
    <ScreenShell>
      <GlassPanel variant="white" blur="xl" className="space-y-6 text-white">
        <h1 className="text-3xl font-semibold drop-shadow-md md:text-4xl">
          {COPY_PRIVACIDADE.h1}
        </h1>
        <p className="text-base leading-relaxed text-white/90">
          {COPY_PRIVACIDADE.subtitulo}
        </p>

        {/* ── Seção 1 — a âncora visual da tela ──────────────────────────────── */}
        <section className="space-y-4">
          <h2 className="text-xl font-semibold text-white">
            {COPY_PRIVACIDADE.secao1}
          </h2>
          <AutorizacoesLista
            autorizacoes={autorizacoes ?? null}
            pendente={revogar.isPending}
            erroEscrita={revogar.isError}
            onAlternarMarketing={(idAutorizacao, novoValor) =>
              revogar.mutate({ idAutorizacao, novoValor })
            }
          />
        </section>

        {/* ── Seção 2 — leitura, depois da lista, porque não é ação ──────────── */}
        <section className="space-y-4 border-t border-white/15 pt-6">
          <h2 className="text-xl font-semibold text-white">
            {COPY_PRIVACIDADE.secao2}
          </h2>

          {guarda.isLoading ? (
            <Glass variant="white" blur="md" className="h-16 animate-pulse p-6">
              <span />
            </Glass>
          ) : guarda.isError ? (
            <div className="space-y-2 rounded-lg border border-white/15 bg-white/5 p-4">
              <p className="text-sm font-semibold text-white">
                {COPY_PRIVACIDADE.erroGuardaTitulo}
              </p>
              <p className="text-base leading-relaxed text-white/90">
                {COPY_PRIVACIDADE.erroCorpo}
              </p>
              <GlassButton
                variant="white"
                hover
                onClick={() => guarda.refetch()}
                className="min-h-[44px] text-white"
              >
                {COPY_PRIVACIDADE.tentarNovamente}
              </GlassButton>
            </div>
          ) : (
            <GuardaCurriculoBloco
              autorizado={autorizacoes?.autorizacao_retencao_curriculo === true}
              temCurriculo={guarda.data?.temCurriculo === true}
              autorizadoEm={autorizacoes?.created_at ?? null}
            />
          )}
        </section>

        {/* ── Seção 3 — o exercício do direito de acesso (Art. 18, II) ───────
            Classe COPIADA da seção 2, não inventada: a 44-UI-SPEC §Emenda protege
            a âncora visual da tela exigindo que este bloco não receba tratamento
            de destaque maior que o dos vizinhos. */}
        <section className="space-y-4 border-t border-white/15 pt-6">
          <h2 className="text-xl font-semibold text-white">
            {COPY_PRIVACIDADE.secao3}
          </h2>
          <PedirCopiaBloco />

          {/* ── O sub-bloco do currículo (EXPORT-03) ─────────────────────────
              Os três ramos são COPIADOS do gabarito da seção 2 (`:205-232`), não
              redesenhados — e a copy de erro é REUSADA: `erroGuardaTitulo` já diz
              exatamente este fato sobre exatamente este objeto, e a Phase 43 a
              aprovou junto com o docblock que declara o escopo de seção. Um segundo
              texto seria a segunda verdade sobre a MESMA coisa na MESMA tela.

              ⚠ E o silêncio não é opção: se a leitura falhasse e o bloco
              simplesmente não renderizasse, a tela se contradiria dentro de um
              scroll — a seção 2 dizendo "Currículo guardado" e a seção 3 não
              mostrando currículo nenhum. Falhar visível é a única saída honesta, e
              por isso o ramo de erro é de BLOCO, nunca de página. */}
          {curriculos.isLoading ? (
            /* O `div` existe só para carregar o gancho: o `Glass` não repassa
               atributos arbitrários, e sem gancho próprio a asserção de "em voo"
               casaria com o pulsante que o `PedirCopiaBloco` já renderiza — falso
               verde medido no RED do caso (ar). Ele não tem classe: nenhum efeito
               visual, nenhuma alteração de fluxo. */
            <div data-carregando="curriculos">
              <Glass variant="white" blur="md" className="h-16 animate-pulse p-6">
                <span />
              </Glass>
            </div>
          ) : curriculos.isError ? (
            <div className="space-y-2 rounded-lg border border-white/15 bg-white/5 p-4">
              <p className="text-sm font-semibold text-white">
                {COPY_PRIVACIDADE.erroGuardaTitulo}
              </p>
              <p className="text-base leading-relaxed text-white/90">
                {COPY_PRIVACIDADE.erroCorpo}
              </p>
              <GlassButton
                variant="white"
                hover
                onClick={() => curriculos.refetch()}
                className="min-h-[44px] text-white"
              >
                {COPY_PRIVACIDADE.tentarNovamente}
              </GlassButton>
            </div>
          ) : (
            <CurriculosBloco linhas={curriculos.data ?? []} />
          )}
        </section>

        {/* ── Seção 4 — o exercício do direito de eliminação (Art. 18, VI) ───
            Classe COPIADA das seções 2 e 3, não inventada: a Emenda A da 45-UI-SPEC
            protege a âncora visual da tela exigindo que este bloco não receba
            tratamento de destaque maior que o dos vizinhos — nem padding maior, nem
            borda mais forte, nem sombra própria. */}
        <section className="space-y-4 border-t border-white/15 pt-6">
          <h2 className="text-xl font-semibold text-white">
            {COPY_PRIVACIDADE.secao4}
          </h2>
          <ExcluirDadosBloco />
        </section>

        <div className="pt-2">
          <GlassButton
            variant="white"
            onClick={voltarAoPainel}
            className="min-h-[44px] text-white"
          >
            {COPY_PRIVACIDADE.voltar}
          </GlassButton>
        </div>
      </GlassPanel>
    </ScreenShell>
  )
}

/** Shell glass mobile-first — clonada verbatim de `ExplicacaoCandidatoPage`. */
function ScreenShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative min-h-screen">
      <BackgroundImage
        background="gradient"
        className="min-h-screen py-20"
        overlayColor="bg-black"
        overlayOpacity={15}
      >
        <div className="container mx-auto mt-8 max-w-2xl px-4">{children}</div>
      </BackgroundImage>
    </div>
  )
}
