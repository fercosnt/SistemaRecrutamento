/**
 * genExportAllowlist.test.ts — o fecho do BD-6 em forma executável.
 *
 * Requirement: EXPORT-02 · EXPORT-06 · Phase 44 / Plan 44-01 (Task 3)
 *
 * POR QUE ESTE ARQUIVO MORA EM `__tests__/`
 * O `include` do Vitest é `**\/__tests__\/**\/*.{test,spec}.{ts,tsx}`
 * (`vite.config.ts:13`). Um teste FORA de um diretório `__tests__/` não roda e
 * não falha — ele simplesmente não existe para o runner. Um teste que não roda
 * é a forma mais barata de fabricar um falso verde, e esta fase inteira existe
 * para impedir falsos verdes.
 *
 * COMO ESTES TESTES FUNCIONAM
 * Cada caso monta uma ÁRVORE TEMPORÁRIA mínima (catálogo + inventário +
 * scope-rules + uma cópia do gerador) e executa o gerador como PROCESSO,
 * asserindo código de saída, stdout e stderr. Rodar o binário de verdade é o
 * que torna a asserção sobre `process.exit(1)` real: um import da função
 * interna provaria a lógica e não o CONTRATO, e o contrato aqui é "a geração
 * PARA".
 *
 * `spawnSync` em vez de `execFileSync`: o segundo LANÇA em saída não-zero, e
 * seis destes nove casos existem justamente para asserir saída não-zero.
 * Mesmo módulo, mesma chamada de processo, sem try/catch cerimonial.
 *
 * `NODE_PATH` aponta para o `node_modules` do repositório porque o gerador
 * `require('js-yaml')` e a árvore temporária vive em `os.tmpdir()`.
 */
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { spawnSync } from 'child_process';
import fs from 'fs';
import os from 'os';
import path from 'path';

const REPO = path.resolve(__dirname, '..', '..', '..');
const GERADOR_REAL = path.join(REPO, 'docs', 'compliance', 'sql', 'gen-export-allowlist.cjs');

// ---------------------------------------------------------------------------
// Fixtures mínimas — pequenas de propósito. Uma fixture grande esconde qual
// linha causou o resultado.
// ---------------------------------------------------------------------------

type ColunaViva = { tabela: string; coluna: string; tipo: string };

const CATALOGO_BASE: ColunaViva[] = [
  { tabela: 'candidatos', coluna: 'id', tipo: 'uuid' },
  { tabela: 'candidatos', coluna: 'nome_completo', tipo: 'character varying' },
  { tabela: 'candidatos', coluna: 'user_id', tipo: 'uuid' },
  { tabela: 'candidatos', coluna: 'created_at', tipo: 'timestamp with time zone' },
  { tabela: 'candidatos', coluna: 'ativo', tipo: 'boolean' },
  { tabela: 'autorizacoes', coluna: 'candidato_id', tipo: 'uuid' },
  { tabela: 'autorizacoes', coluna: 'autorizacao_uso_dados', tipo: 'boolean' },
  { tabela: 'autorizacoes', coluna: 'consent_text_version', tipo: 'text' },
  { tabela: 'autorizacoes', coluna: 'avaliador_id', tipo: 'uuid' },
  { tabela: 'ai_call_logs', coluna: 'id', tipo: 'uuid' },
  { tabela: 'ai_call_logs', coluna: 'raw_response', tipo: 'jsonb' },
  { tabela: 'config_sla_dados', coluna: 'chave', tipo: 'text' },
];

const MEDIDO_EM = '2026-08-03T06:09:19Z';

function catalogo(colunas: ColunaViva[] = CATALOGO_BASE): string {
  return JSON.stringify(
    {
      meta: {
        medido_em: MEDIDO_EM,
        projeto: 'isljnozzlvckrgjjbjwp',
        query_reprodutora: 'docs/compliance/sql/01-pii-catalog.sql',
      },
      colunas,
    },
    null,
    2,
  );
}

