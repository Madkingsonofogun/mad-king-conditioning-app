$ErrorActionPreference = "Continue"

$repo = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $repo

$gitDir = Join-Path $repo ".codex-git"
$branch = "main"
$remote = "origin"

Write-Host "Mad King GitHub auto-update is running."
Write-Host "Keep this window open while you work."
Write-Host "It checks for changes every 60 seconds and uploads them to GitHub."
Write-Host ""

while ($true) {
  $stamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
  $status = git --git-dir="$gitDir" --work-tree="$repo" status --short

  if ($status) {
    Write-Host "[$stamp] Changes found. Saving and uploading..."
    git --git-dir="$gitDir" --work-tree="$repo" add .
    git --git-dir="$gitDir" --work-tree="$repo" commit -m "Auto update app changes"

    if ($LASTEXITCODE -eq 0) {
      git --git-dir="$gitDir" --work-tree="$repo" push -u $remote $branch
      if ($LASTEXITCODE -eq 0) {
        Write-Host "[$stamp] GitHub updated."
      } else {
        Write-Host "[$stamp] Upload failed. Sign in to GitHub if Windows asks, then this will try again."
      }
    } else {
      Write-Host "[$stamp] Nothing new to commit after staging."
    }
  } else {
    Write-Host "[$stamp] No changes."
  }

  Start-Sleep -Seconds 60
}
