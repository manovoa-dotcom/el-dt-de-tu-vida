$ErrorActionPreference = "Stop"

function Read-SupabaseCredentials {
  Add-Type -AssemblyName System.Windows.Forms
  Add-Type -AssemblyName System.Drawing
  [System.Windows.Forms.Application]::EnableVisualStyles()

  $form = New-Object System.Windows.Forms.Form
  $form.Text = "Configurar backup de Supabase"
  $form.Size = New-Object System.Drawing.Size(760, 390)
  $form.StartPosition = "CenterScreen"
  $form.FormBorderStyle = "FixedDialog"
  $form.MaximizeBox = $false
  $form.MinimizeBox = $false

  $connectionLabel = New-Object System.Windows.Forms.Label
  $connectionLabel.Location = New-Object System.Drawing.Point(18, 18)
  $connectionLabel.Size = New-Object System.Drawing.Size(700, 42)
  $connectionLabel.Text = "1. URI PostgreSQL de Supabase (Connect > Session pooler > URI). Reemplazá [YOUR-PASSWORD] por la contraseña real."
  $form.Controls.Add($connectionLabel)

  $connectionBox = New-Object System.Windows.Forms.TextBox
  $connectionBox.Location = New-Object System.Drawing.Point(20, 64)
  $connectionBox.Size = New-Object System.Drawing.Size(705, 26)
  $connectionBox.UseSystemPasswordChar = $true
  $form.Controls.Add($connectionBox)

  $keyLabel = New-Object System.Windows.Forms.Label
  $keyLabel.Location = New-Object System.Drawing.Point(18, 108)
  $keyLabel.Size = New-Object System.Drawing.Size(700, 44)
  $keyLabel.Text = "2. Clave API secreta: pegá la legacy service_role o la Secret key sb_secret_... No pegues la URL PostgreSQL aquí."
  $form.Controls.Add($keyLabel)

  $keyBox = New-Object System.Windows.Forms.TextBox
  $keyBox.Location = New-Object System.Drawing.Point(20, 154)
  $keyBox.Size = New-Object System.Drawing.Size(705, 26)
  $keyBox.UseSystemPasswordChar = $true
  $form.Controls.Add($keyBox)

  $helpLabel = New-Object System.Windows.Forms.Label
  $helpLabel.Location = New-Object System.Drawing.Point(20, 194)
  $helpLabel.Size = New-Object System.Drawing.Size(700, 48)
  $helpLabel.Text = "Pegá con Ctrl+V en cada campo. Los valores quedan ocultos. No compartas capturas con las credenciales."
  $form.Controls.Add($helpLabel)

  $saveButton = New-Object System.Windows.Forms.Button
  $saveButton.Location = New-Object System.Drawing.Point(530, 290)
  $saveButton.Size = New-Object System.Drawing.Size(90, 32)
  $saveButton.Text = "Guardar"
  $saveButton.DialogResult = [System.Windows.Forms.DialogResult]::OK
  $form.Controls.Add($saveButton)

  $cancelButton = New-Object System.Windows.Forms.Button
  $cancelButton.Location = New-Object System.Drawing.Point(635, 290)
  $cancelButton.Size = New-Object System.Drawing.Size(90, 32)
  $cancelButton.Text = "Cancelar"
  $cancelButton.DialogResult = [System.Windows.Forms.DialogResult]::Cancel
  $form.Controls.Add($cancelButton)

  $form.AcceptButton = $saveButton
  $form.CancelButton = $cancelButton
  $form.Add_FormClosing({
    if ($form.DialogResult -ne [System.Windows.Forms.DialogResult]::OK) { return }

    $connection = $connectionBox.Text.Trim()
    $apiKey = $keyBox.Text.Trim()
    $validationError = $null

    if ($connection -notmatch '^postgres(ql)?://') {
      $validationError = "El primer campo debe ser la URI PostgreSQL y empezar con postgresql:// o postgres://."
    } else {
      try {
        $uri = [Uri]$connection
        $parts = $uri.UserInfo.Split(":", 2)
        if ($parts.Count -ne 2 -or [string]::IsNullOrWhiteSpace($parts[1]) -or
            [Uri]::UnescapeDataString($parts[1]) -match 'YOUR-PASSWORD|^\[.*\]$') {
          $validationError = "Reemplazá [YOUR-PASSWORD] por la contraseña real de la base de datos."
        }
      } catch {
        $validationError = "La URI PostgreSQL no parece válida."
      }
    }

    if (-not $validationError -and $apiKey -notmatch '^(eyJ|sb_secret_)') {
      $validationError = "El segundo campo debe contener la clave secreta service_role o sb_secret_."
    }

    if ($validationError) {
      [System.Windows.Forms.MessageBox]::Show(
        $validationError,
        "Revisá los datos",
        [System.Windows.Forms.MessageBoxButtons]::OK,
        [System.Windows.Forms.MessageBoxIcon]::Warning
      ) | Out-Null
      $_.Cancel = $true
      return
    }

    $form.Tag = [pscustomobject]@{
      DatabaseUrl = ConvertTo-SecureString $connection -AsPlainText -Force
      ServiceRoleKey = ConvertTo-SecureString $apiKey -AsPlainText -Force
    }
    $connectionBox.Clear()
    $keyBox.Clear()
  })

  $dialogResult = $form.ShowDialog()
  if ($dialogResult -ne [System.Windows.Forms.DialogResult]::OK -or -not $form.Tag) {
    $connectionBox.Clear()
    $keyBox.Clear()
    $form.Dispose()
    throw "Configuración cancelada; no se guardaron credenciales."
  }

  $result = $form.Tag
  $form.Dispose()
  return $result
}

