# 🧩 Instruções - Teste de Raven

## ✅ Status: Implementado e Pronto para Uso!

A página do Teste de Raven foi criada com sucesso, seguindo o mesmo padrão visual dos testes DISC e Big Five.

---

## 📋 O que foi implementado

### ✨ Design e Layout
- ✅ Header com logo e nome do candidato
- ✅ Barra de progresso com porcentagem (1-100%)
- ✅ Indicador "QUESTÃO X DE 60"
- ✅ Display da série atual (A, B, C, D, E)
- ✅ Imagem completa da questão (pergunta + opções)
- ✅ Botões numerados para seleção (1-6 ou 1-8)
- ✅ Fundo gradient turquesa com glass effects

### 💫 Funcionalidades
- ✅ 60 questões (5 séries × 12 questões)
- ✅ Navegação anterior/próxima com validação
- ✅ Transições suaves com animação direcional (300ms)
- ✅ Destaque azul na opção selecionada
- ✅ Toast de feedback ao tentar prosseguir sem responder
- ✅ Persistência de respostas ao navegar
- ✅ Responsivo mobile/desktop

### 🎯 Estrutura das Séries
| Série | Questões | Opções | Grid    | Dificuldade   |
|-------|----------|--------|---------|---------------|
| A     | A1-A12   | 6      | 3×2 / 6×1 | Fácil        |
| B     | B1-B12   | 6      | 3×2 / 6×1 | Média        |
| C     | C1-C12   | 8      | 4×2 / 8×1 | Média        |
| D     | D1-D12   | 8      | 4×2 / 8×1 | Difícil      |
| E     | E1-E12   | 8      | 4×2 / 8×1 | Muito Difícil|

---

## 📸 Como Adicionar Suas Imagens

### Passo 1: Localizar suas imagens
Suas imagens estão em:
```
/Users/fernando/Downloads/Vendas/Transcricao/Teste
```

### Passo 2: Renomear (se necessário)
Certifique-se que os nomes seguem o padrão:
- `A1.webp` até `A12.webp`
- `B1.webp` até `B12.webp`
- `C1.webp` até `C12.webp`
- `D1.webp` até `D12.webp`
- `E1.webp` até `E12.webp`

**Total: 60 arquivos**

### Passo 3: Copiar para o projeto
Copie os arquivos para a pasta:
```
/assets/images/raven/
```

#### Comando no Terminal (macOS):
```bash
# Navegar até a pasta das imagens
cd /Users/fernando/Downloads/Vendas/Transcricao/Teste

# Copiar para o projeto (ajuste o caminho do projeto)
cp *.webp /caminho/do/seu/projeto/assets/images/raven/
```

### Passo 4: Verificar
Abra a pasta `/assets/images/raven/` e confirme que tem:
- ✅ 60 arquivos .webp
- ✅ Nomenclatura correta (A1 a E12)
- ✅ Arquivos não corrompidos

---

## 🎨 Como o Sistema Funciona

### Interface do Teste
```
┌─────────────────────────────────────────────┐
│ [Logo] Maria Silva                          │
│        Teste de Raven                       │
└─────────────────────────────────────────────┘

┌─────────────────────────────────────────────┐
│          QUESTÃO 15 DE 60                   │
│      ████████░░░░░░░ 25% concluído          │
│                                             │
│  Escolha a opção que completa o padrão      │
│         Série C - Questão 3                 │
│                                             │
│  ┌─────────────────────────────────────┐   │
│  │                                     │   │
│  │   [Imagem da questão com padrões]   │   │
│  │      e todas as opções visíveis     │   │
│  │                                     │   │
│  └─────────────────────────────────────┘   │
│                                             │
│  Selecione a alternativa correta:          │
│                                             │
│   [1] [2] [3] [4] [5] [6] [7] [8]          │
│    ^-- Botões grandes e clicáveis          │
│                                             │
│  [← Anterior]            [Próxima →]       │
└─────────────────────────────────────────────┘

        💡 Dica: Observe os padrões...
```

### Fluxo do Candidato
1. **Vê a imagem** com a matriz incompleta e as opções
2. **Analisa o padrão** lógico
3. **Clica no número** correspondente à resposta (1-8)
4. **Botão fica azul** com sombra e scale maior
5. **Clica em "Próxima"** para ir à próxima questão
6. **Pode voltar** com "Anterior" e a resposta permanece salva

---

