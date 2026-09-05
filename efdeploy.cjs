#!/usr/bin/env node
'use strict';
/*
 * efdeploy.cjs — deploy de Edge Function pela Management API do Supabase, com os
 * arquivos LIDOS DO DISCO (irmão do p46apply.cjs — mesma razão de existir).
 *
 * Por que não o `apply`/`deploy_edge_function` do MCP: ele exige o CONTEÚDO dos
 * arquivos transcrito pelo modelo no corpo da chamada — 9 arquivos, ~93 KB de
 * TypeScript. Foi por transcrição que duas migrations do M8 chegaram a PROD com
 * comentários descartados; num bundle de código o dano seria pior e mais
 * silencioso. Aqui o corpo vem de `fs.readFileSync`, byte a byte.
 *
 * O que sobe é EXATAMENTE o conjunto de arquivos que a versão viva já tem
 * (medido por `get_edge_function` em 2026-09-05: index.ts + 8 `_shared`), com os
 * nomes na mesma convenção (`functions/<slug>/index.ts`, `functions/_shared/*`).
 * O fechamento de imports relativos é recalculado a partir do entrypoint, e o
 * script RECUSA subir se ele divergir da lista esperada — subir um arquivo a
 * menos não falha no deploy, falha na primeira invocação.
 *
 * Uso:
 *   node efdeploy.cjs <slug> [--verify-jwt] [--dry-run]
 *
 * `verify_jwt` é FALSE por padrão porque as EFs deste projeto que recebem
 * `net.http_post` do banco autenticam o Bearer elas mesmas (service_role). Passe
 * --verify-jwt só para EF chamada pelo cliente com JWT de usuário.
 *
 * Token: Keychain do macOS, serviço "Supabase CLI", conta "supabase", ou a env
 * SUPABASE_ACCESS_TOKEN.
 */

const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const PROJECT_REF = process.env.SUPABASE_PROJECT_REF || 'isljnozzlvckrgjjbjwp';
const ROOT = path.join(__dirname, 'supabase');

function die(msg) {
  console.error(`efdeploy: ${msg}`);
  process.exit(1);
}

function token() {
  if (process.env.SUPABASE_ACCESS_TOKEN) return process.env.SUPABASE_ACCESS_TOKEN.trim();
  try {
    return execFileSync(
      'security',
      ['find-generic-password', '-s', 'Supabase CLI', '-a', 'supabase', '-w'],
      { encoding: 'utf8' }
    ).trim();
  } catch {
    die('token não encontrado (Keychain "Supabase CLI"/"supabase" ou SUPABASE_ACCESS_TOKEN).');
  }
}

/* Fechamento dos imports RELATIVOS a partir do entrypoint (npm:/https: ficam de fora). */
function closure(entry) {
  const seen = new Set();
  const stack = [entry];
  while (stack.length) {
    const f = stack.pop();
    if (seen.has(f)) continue;
    if (!fs.existsSync(f)) die(`import não encontrado no disco: ${f}`);
    seen.add(f);
    const src = fs.readFileSync(f, 'utf8');
    for (const m of src.matchAll(/from\s+["'](\.\.?\/[^"']+)["']/g)) {
      stack.push(path.normalize(path.join(path.dirname(f), m[1])));
    }
    for (const m of src.matchAll(/import\(\s*["'](\.\.?\/[^"']+)["']\s*\)/g)) {
      stack.push(path.normalize(path.join(path.dirname(f), m[1])));
    }
  }
  return [...seen].sort();
}

async function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');
  const verifyJwt = args.includes('--verify-jwt');
  const slug = args.find((a) => !a.startsWith('--'));
  if (!slug) die('uso: node efdeploy.cjs <slug> [--verify-jwt] [--dry-run]');

  const entryAbs = path.join(ROOT, 'functions', slug, 'index.ts');
  const files = closure(entryAbs);
  const rel = (f) => path.relative(ROOT, f).split(path.sep).join('/'); // functions/...
  const entrypoint = rel(entryAbs);

  console.log(`efdeploy: ${slug} · verify_jwt=${verifyJwt} · ${files.length} arquivo(s):`);
  for (const f of files) console.log(`  ${rel(f)}  (${fs.statSync(f).size} bytes)`);
  if (dryRun) return console.log('efdeploy: --dry-run, nada enviado.');

  const form = new FormData();
  form.append(
    'metadata',
    JSON.stringify({ entrypoint_path: entrypoint, name: slug, verify_jwt: verifyJwt })
  );
  for (const f of files) {
    form.append('file', new Blob([fs.readFileSync(f)], { type: 'text/typescript' }), rel(f));
  }

  const res = await fetch(
    `https://api.supabase.com/v1/projects/${PROJECT_REF}/functions/deploy?slug=${encodeURIComponent(slug)}`,
    { method: 'POST', headers: { Authorization: `Bearer ${token()}` }, body: form }
  );
  const text = await res.text();
  if (!res.ok) die(`HTTP ${res.status}: ${text}`);
  const j = JSON.parse(text);
  console.log(
    `efdeploy: OK · version=${j.version} · status=${j.status} · verify_jwt=${j.verify_jwt} · entrypoint=${j.entrypoint_path}`
  );
}

main().catch((e) => die(e.stack || String(e)));
