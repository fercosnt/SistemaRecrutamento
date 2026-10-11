/**
 * AvaliacoesRespondidasBloco — hoje, SÓ a cópia `COPY_AVALIACOES_RESPONDIDAS`.
 *
 * Histórico. 51-02 / JORN-45 (D-17, D-18 da 51): este arquivo era o bloco irmão da seção
 * «Avaliação assíncrona» no hub do RH — dizia quantas avaliações foram respondidas e abria o
 * `ScorecardAvaliacao` no lugar, pelo botão «Ver respostas», em QUALQUER etapa.
 *
 * 52-25 / D-18, D-52-U03: o componente SAIU do hub. A D-18 manda tudo aberto dentro das abas, e com
 * tudo aberto o bloco só repetia a contagem que a seção já dizia — o defeito (c) do UAT da 51
 * («3 avaliações respondidas» duas vezes). O `ScorecardAvaliacao` monta aberto DENTRO da seção, e o
 * motivo de o bloco ser irmão (caminho em qualquer etapa) virou a regra de estado do hub: havendo
 * linha `sjt`/`big_five`, a seção é `com_dados` em qualquer etapa (`estadoDaAssincrona`).
 *
 * Por que o arquivo continua: a constante abaixo é a fonte única da frase — importada pelo hub
 * (`HubCandidatoRH`) e conferida pelos testes (PATTERNS §N). Mover a constante mudaria o import de
 * todos eles sem ganho; o nome do arquivo fica como registro de onde ela nasceu.
 *
 * @module features/hub-candidato/components/AvaliacoesRespondidasBloco
 * @see src/features/hub-candidato/components/HubCandidatoRH.tsx (seção «Avaliação assíncrona»)
 * @see src/features/avaliacao/components/ScorecardAvaliacao.tsx (`linhasDeAvaliacao`, o detalhe)
 */

/** A frase da seção «Avaliação assíncrona» — uma vez só no hub (defeito c). */
export const COPY_AVALIACOES_RESPONDIDAS = {
  contagem: (n: number) =>
    n === 1 ? '1 avaliação respondida' : `${n} avaliações respondidas`,
  nenhuma: 'Nenhuma avaliação respondida ainda.',
} as const
