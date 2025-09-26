# Markdown Linting Fix Script
# Fixes common linting issues in our documentation files

$files = @(
    "C:\Users\Mike\Documents\Code\MomsRecipeBox\README.md",
    "C:\Users\Mike\Documents\Code\MomsRecipeBox\CHANGELOG.md",
    "C:\Users\Mike\Documents\Code\MomsRecipeBox\docs-archive\README.md"
)

foreach ($file in $files) {
    if (Test-Path $file) {
        Write-Host "Fixing: $file"
        
        # Read the file content
        $content = Get-Content $file -Raw
        
        # Fix common issues:
        # 1. Ensure single trailing newline (MD047)
        $content = $content.TrimEnd() + "`n"
        
        # 2. Add blank lines around lists (MD032)
        $content = $content -replace '([^\r\n])\r?\n([ \t]*[-*+])', "`$1`n`n`$2"
        $content = $content -replace '([ \t]*[-*+][^\r\n]*)\r?\n([^\r\n\s-*+])', "`$1`n`n`$2"
        
        # 3. Add blank lines around headings (MD022)  
        $content = $content -replace '([^\r\n])\r?\n(#{1,6} )', "`$1`n`n`$2"
        $content = $content -replace '(#{1,6} [^\r\n]*)\r?\n([^\r\n\s#])', "`$1`n`n`$2"
        
        # 4. Remove trailing spaces (MD009)
        $content = $content -replace '[ \t]+\r?\n', "`n"
        
        # Write back to file
        $content | Out-File $file -Encoding UTF8 -NoNewline
        
        Write-Host "  Fixed: $file"
    } else {
        Write-Host "  Skipped: $file (not found)"
    }
}