/**
 * `_shared/email-templates.ts` — os 4 templates de e-mail Beauty Smile (COMM-02/03/05/06).
 *
 * HAND-ROLLED, inline CSS, table-based — sem bibliotecas React de e-mail (elas quebram no
 * runtime Deno das Edge Functions). Um wrapper compartilhado (`layoutBase`) carrega header (logo) +
 * footer LGPD para e-mail transacional, sem link de saída de lista (decisão de kickoff); cada evento tem um corpo.
 *
 * D-15 / RNF-07a: a cópia de rejeição (`COPY_REJEICAO`) é uma constante NEUTRA CONGELADA —
 * nunca interpola nenhum dado de avaliação (justificativa, pontuação, característica de
 * personalidade). O grep-guard em `__tests__/email-templates.test.ts` prova por execução
 * que nenhum token de avaliação vaza no e-mail de decisão renderizado.
 *
 * Todo valor vindo de dado do candidato/RH passa por `escapeHtml` (proteção de injeção).
 * `import type` de email-config é apagado em runtime (o módulo continua sem import de runtime).
 */
import type { EventoNotificacao } from "./email-config.ts";

// ── Identidade Beauty Smile (skill beauty-smile-design-system) ────────────────
const DEEP_BLUE = "#00109E";
const TURQUOISE = "#35BFAD";
const CINZA = "#6B6D70";
const BRANCO = "#FFFFFF";

/**
 * Logo hospedado (RESEARCH Q — imagem de e-mail via URL, não base64 inline). O `alt`
 * garante degradação graciosa: se o asset ainda não estiver hospedado, o wordmark
 * "Beauty Smile Recrutamento" aparece sobre a faixa deep-blue. Trocar a URL quando o
 * asset PNG horizontal branco estiver publicado no domínio público.
 */
/**
 * ⚠ 2026-08-22 — o host foi corrigido de `recruta.beautysmile.com.br` (que **nunca
 * existiu**: `dig` não devolve nada) para `rh.beautysmile.com.br`, que é o domínio
 * de produção real do app no Vercel.
 *
 * ⚠⚠ MAS ISSO **NÃO** FAZ A LOGO APARECER, e é importante não confundir as duas
 * coisas: **o asset nunca foi publicado**. Não existe `public/logos/` no
 * repositório, e `GET https://rh.beautysmile.com.br/logos/BS_Horizontal_Branco.png`
 * devolve **HTTP 200 com `content-type: text/html`** — é o SPA fallback do
 * `vercel.json` respondendo por um caminho que não tem arquivo.
 *
 * Confirmado ao vivo pelo operador em 2026-08-22: os e-mails de confirmação chegam
 * **sem logo**. Isso é a degradação graciosa que o comentário abaixo previu
 * funcionando — o wordmark no `alt` sobre a faixa deep-blue — e não uma regressão.
 *
 * **Para a logo aparecer, basta publicar o arquivo** em `public/logos/`: o Vercel
 * serve estático antes de aplicar rewrite, então o caminho passa a resolver sozinho,
 * sem mais nenhuma mudança de código.
 */
const LOGO_URL = "https://rh.beautysmile.com.br/logos/BS_Horizontal_Branco.png";

/**
 * Cópia de rejeição CONGELADA (D-15 / RNF-07a). NUNCA editar para incluir qualquer dado de
 * avaliação do candidato (a justificativa da decisão, pontuações, faixas percentuais,
 * dimensões de personalidade, classificações ou fundamentos) — o grep-guard reprova o build
 * se um token de avaliação aparecer no e-mail de decisão renderizado.
 */
export const COPY_REJEICAO =
  "Sua candidatura não seguirá para as próximas etapas deste processo seletivo. " +
  "Agradecemos sinceramente o seu interesse na Beauty Smile e desejamos sucesso na sua trajetória.";

/**
 * Cópia de APROVAÇÃO CONGELADA (gap-closure da P39 / CR-01). Mesma disciplina D-15 / RNF-07a
 * da `COPY_REJEICAO`: NUNCA interpolar dado de avaliação (justificativa, pontuação, faixa,
 * dimensão de personalidade, classificação). O grep-guard cobre os DOIS desfechos.
 *
 * Existe porque o evento `decisao` da P39 cobre `aprovado` E `rejeitado` — antes deste fix o
 * corpo era exclusivamente `COPY_REJEICAO`, então todo APROVADO recebia a rejeição.
 */
export const COPY_APROVACAO =
  "Temos uma ótima notícia: sua candidatura foi aprovada neste processo seletivo. " +
  "Nossa equipe entrará em contato em breve com os próximos passos.";

