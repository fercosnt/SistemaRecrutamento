/**
 * O aviso de que a justificativa de etapa é VISÍVEL ao candidato.
 *
 * Decisão do responsável sobre §7.22 do GUIA-VALIDACAO-FINAL: manter a allowlist como
 * está (a justificativa continua na cópia de dados do Art. 18) e **avisar os dois
 * lados**. Este é o lado do recrutador.
 *
 * O fato medido: `candidaturas.etapa_justificativa` está na allowlist de exportação
 * como `inventario:preservar_com_ressalva` — uma escolha consciente, porque acesso
 * (Art. 18, II) é mais amplo que explicação (Art. 20). O texto integral que o
 * recrutador escreve sai no arquivo que o candidato baixa em `/candidato/privacidade`.
 * Enquanto isso, todas as telas que escrevem esse campo diziam apenas que a
 * justificativa «fica registrada na trilha de auditoria» — o que soa interno, e
 * convida a escrever com uma franqueza que o autor não sabe estar publicando.
 *
 * ⚠ NÃO se aplica à decisão final. `registrar_decisao` grava em `decisao_final`, e a
 * cópia de dados exclui a justificativa daquela tabela (medido em §7.22: «decisao_final
 * vem sem a justificativa interna»). Usar este aviso lá seria a tela afirmando uma
 * exposição que não existe — o erro simétrico ao que ele conserta.
 *
 * @module features/triagem/constants/avisoJustificativa
 * @see src/features/privacidade/services/exportacaoService.ts (COPY_PEDIR_COPIA.oQueEsta — o outro lado)
 * @see .planning/GUIA-VALIDACAO-FINAL.md §7.22
 */

/** Uma linha, para ficar ao lado do campo enquanto a pessoa escreve. */
export const AVISO_JUSTIFICATIVA_VISIVEL =
  'O candidato pode baixar este texto: a justificativa entra na cópia de dados que ele pede pela LGPD (Art. 18, II). Escreva com fatos, do jeito que você assinaria.'

/** A mesma verdade, curta, para caber num placeholder ao lado do resto da frase. */
export const PLACEHOLDER_JUSTIFICATIVA_VISIVEL =
  'Descreva a base da decisão. Fica na trilha de auditoria e o candidato pode baixá-la.'
