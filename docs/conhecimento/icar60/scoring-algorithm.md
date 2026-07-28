# Scoring Algorithm — Prova de Raciocínio Lógico

> Suporte de implementação para [`PRD-cognitivo-raciocinio.md`](../../prds/m2-funil-rh/PRD-cognitivo-raciocinio.md) §8.2/§8.4.

## 1. Método: CTT (soma simples), não IRT

A pesquisa é clara [PESQUISA §3.1]: com **todos os candidatos respondendo todos os itens**, IRT 2PL e CTT produzem scores quase idênticos. IRT só compensa em design com dados massivamente faltantes (SAPA). **V1 usa CTT puro.** IRT fica como upgrade opcional v2 (calibração fina de itens).

- Cada item: **0/1** (acertou a alternativa do gabarito = 1).
- `score_total_raw` = soma dos acertos (0 a N).
- `secoes.matriz.raw` e `secoes.letra_numero.raw` = somas por seção (subscores informativos).

## 2. Deep module — interface estável

```ts
// supabase/functions/_shared/cognitivo/scoring.ts  [interface pública]
export function scoreRaciocinio(
  rawResponses: Record<string /*itemId*/, number /*optionIndex escolhido*/>,
  itemBankVersion: string,
  shuffleSeed: string,
): {
  total: number;
  secoes: { matriz: { raw: number; n_itens: number }; letra_numero: { raw: number; n_itens: number } };
  banda: Banda;
  flags: string[];
};

type Banda = 'bem_abaixo' | 'abaixo' | 'na_media' | 'acima' | 'bem_acima';
```

O client **nunca pontua** — manda só `rawResponses` + `shuffleSeed`. `submit-cognitivo-final` recomputa server-side a partir do gabarito + reverte o shuffle pelo seed (anti-tampering — idêntico ao padrão `submit-bigfive-final`).

## 3. Da soma à banda (5 faixas)

**Problema:** não há normas BR e não podemos alegar percentil-contra-população (posicionamento não-psicológico — RNF-12).

**V1 — referência provisória + banding largo:**
1. Converter `score_total_raw` num **z provisório** usando média/desvio esperados a partir das dificuldades-de-item do dataset SAPA (soma das proporções de acerto = média esperada; variância = Σ p(1-p) sob independência).
2. Mapear z → banda com cortes largos (banding mitiga adverse impact — [PESQUISA §3.4]):

| Banda | Faixa z (provisória V1) | Rótulo UI (não-psicológico) |
|-------|--------------------------|------------------------------|
| `bem_acima` | z ≥ +1,0 | "Bem acima da média dos candidatos" |
| `acima` | +0,3 ≤ z < +1,0 | "Acima da média dos candidatos" |
| `na_media` | −0,3 < z < +0,3 | "Na média dos candidatos" |
| `abaixo` | −1,0 < z ≤ −0,3 | "Abaixo da média dos candidatos" |
| `bem_abaixo` | z ≤ −1,0 | "Bem abaixo da média dos candidatos" |

**V2 — norma local:** acumular ≥ 200 candidatos reais → recomputar média/DP do **próprio pool** → banding calibrado (substitui `norm_ref: 'provisoria_item_difficulty_sapa'` por `norm_ref: 'local_pool_vN'`). Banding ±1 EPM (para α≈0,90, SD≈9 ⇒ EPM≈2,3 pts).

> **Nunca** exibir z, percentil ou número cru ao gestor/candidato. A banda é a única saída visível.

## 4. Flags (proctoring / qualidade) — nunca auto-rejeitam

Gravadas em `metadata.flags`, só sinalizam ao RH:
- `tab_switch_xN` (visibility API)
- `fullscreen_exit_xN`
- `tempo_item_suspeito` (resposta < 500ms ou outlier alto)
- `timeout_auto_submit`

## 5. Testes (espelhar `submit-bigfive-final`)
- Fixture de 10 perfis sintéticos: `rawResponses` conhecido → `total`/`secoes`/`banda` esperados.
- Shuffle determinístico: mesmo `shuffleSeed` → mesma ordem; gabarito acompanha a permutação.
- Anti-tampering: client manda `total` forjado no payload → ignorado; server recomputa.
