/**
 * genMatrizRetencao.test.ts — o backstop executável da matriz de retenção
 * derivada (Bloco 1 de `/privacidade`).
 *
 * Requirement: TRANSP-02 · Phase 47 / Plan 47-01
 *
 * POR QUE ESTE ARQUIVO MORA EM `__tests__/`
 * O `include` do Vitest é `**\/__tests__\/**\/*.{test,spec}.{ts,tsx}`
 * (`vite.config.ts`). Um teste FORA de um diretório `__tests__/` não roda e não
 * falha — ele simplesmente não existe para o runner, e um teste que não roda é a
 * forma mais barata de fabricar um falso verde. Mesma razão registrada pelo irmão
 * `genReciboExclusao.test.ts`.
 *
 * POR QUE NÃO HÁ `toMatchSnapshot()` NENHUM AQUI, E ISSO É O PONTO
 * Um snapshot do texto da matriz passaria numa tabela honesta hoje e continuaria
 * passando depois de a janela vigente em produção divergir do que a página
 * publica. O que este arquivo assere é o CONTRATO: ordem de funil, campos
 * obrigatórios, o intervalo do `CHECK` vivo da tabela, e o carimbo de medição.
 *
 * COMO OS TESTES DE PORTÃO FUNCIONAM — mutação de fonte, não de fixture
 * Cada gate é provado montando uma árvore temporária com a fonte REAL (o YAML, o
 * gerador e o módulo do funil) e uma cópia MUTADA de uma delas, rodando o BINÁRIO
 * de verdade por `spawnSync`, e asserindo `status !== 0` MAIS a mensagem que
 * NOMEIA o item que falhou. Um gerador que morre sem dizer qual etapa está sem
 * finalidade transfere para quem executa o trabalho que o gate existe para fazer.
 *
 * DUAS TÉCNICAS DE MUTAÇÃO, E POR QUE CADA UMA ONDE ESTÁ
 *   · `mutarFonte()` mutação ESTRUTURAL do YAML (safeLoad → editar → safeDump).
 *     A fonte é dado, e a copy dela é editável por decisão de produto: um patch
 *     textual sobre a frase de finalidade reprovaria numa revisão de copy legítima
 *     — um gate que reprova o trabalho correto é treinamento para desligá-lo.
 *     Ela assere que o documento REALMENTE mudou, que é a garantia do `patch()`
 *     expressa sobre dado em vez de texto.
 *   · `patch()` mutação TEXTUAL, para o que é texto de fato (o módulo do funil e os
 *     artefatos gerados). Reprova quando a substituição não casa exatamente uma
 *     vez: uma mutação que não aplicou faria o caso passar por vacuidade, que é o
 *     falso verde que este arquivo inteiro existe para impedir.
 *
 * `spawnSync` em vez de `execFileSync`: o segundo LANÇA em saída não-zero, e a
 * maioria destes casos existe justamente para asserir saída não-zero.
 */
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { spawnSync } from 'child_process';
import fs from 'fs';
import os from 'os';
import path from 'path';
import yaml from 'js-yaml';

const REPO = path.resolve(__dirname, '..', '..', '..');
const GERADOR_REAL = path.join(REPO, 'docs', 'compliance', 'sql', 'gen-matriz-retencao.cjs');
const FONTE_REAL = path.join(REPO, 'docs', 'compliance', 'matriz-retencao.yaml');
const ARTEFATO_REAL = path.join(REPO, 'docs', 'compliance', 'matriz-retencao.json');
const ESPELHO_REAL = path.join(REPO, 'src', 'features', 'transparencia', 'constants', 'matrizRetencao.generated.ts');
const FUNIL_REAL = path.join(REPO, 'src', 'features', 'triagem', 'services', 'triagemService.ts');

const REL_FUNIL = 'src/features/triagem/services/triagemService.ts';
const REL_ESPELHO = 'src/features/transparencia/constants/matrizRetencao.generated.ts';

interface EtapaMatriz {
  etapa: string;
  rotulo: string;
  janela_meses: number;
  finalidade: string;
  base_legal: string;
}

interface Matriz {
  meta: {
    requirement: string;
    medido_em: string;
    metodo: string;
    gerado_em: string;
    totais: { etapas: number };
  };
  etapas: EtapaMatriz[];
}

/** A ordem de funil extraída do MESMO módulo que o gerador lê — nunca uma segunda cópia. */
function ordemDoFunil(): string[] {
  const src = fs.readFileSync(FUNIL_REAL, 'utf8');
  const bloco = src.match(/export const ETAPA_M2_OPTIONS[\s\S]*?\[([\s\S]*?)\]\s*as EtapaFunilM2\[\]/);
  expect(bloco, 'ETAPA_M2_OPTIONS não pôde ser extraído do módulo do funil').toBeTruthy();
  return [...bloco![1].matchAll(/'([a-z_]+)'/g)].map((m) => m[1]);
}

