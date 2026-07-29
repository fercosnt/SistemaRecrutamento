/**
 * Phase 42 / Plan 42-01 Task 2 — PARIDADE DO VOCABULÁRIO DE EVENTO (D-P42-14).
 *
 * POR QUE ESTE ARQUIVO EXISTE
 * O vocabulário de evento da `notificar-candidato` tem NOVE sítios de registro. Quatro são
 * forçados pelo compilador (os mapeados `Record<EventoNotificacao, …>` em `email-templates.ts`).
 * Os demais NÃO são — e é exatamente ali que nasceram os defeitos CR-01, CR-02 e W-01 vivos.
 *
 * O pior de todos era `EVENTOS_VALIDOS`: um `ReadonlySet<string>` declarado à mão em
 * `index.ts`. `ReadonlySet<string>` aceita QUALQUER string, então o compilador nunca conferiu
 * que ele batia com o mapa. Esquecer um evento ali não dá erro de build nem erro em runtime
 * visível: a EF responde `400 VALIDATION` a um `net.http_post`, que é **at-most-once** — a
 * rejeição não volta para o banco, não vira exceção, não vira linha no ledger. O e-mail
 * simplesmente NUNCA SAI, em silêncio absoluto. É a falha mais cara de detectar do sistema.
 *
 * A Task 2 do 42-01 eliminou esse sítio POR CONSTRUÇÃO: `EVENTOS_VALIDOS` agora é derivado de
 * `Object.keys(EVENTO_MAP)` em `helpers.ts`. Os testes abaixo pinam a propriedade para que uma
 * regressão futura (alguém "simplificando" de volta para um literal) reprove o CI, e cobrem os
 * sítios vizinhos que continuam sendo if/else de runtime.
 *
 * Este arquivo é PRÉ-REQUISITO do plano 42-08, que adiciona o 5º evento. Escrever a rede DEPOIS
 * de mexer no vocabulário derrotaria o propósito inteiro.
 *
 * Run: deno test --allow-env --allow-read --config supabase/functions/deno.json \
 *        supabase/functions/notificar-candidato/__tests__/vocabulario-eventos.test.ts
 */
