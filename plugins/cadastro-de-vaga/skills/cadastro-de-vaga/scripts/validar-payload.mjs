#!/usr/bin/env node
/*
 * validar-payload.mjs — o portao da skill `cadastro-de-vaga`.
 *
 * Confere o payload ANTES de virar SQL. Cada regra aqui corresponde a um CHECK do
 * banco, a um portao do `publish_vaga`, a um limite do renderizador ou a uma
 * decisao de produto que ja custou caro nesta base.
 *
 * Por que um script e nao "o modelo confere": estas regras sao deterministicas e
 * repetitivas. Um script encoda o CHECK uma vez e nao esquece dele sob pressao.
 *
 *   node validar-payload.mjs payload.json [--sem-banco]
 *
 * Sai com 1 se houver ERRO. AVISOS nao reprovam, mas devem ser lidos.
 */

import { readFileSync } from 'node:fs'
import { execFileSync } from 'node:child_process'

const erros = []
const avisos = []
const err = (m) => erros.push(m)
const warn = (m) => avisos.push(m)

// ── constantes espelhando o banco ───────────────────────────────────────────
const UFS = ['AC','AL','AP','AM','BA','CE','DF','ES','GO','MA','MT','MS','MG','PA','PB','PR','PE','PI','RJ','RN','RS','RO','RR','SC','SP','SE','TO']
const MODELOS = ['Presencial', 'Remoto', 'Híbrido']
const CONTRATOS = ['CLT', 'PJ', 'Estágio', 'Temporário', 'Freelancer']
const BLOCOS = ['jornada', 'tecnologia', 'valores', 'curriculo']
const TIPOS = ['texto_curto', 'texto_longo', 'single_choice', 'multiple_choice', 'numerico']
const TIPOS_ABERTOS = ['texto_curto', 'texto_longo']
const CHAVES_PESO = ['triagem', 'work_sample_sjt', 'redacao_cultural', 'entrevista']

/** Campos que a pagina renderiza via TextoRico — sao os que aceitam markdown. */
const CAMPOS_MARKDOWN = [
  'sobre_cargo', 'responsabilidades', 'requisitos_formacao', 'requisitos_experiencia',
  'requisitos_tecnicos', 'requisitos_habilidades', 'diferenciais', 'beneficios',
]
/** Campos renderizados como texto puro — markdown aqui aparece literal na tela. */
const CAMPOS_TEXTO_PURO = ['titulo', 'descricao_curta']
/** Campos que existem, aceitam escrita e nao sao lidos por ninguem hoje. */
const CAMPOS_INVISIVEIS = ['subtitulo', 'sobre_empresa', 'perfil_ideal']

/** Tags de dollar-quoting usadas pelo template da migration. */
const TAGS = ['$vaga$','$tit$','$dcurta$','$scargo$','$resp$','$rform$','$rexp$','$rtec$','$rhab$','$dif$','$ben$','$sec$','$rub$','$pesos$','$testes$']

// ── entrada ─────────────────────────────────────────────────────────────────
const [, , caminho, ...flags] = process.argv
if (!caminho) {
  console.error('uso: node validar-payload.mjs payload.json [--sem-banco]')
  process.exit(2)
}
const semBanco = flags.includes('--sem-banco')

let p
try {
  p = JSON.parse(readFileSync(caminho, 'utf8'))
} catch (e) {
  console.error(`payload ilegivel: ${e.message}`)
  process.exit(2)
}

// ── 0. modo ─────────────────────────────────────────────────────────────────
// `vaga-nova`  — cria a vaga inteira. Unico caminho possivel: nao ha mutation de
//                criacao de vaga na tela (/rh/vagas/nova e rota sem criacao).
// `perguntas`  — so acrescenta perguntas da Etapa 1 a uma vaga que JA existe.
// `texto`      — mesma coisa, mas para o operador COLAR na tela de configuracao,
//                que desde 2026-08-24 le e grava perguntas e rubrica com autor.
//                Valida igual a `perguntas` e mais uma regra propria (ver secao 8).
const modo = p.modo ?? 'vaga-nova'
if (!['vaga-nova', 'perguntas', 'texto'].includes(modo)) {
  console.error(`modo "${modo}" desconhecido — use "vaga-nova", "perguntas" ou "texto"`)
  process.exit(2)
}
const vagaNova = modo === 'vaga-nova'
/** Modo cujo destino e a TELA, onde as opcoes viajam numa string separada por ';'. */
const paraColar = modo === 'texto'

