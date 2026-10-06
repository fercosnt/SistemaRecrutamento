---
phase: 50-acesso-do-recrutador
reviewed: 2026-10-06T12:39:03Z
depth: standard
diff_base: 81bfab810306c05b1e503ca4a8929d6fb674b466
reviewed_head: 981d5c52556ff13cce915d05982d3f7f0879bd7d
scope: revisão de fechamento da fase. Os 40 arquivos que já passaram por 50-REVIEW-TRACER-1..3 e 50-REVIEW-ACESSO-1..2 estão byte-iguais ao reviewed_head do ACESSO-2 (`git diff --quiet 0e671953 HEAD` sobre eles, verde); neles conferi só o estado das disposições. O foco é o código que nunca teve revisão adversarial — 4ccc4dd1 (`gerarSenhaTemporaria` + teste Deno) e 82b8e34b (`scripts/p50_sessao_real.cjs`). Nada aplicado, deployado, enviado nem executado contra PROD. As mutações rodaram numa cópia em scratchpad, e o `--auto-teste` rodou offline.
files_reviewed: 43
files_reviewed_list:
  - scripts/p50_desfazer.cjs
  - scripts/p50_ensaio.cjs
  - scripts/p50_enumera.cjs
  - scripts/p50_mutacoes.cjs
  - scripts/p50_sessao_real.cjs
  - scripts/p50_varredura.cjs
  - scripts/p50_vitest_delta.cjs
  - src/__tests__/guards/ef-sem-posse-de-vaga.grep.test.ts
  - src/features/avaliacao-cognitiva/hooks/useLiberacaoCognitivo.ts
  - src/features/triagem/services/triagemService.ts
  - src/features/vagas/services/cvUploadService.ts
  - src/features/vagas/services/vagasService.ts
  - supabase/functions/avaliar-transcricao-entrevista/__tests__/index.test.ts
  - supabase/functions/avaliar-transcricao-entrevista/index.ts
  - supabase/functions/comparativo-candidatos/__tests__/index.test.ts
  - supabase/functions/comparativo-candidatos/index.ts
  - supabase/functions/consolidar-decisao-final/__tests__/index.test.ts
  - supabase/functions/consolidar-decisao-final/index.ts
  - supabase/functions/gerar-guia-entrevista/__tests__/index.test.ts
  - supabase/functions/gerar-guia-entrevista/index.ts
  - supabase/functions/gerenciar-usuario-rh/__tests__/index.test.ts
  - supabase/functions/gerenciar-usuario-rh/index.ts
  - supabase/functions/get-curriculo-url/index.test.ts
  - supabase/functions/get-curriculo-url/index.ts
  - supabase/migrations/20261005000001_p50_helper_candidaturas.sql
  - supabase/migrations/20261005000002_p50_policies_rh_ativo.sql
  - supabase/migrations/20261005000003_p50_rpcs_leitura_filas.sql
  - supabase/migrations/20261005000004_p50_rpcs_escrita.sql
  - supabase/tests/funil34_kpis_smokes.sql
  - supabase/tests/oper31_rejeitar_candidatura_smokes.sql
  - supabase/tests/p37_fidelidade_schema_smoke.sql
  - supabase/tests/p37_lacunas_rls_idempotencia_smokes.sql
  - supabase/tests/p44_pedidos_dados_smoke.sql
  - supabase/tests/p46_fixture_elegivel.sql
  - supabase/tests/p47_historico_smoke.sql
  - supabase/tests/p49_44_resposta_caso_aberto_smoke.sql
  - supabase/tests/p50_acesso_recrutador_smoke.sql
  - supabase/tests/p50_desfazer_expansao.sql
  - supabase/tests/p50_desfazer_tracer.sql
  - supabase/tests/p50_vistas_externas.sql
  - supabase/tests/sec05_08_smokes.sql
  - supabase/tests/seg32_smokes.sql
  - supabase/tests/seg33_agendamento_smokes.sql
findings:
  critical: 0
  warning: 1
  info: 4
  total: 5
status: issues_found
---

# Phase 50: Code Review Report — fechamento (4ccc4dd1 + 82b8e34b)

**Reviewed:** 2026-10-06T12:39:03Z
**Depth:** standard
**Files Reviewed:** 43
**Status:** issues_found, com 0 crítico

## Summary

Comecei supondo que os dois trechos sem revisão adversarial tinham defeito. **Não achei blocker em nenhum deles.**

