/// <reference types="@testing-library/jest-dom" />
/**
 * Phase 18 / Plan 18-04 Task 2 — contract test for the shared <AsyncState> wrapper (RESIL-03).
 *
 * Locks the binding 18-UI-SPEC §States Contract: <AsyncState> renders exactly ONE of
 * loading / slow / error / empty / success in strict priority order, with single-sourced
 * verbatim PT-BR copy and a standardized retry. The cases pinned here:
 *
 *  1. loading      → skeleton, no error/retry/empty text.
 *  2. slow@8s      → after advanceTimersByTime(8000) while still loading, the slow heading
 *                    "Estamos processando com IA…" appears (timed escalation of loading).
 *  3. error generic→ isError without AI_UNAVAILABLE → "Verifique a conexão e tente novamente." + retry.
 *  4. error overload→ isError + errorCode='AI_UNAVAILABLE' → the sobrecarga body verbatim.
 *  5. retry        → click calls onRetry; with retrying=true → "Tentando…" + disabled.
 *  6. empty        → isEmpty → "Nada para mostrar ainda".
 *  7. success      → none set → children render.
 *  + precedence    → isLoading wins over isEmpty (the HubSection convention, binding).
 *
 * Fake timers (vi.useFakeTimers + advanceTimersByTime) drive the slow@8s escalation; the
 * `tests/setup.ts` jest-shim already bridges fake timers for RTL's waitFor.
 *
 * @see src/components/ui/AsyncState.tsx (component under test)
 * @see .planning/phases/18-resili-ncia-das-efs-de-ia-bugs-do-funil/18-UI-SPEC.md (binding contract)
 */
import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen, fireEvent, act } from '@testing-library/react'
import '@testing-library/jest-dom'

import { AsyncState } from '../AsyncState'

afterEach(() => {
  vi.useRealTimers()
})

describe('<AsyncState> — 18-UI-SPEC States Contract (RESIL-03)', () => {
  it('loading: renders skeleton, no error/retry/empty text', () => {
    const { container } = render(
      <AsyncState isLoading>
        <p>conteúdo carregado</p>
      </AsyncState>,
    )

    expect(container.querySelector('[data-slot="skeleton"]')).toBeInTheDocument()
    expect(screen.queryByText('conteúdo carregado')).not.toBeInTheDocument()
    expect(screen.queryByText('Tentar novamente')).not.toBeInTheDocument()
    expect(screen.queryByText('Nada para mostrar ainda')).not.toBeInTheDocument()
    // slow note has NOT appeared yet (before the timer elapses)
    expect(screen.queryByText('Estamos processando com IA…')).not.toBeInTheDocument()
  })

  it('slow@8s: after advanceTimersByTime(8000) while loading, the slow heading appears', () => {
    vi.useFakeTimers()
    render(<AsyncState isLoading>ok</AsyncState>)

    expect(screen.queryByText('Estamos processando com IA…')).not.toBeInTheDocument()

    act(() => {
      vi.advanceTimersByTime(8000)
    })

    expect(screen.getByText('Estamos processando com IA…')).toBeInTheDocument()
    expect(
      screen.getByText('Isso pode levar até ~2 minutos. Não feche esta tela.'),
    ).toBeInTheDocument()
  })

  it('error generic: isError without AI_UNAVAILABLE → generic body + retry button', () => {
    render(<AsyncState isError onRetry={() => {}}>ok</AsyncState>)

    expect(screen.getByText('Não foi possível concluir agora.')).toBeInTheDocument()
    expect(screen.getByText('Verifique a conexão e tente novamente.')).toBeInTheDocument()
    expect(
      screen.queryByText('O serviço de IA está sobrecarregado. Tente novamente em instantes.'),
    ).not.toBeInTheDocument()
    expect(screen.getByText('Tentar novamente')).toBeInTheDocument()
  })

  it("error overload: isError + errorCode='AI_UNAVAILABLE' → sobrecarga body verbatim", () => {
    render(
      <AsyncState isError errorCode="AI_UNAVAILABLE" onRetry={() => {}}>
        ok
      </AsyncState>,
    )

    expect(
      screen.getByText('O serviço de IA está sobrecarregado. Tente novamente em instantes.'),
    ).toBeInTheDocument()
    expect(
      screen.queryByText('Verifique a conexão e tente novamente.'),
    ).not.toBeInTheDocument()
  })

  it('retry: clicking calls onRetry', () => {
    const onRetry = vi.fn()
    render(<AsyncState isError onRetry={onRetry}>ok</AsyncState>)

    fireEvent.click(screen.getByText('Tentar novamente'))
    expect(onRetry).toHaveBeenCalledTimes(1)
  })

  it('retry: retrying=true → button shows "Tentando…" and is disabled', () => {
    render(
      <AsyncState isError retrying onRetry={() => {}}>
        ok
      </AsyncState>,
    )

    const button = screen.getByRole('button')
    expect(button).toHaveTextContent('Tentando…')
    expect(button).toBeDisabled()
    expect(screen.queryByText('Tentar novamente')).not.toBeInTheDocument()
  })

  it('empty: isEmpty → empty heading + body', () => {
    render(
      <AsyncState isEmpty>
        <p>não deveria aparecer</p>
      </AsyncState>,
    )

    expect(screen.getByText('Nada para mostrar ainda')).toBeInTheDocument()
    expect(
      screen.getByText('Os dados desta etapa aparecerão aqui quando estiverem disponíveis.'),
    ).toBeInTheDocument()
    expect(screen.queryByText('não deveria aparecer')).not.toBeInTheDocument()
  })

  it('success: none of the flags set → children render', () => {
    render(
      <AsyncState>
        <p>resultado final</p>
      </AsyncState>,
    )

    expect(screen.getByText('resultado final')).toBeInTheDocument()
  })

  it('precedence: isLoading wins over isEmpty (binding HubSection convention)', () => {
    const { container } = render(
      <AsyncState isLoading isEmpty>
        ok
      </AsyncState>,
    )

    expect(container.querySelector('[data-slot="skeleton"]')).toBeInTheDocument()
    expect(screen.queryByText('Nada para mostrar ainda')).not.toBeInTheDocument()
  })

  it('precedence: isError wins over isEmpty', () => {
    render(
      <AsyncState isError isEmpty onRetry={() => {}}>
        ok
      </AsyncState>,
    )

    expect(screen.getByText('Não foi possível concluir agora.')).toBeInTheDocument()
    expect(screen.queryByText('Nada para mostrar ainda')).not.toBeInTheDocument()
  })

  it('error: retry button absent when onRetry not provided', () => {
    render(<AsyncState isError>ok</AsyncState>)
    expect(screen.queryByRole('button')).not.toBeInTheDocument()
  })
})
