# Script PowerShell para verificar configuración de base de datos
# Uso: .\verify-database.ps1 -SupabaseUrl "https://xxx.supabase.co" -SupabaseKey "eyJ..."

param(
    [Parameter(Mandatory=$true)]
    [string]$SupabaseUrl,
    
    [Parameter(Mandatory=$true)]
    [string]$SupabaseKey
)

Write-Host "🔍 VERIFICADOR DE BASE DE DATOS" -ForegroundColor Cyan
Write-Host "===============================" -ForegroundColor Cyan
Write-Host ""

# Función para hacer petición a Supabase
function Invoke-SupabaseQuery {
    param(
        [string]$Query,
        [string]$TableName = ""
    )
    
    try {
        $Headers = @{
            "apikey" = $SupabaseKey
            "Authorization" = "Bearer $SupabaseKey"
            "Content-Type" = "application/json"
        }
        
        if ($TableName) {
            $Url = "$SupabaseUrl/rest/v1/$TableName"
            if ($Query) {
                $Url += "?select=$Query"
            }
        } else {
            $Url = "$SupabaseUrl/rest/v1/rpc/custom_query"
            $Body = @{ query = $Query } | ConvertTo-Json
        }
        
        $Response = Invoke-RestMethod -Uri $Url -Method GET -Headers $Headers
        return $Response
    } catch {
        Write-Host "❌ Error en consulta: $($_.Exception.Message)" -ForegroundColor Red
        return $null
    }
}

