/**
 * Phase 7 — Serviço de Configuração de Vaga (M2).
 *
 * Persists the new vaga config fields (`testes_aplicaveis`, `pesos_avaliacao`)
 * and drives the two PL/pgSQL RPCs:
 *   - `upsert_pergunta_opcoes_metadata` — atomic jsonb↔table tag sync (VAGACFG-03)
 *   - `publish_vaga` — server-side D-12 publish gate (rascunho→ativa)
 *
 * Mirrors `features/vagas/services/vagasService.ts` (custom error class +
 * try/catch error mapping). Uses the ANON client only — never the admin /
 * service-role client (CLAUDE.md Security Rules). Authorization is enforced
 * server-side by the RLS
 * policies + the in-body role check inside the SECURITY DEFINER RPCs (Plan 02).
 *
 * @module features/config-vaga/services/configVagaService
 */
import { supabase } from '@/lib/supabase/client'
import type { Json, Database } from '../../../../database.types'
import type {
  VagaConfig,
  OpcaoMetadataInput,
} from '../types/configVagaTypes'

/**
 * Base-field write payload for `updateVagaBase` (FUNIL-04). Field names carry the
 * form's semantics; the writer maps each to its real `vagas` column.
 */
export interface VagaBaseInput {
  titulo: string
  departamento: string | null
  cidade: string | null
  estado: string | null
  faixaSalarialMin: number | null
  faixaSalarialMax: number | null
  jornada: string | null
  responsabilidades: string | null
  formacao: string | null
  experiencia: string | null
  tecnicos: string | null
  habilidades: string | null
  perfilIdeal: string | null
  diferenciais: string | null
  status: Database['public']['Enums']['status_vaga']
  /**
   * Os quatro campos que a tela de edição SEMPRE coletou e NUNCA gravou (medido em
   * 2026-09-05: o formulário tem slug, tipo de contrato, modalidade e «o que você
   * faz», o toast dizia «salvo», e o banco ficava como estava). Opcionais para não
   * forçar quem só edita a base; `undefined` = não mexer.
   *
   * `slug` só vai ao UPDATE quando não-vazio: o CHECK `slug_format_check` recusa
   * string vazia e a coluna é UNIQUE — mandar '' derrubaria o save inteiro.
   */
  slug?: string
  tipoContrato?: string | null
  modeloTrabalho?: string | null
  descricaoCurta?: string | null
  /**
   * A rubrica que a IA usa para AVALIAR (aba IA). Distinta da cópia que ATRAI:
   * quando a vaga tem rubrica, `analise-candidato-individual` manda ao modelo
   * APENAS `Vaga: <titulo>` + a rubrica, e mais nada da vaga.
   *
   * `undefined` significa "não mexer" — e não "apagar". A tela só envia um valor
   * depois de ter CARREGADO a rubrica atual; sem essa distinção, um load que
   * falha viraria um UPDATE para string vazia no save seguinte, apagando em
   * silêncio o único critério de avaliação da vaga.
   */
  rubricaIa?: string | null
}

/** Um dos quatro blocos do CHECK de `perguntas_formulario.bloco`. */
export type BlocoPergunta = 'jornada' | 'tecnologia' | 'valores' | 'curriculo'

/** Uma pergunta da Etapa 1, como a tela de configuração a manipula. */
export interface PerguntaVaga {
  /** `null` numa pergunta ainda não persistida. */
  id: string | null
  bloco: BlocoPergunta
  ordem: number
  texto_pergunta: string
  texto_ajuda: string | null
  tipo_resposta: Database['public']['Enums']['tipo_resposta_pergunta']
  opcoes_resposta: string[] | null
  obrigatoria: boolean
  limite_caracteres: number | null
}

/**
 * Custom Error for config-vaga operations.
 *
 * Mirrors `VagasServiceError`'s code union plus `'FORBIDDEN'` (maps a Supabase
 * `42501` error raised by the SECURITY DEFINER in-body role check).
 */
