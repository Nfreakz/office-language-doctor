$ErrorActionPreference = "Stop"

$testDir = Join-Path $env:RUNNER_TEMP "office-language-doctor-live-vba"
if (Test-Path $testDir) { Remove-Item -Recurse -Force $testDir }
New-Item -ItemType Directory -Path $testDir -Force | Out-Null

$wordPath = Join-Path $testDir "LanguageDoctor_LiveVBA_Word.docm"
$pptPath = Join-Path $testDir "LanguageDoctor_LiveVBA_PowerPoint.pptm"

function Release-ComObject {
  param([object]$Object)
  if ($null -ne $Object) {
    try { [System.Runtime.InteropServices.Marshal]::ReleaseComObject($Object) | Out-Null } catch {}
  }
}

$word = $null
$doc = $null
try {
  $word = New-Object -ComObject Word.Application
  $word.Visible = $false
  $word.DisplayAlerts = 0
  $doc = $word.Documents.Add()
  $doc.Content.Text = "Benvinguts a la sessió. Aquesta prova valida que el codi VBA continua executable després de reparar la llengua."
  $doc.Content.LanguageID = 1033

  try {
    $module = $doc.VBProject.VBComponents.Add(1)
  } catch {
    throw "VBA_OBJECT_MODEL_BLOCKED_WORD: $($_.Exception.Message)"
  }

  $module.Name = "LanguageDoctorProbe"
  $module.CodeModule.AddFromString(@"
Public Sub LanguageDoctorVbaProbe()
    On Error Resume Next
    ActiveDocument.Variables("LanguageDoctorProbe").Delete
    On Error GoTo 0
    ActiveDocument.Variables.Add Name:="LanguageDoctorProbe", Value:="OK"
End Sub
"@)

  $doc.SaveAs2($wordPath, 13)
  $word.Run("LanguageDoctorVbaProbe")
  if ($doc.Variables.Item("LanguageDoctorProbe").Value -ne "OK") {
    throw "Word VBA probe did not execute before repair"
  }

  $doc.Save()
  $doc.Close($false)
  Release-ComObject $doc
  $doc = $null

  $doc = $word.Documents.Open($wordPath, $false, $false)
  $word.Run("LanguageDoctorVbaProbe")
  if ($doc.Variables.Item("LanguageDoctorProbe").Value -ne "OK") {
    throw "Word persisted VBA probe did not execute before repair"
  }

  $doc.Close($false)
  Release-ComObject $doc
  $doc = $null
  Write-Host "LIVE_VBA_BEFORE_OK Word"
} finally {
  if ($doc) {
    try { $doc.Close($false) } catch {}
    Release-ComObject $doc
  }
  if ($word) {
    try { $word.Quit() } catch {}
    Release-ComObject $word
  }
  [GC]::Collect()
  [GC]::WaitForPendingFinalizers()
}

$ppt = $null
$presentation = $null
try {
  $ppt = New-Object -ComObject PowerPoint.Application
  $presentation = $ppt.Presentations.Add()
  $slide = $presentation.Slides.Add(1, 12)
  $shape = $slide.Shapes.AddTextbox(1, 40, 40, 650, 120)
  $shape.TextFrame.TextRange.Text = "Benvinguts a la sessió. Aquesta prova valida que el codi VBA continua executable després de reparar la llengua."
  $shape.TextFrame.TextRange.LanguageID = 1033

  try {
    $module = $presentation.VBProject.VBComponents.Add(1)
  } catch {
    throw "VBA_OBJECT_MODEL_BLOCKED_POWERPOINT: $($_.Exception.Message)"
  }

  $module.Name = "LanguageDoctorProbe"
  $module.CodeModule.AddFromString(@"
Public Sub LanguageDoctorVbaProbe()
    ActivePresentation.Slides(1).Tags.Add "LanguageDoctorProbe", "OK"
End Sub
"@)

  $presentation.SaveAs($pptPath, 25)
  $ppt.Run("LanguageDoctorVbaProbe")
  if ($presentation.Slides.Item(1).Tags.Item("LanguageDoctorProbe") -ne "OK") {
    throw "PowerPoint VBA probe did not execute before repair"
  }

  $presentation.Save()
  $presentation.Close()
  Release-ComObject $presentation
  $presentation = $null

  $presentation = $ppt.Presentations.Open($pptPath, $true, $false, $false)
  $ppt.Run("LanguageDoctorVbaProbe")
  if ($presentation.Slides.Item(1).Tags.Item("LanguageDoctorProbe") -ne "OK") {
    throw "PowerPoint persisted VBA probe did not execute before repair"
  }

  $presentation.Close()
  Release-ComObject $presentation
  $presentation = $null
  Write-Host "LIVE_VBA_BEFORE_OK PowerPoint"
} finally {
  if ($presentation) {
    try { $presentation.Close() } catch {}
    Release-ComObject $presentation
  }
  if ($ppt) {
    try { $ppt.Quit() } catch {}
    Release-ComObject $ppt
  }
  [GC]::Collect()
  [GC]::WaitForPendingFinalizers()
}

& npx tsx scripts/check-live-vba-fixtures.mts "$testDir"
if ($LASTEXITCODE -ne 0) { throw "Office Language Doctor fixture repair failed" }

$wordRepaired = Join-Path $testDir "LanguageDoctor_LiveVBA_Word_repaired.docm"
$pptRepaired = Join-Path $testDir "LanguageDoctor_LiveVBA_PowerPoint_repaired.pptm"

$word = $null
$doc = $null
try {
  $word = New-Object -ComObject Word.Application
  $word.Visible = $false
  $word.DisplayAlerts = 0
  $doc = $word.Documents.Open($wordRepaired, $false, $false)
  $word.Run("LanguageDoctorVbaProbe")

  if ($doc.Variables.Item("LanguageDoctorProbe").Value -ne "OK") {
    throw "Word VBA probe did not execute after repair"
  }

  Write-Host "LIVE_VBA_AFTER_OK Word"
} finally {
  if ($doc) {
    try { $doc.Close($false) } catch {}
    Release-ComObject $doc
  }
  if ($word) {
    try { $word.Quit() } catch {}
    Release-ComObject $word
  }
  [GC]::Collect()
  [GC]::WaitForPendingFinalizers()
}

$ppt = $null
$presentation = $null
try {
  $ppt = New-Object -ComObject PowerPoint.Application
  $presentation = $ppt.Presentations.Open($pptRepaired, $true, $false, $false)
  $ppt.Run("LanguageDoctorVbaProbe")

  if ($presentation.Slides.Item(1).Tags.Item("LanguageDoctorProbe") -ne "OK") {
    throw "PowerPoint VBA probe did not execute after repair"
  }

  Write-Host "LIVE_VBA_AFTER_OK PowerPoint"
} finally {
  if ($presentation) {
    try { $presentation.Close() } catch {}
    Release-ComObject $presentation
  }
  if ($ppt) {
    try { $ppt.Quit() } catch {}
    Release-ComObject $ppt
  }
  [GC]::Collect()
  [GC]::WaitForPendingFinalizers()
}

Write-Host "LIVE_VBA_VALIDATION_OK Word DOCM and PowerPoint PPTM"
