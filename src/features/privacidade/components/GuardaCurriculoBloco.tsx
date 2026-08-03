/**
 * GuardaCurriculoBloco — o PRIMEIRO consumidor real de `autorizacao_retencao_curriculo`
 * (RETEN-03).
 *
 * A coluna existe desde o M1 e nunca foi lida por ninguém. Aqui o titular lê, por
 * escrito, sob qual base o currículo dele é guardado e por quanto tempo. Três casos, e
 * **nenhum deles promete exclusão** (Invariante 1 da 43-UI-SPEC): nada apaga dado de
 * candidato neste sistema hoje, e o motor de exclusão é a Phase 45.
 *
 * ── DECISÃO REGISTRADA — DE ONDE SAI O "PRAZO PREVISTO" ───────────────────────────
 * Ele é a **data da autorização + 24 meses**, o teto que a pessoa LEU E ACEITOU no
 * cadastro ("Autorizo guardar meu currículo por até 2 anos", `consent-text.json`).
 *
 * Ele **NÃO** vem da matriz `config_retencao_etapa`, e a escolha é deliberada por três
 * razões: (i) aquela matriz é configuração INTERNA do operador, e mostrá-la ao candidato
 * exporia política interna; (ii) ela é chaveada por ESTADO DA CANDIDATURA, enquanto o
 * que o titular consentiu é um teto único sobre o currículo; (iii) um administrador pode
 * encurtar uma janela lá sem que a copy consentida mude aqui — e a copy consentida é a
 * que vale perante o titular.
 *
 * ⚠ **DEPENDÊNCIA DA PHASE 46, registrada aqui de propósito:** quando a purga for
 * ligada, esta data e a matriz terão de ser RECONCILIADAS, ou esta copy revista. Hoje a
 * frase continua verdadeira porque nada apaga; no dia em que algo apagar, um prazo de
 * tela que discorde da janela executada é precisamente a promessa órfã que este
 * milestone existe para eliminar.
 *
 * ── DECISÃO REGISTRADA — POR QUE A GUARDA NÃO GANHA SWITCH NESTA FASE ─────────────
 * A LGPD (Art. 8º, §5) exige que o consentimento seja revogável, e a exigência é
 * atendida por **canal humano nomeado e existente**: o Encarregado. O que não existe é
 * motor de exclusão — ele é a Phase 45. Um switch aqui desligaria uma flag e **nada mais
 * aconteceria**: a promessa órfã de novo, agora sobre o dado mais sensível da fase. Um
 * caminho mais lento que funciona vale mais que um instantâneo que mente.
 *
 * E é **proibido**, na copy do candidato, prometer que a autogestão chegará: isso é
 * roadmap, não compromisso com o titular.
 *
 * @module features/privacidade/components/GuardaCurriculoBloco
 * @see .planning/phases/43-consentimentos-honestos-pol-tica-de-reten-o/43-UI-SPEC.md
 *      (§Seção 2 · guarda do currículo — copy verbatim, linhas 499-507)
 */
import { formatarDataMaisMeses, formatarDataPtBr, TETO_GUARDA_MESES } from '../lib/datas'
import { ENCARREGADO_EMAIL } from './AutorizacoesLista'

/** Copy verbatim da 43-UI-SPEC (linhas 502-507). */
export const COPY_GUARDA_CURRICULO = {
  autorizadoTitulo: 'Currículo guardado.',
  autorizadoCorpo:
    'Você autorizou a Beauty Smile a guardar seu currículo e os dados da sua candidatura por até 2 anos.',
  autorizadoBase: (autorizacao: string, prazo: string) =>
    `Base da guarda: sua autorização de ${autorizacao}. Prazo previsto: até ${prazo}.`,
  naoAutorizadoTitulo: 'Currículo guardado enquanto o processo durar.',
  naoAutorizadoCorpo:
    'Você não autorizou a guarda por 2 anos, então seu currículo e os dados da sua candidatura ficam com a gente apenas enquanto o processo em que você está durar.',
  semCurriculoTitulo: 'Você ainda não enviou um currículo.',
  semCurriculoCorpo:
    'Quando você enviar um, ele aparece aqui com o prazo de guarda que você autorizou.',
  notaRevogacao: `Para retirar esta autorização ou pedir a eliminação do seu currículo, escreva para o nosso Encarregado de Dados: ${ENCARREGADO_EMAIL}.`,
} as const

export interface GuardaCurriculoBlocoProps {
  /** `autorizacao_retencao_curriculo` da linha mais recente. */
  autorizado: boolean
  temCurriculo: boolean
  /** `created_at` da linha de autorizações — a data do ato que embasa a guarda. */
  autorizadoEm: string | null
}

export function GuardaCurriculoBloco({
  autorizado,
  temCurriculo,
  autorizadoEm,
}: GuardaCurriculoBlocoProps) {
  // Caso 3 — sem currículo. Sem nota de revogação: não há autorização exercida sobre
  // arquivo nenhum, e oferecer o canal aqui convidaria a pedir a retirada de algo que
  // não existe.
  if (!temCurriculo) {
    return (
      <div
        data-bloco="guarda-curriculo"
        className="space-y-2 rounded-lg border border-white/15 bg-white/5 p-4"
      >
        <p className="text-sm font-semibold text-white">
          {COPY_GUARDA_CURRICULO.semCurriculoTitulo}
        </p>
        <p className="text-base leading-relaxed text-white/90">
          {COPY_GUARDA_CURRICULO.semCurriculoCorpo}
        </p>
      </div>
    )
  }

  const dataAutorizacao = formatarDataPtBr(autorizadoEm)
  const prazoPrevisto = formatarDataMaisMeses(autorizadoEm, TETO_GUARDA_MESES)

  return (
    <div
      data-bloco="guarda-curriculo"
      className="space-y-2 rounded-lg border border-white/15 bg-white/5 p-4"
    >
      <p className="text-sm font-semibold text-white">
        {autorizado
          ? COPY_GUARDA_CURRICULO.autorizadoTitulo
          : COPY_GUARDA_CURRICULO.naoAutorizadoTitulo}
      </p>
      <p className="text-base leading-relaxed text-white/90">
        {autorizado
          ? COPY_GUARDA_CURRICULO.autorizadoCorpo
          : COPY_GUARDA_CURRICULO.naoAutorizadoCorpo}
      </p>

      {/* A base e o prazo só existem quando há autorização E data do ato. Sem data, a
          frase é omitida em vez de inventar um prazo — um prazo fabricado seria pior
          que um prazo ausente. */}
      {autorizado && dataAutorizacao && prazoPrevisto && (
        <p className="text-sm font-semibold text-white/70">
          {COPY_GUARDA_CURRICULO.autorizadoBase(dataAutorizacao, prazoPrevisto)}
        </p>
      )}

      {/* Nota de revogação por canal humano — SEMPRE visível nos dois casos com currículo. */}
      <p className="text-base leading-relaxed text-white/80">
        {COPY_GUARDA_CURRICULO.notaRevogacao}
      </p>
    </div>
  )
}
