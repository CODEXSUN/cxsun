param(
    [string]$InstallerPath
)

$ErrorActionPreference = "Stop"
$windowsRoot = Split-Path -Parent $PSScriptRoot
$repositoryRoot = [IO.Path]::GetFullPath((Join-Path $windowsRoot "..\..\.."))
if (-not $InstallerPath) {
    $InstallerPath = Join-Path $repositoryRoot "dist\releases\windows\CXSUN.Windows.Setup.exe"
}
$resolvedInstaller = Resolve-Path -LiteralPath $InstallerPath

Get-Process -Name "cxsun-windows" -ErrorAction SilentlyContinue | Stop-Process -Force
$legacyPackage = Get-AppxPackage -Name "CODEXSUN.CXSUN.Windows"
if ($legacyPackage) {
    $legacyPackage | Remove-AppxPackage
}

$process = Start-Process -FilePath $resolvedInstaller -ArgumentList "/S" -PassThru -Wait
if ($process.ExitCode -ne 0) {
    throw "The CXSUN installer exited with code $($process.ExitCode)."
}
Write-Host "CXSUN Tauri was installed for the current Windows user. Local workspace data was preserved."
