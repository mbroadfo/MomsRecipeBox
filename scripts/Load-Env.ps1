# Load-Env.ps1

$envPath = Join-Path -Path $PSScriptRoot -ChildPath "..\.env.local"
if (Test-Path $envPath) {
    Get-Content $envPath | ForEach-Object {
        if ($_ -match "^\s*([^#=]+?)\s*=\s*(.+)\s*$") {
            $key, $value = $matches[1], $matches[2]
            [System.Environment]::SetEnvironmentVariable($key, $value)
        }
    }
    Write-Host ".env.local variables loaded." -ForegroundColor Green
} else {
    Write-Warning ".env.local not found at $envPath"
}
