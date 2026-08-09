/**
 * PrivacidadePublicaPage — `/privacidade`, **Privacidade: o que guardamos, por quanto tempo
 * e por quê** (TRANSP-02 · LGPD, Art. 9º e Art. 18).
 *
 * Rota 100% pública, sem sessão, mobile-first. Todo o conteúdo está no DOM inicial, em
 * texto: nada atrás de um clique, porque conteúdo colapsado é conteúdo que a maioria não
 * lê — e o critério desta fase diz "qualquer visitante lê".
 *
 * ── O CARIMBO DE VIGÊNCIA É A PRIMEIRA DAS TRÊS TRAVAS ──────────────────────
 * O artefato que alimenta o bloco de prazos é escrito no BUILD; a matriz que ele espelha é
 * editável em PRODUÇÃO. Um administrador consegue encurtar uma janela pela tela dele e o
 * artefato não muda junto — no instante seguinte, esta página estaria afirmando uma
 * política que deixou de valer. As três travas, e nenhuma substitui as outras:
 *
 *   1. o carimbo aqui, com a data da MEDIÇÃO da matriz viva (nunca a data do build), no
 *      tamanho de rótulo e logo abaixo do subtítulo;
 *   2. o portão do repositório (`check:matriz-retencao`, plano 47-01), que reprova quando
 *      a fonte declarada e o artefato divergem;
 *   3. a frase acrescentada à confirmação do diálogo do administrador (plano 47-06 / Task
 *      3), que é a ÚNICA coisa no sistema capaz de avisar quem acabou de mudar a política.
 *
 * Sem a terceira, as duas primeiras só enxergam a metade do problema que não acontece na
 * prática: a divergência dentro do repositório. A que acontece de verdade nasce numa tela
 * de administrador, em produção.
 *
 * ── DATA AUSENTE É FALHA DE GERAÇÃO, NÃO ESTADO DE TELA ─────────────────────
 * `formatarDataPtBr` LANÇA quando a data de medição falta ou não analisa. A página nunca
 * renderiza um carimbo pela metade: um carimbo de vigência sem data é a burocracia sem a
 * informação que a justifica.
 *
 * ── ZERO ESTADO ASSÍNCRONO, E ISSO É CONTRATO ───────────────────────────────
 * Import estático de constante gerada. Sem consulta, sem esqueleto de carregamento, sem
 * estado de erro, sem nova tentativa. Quem montar uma leitura de dados aqui "por
 * consistência com o resto do app" reabre exatamente a superfície anônima que o CONTEXT
 * desta fase rejeitou.
 *
 * ── ESTA PÁGINA NÃO É A PÁGINA AUTENTICADA DE PRIVACIDADE ───────────────────
 * `/candidato/privacidade` fala DOS DADOS DE QUEM ESTÁ LOGADO, com ações reais. Esta fala
 * da POLÍTICA, e não tem ação nenhuma além de links. Ela APONTA para a outra; não a absorve,
 * não a duplica e não a edita.
 *
 * @see .planning/phases/47-transpar-ncia-consolida-o/47-UI-SPEC.md (§`/privacidade`)
 * @module features/transparencia/components/PrivacidadePublicaPage
 */
import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'

import { BackgroundImage } from '@/components/BackgroundImage'
import { BeautySmileLogo } from '@/components/BeautySmileLogo'
import { GlassPanel } from '@/components/ui/glass'
import { ENCARREGADO_EMAIL } from '@/features/privacidade/constants/encarregado'

import { COPY_TRANSPARENCIA, formatarDataPtBr } from '../constants/copyTransparencia'
import { MATRIZ_RETENCAO } from '../constants/matrizRetencao.generated'
import { MatrizRetencaoPublica } from './MatrizRetencaoPublica'
import { RetencaoIndeterminadaLista } from './RetencaoIndeterminadaLista'

/** Uma ficha da matriz de retenção, na forma que a página consome do artefato gerado. */
export interface FichaRetencao {
  readonly etapa: string
  readonly rotulo: string
  readonly janela_meses: number
  readonly finalidade: string
  readonly base_legal: string
}

/**
 * A forma ESTRUTURAL do artefato gerado da matriz.
 *
 * O artefato real é literal (`as const`); esta forma é a estrutural, e é ela que torna
 * possível provar por fixture que a página LANÇA quando a data de medição falta — com o
 * tipo literal, uma fixture sem data nem compilaria, e a propriedade ficaria sem prova.
 */
