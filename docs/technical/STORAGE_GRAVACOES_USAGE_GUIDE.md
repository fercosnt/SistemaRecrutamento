# Guia de Configuração: Storage Transcrições de Entrevistas

**Bucket ID:** `gravacoes-entrevistas`
**Status:** ✅ Bucket configurado | ✅ RLS Policies configuradas
**Data:** 2025-11-03
**Atualização:** 2025-11-03 (ajustado para transcrições)

---

## 📦 Informações do Bucket

- **Tipo:** Privado (não acessível publicamente)
- **Tamanho máximo por arquivo:** 10 MB
- **Formatos permitidos:**
  - text/plain (.txt)
  - application/json (.json)
  - application/pdf (.pdf)
  - text/markdown (.md)
  - application/vnd.openxmlformats-officedocument.wordprocessingml.document (.docx)

---

## 🎯 Caso de Uso

Este bucket armazena **transcrições de entrevistas** (presencial e online), não gravações de vídeo.

### Dois Métodos de Uso:

**OPÇÃO 1: Colar Texto (Transcrição Curta)**
- RH cola texto diretamente no campo de texto
- Salvo em: `entrevistas_online.transcricao` ou `entrevistas_presenciais.transcricao` (campo TEXT)
- Ideal para: Notas rápidas, resumos, transcrições curtas (< 5000 caracteres)
- Sem upload para Storage

**OPÇÃO 2: Upload de Arquivo (Transcrição Completa)**
- RH faz upload de arquivo com transcrição detalhada/formatada
- Salvo em: Storage bucket `gravacoes-entrevistas`
- Referência em: `entrevistas_online.gravacao_url` ou `entrevistas_presenciais.gravacao_url`
- Ideal para: Transcrições longas, formatadas, com timestamps (JSON), PDFs gerados

---

## 🔐 RLS Policies - Já Configuradas ✅

As 4 RLS policies foram criadas manualmente no Supabase Dashboard e estão funcionando corretamente:

1. **RH pode fazer upload de gravações 1vgveb6_0** (INSERT)
2. **RH pode ler gravações 1vgveb6_0** (SELECT)
3. **Apenas Admin pode atualizar gravações 1vgveb6_0** (UPDATE)
4. **Apenas Admin pode deletar gravações 1vgveb6_0** (DELETE)

**Dashboard:** https://supabase.com/dashboard/project/isljnozzlvckrgjjbjwp/storage/policies

---

## 📁 Estrutura de Pastas

```
gravacoes-entrevistas/
└── {candidato_id}/
    └── {entrevista_id}/
        └── transcricao.{ext}
```

### Exemplos:
```
gravacoes-entrevistas/
└── 550e8400-e29b-41d4-a716-446655440000/
    └── 7c9e6679-7425-40de-944b-e07fc1f90ae7/
        ├── transcricao.txt         (texto puro)
        ├── transcricao.json        (com timestamps/metadados)
        ├── transcricao.pdf         (formatado para impressão)
        └── transcricao.docx        (Word editável)
```

---

## 💻 Uso no Backend

### Upload de Transcrição (JavaScript/TypeScript)

```typescript
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

async function uploadTranscricao(
  candidatoId: string,
  entrevistaId: string,
  file: File,
  tipoEntrevista: 'online' | 'presencial'
) {
  // 1. Validar tamanho (10 MB máximo)
  const MAX_SIZE = 10 * 1024 * 1024 // 10 MB
  if (file.size > MAX_SIZE) {
    throw new Error('Arquivo muito grande. Máximo: 10 MB')
  }

  // 2. Validar formato
  const allowedTypes = [
    'text/plain',
    'application/json',
    'application/pdf',
    'text/markdown',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ]
  if (!allowedTypes.includes(file.type)) {
    throw new Error('Formato não permitido. Use: TXT, JSON, PDF, Markdown ou DOCX')
  }

  // 3. Definir path do arquivo
  const fileExtension = file.name.split('.').pop()
  const filePath = `${candidatoId}/${entrevistaId}/transcricao.${fileExtension}`

  // 4. Upload para Storage
  const { data, error } = await supabase.storage
    .from('gravacoes-entrevistas')
    .upload(filePath, file, {
      cacheControl: '3600',
      upsert: false // Não sobrescrever se existir
    })

  if (error) throw error

  // 5. Obter URL privada (válida por 1 hora)
  const { data: urlData } = await supabase.storage
    .from('gravacoes-entrevistas')
    .createSignedUrl(filePath, 3600) // 1 hora

  // 6. Atualizar campo na tabela apropriada
  const tabela = tipoEntrevista === 'online'
    ? 'entrevistas_online'
    : 'entrevistas_presenciais'

  await supabase
    .from(tabela)
    .update({
      gravacao_url: data.path,
      gravacao_tamanho_mb: (file.size / (1024 * 1024)).toFixed(2)
    })
    .eq('id', entrevistaId)

  return {
    path: data.path,
    signedUrl: urlData.signedUrl
  }
}
```