/** Escapa HTML nos valores interpolados (nome, vaga, local vindos de dado do usuário). */
export function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/** Dados que os corpos usam. Campos de convite são opcionais (só o convite os preenche). */
export interface DadosEmail {
  nomeCandidato: string;
  tituloVaga: string;
  dataHoraFmt?: string; // já formatado em America/Sao_Paulo pela EF
  localOuLink?: string | null;
  tipoEntrevista?: string;
  /**
   * Desfecho da decisão (só o evento `decisao_final` usa). A EF deriva de
   * `candidaturas.etapa_atual`, que ela já busca na allowlist. Ausente/qualquer outro valor
   * ⇒ rejeição (fail-safe: o corpo congelado de rejeição é o default histórico).
   */
  desfecho?: "aprovado" | "rejeitado";
  /**
   * Veredito da revisão do Art. 20 (só o evento `revisao_respondida` usa). A EF lê de
   * `decisao_final.revisao_veredito`, cujo CHECK vivo o restringe a `mantida`/`revertida`
   * (`20260730000001:129-130`).
   *
   * OPCIONAL DE PROPÓSITO, e o corpo TEM de ter um caminho honesto para a ausência: um corpo
   * que assumisse a presença deste campo produziria e-mail genérico (a classe do CR-01) ou
   * exceção dentro de um dispatch at-most-once, e aí o e-mail sumiria sem rastro. Ausente ⇒
   * frase neutra que informa a resposta e remete ao painel, NUNCA um desfecho presumido —
   * inverter isso diria ao titular que sua decisão foi mantida sem que o sistema saiba disso.
   */
  vereditoRevisao?: "mantida" | "revertida";
}

/** Wrapper table-based inline-CSS: header (logo) + conteúdo + footer LGPD transacional. */
export function layoutBase(
  params: { preheader: string; conteudoHtml: string },
): string {
  const { preheader, conteudoHtml } = params;
  return `<!doctype html>
<html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f4f5f7;font-family:Arial,Helvetica,sans-serif;color:#2D2E30;">
<span style="display:none!important;opacity:0;color:transparent;height:0;width:0;overflow:hidden;">${
    escapeHtml(preheader)
  }</span>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4f5f7;padding:24px 0;">
<tr><td align="center">
<table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:${BRANCO};border-radius:12px;overflow:hidden;">
<tr><td style="background:linear-gradient(135deg,${TURQUOISE} 0%,${DEEP_BLUE} 100%);padding:28px 32px;text-align:center;">
<img src="${LOGO_URL}" alt="Beauty Smile Recrutamento" width="200" style="max-width:200px;height:auto;color:${BRANCO};font-size:20px;font-weight:bold;">
</td></tr>
<tr><td style="padding:32px;font-size:16px;line-height:1.6;">
${conteudoHtml}
</td></tr>
<tr><td style="padding:20px 32px;background:#fafafa;border-top:1px solid #eee;font-size:12px;line-height:1.5;color:${CINZA};text-align:center;">
Este é um e-mail automático e transacional referente ao seu processo seletivo na Beauty Smile.
Você o recebeu porque se candidatou a uma vaga. Em caso de dúvidas, responda a este e-mail.
</td></tr>
</table>
</td></tr>
</table>
</body></html>`;
}

const saudacao = (d: DadosEmail): string =>
  `<p style="margin:0 0 16px;">Olá, ${escapeHtml(d.nomeCandidato)},</p>`;

function corpoConfirmacao(d: DadosEmail): string {
  return `${saudacao(d)}
<p style="margin:0 0 16px;">Recebemos a sua candidatura para a vaga <strong>${
    escapeHtml(d.tituloVaga)
  }</strong>. Ela já está registrada no nosso processo seletivo.</p>
<p style="margin:0 0 16px;">A partir de agora, você poderá acompanhar o andamento pelo painel do candidato. Avisaremos por e-mail a cada etapa.</p>
<p style="margin:0;">Obrigado pelo seu interesse!</p>`;
}

function corpoAvanco(d: DadosEmail): string {
  return `${saudacao(d)}
<p style="margin:0 0 16px;">Boa notícia: sua candidatura para a vaga <strong>${
    escapeHtml(d.tituloVaga)
  }</strong> avançou para a etapa de avaliação.</p>
<p style="margin:0 0 16px;">A próxima etapa já está liberada no seu painel do candidato. Acesse quando puder para dar sequência.</p>
<p style="margin:0;">Contamos com você!</p>`;
}

