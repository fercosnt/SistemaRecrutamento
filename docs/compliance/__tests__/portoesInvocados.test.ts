/**
 * portoesInvocados.test.ts — o teste que impede o PRÓXIMO portão órfão.
 *
 * Requirement: TRANSP-02 · CONSOL-04 · Phase 47 / Plan 47-01
 *
 * POR QUE ESTE TESTE EXISTE, E POR QUE NESTA FASE
 * O CONSOL-04 define promessa órfã como *promessa sem código que a execute*. Um
 * script `check:*` que ninguém invoca é exatamente isso — com o agravante de que
 * ele **parece** um portão em toda leitura de docblock. Medido em 2026-08-09,
 * antes deste plano:
 *
 *   | script                  | invocado no pre-commit | invocado no CI | estado  |
 *   |-------------------------|------------------------|----------------|---------|
 *   | check:export-allowlist  | não                    | sim            | portão  |
 *   | check:recibo-exclusao   | não                    | não            | ÓRFÃO   |
 *   | check:resend-dominio    | não                    | não            | exceção |
 *
 * E `gen-pii-md.cjs` já implementava `--check` sem sequer ter script. Uma fase que
 * autorasse um terceiro portão órfão enquanto escreve o detector de promessas
 * órfãs seria auto-refutante.
 *
 * A REGRA, EM UMA FRASE
 * Todo script cujo nome começa com `check:` está invocado num workflow do
 * GitHub Actions **ou** está na constante `EXCECOES` abaixo com razão escrita.
 * Não há terceira opção, e a mensagem de reprovação NOMEIA o script.
 *
 * ⚠ POR QUE OS COMENTÁRIOS DO WORKFLOW SÃO REMOVIDOS ANTES DA BUSCA
 * O comentário do `ci.yml` MENCIONA `check:resend-dominio` para registrar por que
 * ele fica de fora. Um detector que buscasse no texto cru contaria essa menção
 * como invocação e passaria por vacuidade — a mesma classe de defeito de um guard
 * cujo próprio docblock contém a string que ele proíbe. A busca é sobre os
 * comandos, nunca sobre a prosa.
 */
import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

const REPO = path.resolve(__dirname, '..', '..', '..');
const PACKAGE_JSON = path.join(REPO, 'package.json');
const WORKFLOWS = path.join(REPO, '.github', 'workflows');

const PREFIXO = 'check:';

/**
 * A LISTA VERSIONADA DE EXCEÇÕES — script → razão escrita.
 *
 * Uma exceção só é honesta quando a razão sobrevive à leitura de quem chegou
 * depois. Razão vazia (ou curta demais para dizer alguma coisa) reprova: sem ela
 * a exceção vira o mesmo buraco que o teste existe para fechar.
 */
const EXCECOES: Record<string, string> = {
  'check:resend-dominio':
    'Reporter opt-in da DELIV-01 (Phase 36), PROIBIDO em CI pelo próprio docblock: é o único script do repositório que fala com a rede e precisa de uma credencial viva do Resend. Ligá-lo ao CI forçaria a chave para dentro do GitHub Secrets — trocaria uma lacuna de documentação por uma superfície de exposição de credencial (ameaça T-36-03-03). Sai 0 sem chave por desenho: é conveniência, não portão.',
};

/** Razão com menos que isto não é razão — é a aparência de uma. */
const RAZAO_MINIMA = 60;

// ---------------------------------------------------------------------------
// Leitura do disco
// ---------------------------------------------------------------------------

function scriptsDeVerificacao(): string[] {
  const pkg = JSON.parse(fs.readFileSync(PACKAGE_JSON, 'utf8')) as { scripts: Record<string, string> };
  return Object.keys(pkg.scripts).filter((s) => s.startsWith(PREFIXO));
}

