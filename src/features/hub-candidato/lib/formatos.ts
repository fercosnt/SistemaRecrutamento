/**
 * formatos — formatos e rótulos da ficha «Dados do cadastro» do hub do RH
 * (Phase 52 / Plan 52-10; JORN-54; D-08, D-09, D-52-U18).
 *
 * Funções puras, sem dependência (a UI-SPEC recusa libs de máscara). Regra comum: valor fora do
 * formato esperado volta COMO VEIO — a ficha mostra o que está gravado, nunca um valor inventado.
 *
 * Os mapas de rótulo são aplicados sobre `toLowerCase()` porque os valores vivos de
 * `disponibilidade` estão em caixa mista (52-RESEARCH F12: `integral`/`Integral`,
 * `presencial`/`Presencial`); valor desconhecido aparece como veio.
 *
 * @module features/hub-candidato/lib/formatos
 * @see .planning/phases/52-hub-do-rh-dados-e-contato/52-UI-SPEC.md (§Aba «Cadastro e inscrição»)
 */

/** Fuso de referência da idade (D-09): a data de hoje é a de São Paulo, não a do navegador. */
const FUSO = 'America/Sao_Paulo'

const DATA_ISO_RE = /^(\d{4})-(\d{2})-(\d{2})/

/** `000.000.000-00` para 11 dígitos; qualquer outro → como veio. */
export function formatarCpf(valor: string): string {
  const d = valor.replace(/\D/g, '')
  if (d.length !== 11) return valor
  return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}-${d.slice(9)}`
}

/** `00000-000` para 8 dígitos; qualquer outro → como veio. */
export function formatarCep(valor: string): string {
  const d = valor.replace(/\D/g, '')
  if (d.length !== 8) return valor
  return `${d.slice(0, 5)}-${d.slice(5)}`
}

/** `dd/MM/yyyy` a partir de `yyyy-MM-dd` (com ou sem hora); fora do formato → como veio. */
export function formatarDataBr(valor: string): string {
  const m = DATA_ISO_RE.exec(valor)
  if (!m) return valor
  return `${m[3]}/${m[2]}/${m[1]}`
}

/** A data de `hoje` no fuso de São Paulo, como `[ano, mês, dia]`. */
function hojeEmSaoPaulo(hoje: Date): [number, number, number] {
  const partes = new Intl.DateTimeFormat('en-CA', {
    timeZone: FUSO,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(hoje)
  const parte = (t: string) => Number(partes.find((p) => p.type === t)?.value)
  return [parte('year'), parte('month'), parte('day')]
}

/**
 * Idade em anos completos na data de `hoje` em São Paulo (D-09). `null` quando a data de
 * nascimento não está no formato `yyyy-MM-dd` ou cai no futuro.
 */
export function idadeEm(dataIso: string, hoje: Date): number | null {
  const m = DATA_ISO_RE.exec(dataIso)
  if (!m) return null
  const [ano, mes, dia] = [Number(m[1]), Number(m[2]), Number(m[3])]
  const [hAno, hMes, hDia] = hojeEmSaoPaulo(hoje)
  let idade = hAno - ano
  if (hMes < mes || (hMes === mes && hDia < dia)) idade -= 1
  return idade >= 0 ? idade : null
}

/** «12/03/1994 (32 anos)» — «(1 ano)» no singular; data fora do formato → como veio. */
export function formatarNascimento(dataIso: string, hoje: Date): string {
  const idade = idadeEm(dataIso, hoje)
  if (idade === null) return formatarDataBr(dataIso)
  return `${formatarDataBr(dataIso)} (${idade} ${idade === 1 ? 'ano' : 'anos'})`
}

/** Gênero (UI-SPEC §Aba Cadastro, linha 6). */
export const ROTULO_GENERO: Readonly<Record<string, string>> = {
  masculino: 'Masculino',
  feminino: 'Feminino',
  outro: 'Outro',
  prefiro_nao_informar: 'Prefiro não informar',
}

/** «Como conheceu a vaga» — os nove valores do `check_como_conheceu` (candidatoSchema.ts). */
export const ROTULO_COMO_CONHECEU: Readonly<Record<string, string>> = {
  instagram: 'Instagram',
  facebook: 'Facebook',
  linkedin: 'LinkedIn',
  indicacao: 'Indicação',
  google: 'Google',
  catho: 'Catho',
  vagas_com: 'Vagas.com',
  solides: 'Solides',
  outro: 'Outro',
}

/** Turno preferido (`disponibilidade.periodo_disponivel`, D-52-U18). */
export const ROTULO_TURNO: Readonly<Record<string, string>> = {
  manha: 'Manhã',
  tarde: 'Tarde',
  noite: 'Noite',
  integral: 'Integral',
}

/** Modelo de trabalho (`disponibilidade.regime_trabalho`, D-52-U18). */
export const ROTULO_MODELO_TRABALHO: Readonly<Record<string, string>> = {
  presencial: 'Presencial',
  remoto: 'Remoto',
  hibrido: 'Híbrido',
}

/** O rótulo do mapa para `lower(trim(valor))`; desconhecido → como veio. */
function rotular(mapa: Readonly<Record<string, string>>, valor: string): string {
  const chave = valor.trim().toLowerCase()
  return Object.prototype.hasOwnProperty.call(mapa, chave) ? mapa[chave] : valor
}

export const rotuloGenero = (valor: string): string => rotular(ROTULO_GENERO, valor)
export const rotuloComoConheceu = (valor: string): string => rotular(ROTULO_COMO_CONHECEU, valor)
export const rotuloTurno = (valor: string): string => rotular(ROTULO_TURNO, valor)
export const rotuloModeloTrabalho = (valor: string): string => rotular(ROTULO_MODELO_TRABALHO, valor)

/**
 * «Início» da disponibilidade: `disponibilidade_imediata = true` → «Imediato»; senão a data em
 * `dd/MM/yyyy`; nenhum dos dois → `null` (a ficha mostra «Não informado»).
 */
export function inicioDisponibilidade(
  imediata: boolean | null,
  data: string | null,
): string | null {
  if (imediata === true) return 'Imediato'
  if (data && data.trim()) return formatarDataBr(data.trim())
  return null
}
