/**
 * O canal humano de privacidade — o único que existe hoje para os direitos que
 * ainda não têm código, e o que a copy de erro oferece quando o caminho
 * automático falha.
 *
 * ── POR QUE ELE NÃO SE CHAMA MAIS "ENCARREGADO" ──────────────────────────────
 * Até 2026-08-13 esta constante se chamava `ENCARREGADO_EMAIL` e dez strings
 * voltadas ao usuário — inclusive a página PÚBLICA de privacidade — diziam
 * «escreva para o nosso Encarregado de Dados». **A Beauty Smile decidiu, em
 * 2026-08-13, NÃO designar Encarregado** (decisão do operador, registrada em
 * `.planning/DECISAO-ENCARREGADO.md`).
 *
 * A partir dessa decisão, aquela copy passou a ser uma afirmação FALSA sobre um
 * cargo formal do Art. 41 — publicada, ainda por cima, na página cujo propósito
 * declarado é «nenhuma promessa de compliance sobrevive sem código que a
 * execute». Uma promessa de Encarregado sem Encarregado é exatamente isso.
 *
 * ⚠ O QUE **NÃO** MUDOU, E NÃO PODE MUDAR: o canal em si. Designar Encarregado é
 * dispensável para agente de tratamento de pequeno porte; oferecer um canal de
 * comunicação ao titular **não é**. O endereço é o mesmo, o destinatário é o
 * mesmo, a obrigação é a mesma — saiu apenas o título que não corresponde a
 * ninguém. Remover o canal junto com o rótulo teria trocado uma afirmação falsa
 * por uma omissão pior.
 *
 * ── POR QUE ELE MORA NUM MÓDULO DE CONSTANTE, E NÃO NO COMPONENTE ────────────
 * Morava em `components/AutorizacoesLista.tsx`, e `exportacaoService.ts` o
 * importava de lá. Isso invertia a direção de camada do projeto (CLAUDE.md
 * §File Structure): arrastava um módulo React — e transitivamente `react`,
 * `lucide-react` e os primitivos glass — para dentro do grafo de um serviço cujo
 * próprio docblock anuncia `gerarJsonExport`/`gerarHtmlExport` como funções
 * PURAS e sem DOM. Também travava qualquer reuso dos geradores fora do
 * navegador, que é justamente o corte que torna o arquivo exigido pela lei
 * testável sem simular um clique.
 *
 * A constante continua com UMA fonte: `AutorizacoesLista` a re-exporta para os
 * consumidores existentes, então nenhum sítio de chamada mudou.
 *
 * @module features/privacidade/constants/canalPrivacidade
 */

/** O canal humano de privacidade — o único que existe hoje para os direitos ainda sem código. */
export const CANAL_PRIVACIDADE_EMAIL = 'lgpd@beautysmile.com.br'
