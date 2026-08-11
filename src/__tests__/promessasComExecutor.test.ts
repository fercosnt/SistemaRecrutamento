/**
 * Phase 47 / Plano 47-09 Task 1 — CONSOL-04: **toda promessa de retenção ou exclusão
 * tem código vivo que a executa**, e o dia em que uma delas perder o executor esta
 * suíte reprova NOMEANDO a promessa.
 *
 * ── POR QUE ISTO É UM TESTE E NÃO UM DOCUMENTO ──────────────────────────────
 * O SC#3 do ROADMAP pede um *checklist versionado*. Um documento que lista promessas
 * apodrece em silêncio: ninguém o roda, ninguém percebe quando ele fica falso, e o dia
 * em que uma promessa perde o executor o documento continua afirmando que ela o tem.
 * Um teste reprova. É a diferença entre declarar conformidade e ser observável.
 *
 * ── AS DUAS METADES, E POR QUE NENHUMA SOZINHA RESOLVE ──────────────────────
 * **Metade 1 — o registro curado** (`REGISTRO`, logo abaixo). Uma linha por promessa
 * NOMEADA, com quatro campos: a promessa, onde ela é feita, o executor esperado e a
 * prova — uma função que lê o disco e devolve verdadeiro ou falso. Ela é a única metade
 * capaz de cobrir promessa feita em COPY e em DOCUMENTO, que nenhuma varredura mecânica
 * reconhece sem virar adivinhação.
 *
 * **Metade 2 — a varredura mecânica** (`varrerPromessasOrfas`). Um registro curado,
 * sozinho, apodrece: amanhã entra uma promessa nova e ninguém a registra. A varredura
 * fecha isso pelo lado que é mecanicamente decidível — toda função do esquema próprio
 * NOMEADA EM FORMA DE CHAMADA dentro de um comentário de catálogo tem de ser criada por
 * alguma fonte SQL versionada do repositório, ou estar no registro com disposição.
 * É a promessa órfã canônica deste repositório GENERALIZADA: um comentário de tabela que
 * prometia uma função de exclusão de titular que a Phase 15 nunca escreveu.
 *
 * ── O ESCOPO É ESTREITO DE PROPÓSITO, E ISSO NÃO É TIMIDEZ ──────────────────
 * A varredura NÃO procura vocabulário livre no repositório inteiro. Ela procura
 * referência com forma de chamada, qualificada pelo esquema próprio, DENTRO de corpo de
 * comentário de catálogo. É mecanicamente decidível e é exatamente a forma do defeito
 * canônico. Ampliar para prosa produziria o portão que reprova a copy correta — e o
 * docblock do portão de copy da Phase 43 registra a lição em voz alta:
 *
 *   **um teste que reprova o comportamento correto é pior que teste nenhum, porque
 *   treina quem executa a desligá-lo.**
 *
 * Este projeto já produziu esse defeito duas vezes (P43 com o advérbio de automatismo,
 * P44 com os verbos de exclusão) e uma terceira dentro desta própria fase (o guard de
 * migration do 47-02, que casava com a própria explicação do conserto).
 *
 * ── POR QUE HÁ PROVA DE DETECÇÃO COM ENTRADA SINTÉTICA ──────────────────────
 * O precedente da Phase 43 deixou um portão VERMELHO POR DESENHO até o motor nascer. Aqui
 * não cabe: os executores nascem nesta mesma fase, poucas waves antes, e o registro está
 * verde no dia em que nasce. Um portão só observado em verde é indistinguível de um
 * portão que não olha para lugar nenhum — foi assim que a sonda do CONSOL-04 no portão de
 * copy deu FALSO POSITIVO em 2026-08-05. Por isso cada metade carrega um caso que injeta
 * uma promessa FABRICADA numa árvore temporária e exige que o relatório a NOMEIE.
 *
 * ── NENHUM LITERAL SENSÍVEL ESCRITO VERBATIM ────────────────────────────────
 * O nome da função prometida e nunca criada é montado por junção de fragmentos. Escrevê-lo
 * verbatim faria este arquivo ser mais uma superfície onde a promessa órfã aparece — e o
 * repositório passaria a ter, dentro do detector, a coisa que o detector existe para achar.
 * Idioma estabelecido no 42-11 e reforçado três vezes desde então.
 *
 * ⚠ AUSÊNCIA DE ARQUIVO OU DIRETÓRIO É ZERO OCORRÊNCIA, NUNCA ERRO DE LEITURA. Um
 * `readdirSync` sobre caminho inexistente trocaria "a superfície está limpa" por "a suíte
 * quebrou", que são fatos opostos.
 *
 * @see .planning/phases/47-transpar-ncia-consolida-o/47-09-PLAN.md
 * @see src/__tests__/copyPortoesLgpd.test.ts (o molde e os quatro idiomas dele)
 * @see docs/compliance/__tests__/portoesInvocados.test.ts (o detector anti-portão-órfão, 47-01)
 */
