/**
 * CurriculosBloco — o sub-bloco **Seu currículo** de `/candidato/privacidade`
 * (EXPORT-03, LGPD Art. 18, II).
 *
 * É a única superfície em que o titular alcança o próprio arquivo. A URL assinada é
 * cunhada **no clique**, com o JWT dele, pelo client anon — `service_role` não encosta
 * no CV do titular em ponto nenhum (BD-7, medido em M4+M5).
 *
 * ── O MECANISMO É DO `CvButton`; A FONTE DE DADOS, NÃO ───────────────────────────
 * Abrir `about:blank` **dentro do gesto** (a ativação transitória não sobrevive ao
 * `await`, e um `window.open` depois dele é barrado pelo Safari sempre e pelo Chrome
 * com frequência — CR-01), cortar `win.opener`, e só então apontar a aba já aberta.
 * ⚠ O que **não** é reusado é a fonte: `CvButton` chama a Edge Function
 * `get-curriculo-url`, que devolve **403 a candidato** por desenho (Phase 32). Quem
 * "reusasse o componente inteiro" entregaria 403 ao dono do arquivo.
 *
 * ── OS DOIS DESVIOS QUE UMA CÓPIA CEGA ERRARIA ───────────────────────────────────
 *  1. **Estado POR LINHA, nunca escalar.** O análogo é um botão solto com dois
 *     booleanos; aqui é uma lista, e um booleano escalar produziria erro GLOBAL — uma
 *     vaga que falha derrubando as outras. São dois conjuntos de ids.
 *  2. **Lista vazia ⇒ o componente devolve nulo.** A ausência já é dita, com copy
 *     aprovada na Phase 43, na seção 2 logo acima ("Você ainda não enviou um
 *     currículo."). Dois textos para a mesma ausência mandariam o titular procurar
 *     duas coisas diferentes.
 *
 * ── A URL VIVE UM GESTO E MORRE ──────────────────────────────────────────────────
 * Ela não entra em estado, não entra em cache, não vira atributo de elemento nenhum e
 * não é passada a registro nenhum (Invariante 4 · Pitfall 7). Só as flags booleanas
 * por linha vivem em estado — e é isso que o caso (ap) da suíte varre.
 *
 * @module features/privacidade/components/CurriculosBloco
 * @see src/features/hub-candidato/components/CvButton.tsx (o mecanismo, não a fonte)
 * @see src/features/privacidade/components/GuardaCurriculoBloco.tsx (o molde do container)
 * @see .planning/phases/44-exporta-o-acesso/44-UI-SPEC.md (§Sub-bloco "Seu currículo")
 */
import { useState } from 'react'
import { FileText } from 'lucide-react'
import {
  mintarUrlCurriculoProprio,
  COPY_CURRICULO_ERRO,
  type LinhaCurriculo,
} from '../services/exportacaoService'

/**
 * Copy verbatim da 44-UI-SPEC (§Sub-bloco "Seu currículo") — fonte única desta tela.
 *
 * ⚠ **O rótulo da ação é "Abrir", e a proibição do verbo de transferência de arquivo é
 * contrato, não preferência.** O mecanismo aponta uma aba para o Storage; o atributo
 * homônimo de um `<a>` é **ignorado em URL cross-origin**, e o Storage do Supabase é
 * outra origem. Um rótulo que prometesse o arquivo salvo na pasta do aparelho e
 * entregasse um visualizador seria copy que não descreve o comportamento — a classe
 * exata de defeito que esta fase existe para não cometer. (Os dois arquivos do 44-06
 * usam `Blob` same-origin, onde o outro verbo é correto: as duas coisas convivem na
 * mesma seção, e é por isso que a distinção precisa estar escrita.)
 */
export const COPY_CURRICULOS = {
  titulo: 'Seu currículo',
  corpo: 'Um currículo por vaga a que você se candidatou.',
  acao: 'Abrir meu currículo',
  acaoEmVoo: 'Abrindo…',
  /**
   * A primeira sentença vem do serviço, que é quem lança — uma frase só para o fato,
   * do lado que o produz e do lado que o mostra. O erro cru do transporte nunca chega
   * aqui.
   */
  erro: `${COPY_CURRICULO_ERRO} Tente novamente em instantes.`,
  /**
   * Vaga sem título resolvível. Nunca um UUID (que não é identidade humana) e nunca
   * a linha omitida: omitir esconderia do titular um arquivo que a empresa guarda.
   */
  vagaSemTitulo: 'Vaga não identificada',
} as const

