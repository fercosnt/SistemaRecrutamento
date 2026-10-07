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
 * (Nota de 2026-10-06: «o endereço é o mesmo» valeu até 2026-10-06 — ver a seção
 * abaixo. O destinatário e a obrigação continuam os mesmos; o endereço não.)
 *
 * ── 2026-10-06: O ENDEREÇO MUDA PARA `rh@` (decisão do operador) ─────────────
 * O endereço anterior (parte local `lgpd`, mesmo domínio) **nunca existiu como
 * caixa lida** — e não fica escrito aqui por extenso, para que a varredura
 * `grep -rn` pelo endereço morto saia vazia em `src/` (cp3). Medido pelo
 * operador em 2026-10-06, ao aprovar a frase do CR-01 (44-16): a resposta foi
 * «trocar o email para rh@beautysmile.com.br», no sistema inteiro — o canal de
 * privacidade é UM canal. Até ali, toda superfície publicada que dizia «escreva
 * para o nosso canal de privacidade» mandava o titular para lugar nenhum: a
 * página pública de privacidade, a página autenticada, o passo de autorizações
 * do cadastro, as mensagens de erro e de limite da cópia e da exclusão dos
 * dados, e a explicação da decisão. Por isso isto é CORREÇÃO, não preferência.
 *
 * O canal passa a ser `rh@`, a caixa real do RH — a MESMA que já é o `REPLY_TO`
 * dos e-mails ao candidato (`supabase/functions/_shared/email-config.ts`). O
 * valor literal é preso em `__tests__/canalPrivacidade.test.ts` (cp1), que
 * também exige que ele siga igual ao `REPLY_TO` (cp2) e que nenhum arquivo de
 * produção o escreva fora deste módulo (cp4): o passo de autorizações do
 * cadastro tinha o endereço digitado à mão, e trocar só esta constante não o
 * teria alcançado.
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
export const CANAL_PRIVACIDADE_EMAIL = 'rh@beautysmile.com.br'
