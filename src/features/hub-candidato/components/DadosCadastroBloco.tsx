/**
 * DadosCadastroBloco — a ficha «Dados do cadastro» na aba «Cadastro e inscrição» do hub do RH
 * (Phase 52 / Plan 52-10; JORN-54; G-51-OP1, D-08, D-09, D-40, D-52-U18).
 *
 * TUDO direto, sem «Mostrar dados pessoais» (D-08; a decisão do operador sobre os alertas —
 * D-03, idade × Lei 9.029/95 — está mantida e não é reaberta aqui). Os dados chegam por props,
 * vindos do `useCadastroCandidatoRh` (EF `ler-cadastro-candidato-rh`, com linha de log — D-11);
 * este componente não lê nada por conta própria.
 *
 * - Campo ausente → «Não informado» (a palavra é o dado; `text-white/60`). Nunca `—`/`null`.
 * - Celular sempre como TEXTO PURO, para todo registro — inclusive o fictício/anonimizado, que o
 *   52-09 entrega com `email: null` e o celular gravado. A ação de contato é só do cabeçalho
 *   (52-23), que para esses registros não a oferece (D-40). Nenhum link nem botão aqui.
 * - LinkedIn/Instagram passam por `segmentosComLinks` (52-24, D-20): uma URL `http(s)` vira link em
 *   aba nova (`TextoComLinks`); sem esquema (`www.…`, `@nome`) ou com outro esquema → texto.
 * - Todo valor é nó de texto React em `<dd>` — sem `dangerouslySetInnerHTML` (T-52-71).
 *
 * @module features/hub-candidato/components/DadosCadastroBloco
 * @see .planning/phases/52-hub-do-rh-dados-e-contato/52-UI-SPEC.md (§Aba «Cadastro e inscrição»)
 */
import type {
  DadosCadastroRh,
  DisponibilidadeRh,
} from '../services/cadastroCandidatoRhService'
import { formatarCelular } from '../lib/contato'
import {
  formatarCep,
  formatarCpf,
  formatarNascimento,
  inicioDisponibilidade,
  rotuloComoConheceu,
  rotuloGenero,
  rotuloModeloTrabalho,
  rotuloTurno,
} from '../lib/formatos'
import { TextoComLinks } from './TextoComLinks'

/** Rótulos e frases da ficha — uma fonte só, testável. */
export const COPY_DADOS_CADASTRO = {
  titulo: 'Dados do cadastro',
  vazio: 'Não há dados de cadastro disponíveis para esta candidatura.',
  naoInformado: 'Não informado',
  endereco: 'Endereço',
  disponibilidade: 'Disponibilidade',
  rotulos: {
    nome: 'Nome completo',
    email: 'E-mail',
    celular: 'Celular',
    cpf: 'CPF',
    nascimento: 'Data de nascimento',
    genero: 'Gênero',
    comoConheceu: 'Como conheceu a vaga',
    comoConheceuDetalhes: 'Detalhes de como conheceu',
    linkedin: 'LinkedIn',
    instagram: 'Instagram',
    cep: 'CEP',
    logradouro: 'Logradouro',
    numero: 'Número',
    complemento: 'Complemento',
    bairro: 'Bairro',
    cidade: 'Cidade',
    uf: 'UF',
    turno: 'Turno preferido',
    modeloTrabalho: 'Modelo de trabalho',
    inicio: 'Início',
  },
} as const

/** Mesmo marcador do motor de exclusão e dos fictícios (lib/contato.ts). */
const DOMINIO_SEM_CONTATO = '@invalido.local'

const GRADE = 'grid gap-4 sm:grid-cols-2'
const DT = 'text-sm font-semibold text-white/70'
const DD = 'text-base text-white/90 leading-relaxed break-words'
const DD_AUSENTE = 'text-base text-white/60 leading-relaxed break-words'
const H3 = 'text-base font-semibold text-white'

export interface DadosCadastroBlocoProps {
  /** O cadastro do candidato (`null` = sem cadastro legível, ex.: tombstone de anonimização). */
  cadastro: DadosCadastroRh | null
  /** A linha mais recente de `disponibilidade` (`null` = sem linha). */
  disponibilidade: DisponibilidadeRh | null
  /** A data de referência da idade (D-09). Padrão: agora. Parâmetro para teste. */
  hoje?: Date
}

/** Texto aparado, ou `null` se vazio. */
function texto(v: string | null | undefined): string | null {
  const t = (v ?? '').trim()
  return t ? t : null
}

