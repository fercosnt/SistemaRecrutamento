#!/usr/bin/env node
'use strict';
/*
 * p52_contraste.cjs — o medidor de contraste WCAG do painel do candidato (52-28, G-52-6).
 *
 * DE ONDE VEM O MÉTODO. Das duas sessões de diagnóstico de 2026-10-12 (UAT da 52, teste 6, e
 * `.planning/debug/painel-candidato-prazo-proximo-passo-rejeitado.md`, Evidence de 05:28 e 05:32):
 * o contraste de um texto sobre vidro NÃO é uma propriedade da classe do texto — depende do pixel
 * que está atrás de toda a pilha de camadas, e o fundo do painel é `background-attachment: fixed`
 * (muda com a rolagem). Lá o método rodou numa planilha de rascunho; aqui ele vira código
 * versionado, para que o conserto não volte a ser «presumido» (a premissa não medida do
 * 52-RESEARCH:618 — «o vidro é escuro» — é a origem do defeito).
 *
 * O QUE ELE MEDE. Para cada cenário, sobre CADA pixel da imagem `gradient` (o caminho é lido da
 * linha `import bgGradient from '…'` de `src/assets/images/backgrounds.ts`, nunca escrito aqui),
 * amostrada a 480 px de largura pelo `sips` do macOS, compõe a pilha real (véu preto do
 * `BackgroundImage`, `GlassPanel` branco, `GlassCard` branco com e sem o hover, a superfície local,
 * se houver), com e sem a saturação 1,5 do `backdrop-saturate-150` aplicada ao que está ATRÁS de
 * cada camada de vidro, compõe o texto sobre o resultado e mede a razão WCAG 2.x. Por cenário: o
 * pior caso (min), a mediana e o melhor caso (max).
 *
 *   alvo         o pior caso tem de ser ≥ alvo (4,5:1 para texto, WCAG 1.4.3) — senão reprova
 *   controle     o pior caso tem de ficar ABAIXO do alvo — é a medida mordendo: um controle que
 *                «passa» quer dizer que o medidor ficou cego, e isso reprova
 *   informativo  só imprime o número (residual registrado para o operador); nunca muda a saída
 *
 * Cada camada e cada classe medida tem ÂNCORA no fonte (`{ arquivo, trecho }`): se o código mudar
 * e o cenário não, `CENARIO DESCOLADO DO FONTE` — o medidor não mede uma pilha que o código já não
 * tem. O controle não tem âncora: é a caixa que o UAT reprovou, que o fonte não tem mais.
 *
 * O QUE ELE NÃO FAZ. Não escreve no repositório (o BMP temporário vai a um diretório de
 * `os.tmpdir()` e é apagado num `finally`), não usa rede, não instala nada (built-ins, o
 * `tailwindcss/colors` já instalado e o `sips`). Não modela o desfoque (`backdrop-blur`): o desfoque
 * mistura pixels vizinhos, e o pior caso sobre todos os pixels já cobre a mistura. Não modela
 * sombra de texto (`drop-shadow`), que só ajudaria.
 *
 * Uso:
 *   node scripts/p52_contraste.cjs               mede os cenários sobre a imagem real
 *   node scripts/p52_contraste.cjs --auto-teste  as funções puras (sem rede, sem sips)
 *
 * Saída:
 *   ALVO <id>: min=<x.xx> mediana=<x.xx> max=<x.xx> alvo=<a.aa> OK|ABAIXO
 *   CONTROLE <id>: min=… mediana=… max=… alvo=<a.aa> MORDE|NAO MORDE
 *   INFORMATIVO <id>: min=… mediana=… max=…
 *   CONTRASTE OK: <n> cenario(s) no alvo; <k> controle(s) mordem; amostras=<L>x<A>     exit 0
 *   CONTRASTE ABAIXO DO ALVO: <id> min=<x> | CONTROLE NAO MORDE: <id> min=<x> |
 *   CENARIO DESCOLADO DO FONTE: <id> <arquivo> <trecho> | CONTRASTE ERRO: …            exit 1
 *
 * As funções puras são exportadas (`module.exports`): o teste dos selos
 * (`src/components/pages/__tests__/DashboardCandidatoPage.selos.test.tsx`) julga o contraste pela
 * MESMA `contrasteDeClasses` — um teste sobre uma cópia da fórmula não morderia nada.
 */

const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync } = require('child_process');

