#!/usr/bin/env node
'use strict';
/*
 * authconfig.cjs — corrige a configuração do Supabase Auth de PRODUÇÃO pela
 * Management API, com BACKUP dos valores atuais antes de qualquer mudança.
 *
 * O que ele muda (medido em 2026-09-06, ao criar o primeiro RH pela tela):
 *   1. `site_url`        : "http://localhost:5173"  → "https://rh.beautysmile.com.br"
 *      Todo `{{ .ConfirmationURL }}` de e-mail apontava para localhost em PRODUÇÃO.
 *   2. `uri_allow_list`  : só localhost → acrescenta "https://rh.beautysmile.com.br/**".
 *      O `redirectTo` da EF gerenciar-usuario-rh (…/auth/redefinir-senha?tipo=rh)
 *      não estava na lista e era silenciosamente descartado.
 *   3. E-mail de recuperação: a frase «use o código na tela "Nova senha" do
 *      aplicativo» não dizia ONDE fica a tela — um RH criado pelo administrador
 *      nunca passou por ela. Passa a trazer o link da página.
 *   4. Assunto do e-mail: "Reset Your Password" (inglês, default) → pt-BR.
 *
 * Uso:
 *   node authconfig.cjs --dry-run   # mostra o que mudaria, grava o backup, não envia
 *   node authconfig.cjs             # aplica
 *   node authconfig.cjs --restore <backup.json>   # volta ao que estava
 *
 * Token: Keychain "Supabase CLI"/"supabase" ou SUPABASE_ACCESS_TOKEN.
 */
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const PROJECT_REF = process.env.SUPABASE_PROJECT_REF || 'isljnozzlvckrgjjbjwp';
const BASE = `https://api.supabase.com/v1/projects/${PROJECT_REF}/config/auth`;
const PROD = 'https://rh.beautysmile.com.br';

function die(m) { console.error(`authconfig: ${m}`); process.exit(1); }
function token() {
  if (process.env.SUPABASE_ACCESS_TOKEN) return process.env.SUPABASE_ACCESS_TOKEN.trim();
  try {
    return execFileSync('security', ['find-generic-password', '-s', 'Supabase CLI', '-a', 'supabase', '-w'], { encoding: 'utf8' }).trim();
  } catch { die('token não encontrado (Keychain "Supabase CLI"/"supabase" ou SUPABASE_ACCESS_TOKEN).'); }
}
const H = () => ({ Authorization: `Bearer ${token()}`, 'Content-Type': 'application/json' });
const KEYS = ['site_url', 'uri_allow_list', 'mailer_subjects_recovery', 'mailer_templates_recovery_content'];

async function main() {
  const args = process.argv.slice(2);
  const dry = args.includes('--dry-run');
  const ri = args.indexOf('--restore');

  const cur = await (await fetch(BASE, { headers: H() })).json();
  if (!cur || typeof cur.site_url !== 'string') die(`resposta inesperada: ${JSON.stringify(cur).slice(0, 200)}`);

  if (ri >= 0) {
    const bk = JSON.parse(fs.readFileSync(args[ri + 1], 'utf8'));
    const body = Object.fromEntries(KEYS.filter((k) => k in bk).map((k) => [k, bk[k]]));
    const r = await fetch(BASE, { method: 'PATCH', headers: H(), body: JSON.stringify(body) });
    console.log(`restore: HTTP ${r.status}`);
    return;
  }

  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const bkPath = path.join(__dirname, `.auth-config-backup-${stamp}.json`);
  fs.writeFileSync(bkPath, JSON.stringify(Object.fromEntries(KEYS.map((k) => [k, cur[k]])), null, 2));
  console.log(`backup gravado: ${bkPath}  (está no .gitignore? confira antes de commitar)`);

  const frase = 'Use o código de 6 dígitos abaixo na tela "Nova senha" do aplicativo, junto com a sua nova senha:';
  const nova =
    `Use o código de 6 dígitos abaixo na página <a href="${PROD}/auth/redefinir-senha" style="color:#00109E;font-weight:bold">rh.beautysmile.com.br/auth/redefinir-senha</a>, informando também o seu e-mail e a nova senha:`;
  const html = cur.mailer_templates_recovery_content || '';
  const temFrase = html.includes(frase);
  if (!temFrase) console.log('⚠ frase do template não encontrada — o template NÃO será alterado (só site_url/allow-list/assunto).');

  const allow = String(cur.uri_allow_list || '');
  const body = {
    site_url: PROD,
    uri_allow_list: allow.includes(`${PROD}/**`) ? allow : `${PROD}/**,${allow}`,
    mailer_subjects_recovery: 'Seu código para redefinir a senha — Beauty Smile Recrutamento',
    ...(temFrase ? { mailer_templates_recovery_content: html.replace(frase, nova) } : {}),
  };

  console.log('site_url        :', cur.site_url, '→', body.site_url);
  console.log('uri_allow_list  :', allow, '→', body.uri_allow_list);
  console.log('assunto recovery:', cur.mailer_subjects_recovery, '→', body.mailer_subjects_recovery);
  console.log('template        :', temFrase ? 'ganha o link da página de redefinição' : 'inalterado');
  if (dry) return console.log('--dry-run: nada enviado.');

  const r = await fetch(BASE, { method: 'PATCH', headers: H(), body: JSON.stringify(body) });
  const j = await r.json();
  if (!r.ok) die(`HTTP ${r.status}: ${JSON.stringify(j).slice(0, 400)}`);
  console.log(`OK · site_url=${j.site_url} · allow=${j.uri_allow_list} · template com link: ${String(j.mailer_templates_recovery_content || '').includes('auth/redefinir-senha')}`);
}
main().catch((e) => die(e.stack || String(e)));
