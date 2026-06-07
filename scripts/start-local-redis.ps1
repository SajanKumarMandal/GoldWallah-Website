$ErrorActionPreference = "Stop"

$redisPassword = if ($env:GOLDWALLAH_REDIS_PASSWORD) {
  $env:GOLDWALLAH_REDIS_PASSWORD
} else {
  "goldwallah-local-redis-change-me"
}

$redisServer = Get-ChildItem "$env:LOCALAPPDATA\Microsoft\WinGet\Packages" `
  -Recurse `
  -Filter redis-server.exe `
  -ErrorAction Stop |
  Where-Object { $_.FullName -like "*redis-windows-fork*" } |
  Select-Object -First 1 -ExpandProperty FullName

if (-not $redisServer) {
  throw "redis-server.exe was not found. Install taizod1024.redis-windows-fork with winget or use Docker Compose."
}

$redisDataDir = "S:\GoldWallah\tmp\redis"
New-Item -ItemType Directory -Force -Path $redisDataDir | Out-Null

$existing = Get-Process -Name redis-server -ErrorAction SilentlyContinue |
  Where-Object { $_.Path -eq $redisServer }

if ($existing) {
  Write-Host "Redis is already running on this machine."
  exit 0
}

Start-Process `
  -FilePath $redisServer `
  -ArgumentList @(
    "--bind", "127.0.0.1",
    "--port", "6379",
    "--protected-mode", "yes",
    "--appendonly", "yes",
    "--appendfsync", "everysec",
    "--dir", $redisDataDir,
    "--maxmemory-policy", "noeviction",
    "--requirepass", $redisPassword
  ) `
  -WindowStyle Hidden

Write-Host "Redis started on 127.0.0.1:6379."