const ROOT = path.resolve(__dirname, '..');
const BACKGROUNDS = 'src/assets/images/backgrounds.ts';
const DASH = 'src/components/pages/DashboardCandidatoPage.tsx';
const GLASS = 'src/components/ui/glass.tsx';
const LARGURA_AMOSTRA = 480;
const SATURACAO = 1.5;

/* ------------------------------------------------------------------------------------------------
 * Cores
 * ---------------------------------------------------------------------------------------------- */

let paletaCache = null;
function paleta() {
  if (!paletaCache) paletaCache = require('tailwindcss/colors');
  return paletaCache;
}

function hexParaRgb(hex) {
  let h = String(hex).replace(/^#/, '');
  if (/^[0-9a-fA-F]{3}$/.test(h)) h = h.split('').map((c) => c + c).join('');
  if (!/^[0-9a-fA-F]{6}$/.test(h)) return null;
  return { r: parseInt(h.slice(0, 2), 16), g: parseInt(h.slice(2, 4), 16), b: parseInt(h.slice(4, 6), 16) };
}

const TOKEN = /^(?:(?:text|bg|border|ring|outline)-)?(\[#[0-9a-fA-F]{6}\]|white|black|[a-z]+-[0-9]{2,3})(?:\/([0-9]{1,3}))?$/;

/*
 * `corDeClasse('text-red-100')`, `('bg-[#00109E]/70')`, `('white')` → { r, g, b, a } (0–255, a 0–1).
 * Token que não resolve lança `CLASSE DESCONHECIDA: <token>` — nunca um preto ou branco de chute.
 */
function corDeClasse(token) {
  const m = TOKEN.exec(String(token));
  if (!m) throw new Error(`CLASSE DESCONHECIDA: ${token}`);
  const [, nome, opacidade] = m;
  let rgb = null;
  if (nome.startsWith('[#')) rgb = hexParaRgb(nome.slice(2, -1));
  else if (nome === 'white') rgb = { r: 255, g: 255, b: 255 };
  else if (nome === 'black') rgb = { r: 0, g: 0, b: 0 };
  else {
    const [familia, tom] = nome.split('-');
    const fam = Object.prototype.hasOwnProperty.call(paleta(), familia) ? paleta()[familia] : null;
    const valor = fam && typeof fam === 'object' && Object.prototype.hasOwnProperty.call(fam, tom) ? fam[tom] : null;
    rgb = valor ? hexParaRgb(valor) : null;
  }
  if (!rgb) throw new Error(`CLASSE DESCONHECIDA: ${token}`);
  let a = 1;
  if (opacidade !== undefined) {
    const n = Number(opacidade);
    if (!(n >= 0 && n <= 100)) throw new Error(`CLASSE DESCONHECIDA: ${token}`);
    a = n / 100;
  }
  return { ...rgb, a };
}

/* Alfa sobre opaco: `cor` (com `a`) por cima de `fundo` (opaco). Devolve opaco, sem arredondar. */
function compor(fundo, cor) {
  const a = cor.a === undefined ? 1 : cor.a;
  return {
    r: cor.r * a + fundo.r * (1 - a),
    g: cor.g * a + fundo.g * (1 - a),
    b: cor.b * a + fundo.b * (1 - a),
    a: 1,
  };
}

/* WCAG 2.x: linearização sRGB (limiar 0,04045) e luminância relativa. */
function luminancia(cor) {
  const lin = (c) => {
    const s = c / 255;
    return s <= 0.04045 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  };
  return 0.2126 * lin(cor.r) + 0.7152 * lin(cor.g) + 0.0722 * lin(cor.b);
}

/* Razão (L1 + 0,05)/(L2 + 0,05), L1 a maior — simétrica. */
function contraste(c1, c2) {
  const l1 = luminancia(c1);
  const l2 = luminancia(c2);
  return (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
}

/* A matriz `saturate` do Filter Effects (feColorMatrix type=saturate), em sRGB, com corte 0–255. */
function saturar(cor, s) {
  const { r, g, b } = cor;
  const corte = (v) => Math.min(255, Math.max(0, v));
  return {
    r: corte((0.213 + 0.787 * s) * r + (0.715 - 0.715 * s) * g + (0.072 - 0.072 * s) * b),
    g: corte((0.213 - 0.213 * s) * r + (0.715 + 0.285 * s) * g + (0.072 - 0.072 * s) * b),
    b: corte((0.213 - 0.213 * s) * r + (0.715 - 0.715 * s) * g + (0.072 + 0.928 * s) * b),
    a: 1,
  };
}

/*
 * Contraste de um par de classes com fundo OPACO (o contrato dos selos, decisão «Todos os selos»):
 * fundo com alfa < 1 lança `FUNDO TRANSLUCIDO: <token>` — o contraste de um fundo translúcido
 * depende do que está atrás, e é exatamente isso que o selo opaco elimina.
 */
function contrasteDeClasses(textoToken, fundoToken) {
  const fundo = corDeClasse(fundoToken);
  if (fundo.a < 1) throw new Error(`FUNDO TRANSLUCIDO: ${fundoToken}`);
  const texto = compor(fundo, corDeClasse(textoToken));
  return contraste(texto, fundo);
}

/* ------------------------------------------------------------------------------------------------
 * Imagem
 * ---------------------------------------------------------------------------------------------- */

/*
 * BMP de 24 bits sem compressão, cabeçalho BITMAPINFOHEADER (40 octetos), linhas com preenchimento
 * a 4 octetos; altura negativa = de cima para baixo, positiva = de baixo para cima. Devolve os
 * pixels SEMPRE de cima para baixo, da esquerda para a direita. Outro formato: `BMP NAO SUPORTADO`.
 */
function lerBmp(buffer) {
  const b = Buffer.from(buffer);
  if (b.length < 54 || b.toString('ascii', 0, 2) !== 'BM') throw new Error('BMP NAO SUPORTADO: assinatura');
  const inicio = b.readUInt32LE(10);
  const cabecalho = b.readUInt32LE(14);
  const largura = b.readInt32LE(18);
  const alturaBruta = b.readInt32LE(22);
  const bits = b.readUInt16LE(28);
  const compressao = b.readUInt32LE(30);
  if (cabecalho !== 40 || bits !== 24 || compressao !== 0 || largura <= 0 || alturaBruta === 0) {
    throw new Error(`BMP NAO SUPORTADO: cabecalho=${cabecalho} bits=${bits} compressao=${compressao}`);
  }
  const altura = Math.abs(alturaBruta);
  const deCimaParaBaixo = alturaBruta < 0;
  const linha = Math.ceil((largura * 3) / 4) * 4;
  if (inicio + linha * altura > b.length) throw new Error('BMP NAO SUPORTADO: truncado');
  const pixels = [];
  for (let y = 0; y < altura; y += 1) {
    const origem = deCimaParaBaixo ? y : altura - 1 - y;
    for (let x = 0; x < largura; x += 1) {
      const o = inicio + origem * linha + x * 3;
      pixels.push({ r: b[o + 2], g: b[o + 1], b: b[o] });
    }
  }
  return { largura, altura, pixels };
}

function erro(msg) {
  const e = new Error(`CONTRASTE ERRO: ${msg}`);
  e.contraste = true;
  return e;
}

/* O caminho da imagem `gradient`, lido da linha do import — o nome com hash não mora aqui. */
function caminhoDaImagem() {
  const arq = path.join(ROOT, BACKGROUNDS);
  let fonte;
  try {
    fonte = fs.readFileSync(arq, 'utf8');
  } catch {
    throw erro(`nao li ${BACKGROUNDS}`);
  }
  const m = /^import\s+bgGradient\s+from\s+'([^']+)'/m.exec(fonte);
  if (!m) throw erro(`import bgGradient nao encontrado em ${BACKGROUNDS}`);
  const img = path.resolve(path.dirname(arq), m[1]);
  if (!fs.existsSync(img)) throw erro(`imagem do import bgGradient nao existe: ${path.relative(ROOT, img)}`);
  return img;
}

function amostrarImagem() {
  const img = caminhoDaImagem();
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'p52-contraste-'));
  const saida = path.join(dir, 'amostra.bmp');
  try {
    try {
      execFileSync('sips', ['-s', 'format', 'bmp', '--resampleWidth', String(LARGURA_AMOSTRA), img, '--out', saida], {
        stdio: ['ignore', 'pipe', 'pipe'],
      });
    } catch (e) {
      throw erro(`sips ${String((e && (e.code || e.message)) || e).split('\n')[0]}`);
    }
    if (!fs.existsSync(saida)) throw erro('sips nao gerou o BMP');
    return lerBmp(fs.readFileSync(saida));
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
}

/* ------------------------------------------------------------------------------------------------
 * Cenários
 * ---------------------------------------------------------------------------------------------- */

const esc = (s) => String(s).replace(/[.*+?^${}()|[\]\\/]/g, '\\$&');
/* Um token de classe dentro de um className: delimitado por aspas, crase ou espaço. */
const tok = (t) => `(?<=["'\`\\s])${esc(t)}(?=["'\`\\s])`;

/*
 * A pilha DEPOIS da imagem, no painel do candidato (`DashboardCandidatoPage.tsx`): o véu preto do
 * `BackgroundImage` (não é vidro), o `GlassPanel variant="white"` e o `GlassCard variant="white"
 * hover` (vidros: `backdrop-saturate-150`; o cartão tem a variante de hover).
 */
const PILHA_CARTAO_PAINEL = [
  { camada: 'veu BackgroundImage', token: 'bg-black/15', vidro: false },
  { camada: 'GlassPanel white', token: 'bg-white/15', vidro: true },
  { camada: 'GlassCard white hover', token: 'bg-white/15', tokenHover: 'bg-white/25', vidro: true },
];

const ANCORAS_PILHA_CARTAO_PAINEL = [
  { arquivo: BACKGROUNDS, trecho: /^import\s+bgGradient\s+from\s+'/m },
  { arquivo: BACKGROUNDS, trecho: 'gradient: bgGradient' },
  { arquivo: DASH, trecho: 'background="gradient"' },
  { arquivo: DASH, trecho: 'overlayColor="bg-black"' },
  { arquivo: DASH, trecho: 'overlayOpacity={15}' },
  { arquivo: DASH, trecho: '<GlassPanel variant="white"' },
  { arquivo: DASH, trecho: /<GlassCard\s+key=\{candidatura\.id\}\s+variant="white"\s+blur="md"\s+hover\s/ },
  { arquivo: GLASS, trecho: "white: 'bg-white/15" },
  { arquivo: GLASS, trecho: "hover && 'transition-all duration-300 hover:bg-white/25" },
  { arquivo: GLASS, trecho: "'backdrop-saturate-150'" },
];

const SUPERFICIE_REJEICAO = 'bg-[#00109E]/70';
const TEXTO_REJEICAO = 'text-white/80';

const CENARIOS = [
  {
    id: 'painel-rejeicao',
    tipo: 'alvo',
    alvo: 4.5,
    pilha: PILHA_CARTAO_PAINEL,
    superficie: SUPERFICIE_REJEICAO,
    texto: TEXTO_REJEICAO,
    ancoras: [
      ...ANCORAS_PILHA_CARTAO_PAINEL,
      // A caixa e os DOIS parágrafos dela (o `feedback_rejeicao` e o «Agradecemos…»), na ordem.
      {
        arquivo: DASH,
        trecho: new RegExp(
          `data-testid="painel-rejeicao"[^\\n]*${tok(SUPERFICIE_REJEICAO)}[^\\n]*\\n` +
            `\\s*<p className="[^"\\n]*${tok(TEXTO_REJEICAO)}[^"\\n]*">\\n[^\\n]*\\n\\s*</p>\\n` +
            `\\s*<p className="[^"\\n]*${tok(TEXTO_REJEICAO)}[^"\\n]*">`
        ),
      },
    ],
  },
  {
    // A caixa que o UAT da 52 reprovou (fundo branco 5%, texto branco 60%). Sem âncora: o fonte não
    // a tem mais. Tem de sair ABAIXO do alvo — senão o medidor ficou cego.
    id: 'controle-painel-rejeicao-antes',
    tipo: 'controle',
    alvo: 4.5,
    pilha: PILHA_CARTAO_PAINEL,
    superficie: 'bg-white/5',
    texto: 'text-white/60',
    ancoras: [],
  },
];

/*
 * Confere as âncoras de todos os cenários. `ler(arquivo)` devolve o texto (ou lança). Pura quanto
 * ao `ler` injetado. Devolve a lista de linhas `CENARIO DESCOLADO DO FONTE: …`.
 */
function conferirAncoras(cenarios, ler) {
  const cache = new Map();
  const texto = (arq) => {
    if (!cache.has(arq)) {
      let t = null;
      try {
        t = ler(arq);
      } catch {
        t = null;
      }
      cache.set(arq, t);
    }
    return cache.get(arq);
  };
  const descolados = [];
  for (const c of cenarios) {
    for (const a of c.ancoras || []) {
      const t = texto(a.arquivo);
      const ok = t !== null && (a.trecho instanceof RegExp ? a.trecho.test(t) : t.includes(a.trecho));
      if (!ok) descolados.push(`CENARIO DESCOLADO DO FONTE: ${c.id} ${a.arquivo} ${String(a.trecho)}`);
    }
  }
  return descolados;
}

/*
 * Mede um cenário sobre a imagem: cada pixel × {sem, com saturação} × {sem, com hover}. Devolve
 * { min, mediana, max, n }.
 */
function medirCenario(cenario, imagem) {
  const camadas = cenario.pilha.map((p) => ({
    vidro: p.vidro,
    cor: corDeClasse(p.token),
    corHover: corDeClasse(p.tokenHover || p.token),
  }));
  const sup = cenario.superficie ? corDeClasse(cenario.superficie) : null;
  const txt = corDeClasse(cenario.texto);
  const valores = new Float64Array(imagem.pixels.length * 4);
  let i = 0;
  for (const px of imagem.pixels) {
    for (const sat of [false, true]) {
      for (const hover of [false, true]) {
        let fundo = { r: px.r, g: px.g, b: px.b, a: 1 };
        for (const c of camadas) {
          if (c.vidro && sat) fundo = saturar(fundo, SATURACAO);
          fundo = compor(fundo, hover ? c.corHover : c.cor);
        }
        if (sup) fundo = compor(fundo, sup);
        valores[i] = contraste(compor(fundo, txt), fundo);
        i += 1;
      }
    }
  }
  if (!i) throw erro(`imagem vazia no cenario ${cenario.id}`);
  valores.sort();
  const meio = Math.floor(i / 2);
  const mediana = i % 2 ? valores[meio] : (valores[meio - 1] + valores[meio]) / 2;
  return { min: valores[0], mediana, max: valores[i - 1], n: i };
}

const f2 = (x) => Number(x).toFixed(2);

/*
 * O JUIZ — puro. `resultados`: [{ id, tipo, alvo, min, mediana, max }]; `descolados`: linhas de
 * `conferirAncoras`; `amostras`: «LxA». Devolve { codigo, linhas[], final }.
 */
function julgar({ resultados = [], descolados = [], amostras = '?' }) {
  const linhas = [];
  const falhas = [...descolados];
  let noAlvo = 0;
  let mordem = 0;
  let controles = 0;
  for (const r of resultados) {
    const nums = `min=${f2(r.min)} mediana=${f2(r.mediana)} max=${f2(r.max)}`;
    if (r.tipo === 'alvo') {
      const ok = r.min >= r.alvo;
      linhas.push(`ALVO ${r.id}: ${nums} alvo=${f2(r.alvo)} ${ok ? 'OK' : 'ABAIXO'}`);
      if (ok) noAlvo += 1;
      else falhas.push(`CONTRASTE ABAIXO DO ALVO: ${r.id} min=${f2(r.min)}`);
    } else if (r.tipo === 'controle') {
      controles += 1;
      const morde = r.min < r.alvo;
      linhas.push(`CONTROLE ${r.id}: ${nums} alvo=${f2(r.alvo)} ${morde ? 'MORDE' : 'NAO MORDE'}`);
      if (morde) mordem += 1;
      else falhas.push(`CONTROLE NAO MORDE: ${r.id} min=${f2(r.min)}`);
    } else if (r.tipo === 'informativo') {
      linhas.push(`INFORMATIVO ${r.id}: ${nums}`);
    } else {
      falhas.push(`CONTRASTE ERRO: tipo de cenario desconhecido: ${r.id} ${r.tipo}`);
    }
  }
  if (!descolados.length && !controles) falhas.push('CONTRASTE ERRO: nenhum cenario de controle — a medida nao prova que morde');
  if (falhas.length) return { codigo: 1, linhas, final: falhas[0], falhas };
  return {
    codigo: 0,
    linhas,
    final: `CONTRASTE OK: ${noAlvo} cenario(s) no alvo; ${mordem} controle(s) mordem; amostras=${amostras}`,
    falhas,
  };
}

/* ------------------------------------------------------------------------------------------------
 * AUTO-TESTE — sem rede, sem sips: as MESMAS funções do uso normal.
 * ---------------------------------------------------------------------------------------------- */

function bmpSintetico({ bits = 24, deCimaParaBaixo }) {
  // 2×2: linha de cima = vermelho, verde; linha de baixo = azul, branco. Linha de 6 octetos +
  // 2 de preenchimento.
  const cima = [{ r: 255, g: 0, b: 0 }, { r: 0, g: 255, b: 0 }];
  const baixo = [{ r: 0, g: 0, b: 255 }, { r: 255, g: 255, b: 255 }];
  const linhasNoArquivo = deCimaParaBaixo ? [cima, baixo] : [baixo, cima];
  const linha = 8;
  const b = Buffer.alloc(54 + linha * 2);
  b.write('BM', 0, 'ascii');
  b.writeUInt32LE(b.length, 2);
  b.writeUInt32LE(54, 10);
  b.writeUInt32LE(40, 14);
  b.writeInt32LE(2, 18);
  b.writeInt32LE(deCimaParaBaixo ? -2 : 2, 22);
  b.writeUInt16LE(1, 26);
  b.writeUInt16LE(bits, 28);
  b.writeUInt32LE(0, 30);
  linhasNoArquivo.forEach((l, y) => {
    l.forEach((p, x) => {
      const o = 54 + y * linha + x * 3;
      b[o] = p.b;
      b[o + 1] = p.g;
      b[o + 2] = p.r;
    });
    b[54 + y * linha + 6] = 0xaa; // preenchimento com lixo: não pode virar pixel
    b[54 + y * linha + 7] = 0xaa;
  });
  return b;
}

function lanca(fn, prefixo) {
  try {
    fn();
    return false;
  } catch (e) {
    return String(e && e.message).startsWith(prefixo);
  }
}

function autoTeste() {
  let n = 0;
  const falhas = [];
  const conferir = (nome, ok, detalhe = '') => {
    n += 1;
    console.log(`  ${ok ? 'ok    ' : 'FALHOU'} ${String(n).padStart(2, ' ')} ${nome}${ok ? '' : ` — ${detalhe}`}`);
    if (!ok) falhas.push(nome);
  };
  const BRANCO = { r: 255, g: 255, b: 255 };
  const PRETO = { r: 0, g: 0, b: 0 };
  const C777 = { r: 0x77, g: 0x77, b: 0x77 };

  // Fórmula WCAG.
  conferir('contraste branco/preto = 21,00', f2(contraste(BRANCO, PRETO)) === '21.00', f2(contraste(BRANCO, PRETO)));
  const c7 = contraste(C777, BRANCO);
  conferir('#777777/branco entre 4,47 e 4,49, e simetrico', c7 >= 4.47 && c7 <= 4.49 && contraste(BRANCO, C777) === c7, String(c7));

  // Classes.
  const igual = (c, r, g, b, a) => c.r === r && c.g === g && c.b === b && Math.abs(c.a - a) < 1e-9;
  let c = corDeClasse('text-red-100');
  conferir('corDeClasse text-red-100 = #fee2e2 opaco', igual(c, 0xfe, 0xe2, 0xe2, 1), JSON.stringify(c));
  c = corDeClasse('bg-[#00109E]/70');
  conferir('corDeClasse bg-[#00109E]/70 = (0,16,158) a=0,70', igual(c, 0, 16, 158, 0.7), JSON.stringify(c));
  c = corDeClasse('text-white/80');
  conferir('corDeClasse text-white/80 = branco a=0,80', igual(c, 255, 255, 255, 0.8), JSON.stringify(c));
  c = corDeClasse('bg-gray-700');
  conferir('corDeClasse bg-gray-700 = #374151 opaco', igual(c, 0x37, 0x41, 0x51, 1), JSON.stringify(c));
  conferir(
    'corDeClasse recusa token desconhecido (familia, tom, forma)',
    lanca(() => corDeClasse('text-naoexiste-500'), 'CLASSE DESCONHECIDA: ') &&
      lanca(() => corDeClasse('bg-red-850'), 'CLASSE DESCONHECIDA: ') &&
      lanca(() => corDeClasse('font-semibold'), 'CLASSE DESCONHECIDA: ') &&
      lanca(() => corDeClasse('bg-red-800/140'), 'CLASSE DESCONHECIDA: '),
    'um token invalido resolveu'
  );

  // Composição.
  const w80 = compor({ r: 0, g: 16, b: 158 }, corDeClasse('text-white/80'));
  conferir(
    'branco 80% sobre #00109E ~ (204,207,236) +-1',
    Math.abs(w80.r - 204) <= 1 && Math.abs(w80.g - 207) <= 1 && Math.abs(w80.b - 236) <= 1,
    JSON.stringify(w80)
  );

  // Par opaco.
  conferir('contrasteDeClasses recusa fundo translucido', lanca(() => contrasteDeClasses('text-red-100', 'bg-red-800/40'), 'FUNDO TRANSLUCIDO: '), 'aceitou');
  const par = contrasteDeClasses('text-red-100', 'bg-red-800');
  conferir('contrasteDeClasses text-red-100 sobre bg-red-800 >= 4,5', par >= 4.5, f2(par));

  // Saturação: cinza neutro é ponto fixo; vermelho puro corta em 0–255.
  const cinza = saturar({ r: 128, g: 128, b: 128 }, SATURACAO);
  conferir('saturar cinza neutro = o mesmo cinza', Math.abs(cinza.r - 128) < 1e-9 && Math.abs(cinza.g - 128) < 1e-9 && Math.abs(cinza.b - 128) < 1e-9, JSON.stringify(cinza));
  const verm = saturar({ r: 255, g: 0, b: 0 }, SATURACAO);
  conferir('saturar corta em 0..255', verm.r === 255 && verm.g === 0 && verm.b === 0, JSON.stringify(verm));

  // BMP.
  const esperado = [[255, 0, 0], [0, 255, 0], [0, 0, 255], [255, 255, 255]];
  const confere = (img) =>
    img.largura === 2 && img.altura === 2 && img.pixels.length === 4 && img.pixels.every((p, k) => p.r === esperado[k][0] && p.g === esperado[k][1] && p.b === esperado[k][2]);
  const td = lerBmp(bmpSintetico({ deCimaParaBaixo: true }));
  conferir('lerBmp de cima para baixo (altura negativa, preenchimento) na ordem', confere(td), JSON.stringify(td.pixels));
  const bu = lerBmp(bmpSintetico({ deCimaParaBaixo: false }));
  conferir('lerBmp de baixo para cima (altura positiva) na MESMA ordem', confere(bu), JSON.stringify(bu.pixels));
  conferir('lerBmp recusa 32 bits', lanca(() => lerBmp(bmpSintetico({ bits: 32, deCimaParaBaixo: true })), 'BMP NAO SUPORTADO'), 'aceitou');

  // A pilha num pixel sintético (preto), pela MESMA medirCenario: sem hover/sem saturação o pior
  // caso é o do véu + 2×branco 15% + superfície; com hover o fundo clareia e o contraste cai.
  const cen = { id: 'x', tipo: 'alvo', alvo: 4.5, pilha: PILHA_CARTAO_PAINEL, superficie: 'bg-[#00109E]/70', texto: 'text-white/80', ancoras: [] };
  const m = medirCenario(cen, { largura: 1, altura: 1, pixels: [{ r: 0, g: 0, b: 0 }] });
  let fundo = compor(compor(compor(compor(PRETO, corDeClasse('bg-black/15')), corDeClasse('bg-white/15')), corDeClasse('bg-white/25')), corDeClasse('bg-[#00109E]/70'));
  const manual = contraste(compor(fundo, corDeClasse('text-white/80')), fundo);
  conferir('medirCenario num pixel preto: o pior caso = a composicao manual com hover', m.n === 4 && Math.abs(m.min - manual) < 1e-9, `${m.min} != ${manual}`);

  // O juiz.
  const R = (tipo, min, extra = {}) => ({ id: `c-${tipo}`, tipo, alvo: 4.5, min, mediana: min + 1, max: min + 2, ...extra });
  const controleOk = R('controle', 1.5);
  let j = julgar({ resultados: [R('alvo', 4.6), controleOk], amostras: '2x2' });
  conferir('juiz: alvo min >= alvo -> OK, saida 0', j.codigo === 0 && /^ALVO c-alvo: .* alvo=4\.50 OK$/.test(j.linhas[0]) && /^CONTRASTE OK: 1 cenario\(s\) no alvo; 1 controle\(s\) mordem; amostras=2x2$/.test(j.final), JSON.stringify(j));
  j = julgar({ resultados: [R('alvo', 4.4), controleOk] });
  conferir('juiz: alvo min < alvo -> ABAIXO, saida 1', j.codigo === 1 && / ABAIXO$/.test(j.linhas[0]) && /^CONTRASTE ABAIXO DO ALVO: c-alvo min=4\.40$/.test(j.final), JSON.stringify(j));
  j = julgar({ resultados: [R('alvo', 5), controleOk] });
  conferir('juiz: controle min < alvo -> MORDE', j.codigo === 0 && / MORDE$/.test(j.linhas[1]), JSON.stringify(j));
  j = julgar({ resultados: [R('alvo', 5), R('controle', 4.5)] });
  conferir('juiz: controle min >= alvo -> NAO MORDE, saida 1', j.codigo === 1 && / NAO MORDE$/.test(j.linhas[1]) && /^CONTROLE NAO MORDE: c-controle min=4\.50$/.test(j.final), JSON.stringify(j));
  j = julgar({ resultados: [R('alvo', 5), controleOk, R('informativo', 1.1)] });
  conferir('juiz: informativo nunca muda a saida', j.codigo === 0 && /^INFORMATIVO c-informativo: min=1\.10 mediana=2\.10 max=3\.10$/.test(j.linhas[2]), JSON.stringify(j));
  j = julgar({ resultados: [R('alvo', 5)] });
  conferir('juiz: sem controle -> CONTRASTE ERRO, saida 1', j.codigo === 1 && /^CONTRASTE ERRO: nenhum cenario de controle/.test(j.final), JSON.stringify(j));

  // Âncoras.
  const cenAnc = [{ id: 'anc', ancoras: [{ arquivo: 'a.tsx', trecho: 'bg-x' }, { arquivo: 'a.tsx', trecho: /bg-y/ }] }];
  const presente = conferirAncoras(cenAnc, () => 'className="bg-x bg-y"');
  const ausente = conferirAncoras(cenAnc, () => 'className="bg-x"');
  const semArquivo = conferirAncoras(cenAnc, () => {
    throw new Error('ENOENT');
  });
  conferir(
    'ancora ausente -> CENARIO DESCOLADO DO FONTE; presente -> nada; arquivo ilegivel -> descolado',
    presente.length === 0 && ausente.length === 1 && ausente[0] === 'CENARIO DESCOLADO DO FONTE: anc a.tsx /bg-y/' && semArquivo.length === 2,
    JSON.stringify({ presente, ausente, semArquivo })
  );
  j = julgar({ resultados: [R('alvo', 5), controleOk], descolados: ausente });
  conferir('juiz: descolado -> saida 1 com a linha do descolado', j.codigo === 1 && j.final === ausente[0], JSON.stringify(j));

  const DECLARADOS = 24;
  if (n !== DECLARADOS) {
    console.log(`P52-CONTRASTE AUTO-TESTE FALHOU: rodaram ${n} casos, declarados ${DECLARADOS}`);
    return 1;
  }
  if (falhas.length) {
    console.log(`P52-CONTRASTE AUTO-TESTE FALHOU: ${falhas.length}/${n} (${falhas.join(' | ')})`);
    return 1;
  }
  console.log(`P52-CONTRASTE AUTO-TESTE OK: ${n}/${n}`);
  return 0;
}

/* ------------------------------------------------------------------------------------------------
 * Uso normal
 * ---------------------------------------------------------------------------------------------- */

function principal() {
  const a = process.argv.slice(2);
  if (a.length === 1 && a[0] === '--auto-teste') process.exit(autoTeste());
  if (a.length) {
    console.error('CONTRASTE ERRO: uso: node scripts/p52_contraste.cjs [--auto-teste]');
    process.exit(1);
  }
  try {
    const descolados = conferirAncoras(CENARIOS, (arq) => fs.readFileSync(path.join(ROOT, arq), 'utf8'));
    if (descolados.length) {
      const j = julgar({ descolados });
      for (const l of j.falhas) console.error(l);
      process.exit(1);
    }
    const imagem = amostrarImagem();
    const resultados = CENARIOS.map((c) => ({ id: c.id, tipo: c.tipo, alvo: c.alvo, ...medirCenario(c, imagem) }));
    const j = julgar({ resultados, amostras: `${imagem.largura}x${imagem.altura}` });
    for (const l of j.linhas) console.log(l);
    (j.codigo === 0 ? console.log : console.error)(j.final);
    process.exit(j.codigo);
  } catch (e) {
    const msg = String((e && e.message) || e).split('\n')[0];
    console.error(msg.startsWith('CONTRASTE ERRO: ') ? msg : `CONTRASTE ERRO: ${msg}`);
    process.exit(1);
  }
}

module.exports = {
  corDeClasse,
  compor,
  luminancia,
  contraste,
  saturar,
  contrasteDeClasses,
  lerBmp,
  conferirAncoras,
  medirCenario,
  julgar,
  CENARIOS,
  PILHA_CARTAO_PAINEL,
};

if (require.main === module) principal();
