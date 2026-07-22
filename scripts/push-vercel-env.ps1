param(
  [ValidateSet("production", "preview", "development")]
  [string[]]$Environment = @("production")
)

$ErrorActionPreference = "Stop"

if (-not (Test-Path ".env")) {
  Write-Error "No se encontro el archivo .env en la raiz del proyecto."
}

if (-not (Get-Command vercel -ErrorAction SilentlyContinue)) {
  Write-Error "No se encontro Vercel CLI. Instalalo con: npm install -g vercel"
}

if (-not (Test-Path ".vercel")) {
  Write-Error "El proyecto todavia no esta vinculado con Vercel. Ejecuta primero: vercel link"
}

$envVars = @{}

foreach ($rawLine in Get-Content ".env") {
  $line = $rawLine.Trim()
  
  if ($line -eq "" -or $line.StartsWith("#")) {
    continue
  }

  if ($line -match "^([A-Z0-9_]+)\s*=\s*(.*)$") {
    $key = $matches[1]
    $value = $matches[2].Trim()

    if (($value.StartsWith('"') -and $value.EndsWith('"')) -or ($value.StartsWith("'") -and $value.EndsWith("'"))) {
      $value = $value.Substring(1, $value.Length - 2)
    }

    if ($value -ne "") {
      $envVars[$key] = $value
    }
  }
}

$localOnlyValues = @(
  "http://localhost:3000"
)

function Set-VercelEnvValue {
  param(
    [Parameter(Mandatory = $true)]
    [string]$Name,

    [Parameter(Mandatory = $true)]
    [string]$Value,

    [Parameter(Mandatory = $true)]
    [string]$Target
  )

  Write-Host "Actualizando $Name en $Target..."
  $Value | vercel env update $Name $Target --yes

  if ($LASTEXITCODE -eq 0) {
    return
  }

  Write-Host "$Name no existia en $Target. Creandola..."
  $Value | vercel env add $Name $Target

  if ($LASTEXITCODE -ne 0) {
    throw "No se pudo crear ni actualizar $Name en $Target."
  }
}

foreach ($key in $envVars.Keys) {
  $value = $envVars[$key]

  if ($key -eq "DATABASE_URL" -and $value -match "localhost|127\.0\.0\.1") {
    Write-Warning "Saltando DATABASE_URL porque apunta a una base local. Carga una DATABASE_URL online en Vercel."
    continue
  }

  if (($key -eq "NEXTAUTH_URL" -or $key -eq "NEXT_PUBLIC_APP_URL") -and $localOnlyValues -contains $value) {
    Write-Warning "Saltando $key porque apunta a localhost. Usa la URL real de Vercel."
    continue
  }

  foreach ($target in $Environment) {
    Set-VercelEnvValue -Name $key -Value $value -Target $target
  }
}

Write-Host "Listo. Variables sincronizadas con Vercel."
