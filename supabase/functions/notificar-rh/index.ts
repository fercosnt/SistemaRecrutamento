/**
 * Edge Function: notificar-rh (REVISAO-01)
 *
 * Phase 42 / Plan 42-07 — fecha a metade que faltava do round-trip do Art. 20: o
 * pedido de revisão do candidato passa a CHEGAR ao RH. Até aqui
 * `solicitar_revisao_decisao` gravava `revisao_solicitada_em` e o processo terminava
 * ali — um timestamp que ninguém lia.
 *
 * IRMÃ E SEPARADA de `notificar-candidato` (D-P42-11). A EF viva resolve destinatário
 * por `candidatos.email` hard-wired e sanitiza o `+label` do sink por evento de
 * candidato — nada disso serve para uma lista de N destinatários do roster RH.
 *
 * Cinco propriedades copiadas VERBATIM do molde `notificar-candidato/index.ts`:
 *   1. `handler(req, deps)` com `supabaseAdmin`/`fetchImpl`/`serviceKey` INJETÁVEIS e
 *      `Deno.serve` só quando o módulo é o entrypoint — pré-requisito do job `deno-test`
 *      do CI, que roda sem `--allow-net`.
 *   2. Self-auth por Bearer comparado a `deps.serviceKey`; `401` sem Bearer, e o valor
 *      NUNCA interpolado em log (T-42-25).
 *   3. Payload IDS-ONLY, validado contra um vocabulário fechado de um único evento.
 *   4. Leitura por ALLOWLIST explícita de colunas — nunca projeção-estrela. RLS é
 *      row-level; um `select('*')` aqui vazaria PII e, em `configuracoes_empresa`,
 *      credencial (achado A-03 do inventário).
 *   5. FIRE-AND-FORGET: qualquer falha grava `falhou` no ledger e a EF devolve **200**.
 *      `net.http_post` é at-most-once — um não-200 não volta para o banco, não vira
 *      exceção e não vira linha; o registro sumiria com o e-mail.
 *
 * A DIVERGÊNCIA REAL (único ponto sem análogo vivo): resolução MULTI-DESTINATÁRIO,
 * por consulta no MOMENTO DO ENVIO e nunca por lista fixa em env ou no Vault
 * (D-P42-12) — uma lista fixa envelhece em silêncio a cada admissão ou desligamento.
 *
 * SEM RETRY AUTOMÁTICO, e isso é decisão registrada (não omissão): a varredura
 * `varrer_retry_notificacoes` re-despacha por URL FIXA para `notificar-candidato`,
 * então ela EXCLUI os eventos de RH — ver o bloco de comentário da migration
 * `20260730000003`. A fila `/rh/revisoes` é a superfície durável: um nudge perdido é
 * recuperável abrindo a fila, ao passo que um e-mail de candidato perdido não é
 * recuperável por caminho nenhum, porque o candidato não tem fila.
 *
 * @module supabase/functions/notificar-rh
 */
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import {
  exigirSinkTeste,
  resolverDestinatarioComLabel,
  resolverModo,
} from "../_shared/email-config.ts";
import {
  assuntoCandidaturaEncerradaAPedido,
  assuntoRevisaoSolicitada,
  construirCorpoResendRh,
  corpoCandidaturaEncerradaAPedido,
  corpoRevisaoSolicitada,
  ehEventoRh,
  EVENTO_LEDGER_RH_ENCERRAMENTO,
  type EventoRh,
  LABEL_SINK_RH,
  LABEL_SINK_RH_ENCERRAMENTO,
  logSeguroRh,
  montarDedupeKeyRh,
  montarDedupeKeyRhEncerramento,
  montarUrlFila,
  montarUrlListaVaga,
  refCurta,
  TEMPLATE_LEDGER_RH,
  TEMPLATE_LEDGER_RH_ENCERRAMENTO,
} from "./helpers.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

type ErrorCode = "UNAUTHORIZED" | "VALIDATION" | "SERVER_ERROR";

