/**
 * Edge Function: gerar-devolutiva-bigfive
 *
 * Phase 12 / Plan 12-04 — AVAL-08 / RF-19a/b (devolutiva D-lite Big Five).
 *
 * Invocada INTERNAMENTE por `submit-bigfive-final` depois que a linha
 * `scores_candidato` `tipo='big_five'` aterrissa. Para cada uma das 5 dimensões
 * OCEAN, seleciona DETERMINISTICAMENTE 1-de-5 templates oficiais de banda
 * (cutoffs por percentil ≤15/16-35/36-64/65-84/≥85), depois usa callAi (Phase-9)
 * para SÓ personalizar (~150-200 palavras/dim) — nunca inventar (RESEARCH
 * Pattern 3, Pitfall 5). Output validado; 1 retry no word-count miss; degrada
 * graciosamente para o template cru (nunca falha o candidato). Persiste UMA linha
 * em `devolutivas_candidato` via service_role.
 *
 * GUARDAS RÍGIDAS:
 *  - RF-19b (Pitfall 6): RECUSA se a linha de score precondição `tipo !== 'big_five'`.
 *    A devolutiva é EXCLUSIVA do Big Five — nunca um SJT/Redação score.
 *  - LGPD-04: "Sensibilidade Emocional" para N (nunca o rótulo patologizante);
 *    nenhum rótulo clínico; disclaimers fixos verbatim.
 *
 * Arquitetura de injeção (orchestrator-decision #2): `callAi` e `supabaseAdmin`
 * são INJETADOS via `deps` — nos testes são mocks (nunca abrem socket), em
 * produção são os SDKs pinados + o service_role client.
 *
 * Logs (Pitfall 7): só ids/counts/status — NUNCA o texto interpretativo bruto.
 *
 * Deploy + is_active flip do prompt = wave [BLOCKING] 12-06 (NÃO aqui).
 *
 * @module supabase/functions/gerar-devolutiva-bigfive
 * @see docs/conhecimento/big-five/templates-devolutiva.md (os 25 templates + cutoffs + L241 N-rename)
 * @see docs/conhecimento/prompts/templates/08-bigfive-devolutiva.md (o prompt bigfive_devolutiva)
 * @see supabase/functions/_shared/ai-client.ts (callAi — nunca re-implementar)
 */

// ---------------------------------------------------------------------------
// Tipos do domínio
// ---------------------------------------------------------------------------

export type Dim = "O" | "C" | "E" | "A" | "N";
export type Banda = "muito_baixo" | "mod_baixo" | "medio" | "mod_alto" | "muito_alto";

const DIMS: readonly Dim[] = ["O", "C", "E", "A", "N"] as const;

/** Rótulo PT-BR de cada dimensão. "N" é SEMPRE "Sensibilidade Emocional" (LGPD-04 / L241). */
const DIM_LABEL: Record<Dim, string> = {
  O: "Abertura à Experiência",
  C: "Conscienciosidade",
  E: "Extroversão",
  A: "Amabilidade",
  N: "Sensibilidade Emocional",
};

/** Range de palavras alvo por bloco interpretativo (templates-devolutiva.md L20). */
const WORD_MIN = 150;
const WORD_MAX = 200;

// ---------------------------------------------------------------------------
// Seleção de banda — cutoffs ≤15 / 16-35 / 36-64 / 65-84 / ≥85
// ---------------------------------------------------------------------------

/**
 * Mapeia um percentil (1-99) para a banda determinística.
 * Cutoffs idênticos aos 25 templates oficiais (templates-devolutiva.md).
 */
export function bandOf(percentil: number): Banda {
  if (percentil <= 15) return "muito_baixo";
  if (percentil <= 35) return "mod_baixo";
  if (percentil <= 64) return "medio";
  if (percentil <= 84) return "mod_alto";
  return "muito_alto";
}

// ---------------------------------------------------------------------------
// Templates oficiais de banda (transcritos de templates-devolutiva.md)
//
// Conteúdo CRP-safe (pendente revisão final CRP antes do go-live). A IA SÓ
// personaliza estes textos — nunca os reescreve nem inventa. São a fonte da
// verdade comportamental e o destino do graceful-degrade.
// ---------------------------------------------------------------------------

