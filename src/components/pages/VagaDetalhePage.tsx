/**
 * VagaDetalhePage - Página de detalhes de uma vaga específica
 *
 * Features:
 * - Busca vaga por ID do Supabase
 * - Sticky "Candidatar-se" button
 * - Share functionality (WhatsApp, Email, Copy link)
 * - Verifica se candidato já aplicou
 * - Modal de confirmação de candidatura
 * - Integração com TanStack Query
 *
 * @module components/pages/VagaDetalhePage
 */

import React, { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { BackgroundImage } from '../BackgroundImage'
import { BeautySmileLogo } from '../BeautySmileLogo'
import { Glass, GlassCard, GlassButton } from '../ui/glass'
import {
  MapPin,
  Briefcase,
  Clock,
  DollarSign,
  Users,
  Calendar,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Share2,
  ArrowLeft,
  Send
} from 'lucide-react'
import { useVaga, useHasApplied, useCreateCandidatura } from '@/features/vagas/hooks'
import { useAuthStore } from '@/store/authStore'
import { toast } from 'sonner'
import { formatarLocalizacaoVaga } from '@/features/vagas/types/vagasTypes'

export function VagaDetalhePage() {
  const { id: vagaId } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const candidato = useAuthStore((state) => state.candidato)
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated)

  const [showShareMenu, setShowShareMenu] = useState(false)
  const [showConfirmModal, setShowConfirmModal] = useState(false)

  // TanStack Query hooks
  const { data: vagaData, isLoading, error } = useVaga(vagaId)
  const { data: hasApplied } = useHasApplied(vagaId)
  const { mutate: aplicar, isPending: isApplying } = useCreateCandidatura({
    onSuccess: (data) => {
      if (data.success) {
        setShowConfirmModal(false)
        // Redirect to perfil após 2 segundos
        setTimeout(() => {
          navigate('/candidato/perfil')
        }, 2000)
      }
    }
  })

  // Handlers
  const handleVoltar = () => {
    navigate('/vagas')
  }

  const handleCandidatar = () => {
    if (!isAuthenticated) {
      toast.error('Você precisa estar logado', {
        description: 'Faça login para se candidatar a esta vaga'
      })
      navigate('/auth/login')
      return
    }

    setShowConfirmModal(true)
  }

  const handleConfirmarCandidatura = () => {
    if (!candidato?.id || !vagaId) {
      toast.error('Erro ao enviar candidatura', {
        description: 'Dados do candidato ou vaga não encontrados'
      })
      return
    }

    aplicar({
      candidato_id: candidato.id,
      vaga_id: vagaId,
      // status_candidatura e etapa_atual usam defaults do service
    })
  }

  const handleShare = (method: 'whatsapp' | 'email' | 'copy') => {
    const url = window.location.href
    const text = `Confira esta vaga: ${vaga?.titulo} na Beauty Smile`

    switch (method) {
      case 'whatsapp':
        window.open(`https://wa.me/?text=${encodeURIComponent(text + ' ' + url)}`, '_blank')
        break
      case 'email':
        window.location.href = `mailto:?subject=${encodeURIComponent(text)}&body=${encodeURIComponent(url)}`
        break
      case 'copy':
        navigator.clipboard.writeText(url)
        toast.success('Link copiado!', {
          description: 'O link foi copiado para sua área de transferência'
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

  // Error state
  if (error || !vagaData?.success) {
    return (
      <div className="relative min-h-screen">
        <BackgroundImage background="gradient" className="min-h-screen py-20">
          <div className="container mx-auto px-4 space-y-8">
            <Glass variant="white" blur="xl" className="max-w-2xl mx-auto p-8 rounded-xl">
              <div className="flex items-center gap-4 text-white">
                <AlertCircle className="w-12 h-12 text-red-300" />
                <div>
                  <h2 className="text-2xl font-bold mb-2">Vaga não encontrada</h2>
                  <p className="text-white/80">
                    {vagaData?.error || 'Esta vaga pode ter sido removida ou não existe mais.'}
                  </p>
                  <GlassButton
                    variant="white"
                    hover
                    className="mt-4 text-white"
                    onClick={handleVoltar}
                  >
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    Voltar para vagas
                  </GlassButton>
                </div>
              </div>
            </Glass>
          </div>
        </BackgroundImage>
      </div>
    )
  }

  const vaga = vagaData.data

  return (
    <div className="relative min-h-screen">
      <BackgroundImage background="gradient" className="min-h-screen py-20">
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
          <GlassCard variant="white" blur="xl" className="text-white">
            <div className="space-y-8">
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
                    <div className="flex items-center gap-2">
                      <Briefcase className="w-5 h-5" />
                      <span className="capitalize">{vaga.departamento.replace('_', ' ')}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Clock className="w-5 h-5" />
                      <span className="capitalize">{vaga.modelo_trabalho}</span>
                    </div>
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
                    <p className="font-semibold">Você já se candidatou a esta vaga</p>
                    <p className="text-sm text-green-200/80">
                      Acompanhe o status da sua candidatura no dashboard
                    </p>
                  </div>
                </div>
              )}

              {/* Descrição */}
              <div>
                <h2 className="text-2xl font-bold mb-4">Sobre a vaga</h2>
                <Glass variant="white" blur="md" className="p-6 rounded-lg">
                  <p className="text-white/90 text-lg leading-relaxed whitespace-pre-line">
                    {vaga.descricao}
                  </p>
                </Glass>
              </div>

              {/* Requisitos */}
              {vaga.requisitos && vaga.requisitos.length > 0 && (
                <div>
                  <h2 className="text-2xl font-bold mb-4">Requisitos</h2>
                  <Glass variant="white" blur="md" className="p-6 rounded-lg">
                    <ul className="space-y-3">
                      {vaga.requisitos.map((req, index) => (
                        <li key={index} className="flex items-start gap-3 text-white/90">
                          <CheckCircle2 className="w-5 h-5 mt-1 text-green-300 flex-shrink-0" />
                          <span>{req}</span>
                        </li>
                      ))}
                    </ul>
                  </Glass>
                </div>
              )}

              {/* Benefícios */}
              {vaga.beneficios && vaga.beneficios.length > 0 && (
                <div>
                  <h2 className="text-2xl font-bold mb-4">Benefícios</h2>
                  <Glass variant="white" blur="md" className="p-6 rounded-lg">
                    <ul className="space-y-3">
                      {vaga.beneficios.map((ben, index) => (
                        <li key={index} className="flex items-start gap-3 text-white/90">
                          <CheckCircle2 className="w-5 h-5 mt-1 text-blue-300 flex-shrink-0" />
                          <span>{ben}</span>
                        </li>
                      ))}
                    </ul>
                  </Glass>
                </div>
              )}

              {/* Informações Adicionais */}
              <Glass variant="white" blur="md" className="p-6 rounded-lg">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="flex items-center gap-3">
                    <Calendar className="w-6 h-6 text-white/60" />
                    <div>
                      <p className="text-white/60 text-sm">Publicada há</p>
                      <p className="text-white font-semibold">
                        {vaga.diasDesdePublicacao} {vaga.diasDesdePublicacao === 1 ? 'dia' : 'dias'}
                      </p>
                    </div>
                  </div>

                  {vaga.totalCandidatos > 0 && (
                    <div className="flex items-center gap-3">
                      <Users className="w-6 h-6 text-white/60" />
                      <div>
                        <p className="text-white/60 text-sm">Candidatos</p>
                        <p className="text-white font-semibold">
                          {vaga.totalCandidatos} {vaga.totalCandidatos === 1 ? 'pessoa' : 'pessoas'}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </Glass>
            </div>
          </GlassCard>

          {/* Sticky CTA Button */}
          <div className="sticky bottom-6 z-20">
            <Glass variant="white" blur="xl" className="p-4 rounded-xl">
              {hasApplied ? (
                <GlassButton
                  variant="white"
                  className="w-full py-4 text-white opacity-60 cursor-not-allowed text-lg font-semibold"
                  disabled
                >
                  <CheckCircle2 className="w-5 h-5 mr-2" />
                  Você já se candidatou a esta vaga
                </GlassButton>
              ) : (
                <GlassButton
                  variant="white"
                  hover
                  className="w-full py-4 text-white text-lg font-semibold"
                  onClick={handleCandidatar}
                  disabled={isApplying}
                >
                  {isApplying ? (
                    <>
                      <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                      Enviando candidatura...
                    </>
                  ) : (
                    <>
                      <Send className="w-5 h-5 mr-2" />
                      Candidatar-se a esta vaga
                    </>
                  )}
                </GlassButton>
              )}
            </Glass>
          </div>

          {/* Modal de Confirmação */}
          {showConfirmModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
              <Glass variant="white" blur="xl" className="max-w-md w-full p-8 rounded-2xl">
                <div className="text-white space-y-6">
                  <div className="text-center">
                    <div className="w-16 h-16 bg-blue-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                      <Send className="w-8 h-8 text-blue-300" />
                    </div>
                    <h3 className="text-2xl font-bold mb-2">Confirmar candidatura?</h3>
                    <p className="text-white/80">
                      Você está prestes a se candidatar para a vaga de <strong>{vaga.titulo}</strong>
                    </p>
                  </div>

                  <div className="flex gap-4">
                    <GlassButton
                      variant="white"
                      className="flex-1 py-3 text-white"
                      onClick={() => setShowConfirmModal(false)}
                      disabled={isApplying}
                    >
                      Cancelar
                    </GlassButton>
                    <GlassButton
                      variant="white"
                      hover
                      className="flex-1 py-3 text-white font-semibold"
                      onClick={handleConfirmarCandidatura}
                      disabled={isApplying}
                    >
                      {isApplying ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Enviando...
                        </>
                      ) : (
                        'Confirmar'
                      )}
                    </GlassButton>
                  </div>
                </div>
              </Glass>
            </div>
          )}
        </div>
      </BackgroundImage>
    </div>
  )
}
