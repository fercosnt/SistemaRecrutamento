# Guia de Uso: Storage Bucket Raven Imagens

**Bucket:** `raven-imagens`
**Status:** ✅ CRIADO E CONFIGURADO
**Data:** 2025-11-03

---

## 📋 Configuração do Bucket

### Informações Gerais
- **Nome:** raven-imagens
- **ID:** raven-imagens
- **Público:** ✅ Sim (acesso sem autenticação)
- **Tamanho máximo:** 500 KB por arquivo
- **Tipos permitidos:** `image/png`, `image/webp`
- **URL Base:** https://isljnozzlvckrgjjbjwp.supabase.co

---

## 🗂️ Estrutura de Arquivos e Nomenclatura

### Convenção de Nomenclatura
- **Matriz:** `{SÉRIE}{QUESTÃO}.webp`
- **Opções:** `{SÉRIE}{QUESTÃO}.{OPÇÃO}.webp`

### Mapeamento de Séries
- **Série A:** Questões 1-12 → Arquivos A1.webp até A12.webp
- **Série B:** Questões 13-24 → Arquivos B1.webp até B12.webp
- **Série C:** Questões 25-36 → Arquivos C1.webp até C12.webp
- **Série D:** Questões 37-48 → Arquivos D1.webp até D12.webp
- **Série E:** Questões 49-60 → Arquivos E1.webp até E12.webp

### Estrutura de Arquivos
```
raven-imagens/
├── versao-1/
│   ├── A1.webp                 (Matriz série A, questão 1)
│   ├── A1.1.webp               (Opção 1 da questão A1)
│   ├── A1.2.webp               (Opção 2 da questão A1)
│   ├── A1.3.webp
│   ├── A1.4.webp
│   ├── A1.5.webp
│   ├── A1.6.webp               (Série A geralmente tem 6 opções)
│   ├── A2.webp                 (Matriz série A, questão 2)
│   ├── A2.1.webp
│   ├── ...
│   ├── A12.webp                (Última questão da série A)
│   ├── A12.1.webp
│   ├── ...
│   ├── B1.webp                 (Primeira questão da série B)
│   ├── B1.1.webp
│   ├── ...
│   ├── E12.webp                (Última questão - número 60)
│   ├── E12.1.webp
│   ├── ...
│   └── E12.8.webp              (Séries E podem ter até 8 opções)
└── versao-2/
    └── ... (para futuras versões das questões)
```

**Nota:** O número de opções varia conforme a série:
- Séries A e B: Geralmente 6 opções
- Séries C, D e E: Podem ter 6 ou 8 opções

---

## 🔗 URLs das Imagens

### Formato Padrão
```
https://isljnozzlvckrgjjbjwp.supabase.co/storage/v1/object/public/raven-imagens/{path}
```

### Exemplos de URLs
```
# Matriz da questão 1 (Série A), versão 1
https://isljnozzlvckrgjjbjwp.supabase.co/storage/v1/object/public/raven-imagens/versao-1/A1.webp

# Opção 1 da questão 1 (Série A), versão 1
https://isljnozzlvckrgjjbjwp.supabase.co/storage/v1/object/public/raven-imagens/versao-1/A1.1.webp

# Matriz da questão 13 (Série B, questão local 1), versão 1
https://isljnozzlvckrgjjbjwp.supabase.co/storage/v1/object/public/raven-imagens/versao-1/B1.webp

# Matriz da questão 60 (Série E, questão local 12), versão 1
https://isljnozzlvckrgjjbjwp.supabase.co/storage/v1/object/public/raven-imagens/versao-1/E12.webp
```

---

## 🔐 Permissões (RLS Policies)

### ✅ Políticas Aplicadas

1. **"Público pode ler imagens Raven"** (SELECT)
   - Qualquer pessoa (autenticada ou não) pode visualizar as imagens
   - Método: GET/HEAD
   - Acesso: `public`

2. **"Admin pode fazer upload imagens Raven"** (INSERT)
   - Apenas usuários com `role='administrador'` podem fazer upload
   - Requer: Autenticação + `usuarios_rh.role = 'administrador'`