const INVENTARIO = `
meta:
  requirement: INVENT-01
  coletado_em: "2026-07-29T14:08:18Z"
classificacoes:
  preservar: "nao e dado pessoal"
  anonimizar: "ponteiro ou identificante"
regras_padrao:
  - id: R1
    padrao: "id, *_id (chaves tecnicas), created_at, updated_at, deleted_at, *_em"
    classificacao: preservar
    razao: "identificador tecnico"
  - id: R2
    padrao: "user_id, candidato_id, avaliador_id"
    classificacao: anonimizar
    razao: "ponteiro para pessoa"
  - id: R3
    padrao: "flags booleanas, contadores, enums de status/etapa"
    classificacao: preservar
    razao: "estado de processo"
  - id: R4
    padrao: "campos de configuracao de vaga, templates, itens de teste"
    classificacao: preservar
    razao: "conteudo do produto"
  - id: R5
    padrao: "colunas jsonb de analise de IA (analise_ia*, raw_response)"
    classificacao: preservar_com_ressalva
    razao: "conteudo potencialmente PII"
tabelas:
  candidatos:
    colunas:
      nome_completo: { classificacao: anonimizar, tipo: varchar }
  autorizacoes:
    colunas:
      autorizacao_uso_dados: { classificacao: preservar, tipo: boolean }
tabelas_sem_pii_titular:
  regra_aplicada: R4
  nota: "conteudo do produto"
  lista: []
`;

/** Escopo mínimo que FECHA contra o `CATALOGO_BASE`. */
function escopo(patch: string = ''): string {
  return `
meta:
  requirement: EXPORT-02
  fase: 44
  plano: 44-01
  versao: "1.0.0"
  fonte: "fixture de teste"
  consumidores:
    - "Phase 44 — projecao da Edge Function exportar-meus-dados"
    - "Phase 45 — plano de exclusao/anonimizacao"
escopo_titular:
  candidatos:
    chave_titular: id
    ligacao: direta
    razao: "o cadastro"
  autorizacoes:
    chave_titular: candidato_id
    ligacao: direta
    razao: "prova de consentimento"
fora_do_escopo:
  ai_call_logs: telemetria_interna
fora_do_escopo_por_regra:
  - id: FE1
    padrao: "config_*"
    razao: configuracao_do_produto
colunas_nunca:
  - session_token
  - secret
ponteiros:
  do_titular:
    - user_id
    - candidato_id
  de_terceiro:
    - avaliador_id
decisoes_por_coluna:
  autorizacoes.consent_text_version:
    export: true
    razao: "ROADMAP Phase 44 Depends on — consentimento versionado (BD-6)"
regra_de_fecho: |
  Toda tabela viva cai em escopo_titular, fora_do_escopo ou regra.
${patch}`;
}

// ---------------------------------------------------------------------------
// Árvore temporária
// ---------------------------------------------------------------------------

let raiz: string;

interface Arvore {
  catalogo?: string | null;
  inventario?: string;
  escopo?: string;
}

function montar({ catalogo: cat = catalogo(), inventario = INVENTARIO, escopo: esc = escopo() }: Arvore = {}) {
  const compliance = path.join(raiz, 'docs', 'compliance');
  fs.mkdirSync(path.join(compliance, 'sql'), { recursive: true });
  fs.mkdirSync(path.join(raiz, 'supabase', 'functions', '_shared'), { recursive: true });
  fs.copyFileSync(GERADOR_REAL, path.join(compliance, 'sql', 'gen-export-allowlist.cjs'));
  if (cat !== null) fs.writeFileSync(path.join(compliance, 'catalogo-vivo-44.json'), cat);
  fs.writeFileSync(path.join(compliance, 'pii-inventory.yaml'), inventario);
  fs.writeFileSync(path.join(compliance, 'export-scope-rules.yaml'), esc);
}

function rodar(...args: string[]) {
  const r = spawnSync(process.execPath, [path.join(raiz, 'docs', 'compliance', 'sql', 'gen-export-allowlist.cjs'), ...args], {
    encoding: 'utf8',
    env: { ...process.env, NODE_PATH: path.join(REPO, 'node_modules') },
  });
  return { status: r.status, stdout: r.stdout ?? '', stderr: r.stderr ?? '' };
}

const CAMINHO_JSON = () => path.join(raiz, 'docs', 'compliance', 'export-allowlist.json');
const CAMINHO_TS = () => path.join(raiz, 'supabase', 'functions', '_shared', 'exportAllowlist.ts');
const lerJson = () => JSON.parse(fs.readFileSync(CAMINHO_JSON(), 'utf8'));

beforeEach(() => {
  raiz = fs.mkdtempSync(path.join(os.tmpdir(), 'gen-export-allowlist-'));
});

afterEach(() => {
  fs.rmSync(raiz, { recursive: true, force: true });
});

// ---------------------------------------------------------------------------

