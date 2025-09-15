#!/bin/bash

# Script para verificar el estado de todos los deploys
# Uso: ./check-all-clients.sh

echo "🔍 VERIFICANDO ESTADO DE TODOS LOS CLIENTES"
echo "=========================================="
echo ""

TOTAL_CLIENTS=0
ACTIVE_CLIENTS=0
FAILED_CLIENTS=0

# Verificar si existe el directorio deploys
if [ ! -d "deploys" ]; then
    echo "❌ No se encontró el directorio 'deploys'"
    echo "Ejecuta primero: ./deploy-new-barbershop.sh"
    exit 1
fi

# Recorrer todos los deploys
for dir in deploys/*/; do
    if [ -d "$dir" ]; then
        CLIENT_NAME=$(basename "$dir")
        CLIENT_URL="https://$CLIENT_NAME.vercel.app"
        
        echo "🏪 Cliente: $CLIENT_NAME"
        echo "🔗 URL: $CLIENT_URL"
        
        # Verificar status HTTP
        HTTP_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$CLIENT_URL" --connect-timeout 10)
        RESPONSE_TIME=$(curl -s -o /dev/null -w "%{time_total}" "$CLIENT_URL" --connect-timeout 10)
        
        if [ "$HTTP_STATUS" = "200" ]; then
            echo "✅ Status: ACTIVO (${HTTP_STATUS}) - ${RESPONSE_TIME}s"
            ACTIVE_CLIENTS=$((ACTIVE_CLIENTS + 1))
        else
            echo "❌ Status: ERROR (${HTTP_STATUS})"
            FAILED_CLIENTS=$((FAILED_CLIENTS + 1))
        fi
        
        # Verificar configuración
        if [ -f "$dir/barbershop-config.json" ]; then
            BARBERSHOP_NAME=$(cat "$dir/barbershop-config.json" | grep -o '"name": *"[^"]*"' | cut -d'"' -f4)
            DEPLOY_DATE=$(cat "$dir/barbershop-config.json" | grep -o '"deployment_date": *"[^"]*"' | cut -d'"' -f4)
            echo "📋 Nombre: $BARBERSHOP_NAME"
            echo "📅 Deploy: $DEPLOY_DATE"
        fi
        
        echo ""
        TOTAL_CLIENTS=$((TOTAL_CLIENTS + 1))
    fi
done

echo "📊 RESUMEN GENERAL"
echo "=================="
echo "Total clientes: $TOTAL_CLIENTS"
echo "Activos: $ACTIVE_CLIENTS ✅"
echo "Con problemas: $FAILED_CLIENTS ❌"
echo ""

if [ $TOTAL_CLIENTS -eq 0 ]; then
    echo "💡 No tienes clientes deployados aún."
    echo "Usa: ./deploy-new-barbershop.sh \"nombre\" \"email@barberia.com\""
else
    REVENUE=$((ACTIVE_CLIENTS * 15000))
    echo "💰 Ingresos mensuales estimados: ₡$(printf "%'d" $REVENUE)"
fi

# Crear reporte detallado
REPORT_DATE=$(date +%Y-%m-%d_%H-%M-%S)
REPORT_FILE="reports/client-status-$REPORT_DATE.txt"

mkdir -p reports

cat > "$REPORT_FILE" << EOL
REPORTE DE ESTADO DE CLIENTES
============================
Fecha: $(date)
Total clientes: $TOTAL_CLIENTS
Activos: $ACTIVE_CLIENTS
Con problemas: $FAILED_CLIENTS
Ingresos mensuales: ₡$(printf "%'d" $REVENUE)

DETALLES POR CLIENTE:
EOL

# Agregar detalles al reporte
for dir in deploys/*/; do
    if [ -d "$dir" ]; then
        CLIENT_NAME=$(basename "$dir")
        CLIENT_URL="https://$CLIENT_NAME.vercel.app"
        HTTP_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$CLIENT_URL" --connect-timeout 10)
        
        echo "" >> "$REPORT_FILE"
        echo "Cliente: $CLIENT_NAME" >> "$REPORT_FILE"
        echo "URL: $CLIENT_URL" >> "$REPORT_FILE"
        echo "Status: $HTTP_STATUS" >> "$REPORT_FILE"
        
        if [ -f "$dir/barbershop-config.json" ]; then
            echo "Config: $(cat "$dir/barbershop-config.json")" >> "$REPORT_FILE"
        fi
    fi
done

echo "📄 Reporte detallado guardado en: $REPORT_FILE"