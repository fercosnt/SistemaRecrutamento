#!/usr/bin/env node
/*
 * provar-portao.mjs — prova que `validar-payload.mjs` MORDE.
 *
 * Esta base ja aprendeu a licao duas vezes, e das duas formas:
 *
 *   - um portao que congela uma FOTOGRAFIA reprova trabalho correto, com
 *     diagnostico falso;
 *   - um portao que itera sobre lista literal nao reprova nada e segue VERDE.
 *
 * As duas metades importam, entao este teste checa as duas:
 *
 *   1. o payload-gabarito (a vaga real, transcrita a mao e revisada com o
 *      operador) passa LIMPO — o portao nao reprova trabalho correto;
 *   2. cada mutacao deliberada e PEGA — o portao ainda e capaz de falhar.
 *
 * Ao acrescentar uma regra ao validador, acrescente a mutacao correspondente
 * aqui. Uma regra sem mutacao e uma regra que ninguem sabe se funciona.
 *
 *   node ${CLAUDE_PLUGIN_ROOT}/skills/cadastro-de-vaga/tests/provar-portao.mjs
 */

import { readFileSync, writeFileSync, mkdtempSync } from 'node:fs'
import { execFileSync } from 'node:child_process'
import { tmpdir } from 'node:os'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const aqui = dirname(fileURLToPath(import.meta.url))
const VALIDADOR = join(aqui, '..', 'scripts', 'validar-payload.mjs')
const GABARITO = join(aqui, 'payload-gabarito.json')
const tmp = mkdtempSync(join(tmpdir(), 'portao-'))

const base = JSON.parse(readFileSync(GABARITO, 'utf8'))
const clone = () => JSON.parse(JSON.stringify(base))

/** Roda o validador e devolve { falhou, erros[] }. `--sem-banco`: teste offline. */
function rodar(payload) {
  const caminho = join(tmp, 'p.json')
  writeFileSync(caminho, JSON.stringify(payload))
  try {
    const out = execFileSync('node', [VALIDADOR, caminho, '--sem-banco'], { encoding: 'utf8' })
    return { falhou: false, erros: [], saida: out }
  } catch (e) {
    const out = e.stdout ?? ''
    return { falhou: true, erros: out.split('\n').filter((l) => l.startsWith('ERRO')), saida: out }
  }
}

