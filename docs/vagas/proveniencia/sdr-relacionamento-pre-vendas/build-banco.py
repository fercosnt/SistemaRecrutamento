#!/usr/bin/env python3
"""Monta docs/specs/BANCO-SJT-V3-SDR.md: MC1, MC5 e MC6 EXTRAIDOS byte a byte do v2 (mesmo
content_hash, nao sao reinseridos); MC4 extraido com UMA troca no cenario (lente -> clareamento);
MC2, MC3 e o caso aberto vem de novos-itens.md, escritos a mao.
    python3 -I build-banco.py <repo> <scratch-sdr>"""
import sys, os
repo, d = sys.argv[1:3]
v2 = open(os.path.join(repo, 'docs/specs/BANCO-SJT-V2.md'), encoding='utf-8').read()

def secao(ini, fim):
    i, j = v2.index(ini), v2.index(fim)
    return v2[i:j].rstrip() + '\n'

mc1 = secao('### MC1 · O lead que visualizou e sumiu', '### MC2 ·')
mc4 = secao('### MC4 ·', '### MC5 ·')
mc5 = secao('### MC5 · A confirmação que não volta', '### MC6 ·')
mc6 = secao('### MC6 ·', '### Caso aberto · Responda este lead no WhatsApp')
assert mc4.count('Quanto custa a lente?') == 1, 'ancora do MC4 nao casa 1 vez'
mc4 = mc4.replace('Quanto custa a lente?', 'Quanto custa o clareamento?')
assert 'lente' not in mc4.lower()

novos = open(os.path.join(d, 'novos-itens.md'), encoding='utf-8').read()
mc2 = novos[novos.index('### MC2 ·'):novos.index('### MC3 ·')].rstrip() + '\n'
mc3 = novos[novos.index('### MC3 ·'):novos.index('### Caso aberto ·')].rstrip() + '\n'
caso = novos[novos.index('### Caso aberto ·'):].rstrip() + '\n'

cab = '''# Banco SJT v3 — pré-vendas (`sdr-social-seller`)

> **Status: aguardando aprovação do operador.** Nada deste arquivo está no ar. O SQL é gerado por
> `scripts/geradores/gen-sjt-sdr-v3.py` a partir DESTE arquivo (gerado, não transcrito).

Revisão do cargo `sdr-social-seller` do v2 (`docs/specs/BANCO-SJT-V2.md`), pedida pelo operador em
2026-10-14 ao montar a vaga `sdr-relacionamento-pre-vendas`. Mesmo formato, mesma gramática
(`scripts/geradores/sjt_texto.py`), mesmos pesos por etiqueta (`fortemente_pontua` 4 · `pontua` 2 ·
`neutro` 1 · `atencao` 0) e a mesma regra de comprimento (D-34).

**O que muda, e por quê:**

- **MC1, MC5 e MC6 ficam** — texto idêntico ao v2, extraído por script. Mesmo `content_hash`: o
  gerador não os reinsere, e eles seguem com o mesmo id e as respostas já gravadas.
- **MC2 sai** («O lead empolgado que talvez não tenha indicação»). O SDR não julga indicação de
  tratamento — isso é do dentista. Entra **contorno de objeção**: «preciso ver com meu marido».
- **MC3 sai** («Reclamação pública num post»). Entra **reativação da base**: o orçamento aprovado
  que nunca virou consulta — a primeira camada da base que a função trabalha.
- **MC4 muda uma palavra** no cenário: «lente» vira «clareamento». As alternativas não mudam, mas
  o hash muda, então o item é retirado e reinserido.
- **O caso aberto cresce para três partes**: (a) a resposta ao lead; (b) um follow-up de 7 dias,
  com dia, canal e mensagem; (c) o contorno da objeção de preço. As dimensões passam a cobrir as
  três partes; os critérios estão em `supabase/functions/_shared/sjt-rubrica.ts`.

Os itens que saem são **retirados, não apagados**: as respostas da rodada anterior continuam
resolvendo para eles.

---

## Cargo `sdr-social-seller`

'''
out = cab + '\n'.join([mc1, mc2, mc3, mc4, mc5, mc6, caso])
open(os.path.join(repo, 'docs/specs/BANCO-SJT-V3-SDR.md'), 'w', encoding='utf-8').write(out)
print('ok — docs/specs/BANCO-SJT-V3-SDR.md', len(out.splitlines()), 'linhas')