import { describe, it, expect } from 'vitest'
import { existsSync, mkdtempSync, readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'

const RAIZ = resolve(__dirname, '../..')
const MIGRACOES = join(RAIZ, 'supabase/migrations')
const ESQUEMA_BASE = join(RAIZ, 'docs/sql/sql')
const ROADMAP = join(RAIZ, '.planning/ROADMAP.md')
const CI = join(RAIZ, '.github/workflows/ci.yml')
const PACOTE = join(RAIZ, 'package.json')
const GERADORES = join(RAIZ, 'docs/compliance/sql')

/**
 * As fontes SQL versionadas que CRIAM objeto neste repositório. São duas e ambas contam:
 * as migrations, e o esquema-base anterior à adoção de migrations (`docs/sql/sql/`), que
 * é onde vivem `usuarios_rh`, `candidatos` e `log_auditoria`. Considerar só as migrations
 * marcaria como órfãs três referências a objetos que existem — e um portão que acusa o
 * inocente é o portão que alguém desliga.
 */
const FONTES_DE_CRIACAO = [ESQUEMA_BASE, MIGRACOES]

// ─────────────────────────────────────────────────────────────────────────────
// Leitura — ausência é zero ocorrência
// ─────────────────────────────────────────────────────────────────────────────

function arquivosSql(alvo: string): string[] {
  if (!existsSync(alvo)) return []
  const achados: string[] = []
  for (const entrada of readdirSync(alvo, { withFileTypes: true })) {
    const caminho = join(alvo, entrada.name)
    if (entrada.isDirectory()) achados.push(...arquivosSql(caminho))
    else if (entrada.name.endsWith('.sql')) achados.push(caminho)
  }
  return achados.sort()
}

function ler(caminho: string): string {
  return existsSync(caminho) ? readFileSync(caminho, 'utf8') : ''
}

/** Remove comentários `--`. Nome citado em comentário NÃO é definição — menção não é execução. */
function semComentariosSql(sql: string): string {
  return sql
    .split('\n')
    .map((l) => l.replace(/--.*$/, ''))
    .join('\n')
}

/** Remove comentários `#` de YAML. Menção em prosa de workflow não conta como invocação. */
function semComentariosYaml(yaml: string): string {
  return yaml
    .split('\n')
    .map((l) => l.replace(/#.*$/, ''))
    .join('\n')
}

/**
 * Extrai os CORPOS dos comentários de catálogo (`COMMENT ON … IS '…'`).
 *
 * O corpo é consumido literal a literal porque este repositório escreve comentário longo
 * como concatenação implícita de várias strings em linhas seguidas. Um regex que parasse
 * no primeiro `;` truncaria o corpo em qualquer comentário que contenha ponto-e-vírgula,
 * e a truncagem some em silêncio — reduz a superfície varrida sem reprovar nada.
 */
function corposDeCatalogo(texto: string): { corpo: string; indice: number }[] {
  const achados: { corpo: string; indice: number }[] = []
  for (const abertura of texto.matchAll(/\bCOMMENT\s+ON\b[\s\S]{0,400}?\bIS\b/gi)) {
    let i = (abertura.index ?? 0) + abertura[0].length
    const inicio = i
    let corpo = ''
    for (;;) {
      const literal = /^\s*'((?:[^']|'')*)'/.exec(texto.slice(i))
      if (!literal) break
      corpo += literal[1]
      i += literal[0].length
    }
    if (corpo) achados.push({ corpo, indice: inicio })
  }
  return achados
}

