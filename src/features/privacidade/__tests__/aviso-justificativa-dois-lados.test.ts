/**
 * §7.22 do GUIA-VALIDACAO-FINAL — a cópia de dados entrega ao candidato o texto integral
 * que o recrutador escreveu (`candidaturas.etapa_justificativa`) e o `score_match`. É
 * DELIBERADO: a allowlist marca os dois como `inventario:preservar_com_ressalva`, porque
 * acesso (Art. 18, II) é mais amplo que explicação (Art. 20).
 *
 * O defeito nunca foi o conteúdo — era o silêncio nas duas pontas. A tela de privacidade
 * descrevia a cópia como «o resultado e a explicação das avaliações», e as telas que
 * escrevem a justificativa diziam ao recrutador que ela «fica registrada na trilha de
 * auditoria», o que soa interno. Um escreve sem saber quem lê; o outro abre o arquivo e
 * encontra mais do que a tela prometeu.
 *
 * Este portão vigia a SIMETRIA. Os testes de render existentes comparam a tela com a
 * própria constante — passam mesmo que a frase inteira suma. Aqui a asserção é sobre o
 * CONTEÚDO da promessa, que é o que envelhece.
 *
 * Veredito do responsável: manter a allowlist, avisar os dois lados. Se um dia a decisão
 * se inverter (tirar os campos da cópia), ESTE arquivo é o que deve ser reescrito junto —
 * um aviso que sobrevive à sua causa vira uma afirmação falsa.
 *
 * @see src/features/privacidade/services/exportacaoService.ts (lado do candidato)
 * @see src/features/triagem/constants/avisoJustificativa.ts (lado do recrutador)
 */
import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { COPY_PEDIR_COPIA } from '../services/exportacaoService'
import {
  AVISO_JUSTIFICATIVA_VISIVEL,
  PLACEHOLDER_JUSTIFICATIVA_VISIVEL,
} from '@/features/triagem/constants/avisoJustificativa'

describe('§7.22 — a cópia de dados é descrita nas DUAS pontas', () => {
  it('lado do candidato: «o que está na cópia» nomeia as anotações da equipe e as notas', () => {
    const texto = COPY_PEDIR_COPIA.oQueEsta.toLowerCase()
    // A anotação escrita por uma pessoa.
    expect(texto).toMatch(/anota(ç|c)(õ|o)es/)
    expect(texto).toContain('recrutamento')
    // E o número calculado pelo sistema.
    expect(texto).toMatch(/notas? que o sistema calculou/)
  })

  it('lado do candidato: a promessa não volta a ser só «o resultado e a explicação»', () => {
    // A frase antiga sobrevive como PRIMEIRA oração — o defeito era ela ser a ÚNICA.
    const antiga =
      'Seu cadastro, suas candidaturas, o que você autorizou, suas entrevistas agendadas, o histórico de cada candidatura, e o resultado e a explicação das avaliações que você fez.'
    expect(COPY_PEDIR_COPIA.oQueEsta).not.toBe(antiga)
    expect(COPY_PEDIR_COPIA.oQueEsta.length).toBeGreaterThan(antiga.length)
  })

  it('lado do recrutador: o aviso diz que o CANDIDATO baixa o texto, e cita o artigo', () => {
    expect(AVISO_JUSTIFICATIVA_VISIVEL).toMatch(/candidato/i)
    expect(AVISO_JUSTIFICATIVA_VISIVEL).toMatch(/baixar/i)
    expect(AVISO_JUSTIFICATIVA_VISIVEL).toMatch(/Art\. 18/)
    expect(PLACEHOLDER_JUSTIFICATIVA_VISIVEL).toMatch(/baix/i)
  })

  it('toda tela que escreve `etapa_justificativa` renderiza o aviso', () => {
    // A lista é um ESCOPO deliberado, não uma fotografia: são exatamente as duas telas
    // que coletam texto livre e o gravam em `candidaturas.etapa_justificativa` (o
    // Kanban não coleta justificativa — o trigger recusa a regressão e a tela manda o
    // usuário para o diálogo de retrocesso). Se nascer uma terceira, ela entra aqui.
    const telas = [
      'src/features/triagem/components/RejeitarCandidaturaDialog.tsx',
      'src/features/triagem/components/RetrocederCandidaturaDialog.tsx',
    ]
    for (const tela of telas) {
      const fonte = readFileSync(tela, 'utf-8')
      expect(fonte, `${tela} não avisa que a justificativa é visível`).toContain(
        'AVISO_JUSTIFICATIVA_VISIVEL',
      )
    }
  })

  it('a tela de DECISÃO FINAL não recebe o aviso — lá a justificativa é mesmo interna', () => {
    // `registrar_decisao` grava em `decisao_final`, e §7.22 mediu que a cópia sai SEM a
    // justificativa daquela tabela. Avisar ali seria afirmar uma exposição inexistente —
    // o erro simétrico ao que este portão conserta.
    const fonte = readFileSync(
      'src/features/decisao/components/RegistrarDecisaoForm.tsx',
      'utf-8',
    )
    expect(fonte).not.toContain('AVISO_JUSTIFICATIVA_VISIVEL')
  })
})