import { assert, assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import {
  EVENTO_MAP,
  EVENTOS_VALIDOS,
  type EventoLedger,
  mapearEvento,
  montarDedupeKey,
} from "../helpers.ts";
import { renderarEmail, SUBJECTS } from "../../_shared/email-templates.ts";
import type { EventoNotificacao } from "../../_shared/email-config.ts";

const DADOS = {
  nomeCandidato: "Ana Silva",
  tituloVaga: "Dentista Clínico Geral",
  dataHoraFmt: "sábado, 1 de agosto de 2026 às 14:30",
  localOuLink: "Rua Exemplo, 100 — São Paulo",
  tipoEntrevista: "Presencial",
};

/**
 * O preheader é texto OCULTO (`<span display:none>` injetado por `layoutBase`) — nenhuma
 * asserção sobre o corpo visível o alcança. Foi precisamente essa invisibilidade que deixou
 * o W-01 chegar a produção. Extraí-lo é a única forma de asserir sobre ele.
 */
function extrairPreheader(html: string): string {
  const m = html.match(/<span style="display:none[^"]*">([\s\S]*?)<\/span>/);
  return m ? m[1].trim() : "";
}

const CHAVES_LEDGER = Object.keys(EVENTO_MAP) as EventoLedger[];

// ── T-42-V3a — o sítio nº1, agora derivado ──────────────────────────────────

Deno.test("T-42-V3a — EVENTOS_VALIDOS contém EXATAMENTE as chaves de EVENTO_MAP", () => {
  const doMapa = new Set<string>(CHAVES_LEDGER);

  // Direção 1: todo evento do mapa é aceito pela validação de payload da EF.
  // Uma falha aqui significa e-mail perdido em silêncio (400 sobre net.http_post).
  for (const chave of doMapa) {
    assert(
      EVENTOS_VALIDOS.has(chave),
      `'${chave}' está em EVENTO_MAP mas NÃO em EVENTOS_VALIDOS: a EF rejeitaria ` +
        `esse disparo com 400 VALIDATION e o e-mail sumiria sem rastro`,
    );
  }

  // Direção 2: nenhum evento aceito pela EF deixa de ter mapeamento. Sem esta metade,
  // um literal esquecido em EVENTOS_VALIDOS levaria mapearEvento a devolver undefined.
  for (const aceito of EVENTOS_VALIDOS) {
    assert(
      doMapa.has(aceito),
      `'${aceito}' é aceito por EVENTOS_VALIDOS mas não existe em EVENTO_MAP`,
    );
  }

  assertEquals(EVENTOS_VALIDOS.size, doMapa.size, "os conjuntos têm tamanhos diferentes");
});

// ── T-42-V3b — mapa ⟷ templates ─────────────────────────────────────────────

Deno.test("T-42-V3b — os valores de EVENTO_MAP cobrem EXATAMENTE as chaves de SUBJECTS", () => {
  const alvos = new Set<string>(CHAVES_LEDGER.map((e) => EVENTO_MAP[e]));
  const doTemplate = new Set<string>(Object.keys(SUBJECTS));

  for (const alvo of alvos) {
    assert(
      doTemplate.has(alvo),
      `EVENTO_MAP aponta para o template '${alvo}', que não existe em SUBJECTS`,
    );
  }
  for (const chave of doTemplate) {
    assert(
      alvos.has(chave),
      `o template '${chave}' existe mas nenhum evento do ledger o alcança — ` +
        `template órfão (e-mail que nunca será enviado)`,
    );
  }
  assertEquals(alvos.size, doTemplate.size);
});

// ── T-42-V3c — renderização real de ponta a ponta ───────────────────────────

Deno.test("T-42-V3c — todo evento do mapa renderiza subject E preheader não-vazios", () => {
  for (const chave of CHAVES_LEDGER) {
    // `renderarEmail` indexa SUBJECTS, CORPOS e PREHEADERS. Os dois últimos são privados do
    // módulo (e travados em `Record<EventoNotificacao, …>`), então a checagem de presença
    // deles é feita por EXECUÇÃO: uma chave ausente estoura aqui em vez de passar batido.
    const { subject, html } = renderarEmail(mapearEvento(chave), DADOS);

    assert(subject.length > 0, `${chave}: subject vazio`);
    assert(html.length > 0, `${chave}: html vazio`);

    const preheader = extrairPreheader(html);
    assert(
      preheader.length > 0,
      `${chave}: preheader VAZIO — a prévia da caixa de entrada ficaria em branco ` +
        `(classe de defeito W-01)`,
    );
  }
});

Deno.test("T-42-V3c — o evento cujo corpo depende de campo opcional ainda renderiza sem ele", () => {
  // Cobre o sítio nº9 (`DadosEmail`) indiretamente: o convite lê dataHoraFmt/localOuLink/
  // tipoEntrevista, todos opcionais. Um corpo que assuma presença quebraria aqui.
  const minimo = { nomeCandidato: "Ana Silva", tituloVaga: "Dentista Clínico Geral" };
  for (const chave of CHAVES_LEDGER) {
    const { subject, html } = renderarEmail(mapearEvento(chave), minimo);
    assert(subject.length > 0, `${chave}: subject vazio sem campos opcionais`);
    assert(
      extrairPreheader(html).length > 0,
      `${chave}: preheader vazio sem campos opcionais`,
    );
  }
});

// ── T-42-V4 — dedupe key: o sítio if/else de runtime ────────────────────────

Deno.test("T-42-V4 — montarDedupeKey: convite usa agendamento_id, os demais candidatura_id", () => {
  const CAND = "cand-1";
  const AGD = "agd-9";

  for (const chave of CHAVES_LEDGER) {
    const obtida = montarDedupeKey(chave, CAND, AGD);
    const esperada = chave === "convite" ? `${AGD}:convite` : `${CAND}:${chave}`;
    assertEquals(
      obtida,
      esperada,
      `dedupe_key de '${chave}' fora do padrão — o ledger dedupa pela chave, ` +
        `então um formato divergente ou colide (e-mail perdido) ou nunca dedupa (e-mail repetido)`,
    );
  }
});

Deno.test("T-42-V4 — as dedupe keys de uma mesma candidatura NÃO colidem entre eventos", () => {
  const CAND = "cand-1";
  const AGD = "agd-9";
  const chaves = CHAVES_LEDGER.map((e) => montarDedupeKey(e, CAND, AGD));

  assertEquals(
    new Set(chaves).size,
    CHAVES_LEDGER.length,
    `COLISÃO de dedupe_key entre eventos da mesma candidatura: ${JSON.stringify(chaves)}. ` +
      `Uma colisão faz o 2º evento cair em ON CONFLICT DO NOTHING e o e-mail nunca sair.`,
  );
});

// ── Guarda de forma: o mapa não pode virar um literal solto de novo ─────────

Deno.test("T-42-V3a — EVENTOS_VALIDOS é DERIVADO, não um literal paralelo no index.ts", async () => {
  const idx = await Deno.readTextFile(new URL("../index.ts", import.meta.url));
  const declaraSetLocal = /EVENTOS_VALIDOS\s*(:[^=]*)?=\s*new Set\(/.test(idx);
  assertEquals(
    declaraSetLocal,
    false,
    "index.ts voltou a declarar EVENTOS_VALIDOS como Set literal — o sítio de drift " +
      "que o 42-01 eliminou foi reintroduzido; derive de EVENTO_MAP em helpers.ts",
  );

  const helpers = await Deno.readTextFile(new URL("../helpers.ts", import.meta.url));
  assert(
    helpers.includes("Object.keys(EVENTO_MAP)"),
    "helpers.ts deveria derivar EVENTOS_VALIDOS de Object.keys(EVENTO_MAP)",
  );
});

// Sanidade de tipo: o mapa continua total sobre EventoLedger e mira EventoNotificacao.
const _sanidade: Record<EventoLedger, EventoNotificacao> = EVENTO_MAP;
void _sanidade;
