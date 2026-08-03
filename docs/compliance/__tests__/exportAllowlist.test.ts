/**
 * Phase 44 / Plano 44-03 Task 2 — o contrato congelado do `export-allowlist.json`
 * (EXPORT-02 · EXPORT-04 · EXPORT-06 · SC#3 asserção 1).
 *
 * ⚠ ESTE TESTE NÃO SUBSTITUI O SMOKE SQL, E A DISTINÇÃO É O MOTIVO DE ELE EXISTIR.
 * Aqui se lê o ARTEFATO COMMITADO; o `docs/compliance/sql/05-export-allowlist-drift.sql`
 * lê o CATÁLOGO DO BANCO. São universos disjuntos. Uma coluna nova em PROD não move
 * um byte deste JSON, logo nenhuma asserção deste arquivo pode falhar por causa dela —
 * e essa é literalmente a falha que o SC#3 nomeia. Este projeto já embarcou uma vez a
 * classe "guarda que era dead code" (P39/CR-02); os dois guardas existem porque cada um
 * enxerga o que o outro é estruturalmente cego para ver.
 *
 * POR QUE A LISTA É CONGELADA
 * Cada string aqui é uma coluna que sai do banco na cópia de um titular. Uma linha a
 * mais no snapshot é uma coluna a mais em TODA cópia entregue, para sempre. O snapshot
 * inline (e não `.snap`) põe esse diff no meio do PR, no arquivo que o revisor já está
 * lendo — o `.snap` externo é o arquivo que ninguém abre.
 *
 * POR QUE AS ASSERÇÕES NEGATIVAS NÃO SÃO SNAPSHOT
 * `vitest -u` reescreve qualquer snapshot sem perguntar. Se a rede inteira fosse
 * snapshot, um `-u` distraído aprovaria um segredo entrando na cópia. As asserções (c)
 * e (d) são nomeadas, uma por token/coluna, e SOBREVIVEM a um `-u`: falham com o nome
 * do token no output, não dentro de um diff de 364 linhas.
 *
 * POR QUE OS TOKENS PROIBIDOS SÃO MONTADOS EM RUNTIME
 * Idioma estabelecido no 42-11: escrever `'smtp_senha_encrypted'` literalmente dentro
 * do arquivo que o proíbe faz o literal proibido passar a existir — e um grep repo-wide
 * de auditoria bate no próprio guarda. Montar por `join('_')` mantém a asserção real
 * sem plantar a string.
 *
 * ⚠ `readFileSync`, nunca `import`. O teste tem de continuar valendo se o artefato
 * mudar de forma (e o `.ts` espelho é comparado como DADO, não como módulo).
 *
 * @see docs/compliance/sql/gen-export-allowlist.cjs (o gerador — os artefatos são saída de máquina)
 * @see docs/compliance/sql/05-export-allowlist-drift.sql (o outro guarda do SC#3)
 * @see src/features/revisao/services/__tests__/revisaoService.test.ts (o molde da allowlist congelada com negativas nomeadas)
 * @see .planning/phases/44-exporta-o-acesso/44-03-PLAN.md Task 2
 */
import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const REPO = resolve(__dirname, '..', '..', '..')
const CAMINHO_JSON = resolve(REPO, 'docs/compliance/export-allowlist.json')
const CAMINHO_TS = resolve(REPO, 'supabase/functions/_shared/exportAllowlist.ts')
const CAMINHO_CATALOGO = resolve(REPO, 'docs/compliance/catalogo-vivo-44.json')

interface TabelaAllowlist {
  chave_titular: string
  ligacao: string
  razao: string
  colunas: string[]
  proveniencia: Record<string, string>
  colunas_excluidas: Record<string, string>
}

interface Allowlist {
  meta: {
    versao: string
    medido_em: string
    consumidores: string[]
    escopo_declarado_nao_vivo: string[]
    totais: Record<string, number>
  }
  tabelas: Record<string, TabelaAllowlist>
  excluidas: Record<string, string>
}

const allowlist = (): Allowlist => JSON.parse(readFileSync(CAMINHO_JSON, 'utf8'))

/** `['tabela.coluna', …]` ordenado — o conjunto achatado do que sai na cópia. */
function chavesAchatadas(): string[] {
  const a = allowlist()
  return Object.entries(a.tabelas)
    .flatMap(([tabela, t]) => t.colunas.map((coluna) => `${tabela}.${coluna}`))
    .sort()
}

// Tokens de segredo e de telemetria montados em runtime — ver docblock.
const TOKENS_PROIBIDOS: ReadonlyArray<readonly [string, string]> = [
  ['telemetria de LLM (prompt, custo, raw_response)', ['ai', 'call', 'logs'].join('_')],
  ['custo diário de LLM', ['ai', 'cost', 'daily'].join('_')],
  ['credencial SMTP', ['smtp', 'senha', 'encrypted'].join('_')],
  ['segredo de webhook', ['webhook', 'secret'].join('_')],
  ['token de sessão', ['session', 'token'].join('_')],
  ['hash anti-duplicata de CPF/e-mail', ['hash', 'cpf', 'email'].join('_')],
  ['PII de funcionário', ['usuarios', 'rh'].join('_')],
]

