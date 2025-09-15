#!/bin/bash

# Script para hacer backup completo de un cliente
# Uso: ./backup-client.sh "nombre-cliente"

if [ -z "$1" ]; then
    echo "❌ Uso: ./backup-client.sh \"nombre-cliente\""
    echo "Ejemplo: ./backup-client.sh \"barber-magic\""
    exit 1
fi

CLIENT_NAME=$1
BACKUP_DATE=$(date +%Y-%m-%d_%H-%M-%S)
BACKUP_DIR="backups/$CLIENT_NAME/$BACKUP_DATE"

echo "💾 Iniciando backup para: $CLIENT_NAME"
echo "📁 Directorio: $BACKUP_DIR"

# Crear directorio de backup
mkdir -p "$BACKUP_DIR"

# Verificar si existe el deploy
if [ ! -d "deploys/$CLIENT_NAME" ]; then
    echo "❌ No se encontró deploy para: $CLIENT_NAME"
    echo "Deploys disponibles:"
    ls -1 deploys/ 2>/dev/null || echo "No hay deploys"
    exit 1
fi

echo "📋 Copiando archivos de configuración..."

# Backup de archivos de configuración
cp "deploys/$CLIENT_NAME/barbershop-config.json" "$BACKUP_DIR/" 2>/dev/null
cp "deploys/$CLIENT_NAME/vercel.json" "$BACKUP_DIR/" 2>/dev/null
cp "deploys/$CLIENT_NAME/package.json" "$BACKUP_DIR/" 2>/dev/null

# Crear reporte de estado
cat > "$BACKUP_DIR/status-report.txt" << EOL
BACKUP REPORT
=============
Cliente: $CLIENT_NAME
Fecha: $BACKUP_DATE
URL: https://$CLIENT_NAME.vercel.app

STATUS CHECKS:
$(curl -s -o /dev/null -w "HTTP Status: %{http_code}" https://$CLIENT_NAME.vercel.app)
Response time: $(curl -s -o /dev/null -w "%{time_total}s" https://$CLIENT_NAME.vercel.app)

ARCHIVOS RESPALDADOS:
$(ls -la "$BACKUP_DIR")
EOL

echo "📄 Creando documentación de recuperación..."

# Crear guía de recuperación
cat > "$BACKUP_DIR/recovery-guide.md" << EOL
# 🔄 Guía de Recuperación - $CLIENT_NAME

## Información del Backup
- **Cliente**: $CLIENT_NAME
- **Fecha de backup**: $BACKUP_DATE
- **URL original**: https://$CLIENT_NAME.vercel.app

## Pasos para Recuperación

### 1. Recrear proyecto Vercel
\`\`\`bash
cd deploys/$CLIENT_NAME
vercel --prod
\`\`\`

### 2. Configurar variables de entorno
Variables necesarias (obtener del cliente o Supabase):
- NEXT_PUBLIC_SUPABASE_URL=...
- NEXT_PUBLIC_SUPABASE_ANON_KEY=...

### 3. Verificar funcionamiento
- Acceso al login
- Creación de cita de prueba
- Generación de reportes

## Información de Contacto del Cliente
*(Llenar con datos reales)*
- Email: 
- Teléfono: 
- Contacto técnico: 

## Notas Adicionales
*(Agregar cualquier configuración especial)*
EOL

echo "✅ Backup completado exitosamente"
echo "📍 Ubicación: $BACKUP_DIR"
echo ""
echo "📋 Archivos respaldados:"
ls -la "$BACKUP_DIR"
echo ""
echo "🔗 Para restaurar, consulta: $BACKUP_DIR/recovery-guide.md"