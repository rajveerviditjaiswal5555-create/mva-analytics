# Trigger a Render deploy using local credentials (never committed).
# Usage: .\scripts\deploy_render.ps1 [-Wait]

param([switch]$Wait)

$envFile = Join-Path $PSScriptRoot '..\render-deploy.env'
if (-not (Test-Path $envFile)) {
  Write-Error "Missing render-deploy.env. Create it in the project root with:
RENDER_API_KEY=rnd_...
RENDER_SERVICE_ID=srv_..."
  exit 1
}

foreach ($line in Get-Content $envFile) {
  if ($line -match '^\s*([A-Z0-9_]+)\s*=\s*(.+?)\s*$') {
    Set-Item -Path "env:$($Matches[1])" -Value $Matches[2]
  }
}

$key = $env:RENDER_API_KEY
$sid = $env:RENDER_SERVICE_ID
if (-not $key -or -not $sid) {
  Write-Error 'RENDER_API_KEY and RENDER_SERVICE_ID must both be set in render-deploy.env'
  exit 1
}

$headers = @{ Authorization = "Bearer $key"; 'Content-Type' = 'application/json' }
$uri = "https://api.render.com/v1/services/$sid/deploys"

try {
  $response = Invoke-RestMethod -Method Post -Uri $uri -Headers $headers -Body '{"clearCache":"false"}'
} catch {
  Write-Error "Deploy request failed: $($_.Exception.Message)"
  exit 1
}

$deployId = $response.deploy.id
if (-not $deployId) { $deployId = $response.id }
Write-Host "Deploy triggered: $deployId"

if ($Wait) {
  for ($i = 0; $i -lt 90; $i++) {
    Start-Sleep -Seconds 10
    try {
      $statusResponse = Invoke-RestMethod -Method Get -Uri "$uri/$deployId" -Headers $headers
      $status = $statusResponse.deploy.status
      if (-not $status) { $status = $statusResponse.status }
      Write-Host "[$i] status: $status"
      if ($status -eq 'live' -or $status -eq 'succeeded') {
        Write-Host 'Deploy is LIVE.'
        exit 0
      }
      if ($status -match 'failed|cancelled') {
        Write-Error "Deploy failed with status: $status"
        exit 1
      }
    } catch {
      Write-Host "[$i] status check error: $($_.Exception.Message)"
    }
  }
  Write-Warning 'Timed out waiting for deploy; check the Render dashboard.'
}
