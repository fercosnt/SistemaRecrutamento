/**
 * `_shared/email-templates.ts` — os templates de e-mail Beauty Smile ao candidato (COMM-02/03/05/06;
 * 5º evento 42-08; 6º evento 48-10 · D-22, a liberação da avaliação cognitiva).
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
  /** Convite reenviado por REAGENDAMENTO (2026-09-06): muda assunto, prévia e abertura. */
  reagendada?: boolean;
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
  /**
   * 48-13 (JORN-19 · D-01): a DATA-LIMITE da nova decisão de uma candidatura reaberta, já
   * formatada `DD/MM/AAAA` em America/Sao_Paulo pela EF, a partir de
   * `decisao_final.prazo_nova_decisao_em` (o instante do prazo menos 1 s — o 48-11 grava o
   * início do dia seguinte à data-limite). Só o corpo de `revisao_respondida` com veredito
   * `revertida` a usa.
   *
   * OPCIONAL DE PROPÓSITO, no molde de `vereditoRevisao`: ausente — ou fora da forma
   * `DD/MM/AAAA` — ⇒ a frase da reabertura sai SEM data. O sistema nunca diz ao candidato uma
   * data que não gravou; uma frase sem data é incompleta, uma data inventada é falsa.
   */
  prazoNovaDecisaoFmt?: string;
  /**
   * 48-16 (JORN-U2 · D-09): a URL ABSOLUTA do login do candidato
   * (`https://rh.beautysmile.com.br/auth/login`), montada pela EF com `montarUrlLogin`
   * (`email-config.ts`) a partir de `APP_BASE_URL`, com fail-safe para o default.
   *
   * É a condição do operador em D-09: o e-mail de confirmação passa a dizer «acompanhe pelo
   * seu painel», e uma promessa que aponta para um lugar inalcançável não é promessa. Com ela,
   * TODO corpo de candidato termina no bloco «Acessar meu painel» (`blocoAcessoPainel`).
   *
   * OPCIONAL, com caminho honesto para a ausência: sem URL (ou string vazia), o corpo sai SEM
   * o bloco — nunca um botão com `href` vazio ou quebrado.
   *
   * ⚠ POR QUE PARÂMETRO E NÃO RODAPÉ DE `layoutBase`: o mesmo layout monta os e-mails do RH
   * (`notificar-rh/helpers.ts`) e o RECIBO pós-exclusão (`executar-direito-titular`), que é
   * enviado DEPOIS de a conta deixar de existir. Um link de login no rodapé comum vazaria para
   * os dois — levaria o RH ao login do candidato e o titular apagado a uma conta que não há.
   * O recibo é a EXCEÇÃO registrada ao JORN-U2 (pinada em `executar-direito-titular/index.test.ts`).
   */
  urlLogin?: string;
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

/**
 * 48-16 (JORN-U2) — o acesso ao painel do candidato: um botão «Acessar meu painel» e o mesmo
 * link por extenso, para cliente de e-mail que não renderiza botão. HTML do botão copiado dos
 * e-mails do RH (`notificar-rh/helpers.ts`, `corpoRevisaoSolicitada`), nas cores do e-mail do
 * candidato.
 *
 * Sem URL ⇒ string vazia: o e-mail sai sem o bloco, nunca com link quebrado. A URL passa por
 * `escapeHtml` nos DOIS lugares em que aparece (atributo `href` e texto).
 *
 * Chamado por `renderarEmail` ao fim de TODO corpo de `CORPOS` — um só ponto, para que um
 * evento novo de candidato não possa nascer sem o acesso. NUNCA por `layoutBase` (ver
 * `DadosEmail.urlLogin`).
 */
export function blocoAcessoPainel(url?: string): string {
  if (typeof url !== "string" || url.trim() === "") return "";
  const u = escapeHtml(url.trim());
  return `
<p style="margin:24px 0 16px;"><a href="${u}" style="display:inline-block;padding:12px 24px;background:${DEEP_BLUE};color:${BRANCO};text-decoration:none;border-radius:8px;font-weight:bold;">Acessar meu painel</a></p>
<p style="margin:0;font-size:14px;color:${CINZA};">Se o botão não funcionar, acesse: ${u}</p>`;
}

