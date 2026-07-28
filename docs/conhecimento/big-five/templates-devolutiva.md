# Templates da Devolutiva Big Five — Beauty Smile

**Versão:** `2026-04-28-v1`
**Curado por:** Dra. [Nome], CRP-XX/XXXXX (a formalizar antes do go-live — Q1 do PRD)
**Última revisão:** 2026-04-28
**Propósito:** source of truth pra Edge Function [`gerar-devolutiva-bigfive`](../../../supabase/functions/gerar-devolutiva-bigfive/) — consumido via RAG filesystem (Master §8.8). **NÃO alterar sem revisão CRP.**

---

## Instruções pra IA (NÃO copiar pra output da devolutiva)

A IA deve usar estes templates como **conteúdo oficial** e apenas:

1. Personalizar com nome do candidato (1ª referência: nome completo; depois: primeiro nome)
2. Substituir `[PERCENTIL]` pelo percentil exato do candidato (número inteiro 1-99)
3. Substituir `[ANALOGIA]` pela frase calculada: "Em um grupo de 100 pessoas, você seria mais [DIM] que `${percentil-1}` e menos que `${100-percentil}`."
4. Adaptar 1 referência ao cargo: substituir `[CARGO_GENERICO]` pelo cargo real (ex: "recepcionista", "dentista", "coordenador administrativo", "auxiliar de saúde bucal"). Quando cargo não bater bem com a referência, ajustar a frase pra contexto clínico geral.
5. **NUNCA** inventar conteúdo novo, comparações sociais (gênero/política/criminalidade), ou afirmações clínicas (transtorno/patologia/doença).
6. Tom corporativo neutro PT-BR. Evitar superlativos, juízos de valor, e linguagem terapêutica.
7. Range alvo por bloco: 150-200 palavras. Se output ficar fora, retry com instrução de ajuste.

---

## Cabeçalho da Devolutiva (fixo)

### Disclaimer emocional (renderizado no topo)

> Este questionário reflete como você se descreveu hoje. Se você estava cansado, com fome, ou passando por momento difícil, os resultados podem refletir esse estado momentâneo. Os percentis comparam você com uma amostra normativa internacional ampla, ainda sem normas brasileiras formais.

### Dashboard (estrutura visual)

```
[Nome do Candidato] — Seu perfil comportamental

Abertura à Experiência    [PERCENTIL]   [BANDA]   ▮▮▮▮▯
Conscienciosidade         [PERCENTIL]   [BANDA]   ▮▮▮▮▮
Extroversão               [PERCENTIL]   [BANDA]   ▮▮▯▯▯
Amabilidade               [PERCENTIL]   [BANDA]   ▮▮▮▮▯
Sensibilidade Emocional   [PERCENTIL]   [BANDA]   ▮▮▯▯▯
```

### Disclaimer LGPD/CFP (rodapé fixo, todas as devolutivas)

> Este é um self-assessment de estilo de trabalho — **não é teste psicológico**. Gerenciado pela Dra. [Nome], CRP-XX/XXXXX (responsável técnica). Não é fator único de eliminação no processo seletivo. Você pode solicitar explicação detalhada ou revisão humana a qualquer momento em [link Art. 20].

---

## Dimensão 1: Abertura à Experiência (O)

**Definição rápida (header da página):**
A Abertura à Experiência reflete tendência à curiosidade intelectual, apreciação por arte e ideias novas, e disposição pra explorar o não-familiar. Aspectos associados: Intelecto e Estética.

### O — Muito Baixo (percentil ≤ 15)