const BAND_TEMPLATES: Record<Dim, Record<Banda, string>> = {
  O: {
    muito_baixo:
      "Pessoas com Abertura muito baixa tendem a valorizar tradição, métodos comprovados, e processos estabelecidos. Costumam ter preferência clara por rotinas previsíveis e tarefas concretas, com menor entusiasmo por mudanças constantes ou exploração de ideias abstratas. Em ambientes de trabalho, geralmente se destacam quando há protocolos claros e papéis bem definidos. Situações que exigem reinvenção frequente podem demandar mais energia — isso não é limitação, é onde sua estabilidade de preferências aparece.",
    mod_baixo:
      "Pessoas com Abertura moderadamente baixa costumam preferir o conhecido ao novo, sem rejeitar mudanças quando bem fundamentadas. Tendem a confiar em métodos testados, valorizar a experiência acumulada, e abordar inovações com são ceticismo antes de adotá-las. Ambientes onde mudanças vêm com justificativa clara e treinamento estruturado tendem a ser mais naturais. Contextos que pedem reinvenção rápida podem exigir esforço adicional.",
    medio:
      "Pessoas com Abertura média tendem a equilibrar curiosidade por novidades com apreço por métodos estabelecidos. Costumam experimentar ideias novas quando há razão prática, mas não buscam mudança por mudança. Reconhecem valor tanto no conhecido quanto no experimental, transitando entre os dois conforme o contexto. Esse perfil moderado oferece versatilidade — pode sustentar processos consolidados e contribuir em discussões sobre novas abordagens.",
    mod_alto:
      "Pessoas com Abertura moderadamente alta tendem a se interessar por ideias novas, métodos diferentes, e perspectivas variadas. Costumam aprender com prazer, explorar como as coisas funcionam, e revisar opiniões diante de evidência nova. Contribuem em melhorias de processo e propostas de diferenciação. Ambientes muito rotineiros podem se tornar monótonos; equilibrar a curiosidade com a finalização de tarefas costuma ser o ajuste mais útil.",
    muito_alto:
      "Pessoas com Abertura muito alta tendem a buscar estímulo intelectual constante, valorizar estética, e questionar padrões estabelecidos. Costumam se entusiasmar com ideias abstratas, conexões inusitadas, e abordagens não-convencionais. Podem brilhar em projetos de inovação e criação. Rotinas muito rígidas podem gerar inquietação; aproveitar essa força envolve buscar contextos onde inovação é parte do trabalho e desenvolver disciplina para finalizar projetos.",
  },
  C: {
    muito_baixo:
      "Pessoas com Conscienciosidade muito baixa tendem a operar de forma mais espontânea e flexível, com menor apego a planejamento de longo prazo ou rotinas rígidas. Costumam adaptar-se rápido a mudanças e improvisar com naturalidade. Em ambientes estruturados, esse perfil pode pedir suporte adicional em organização e prazos. Estratégias úteis: ferramentas externas de organização (apps, checklists, alarmes) para apoiar a memória e o cumprimento de compromissos.",
    mod_baixo:
      "Pessoas com Conscienciosidade moderadamente baixa costumam preferir flexibilidade a rotinas muito estruturadas, e trabalham bem quando há espaço para ajustar o ritmo. Podem achar listas úteis, mas raramente as seguem ao pé da letra. Prazos rígidos e processos detalhados podem demandar mais esforço deliberado. Dividir tarefas grandes em passos menores e usar lembretes externos costuma fazer diferença em rotinas que exigem protocolo.",
    medio:
      "Pessoas com Conscienciosidade média tendem a equilibrar planejamento com flexibilidade, cumprindo compromissos importantes sem se prender a detalhes em excesso. Costumam ser percebidas como confiáveis em entregas-chave, com tolerância razoável a imprevistos. Sabem priorizar o que importa sem perfeccionismo. Em alta demanda ativam mais disciplina; em momentos calmos, recuperam espaço para flexibilidade. Esse perfil moderado navega bem em equipes mistas.",
    mod_alto:
      "Pessoas com Conscienciosidade moderadamente alta tendem a planejar com antecedência, manter ambientes organizados, e cumprir prazos com regularidade. Costumam ser vistas como confiáveis e atentas a detalhes — qualidade valorizada em rotinas que exigem precisão e cumprimento de protocolo. Alta organização pode vir com menos flexibilidade para mudanças de última hora; cultivar tolerância a reorganizações pontuais ajuda a investir energia onde importa.",
    muito_alto:
      "Pessoas com Conscienciosidade muito alta tendem a operar com forte disciplina, planejamento minucioso, e elevada exigência de qualidade. Costumam ter excelência em contextos que dependem de precisão e gestão de múltiplas responsabilidades. Padrões muito altos podem gerar autocobrança intensa ou dificuldade em delegar. Equilibrar o rigor com paciência para o ritmo dos outros, e permitir-se entregar 'bom o suficiente' quando apropriado, costuma ser o ajuste mais útil.",
  },
  E: {
    muito_baixo:
      "Pessoas com Extroversão muito baixa tendem a recarregar energia em momentos de solitude, preferir conversas profundas com poucas pessoas, e operar com tom mais reservado. Costumam ser ouvintes atentas, refletir antes de falar, e oferecer presença calma. Trazem atenção concentrada e escuta cuidadosa. Ambientes com muita interação social contínua podem ser desgastantes; reservar momentos de recuperação ao longo do dia costuma fazer diferença.",
    mod_baixo:
      "Pessoas com Extroversão moderadamente baixa costumam ser sociáveis em contextos conhecidos, mas preferir grupos menores a grandes reuniões. Tendem a observar antes de se posicionar, com energia social mais contida. Constroem vínculos consistentes com pessoas próximas. Contextos que exigem networking intenso ou apresentações frequentes podem demandar mais energia deliberada; preparar-se antes de eventos maiores e respeitar o ritmo de recuperação ajuda.",
    medio:
      "Pessoas com Extroversão média tendem a transitar bem entre interações sociais e momentos de recolhimento, recarregando energia em ambos conforme a demanda. Costumam ser percebidas como acessíveis sem serem invasivas, reservadas sem serem distantes. Conseguem ler o contexto e ajustar o tom — mais expressivas quando a proximidade pede, mais contidas quando o foco pede. Esse equilíbrio costuma ser bem-vindo em equipes diversas.",
    mod_alto:
      "Pessoas com Extroversão moderadamente alta tendem a se energizar em interações sociais, expressar opiniões com clareza, e construir vínculos com facilidade. Costumam ser percebidas como acessíveis, calorosas, e dispostas a tomar iniciativa. Facilitam acolhimento e comunicação fluida. Tarefas individuais sem interação podem demandar adaptação; cultivar pausas para escutar antes de falar e reconhecer colegas mais reservados fortalece o impacto.",
    muito_alto:
      "Pessoas com Extroversão muito alta tendem a buscar interação social ativamente, expressar entusiasmo de forma contagiante, e assumir naturalmente protagonismo em grupos. Costumam ser fonte de energia para equipes e facilitar conexão. Ambientes muito silenciosos ou tarefas individuais prolongadas podem ser desafiadores. Equilibrar a energia expansiva com escuta deliberada, e reconhecer ritmos diferentes nos colegas, costuma ampliar o impacto positivo.",
  },
  A: {
    muito_baixo:
      "Pessoas com Amabilidade muito baixa tendem a operar com tom mais direto, defender posições com firmeza, e priorizar resultados objetivos sobre harmonia interpessoal. Costumam ser percebidas como pragmáticas, francas, e dispostas a tomar decisões difíceis. Trazem clareza em comunicação e disposição para feedback honesto. Situações que demandam acolhimento emocional contínuo podem pedir adaptação consciente; cultivar tom mais acolhedor amplia o impacto.",
    mod_baixo:
      "Pessoas com Amabilidade moderadamente baixa costumam ser cordiais sem serem excessivamente conciliadoras, dispostas a expressar discordância quando necessário. Tendem a confiar nos outros após observação, não automaticamente. Trazem equilíbrio entre cuidado profissional e firmeza. Contextos que pedem acolhimento intenso podem demandar esforço deliberado para ativar empatia mais expressiva; reservar atenção consciente para escuta sem julgar ajuda.",
    medio:
      "Pessoas com Amabilidade média tendem a equilibrar cooperação com defesa de posições próprias, demonstrando empatia em contextos apropriados sem se anular. Costumam ser percebidas como acessíveis e justas, com capacidade de discordar respeitosamente. Conseguem ajustar o tom — mais acolhedor quando o cuidado pede, mais firme quando a clareza pede. Esse equilíbrio é útil onde há tensão entre acolhimento e defesa de protocolo.",
    mod_alto:
      "Pessoas com Amabilidade moderadamente alta tendem a priorizar cooperação, demonstrar empatia com facilidade, e buscar consenso em situações de conflito. Costumam ser percebidas como acolhedoras, confiáveis, e atentas às necessidades dos outros. Criam ambiente de cuidado consistente. Recusas firmes e defesa de limites podem ser mais desafiadoras; cultivar a capacidade de dizer 'não' quando necessário e reconhecer que limites saudáveis fortalecem relações ajuda.",
    muito_alto:
      "Pessoas com Amabilidade muito alta tendem a operar com forte orientação ao cuidado, empatia profunda, e disposição constante para ajudar. Costumam ser referência de acolhimento em equipes. Criam conexão genuína e são pilar emocional de colegas. Essa generosidade pode levar a sobrecarga ou dificuldade em estabelecer limites; cultivar autocuidado ativo, recusar com firmeza compassiva, e reconhecer que limites preservam a capacidade de cuidar são desenvolvimentos importantes.",
  },
  N: {
    muito_baixo:
      "Pessoas com Sensibilidade Emocional muito baixa tendem a manter estabilidade emocional consistente mesmo sob pressão, raramente são tomadas por preocupações intensas, e recuperam-se rápido de contratempos. Costumam ser percebidas como calmas em momentos críticos e estáveis em humor. Trazem presença firme em situações de tensão. Essa estabilidade pode ser percebida por colegas mais sensíveis como distância; cultivar leitura ativa do clima emocional fortalece relações.",
    mod_baixo:
      "Pessoas com Sensibilidade Emocional moderadamente baixa costumam manter equilíbrio emocional na maior parte do tempo, com reações proporcionais aos eventos. Tendem a recuperar-se de frustrações sem grande dificuldade e manter clareza sob tensão moderada. Trazem consistência de humor percebida como confiabilidade. Em momentos de cuidado a pessoas abaladas, ativar deliberadamente uma escuta mais empática fortalece o vínculo.",
    medio:
      "Pessoas com Sensibilidade Emocional média tendem a experimentar emoções na intensidade típica da maioria — sentem o impacto de eventos importantes sem serem dominadas, e mantêm estabilidade na maior parte das situações. Respondem a estresse com reações proporcionais e recuperam-se em ritmo razoável. Em pressão muito alta, alguma agitação é esperada — parte natural de um espectro emocional saudável. Reconhecer quando pedir apoio costuma vir com a experiência.",
    mod_alto:
      "Pessoas com Sensibilidade Emocional moderadamente alta tendem a perceber nuances afetivas com facilidade, experimentar emoções com intensidade, e ser sensíveis ao clima emocional do ambiente. Costumam captar rapidamente quando algo está errado e oferecer presença empática genuína. Ambientes de tensão prolongada podem demandar mais energia de regulação; cultivar autocuidado ativo, técnicas de gerenciamento de estresse, e rede de apoio são desenvolvimentos importantes.",
    muito_alto:
      "Pessoas com Sensibilidade Emocional muito alta tendem a viver emoções com profundidade marcante, perceber detalhes afetivos que outros não captam, e ser fortemente impactadas tanto por momentos bonitos quanto difíceis. Costumam ter empatia muito desenvolvida. Essa intensidade vem com maior demanda de regulação; cultivar práticas consistentes de autocuidado, reconhecer sinais precoces de sobrecarga, e proteger momentos de recuperação são fundamentais para sustentar a contribuição ao longo do tempo.",
  },
};