function jsonResponse(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function errorResponse(code: ErrorCode, message: string, status = 400): Response {
  return jsonResponse({ ok: false, error_code: code, message }, status);
}

/**
 * Vocabulário de papel da COLUNA `usuarios_rh.role` — NUNCA o do JWT.
 *
 * ⚠ Este é o erro que a pesquisa da fase isolou (achado A-02 de
 * `docs/compliance/achados-inventario.md`). Duas taxonomias coexistem:
 *
 *   · coluna `usuarios_rh.role` (CHECK `usuarios_rh_role_check`):
 *       administrador · gerente · recrutador · visualizador
 *   · JWT `app_metadata.role` (`custom_access_token_hook`, que mapeia
 *       recrutador → rh):  administrador · rh · candidato
 *
 * `usuarios_rh.role` **nunca vale 'rh'**. Um filtro `role IN ('rh','administrador')`
 * sobre a TABELA devolveria apenas os administradores e descartaria em silêncio todo
 * recrutador — hoje 1 de 5 pessoas, e justamente a persona primária da fila de revisão.
 *
 * `gerente` e `visualizador` ficam DE FORA de propósito: eles caem no `ELSE` do hook e
 * emitem um `app_metadata.role` que não casa com policy nenhuma — têm sessão válida e
 * zero acesso à fila, então notificá-los seria mandar gente para uma porta fechada.
 * Registrado em A-02; população viva em 2026-07-29 era 4 administradores + 1 recrutador,
 * zero gerente, zero visualizador.
 */
const ROLES_DESTINATARIAS = ["administrador", "recrutador"] as const;

interface CorpoRequisicao {
  evento: EventoRh;
  candidatura_id: string;
}

interface DestinatarioRh {
  user_id: string;
  email: string | null;
}

// ---------------------------------------------------------------------------
// Deps injetáveis (testes injetam mocks; sem rede, sem --allow-net)
// ---------------------------------------------------------------------------

export interface NotificarRhDeps {
  // deno-lint-ignore no-explicit-any
  supabaseAdmin: any;
  /** `fetch` do envio ao Resend — testes injetam um mock → sem `--allow-net`. */
  fetchImpl: typeof fetch;
  /** Segredo esperado no Bearer (== `edge_invoke_key` do Vault / service_role). */
  serviceKey: string;
}

/**
 * Handler testável: recebe `deps` injetadas. O wiring de produção (no fim do arquivo)
 * constrói os clientes reais a partir do env e delega para cá.
 */
export async function handler(req: Request, deps: NotificarRhDeps): Promise<Response> {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }
  if (req.method !== "POST") {
    return errorResponse("SERVER_ERROR", "Método não suportado", 405);
  }

  const { supabaseAdmin } = deps;

  // ---- 1) Self-auth do Bearer (T-42-25) --------------------------------------
  // O valor NUNCA é interpolado no log: um segredo em log estruturado é um segredo
  // vazado (mirror `exigirChaveApi`).
  const authHeader = req.headers.get("Authorization") ?? "";
  const bearer = authHeader.startsWith("Bearer ")
    ? authHeader.slice("Bearer ".length).trim()
    : "";
  if (!bearer || bearer !== deps.serviceKey) {
    console.warn("[notificar-rh] Bearer inválido/ausente");
    return errorResponse("UNAUTHORIZED", "Não autorizado.", 401);
  }

  // ---- 2) Parse ids-only, vocabulário fechado em DOIS eventos -----------------
  // P45-09: o vocabulário desta EF passou de 1 para 2 valores. Ele continua FECHADO
  // e continua MENOR que o do banco: `revisao_respondida` e `divulgacao_vagas` estão
  // no CHECK do ledger e NÃO pertencem a esta EF — vocabulário do banco maior que o
  // da EF é o precedente registrado no COMMENT de `classe_evento_notificacao`.
  let body: CorpoRequisicao;
  try {
    const raw = await req.json();
    if (
      !raw ||
      !ehEventoRh(raw.evento) ||
      typeof raw.candidatura_id !== "string" ||
      !raw.candidatura_id
    ) {
      return errorResponse("VALIDATION", "Payload inválido (evento/candidatura_id).");
    }
    body = { evento: raw.evento, candidatura_id: raw.candidatura_id };
  } catch {
    return errorResponse("VALIDATION", "JSON malformado.");
  }

  const { candidatura_id, evento } = body;
  const candidaturaRef = refCurta(candidatura_id);

  // ---- 3) Dados por ALLOWLIST de colunas (nunca projeção-estrela) -------------
  // `candidato_id` é lido porque `notificacoes_enviadas.candidato_id` é NOT NULL com
  // FK para `candidatos` — é requisito de forma do ledger, não dado do e-mail. Nada
  // do candidato (nome, e-mail, CPF) é lido nem interpolado: o corpo do e-mail ao RH
  // não os usa, por decisão de privacidade (T-42-24, ver `helpers.ts`).
  const { data: candidatura } = await supabaseAdmin
    .from("candidaturas")
    .select("candidato_id, vaga_id")
    .eq("id", candidatura_id)
    .maybeSingle();
  if (!candidatura?.vaga_id || !candidatura?.candidato_id) {
    console.log("[notificar-rh]", logSeguroRh({ skipped: "dados_ausentes" }));
    return jsonResponse({ ok: true, skipped: "dados_ausentes" }, 200);
  }

  const { data: vaga } = await supabaseAdmin
    .from("vagas")
    .select("titulo")
    .eq("id", candidatura.vaga_id)
    .maybeSingle();
  if (!vaga?.titulo) {
    console.log("[notificar-rh]", logSeguroRh({ skipped: "dados_ausentes" }));
    return jsonResponse({ ok: true, skipped: "dados_ausentes" }, 200);
  }

  // ---- 4) Destinatários resolvidos NO MOMENTO DO ENVIO (D-P42-12) -------------
  // Ver `ROLES_DESTINATARIAS` acima para o porquê do vocabulário da COLUNA.
  // Allowlist mínima: `user_id` (chave de dedupe) e `email` (destino). `nome_completo`
  // NÃO é lido — o corpo do e-mail não o usa, e `usuarios_rh` é admin-only desde a
  // SEG-02: ler um dado pessoal que não se vai usar é superfície gratuita.
  // `ativo = true AND deleted_at IS NULL` é o par LITERAL do hook
  // (`20260420000002:45-48`), de `is_active_rh_admin()` (`20260713000001:69-73`) e de
  // `20260629190949:99-111` — copiar esse par é convenção do repo, não escolha.
  const { data: destinatarios, error: erroRoster } = await supabaseAdmin
    .from("usuarios_rh")
    .select("user_id, email")
    .eq("ativo", true)
    .is("deleted_at", null)
    .in("role", ROLES_DESTINATARIAS);

  if (erroRoster) {
    console.error("[notificar-rh]", logSeguroRh({ status: "erro_roster" }));
    return errorResponse("SERVER_ERROR", "Falha ao resolver destinatários.", 500);
  }

  const lista = ((destinatarios ?? []) as DestinatarioRh[]).filter((d) =>
    typeof d.email === "string" && d.email.length > 0 && typeof d.user_id === "string" &&
    d.user_id.length > 0
  );

  if (lista.length === 0) {
    // Condição OPERACIONAL, não erro de request: o roster pode estar vazio por
    // desligamento em massa ou por todos os RH ativos serem gerente/visualizador.
    console.warn("[notificar-rh]", logSeguroRh({ skipped: "sem_destinatarios", destinatarios: 0 }));
    return jsonResponse({ ok: true, skipped: "sem_destinatarios" }, 200);
  }

  // ---- 5) Assunto/corpo montados UMA vez (idênticos para todos) ---------------
  // P45-09 · A RAMIFICAÇÃO POR EVENTO ACONTECE **AQUI**, e só aqui: o laço de
  // envio abaixo (claim-before-send) permanece com a lógica INALTERADA — ele passou
  // a ler variáveis onde lia constantes, e nenhum ramo novo entrou nele. Ramificar
  // dentro do laço multiplicaria por dois os caminhos de idempotência, que é
  // exatamente a parte que não se deve duplicar.
  const modo = resolverModo();
  const ehEncerramento = evento === EVENTO_LEDGER_RH_ENCERRAMENTO;
  const labelSink = ehEncerramento ? LABEL_SINK_RH_ENCERRAMENTO : LABEL_SINK_RH;
  const templateLedger = ehEncerramento
    ? TEMPLATE_LEDGER_RH_ENCERRAMENTO
    : TEMPLATE_LEDGER_RH;
  const baseUrl = Deno.env.get("APP_BASE_URL") || undefined;

  const subject = ehEncerramento
    ? assuntoCandidaturaEncerradaAPedido(vaga.titulo)
    : assuntoRevisaoSolicitada(vaga.titulo);

  // O destino diverge com o evento: o pedido de revisão vai para a FILA (que tem
  // ação); o encerramento vai para a LISTA DE CANDIDATOS DA VAGA, porque ele não
  // tem ação — existe para que ninguém agende ou avalie uma candidatura encerrada.
  const html = ehEncerramento
    ? corpoCandidaturaEncerradaAPedido({
      tituloVaga: vaga.titulo,
      urlLista: montarUrlListaVaga(candidatura.vaga_id, baseUrl),
    })
    : corpoRevisaoSolicitada({
      tituloVaga: vaga.titulo,
      urlFila: montarUrlFila(baseUrl),
    });

  // Chave do Vault lida UMA vez, antes do laço. Ausente ⇒ cada destinatário é
  // reivindicado e marcado `falhou` mesmo assim: T-42-26 exige que toda tentativa
  // deixe trilha, e sem trilha o nudge perdido não teria registro em lugar nenhum.
  const { data: apiKey } = await supabaseAdmin.rpc("ler_resend_api_key");
  const chaveOk = typeof apiKey === "string" && apiKey.length > 0;

  // ---- 6) Laço por destinatário — uma falha NUNCA interrompe os demais --------
  let enviados = 0;
  let duplicados = 0;
  let falhas = 0;

  for (const d of lista) {
    const dedupe_key = ehEncerramento
      ? montarDedupeKeyRhEncerramento(candidatura_id, d.user_id)
      : montarDedupeKeyRh(candidatura_id, d.user_id);

    /**
     * Grava `falhou` na linha reivindicada deste destinatário.
     *
     * `proxima_tentativa_em` fica NULL DE PROPÓSITO. A varredura de retry exclui os
     * eventos de RH (migration `20260730000003`), então agendar uma próxima tentativa
     * que nada consumirá seria escrever uma afirmação falsa no ledger — a mesma classe
     * de truque opaco que o plano rejeitou explicitamente para `tentativas`. Quem
     * recupera um nudge perdido é a fila `/rh/revisoes`.
     */
    const registrarFalha = async (motivo: string): Promise<void> => {
      falhas++;
      await supabaseAdmin
        .from("notificacoes_enviadas")
        .update({
          status: "falhou",
          ultimo_erro: motivo.slice(0, 500),
          proxima_tentativa_em: null,
          tentativas: 1,
        })
        .eq("dedupe_key", dedupe_key);
      console.warn(
        "[notificar-rh]",
        logSeguroRh({ evento, candidatura_ref: candidaturaRef, status: "falhou" }),
      );
    };

    try {
      const dest = resolverDestinatarioComLabel(d.email as string, labelSink, modo);

      // ---- 6a) Claim-before-send (ON CONFLICT dedupe_key DO NOTHING) ----------
      // `destinatario_original` preenchido nos DOIS modos: o ledger audita quem
      // *deveria* receber, não só quem recebeu.
      const { data: claim, error: claimErr } = await supabaseAdmin
        .from("notificacoes_enviadas")
        .upsert(
          {
            candidato_id: candidatura.candidato_id,
            candidatura_id,
            dedupe_key,
            destinatario_email: dest.para,
            destinatario_original: dest.destinatario_original,
            evento,
            template: templateLedger,
            status: "pendente",
            modo,
          },
          { onConflict: "dedupe_key", ignoreDuplicates: true },
        )
        .select("id");

      if (claimErr) {
        falhas++;
        console.error("[notificar-rh]", logSeguroRh({ status: "erro_claim" }));
        continue; // um claim falho NÃO aborta o laço — os demais RH seguem
      }
      if (!claim || claim.length === 0) {
        // Já reivindicado por outra invocação — no-op idempotente PARA ESTE
        // destinatário. Nunca abortar o laço: a chave é por destinatário, então os
        // demais podem estar sem claim.
        duplicados++;
        console.log(
          "[notificar-rh]",
          logSeguroRh({ evento, candidatura_ref: candidaturaRef, skipped: "duplicate" }),
        );
        continue;
      }

      // ---- 6b) Guard non-prod (DELIV-03) — APÓS o claim, ANTES do envio -------
      try {
        exigirSinkTeste(dest.para, modo);
      } catch (e) {
        await registrarFalha(
          `guard non-prod: ${(e as { message?: string })?.message ?? "sink de teste inválido"}`,
        );
        continue;
      }

      if (!chaveOk) {
        await registrarFalha("resend_api_key ausente no Vault");
        continue;
      }

      // ---- 6c) Envio ---------------------------------------------------------
      let resp: Response;
      try {
        resp = await deps.fetchImpl("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${apiKey}`,
            "Content-Type": "application/json",
            // Cinto secundário: um re-send dentro de 24h para a mesma chave é no-op
            // no Resend. NUNCA logada nem interpolada em console.*.
            "Idempotency-Key": dedupe_key,
          },
          body: JSON.stringify(
            construirCorpoResendRh({ para: dest.para, subject, html }),
          ),
        });
      } catch (e) {
        await registrarFalha(
          `fetch Resend lançou: ${(e as { message?: string })?.message ?? "erro de rede"}`,
        );
        continue;
      }

      if (!resp.ok) {
        let detalhe = `${resp.status}`;
        try {
          const err = await resp.json();
          detalhe = `${resp.status} ${(err as { message?: string })?.message ?? ""}`;
        } catch { /* corpo não-JSON */ }
        await registrarFalha(`Resend non-2xx: ${detalhe}`);
        continue;
      }

      // ---- 6d) Sucesso -------------------------------------------------------
      let providerMessageId: string | null = null;
      try {
        const ok = await resp.json();
        providerMessageId = (ok as { id?: string })?.id ?? null;
      } catch { /* sem corpo — segue sem id */ }

      await supabaseAdmin
        .from("notificacoes_enviadas")
        .update({
          status: "enviado",
          provider_message_id: providerMessageId,
          enviado_em: new Date().toISOString(),
        })
        .eq("dedupe_key", dedupe_key);

      enviados++;
    } catch (e) {
      // Rede de segurança do laço: qualquer exceção inesperada de UM destinatário
      // não pode derrubar os demais nem virar 5xx para o trigger (at-most-once).
      falhas++;
      console.error(
        "[notificar-rh]",
        logSeguroRh({ status: "erro_inesperado", candidatura_ref: candidaturaRef }),
      );
      void e;
    }
  }

  console.log(
    "[notificar-rh]",
    logSeguroRh({
      evento,
      candidatura_ref: candidaturaRef,
      status: "concluido",
      destinatarios: lista.length,
      count: enviados,
    }),
  );
  return jsonResponse(
    { ok: true, destinatarios: lista.length, enviados, duplicados, falhas },
    200,
  );
}