> Sua pontuação em Abertura à Experiência foi **[PERCENTIL]**, no patamar **muito baixo**. [ANALOGIA]
>
> Pessoas com Abertura muito baixa tendem a valorizar tradição, métodos comprovados, e processos estabelecidos. Costumam ter preferência clara por rotinas previsíveis e tarefas concretas, com menor entusiasmo por mudanças constantes ou exploração de ideias abstratas. Em ambientes de trabalho, geralmente se destacam quando há protocolos claros e papéis bem definidos — como fluxos clínicos padronizados, rotinas de [CARGO_GENERICO], ou execução fiel de procedimentos consolidados.
>
> Como contraponto, situações que exigem reinvenção frequente, exposição a métodos novos, ou tomada de decisão em contextos ambíguos podem demandar mais energia. Isso não é limitação — é apenas onde sua estabilidade de preferências aparece. Equipes que combinam pessoas com Abertura baixa e alta tendem a equilibrar consistência operacional com inovação.

### O — Moderadamente Baixo (percentil 16-35)

> Sua pontuação em Abertura à Experiência foi **[PERCENTIL]**, no patamar **moderadamente baixo**. [ANALOGIA]
>
> Pessoas com Abertura moderadamente baixa costumam preferir o conhecido ao novo, sem rejeitar mudanças quando bem fundamentadas. Tendem a confiar em métodos testados, valorizar a experiência acumulada, e a abordar inovações com sano ceticismo antes de adotá-las. Em [CARGO_GENERICO], esse perfil costuma trazer estabilidade operacional e atenção a procedimentos.
>
> Você pode achar mais natural ambientes onde mudanças vêm acompanhadas de justificativa clara e treinamento estruturado, ao invés de improvisos frequentes. Em contrapartida, contextos que pedem reinvenção rápida ou abertura a referências culturais muito distintas das suas podem exigir esforço adicional. Reconhecer onde investir energia ajuda a se posicionar bem em equipes diversas.

### O — Médio (percentil 36-64)

> Sua pontuação em Abertura à Experiência foi **[PERCENTIL]**, no patamar **médio**. [ANALOGIA]
>
> Pessoas com Abertura média tendem a equilibrar curiosidade por novidades com apreço por métodos estabelecidos. Costumam estar dispostas a experimentar ideias novas quando há razão prática, mas não buscam mudança por mudança. Em [CARGO_GENERICO], esse perfil costuma se adaptar bem tanto a rotinas previsíveis quanto a momentos pontuais de reinvenção.
>
> Você provavelmente reconhece valor tanto no que é conhecido quanto no que é experimental, e consegue transitar entre os dois conforme o contexto. Esse perfil moderado oferece versatilidade — pode tanto sustentar processos consolidados quanto contribuir em discussões sobre novas abordagens, sem se identificar exclusivamente com nenhum dos polos. Em equipes, costuma ser quem ajuda a mediar entre colegas mais conservadores e mais experimentais.

### O — Moderadamente Alto (percentil 65-84)

> Sua pontuação em Abertura à Experiência foi **[PERCENTIL]**, no patamar **moderadamente alto**. [ANALOGIA]
>
> Pessoas com Abertura moderadamente alta tendem a se interessar por ideias novas, métodos diferentes, e perspectivas culturais variadas. Costumam aprender com prazer, gostar de explorar como as coisas funcionam, e estar abertas a revisar opiniões diante de evidência nova. Em [CARGO_GENERICO], esse perfil costuma contribuir em melhorias de processo, sugestões de novos materiais, ou propostas de diferenciação de atendimento.
>
> Como contraponto, ambientes muito rotineiros sem espaço pra novidade podem se tornar monótonos, e excesso de variedade pode dispersar o foco. Equilibrar a curiosidade com finalização de tarefas em andamento costuma ser o ajuste mais útil. Equipes ganham com perfis assim quando o ambiente recompensa inovação prática, não apenas teoria.

### O — Muito Alto (percentil ≥ 85)