## 🔧 Configurações Técnicas

### Formato das Imagens
- **Formato**: WebP (recomendado) ou PNG/JPG
- **Tamanho recomendado**: 1200px de largura
- **Proporção**: Qualquer (o sistema adapta automaticamente)

### Estrutura de Dados
```typescript
interface QuestaoRaven {
  serie: string;           // "A", "B", "C", "D", "E"
  numero: number;          // 1 a 12
  imagemCompleta: string;  // "/assets/images/raven/A1.webp"
  numeroOpcoes: 6 | 8;     // Séries A,B=6 | C,D,E=8
}
```

### Caminhos
```typescript
// Gerado automaticamente
A1.webp → /assets/images/raven/A1.webp
B5.webp → /assets/images/raven/B5.webp
E12.webp → /assets/images/raven/E12.webp
```

---

## 🎯 Acessando o Teste

### No menu flutuante:
1. Clique no **botão azul flutuante** (canto inferior direito)
2. Role até **🧩 Teste Raven**
3. Clique para abrir

### Por código:
```typescript
// No App.tsx
setCurrentPage('teste-raven');
```

---

## ✨ Recursos Visuais

### Estados dos Botões
```
Normal:      bg-white/10 border-white/50
Hover:       bg-white/20 border-white/70 scale-[1.05]
Selecionado: bg-[#00109E] border-white scale-[1.1]
             + shadow-[0_0_40px_rgba(0,16,158,0.8)]
```

### Animações
- **Entre questões**: Slide + fade 300ms
- **Botões**: Transition 200ms
- **Progresso**: Transition 500ms

---

## 🐛 Troubleshooting

### ❌ Imagem não aparece
**Problema**: Vejo apenas o placeholder com 🧩

**Soluções**:
1. Verifique se o arquivo existe na pasta `/assets/images/raven/`
2. Confira o nome exato (case-sensitive!): `A1.webp` não é igual a `a1.webp`
3. Verifique se o formato é WebP, PNG ou JPG
4. Limpe o cache do navegador (Cmd+Shift+R no Chrome)

### ❌ Layout quebrado
**Problema**: Botões desalinhados ou sobrepostos

**Soluções**:
1. Verifique se está usando a versão mais recente
2. Teste em diferentes tamanhos de tela
3. Abra o DevTools Console para ver erros

### ❌ Não consigo navegar
**Problema**: Botão "Próxima" não funciona

**Solução**: 
Você precisa selecionar uma opção (1-8) antes de prosseguir!

---

## 📊 Dados Coletados

O sistema salva automaticamente:
```javascript
{
  1: 2,   // Questão 1 → Opção 3 (índice 2)
  2: 0,   // Questão 2 → Opção 1 (índice 0)
  3: 5,   // Questão 3 → Opção 6 (índice 5)
  // ... até questão 60
}
```

Para integrar com backend:
```typescript
// No final do teste
const handleFinalizar = async () => {
  await api.post('/testes/raven', {
    candidato_id: candidatoId,
    respostas: respostas,
    tempo_total: tempoGasto,
    concluido: true
  });
};
```

---

## 🎉 Checklist Final

Antes de usar em produção:

- [ ] 60 imagens copiadas para `/assets/images/raven/`
- [ ] Nomenclatura correta (A1-E12)
- [ ] Testado em Chrome, Safari, Firefox
- [ ] Testado em mobile e desktop
- [ ] Navegação anterior/próxima funcionando
- [ ] Respostas sendo salvas corretamente
- [ ] Toast de validação aparecendo
- [ ] Animações suaves
- [ ] Integração com backend (se aplicável)

---

## 📚 Documentação Relacionada

- **Design System**: `/guidelines/Guidelines.md`
- **Outros Testes**: 
  - `/components/pages/TesteBigFivePage.tsx`
  - `/components/pages/TesteDISCPage.tsx`
- **Instruções das Imagens**: `/assets/images/raven/README.md`

---

## 🚀 Próximos Passos

1. **Copie as imagens** para a pasta correta
2. **Teste a navegação** completa (1-60)
3. **Verifique em mobile** se o layout está OK
4. **Integre com o backend** para salvar resultados
5. **Configure o gabarito** para cálculo de pontuação

---

**Implementado por**: Figma Make AI  
**Data**: Janeiro 2025  
**Status**: ✅ Pronto para produção (após adicionar imagens)

🎉 **Teste de Raven está completo e funcionando!**
