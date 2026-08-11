/**
 * Phase 47 / Plano 47-09 Task 2 — TRANSP-01: a lista pública de empresas contratadas
 * confrontada com os DESTINOS DE REDE que o repositório declara.
 *
 * ── O RISCO NÃO É A PÁGINA FICAR ERRADA — É ELA FICAR INCOMPLETA EM SILÊNCIO ─
 * Uma ficha errada alguém corrige, porque alguém a lê e estranha. Uma ficha AUSENTE não
 * tem quem a estranhe: a página continua dizendo "estas são as empresas com quem
 * compartilhamos", e a frase vira falsa sem que nenhum caractere mude. Foi exatamente o
 * que aconteceu com o parêntese do roadmap, que nomeava QUATRO empresas quando a varredura
 * do código vivo encontrava SEIS.
 *
 * Este teste é o backstop que a 47-UI-SPEC nomeia (§UI Considerations, E3 · error): um
 * fornecedor novo no código, sem ficha e sem decisão registrada, reprova a suíte NOMEANDO
 * o destino e o arquivo.
 *
 * ── A ASSERÇÃO É RELACIONAL, JAMAIS DE CONTAGEM ─────────────────────────────
 * "São seis empresas" passaria hoje e apodreceria no primeiro fornecedor novo — que é
 * PRECISAMENTE o modo de falha que este teste existe para pegar. Um portão que reprova no
 * dia em que o defeito aparece é um portão; um portão que passa naquele dia é decoração.
 * Então a asserção é sempre: **todo destino encontrado tem ficha ou decisão registrada.**
 *
 * ── A COMPARAÇÃO É DE MÃO ÚNICA, E ISSO É DELIBERADO ────────────────────────
 * Destino encontrado ⟹ ficha ou decisão. NÃO o inverso. Uma ficha sem destino literal
 * correspondente é o caso normal, não um defeito: o provedor de infraestrutura e o de
 * hospedagem chegam por variável de ambiente e por configuração de plataforma, e nunca
 * aparecem como literal no código. Exigir o inverso reprovaria as duas fichas mais
 * verdadeiras da lista.
 *
 * ── AS TRÊS DISPOSIÇÕES DE UM DESTINO SEM FICHA ─────────────────────────────
 * `nao-trata-dado-de-candidato` — a razão escrita explica por que aquele destino não é
 * empresa contratada que trata dado de candidato. Registro de módulo, biblioteca executada
 * localmente, domínio da própria aplicação, identificador de namespace que nunca é
 * requisitado, texto de exemplo, link que a própria pessoa clica.
 *
 * `pendente-de-decisao` — ⚠ o destino EXISTE, é vivo, e a classificação dele **não é
 * decisão de quem escreve teste**. A entrada registra o FATO MEDIDO e a ROTA, nunca um
 * veredito. Ver o bloco grande sobre isso logo acima de `DECISOES`.
 *
 * ── O ESCOPO É DECLARADO E ESTREITO ─────────────────────────────────────────
 * A varredura lê `src/` e as funções de borda, **fora de comentário** e **fora de arquivo
 * de teste**. As duas exclusões têm razão e nenhuma delas é conveniência:
 *
 *   · Comentário — uma URL de documentação citada num docblock não é destino de rede. Sem
 *     essa exclusão o portão acusaria a documentação do próprio framework e alguém o
 *     desligaria na primeira semana.
 *   · Arquivo de teste — as fixtures deste repositório contêm hosts hostis DE PROPÓSITO
 *     (o guard de redirecionamento aberto, o guard de vazamento no pacote). Elas são o
 *     oposto de um destino: são a prova de que aquele destino é RECUSADO.
 *
 * ⚠ O REMOVEDOR DE COMENTÁRIO NÃO PODE COMER A URL. Um removedor ingênuo de comentário de
 * linha casa com as duas barras de `https://` e apaga o resto da linha — a varredura fica
 * VERDE por cegueira, que é o pior desfecho possível para este arquivo. Foi medido
 * acontecendo enquanto este teste era escrito. Ver `semComentarios`.
 *
 * ⚠ NENHUM VALOR DE CREDENCIAL É LIDO, IMPRESSO OU ASSERIDO. O relatório de falha nomeia
 * CAMINHO e DESTINO — nunca o trecho bruto da linha, que pode carregar segredo ao lado da
 * URL. Há um caso que prova essa propriedade com um segredo fabricado (T-47-09-06).
 *
 * @see .planning/phases/47-transpar-ncia-consolida-o/47-09-PLAN.md
 * @see src/features/transparencia/constants/subprocessadores.ts (a lista publicada, 47-04)
 */