> Sua pontuação em Abertura à Experiência foi **[PERCENTIL]**, no patamar **muito alto**. [ANALOGIA]
>
> Pessoas com Abertura muito alta tendem a buscar estímulo intelectual constante, valorizar arte e estética, e questionar padrões estabelecidos. Costumam se entusiasmar com ideias abstratas, conexões inusitadas entre áreas, e abordagens não-convencionais. Em [CARGO_GENERICO], esse perfil pode brilhar em projetos de inovação, branding, criação de protocolos diferenciados, ou interface com pacientes que valorizam personalização.
>
> O contraponto é que rotinas muito rígidas, processos burocráticos repetitivos, ou ambientes que penalizam questionamentos podem gerar inquietação ou desengajamento. Aproveitar bem essa força costuma envolver buscar contextos onde inovação é parte do trabalho, e desenvolver disciplina pra finalizar projetos antes de iniciar novos. Equipes lucram quando há espaço pra experimentação dentro de estrutura clara.

---

## Dimensão 2: Conscienciosidade (C)

**Definição rápida (header da página):**
A Conscienciosidade reflete tendência ao planejamento, organização, autodisciplina, e cumprimento de compromissos. Aspectos associados: Indústria/Esforço e Ordem.

### C — Muito Baixo (percentil ≤ 15)

> Sua pontuação em Conscienciosidade foi **[PERCENTIL]**, no patamar **muito baixo**. [ANALOGIA]
>
> Pessoas com Conscienciosidade muito baixa tendem a operar de forma mais espontânea e flexível, com menor apego a planejamento de longo prazo ou rotinas rígidas. Costumam adaptar-se rapidamente a mudanças de última hora e a improvisar com naturalidade quando o contexto exige. Em ambientes muito estruturados como [CARGO_GENERICO] em clínica, esse perfil pode pedir suporte adicional em organização de tarefas, gestão de prazos, e cumprimento de protocolos.
>
> Como contraponto, espontaneidade e flexibilidade trazem valor em situações imprevisíveis e em ambientes criativos. Estratégias úteis: usar ferramentas externas de organização (apps, checklists, alarmes) pra apoiar a memória e o cumprimento de compromissos. Equipes ganham quando combinam perfis flexíveis com perfis estruturados — um equilibra o outro.

### C — Moderadamente Baixo (percentil 16-35)

> Sua pontuação em Conscienciosidade foi **[PERCENTIL]**, no patamar **moderadamente baixo**. [ANALOGIA]
>
> Pessoas com Conscienciosidade moderadamente baixa costumam preferir flexibilidade a rotinas muito estruturadas, e tendem a trabalhar bem quando há espaço pra ajustar o ritmo conforme o contexto. Podem achar listas e cronogramas úteis, mas raramente os seguem ao pé da letra. Em [CARGO_GENERICO], esse perfil costuma se sair melhor quando há autonomia pra organizar a própria rotina.
>
> Como contraponto, prazos rígidos e processos com muitas etapas detalhadas podem demandar mais esforço deliberado. Estratégias úteis: dividir tarefas grandes em passos menores, usar lembretes externos, e buscar ambientes onde resultados importam mais que processo. Em equipes clínicas onde protocolos são essenciais (ex: assepsia, prontuário), construir o hábito de checklist costuma fazer diferença.

### C — Médio (percentil 36-64)

> Sua pontuação em Conscienciosidade foi **[PERCENTIL]**, no patamar **médio**. [ANALOGIA]
>
> Pessoas com Conscienciosidade média tendem a equilibrar planejamento com flexibilidade, cumprindo compromissos importantes sem se prender excessivamente a detalhes. Costumam ser percebidas como confiáveis em entregas-chave, com tolerância razoável pra imprevistos. Em [CARGO_GENERICO], esse perfil se adapta bem tanto a rotinas estruturadas quanto a contextos que exigem improvisação.
>
> Você provavelmente sabe priorizar o que importa, sem se sobrecarregar com perfeccionismo. Em momentos de alta demanda (escala apertada, paciente delicado), pode ativar mais disciplina; em momentos calmos, recupera espaço pra flexibilidade. Esse perfil moderado costuma navegar bem em equipes mistas — nem o mais detalhista, nem o mais espontâneo, mas alguém que mantém o ritmo. Ajustar disciplina conforme prioridade tende a ser o caminho natural.

### C — Moderadamente Alto (percentil 65-84)

