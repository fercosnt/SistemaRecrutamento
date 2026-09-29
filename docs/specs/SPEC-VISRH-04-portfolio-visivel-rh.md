# SPEC — VISRH-04 · Portfólio visível ao RH, com avaliação humana

> **Status:** proposta · não implementada · escrita em 2026-09-28
> **Origem:** aberta durante o cadastro das 3 vagas do squad de Marketing, que dependem
> inteiramente de portfólio para avaliar.
> **Nada aqui foi aplicado.** Nenhuma migration emitida, nenhum arquivo do app tocado.

## 1 · O defeito, medido

O candidato entrega o link do portfólio. A IA recebe o link. **O recrutador não vê.**

Hoje o único humano que consegue ler essa resposta é **o próprio candidato**, pela exportação
LGPD dos próprios dados. Quem precisa dela para decidir — o RH — não tem tela.

### Evidência (medida em 2026-09-28, não suposta)

| # | Fato | Como conferir |
|---|---|---|
| 1 | `respostas_formulario` é lida em `src/` em **dois arquivos, ambos de LGPD**: `features/privacidade/services/exportacaoService.ts` e `features/privacidade/constants/reciboExclusao.generated.ts`. Nenhuma tela de RH a consulta. | `grep -rn "respostas_formulario" src/` |
| 2 | `HubCandidatoRH.tsx` tem três blocos: **Linha do funil**, **Currículo** (VISRH-01) e **Análise da IA** (VISRH-02). Não há bloco de respostas da Etapa 1. | `src/features/hub-candidato/components/HubCandidatoRH.tsx:337,376` |
| 3 | **Não existe coluna de portfólio em lugar nenhum** de `public.*`. `candidatos` tem `instagram_url`, `linkedin_url`, `instagram`, `linkedin` — e nenhuma delas entra no prompt da IA. | `information_schema.columns` com `column_name ilike '%portfolio%'` → 0 linhas |
| 4 | A pergunta de portfólio existe em **uma única vaga** (`social-media-producao-captacao-conteudo`), criada pela migration `20260824000001` como `bloco='curriculo', ordem=1, tipo_resposta='texto_curto', obrigatoria=true`. Não é campo de sistema — é a única pergunta aberta daquela vaga. | query em `perguntas_formulario` |
| 5 | A EF `analise-candidato-individual` **recebe** a resposta, com o enunciado e em ordem (o conserto de `buildRespostasBlock` já entrou). | `supabase/functions/analise-candidato-individual/index.ts:186,369,484` |

**Leitura do conjunto:** não é dado ausente, é TODO de leitura. O dado está no banco, chega ao
modelo, e para no meio do caminho para o humano.

## 2 · Escopo

### 2.1 Ver — bloco «Respostas da Etapa 1» no Hub do candidato (RH)

Novo bloco em `HubCandidatoRH.tsx`, ao lado de Currículo e Análise da IA, listando cada
pergunta com a resposta do candidato, **na ordem de `perguntas_formulario.ordem`**.

- Resposta de tipo `texto_curto`/`texto_longo` cujo conteúdo contenha URL: renderizar os links
  como âncoras clicáveis, `target="_blank" rel="noopener noreferrer"`.
- **O texto visível é a URL completa, nunca um rótulo mascarado.** O link é digitado pelo
  candidato: é entrada não confiável, e um rótulo tipo «Ver portfólio» apontando para outro
  domínio é exatamente a forma de um phishing dentro do próprio ATS.
- Aceitar **apenas** os esquemas `http:` e `https:`. `javascript:`, `data:` e demais são
  renderizados como texto puro, sem âncora.
- Nunca interpolar a resposta como HTML.
- A leitura respeita o escopo de trabalho já existente (`vagas.created_by = auth.uid()`),
  como os demais blocos do Hub.

### 2.2 Avaliar — nota e observação do portfólio

Área para o recrutador registrar **nota** e **observação** do que viu no portfólio, já que o
conteúdo (site, Instagram, vídeos, imagens) não é analisável pela IA e não deve ser.

- `created_by` **explícito e obrigatório na prática** — é o defeito recorrente desta base.
- Editável pelo autor; toda alteração carimba `updated_at`.
- A nota é **insumo para o RH, nunca decisão da máquina**: não alimenta rejeição automática,
  não entra em nenhum cálculo que rejeite sozinho (RNF-07a).
- Linguagem de produto: nada de «teste»; é avaliação de portfólio.

## 3 · Decisões de desenho — cada uma com recomendação, nenhuma tomada

### D1 · Onde mora a nota do portfólio

| Opção | A favor | Contra |
|---|---|---|
| **(recomendada)** tabela nova `avaliacoes_portfolio` (`candidatura_id`, `nota`, `observacao`, `created_by`, timestamps, `deleted_at`) | autor e histórico por linha; não alarga `candidaturas`, que já é larga; RLS própria | mais superfície nova — ver §4, que é obrigatória |
| colunas em `candidaturas` | zero tabela nova, zero RLS nova | sem autor próprio (quem deu a nota ≠ quem criou a candidatura) e sem histórico |

### D2 · Portfólio segue como pergunta da Etapa 1, ou vira campo estrutural?

