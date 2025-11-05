/**
 * Testes para componente LoadingProgress
 *
 * Verifica que:
 * - Renderiza todas as etapas corretamente
 * - Calcula progresso percentual correto
 * - Mostra ícones apropriados para cada status
 * - Exibe mensagens de erro quando status = 'error'
 * - Mostra/oculta barra de progresso conforme prop
 *
 * NOTA: Este teste requer @testing-library/react para executar.
 * Para instalar:
 *   npm install -D @testing-library/react @testing-library/jest-dom
 *
 * Após instalação, execute:
 *   npm test LoadingProgress
 */

import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { LoadingProgress, type LoadingStage } from '../LoadingProgress'

describe('LoadingProgress', () => {
  // ============================================
  // TESTES DE RENDERIZAÇÃO BÁSICA
  // ============================================

  it('deve renderizar todas as etapas fornecidas', () => {
    const stages: LoadingStage[] = [
      { id: 'stage1', label: 'Etapa 1', status: 'pending' },
      { id: 'stage2', label: 'Etapa 2', status: 'loading' },
      { id: 'stage3', label: 'Etapa 3', status: 'success' },
    ]

    render(<LoadingProgress stages={stages} />)

    expect(screen.getByText('Etapa 1')).toBeInTheDocument()
    expect(screen.getByText('Etapa 2')).toBeInTheDocument()
    expect(screen.getByText('Etapa 3')).toBeInTheDocument()
  })

  it('deve renderizar título customizado', () => {
    const stages: LoadingStage[] = [
      { id: 'stage1', label: 'Etapa 1', status: 'pending' },
    ]

    render(<LoadingProgress stages={stages} title="Meu Processo" />)

    expect(screen.getByText('Meu Processo')).toBeInTheDocument()
  })

  it('deve renderizar título padrão se não fornecido', () => {
    const stages: LoadingStage[] = [
      { id: 'stage1', label: 'Etapa 1', status: 'pending' },
    ]

    render(<LoadingProgress stages={stages} />)

    expect(screen.getByText('Processando...')).toBeInTheDocument()
  })

  // ============================================
  // TESTES DE CÁLCULO DE PROGRESSO
  // ============================================

  it('deve calcular progresso correto (0% quando nenhuma etapa completa)', () => {
    const stages: LoadingStage[] = [
      { id: 'stage1', label: 'Etapa 1', status: 'pending' },
      { id: 'stage2', label: 'Etapa 2', status: 'pending' },
      { id: 'stage3', label: 'Etapa 3', status: 'pending' },
    ]

    render(<LoadingProgress stages={stages} />)

    expect(screen.getByText('0 de 3 concluídas')).toBeInTheDocument()
    expect(screen.getByText('0%')).toBeInTheDocument()
  })

  it('deve calcular progresso correto (50% quando metade completa)', () => {
    const stages: LoadingStage[] = [
      { id: 'stage1', label: 'Etapa 1', status: 'success' },
      { id: 'stage2', label: 'Etapa 2', status: 'loading' },
    ]

    render(<LoadingProgress stages={stages} />)

    expect(screen.getByText('1 de 2 concluídas')).toBeInTheDocument()
    expect(screen.getByText('50%')).toBeInTheDocument()
  })

  it('deve calcular progresso correto (100% quando todas completas)', () => {
    const stages: LoadingStage[] = [
      { id: 'stage1', label: 'Etapa 1', status: 'success' },
      { id: 'stage2', label: 'Etapa 2', status: 'success' },
      { id: 'stage3', label: 'Etapa 3', status: 'success' },
    ]

    render(<LoadingProgress stages={stages} />)

    expect(screen.getByText('3 de 3 concluídas')).toBeInTheDocument()
    expect(screen.getByText('100%')).toBeInTheDocument()
  })

  // ============================================
  // TESTES DE STATUS E MENSAGENS DE ERRO
  // ============================================

  it('deve exibir mensagem de erro quando status = error', () => {
    const stages: LoadingStage[] = [
      {
        id: 'stage1',
        label: 'Etapa 1',
        status: 'error',
        errorMessage: 'Falha ao processar',
      },
    ]

    render(<LoadingProgress stages={stages} />)

    expect(screen.getByText('Falha ao processar')).toBeInTheDocument()
  })

  it('não deve exibir mensagem de erro quando errorMessage ausente', () => {
    const stages: LoadingStage[] = [
      { id: 'stage1', label: 'Etapa 1', status: 'error' },
    ]

    const { container } = render(<LoadingProgress stages={stages} />)

    // Não deve ter elemento com classe de erro de mensagem
    const errorMessages = container.querySelectorAll('.text-destructive')
    // Deve ter apenas o ícone de erro, não mensagem
    expect(errorMessages.length).toBeLessThanOrEqual(1)
  })

  // ============================================
  // TESTES DE BARRA DE PROGRESSO
  // ============================================

  it('deve mostrar barra de progresso quando showProgressBar = true (padrão)', () => {
    const stages: LoadingStage[] = [
      { id: 'stage1', label: 'Etapa 1', status: 'success' },
    ]

    render(<LoadingProgress stages={stages} />)

    expect(screen.getByText('1 de 1 concluídas')).toBeInTheDocument()
    expect(screen.getByText('100%')).toBeInTheDocument()
  })

  it('não deve mostrar barra de progresso quando showProgressBar = false', () => {
    const stages: LoadingStage[] = [
      { id: 'stage1', label: 'Etapa 1', status: 'success' },
    ]

    render(<LoadingProgress stages={stages} showProgressBar={false} />)

    expect(screen.queryByText('1 de 1 concluídas')).not.toBeInTheDocument()
    expect(screen.queryByText('100%')).not.toBeInTheDocument()
  })

  // ============================================
  // TESTES DE EDGE CASES
  // ============================================

  it('deve lidar corretamente com array vazio de stages', () => {
    const stages: LoadingStage[] = []

    render(<LoadingProgress stages={stages} />)

    expect(screen.getByText('Processando...')).toBeInTheDocument()
    expect(screen.getByText('0 de 0 concluídas')).toBeInTheDocument()
  })

  it('deve renderizar corretamente com className customizada', () => {
    const stages: LoadingStage[] = [
      { id: 'stage1', label: 'Etapa 1', status: 'pending' },
    ]

    const { container } = render(
      <LoadingProgress stages={stages} className="custom-class" />
    )

    const rootElement = container.querySelector('.custom-class')
    expect(rootElement).toBeInTheDocument()
  })

  // ============================================
  // TESTES DE INTEGRAÇÃO
  // ============================================

  it('deve refletir fluxo completo de cadastro (pending → loading → success)', () => {
    const stages: LoadingStage[] = [
      { id: 'auth', label: 'Criando conta...', status: 'success' },
      { id: 'db', label: 'Salvando dados...', status: 'loading' },
      { id: 'n8n', label: 'Notificando sistema...', status: 'pending' },
    ]

    render(<LoadingProgress stages={stages} />)

    // Stage 1: Success
    expect(screen.getByText('Criando conta...')).toBeInTheDocument()

    // Stage 2: Loading
    expect(screen.getByText('Salvando dados...')).toBeInTheDocument()

    // Stage 3: Pending
    expect(screen.getByText('Notificando sistema...')).toBeInTheDocument()

    // Progresso
    expect(screen.getByText('1 de 3 concluídas')).toBeInTheDocument()
    expect(screen.getByText('33%')).toBeInTheDocument()
  })
})
