# 🚀 Guía de Deploy Multi-Barbería

## 📋 Proceso de Onboarding de Nueva Barbería

### 1. **Preparar Proyecto Base**
```bash
# Hacer el script ejecutable (una sola vez)
chmod +x scripts/deploy-new-barbershop.sh

# Crear deploy para nueva barbería
./scripts/deploy-new-barbershop.sh "Barber Magic" "admin@barbermagic.com"
```

### 2. **Crear Proyecto Supabase**
1. Ve a [supabase.com](https://supabase.com)
2. Crear nuevo proyecto: `barberia-nombre-único`
3. Región: **South America (São Paulo)** (más cerca a Costa Rica)
4. Copiar URL y API Key

### 3. **Configurar Base de Datos**
```sql
-- Ejecutar en Supabase SQL Editor
-- Copiar contenido de: database-complete-setup.sql
```

### 4. **Deploy en Vercel**
```bash
cd deploys/barber-magic
vercel --prod
```

**Durante el deploy, configurar variables:**
```
NEXT_PUBLIC_SUPABASE_URL=https://tu-proyecto.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=tu-anon-key-aqui
```

### 5. **Configuración Post-Deploy**
1. **Crear usuario admin** en Supabase Auth con el email de la barbería
2. **Agregar datos iniciales** de la barbería y barberos
3. **Probar funcionalidades** básicas
4. **Entregar credenciales** al cliente

---

## 📊 Gestión de Múltiples Deploys

### **Estructura Recomendada:**
```
SistemaBarberia/
├── src/ (código base)
├── scripts/
│   └── deploy-new-barbershop.sh
├── deploys/
│   ├── barber-magic/
│   ├── salon-elite/
│   ├── cortes-premium/
│   └── ...
└── docs/
    └── client-configs/
        ├── barber-magic.md
        ├── salon-elite.md
        └── ...
```

### **Tracking de Clientes:**
```json
// clients-registry.json
{
  "clients": [
    {
      "id": 1,
      "name": "Barber Magic",
      "email": "admin@barbermagic.com",
      "url": "https://barber-magic.vercel.app",
      "supabase_project": "barberia-magic-xyz123",
      "deploy_date": "2025-09-15",
      "monthly_fee": 15000,
      "status": "active"
    }
  ]
}
```

---

## 💰 Control de Costos

### **Límites Gratuitos por Proyecto:**

#### **Vercel (por proyecto):**
- ✅ 100GB bandwidth/mes
- ✅ Dominio .vercel.app gratuito
- ✅ Deploy automático desde Git
- ✅ SSL automático

#### **Supabase (por proyecto):**
- ✅ 500MB database
- ✅ 2GB bandwidth/mes  
- ✅ 50MB file storage
- ✅ 100,000 monthly active users

### **Estimación por Barbería:**
```
Uso típico barbería pequeña (3 barberos):
- Database: ~50MB (muy por debajo del límite)
- Bandwidth: ~500MB/mes (por debajo del límite)
- Users: 1 admin + ~200 clientes/mes
```

**Conclusión: Puedes manejar fácilmente 10+ barberías gratis** 🎉

---

## ⚡ Scripts de Automatización

### **Monitoreo de Uso:**
```bash
#!/bin/bash
# check-usage.sh - Verificar uso de recursos

echo "📊 REPORTE DE USO - TODOS LOS PROYECTOS"
echo "======================================"

for dir in deploys/*/; do
    if [ -d "$dir" ]; then
        barbershop=$(basename "$dir")
        echo "🏪 $barbershop"
        echo "   URL: https://$barbershop.vercel.app"
        echo "   Status: $(curl -s -o /dev/null -w "%{http_code}" https://$barbershop.vercel.app)"
        echo ""
    fi
done
```

### **Backup de Configuraciones:**
```bash
#!/bin/bash
# backup-configs.sh - Respaldar configuraciones

mkdir -p backups/$(date +%Y-%m-%d)

for dir in deploys/*/; do
    if [ -d "$dir" ]; then
        barbershop=$(basename "$dir")
        cp "$dir/barbershop-config.json" "backups/$(date +%Y-%m-%d)/$barbershop.json"
    fi
done

echo "✅ Backup completado en backups/$(date +%Y-%m-%d)/"
```

---

## 🎯 Workflow Optimizado

### **Nuevo Cliente (15 minutos):**
1. **Minuto 1-3**: Ejecutar script de deploy
2. **Minuto 4-8**: Crear y configurar Supabase  
3. **Minuto 9-12**: Deploy en Vercel con variables
4. **Minuto 13-15**: Pruebas básicas y entrega

### **Mantenimiento Semanal (30 minutos):**
1. Verificar status de todos los deploys
2. Revisar uso de recursos
3. Aplicar updates críticos si es necesario
4. Backup de configuraciones

---

## 📈 Escalabilidad

**Cuando llegues a 10 barberías (~₡150K/mes):**
- Considera migrar a arquitectura multi-tenant
- Los ingresos justificarán los costos de infraestructura
- Podrás invertir en automatización avanzada

**Hasta entonces, este enfoque es perfecto para:**
- ✅ Minimizar costos operativos
- ✅ Validar el mercado
- ✅ Generar flujo de caja
- ✅ Aprender de clientes reales

¿Te parece bien esta estructura? ¿Necesitas que ajuste algún script o proceso?