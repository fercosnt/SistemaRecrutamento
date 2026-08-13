---
tipo: decisao-do-operador
data: 2026-08-13
decisor: Fernando (operador)
escopo: LGPD Art. 41 — designação de Encarregado de Dados
status: decidido
fecha: WINDOWS.md 26, 29, 30, 31 · o portão de publicação do 47-08 Task 1
---

# Decisão: a Beauty Smile **não** designa Encarregado de Dados

## A decisão

Em **2026-08-13**, o operador decidiu **não designar Encarregado de Dados**, e
consequentemente **não haverá revisão formal de Encarregado** sobre os quatro itens que o
portão de publicação do `47-08` Task 1 mantinha abertos:

1. os seis países dos subprocessadores e a base legal de cada um (cinco são EUA);
2. a formulação sobre o provedor de hospedagem;
3. a qualificação do serviço público de consulta de CEP;
4. a copy das duas páginas públicas (`/privacidade` e `/subprocessadores`).

**Quem decide esses quatro itens é o operador**, e a aprovação já dada em **2026-08-11** —
que liberou a publicação das duas páginas — passa a ser a decisão **final**, não mais
provisória à espera de um parecer.

## Por que isto precisava de registro, e não de silêncio

O requisito da fase nunca foi *"contrate um jurista"*. Era **não deixar o palpite da
engenharia passar por veredito jurídico em silêncio**. O caso mais explícito está no
`45-02`: o gerador do recibo gravou **nove** bases legais onde a UI-SPEC ditava **três**;
as outras seis são o melhor mapeamento da engenharia. O gerador prova que existe base legal
não-vazia — **não prova que ela é a certa**. E isso vira texto num e-mail que afirma
cumprimento de direito do Art. 18.

Sem este arquivo, aquele item ficaria aberto para sempre, como pendência fantasma esperando
alguém que não viria. **Uma decisão registrada fecha; uma decisão não tomada apodrece.**

## O que a decisão OBRIGOU a mudar no código — e não era óbvio

A decisão tinha uma consequência que só apareceu ao conferir o repositório: **dez strings
voltadas ao usuário — inclusive a página PÚBLICA, no ar desde 2026-08-11 — diziam «escreva
para o nosso Encarregado de Dados»**.

A partir da decisão, essa frase virou **afirmação falsa** sobre um cargo formal do Art. 41.
E estava publicada justamente na página cujo propósito declarado é *"nenhuma promessa de
compliance sobrevive neste repositório sem código que a execute"*. Uma promessa de
Encarregado sem Encarregado é exatamente isso — o goal da fase violado pela copy da fase.

Corrigido em `f8e76e2`: «nosso Encarregado de Dados» → «nosso canal de privacidade», em
9 strings / 7 arquivos, mais a constante, o módulo e o `data-canal`.

⚠ **O canal NÃO saiu, e não podia sair.** Designar Encarregado é dispensável para agente de
tratamento de pequeno porte; **oferecer um canal de comunicação ao titular não é**. O
endereço (`lgpd@beautysmile.com.br`), o destinatário e a obrigação seguem idênticos — saiu
apenas o título que não corresponde a ninguém. O próprio código já dizia, em comentário, que
o canal humano é *"a única saída de quem perdeu o acesso à conta"*: removê-lo teria trocado
uma afirmação falsa por uma omissão pior.

## Os dois destinos de rede: a classificação virou eliminação

`api.ipify.org` e `www.youtube.com` estavam registrados como `pendente-de-decisao` em
`src/__tests__/destinosDeRedeComFicha.test.ts`, com a rota apontando para o Encarregado.
Sem Encarregado, a classificação seria do operador — e a decisão dele, em 2026-08-13, foi
**eliminar as duas transferências em vez de declará-las** (`03909dd`).

| Destino | Antes | Depois |
|---|---|---|
| `api.ipify.org` | Todo registro de acesso mandava o IP do visitante a um terceiro | **Sumiu.** O IP passa a vir do servidor (`trg_preencher_ip_logs_acesso`, migration `20260813000001`) |
| `www.youtube.com` | O iframe carregava no *render* — abrir a página já entregava IP, referer e cookies ao Google | `www.youtube-nocookie.com` **sob clique explícito**, com aviso ao lado do botão |

⚠ De quebra, o conserto do ipify matou dois defeitos que ninguém tinha ligado ao destino: o
fallback que gravava **`127.0.0.1`**, um IP falso, num log de auditoria; e o **`NOT NULL` de
`logs_acesso.ip_address`, que o `pii-inventory.yaml:190` já registrava como bloqueio do
ERASE-09** — o motor de exclusão não conseguiria apagar aquele IP.

⚠ **A migration `20260813000001` NÃO foi aplicada.** Apply é checkpoint do operador, e a
ordem é obrigatória: **migration primeiro, frontend depois**. A inversão degrada o log de
segurança em silêncio (o erro é engolido de propósito).

## O que esta decisão NÃO faz

- **Não dispensa o canal de comunicação com o titular.** Ele existe, está publicado e
  continua sendo obrigação.
- **Não valida juridicamente as nove bases legais do recibo** nem as citações das páginas
  públicas. Elas seguem sendo o melhor mapeamento da engenharia, agora com um decisor
  nomeado e uma data — que é a diferença entre uma escolha e uma omissão.
- **Não é irreversível.** Se a Beauty Smile designar um Encarregado depois, este arquivo é o
  registro do que estava valendo até lá, e a revisão dos quatro itens volta à mesa.

## Rastro

| Onde | O quê |
|---|---|
| `f8e76e2` | A copy deixa de prometer um Encarregado |
| `03909dd` | As duas transferências eliminadas + migration (não aplicada) |
| `WINDOWS.md` 26, 30 | Revisão do Encarregado — fechados por esta decisão |
| `WINDOWS.md` 29, 31 | Os dois destinos — fechados por eliminação |
| `src/features/privacidade/constants/canalPrivacidade.ts` | O docblock aponta para cá |
