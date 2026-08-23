/**
 * VagaDetalhePage - Página de detalhes de uma vaga específica
 *
 * Phase 4 / VAGA-02 + VAGA-03 + D-03 + Pitfall 1:
 * - Rota slug-aware (`/vagas/:identifier`) com runtime branch via `isUuid`
 *   (D-01): se identificador é UUID → useVaga(id), senão → useVagaBySlug(slug).
 * - 404 state inline (VagaNotFoundState com copy de "vaga inexistente/inativa"
 *   + CTA de retorno) — D-03 anti-enumeration.
 * - Real schema fields renderizados (descricao_curta, sobre_cargo,
 *   responsabilidades, requisitos_formacao etc., diferenciais, beneficios) —
 *   Pitfall 1 (legacy field "descricao" sem sufixo nao existe no schema).
 * - Login-redirect roundtrip (VAGA-03): clique em Candidatar-se sem auth
 *   redireciona para /auth/login com query param redirect preservando o slug;
 *   com auth, navega direto para /candidato/candidatura/formulario/:vagaSlug
 *   (D-05 confirmation modal removido).
 * - Pitfall 7: zero log statements neste page; observability vive em
 *   service/hook layer.
 *
 * @module components/pages/VagaDetalhePage
 */

import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { BackgroundImage } from '../BackgroundImage'
import { BeautySmileLogo } from '../BeautySmileLogo'
import { CandidatoNavbar } from '../layouts/CandidatoNavbar'
import { Glass, GlassCard, GlassButton } from '../ui/glass'
import {
  MapPin,
  Briefcase,
  Clock,
  Users,
  Calendar,
  CheckCircle2,
  Share2,
  ArrowLeft,
  Send,
} from 'lucide-react'
import { RodapePublico } from '@/features/transparencia'
import { useVaga, useHasApplied } from '@/features/vagas/hooks'

/**
 * Superfície de LEITURA — sólida e clara, deliberadamente diferente do vidro.
 *
 * O vidro sobre gradiente funciona para cabeçalho e cartões curtos, e falha para
 * corpo de texto: onde o gradiente clareia, texto branco sobre ele cai para ~2:1 de
 * contraste, contra os 4.5:1 que a WCAG AA pede. Medido na própria página em
 * 2026-08-23, com o descritivo real de SDR no ar.
 *
 * A identidade não se perde: o vidro segue no cabeçalho, no CTA e nos cartões de
 * metadados. O que muda é só onde a pessoa efetivamente LÊ.
 */
function SuperficieLeitura({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-xl bg-white/95 px-6 py-6 text-slate-800 shadow-lg ring-1 ring-black/5 sm:px-8">
      {children}
    </div>
  )
}

/**
 * Corpo de texto de vaga.
 *
 * Duas coisas que o `whitespace-pre-line` num `<p>` único não fazia:
 *
 * 1. **Parágrafos de verdade.** O texto vinha do banco com linhas em branco
 *    separando blocos, mas tudo dentro de UM `<p>` — visualmente um paredão. Aqui
 *    cada bloco vira seu próprio `<p>`, com espaço entre eles.
 * 2. **Largura de linha legível.** Sem limite, a linha ia a ~95 caracteres; o
 *    confortável para leitura contínua é 60–75. `max-w-[68ch]` segura isso sem
 *    depender da largura da janela.
 *
 * ⚠ Rótulos em negrito (o «Captação e primeiro contato.» do PDF) NÃO são tratados
 * aqui: exigiriam interpretar markdown, que é dependência nova e decisão do operador.
 * Enquanto isso eles aparecem como início de parágrafo — legível, só não destacado.
 *
 * ⚠ **Aceita `string` E `string[]`, e isso não é defensividade decorativa.** O schema
 * do banco declara `text` nos quatro campos, mas os mocks do repositório passam
 * ARRAY em `responsabilidades`, `diferenciais` e `beneficios` e STRING em
 * `sobre_cargo` — divergência real, anterior a esta tela, que o `rodapeMontagem`
 * pegou em 2026-08-23. O código antigo sobrevivia por acidente: `whitespace-pre-line`
 * sobre um array renderiza os itens grudados sem separador. Tratar só um dos dois
 * formatos quebraria em produção ou nos testes, dependendo de qual eu escolhesse.
 */
