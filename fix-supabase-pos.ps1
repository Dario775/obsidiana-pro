# Script de ayuda para aplicar la migración wrapper y reiniciar Supabase (PowerShell clásico)
# USO: Abrir PowerShell como administrador en la raíz del repo y ejecutar: .\fix-supabase-pos.ps1
# ADVERTENCIA: Este script NO realiza db reset; si necesitás resetear, hacelo manualmente con "supabase db reset".

$projectLabel = "Obsidiana-Pro"

Write-Host "== Stopping supabase =="
supabase stop

Write-Host "== Removing supabase-related containers (if any) =="
$ids = docker ps -a --filter "label=com.supabase.cli.project=$projectLabel" --format "{{.ID}}"
if ($ids) {
  $ids | ForEach-Object { docker rm -f $_ | Out-Null }
  Write-Host "Removed containers:"
  $ids | ForEach-Object { Write-Host $_ }
} else {
  Write-Host "No project containers found."
}

Write-Host "== Starting supabase =="
supabase start

Start-Sleep -Seconds 5

Write-Host "== Detecting DB container name =="
$dbName = docker ps --filter "label=com.supabase.cli.project=$projectLabel" --format "{{.Names}}" | Select-Object -First 1
if (-not $dbName) {
  Write-Host "DB container not found. Listing supabase containers:"
  docker ps --filter "label=com.supabase.cli.project=$projectLabel"
  throw "No DB container detected. Aborting."
}
Write-Host "Found container: $dbName"

# Apply wrapper SQL file (uses path relative to repo root)
$wrapperPath = "supabase/migrations/20260504000001_add_complete_pos_checkout_wrapper.sql"
if (-not (Test-Path $wrapperPath)) {
  Write-Host "Wrapper SQL file not found at $wrapperPath"
} else {
  Write-Host "== Applying wrapper SQL to database =="
  docker exec -i $dbName psql -U postgres -d postgres -f $wrapperPath
}

Write-Host "== Listing functions matching complete_pos_checkout% =="
docker exec -i $dbName psql -U postgres -d postgres -c "SELECT proname FROM pg_proc WHERE proname ILIKE 'complete_pos_checkout%';"

Write-Host "== Restarting supabase to refresh schema cache =="
supabase stop
supabase start

Write-Host "== OPTIONAL: Test RPC via curl =="
$ANON = "<REPLACE_WITH_ANON_KEY>"
if ($ANON -eq "<REPLACE_WITH_ANON_KEY>") {
  Write-Host "ANON key not configured in script. To test the RPC, set the ANON key in variable \$ANON or run the curl command manually."
  Write-Host "Example curl (PowerShell):"
  Write-Host "curl -i -X POST \"http://127.0.0.1:54321/rest/v1/rpc/complete_pos_checkout_rpc\" -H \"apikey: <ANON_KEY>\" -H \"Authorization: Bearer <ANON_KEY>\" -H \"Content-Type: application/json\" -d '{}'"
} else {
  curl -i -X POST "http://127.0.0.1:54321/rest/v1/rpc/complete_pos_checkout_rpc" -H "apikey: $ANON" -H "Authorization: Bearer $ANON" -H "Content-Type: application/json" -d "{}"
}

Write-Host "== Script finished =="