// ── 1. autor ────────────────────────────────────────────────────────────────
// A razao de esta skill existir: 9 de 12 vagas nasceram com created_by nulo, e
// `vagas.created_by = auth.uid()` gateia o escopo do recrutador inteiro. As 6
// perguntas existentes tem a mesma doenca.
if (!p.autor_email || typeof p.autor_email !== 'string') {
  err(`autor_email ausente — ${vagaNova ? 'a vaga' : 'as perguntas'} nasceria(m) com created_by nulo, que e a doenca que esta skill existe para nao repetir`)
}

// ── 2. vaga ─────────────────────────────────────────────────────────────────
const v = p.vaga ?? {}
if (!v.slug) err('vaga.slug ausente')
else {
  if (!/^[a-z0-9-]+$/.test(v.slug)) err(`vaga.slug "${v.slug}" viola o CHECK ^[a-z0-9-]+$ — sem acento, maiuscula, espaco ou underscore`)
  if (v.slug.length > 80) warn(`vaga.slug tem ${v.slug.length} caracteres — vira URL, considere encurtar`)
}
if (vagaNova && !v.titulo) err('vaga.titulo ausente (NOT NULL)')
if (!vagaNova && (p.perguntas ?? []).length === 0) {
  err('modo "perguntas" sem nenhuma pergunta — nada a fazer')
}
if ('status' in v && v.status !== 'rascunho') {
  err(`vaga.status = "${v.status}" — a vaga sempre nasce rascunho; publicar e ato humano separado`)
}
if (v.estado && !UFS.includes(v.estado)) err(`vaga.estado "${v.estado}" nao e uma UF valida (CHECK estado_brasil_check)`)
if (v.modelo_trabalho && !MODELOS.includes(v.modelo_trabalho)) {
  err(`vaga.modelo_trabalho "${v.modelo_trabalho}" — o codigo compara literal com ${MODELOS.join(' | ')} (com maiuscula)`)
}
if (v.tipo_contrato && !CONTRATOS.includes(v.tipo_contrato)) {
  warn(`vaga.tipo_contrato "${v.tipo_contrato}" fora da lista do formulario (${CONTRATOS.join(' | ')}) — nao ha CHECK, mas o select do RH nao vai exibir`)
}

const min = v.faixa_salarial_min, max = v.faixa_salarial_max
const temMin = min !== undefined && min !== null, temMax = max !== undefined && max !== null
if (temMin !== temMax) err('faixa salarial: CHECK exige as duas nulas ou as duas preenchidas')
if (temMin && temMax && Number(max) < Number(min)) err('faixa salarial: CHECK exige max >= min')
if (v.exibir_salario === true && !(temMin && temMax)) err('exibir_salario = true exige as duas faixas preenchidas (CHECK salario_exibicao_check)')
if (v.exibir_salario === true) warn('exibir_salario = true, mas a pagina publica NAO exibe salario hoje — nenhum componente le faixa_salarial_*')
if (v.data_abertura && v.data_fechamento && !(v.data_fechamento > v.data_abertura)) {
  err('CHECK datas_vaga_check exige data_fechamento > data_abertura')
}

for (const c of CAMPOS_INVISIVEIS) {
  if (v[c] && String(v[c]).trim()) {
    warn(`vaga.${c} preenchido (${String(v[c]).length} caracteres) — NENHUMA tela renderiza esse campo hoje. Se o conteudo importa, mova para um campo visivel`)
  }
}

// `jornada_trabalho`, `tipo_contrato` e `endereco_completo` existem, sao uteis para
// o RH e NAO aparecem em tela publica nenhuma. Numa vaga presencial isso significa
// candidato se inscrevendo sem saber onde nem em que horario vai trabalhar.
if (v.modelo_trabalho === 'Presencial') {
  const corpo = String(v.sobre_cargo ?? '') + String(v.responsabilidades ?? '')
  const temHorario = /\b\d{1,2}\s?h\b|\bhorário|\bhorario|\bsegunda a sexta|\bjornada\b/i.test(corpo)
  const temLocal = /\brua\b|\bavenida\b|\bav\.|\bbairro\b|\bmetrô|\bmetro\b|\bendereço|\bendereco\b/i.test(corpo)
  if (!temHorario || !temLocal) {
    const faltam = [!temLocal && 'o local', !temHorario && 'o horario'].filter(Boolean).join(' e ')
    warn(`vaga presencial, mas ${faltam} nao aparece(m) no corpo do anuncio — e jornada_trabalho/tipo_contrato/endereco_completo NAO sao renderizados em tela nenhuma. O candidato se inscreveria sem saber. Escreva no sobre_cargo`)
  }
}

