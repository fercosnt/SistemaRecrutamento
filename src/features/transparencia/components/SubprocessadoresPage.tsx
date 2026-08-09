/** ⚠ ESQUELETO DE RED (Phase 47 / Plano 47-04 Task 2). O commit GREEN o substitui. */
import { SUBPROCESSADORES, type Subprocessador } from '../constants/subprocessadores'

export interface SubprocessadoresPageProps {
  readonly entradas?: readonly Subprocessador[]
}

export function SubprocessadoresPage({
  entradas = SUBPROCESSADORES,
}: SubprocessadoresPageProps = {}) {
  return <div data-entradas={entradas.length} />
}