import { describe, it, expect } from 'vitest'
import { existsSync, mkdtempSync, readdirSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { SUBPROCESSADORES } from '@/features/transparencia/constants/subprocessadores'

const RAIZ = resolve(__dirname, '../..')
const SRC = join(RAIZ, 'src')
const BORDA = join(RAIZ, 'supabase/functions')

const EXTENSOES = ['.ts', '.tsx']
const IGNORADOS = new Set(['node_modules', 'dist', 'build', '.git', 'coverage', '__tests__'])

// ─────────────────────────────────────────────────────────────────────────────
// Varredura — ausência é zero ocorrência, nunca erro de leitura
// ─────────────────────────────────────────────────────────────────────────────

function varrer(alvo: string): string[] {
  if (!existsSync(alvo)) return []
  const achados: string[] = []
  for (const entrada of readdirSync(alvo, { withFileTypes: true })) {
    if (IGNORADOS.has(entrada.name)) continue
    const caminho = join(alvo, entrada.name)
    if (entrada.isDirectory()) achados.push(...varrer(caminho))
    else if (EXTENSOES.some((e) => entrada.name.endsWith(e)) && !/\.test\.tsx?$/.test(entrada.name))
      achados.push(caminho)
  }
  return achados.sort()
}

function dobrar(texto: string): string {
  return texto
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
}

/** Só letras e dígitos — para casar destino com ficha sem depender de pontuação. */
function esqueleto(texto: string): string {
  return dobrar(texto).replace(/[^a-z0-9]/g, '')
}

interface Destino {
  /** O host, ou o especificador de pacote do provedor. Nunca a URL inteira. */
  readonly destino: string
  /** Caminho do arquivo onde ele aparece. Nunca o trecho bruto da linha. */
  readonly arquivo: string
}

/**
 * Os destinos externos declarados sob `alvos`: host de URL absoluta, e especificador de
 * pacote de provedor. Cada achado é normalizado para o HOST ou para o NOME DO PACOTE — a
 * URL completa jamais entra, porque o caminho e a query podem carregar dado.
 */
function varrerDestinos(_alvos: string[] = [SRC, BORDA]): Destino[] {
  throw new Error('não implementado')
}

/** A ficha publicada que cobre este destino, ou `null`. Casamento por esqueleto do nome. */
function fichaQueCobre(destino: string): string | null {
  const alvo = esqueleto(destino)
  for (const ficha of SUBPROCESSADORES) {
    const slug = esqueleto(ficha.nome)
    if (slug.length > 0 && alvo.includes(slug)) return ficha.nome
  }
  return null
}

// ─────────────────────────────────────────────────────────────────────────────
// As decisões registradas
// ─────────────────────────────────────────────────────────────────────────────

type DisposicaoDestino = 'nao-trata-dado-de-candidato' | 'pendente-de-decisao'

interface Decisao {
  /** O destino, exatamente como a varredura o normaliza. */
  readonly destino: string
  readonly disposicao: DisposicaoDestino
  /** A razão ESCRITA. Vazia reprova — uma decisão sem razão é uma omissão com formulário. */
  readonly razao: string
}

/**
 * ⚠⚠ SOBRE AS DUAS ENTRADAS `pendente-de-decisao`, E POR QUE ELAS NÃO SÃO UMA BRECHA
 *
 * Este teste, na primeira execução dele sobre o repositório real, produziu um ACHADO: dois
 * destinos vivos que a lista publicada não cobre. Nenhum dos dois é ruído — os dois são
 * requisição feita pelo navegador de quem visita, com o endereço de origem dessa pessoa
 * indo junto.
 *
 * E os dois são **estruturalmente idênticos** ao serviço público de consulta de endereço,
 * que a lista publicada DECIDIU incluir, com o critério escrito na própria fonte dela: a
 * chamada é disparada pela página desta empresa, e o endereço de origem do navegador vai
 * junto, ainda que o pacote não passe pelos servidores dela.
 *
 * Aplicar esse critério aqui e concluir "logo, faltam duas fichas" seria a conclusão
 * provável. **E ainda assim quem escreve teste não a registra como decisão.** Classificar
 * um destino como empresa contratada é ato do Encarregado, e o portão de publicação desta
 * fase está ABERTO — o rodapé do 47-08 foi entregue e deliberadamente não montado por essa
 * mesma razão. Escrever aqui um veredito que ninguém proferiu seria fabricar exatamente o
 * tipo de afirmação que esta fase inteira existe para eliminar: uma conformidade declarada
 * sem quem a tenha decidido.
 *
 * Então a entrada registra o FATO MEDIDO e a ROTA, e não um veredito. E ela é TRAVADA nos
 * dois sentidos por casos deste arquivo, para não virar a etiqueta melhor de uma omissão:
 *
 *   · uma pendência que GANHOU ficha reprova — ela tem de ser retirada daqui;
 *   · uma pendência cujo destino SUMIU do repositório reprova — ela perdeu o objeto;
 *   · uma pendência sem fato medido ou sem rota reprova;
 *   · e um destino NOVO não entra aqui sozinho: entrar exige editar esta constante
 *     versionada com todos os campos, que é o mesmo custo de acrescentar uma ficha.
 *
 * Medido em 2026-08-11.
 */
const DECISOES: readonly Decisao[] = [
  // ── Registro de módulo e biblioteca executada localmente ────────────────────
  {
    destino: 'esm.sh',
    disposicao: 'nao-trata-dado-de-candidato',
    razao:
      'Registro de módulos: o runtime da função de borda BAIXA CÓDIGO deste endereço na ' +
      'inicialização. O tráfego é de código para dentro, nunca de dado de candidato para fora.',
  },
  {
    destino: 'npm:zod',
    disposicao: 'nao-trata-dado-de-candidato',
    razao:
      'Biblioteca de validação de esquema, executada dentro da função de borda. Não abre rede: ' +
      'o especificador é endereço de download em tempo de inicialização, não destino de dado.',
  },
  {
    destino: 'npm:svix',
    disposicao: 'nao-trata-dado-de-candidato',
    razao:
      'Biblioteca de verificação de assinatura do webhook de entrega de e-mail, executada ' +
      'localmente. Ela CONFERE uma assinatura que chegou; não envia nada a lugar nenhum.',
  },
  {
    destino: 'npm:unpdf',
    disposicao: 'nao-trata-dado-de-candidato',
    razao:
      'Biblioteca de extração de texto de PDF, executada dentro da função de borda. O currículo ' +
      'é lido em memória ali mesmo; nenhum byte dele sai por causa desta dependência.',
  },

  // ── O domínio da própria aplicação ──────────────────────────────────────────
  {
    destino: 'recruta.beautysmile.com.br',
    disposicao: 'nao-trata-dado-de-candidato',
    razao:
      'Domínio da própria aplicação, usado para montar os links dos avisos. Compartilhar dado ' +
      'consigo mesmo não é compartilhar com terceiro.',
  },
  {
    destino: 'rh.beautysmile.com.br',
    disposicao: 'nao-trata-dado-de-candidato',
    razao:
      'Domínio da própria aplicação, na superfície interna. Mesma razão da entrada anterior.',
  },

  // ── Endereço que nunca é requisitado ────────────────────────────────────────
  {
    destino: 'www.w3.org',
    disposicao: 'nao-trata-dado-de-candidato',
    razao:
      'Identificador de namespace de imagem vetorial, exigido pela especificação do formato. ' +
      'É um NOME, não um endereço: o navegador jamais faz requisição a ele para desenhar o ícone.',
  },
  {
    destino: 'x.invalid',
    disposicao: 'nao-trata-dado-de-candidato',
    razao:
      'Domínio reservado pela RFC 2606, que por definição não resolve. Serve de base inerte para ' +
      'a análise de uma URL na guarda de redirecionamento aberto — o oposto de um destino: é a ' +
      'peça que RECUSA endereço externo.',
  },
  {
    destino: 'meet.google.com',
    disposicao: 'nao-trata-dado-de-candidato',
    razao:
      'Texto de EXEMPLO dentro do marcador de um campo de formulário, mostrando ao RH a forma ' +
      'do link de reunião que ele deve colar. Nenhuma requisição parte deste literal.',
  },
  {
    destino: 'wa.me',
    disposicao: 'nao-trata-dado-de-candidato',
    razao:
      'Endereço de compartilhamento que a própria pessoa CLICA para divulgar uma vaga, no ' +
      'aparelho dela e por decisão dela. O que segue é o link público da vaga e o texto do ' +
      'convite; nenhum dado de candidatura é montado nessa URL.',
  },

  // ── ⚠ As duas pendências. Fato medido e rota; jamais veredito. ──────────────
  {
    destino: 'api.ipify.org',
    disposicao: 'pendente-de-decisao',
    razao:
      'FATO MEDIDO (2026-08-11): o navegador de quem usa o sistema requisita este endereço para ' +
      'descobrir o próprio IP, que o sistema então grava no registro de acesso. O terceiro recebe ' +
      'o endereço de origem dessa pessoa. É a mesma forma da chamada ao serviço público de ' +
      'consulta de endereço, que a lista publicada decidiu INCLUIR com critério escrito. ' +
      'ROTA: a classificação é do Encarregado, no portão de publicação que o 47-08 deixou aberto. ' +
      'Quem escreve teste registra a medição, não o veredito.',
  },
  {
    destino: 'www.youtube.com',
    disposicao: 'pendente-de-decisao',
    razao:
      'FATO MEDIDO (2026-08-11): a página de instruções embute um quadro de vídeo de terceiro. O ' +
      'navegador de quem abre a página requisita o conteúdo direto do terceiro, que recebe o ' +
      'endereço de origem e a página de referência. Não há dado de candidatura na requisição. ' +
      'ROTA: mesma do registro anterior — a classificação é do Encarregado, no portão aberto do ' +
      '47-08. Quem escreve teste registra a medição, não o veredito.',
  },
]

function decisaoQueCobre(destino: string): Decisao | null {
  return DECISOES.find((d) => d.destino === destino) ?? null
}

/**
 * O relatório. Nomeia CAMINHO e DESTINO e imprime as duas saídas possíveis.
 *
 * ⚠ O trecho bruto da linha NUNCA entra aqui (T-47-09-06). Uma linha que declara um destino
 * pode carregar uma chave ao lado; imprimi-la poria o segredo no log da suíte, que é lido
 * por gente e guardado por máquina. É a mesma disciplina do guard de segredos do build.
 */
function relatar(descobertas: Destino[]): string {
  const linhas = descobertas
    .map((d) => `  ${d.arquivo.replace(`${RAIZ}/`, '')} → ${d.destino}`)
    .join('\n')
  return (
    `${linhas}\n\n` +
    `Há exatamente DUAS saídas honestas para cada linha acima:\n` +
    `  (a) acrescentar a FICHA em src/features/transparencia/constants/subprocessadores.ts, ` +
    `com os cinco campos e o país MEDIDO na conta do provedor; ou\n` +
    `  (b) registrar a DECISÃO em \`DECISOES\`, neste arquivo, com razão escrita.\n` +
    `Omitir em silêncio não é uma delas — é o que torna falsa uma declaração pública.`
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// A comparação
// ─────────────────────────────────────────────────────────────────────────────

describe('Todo destino de rede do repositório tem ficha publicada ou decisão registrada', () => {
  it('nenhum destino externo sem ficha e sem decisão — a asserção é relacional, nunca de contagem', () => {
    const descobertos = varrerDestinos()

    // Se a varredura não achar NADA, ela quebrou: este repositório fala com provedor de IA,
    // com provedor de e-mail e com serviço público de endereço. Zero achado é cegueira, não
    // limpeza — e cegueira aqui produz um verde que afirma o contrário do fato.
    expect(
      descobertos.length,
      'A varredura não encontrou destino algum. Isso não significa que o repositório não fala ' +
        'com ninguém; significa que ela parou de enxergar.',
    ).toBeGreaterThan(0)

    const orfaos = descobertos.filter(
      (d) => fichaQueCobre(d.destino) === null && decisaoQueCobre(d.destino) === null,
    )

    expect(
      orfaos.length,
      `Destino externo declarado no código sem ficha publicada e sem decisão registrada. A ` +
        `página de empresas contratadas afirma "estas são as empresas" — e com este destino de ` +
        `fora ela está factualmente incompleta.\n${relatar(orfaos)}`,
    ).toBe(0)
  })

  it('a lista publicada é mesmo o lado esperado: as fichas cobrem os destinos que existem por ela', () => {
    const descobertos = varrerDestinos()
    const cobertos = descobertos.filter((d) => fichaQueCobre(d.destino) !== null)

    // Sem esta asserção, a comparação poderia estar passando porque TUDO caiu em `DECISOES` —
    // e aí a lista publicada não seria o lado esperado de nada, seria enfeite.
    expect(
      cobertos.length,
      'Nenhum destino do código casou com ficha alguma da lista publicada. Ou o casamento ' +
        'quebrou, ou a lista deixou de descrever este repositório.',
    ).toBeGreaterThan(0)
  })

  it('nenhuma decisão registrada com razão vazia, e nenhuma sobre destino repetido', () => {
    for (const d of DECISOES) {
      expect(
        d.razao.trim().length,
        `A decisão sobre «${d.destino}» não tem razão escrita. Uma decisão sem razão é uma ` +
          `omissão com formulário: ela isenta o destino sem que ninguém possa conferir por quê.`,
      ).toBeGreaterThan(0)
      expect(
        d.destino.trim().length,
        'Há decisão registrada sem destino — ela isentaria nada, ou tudo.',
      ).toBeGreaterThan(0)
    }

    const vistos = new Set<string>()
    for (const d of DECISOES) {
      expect(vistos.has(d.destino), `decisão duplicada para «${d.destino}»`).toBe(false)
      vistos.add(d.destino)
    }
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// As travas da disposição pendente — para ela não virar etiqueta de omissão
// ─────────────────────────────────────────────────────────────────────────────

describe('As pendências são travadas nos dois sentidos', () => {
  it('cada pendência tem fato medido e rota, ainda existe no código, e ainda não tem ficha', () => {
    const pendentes = DECISOES.filter((d) => d.disposicao === 'pendente-de-decisao')
    const descobertos = new Set(varrerDestinos().map((d) => d.destino))

    for (const p of pendentes) {
      expect(
        /fato medido/i.test(p.razao),
        `A pendência sobre «${p.destino}» não registra o FATO MEDIDO. Uma pendência sem medição ` +
          `é um palpite adiado.`,
      ).toBe(true)
      expect(
        /rota:/i.test(p.razao),
        `A pendência sobre «${p.destino}» não nomeia a ROTA de decisão. Um deferimento sem quem ` +
          `decida é uma omissão com prazo indeterminado.`,
      ).toBe(true)
      expect(
        fichaQueCobre(p.destino),
        `«${p.destino}» GANHOU ficha na lista publicada — a pendência cumpriu o papel dela e ` +
          `precisa sair de \`DECISOES\`. Manter as duas coisas deixa o registro mentindo sobre ` +
          `o próprio estado.`,
      ).toBeNull()
      expect(
        descobertos.has(p.destino),
        `«${p.destino}» não aparece mais no código — a pendência perdeu o objeto e precisa ser ` +
          `retirada. Pendência sobre destino inexistente é acúmulo, não vigilância.`,
      ).toBe(true)
    }
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// As provas de detecção — com entrada sintética, em árvore temporária
// ─────────────────────────────────────────────────────────────────────────────

describe('A varredura DETECTA, e não reprova o correto', () => {
  it('um destino sintético sem ficha é reportado NOMEANDO o destino e o arquivo', () => {
    const arvore = mkdtempSync(join(tmpdir(), 'p47-09-destino-'))
    const fabricado = ['fornecedor', '-que-ninguem-', 'declarou.example'].join('')
    writeFileSync(
      join(arvore, 'servicoNovo.ts'),
      `export const enviar = () => fetch('https://${fabricado}/v1/candidatos')\n`,
    )

    const descobertos = varrerDestinos([arvore])
    const orfaos = descobertos.filter(
      (d) => fichaQueCobre(d.destino) === null && decisaoQueCobre(d.destino) === null,
    )

    expect(
      orfaos.map((o) => o.destino),
      'A varredura não achou o destino fabricado. Sem este caso, o arquivo inteiro passaria por ' +
        'vacuidade no dia em que o repositório ficasse coberto.',
    ).toContain(fabricado)
    const texto = relatar(orfaos)
    expect(texto).toContain('servicoNovo.ts')
    expect(texto).toContain('subprocessadores.ts')
  })

  it('o mesmo destino, COM ficha publicada, sai limpo — o portão não reprova o correto', () => {
    const arvore = mkdtempSync(join(tmpdir(), 'p47-09-coberto-'))
    const comFicha = SUBPROCESSADORES[0].nome.toLowerCase()
    writeFileSync(
      join(arvore, 'servicoCoberto.ts'),
      `export const chamar = () => fetch('https://api.${comFicha}.com/v1/messages')\n`,
    )

    const orfaos = varrerDestinos([arvore]).filter(
      (d) => fichaQueCobre(d.destino) === null && decisaoQueCobre(d.destino) === null,
    )
    expect(
      orfaos,
      'Um destino que TEM ficha publicada foi acusado. Um portão que reprova o comportamento ' +
        'correto treina quem executa a desligá-lo — e aí ele para de pegar o caso real.',
    ).toEqual([])
  })

  it('URL em comentário e em arquivo de teste NÃO conta — e o removedor não come a URL', () => {
    const arvore = mkdtempSync(join(tmpdir(), 'p47-09-escopo-'))
    const citado = ['apenas-', 'documentacao.example'].join('')
    const vivo = ['destino-', 'vivo.example'].join('')

    writeFileSync(
      join(arvore, 'comComentario.ts'),
      [
        `// veja https://${citado}/guia para entender o formato`,
        `/* e também https://${citado}/api */`,
        `export const url = 'https://${vivo}/v1'`,
      ].join('\n'),
    )
    writeFileSync(
      join(arvore, 'fixture.test.ts'),
      `it('recusa host hostil', () => expect(validar('https://${citado}')).toBe(false))\n`,
    )

    const destinos = varrerDestinos([arvore]).map((d) => d.destino)

    // O escopo exclui comentário e arquivo de teste…
    expect(destinos).not.toContain(citado)
    // …e NÃO exclui a linha de código viva. Esta é a asserção que pega o removedor cego:
    // um removedor ingênuo come `https://` inteiro e este `toContain` fica vermelho.
    expect(
      destinos,
      'O destino VIVO sumiu junto com os comentários. É o removedor de comentário comendo a URL ' +
        'pelas duas barras do esquema — a cegueira que produz verde falso.',
    ).toContain(vivo)
  })

  it('o relatório nomeia caminho e destino, e NUNCA imprime o trecho bruto da linha', () => {
    // T-47-09-06. Um segredo fabricado, colado na mesma linha do destino.
    const arvore = mkdtempSync(join(tmpdir(), 'p47-09-segredo-'))
    const segredo = ['sk-', 'segredo-fabricado-', 'nunca-real'].join('')
    const host = ['host-', 'com-segredo.example'].join('')
    writeFileSync(
      join(arvore, 'comSegredo.ts'),
      `export const c = fetch('https://${host}/v1', { headers: { key: '${segredo}' } })\n`,
    )

    const descobertos = varrerDestinos([arvore])
    expect(descobertos.map((d) => d.destino)).toContain(host)

    const texto = relatar(descobertos)
    expect(
      texto.includes(segredo),
      'O relatório imprimiu o trecho bruto e levou o segredo junto para o log da suíte. O ' +
        'relatório nomeia CAMINHO e DESTINO, nunca a linha.',
    ).toBe(false)
  })

  it('ausência de diretório é zero ocorrência, e este arquivo não é sua própria ocorrência', () => {
    expect(varrer(join(RAIZ, '__nao_existe__'))).toEqual([])
    expect(varrerDestinos([join(RAIZ, '__nao_existe__')])).toEqual([])
    expect(() => varrerDestinos([join(RAIZ, '__nao_existe__')])).not.toThrow()

    // Este arquivo vive em `src/__tests__/` e contém URLs sintéticas. O escopo declarado o
    // exclui — e isso é asserido, não presumido: sem esta linha, os hosts fabricados acima
    // entrariam na varredura real e o portão acusaria a si mesmo.
    expect(varrer(SRC)).not.toContain(__filename)
  })
})
