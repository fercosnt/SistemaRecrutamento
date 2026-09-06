import { describe, expect, it } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import { useForm } from 'react-hook-form'
import { Textarea } from '../textarea'

// 2026-09-06: o Textarea sem forwardRef descartava o `ref` do `register()` (React 18) e o
// RHF lia `undefined` — «Observações internas» do agendamento iam ao banco como NULL.
function Form({ onSubmit }: { onSubmit: (v: { obs: string }) => void }) {
  const { register, handleSubmit } = useForm<{ obs: string }>({ defaultValues: { obs: '' } })
  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <Textarea aria-label="Obs" {...register('obs')} />
      <button type="submit">Salvar</button>
    </form>
  )
}

describe('Textarea — repassa o ref (React Hook Form uncontrolled)', () => {
  it('o valor digitado chega ao submit via register()', async () => {
    let recebido: { obs: string } | null = null
    render(<Form onSubmit={(v) => { recebido = v }} />)
    fireEvent.change(screen.getByLabelText('Obs'), { target: { value: 'anotação interna' } })
    fireEvent.click(screen.getByText('Salvar'))
    await new Promise((r) => setTimeout(r, 0))
    expect(recebido).toEqual({ obs: 'anotação interna' })
  })
})