| Opção | Consequência |
|---|---|
| **(A) manter como pergunta aberta por vaga** — é o que existe hoje | Custa **a única pergunta aberta** de toda vaga que precise de portfólio (o teto de `publish_vaga` é 1). Funciona hoje, sem nenhuma mudança. |
| **(B) campo `portfolio_url` na candidatura**, coletado no formulário de inscrição | Libera a pergunta aberta para outra coisa; fica consistente entre vagas; exige decidir se entra no prompt da IA e alterar a EF. |

**Recomendação:** implementar (B) neste trabalho e manter (A) funcionando para as vagas que já
a usam. **(B) não bloqueia nada** — as 3 vagas do squad de Marketing abrem hoje com (A).

## 4 · ⚠ O que não pode ser esquecido — e é o mais fácil de esquecer

Se a opção D1 recomendada for adotada, `avaliacoes_portfolio` passa a guardar **dado pessoal de
candidato** (um juízo nominal sobre uma pessoa). Uma tabela nova com dado de candidato que não
seja ligada aos caminhos de LGPD é um buraco de conformidade — e este projeto tem um milestone
inteiro (M8) exatamente sobre isso.

Tem de entrar em **todos** os quatro:

1. **Exportação do titular** — `src/features/privacidade/services/exportacaoService.ts` (o mapa de
   rótulos, hoje na linha 214).
2. **Recibo de exclusão** — regenerar por `node docs/compliance/sql/gen-recibo-exclusao.cjs`.
   São **três artefatos gerados de uma fonte só**, e o `--check` reprova cada um separadamente:
   `docs/compliance/recibo-exclusao.json`, `src/features/privacidade/constants/reciboExclusao.generated.ts`
   e `supabase/functions/_shared/reciboExclusao.ts`. **Não editar nenhum à mão.**
3. **Motor de exclusão** — um `passo_motor` que de fato apague, senão o recibo afirma um
   apagamento que não acontece.
4. **Purga por retenção** — `supabase/functions/purgar-retencao`.

## 5 · Portões

- `npm run lint` (tsc) e `npm run test:run` verdes; `node docs/compliance/sql/gen-recibo-exclusao.cjs --check` verde.
- **Prova por execução de que o novo smoke MORDE.** Um portão que não é capaz de falhar é pior
  que o quebrado.
- Ao acrescentar objeto vigiado por smoke existente, varrer **pela forma** antes:
  ```bash
  grep -rnE '(<>|!=|IS DISTINCT FROM) *[0-9]+|= ANY \(ARRAY\[.|\b(proname|jobname|relname|tgname|conname|typname) +IN +\(.' supabase/tests/*.sql
  ```
- Migration pela via do `p46apply.cjs` (SQL lido do arquivo, migration + ledger na mesma
  transação), sem `BEGIN/COMMIT` (D-22).
- Depois de qualquer apply cujo efeito apareça na tela: `git log --oneline origin/main..HEAD`
  **tem de sair vazio** — Supabase e Vercel são canais independentes.
- Conferência visual com dado real. Os defeitos de renderização desta base só apareceram assim.

## 6 · Onde este spec para

Não cobre: mudar a rubrica das vagas existentes, publicar vaga, nem tornar o portfólio
analisável por IA — o conteúdo é site/vídeo/imagem e a avaliação é humana por decisão do
operador (2026-09-28).

---

## 7 · Ampliação medida em 2026-09-29 — o portfólio não está sozinho

Medido durante a UAT da Phase 49, fora do escopo dela. Registro completo em
`.planning/todos/pending/49-producoes-do-candidato-sem-leitor-de-rh.md`.

**São TRÊS faces do mesmo TODO de leitura, não uma:**

| Face | Onde mora | Leitor de RH |
|---|---|---|
| Portfólio (esta spec) | `respostas_formulario` | nenhum |
| **Caso prático** | `respostas_avaliacao` (`teste='sjt_caso_aberto'`) | **nenhum para o TEXTO** |
| Entregável externo (Marketing) | lugar nenhum — texto solto em `sobre_cargo` | não existe campo |

O caso prático **já é etapa viva do produto**: card `sjt_caso_aberto`, rótulo «Caso
prático», rota `/candidato/avaliacao/:id/caso`.

⚠ **E o caso prático é meio-caminho, não zero.** `scoresRhService.ts` (`ScoreSubtipo =
'mc' | 'caso_aberto'`) é leitor de RH e alimenta o hub, a triagem e a entrevista — mas lê
`scores_candidato`, o SCORE. O texto que o candidato escreveu mora em
`respostas_avaliacao`, cujos únicos leitores são os 2 de LGPD e o caminho do próprio
candidato (autosave). **O RH vê um número sobre um texto que não pode ler.** Estender um
leitor vivo é conserto diferente de criar o primeiro — vale escolher o caminho sabendo disso.

**Corte de escopo sugerido:**

- **Parte A — leitura no Hub do RH** (portfólio + caso prático): o dado já está gravado e já
  entra na exportação e no recibo. Sem tabela nova, **sem a §4** deste spec.
- **Parte B — nota do RH + entregável externo**: tabela nova, §4 inteira, e
  `supabase/tests/p49_motor_antes_depois.sql` vira superfície (dado novo do titular ⇒ o motor
  de exclusão precisa alcançá-lo, e a prova precisa medi-lo).

Só a Parte B depende do maquinário do M8.
