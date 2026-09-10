$ErrorActionPreference = 'Stop'
$project = 'D:\Projects\Prompt-Modifier'
$downloads = 'D:\Downloads'
$staging = Join-Path ([IO.Path]::GetTempPath()) ('prompt-modifier-update-' + [guid]::NewGuid())

try {
    $archive = Get-ChildItem -LiteralPath $downloads -File -Filter 'prompt-modifier*.zip' |
        Sort-Object LastWriteTimeUtc -Descending | Select-Object -First 1
    if (-not $archive) { throw "No prompt-modifier*.zip archives found in $downloads" }
    Write-Host "Archive: $($archive.FullName)"
    Expand-Archive -LiteralPath $archive.FullName -DestinationPath $staging

    # Accept both a flat archive and an archive containing a single project folder.
    $source = $staging
    while (-not (Test-Path -LiteralPath (Join-Path $source 'package.json'))) {
        $children = @(Get-ChildItem -LiteralPath $source -Force)
        if ($children.Count -ne 1 -or -not $children[0].PSIsContainer) {
            throw 'The archive must contain package.json at its root or inside a single project folder.'
        }
        $source = $children[0].FullName
    }
    $package = Get-Content -LiteralPath (Join-Path $source 'package.json') -Raw | ConvertFrom-Json
    if ($package.name -ne 'prompt-modifier') { throw 'This archive is not a prompt-modifier project.' }
    Write-Host "Extracting version $($package.version) to $project (overwriting existing files)..."
    Get-ChildItem -LiteralPath $source -Force | Copy-Item -Destination $project -Recurse -Force

    $package = Get-Content -LiteralPath (Join-Path $project 'package.json') -Raw | ConvertFrom-Json
    $version = [string]$package.version
    if ($version -notmatch '^\d+\.\d+\.\d+(?:[-+][0-9A-Za-z.+-]+)?$') { throw "Invalid package version: $version" }
    $build = Join-Path $project '3_build_electron.bat'
    if (-not (Test-Path -LiteralPath $build)) { throw "Build script missing: $build" }
    $started = [DateTime]::UtcNow
    Push-Location $project
    try {
        # NUL lets the existing PAUSE commands finish without keyboard input.
        & $env:ComSpec /d /c 'call "3_build_electron.bat" < nul'
        if ($LASTEXITCODE -ne 0) { throw "Build failed with exit code $LASTEXITCODE" }
    } finally {
        Pop-Location
    }
    $installer = Join-Path $project "dist-electron\Prompt Modifier Setup $version.exe"
    if (-not (Test-Path -LiteralPath $installer)) { throw "Installer missing: $installer" }
    if ((Get-Item -LiteralPath $installer).LastWriteTimeUtc -lt $started) {
        throw 'The installer was not updated by this build. Refusing to launch an older installer.'
    }
    Write-Host "Starting installer: $installer"
    Start-Process -FilePath $installer
} catch {
    Write-Host "ERROR: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
} finally {
    # Delete only this run's unique temporary extraction directory.
    $tempRoot = [IO.Path]::GetFullPath([IO.Path]::GetTempPath()).TrimEnd('\') + '\'
    $resolvedStaging = [IO.Path]::GetFullPath($staging)
    if ($resolvedStaging.StartsWith($tempRoot, [StringComparison]::OrdinalIgnoreCase) -and
        (Test-Path -LiteralPath $resolvedStaging)) {
        Remove-Item -LiteralPath $resolvedStaging -Recurse -Force -ErrorAction SilentlyContinue
    }
}