// ── 3. markdown ─────────────────────────────────────────────────────────────
// O TextoRico nunca produz HTML: o que ele nao reconhece vira TEXTO LITERAL na
// tela. Emitir marca desconhecida ja aconteceu duas vezes nesta base, e nenhum
// teste unitario pegou — so a conferencia visual.
const MARCAS_DESCONHECIDAS = [
  [/\[[^\]]+\]\([^)]+\)/, 'link [texto](url) — vira texto literal, colchetes inclusive'],
  [/^>\s/m, 'citacao "> " — nao reconhecida'],
  [/```/, 'bloco de codigo ``` — nao reconhecido'],
  [/`[^`\n]+`/, 'codigo inline `x` — nao reconhecido'],
  [/^\|.*\|/m, 'tabela markdown — nao reconhecida'],
  [/^---+\s*$/m, 'regua horizontal --- — nao reconhecida'],
  [/~~[^~]+~~/, 'riscado ~~x~~ — nao reconhecido'],
  [/\*\*\*/, 'tripla ***: o parser casa ** primeiro e sobra um * orfao'],
  [/^#\s+/m, 'titulo com um # so — o TextoRico reconhece de ## a ####'],
  [/^#{5,}\s/m, 'titulo com 5+ # — o TextoRico reconhece de ## a ####'],
  [/<[a-zA-Z/]/, 'HTML — nunca renderizado, aparece literal'],
]

for (const campo of CAMPOS_MARKDOWN) {
  const t = v[campo]
  if (!t || typeof t !== 'string') continue
  for (const [re, msg] of MARCAS_DESCONHECIDAS) {
    if (re.test(t)) err(`vaga.${campo}: ${msg}`)
  }
  // Asterisco desemparelhado: cai fora das duas regexes e fica literal na tela.
  const semPares = t.replace(/\*\*[^*]+\*\*/g, '').replace(/\*[^*\s][^*]*\*/g, '')
  const orfaos = (semPares.match(/\*/g) || []).length
  if (orfaos > 0) err(`vaga.${campo}: ${orfaos} asterisco(s) desemparelhado(s) — vao aparecer literais na tela`)
}

for (const campo of CAMPOS_TEXTO_PURO) {
  const t = v[campo]
  if (!t || typeof t !== 'string') continue
  if (/\*\*|^#{1,6}\s|^[-*]\s/m.test(t)) {
    err(`vaga.${campo} e renderizado como TEXTO PURO — o markdown vai aparecer com os simbolos na tela`)
  }
}

// ── 4. dollar-quoting ───────────────────────────────────────────────────────
// Se um texto contem a propria tag, o literal SQL fecha cedo e o restante vira
// codigo. Falha estranha e dificil de ler; melhor pegar aqui.
const textosLongos = { ...v, rubrica_ia: p.rubrica_ia }
for (const [k, t] of Object.entries(textosLongos)) {
  if (typeof t !== 'string') continue
  for (const tag of TAGS) {
    if (t.includes(tag)) err(`${k} contem a tag de dollar-quoting ${tag} — o literal SQL fecharia cedo. Renomeie a tag no template`)
  }
  if (/\$\$/.test(t)) err(`${k} contem "$$" — use sempre tags nomeadas, nunca $$ cru`)
}

// ── 5. secoes_extras ────────────────────────────────────────────────────────
// O CHECK ja foi corrigido uma vez: a primeira versao aceitava {"titulo":"X"}
// sem conteudo, porque jsonpath lax nao ve chave ausente.
const secoes = p.secoes_extras ?? []
if (!Array.isArray(secoes)) err('secoes_extras precisa ser array')
else {
  secoes.forEach((s, i) => {
    if (typeof s !== 'object' || s === null || Array.isArray(s)) return err(`secoes_extras[${i}] nao e objeto (CHECK)`)
    for (const chave of ['titulo', 'conteudo']) {
      if (typeof s[chave] !== 'string' || s[chave] === '') {
        err(`secoes_extras[${i}].${chave} precisa ser string nao-vazia (CHECK vagas_secoes_extras_forma_check)`)
      }
    }
    if (typeof s.conteudo === 'string') {
      for (const [re, msg] of MARCAS_DESCONHECIDAS) {
        if (re.test(s.conteudo)) err(`secoes_extras[${i}].conteudo: ${msg}`)
      }
    }
  })
  if (secoes.length > 0) {
    warn(`${secoes.length} secao(oes) extra(s) — a coluna aceita, mas a PAGINA AINDA NAO RENDERIZA secoes_extras. Esse conteudo fica invisivel ate a renderizacao entrar`)
  }
}

// ── 6. rubrica ──────────────────────────────────────────────────────────────
const r = p.rubrica_ia
if (!vagaNova && r === undefined) {
  // modo perguntas: a rubrica ja existe na vaga, nao se reescreve aqui.
} else if (typeof r !== 'string' || !r.trim()) {
  err('rubrica_ia ausente — sem ela a Edge Function cai no fallback e usa a copia de divulgacao como criterio de avaliacao')
} else {
  for (const cabecalho of ['Requisitos eliminatórios', 'Competências críticas', 'NÃO pode pesar']) {
    if (!r.includes(cabecalho)) warn(`rubrica_ia nao tem a secao "${cabecalho}" — as duas rubricas em producao tem as tres`)
  }

  // Teto de 5: cada competencia gera um bloco BARS e cv_job_match tem max_tokens 2048.
  const secCompetencias = r.split(/##\s*Compet/i)[1]?.split(/\n##\s/)[0] ?? ''
  const nComp = (secCompetencias.match(/^\s*\d+\.\s+\S/gm) || []).length
  if (nComp > 5) err(`rubrica_ia tem ${nComp} competencias — o teto e 5. Cada uma gera um bloco BARS completo e cv_job_match tem max_tokens: 2048; a sexta arrisca truncar o JSON`)
  if (nComp === 0) warn('nao consegui contar competencias numeradas na rubrica — confira o formato "1. Nome da competencia"')

  // RNF-07a: o sistema NUNCA rejeita candidato automaticamente por score.
  const proibidas = /\b(rejeite|rejeitar|descarte|descartar|elimine|eliminar|reprove|reprovar)\b/i
  const m = r.match(proibidas)
  if (m) err(`rubrica_ia manda "${m[0]}" — viola a RNF-07a. Requisito eliminatorio registra gap critical e segura o score abaixo de 40; nunca rejeita`)

  // A rubrica e TUDO que o modelo ve da vaga (index.ts:288-292). Apontar para fora
  // aponta para um texto que ele nao recebe.
  const paraFora = /(conforme|de acordo com|veja|consulte|listad[oa]s?)\s+(n?[oa]s?\s+)?(requisitos|descritivo|anúncio|anuncio|vaga|descrição|descricao)\b/i
  const mf = r.match(paraFora)
  if (mf) err(`rubrica_ia aponta para fora ("${mf[0]}") — com rubrica, o modelo recebe so o titulo e a rubrica. Escreva o requisito por extenso aqui dentro`)

  if (r.length < 800) warn(`rubrica_ia tem ${r.length} caracteres — as duas em producao tem ~2,7 mil. Curta demais costuma ser rubrica sem ancoras BARS`)
  if (r.length > 6000) warn(`rubrica_ia tem ${r.length} caracteres — arrisca comer o orcamento de 2048 tokens do cv_job_match`)
}

// ── 7. pesos e testes (portao do publish_vaga) ──────────────────────────────
const pesos = p.pesos_avaliacao
if (!vagaNova && pesos === undefined) {
  // modo perguntas: pesos e testes ja pertencem a vaga existente.
} else if (!pesos || typeof pesos !== 'object') {
  err('pesos_avaliacao ausente — sem eles a vaga NUNCA podera ser publicada pela RPC')
} else {
  let soma = 0
  for (const k of CHAVES_PESO) {
    const val = pesos[k]
    if (!Number.isInteger(val)) err(`pesos_avaliacao.${k} precisa ser inteiro (a soma e comparada com === 100)`)
    else soma += val
  }
  if (soma !== 100) err(`pesos_avaliacao soma ${soma} — publish_vaga exige exatamente 100`)
}

const testes = p.testes_aplicaveis
if (!vagaNova && testes === undefined) {
  // idem.
} else if (!Array.isArray(testes) || testes.length === 0) {
  err('testes_aplicaveis ausente ou vazio — publish_vaga exige ao menos um teste obrigatorio')
} else if (!testes.some((t) => t && t.obrigatorio === true)) {
  err('nenhum teste com obrigatorio: true — publish_vaga recusa a publicacao')
}

// ── 8. perguntas da Etapa 1 ─────────────────────────────────────────────────
const perguntas = p.perguntas ?? []
if (!Array.isArray(perguntas)) err('perguntas precisa ser array')
else {
  if (perguntas.length === 0) {
    warn('zero perguntas na Etapa 1 — o candidato sera analisado so pelo curriculo. Confira se o anuncio pede algo que nenhum campo coleta')
  }
  if (perguntas.length > 10) err(`${perguntas.length} perguntas — publish_vaga aceita no maximo 10 (e a contagem dele NAO filtra deleted_at)`)

  const abertas = perguntas.filter((q) => TIPOS_ABERTOS.includes(q?.tipo_resposta))
  if (abertas.length > 1) {
    err(`${abertas.length} perguntas abertas (${abertas.map((q) => q.tipo_resposta).join(', ')}) — publish_vaga aceita no maximo 1. As demais precisam ser single_choice, multiple_choice ou numerico`)
  }

  const ordens = new Set()
  perguntas.forEach((q, i) => {
    const id = `perguntas[${i}]`
    if (!q || typeof q !== 'object') return err(`${id} nao e objeto`)
    if (!BLOCOS.includes(q.bloco)) err(`${id}.bloco "${q.bloco}" viola o CHECK — so ${BLOCOS.join(', ')} (nao existe "triagem" nem "cultura")`)
    if (!Number.isInteger(q.ordem) || q.ordem < 1) err(`${id}.ordem precisa ser inteiro >= 1 (CHECK ordem_positiva_check)`)
    else if (ordens.has(q.ordem)) err(`${id}.ordem ${q.ordem} duplicada — nao ha indice unico, mas duplicar embaralha o formulario`)
    else ordens.add(q.ordem)
    if (!q.texto_pergunta) err(`${id}.texto_pergunta ausente (NOT NULL)`)
    if (!TIPOS.includes(q.tipo_resposta)) err(`${id}.tipo_resposta "${q.tipo_resposta}" fora do enum (${TIPOS.join(', ')})`)

    const ehChoice = q.tipo_resposta === 'single_choice' || q.tipo_resposta === 'multiple_choice'
    if (ehChoice) {
      if (!Array.isArray(q.opcoes_resposta) || q.opcoes_resposta.length === 0) {
        err(`${id}.opcoes_resposta obrigatorio e nao-vazio nos tipos *_choice (CHECK opcoes_obrigatorias_check)`)
      } else {
        if (!q.opcoes_resposta.every((o) => typeof o === 'string' && o.trim())) {
          err(`${id}.opcoes_resposta precisa ser array de strings nao-vazias`)
        }
        // A pergunta NAO chega ao prompt da IA — so a resposta. Uma opcao "Sim"
        // chega como "- Sim", sem contexto nenhum. E a consulta que monta esse
        // bloco (index.ts:186) nao tem .order(), entao a lista chega EMBARALHADA:
        // a opcao precisa se identificar sozinha, fora de qualquer ordem.
        const curtas = q.opcoes_resposta.filter((o) => typeof o === 'string' && o.trim().split(/\s+/).length <= 2)
        if (curtas.length) {
          warn(`${id}: opcoes curtas (${curtas.map((o) => `"${o}"`).join(', ')}) — a pergunta NAO chega ao prompt da IA, so a resposta, e sem ordem garantida. Escreva a opcao de forma autoexplicativa`)
        }

        // A tela de configuracao guarda as opcoes numa string separada por ';'
        // (CriarEditarVagaPage -> perguntaMapper). Uma opcao que CONTENHA ';' se
        // parte em duas ao salvar, silenciosamente. Na migration isso nao acontece
        // — o array vai como jsonb —, entao so o modo `texto` reprova.
        const comPontoEVirgula = q.opcoes_resposta.filter((o) => typeof o === 'string' && o.includes(';'))
        if (comPontoEVirgula.length) {
          const lista = comPontoEVirgula.map((o) => `"${o}"`).join(', ')
          if (paraColar) {
            err(`${id}: opcao contendo ';' (${lista}) — no modo "texto" ela se parte em duas ao ser colada na tela, que usa ';' como separador. Troque por virgula`)
          } else {
            warn(`${id}: opcao contendo ';' (${lista}) — funciona por migration, mas se alguem editar esta pergunta pela tela a opcao se parte em duas. Prefira virgula`)
          }
        }
      }
    } else if (q.opcoes_resposta) {
      warn(`${id}.opcoes_resposta preenchido num tipo ${q.tipo_resposta} — sera ignorado`)
    }

    if (q.tipo_resposta === 'numerico') {
      warn(`${id} e numerico — chega ao modelo como "- 3", sem unidade. Confira se o enunciado torna a resposta autoexplicativa, ou use single_choice com faixas nomeadas`)
    }
    if (q.opcoes_resposta && q.obrigatoria !== true) {
      // publish_vaga: toda pergunta com opcao knockout precisa ser obrigatoria.
      // A skill nao cria knockout, mas se alguem marcar depois, isso vira erro la.
      warn(`${id} nao e obrigatoria — se alguma opcao dela for marcada como knockout depois, publish_vaga passa a recusar a publicacao`)
    }
  })
}

// ── 9. confronto com o banco (best-effort) ──────────────────────────────────
// Em `vaga-nova` o slug NAO pode existir; em `perguntas` ele TEM de existir — e os
// tetos do publish_vaga contam as perguntas que ja estao la, inclusive as
// soft-deletadas (a contagem do publish_vaga nao filtra deleted_at).
if (!semBanco && v.slug && /^[a-z0-9-]+$/.test(v.slug)) {
  const sql = (q) => JSON.parse(execFileSync('node', ['p46apply.cjs', 'sql', q],
    { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'], timeout: 20000 }))
  try {
    const n = Number(sql(`select count(*) as n from public.vagas where slug = '${v.slug}'`)?.[0]?.n)
    if (vagaNova && n > 0) {
      err(`ja existe vaga com slug "${v.slug}" — vagas_slug_key e UNIQUE, o apply falharia`)
    }
    if (!vagaNova) {
      if (n === 0) err(`modo "perguntas", mas nao existe vaga com slug "${v.slug}"`)
      else {
        const j = sql(`select count(*) as total,
                              count(*) filter (where tipo_resposta in ('texto_curto','texto_longo')) as abertas
                         from public.perguntas_formulario
                        where vaga_id = (select id from public.vagas where slug = '${v.slug}')`)?.[0]
        const jaTem = Number(j?.total ?? 0), jaAbertas = Number(j?.abertas ?? 0)
        const novas = (p.perguntas ?? []).length
        const novasAbertas = (p.perguntas ?? []).filter((q) => TIPOS_ABERTOS.includes(q?.tipo_resposta)).length
        if (jaTem + novas > 10) {
          err(`a vaga ja tem ${jaTem} pergunta(s) (contagem bruta, como o publish_vaga conta) e voce quer somar ${novas} — o teto e 10`)
        }
        if (jaAbertas + novasAbertas > 1) {
          err(`a vaga ja tem ${jaAbertas} pergunta(s) aberta(s) e voce quer somar ${novasAbertas} — publish_vaga aceita no maximo 1`)
        }
      }
    }
  } catch {
    warn('nao consegui confrontar com o banco (rode a partir da raiz do repositorio, ou passe --sem-banco). Os CHECKs do banco ainda pegam no apply')
  }
}

// ── saida ───────────────────────────────────────────────────────────────────
for (const a of avisos) console.log(`AVISO  ${a}`)
for (const e of erros) console.log(`ERRO   ${e}`)
console.log(`\n${erros.length} erro(s), ${avisos.length} aviso(s).`)
if (erros.length) {
  console.log('Nao emita SQL enquanto houver erro. Um portao que voce contorna nao e portao.')
  process.exit(1)
}
console.log(
  vagaNova
    ? 'Payload valido. Proximo passo: aprovacao humana EXPLICITA da rubrica, antes de emitir a migration.'
    : 'Payload valido. Proximo passo: mostrar as perguntas ao operador e esperar o OK — elas viram atrito na inscricao de gente real.'
)