/** E-mail exibível: um `@invalido.local` que chegue mesmo assim conta como ausente. */
function emailExibivel(v: string | null): string | null {
  const t = texto(v)
  if (t && t.toLowerCase().endsWith(DOMINIO_SEM_CONTATO)) return null
  return t
}

function Par({
  rotulo,
  valor,
  quebraTudo = false,
  comLinks = false,
}: {
  rotulo: string
  valor: string | null
  quebraTudo?: boolean
  /** 52-24 (D-20): o valor passa por `segmentosComLinks` — só `http(s)` vira link. */
  comLinks?: boolean
}) {
  const ausente = valor === null
  const classe = ausente ? DD_AUSENTE : quebraTudo ? `${DD} break-all` : DD
  return (
    <div className="space-y-1">
      <dt className={DT}>{rotulo}</dt>
      <dd className={classe}>
        {ausente ? COPY_DADOS_CADASTRO.naoInformado : comLinks ? <TextoComLinks texto={valor} /> : valor}
      </dd>
    </div>
  )
}

export function DadosCadastroBloco({
  cadastro,
  disponibilidade,
  hoje = new Date(),
}: DadosCadastroBlocoProps) {
  if (!cadastro) {
    return <p className="text-base text-white/80">{COPY_DADOS_CADASTRO.vazio}</p>
  }

  const R = COPY_DADOS_CADASTRO.rotulos
  const celular = texto(cadastro.celular)
  const cpf = texto(cadastro.cpf)
  const nascimento = texto(cadastro.data_nascimento)
  const genero = texto(cadastro.genero)
  const comoConheceu = texto(cadastro.como_conheceu)
  const detalhes = texto(cadastro.como_conheceu_detalhes)
  const cep = texto(cadastro.cep)
  const turno = texto(disponibilidade?.periodo_disponivel)
  const modelo = texto(disponibilidade?.regime_trabalho)

  return (
    <div data-testid="hub-dados-cadastro" className="space-y-6">
      <dl className={GRADE}>
        <Par rotulo={R.nome} valor={texto(cadastro.nome_completo)} />
        <Par rotulo={R.email} valor={emailExibivel(cadastro.email)} quebraTudo />
        <Par rotulo={R.celular} valor={celular ? formatarCelular(celular) : null} />
        <Par rotulo={R.cpf} valor={cpf ? formatarCpf(cpf) : null} />
        <Par rotulo={R.nascimento} valor={nascimento ? formatarNascimento(nascimento, hoje) : null} />
        <Par rotulo={R.genero} valor={genero ? rotuloGenero(genero) : null} />
        <Par rotulo={R.comoConheceu} valor={comoConheceu ? rotuloComoConheceu(comoConheceu) : null} />
        {detalhes ? <Par rotulo={R.comoConheceuDetalhes} valor={detalhes} /> : null}
        <Par
          rotulo={R.linkedin}
          valor={texto(cadastro.linkedin_url) ?? texto(cadastro.linkedin)}
          quebraTudo
          comLinks
        />
        <Par
          rotulo={R.instagram}
          valor={texto(cadastro.instagram_url) ?? texto(cadastro.instagram)}
          quebraTudo
          comLinks
        />
      </dl>

      <div className="space-y-4">
        <h3 className={H3}>{COPY_DADOS_CADASTRO.endereco}</h3>
        <dl className={GRADE}>
          <Par rotulo={R.cep} valor={cep ? formatarCep(cep) : null} />
          <Par rotulo={R.logradouro} valor={texto(cadastro.logradouro)} />
          <Par rotulo={R.numero} valor={texto(cadastro.numero)} />
          <Par rotulo={R.complemento} valor={texto(cadastro.complemento)} />
          <Par rotulo={R.bairro} valor={texto(cadastro.bairro)} />
          <Par rotulo={R.cidade} valor={texto(cadastro.cidade)} />
          <Par rotulo={R.uf} valor={texto(cadastro.estado)} />
        </dl>
      </div>

      <div className="space-y-4">
        <h3 className={H3}>{COPY_DADOS_CADASTRO.disponibilidade}</h3>
        <dl className={GRADE}>
          <Par rotulo={R.turno} valor={turno ? rotuloTurno(turno) : null} />
          <Par rotulo={R.modeloTrabalho} valor={modelo ? rotuloModeloTrabalho(modelo) : null} />
          <Par
            rotulo={R.inicio}
            valor={inicioDisponibilidade(
              disponibilidade?.disponibilidade_imediata ?? null,
              disponibilidade?.data_disponibilidade ?? null,
            )}
          />
        </dl>
      </div>
    </div>
  )
}
