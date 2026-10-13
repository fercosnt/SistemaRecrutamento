# 52-21 — Registro do export prévio da população (D-41 emendada, condição 2)

O export foi feito UMA vez pelo passo da ação da Task 1 do `52-21-PLAN.md`, depois do primeiro `<verify>` verde
(`ENSAIO VERDE`, evidência `limpeza:populacao_md5=1b4b21a9…` = medição fresca), por
`node scripts/p52_export_limpeza.cjs --exportar … --populacao 52-21-POPULACAO.json --decisao-escopo 52-19-DECISAO-ESCOPO.md --storage 52-21-STORAGE.json`.

O diretório fica FORA do git (fora de qualquer árvore git, 0700, arquivos 0600) e contém dado pessoal. É a cópia
que o operador pediu para a restauração cirúrgica. Fica até o operador decidir, e o 52-22 o nomeia como pendência
do fecho do M8. Este registro guarda só o caminho, o md5, o instante e as contagens: nenhum nome, e-mail, CPF ou
nome de arquivo. É lido por máquina (`--conferir --registro`), com uma chave por linha:

export_dir: /Users/fernando/p52-export-limpeza/20261013T121303Z
export_md5: 0ea5ffb9dae8af4d0a82550dcf9e66fc
exportado_em: 2026-10-13T12:13:05.149Z
linhas: 778
tabelas: 31
curriculos: 24
populacao_md5: 1b4b21a93ff00a9d01f7d10926dd1f54
raizes: 38
linhas_md5: a11122f9cd205cb934831a96da7f7910
fk_md5: 61ae8b87373a0add0a52ef489a2fe85f
storage_nomes_md5: d6d79e3e7d985c226511a7c8232b90fe
storage_conteudo_md5: c14085e0e1f7f14cb47b4f9a38e16a5d
colunas_em_branco: auth.users=confirmation_token,email_change_token_current,email_change_token_new,phone_change_token,reauthentication_token,recovery_token
excluidas_por_desenho: auth.sessions=29,auth.mfa_amr_claims=29,auth.refresh_tokens=206,auth.one_time_tokens=1,auth.mfa_factors=0,auth.mfa_challenges=0,auth.mfa_recovery_code_sets=0,auth.mfa_recovery_codes=0,auth.oauth_authorizations=0,auth.oauth_consents=0,auth.scim_users=0,auth.webauthn_challenges=0,auth.webauthn_credentials=0

Saída do exportador, verbatim:

```
EXPORT GRAVADO: dir=/Users/fernando/p52-export-limpeza/20261013T121303Z export_md5=0ea5ffb9dae8af4d0a82550dcf9e66fc exportado_em=2026-10-13T12:13:05.149Z linhas=778 tabelas=31 curriculos=24
```

## Contagens por tabela e modo (do `MANIFESTO.json`)

| tabela | apaga | anula | atualiza |
|---|---:|---:|---:|
| auth.users | 30 | 0 | 0 |
| auth.identities | 28 | 0 | 0 |
| public.candidatos | 38 | 0 | 0 |
| public.autorizacoes | 28 | 0 | 0 |
| public.disponibilidade | 26 | 0 | 0 |
| public.solicitacoes_dados | 9 | 0 | 0 |
| public.ai_call_logs | 0 | 64 | 0 |
| public.candidate_ai_decisions | 1 | 0 | 0 |
| public.candidaturas | 32 | 0 | 0 |
| public.agendamentos_entrevista | 2 | 0 | 0 |
| public.analise_candidato_vaga | 28 | 0 | 0 |
| public.avaliacoes_rh | 1 | 0 | 0 |
| public.cognitivo_liberacao | 5 | 0 | 0 |
| public.decisao_final_historico | 11 | 0 | 0 |
| public.decisao_final | 6 | 0 | 0 |
| public.devolutivas_candidato | 4 | 0 | 0 |
| public.entrevista_analises | 14 | 0 | 0 |
| public.entrevista_guias | 6 | 0 | 0 |
| public.entrevistas_online | 4 | 0 | 0 |
| public.entrevistas_presenciais | 1 | 0 | 0 |
| public.historico_acoes | 8 | 0 | 0 |
| public.historico_candidatura | 82 | 0 | 0 |
| public.notificacoes_enviadas | 99 | 0 | 0 |
| public.redacoes_candidato | 5 | 0 | 0 |
| public.respostas_avaliacao | 17 | 0 | 0 |
| public.respostas_formulario | 131 | 0 | 0 |
| public.respostas_raven | 60 | 0 | 0 |
| public.revisao_rejeicao | 4 | 0 | 0 |
| public.scores_candidato | 24 | 0 | 0 |
| public.scores_raven | 2 | 0 | 0 |
| public.vagas | 0 | 0 | 8 |

Total: 778 linhas em 31 tabelas (706 `apaga`, 64 `anula`, 8 `atualiza`). As 8 vagas em `atualiza` são as do
escopo (`deleted_at`): `53b73af6`, `53f75c81`, `629a5f31`, `a32fe930`, `bc370a8b`, `e36e9929`, `f7655d91`,
`fb362e28`.

## O que o export deixa de fora (item vetável `export_escopo` da Task 2)

- **Tabelas de `auth` excluídas por desenho:** são só contadas (linha `excluidas_por_desenho` acima). Hoje há
  linhas em sessões (29), `mfa_amr_claims` (29), refresh tokens (206) e tokens de uso único (1). As demais têm 0.
- **Colunas em branco:** as 6 colunas `token` de `auth.users` são copiadas como `''`.
- **O que fica:** a linha inteira de `auth.users`, inclusive `encrypted_password`, para que a conta restaurada
  entre com a senha de antes.