// ─────────────────────────────────────────────────────────────────────────────
// As quatro medições do disco
// ─────────────────────────────────────────────────────────────────────────────

/** Todo objeto (função, procedimento, tabela, view) criado pelas fontes SQL de `dirs`. */
function objetosCriados(_dirs: string[] = FONTES_DE_CRIACAO): Set<string> {
  throw new Error('não implementado')
}

/** Toda referência `esquema-próprio.nome(` dentro de corpo de comentário de catálogo. */
function referenciasEmCatalogo(
  _dir: string = MIGRACOES,
): { arquivo: string; funcao: string; linha: number }[] {
  throw new Error('não implementado')
}

/** O corpo da ÚLTIMA definição de `nome` — a que vale hoje, não a primeira que existiu. */
function ultimaDefinicaoDeFuncao(_nome: string, _dirs: string[] = FONTES_DE_CRIACAO): string | null {
  throw new Error('não implementado')
}

/** A fase dona de um deferimento: ela existe no roadmap, e ela ainda não foi concluída? */
function faseDona(_fase: string, _roadmap?: string): { existe: boolean; concluida: boolean } {
  throw new Error('não implementado')
}

/**
 * A varredura mecânica: referências de função em comentário de catálogo que NINGUÉM cria
 * e que NINGUÉM registrou. Cada item é uma promessa órfã, nomeada com o arquivo que a faz.
 */
function varrerPromessasOrfas(
  dir: string = MIGRACOES,
  criados: Set<string> = objetosCriados(),
  registradas: Set<string> = nomesNoRegistro(),
): { arquivo: string; funcao: string; linha: number }[] {
  return referenciasEmCatalogo(dir).filter(
    (r) => !criados.has(r.funcao.toLowerCase()) && !registradas.has(r.funcao.toLowerCase()),
  )
}

function relatarOrfas(orfas: { arquivo: string; funcao: string; linha: number }[]): string {
  return orfas
    .map((o) => `  ${o.arquivo.replace(`${RAIZ}/`, '')}:${o.linha} → promete «${o.funcao}»`)
    .join('\n')
}

// ─────────────────────────────────────────────────────────────────────────────
// METADE 1 — o registro curado
// ─────────────────────────────────────────────────────────────────────────────

/**
 * As TRÊS disposições, e só três.
 *
 * - `executor-vivo` — o executor existe e a prova o encontra no disco.
 * - `superada` — a promessa foi feita num artefato antigo e um artefato mais novo a
 *   substitui. A prova confere as DUAS coisas: o artefato novo existe **e** o texto da
 *   promessa antiga não sobrevive nele.
 * - `deferida` — o executor legitimamente ainda não existe e há uma FASE DONA nomeada. A
 *   prova lê o roadmap e exige que a fase exista e não esteja concluída. É isso que faz a
 *   entrada virar vermelha AUTOMATICAMENTE se aquela fase fechar sem cumprir: um
 *   deferimento sem prazo é uma promessa órfã com etiqueta melhor.
 */
type Disposicao = 'executor-vivo' | 'superada' | 'deferida'

interface Promessa {
  /** A promessa, em prosa curta — é o que o relatório de falha NOMEIA. */
  readonly promessa: string
  /** Onde ela é feita: caminho, e linha quando útil. */
  readonly onde: string
  /** O executor esperado, descrito de forma que dê para procurar. */
  readonly executorEsperado: string
  readonly disposicao: Disposicao
  /**
   * O nome de função que esta entrada RESPONDE, quando há um. É o que liga a metade 2 à
   * metade 1: uma referência em comentário de catálogo que aparece aqui deixa de ser órfã,
   * porque passa a ter disposição escrita.
   */
  readonly funcaoPrometida?: string
  /** Só para `deferida`: a fase dona, como ela aparece no roadmap. */
  readonly faseDona?: string
  /** A prova, lida do disco. `ok: false` reprova NOMEANDO a promessa e o que faltou. */
  readonly prova: () => { ok: boolean; detalhe: string }
}

