/// <reference types="@testing-library/jest-dom" />
/**
 * A MONTAGEM do `RodapePublico` — o ato que transforma duas rotas registradas em duas
 * páginas ENCONTRADAS (TRANSP-01 · 47-08 Task 3).
 *
 * ── POR QUE ESTE ARQUIVO EXISTE, SEPARADO DE `rodapePublico.test.tsx` ───────
 * Aquele prova que o COMPONENTE está correto. Este prova que ele está NO LUGAR. São
 * asserções diferentes e o segundo é o que fecha o critério da fase: um componente
 * perfeito, exportado e montado em lugar nenhum, satisfaz "existe" e falha "qualquer
 * visitante lê" — que foi exatamente o estado em que o plano 47-08 parou, de propósito,
 * enquanto o portão de publicação do Encarregado estava aberto.
 *
 * O precedente enganoso mora ao lado: a rota de manifesto é referenciada pela entrada de
 * rota e pelo menu de navegação de DESENVOLVIMENTO, gateado por variável de ambiente.
 * Nenhuma navegação de produção leva a ela. Um teste que só verificasse "a rota existe"
 * aprovaria esse estado.
 *
 * ── A ASSERÇÃO NEGATIVA É A METADE QUE SE PERDE PRIMEIRO ────────────────────
 * O caso (8) varre a árvore de fontes e exige que o conjunto de arquivos que montam o
 * rodapé seja EXATAMENTE as cinco superfícies previstas. Ele reprova tanto a falta
 * quanto o excesso: o rodapé numa rota de autenticação ou numa tela interna de RH é
 * ruído sem função, e essas telas já têm navegação própria.
 *
 * @see .planning/phases/47-transpar-ncia-consolida-o/47-08-PLAN.md (Task 3)
 * @see .planning/phases/47-transpar-ncia-consolida-o/47-UI-SPEC.md (§`RodapePublico`)
 */
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join, relative, resolve } from 'node:path'

import { render, within, type RenderResult } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  vagaMock: {
    id: '11111111-1111-4111-8111-111111111111',
    slug: 'auxiliar-de-consultorio',
    titulo: 'Auxiliar de Consultório',
    descricao_curta: 'Uma vaga de teste.',
    sobre_cargo: 'Sobre o cargo, em texto.',
    departamento: 'clinico',
    modelo_trabalho: 'Presencial',
    tipo_vaga: 'CLT',
    cidade: 'São Paulo',
    estado: 'SP',
    responsabilidades: [] as string[],
    requisitos_formacao: [] as string[],
    requisitos_experiencia: [] as string[],
    requisitos_habilidades: [] as string[],
    requisitos_tecnicos: [] as string[],
    diferenciais: [] as string[],
    beneficios: [] as string[],
    diasDesdePublicacao: 1,
    totalCandidatos: 0,
  },
  authState: {
    // Anônimo de propósito: as três páginas de conversão são superfícies de aquisição, e
    // a barra de persona se auto-guarda para visitante não autenticado. O rodapé precisa
    // estar lá justamente para quem NÃO tem navegação própria.
    isAuthenticated: false,
    role: null as string | null,
    candidato: null,
    logout: vi.fn(() => Promise.resolve()),
  },
}))

vi.mock('@/store/authStore', () => ({
  // ⚠ O mock respeita SELETOR. Um mock que devolvesse objeto fixo e ignorasse o seletor
  // faria a barra de persona renderizar `null` por acidente e o teste passaria por
  // vacuidade — o defeito registrado em `DashboardCandidatoPage.navbar.test.tsx`.
  useAuthStore: (seletor?: (estado: typeof mocks.authState) => unknown) =>
    typeof seletor === 'function' ? seletor(mocks.authState) : mocks.authState,
}))

vi.mock('@/features/vagas/store/vagasStore', () => ({
  useVagasStore: () => ({
    filters: {},
    orderBy: 'mais_recentes',
    pagination: { page: 1, pageSize: 12 },
    setFilters: vi.fn(),
    resetFilters: vi.fn(),
    setOrderBy: vi.fn(),
    goToPage: vi.fn(),
    isFilterSidebarOpen: false,
    toggleFilterSidebar: vi.fn(),
  }),
}))

vi.mock('@/features/vagas/hooks', () => ({
  useVagas: () => ({
    data: { data: [], pagination: { total: 0, totalPages: 1, hasMore: false } },
    isLoading: false,
    error: null,
  }),
  useVaga: () => ({ data: { success: true, data: mocks.vagaMock }, isLoading: false }),
  useHasApplied: () => ({ data: false }),
}))

vi.mock('@/features/vagas/hooks/useVagas', () => ({
  useVagaBySlug: () => ({ data: { success: true, data: mocks.vagaMock }, isLoading: false }),
}))

vi.mock('sonner', () => ({ toast: { error: vi.fn(), success: vi.fn() } }))

const { LandingPage } = await import('@/components/pages/LandingPage')
const { VagasPublicasPage } = await import('@/components/pages/VagasPublicasPage')
const { VagaDetalhePage } = await import('@/components/pages/VagaDetalhePage')
const { PrivacidadePublicaPage, SubprocessadoresPage } = await import('@/features/transparencia')

// Mesmo padrão de `rodapePublico.test.tsx`: `import.meta.url` sob o Vite chega com o
// prefixo `/@fs/` e quebra qualquer leitura de disco.
const RAIZ = resolve(__dirname, '../../../..')

/** As CINCO superfícies, por caminho — a mesma lista que o guard do plano varre. */
const SUPERFICIES = [
  'src/components/pages/LandingPage.tsx',
  'src/components/pages/VagasPublicasPage.tsx',
  'src/components/pages/VagaDetalhePage.tsx',
  'src/features/transparencia/components/SubprocessadoresPage.tsx',
  'src/features/transparencia/components/PrivacidadePublicaPage.tsx',
] as const