> Sua pontuação em Conscienciosidade foi **[PERCENTIL]**, no patamar **moderadamente alto**. [ANALOGIA]
>
> Pessoas com Conscienciosidade moderadamente alta tendem a planejar com antecedência, manter ambientes organizados, e cumprir prazos com regularidade. Costumam ser vistas como confiáveis e atentas a detalhes — qualidade especialmente valorizada em rotinas clínicas como [CARGO_GENERICO], que exigem assepsia, registro preciso e cumprimento de protocolo.
>
> Como contraponto, alta organização pode vir com menos flexibilidade pra mudanças de última hora, e alto compromisso com planos pode pesar em momentos que pedem improviso. Reconhecer esses contornos ajuda a investir energia onde importa: aproveitar a disciplina nos momentos críticos, e cultivar tolerância pra reorganizações pontuais. Equipes ganham com perfis assim quando há clareza de processo e respeito a prazos.

### C — Muito Alto (percentil ≥ 85)

> Sua pontuação em Conscienciosidade foi **[PERCENTIL]**, no patamar **muito alto**. [ANALOGIA]
>
> Pessoas com Conscienciosidade muito alta tendem a operar com forte disciplina, planejamento minucioso, e elevada exigência de qualidade — consigo mesmas e com o trabalho entregue. Costumam excelência em [CARGO_GENERICO] que dependem de precisão, cumprimento estrito de protocolos, ou gestão de múltiplas responsabilidades simultâneas. Pacientes e colegas geralmente percebem confiabilidade alta.
>
> O contraponto é que padrões muito altos podem gerar autocobrança intensa, dificuldade em delegar, ou desconforto com colegas que operam com menos estrutura. Em momentos de pressão extrema, pode haver tendência a perfeccionismo paralisante. Equilibrar esse rigor com paciência pra ritmo dos outros, e permitir-se entregar "bom o suficiente" quando apropriado, costuma ser o ajuste mais útil. Equipes ganham quando essa força é canalizada em momentos críticos, sem demandar o mesmo dos outros sempre.

---

## Dimensão 3: Extroversão (E)

**Definição rápida (header da página):**
A Extroversão reflete tendência à busca por estímulo social, energia em interações com pessoas, e expressão assertiva de opiniões. Aspectos associados: Entusiasmo e Assertividade.

### E — Muito Baixo (percentil ≤ 15)

> Sua pontuação em Extroversão foi **[PERCENTIL]**, no patamar **muito baixo**. [ANALOGIA]
>
> Pessoas com Extroversão muito baixa tendem a recarregar energia em momentos de solitude, preferir conversas profundas com poucas pessoas a interações amplas, e operar com tom mais reservado. Costumam ser ouvintes atentas, refletir antes de falar, e oferecer presença calma a colegas e pacientes. Em [CARGO_GENERICO], esse perfil pode trazer atenção concentrada em tarefas individuais, escuta cuidadosa, e ambiente acolhedor pra pacientes que valorizam discrição.
>
> Como contraponto, ambientes com muita interação social contínua, eventos com muitas pessoas, ou demandas de protagonismo público podem ser desgastantes. Reservar momentos de recuperação ao longo do dia costuma fazer diferença. Equipes ganham com perfis assim quando há espaço pra contribuição reflexiva, não apenas reativa.

### E — Moderadamente Baixo (percentil 16-35)

> Sua pontuação em Extroversão foi **[PERCENTIL]**, no patamar **moderadamente baixo**. [ANALOGIA]
>
> Pessoas com Extroversão moderadamente baixa costumam ser sociáveis em contextos conhecidos, mas preferir interações em grupos menores ou um-a-um a grandes reuniões. Tendem a observar antes de se posicionar, com energia social mais contida. Em [CARGO_GENERICO], esse perfil costuma construir vínculos consistentes com pacientes recorrentes e colegas próximos, sem necessariamente ocupar o centro das conversas.
>
> Como contraponto, contextos que exigem networking intenso, apresentações frequentes em público, ou condução de grupos grandes podem demandar mais energia deliberada. Estratégias úteis: preparar-se mentalmente antes de eventos sociais maiores, e respeitar o ritmo próprio de recuperação após interações intensas. A profundidade de relação que esse perfil cultiva costuma ser ativo valioso em ambientes clínicos.

