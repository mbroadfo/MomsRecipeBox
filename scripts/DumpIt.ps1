param (
    [string]$RootPath = ".",
    
    # List of folder names to exclude (relative, not full paths)
    [string[]]$ExcludeFolders = @("node_modules", "bin", "obj", ".git", "infra\.terraform", "db\backups"),

    # File extensions to include (e.g., ".ps1", ".js"), or empty to include all
    [string[]]$IncludeExtensions = @(),

    # File extensions to exclude (e.g., ".md", ".log")
    [string[]]$ExcludeExtensions = @(".log", ".md", ".json", ".tfstate", ".backup", ".tfvars", ".hcl")
)

function Get-CodeFiles {
    param (
        [string]$BasePath
    )

    Get-ChildItem -Path $BasePath -Recurse -File |
        Where-Object {
            # Exclude folders by checking the path components
            foreach ($folder in $ExcludeFolders) {
                if ($_.FullName -match [regex]::Escape("\$folder\")) {
                    return $false
                }
            }

            # Include extensions filter (if any)
            if ($IncludeExtensions.Count -gt 0 -and ($IncludeExtensions -notcontains $_.Extension)) {
                return $false
            }

            # Exclude extensions filter
            if ($ExcludeExtensions -contains $_.Extension) {
                return $false
            }

            return $true
        }
}

Write-Host "`n Scanning '$RootPath' for code files..."
$files = Get-CodeFiles -BasePath (Resolve-Path $RootPath)

Write-Host "`n Found $($files.Count) file(s):"
$files | ForEach-Object { Write-Host $_.FullName }

Write-Host "`n Code Dumped: CodeFileList.txt"
$path = "CodeFileList.txt"
$files | Select-Object -ExpandProperty FullName | Out-File -FilePath $path -Encoding utf8

# Dump contents of all code files into a single file with headers
$dumpFile = "CodeFileDump.txt"
Remove-Item -Path $dumpFile -ErrorAction SilentlyContinue

foreach ($file in $files) {
    Add-Content -Path $dumpFile -Value "## === File: $($file.FullName) ==="
    Add-Content -Path $dumpFile -Value ""
    Get-Content -Path $file.FullName | Add-Content -Path $dumpFile
    Add-Content -Path $dumpFile -Value "`n"  # add extra newline between files
}

Write-Host "`n Code contents written to: $dumpFile"
