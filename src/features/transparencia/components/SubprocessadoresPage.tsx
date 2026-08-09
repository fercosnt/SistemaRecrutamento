/**
 * SubprocessadoresPage — `/subprocessadores`, **Com quem compartilhamos os seus dados**
 * (TRANSP-01 · LGPD, Art. 18, VII).
 *
 * Rota 100% pública, sem sessão, mobile-first. Todo o conteúdo está no DOM inicial, em
 * texto: nada atrás de um clique, porque conteúdo colapsado é conteúdo que a maioria não
 * lê — e o critério desta fase diz "qualquer visitante lê".
 *
 * ── ZERO ESTADO ASSÍNCRONO, E ISSO É CONTRATO ───────────────────────────────
 * Import estático de constante versionada. Sem consulta, sem esqueleto de carregamento,
 * sem estado de erro, sem nova tentativa. Quem montar uma leitura de dados aqui "por
 * consistência com o resto do app" reabre exatamente a superfície anônima que o CONTEXT
 * desta fase rejeitou, e cria estados de tela que não têm como ser testados honestamente.
 *
 * ── A SHELL É CLONADA, NÃO INVENTADA ────────────────────────────────────────
 * Fundo em gradiente com sobreposição + container centrado com largura de leitura +
 * painel de vidro — o molde travado desde o M1 e usado pela página autenticada de
 * privacidade, que é a superfície-irmã de assunto. Largura de leitura, e não a largura
 * larga da página de manifesto: medida de linha larga é o que faz prosa jurídica ficar
 * ilegível.
 *
 * ── A PROP `entradas` ───────────────────────────────────────────────────────
 * Ela tem valor padrão e o padrão É o import estático — a página de produção não recebe
 * dado de lugar nenhum. A prop existe para que a lista de fichas seja testável com uma
 * entrada de texto longo e com uma entrada incompleta, que são dois dos três modos de
 * falha invisíveis em teste de texto.
 *
 * @see .planning/phases/47-transpar-ncia-consolida-o/47-UI-SPEC.md (§`/subprocessadores`)
 * @module features/transparencia/components/SubprocessadoresPage
 */
import { Link } from 'react-router-dom'

import { BackgroundImage } from '@/components/BackgroundImage'
import { BeautySmileLogo } from '@/components/BeautySmileLogo'
import { GlassPanel } from '@/components/ui/glass'

import { COPY_TRANSPARENCIA, formatarDataPtBr } from '../constants/copyTransparencia'
import {
  LISTA_MEDIDA_EM,
  SUBPROCESSADORES,
  validarSubprocessadores,
  type Subprocessador,
} from '../constants/subprocessadores'
import { SubprocessadorFicha } from './SubprocessadorFicha'

export interface SubprocessadoresPageProps {
  readonly entradas?: readonly Subprocessador[]
}

export function SubprocessadoresPage({
  entradas = SUBPROCESSADORES,
}: SubprocessadoresPageProps = {}) {
  const copy = COPY_TRANSPARENCIA.subprocessadores

  // Falha alta antes de qualquer pixel: lista vazia é falha de geração, e entrada
  // incompleta é omissão publicada. Nenhuma das duas é um estado de tela.
  const lista = validarSubprocessadores(entradas)
  const carimbo = `${copy.carimboPrefixo} ${formatarDataPtBr(LISTA_MEDIDA_EM)}.`

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
            <p className="text-sm font-semibold text-white/70">{carimbo}</p>

            <ul className="list-none space-y-4 border-t border-white/15 pt-6">
              {lista.map((entrada) => (
                <SubprocessadorFicha key={entrada.nome} entrada={entrada} />
              ))}
            </ul>

            <div className="border-t border-white/15 pt-6">
              <Link
                to="/privacidade"
                className="flex min-h-[44px] items-center text-base text-white/80 underline underline-offset-4"
              >
                {copy.linkPrivacidade}
              </Link>
            </div>
          </GlassPanel>
        </div>
      </BackgroundImage>
    </div>
  )
}