// ---------------------------------------------------------------------------
// Grupo A — o artefato que está no repositório
// ---------------------------------------------------------------------------

describe('matriz-retencao.json — o artefato derivado', () => {
  it('(1) a fonte, o gerador e os dois artefatos existem no repositório', () => {
    for (const p of [FONTE_REAL, GERADOR_REAL, ARTEFATO_REAL, ESPELHO_REAL]) {
      expect(fs.existsSync(p), `ausente: ${path.relative(REPO, p)}`).toBe(true);
    }
  });

  it('(2) o gerador não fala com o banco — nem cliente, nem credencial, nem MCP', () => {
    const cjs = fs.readFileSync(GERADOR_REAL, 'utf8');
    expect(/require\(\s*['"](pg|postgres|@supabase)/.test(cjs), 'o gerador importa um cliente de banco').toBe(false);
    // `safeLoad`, nunca `load`: js-yaml 3.x usa schema full no `load`, e script de
    // compliance carregando YAML com schema full é achado de auditoria.
    expect(cjs).toContain('safeLoad');
    expect(/yaml\.load\(/.test(cjs), 'o gerador usa yaml.load em vez de safeLoad').toBe(false);
  });

  it('(3) o carimbo de vigência é a data MEDIDA em produção, com o método declarado', () => {
    const doc: Matriz = JSON.parse(fs.readFileSync(ARTEFATO_REAL, 'utf8'));
    expect(doc.meta.requirement).toBe('TRANSP-02');
    expect(doc.meta.medido_em, 'meta.medido_em ausente').toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(doc.meta.metodo.trim().length, 'meta.metodo vazio').toBeGreaterThan(0);
  });

  it('(4) uma ficha por etapa do funil, na ORDEM do funil — jamais alfabética', () => {
    const doc: Matriz = JSON.parse(fs.readFileSync(ARTEFATO_REAL, 'utf8'));
    const ordem = ordemDoFunil();
    expect(ordem.length).toBeGreaterThan(0);
    // Lista vazia é falha de geração, nunca um estado de tela (regra "fail high").
    expect(doc.etapas.length).toBe(ordem.length);
    expect(doc.etapas.map((e) => e.etapa)).toEqual(ordem);
  });

  it('(5) cada ficha carrega rótulo, prazo, finalidade e base legal — nenhuma vazia', () => {
    const doc: Matriz = JSON.parse(fs.readFileSync(ARTEFATO_REAL, 'utf8'));
    for (const e of doc.etapas) {
      for (const campo of ['rotulo', 'finalidade', 'base_legal'] as const) {
        expect(String(e[campo] ?? '').trim().length, `campo vazio em ${e.etapa}: ${campo}`).toBeGreaterThan(0);
      }
      // Espelha o `CHECK (janela_meses BETWEEN 1 AND 24)` vivo da tabela: um prazo
      // indeterminado no Bloco 1 é impossível por construção.
      expect(Number.isInteger(e.janela_meses), `janela não-inteira em ${e.etapa}`).toBe(true);
      expect(e.janela_meses).toBeGreaterThanOrEqual(1);
      expect(e.janela_meses).toBeLessThanOrEqual(24);
    }
  });

  it('(6) a projeção é MÍNIMA — as três colunas administrativas não chegam ao artefato', () => {
    // `alterado_por` resolveria para nome de administrador; publicá-lo trocaria
    // transparência sobre o candidato por exposição de um funcionário (SEG-02).
    const doc: Matriz = JSON.parse(fs.readFileSync(ARTEFATO_REAL, 'utf8'));
    for (const e of doc.etapas) {
      for (const proibida of ['origem', 'alterado_por', 'atualizado_em']) {
        expect(Object.keys(e), `coluna administrativa projetada em ${e.etapa}: ${proibida}`).not.toContain(proibida);
      }
    }
    const bruto = fs.readFileSync(ARTEFATO_REAL, 'utf8') + fs.readFileSync(ESPELHO_REAL, 'utf8');
    for (const proibida of ['alterado_por', 'atualizado_em']) {
      expect(bruto.includes(proibida), `«${proibida}» aparece nos artefatos gerados`).toBe(false);
    }
  });

  it('(7) o espelho .ts se declara gerado e diz como regerar', () => {
    const ts = fs.readFileSync(ESPELHO_REAL, 'utf8');
    expect(ts).toContain('ARQUIVO GERADO');
    expect(ts).toContain('gen-matriz-retencao.cjs');
    expect(ts).toContain('as const');
  });

  it('(8) `--check` sobre o repositório REAL, sem mutação nenhuma, sai 0', () => {
    // O caso positivo explícito: um gate escrito só com casos negativos pode
    // reprovar o estado correto e ninguém nota.
    const r = spawnSync(process.execPath, [GERADOR_REAL, '--check'], { encoding: 'utf8', cwd: REPO });
    expect(`${r.stdout}${r.stderr}`).toBeTruthy();
    expect(r.status, `--check reprovou o estado real:\n${r.stdout}${r.stderr}`).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// Árvore temporária + as duas técnicas de mutação
// ---------------------------------------------------------------------------
let raiz: string;

beforeEach(() => {
  raiz = fs.mkdtempSync(path.join(os.tmpdir(), 'gen-matriz-retencao-'));
});

afterEach(() => {
  fs.rmSync(raiz, { recursive: true, force: true });
});

/**
 * Substitui EXATAMENTE uma ocorrência. Zero ou duas → lança.
 * Uma mutação que não aplicou faria o gate parecer verde sem nunca ter sido
 * exercitado — é o mesmo modo de falha do teste que não roda.
 */
function patch(fonte: string, de: string, para: string): string {
  const n = fonte.split(de).length - 1;
  if (n !== 1) {
    throw new Error(`mutação inválida: «${de.slice(0, 60)}…» casa ${n} vez(es), esperado exatamente 1`);
  }
  return fonte.replace(de, para);
}

/** Mutação ESTRUTURAL do YAML da fonte, com a garantia de que ela aplicou. */
function mutarFonte(fn: (doc: Record<string, never>) => void): string {
  const original = fs.readFileSync(FONTE_REAL, 'utf8');
  const doc = yaml.safeLoad(original) as Record<string, never>;
  const antes = JSON.stringify(doc);
  fn(doc);
  const depois = JSON.stringify(doc);
  if (antes === depois) throw new Error('mutação inválida: o documento YAML não mudou');
  return yaml.safeDump(doc);
}

interface Arvore {
  fonte?: string;
  gerador?: string;
  funil?: string;
}

/** Monta a árvore com as três entradas REAIS, opcionalmente mutadas. */
function montar(a: Arvore = {}) {
  const compliance = path.join(raiz, 'docs', 'compliance');
  const funilDir = path.join(raiz, 'src', 'features', 'triagem', 'services');
  fs.mkdirSync(path.join(compliance, 'sql'), { recursive: true });
  fs.mkdirSync(funilDir, { recursive: true });

  fs.writeFileSync(path.join(compliance, 'matriz-retencao.yaml'), a.fonte ?? fs.readFileSync(FONTE_REAL, 'utf8'));
  fs.writeFileSync(
    path.join(compliance, 'sql', 'gen-matriz-retencao.cjs'),
    a.gerador ?? fs.readFileSync(GERADOR_REAL, 'utf8'),
  );
  fs.writeFileSync(path.join(funilDir, 'triagemService.ts'), a.funil ?? fs.readFileSync(FUNIL_REAL, 'utf8'));
}

function rodar(...args: string[]) {
  const r = spawnSync(process.execPath, [path.join(raiz, 'docs', 'compliance', 'sql', 'gen-matriz-retencao.cjs'), ...args], {
    encoding: 'utf8',
    env: { ...process.env, NODE_PATH: path.join(REPO, 'node_modules') },
  });
  return { status: r.status, stdout: r.stdout ?? '', stderr: r.stderr ?? '', saida: `${r.stdout ?? ''}${r.stderr ?? ''}` };
}

const tmpJson = () => path.join(raiz, 'docs', 'compliance', 'matriz-retencao.json');
const tmpTs = () => path.join(raiz, REL_ESPELHO);

// ---------------------------------------------------------------------------
// Grupo B — os portões da GERAÇÃO, provados por execução do binário
// ---------------------------------------------------------------------------

describe('gen-matriz-retencao.cjs — os portões da geração reprovam ALTO', () => {
  it('(9) etapa do funil ausente da fonte → sai 1 NOMEANDO a etapa', () => {
    montar({
      fonte: mutarFonte((doc) => {
        delete (doc.etapas as unknown as Record<string, unknown>).entrevista_online;
      }),
    });
    const r = rodar();
    expect(r.status, `esperado != 0:\n${r.saida}`).not.toBe(0);
    expect(r.saida).toContain('entrevista_online');
    expect(r.saida).toContain('finalidade');
    expect(fs.existsSync(tmpJson()), 'artefato escrito apesar da reprovação').toBe(false);
  });

  it('(10) entrada órfã na fonte (etapa que o funil não tem) → sai 1 NOMEANDO a etapa', () => {
    montar({
      fonte: mutarFonte((doc) => {
        const etapas = doc.etapas as unknown as Record<string, unknown>;
        etapas.etapa_que_nao_existe = {
          janela_meses: 12,
          finalidade: 'texto qualquer',
          base_legal: 'LGPD, Art. 7º, VI',
        };
      }),
    });
    const r = rodar();
    expect(r.status, `esperado != 0:\n${r.saida}`).not.toBe(0);
    expect(r.saida).toContain('etapa_que_nao_existe');
    expect(r.saida).toContain(REL_FUNIL);
  });

  it('(11) finalidade esvaziada → sai 1 NOMEANDO a etapa e o campo', () => {
    montar({
      fonte: mutarFonte((doc) => {
        ((doc.etapas as unknown as Record<string, Record<string, unknown>>).triagem as Record<string, unknown>).finalidade =
          '   ';
      }),
    });
    const r = rodar();
    expect(r.status, `esperado != 0:\n${r.saida}`).not.toBe(0);
    expect(r.saida).toContain('finalidade');
    expect(r.saida).toContain('triagem');
  });

  it('(12) janela_meses fora do CHECK vivo (1..24) → sai 1 NOMEANDO a etapa', () => {
    montar({
      fonte: mutarFonte((doc) => {
        ((doc.etapas as unknown as Record<string, Record<string, unknown>>).aprovado as Record<string, unknown>).janela_meses =
          36;
      }),
    });
    const r = rodar();
    expect(r.status, `esperado != 0:\n${r.saida}`).not.toBe(0);
    expect(r.saida).toContain('aprovado');
    expect(r.saida).toContain('janela_meses');
  });

  it('(13) meta.medido_em removida → sai 1 (sem carimbo não há vigência a publicar)', () => {
    montar({
      fonte: mutarFonte((doc) => {
        delete (doc.meta as unknown as Record<string, unknown>).medido_em;
      }),
    });
    const r = rodar();
    expect(r.status, `esperado != 0:\n${r.saida}`).not.toBe(0);
    expect(r.saida).toContain('medido_em');
  });

  it('(14) bloco `etapas` esvaziado → sai 1 (fail high; lista vazia nunca é estado de tela)', () => {
    montar({
      fonte: mutarFonte((doc) => {
        (doc as unknown as Record<string, unknown>).etapas = {};
      }),
    });
    const r = rodar();
    expect(r.status, `esperado != 0:\n${r.saida}`).not.toBe(0);
    expect(r.saida.toLowerCase()).toContain('etapa');
    expect(fs.existsSync(tmpJson()), 'artefato vazio escrito apesar da reprovação').toBe(false);
  });

  it('(15) coluna administrativa na fonte → sai 1 NOMEANDO o campo (projeção mínima)', () => {
    montar({
      fonte: mutarFonte((doc) => {
        ((doc.etapas as unknown as Record<string, Record<string, unknown>>).rejeitado as Record<string, unknown>).alterado_por =
          'alguem@beautysmile.com.br';
      }),
    });
    const r = rodar();
    expect(r.status, `esperado != 0:\n${r.saida}`).not.toBe(0);
    expect(r.saida).toContain('alterado_por');
    expect(r.saida).toContain('rejeitado');
  });

  it('(16) termo banido na finalidade → sai 1 NOMEANDO o termo e a etapa', () => {
    montar({
      fonte: mutarFonte((doc) => {
        ((doc.etapas as unknown as Record<string, Record<string, unknown>>).inscricao as Record<string, unknown>).finalidade =
          'Guardamos a inscrição e eventualmente outros registros, entre outros.';
      }),
    });
    const r = rodar();
    expect(r.status, `esperado != 0:\n${r.saida}`).not.toBe(0);
    expect(r.saida).toContain('inscricao');
    expect(r.saida.toLowerCase()).toContain('banido');
  });

  it('(17) mapa de rótulos do funil não extraível → sai 1 nomeando o BLOCO e o ARQUIVO', () => {
    // Um gerador que caísse num mapa de rótulos próprio produziria a divergência
    // de nomenclatura entre a página pública e a tela do RH.
    montar({
      funil: patch(
        fs.readFileSync(FUNIL_REAL, 'utf8'),
        'export const ETAPA_M2_LABELS',
        'export const ETAPA_M2_LABELS_RENOMEADO_PELO_TESTE',
      ),
    });
    const r = rodar();
    expect(r.status, `esperado != 0:\n${r.saida}`).not.toBe(0);
    expect(r.saida).toContain('ETAPA_M2_LABELS');
    expect(r.saida).toContain(REL_FUNIL);
  });

  it('(18) array de ordem do funil não extraível → sai 1 nomeando o BLOCO', () => {
    montar({
      funil: patch(
        fs.readFileSync(FUNIL_REAL, 'utf8'),
        'export const ETAPA_M2_OPTIONS',
        'export const ETAPA_M2_OPTIONS_RENOMEADO_PELO_TESTE',
      ),
    });
    const r = rodar();
    expect(r.status, `esperado != 0:\n${r.saida}`).not.toBe(0);
    expect(r.saida).toContain('ETAPA_M2_OPTIONS');
    expect(r.saida).toContain(REL_FUNIL);
  });
});

// ---------------------------------------------------------------------------
// Grupo C — o modo `--check`, que reprova nas DUAS direções
// ---------------------------------------------------------------------------

describe('gen-matriz-retencao.cjs --check — reprova nas duas direções', () => {
  it('(19) geração determinística, e `--check` logo depois sai 0', () => {
    montar();
    expect(rodar().status).toBe(0);
    const primeiro = fs.readFileSync(tmpJson(), 'utf8');
    const primeiroTs = fs.readFileSync(tmpTs(), 'utf8');
    expect(rodar().status).toBe(0);
    // `gerado_em` é o ÚNICO campo de relógio, e é ele que o `--check` pina do
    // disco. Assertir igualdade byte a byte COM ele passaria só pela sorte do
    // milissegundo — um teste que depende do relógio é um flake com fantasia de
    // gate. A determinística é a serialização, medida com o carimbo neutralizado.
    const semCarimbo = (s: string) => s.replace(/"gerado_em": "[^"]*"/g, '"gerado_em": "<pinado>"');
    expect(semCarimbo(fs.readFileSync(tmpJson(), 'utf8'))).toBe(semCarimbo(primeiro));
    expect(semCarimbo(fs.readFileSync(tmpTs(), 'utf8'))).toBe(semCarimbo(primeiroTs));

    const c = rodar('--check');
    expect(c.status, `--check reprovou logo após a geração:\n${c.saida}`).toBe(0);
    expect(c.saida).toContain('OK');
  });

  it('(20) `--check` com o espelho .ts APAGADO → sai 1 tratando ausência como divergência', () => {
    montar();
    expect(rodar().status).toBe(0);
    fs.rmSync(tmpTs());
    const r = rodar('--check');
    expect(r.status, `esperado != 0:\n${r.saida}`).not.toBe(0);
    expect(r.saida).toContain(REL_ESPELHO);
    expect(r.saida).toContain('ausente');
    // Ausência é DIVERGÊNCIA, nunca um erro de I/O vazando para o operador.
    expect(r.saida).not.toContain('ENOENT');
  });

  it('(21) `--check` com o espelho .ts editado à mão e o .json INTACTO → sai 1 nomeando o .ts', () => {
    montar();
    expect(rodar().status).toBe(0);
    const jsonAntes = fs.readFileSync(tmpJson(), 'utf8');
    fs.writeFileSync(
      tmpTs(),
      patch(fs.readFileSync(tmpTs(), 'utf8'), 'export type EtapaRetencao', '// editado à mão\nexport type EtapaRetencao'),
    );
    const r = rodar('--check');
    expect(r.status, `esperado != 0:\n${r.saida}`).not.toBe(0);
    // A prova da conferência SEPARADA: o .json continua em dia e o gate reprova
    // mesmo assim, nomeando o artefato divergente.
    expect(fs.readFileSync(tmpJson(), 'utf8')).toBe(jsonAntes);
    expect(r.saida).toContain(REL_ESPELHO);
    expect(r.saida).toContain('não corresponde');
  });

  it('(22) fonte editada e artefatos NÃO regerados → sai 1 nomeando o .json e o comando', () => {
    montar();
    expect(rodar().status).toBe(0);
    fs.writeFileSync(
      path.join(raiz, 'docs', 'compliance', 'matriz-retencao.yaml'),
      mutarFonte((doc) => {
        ((doc.etapas as unknown as Record<string, Record<string, unknown>>).triagem as Record<string, unknown>).janela_meses =
          12;
      }),
    );
    const r = rodar('--check');
    expect(r.status, `esperado != 0:\n${r.saida}`).not.toBe(0);
    expect(r.saida).toContain('matriz-retencao.json');
    expect(r.saida).toContain('gen-matriz-retencao.cjs');
  });
});
