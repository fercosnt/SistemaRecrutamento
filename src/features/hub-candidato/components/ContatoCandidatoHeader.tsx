/**
 * ContatoCandidatoHeader — o contato do candidato no cabeçalho do hub do RH
 * (Phase 52 / Plan 52-23; JORN-53; G-51-OP1, D-12..D-16, D-40).
 *
 * Fora das abas (D-12): o RH vê o e-mail e o celular do candidato no topo do hub e escreve para
 * ele com um clique — «Enviar e-mail» (`mailto:` com o assunto da vaga, corpo vazio — D-14) e
 * «Chamar no WhatsApp» (`wa.me` com a mensagem pronta, editável no próprio WhatsApp — D-13).
 * A leitura é a do 52-09 — `useCadastroCandidatoRh`, que chama a EF `ler-cadastro-candidato-rh`
 * (a que deixa linha de log, D-11). O hook mora AQUI, não no corpo do `HubCandidatoRH`
 * (rules-of-hooks: o hub tem um early return de not-found).
 *
 * ⛔ Contato sai SÓ de `contatoUtilizavel(data.contato)` (Invariante 4, JORN-53, ROADMAP SC2).
 * A EF devolve `contato: null` para todo registro `@invalido.local` — tombstone e fictícios,
 * inclusive os que têm celular gravado; e `contatoUtilizavel` derruba o contato inteiro se um
 * e-mail marcado chegar mesmo assim (EF antiga no ar). O `cadastro` NUNCA vira contato: dele o
 * cabeçalho lê apenas o nome completo, para o primeiro nome da mensagem. Sem contato, a linha
 * inteira é «Sem contato disponível.» — sem número, sem botão e sem causa.
 *
 * D-15: o clique não é registrado — os botões são links puros, sem handler.
 * D-16: aparecem em qualquer etapa e status, inclusive rejeitado, sempre que houver o dado.
 *
 * @module features/hub-candidato/components/ContatoCandidatoHeader
 * @see src/features/hub-candidato/hooks/useCadastroCandidatoRh.ts
 * @see src/features/hub-candidato/lib/contato.ts
 * @see .planning/phases/52-hub-do-rh-dados-e-contato/52-UI-SPEC.md (§Cabeçalho de contato; §Copy)
 */
import { Mail, MessageCircle, Phone, RefreshCw } from 'lucide-react'
import { Skeleton } from '@/components/ui/skeleton'
import { useCadastroCandidatoRh } from '../hooks/useCadastroCandidatoRh'
import {
  assuntoEmail,
  contatoUtilizavel,
  formatarCelular,
  mensagemWhatsApp,
  montarLinkWhatsApp,
  montarMailto,
  normalizarCelularWhatsApp,
  primeiroNome,
} from '../lib/contato'

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

/** O molde neutro do «Retroceder»/«Abrir currículo» — o CTA dominante da tela continua um só. */
const BOTAO_NEUTRO =
  'inline-flex min-h-[44px] items-center gap-2 rounded-xl border border-white/20 bg-white/5 px-4 text-sm font-semibold text-white transition-colors hover:bg-white/10'

function textoOuNulo(v: string | null | undefined): string | null {
  return v && v.trim() ? v.trim() : null
}

export function ContatoCandidatoHeader({ candidaturaId }: { candidaturaId: string }) {
  const { data, isLoading, isError, refetch } = useCadastroCandidatoRh(candidaturaId)

  if (isLoading && !data) {
    return <Skeleton className="h-10 w-full max-w-md bg-white/5" />
  }

  if (isError && !data) {
    return (
      <div className="flex flex-wrap items-center gap-4">
        <p className="text-base text-white/80">{COPY_CONTATO.erro}</p>
        <button type="button" onClick={() => void refetch()} className={BOTAO_NEUTRO}>
          <RefreshCw className="h-4 w-4" aria-hidden="true" />
          {COPY_CONTATO.recarregar}
        </button>
      </div>
    )
  }

  const vaga = textoOuNulo(data?.vaga_titulo)
  const contato = contatoUtilizavel(data?.contato)
  const email = textoOuNulo(contato?.email)
  const celular = textoOuNulo(contato?.celular)

  const linhaVaga = vaga ? (
    <p className="text-base text-white/80">{COPY_CONTATO.vaga(vaga)}</p>
  ) : null

  if (!email && !celular) {
    return (
      <div className="space-y-2">
        {linhaVaga}
        <p className="text-base text-white/80">{COPY_CONTATO.semContato}</p>
      </div>
    )
  }

  const hrefEmail = email ? montarMailto(email, assuntoEmail(vaga)) : null
  const numeroWhatsApp = celular ? normalizarCelularWhatsApp(celular) : null
  const hrefWhatsApp = numeroWhatsApp
    ? montarLinkWhatsApp(
        numeroWhatsApp,
        mensagemWhatsApp(primeiroNome(data?.cadastro?.nome_completo), vaga),
      )
    : null

  return (
    <div className="space-y-2">
      {linhaVaga}
      <div className="flex flex-wrap items-center gap-4">
        {email ? (
          <div className="flex flex-wrap items-center gap-2">
            <Mail className="h-4 w-4 text-white/70" aria-hidden="true" />
            <span className="text-base text-white/90 break-all">{email}</span>
            {hrefEmail ? (
              <a data-testid="hub-contato-email" href={hrefEmail} className={BOTAO_NEUTRO}>
                <Mail className="h-4 w-4" aria-hidden="true" />
                {COPY_CONTATO.enviarEmail}
              </a>
            ) : null}
          </div>
        ) : null}

        {celular ? (
          <div className="flex flex-wrap items-center gap-2">
            <Phone className="h-4 w-4 text-white/70" aria-hidden="true" />
            {hrefWhatsApp ? (
              <>
                <span className="text-base text-white/90">{formatarCelular(celular)}</span>
                <a
                  data-testid="hub-contato-whatsapp"
                  href={hrefWhatsApp}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={BOTAO_NEUTRO}
                >
                  <MessageCircle className="h-4 w-4" aria-hidden="true" />
                  {COPY_CONTATO.chamarWhatsApp}
                </a>
              </>
            ) : (
              <>
                {/* Inválido: o número cru, como gravado, e a explicação no lugar do botão
                    (Invariante 7 — botão que some explica por quê). */}
                <span className="text-base text-white/90 break-all">{celular}</span>
                <p className="text-sm text-white/70">{COPY_CONTATO.whatsappInvalido}</p>
              </>
            )}
          </div>
        ) : null}
      </div>
    </div>
  )
}
