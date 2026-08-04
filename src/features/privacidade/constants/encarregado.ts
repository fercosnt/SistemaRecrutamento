/**
 * O canal humano nomeado da LGPD — o único que existe hoje para os direitos que
 * ainda não têm código, e o que a copy de erro oferece quando o caminho
 * automático falha.
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
 * @module features/privacidade/constants/encarregado
 */

/** O canal humano nomeado — o único que existe hoje para os direitos ainda sem código. */
export const ENCARREGADO_EMAIL = 'lgpd@beautysmile.com.br'