// As quatro colunas de consentimento versionado da Phase 43. O BD-6 mediu ZERO
// ocorrências delas no `pii-inventory.yaml`; são a dependência que o ROADMAP declara
// entre a Phase 44 e a Phase 43, e merecem falhar com o próprio nome no output.
const COLUNAS_BD6 = [
  'consent_text_version',
  'consent_text_hash',
  'consent_registrado_em',
  'autorizacao_marketing_vagas',
] as const

describe('export-allowlist.json — o contrato congelado da cópia do titular', () => {
  it('(a) o conjunto de TABELAS do export está congelado', () => {
    expect(Object.keys(allowlist().tabelas).sort()).toMatchInlineSnapshot()
  })

  it('(b) o conjunto achatado `tabela.coluna` está congelado', () => {
    expect(chavesAchatadas()).toMatchInlineSnapshot()
  })

  it('(c) NENHUM token de segredo ou de telemetria atravessa a allowlist', () => {
    // Asserção nomeada, uma por token, sobre o JSON INTEIRO serializado — não só sobre
    // as chaves. Uma razão de exclusão pode citar o token (e cita: `ai_call_logs` está
    // em `excluidas` com razão nomeada), então o alvo é `tabelas`, onde estão as colunas
    // que de fato saem.
    const projecao = JSON.stringify(allowlist().tabelas)
    for (const [rotulo, token] of TOKENS_PROIBIDOS) {
      expect(projecao, `token proibido na projeção do export — ${rotulo}: ${token}`).not.toContain(token)
    }
  })

  it('(d) as QUATRO colunas do BD-6 estão na cópia — a dependência da Phase 43, verificável', () => {
    const autorizacoes = allowlist().tabelas.autorizacoes
    expect(autorizacoes, 'a tabela `autorizacoes` sumiu da allowlist').toBeDefined()
    for (const coluna of COLUNAS_BD6) {
      expect(autorizacoes.colunas, `coluna do BD-6 ausente da cópia: autorizacoes.${coluna}`).toContain(coluna)
    }
  })

  it('(e) `meta` declara a Phase 45 como consumidora e carrega versão semântica (SC#5)', () => {
    const meta = allowlist().meta
    expect(JSON.stringify(meta.consumidores)).toContain('Phase 45')
    expect(meta.versao).toMatch(/^\d+\.\d+\.\d+$/)
  })

  it('(f) `meta.medido_em` é idêntico ao do catálogo commitado (proveniência, T-44-13)', () => {
    const catalogo = JSON.parse(readFileSync(CAMINHO_CATALOGO, 'utf8'))
    const medido = allowlist().meta.medido_em
    expect(medido).toBe(catalogo.meta.medido_em)
    expect(Number.isNaN(Date.parse(medido))).toBe(false)
  })

  it('(g) toda tabela do export tem `chave_titular` não-vazia', () => {
    for (const [tabela, t] of Object.entries(allowlist().tabelas)) {
      // Chave vazia produziria leitura vazia SILENCIOSA em runtime: um export
      // honesto por acidente de estar em branco.
      expect(t.chave_titular, `chave_titular vazia em \`${tabela}\``).toBeTruthy()
      expect(t.colunas, `\`${tabela}\` entrou na allowlist sem coluna nenhuma`).not.toHaveLength(0)
      expect(t.colunas, `\`${tabela}\` não projeta a própria chave \`${t.chave_titular}\``).toContain(t.chave_titular)
    }
  })

  it('(h) o espelho `_shared/exportAllowlist.ts` está em sincronia com o `.json`', () => {
    // Dois artefatos, uma fonte. O modo de falha de ter dois é um apodrecer calado —
    // e é o `.ts` que a Edge Function importa, então o que apodrece é o que executa.
    const ts = readFileSync(CAMINHO_TS, 'utf8')
    const corpo = ts.slice(ts.indexOf('{'), ts.lastIndexOf('}') + 1)
    expect(JSON.parse(corpo)).toEqual(allowlist())
  })

  it('(i) `solicitacoes_dados` nunca some do radar: ou está na cópia, ou está declarada não-viva', () => {
    // A tabela é declarada em `escopo_titular` e nasce no 44-04. Hoje ela não existe no
    // catálogo, logo nenhuma coluna dela entra — e o risco não é vazamento, é ESQUECIMENTO:
    // a allowlist ser regerada depois do 44-04 sem que ninguém dê veredito às colunas dela.
    // A asserção é estável nos dois lados do 44-04 de propósito: falha só se a tabela
    // desaparecer das DUAS listas, que é exatamente o silêncio a evitar.
    const a = allowlist()
    const presente = Object.keys(a.tabelas).includes('solicitacoes_dados')
    const declaradaNaoViva = (a.meta.escopo_declarado_nao_vivo ?? []).includes('solicitacoes_dados')
    expect(
      presente || declaradaNaoViva,
      '`solicitacoes_dados` sumiu da allowlist E de `meta.escopo_declarado_nao_vivo`',
    ).toBe(true)
  })
})
