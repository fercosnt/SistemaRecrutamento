/// <reference types="@testing-library/jest-dom" />
/**
 * ⛔ 52-10 / JORN-54 (G-51-OP1, D-08, D-09, D-40, D-52-U18) — a ficha «Dados do cadastro».
 *
 * O operador pediu «ver todos os dados preenchidos no cadastro». O contrato medido aqui:
 *  - TUDO direto, sem «Mostrar dados pessoais» (D-08): 10 pares, «Endereço» com 7, «Disponibilidade»
 *    com 3, na ordem da UI-SPEC;
 *  - campo ausente → «Não informado» — nunca `—`, `null`, `undefined` ou célula vazia; «Detalhes de
 *    como conheceu» só existe com valor (E3 partial);
 *  - registro fictício/anonimizado: o celular aparece como TEXTO PURO, sem link nem botão (D-40) —
 *    a ação de contato é só do cabeçalho do 52-23;
 *  - campo livre com marcação vira texto (T-52-71); LinkedIn/Instagram como texto neste plano.
 *
 * O módulo é carregado por `import()` com especificador em variável: no RED ele ainda não existe,
 * e a falha tem de ser de ASSERÇÃO (componente ausente), não de carga do arquivo.
 */
import React from 'react'
import { describe, it, expect } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import type {
  DadosCadastroRh,
  DisponibilidadeRh,
} from '@/features/hub-candidato/services/cadastroCandidatoRhService'
import { CAMPOS_CADASTRO_RH } from '@/features/hub-candidato/services/cadastroCandidatoRhService'

type Props = {
  cadastro: DadosCadastroRh | null
  disponibilidade: DisponibilidadeRh | null
  hoje?: Date
}
type Mod = {
  DadosCadastroBloco?: React.ComponentType<Props>
  COPY_DADOS_CADASTRO?: Record<string, unknown>
}

async function carregar(): Promise<Mod | null> {
  const especificador = '../DadosCadastroBloco'
  return ((await import(/* @vite-ignore */ especificador).catch(() => null)) as Mod | null)
}

const HOJE = new Date('2026-10-10T15:00:00Z')

function cadastro(parcial: Partial<DadosCadastroRh>): DadosCadastroRh {
  const base = Object.fromEntries(CAMPOS_CADASTRO_RH.map((c) => [c, null])) as DadosCadastroRh
  return { ...base, ...parcial }
}

const CHEIO = cadastro({
  nome_completo: 'Fulana de Tal Souza',
  email: 'fulana@exemplo.com',
  celular: '11987654321',
  cpf: '12345678901',
  data_nascimento: '1994-03-12',
  genero: 'feminino',
  como_conheceu: 'outro',
  como_conheceu_detalhes: 'Uma amiga que trabalha na clínica comentou.',
  linkedin_url: 'https://linkedin.com/in/fulana',
  linkedin: null,
  instagram_url: null,
  instagram: '@fulana',
  cep: '01310100',
  logradouro: 'Avenida Paulista',
  numero: '1000',
  complemento: 'Conjunto 12, bloco B',
  bairro: 'Bela Vista',
  cidade: 'São Paulo',
  estado: 'SP',
})

const DISP_VAZIA: DisponibilidadeRh = {
  periodo_disponivel: null,
  regime_trabalho: null,
  disponibilidade_imediata: null,
  data_disponibilidade: null,
}

async function montar(props: Props): Promise<HTMLElement> {
  const mod = await carregar()
  expect(mod?.DadosCadastroBloco, 'DadosCadastroBloco não existe').toBeTypeOf('function')
  const C = mod!.DadosCadastroBloco!
  const { container } = render(<C hoje={HOJE} {...props} />)
  return container
}

/** O `<dd>` do par cujo `<dt>` tem exatamente esse rótulo. */
function valor(rotulo: string): HTMLElement {
  const dts = Array.from(document.querySelectorAll('dt')).filter((dt) => dt.textContent === rotulo)
  expect(dts, `par «${rotulo}» ausente ou repetido`).toHaveLength(1)
  const dd = dts[0].nextElementSibling as HTMLElement | null
  expect(dd?.tagName, `«${rotulo}» sem <dd> logo depois`).toBe('DD')
  return dd!
}

const ORDEM = [
  'Nome completo',
  'E-mail',
  'Celular',
  'CPF',
  'Data de nascimento',
  'Gênero',
  'Como conheceu a vaga',
  'Detalhes de como conheceu',
  'LinkedIn',
  'Instagram',
  'CEP',
  'Logradouro',
  'Número',
  'Complemento',
  'Bairro',
  'Cidade',
  'UF',
  'Turno preferido',
  'Modelo de trabalho',
  'Início',
]