3. **"Admin pode atualizar imagens Raven"** (UPDATE)
   - Apenas administradores podem atualizar imagens existentes
   - Requer: Autenticação + `usuarios_rh.role = 'administrador'`

4. **"Admin pode deletar imagens Raven"** (DELETE)
   - Apenas administradores podem deletar imagens
   - Requer: Autenticação + `usuarios_rh.role = 'administrador'`

---

## 📤 Upload de Imagens (JavaScript/TypeScript)

### 1. Configurar Cliente Supabase

```javascript
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://isljnozzlvckrgjjbjwp.supabase.co',
  'YOUR_SUPABASE_ANON_KEY' // Obter via mcp__supabase__get_anon_key
);
```

### 2. Helper Functions

```javascript
/**
 * Converte número da questão (1-60) em série e questão local
 * @param {number} numeroQuestao - Número da questão (1-60)
 * @returns {{serie: string, questaoLocal: number}}
 */
function getSerieQuestao(numeroQuestao) {
  const seriesMap = ['A', 'B', 'C', 'D', 'E'];
  const serie = seriesMap[Math.floor((numeroQuestao - 1) / 12)];
  const questaoLocal = ((numeroQuestao - 1) % 12) + 1;
  return { serie, questaoLocal };
}

/**
 * Faz upload da imagem da matriz de uma questão Raven
 * @param {File} file - Arquivo de imagem WebP
 * @param {number} versao - Versão da questão (1, 2, ...)
 * @param {number} numeroQuestao - Número da questão (1-60)
 * @returns {Promise<string>} URL pública da imagem
 */
async function uploadRavenMatriz(file, versao, numeroQuestao) {
  // Validar tamanho (max 500KB)
  if (file.size > 512000) {
    throw new Error('Arquivo muito grande! Máximo: 500KB');
  }

  // Validar tipo MIME
  if (file.type !== 'image/webp') {
    throw new Error('Tipo de arquivo inválido! Use WebP');
  }

  // Construir path: versao-1/A1.webp
  const { serie, questaoLocal } = getSerieQuestao(numeroQuestao);
  const filename = `${serie}${questaoLocal}.webp`;
  const path = `versao-${versao}/${filename}`;

  // Upload com cache agressivo
  const { data, error } = await supabase.storage
    .from('raven-imagens')
    .upload(path, file, {
      cacheControl: '31536000', // Cache de 1 ano
      upsert: false, // Não sobrescrever se já existe
      contentType: 'image/webp'
    });

  if (error) throw error;

  // Obter URL pública
  const { data: { publicUrl } } = supabase.storage
    .from('raven-imagens')
    .getPublicUrl(path);

  return publicUrl;
}

/**
 * Faz upload de uma opção de resposta de uma questão Raven
 * @param {File} file - Arquivo de imagem WebP
 * @param {number} versao - Versão da questão (1, 2, ...)
 * @param {number} numeroQuestao - Número da questão (1-60)
 * @param {number} opcao - Número da opção (1-6 ou 1-8)
 * @returns {Promise<string>} URL pública da imagem
 */
async function uploadRavenOpcao(file, versao, numeroQuestao, opcao) {
  // Validar tamanho (max 500KB)
  if (file.size > 512000) {
    throw new Error('Arquivo muito grande! Máximo: 500KB');
  }

  // Validar tipo MIME
  if (file.type !== 'image/webp') {
    throw new Error('Tipo de arquivo inválido! Use WebP');
  }

  // Construir path: versao-1/A1.1.webp
  const { serie, questaoLocal } = getSerieQuestao(numeroQuestao);
  const filename = `${serie}${questaoLocal}.${opcao}.webp`;
  const path = `versao-${versao}/${filename}`;

  // Upload com cache agressivo
  const { data, error } = await supabase.storage
    .from('raven-imagens')
    .upload(path, file, {
      cacheControl: '31536000', // Cache de 1 ano
      upsert: false,
      contentType: 'image/webp'
    });

  if (error) throw error;

  // Obter URL pública
  const { data: { publicUrl } } = supabase.storage
    .from('raven-imagens')
    .getPublicUrl(path);

  return publicUrl;
}
```