### E — Médio (percentil 36-64)

> Sua pontuação em Extroversão foi **[PERCENTIL]**, no patamar **médio**. [ANALOGIA]
>
> Pessoas com Extroversão média tendem a transitar bem entre interações sociais e momentos de recolhimento, recarregando energia em ambos os contextos conforme a demanda. Costumam ser percebidas como acessíveis sem serem invasivas, e como reservadas sem serem distantes. Em [CARGO_GENERICO], esse perfil costuma navegar bem tanto em atendimento direto a pacientes quanto em tarefas que pedem concentração individual.
>
> Você provavelmente consegue ler o contexto e ajustar o tom — mais expressivo em momentos que pedem proximidade, mais contido em momentos que pedem foco. Esse equilíbrio costuma ser bem-vindo em equipes diversas, onde diferentes pacientes preferem estilos diferentes de atendimento. Reconhecer quando ativar mais energia social vs. quando proteger o ritmo interno costuma ser ajuste natural.

### E — Moderadamente Alto (percentil 65-84)

> Sua pontuação em Extroversão foi **[PERCENTIL]**, no patamar **moderadamente alto**. [ANALOGIA]
>
> Pessoas com Extroversão moderadamente alta tendem a se energizar em interações sociais, expressar opiniões com clareza, e construir vínculos com facilidade. Costumam ser percebidas como acessíveis, calorosas, e dispostas a tomar iniciativa em conversas. Em [CARGO_GENERICO], esse perfil costuma facilitar acolhimento de pacientes novos, comunicação fluida com colegas, e dinamismo em equipes.
>
> Como contraponto, ambientes muito silenciosos por longos períodos, tarefas individuais sem interação, ou momentos que pedem escuta prolongada antes de responder podem demandar adaptação. Cultivar pausas pra escutar antes de falar, e reconhecer colegas mais reservados que precisam de espaço pra contribuir, costuma fortalecer o impacto. Equipes ganham com perfis assim quando há espaço pra essa energia ser canalizada em colaboração, não em competição.

### E — Muito Alto (percentil ≥ 85)

> Sua pontuação em Extroversão foi **[PERCENTIL]**, no patamar **muito alto**. [ANALOGIA]
>
> Pessoas com Extroversão muito alta tendem a buscar interação social ativamente, expressar entusiasmo de forma contagiante, e assumir naturalmente posição de protagonismo em grupos. Costumam ser fonte de energia pra equipes, facilitar conexão entre colegas e pacientes, e prosperar em [CARGO_GENERICO] que envolvam atendimento intenso, condução de grupos, ou comunicação pública.
>
> O contraponto é que ambientes muito silenciosos, tarefas individuais prolongadas, ou contextos que pedem escuta paciente antes de qualquer resposta podem ser desafiadores. Pode haver tendência a falar antes de processar internamente, ou a ocupar mais espaço social do que colegas mais reservados confortavelmente comportam. Equilibrar a energia expansiva com escuta deliberada, e reconhecer ritmos diferentes nos colegas, costuma ampliar o impacto positivo. Essa força brilha quando canalizada em construção coletiva.

---

## Dimensão 4: Amabilidade (A)

**Definição rápida (header da página):**
A Amabilidade reflete tendência à cooperação, empatia, confiança nos outros, e disposição pra evitar conflitos. Aspectos associados: Compaixão e Polidez.

### A — Muito Baixo (percentil ≤ 15)