function corpoConvite(d: DadosEmail): string {
  const quando = d.dataHoraFmt ? escapeHtml(d.dataHoraFmt) : "";
  const onde = d.localOuLink ? escapeHtml(d.localOuLink) : "";
  return `${saudacao(d)}
<p style="margin:0 0 16px;">Você está convidado(a) para uma entrevista referente à vaga <strong>${
    escapeHtml(d.tituloVaga)
  }</strong>.</p>
<table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 0 16px;">
${quando ? `<tr><td style="padding:4px 0;"><strong>Quando:</strong> ${quando}</td></tr>` : ""}
${onde ? `<tr><td style="padding:4px 0;"><strong>Onde:</strong> ${onde}</td></tr>` : ""}
${d.tipoEntrevista ? `<tr><td style="padding:4px 0;"><strong>Modalidade:</strong> ${escapeHtml(d.tipoEntrevista)}</td></tr>` : ""}
</table>
<p style="margin:0 0 16px;">Anexamos um convite de calendário (<strong>.ics</strong>) para você adicionar a entrevista à sua agenda com um clique.</p>
<p style="margin:0;">Até lá!</p>`;
}

function corpoDecisao(d: DadosEmail): string {
  // CONGELADO NOS DOIS DESFECHOS — o corpo sensível é exclusivamente COPY_APROVACAO ou
  // COPY_REJEICAO. O título da vaga dá contexto e NÃO é dado de avaliação; nada da avaliação
  // é interpolado aqui. `desfecho` ausente ⇒ rejeição (fail-safe, default histórico).
  const aprovado = d.desfecho === "aprovado";
  const copy = aprovado ? COPY_APROVACAO : COPY_REJEICAO;
  return `${saudacao(d)}
<p style="margin:0 0 16px;">Referente à sua candidatura para a vaga <strong>${
    escapeHtml(d.tituloVaga)
  }</strong>:</p>
<p style="margin:0 0 16px;">${escapeHtml(copy)}</p>
<p style="margin:0;">Atenciosamente,<br>Equipe Beauty Smile</p>`;
}

/**
 * Corpo do 5º evento — a resposta à solicitação de revisão do Art. 20 (42-08 / REVISAO-04).
 *
 * As duas frases de veredito são as MESMAS que a UI-SPEC da fase trava para a superfície do
 * candidato (`42-UI-SPEC.md` § "Superfície do candidato"): o e-mail e a página têm de dizer a
 * mesma coisa, senão a pessoa lê um desfecho na caixa de entrada e outro no painel.
 *
 * TRÊS SILÊNCIOS DELIBERADOS, cada um com um motivo que não é estético:
 *
 *   1. NÃO promete próximos passos. A RPC desta fase grava um veredito e uma justificativa —
 *      ela NÃO reabre o funil. "Entraremos em contato" seria promessa sem código que a
 *      execute. Qualquer próximo passo é o que a pessoa que revisou escreveu, e isso vive no
 *      painel, não aqui (regra de honestidade da UI-SPEC).
 *   2. NÃO identifica quem revisou. É PII de funcionário; a transparência do Art. 20 é
 *      atendida pelo conteúdo da revisão, não pela identificação nominal do revisor.
 *   3. NÃO interpola NENHUM campo de avaliação nem a justificativa da revisão. Mesma
 *      disciplina D-15/RNF-07a das cópias congeladas: o texto livre do revisor é lido no
 *      painel autenticado, não replicado num e-mail que trafega por terceiro.
 *
 * O Art. 20 NÃO fixa prazo — nenhuma frase aqui inventa um (invariante nº2 da UI-SPEC).
 */
const COPY_REVISAO_MANTIDA = "Após a revisão, a decisão foi mantida.";
const COPY_REVISAO_REVERTIDA = "Após a revisão, a decisão anterior foi revista.";

function corpoRevisaoRespondida(d: DadosEmail): string {
  const veredito = d.vereditoRevisao === "mantida"
    ? COPY_REVISAO_MANTIDA
    : d.vereditoRevisao === "revertida"
    ? COPY_REVISAO_REVERTIDA
    // Ausente/desconhecido ⇒ silêncio sobre o desfecho. Fail-safe assimétrico de propósito:
    // afirmar um desfecho que não se conhece é pior do que não afirmar nenhum.
    : "";
  return `${saudacao(d)}
<p style="margin:0 0 16px;">Sua solicitação de revisão referente à candidatura para a vaga <strong>${
    escapeHtml(d.tituloVaga)
  }</strong> foi respondida.</p>
${veredito ? `<p style="margin:0 0 16px;">${escapeHtml(veredito)}</p>` : ""}
<p style="margin:0 0 16px;">A resposta completa está disponível no seu painel do candidato.</p>
<p style="margin:0;">Atenciosamente,<br>Equipe Beauty Smile</p>`;
}

