/**
 * ScoreCard Component
 *
 * Displays the 4 test scores in a compact 2x2 grid:
 * - Big Five (average score)
 * - DISC (profile)
 * - Intelligence (Raven percentile)
 * - Culture (from AI analysis)
 *
 * Used in CandidatosRHPage cards
 */

import React from 'react'
import { Brain, Users, TrendingUp, Heart } from 'lucide-react'
import { cn } from '@/lib/utils'

/**
 * The cognitivo (Raven) score IS a job-fit score → an evaluative 3-band frame fits
 * here (unlike the non-evaluative Big Five). The raw percentil digit is NEVER shown
 * to the RH (UX-07, Phase 23) — only a provisional band. Cutoffs are PROVISIONAL
 * (a real local norm is deferred to M5); the band replaces the misleading `P{n}`.
 */
function cognitivoBanda(percentil: number): string {
  if (percentil >= 70) return 'Acima do esperado'
  if (percentil >= 40) return 'Dentro do esperado'
  return 'Abaixo do esperado'
}

interface ScoreCardProps {
  bigFive?: number | null // 0-100 average
  disc?: string | null // Ex: "DI", "SC"
  inteligencia?: number | null // Percentile 0-100
  cultura?: number | null // 0-100
  scoreGeral?: number | null // PRIMARY SCORE (0-100) - MOST IMPORTANT
  className?: string
}

export function ScoreCard({
  bigFive,
  disc,
  inteligencia,
  cultura,
  scoreGeral,
  className,
}: ScoreCardProps) {
  // Helper to get color for numeric scores
  const getScoreColor = (score: number | null | undefined): string => {
    if (!score) return 'text-white/50'
    if (score >= 80) return 'text-green-400'
    if (score >= 60) return 'text-blue-400'
    if (score >= 40) return 'text-yellow-400'
    return 'text-red-400'
  }

  return (
    <div className={cn('space-y-3', className)}>
      {/* Score Geral - Destaque Principal */}
      {scoreGeral !== null && scoreGeral !== undefined && (
        <div className="flex items-center justify-between p-2 bg-white/5 rounded-lg border border-white/10">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-gradient-to-r from-blue-500 to-purple-500 animate-pulse" />
            <span className="text-sm font-medium text-white/90">
              Score Geral
            </span>
          </div>
          <div
            className={cn(
              'text-2xl font-bold',
              getScoreColor(scoreGeral)
            )}
          >
            {scoreGeral}
          </div>
        </div>
      )}

      {/* Grid 2x2 com scores dos testes */}
      <div className="grid grid-cols-2 gap-2 text-white/90 text-sm">
        {/* Big Five */}
        <div className="flex items-start gap-2 p-2 bg-white/5 rounded-lg">
          <Brain className="w-4 h-4 text-blue-300 mt-0.5 flex-shrink-0" />
          <div className="min-w-0 flex-1">
            <div className="text-xs opacity-70 mb-0.5">Big Five</div>
            <div
              className={cn(
                'font-semibold truncate',
                getScoreColor(bigFive)
              )}
            >
              {bigFive ?? 'N/A'}
            </div>
          </div>
        </div>

        {/* DISC */}
        <div className="flex items-start gap-2 p-2 bg-white/5 rounded-lg">
          <Users className="w-4 h-4 text-green-300 mt-0.5 flex-shrink-0" />
          <div className="min-w-0 flex-1">
            <div className="text-xs opacity-70 mb-0.5">DISC</div>
            <div className="font-semibold truncate text-green-400">
              {disc || 'N/A'}
            </div>
          </div>
        </div>

        {/* Intelligence (Raven) */}
        <div className="flex items-start gap-2 p-2 bg-white/5 rounded-lg">
          <TrendingUp className="w-4 h-4 text-purple-300 mt-0.5 flex-shrink-0" />
          <div className="min-w-0 flex-1">
            <div className="text-xs opacity-70 mb-0.5">Intel</div>
            <div
              className={cn(
                'font-semibold truncate',
                getScoreColor(inteligencia)
              )}
            >
              {inteligencia !== null && inteligencia !== undefined
                ? cognitivoBanda(inteligencia)
                : 'N/A'}
            </div>
          </div>
        </div>

        {/* Culture */}
        <div className="flex items-start gap-2 p-2 bg-white/5 rounded-lg">
          <Heart className="w-4 h-4 text-pink-300 mt-0.5 flex-shrink-0" />
          <div className="min-w-0 flex-1">
            <div className="text-xs opacity-70 mb-0.5">Cultura</div>
            <div
              className={cn(
                'font-semibold truncate',
                getScoreColor(cultura)
              )}
            >
              {cultura ?? 'N/A'}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
