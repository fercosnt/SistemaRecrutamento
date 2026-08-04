/**
 * AutorizacoesLista — as TRÊS linhas de `/candidato/privacidade`, nesta ordem contratual.
 *
 * ── A ORDEM É CONTRATUAL, NÃO ESTÉTICA ────────────────────────────────────────────
 *  1. **Transacional** — o item SEM escolha vem PRIMEIRO, para que a assimetria seja
 *     lida antes da escolha.
 *  2. **Marketing** — o único controle escrevível desta fase.
 *  3. **Guarda do currículo** — leitura; o detalhe (prazo, base, canal de revogação) mora
 *     na seção "O que guardamos e por quê", logo abaixo.
 *
 * ── A LINHA 1 NÃO É UM CONTROLE, E ISSO É ESTRUTURAL ──────────────────────────────
 * Invariante 3 da 43-UI-SPEC: o canal transacional **não é consentimento** — a base é o
 * Art. 7º, V (execução de procedimentos preliminares ao contrato). Renderizá-lo como
 * checkbox ou switch desabilitado seria a forma mais pura da doença que este milestone
 * existe para curar: um controle que a pessoa não pode desligar. Aqui não há
 * `Checkbox`, `Switch`, `role="checkbox"`, `aria-checked`, `aria-disabled` nem
 * `<input disabled>` — um leitor de tela tem de ouvir INFORMAÇÃO, não opção
 * desabilitada. O caso (a) da suíte da Task 3 assere isso estruturalmente: uma asserção
 * que olhasse só o texto visível não pegaria um controle acrescentado ali depois.
 *
 * ── A LISTA NUNCA FICA VAZIA ──────────────────────────────────────────────────────
 * Três linhas conhecidas em tempo de compilação. Não existe caminho de dado que a
 * esvazie: ausência de valor no servidor cai nos estados POR LINHA (E3 da 43-UI-SPEC),
 * nunca num vazio de lista.
 *
 * @module features/privacidade/components/AutorizacoesLista
 */
import { Info } from 'lucide-react'
import type { AutorizacoesCandidato } from '../services/privacidadeService'
import {
  ConsentimentoSwitchRow,
  COPY_CONSENTIMENTO_MARKETING,
} from './ConsentimentoSwitchRow'
import { formatarDataPtBr } from '../lib/datas'
import { ENCARREGADO_EMAIL } from '../constants/encarregado'

/**
 * O canal humano nomeado — RE-EXPORTADO da camada de constantes, não declarado
 * aqui. A fonte mudou de lugar para que `exportacaoService` (camada de serviço)
 * pudesse deixar de importar de um componente; a re-exportação mantém os sítios
 * de chamada existentes intactos.
 *
 * @see src/features/privacidade/constants/encarregado.ts
 */
export { ENCARREGADO_EMAIL }

/** Copy verbatim da 43-UI-SPEC §`/candidato/privacidade` (linhas 470-476). */
export const COPY_TRANSACIONAL = {
  rotulo: 'Avisos sobre o andamento da sua candidatura',
  estado: 'Sempre ativo · não é possível desativar',
  corpo:
    'Fazem parte do processo seletivo em si — confirmação, mudança de etapa, convite de entrevista e resultado. Base legal: execução de procedimentos preliminares ao contrato (LGPD, Art. 7º, V). Não incluem divulgação de vagas.',
} as const

/**
 * Copy da 3ª linha e do caso "sem registro" da 2ª.
 *
 * ⚠ ESTAS DUAS ENTRADAS SÃO AUTORADAS, não verbatim: a 43-UI-SPEC especifica a copy do
 * bloco de guarda do currículo (seção 2) e a do switch de marketing, mas é silenciosa
 * sobre (i) a linha de LEITURA da guarda dentro da lista e (ii) o candidato SEM linha de
 * autorizações. Os dois casos são reais e precisavam de texto:
 *
 *  - A linha 3 responde "o que eu autorizei"; a seção 2 responde "o que guardamos e por
 *    quê". São perguntas diferentes, por isso a linha 3 aponta para a seção em vez de
 *    repeti-la, e o canal de revogação vive num lugar só.
 *  - **4 dos 21 candidatos vivos não têm linha de consentimento nenhuma** (medido no
 *    43-07; o `INSERT` era best-effort e falhou 4 vezes). A BD-4 proíbe backfill —
 *    consentimento retroativo é fabricar prova — então esta tela **não** cria linha e
 *    **não** renderiza um switch que não teria o que atualizar. Ela diz o estado real
 *    (fail-closed: sem linha ⇒ NÃO autorizado, exatamente o que `pode_receber_marketing`
 *    devolve) e nomeia o canal humano. Um switch fantasma aqui seria promessa órfã sobre
 *    o próprio mecanismo de revogação.
 */