### Salvar Texto Colado (Sem Upload)

```typescript
async function salvarTranscricaoTexto(
  entrevistaId: string,
  transcricaoTexto: string,
  tipoEntrevista: 'online' | 'presencial'
) {
  // 1. Validar tamanho do texto (recomendado: < 10000 caracteres)
  if (transcricaoTexto.length > 10000) {
    console.warn('Texto muito longo. Considere fazer upload de arquivo.')
  }

  // 2. Atualizar campo TEXT na tabela
  const tabela = tipoEntrevista === 'online'
    ? 'entrevistas_online'
    : 'entrevistas_presenciais'

  const { error } = await supabase
    .from(tabela)
    .update({
      transcricao: transcricaoTexto
    })
    .eq('id', entrevistaId)

  if (error) throw error

  return { success: true }
}
```

### Download de Transcrição (Signed URL)

```typescript
async function getTranscricaoUrl(
  candidatoId: string,
  entrevistaId: string,
  tipoEntrevista: 'online' | 'presencial',
  expiresIn: number = 3600 // 1 hora por padrão
) {
  // Buscar path da transcrição
  const tabela = tipoEntrevista === 'online'
    ? 'entrevistas_online'
    : 'entrevistas_presenciais'

  const { data: entrevista } = await supabase
    .from(tabela)
    .select('gravacao_url')
    .eq('id', entrevistaId)
    .single()

  if (!entrevista?.gravacao_url) {
    throw new Error('Transcrição não encontrada')
  }

  // Gerar URL assinada temporária
  const { data, error } = await supabase.storage
    .from('gravacoes-entrevistas')
    .createSignedUrl(entrevista.gravacao_url, expiresIn)

  if (error) throw error

  return data.signedUrl
}
```

### Deletar Transcrição (Apenas Admin)

```typescript
async function deletarTranscricao(
  entrevistaId: string,
  tipoEntrevista: 'online' | 'presencial'
) {
  const tabela = tipoEntrevista === 'online'
    ? 'entrevistas_online'
    : 'entrevistas_presenciais'

  // 1. Buscar path da transcrição
  const { data: entrevista } = await supabase
    .from(tabela)
    .select('gravacao_url')
    .eq('id', entrevistaId)
    .single()

  if (!entrevista?.gravacao_url) {
    throw new Error('Transcrição não encontrada')
  }

  // 2. Deletar do Storage (apenas Admin pode fazer isso)
  const { error: deleteError } = await supabase.storage
    .from('gravacoes-entrevistas')
    .remove([entrevista.gravacao_url])

  if (deleteError) throw deleteError

  // 3. Limpar campos na tabela
  await supabase
    .from(tabela)
    .update({
      gravacao_url: null,
      gravacao_tamanho_mb: null
    })
    .eq('id', entrevistaId)

  return { success: true }
}
```

---

## 🖥️ Implementação no Frontend

### Página: Visualização do Candidato (RH)

**Localização:** Página do candidato → Abas "Entrevista Presencial" e "Entrevista Online"

#### Opção 1: Campo de Texto (Colar)

```typescript
// Componente React exemplo
const TranscricaoTextArea = ({ entrevistaId, tipoEntrevista }) => {
  const [transcricao, setTranscricao] = useState('')

  const handleSave = async () => {
    await salvarTranscricaoTexto(entrevistaId, transcricao, tipoEntrevista)
    toast.success('Transcrição salva com sucesso!')
  }

  return (
    <div>
      <label>Transcrição da Entrevista</label>
      <textarea
        value={transcricao}
        onChange={(e) => setTranscricao(e.target.value)}
        rows={10}
        placeholder="Cole aqui a transcrição da entrevista..."
      />
      <button onClick={handleSave}>Salvar Transcrição</button>
      <p className="text-sm text-gray-500">
        Dica: Para transcrições longas ou formatadas, use o upload de arquivo
      </p>
    </div>
  )
}
```

#### Opção 2: Upload de Arquivo

```typescript
// Componente React exemplo
const TranscricaoUpload = ({ candidatoId, entrevistaId, tipoEntrevista }) => {
  const [uploading, setUploading] = useState(false)

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setUploading(true)
    try {
      await uploadTranscricao(candidatoId, entrevistaId, file, tipoEntrevista)
      toast.success('Transcrição enviada com sucesso!')
    } catch (error) {
      toast.error(error.message)
    } finally {
      setUploading(false)
    }
  }

  return (
    <div>
      <label>Upload de Transcrição</label>
      <input
        type="file"
        accept=".txt,.json,.pdf,.md,.docx"
        onChange={handleFileUpload}
        disabled={uploading}
      />
      <p className="text-sm text-gray-500">
        Formatos: TXT, JSON, PDF, Markdown, DOCX (máx. 10 MB)
      </p>
    </div>
  )
}
```

---

## 🔒 Segurança

### Princípios Aplicados