export class ConfigVagaServiceError extends Error {
  constructor(
    message: string,
    public code:
      | 'INVALID_INPUT'
      | 'NETWORK_ERROR'
      | 'DATABASE_ERROR'
      | 'NOT_FOUND'
      | 'UNAUTHORIZED'
      | 'FORBIDDEN',
    public details?: unknown
  ) {
    super(message)
    this.name = 'ConfigVagaServiceError'
  }
}

/** A Supabase error whose code/message indicates a 42501 (insufficient privilege). */
function isForbidden(error: { code?: string; message?: string }): boolean {
  return (
    error.code === '42501' ||
    /\b42501\b/.test(error.message ?? '') ||
    /forbidden|insufficient.?privilege/i.test(error.message ?? '')
  )
}

/**
 * Persist the two M2 jsonb columns on a vaga (D-02 "ligar de verdade").
 * Used by "Salvar rascunho" — NO publish validation (D-12: drafts never validate).
 */
export async function updateVagaConfig(
  vagaId: string,
  config: VagaConfig
): Promise<void> {
  const { error } = await supabase
    .from('vagas')
    .update({
      testes_aplicaveis: config.testes_aplicaveis,
      pesos_avaliacao: config.pesos_avaliacao,
    })
    .eq('id', vagaId)

  if (error) {
    if (isForbidden(error)) {
      throw new ConfigVagaServiceError(
        'Sem permissão para alterar a configuração desta vaga.',
        'FORBIDDEN',
        error
      )
    }
    throw new ConfigVagaServiceError(
      `Erro ao salvar configuração da vaga: ${error.message}`,
      'DATABASE_ERROR',
      error
    )
  }
}

/**
 * Persist the vaga BASE fields + status on the Editar Vaga edit-save path
 * (FUNIL-04). Mirrors `updateVagaConfig`: a single real `.from('vagas').update`
 * keyed on the vaga id, anon client only (RLS + the Phase-24 vaga-scoping govern
 * who may UPDATE which vaga); a Supabase `42501` maps to code 'FORBIDDEN'.
 *
 * The payload writes ONLY columns that exist on the `vagas` Row — closing the
 * silent no-op persistence hole (T-25-03-02).
 */
export async function updateVagaBase(
  vagaId: string,
  base: VagaBaseInput
): Promise<void> {
  const payload: Database['public']['Tables']['vagas']['Update'] = {
    titulo: base.titulo,
    departamento: base.departamento,
    cidade: base.cidade,
    estado: base.estado,
    faixa_salarial_min: base.faixaSalarialMin,
    faixa_salarial_max: base.faixaSalarialMax,
    jornada_trabalho: base.jornada,
    responsabilidades: base.responsabilidades,
    requisitos_formacao: base.formacao,
    requisitos_experiencia: base.experiencia,
    requisitos_tecnicos: base.tecnicos,
    requisitos_habilidades: base.habilidades,
    perfil_ideal: base.perfilIdeal,
    diferenciais: base.diferenciais,
    status: base.status,
  }
  // A chave só existe no UPDATE quando houve load — ver VagaBaseInput.rubricaIa.
  // Atribuir `undefined` não serve: o cliente do Supabase recusa a propriedade.
  if (base.rubricaIa !== undefined) {
    payload.rubrica_ia = base.rubricaIa
  }
  if (base.slug !== undefined && base.slug.trim() !== '') {
    payload.slug = base.slug.trim()
  }
  if (base.tipoContrato !== undefined) payload.tipo_contrato = base.tipoContrato
  if (base.modeloTrabalho !== undefined) payload.modelo_trabalho = base.modeloTrabalho
  if (base.descricaoCurta !== undefined) payload.descricao_curta = base.descricaoCurta

  const { error } = await supabase.from('vagas').update(payload).eq('id', vagaId)

  if (error) {
    if (isForbidden(error)) {
      throw new ConfigVagaServiceError(
        'Sem permissão para salvar as alterações desta vaga.',
        'FORBIDDEN',
        error
      )
    }
    throw new ConfigVagaServiceError(
      `Erro ao salvar a vaga: ${error.message}`,
      'DATABASE_ERROR',
      error
    )
  }
}

