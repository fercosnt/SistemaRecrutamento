/**
 * ConsentimentoSwitchRow — a linha de um consentimento REVOGÁVEL (CONSENT-04).
 *
 * É a primeira superfície deste sistema em que um consentimento coletado pode ser
 * desfeito pela própria pessoa. Quatro regras, nenhuma cosmética:
 *
 *  1. **O controle nunca antecipa o servidor** (Invariante 5 da 43-UI-SPEC). `valor` é
 *     estado CONFIRMADO; enquanto `pendente`, o switch fica desabilitado e continua
 *     mostrando o que o servidor disse por último. Uma interface dizendo "revogado"
 *     enquanto o servidor diz "concedido" é o defeito central deste milestone em
 *     miniatura. O componente **não tem estado interno de valor** — não há onde a
 *     antecipação morar.
 *  2. **Zero fricção para revogar** (Invariante 4). O `onAlternar` chama a escrita e
 *     pronto: nenhum diálogo, nenhum pedido de motivo, nenhum "tem certeza?", nenhuma
 *     contra-oferta, nenhum atraso artificial. Fricção sobre o exercício de um direito é
 *     dark pattern. Conceder é que exige o texto integral visível — daí a regra 3.
 *  3. **O texto do consentimento fica SEMPRE visível ao lado do controle**, quebrando
 *     livremente, nunca colapsado atrás de "ler mais" e nunca truncado: é ele que torna
 *     a concessão informada. Por isso 16px/1.5 (`text-base leading-relaxed`), a
 *     leitura de carga da §Typography, e não `text-sm`.
 *  4. **Colorblind-safe** (herdada do `ScoreCell` / T-34-04-03): o estado é dito em
 *     TEXTO ao lado do controle, nunca só pela posição do switch.
 *
 * O erro de escrita é ALERTA INLINE persistente (`role="alert"`), não toast — um toast
 * some em segundos e este é exatamente o caso em que a pessoa precisa saber que a
 * autorização dela NÃO mudou (E4 da 43-UI-SPEC).
 *
 * @module features/privacidade/components/ConsentimentoSwitchRow
 * @see .planning/phases/43-consentimentos-honestos-pol-tica-de-reten-o/43-UI-SPEC.md
 *      (§`/candidato/privacidade` · linha do marketing — copy verbatim)
 */
import { Loader2 } from 'lucide-react'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { formatarDataPtBr } from '../lib/datas'

/**
 * Copy verbatim da 43-UI-SPEC §`/candidato/privacidade` (linhas 480-490).
 *
 * Vive em `const` nomeado e não inline no JSX — Invariante 2: a string de consentimento
 * precisa de fonte única e grep-ável.
 */
export const COPY_CONSENTIMENTO_MARKETING = {
  rotulo: 'Avisos sobre novas vagas',
  corpo:
    'Receber por e-mail avisos sobre novas oportunidades na Beauty Smile, mesmo fora de um processo seletivo.',
  ativoDesde: (data: string) => `Ativo desde ${data}`,
  desativadoEm: (data: string) => `Desativado em ${data}`,
  desativado: 'Desativado',
  /**
   * O par SEM DATA de `desativado`. Autorada, porque a 43-UI-SPEC não previu o caso:
   * ela assume que todo `true` tem data. Uma linha com `updated_at` nulo ou
   * inparseável — o que uma linha migrada ou parcialmente escrita carrega — cai aqui.
   * Antes desta constante, o `true` sem data caía no `rotulo`, e a linha de estado
   * virava repetição literal do rótulo logo acima, sem dizer ligado nem desligado
   * (code review WR-08). O estado tem de ser DITO, é a regra 4.
   */
  ativo: 'Ativo',
  emVoo: 'Salvando…',
  erroTitulo: 'Não foi possível salvar esta mudança.',
  erroCorpo: 'Sua autorização continua como estava. Tente novamente.',
} as const

export interface ConsentimentoSwitchRowProps {
  /** id do controle, para o `htmlFor` do `Label`. */
  id: string
  rotulo: string
  corpo: string
  /** Estado CONFIRMADO pelo servidor. `null` = nunca autorizado (BD-5). */
  valor: boolean | null
  /** Timestamp ISO da última confirmação do servidor, para o rótulo de estado. */
  confirmadoEm: string | null
  /** Escrita em voo — o controle fica desabilitado e NUNCA mostra o estado desejado. */
  pendente: boolean
  /** `true` quando a última escrita falhou: alerta inline abaixo da linha. */
  erro: boolean
  onAlternar: (novoValor: boolean) => void
}

/**
 * O rótulo textual de estado. `null` (nunca autorizado) renderiza SEM data de propósito:
 * não houve ato a datar, e inventar uma data seria fabricar registro — o oposto do que
 * a BD-5 estabelece para toda a base histórica.
 */
function rotuloDeEstado(
  valor: boolean | null,
  confirmadoEm: string | null,
  pendente: boolean,
): string {
  if (pendente) return COPY_CONSENTIMENTO_MARKETING.emVoo

  const data = formatarDataPtBr(confirmadoEm)
  if (valor === true) {
    // O recuo SEM data é `ativo`, nunca o rótulo: a regra 4 exige que esta linha DIGA o
    // estado, e repetir o rótulo não diz ligado nem desligado.
    return data
      ? COPY_CONSENTIMENTO_MARKETING.ativoDesde(data)
      : COPY_CONSENTIMENTO_MARKETING.ativo
  }
  if (valor === false && data) {
    return COPY_CONSENTIMENTO_MARKETING.desativadoEm(data)
  }
  return COPY_CONSENTIMENTO_MARKETING.desativado
}

export function ConsentimentoSwitchRow({
  id,
  rotulo,
  corpo,
  valor,
  confirmadoEm,
  pendente,
  erro,
  onAlternar,
}: ConsentimentoSwitchRowProps) {
  // O `checked` vem do servidor e SÓ do servidor. Não existe `useState` aqui.
  const ativo = valor === true

  return (
    <div className="rounded-lg border border-white/15 bg-white/5 p-4">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 space-y-2">
          <Label
            htmlFor={id}
            className="block cursor-pointer text-sm font-semibold text-white"
          >
            {rotulo}
          </Label>
          {/* Leitura de carga: 16px/1.5, sempre visível, nunca truncada (regra 3). */}
          <p className="text-base leading-relaxed text-white/90">{corpo}</p>
          {/* Regra colorblind-safe: o estado é dito em texto, não só pela posição. */}
          <p className="text-sm font-semibold text-white/70">
            {rotuloDeEstado(valor, confirmadoEm, pendente)}
          </p>
        </div>

        <div className="flex min-h-[44px] shrink-0 items-center gap-2">
          {pendente && (
            <Loader2
              aria-hidden="true"
              className="h-4 w-4 animate-spin text-white/70"
            />
          )}
          <Switch
            id={id}
            checked={ativo}
            disabled={pendente}
            onCheckedChange={onAlternar}
          />
        </div>
      </div>

      {erro && (
        <div
          role="alert"
          className="mt-3 space-y-1 rounded-lg border border-destructive/40 bg-destructive/10 p-3"
        >
          <p className="text-sm font-semibold text-white">
            {COPY_CONSENTIMENTO_MARKETING.erroTitulo}
          </p>
          <p className="text-base leading-relaxed text-white/90">
            {COPY_CONSENTIMENTO_MARKETING.erroCorpo}
          </p>
        </div>
      )}
    </div>
  )
}