/** Subjects pt-BR por evento. */
export const SUBJECTS: Record<EventoNotificacao, (d: DadosEmail) => string> = {
  candidatura_recebida: (d) => `Recebemos sua candidatura — ${d.tituloVaga}`,
  avaliacao_liberada: (d) => `Sua candidatura avançou — ${d.tituloVaga}`,
  convite_entrevista: (d) => `Convite de entrevista — ${d.tituloVaga}`,
  decisao_final: (d) =>
    d.desfecho === "aprovado"
      ? `Boa notícia sobre sua candidatura — ${d.tituloVaga}`
      : `Atualização sobre sua candidatura — ${d.tituloVaga}`,
  // O 5º evento NÃO ramifica o assunto por veredito — mesma razão do PREHEADERS abaixo:
  // o assunto é lido na LISTA de e-mails, antes de a mensagem ser aberta. Ele nomeia o que
  // chegou (a resposta à solicitação), não o que ela diz. Pinado por T-42-V2b.
  revisao_respondida: (d) => `Resposta à sua solicitação de revisão — ${d.tituloVaga}`,
};

const CORPOS: Record<EventoNotificacao, (d: DadosEmail) => string> = {
  candidatura_recebida: corpoConfirmacao,
  avaliacao_liberada: corpoAvanco,
  convite_entrevista: corpoConvite,
  decisao_final: corpoDecisao,
  revisao_respondida: corpoRevisaoRespondida,
};

/**
 * Preheader = o texto de PRÉ-VISUALIZAÇÃO que o cliente de e-mail exibe na caixa de entrada,
 * ao lado do assunto. Assinatura de FUNÇÃO (espelha `SUBJECTS`) porque a decisão precisa
 * ramificar por `desfecho`: com um literal fixo, um aprovado recebia assunto
 * "Boa notícia…" ao lado da prévia "Atualização sobre a sua candidatura." — dissonante.
 *
 * Achado no UAT ao vivo da P39 (2026-07-28): o fix `f3b7304` ramificou `corpoDecisao` e
 * `SUBJECTS`, mas o preheader continuou literal. Mesma disciplina D-15 / RNF-07a das cópias
 * congeladas: NUNCA interpolar dado de avaliação aqui.
 */
const PREHEADERS: Record<EventoNotificacao, (d: DadosEmail) => string> = {
  candidatura_recebida: () => "Recebemos a sua candidatura na Beauty Smile.",
  avaliacao_liberada: () => "Sua candidatura avançou — nova etapa liberada.",
  convite_entrevista: () => "Você foi convidado(a) para uma entrevista.",
  decisao_final: (d) =>
    d.desfecho === "aprovado"
      ? "Boa notícia sobre a sua candidatura."
      : "Atualização sobre a sua candidatura.",
  // ── DECISÃO REGISTRADA (42-08 · questão aberta nº3 da pesquisa da fase) ──────────────
  // A prévia do 5º evento **NÃO ramifica por veredito**: devolve a MESMA string para
  // `mantida` e para `revertida`.
  //
  // POR QUÊ, e por que isto não contradiz o W-01 logo acima. O preheader é o texto que o
  // cliente de e-mail exibe NA LISTA, ao lado do assunto — antes de a pessoa abrir a
  // mensagem. Na `decisao_final`, ramificar é CORRETO porque o assunto já ramifica e uma
  // prévia morna ao lado de "Boa notícia…" é dissonante. Aqui o assunto DELIBERADAMENTE não
  // ramifica, e fazer a prévia ramificar entregaria o desfecho da revisão do Art. 20 numa
  // linha de listagem, possivelmente numa tela de bloqueio, para quem só queria conferir a
  // caixa. Antecipar isso é escolha de produto que esta fase não toma.
  //
  // A lição do W-01 é que **NÃO DECIDIR** é o defeito — não que ramificar seja sempre certo.
  // Por isso a decisão está escrita aqui E pinada por `T-42-V2c`, que exige IGUALDADE
  // LITERAL entre os dois vereditos. Um futuro que queira ramificar terá de alterar aquele
  // teste de propósito, e a mudança aparece no diff em vez de escorregar.
  revisao_respondida: () => "Sua solicitação de revisão foi respondida.",
};

/** Ponto único que a EF chama: evento → { subject, html }. */
export function renderarEmail(
  evento: EventoNotificacao,
  d: DadosEmail,
): { subject: string; html: string } {
  const subject = SUBJECTS[evento](d);
  const conteudoHtml = CORPOS[evento](d);
  const html = layoutBase({ preheader: PREHEADERS[evento](d), conteudoHtml });
  return { subject, html };
}
