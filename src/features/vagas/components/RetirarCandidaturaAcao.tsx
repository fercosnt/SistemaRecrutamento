/**
 * RetirarCandidaturaAcao — sair de UMA vaga sem apagar nada (ERASE-05).
 *
 * ⚠ ESTE ARQUIVO ESTÁ EM ESTADO **RED** (TDD). A copy é real; o render é `null`.
 * A implementação chega no commit GREEN seguinte.
 *
 * @module features/vagas/components/RetirarCandidaturaAcao
 */

/** Copy verbatim da 45-UI-SPEC (§`/candidato/dashboard` · Retirar minha candidatura). */
export const COPY_RETIRAR_CANDIDATURA = {
  acao: 'Retirar minha candidatura',
  emVoo: 'Retirando…',
  motivoEmVoo: 'Estamos registrando a retirada da sua candidatura.',
  titulo: (tituloVaga: string) => `Retirar sua candidatura para ${tituloVaga}?`,
  vagaSemTitulo: 'esta vaga',
  paragrafo1: 'Você sai deste processo seletivo agora. A equipe de recrutamento é avisada.',
  paragrafo2:
    'Seus dados continuam com a Beauty Smile. Isto não é o mesmo que apagar seus dados — apagar é outra coisa, e fica na página Seus dados e autorizações.',
  paragrafo3: 'Se quiser participar desta vaga de novo, será preciso se candidatar novamente.',
  confirmar: 'Sim, retirar minha candidatura',
  recuar: 'Voltar',
  estadoApos: (data: string) => `Você retirou sua candidatura em ${data}.`,
  erro: 'Não foi possível retirar sua candidatura. Tente novamente em instantes.',
} as const

export interface RetirarCandidaturaAcaoProps {
  candidaturaId: string
  tituloVaga?: string | null
  encerradaEm?: string | null
  emAndamento: boolean
}

export function RetirarCandidaturaAcao(_props: RetirarCandidaturaAcaoProps) {
  return null
}