function TextoVaga({
  texto,
  className = '',
}: {
  texto: string | string[] | null | undefined
  className?: string
}) {
  const bruto = Array.isArray(texto) ? texto.filter(Boolean).join('\n\n') : (texto ?? '')

  const paragrafos = bruto
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean)

  if (paragrafos.length === 0) return null

  return (
    <div className={`max-w-[68ch] space-y-4 ${className}`}>
      {paragrafos.map((p, i) => (
        <p key={i} className="whitespace-pre-line leading-relaxed text-slate-700">
          {p}
        </p>
      ))}
    </div>
  )
}
import { useVagaBySlug } from '@/features/vagas/hooks/useVagas'
import { isUuid } from '@/features/vagas/utils/isUuid'
import { useAuthStore } from '@/store/authStore'
import { toast } from 'sonner'
import { formatarLocalizacaoVaga } from '@/features/vagas/types/vagasTypes'

/**
 * Phase 4 / D-03 — 404 state component (inline).
 *
 * Mensagem unica (anti-enumeration carryover D-09 + T-04-06 mitigation): qualquer
 * cause (slug inexistente / vaga inativa / RLS denial) renderiza o mesmo
 * componente para impedir enumeracao por canal de erro.
 *
 * Design: glass UI Beauty Smile alinhado com demais paginas Phase 3+.
 */
function VagaNotFoundState() {
  const navigate = useNavigate()
  return (
    <div className="relative min-h-screen">
      <BackgroundImage background="gradient" className="min-h-screen py-20">
        <div className="container mx-auto px-4 max-w-2xl flex items-center justify-center min-h-[60vh]">
          <Glass
            variant="white"
            blur="xl"
            className="w-full p-8 rounded-2xl text-center text-white space-y-6"
          >
            <h1 className="text-3xl font-bold drop-shadow-lg">
              Vaga não encontrada
            </h1>
            <p className="text-white/90 text-lg leading-relaxed">
              Vaga não encontrada ou não está mais ativa
            </p>
            <GlassButton
              variant="white"
              hover
              onClick={() => navigate('/vagas')}
              className="inline-flex items-center justify-center gap-2 whitespace-nowrap text-white font-semibold"
            >
              <ArrowLeft className="w-4 h-4" />
              Voltar para vagas
            </GlassButton>
          </Glass>
        </div>
      </BackgroundImage>
    </div>
  )
}