export interface CurriculosBlocoProps {
  /** As candidaturas com currículo, já normalizadas pelo serviço. */
  linhas: readonly LinhaCurriculo[]
}

/** Liga/desliga um id num conjunto, sem mutar o anterior. */
function alternar(id: string, ligado: boolean) {
  return (atual: ReadonlySet<string>): ReadonlySet<string> => {
    const proximo = new Set(atual)
    if (ligado) proximo.add(id)
    else proximo.delete(id)
    return proximo
  }
}

export function CurriculosBloco({ linhas }: CurriculosBlocoProps) {
  // Só conjuntos de ids — a URL assinada NUNCA é guardada (Pitfall 7).
  const [emVoo, setEmVoo] = useState<ReadonlySet<string>>(() => new Set<string>())
  const [comErro, setComErro] = useState<ReadonlySet<string>>(() => new Set<string>())

  async function abrir(linha: LinhaCurriculo) {
    if (emVoo.has(linha.id)) return
    setEmVoo(alternar(linha.id, true))
    setComErro(alternar(linha.id, false))

    // A aba nasce AQUI, síncrona, dentro do gesto.
    const aba = window.open('about:blank', '_blank')
    if (aba) aba.opener = null
    try {
      const url = await mintarUrlCurriculoProprio(linha.caminho)
      if (aba) {
        // Direto para a aba já aberta. Não passa por estado, não vira atributo.
        aba.location.href = url
      } else {
        // Aba nula = popup barrado. Erro VISÍVEL desta linha, nunca silêncio.
        setComErro(alternar(linha.id, true))
      }
    } catch {
      if (aba) aba.close()
      setComErro(alternar(linha.id, true))
    } finally {
      setEmVoo(alternar(linha.id, false))
    }
  }

  // E3/empty — antes de qualquer outra coisa.
  if (linhas.length === 0) return null

  return (
    <div
      data-bloco="curriculos"
      className="space-y-2 rounded-lg border border-white/15 bg-white/5 p-4"
    >
      <p className="text-sm font-semibold text-white">{COPY_CURRICULOS.titulo}</p>
      <p data-corpo-bloco className="text-base leading-relaxed text-white/90">
        {COPY_CURRICULOS.corpo}
      </p>

      {/* Altura livre, sem contêiner de altura fixa e sem rolagem interna: quem tem
          muitas candidaturas rola a página, que é o gesto natural do mobile. */}
      <ul className="space-y-3 pt-1">
        {linhas.map((linha) => {
          const carregando = emVoo.has(linha.id)
          const falhou = comErro.has(linha.id)
          const rotuloVaga = linha.vagaTitulo ?? COPY_CURRICULOS.vagaSemTitulo

          return (
            <li key={linha.id} data-linha-curriculo className="space-y-2">
              {/* ⚠ EMPILHA A 320px, lado a lado a partir de `sm`. Medido, não
                  estimado: a 320px sobram 256px úteis (descontados o `px-4` da
                  página e o `p-4` do bloco), e o botão ocupa ~210px — lado a lado
                  restariam ~34px para o título, quatro caracteres. Truncar até a
                  ilegibilidade apaga a informação que o par `truncate`+tooltip
                  existe para preservar, e no celular não há hover que a recupere.
                  Esta é a superfície do candidato, que é mobile-first (CLAUDE.md). */}
              <div
                data-linha-corpo
                className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between sm:gap-3"
              >
                {/* O par `truncate` + tooltip é obrigatório: truncar sem oferecer
                    como recuperar o valor apaga informação do titular. */}
                <span
                  data-titulo-vaga
                  title={rotuloVaga}
                  className="w-full min-w-0 truncate text-base leading-relaxed text-white/90 sm:flex-1"
                >
                  {rotuloVaga}
                </span>
                <button
                  type="button"
                  onClick={() => abrir(linha)}
                  disabled={carregando}
                  aria-busy={carregando}
                  className="inline-flex min-h-[44px] shrink-0 items-center gap-2 self-start rounded-xl border border-white/20 bg-white/5 px-5 text-sm font-semibold text-white transition-colors hover:bg-white/10 disabled:opacity-60 sm:self-auto"
                >
                  <FileText className="h-4 w-4" aria-hidden="true" />
                  {carregando ? COPY_CURRICULOS.acaoEmVoo : COPY_CURRICULOS.acao}
                </button>
              </div>
              {falhou ? (
                <p className="text-sm text-red-300" aria-live="polite">
                  {COPY_CURRICULOS.erro}
                </p>
              ) : null}
            </li>
          )
        })}
      </ul>
    </div>
  )
}
