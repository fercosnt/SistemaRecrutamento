/**
 * /rh/revisoes — a fila de pedidos de revisão de decisão do Art. 20 (REVISAO-02).
 *
 * A superfície RH net-new da Phase 42: onde o pedido de revisão do candidato deixa de ser
 * um timestamp em `decisao_final` e passa a ser trabalho visível, ordenado e priorizado.
 * Estrutura clonada da `RelatoriosRHPage` — página autônoma em `RHLayout` + `GlassCard`,
 * sem autorar shell RH nova.
 *
 * ── ÂNCORA VISUAL DECLARADA (42-UI-SPEC §Âncora visual primária) ───────────────────
 * **A TABELA é a âncora primária desta tela.** É o objeto maior, mais denso, e o único
 * que responde à pergunta que traz o RH aqui ("o que está esperando minha ação?"). O H1, o
 * subtítulo, a nota de ordenação e o switch são SECUNDÁRIOS: vivem numa faixa de controles
 * compacta, **não ganham card próprio** e **não podem empurrar a primeira linha da tabela
 * para fora da dobra em 1366×768**. Isto está escrito aqui de propósito — é a restrição
 * que uma edição futura mais provavelmente violaria sem perceber, ao acrescentar um card
 * de resumo, um bloco de filtros ou um alerta acima da tabela. Se algo novo precisar
 * entrar nesta tela, ele entra ABAIXO da tabela ou dentro dela.
 *
 * ── GATE DE ROTA (correção que prevalece sobre a 42-UI-SPEC) ───────────────────────
 * A rota usa `RoleGuard role={['rh','administrador']}` — o mesmo wrapper das rotas RH
 * vizinhas (`/rh/relatorios`, `/rh/suporte`), e **não** um gate admin-only. A UI-SPEC se
 * contradiz nesse ponto (pede `ProtectedAdminRoute` "com o mesmo gate de /rh/relatorios",
 * que não é admin-only); segue-se o código vivo. Um gate admin-only excluiria todo
 * recrutador, que é a persona que a própria UI-SPEC declara primária desta tela. O gate
 * REAL de dados não é o wrapper de rota: é o escopo por vaga reimplementado dentro do
 * `SECURITY DEFINER` de `listar_revisoes_decisao` (plano 42-06).
 *
 * ── TIPOGRAFIA (4 tamanhos, 2 pesos — o conjunto declarado da fase) ───────────────
 * 28px/600 no H1 · 20px/600 no título de seção · 16px/400 no corpo e no nome do candidato
 * · 14px/600 no papel de label (nota de ordenação, rótulo do switch, cabeçalhos, badges,
 * metadados e datas). Nenhum tamanho menor nesta feature: o papel de 12px seria um quinto
 * tamanho, e uma cerca sobre ONDE ele aparece não muda a CONTAGEM.
 *
 * @module features/revisao/components/RevisoesRHPage
 * @see src/components/pages/RelatoriosRHPage.tsx (a estrutura clonada)
 * @see .planning/phases/42-invent-rio-gates-fila-art-20/42-UI-SPEC.md (§Fila RH — /rh/revisoes)
 */
import { useState } from 'react'
import { RHLayout } from '@/components/RHLayout'
import { GlassCard } from '@/components/ui/glass'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { FilaRevisoesTable } from './FilaRevisoesTable'

/** Copy verbatim da 42-UI-SPEC (§Fila RH) — fonte única desta tela. */
const PAGINA_COPY = {
  h1: 'Revisões de decisão',
  subtitulo: 'Pedidos de revisão de decisão feitos por candidatos (LGPD, Art. 20).',
  tituloSecao: 'Pedidos pendentes',
  notaOrdenacao: 'Ordenados do pedido mais antigo para o mais recente.',
  rotuloToggle: 'Incluir respondidos',
} as const

const ID_TOGGLE = 'incluir-respondidos'

export function RevisoesRHPage() {
  // Desligado por padrão: a tela abre no trabalho que espera ação, não no arquivo.
  const [incluirRespondidos, setIncluirRespondidos] = useState(false)

  return (
    <RHLayout>
      <div className="space-y-6">
        <GlassCard variant="dark" blur="lg" className="space-y-4">
          <div className="space-y-1">
            <h1 className="text-3xl font-semibold text-white md:text-4xl">
              {PAGINA_COPY.h1}
            </h1>
            <p className="text-base text-white/70">{PAGINA_COPY.subtitulo}</p>
          </div>

          <h2 className="text-xl font-semibold text-white">{PAGINA_COPY.tituloSecao}</h2>

          {/* Faixa de controles COMPACTA — secundária à tabela por desenho. */}
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm font-semibold text-white/50">
              {PAGINA_COPY.notaOrdenacao}
            </p>
            <div className="flex items-center gap-2">
              <Switch
                id={ID_TOGGLE}
                checked={incluirRespondidos}
                onCheckedChange={setIncluirRespondidos}
              />
              <Label htmlFor={ID_TOGGLE} className="text-sm font-semibold text-white/80">
                {PAGINA_COPY.rotuloToggle}
              </Label>
            </div>
          </div>

          <FilaRevisoesTable incluirRespondidos={incluirRespondidos} />
        </GlassCard>
      </div>
    </RHLayout>
  )
}
