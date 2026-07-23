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
const LOGO_URL = "https://recruta.beautysmile.com.br/logos/BS_Horizontal_Branco.png";

/**
 * Cópia de rejeição CONGELADA (D-15 / RNF-07a). NUNCA editar para incluir qualquer dado de
 * avaliação do candidato (a justificativa da decisão, pontuações, faixas percentuais,
 * dimensões de personalidade, classificações ou fundamentos) — o grep-guard reprova o build
 * se um token de avaliação aparecer no e-mail de decisão renderizado.
 */
export const COPY_REJEICAO =
  "Sua candidatura não seguirá para as próximas etapas deste processo seletivo. " +
  "Agradecemos sinceramente o seu interesse na Beauty Smile e desejamos sucesso na sua trajetória.";

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
  // NEUTRO E FIXO — o corpo sensível usa exclusivamente COPY_REJEICAO. O título da vaga
  // dá contexto ao candidato e NÃO é dado de avaliação; nada da avaliação é interpolado aqui.
  return `${saudacao(d)}
<p style="margin:0 0 16px;">Referente à sua candidatura para a vaga <strong>${
    escapeHtml(d.tituloVaga)
  }</strong>:</p>
<p style="margin:0 0 16px;">${escapeHtml(COPY_REJEICAO)}</p>
<p style="margin:0;">Atenciosamente,<br>Equipe Beauty Smile</p>`;
}

/** Subjects pt-BR por evento. */
export const SUBJECTS: Record<EventoNotificacao, (d: DadosEmail) => string> = {
  candidatura_recebida: (d) => `Recebemos sua candidatura — ${d.tituloVaga}`,
  avaliacao_liberada: (d) => `Sua candidatura avançou — ${d.tituloVaga}`,
  convite_entrevista: (d) => `Convite de entrevista — ${d.tituloVaga}`,
  decisao_final: (d) => `Atualização sobre sua candidatura — ${d.tituloVaga}`,
};

const CORPOS: Record<EventoNotificacao, (d: DadosEmail) => string> = {
  candidatura_recebida: corpoConfirmacao,
  avaliacao_liberada: corpoAvanco,
  convite_entrevista: corpoConvite,
  decisao_final: corpoDecisao,
};

const PREHEADERS: Record<EventoNotificacao, string> = {
  candidatura_recebida: "Recebemos a sua candidatura na Beauty Smile.",
  avaliacao_liberada: "Sua candidatura avançou — nova etapa liberada.",
  convite_entrevista: "Você foi convidado(a) para uma entrevista.",
  decisao_final: "Atualização sobre a sua candidatura.",
};

/** Ponto único que a EF chama: evento → { subject, html }. */
export function renderarEmail(
  evento: EventoNotificacao,
  d: DadosEmail,
): { subject: string; html: string } {
  const subject = SUBJECTS[evento](d);
  const conteudoHtml = CORPOS[evento](d);
  const html = layoutBase({ preheader: PREHEADERS[evento], conteudoHtml });
  return { subject, html };
}
