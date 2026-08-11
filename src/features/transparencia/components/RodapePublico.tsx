/**
 * RodapePublico — a **alcançabilidade** das duas páginas públicas de transparência
 * (TRANSP-01 · TRANSP-02).
 *
 * ── O QUE ELE É ─────────────────────────────────────────────────────────────
 * Dois links, e o trabalho deles é um só: fazer `/privacidade` e `/subprocessadores`
 * serem **encontradas**. As duas rotas já existiam registradas e inalcançáveis — o
 * critério desta fase diz *"qualquer visitante lê"*, e uma rota que nenhuma navegação
 * alcança satisfaz "existe" e falha "qualquer visitante lê" com todo o código escrito.
 *
 * O precedente enganoso mora ao lado: a rota de manifesto é referenciada em exatamente
 * dois lugares — a entrada de rota e o menu de navegação de desenvolvimento, gateado por
 * variável de ambiente. **Nenhuma navegação de produção leva a ela.** Ela é precedente de
 * ROTA, não de alcançabilidade, e copiá-la entregaria duas páginas que ninguém encontra.
 *
 * E o modo de falha já foi pago uma vez nesta aplicação, em 2026-08-03: uma tela sem a
 * barra compartilhada deixou quem caía nela sem caminho até a revogação do próprio
 * consentimento. O custo não é hipotético.
 *
 * ── O QUE ELE NÃO É, E ESTA LISTA É CONTRATO ────────────────────────────────
 * **Não** é um rodapé institucional. São proibidos aqui, nominalmente: marca ou logotipo,
 * endereço, telefone, rede social, texto de direitos autorais, boletim de notícias,
 * formulário de contato e **qualquer terceiro link**. Cada item a mais dilui exatamente os
 * dois que o critério de sucesso da fase exige — a pressão natural sobre um rodapé é ele
 * crescer, e é por isso que a proibição está escrita aqui, onde a próxima pessoa que
 * quiser "completar" o rodapé vai ler antes de editar.
 *
 * ── AS DUAS PROPRIEDADES QUE UM TESTE DE TEXTO NÃO VÊ ───────────────────────
 * 1. **O piso de alvo tátil em CADA link.** Uma âncora de texto corrido tem cerca de 20px
 *    de altura; o piso deste projeto é 44px. O piso vive no próprio elemento acionável e
 *    a caixa é `flex` de propósito: `min-height` numa âncora `inline` é ignorado pelo CSS,
 *    e a classe sozinha passaria em qualquer asserção enquanto o polegar continuaria
 *    errando o alvo.
 * 2. **Nunca fixo, nunca grudado, nunca sobreposto.** Um rodapé grudado comeria dobra numa
 *    tela de 320px — numa superfície mobile-first, isso é conteúdo perdido para ganhar um
 *    rodapé que ninguém pediu.
 *
 * Zero estado, zero consulta, zero renderização assíncrona: são dois links estáticos para
 * rotas estáticas. Um destino quebrado aqui é erro de rota, não estado de tela.
 *
 * @see .planning/phases/47-transpar-ncia-consolida-o/47-UI-SPEC.md (§`RodapePublico`)
 * @module features/transparencia/components/RodapePublico
 */
import { Link } from 'react-router-dom'

import { COPY_TRANSPARENCIA } from '../constants/copyTransparencia'

export function RodapePublico() {
  const copy = COPY_TRANSPARENCIA.rodape

  return (
    <nav
      aria-label={copy.rotuloNavegacao}
      data-rodape="publico"
      className="mt-6 flex flex-col gap-4 border-t border-white/15 pt-6 sm:flex-row"
    >
      {/* ⚠ O tratamento é repetido de propósito, não extraído para uma constante: o piso
          de alvo tátil é a propriedade mais frágil desta fase, e um portão de fonte que
          conte as ocorrências dele precisa encontrar UMA POR LINK. Uma constante
          compartilhada deixaria o portão vendo uma só, e o dia em que alguém acrescentar
          um link sem o piso passaria despercebido pela contagem. */}
      <Link
        to="/privacidade"
        className="flex min-h-[44px] items-center text-base text-white/80 underline underline-offset-4"
      >
        {copy.privacidade}
      </Link>
      <Link
        to="/subprocessadores"
        className="flex min-h-[44px] items-center text-base text-white/80 underline underline-offset-4"
      >
        {copy.subprocessadores}
      </Link>
    </nav>
  )
}