> Sua pontuação em Amabilidade foi **[PERCENTIL]**, no patamar **muito baixo**. [ANALOGIA]
>
> Pessoas com Amabilidade muito baixa tendem a operar com tom mais direto, defender posições com firmeza, e priorizar resultados objetivos sobre harmonia interpessoal. Costumam ser percebidas como pragmáticas, francas, e dispostas a tomar decisões difíceis quando necessário. Em [CARGO_GENERICO], esse perfil pode trazer clareza em comunicação, capacidade de defender prioridades técnicas, e disposição pra dar feedback honesto.
>
> Como contraponto, situações que demandam acolhimento emocional contínuo, mediação de conflitos, ou negociações que pedem flexibilidade interpessoal podem demandar adaptação consciente. Em ambientes clínicos com pacientes vulneráveis, cultivar tom mais acolhedor mesmo quando a substância da mensagem é direta costuma ampliar o impacto. Equipes ganham com perfis assim quando há espaço pra discordância produtiva e clareza de prioridades.

### A — Moderadamente Baixo (percentil 16-35)

> Sua pontuação em Amabilidade foi **[PERCENTIL]**, no patamar **moderadamente baixo**. [ANALOGIA]
>
> Pessoas com Amabilidade moderadamente baixa costumam ser cordiais sem serem excessivamente conciliadoras, dispostas a expressar discordância quando necessário, e mais reservadas em demonstrações de empatia explícita. Tendem a confiar nos outros após observação, não automaticamente. Em [CARGO_GENERICO], esse perfil pode trazer equilíbrio entre cuidado profissional e firmeza em decisões.
>
> Como contraponto, contextos que pedem acolhimento emocional intenso (paciente em crise, colega em momento difícil) podem demandar esforço deliberado pra ativar empatia mais expressiva. Estratégias úteis: reservar atenção consciente pra escuta sem julgar, e reconhecer que silêncio empático às vezes vale mais que solução pragmática. Em equipes clínicas, esse perfil costuma equilibrar bem cuidado com pacientes e gestão de limites.

### A — Médio (percentil 36-64)

> Sua pontuação em Amabilidade foi **[PERCENTIL]**, no patamar **médio**. [ANALOGIA]
>
> Pessoas com Amabilidade média tendem a equilibrar cooperação com defesa de posições próprias, demonstrando empatia em contextos apropriados sem se anular. Costumam ser percebidas como acessíveis e justas, com capacidade de discordar respeitosamente. Em [CARGO_GENERICO], esse perfil costuma construir relações de confiança com pacientes e colegas, sem perder de vista limites profissionais.
>
> Você provavelmente consegue ler o contexto e ajustar o tom — mais acolhedor em momentos que pedem cuidado, mais firme em momentos que pedem clareza. Esse equilíbrio é especialmente útil em ambientes clínicos onde há tensão entre acolhimento ao paciente e necessidade de defender protocolo, prazo, ou recurso limitado. Reconhecer quando ativar cada modo costuma vir naturalmente com a experiência.

### A — Moderadamente Alto (percentil 65-84)

> Sua pontuação em Amabilidade foi **[PERCENTIL]**, no patamar **moderadamente alto**. [ANALOGIA]
>
> Pessoas com Amabilidade moderadamente alta tendem a priorizar cooperação, demonstrar empatia com facilidade, e buscar consenso em situações de conflito. Costumam ser percebidas como acolhedoras, confiáveis, e atentas às necessidades dos outros. Em [CARGO_GENERICO], esse perfil costuma criar ambiente de cuidado consistente — pacientes se sentem ouvidos, colegas encontram apoio, equipes desenvolvem coesão.
>
> Como contraponto, situações que demandam recusas firmes, defesa de limites pessoais, ou comunicação direta de feedback negativo podem ser mais desafiadoras. Pode haver tendência a evitar conflito mesmo quando ele seria produtivo, ou assumir excesso de responsabilidade emocional pelos outros. Cultivar a capacidade de dizer "não" quando necessário, e reconhecer que limites saudáveis fortalecem relações, costuma ser o ajuste mais útil.

### A — Muito Alto (percentil ≥ 85)

