$ErrorActionPreference = 'Stop'
$files = @(Get-ChildItem .github/workflows -File | Where-Object { $_.Extension -in '.yml', '.yaml' })
if ($files.Count -eq 0) { throw 'No workflow files found' }

$pagesWorkflow = Join-Path '.github/workflows' 'deploy-pages.yml'
if (-not (Test-Path -LiteralPath $pagesWorkflow)) {
  throw 'GitHub Pages workflow is missing'
}
$pagesContent = Get-Content -LiteralPath $pagesWorkflow -Raw
if ($pagesContent -match '(?i)\bgh-pages\b') {
  throw 'Branch-source GitHub Pages deployment is forbidden: do not publish or trigger from gh-pages'
}
if ($pagesContent -notmatch '(?i)actions/deploy-pages@') {
  throw 'GitHub Pages must deploy through actions/deploy-pages from the self-hosted workflow'
}
if ($pagesContent -notmatch '(?i)actions/upload-pages-artifact@') {
  throw 'GitHub Pages must upload the Pages artifact from the self-hosted workflow'
}
foreach ($file in $files) {
  $blockIndent = -1
  foreach ($line in Get-Content $file.FullName) {
    if ([string]::IsNullOrWhiteSpace($line)) { continue }
    $indent = $line.Length - $line.TrimStart().Length
    if ($blockIndent -ge 0 -and $indent -gt $blockIndent) { continue }
    $blockIndent = -1
    $structural = ($line -replace '\s+#.*$', '').Trim()
    if ($structural.StartsWith('#')) { continue }
    if ($structural -match '^[\w-]+:\s*[|>][-+]?\s*$') { $blockIndent = $indent; continue }
    if ($structural -match '(?i)\b(?:ubuntu|windows|macos)-(?:latest|\d[\w.-]*)\b') {
      throw "GitHub-hosted runner label in $($file.Name): $($Matches[0])"
    }
  }
}
Write-Host 'Runner policy passed: no GitHub-hosted OS labels'
