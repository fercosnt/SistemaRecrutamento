// 51-04 / D-22, D-51 — a regra viva do servidor, classificada POR FORMA, sobrecarga a sobrecarga.
//
// Lê do stdin o JSON de `p46apply.cjs sql` (linhas {fn, nargs, prosrc}) e classifica cada
// sobrecarga viva de public.salvar_avaliacao_entrevista em:
//   RECUSA  — o corpo contém a recusa literal de notas vazias (btrim + 'notas_humanas obrigatorias'
//             + check_violation) e ela vem ANTES de todo UPDATE/INSERT;
//   DELEGA  — o corpo não escreve nada (sem INSERT/UPDATE/DELETE fora de comentário) e devolve
//             `public.salvar_avaliacao_entrevista(a, b, c, p_notas)` — 4 argumentos, o último
//             EXATAMENTE p_notas — e existe uma sobrecarga de 4 argumentos classificada RECUSA;
//   FURO    — qualquer outra coisa. Um FURO reprova.
// População vazia reprova (nada foi provado). Nenhuma sobrecarga RECUSA reprova.
'use strict'
let s = ''
process.stdin.on('data', (d) => (s += d)).on('end', () => {
  let r
  try {
    r = JSON.parse(s.slice(s.indexOf('[')))
  } catch {
    console.error('SEM RESULTADO: ' + s.slice(-200))
    process.exit(1)
  }
  if (!Array.isArray(r) || !r.length) {
    console.error('NENHUMA SOBRECARGA VIVA ENCONTRADA')
    process.exit(1)
  }
  const semComentario = (src) => String(src).replace(/--[^\n]*/g, '')
  const RECUSA =
    /IF\s+p_notas\s+IS\s+NULL\s+OR\s+length\(\s*btrim\(\s*p_notas\s*\)\s*\)\s*=\s*0\s+THEN\s+RAISE\s+EXCEPTION\s+'notas_humanas obrigatorias'\s+USING\s+ERRCODE\s*=\s*'check_violation'/i
  // `SELECT … FOR UPDATE OF ea` é trava de linha, não escrita — o lookbehind a exclui.
  const ESCRITA = /(?<!FOR\s+)\b(INSERT|UPDATE|DELETE)\b/i
  const DELEGA =
    /RETURN\s+public\.salvar_avaliacao_entrevista\(\s*[A-Za-z_][\w]*\s*,\s*[A-Za-z_][\w]*\s*,\s*[A-Za-z_][\w]*\s*,\s*p_notas\s*\)\s*;/i
  const classe = new Map()
  for (const x of r) {
    const src = semComentario(x.prosrc)
    const m = RECUSA.exec(src)
    if (m) {
      const antes = src.slice(0, m.index)
      classe.set(x.fn, ESCRITA.test(antes) ? 'FURO(escrita antes da recusa)' : 'RECUSA')
    }
  }
  const alvo4 = r.find((x) => Number(x.nargs) === 4 && classe.get(x.fn) === 'RECUSA')
  for (const x of r) {
    if (classe.has(x.fn)) continue
    const src = semComentario(x.prosrc)
    if (!ESCRITA.test(src) && DELEGA.test(src) && alvo4) classe.set(x.fn, 'DELEGA→' + alvo4.fn)
    else classe.set(x.fn, 'FURO')
  }
  for (const [fn, c] of classe) console.log(fn + ' : ' + c)
  const furos = [...classe].filter(([, c]) => c.startsWith('FURO'))
  if (furos.length) {
    console.error('SERVIDOR SEM A RECUSA: ' + furos.map(([fn]) => fn).join(','))
    process.exit(1)
  }
  if (![...classe.values()].includes('RECUSA')) {
    console.error('NENHUMA SOBRECARGA COM A RECUSA DIRETA')
    process.exit(1)
  }
  console.log('servidor recusa notas vazias em ' + r.length + ' sobrecarga(s) (direta ou por delegação)')
})
