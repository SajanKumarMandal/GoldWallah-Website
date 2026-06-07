$ErrorActionPreference = "Stop"

$redisProcesses = Get-Process -Name redis-server -ErrorAction SilentlyContinue

if (-not $redisProcesses) {
  Write-Host "Redis is not running."
  exit 0
}

$redisProcesses | Stop-Process
Write-Host "Redis stopped."
