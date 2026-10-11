/**
 * TextoComLinks — texto do candidato com os links `http(s)` clicáveis, por segmento
 * (Phase 52 / Plan 52-24; D-20; UI-SPEC Invariantes 5 e 6; T-52-27..29).
 *
 * Um `string` vira nó de texto React; um `{ href }` de `segmentosComLinks` vira `<a>` em aba nova
 * com `rel="noopener noreferrer"` e `aria-label` «{url} (abre em nova aba)». Nada de
 * HTML cru injetado no DOM: marcação digitada pelo candidato aparece literal. Usado pelas
 * «Respostas da inscrição» e pelo LinkedIn/Instagram de «Dados do cadastro» — uma regra só.
 *
 * @module features/hub-candidato/components/TextoComLinks
 */
import { Fragment } from 'react'
import { ExternalLink } from 'lucide-react'
import { segmentosComLinks } from '../lib/linkify'

const LINK = 'underline underline-offset-2 break-all text-white'

export function TextoComLinks({ texto }: { texto: string }) {
  return (
    <>
      {segmentosComLinks(texto).map((s, i) =>
        typeof s === 'string' ? (
          <Fragment key={i}>{s}</Fragment>
        ) : (
          <a
            key={i}
            href={s.href}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={`${s.href} (abre em nova aba)`}
            className={LINK}
          >
            {s.href}
            <ExternalLink className="ml-1 inline h-4 w-4 align-text-bottom" aria-hidden="true" />
          </a>
        ),
      )}
    </>
  )
}
