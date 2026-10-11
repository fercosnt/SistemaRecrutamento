/**
 * ContatoCandidatoHeader — o contato do candidato no cabeçalho do hub do RH
 * (Phase 52 / Plan 52-23; JORN-53; G-51-OP1, D-12..D-16, D-40).
 *
 * Fora das abas (D-12): o RH vê o e-mail do candidato no topo do hub e escreve para ele com um
 * clique. A leitura é a do 52-09 — `useCadastroCandidatoRh`, que chama a EF
 * `ler-cadastro-candidato-rh` (a que deixa linha de log, D-11). O hook mora AQUI, não no corpo do
 * `HubCandidatoRH` (rules-of-hooks: o hub tem um early return de not-found).
 *
 * ⛔ Contato sai SÓ de `contato` (Invariante 4, JORN-53, ROADMAP SC2). A EF devolve `contato: null`
 * para todo registro `@invalido.local` — tombstone e fictícios, inclusive os que têm celular
 * gravado. O `cadastro` NUNCA vira contato: dele o cabeçalho lê apenas o nome completo.
 *
 * @module features/hub-candidato/components/ContatoCandidatoHeader
 * @see src/features/hub-candidato/hooks/useCadastroCandidatoRh.ts
 * @see .planning/phases/52-hub-do-rh-dados-e-contato/52-UI-SPEC.md (§Cabeçalho de contato; §Copy)
 */
import { Mail } from 'lucide-react'
import { useCadastroCandidatoRh } from '../hooks/useCadastroCandidatoRh'

/** As frases do cabeçalho de contato (52-UI-SPEC §Copywriting Contract). */
export const COPY_CONTATO = {
  enviarEmail: 'Enviar e-mail',
  chamarWhatsApp: 'Chamar no WhatsApp',
  semContato: 'Sem contato disponível.',
  whatsappInvalido: 'Número fora do formato do WhatsApp — confira o cadastro.',
  erro: 'Não foi possível carregar o contato.',
  recarregar: 'Recarregar contato',
  vaga: (titulo: string) => `Vaga: ${titulo}`,
} as const

const BOTAO_NEUTRO =
  'inline-flex min-h-[44px] items-center gap-2 rounded-xl border border-white/20 bg-white/5 px-4 text-sm font-semibold text-white transition-colors hover:bg-white/10'

export function ContatoCandidatoHeader({ candidaturaId }: { candidaturaId: string }) {
  const { data } = useCadastroCandidatoRh(candidaturaId)
  const contato = data?.contato ?? null
  const email = contato?.email ?? null

  if (!email) {
    return <p className="text-base text-white/80">{COPY_CONTATO.semContato}</p>
  }

  return (
    <div className="flex flex-wrap items-center gap-4">
      <div className="flex flex-wrap items-center gap-2">
        <Mail className="h-4 w-4 text-white/70" aria-hidden="true" />
        <span className="text-base text-white/90 break-all">{email}</span>
        <a data-testid="hub-contato-email" href={`mailto:${email}`} className={BOTAO_NEUTRO}>
          {COPY_CONTATO.enviarEmail}
        </a>
      </div>
    </div>
  )
}