/** Cada mutacao: [nome, funcao que quebra o payload]. */
const MUTACOES = [
  ['autor ausente',                (p) => delete p.autor_email],
  ['slug com maiuscula/acento',    (p) => (p.vaga.slug = 'Consultor_Pré-Vendas')],
  ['vaga nasce ativa',             (p) => (p.vaga.status = 'ativa')],
  ['UF inexistente',               (p) => (p.vaga.estado = 'XX')],
  ['modelo_trabalho minusculo',    (p) => (p.vaga.modelo_trabalho = 'presencial')],
  ['so uma ponta da faixa',        (p) => (p.vaga.faixa_salarial_max = null)],
  ['faixa invertida',              (p) => ((p.vaga.faixa_salarial_min = 5000), (p.vaga.faixa_salarial_max = 1000))],
  ['exibir_salario sem faixa',     (p) => ((p.vaga.exibir_salario = true), (p.vaga.faixa_salarial_min = null), (p.vaga.faixa_salarial_max = null))],
  ['data_fechamento <= abertura',  (p) => ((p.vaga.data_abertura = '2026-09-01'), (p.vaga.data_fechamento = '2026-08-01'))],
  ['link markdown',                (p) => (p.vaga.diferenciais = 'Veja [o site](https://x.com)')],
  ['tabela markdown',              (p) => (p.vaga.beneficios = '| a | b |\n|---|---|')],
  ['bloco de codigo',              (p) => (p.vaga.beneficios = '```\nx\n```')],
  ['citacao >',                    (p) => (p.vaga.diferenciais = '> uma citacao')],
  ['HTML',                         (p) => (p.vaga.beneficios = '<b>oi</b>')],
  ['titulo com um # so',           (p) => (p.vaga.sobre_cargo = '# Titulo\n\ntexto')],
  ['asterisco orfao',              (p) => (p.vaga.beneficios = '**Vale refeicao* de R$ 30')],
  ['markdown em campo texto puro', (p) => (p.vaga.descricao_curta = '**Vaga urgente** para consultor')],
  ['tag de dollar-quote no texto', (p) => (p.vaga.sobre_cargo = 'algo $rub$ aqui')],
  ['secao extra sem conteudo',     (p) => (p.secoes_extras = [{ titulo: 'X' }])],
  ['secao extra com conteudo ""',  (p) => (p.secoes_extras = [{ titulo: 'X', conteudo: '' }])],
  ['rubrica ausente',              (p) => delete p.rubrica_ia],
  ['rubrica manda rejeitar',       (p) => (p.rubrica_ia = p.rubrica_ia.replace('mantenha o score composto abaixo de 40', 'rejeite o candidato'))],
  ['rubrica aponta para fora',     (p) => (p.rubrica_ia += '\nAvalie conforme os requisitos da vaga.')],
  ['rubrica com 6 competencias',   (p) => (p.rubrica_ia = p.rubrica_ia.replace('## O que NÃO pode pesar', '6. Sexta competencia\n   Peso BAIXO.\n\n## O que NÃO pode pesar'))],
  ['pesos somam 95',               (p) => (p.pesos_avaliacao.triagem = 20)],
  ['peso fracionario',             (p) => ((p.pesos_avaliacao.triagem = 24.5), (p.pesos_avaliacao.entrevista = 25.5))],
  ['nenhum teste obrigatorio',     (p) => (p.testes_aplicaveis = [{ teste: 'triagem', obrigatorio: false, customizado: false }])],
  ['testes vazio',                 (p) => (p.testes_aplicaveis = [])],
  ['2 perguntas abertas',          (p) => p.perguntas.push({ bloco: 'valores', ordem: 3, texto_pergunta: 'Por que aqui?', tipo_resposta: 'texto_longo', obrigatoria: true })],
  ['11 perguntas',                 (p) => (p.perguntas = Array.from({ length: 11 }, (_, i) => ({ bloco: 'valores', ordem: i + 1, texto_pergunta: `P${i}`, tipo_resposta: 'single_choice', obrigatoria: true, opcoes_resposta: ['Uma opcao bem descritiva', 'Outra opcao bem descritiva'] })))],
  ["bloco 'triagem' (nao existe)", (p) => (p.perguntas[0].bloco = 'triagem')],
  ['tipo_resposta fora do enum',   (p) => (p.perguntas[0].tipo_resposta = 'texto')],
  ['choice sem opcoes',            (p) => delete p.perguntas[1].opcoes_resposta],
  ['choice com opcoes vazias',     (p) => (p.perguntas[1].opcoes_resposta = [])],
  ['ordem zero',                   (p) => (p.perguntas[0].ordem = 0)],
  ['ordem duplicada',              (p) => (p.perguntas[1].ordem = 1)],
]

/**
 * O modo `perguntas` acrescenta perguntas a uma vaga que ja existe. Ele dispensa
 * titulo, rubrica, pesos e testes — que ja pertencem a vaga — mas NAO dispensa o
 * autor nem as regras das perguntas. Este bloco prova que a dispensa nao virou
 * buraco: um portao que fica frouxo ao ganhar um modo novo e um portao quebrado.
 */
const BASE_PERGUNTAS = {
  modo: 'perguntas',
  autor_email: 'fernando@beautysmile.com.br',
  vaga: { slug: 'social-media-producao-captacao-conteudo' },
  perguntas: [
    {
      bloco: 'curriculo', ordem: 1,
      texto_pergunta: 'Cole o link do seu portfolio',
      tipo_resposta: 'texto_curto', obrigatoria: true, limite_caracteres: 500,
    },
  ],
}