> Sua pontuação em Amabilidade foi **[PERCENTIL]**, no patamar **muito alto**. [ANALOGIA]
>
> Pessoas com Amabilidade muito alta tendem a operar com forte orientação ao cuidado, empatia profunda, e disposição constante pra ajudar. Costumam ser referência de acolhimento em equipes, percebidas como pessoas em quem se pode confiar quando algo está difícil. Em [CARGO_GENERICO], esse perfil costuma criar conexão genuína com pacientes vulneráveis e ser o pilar emocional de colegas em momentos críticos.
>
> O contraponto é que essa generosidade pode levar a sobrecarga emocional, dificuldade em estabelecer limites, ou conflito interno em momentos que exigem decisões impopulares. Pode haver tendência a colocar necessidades dos outros consistentemente acima das próprias, com risco de esgotamento. Cultivar autocuidado ativo, aprender a recusar com firmeza compassiva, e reconhecer que limites preservam a capacidade de cuidar costumam ser desenvolvimentos importantes. Essa força é especialmente valiosa em ambientes clínicos quando equilibrada com sustentabilidade emocional.

---

## Dimensão 5: Sensibilidade Emocional (N)

**Definição rápida (header da página):**
A Sensibilidade Emocional reflete tendência a experimentar emoções com intensidade, perceber nuances afetivas no ambiente, e reagir a estímulos emocionais. Aspectos associados: Retraimento e Volatilidade.

> **Nota importante:** este traço é tradicionalmente chamado de "Neuroticismo" na literatura científica internacional. Adotamos "Sensibilidade Emocional" pra evitar conotação patológica do termo original — alta sensibilidade emocional não é doença, é um estilo emocional com vantagens e desvantagens em diferentes contextos.

### N — Muito Baixo (percentil ≤ 15)

> Sua pontuação em Sensibilidade Emocional foi **[PERCENTIL]**, no patamar **muito baixo**. [ANALOGIA]
>
> Pessoas com Sensibilidade Emocional muito baixa tendem a manter estabilidade emocional consistente mesmo sob pressão, raramente são tomadas por preocupações intensas, e recuperam-se rápido de contratempos. Costumam ser percebidas como calmas em momentos críticos, racionais sob estresse, e estáveis em humor ao longo do tempo. Em [CARGO_GENERICO], esse perfil costuma trazer presença firme em emergências clínicas, tom estável em atendimentos delicados, e capacidade de tomar decisões sem ser dominado pela emoção do momento.
>
> Como contraponto, essa estabilidade pode ser percebida por colegas mais sensíveis como distância ou falta de empatia em momentos que pediriam reconhecimento emocional explícito. Cultivar leitura ativa do clima emocional dos outros, mesmo que internamente você esteja calmo, costuma fortalecer relações em ambientes de cuidado. Essa força é particularmente valiosa em contextos de alta tensão.

### N — Moderadamente Baixo (percentil 16-35)

> Sua pontuação em Sensibilidade Emocional foi **[PERCENTIL]**, no patamar **moderadamente baixo**. [ANALOGIA]
>
> Pessoas com Sensibilidade Emocional moderadamente baixa costumam manter equilíbrio emocional na maior parte do tempo, com reações proporcionais aos eventos. Tendem a recuperar-se de frustrações sem grande dificuldade e a manter clareza em decisões mesmo sob tensão moderada. Em [CARGO_GENERICO], esse perfil costuma trazer consistência de humor que pacientes e colegas percebem como confiabilidade emocional.
>
> Como contraponto, em momentos de cuidado a pacientes emocionalmente abalados, pode ser útil ativar deliberadamente uma escuta mais empática — não porque você não sente, mas porque sua reação interna pode ser menos visível externamente. Reconhecer quando demonstrar emoção fortalece o vínculo é uma habilidade desenvolvível. Em equipes, esse perfil costuma ser o "porto seguro" em momentos de turbulência coletiva.

### N — Médio (percentil 36-64)