/**
 * Lê as perguntas da Etapa 1 de uma vaga, na ordem em que o candidato as vê.
 *
 * Espelha `useVagaPerguntas` (o hook que monta o formulário do candidato): mesma
 * tabela, mesmo filtro de soft-delete, mesma ordenação. As duas telas TÊM de ler
 * a mesma coisa — foi por a de configuração não ler nada que 5 perguntas reais e
 * uma rubrica de 3.9 mil caracteres ficaram invisíveis para o RH enquanto o
 * candidato as via normalmente.
 *
 * `opcoes_resposta` chega em dois formatos nesta base: `string[]` (o histórico) e
 * `[{id, texto}]` (o que `upsert_pergunta_opcoes_metadata` grava de volta). Os
 * dois são normalizados para `string[]`.
 */
export async function getPerguntasVaga(vagaId: string): Promise<PerguntaVaga[]> {
  const { data, error } = await supabase
    .from('perguntas_formulario')
    .select(
      'id, bloco, ordem, texto_pergunta, texto_ajuda, tipo_resposta, opcoes_resposta, obrigatoria, limite_caracteres'
    )
    .eq('vaga_id', vagaId)
    .is('deleted_at', null)
    .order('ordem', { ascending: true })

  if (error) {
    throw new ConfigVagaServiceError(
      `Erro ao carregar as perguntas da vaga: ${error.message}`,
      'DATABASE_ERROR',
      error
    )
  }

  return (data ?? []).map((row) => ({
    id: row.id,
    bloco: row.bloco as BlocoPergunta,
    ordem: row.ordem,
    texto_pergunta: row.texto_pergunta,
    texto_ajuda: row.texto_ajuda,
    tipo_resposta: row.tipo_resposta,
    opcoes_resposta: normalizeOpcoes(row.opcoes_resposta),
    obrigatoria: row.obrigatoria,
    limite_caracteres: row.limite_caracteres,
  }))
}

/** `string[]` | `[{id, texto}]` | null → `string[]` | null. */
function normalizeOpcoes(raw: unknown): string[] | null {
  if (!Array.isArray(raw) || raw.length === 0) return null
  return raw
    .map((o) => {
      if (typeof o === 'string') return o
      if (o && typeof o === 'object' && 'texto' in o) return String((o as { texto: unknown }).texto)
      return ''
    })
    .filter((s) => s.trim().length > 0)
}

/**
 * Grava as perguntas da Etapa 1: insere as novas, atualiza as que mudaram e
 * SOFT-deleta as que o operador removeu. Nunca faz DELETE físico — resposta de
 * candidato aponta para `pergunta_id`.
 *
 * ⚠ `perguntasCarregadas` NÃO é cerimônia. A tela de configuração inicializa as
 * listas vazias; se o load falhar (ou se alguém chamar isto antes dele), salvar
 * apagaria todas as perguntas da vaga sem que ninguém tivesse pedido. O portão
 * abaixo torna esse caminho impossível em vez de improvável.
 *
 * ⚠ O teto de 10 perguntas do `publish_vaga` conta SEM filtrar `deleted_at`:
 * soft-deletar não devolve espaço no teto. Quem publica recebe o erro do
 * servidor, que é a autoridade.
 */
