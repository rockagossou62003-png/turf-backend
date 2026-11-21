#Requires -Version 5.1
<#
.SYNOPSIS
    Sauvegarde PostgreSQL de TURF PRO avec retention.
.USAGE
    powershell -NoProfile -ExecutionPolicy Bypass -File scripts\backup.ps1 [-RetentionDays 14]
    Planification Windows : Task Scheduler -> toutes les nuits 02:00.
#>
param(
    [int]$RetentionDays = 14,
    [string]$BackupDir = "$PSScriptRoot\..\backups"
)

$ErrorActionPreference = "Stop"

# DATABASE_URL issue de apps/web/.env
$envFile = "$PSScriptRoot\..\apps\web\.env"
if (-not (Test-Path $envFile)) { throw "apps/web/.env introuvable." }
$envContent = Get-Content $envFile | Where-Object { $_ -match '^\s*DATABASE_URL=' } | Select-Object -First 1
$envContent = $envContent -replace '^\s*DATABASE_URL=', '' -replace '^"', '' -replace '"$', ''
$uri = [Uri]$envContent
$dbName  = $uri.AbsolutePath.TrimStart('/')
$port    = if ($uri.Port -gt 0) { $uri.Port } else { 5432 }
$hostName = $uri.Host
$user    = $uri.UserInfo.Split(':')[0]

New-Item -ItemType Directory -Force -Path $BackupDir | Out-Null
$stamp = Get-Date -Format "yyyyMMdd-HHmmss"
$target = Join-Path $BackupDir "turfpro-$stamp.dump"

Write-Output "Sauvegarde de '$dbName' (@ $hostName`:$port) -> $target"

# pg_dump en format custom (binaire) : écrit directement dans un fichier hôte
# via un volume partagé, pas de pipe PowerShell (qui corrompt les octets).
$dockerArgs = @(
  "compose", "-f", "$PSScriptRoot\..\docker-compose.yml", "exec", "-T", "postgres",
  "pg_dump", "-U", $user, "-d", $dbName, "-Fc", "--no-owner", "--no-privileges",
  "-f", "/tmp/turfpro.dump"
)
& docker @dockerArgs
if ($LASTEXITCODE -ne 0) { throw "pg_dump a échoué." }

docker compose -f "$PSScriptRoot\..\docker-compose.yml" cp postgres:/tmp/turfpro.dump $target
if ($LASTEXITCODE -ne 0) { throw "Copie de la sauvegarde échouée." }

if ((Get-Item $target).Length -lt 1024) {
  throw "Sauvegarde suspecte (< 1 Ko), vérifiez pg_dump."
}

Write-Output "OK. Nettoyage des sauvegardes de plus de $RetentionDays jours..."
Get-ChildItem $BackupDir -Filter "turfpro-*.dump" |
  Where-Object { $_.LastWriteTime -lt (Get-Date).AddDays(-$RetentionDays) } |
  ForEach-Object { Remove-Item $_.FullName; Write-Output "Supprimé : $($_.Name)" }

Write-Output "Sauvegardes restantes : $((Get-ChildItem $BackupDir -Filter 'turfpro-*.dump').Count)"