export interface MatrizPublicada {
  readonly etapas: readonly FichaRetencao[]
  readonly meta: { readonly medido_em: string }
}

export interface PrivacidadePublicaPageProps {
  /**
   * Tem valor padrão e o padrão É o import estático — a página de produção não recebe dado
   * de lugar nenhum. A propriedade existe para que a falha alta do carimbo seja provável
   * por fixture, que é o modo de falha invisível num teste de texto.
   */
  readonly matriz?: MatrizPublicada
}

/** Uma seção da página: separador, cabeçalho real e o conteúdo dela. */
function Bloco({ titulo, children }: { titulo: string; children: ReactNode }) {
  return (
    <section className="space-y-4 border-t border-white/15 pt-6">
      <h2 className="text-xl font-semibold text-white">{titulo}</h2>
      {children}
    </section>
  )
}

const CLASSE_LINK =
  'flex min-h-[44px] items-center text-base text-white/80 underline underline-offset-4'

export function PrivacidadePublicaPage({
  matriz = MATRIZ_RETENCAO,
}: PrivacidadePublicaPageProps = {}) {
  const copy = COPY_TRANSPARENCIA.privacidade

  // Falha alta antes de qualquer pixel: sem data de medição não há o que carimbar.
  const carimbo = `${copy.carimboPrefixo} ${formatarDataPtBr(matriz.meta.medido_em)}.`

  return (
    <div className="relative min-h-screen">
      <BackgroundImage
        background="gradient"
        className="min-h-screen py-20"
        overlayColor="bg-black"
        overlayOpacity={15}
      >
        <div className="container mx-auto mt-8 max-w-2xl px-4">
          <div className="mb-8 flex justify-center">
            {/* Uma página que descreve tratamento de dados sem marca identificável é uma
                página que não identifica o controlador. */}
            <BeautySmileLogo type="vertical" variant="white" size="md" className="drop-shadow-lg" />
          </div>

          <GlassPanel variant="white" blur="xl" className="space-y-6 text-white">
            <h1 className="text-3xl font-semibold drop-shadow-md md:text-4xl">{copy.h1}</h1>
            <p className="text-base leading-relaxed text-white/90">{copy.subtitulo}</p>
            {/* Tamanho de RÓTULO e logo abaixo do subtítulo. Nunca no rodapé, nunca no
                menor tamanho da tela: é o único lugar desta página em que 14px carrega
                informação de peso jurídico. */}
            <p className="text-sm font-semibold text-white/70">{carimbo}</p>

            {/* Os dois blocos DERIVADOS: o de prazos vem do artefato gerado da matriz, o
                de o-que-fica vem do recibo que a Phase 45 já gera. Nenhum dos dois é
                redigido à mão, e é isso que os mantém honestos quando a política muda. */}
            <Bloco titulo={copy.matriz.titulo}>
              <MatrizRetencaoPublica etapas={matriz.etapas} />
            </Bloco>

            <Bloco titulo={copy.fica.titulo}>
              <p className="text-base leading-relaxed text-white/90">{copy.fica.abertura}</p>
              <RetencaoIndeterminadaLista />
            </Bloco>

            <Bloco titulo={copy.compartilhamos.titulo}>
              <p className="text-base leading-relaxed text-white/90">{copy.compartilhamos.corpo}</p>
              <Link to="/subprocessadores" className={CLASSE_LINK}>
                {copy.compartilhamos.link}
              </Link>
            </Bloco>

            <Bloco titulo={copy.direitos.titulo}>
              <p className="text-base leading-relaxed text-white/90">{copy.direitos.corpo}</p>
              <p className="text-base leading-relaxed text-white/90">
                {copy.direitos.autoatendimento}
              </p>
              <Link to="/candidato/privacidade" className={CLASSE_LINK}>
                {copy.direitos.linkAutenticada}
              </Link>
              <p className="text-base leading-relaxed text-white/90">
                {copy.direitos.canalHumano}{' '}
                {/* O endereço vem da constante canônica do módulo de constante — nunca um
                    literal novo. Dois endereços divergentes em duas páginas de privacidade
                    é precisamente o defeito que uma constante única impede. */}
                <span data-canal="encarregado" className="font-semibold text-white">
                  {ENCARREGADO_EMAIL}
                </span>
              </p>
            </Bloco>

            <Bloco titulo={copy.comoEFeita.titulo}>
              <p className="text-base leading-relaxed text-white/90">{copy.comoEFeita.corpo}</p>
            </Bloco>
          </GlassPanel>
        </div>
      </BackgroundImage>
    </div>
  )
}