export async function savePerguntasVaga(
  vagaId: string,
  perguntas: PerguntaVaga[],
  perguntasCarregadas: boolean
): Promise<void> {
  if (!perguntasCarregadas) {
    throw new ConfigVagaServiceError(
      'As perguntas não chegaram a ser carregadas — salvar agora as apagaria. Recarregue a página.',
      'INVALID_INPUT'
    )
  }

  const existentes = await getPerguntasVaga(vagaId)
  const mantidos = new Set(perguntas.map((p) => p.id).filter((id): id is string => !!id))
  const removidas = existentes.filter((e) => e.id && !mantidos.has(e.id))

  const autorId = (await supabase.auth.getUser()).data.user?.id ?? null

  // Soft-delete do que saiu da tela.
  if (removidas.length > 0) {
    const { error } = await supabase
      .from('perguntas_formulario')
      .update({ deleted_at: new Date().toISOString(), updated_by: autorId })
      .in(
        'id',
        removidas.map((r) => r.id as string)
      )
    if (error) throw mapPerguntaError(error)
  }

  // Insere as novas. `created_by` explícito: 6 perguntas desta base nasceram com
  // ele nulo por INSERT ad-hoc, e é isso que gateia o escopo do recrutador.
  const novas = perguntas.filter((p) => !p.id)
  if (novas.length > 0) {
    const { error } = await supabase.from('perguntas_formulario').insert(
      novas.map((p) => ({
        vaga_id: vagaId,
        bloco: p.bloco,
        ordem: p.ordem,
        texto_pergunta: p.texto_pergunta,
        texto_ajuda: p.texto_ajuda,
        tipo_resposta: p.tipo_resposta,
        opcoes_resposta: p.opcoes_resposta as unknown as Json,
        obrigatoria: p.obrigatoria,
        limite_caracteres: p.limite_caracteres,
        created_by: autorId,
        updated_by: autorId,
      }))
    )
    if (error) throw mapPerguntaError(error)
  }

  // Atualiza as que já existiam.
  for (const p of perguntas.filter((q) => !!q.id)) {
    const { error } = await supabase
      .from('perguntas_formulario')
      .update({
        bloco: p.bloco,
        ordem: p.ordem,
        texto_pergunta: p.texto_pergunta,
        texto_ajuda: p.texto_ajuda,
        tipo_resposta: p.tipo_resposta,
        opcoes_resposta: p.opcoes_resposta as unknown as Json,
        obrigatoria: p.obrigatoria,
        limite_caracteres: p.limite_caracteres,
        updated_by: autorId,
      })
      .eq('id', p.id as string)
    if (error) throw mapPerguntaError(error)
  }
}

function mapPerguntaError(error: { code?: string; message?: string }): ConfigVagaServiceError {
  if (isForbidden(error)) {
    return new ConfigVagaServiceError(
      'Sem permissão para editar as perguntas desta vaga.',
      'FORBIDDEN',
      error
    )
  }
  return new ConfigVagaServiceError(
    `Erro ao salvar as perguntas: ${error.message}`,
    'DATABASE_ERROR',
    error
  )
}

/**
 * Atomic jsonb↔table tag sync for one pergunta (VAGACFG-03).
 * Calls `upsert_pergunta_opcoes_metadata(p_pergunta_id, p_opcoes)`. The RPC mints
 * a stable `opcao_id` per option (where absent), writes the id-bearing jsonb back
 * to `opcoes_resposta`, and replaces the `pergunta_opcao_metadata` rows.
 */
export async function upsertOpcoesMetadata(
  perguntaId: string,
  opcoes: OpcaoMetadataInput[]
): Promise<unknown> {
  const { data, error } = await supabase.rpc(
    'upsert_pergunta_opcoes_metadata',
    {
      p_pergunta_id: perguntaId,
      // The RPC arg is typed `Json`; OpcaoMetadataInput[] is a JSON-serializable
      // payload with optional fields, so cast at the boundary.
      p_opcoes: opcoes as unknown as Json,
    }
  )

  if (error) {
    if (isForbidden(error)) {
      throw new ConfigVagaServiceError(
        'Sem permissão para configurar as tags desta pergunta.',
        'FORBIDDEN',
        error
      )
    }
    throw new ConfigVagaServiceError(
      `Erro ao sincronizar tags das opções: ${error.message}`,
      'DATABASE_ERROR',
      error
    )
  }

  return data
}

/**
 * Server-side D-12 publish gate (rascunho→ativa). Calls `publish_vaga(p_vaga_id)`,
 * which re-checks the 3 conditions before flipping `status='ativa'` — the
 * authoritative gate (the client `publishGate` fn is UX-only).
 */
export async function publishVaga(vagaId: string): Promise<unknown> {
  const { data, error } = await supabase.rpc('publish_vaga', {
    p_vaga_id: vagaId,
  })

  if (error) {
    if (isForbidden(error)) {
      throw new ConfigVagaServiceError(
        'Sem permissão para publicar esta vaga.',
        'FORBIDDEN',
        error
      )
    }
    throw new ConfigVagaServiceError(
      `Erro ao publicar vaga: ${error.message}`,
      'DATABASE_ERROR',
      error
    )
  }

  return data
}