/**
 * ⚠ Montado por junção de fragmentos — ver o aviso do cabeçalho. Este é o nome da função
 * de exclusão de titular que o comentário de catálogo de `data_deletion_log` prometeu em
 * 2026-06-09, deferida a uma fase que a criaria, e que nunca foi criada.
 */
const NOME_PROMETIDO_ORFAO = ['delete', '_candidate', '_data'].join('')

/** A frase que os dois diálogos afirmam ao operador. Fragmentada por disciplina do arquivo. */
const FRASE_TRILHA = ['registrad', 'a na trilha de auditoria'].join('')

/** O que um gerador afirma no cabeçalho que ele emite — a promessa cujo executor é o portão. */
const CLAIM_GERADOR = ['reprova ', 'qualquer ', 'diverg'].join('')

/** A chamada que torna verdadeira a frase dos dois diálogos. */
const CHAMADA_AUDITORIA = ['log', '_auditoria'].join('')

const REGISTRO: readonly Promessa[] = [
  {
    promessa:
      'o comentário de catálogo de `data_deletion_log` prometia uma função de exclusão de ' +
      'titular deferida à Phase 15 — a PROMESSA ÓRFÃ CANÔNICA deste repositório, viva desde ' +
      '2026-06-09 e a semente do CONSOL-04',
    onde: 'supabase/migrations/20260609000001_prompt_library_schema.sql (COMMENT ON TABLE)',
    executorEsperado:
      'nenhum — a promessa foi SUPERADA pelo comentário corrigido em 47-03, que nomeia o ' +
      'motor real de exclusão de titular (a RPC de anonimização da Phase 45)',
    disposicao: 'superada',
    funcaoPrometida: NOME_PROMETIDO_ORFAO,
    prova: () => {
      const nova = join(MIGRACOES, '20260809000002_p47_adotar_data_deletion_log.sql')
      if (!existsSync(nova))
        return { ok: false, detalhe: 'a migration que supera a promessa não existe no disco' }

      const corpos = corposDeCatalogo(ler(nova))
        .map((c) => c.corpo)
        .join('\n')
      if (corpos.includes(NOME_PROMETIDO_ORFAO))
        return {
          ok: false,
          detalhe:
            'o comentário NOVO reintroduz o nome prometido — nem para negá-lo: uma oração de ' +
            'contraste devolve a string ao catálogo e faz o portão casar com a explicação do conserto',
        }

      if (objetosCriados().has(NOME_PROMETIDO_ORFAO.toLowerCase()))
        return {
          ok: false,
          detalhe:
            'a função prometida PASSOU A EXISTIR — a disposição correta deixou de ser «superada» ' +
            'e virou «executor-vivo». Reclassificar a entrada, não apagá-la',
        }

      const antiga = join(MIGRACOES, '20260609000001_prompt_library_schema.sql')
      if (!ler(antiga).includes(NOME_PROMETIDO_ORFAO))
        return {
          ok: false,
          detalhe:
            'a promessa sumiu do artefato HISTÓRICO — esta entrada perdeu o objeto e precisa de ' +
            'outro, ou alguém reescreveu história de migration',
        }

      return { ok: true, detalhe: 'superada: o comentário novo existe e não reintroduz o nome' }
    },
  },
  {
    promessa:
      '«a alteração fica registrada na trilha de auditoria» — dito ao administrador no diálogo ' +
      'que edita a janela de retenção',
    onde: 'src/features/admin/retencao/components/EditarJanelaDialog.tsx',
    executorEsperado:
      'a chamada à trilha canônica DENTRO do corpo de `salvar_janela_retencao`, na mesma transação',
    disposicao: 'executor-vivo',
    prova: () => {
      const copy = ler(join(RAIZ, 'src/features/admin/retencao/components/EditarJanelaDialog.tsx'))
      if (!copy.includes(FRASE_TRILHA))
        return {
          ok: false,
          detalhe:
            'a promessa sumiu da copy — se ela foi retirada de propósito, retire também esta ' +
            'entrada; se sumiu por acidente, a tela parou de dizer o que o banco faz',
        }
      const corpo = ultimaDefinicaoDeFuncao('salvar_janela_retencao')
      if (corpo === null)
        return { ok: false, detalhe: 'a função que salva a janela não é definida por fonte alguma' }
      if (!corpo.includes(CHAMADA_AUDITORIA))
        return {
          ok: false,
          detalhe:
            'a ÚLTIMA definição da função não audita — a copy promete uma trilha que a versão ' +
            'vigente não escreve',
        }
      return { ok: true, detalhe: 'a definição vigente audita na trilha canônica' }
    },
  },
  {
    promessa:
      '«esta ação é registrada na trilha de auditoria» — dito ao administrador no diálogo que ' +
      'reativa uma versão de prompt',
    onde: 'src/features/admin/prompt-versions/components/PromptVersionsPage.tsx',
    executorEsperado:
      'a chamada à trilha canônica DENTRO do corpo de `rollback_to_version`, acrescentada em 47-03',
    disposicao: 'executor-vivo',
    prova: () => {
      const copy = ler(
        join(RAIZ, 'src/features/admin/prompt-versions/components/PromptVersionsPage.tsx'),
      )
      if (!copy.includes(FRASE_TRILHA))
        return { ok: false, detalhe: 'a promessa sumiu da copy do diálogo de reativação' }
      const corpo = ultimaDefinicaoDeFuncao('rollback_to_version')
      if (corpo === null)
        return { ok: false, detalhe: 'a RPC de reativação não é definida por fonte alguma' }
      if (!corpo.includes(CHAMADA_AUDITORIA))
        return {
          ok: false,
          detalhe:
            'a ÚLTIMA definição da RPC não audita na trilha canônica — a adoção do 47-03 foi ' +
            'revertida, e a copy voltou a apontar para uma tabela que nenhuma tela lê',
        }
      return { ok: true, detalhe: 'a definição vigente audita na trilha canônica' }
    },
  },
  {
    promessa:
      'cada gerador de compliance afirma, no cabeçalho que ele mesmo emite, que a conferência ' +
      'reprova qualquer divergência — uma promessa de AUTORIDADE feita em docblock',
    onde: 'docs/compliance/sql/*.cjs (cabeçalho emitido nos artefatos gerados)',
    executorEsperado:
      'o portão `check:` correspondente INVOCADO no fluxo de integração contínua — um script ' +
      'que ninguém executa não é executor, e essa é a entrada que fecha o laço desta fase',
    disposicao: 'executor-vivo',
    prova: () => {
      const geradores = existsSync(GERADORES)
        ? readdirSync(GERADORES).filter((f) => f.endsWith('.cjs'))
        : []
      const afirmam = geradores.filter((f) => ler(join(GERADORES, f)).includes(CLAIM_GERADOR))
      if (afirmam.length === 0)
        return {
          ok: false,
          detalhe:
            'nenhum gerador afirma a autoridade — esta entrada perdeu o objeto. Se a afirmação ' +
            'foi retirada, retire a entrada; ela não pode passar por vacuidade',
        }

      const scripts: Record<string, string> = JSON.parse(ler(PACOTE) || '{}').scripts ?? {}
      const ciSemComentario = semComentariosYaml(ler(CI))
      const semPortao: string[] = []

      for (const gerador of afirmam) {
        const nome = Object.keys(scripts).find(
          (k) => k.startsWith('check:') && scripts[k].includes(gerador),
        )
        if (!nome) {
          semPortao.push(`${gerador}: nenhum script \`check:\` o executa`)
          continue
        }
        if (!new RegExp(`npm\\s+run\\s+(-s\\s+)?${nome.replace(':', ':')}\\b`).test(ciSemComentario))
          semPortao.push(
            `${gerador}: o script \`${nome}\` existe mas NÃO é invocado no fluxo de integração contínua`,
          )
      }

      return semPortao.length === 0
        ? {
            ok: true,
            detalhe: `${afirmam.length} gerador(es) afirmam autoridade e ${afirmam.length} portão(ões) os invocam no CI`,
          }
        : { ok: false, detalhe: semPortao.join('; ') }
    },
  },
  {
    promessa:
      'o comentário da coluna de autorização de análise de vídeo declarava que a decisão sobre ' +
      'ela era da Phase 47 — uma promessa endereçada a esta fase, com prazo',
    onde:
      'supabase/migrations/20260801000001_p43_consent_prova_e_marketing.sql ' +
      '(COMMENT ON COLUMN, Phase 43)',
    executorEsperado:
      'a migration de 47-03 que resolve a decisão removendo o valor padrão e a obrigatoriedade ' +
      'da coluna — sem apagar nenhum valor histórico',
    disposicao: 'executor-vivo',
    prova: () => {
      const p43 = ler(join(MIGRACOES, '20260801000001_p43_consent_prova_e_marketing.sql'))
      if (!/Phase 47/i.test(p43))
        return {
          ok: false,
          detalhe: 'o comentário que endereça a decisão a esta fase sumiu — a entrada perdeu o objeto',
        }
      const p47 = ler(join(MIGRACOES, '20260809000003_p47_consent05_analise_video.sql'))
      if (!p47) return { ok: false, detalhe: 'a migration que executa a decisão não existe no disco' }
      const alvo = /autorizacao_analise_video\s+DROP\s+DEFAULT/i.test(p47)
      const obrig = /autorizacao_analise_video\s+DROP\s+NOT\s+NULL/i.test(p47)
      if (!alvo || !obrig)
        return {
          ok: false,
          detalhe:
            `a migration existe mas não executa a decisão inteira ` +
            `(valor padrão removido: ${alvo}; obrigatoriedade removida: ${obrig})`,
        }
      return { ok: true, detalhe: 'a decisão foi tomada e está escrita como alteração de coluna' }
    },
  },
  {
    promessa:
      'o comentário de catálogo do ledger de notificações declara retenção INDEFINIDA na v1, com ' +
      'a purga explicitamente deferida a este milestone',
    onde: 'supabase/migrations/20260721000001_notificacoes_enviadas.sql (COMMENT ON TABLE)',
    executorEsperado:
      'nenhum ainda, e legitimamente: o executor é a purga automática, que é a entrega de uma ' +
      'fase que ainda não rodou. É a ÚNICA entrada do registro cujo executor não existe',
    disposicao: 'deferida',
    faseDona: 'Phase 46',
    prova: () => {
      const ledger = ler(join(MIGRACOES, '20260721000001_notificacoes_enviadas.sql'))
      const declara = corposDeCatalogo(ledger).some((c) => /retention\s+indefinite/i.test(c.corpo))
      if (!declara)
        return {
          ok: false,
          detalhe:
            'a declaração de retenção indefinida sumiu do comentário — se a política mudou, esta ' +
            'entrada precisa mudar junto',
        }
      const { existe, concluida } = faseDona('Phase 46')
      if (!existe)
        return {
          ok: false,
          detalhe:
            'a fase dona do deferimento NÃO EXISTE no roadmap. Um deferimento sem fase dona é uma ' +
            'promessa órfã com etiqueta melhor',
        }
      if (concluida)
        return {
          ok: false,
          detalhe:
            'a fase dona FECHOU e a promessa continua sem executor — este é exatamente o momento ' +
            'em que um deferimento honesto tem de virar vermelho sozinho',
        }
      return { ok: true, detalhe: 'deferimento com fase dona que existe e ainda não fechou' }
    },
  },
]

