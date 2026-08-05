/**
 * genReciboExclusao.test.ts — o backstop E4·error e E4·partial da 45-UI-SPEC
 * em forma executável.
 *
 * Requirement: ERASE-07 · ERASE-09 · Phase 45 / Plan 45-02 (Task 2)
 *
 * POR QUE ESTE ARQUIVO MORA EM `__tests__/`
 * O `include` do Vitest é `**\/__tests__\/**\/*.{test,spec}.{ts,tsx}`
 * (`vite.config.ts:13`). Um teste FORA de um diretório `__tests__/` não roda e
 * não falha — ele simplesmente não existe para o runner, e um teste que não roda
 * é a forma mais barata de fabricar um falso verde.
 *
 * POR QUE NÃO HÁ `toMatchSnapshot()` NENHUM AQUI, E ISSO É O PONTO
 * A 45-UI-SPEC §UI Considerations, linha E4·error, diz literalmente por quê:
 * uma asserção de snapshot do texto do recibo *"passaria numa lista honesta hoje
 * e continuaria passando depois de o motor deixar de apagar algo"*. O backstop
 * real é o confronto entre as linhas da coluna «sai» e o vocabulário de passos
 * do motor, **nas duas direções**:
 *
 *   · linha sem passo  → uma promessa sem executor (superestimação);
 *   · passo sem linha  → um apagamento que o titular nunca soube que aconteceu.
 *
 * COMO OS TESTES DE GATE FUNCIONAM — mutação de fonte, não de fixture
 * O irmão `genExportAllowlist.test.ts` varia FIXTURES porque os vereditos dele
 * moram em YAML. Aqui o mapeamento «item legível → colunas» mora DENTRO do
 * gerador (é ele o artefato desta tarefa), então cada gate é provado montando
 * uma árvore temporária com o inventário REAL e uma cópia MUTADA do gerador, e
 * asserindo `process.exit(1)` mais a mensagem. Rodar o binário de verdade é o
 * que torna a asserção sobre o contrato real: o contrato aqui é "a geração
 * PARA".
 *
 * `patch()` reprova quando a substituição não casa exatamente uma vez — uma
 * mutação que não aplicou faria o teste passar por vacuidade, que é o falso
 * verde que este arquivo inteiro existe para impedir.
 *
 * `spawnSync` em vez de `execFileSync`: o segundo LANÇA em saída não-zero, e a
 * maioria destes casos existe justamente para asserir saída não-zero.
 */
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { spawnSync } from 'child_process';
import fs from 'fs';
import os from 'os';
import path from 'path';

const REPO = path.resolve(__dirname, '..', '..', '..');
const GERADOR_REAL = path.join(REPO, 'docs', 'compliance', 'sql', 'gen-recibo-exclusao.cjs');
const INVENTARIO_REAL = path.join(REPO, 'docs', 'compliance', 'pii-inventory.yaml');
const ARTEFATO_REAL = path.join(REPO, 'docs', 'compliance', 'recibo-exclusao.json');

// ---------------------------------------------------------------------------
// Tipos mínimos do artefato — só o que estes testes leem
// ---------------------------------------------------------------------------
interface ItemRecibo {
  item_id: string;
  rotulo: string;
  texto_futuro: string;
  texto_passado: string;
  aplicavel_quando: string;
  colunas_origem: string[];
  passo_motor?: string;
  base_legal?: string;
  obrigatorio?: boolean;
}

interface Recibo {
  meta: {
    campos_de_texto_de_titular: string[];
    banidos_vocabulario: string[];
    banidos_totalidade: string[];
  };
  passos_motor: string[];
  aplicabilidade: string[];
  cabecalhos: Record<string, Record<string, string>>;
  colunas_sai: ItemRecibo[];
  colunas_mantem: ItemRecibo[];
}

const recibo: Recibo = JSON.parse(fs.readFileSync(ARTEFATO_REAL, 'utf8'));

/** As TRÊS da UI-SPEC §Recibo regra 4, por CHAVE ESTÁVEL — nunca por casar texto. */
const OBRIGATORIAS = ['justificativa_do_recrutador', 'historico_das_etapas', 'numeros_agregados'];

// ---------------------------------------------------------------------------
// Árvore temporária + mutação de fonte
// ---------------------------------------------------------------------------
let raiz: string;