Write-Host "1️⃣ Verificando conexión a Supabase..." -ForegroundColor Yellow
try {
    $TestConnection = Invoke-WebRequest -Uri "$SupabaseUrl/rest/v1/" -Method GET -Headers @{
        "apikey" = $SupabaseKey
    }
    
    if ($TestConnection.StatusCode -eq 200) {
        Write-Host "   ✅ Conexión exitosa" -ForegroundColor Green
    } else {
        Write-Host "   ❌ Error de conexión" -ForegroundColor Red
        exit 1
    }
} catch {
    Write-Host "   ❌ No se puede conectar a Supabase: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "2️⃣ Verificando tablas existentes..." -ForegroundColor Yellow

$RequiredTables = @("barbershops", "barbers", "clients", "appointments")
$TablesOk = $true

foreach ($Table in $RequiredTables) {
    try {
        $Headers = @{
            "apikey" = $SupabaseKey
            "Authorization" = "Bearer $SupabaseKey"
        }
        
        $Response = Invoke-RestMethod -Uri "$SupabaseUrl/rest/v1/$Table?select=id&limit=1" -Method GET -Headers $Headers
        Write-Host "   ✅ Tabla '$Table' existe" -ForegroundColor Green
    } catch {
        Write-Host "   ❌ Tabla '$Table' no existe o no es accesible" -ForegroundColor Red
        $TablesOk = $false
    }
}

if (-not $TablesOk) {
    Write-Host ""
    Write-Host "⚠️  Algunas tablas no están configuradas correctamente" -ForegroundColor Yellow
    Write-Host "💡 Ejecuta el script de setup primero: .\setup-database.ps1" -ForegroundColor Cyan
    exit 1
}

Write-Host ""
Write-Host "3️⃣ Verificando datos de ejemplo..." -ForegroundColor Yellow

# Verificar barbershops
try {
    $Headers = @{
        "apikey" = $SupabaseKey
        "Authorization" = "Bearer $SupabaseKey"
    }
    
    $Barbershops = Invoke-RestMethod -Uri "$SupabaseUrl/rest/v1/barbershops?select=id,nombre,email" -Method GET -Headers $Headers
    
    if ($Barbershops.Count -gt 0) {
        Write-Host "   ✅ Barberías encontradas: $($Barbershops.Count)" -ForegroundColor Green
        foreach ($Barbershop in $Barbershops) {
            Write-Host "      - $($Barbershop.nombre) ($($Barbershop.email))" -ForegroundColor Gray
        }
    } else {
        Write-Host "   ⚠️  No hay barberías registradas" -ForegroundColor Yellow
    }
} catch {
    Write-Host "   ❌ Error consultando barberías: $($_.Exception.Message)" -ForegroundColor Red
}

# Verificar barberos
try {
    $Barbers = Invoke-RestMethod -Uri "$SupabaseUrl/rest/v1/barbers?select=id,nombre" -Method GET -Headers $Headers
    
    if ($Barbers.Count -gt 0) {
        Write-Host "   ✅ Barberos encontrados: $($Barbers.Count)" -ForegroundColor Green
    } else {
        Write-Host "   ⚠️  No hay barberos registrados" -ForegroundColor Yellow
    }
} catch {
    Write-Host "   ❌ Error consultando barberos" -ForegroundColor Red
}

# Verificar clientes
try {
    $Clients = Invoke-RestMethod -Uri "$SupabaseUrl/rest/v1/clients?select=id,nombre" -Method GET -Headers $Headers
    
    if ($Clients.Count -gt 0) {
        Write-Host "   ✅ Clientes encontrados: $($Clients.Count)" -ForegroundColor Green
    } else {
        Write-Host "   ⚠️  No hay clientes registrados" -ForegroundColor Yellow
    }
} catch {
    Write-Host "   ❌ Error consultando clientes" -ForegroundColor Red
}

# Verificar citas
try {
    $Appointments = Invoke-RestMethod -Uri "$SupabaseUrl/rest/v1/appointments?select=id,fecha,estado" -Method GET -Headers $Headers
    
    if ($Appointments.Count -gt 0) {
        Write-Host "   ✅ Citas encontradas: $($Appointments.Count)" -ForegroundColor Green
        
        $Estados = $Appointments | Group-Object estado
        foreach ($Estado in $Estados) {
            Write-Host "      - $($Estado.Name): $($Estado.Count)" -ForegroundColor Gray
        }
    } else {
        Write-Host "   ⚠️  No hay citas registradas" -ForegroundColor Yellow
    }
} catch {
    Write-Host "   ❌ Error consultando citas" -ForegroundColor Red
}

Write-Host ""
Write-Host "4️⃣ Verificando RLS (Row Level Security)..." -ForegroundColor Yellow

# Esta verificación requiere permisos admin, así que solo mostramos info
Write-Host "   ℹ️  RLS debe estar habilitado en todas las tablas" -ForegroundColor Cyan
Write-Host "   💡 Verifica manualmente en Supabase Dashboard > Database > Tables" -ForegroundColor Gray

Write-Host ""
Write-Host "🎯 RESUMEN DE VERIFICACIÓN" -ForegroundColor Cyan
Write-Host "=========================" -ForegroundColor Cyan

if ($TablesOk) {
    Write-Host "✅ Base de datos configurada correctamente" -ForegroundColor Green
    Write-Host "✅ Tablas principales existen" -ForegroundColor Green
    Write-Host "✅ API REST funcional" -ForegroundColor Green
    
    if ($Barbershops.Count -gt 0) {
        Write-Host "✅ Datos de ejemplo presentes" -ForegroundColor Green
    } else {
        Write-Host "⚠️  Sin datos de ejemplo (ejecuta setup completo)" -ForegroundColor Yellow
    }
    
    Write-Host ""
    Write-Host "🚀 Sistema listo para usar!" -ForegroundColor Green
    Write-Host ""
    Write-Host "📋 SIGUIENTES PASOS:" -ForegroundColor Cyan
    Write-Host "1. Crear usuario Auth en Supabase con email correspondiente" -ForegroundColor White
    Write-Host "2. Configurar variables de entorno en el deploy" -ForegroundColor White
    Write-Host "3. Probar login y funcionalidades" -ForegroundColor White
    
} else {
    Write-Host "❌ Base de datos no configurada correctamente" -ForegroundColor Red
    Write-Host ""
    Write-Host "💡 ACCIONES REQUERIDAS:" -ForegroundColor Yellow
    Write-Host "1. Ejecutar: .\setup-database.ps1" -ForegroundColor White
    Write-Host "2. Crear usuario Auth correspondiente" -ForegroundColor White
    Write-Host "3. Volver a verificar con este script" -ForegroundColor White
}

Write-Host ""
Write-Host "Presiona cualquier tecla para continuar..." -ForegroundColor Gray
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")