export function VagaDetalhePage() {
  const { identifier } = useParams<{ identifier: string }>()
  const navigate = useNavigate()
  // isAuthenticated still gates the Candidatar-se login-redirect (VAGA-03) below.
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated)

  // WR-02-09: persona shell (role/candidato/logout selectors + iniciais +
  // handleLogout) moved into the self-guarding <CandidatoNavbar /> rendered below.

  const [showShareMenu, setShowShareMenu] = useState(false)

  // D-01 runtime branch — both hooks invoked unconditionally with `enabled`
  // controlled via the param passed (null disables) so React Hook Rules hold.
  const isUuidParam = identifier ? isUuid(identifier) : false
  const byIdQuery = useVaga(isUuidParam ? identifier : null)
  const bySlugQuery = useVagaBySlug(isUuidParam ? null : (identifier ?? null))
  const { data: vagaData, isLoading } = isUuidParam ? byIdQuery : bySlugQuery

  // useHasApplied accepts UUID; only meaningful once vaga is resolved.
  const vaga = vagaData?.success ? vagaData.data : undefined
  const { data: hasApplied } = useHasApplied(vaga?.id ?? null)

  // Handlers
  const handleVoltar = () => {
    navigate('/vagas')
  }

  const handleCandidatar = () => {
    if (!isAuthenticated) {
      toast.error('Você precisa estar logado', {
        description: 'Faça login para se candidatar a esta vaga',
      })
      // VAGA-03: preserve identifier (slug or UUID) as redirect target so
      // post-login lands on the correct formulario URL.
      const targetSlug = vaga?.slug ?? identifier ?? ''
      const target = `/candidato/candidatura/formulario/${targetSlug}`
      const redirect = encodeURIComponent(target)
      navigate(`/auth/login?redirect=${redirect}`)
      return
    }
    // D-05: no confirmation modal — direct navigation to formulario page.
    const targetSlug = vaga?.slug ?? identifier ?? ''
    navigate(`/candidato/candidatura/formulario/${targetSlug}`)
  }

  const handleShare = (method: 'whatsapp' | 'email' | 'copy') => {
    if (!vaga) {
      setShowShareMenu(false)
      return
    }
    const url = window.location.href
    const text = `Confira esta vaga: ${vaga.titulo} na Beauty Smile`

    switch (method) {
      case 'whatsapp':
        window.open(
          `https://wa.me/?text=${encodeURIComponent(text + ' ' + url)}`,
          '_blank'
        )
        break
      case 'email':
        window.location.href = `mailto:?subject=${encodeURIComponent(
          text
        )}&body=${encodeURIComponent(url)}`
        break
      case 'copy':
        // WR-08 (Phase 4 review iteration 2 fix): navigator.clipboard.writeText
        // returns Promise<void> and rejects when the document is not focused, in
        // an insecure context, on permission denial, or when Safari's transient
        // activation requirement is not met. Previously the success toast was
        // shown synchronously regardless of outcome (false-success UX) AND the
        // unhandled rejection bubbled to window.onunhandledrejection.
        navigator.clipboard
          .writeText(url)
          .then(() => {
            toast.success('Link copiado!', {
              description: 'O link foi copiado para sua área de transferência',
            })
          })
          .catch(() => {
            toast.error('Não foi possível copiar o link', {
              description: 'Copie manualmente da barra de endereço.',
            })
          })
        break
    }
    setShowShareMenu(false)
  }

  // Loading state
  if (isLoading) {
    return (
      <div className="relative min-h-screen">
        <BackgroundImage background="gradient" className="min-h-screen py-20">
          <div className="container mx-auto px-4 space-y-8">
            <GlassCard variant="white" blur="xl" className="max-w-4xl mx-auto">
              <div className="animate-pulse space-y-6">
                <div className="h-12 bg-white/20 rounded w-2/3"></div>
                <div className="h-6 bg-white/20 rounded w-1/2"></div>
                <div className="h-40 bg-white/10 rounded"></div>
                <div className="h-40 bg-white/10 rounded"></div>
                <div className="h-16 bg-white/20 rounded"></div>
              </div>
            </GlassCard>
          </div>
        </BackgroundImage>
      </div>
    )
  }

  // D-03 — 404 state when query resolves with no vaga (slug never existed OR
  // vaga inactive / RLS-blocked — same UX per anti-enumeration carryover).
  if (!vagaData?.success || !vaga) {
    return <VagaNotFoundState />
  }

  const departamento = vaga.departamento ?? ''
  const modeloTrabalho = vaga.modelo_trabalho ?? ''

  return (
    <div className="relative min-h-screen">
      <BackgroundImage background="gradient" className="min-h-screen py-20">
        {/*
          WR-02-09: persona shell extracted to <CandidatoNavbar />. It self-guards on
          isAuthenticated + role==='candidato' (renders null for anon). Reached only
          past the VagaNotFoundState / loading-skeleton early returns above, so the
          shell still never appears on 404 or loading (D-27 trade-off preserved).
        */}
        <CandidatoNavbar />

        <div className="container mx-auto px-4 space-y-8 max-w-4xl">
          {/* Header */}
          <div className="text-center mb-8">
            <BeautySmileLogo
              type="horizontal"
              size="lg"
              variant="white"
              className="mx-auto mb-6"
            />
          </div>

          {/* Breadcrumb */}
          <div className="flex items-center gap-2 text-white/70">
            <button
              onClick={handleVoltar}
              className="hover:text-white transition-colors flex items-center gap-2"
            >
              <ArrowLeft className="w-4 h-4" />
              Voltar para vagas
            </button>
          </div>

          {/* Main Content */}
          {/* `pb-28` reserva a altura do CTA fixo — ver o comentário dele abaixo. */}
          <GlassCard variant="white" blur="xl" className="text-white">
            <div className="space-y-8 pb-28">
              {/* Título e Ações */}
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <h1 className="text-4xl font-bold mb-4 drop-shadow-lg">
                    {vaga.titulo}
                  </h1>
                  <div className="flex flex-wrap gap-4 text-white/80 text-lg">
                    <div className="flex items-center gap-2">
                      <MapPin className="w-5 h-5" />
                      <span>{formatarLocalizacaoVaga(vaga)}</span>
                    </div>
                    {departamento && (
                      <div className="flex items-center gap-2">
                        <Briefcase className="w-5 h-5" />
                        <span className="capitalize">
                          {departamento.replace('_', ' ')}
                        </span>
                      </div>
                    )}
                    {modeloTrabalho && (
                      <div className="flex items-center gap-2">
                        <Clock className="w-5 h-5" />
                        <span className="capitalize">{modeloTrabalho}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Share Button */}
                <div className="relative">
                  <GlassButton
                    variant="white"
                    onClick={() => setShowShareMenu(!showShareMenu)}
                    className="text-white"
                  >
                    <Share2 className="w-5 h-5" />
                  </GlassButton>

                  {showShareMenu && (
                    <Glass
                      variant="white"
                      blur="xl"
                      className="absolute right-0 mt-2 w-48 p-2 rounded-lg z-10"
                    >
                      <button
                        onClick={() => handleShare('whatsapp')}
                        className="w-full text-left px-4 py-2 rounded hover:bg-white/10 text-white transition-colors"
                      >
                        WhatsApp
                      </button>
                      <button
                        onClick={() => handleShare('email')}
                        className="w-full text-left px-4 py-2 rounded hover:bg-white/10 text-white transition-colors"
                      >
                        Email
                      </button>
                      <button
                        onClick={() => handleShare('copy')}
                        className="w-full text-left px-4 py-2 rounded hover:bg-white/10 text-white transition-colors"
                      >
                        Copiar link
                      </button>
                    </Glass>
                  )}
                </div>
              </div>

              {/* Status Badge */}
              {hasApplied && (
                <div className="flex items-center gap-3 bg-green-500/20 text-green-100 px-6 py-3 rounded-lg backdrop-blur-sm border border-green-400/30">
                  <CheckCircle2 className="w-6 h-6" />
                  <div>
                    <p className="font-semibold">
                      Você já se candidatou a esta vaga
                    </p>
                    <p className="text-sm text-green-200/80">
                      Acompanhe o status da sua candidatura no dashboard
                    </p>
                  </div>
                </div>
              )}

              {/* Sobre a vaga (Pitfall 1 — real schema fields) */}
              {(vaga.descricao_curta || vaga.sobre_cargo) && (
                <div>
                  <h2 className="text-2xl font-bold mb-4">Sobre a vaga</h2>
                  <SuperficieLeitura>
                    {vaga.descricao_curta && (
                      <p className="max-w-[68ch] text-lg font-medium leading-relaxed text-slate-900">
                        {vaga.descricao_curta}
                      </p>
                    )}
                    {vaga.sobre_cargo && (
                      <div
                        className={
                          vaga.descricao_curta
                            ? 'mt-6 border-t border-slate-200 pt-6'
                            : ''
                        }
                      >
                        <h3 className="mb-3 text-lg font-bold text-slate-900">
                          Sobre o cargo
                        </h3>
                        <TextoVaga texto={vaga.sobre_cargo} />
                      </div>
                    )}
                  </SuperficieLeitura>
                </div>
              )}

              {/* Responsabilidades */}
              {vaga.responsabilidades && (
                <div>
                  <h2 className="text-2xl font-bold mb-4">Responsabilidades</h2>
                  <SuperficieLeitura>
                    <TextoVaga texto={vaga.responsabilidades} />
                  </SuperficieLeitura>
                </div>
              )}

              {/* Requisitos (real schema — 4 string fields, não array) */}
              {(vaga.requisitos_formacao ||
                vaga.requisitos_experiencia ||
                vaga.requisitos_habilidades ||
                vaga.requisitos_tecnicos) && (
                <div>
                  <h2 className="text-2xl font-bold mb-4">Requisitos</h2>
                  <SuperficieLeitura>
                    {/* Cada requisito é um bloco com rótulo próprio, e não um
                        parágrafo que começa com negrito: separa o QUE se pede do
                        rótulo da categoria, que é como o PDF lê. */}
                    <dl className="max-w-[68ch] divide-y divide-slate-200">
                    {vaga.requisitos_formacao && (
                      <div className="py-3 first:pt-0 last:pb-0">
                        <dt className="mb-1 text-sm font-bold uppercase tracking-wide text-slate-500">
                          Formação
                        </dt>
                        <dd className="whitespace-pre-line leading-relaxed text-slate-700">
                          {vaga.requisitos_formacao}
                        </dd>
                      </div>
                    )}
                    {vaga.requisitos_experiencia && (
                      <div className="py-3 first:pt-0 last:pb-0">
                        <dt className="mb-1 text-sm font-bold uppercase tracking-wide text-slate-500">
                          Experiência
                        </dt>
                        <dd className="whitespace-pre-line leading-relaxed text-slate-700">
                          {vaga.requisitos_experiencia}
                        </dd>
                      </div>
                    )}
                    {vaga.requisitos_habilidades && (
                      <div className="py-3 first:pt-0 last:pb-0">
                        <dt className="mb-1 text-sm font-bold uppercase tracking-wide text-slate-500">
                          Habilidades
                        </dt>
                        <dd className="whitespace-pre-line leading-relaxed text-slate-700">
                          {vaga.requisitos_habilidades}
                        </dd>
                      </div>
                    )}
                    {vaga.requisitos_tecnicos && (
                      <div className="py-3 first:pt-0 last:pb-0">
                        <dt className="mb-1 text-sm font-bold uppercase tracking-wide text-slate-500">
                          Técnicos
                        </dt>
                        <dd className="whitespace-pre-line leading-relaxed text-slate-700">
                          {vaga.requisitos_tecnicos}
                        </dd>
                      </div>
                    )}
                    </dl>
                  </SuperficieLeitura>
                </div>
              )}

              {/* Diferenciais */}
              {vaga.diferenciais && (
                <div>
                  <h2 className="text-2xl font-bold mb-4">Diferenciais</h2>
                  <SuperficieLeitura>
                    <TextoVaga texto={vaga.diferenciais} />
                  </SuperficieLeitura>
                </div>
              )}

              {/* Benefícios (string em vez de array no schema) */}
              {vaga.beneficios && (
                <div>
                  <h2 className="text-2xl font-bold mb-4">Benefícios</h2>
                  <SuperficieLeitura>
                    <TextoVaga texto={vaga.beneficios} />
                  </SuperficieLeitura>
                </div>
              )}

              {/* Informações Adicionais */}
              {(typeof vaga.diasDesdePublicacao === 'number' ||
                (typeof vaga.totalCandidatos === 'number' &&
                  vaga.totalCandidatos > 0)) && (
                <Glass variant="white" blur="md" className="p-6 rounded-lg">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {typeof vaga.diasDesdePublicacao === 'number' && (
                      <div className="flex items-center gap-3">
                        <Calendar className="w-6 h-6 text-white/60" />
                        <div>
                          <p className="text-white/60 text-sm">Publicada há</p>
                          <p className="text-white font-semibold">
                            {vaga.diasDesdePublicacao}{' '}
                            {vaga.diasDesdePublicacao === 1 ? 'dia' : 'dias'}
                          </p>
                        </div>
                      </div>
                    )}

                    {typeof vaga.totalCandidatos === 'number' &&
                      vaga.totalCandidatos > 0 && (
                        <div className="flex items-center gap-3">
                          <Users className="w-6 h-6 text-white/60" />
                          <div>
                            <p className="text-white/60 text-sm">Candidatos</p>
                            <p className="text-white font-semibold">
                              {vaga.totalCandidatos}{' '}
                              {vaga.totalCandidatos === 1 ? 'pessoa' : 'pessoas'}
                            </p>
                          </div>
                        </div>
                      )}
                  </div>
                </Glass>
              )}
            </div>
          </GlassCard>

          {/* Sticky CTA Button (D-05 — direct navigation; no confirmation modal)
           *
           * ⚠ O `blur="xl"` translúcido deixava o TEXTO DA VAGA aparecer por baixo do
           * botão, e o botão cobria uma linha inteira em cada rolagem — medido em
           * 2026-08-23 na vaga de SDR ao vivo: cortou «medo, um sorriso que incomoda»
           * e depois «Agendamento e comparecimento». Não era estética: era conteúdo
           * que o candidato não lia.
           *
           * Dois consertos, e os dois são necessários. O fundo passa a ser OPACO (nada
           * atravessa), e o cartão de leitura acima ganha `pb-28` para que a última
           * linha nunca termine embaixo do botão. Só opacificar esconderia o texto do
           * mesmo jeito — apenas sem deixar isso visível.
           */}
          <div className="sticky bottom-6 z-20">
            <div className="rounded-xl bg-[#0b1f6b] p-2.5 shadow-2xl ring-1 ring-white/10">
              {hasApplied ? (
                <GlassButton
                  variant="white"
                  className="inline-flex items-center justify-center gap-2 whitespace-nowrap w-full py-3 text-white opacity-60 cursor-not-allowed text-lg font-semibold"
                  disabled
                >
                  <CheckCircle2 className="w-5 h-5" />
                  Você já se candidatou a esta vaga
                </GlassButton>
              ) : (
                <GlassButton
                  variant="white"
                  hover
                  className="inline-flex items-center justify-center gap-2 whitespace-nowrap w-full py-3 text-white text-lg font-semibold"
                  onClick={handleCandidatar}
                >
                  <Send className="w-5 h-5" />
                  Candidatar-se a esta vaga
                </GlassButton>
              )}
            </div>
          </div>
          <RodapePublico />
        </div>
      </BackgroundImage>
    </div>
  )
}