// ---------------------------------------------------------------------------
// Wiring de produção (constrói os clientes reais a partir do env)
// ---------------------------------------------------------------------------

// Verdadeiro só quando este módulo é o entrypoint (produção/deploy) e falso quando é
// importado pelo teste (que injeta deps em `handler`) — sem isso `Deno.serve` tentaria
// abrir uma porta durante `deno test`, que roda sem permissão de rede.
if (import.meta.main) {
  Deno.serve(async (req: Request) => {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!SUPABASE_URL || !SERVICE_KEY) {
      console.error("[notificar-rh] env ausente (URL/SERVICE_KEY)");
      return errorResponse("SERVER_ERROR", "Servidor mal configurado", 500);
    }

    // Override do segredo esperado no Bearer: o trigger envia `edge_invoke_key` do
    // Vault, NUNCA a chave de service_role (invariante P41 — a igualdade entre as duas
    // está quebrada por rotação). `NOTIFICAR_RH_SECRET` permite rotação independente.
    const expectedSecret = Deno.env.get("NOTIFICAR_RH_SECRET") ??
      Deno.env.get("NOTIFICAR_SECRET") ?? SERVICE_KEY;

    const supabaseAdmin = createClient(SUPABASE_URL, SERVICE_KEY, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    return await handler(req, {
      supabaseAdmin,
      fetchImpl: fetch,
      serviceKey: expectedSecret,
    });
  });
}
