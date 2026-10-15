#!/usr/bin/env node
// Monta o payload da vaga nova de SDR. Tudo o que NAO muda e EXTRAIDO da vaga antiga
// (consultor-relacionamento-pre-vendas, lida do banco) — nunca transcrito. So o que e
// novo vem de novos.json, escrito a mao.
//   node build-payload.cjs <dir-scratch> <repo>
const fs = require('fs');
const path = require('path');
const [dir, repo] = process.argv.slice(2);
const ler = (f) => JSON.parse(fs.readFileSync(f, 'utf8'));

const antiga = ler(path.join(dir, '..', 'vaga-sdr-atual.json'))[0];
const pergs = ler(path.join(dir, 'perguntas-antigas.json'));
const novos = ler(path.join(dir, 'novos.json'));
const conheca = ler(path.join(repo, 'docs/vagas/proveniencia/social-media-senior.payload.json'))
  .secoes_extras.find((s) => s.titulo === 'Conheça a Beauty Smile');

const falha = (m) => { console.error('RECUSADO: ' + m); process.exit(1); };

// sobre_cargo: troca a secao do processo seletivo inteira (o resto e extraido igual)
let scargo = antiga.sobre_cargo;
const i = scargo.indexOf(novos.processo_seletivo_antigo_inicio);
if (i < 0 || scargo.indexOf(novos.processo_seletivo_antigo_inicio, i + 1) >= 0) falha('secao do processo seletivo nao casa exatamente 1 vez');
scargo = scargo.slice(0, i) + novos.processo_seletivo_novo;

// beneficios: sem valores em reais (decisao do operador, 2026-10-14) — trocas ancoradas
let ben = antiga.beneficios;
for (const [de, para] of novos.beneficios_trocas) {
  if (ben.split(de).length !== 2) falha('troca de beneficios nao casa exatamente 1 vez: ' + de.slice(0, 40));
  ben = ben.replace(de, para);
}
if (/R\$/.test(ben)) falha('ainda ha valor em reais em beneficios');

const num = (x) => (x == null ? null : Number(x));

const payload = {
  autor_email: 'fernando@beautysmile.com.br',
  _proveniencia: 'campos sem anotacao: extraidos de consultor-relacionamento-pre-vendas (banco, 2026-10-14). Novos: slug, endereco_completo, perfil_ideal, secoes_extras (so links), pesos_avaliacao, testes sem redacao, beneficios sem valores em reais, e em sobre_cargo a secao do processo seletivo.',
  vaga: {
    slug: novos.slug,
    titulo: antiga.titulo,
    subtitulo: antiga.subtitulo,
    descricao_curta: antiga.descricao_curta,
    departamento: antiga.departamento,
    tipo_contrato: antiga.tipo_contrato,
    modelo_trabalho: antiga.modelo_trabalho,
    cidade: antiga.cidade,
    estado: antiga.estado,
    endereco_completo: novos.endereco_completo,
    jornada_trabalho: antiga.jornada_trabalho,
    faixa_salarial_min: num(antiga.faixa_salarial_min),
    faixa_salarial_max: num(antiga.faixa_salarial_max),
    exibir_salario: false,
    total_vagas: antiga.total_vagas,
    aplica_cognitivo: false,
    sobre_cargo: scargo,
    responsabilidades: antiga.responsabilidades,
    requisitos_formacao: antiga.requisitos_formacao,
    requisitos_experiencia: antiga.requisitos_experiencia,
    requisitos_tecnicos: antiga.requisitos_tecnicos,
    requisitos_habilidades: antiga.requisitos_habilidades,
    diferenciais: antiga.diferenciais,
    beneficios: ben,
    sobre_empresa: antiga.sobre_empresa,
    perfil_ideal: novos.perfil_ideal,
  },
  _resolvidos_no_apply: { data_abertura: 'data do apply, fuso America/Sao_Paulo', data_fechamento: null },
  secoes_extras: [conheca],
  template_cargo: 'sdr_social_seller',
  pesos_avaliacao: novos.pesos_avaliacao,
  testes_aplicaveis: antiga.testes_aplicaveis.filter((t) => t.teste !== 'redacao_cultural'),
  rubrica_ia: antiga.rubrica_ia,
  perguntas: pergs.map((q) => ({
    bloco: q.bloco,
    ordem: q.ordem,
    texto_pergunta: q.texto_pergunta,
    texto_ajuda: q.texto_ajuda,
    tipo_resposta: q.tipo_resposta,
    opcoes_resposta: q.opcoes_resposta,
    obrigatoria: q.obrigatoria,
    limite_caracteres: q.limite_caracteres,
    ...(q.meta ? { opcoes_metadata: q.meta } : {}),
  })),
};

if (payload.vaga.perfil_ideal.length > 800) falha(`perfil_ideal com ${payload.vaga.perfil_ideal.length} chars — o guia de entrevista corta em 800`);
fs.writeFileSync(path.join(dir, 'payload.json'), JSON.stringify(payload, null, 2) + '\n');
console.log('ok — payload.json; perfil_ideal', payload.vaga.perfil_ideal.length, 'chars; sobre_cargo', scargo.length);
