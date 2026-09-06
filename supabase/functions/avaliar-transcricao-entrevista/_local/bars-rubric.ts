/**
 * Bloco de rubrica BARS que a análise de transcrição manda ao modelo como
 * `vagaRubricBlock` (2º bloco de system, cacheado — ver _shared/ai-client.ts).
 *
 * Fonte: o(s) guia(s) de entrevista gerado(s) para a candidatura (`entrevista_guias.guia`
 * → `questions[].competency` + `questions[].bars_anchors[]`). São as MESMAS âncoras que o
 * entrevistador tinha em mão — a análise avalia contra o que foi perguntado, não contra
 * uma rubrica inventada na hora.
 *
 * ⚠ Até 2026-09-06 o bloco era literalmente `Vaga: <uuid>`. O prompt transcript_analysis
 *   diz "use as âncoras BARS fornecidas no input, não invente novas; se uma âncora não foi
 *   descrita, peça input adicional" — e recebia um UUID. Nenhuma análise jamais teve
 *   rubrica; o modelo tinha de escolher entre inventar âncoras e marcar tudo
 *   insufficient_evidence. Sem guia, o bloco agora DIZ isso ao modelo em vez de calar.
 *
 * Puro e defensivo: `guia` é JSON gravado por outra EF; qualquer forma inesperada vira
 * "sem âncoras" em vez de throw (a análise é never-absent).
 */
export interface BarsRubricArgs {
  vagaTitulo: string | null;
  vagaId: string;
  /** Linhas de `entrevista_guias.guia` (0..n) — objetos com `questions[]`. */
  guias: unknown[];
}

interface AnchorLike {
  score?: unknown;
  level?: unknown;
  description?: unknown;
}

export const SEM_GUIA_AVISO =
  "Nenhum guia de entrevista foi gerado para esta candidatura, portanto NÃO há âncoras BARS " +
  "definidas. Avalie apenas as competências que a transcrição evidencia de forma explícita, " +
  "descreva em `reasoning` qual comportamento observável sustenta cada score e marque " +
  "`insufficient_evidence` sempre que não houver trecho citável — não invente âncoras.";

export function buildBarsRubricBlock(args: BarsRubricArgs): string {
  const header = `Vaga: ${args.vagaTitulo?.trim() || args.vagaId}`;

  // 1ª ocorrência vence — um guia pode repetir a competência em duas perguntas, e o
  // presencial repete as do online; as âncoras são as mesmas por construção (calibração).
  const byCompetency = new Map<string, AnchorLike[]>();
  for (const guia of args.guias) {
    const questions = (guia as { questions?: unknown } | null)?.questions;
    if (!Array.isArray(questions)) continue;
    for (const q of questions) {
      const competency = (q as { competency?: unknown } | null)?.competency;
      const anchors = (q as { bars_anchors?: unknown } | null)?.bars_anchors;
      if (typeof competency !== "string" || !competency.trim() || !Array.isArray(anchors)) continue;
      const key = competency.trim();
      if (!byCompetency.has(key)) byCompetency.set(key, anchors as AnchorLike[]);
    }
  }

  if (byCompetency.size === 0) {
    return `${header}\n\n## RUBRIC BARS POR COMPETÊNCIA\n${SEM_GUIA_AVISO}`;
  }

  const lines: string[] = [
    header,
    "",
    "## RUBRIC BARS POR COMPETÊNCIA (âncoras do guia de entrevista desta candidatura)",
  ];
  for (const [competency, anchors] of byCompetency) {
    lines.push(`- Competência: "${competency}"`);
    const sorted = anchors
      .filter((a): a is AnchorLike => !!a && typeof a === "object")
      .sort((a, b) => Number(b.score ?? 0) - Number(a.score ?? 0));
    for (const a of sorted) {
      const desc = typeof a.description === "string" ? a.description.trim() : "";
      if (!desc) continue;
      const score = typeof a.score === "number" ? String(a.score) : "?";
      const level = typeof a.level === "string" ? ` (${a.level})` : "";
      lines.push(`  - Score ${score}${level}: "${desc}"`);
    }
  }
  return lines.join("\n");
}