**`gerarSenhaTemporaria()` (4ccc4dd1) está correta.**
- **Fonte:** `crypto.getRandomValues` sobre 32 bytes. O spread de 32 argumentos em `String.fromCharCode` é seguro. O `btoa` dá 43 caracteres mais `=`; depois de tirar `+`, `/` e `=`, sobram em média ~41,7 alfanuméricos, cerca de 240 bits.
- **Viés de módulo no `pick`:** irrelevante. 2³² mod 26 = 22 e 2³² mod 10 = 6, um viés da ordem de 10⁻⁹, sobre 3 caracteres que só existem para cumprir a política.
- **Cauda fixa (minúscula, maiúscula, dígito):** custa uns 13 bits sobre os ~240 da base, sem consequência.
- **Tamanho:** ~44 caracteres, abaixo do teto de 72 octetos do bcrypt do GoTrue. A senha antiga tinha exatamente 72.
- **Política:** casa com a do projeto. O `passwordSchema.ts` do front exige a mesma tríade, e as duas contas criadas em PROD depois do v6 confirmam.
- **Vazamento:** nenhum. A senha só vai para `createUser`; nenhum `console.*` a recebe e nenhuma resposta a carrega. O `authError?.message` logado é a mensagem do GoTrue, que não ecoa a senha.

O defeito está no **teste**. Ele assere só a composição. Provei por mutação que ele segue verde com a fonte de aleatoriedade removida e com a senha devolvida na resposta e logada (WR-01).

**`scripts/p50_sessao_real.cjs` (82b8e34b) cumpre o que promete.**
- **Credenciais:** recusa chave que não seja `sb_publishable_*` ou JWT `role=anon`, e recusa URL de outro projeto. Do `.env` lê só as duas variáveis `VITE_`.
- **Sessão:** usa a chave pública e o token do próprio usuário (o auto-teste g6/g7 confere o cabeçalho de cada chamada).
- **Lado postgres:** o SQL é fixo. A única interpolação é o `sub`, validado como UUID. A transação abre com `set transaction read only;`, e `transaction_read_only = on` é exigido no próprio resultado.
- **Edge Function:** a URL assinada é descartada dentro de `cvSessao`.
- **Saída:** toda linha passa por `blindar()`, e uma redação conta como FALHA.
- **Auto-teste offline:** `auto-teste: 55 afirmacoes, rede nao usada, nenhuma credencial real` (rc 0). Ele cobre fetch e banco falsos que devolvem e-mail, nome, URL assinada e refresh token, e conta escrita fora da saída blindada.

Há dois limites à frase «não escreve em PROD», ambos menores (IN-03):
- o próprio login por senha grava no schema `auth`;
- a chave da Management API que o p46apply usa é privilegiada; o script só a contém pela transação só-leitura.

**Itens das revisões anteriores.** Nada foi fechado indevidamente. Os 40 arquivos já revisados não mudaram desde `0e671953`. As 3 WR e as 4 IN do ACESSO-2 têm disposição escrita no `50-10-SUMMARY.md`:
- WR-01: não usar a saída (i); não ocorreu;
- WR-02: STOP procedimental; `inconclusivos=0` medido;
- WR-03: resíduo coberto pelo PRE/POS 32/32 do desfazer.

Os resíduos de código do ACESSO-2 seguem abertos no script (`veredito()` ainda devolve `INCONCLUSIVO` para arquivo reescrito, e `capturar()` ainda não lê corpos). Como a fase terminou, só valem para um reuso futuro desses scripts. Não os reconto.

### O que foi provado por execução (só leitura; nada contra PROD)

| prova | resultado |
|---|---|
| `git diff --stat 0e671953..HEAD -- . ':!.planning'` | só `scripts/p50_sessao_real.cjs` (+730), `gerenciar-usuario-rh/index.ts` (+14 −1) e o teste (+18) |
| `git diff --quiet 0e671953 HEAD` sobre os outros 40 arquivos da lista | verde: inalterados |
| `node scripts/p50_sessao_real.cjs --auto-teste` com `P50_RH2_*` removidas do ambiente | `auto-teste: 55 afirmacoes, rede nao usada, nenhuma credencial real` / `auto-teste ok`, rc 0 |
| Mutação M-a (cópia em scratchpad): `const bytes = new Uint8Array(32);` sem `getRandomValues` | `deno test …/gerenciar-usuario-rh/__tests__/index.test.ts` → **`10 passed \| 0 failed`**: a mutação SOBREVIVE |
| Mutação M-b: `console.log("tmp", tempPassword)` e `tempPassword` no corpo do 201 | **`10 passed \| 0 failed`**: SOBREVIVE |
| `get-curriculo-url/index.ts`, escritas | nenhuma `.insert/.update/.upsert/.delete/.rpc`. Só `createSignedUrl(…, 60)`, que é assinatura sem estado |
| Filas chamadas pelo script (`20261005000003`) | as 4 são `STABLE SECURITY DEFINER`, recusam 42501 sem papel e não escrevem. Dentro da transação só-leitura do lado postgres, uma escrita abortaria a leitura (falha fechada) |

## Warnings