1. **Bucket Privado:** Arquivos não são acessíveis publicamente
2. **RH pode upload/visualizar:** Usuários RH ativos podem gerenciar transcrições
3. **Admin pode deletar:** Apenas Administradores podem excluir transcrições
4. **Candidato não acessa:** Nenhuma policy permite acesso de candidatos
5. **URLs temporárias:** Use Signed URLs com expiração curta (1-24 horas)

### Compliance e LGPD

- **Retenção:** Implementar política de exclusão após 1 ano do processo finalizado
- **Justificativa:** Documentar motivo de exclusão quando necessário
- **Acesso limitado:** Apenas usuários RH e Admin
- **Audit trail:** Registrar acessos/exclusões no `historico_acoes`
- **Dados sensíveis:** Transcrições podem conter informações pessoais - tratar com cuidado

---

## ⚠️ Notas Importantes

1. **Validação de tamanho:** SEMPRE validar no backend antes de enviar ao Storage
2. **Formatos suportados:** TXT, JSON, PDF, Markdown, DOCX apenas
3. **Signed URLs:** Usar para acesso temporário (1-24 horas)
4. **Texto vs Arquivo:**
   - Texto curto (< 5000 chars): campo TEXT no banco
   - Texto longo/formatado: upload de arquivo para Storage
5. **Cleanup:** Implementar job para deletar transcrições antigas (LGPD)
6. **Performance:** Transcrições são leves (KB a poucos MB)
7. **Formatação:** JSON é ideal para transcrições com timestamps e metadados

---

## 📊 Exemplos de Formatos

### Exemplo 1: Texto Simples (.txt)

```
Entrevista realizada em 03/11/2025 às 14:30

Candidato: João Silva
Entrevistador: Maria Santos (RH)
Vaga: Desenvolvedor Full Stack

Pergunta 1: Fale sobre sua experiência com React
Resposta: Trabalho com React há 3 anos...

[...]
```

### Exemplo 2: JSON com Timestamps

```json
{
  "metadata": {
    "candidato": "João Silva",
    "entrevistador": "Maria Santos",
    "data": "2025-11-03T14:30:00Z",
    "duracao_minutos": 45
  },
  "transcricao": [
    {
      "timestamp": "00:00:30",
      "speaker": "entrevistador",
      "texto": "Fale sobre sua experiência com React"
    },
    {
      "timestamp": "00:00:45",
      "speaker": "candidato",
      "texto": "Trabalho com React há 3 anos..."
    }
  ],
  "tags": ["react", "frontend", "typescript"]
}
```

### Exemplo 3: Markdown (.md)

```markdown
# Transcrição da Entrevista

**Candidato:** João Silva
**Entrevistador:** Maria Santos (RH)
**Data:** 03/11/2025
**Vaga:** Desenvolvedor Full Stack

---

## Perguntas Técnicas

### 1. Experiência com React
> Trabalho com React há 3 anos...

### 2. Conhecimento em TypeScript
> Tenho experiência sólida...

---

## Avaliação Geral
- ✅ Comunicação: Excelente
- ✅ Conhecimento técnico: Muito bom
- ⚠️ Inglês: Intermediário
```

---

## 🧪 Testes

### Checklist de Validação

- [x] Bucket criado e configurado para transcrições
- [x] 4 RLS policies criadas no Dashboard
- [ ] RH consegue fazer upload de transcrição (< 10 MB)
- [ ] RH consegue colar texto no campo TEXT
- [ ] RH consegue visualizar transcrição (Signed URL válida)
- [ ] Admin consegue deletar transcrição
- [ ] Candidato NÃO consegue acessar transcrição (403 Forbidden)
- [ ] Tentativa de upload > 10 MB falha com erro
- [ ] Tentativa de upload com formato inválido (.exe, .mp4) falha com erro
- [ ] Signed URL expira após tempo definido
- [ ] Frontend permite escolher entre colar texto OU fazer upload

---

## 📝 Próximos Passos

### Imediato (P0)
1. ✅ Criar bucket `gravacoes-entrevistas`
2. ✅ Atualizar configuração para transcrições (MIME types, 10 MB)
3. ✅ Configurar 4 RLS policies no Dashboard
4. ⏳ Implementar upload no frontend (página candidato → abas entrevistas)
5. ⏳ Testar upload/colar com usuário RH
6. ⏳ Validar que candidato não acessa

### Futuro (P1)
1. Implementar política de retenção (1 ano)
2. Implementar audit trail para acessos/exclusões
3. Adicionar suporte para upload múltiplo (várias versões da transcrição)
4. Implementar preview de PDF/DOCX no frontend
5. Adicionar search/indexação de transcrições (Postgres Full Text Search)

---

**Dashboard Storage:** https://supabase.com/dashboard/project/isljnozzlvckrgjjbjwp/storage/buckets
**Script Migration:** [35-storage-gravacoes-entrevistas.sql](sql/35-storage-gravacoes-entrevistas.sql)
**Status:** ✅ Bucket configurado | ✅ Policies configuradas | ⏳ Frontend pendente
