/**
 * RespostasInscricaoBloco — «Respostas da inscrição» na aba «Cadastro e inscrição» do hub do RH
 * (Phase 52 / Plan 52-24; JORN-55; G-51-OP1, D-19, D-20; UI-SPEC §Aba «Cadastro e inscrição», E4).
 *
 * As respostas chegam por props, de `inscricao` do MESMO `useCadastroCandidatoRh` que alimenta o
 * cabeçalho e «Dados do cadastro» (EF `ler-cadastro-candidato-rh`, com linha de log) — nenhuma
 * leitura nova. A EF já entrega na `ordem` do formulário; aqui só se agrupa, com a MESMA função do
 * formulário (`groupByBloco` + `rotuloDoBloco`, `features/vagas/lib/blocosFormulario`), para o RH
 * ver as perguntas como o candidato as viu.
 *
 * - **Eliminatória (D-19, RNF-07a, Invariante 3):** só o selo neutro «Eliminatória». A resposta
 *   aparece como as outras — sem «passou/não passou», sem distância do corte, sem a opção que
 *   elimina. A EF nem devolve as opções não escolhidas: o RH vê a resposta, não um veredito.
 * - **Links (D-20, Invariante 6):** só `http(s)`, por segmento (`TextoComLinks`).
 * - **Texto do candidato é nó de texto (Invariante 5):** nunca HTML cru injetado no DOM.
 * - Sem resposta → «Sem resposta»; pergunta removida depois da inscrição → a nota, na posição dela;
 *   opção cujo texto não resolve → o valor cru que chegou (nunca célula vazia).
 *
 * @module features/hub-candidato/components/RespostasInscricaoBloco
 * @see .planning/phases/52-hub-do-rh-dados-e-contato/52-UI-SPEC.md (§Aba «Cadastro e inscrição»)
 */
import { Badge } from '@/components/ui/badge'
import { groupByBloco, rotuloDoBloco } from '@/features/vagas/lib/blocosFormulario'
import type { RespostaInscricaoRh } from '../services/cadastroCandidatoRhService'
import { TextoComLinks } from './TextoComLinks'

/** Frases da seção — uma fonte só, testável. */
export const COPY_RESPOSTAS_INSCRICAO = {
  titulo: 'Respostas da inscrição',
  vazio: {
    heading: 'Nenhuma resposta de formulário registrada para esta candidatura.',
    body: 'Se a vaga tiver perguntas, elas aparecem aqui na ordem do formulário.',
  },
  semResposta: 'Sem resposta',
  removida: 'Pergunta removida do formulário depois da inscrição.',
  eliminatoria: 'Eliminatória',
} as const

const H3 = 'text-base font-semibold text-white'
const FICHA = 'space-y-2 rounded-lg border border-white/15 bg-white/5 p-4'
const PERGUNTA = 'text-sm font-semibold text-white/70'
const SELO = 'border-white/20 bg-white/5 text-sm font-semibold text-white/80'
const RESPOSTA = 'text-base text-white/90 leading-relaxed whitespace-pre-line break-words'
const AUSENTE = 'text-base text-white/60 leading-relaxed'
const NOTA = 'text-sm text-white/60'

function Resposta({ p }: { p: RespostaInscricaoRh }) {
  const r = p.resposta
  const opcoes = (r?.opcoes ?? []).filter((o) => o.trim() !== '')
  const texto = r?.texto && r.texto.trim() !== '' ? r.texto : null
  const numero = typeof r?.numero === 'number' && Number.isFinite(r.numero) ? r.numero : null

  if (opcoes.length === 0 && texto === null && numero === null) {
    return <p className={AUSENTE}>{COPY_RESPOSTAS_INSCRICAO.semResposta}</p>
  }

  const multipla = p.tipo_resposta === 'multiple_choice' || opcoes.length > 1
  return (
    <>
      {opcoes.length > 0 && multipla ? (
        <ul className="list-disc space-y-1 pl-5 text-base text-white/90">
          {opcoes.map((o, i) => (
            <li key={i} className="break-words">
              <TextoComLinks texto={o} />
            </li>
          ))}
        </ul>
      ) : null}
      {opcoes.length > 0 && !multipla ? (
        <p className={RESPOSTA}>
          <TextoComLinks texto={opcoes[0]} />
        </p>
      ) : null}
      {texto !== null ? (
        <p className={RESPOSTA}>
          <TextoComLinks texto={texto} />
        </p>
      ) : null}
      {numero !== null ? <p className={RESPOSTA}>{numero.toLocaleString('pt-BR')}</p> : null}
    </>
  )
}

export interface RespostasInscricaoBlocoProps {
  /** As perguntas da inscrição com a resposta desta candidatura, na `ordem` do formulário. */
  inscricao: RespostaInscricaoRh[]
}

export function RespostasInscricaoBloco({ inscricao }: RespostasInscricaoBlocoProps) {
  if (inscricao.length === 0) {
    return (
      <div data-testid="hub-respostas-inscricao" className="space-y-1">
        <p className={H3}>{COPY_RESPOSTAS_INSCRICAO.vazio.heading}</p>
        <p className="text-sm text-white/70">{COPY_RESPOSTAS_INSCRICAO.vazio.body}</p>
      </div>
    )
  }

  const grupos = Array.from(groupByBloco(inscricao).entries()).filter(([, ps]) => ps.length > 0)

  return (
    <div data-testid="hub-respostas-inscricao" className="space-y-6">
      {grupos.map(([bloco, perguntas]) => (
        <section key={bloco} className="space-y-3">
          <h3 className={H3}>{rotuloDoBloco(bloco)}</h3>
          <ol className="space-y-3">
            {perguntas.map((p) => (
              <li key={p.pergunta_id} className={FICHA}>
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <p className={PERGUNTA}>{p.texto_pergunta}</p>
                  {p.eliminatoria ? (
                    <Badge variant="outline" className={SELO}>
                      {COPY_RESPOSTAS_INSCRICAO.eliminatoria}
                    </Badge>
                  ) : null}
                </div>
                {p.removida ? <p className={NOTA}>{COPY_RESPOSTAS_INSCRICAO.removida}</p> : null}
                <Resposta p={p} />
              </li>
            ))}
          </ol>
        </section>
      ))}
    </div>
  )
}