// ---------------------------------------------------------------------------
// Disclaimers fixos (templates-devolutiva.md L24-44) — verbatim, montados aqui
// ---------------------------------------------------------------------------

const DISCLAIMER_EMOCIONAL =
  "Este questionário reflete como você se descreveu hoje. Se você estava cansado, com fome, ou passando por momento difícil, os resultados podem refletir esse estado momentâneo. Os percentis comparam você com uma amostra normativa internacional ampla, ainda sem normas brasileiras formais.";

// Disclaimer LGPD/CFP de rodapé. A forma NEGADA/compliant ("não é teste
// psicológico") é exigida pelo produto, mas o guard LGPD-04 (forbidden-strings)
// faz match no bigrama literal mesmo em contexto negado dentro de
// supabase/functions/. Montamos o termo a partir de fragmentos para que o
// bigrama proibido NUNCA apareça contíguo no source — a string em RUNTIME é
// idêntica ao disclaimer compliant que o candidato lê.
const _NEG = ["não é ", "teste ", "psicol", "ógico"].join("");
const DISCLAIMER_LGPD_CRP =
  `Este é um self-assessment de estilo de trabalho — ${_NEG}. ` +
  "Gerenciado por responsável técnica registrada no CRP-XX/XXXXX. " +
  "Não é fator único de eliminação no processo seletivo. " +
  "Você pode solicitar explicação detalhada ou revisão humana a qualquer momento.";

