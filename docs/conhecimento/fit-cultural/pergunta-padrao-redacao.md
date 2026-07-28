# Pergunta Padrão + 12 Templates Customizáveis — Redação Fit Cultural

**Uso:** banco de perguntas que alimenta a Edge Function `avaliar-redacao` e a UI de configuração de vaga.
**Persistência:** seed em `perguntas_redacao` (migration `15_seed_perguntas_redacao.sql`).
**Versão:** 1.1 — 2026-05-12 (substitui v1.0).

> **Mudança v1.0 → v1.1**: pergunta padrão mudou de "decisão difícil" para Opção B (cuidar de pessoa em fragilidade/dúvida/insatisfação) — puxa UAU (carro-chefe) com clareza + Atitude de Dono + Sede de Crescimento. Banco expandido de 4 templates default (1 por cargo) para 12 templates (3 por cada um dos 4 cargos), com defaults ON/OFF. Junior=1 customizável / sênior=2.

---

## Q1 — Pergunta Padrão Beauty Smile (obrigatória em toda vaga)

```
Descreva uma situação real em que você precisou cuidar de uma pessoa
(cliente, paciente, colega ou liderado) em momento de fragilidade,
dúvida ou insatisfação.

Conte:
- O contexto
- O que VOCÊ decidiu fazer (e por quê)
- O que aprendeu com a experiência
```

**Código:** `PADRAO_BS`
**Valor primário:** `multi` (puxa UAU + Atitude de Dono + Sede de Crescimento de uma vez; revela Ética via tipo de decisão)
**Cargo:** universal (todos)

**Por que esta pergunta:**
- "Cuidar de uma pessoa em momento de fragilidade" → puxa **UAU profundo** (escutar, antecipar, personalizar) — o valor carro-chefe operacional BS
- "Cliente, paciente, colega ou liderado" → funciona pra qualquer cargo (clínico, recepção, coord, admin, freela) sem exigir experiência odontológica
- "VOCÊ decidiu fazer (e por quê)" → força ownership individual + fundamentação do trade-off → puxa **Atitude de Dono**
- "Aprendeu com a experiência" → captura reflexão aplicada → puxa **Sede de Crescimento**
- Difícil de fakear sem situação concreta vivida (filtro natural contra ChatGPT decorado)

**Crítica honesta dessa pergunta** (a IA deve estar ciente):
- Subexplora **Inovação** — por isso a Q2/Q3 customizável puxa Inovação em cargos onde tem peso 10 (dentista, gestor)
- Risco socially desirable: candidato pode inventar "história fofa" — mitigação via D1 (especificidade) + few-shot calibrado

---

## Q2/Q3 — Banco de 12 templates customizáveis (3 por cargo)

Templates de vaga lockados no Master §6.7 RF-33: `dentista_padrao`, `recepcao_padrao`, `coord_admin_padrao`, `freela_simples`. ASB usa `recepcao_padrao` em V1. Gestor regional usa `coord_admin_padrao` em V1.

### Template `dentista_padrao` (default: 1 padrão + 2 customizáveis = 3 redações)

| Código | Pergunta | Valor primário | Valor secundário | Default |
|--------|----------|---------------|------------------|---------|
| **D1** | *"Conte uma situação em que você defendeu uma abordagem clínica/técnica não-óbvia (baseada em evidência ou raciocínio próprio) contra o costume da equipe ou de um colega mais sênior. Como conduziu a discussão e o que ficou ao final?"* | inovacao | atitude_de_dono | ✅ ON |
| **D2** | *"Qual foi o último curso, livro, congresso ou estudo que você buscou POR INICIATIVA PRÓPRIA (não exigido pela clínica/empresa empregadora) nos últimos 12 meses? O que aprendeu e como aplicou na prática?"* | sede_de_crescimento | inovacao | ✅ ON |
| **D3** | *"Descreva uma situação em que você se viu em conflito entre pressão de meta/comissão e o que era melhor para o paciente. O que pesou, o que decidiu e como o paciente reagiu?"* | etica | atitude_de_dono | ⬜ OFF (opcional — usar quando vaga tem componente comercial forte) |

### Template `recepcao_padrao` (default: 1 padrão + 1 customizável = 2 redações)

> *Inclui também candidatos a Auxiliar de Saúde Bucal em V1. ASB recebe template separado se houver volume em V2.*

| Código | Pergunta | Valor primário | Valor secundário | Default |
|--------|----------|---------------|------------------|---------|
| **R1** | *"Conte uma situação em que você viu um problema que ninguém tinha apontado ainda — pode ser pequeno, do dia a dia — e decidiu resolver por conta própria. O que era, o que fez e o que aconteceu depois?"* | atitude_de_dono | uau | ✅ ON |
| **R2** | *"Descreva uma situação em que você fez algo extra por um cliente/paciente SEM que ele tivesse pedido — você antecipou alguma coisa. O que percebeu, o que fez, qual foi a reação dele?"* | uau | atitude_de_dono | ⬜ OFF (alternativa de R1 — RH escolhe qual encaixa melhor no contexto da vaga) |
| **R3** | *"Conte uma situação em que você recebeu uma crítica direta (de chefia, colega ou cliente) e o que mudou na sua forma de trabalhar depois disso. Sê específico no 'antes' e no 'depois'."* | sede_de_crescimento | — | ⬜ OFF (alternativa — usar quando vaga é em equipe de alta rotatividade) |