export const COPY_GUARDA_LINHA = {
  rotulo: 'Guarda do currículo por até 2 anos',
  corpo:
    'Esta autorização define por quanto tempo seu currículo e os dados da sua candidatura ficam guardados. O detalhe está em “O que guardamos e por quê”, logo abaixo.',
  autorizadoEm: (data: string) => `Autorizado em ${data}`,
  autorizado: 'Autorizado',
  naoAutorizado: 'Não autorizado',
} as const

export const COPY_SEM_REGISTRO = {
  estado: 'Desativado',
  corpo:
    'Não há registro de autorizações nesta conta, então não há o que desligar aqui: você não recebe avisos sobre novas vagas.',
  canal: `Para registrar suas escolhas, escreva para o nosso Encarregado de Dados: ${ENCARREGADO_EMAIL}.`,
} as const

/** Molde visual comum das linhas SEM controle (tratamento neutro de leitura). */
function LinhaDeLeitura({
  rotulo,
  estado,
  children,
  informativa = false,
}: {
  rotulo: string
  estado: string
  children: React.ReactNode
  informativa?: boolean
}) {
  return (
    <div
      className={
        informativa
          ? 'rounded-lg border border-blue-400/30 bg-blue-500/10 p-4'
          : 'rounded-lg border border-white/15 bg-white/5 p-4'
      }
    >
      <div className="flex items-start gap-3">
        {informativa && (
          <Info aria-hidden="true" className="mt-1 h-4 w-4 shrink-0 text-blue-400" />
        )}
        <div className="flex-1 space-y-2">
          <p className="text-sm font-semibold text-white">{rotulo}</p>
          {/* Regra colorblind-safe: o estado é dito em TEXTO, nunca só por cor. */}
          <p className="text-sm font-semibold text-white/70">{estado}</p>
          {children}
        </div>
      </div>
    </div>
  )
}

export interface AutorizacoesListaProps {
  /** `null` = candidato sem linha de autorizações (BD-4) — ver `COPY_SEM_REGISTRO`. */
  autorizacoes: AutorizacoesCandidato | null
  pendente: boolean
  erroEscrita: boolean
  onAlternarMarketing: (idAutorizacao: string, novoValor: boolean) => void
}

export function AutorizacoesLista({
  autorizacoes,
  pendente,
  erroEscrita,
  onAlternarMarketing,
}: AutorizacoesListaProps) {
  const dataAutorizacao = formatarDataPtBr(autorizacoes?.created_at ?? null)

  return (
    <div className="space-y-4">
      {/* ── 1. Transacional — INFORMAÇÃO, jamais controle (Invariante 3) ───────── */}
      <div data-linha="transacional">
        <LinhaDeLeitura
          informativa
          rotulo={COPY_TRANSACIONAL.rotulo}
          estado={COPY_TRANSACIONAL.estado}
        >
          <p className="text-base leading-relaxed text-white/90">
            {COPY_TRANSACIONAL.corpo}
          </p>
        </LinhaDeLeitura>
      </div>

      {/* ── 2. Marketing — a única escrita do candidato nesta fase ─────────────── */}
      <div data-linha="marketing">
        {autorizacoes ? (
          <ConsentimentoSwitchRow
            id="privacidade_marketing"
            rotulo={COPY_CONSENTIMENTO_MARKETING.rotulo}
            corpo={COPY_CONSENTIMENTO_MARKETING.corpo}
            valor={autorizacoes.autorizacao_marketing_vagas}
            confirmadoEm={autorizacoes.updated_at}
            pendente={pendente}
            erro={erroEscrita}
            onAlternar={(novoValor) =>
              onAlternarMarketing(autorizacoes.id, novoValor)
            }
          />
        ) : (
          <LinhaDeLeitura
            rotulo={COPY_CONSENTIMENTO_MARKETING.rotulo}
            estado={COPY_SEM_REGISTRO.estado}
          >
            <p className="text-base leading-relaxed text-white/90">
              {COPY_CONSENTIMENTO_MARKETING.corpo}
            </p>
            <p className="text-base leading-relaxed text-white/90">
              {COPY_SEM_REGISTRO.corpo}
            </p>
            <p className="text-base leading-relaxed text-white/90">
              {COPY_SEM_REGISTRO.canal}
            </p>
          </LinhaDeLeitura>
        )}
      </div>

      {/* ── 3. Guarda do currículo — leitura; o detalhe vive na seção 2 ─────────── */}
      <div data-linha="guarda-curriculo">
        <LinhaDeLeitura
          rotulo={COPY_GUARDA_LINHA.rotulo}
          estado={
            autorizacoes?.autorizacao_retencao_curriculo
              ? dataAutorizacao
                ? COPY_GUARDA_LINHA.autorizadoEm(dataAutorizacao)
                : COPY_GUARDA_LINHA.autorizado
              : COPY_GUARDA_LINHA.naoAutorizado
          }
        >
          <p className="text-base leading-relaxed text-white/90">
            {COPY_GUARDA_LINHA.corpo}
          </p>
        </LinhaDeLeitura>
      </div>
    </div>
  )
}