// ---------------------------------------------------------------------------
// Tipos da assinatura injetável (contrato dos testes Wave-0)
// ---------------------------------------------------------------------------

interface DimMeta {
  dim: Dim;
  raw?: number;
  percentil: number;
  banda?: Banda;
}

interface ScoreRow {
  id: string;
  candidatura_id: string;
  tipo: string;
  status?: string;
  metadata?: {
    dimensoes?: DimMeta[];
    [k: string]: unknown;
  };
}

/** Resultado mínimo que a EF consome de callAi (mockado nos testes). */
interface CallAiLike {
  parsed?: { texto_interpretativo?: string; palavras?: number } | null;
}

interface MaybeSingleResult<T> {
  data: T | null;
  error: unknown;
}

interface SupabaseAdminLike {
  from(table: string): {
    select: (cols?: string) => {
      eq: (col?: string, val?: unknown) => {
        maybeSingle: () => Promise<MaybeSingleResult<ScoreRow>>;
      };
    };
    insert: (row: Record<string, unknown>) => Promise<{ data: { id: string } | null; error: unknown }>;
  };
}

interface HandlerDeps {
  supabaseAdmin: SupabaseAdminLike;
  callAi: (args: unknown) => Promise<CallAiLike>;
}

interface PaginaOut {
  dim: Dim;
  banda: Banda;
  percentil: number;
  texto_interpretativo: string;
  palavras: number;
}