const MUTACOES_PERGUNTAS = [
  ['[perguntas] autor ausente',      (p) => delete p.autor_email],
  ['[perguntas] lista vazia',        (p) => (p.perguntas = [])],
  ['[perguntas] bloco invalido',     (p) => (p.perguntas[0].bloco = 'cultura')],
  ['[perguntas] tipo fora do enum',  (p) => (p.perguntas[0].tipo_resposta = 'texto')],
  ['[perguntas] ordem zero',         (p) => (p.perguntas[0].ordem = 0)],
  ['[perguntas] choice sem opcoes',  (p) => ((p.perguntas[0].tipo_resposta = 'single_choice'), delete p.perguntas[0].opcoes_resposta)],
  ['[perguntas] 11 perguntas',       (p) => (p.perguntas = Array.from({ length: 11 }, (_, i) => ({ bloco: 'valores', ordem: i + 1, texto_pergunta: `P${i}`, tipo_resposta: 'single_choice', obrigatoria: true, opcoes_resposta: ['Uma opcao bem descritiva', 'Outra opcao bem descritiva'] })))],
  ['[perguntas] 2 abertas',          (p) => p.perguntas.push({ bloco: 'valores', ordem: 2, texto_pergunta: 'Por que aqui?', tipo_resposta: 'texto_longo', obrigatoria: true })],
  // A tela separa opcoes por ';'. No modo `texto` (colar), uma opcao que contenha
  // ';' se parte em duas ao salvar — e o defeito e SILENCIOSO. Na migration nao
  // acontece, entao a regra so morde no modo que vai para a tela.
  ['[texto] opcao contendo ponto-e-virgula', (p) => {
    p.modo = 'texto'
    p.perguntas[0] = {
      bloco: 'jornada', ordem: 1,
      texto_pergunta: 'Qual a sua disponibilidade para esta vaga?',
      tipo_resposta: 'single_choice', obrigatoria: true,
      opcoes_resposta: ['Integral e presencial; de segunda a sexta', 'Apenas trabalho remoto'],
    }
  }],
]

console.log('── metade 1: o portao NAO reprova trabalho correto ──')
const limpo = rodar(base)
let falhas = 0
if (limpo.falhou) {
  falhas++
  console.log('FALHOU   o payload-gabarito (vaga real, revisada) foi REPROVADO:')
  limpo.erros.forEach((l) => console.log(`         ${l}`))
} else {
  console.log('OK       payload-gabarito passa limpo')
}

const limpoPerg = rodar(BASE_PERGUNTAS)
if (limpoPerg.falhou) {
  falhas++
  console.log('FALHOU   o payload de modo `perguntas` foi REPROVADO:')
  limpoPerg.erros.forEach((l) => console.log(`         ${l}`))
} else {
  console.log('OK       payload de modo `perguntas` passa limpo')
}

console.log('\n── metade 2: o portao AINDA e capaz de falhar ──')
const todas = [
  ...MUTACOES.map(([n, f]) => [n, f, base]),
  ...MUTACOES_PERGUNTAS.map(([n, f]) => [n, f, BASE_PERGUNTAS]),
]
for (const [nome, quebrar, origem] of todas) {
  const p = JSON.parse(JSON.stringify(origem))
  quebrar(p)
  const r = rodar(p)
  if (r.falhou) {
    console.log(`MORDEU   ${nome}`)
  } else {
    falhas++
    console.log(`PASSOU   ${nome}  ⛔ o portao nao pegou esta mutacao`)
  }
}

console.log(`\n${todas.length} mutacoes, ${falhas} falha(s).`)
if (falhas) {
  console.log('Um portao incapaz de falhar e pior que um portao quebrado.')
  process.exit(1)
}
console.log('Portao provado por execucao.')
