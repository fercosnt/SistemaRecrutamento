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
 */
import { describe, it, expect } from 'vitest';
import { spawnSync } from 'child_process';
import fs from 'fs';
import path from 'path';

const REPO = path.resolve(__dirname, '..', '..', '..');
const GERADOR_REAL = path.join(REPO, 'docs', 'compliance', 'sql', 'gen-matriz-retencao.cjs');
const FONTE_REAL = path.join(REPO, 'docs', 'compliance', 'matriz-retencao.yaml');
const ARTEFATO_REAL = path.join(REPO, 'docs', 'compliance', 'matriz-retencao.json');
const ESPELHO_REAL = path.join(REPO, 'src', 'features', 'transparencia', 'constants', 'matrizRetencao.generated.ts');
const FUNIL_REAL = path.join(REPO, 'src', 'features', 'triagem', 'services', 'triagemService.ts');

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
