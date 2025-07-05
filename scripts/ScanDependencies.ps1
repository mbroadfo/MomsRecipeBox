$folders = @("app", "ui")

foreach ($folder in $folders) {
    $outputFile = ".\scripts\Dependencies_$folder.txt"
    Write-Host "Scanning $folder... (saving to $outputFile)" -ForegroundColor Yellow

    $results = @()

    $files = Get-ChildItem -Path $folder -Recurse -Include *.js, *.ts -File

    foreach ($file in $files) {
        $lines = Get-Content $file.FullName

        foreach ($line in $lines) {
            if ($line -like '*require(*)*' -or $line -like '*import*from*') {
                if ($line -match '"([^"./][^"]*)"' -or $line -match "'([^./][^']*)'") {
                    $dep = $matches[1]
                    if ($dep -and $dep -notmatch '^\.' -and $dep -notmatch '^/') {
                        $results += $dep
                    }
                }
            }
        }
    }

    $uniqueSorted = $results | Sort-Object -Unique
    $uniqueSorted | Out-File -FilePath $outputFile -Encoding UTF8
    Write-Host "Found $($uniqueSorted.Count) dependencies in $folder."
}