function renderizarDetalheVaga(): RenderResult {
  return render(
    <MemoryRouter initialEntries={['/vagas/auxiliar-de-consultorio']}>
      <Routes>
        <Route path="/vagas/:identifier" element={<VagaDetalhePage />} />
      </Routes>
    </MemoryRouter>,
  )
}

function renderizar(elemento: React.ReactElement): RenderResult {
  return render(<MemoryRouter>{elemento}</MemoryRouter>)
}

/** As cinco superfícies montadas, cada uma na forma que a produção realmente renderiza. */
const MONTAGENS: ReadonlyArray<readonly [string, () => RenderResult]> = [
  ['LandingPage', () => renderizar(<LandingPage />)],
  ['VagasPublicasPage', () => renderizar(<VagasPublicasPage />)],
  ['VagaDetalhePage', renderizarDetalheVaga],
  ['SubprocessadoresPage', () => renderizar(<SubprocessadoresPage />)],
  ['PrivacidadePublicaPage', () => renderizar(<PrivacidadePublicaPage />)],
]

function rodapeDe(resultado: RenderResult): HTMLElement {
  const rodape = resultado.container.querySelector<HTMLElement>('[data-rodape="publico"]')
  expect(rodape, 'o rodapé de transparência não foi encontrado nesta superfície').not.toBeNull()
  return rodape as HTMLElement
}

/** Varre `src/` e devolve os caminhos que MONTAM o rodapé (uso em JSX, não o barrel). */
function arquivosQueMontamORodape(): string[] {
  const encontrados: string[] = []

  const andar = (dir: string): void => {
    for (const entrada of readdirSync(dir)) {
      const caminho = join(dir, entrada)
      if (statSync(caminho).isDirectory()) {
        if (entrada === 'node_modules' || entrada === '__tests__') continue
        andar(caminho)
        continue
      }
      if (!/\.tsx$/.test(entrada)) continue
      const fonte = readFileSync(caminho, 'utf8')
      // A MONTAGEM é o uso em JSX. A definição do próprio componente e o barrel da
      // feature citam o nome sem montar coisa nenhuma.
      if (/<RodapePublico\s*\/?>/.test(fonte)) {
        encontrados.push(relative(RAIZ, caminho))
      }
    }
  }

  andar(join(RAIZ, 'src'))
  return encontrados.sort()
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('o rodapé de transparência está montado nas cinco superfícies públicas', () => {
  it('(1) a página inicial — a porta de entrada de qualquer visitante — renderiza o rodapé', () => {
    expect(rodapeDe(renderizar(<LandingPage />))).toBeInTheDocument()
  })

  it('(2) a lista de vagas renderiza o rodapé', () => {
    expect(rodapeDe(renderizar(<VagasPublicasPage />))).toBeInTheDocument()
  })

  it('(3) o detalhe de vaga renderiza o rodapé', () => {
    expect(rodapeDe(renderizarDetalheVaga())).toBeInTheDocument()
  })

  it('(4) a página de subprocessadores renderiza o rodapé — ele é o link cruzado', () => {
    expect(rodapeDe(renderizar(<SubprocessadoresPage />))).toBeInTheDocument()
  })

  it('(5) a página pública de privacidade renderiza o rodapé', () => {
    expect(rodapeDe(renderizar(<PrivacidadePublicaPage />))).toBeInTheDocument()
  })
})

describe('a forma da montagem — último filho, e os dois links chegam íntegros', () => {
  it('(6) em CADA superfície o rodapé é o ÚLTIMO filho do container que o recebe', () => {
    for (const [nome, montar] of MONTAGENS) {
      const rodape = rodapeDe(montar())
      expect(
        rodape.parentElement?.lastElementChild,
        `em ${nome} o rodapé não é o último filho do container`,
      ).toBe(rodape)
    }
  })

  it('(7) em CADA superfície o rodapé leva às DUAS rotas públicas, com o piso de alvo tátil', () => {
    for (const [nome, montar] of MONTAGENS) {
      const rodape = rodapeDe(montar())
      const links = within(rodape).getAllByRole('link')
      expect(links, `em ${nome} o rodapé não tem exatamente dois links`).toHaveLength(2)
      expect(links.map((l) => l.getAttribute('href'))).toEqual(['/privacidade', '/subprocessadores'])
      for (const link of links) {
        // O modo de falha mais provável da fase é ALTURA, não texto: uma âncora de texto
        // corrido tem cerca de metade do piso e isso é invisível num teste de conteúdo.
        expect(link.className, `em ${nome}, "${link.textContent}" sem piso de alvo tátil`).toContain(
          'min-h-[44px]',
        )
      }
    }
  })
})

describe('a asserção negativa — onde o rodapé NÃO é montado', () => {
  it('(8) o conjunto de arquivos que montam o rodapé é EXATAMENTE as cinco superfícies', () => {
    expect(arquivosQueMontamORodape()).toEqual([...SUPERFICIES].sort())
  })

  it('(9) a rota de manifesto e as rotas de autenticação seguem sem o rodapé', () => {
    const proibidas = [
      'src/components/pages/ManifestoPage.tsx',
      'src/components/pages/LoginCandidatoPage.tsx',
    ]
    for (const caminho of proibidas) {
      const fonte = readFileSync(join(RAIZ, caminho), 'utf8')
      expect(/<RodapePublico\s*\/?>/.test(fonte), `${caminho} não deve montar o rodapé`).toBe(false)
    }
  })
})
