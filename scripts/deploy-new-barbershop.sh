#!/bin/bash

# Script para crear un nuevo deployment para una barbería
# Uso: ./deploy-new-barbershop.sh "nombre-barberia" "email@barberia.com"

if [ -z "$1" ] || [ -z "$2" ]; then
    echo "❌ Uso: ./deploy-new-barbershop.sh \"nombre-barberia\" \"email@barberia.com\""
    exit 1
fi

BARBERSHOP_NAME=$1
BARBERSHOP_EMAIL=$2
SAFE_NAME=$(echo $1 | tr '[:upper:]' '[:lower:]' | sed 's/[^a-z0-9]/-/g' | sed 's/--*/-/g' | sed 's/-$//')

echo "🚀 Creando deployment para: $BARBERSHOP_NAME"
echo "📧 Email: $BARBERSHOP_EMAIL"
echo "🔗 URL será: $SAFE_NAME.vercel.app"
echo ""

# 1. Crear directorio temporal
mkdir -p "deploys/$SAFE_NAME"
cd "deploys/$SAFE_NAME"

# 2. Copiar archivos del proyecto base
echo "📁 Copiando archivos base..."
cp -r ../../src .
cp -r ../../public .
cp ../../package.json .
cp ../../next.config.js .
cp ../../tailwind.config.js .
cp ../../tsconfig.json .
cp ../../postcss.config.js .

# 3. Crear archivo de configuración específico
echo "⚙️ Creando configuración personalizada..."
cat > barbershop-config.json << EOL
{
  "name": "$BARBERSHOP_NAME",
  "email": "$BARBERSHOP_EMAIL",
  "deployment_date": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
  "version": "1.0.0"
}
EOL

# 4. Modificar título en layout.tsx
sed -i "s/Sistema de Barbería/$BARBERSHOP_NAME - Sistema de Gestión/g" src/app/layout.tsx

# 5. Crear vercel.json personalizado
cat > vercel.json << EOL
{
  "name": "$SAFE_NAME-barberia",
  "version": 2,
  "builds": [
    {
      "src": "package.json",
      "use": "@vercel/next"
    }
  ],
  "routes": [
    {
      "src": "/(.*)",
      "dest": "/"
    }
  ],
  "env": {
    "NEXT_PUBLIC_BARBERSHOP_NAME": "$BARBERSHOP_NAME"
  }
}
EOL

echo ""
echo "✅ Proyecto preparado en: deploys/$SAFE_NAME"
echo ""
echo "📋 PRÓXIMOS PASOS:"
echo "1. 🗄️  Crear proyecto Supabase para '$BARBERSHOP_NAME'"
echo "2. 🔑 Agregar variables de entorno:"
echo "   NEXT_PUBLIC_SUPABASE_URL=tu_supabase_url"
echo "   NEXT_PUBLIC_SUPABASE_ANON_KEY=tu_supabase_key"
echo "3. 🚀 Ejecutar: cd deploys/$SAFE_NAME && vercel --prod"
echo ""
echo "🔗 URL final: https://$SAFE_NAME.vercel.app"