### 3. Exemplo de Uso Completo

```javascript
// Upload de todas as imagens de uma questão
async function uploadQuestaoCompleta(versao, numeroQuestao, arquivos) {
  try {
    // Upload da matriz
    const matrizUrl = await uploadRavenMatriz(
      arquivos.matriz,
      versao,
      numeroQuestao
    );

    // Upload das opções (6 ou 8, dependendo da série)
    const opcoesUrls = await Promise.all(
      arquivos.opcoes.map((file, index) =>
        uploadRavenOpcao(file, versao, numeroQuestao, index + 1)
      )
    );

    // Determinar série para a questão
    const { serie } = getSerieQuestao(numeroQuestao);

    // Inserir questão no banco com as URLs
    const { data, error } = await supabase
      .from('questoes_raven')
      .insert({
        numero_questao: numeroQuestao,
        versao: versao,
        serie: serie, // A, B, C, D ou E (já obtido no início)
        imagem_matriz_url: matrizUrl,
        opcoes_imagens: JSON.stringify(opcoesUrls),
        resposta_correta: arquivos.respostaCorreta // 1-6 ou 1-8
      });

    if (error) throw error;

    const { serie: serieNome, questaoLocal } = getSerieQuestao(numeroQuestao);
    console.log(`✓ Questão ${numeroQuestao} (${serieNome}${questaoLocal}) criada com sucesso!`);
    return data;
  } catch (error) {
    console.error('Erro ao fazer upload:', error.message);
    throw error;
  }
}
```

### 4. Upload em Lote (Todas as 60 questões)

```javascript
async function uploadTodasQuestoes(versao, questoesData) {
  const progressCallback = (atual, total) => {
    console.log(`Progresso: ${atual}/${total} questões`);
  };

  for (let i = 0; i < questoesData.length; i++) {
    const questao = questoesData[i];
    await uploadQuestaoCompleta(versao, questao.numero, questao.arquivos);
    progressCallback(i + 1, questoesData.length);
  }

  console.log('✓ Todas as 60 questões foram carregadas!');
}
```

---

## 📥 Obter URLs das Imagens

### Obter URL Pública Diretamente

```javascript
// Sem necessidade de autenticação (bucket é público)
const { data } = supabase.storage
  .from('raven-imagens')
  .getPublicUrl('versao-1/q1/matriz.png');

console.log(data.publicUrl);
// https://isljnozzlvckrgjjbjwp.supabase.co/storage/v1/object/public/raven-imagens/versao-1/q1/matriz.png
```

### Buscar Questão com Imagens

```javascript
async function buscarQuestaoComImagens(numeroQuestao) {
  const { data, error } = await supabase
    .from('questoes_raven')
    .select('*')
    .eq('numero_questao', numeroQuestao)
    .eq('versao', 1)
    .eq('deleted_at', null)
    .single();

  if (error) throw error;

  return {
    id: data.id,
    numero: data.numero_questao,
    serie: data.serie,
    matrizUrl: data.imagem_matriz_url,
    opcoes: JSON.parse(data.opcoes_imagens), // Array de 8 URLs
    respostaCorreta: data.resposta_correta
  };
}
```

---

## 🎨 Otimização de Imagens

### Recomendações

1. **Formato:**
   - Preferir WebP (melhor compressão, ~30% menor que PNG)
   - Fallback para PNG (compatibilidade universal)

2. **Dimensões:**
   - Matrizes: 800x600px (proporção 4:3)
   - Opções: 200x200px (quadradas)

3. **Compressão:**
   - WebP: qualidade 85-90
   - PNG: usar pngquant ou ImageOptim

4. **Ferramentas:**
   ```bash
   # Converter para WebP
   cwebp -q 85 input.png -o output.webp

   # Otimizar PNG
   pngquant --quality=65-80 input.png
   ```

5. **Tamanho Alvo:**
   - Matrizes: 50-150 KB
   - Opções: 10-30 KB cada
   - Máximo permitido: 500 KB

---

## 🚀 Cache e Performance

### Headers de Cache

