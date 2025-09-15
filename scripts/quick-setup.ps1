# Script PowerShell simplificado para setup rápido
# Uso: .\quick-setup.ps1

Write-Host "🚀 SETUP RÁPIDO DE NUEVA BARBERÍA" -ForegroundColor Cyan
Write-Host "=================================" -ForegroundColor Cyan
Write-Host ""

# Pedir datos interactivamente
$BarbershopName = Read-Host "🏪 Nombre de la barbería"
$Email = Read-Host "📧 Email del administrador"
$SupabaseUrl = Read-Host "🔗 URL de Supabase (https://xxx.supabase.co)"
$SupabaseKey = Read-Host "🔑 Supabase Anon Key" -AsSecureString

# Convertir SecureString a texto plano para uso
$BSTR = [System.Runtime.InteropServices.Marshal]::SecureStringToBSTR($SupabaseKey)
$PlainSupabaseKey = [System.Runtime.InteropServices.Marshal]::PtrToStringAuto($BSTR)

Write-Host ""
Write-Host "⚙️  Ejecutando setup completo..." -ForegroundColor Yellow

# Ejecutar el script principal
try {
    & ".\setup-database.ps1" -BarbershopName $BarbershopName -Email $Email -SupabaseUrl $SupabaseUrl -SupabaseKey $PlainSupabaseKey
    
    Write-Host ""
    Write-Host "✅ Setup completado exitosamente!" -ForegroundColor Green
    Write-Host ""
    Write-Host "📋 SIGUIENTE ACCIÓN REQUERIDA:" -ForegroundColor Yellow
    Write-Host "1. Ve a Supabase SQL Editor" -ForegroundColor White
    Write-Host "2. Ejecuta el SQL generado" -ForegroundColor White
    Write-Host "3. Crea usuario Auth con email: $Email" -ForegroundColor White
    
} catch {
    Write-Host ""
    Write-Host "❌ Error durante el setup: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host ""
    Write-Host "💡 Asegúrate de que:" -ForegroundColor Yellow
    Write-Host "- Tengas los permisos necesarios" -ForegroundColor White
    Write-Host "- Los datos de Supabase sean correctos" -ForegroundColor White
    Write-Host "- Tengas conexión a internet" -ForegroundColor White
}

Write-Host ""
Write-Host "Presiona cualquier tecla para continuar..." -ForegroundColor Gray
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")