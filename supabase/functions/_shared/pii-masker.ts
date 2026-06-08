/**
 * `_shared/pii-masker.ts` — Mascaramento de PII (PT-BR) para logs.
 *
 * Fase 9 / Plano 09-04 — IA-02 / LGPD-04 / RESEARCH Pitfall 6.
 *
 * Utilitario PURO (sem DB, sem SDK, sem rede). Composto pelo audit-logger
 * (Plano 05) ANTES de qualquer escrita em ai_call_logs, garantindo que nenhum
 * dado pessoal bruto do candidato alcance um registro persistido.
 *
 * Regras PT-BR cobertas: CPF, CNPJ, email, telefone, data de nascimento,
 * endereco (logradouro + numero) e RG. Conforme AUDITORIA-LGPD §5.3, NAO
 * mascara competencias, nomes de empresas nem cargos — essas informacoes sao
 * necessarias para a avaliacao comportamental/cognitiva e nao sao PII direta.
 *
 * Contrato (RED test 09-01 pii-masker.test.ts):
 *   maskPII(text) -> { masked: string; placeholders: string[] }
 * onde `placeholders` e a lista (com repeticao por ocorrencia) dos rotulos
 * aplicados, servindo de trilha de auditoria do que foi removido.
 *
 * @see docs/conhecimento/prompts/templates/08-edge-function-reference.ts (PII_RULES)
 * @see docs/conhecimento/prompts/AUDITORIA-LGPD-LOGGING-VERSIONING.md §5
 */

interface PiiRule {
  /** Rotulo do placeholder, ex.: "[CPF]". */
  placeholder: string;
  /** Regex global (flag g obrigatoria) que casa o padrao de PII. */
  regex: RegExp;
}

/**
 * Ordem importa: padroes mais longos/especificos vem antes para evitar que um
 * padrao mais curto consuma parte de um numero maior (ex.: CNPJ antes de CPF,
 * CPF antes de RG). Cada regex usa a flag `g` para mascarar todas as ocorrencias.
 */
const PII_RULES: PiiRule[] = [
  // CNPJ: 14 digitos com separadores opcionais (00.000.000/0000-00).
  { placeholder: "[CNPJ]", regex: /\b\d{2}\.?\d{3}\.?\d{3}\/\d{4}-?\d{2}\b/g },
  // CPF: 11 digitos com separadores opcionais (000.000.000-00).
  { placeholder: "[CPF]", regex: /\b\d{3}\.?\d{3}\.?\d{3}-\d{2}\b/g },
  // Email.
  { placeholder: "[EMAIL]", regex: /\b[\w._%+-]+@[\w.-]+\.[a-z]{2,}\b/gi },
  // Data de nascimento: dd/mm/yyyy (sec. 19xx/20xx).
  { placeholder: "[DATA_NASC]", regex: /\b\d{2}\/\d{2}\/(?:19|20)\d{2}\b/g },
  // Telefone BR: DDD opcional entre parenteses + 4-5 + 4 digitos.
  { placeholder: "[TELEFONE]", regex: /\(?\d{2}\)?\s?\d{4,5}-?\d{4}\b/g },
  // Endereco: logradouro (Rua/Av/Avenida/Alameda/Travessa/Praca/Rod.) + numero.
  {
    placeholder: "[ENDERECO]",
    regex: /\b(?:Rua|Av\.?|Avenida|Alameda|Travessa|Pra[cç]a|Rod\.?|Rodovia)\s+[\wÀ-ÿ\s]+,\s*\d+/gi,
  },
  // RG: 8 digitos com separadores opcionais e digito verificador (00.000.000-0).
  // Roda DEPOIS de CPF/CNPJ para nao casar prefixos de numeros maiores.
  { placeholder: "[RG]", regex: /\b\d{2}\.?\d{3}\.?\d{3}-[\dxX]\b/g },
];

/**
 * Remove PII PT-BR de um texto, substituindo cada ocorrencia pelo placeholder
 * correspondente. Retorna o texto mascarado e a lista de placeholders aplicados.
 *
 * Funcao pura: nao registra logs, nao acessa rede e nao lanca excecoes.
 */
export function maskPII(text: string): { masked: string; placeholders: string[] } {
  const placeholders: string[] = [];
  let masked = text;

  for (const rule of PII_RULES) {
    // Reset do lastIndex (regex global e stateful entre chamadas .test/.exec).
    rule.regex.lastIndex = 0;
    masked = masked.replace(rule.regex, () => {
      placeholders.push(rule.placeholder);
      return rule.placeholder;
    });
  }

  return { masked, placeholders };
}
