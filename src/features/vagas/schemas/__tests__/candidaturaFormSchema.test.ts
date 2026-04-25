/**
 * Wave 0 STUB — flesh out in Plan 04-04.
 * Coverage target: 100% of zodForType + buildCandidaturaSchema.
 */
import { describe, it } from 'vitest'

describe('candidaturaFormSchema (Wave 0 stub — Plan 04-04)', () => {
  describe('zodForType', () => {
    it.skip('T1.1: texto_curto obrigatoria empty fails (Plan 04-04)', () => {})
    it.skip('T1.2: texto_curto with limite_caracteres enforces max (Plan 04-04)', () => {})
    it.skip('T1.3: texto_longo same as texto_curto (Plan 04-04)', () => {})
    it.skip('T1.4: numerico with valor_minimo/maximo bounds (Plan 04-04)', () => {})
    it.skip('T1.5: numerico optional when not obrigatoria (Plan 04-04)', () => {})
    it.skip('T1.6: single_choice from opcoes via z.enum (Plan 04-04)', () => {})
    it.skip('T1.7: single_choice with permite_outros relaxes to z.string (Plan 04-04)', () => {})
    it.skip('T1.8: multiple_choice obrigatoria min 1 (Plan 04-04)', () => {})
    it.skip('T1.9: multiple_choice empty allowed when not obrigatoria (Plan 04-04)', () => {})
  })
  describe('buildCandidaturaSchema', () => {
    it.skip('T2.1: empty perguntas list returns object with curriculo only (D-14, Plan 04-04)', () => {})
    it.skip('T2.2: mixed perguntas validates real input (Plan 04-04)', () => {})
  })
})