$repoRoot = Split-Path -Parent $PSScriptRoot
$backupRoot = Join-Path $repoRoot "Backups\ElDT"
$credentialsPath = Join-Path $backupRoot "credentials.clixml"
$backupScript = Join-Path $PSScriptRoot "backup-supabase.ps1"
$taskName = "ElDT Supabase Backup"

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
  throw "No se encontró pg_dump. Instalá las herramientas de línea de comandos de PostgreSQL y volvé a ejecutar este setup."
}

New-Item -ItemType Directory -Path $backupRoot -Force | Out-Null

$envPath = Join-Path $repoRoot ".env.local"
$projectUrl = $null
if (Test-Path $envPath) {
  $urlLine = Get-Content $envPath | Where-Object { $_ -match '^\s*NEXT_PUBLIC_SUPABASE_URL\s*=' } | Select-Object -First 1
  if ($urlLine -match '^\s*NEXT_PUBLIC_SUPABASE_URL\s*=\s*(.+?)\s*$') {
    $projectUrl = $Matches[1].Trim().Trim('"').Trim("'")
  }
}
if ([string]::IsNullOrWhiteSpace($projectUrl)) {
  $projectUrl = Read-Host "URL del proyecto Supabase (https://....supabase.co)"
}
if ($projectUrl -notmatch '^https://[^/]+\.supabase\.co/?$') {
  throw "La URL del proyecto no tiene el formato esperado de Supabase."
}

$credentialsInput = Read-SupabaseCredentials

[pscustomobject]@{
  ProjectUrl     = $projectUrl
  DatabaseUrl    = $credentialsInput.DatabaseUrl
  ServiceRoleKey = $credentialsInput.ServiceRoleKey
} | Export-Clixml -Path $credentialsPath

$powershell = (Get-Process -Id $PID).Path
$action = New-ScheduledTaskAction -Execute $powershell `
  -Argument "-NoProfile -ExecutionPolicy Bypass -File `"$backupScript`""
$dailyTrigger = New-ScheduledTaskTrigger -Daily -At "3:00 AM"
$logonTrigger = New-ScheduledTaskTrigger -AtLogOn -User $env:USERNAME
$principal = New-ScheduledTaskPrincipal -UserId $env:USERNAME -LogonType Interactive -RunLevel Limited
$settings = New-ScheduledTaskSettingsSet -StartWhenAvailable -ExecutionTimeLimit (New-TimeSpan -Hours 4)

Register-ScheduledTask -TaskName $taskName -Action $action `
  -Trigger @($dailyTrigger, $logonTrigger) -Principal $principal `
  -Settings $settings -Description "Copia local de la base y archivos de Supabase para El DT." `
  -Force | Out-Null

Write-Output "Configuración guardada con protección de Windows para este usuario: $credentialsPath"
Write-Output "Tarea diaria y al iniciar sesión registrada: $taskName"
Write-Output "Ejecutá ahora scripts\backup-supabase.ps1 para probar el primer respaldo."
