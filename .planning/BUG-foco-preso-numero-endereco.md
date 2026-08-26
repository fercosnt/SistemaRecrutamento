# BUG — o foco fica preso no campo Número (Etapa 2 do cadastro)

**Encontrado:** 2026-08-26, pelo operador, durante o cadastro de uma conta de teste em PROD.
**Reproduzido:** sim, na mesma tela, por execução.
**Gravidade:** média — não bloqueia o cadastro (Complemento é opcional), mas **corrompe o campo
Número em silêncio** e provavelmente gera requisições repetidas ao ViaCEP.

## O sintoma

Na Etapa 2 (Endereço), depois que o CEP preenche o endereço, o foco volta sozinho para
**Número**. Quem der `Tab` para ir ao Complemento e digitar vê o texto entrar **no Número**.

Reprodução medida: com `53` no Número, um `Tab` seguido de `APTO12` resultou em
`53APTO12` no campo Número. O Complemento continuou vazio.

## A causa

`src/features/cadastro/components/steps/EnderecoStep.tsx:105-107`

```js
// Focar no campo número após preencher
setTimeout(() => {
  document.getElementById('numero')?.focus()
}, 100)
```

Isso está dentro do `onSuccess` do `useViaCEP`, e o `onSuccess` **dispara repetidamente**. A
cadeia:

1. `onSuccess` é uma arrow inline no `EnderecoStep` → **nova identidade a cada render**;
2. `useViaCEP.buscar` é `useCallback(..., [onSuccess, onError])` (`useViaCEP.ts:170`) → muda junto;
3. o `useEffect` de busca tem `buscar` nas deps (`useViaCEP.ts:226`) → **roda a cada render**;
4. ele reagenda o debounce → nova busca → novo `onSuccess` → `focus('numero')` 100 ms depois;
5. o `setValue` dentro do `onSuccess` provoca re-render → volta ao passo 1.

## ⚠ O detalhe que prova que já foi visto antes — e mal consertado

Logo acima do `focus()`, no mesmo `onSuccess`:

```js
// F-04.1-B: só dispara o toast quando o CEP resolvido mudou de fato.
if (lastToastedCepRef.current !== resolvedCep) { ... toast.messages.cepFound() }
```

Essa guarda existe **porque alguém já observou o `onSuccess` repetindo** — o sintoma na época
era o toast piscando. Consertaram o toast e deixaram o `focus()` fora da guarda. O defeito de
raiz (identidade instável em dependência de efeito) seguiu vivo, e reapareceu com outra roupa.

## O conserto — duas camadas, e a de baixo é a que importa

1. **Superfície:** mover o `focus()` para dentro da mesma guarda do `resolvedCep`, para focar
   apenas quando o CEP resolvido MUDA. Resolve o sintoma imediatamente.
2. **Raiz:** estabilizar a identidade dos callbacks no `useViaCEP` — guardar `onSuccess`/`onError`
   em `useRef` e tirá-los das deps do `useCallback`, para o efeito de busca deixar de rodar a
   cada render. Sem isso, o próximo efeito colateral acrescentado ao `onSuccess` renasce com o
   mesmo problema, como já aconteceu uma vez.

Vale medir as requisições ao ViaCEP antes e depois (`read_network_requests` com filtro
`viacep`): se houver mais de uma por CEP digitado, o loop está confirmado por efeito e não só
por leitura de código. Não foi medido nesta sessão para não mexer no cadastro em andamento do
operador.

## Teste que faltaria

Nenhum teste cobre foco nem contagem de chamadas do `onSuccess`. Um caso de regressão honesto:
renderizar o step, resolver um CEP, e afirmar que `onSuccess` foi chamado **uma vez** — é a
asserção que pega a raiz, não a que pega o sintoma.
