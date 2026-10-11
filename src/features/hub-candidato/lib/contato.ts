/**
 * contato — os helpers puros do contato no cabeçalho do hub do RH
 * (Phase 52 / Plan 52-23; JORN-53; D-13, D-14, D-40; 52-UI-SPEC §Cabeçalho de contato).
 *
 * Sem DOM e sem rede: o `ContatoCandidatoHeader` só decide O QUE mostrar a partir destas funções.
 *
 * ⛔ Três regras que moram AQUI, num lugar só:
 *  1. `contatoUtilizavel` — registro fictício/anonimizado (`@invalido.local`, qualquer caixa,
 *     com espaço) NÃO tem contato, mesmo com celular gravado. A EF do 52-09 já devolve
 *     `contato: null` para esses registros; isto é a defesa em profundidade contra uma EF antiga
 *     no ar devolvendo o e-mail marcado (D-40, JORN-53, ROADMAP SC2).
 *  2. `montarMailto` — só de endereço validado: um `?`/`&`/`#` gravado no e-mail injetaria
 *     cabeçalho no `mailto:` (`?bcc=…`, T-52-24). O assunto vai por `encodeURIComponent`.
 *  3. `normalizarCelularWhatsApp` — a regra da UI-SPEC: 12–13 dígitos começando por `55` → como
 *     está; 10–11 dígitos com DDD que não começa por `0` → `55` + dígitos; qualquer outro →
 *     inválido (`null`), e a tela explica por quê (Invariante 7).
 *
 * @module features/hub-candidato/lib/contato
 * @see .planning/phases/52-hub-do-rh-dados-e-contato/52-RESEARCH.md (Code Example 3)
 */
import type { ContatoCandidatoRh } from '../services/cadastroCandidatoRhService'

/** Marcador do motor de exclusão (BD-9) e dos seis fictícios das migrations. */
const DOMINIO_SEM_CONTATO = '@invalido.local'

/** Endereço aceito para `mailto:` — sem espaço, sem `@` extra, sem `?`/`&`/`#` (T-52-24). */
const EMAIL_MAILTO_RE = /^[^\s@?&#]+@[^\s@?&#]+\.[^\s@?&#]+$/

/**
 * O contato que o cabeçalho pode oferecer. `null` quando não há contato ou quando o registro é
 * fictício/anonimizado (e-mail em `@invalido.local`) — nesse caso o registro INTEIRO fica sem
 * contato, inclusive o celular. Nos outros casos devolve o próprio objeto.
 */
export function contatoUtilizavel(
  contato: ContatoCandidatoRh | null | undefined,
): ContatoCandidatoRh | null {
  if (!contato) return null
  const email = contato.email
  if (typeof email === 'string' && email.trim().toLowerCase().endsWith(DOMINIO_SEM_CONTATO)) {
    return null
  }
  return contato
}

/** Dígitos do celular no formato do `wa.me` (com DDI 55), ou `null` se fora do formato. */
export function normalizarCelularWhatsApp(celular: string | null | undefined): string | null {
  const d = (celular ?? '').replace(/\D/g, '')
  if (d.startsWith('55') && (d.length === 12 || d.length === 13)) return d
  if ((d.length === 10 || d.length === 11) && d[0] !== '0') return `55${d}`
  return null
}

/** `https://wa.me/{numero}?text={mensagem codificada}` (D-13). */
export function montarLinkWhatsApp(numero: string, mensagem: string): string {
  return `https://wa.me/${numero}?text=${encodeURIComponent(mensagem)}`
}

/** `mailto:{email}?subject={assunto codificado}`, corpo vazio (D-14) — ou `null` se o endereço não valida. */
export function montarMailto(email: string, assunto: string): string | null {
  if (!EMAIL_MAILTO_RE.test(email)) return null
  return `mailto:${email}?subject=${encodeURIComponent(assunto)}`
}

/** `(11) 98765-4321` para 11 dígitos, `(11) 3333-4444` para 10; qualquer outro → o valor cru. */
export function formatarCelular(celular: string): string {
  const d = celular.replace(/\D/g, '')
  if (d.length === 11) return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`
  if (d.length === 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`
  return celular
}

/** Primeiro token do nome completo, como gravado (UI-SPEC :432). `null` sem nome. */
export function primeiroNome(nome: string | null | undefined): string | null {
  const token = (nome ?? '').trim().split(/\s+/)[0]
  return token ? token : null
}

function tituloDaVaga(vaga: string | null | undefined): string | null {
  const t = (vaga ?? '').trim()
  return t ? t : null
}

/** Assunto do e-mail (D-14): «Beauty Smile — sua candidatura para {vaga}»; sem vaga, sem o «para». */
export function assuntoEmail(vaga: string | null | undefined): string {
  const t = tituloDaVaga(vaga)
  return t ? `Beauty Smile — sua candidatura para ${t}` : 'Beauty Smile — sua candidatura'
}

/**
 * Mensagem pronta do WhatsApp (D-13): «Olá, {primeiro nome}! Aqui é da Beauty Smile, sobre a sua
 * candidatura para {vaga}.»; sem vaga, termina em «… sobre a sua candidatura.». Sem nome, a
 * saudação fica «Olá!».
 */
export function mensagemWhatsApp(
  nome: string | null | undefined,
  vaga: string | null | undefined,
): string {
  const saudacao = nome ? `Olá, ${nome}!` : 'Olá!'
  const t = tituloDaVaga(vaga)
  const sobre = t ? `sobre a sua candidatura para ${t}.` : 'sobre a sua candidatura.'
  return `${saudacao} Aqui é da Beauty Smile, ${sobre}`
}