beforeEach(() => {
  raiz = fs.mkdtempSync(path.join(os.tmpdir(), 'gen-recibo-exclusao-'));
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

/** Monta a árvore com o inventário REAL e o gerador (opcionalmente mutado). */
function montar(mutacao?: (fonte: string) => string) {
  const compliance = path.join(raiz, 'docs', 'compliance');
  fs.mkdirSync(path.join(compliance, 'sql'), { recursive: true });
  fs.copyFileSync(INVENTARIO_REAL, path.join(compliance, 'pii-inventory.yaml'));

  const original = fs.readFileSync(GERADOR_REAL, 'utf8');
  const fonte = mutacao ? mutacao(original) : original;
  if (mutacao) expect(fonte).not.toBe(original);
  fs.writeFileSync(path.join(compliance, 'sql', 'gen-recibo-exclusao.cjs'), fonte);
}

function rodar(...args: string[]) {
  const r = spawnSync(process.execPath, [path.join(raiz, 'docs', 'compliance', 'sql', 'gen-recibo-exclusao.cjs'), ...args], {
    encoding: 'utf8',
    env: { ...process.env, NODE_PATH: path.join(REPO, 'node_modules') },
  });
  return { status: r.status, stdout: r.stdout ?? '', stderr: r.stderr ?? '' };
}

/** Todo texto que o TITULAR lê — e só ele. Ver o comentário do gerador sobre escopo. */
function textosDeTitular(r: Recibo): string[] {
  const textos: string[] = Object.values(r.cabecalhos).flatMap((c) => Object.values(c));
  for (const item of [...r.colunas_sai, ...r.colunas_mantem]) {
    for (const campo of r.meta.campos_de_texto_de_titular) {
      const v = (item as unknown as Record<string, unknown>)[campo];
      if (typeof v === 'string') textos.push(v);
    }
  }
  return textos;
}

/**
 * O recorte que o componente (45-08) e o e-mail (45-10) aplicam: a linha cujo
 * predicado não vale para o titular é OMITIDA, nunca renderizada vazia.
 */
function filtrar(itens: ItemRecibo[], contexto: Record<string, boolean>): ItemRecibo[] {
  return itens.filter((i) => i.aplicavel_quando === 'sempre' || contexto[i.aplicavel_quando] === true);
}

// ---------------------------------------------------------------------------

describe('recibo-exclusao.json — o artefato', () => {
  it('(1) E4·error, ida: toda linha «sai» carrega um passo_motor do vocabulário fechado', () => {
    expect(recibo.colunas_sai.length).toBeGreaterThan(0);
    for (const item of recibo.colunas_sai) {
      expect(item.passo_motor, `linha «sai» sem passo: ${item.item_id}`).toBeTruthy();
      expect(recibo.passos_motor, `passo fora do vocabulário em ${item.item_id}`).toContain(item.passo_motor);
    }
    // O vocabulário é FECHADO em sete valores — é o contrato que 45-07 e 45-10 assinam.
    expect([...recibo.passos_motor].sort()).toEqual(
      [
        'auth_delete_user',
        'scrub_ledger_email',
        'severar_fks_set_null',
        'severar_user_id',
        'storage_remove',
        'tombstone_candidato',
        'tombstone_decisao_final',
      ].sort(),
    );
  });

  it('(2) E4·error, volta: cada um dos sete passos tem ao menos uma linha «sai»', () => {
    // Um passo do motor sem linha de recibo é um apagamento que o titular nunca
    // soube que aconteceu. Um snapshot de texto não pega isto — passaria numa
    // lista honesta hoje e continuaria passando quando o motor mudasse.
    for (const passo of recibo.passos_motor) {
      const linhas = recibo.colunas_sai.filter((i) => i.passo_motor === passo);
      expect(linhas.length, `passo sem linha de recibo: ${passo}`).toBeGreaterThan(0);
    }
  });

  it('(3) as três linhas obrigatórias da coluna «mantém» existem, por chave estável', () => {
    // Por `item_id`, NUNCA por casar o texto: uma edição de copy aprovada não
    // pode reprovar o teste, mas a remoção do item TEM de reprovar.
    for (const id of OBRIGATORIAS) {
      const item = recibo.colunas_mantem.find((i) => i.item_id === id);
      expect(item, `linha obrigatória ausente: ${id}`).toBeDefined();
      expect(item!.obrigatorio).toBe(true);
      expect(item!.base_legal, `linha obrigatória sem base legal: ${id}`).toBeTruthy();
    }
    // E toda linha «mantém», obrigatória ou não, cita a base legal ao lado.
    for (const item of recibo.colunas_mantem) {
      expect(item.base_legal?.trim(), `linha «mantém» sem base legal: ${item.item_id}`).toBeTruthy();
    }
  });

  it('(4) nenhum texto de titular casa com os banidos de vocabulário nem com os de totalidade', () => {
    const banidos = [...recibo.meta.banidos_vocabulario, ...recibo.meta.banidos_totalidade];
    expect(banidos.length).toBeGreaterThan(0);
    for (const texto of textosDeTitular(recibo)) {
      expect(texto.trim().length, 'texto de titular vazio').toBeGreaterThan(0);
      for (const b of banidos) {
        expect(texto.toLowerCase().includes(b), `banido «${b}» em: ${texto}`).toBe(false);
      }
    }
    // A expressão travada da coluna «mantém» (UI-SPEC) é usada de fato.
    const mantem = recibo.colunas_mantem.map((i) => i.texto_futuro).join(' ');
    expect(mantem).toContain('sem ligação com você');
  });

  it('(5) E4·partial: o recorte omite a linha inaplicável, e nunca produz texto vazio', () => {
    const semCurriculo = filtrar(recibo.colunas_sai, { tem_curriculo: false, tem_decisao_registrada: true });
    expect(semCurriculo.map((i) => i.item_id)).not.toContain('arquivo_do_curriculo');
    // OMISSÃO, não string vazia: a linha some do recorte em vez de ficar em branco.
    expect(semCurriculo.some((i) => i.item_id === 'arquivo_do_curriculo')).toBe(false);

    const semDecisao = {
      sai: filtrar(recibo.colunas_sai, { tem_curriculo: true, tem_decisao_registrada: false }),
      mantem: filtrar(recibo.colunas_mantem, { tem_curriculo: true, tem_decisao_registrada: false }),
    };
    expect(semDecisao.mantem.map((i) => i.item_id)).not.toContain('justificativa_do_recrutador');
    expect(semDecisao.sai.map((i) => i.item_id)).not.toContain('ligacao_com_a_justificativa');

    // Nenhum recorte produz item com texto vazio — em nenhum dos dois tempos.
    for (const itens of [semCurriculo, semDecisao.sai, semDecisao.mantem]) {
      expect(itens.length).toBeGreaterThan(0);
      for (const i of itens) {
        expect(i.rotulo.trim().length, `rótulo vazio em ${i.item_id}`).toBeGreaterThan(0);
        expect(i.texto_futuro.trim().length, `texto_futuro vazio em ${i.item_id}`).toBeGreaterThan(0);
        expect(i.texto_passado.trim().length, `texto_passado vazio em ${i.item_id}`).toBeGreaterThan(0);
      }
    }

    // E todo predicado pertence ao vocabulário fechado — um predicado
    // desconhecido faria o consumidor renderizar a linha inaplicável mesmo assim.
    for (const i of [...recibo.colunas_sai, ...recibo.colunas_mantem]) {
      expect(recibo.aplicabilidade, `aplicabilidade desconhecida em ${i.item_id}`).toContain(i.aplicavel_quando);
    }
  });

  it('(6) Pitfall 5: as oito tabelas `telemetria_interna` com PII do titular aparecem em colunas_origem', () => {
    // Um recibo derivado de `exportAllowlist.ts` (30 de 69 tabelas) seria omisso
    // sobre TODAS elas — inclusive `ai_call_logs` e `logs_acesso`, duas das
    // cinco do ERASE-09. É por isso que a fonte é o `pii-inventory.yaml`.
    const tabelas = new Set(
      [...recibo.colunas_sai, ...recibo.colunas_mantem].flatMap((i) => i.colunas_origem).map((c) => c.split('.')[0]),
    );
    for (const t of [
      'ai_call_logs',
      'historico_acoes',
      'logs_acesso',
      'logs_auditoria',
      'notificacoes_enviadas',
      'rate_limit_check_duplicate',
      'sessoes_ativas',
      'webhooks_logs',
    ]) {
      expect(tabelas.has(t), `tabela de telemetria ausente do recibo: ${t}`).toBe(true);
    }
    // As duas nomeadas pelo ERASE-09, explicitamente e por coluna.
    const origens = [...recibo.colunas_sai, ...recibo.colunas_mantem].flatMap((i) => i.colunas_origem);
    expect(origens).toContain('ai_call_logs.candidato_id');
    expect(origens).toContain('logs_acesso.user_id');
  });
});

describe('gen-recibo-exclusao.cjs — os gates, provados mordendo', () => {
  it('(7) caminho feliz: o inventário real gera os três artefatos e sai 0', () => {
    montar();
    const r = rodar();
    expect(r.stderr).toBe('');
    expect(r.status).toBe(0);
    expect(fs.existsSync(path.join(raiz, 'docs', 'compliance', 'recibo-exclusao.json'))).toBe(true);
    expect(fs.existsSync(path.join(raiz, 'supabase', 'functions', '_shared', 'reciboExclusao.ts'))).toBe(true);
    expect(
      fs.existsSync(path.join(raiz, 'src', 'features', 'privacidade', 'constants', 'reciboExclusao.generated.ts')),
    ).toBe(true);
    // `--check` logo após a geração sai 0 — o carimbo é pinado do disco.
    expect(rodar('--check').status).toBe(0);
  });

  it('(8) um `passo_motor` inventado REPROVA a geração', () => {
    montar((s) => patch(s, "passo_motor: 'scrub_ledger_email',", "passo_motor: 'passo_que_nao_existe',"));
    const r = rodar();
    expect(r.status).toBe(1);
    expect(r.stderr).toContain('fora do vocabulário fechado');
  });

  it('(9) um passo do vocabulário SEM linha de recibo REPROVA a geração', () => {
    // A volta do E4·error. A mutação mantém o vocabulário válido e apenas deixa
    // `scrub_ledger_email` órfão — o apagamento que o titular não saberia.
    montar((s) => patch(s, "passo_motor: 'scrub_ledger_email',", "passo_motor: 'tombstone_candidato',"));
    const r = rodar();
    expect(r.status).toBe(1);
    expect(r.stderr).toContain('PASSO SEM LINHA');
    expect(r.stderr).toContain('scrub_ledger_email');
  });

  it('(10) remover uma das três linhas obrigatórias REPROVA a geração', () => {
    montar((s) => patch(s, "item_id: 'numeros_agregados',", "item_id: 'numeros_agregados_renomeado',"));
    const r = rodar();
    expect(r.status).toBe(1);
    expect(r.stderr).toContain('LINHA OBRIGATÓRIA AUSENTE');
    expect(r.stderr).toContain('numeros_agregados');
  });

  it('(11) um banido de vocabulário na copy REPROVA a geração', () => {
    montar((s) =>
      patch(
        s,
        "texto_futuro: 'Fica guardado como registro do processo, sem ligação com você.',",
        "texto_futuro: 'Fica guardado anonimizado.',",
      ),
    );
    const r = rodar();
    expect(r.status).toBe(1);
    expect(r.stderr).toContain('BANIDO DE VOCABULÁRIO');
  });

  it('(12) Pitfall 5 pela porta dos fundos: silenciar coluna `apagar` REPROVA a geração', () => {
    // Pôr uma coluna que o motor APAGA em FORA_DO_RECIBO é exatamente como o
    // recibo voltaria a ser omisso sobre o que não diz.
    montar((s) =>
      patch(
        s,
        "mapa(q('candidatos', ['email_verificado', 'bloqueado', 'ativo']), 'estado_do_processo'),",
        "mapa(q('candidatos', ['email_verificado', 'bloqueado', 'ativo', 'cpf']), 'estado_do_processo'),",
      ),
    );
    const r = rodar();
    expect(r.status).toBe(1);
    expect(r.stderr).toContain('SILÊNCIO PROIBIDO');
    expect(r.stderr).toContain('candidatos.cpf');
  });

  it('(13) coluna do inventário sem linha e sem razão REPROVA a geração', () => {
    montar((s) => patch(s, "        'como_conheceu_detalhes',\n", ''));
    const r = rodar();
    expect(r.status).toBe(1);
    expect(r.stderr).toContain('candidatos.como_conheceu_detalhes');
    expect(r.stderr).toMatch(/cobertura|DIREÇÃO ERRADA/);
  });
});