describe('gen-export-allowlist.cjs', () => {
  it('(a) caminho feliz: fixtures que fecham geram os dois artefatos com medido_em copiado do catalogo', () => {
    montar();
    const r = rodar();
    expect(r.stderr).toBe('');
    expect(r.status).toBe(0);

    const j = lerJson();
    // O carimbo de medicao NUNCA e gerado pelo script — e copiado do catalogo.
    // Um `medido_em` inventado seria proveniencia falsa (T-44-13).
    expect(j.meta.medido_em).toBe(MEDIDO_EM);
    expect(j.meta.versao).toBe('1.0.0');
    expect(JSON.stringify(j.meta.consumidores)).toContain('Phase 45');

    // So as tabelas em escopo, e so as colunas em escopo.
    expect(Object.keys(j.tabelas).sort()).toEqual(['autorizacoes', 'candidatos']);
    expect(j.tabelas.candidatos.chave_titular).toBe('id');
    expect(j.tabelas.candidatos.colunas).toEqual(['ativo', 'created_at', 'id', 'nome_completo', 'user_id']);
    expect(j.tabelas.autorizacoes.colunas).toContain('consent_text_version');

    // Ponteiro de TERCEIRO nao sai na copia do titular.
    expect(j.tabelas.autorizacoes.colunas).not.toContain('avaliador_id');

    // Tabela fora do escopo aparece com razao NOMEADA, nunca some em silencio.
    expect(j.excluidas.ai_call_logs).toBe('telemetria_interna');
    expect(j.excluidas.config_sla_dados).toBe('configuracao_do_produto');

    // O espelho .ts nasce junto — uma fonte, dois artefatos.
    expect(fs.existsSync(CAMINHO_TS())).toBe(true);
    expect(fs.readFileSync(CAMINHO_TS(), 'utf8')).toContain('EXPORT_ALLOWLIST');
  });

  it('(b) BD-6: coluna viva sem veredito e ERRO DE FECHAMENTO que nomeia a coluna', () => {
    // `autorizacoes.consent_text_version` e a coluna que o BD-6 mediu com ZERO
    // ocorrencias no pii-inventory.yaml. Sem a entrada em decisoes_por_coluna
    // ela nao casa com R1 (nao e *_id nem *_em), nao e ponteiro, nao e tipo de
    // R3 (e text) e nao e R5 — exatamente o buraco por onde a dependencia
    // declarada da fase sairia EM SILENCIO da allowlist.
    const semDecisao = escopo().replace(
      /decisoes_por_coluna:[\s\S]*?razao: "[^"]*"\n/,
      'decisoes_por_coluna: {}\n',
    );
    montar({ escopo: semDecisao });

    const r = rodar();
    expect(r.status).toBe(1);
    expect(r.stderr).toContain('autorizacoes.consent_text_version');
    expect(fs.existsSync(CAMINHO_JSON())).toBe(false);
  });

  it('(c) tabela viva sem disposicao e ERRO DE FECHAMENTO que nomeia a tabela', () => {
    montar({
      catalogo: catalogo([...CATALOGO_BASE, { tabela: 'tabela_nova_nao_declarada', coluna: 'id', tipo: 'uuid' }]),
    });

    const r = rodar();
    expect(r.status).toBe(1);
    expect(r.stderr).toContain('tabela_nova_nao_declarada');
    expect(fs.existsSync(CAMINHO_JSON())).toBe(false);
  });

  it('(d) chave_titular inexistente no catalogo falha a geracao', () => {
    // O mapa de chaves e DADO. Um dado errado tem de parar a geracao em vez de
    // produzir uma leitura vazia em runtime — um export honesto por acidente de
    // estar em branco e o pior dos dois mundos.
    montar({ escopo: escopo().replace('chave_titular: candidato_id', 'chave_titular: candidato_id_inexistente') });

    const r = rodar();
    expect(r.status).toBe(1);
    expect(r.stderr).toContain('candidato_id_inexistente');
    expect(fs.existsSync(CAMINHO_JSON())).toBe(false);
  });

  it('(e) veto de colunas_nunca atravessa tabela EM escopo, mesmo com entrada explicita no inventario', () => {
    const comToken = catalogo([...CATALOGO_BASE, { tabela: 'candidatos', coluna: 'session_token', tipo: 'text' }]);
    const invComToken = INVENTARIO.replace(
      'nome_completo: { classificacao: anonimizar, tipo: varchar }',
      'nome_completo: { classificacao: anonimizar, tipo: varchar }\n      session_token: { classificacao: preservar, tipo: text }',
    );
    montar({ catalogo: comToken, inventario: invComToken });

    const r = rodar();
    expect(r.status).toBe(0);
    const j = lerJson();
    expect(j.tabelas.candidatos.colunas).not.toContain('session_token');
    // E o veto e VISIVEL: exclusao silenciosa e a mesma classe de defeito que
    // inclusao silenciosa.
    expect(JSON.stringify(j.tabelas.candidatos.colunas_excluidas)).toContain('session_token');
  });

  it('(f) --check sai 0 quando o .json bate e 1 quando diverge', () => {
    montar();
    expect(rodar().status).toBe(0);
    expect(rodar('--check').status).toBe(0);

    const j = lerJson();
    j.tabelas.candidatos.colunas.push('coluna_injetada_a_mao');
    fs.writeFileSync(CAMINHO_JSON(), JSON.stringify(j, null, 2) + '\n');

    const r = rodar('--check');
    expect(r.status).toBe(1);
    expect(r.stderr).toContain('export-allowlist.json');
  });

  it('(g) --check cobre TAMBEM o espelho .ts — um dos dois apodrecendo e o modo de falha', () => {
    montar();
    expect(rodar().status).toBe(0);
    expect(rodar('--check').status).toBe(0);

    fs.writeFileSync(CAMINHO_TS(), '// editado a mao\nexport const EXPORT_ALLOWLIST = {} as const;\n');
    const alterado = rodar('--check');
    expect(alterado.status).toBe(1);
    expect(alterado.stderr).toContain('exportAllowlist.ts');

    fs.rmSync(CAMINHO_TS());
    const apagado = rodar('--check');
    expect(apagado.status).toBe(1);
    expect(apagado.stderr).toContain('exportAllowlist.ts');
  });

  it('(h) catalogo ausente sai 1 citando o caminho esperado e o plano que o produz', () => {
    // E o que impede uma allowlist derivada de documento DATADO enquanto o
    // 44-03 (a medicao viva) ainda nao rodou.
    montar({ catalogo: null });

    const r = rodar();
    expect(r.status).toBe(1);
    expect(r.stderr).toContain('catalogo-vivo-44.json');
    expect(r.stderr).toContain('44-03');
    expect(fs.existsSync(CAMINHO_JSON())).toBe(false);
  });

  it('(i) --sql-values imprime pares colaveis ordenados e NADA mais', () => {
    montar();
    const r = rodar('--sql-values');
    expect(r.status).toBe(0);

    // ⚠ NAO usar .trim() aqui: ele comeria a indentacao da PRIMEIRA linha e a
    // isentaria do contrato asserido abaixo — a linha 1 passaria com qualquer
    // recuo. So o \n final e removido.
    const linhas = r.stdout.replace(/\n$/, '').split('\n');
    expect(linhas.length).toBeGreaterThan(0);
    for (const l of linhas) {
      // A INDENTACAO DE 4 ESPACOS FAZ PARTE DO CONTRATO — ver o docblock de
      // `emitirPares`. O extrator da assercao (k) de exportAllowlist.test.ts casa
      // `/^ {4}\(...\)/` com o {4} literal, entao uma saida sem recuo faz aquele
      // gate ler ZERO pares e acusar "o VALUES envelheceu" — apontando para a
      // causa errada.
      //
      // Ate o plano 44-04 este regex pinava a forma SEM recuo, e as duas
      // assercoes da mesma fase contradiziam uma a outra sobre os mesmos bytes.
      // O comentario logo abaixo ("colavel sem edicao manual") ja dizia qual das
      // duas estava certa: a saida so e colavel sem edicao se ela ja vier
      // indentada. O regex e que discordava da propria intencao do teste.
      expect(l).toMatch(/^ {4}\('[a-z0-9_]+','[a-z0-9_]+'\),?$/);
    }
    // Ordenado por tabela e coluna — determinismo e o que torna a saida colavel
    // sem edicao manual.
    const chaves = linhas.map((l) => l.replace(/[(),']/g, '|'));
    expect([...chaves].sort()).toEqual(chaves);
    // A ultima linha nao carrega virgula: cola direto no VALUES.
    expect(linhas[linhas.length - 1].endsWith(',')).toBe(false);
    // Nenhum ruido: o par de uma tabela EXCLUIDA nunca aparece.
    expect(r.stdout).not.toContain('ai_call_logs');
  });
});