### WR-01: o teste da senha temporária assere só a composição — com a aleatoriedade removida, ou com a senha devolvida e logada, a suíte continua 10/10

**File:** `supabase/functions/gerenciar-usuario-rh/__tests__/index.test.ts:250-262`; código sob teste em `supabase/functions/gerenciar-usuario-rh/index.ts:322-327`, `:341-347`
**Issue:** O teste novo checa `length >= 32` e as classes `[a-z]`, `[A-Z]` e `[0-9]` em 20 senhas. As duas propriedades de segurança da senha não estão no teste:
- **imprevisibilidade.** A conta nasce com `email_confirm: true`. A senha descartável fica válida até o usuário usar o link de recuperação, ou para sempre se ele nunca usar.
- **«NEVER logged» do comentário da linha 341.** Nem o log nem a resposta são conferidos.

Provei as duas lacunas por mutação, numa cópia:
- **M-a**, `getRandomValues` removido (bytes zerados): a base vira 43 `A`, e a senha fica `AAAA…A` + minúscula + maiúscula + dígito aleatórios, ~13 bits, ~6.760 candidatas para quem conhece o e-mail. **10/10 verde.** As 20 iterações do teste produziriam senhas quase iguais, e ninguém compara.
- **M-b**, `tempPassword` no corpo do 201 e num `console.log`: **10/10 verde**.

Hoje o código está certo; o problema é que o teste não morde nas regressões que importam numa EF privilegiada.
**Fix:** No mesmo teste, guardar as 20 senhas e capturar `console.*` e o corpo de cada resposta:
```ts
const vistas = new Set<string>();
const logs: string[] = [];
const orig = { log: console.log, warn: console.warn, error: console.error };
for (const k of ["log", "warn", "error"] as const) console[k] = (...a: unknown[]) => { logs.push(a.map(String).join(" ")); };
try {
  for (let i = 0; i < 20; i++) {
    // … handler como hoje …
    const res = await handler(makeRequest(CRIAR_BODY), deps);
    const corpo = await res.text();
    const pw = String(supabaseAdmin.createUserCalls[0]?.password ?? "");
    // composição, como hoje …
    assert(!vistas.has(pw), "temp password repeated across calls");
    vistas.add(pw);
    assert(!corpo.includes(pw), "temp password leaked in the response body");
    assert(new Set(pw.slice(0, -3)).size >= 16, "temp password base has too little variety (randomness source?)");
  }
  assert(!logs.some((l) => [...vistas].some((pw) => l.includes(pw))), "temp password leaked to logs");
} finally { Object.assign(console, orig); }
```
O piso de variedade (≥ 16 caracteres distintos em ~41) é o que reprova a M-a. Um conjunto aleatório de 41 sobre 62 símbolos tem, em média, ~30 distintos, e a chance de cair abaixo de 16 é desprezível. Conferir depois que M-a e M-b reprovam (memória «Portão é código»).

## Info

### IN-01: o gerador cobre só a política de hoje, nenhum portão o amarra à política viva do GoTrue, e a recusa por política continua chegando ao admin como «Não foi possível criar o usuário.»

**File:** `supabase/functions/gerenciar-usuario-rh/index.ts:322-327`, `:350-356`
**Issue:** A política vive no painel do Auth, fora do repositório. O mock do teste aceita qualquer senha. Se alguém ligar a opção mais estrita do GoTrue (minúscula, maiúscula, dígito e **símbolo**), todo `criar` volta a dar 400, e a única pista é um `console.error` no log da EF. Foi exatamente assim que o defeito sobreviveu desde a Phase 28. Pelo `passwordSchema.ts` do front, a política de hoje é a tríade, então nada quebra agora.
**Fix:** Acrescentar à cauda um `pick` de símbolos do conjunto que o GoTrue aceita (p.ex. `"!@#$%^&*()_+-="`). Isso satisfaz todas as opções da política sem custo. E mapear o erro de senha fraca (`weak_password` ou a mensagem «Password should…») para um código distinto (`TEMP_PASSWORD_POLICY`), para o admin não ver um 400 genérico.

### IN-02: `p50_sessao_real.cjs` repassa `P50_RH2_SENHA`/`P50_RH2_EMAIL` ao processo filho do p46apply, e o modo de uso põe o e-mail no histórico do shell

**File:** `scripts/p50_sessao_real.cjs:272` (`execFileSync(…, { cwd, encoding, stdio })` sem `env`), `:36-38`
**Issue:** O `execFileSync` herda `process.env` inteiro. O p46apply e o `security` que ele chama recebem a senha e o e-mail do RH2 no ambiente, e nenhum dos dois precisa deles. Hoje nenhum deles imprime o ambiente, então isto não vaza nada, mas fere o «token só em memória» do cabeçalho. O modo de uso `P50_RH2_EMAIL=<email> node …` grava o e-mail no `~/.zsh_history`, o que o próprio SUMMARY reconhece: «a linha de comando … continha o e-mail».
**Fix:** `const envFilho = { ...process.env }; delete envFilho.P50_RH2_SENHA; delete envFilho.P50_RH2_EMAIL;` e passar `env: envFilho`. No cabeçalho, usar `read P50_RH2_EMAIL` (como a senha) no lugar do prefixo na linha de comando.

