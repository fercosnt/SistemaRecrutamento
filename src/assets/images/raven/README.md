# 🧩 Imagens do Teste de Raven

## 📋 Instruções de Configuração

### 1. Copiar Imagens
Copie suas imagens do caminho local:
```
/Users/fernando/Downloads/Vendas/Transcricao/Teste
```

Para esta pasta:
```
/assets/images/raven/
```

### 2. Nomenclatura Esperada
As imagens devem seguir o padrão:
- `A1.webp` a `A12.webp` (Série A - 6 opções cada)
- `B1.webp` a `B12.webp` (Série B - 6 opções cada)
- `C1.webp` a `C12.webp` (Série C - 8 opções cada)
- `D1.webp` a `D12.webp` (Série D - 8 opções cada)
- `E1.webp` a `E12.webp` (Série E - 8 opções cada)

**Total: 60 imagens**

### 3. Formato
- ✅ **WebP** (recomendado - otimizado)
- ✅ **PNG** ou **JPG** (também funciona)

### 4. Comando para Copiar (macOS/Linux)

Se suas imagens já estão no formato correto:
```bash
cp /Users/fernando/Downloads/Vendas/Transcricao/Teste/*.webp /caminho/do/projeto/assets/images/raven/
```

### 5. Renomear em Lote (se necessário)

Se suas imagens não seguem a nomenclatura, você pode usar:

**macOS/Linux:**
```bash
cd /Users/fernando/Downloads/Vendas/Transcricao/Teste

# Exemplo: renomear arquivos
# Ajuste conforme o padrão atual dos seus arquivos
for file in *.webp; do
  # Seu código de renomeação aqui
  echo $file
done
```

## 📊 Estrutura do Teste

| Série | Questões | Opções | Dificuldade |
|-------|----------|--------|-------------|
| A     | 1-12     | 6      | Fácil       |
| B     | 1-12     | 6      | Média       |
| C     | 1-12     | 8      | Média       |
| D     | 1-12     | 8      | Difícil     |
| E     | 1-12     | 8      | Muito Difícil |

## ✅ Checklist

- [ ] 60 imagens copiadas para esta pasta
- [ ] Nomenclatura correta (A1.webp a E12.webp)
- [ ] Formato WebP ou PNG/JPG
- [ ] Imagens incluem pergunta + opções na mesma imagem
- [ ] Testado no navegador

## 🎯 Como Funciona no Sistema

1. O candidato vê a **imagem completa** (pergunta + todas as opções)
2. Abaixo aparecem **botões numerados** (1 a 6 ou 1 a 8)
3. O candidato clica no **número** correspondente à resposta
4. O botão selecionado fica **azul** com destaque

## 🔧 Troubleshooting

**Imagem não aparece?**
- Verifique o nome do arquivo (case-sensitive!)
- Verifique o formato (deve ser .webp, .png ou .jpg)
- Abra o DevTools e veja se há erros no console

**Imagem muito grande?**
- O sistema redimensiona automaticamente
- Mas é recomendado otimizar para ~1200px de largura

**Precisa converter PNG para WebP?**
```bash
# Instalar cwebp (macOS)
brew install webp

# Converter todas as imagens
for file in *.png; do
  cwebp -q 85 "$file" -o "${file%.png}.webp"
done
```

## 📱 Preview

Para testar:
1. Abra o sistema
2. Menu flutuante → 🧩 Teste Raven
3. Navegue pelas questões

---

**Dúvidas?** Verifique se todas as 60 imagens estão nesta pasta! 🎉