/**
 * 48-16 (JORN-15 · D-09) — A PROMESSA DA CONFIRMAÇÃO. A cópia anterior prometia aviso por
 * e-mail em cada etapa; o sistema avisava em uma de quatro. O operador escolheu mudar a
 * promessa, não passar a avisar em cada avanço (D-09): o candidato acompanha pelo painel, e o
 * e-mail vem quando há algo para ele fazer (avanço para a avaliação, convite de entrevista,
 * avaliação cognitiva liberada) ou uma decisão (aprovação, rejeição humana ou automática,
 * resposta à revisão). Publicada só depois de conferido, no catálogo e no bundle vivo, que
 * cada um desses avisos existe. `em_espera` e o avanço entre etapas de trabalho seguem sem
 * e-mail — a frase não os promete. «Acompanhe o andamento pelo seu painel» é a frase canônica
 * do front (`src/__tests__/guards/wait-state-copy.grep.test.ts`).
 */
function corpoConfirmacao(d: DadosEmail): string {
  return `${saudacao(d)}
<p style="margin:0 0 16px;">Recebemos a sua candidatura para a vaga <strong>${
    escapeHtml(d.tituloVaga)
  }</strong>. Ela já está registrada no nosso processo seletivo.</p>
<p style="margin:0 0 16px;">Acompanhe o andamento pelo seu painel a qualquer momento. Avisaremos por e-mail quando houver algo para você fazer ou uma decisão sobre a sua candidatura.</p>
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
  const abertura = d.reagendada
    ? `Sua entrevista referente à vaga <strong>${
      escapeHtml(d.tituloVaga)
    }</strong> foi <strong>reagendada</strong>. Confira os novos dados:`
    : `Você está convidado(a) para uma entrevista referente à vaga <strong>${
      escapeHtml(d.tituloVaga)
    }</strong>.`;
  return `${saudacao(d)}
<p style="margin:0 0 16px;">${abertura}</p>
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
 * As duas frases de veredito são as MESMAS que a superfície do candidato mostra (a página de
 * explicação — plano 48-14 para a da reabertura): o e-mail e a página têm de dizer a mesma
 * coisa, senão a pessoa lê um desfecho na caixa de entrada e outro no painel.
 *
 * 48-13 (JORN-19 · D-01) — O VEREDITO `revertida` REABRE A CANDIDATURA. Desde o plano 48-11 a
 * RPC de resposta devolve a candidatura à decisão final, aguardando uma NOVA decisão humana,
 * com prazo de 10 dias corridos. Reabrir não é aprovar: nenhuma decisão foi tomada ainda, e o
 * e-mail diz exatamente isso — que a candidatura foi reaberta e será decidida novamente até a
 * data-limite gravada (D-10). Sem data legível, a frase sai sem data (ver
 * `DadosEmail.prazoNovaDecisaoFmt`).
 *
 * TRÊS SILÊNCIOS DELIBERADOS, cada um com um motivo que não é estético:
 *
 *   1. NÃO promete desfecho nem contato. A única promessa é a que o sistema cumpre por código:
 *      a candidatura voltou à decisão final, e o RH é alertado se o prazo vencer sem nova
 *      decisão (varredura diária do 48-13). "Entraremos em contato" seria promessa sem código.
 *   2. NÃO identifica quem revisou. É PII de funcionário; a transparência do Art. 20 é
 *      atendida pelo conteúdo da revisão, não pela identificação nominal do revisor.
 *   3. NÃO interpola NENHUM campo de avaliação nem a justificativa da revisão. Mesma
 *      disciplina D-15/RNF-07a das cópias congeladas: o texto livre do revisor é lido no
 *      painel autenticado, não replicado num e-mail que trafega por terceiro.
 *
 * O Art. 20 NÃO fixa prazo — a data desta frase é o prazo INTERNO que a própria Beauty Smile
 * se deu para a nova decisão (D-10), e a frase não o atribui à lei.
 */
const COPY_REVISAO_MANTIDA = "Após a revisão, a decisão foi mantida.";
const COPY_REVISAO_REVERTIDA = "Após a revisão, sua candidatura foi reaberta e será decidida novamente.";

/** Forma aceita para a data-limite; qualquer outra coisa é tratada como ausente. */
const RE_DATA_BR = /^\d{2}\/\d{2}\/\d{4}$/;

/** A frase de D-01, com a data quando ela existe e tem a forma certa — nunca com data inventada. */
function copyRevisaoRevertida(prazoFmt?: string): string {
  return typeof prazoFmt === "string" && RE_DATA_BR.test(prazoFmt)
    ? COPY_REVISAO_REVERTIDA.replace(/\.$/, ` até ${prazoFmt}.`)
    : COPY_REVISAO_REVERTIDA;
}

function corpoRevisaoRespondida(d: DadosEmail): string {
  const veredito = d.vereditoRevisao === "mantida"
    ? COPY_REVISAO_MANTIDA
    : d.vereditoRevisao === "revertida"
    ? copyRevisaoRevertida(d.prazoNovaDecisaoFmt)
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

/**
 * Corpo do 6º evento — a liberação da avaliação cognitiva (Phase 48 / Plan 48-10 · D-22).
 *
 * É um AVISO de que há algo a fazer, não uma comunicação sobre a avaliação. Por isso:
 *   · diz «avaliação cognitiva» — linguagem de produto do CLAUDE.md, nunca o termo clínico que ela proíbe;
 *   · NÃO nomeia o instrumento (dado interno do RH), nem nota, critério, prazo ou motivo;
 *   · manda a pessoa ao painel, onde estão as instruções. O BOTÃO de acesso ao painel é
 *     acrescentado a todos os corpos de candidato pelo plano 48-16 — não duplicar aqui.
 */
function corpoCognitivoLiberado(d: DadosEmail): string {
  return `${saudacao(d)}
<p style="margin:0 0 16px;">A equipe da Beauty Smile liberou uma avaliação cognitiva para a sua candidatura à vaga <strong>${
    escapeHtml(d.tituloVaga)
  }</strong>.</p>
<p style="margin:0 0 16px;">Acesse o seu painel para ver as instruções.</p>
<p style="margin:0;">Atenciosamente,<br>Equipe Beauty Smile</p>`;
}

/** Subjects pt-BR por evento. */
export const SUBJECTS: Record<EventoNotificacao, (d: DadosEmail) => string> = {
  candidatura_recebida: (d) => `Recebemos sua candidatura — ${d.tituloVaga}`,
  avaliacao_liberada: (d) => `Sua candidatura avançou — ${d.tituloVaga}`,
  convite_entrevista: (d) =>
    d.reagendada
      ? `Entrevista reagendada — ${d.tituloVaga}`
      : `Convite de entrevista — ${d.tituloVaga}`,
  decisao_final: (d) =>
    d.desfecho === "aprovado"
      ? `Boa notícia sobre sua candidatura — ${d.tituloVaga}`
      : `Atualização sobre sua candidatura — ${d.tituloVaga}`,
  // O 5º evento NÃO ramifica o assunto por veredito — mesma razão do PREHEADERS abaixo:
  // o assunto é lido na LISTA de e-mails, antes de a mensagem ser aberta. Ele nomeia o que
  // chegou (a resposta à solicitação), não o que ela diz. Pinado por T-42-V2b.
  revisao_respondida: (d) => `Resposta à sua solicitação de revisão — ${d.tituloVaga}`,
  // 48-10 / D-22: texto do plano, literal. A vaga vai no corpo.
  avaliacao_cognitiva_liberada: () => "Uma avaliação cognitiva foi liberada para você",
};

const CORPOS: Record<EventoNotificacao, (d: DadosEmail) => string> = {
  candidatura_recebida: corpoConfirmacao,
  avaliacao_liberada: corpoAvanco,
  convite_entrevista: corpoConvite,
  decisao_final: corpoDecisao,
  revisao_respondida: corpoRevisaoRespondida,
  avaliacao_cognitiva_liberada: corpoCognitivoLiberado,
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
  convite_entrevista: (d) =>
    d.reagendada
      ? "Sua entrevista foi reagendada — confira a nova data."
      : "Você foi convidado(a) para uma entrevista.",
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
  avaliacao_cognitiva_liberada: () => "Uma avaliação cognitiva está disponível no seu painel.",
};

/**
 * Ponto único que a EF chama: evento → { subject, html }.
 *
 * 48-16 (JORN-U2): todo corpo de candidato termina no acesso ao painel quando `d.urlLogin`
 * vem. Acrescentado AQUI, ao conteúdo do corpo, e não em `layoutBase` — que é compartilhado
 * com os e-mails do RH e com o recibo pós-exclusão.
 */
export function renderarEmail(
  evento: EventoNotificacao,
  d: DadosEmail,
): { subject: string; html: string } {
  const subject = SUBJECTS[evento](d);
  const conteudoHtml = CORPOS[evento](d) + blocoAcessoPainel(d.urlLogin);
  const html = layoutBase({ preheader: PREHEADERS[evento](d), conteudoHtml });
  return { subject, html };
}
