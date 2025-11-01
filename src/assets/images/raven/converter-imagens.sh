#!/bin/bash

# ============================================
# Script para converter e organizar imagens
# do Teste de Raven para o sistema
# ============================================

echo "🧩 Conversor de Imagens - Teste de Raven"
echo "========================================"
echo ""

# Configurações
ORIGEM="/Users/fernando/Downloads/Vendas/Transcricao/Teste"
DESTINO="$(pwd)"

echo "📂 Origem: $ORIGEM"
echo "📂 Destino: $DESTINO"
echo ""

# Verificar se a pasta de origem existe
if [ ! -d "$ORIGEM" ]; then
  echo "❌ Erro: Pasta de origem não encontrada!"
  echo "   Verifique o caminho: $ORIGEM"
  exit 1
fi

# Contador
count=0

echo "📋 Processando imagens..."
echo ""

# Copiar arquivos mantendo nomenclatura
for serie in A B C D E; do
  for num in {1..12}; do
    arquivo="${serie}${num}.webp"
    origem_path="${ORIGEM}/${arquivo}"
    destino_path="${DESTINO}/${arquivo}"
    
    if [ -f "$origem_path" ]; then
      cp "$origem_path" "$destino_path"
      echo "✅ $arquivo copiado"
      ((count++))
    else
      echo "⚠️  $arquivo não encontrado"
    fi
  done
done

echo ""
echo "========================================"
echo "📊 Resultado:"
echo "   Total de imagens copiadas: $count/60"
echo ""

if [ $count -eq 60 ]; then
  echo "🎉 Sucesso! Todas as 60 imagens foram copiadas!"
else
  echo "⚠️  Atenção: Algumas imagens estão faltando."
  echo "   Verifique os nomes dos arquivos na pasta de origem."
fi

echo ""
echo "🔍 Arquivos na pasta de destino:"
ls -1 *.webp 2>/dev/null | wc -l | xargs echo "   Total:"

echo ""
echo "✅ Processo concluído!"
