$ErrorActionPreference = "Stop"
$ProjectRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$Python = if ($env:PYTHON_EXE) { $env:PYTHON_EXE } else { "python" }
$Node = if ($env:NODE_EXE) { $env:NODE_EXE } else { "node" }

& (Join-Path $ProjectRoot "setup_node.ps1")
Push-Location $ProjectRoot
try {
    & $Python "src\generate_data.py"
    & $Node "--max-old-space-size=8192" "src\build_workbook.mjs"
    & (Join-Path $ProjectRoot "src\add_version_log.ps1")
    & (Join-Path $ProjectRoot "src\embed_power_queries.ps1")
    & (Join-Path $ProjectRoot "src\test_power_queries.ps1")
    & $Python "src\validate_data.py"
    & $Python "-m" "unittest" "discover" "-s" "tests" "-v"
}
finally {
    Pop-Location
}