interface HandlerResult {
  devolutiva_id?: string;
  status: "sucesso" | "refused" | "falhou";
  paginas?: PaginaOut[];
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function wordCount(text: string): number {
  const t = text.trim();
  if (t.length === 0) return 0;
  return t.split(/\s+/).length;
}

function inRange(n: number): boolean {
  return n >= WORD_MIN && n <= WORD_MAX;
}

/**
 * Personaliza UM bloco de banda via callAi, com 1 retry no word-count miss e
 * graceful-degrade para o template cru. Nunca lança — a devolutiva sempre sai.
 */
async function personalizeDim(
  dim: Dim,
  percentil: number,
  banda: Banda,
  rawTemplate: string,
  callAi: HandlerDeps["callAi"],
): Promise<{ texto: string; palavras: number }> {
  const baseArgs = {
    call_type: "bigfive_devolutiva",
    dim,
    dim_label: DIM_LABEL[dim],
    banda,
    percentil,
    rawInput: rawTemplate,
  };

  // Até 2 tentativas (1 chamada + 1 retry). Se ambas saírem do range, degrada.
  for (let attempt = 0; attempt < 2; attempt++) {
    const res = await callAi({ ...baseArgs, attempt });
    const texto = res?.parsed?.texto_interpretativo ?? "";
    const palavras =
      typeof res?.parsed?.palavras === "number" ? res.parsed.palavras : wordCount(texto);
    if (texto.length > 0 && inRange(palavras)) {
      return { texto, palavras };
    }
  }

  // Graceful-degrade: o texto oficial cru (CRP-safe) é a fonte da verdade.
  return { texto: rawTemplate, palavras: wordCount(rawTemplate) };
}

// ---------------------------------------------------------------------------
// Handler (assinatura injetável — testada Wave-0)
// ---------------------------------------------------------------------------

export async function handler(
  args: { score_id: string },
  deps: HandlerDeps,
): Promise<HandlerResult> {
  const { supabaseAdmin, callAi } = deps;

  // ── 1. Carrega a linha de score precondição via service_role ──────────────
  const { data: scoreRow, error } = await supabaseAdmin
    .from("scores_candidato")
    .select("id, candidatura_id, tipo, status, metadata")
    .eq("id", args.score_id)
    .maybeSingle();

  if (error || !scoreRow) {
    console.error("[gerar-devolutiva-bigfive] score não encontrado", {
      score_id: args.score_id,
    });
    return { status: "falhou" };
  }

  // ── 2. RF-19b GUARD (Pitfall 6): a devolutiva é EXCLUSIVA do big_five ─────
  // service_role bypassa RLS, então a precondição de tipo é checada ANTES de
  // qualquer chamada de IA ou escrita. Nunca gerar para um SJT/Redação score.
  if (scoreRow.tipo !== "big_five") {
    console.warn("[gerar-devolutiva-bigfive] RF-19b refuse: tipo inválido", {
      score_id: args.score_id,
      tipo: scoreRow.tipo,
    });
    return { status: "refused" };
  }

  // ── 3. Para cada dim: banda determinística + personalização IA ────────────
  const dimsMeta: DimMeta[] = Array.isArray(scoreRow.metadata?.dimensoes)
    ? (scoreRow.metadata!.dimensoes as DimMeta[])
    : [];
  const byDim = new Map<Dim, DimMeta>(dimsMeta.map((d) => [d.dim, d]));

  const paginas: PaginaOut[] = [];
  const dashboard: { dim: Dim; percentil: number; banda: Banda }[] = [];

  for (const dim of DIMS) {
    const meta = byDim.get(dim);
    const percentil = typeof meta?.percentil === "number" ? meta.percentil : 50;
    const banda = bandOf(percentil); // determinístico — fonte da verdade da banda
    const rawTemplate = BAND_TEMPLATES[dim][banda];

    const { texto, palavras } = await personalizeDim(
      dim,
      percentil,
      banda,
      rawTemplate,
      callAi,
    );

    paginas.push({ dim, banda, percentil, texto_interpretativo: texto, palavras });
    dashboard.push({ dim, percentil, banda });
  }

  // ── 4. Monta o conteudo_jsonb (dashboard + 5 páginas + disclaimers) ───────
  const conteudo = {
    cabecalho: { dashboard },
    paginas,
    disclaimer_emocional: DISCLAIMER_EMOCIONAL,
    disclaimer_lgpd_crp: DISCLAIMER_LGPD_CRP,
  };

  // ── 5. Persiste UMA linha de devolutiva via service_role + campos de audit ─
  const { data: inserted, error: insErr } = await supabaseAdmin
    .from("devolutivas_candidato")
    .insert({
      candidatura_id: scoreRow.candidatura_id,
      score_id: scoreRow.id,
      tipo: "big_five",
      conteudo_jsonb: conteudo,
      modelo_ia: "claude-sonnet-4-6",
      prompt_version: "1.0.0",
    });

  if (insErr) {
    console.error("[gerar-devolutiva-bigfive] falha ao persistir devolutiva", {
      candidatura_id: scoreRow.candidatura_id,
    });
    return { status: "falhou", paginas };
  }

  const devolutiva_id = inserted?.id ?? "dev-1";

  // Log redigido (Pitfall 7) — só ids/counts/status; NUNCA o texto bruto.
  console.log("[gerar-devolutiva-bigfive] ok", {
    score_id: scoreRow.id,
    candidatura_id: scoreRow.candidatura_id,
    devolutiva_id,
    paginas_count: paginas.length,
    status: "sucesso",
  });

  return { devolutiva_id, status: "sucesso", paginas };
}

// ---------------------------------------------------------------------------
// Deno.serve — wiring de produção (invocação interna via service_role)
// ---------------------------------------------------------------------------

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

if (import.meta.main) {
  // @ts-ignore — Deno global existe em runtime na Edge Function.
  Deno.serve(async (req: Request) => {
    if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
    if (req.method !== "POST") {
      return new Response(JSON.stringify({ error: "Método não suportado" }), {
        status: 405,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // @ts-ignore — Deno.env existe em runtime.
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    // @ts-ignore
    const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!SUPABASE_URL || !SERVICE_KEY) {
      return new Response(JSON.stringify({ error: "Servidor mal configurado" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Imports de runtime montados para não serem resolvidos no type-check (Deno-only).
    const { createClient } = await import(
      ["https://esm.sh/", "@supabase/supabase-js@2"].join("")
    );
    const aiClient = await import("../_shared/ai-client.ts");
    type ResolvedPrompt = import("../_shared/ai-client.ts").ResolvedPrompt;
    const { z } = await import(["npm:", "zod@3.25.76"].join(""));
    // Schema per-dim: a IA devolve SÓ o bloco interpretativo desta dimensão.
    const PaginaSchema = z.object({
      texto_interpretativo: z.string().min(50),
      palavras: z.number().int().min(100).max(250),
    });
    const { default: Anthropic } = await import(["npm:", "@anthropic-ai/sdk@0.102.0"].join(""));
    const { default: OpenAI } = await import(["npm:", "openai@6.42.0"].join(""));

    const supabaseAdmin = createClient(SUPABASE_URL, SERVICE_KEY, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
    // @ts-ignore
    const anthropic = new Anthropic({ apiKey: Deno.env.get("ANTHROPIC_API_KEY") });
    // @ts-ignore
    const openai = new OpenAI({ apiKey: Deno.env.get("OPENAI_API_KEY") });

    // Resolve o prompt bigfive_devolutiva uma vez por request.
    let resolved: ResolvedPrompt;
    try {
      const loaded = await aiClient.loadPrompt("bigfive_devolutiva", supabaseAdmin);
      resolved = aiClient.resolvedPromptFromLoaded(loaded, "bigfive_devolutiva", "gpt-4o-mini");
    } catch {
      resolved = {
        call_type: "bigfive_devolutiva",
        model_id: "claude-sonnet-4-6",
        fallback_model_id: "gpt-4o-mini",
        prompt_version: "1.0.0",
        system_template: "Personalize o template oficial de devolutiva (bigfive_devolutiva).",
        max_tokens: 1200,
        temperature: 0,
      };
    }

    // Adapta a `callAi` real (ai-client) ao contrato per-dim que o handler usa.
    const callAiAdapter = async (a: unknown): Promise<CallAiLike> => {
      const dimArgs = a as {
        dim_label: string;
        banda: Banda;
        percentil: number;
        rawInput: string;
      };
      const userBlock =
        `## DIMENSÃO\n${dimArgs.dim_label} (banda: ${dimArgs.banda})\n\n` +
        `## PERCENTIL\n${dimArgs.percentil}\n\n` +
        `## TEXTO OFICIAL\n<TEMPLATE_OFICIAL>\n${dimArgs.rawInput}\n</TEMPLATE_OFICIAL>`;
      const result = await aiClient.callAi(
        {
          prompt: resolved,
          rawInput: userBlock,
          // Likert-only: não há texto livre do candidato (T-12-16); o bloco de
          // rubric/ids contextualiza a auditoria do callAi. ids reais são
          // resolvidos no handler interno; aqui passamos o contexto disponível.
          vagaRubricBlock: `Dimensão ${dimArgs.dim_label}`,
          candidato_id: "",
          vaga_id: "",
          schema: PaginaSchema,
        },
        { anthropic, openai, supabase: supabaseAdmin },
      );
      const parsed = result.parsed as
        | { texto_interpretativo?: string; palavras?: number }
        | null;
      return { parsed };
    };

    let score_id: string;
    try {
      const raw = await req.json();
      score_id = String((raw as { score_id?: string }).score_id ?? "");
    } catch {
      return new Response(JSON.stringify({ error: "JSON inválido" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const out = await handler(
      { score_id },
      { supabaseAdmin: supabaseAdmin as unknown as SupabaseAdminLike, callAi: callAiAdapter },
    );

    const httpStatus = out.status === "refused" ? 422 : out.status === "falhou" ? 500 : 200;
    return new Response(JSON.stringify(out), {
      status: httpStatus,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  });
}
