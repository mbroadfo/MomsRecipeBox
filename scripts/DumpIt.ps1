param (
    [string]$RootPath = ".",
    
    # List of folder names to exclude (relative, not full paths)
    [string[]]$ExcludeFolders = @("node_modules", "bin", "obj", ".git", "infra\.terraform", "db\backups", "output"),

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

            # Exclude specific output files by name
            $fileName = $_.Name
            if ($fileName -eq "CodeFileDump.txt" -or $fileName -eq "CodeFileList.txt") {
                return $false
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

# Create output directory if it doesn't exist
$outputDir = Join-Path $RootPath "output"
if (-not (Test-Path $outputDir)) {
    New-Item -ItemType Directory -Path $outputDir -Force | Out-Null
    Write-Host "Created output directory: $outputDir"
}

Write-Host "`n Scanning '$RootPath' for code files..."
$files = Get-CodeFiles -BasePath (Resolve-Path $RootPath)

Write-Host "`n Found $($files.Count) file(s):"
$files | ForEach-Object { Write-Host $_.FullName }

# Output file paths
$listPath = Join-Path $outputDir "CodeFileList.txt"
$dumpPath = Join-Path $outputDir "CodeFileDump.txt"

Write-Host "`n Code file list written to: $listPath"
$files | Select-Object -ExpandProperty FullName | Out-File -FilePath $listPath -Encoding utf8

# Remove existing dump file to avoid conflicts
if (Test-Path $dumpPath) {
    Remove-Item -Path $dumpPath -Force
}

# Create new dump file
New-Item -ItemType File -Path $dumpPath -Force | Out-Null

# Dump contents of all code files into a single file with headers
foreach ($file in $files) {
    try {
        Add-Content -Path $dumpPath -Value "## === File: $($file.FullName) ==="
        Add-Content -Path $dumpPath -Value ""
        
        # Read file content first, then write to avoid file lock issues
        $content = Get-Content -Path $file.FullName -ErrorAction Stop
        $content | Add-Content -Path $dumpPath
        
        Add-Content -Path $dumpPath -Value "`n"  # add extra newline between files
    }
    catch {
        Write-Warning "Failed to read file: $($file.FullName). Error: $($_.Exception.Message)"
        Add-Content -Path $dumpPath -Value "## === ERROR: Could not read file $($file.FullName) ==="
        Add-Content -Path $dumpPath -Value "## Error: $($_.Exception.Message)"
        Add-Content -Path $dumpPath -Value "`n"
    }
}

Write-Host "`n Code contents written to: $dumpPath"
Write-Host "`n Output files created in: $outputDir"