function nomesNoRegistro(): Set<string> {
  return new Set(
    REGISTRO.filter((e) => e.funcaoPrometida).map((e) => (e.funcaoPrometida as string).toLowerCase()),
  )
}

function relatarPromessa(entrada: Promessa, detalhe: string): string {
  return (
    `\nPROMESSA: ${entrada.promessa}\n` +
    `ONDE: ${entrada.onde}\n` +
    `EXECUTOR ESPERADO: ${entrada.executorEsperado}\n` +
    `DISPOSIÇÃO: ${entrada.disposicao}\n` +
    `O QUE A PROVA MEDIU: ${detalhe}\n\n` +
    `⚠ Um portão que diz apenas "uma promessa falhou" transfere para quem executa o trabalho ` +
    `que ele existe para fazer. As saídas honestas são construir o executor ou retirar a ` +
    `promessa; isentar a entrada NÃO é uma delas.`
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Metade 1 — uma linha do registro, um caso de teste
// ─────────────────────────────────────────────────────────────────────────────

describe('Metade 1 — o registro curado: toda promessa nomeada tem executor provado no disco', () => {
  for (const entrada of REGISTRO) {
    it(`${entrada.disposicao} · ${entrada.promessa.slice(0, 72)}…`, () => {
      const { ok, detalhe } = entrada.prova()
      expect(ok, relatarPromessa(entrada, detalhe)).toBe(true)
    })
  }
})

// ─────────────────────────────────────────────────────────────────────────────
// Metade 2 — a varredura que impede o registro de apodrecer
// ─────────────────────────────────────────────────────────────────────────────

describe('Metade 2 — nenhuma função prometida em comentário de catálogo fica sem criador', () => {
  it('zero promessas órfãs nas migrations do repositório', () => {
    const orfas = varrerPromessasOrfas()
    expect(
      orfas.length,
      `Um comentário de catálogo promete função que NENHUMA fonte SQL versionada cria e que ` +
        `NINGUÉM registrou. É a forma exata do defeito canônico deste repositório.\n` +
        `As saídas honestas são criar a função, corrigir o comentário, ou registrar a promessa ` +
        `em \`REGISTRO\` com disposição escrita.\n${relatarOrfas(orfas)}`,
    ).toBe(0)
  })

  it('a varredura DETECTA — uma promessa fabricada em árvore temporária é reportada NOMEANDO a função', () => {
    const arvore = mkdtempSync(join(tmpdir(), 'p47-09-promessa-'))
    const fabricada = ['purgar', '_tudo_', 'agora'].join('')
    writeFileSync(
      join(arvore, '29990101000001_sintetica.sql'),
      [
        'CREATE TABLE public.sintetica (id uuid PRIMARY KEY);',
        'COMMENT ON TABLE public.sintetica IS',
        `  'Retencao: os dados desta tabela sao apagados por public.${fabricada}(), '`,
        "  'que ninguem nunca escreveu.';",
      ].join('\n'),
    )

    const orfas = varrerPromessasOrfas(arvore, objetosCriados([arvore]), new Set())

    expect(
      orfas.map((o) => o.funcao),
      'A varredura não achou a promessa fabricada. Sem este caso o arquivo inteiro passaria por ' +
        'vacuidade no dia em que o repositório ficasse correto — que é hoje, e é o objetivo.',
    ).toContain(fabricada)
    expect(relatarOrfas(orfas)).toContain('29990101000001_sintetica.sql')
  })

  it('a varredura NÃO reprova o correto: a mesma promessa, com a função criada, sai limpa', () => {
    // O outro lado da prova. Um detector que acusa tudo é tão inútil quanto um que não acusa
    // nada — e é o que treina quem executa a desligá-lo.
    const arvore = mkdtempSync(join(tmpdir(), 'p47-09-honesta-'))
    const criada = ['purgar', '_de_', 'verdade'].join('')
    writeFileSync(
      join(arvore, '29990101000002_honesta.sql'),
      [
        `CREATE OR REPLACE FUNCTION public.${criada}() RETURNS void AS $$ BEGIN END; $$ LANGUAGE plpgsql;`,
        'COMMENT ON TABLE public.honesta IS',
        `  'Retencao: os dados desta tabela sao apagados por public.${criada}().';`,
      ].join('\n'),
    )
    expect(varrerPromessasOrfas(arvore, objetosCriados([arvore]), new Set())).toEqual([])
  })

  it('menção em comentário `--` NÃO conta como criação — a lição do falso positivo de 2026-08-05', () => {
    const arvore = mkdtempSync(join(tmpdir(), 'p47-09-mencao-'))
    const mencionada = ['apagar', '_por_', 'mencao'].join('')
    writeFileSync(
      join(arvore, '29990101000003_mencao.sql'),
      [
        `-- CREATE FUNCTION public.${mencionada}() — citada, jamais escrita.`,
        'COMMENT ON TABLE public.x IS',
        `  'Os dados sao apagados por public.${mencionada}().';`,
      ].join('\n'),
    )
    const orfas = varrerPromessasOrfas(arvore, objetosCriados([arvore]), new Set())
    expect(
      orfas.map((o) => o.funcao),
      'Uma definição CITADA em comentário satisfez o portão. Menção não é execução — foi assim ' +
        'que a sonda do CONSOL-04 no portão de copy deu falso positivo.',
    ).toContain(mencionada)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// A disposição de deferimento — a que precisa de prazo para não ser etiqueta
// ─────────────────────────────────────────────────────────────────────────────

describe('Deferimento com prazo: a fase dona é conferida contra o roadmap, nos dois sentidos', () => {
  it('fase inexistente e fase já concluída REPROVAM — medido contra roadmaps sintéticos', () => {
    const roadmapReal = ler(ROADMAP)
    expect(roadmapReal.length, 'o roadmap não foi lido — a prova perdeu o objeto').toBeGreaterThan(0)

    // 1 · A fase dona real: existe e está aberta. É por isso que a entrada 6 passa hoje.
    expect(faseDona('Phase 46', roadmapReal)).toEqual({ existe: true, concluida: false })

    // 2 · Fase que não existe → reprova. Um deferimento pode apontar para lugar nenhum.
    expect(faseDona('Phase 999', roadmapReal).existe).toBe(false)

    // 3 · Fase JÁ CONCLUÍDA → reprova. Este é o caso que faz o deferimento virar vermelho
    //     sozinho, e ele não tem objeto real no roadmap de hoje (todas as fases do milestone
    //     estão abertas). Sem o roadmap sintético a asserção seria inalcançável — e asserção
    //     inalcançável contando como verde é a lição W-1 da Phase 43.
    const sintetico = '- [x] **Phase 46: Purga Automática (dry-run → live)** - concluída\n'
    expect(faseDona('Phase 46', sintetico)).toEqual({ existe: true, concluida: true })

    // 4 · E a entrada deferida do registro nomeia mesmo uma fase dona.
    const deferidas = REGISTRO.filter((e) => e.disposicao === 'deferida')
    expect(deferidas.length, 'a disposição «deferida» perdeu seu exemplar').toBeGreaterThan(0)
    for (const e of deferidas)
      expect(e.faseDona, `a entrada «${e.promessa.slice(0, 40)}…» defere sem fase dona`).toBeTruthy()
  })

  it('as três disposições existem e cada uma está exercitada por pelo menos uma entrada', () => {
    const usadas = new Set(REGISTRO.map((e) => e.disposicao))
    for (const d of ['executor-vivo', 'superada', 'deferida'] as Disposicao[])
      expect(usadas.has(d), `a disposição «${d}» não é exercitada por entrada nenhuma`).toBe(true)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// O portão que guarda o portão
// ─────────────────────────────────────────────────────────────────────────────

describe('Auto-consistência — este arquivo não pode ser sua própria primeira ocorrência', () => {
  it('o nome da promessa órfã não é escrito verbatim, e ausência conta como zero ocorrência', () => {
    const esteArquivo = readFileSync(__filename, 'utf8')
    const fragmentos = esteArquivo.split(NOME_PROMETIDO_ORFAO)
    expect(
      fragmentos.length,
      'o nome da função órfã aparece VERBATIM neste arquivo. Um detector que contém a coisa que ' +
        'detecta é auto-invalidante — monte-o por junção de fragmentos.',
    ).toBe(1)

    // Ausência é zero ocorrência, nunca erro de leitura.
    expect(arquivosSql(join(RAIZ, '__nao_existe__'))).toEqual([])
    expect(ler(join(RAIZ, '__nao_existe__.sql'))).toBe('')
    expect(() => varrerPromessasOrfas(join(RAIZ, '__nao_existe__'))).not.toThrow()

    // E os removedores REMOVEM — prova direta, sem depender do estado do repositório.
    expect(semComentariosSql('-- CREATE FUNCTION public.x').trim()).toBe('')
    expect(semComentariosYaml('  # - run: npm run check:x').trim()).toBe('')
    expect(corposDeCatalogo("COMMENT ON TABLE t IS 'a' 'b';")[0].corpo).toBe('ab')
  })
})