As imagens são servidas com cache agressivo:

```
Cache-Control: public, max-age=31536000, immutable
```

**Significado:**
- `public`: Pode ser cacheado por qualquer cache (CDN, browser)
- `max-age=31536000`: Cache válido por 1 ano (365 dias)
- `immutable`: Indica que o recurso nunca mudará

### Estratégia de Versionamento

Se precisar atualizar uma imagem:
1. NÃO sobrescreva a imagem existente
2. Crie uma nova versão da questão
3. Faça upload em `versao-2/q1/matriz.png`
4. Atualize a tabela `questoes_raven` com versão 2

---

## 🧪 Testando o Bucket

### Teste de Acesso Público (cURL)

```bash
# Teste se o bucket está acessível publicamente
curl -I https://isljnozzlvckrgjjbjwp.supabase.co/storage/v1/object/public/raven-imagens/versao-1/q1/matriz.png

# Resposta esperada:
# HTTP/2 200 (se a imagem existe)
# HTTP/2 404 (se não existe ainda - normal)
```

### Teste de Upload (JavaScript)

```javascript
// Teste rápido de upload (requer autenticação de admin)
async function testeUpload() {
  // Criar uma imagem de teste (1x1 pixel PNG)
  const testBlob = new Blob(
    [atob('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==')],
    { type: 'image/png' }
  );
  const testFile = new File([testBlob], 'test.png', { type: 'image/png' });

  try {
    const url = await uploadRavenImage(testFile, 1, 999, 'matriz');
    console.log('✓ Upload bem-sucedido!');
    console.log('URL:', url);

    // Limpar teste
    await supabase.storage
      .from('raven-imagens')
      .remove(['versao-1/q999/matriz.png']);

    console.log('✓ Teste finalizado e limpeza concluída');
  } catch (error) {
    console.error('✗ Teste falhou:', error.message);
  }
}
```

---

## 📊 Monitoramento

### Verificar Imagens Armazenadas

```javascript
// Listar todos os arquivos no bucket
async function listarImagens() {
  const { data, error } = await supabase.storage
    .from('raven-imagens')
    .list('versao-1', {
      limit: 1000,
      sortBy: { column: 'name', order: 'asc' }
    });

  if (error) throw error;

  console.log(`Total de pastas/arquivos: ${data.length}`);
  return data;
}

// Estatísticas de uso
async function estatisticasBucket() {
  const { data: bucketInfo } = await supabase
    .rpc('get_bucket_size', { bucket_name: 'raven-imagens' });

  console.log('Tamanho total:', bucketInfo.size_bytes / 1024, 'KB');
  console.log('Total de arquivos:', bucketInfo.file_count);
}
```

---

## ⚠️ Troubleshooting

### Erro: "Bucket não encontrado"
```javascript
// Verificar se bucket existe
const { data: buckets } = await supabase.storage.listBuckets();
console.log(buckets.find(b => b.name === 'raven-imagens'));
```

### Erro: "Permissão negada ao fazer upload"
- Certifique-se de estar autenticado como usuário com `role='administrador'`
- Verifique: `SELECT * FROM usuarios_rh WHERE id = auth.uid();`

### Erro: "Arquivo muito grande"
- Verifique tamanho: `console.log(file.size / 1024, 'KB')`
- Comprima a imagem antes do upload

### Erro: "MIME type não permitido"
- Apenas PNG e WebP são aceitos
- Verifique: `console.log(file.type)`

---

## 📚 Referências

- **Migration Storage:** [26-storage-raven-imagens.sql](sql/26-storage-raven-imagens.sql)
- **Documentação Supabase Storage:** https://supabase.com/docs/guides/storage
- **Supabase Storage API:** https://supabase.com/docs/reference/javascript/storage-from
- **Relatório de Validação:** [VALIDATION_REPORT_PRD-DB-003.md](VALIDATION_REPORT_PRD-DB-003.md)

---

**Bucket criado em:** 2025-11-03 11:26:11
**Status:** ✅ PRONTO PARA USO
**Próximo passo:** Fazer upload das 60 questões Raven (540 imagens no total)
