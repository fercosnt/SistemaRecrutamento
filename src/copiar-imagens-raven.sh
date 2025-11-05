#!/bin/bash

# ============================================
# Script para copiar imagens do Teste Raven
# ============================================

echo "🧩 Copiando imagens do Teste de Raven..."
echo ""

# Caminhos
ORIGEM="/Users/fernando/Downloads/Vendas/Transcricao/Teste/images2"
DESTINO="assets/images/raven"

# Verificar se a pasta de origem existe
if [ ! -d "$ORIGEM" ]; then
  echo "❌ Erro: Pasta de origem não encontrada!"
  echo "   Caminho: $ORIGEM"
  exit 1
fi

# Criar pasta de destino se não existir
mkdir -p "$DESTINO"

# Copiar TODOS os arquivos
echo "📂 Copiando de: $ORIGEM"
echo "📂 Para: $DESTINO"
echo ""

cp -v "$ORIGEM"/* "$DESTINO/" 2>/dev/null

# Contar arquivos copiados
TOTAL=$(ls "$DESTINO" | grep -E '\.(webp|png|jpg|jpeg)$' | wc -l | tr -d ' ')

echo ""
echo "========================================"
echo "✅ Processo concluído!"
echo "📊 Total de imagens: $TOTAL"
echo ""
echo "🔍 Arquivos copiados:"
ls -1 "$DESTINO" | grep -E '\.(webp|png|jpg|jpeg)$'
echo ""

if [ $TOTAL -eq 60 ]; then
  echo "🎉 Perfeito! Todas as 60 imagens foram copiadas!"
else
  echo "⚠️  Esperado: 60 imagens"
  echo "   Encontrado: $TOTAL imagens"
fi

echo ""
echo "🚀 Agora você pode testar no navegador!"
echo "   Menu → 🧩 Teste Raven"
