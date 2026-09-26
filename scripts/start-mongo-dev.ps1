# Starts a local MongoDB replica set for development, without touching the
# system MongoDB Windows service or requiring admin rights. Transactions
# (used by booking/manual-booking/availability-change) require a replica set.
#
# Usage: powershell -ExecutionPolicy Bypass -File scripts\start-mongo-dev.ps1

$ErrorActionPreference = "Stop"

$root = Split-Path -Parent $PSScriptRoot
$dataDir = Join-Path $root ".devdata\mongo"
$configPath = Join-Path $root ".devdata\mongod.cfg"
$logPath = Join-Path $root ".devdata\mongod.log"
$mongod = "C:\Program Files\MongoDB\Server\8.2\bin\mongod.exe"
$mongosh = "mongosh"

if (-not (Test-Path $mongod)) {
    Write-Error "mongod.exe not found at $mongod. Edit this script to point at your MongoDB installation."
}

New-Item -ItemType Directory -Force -Path $dataDir | Out-Null

@"
storage:
  dbPath: $dataDir
systemLog:
  destination: file
  logAppend: true
  path: $logPath
net:
  port: 27018
  bindIp: 127.0.0.1
replication:
  replSetName: rs0
"@ | Set-Content -Path $configPath -Encoding utf8

$running = Get-CimInstance Win32_Process -Filter "Name = 'mongod.exe'" |
    Where-Object { $_.CommandLine -like "*$configPath*" }

if ($running) {
    Write-Host "Dev MongoDB already running (PID $($running.ProcessId))."
} else {
    Write-Host "Starting dev MongoDB on port 27018..."
    Start-Process -FilePath $mongod -ArgumentList "--config", $configPath -WindowStyle Hidden
    Start-Sleep -Seconds 3
}

$status = & $mongosh --port 27018 --quiet --eval "try { rs.status().ok } catch (e) { -1 }"
if ($status -ne "1") {
    Write-Host "Initializing replica set rs0..."
    & $mongosh --port 27018 --quiet --eval "rs.initiate()" | Out-Null
    Start-Sleep -Seconds 2
}

Write-Host "MongoDB replica set ready at mongodb://localhost:27018/parkease?replicaSet=rs0"
