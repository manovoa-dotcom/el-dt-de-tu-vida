$ErrorActionPreference = "Stop"

$repoRoot = Split-Path -Parent $PSScriptRoot
$backupRoot = Join-Path $repoRoot "Backups\ElDT"
$credentialsPath = Join-Path $backupRoot "credentials.clixml"

if (-not (Test-Path $credentialsPath)) {
  throw "No existe la configuración local del backup. Ejecutá scripts\setup-supabase-backup.ps1."
}

$pgDump = Get-Command "pg_dump" -ErrorAction SilentlyContinue
$pgDumpPath = if ($pgDump) { $pgDump.Source } else { $null }
if (-not $pgDumpPath) {
  $postgresRoot = Join-Path $env:ProgramFiles "PostgreSQL"
  if (Test-Path $postgresRoot) {
    $pgDumpPath = Get-ChildItem -LiteralPath $postgresRoot -Directory |
      ForEach-Object { Join-Path $_.FullName "bin\pg_dump.exe" } |
      Where-Object { Test-Path $_ } |
      Select-Object -First 1
  }
}
if (-not $pgDumpPath) {
  throw "No se encontró pg_dump. Instalá las herramientas de línea de comandos de PostgreSQL y volvé a ejecutar el setup."
}

$credentials = Import-Clixml -Path $credentialsPath
$databaseUrl = [System.Net.NetworkCredential]::new("", $credentials.DatabaseUrl).Password
$serviceRoleKey = [System.Net.NetworkCredential]::new("", $credentials.ServiceRoleKey).Password
$projectUrl = [string]$credentials.ProjectUrl

if ([string]::IsNullOrWhiteSpace($projectUrl) -or
    [string]::IsNullOrWhiteSpace($databaseUrl) -or
    [string]::IsNullOrWhiteSpace($serviceRoleKey)) {
  throw "La configuración local del backup está incompleta. Volvé a ejecutar el setup."
}

$timestamp = Get-Date -Format "yyyyMMdd-HHmmss"
$runDirectory = Join-Path $backupRoot $timestamp
$storageDirectory = Join-Path $runDirectory "storage"
New-Item -ItemType Directory -Path $storageDirectory -Force | Out-Null

try {
  $dumpPath = Join-Path $runDirectory "database-public.dump"
  $databaseUri = [Uri]$databaseUrl
  $userInfo = $databaseUri.UserInfo.Split(":", 2)
  if ($userInfo.Count -ne 2) {
    throw "La URL de PostgreSQL debe incluir usuario y contraseña."
  }
  $env:PGPASSWORD = [Uri]::UnescapeDataString($userInfo[1])
  $databaseUriBuilder = [UriBuilder]$databaseUri
  $databaseUriBuilder.Password = ""
  $safeDatabaseUrl = $databaseUriBuilder.Uri.AbsoluteUri

  & $pgDumpPath --format=custom --no-owner --no-acl --schema=public --file=$dumpPath $safeDatabaseUrl
  if ($LASTEXITCODE -ne 0 -or -not (Test-Path $dumpPath) -or (Get-Item $dumpPath).Length -eq 0) {
    throw "pg_dump no pudo crear una copia válida del esquema public."
  }

  $headers = @{
    apikey        = $serviceRoleKey
    Authorization = "Bearer $serviceRoleKey"
  }

  $bucketUrl = "$($projectUrl.TrimEnd('/'))/storage/v1/bucket"
  $buckets = Invoke-RestMethod -Method Get -Uri $bucketUrl -Headers $headers

  function Copy-StoragePrefix {
    param(
      [Parameter(Mandatory)][string]$Bucket,
      [Parameter(Mandatory)][AllowEmptyString()][string]$Prefix,
      [Parameter(Mandatory)][string]$Destination
    )

    $offset = 0
    $pageSize = 1000
    do {
      $requestBody = @{
        prefix = $Prefix
        limit  = $pageSize
        offset = $offset
        sortBy = @{ column = "name"; order = "asc" }
      } | ConvertTo-Json -Compress

      $listUri = "$($projectUrl.TrimEnd('/'))/storage/v1/object/list/$([Uri]::EscapeDataString($Bucket))"
      $items = Invoke-RestMethod -Method Post -Uri $listUri -Headers $headers `
        -ContentType "application/json" -Body $requestBody

      foreach ($item in $items) {
        $objectName = [string]$item.name
        if ([string]::IsNullOrWhiteSpace($objectName)) { continue }

        $objectPath = if ($Prefix) { "$Prefix$objectName" } else { $objectName }
        $isFolder = ($null -eq $item.id -and $null -eq $item.metadata)

        if ($isFolder) {
          Copy-StoragePrefix -Bucket $Bucket -Prefix "$objectPath/" -Destination $Destination
          continue
        }

        $encodedPath = ($objectPath -split "/" | ForEach-Object {
          [Uri]::EscapeDataString($_)
        }) -join "/"
        $downloadUri = "$($projectUrl.TrimEnd('/'))/storage/v1/object/$([Uri]::EscapeDataString($Bucket))/$encodedPath"
        $filePath = Join-Path $Destination ($objectPath -replace "/", [IO.Path]::DirectorySeparatorChar)
        $parent = Split-Path -Parent $filePath
        New-Item -ItemType Directory -Path $parent -Force | Out-Null
        Invoke-WebRequest -Method Get -Uri $downloadUri -Headers $headers -OutFile $filePath | Out-Null
      }

      $itemCount = @($items).Count
      $offset += $pageSize
    } while ($itemCount -eq $pageSize)
  }

  foreach ($bucket in $buckets) {
    $bucketName = [string]$bucket.name
    if ([string]::IsNullOrWhiteSpace($bucketName)) { continue }
    $bucketDirectory = Join-Path $storageDirectory $bucketName
    New-Item -ItemType Directory -Path $bucketDirectory -Force | Out-Null
    Copy-StoragePrefix -Bucket $bucketName -Prefix "" -Destination $bucketDirectory
  }

  $manifest = [ordered]@{
    completedAt = (Get-Date).ToString("o")
    projectHost = ([Uri]$projectUrl).Host
    database    = "PostgreSQL public schema and data"
    storage     = @($buckets | ForEach-Object { $_.name })
  }
  $manifest | ConvertTo-Json -Depth 4 | Set-Content -Path (Join-Path $runDirectory "manifest.json") -Encoding UTF8

  $retentionCutoff = (Get-Date).AddDays(-90)
  Get-ChildItem -LiteralPath $backupRoot -Directory | Where-Object {
    $_.Name -match '^\d{8}-\d{6}$' -and
    [datetime]::ParseExact($_.Name, "yyyyMMdd-HHmmss", [Globalization.CultureInfo]::InvariantCulture) -lt $retentionCutoff
  } | ForEach-Object {
    Remove-Item -LiteralPath $_.FullName -Recurse -Force
  }

  Write-Output "Respaldo completado: $runDirectory"
}
catch {
  Write-Error "Falló el respaldo. La copia incompleta quedó en $runDirectory. Detalle: $($_.Exception.Message)"
  exit 1
}
finally {
  $env:PGPASSWORD = $null
  $safeDatabaseUrl = $null
  $databaseUri = $null
  $databaseUriBuilder = $null
  $databaseUrl = $null
  $serviceRoleKey = $null
  $credentials = $null
}
