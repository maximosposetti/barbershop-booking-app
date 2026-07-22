param(
  [Parameter(Mandatory = $true)]
  [string]$AppUrl,

  [Parameter(Mandatory = $true)]
  [string]$DatabaseUrl,

  [string]$DatabaseUrlUnpooled = ""
)

$ErrorActionPreference = "Stop"

if (-not (Get-Command vercel -ErrorAction SilentlyContinue)) {
  Write-Error "No se encontro Vercel CLI. Instalalo con: npm install -g vercel"
}

if (-not (Test-Path ".vercel")) {
  Write-Error "El proyecto todavia no esta vinculado con Vercel. Ejecuta primero: vercel link"
}

if ($AppUrl -match "localhost|127\.0\.0\.1") {
  Write-Error "AppUrl debe ser la URL real de Vercel, no localhost."
}

if ($DatabaseUrl -match "localhost|127\.0\.0\.1") {
  Write-Error "DatabaseUrl debe ser una base online, no localhost."
}

if ($DatabaseUrlUnpooled -ne "" -and $DatabaseUrlUnpooled -match "localhost|127\.0\.0\.1") {
  Write-Error "DatabaseUrlUnpooled debe ser una base online, no localhost."
}

$normalizedAppUrl = $AppUrl.TrimEnd("/")

$vars = @{
  "DATABASE_URL" = $DatabaseUrl
  "NEXTAUTH_URL" = $normalizedAppUrl
  "NEXT_PUBLIC_APP_URL" = $normalizedAppUrl
}

if ($DatabaseUrlUnpooled -ne "") {
  $vars["DATABASE_URL_UNPOOLED"] = $DatabaseUrlUnpooled
}

function Set-VercelEnvValue {
  param(
    [Parameter(Mandatory = $true)]
    [string]$Name,

    [Parameter(Mandatory = $true)]
    [string]$Value
  )

  Write-Host "Actualizando $Name en production..."
  $Value | vercel env update $Name production --yes

  if ($LASTEXITCODE -eq 0) {
    return
  }

  Write-Host "$Name no existia en production. Creandola..."
  $Value | vercel env add $Name production

  if ($LASTEXITCODE -ne 0) {
    throw "No se pudo crear ni actualizar $Name en production."
  }
}

foreach ($key in $vars.Keys) {
  Set-VercelEnvValue -Name $key -Value $vars[$key]
}

Write-Host "Listo. Redeploya en Vercel para que tome estas variables."