describe('DadosCadastroBloco — a ficha inteira, direto (52-10 / D-08, D-09)', () => {
  it('populado: os pares na ordem da UI-SPEC, com os formatos', async () => {
    await montar({
      cadastro: CHEIO,
      disponibilidade: {
        periodo_disponivel: 'manha',
        regime_trabalho: 'hibrido',
        disponibilidade_imediata: false,
        data_disponibilidade: '2026-11-02',
      },
    })
    const bloco = screen.getByTestId('hub-dados-cadastro')
    expect(Array.from(bloco.querySelectorAll('dt')).map((d) => d.textContent)).toEqual(ORDEM)
    expect(valor('Nome completo')).toHaveTextContent('Fulana de Tal Souza')
    expect(valor('E-mail')).toHaveTextContent('fulana@exemplo.com')
    expect(valor('Celular')).toHaveTextContent('(11) 98765-4321')
    expect(valor('CPF')).toHaveTextContent('123.456.789-01')
    expect(valor('Data de nascimento')).toHaveTextContent('12/03/1994 (32 anos)')
    expect(valor('Gênero')).toHaveTextContent('Feminino')
    expect(valor('Como conheceu a vaga')).toHaveTextContent('Outro')
    expect(valor('Detalhes de como conheceu')).toHaveTextContent(
      'Uma amiga que trabalha na clínica comentou.',
    )
    expect(valor('LinkedIn')).toHaveTextContent('https://linkedin.com/in/fulana')
    expect(valor('Instagram')).toHaveTextContent('@fulana')
    expect(valor('CEP')).toHaveTextContent('01310-100')
    expect(valor('Logradouro')).toHaveTextContent('Avenida Paulista')
    expect(valor('Número')).toHaveTextContent('1000')
    expect(valor('Complemento')).toHaveTextContent('Conjunto 12, bloco B')
    expect(valor('Bairro')).toHaveTextContent('Bela Vista')
    expect(valor('Cidade')).toHaveTextContent('São Paulo')
    expect(valor('UF')).toHaveTextContent('SP')
    expect(valor('Turno preferido')).toHaveTextContent('Manhã')
    expect(valor('Modelo de trabalho')).toHaveTextContent('Híbrido')
    expect(valor('Início')).toHaveTextContent('02/11/2026')
    // Sub-blocos com h3 reais (UI-SPEC §Acessibilidade).
    expect(screen.getByRole('heading', { level: 3, name: 'Endereço' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { level: 3, name: 'Disponibilidade' })).toBeInTheDocument()
    // Sem «Mostrar dados pessoais» (D-08).
    expect(screen.queryByText(/Mostrar dados/i)).toBeNull()
  })

  it('valores longos inteiros, com break-words, sem truncate/line-clamp (E3 long-text)', async () => {
    const longo = 'Rua '.repeat(60) + 'Final'
    const container = await montar({ cadastro: { ...CHEIO, logradouro: longo }, disponibilidade: null })
    expect(valor('Logradouro').textContent).toBe(longo)
    for (const dd of Array.from(container.querySelectorAll('dd'))) {
      expect(dd.className).toMatch(/break-(words|all)/)
      expect(dd.className).not.toMatch(/truncate|line-clamp/)
    }
  })

  it('cadastro: null → a frase de vazio, sem causa e sem ficha (E3 empty)', async () => {
    const container = await montar({ cadastro: null, disponibilidade: null })
    expect(
      screen.getByText('Não há dados de cadastro disponíveis para esta candidatura.'),
    ).toBeInTheDocument()
    expect(container.querySelector('dl')).toBeNull()
    expect(screen.queryByTestId('hub-dados-cadastro')).toBeNull()
  })
})

describe('DadosCadastroBloco — campos ausentes (52-10 / E3 partial)', () => {
  it('todo campo nulo → «Não informado»; nenhum —, null, undefined ou célula vazia', async () => {
    const container = await montar({ cadastro: cadastro({}), disponibilidade: null })
    const dds = Array.from(container.querySelectorAll('dd'))
    expect(dds.length).toBe(ORDEM.length - 1)
    for (const dd of dds) {
      expect(dd).toHaveTextContent(/^Não informado$/)
    }
    expect(container.textContent).not.toMatch(/—|\bnull\b|\bundefined\b/)
  })

  it('«Detalhes de como conheceu» some quando nulo ou vazio', async () => {
    await montar({ cadastro: cadastro({ como_conheceu: 'instagram', como_conheceu_detalhes: '  ' }), disponibilidade: null })
    expect(screen.queryByText('Detalhes de como conheceu')).toBeNull()
    expect(valor('Como conheceu a vaga')).toHaveTextContent('Instagram')
  })

  it('disponibilidade: valores em caixa mista mapeados; Início sem dado → «Não informado»', async () => {
    await montar({
      cadastro: cadastro({ nome_completo: 'Fulana' }),
      disponibilidade: { ...DISP_VAZIA, periodo_disponivel: 'Integral', regime_trabalho: 'presencial' },
    })
    expect(valor('Turno preferido')).toHaveTextContent('Integral')
    expect(valor('Modelo de trabalho')).toHaveTextContent('Presencial')
    expect(valor('Início')).toHaveTextContent(/^Não informado$/)
  })

  it('sem linha de disponibilidade → os três pares «Não informado» (o sub-bloco não some)', async () => {
    await montar({ cadastro: cadastro({ nome_completo: 'Fulana' }), disponibilidade: null })
    expect(screen.getByRole('heading', { level: 3, name: 'Disponibilidade' })).toBeInTheDocument()
    for (const r of ['Turno preferido', 'Modelo de trabalho', 'Início']) {
      expect(valor(r)).toHaveTextContent(/^Não informado$/)
    }
  })

  it('disponibilidade imediata → «Imediato»', async () => {
    await montar({
      cadastro: cadastro({ nome_completo: 'Fulana' }),
      disponibilidade: { ...DISP_VAZIA, disponibilidade_imediata: true },
    })
    expect(valor('Início')).toHaveTextContent('Imediato')
  })
})

describe('DadosCadastroBloco — fictício/anonimizado e campo livre (52-10 / D-40, T-52-71)', () => {
  it('fictício (email null, celular gravado): celular como texto puro, sem link nem botão', async () => {
    await montar({
      cadastro: cadastro({
        nome_completo: 'Candidato Fictício',
        email: null,
        celular: '11987654321',
        linkedin_url: null,
        instagram_url: null,
      }),
      disponibilidade: null,
    })
    const bloco = screen.getByTestId('hub-dados-cadastro')
    expect(valor('Celular').textContent).toMatch(/98765-?4321/)
    expect(valor('E-mail')).toHaveTextContent(/^Não informado$/)
    expect(bloco.querySelector('a[href^="tel:"]')).toBeNull()
    expect(bloco.querySelector('a[href*="wa.me"]')).toBeNull()
    expect(bloco.querySelector('a[href^="mailto:"]')).toBeNull()
    expect(bloco.querySelector('button')).toBeNull()
  })

  it('e-mail marcado (@INVALIDO.LOCAL) chegando mesmo assim → «Não informado», celular segue texto', async () => {
    await montar({
      cadastro: cadastro({ email: 'X@INVALIDO.LOCAL ', celular: '11987654321' }),
      disponibilidade: null,
    })
    expect(valor('E-mail')).toHaveTextContent(/^Não informado$/)
    expect(screen.getByTestId('hub-dados-cadastro').textContent).not.toMatch(/invalido\.local/i)
    expect(valor('Celular').textContent).toMatch(/98765-?4321/)
  })

  it('nenhum link na ficha: LinkedIn/Instagram com URL aparecem como texto (o link é do 52-24)', async () => {
    await montar({
      cadastro: cadastro({ linkedin_url: 'https://linkedin.com/in/x', instagram_url: 'https://instagram.com/x' }),
      disponibilidade: null,
    })
    const bloco = screen.getByTestId('hub-dados-cadastro')
    expect(bloco.querySelector('a')).toBeNull()
    expect(valor('Instagram')).toHaveTextContent('https://instagram.com/x')
  })

  it('campo livre com marcação vira texto — sem elemento novo (T-52-71)', async () => {
    const container = await montar({
      cadastro: cadastro({
        logradouro: '<script>alert(1)</script>',
        complemento: '<img src=x onerror=alert(1)>',
        como_conheceu_detalhes: 'javascript:alert(1)',
      }),
      disponibilidade: null,
    })
    expect(container.querySelector('script')).toBeNull()
    expect(container.querySelector('img')).toBeNull()
    expect(valor('Logradouro').textContent).toBe('<script>alert(1)</script>')
    expect(within(valor('Detalhes de como conheceu')).queryByRole('link')).toBeNull()
  })
})