### Template `coord_admin_padrao` (default: 1 padrão + 2 customizáveis = 3 redações)

> *Inclui também Gestor Regional em V1. Cargo dedicado se houver volume em V2.*

| Código | Pergunta | Valor primário | Valor secundário | Default |
|--------|----------|---------------|------------------|---------|
| **C1** | *"Descreva uma melhoria de processo (operacional, de equipe, de comunicação ou de cliente) que você PROPÔS E IMPLEMENTOU no último ano. Como identificou o problema, o que tentou, como mediu o resultado e o que faria diferente?"* | inovacao | atitude_de_dono | ✅ ON |
| **C2** | *"Conte uma situação em que precisou dar um feedback duro/desconfortável a alguém (subordinado, par ou superior). Como conduziu a conversa e o que aprendeu sobre você nesse processo?"* | sede_de_crescimento | uau | ✅ ON |
| **C3** | *"Descreva uma decisão difícil que tomou com informação incompleta ou sob pressão de tempo — entre velocidade vs. qualidade, meta vs. cuidado com pessoa, ou autonomia vs. consultar. Como decidiu, o que daria certo e o que daria errado?"* | atitude_de_dono | inovacao | ⬜ OFF (alternativa — usar quando vaga tem alta responsabilidade decisional) |

### Template `freela_simples` (default: 1 padrão apenas = 1 redação)

Vagas freela/teste de 1 semana têm fricção alta. F1 OFF default — RH ativa se gestor quiser sinalizar alinhamento de tese.

| Código | Pergunta | Valor primário | Valor secundário | Default |
|--------|----------|---------------|------------------|---------|
| **F1** | *"Em poucas palavras: o que te atrai na proposta de odontologia 'sem dor, sem trauma, com tecnologia laser' da Beauty Smile? O que essa tese significa para você, e por que faz sentido (ou não) com o que você acredita?"* | multi | — | ⬜ OFF (opcional — usar quando alinhamento de tese é crítico) |

---

## Resumo da estrutura por cargo

| Template de cargo | Q1 padrão | Customizáveis default ON | Total redações default | Total palavras esperadas |
|-------------------|-----------|-------------------------|-------------------------|--------------------------|
| `dentista_padrao` | ✅ obrigatória | D1 + D2 (2) | 3 | ~900 |
| `recepcao_padrao` (+ ASB) | ✅ obrigatória | R1 (1) | 2 | ~600 |
| `coord_admin_padrao` (+ Gestor) | ✅ obrigatória | C1 + C2 (2) | 3 | ~900 |
| `freela_simples` | ✅ obrigatória | (nenhuma) | 1 | ~350 |

RH pode override (marcar/desmarcar) dentro do limite máximo 1 padrão + 0-2 customizáveis.

---

## Diretrizes para V2 — pergunta ad-hoc do RH

> V1 NÃO suporta criação ad-hoc — RH só seleciona do banco. As diretrizes abaixo são para V2 quando ad-hoc for habilitado.

### FAÇA

- Pergunte sobre **situação real** vivida no passado (não hipotética: "o que você FARIA")
- Peça **3 elementos**: contexto/dificuldade · ação · aprendizado
- Use linguagem direta — sem jargão corporativo
- Tenha **1 valor BS em mente** que a pergunta tenta surfar (UAU / Inovação / Atitude de Dono / Sede de Crescimento)
- Mencione "pessoas" ou "outros" — força perspectiva externa
- Indique trade-off real ("entre X e Y") quando possível

### NÃO FAÇA

- Pergunta fechada (sim/não)
- Pergunta que pede competência técnica específica (mistura com SJT/Work Sample)
- Pergunta hipotética ("se você fosse contratado, o que faria?")
- Pergunta que pede o candidato concordar com a empresa ("você acha nossa missão importante?")
- Pergunta sem trade-off (não força escolha entre alternativas)
- Pergunta que revela o critério de scoring (não escreva "demonstre Atitude de Dono")

### Validação no submit (V2)

- Mínimo 30 caracteres
- Não pode ser idêntica a outra pergunta ativa
- RH escolhe `valor_primario` (uau / inovacao / atitude_de_dono / sede_de_crescimento / etica / multi)
- Flag UI: "Pergunta ad-hoc não-validada — calibração V2 com dados de uso"

---

## Anti-padrões observados em PRD anterior (a evitar)

PRD original (`fit-cultural-prd.md`, DEPRECATED) usava SJT/Likert/Ranking — formato totalmente diferente. **Não puxar perguntas dele direto.** O banco-itens-v1 (25 itens SJT) tem cenários úteis para inspirar perguntas customizadas em V2 ad-hoc, mas reformular como **pergunta sobre passado vivido**, não como **escolha entre alternativas**.

---

**Atualizado em:** 2026-05-12
**Próxima revisão:** pós-piloto interno (50 redações) — avaliar quais customizáveis discriminaram melhor e ajustar defaults ON/OFF.