> Sua pontuação em Sensibilidade Emocional foi **[PERCENTIL]**, no patamar **médio**. [ANALOGIA]
>
> Pessoas com Sensibilidade Emocional média tendem a experimentar emoções na intensidade típica da maioria — sentem o impacto de eventos importantes sem serem dominadas por eles, e mantêm estabilidade emocional na maior parte das situações. Costumam responder a estresse com reações proporcionais e recuperar-se em ritmo razoável. Em [CARGO_GENERICO], esse perfil costuma transitar bem entre presença empática com pacientes e estabilidade pessoal pra sustentar a rotina.
>
> Você provavelmente sente quando algo te afeta, mas geralmente consegue continuar funcionando sem grande perda de eficácia. Em momentos de pressão muito alta ou eventos pessoais difíceis, alguma agitação é esperada — isso é parte natural de ter um espectro emocional saudável. Reconhecer quando pedir apoio e quando seguir em frente costuma ser ajuste natural com a experiência.

### N — Moderadamente Alto (percentil 65-84)

> Sua pontuação em Sensibilidade Emocional foi **[PERCENTIL]**, no patamar **moderadamente alto**. [ANALOGIA]
>
> Pessoas com Sensibilidade Emocional moderadamente alta tendem a perceber nuances afetivas com facilidade, experimentar emoções com intensidade, e ser sensíveis ao clima emocional do ambiente. Costumam captar rapidamente quando algo está errado com paciente ou colega, e oferecer presença empática genuína. Em [CARGO_GENERICO], esse perfil pode trazer cuidado afetivo diferenciado — pacientes ansiosos podem se sentir especialmente compreendidos.
>
> Como contraponto, ambientes de alta tensão prolongada, exposição constante a sofrimento alheio, ou momentos pessoais difíceis podem demandar mais energia de regulação emocional. Cultivar autocuidado ativo, técnicas de gerenciamento de estresse (respiração, pausas planejadas, sono regular), e construir rede de apoio costumam ser desenvolvimentos importantes. Esse perfil é especialmente valioso em contextos de cuidado quando equilibrado com sustentabilidade pessoal.

### N — Muito Alto (percentil ≥ 85)

> Sua pontuação em Sensibilidade Emocional foi **[PERCENTIL]**, no patamar **muito alto**. [ANALOGIA]
>
> Pessoas com Sensibilidade Emocional muito alta tendem a viver emoções com profundidade marcante, perceber detalhes afetivos que outros não captam, e ser fortemente impactadas tanto por momentos bonitos quanto por momentos difíceis. Costumam ter empatia muito desenvolvida e capacidade incomum de conectar com pacientes em situação delicada. Em [CARGO_GENERICO], essa sensibilidade pode tornar você presença marcante em atendimentos que demandam acolhimento profundo.
>
> O contraponto é que essa intensidade emocional vem com maior demanda de regulação. Ambientes de tensão prolongada, exposição contínua a sofrimento, ou contextos pessoais difíceis podem ser particularmente desafiadores. Cultivar práticas consistentes de autocuidado (sono regular, exercício, terapia se útil, redes de apoio), reconhecer sinais precoces de sobrecarga, e proteger momentos de recuperação costumam ser fundamentais pra sustentar a contribuição ao longo do tempo. Essa profundidade emocional é dom genuíno quando acompanhada de cuidado consistente consigo mesma. Se sentir que está consistentemente sobrecarregado, conversar com profissional de apoio (psicólogo, médico) pode ajudar a desenvolver estratégias personalizadas.

---

## Histórico de Versões

| Versão | Data | Autor | Mudança |
|--------|------|-------|---------|
| 2026-04-28-v1 | 2026-04-28 | Fernando + Claude (sessão design) | Versão inicial. 25 templates (5 dim × 5 níveis) + cabeçalho + disclaimers fixos. Tom corporativo neutro PT-BR. Nomenclatura "Sensibilidade Emocional" pra Neuroticismo. **Pendente revisão final pelo psicólogo CRP responsável técnico antes do go-live (Q1 do PRD-bigfive-revisado).** |
