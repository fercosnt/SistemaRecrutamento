/**
 * useExportarMeusDados — a mutation que **é** o pedido de cópia (EXPORT-01).
 *
 * DUAS PROIBIÇÕES QUE SÃO O PONTO DO HOOK, não detalhe de implementação:
 *
 *  1. **NUNCA `onMutate`.** A Invariante 5 da 43-UI-SPEC (ainda em vigor nesta
 *     página) proíbe UI otimista aqui — e o motivo é mais duro que o de costume:
 *     não há nada a antecipar. Antecipar um download seria mentir sobre um arquivo
 *     que ainda não existe, e o arquivo é o exercício do direito.
 *
 *  2. **NENHUM `toast`.** O feedback de sucesso desta tela precisa PERSISTIR — ele
 *     nomeia DOIS arquivos que a pessoa vai procurar na pasta de downloads, e um
 *     toast some antes disso. Quem o renderiza é o `PedirCopiaBloco`, a partir do
 *     mesmo `RespostaExport` que este hook devolve.
 *
 * O disparo do arquivo vive no `onSuccess`, sobre o que o SERVIDOR devolveu — nunca
 * sobre o que foi pedido.
 *
 * @module features/privacidade/hooks/useExportarMeusDados
 * @see src/features/privacidade/hooks/useRevogarMarketing.ts (o molde de mutation desta feature)
 */
import { useMutation } from '@tanstack/react-query'
import {
  invocarExportMeusDados,
  gerarJsonExport,
  gerarHtmlExport,
  nomesArquivosExport,
  dispararDownloads,
  type RespostaExport,
} from '../services/exportacaoService'

/** Chave da mutation — hierárquica, no idioma de `privacidadeKeys`. */
export const exportacaoMutationKey = ['privacidade', 'exportar-meus-dados'] as const

export function useExportarMeusDados() {
  return useMutation<RespostaExport, Error, void>({
    mutationKey: [...exportacaoMutationKey],
    mutationFn: () => invocarExportMeusDados(),
    // Sem `onMutate`: nada é antecipado. Ver a proibição 1 no docblock.
    onSuccess: (resposta) => {
      // A LISTA é o contrato de ORDEM: o `.json` — o artefato do direito legal —
      // vai primeiro, para sobreviver caso o navegador barre o segundo download.
      // Os dois nomes saem do MESMO instante do servidor (`nomesArquivosExport`),
      // que é o mesmo que a tela usa para dizer o que a pessoa deve procurar.
      const nomes = nomesArquivosExport(resposta)
      dispararDownloads([
        {
          nome: nomes.json,
          conteudo: gerarJsonExport(resposta),
          tipo: 'application/json;charset=utf-8',
        },
        {
          nome: nomes.html,
          conteudo: gerarHtmlExport(resposta),
          tipo: 'text/html;charset=utf-8',
        },
      ])
    },
    // Sem `onError`: o bloco renderiza o alerta inline persistente.
  })
}
