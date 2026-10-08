$ErrorActionPreference = "Stop"
$ProjectRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$NodeModules = "C:\Users\27800\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\node_modules"
$Link = Join-Path $ProjectRoot "node_modules"
if (-not (Test-Path -LiteralPath $Link)) {
    New-Item -ItemType Junction -Path $Link -Target $NodeModules | Out-Null
}