# Item Bank — Prova de Raciocínio Lógico (CC0)

> Suporte de implementação para [`PRD-cognitivo-raciocinio.md`](../../prds/m2-funil-rh/PRD-cognitivo-raciocinio.md).
> **Atenção legal:** usar **apenas** o dataset CC0 do Harvard Dataverse. NÃO usar o item bank do icar-project.com (licença "non-commercial research" — fora de escopo p/ ATS comercial).

## 1. Fontes (todas reusáveis comercialmente)

| Fonte | Conteúdo | Licença | Link |
|-------|----------|---------|------|
| **Harvard Dataverse — SAPA ICAR** | 60 itens ICAR + gabarito `superKey60` + dificuldade por item (N≈97k) | **CC0** (sem restrição comercial) | `doi:10.7910/DVN/TZJGAT` |
| **MaRs-IB** (expansão futura) | 80 itens de matrix reasoning | Open-access não-comercial — contatar autores (flexíveis) | `osf.io/g96f4` |

> Decisão (Q-C4): **V1 usa só o dataset CC0** (zero dependência externa). MaRs-IB entra como expansão se precisar de mais itens de matriz.

## 2. Seções do V1 (decisão: matriz + letra-número, não-verbal)

| Seção | Origem no dataset | # itens V1 (alvo) | Requer figura | Adverse impact |
|-------|-------------------|-------------------|---------------|----------------|
| **Matriz** (Matrix Reasoning) | ICAR Matrix Reasoning | ~18 | Sim (matriz + alternativas) | Menor (análogo Raven, d 0,5–0,7) |
| **Letra-número** (Letter-Number Series) | ICAR Letter & Number Series | ~10 | Não (texto/símbolos) | Médio (d 0,6–0,8) |

**Excluído do V1** (ver §3b do Master): Verbal Reasoning (adverse impact alto d 0,8–1,0+ + tradução PT-BR custosa) e 3D Rotation (assets pesados, baixa cobertura p/ cargos-alvo).

**Dificuldade média por item no dataset SAPA** (proporção de acerto — referência provisória até norma local):
- Matriz: ~0,52 · Letra-número: ~0,59

## 3. Modelo de item (muda vs. shell Raven atual)

O shell `TesteRavenPage.tsx` renderiza **1 imagem composta** por item (enunciado + opções tudo num `.webp` — formato Raven). Os itens CC0 vêm como **enunciado separado + alternativas discretas**. Adaptar:

```ts
// antes (Raven): QuestaoRaven { serie, numero, imagemCompleta, numeroOpcoes }
// depois (CC0):
interface ItemRaciocinio {
  id: string;                 // 'mat_01', 'ln_01'
  secao: 'matriz' | 'letra_numero';
  enunciado_img: string;      // matriz: caminho da figura; letra-número: pode ser texto renderizado
  alternativas: string[];     // matriz: caminhos de figuras; letra-número: strings
  gabarito_idx: number;       // índice 0-based da alternativa correta (do superKey60)
  dificuldade_sapa: number;   // referência provisória (0–1)
}
```

## 4. Hospedagem dos assets

- Bucket próprio Supabase Storage: `cognitivo-itens`.
- Commitar `LICENSE-CC0.md` + atribuição (Condon & Revelle, SAPA Project) junto.
- **Separado** de qualquer bucket que tenha tido material Raven (evita cross-contamination).

## 5. Anti-memorização (pool > itens aplicados)

- Importar o máximo de itens CC0 disponíveis; aplicar um **subset rotativo** por candidatura.
- Fisher-Yates shuffle de itens E alternativas, seed = `candidatura_id` (reproduzível server-side p/ re-scoring).
- 1 tentativa por candidatura (constraint UNIQUE).
- v2: banco maior + seleção adaptativa (CAT) para reduzir exposição.

## 6. Pendências (Q-C1)
- [ ] Definir contagem final exata por seção e tempo-alvo (default proposto: 18 matriz + 10 letra-número, ~25 min).
- [ ] Extrair `superKey60` + dificuldades do dataset e gerar o JSON de itens.
- [ ] Renderizar/exportar as figuras de matriz do dataset para o bucket.