/** Todo o texto dos workflows, COM OS COMENTÁRIOS REMOVIDOS. Ver o docblock. */
function comandosDosWorkflows(): string {
  return fs
    .readdirSync(WORKFLOWS)
    .filter((f) => f.endsWith('.yml') || f.endsWith('.yaml'))
    .map((f) => fs.readFileSync(path.join(WORKFLOWS, f), 'utf8'))
    .join('\n')
    .split('\n')
    .filter((l) => !/^\s*#/.test(l))
    .join('\n');
}

/** O bloco do job `unit` do `ci.yml`, sem comentários. */
function jobUnit(): string {
  const ci = fs
    .readFileSync(path.join(WORKFLOWS, 'ci.yml'), 'utf8')
    .split('\n')
    .filter((l) => !/^\s*#/.test(l))
    .join('\n');
  const m = ci.match(/\n {2}unit:\n([\s\S]*?)(?=\n {2}[a-z][a-z0-9-]*:\n)/);
  expect(m, 'job `unit` não encontrado em ci.yml').toBeTruthy();
  return m![1];
}

// ---------------------------------------------------------------------------
// As duas regras, como funções puras — é o que permite PROVAR que elas mordem
// ---------------------------------------------------------------------------

/** Scripts que não são invocados e não estão declarados como exceção. */
export function detectarOrfaos(scripts: string[], comandos: string, excecoes: Record<string, string>): string[] {
  return scripts.filter((s) => !comandos.includes(s) && !Object.prototype.hasOwnProperty.call(excecoes, s));
}

/** Exceções cuja razão está ausente, vazia ou curta demais para ser razão. */
export function detectarExcecoesSemRazao(excecoes: Record<string, string>): string[] {
  return Object.keys(excecoes).filter((s) => (excecoes[s] ?? '').trim().length < RAZAO_MINIMA);
}

const comoResolver = (orfaos: string[]) =>
  `portão órfão: ${orfaos.join(', ')}\n` +
  `  Um script não invocado NÃO é portão — ele roda quando um humano lembra.\n` +
  `  Duas saídas: (a) invocar no job \`unit\` do .github/workflows/ci.yml, ou\n` +
  `               (b) declarar em EXCECOES neste arquivo, com a razão escrita.`;

// ---------------------------------------------------------------------------

describe('portões de verificação — nenhum promete sem ser executado', () => {
  it('(1) todo script `check:*` está invocado num workflow ou é exceção declarada', () => {
    const scripts = scriptsDeVerificacao();
    expect(scripts.length, 'nenhum script check:* encontrado — o detector estaria vazio').toBeGreaterThan(0);
    const orfaos = detectarOrfaos(scripts, comandosDosWorkflows(), EXCECOES);
    expect(orfaos, comoResolver(orfaos)).toEqual([]);
  });

  it('(2) toda exceção declarada carrega razão escrita', () => {
    const semRazao = detectarExcecoesSemRazao(EXCECOES);
    expect(semRazao, `exceção sem razão escrita: ${semRazao.join(', ')}`).toEqual([]);
  });

  it('(3) toda exceção declarada corresponde a um script que existe', () => {
    // Uma exceção para um script inexistente é ruído versionado: ela mascara o dia
    // em que alguém recriar aquele nome e o detector deixar de olhar para ele.
    const scripts = scriptsDeVerificacao();
    for (const s of Object.keys(EXCECOES)) {
      expect(scripts, `exceção para script inexistente: ${s}`).toContain(s);
    }
  });

  it('(4) os QUATRO portões de artefato estão no job `unit` do ci.yml', () => {
    const unit = jobUnit();
    for (const portao of [
      'check:export-allowlist',
      'check:recibo-exclusao',
      'check:matriz-retencao',
      'check:pii-inventory-md',
    ]) {
      expect(unit, `portão de artefato fora do job unit: ${portao}`).toContain(portao);
    }
  });

  it('(5) a MENÇÃO em comentário não conta como invocação', () => {
    // Prova de que o strip de comentários funciona: o `ci.yml` cru menciona a
    // exceção do Resend (é onde a razão fica registrada para quem lê o workflow),
    // e ela continua NÃO aparecendo na superfície de comandos.
    const cru = fs.readFileSync(path.join(WORKFLOWS, 'ci.yml'), 'utf8');
    expect(cru, 'o ci.yml deveria registrar a exceção declarada em comentário').toContain('check:resend-dominio');
    expect(comandosDosWorkflows()).not.toContain('check:resend-dominio');
  });

  it('(6) o detector REPROVA um portão órfão, nomeando o script', () => {
    // Um detector que nunca foi visto reprovando não é um detector.
    const orfaos = detectarOrfaos(['check:export-allowlist', 'check:inventado'], 'npm run check:export-allowlist', EXCECOES);
    expect(orfaos).toEqual(['check:inventado']);
    expect(comoResolver(orfaos)).toContain('check:inventado');
  });

  it('(7) o detector REPROVA uma exceção sem razão escrita', () => {
    expect(detectarExcecoesSemRazao({ 'check:mudo': '' })).toEqual(['check:mudo']);
    expect(detectarExcecoesSemRazao({ 'check:vago': 'porque sim' })).toEqual(['check:vago']);
    expect(detectarExcecoesSemRazao(EXCECOES)).toEqual([]);
  });
});
