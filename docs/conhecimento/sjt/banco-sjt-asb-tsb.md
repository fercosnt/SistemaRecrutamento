---
cargo: [asb, tsb]
formato: multipla_escolha
bateria: 2 cenários
tempo_estimado_min: 5
peso_maximo: 8
corte_revisao: "< 5 OU ≥1 atencao"
escala: { fortemente_pontua: 4, pontua: 2, neutro: 1, atencao: 0 }
status: active
versao: v1.0
fonte_base: Lei 11.889/2008 + ANVISA + CFO Art. 12 (criados Beauty Smile)
language: pt-BR
nota_escopo: "Banco compartilhado por ASB (Auxiliar de Saúde Bucal) e TSB (Técnico em Saúde Bucal). No Brasil não existe 'higienista' autônoma: ASB/TSB atuam sob supervisão do dentista presente, nunca atendem o paciente sozinhas. Cenários refletem escopo real (chairside + biossegurança + escalação imediata)."
---

# Banco SJT — ASB / TSB (compartilhado)

> **Escala:** `fortemente_pontua`=4 · `pontua`=2 · `neutro`=1 · `atencao`=0 **+ flag**.
> **Threshold:** `score < 5/8` **OU** `≥1 atencao` → revisão humana. Nunca auto-rejeita (RNF-07a).
> **Escopo:** ASB e TSB trabalham **junto** ao dentista — os cenários nunca pressupõem decisão clínica solo. Núcleo: **biossegurança** e **trabalho em equipe chairside**.

---

## ASB-1 — Esterilização não confirmada, sob pressão de tempo
- **Dimensão:** Biossegurança / Segurança do Paciente
- **Fonte:** Lei 11.889/2008 + ANVISA RDC (CRIADO Beauty Smile)

> Você prepara a sala pro próximo paciente e percebe que o indicador de esterilização do instrumental não mudou de cor (a esterilização pode ter falhado). O dentista está atrasado e diz: "vai logo, usa esse aí que tô com pressa."

| ordem | opção | tag | peso | nota_ia |
|---|---|---|---|---|
| 1 | Não entrega o instrumental não-confirmado; avisa o dentista que o indicador não validou, separa/reprocessa um kit com esterilização confirmada e registra | fortemente_pontua | 4 | Âncora. Segurança do paciente acima da pressão de tempo. |
| 2 | Avisa o dentista da dúvida, mas se ele insistir usa mesmo assim "porque ele é o responsável" | pontua | 2 | Escala, mas cede ao risco. |
| 3 | Troca por outro kit qualquer disponível, sem confirmar se aquele está validado | neutro | 1 | Resolve por instinto, sem verificar. |
| 4 | Usa o instrumental mesmo pra não atrasar — "deve estar ok" | atencao | 0 | Risco sanitário direto. Flag. |

---

## ASB-2 — Paciente ansioso durante o procedimento
- **Dimensão:** Trabalho em Equipe chairside + Humanização
- **Fonte:** CFO Art. 12 + DCN perfil (CRIADO Beauty Smile)

> No meio de um procedimento, o paciente começa a ficar agitado e tenso. O dentista está concentrado e precisa de instrumentação contínua. Você percebe o desconforto crescente.

| ordem | opção | tag | peso | nota_ia |
|---|---|---|---|---|
| 1 | Mantém a instrumentação fluindo E acolhe o paciente (voz calma, presença) e sinaliza o desconforto ao dentista pra ele decidir pausar | fortemente_pontua | 4 | Âncora. Apoia os dois sem largar a função. |
| 2 | Foca 100% em instrumentar o dentista e deixa todo o acolhimento por conta dele | pontua | 2 | Cumpre a função core, mas omite o acolhimento. |
| 3 | Para de instrumentar pra cuidar do paciente, deixando o dentista sem apoio no meio do procedimento | neutro | 1 | Boa intenção, mas desorganiza o procedimento. |
| 4 | Ignora o desconforto ("não é minha função") ou diz "fica quieto que já acaba" | atencao | 0 | Frieza/desrespeito. Flag. |