### IN-03: «só leitura» tem duas exceções não escritas: o login grava no schema `auth` e a sessão nunca é revogada; e o lado postgres usa uma credencial que escreve

**File:** `scripts/p50_sessao_real.cjs:337-348`, `:394-473`, `:16-19`, `:269-282`
**Issue:**
- **Login:** o password grant cria linha em `auth.sessions` e `auth.refresh_tokens`, atualiza `last_sign_in_at` e gera entrada no log de auditoria do Auth. O script nunca chama `/auth/v1/logout`. O refresh token fica válido no servidor, mesmo descartado em memória, e o access token vive até expirar (~1 h). É inerente a uma «sessão real», mas o cabeçalho não diz.
- **Lado postgres:** roda com o token da Management API, que pode escrever. O que segura isso é o `set transaction read only;` no início do corpo. A checagem `transaction_read_only = 'on'` vem depois, no resultado; ela prova que a leitura foi só-leitura, mas não impede uma escrita. Hoje o corpo é fixo e só tem SELECTs e RPCs `STABLE`, então não há caminho de escrita.
**Fix:** Num `finally` de `principal`, quando houver token: `POST ${cfg.url}/auth/v1/logout?scope=local` com `apikey` + `Authorization: Bearer <token>`, conferindo 204 (`OK sessao_encerrada`). No cabeçalho, uma linha: «escreve só o que o login escreve em `auth.*`, e revoga a sessão ao sair».

### IN-04: `Number(null)` vira 0 nas contagens, então um contador que devolva `null` empata com o vácuo 0 = 0

**File:** `scripts/p50_sessao_real.cjs:303-306`, `:456`
**Issue:** `fila(…, contar=true)` usa `Number(r.valor)`, e `normalizarPg` usa `Number(row.pedidos_pendentes)`. Uma RPC de contagem que devolvesse `null` (p.ex. um guarda reescrito para `RETURN NULL` no lugar de `RAISE 42501`) sairia `obtido=0`. Contra um esperado 0, isso é OK, «vacuo: 0=0». Na execução real, `pedidos_dados_pendentes` foi justamente 0 = 0. O SUMMARY o marca como vácuo e apoia a igualdade em `pedidos_dados_todos`, que não tem o problema (`Array.isArray`).
**Fix:** Exigir `Number.isInteger(r.valor)` antes de converter. Caso contrário, `obtido='nao_inteiro'` e FALHA. O mesmo vale do lado postgres (`Number.isInteger(row.pedidos_pendentes)`, senão `ErroSeguro`).

## Verificado e correto (não são achados)

- **`blindar()`:** marca antes de trocar, então não sobram fragmentos. Redige o e-mail inteiro, qualquer janela de 12 de segredo com ≥ 16 caracteres (token, e-mail longo), e-mail, JWT, URL e corrida opaca de 40+. Nenhuma linha legítima casa: UUID tem 36, e `=`/`:` quebram a corrida. A execução real deu `blindagem 0`.
- **`valorSeguro`/`codigoSeguro`:** nenhum dado vindo da rede chega a eles com conteúdo de pessoa. Das filas sai só `.length`. O erro de login sai só como `http` + código `[A-Za-z0-9_]{1,40}`, que não comporta `@` nem `.`. O caso (i) do auto-teste cobre um corpo de erro que ecoa o e-mail.
- **Validação da chave:** `sb_secret_*` e JWT `service_role`/`authenticated` são recusados (e8/e9). A URL tem de ser `<ref de 20>.supabase.co` e igual ao projeto do p46apply.
- **Prova sem falso verde:** `candidaturas:*` exige esperado > 0 e `linhas = total = esperado`, então o 0 = 0 reprova (caso j). `rh2_vagas_proprias = 0` garante que toda vaga medida é alheia. O CV precisa de `ok === true` e de `signedUrl` não vazia. `estabilidade` relê o banco depois da sessão.
- **Auto-teste (b):** tira `P50_RH2_*` do ambiente do filho antes de executar o script real. Rodar o `--auto-teste` com as credenciais exportadas não faz login de verdade.
- **Exceção de push do 4ccc4dd1:** amarrada por sha e patch-id, e o diff pin..HEAD fora de `.planning` são exatamente os 3 arquivos acima. É processo, não código, e não há achado.

---

_Reviewed: 2026-10-06T12:39:03Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
