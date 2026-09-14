param(
    [switch]$SkipUpdate,
    [switch]$SkipInstall
)

$ErrorActionPreference = 'Stop'
$project = $PSScriptRoot
$downloads = 'D:\Downloads'
$staging = Join-Path ([IO.Path]::GetTempPath()) ('prompt-modifier-update-' + [guid]::NewGuid())
$log = Join-Path $project 'update_build_install.log'
$transcribing = $false

try {
    Start-Transcript -LiteralPath $log -Force | Out-Null
    $transcribing = $true
    if (-not $SkipUpdate) {
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
    } else {
        Write-Host 'Building current project files (ZIP extraction skipped).'
    }

    $package = Get-Content -LiteralPath (Join-Path $project 'package.json') -Raw | ConvertFrom-Json
    $version = [string]$package.version
    if ($version -notmatch '^\d+\.\d+\.\d+(?:[-+][0-9A-Za-z.+-]+)?$') { throw "Invalid package version: $version" }
    $build = Join-Path $project '3_build_electron.bat'
    if (-not (Test-Path -LiteralPath $build)) { throw "Build script missing: $build" }

    # Close the installed/unpacked app before electron-builder replaces its files.
    $appProcesses = @(Get-Process -Name 'Prompt Modifier' -ErrorAction SilentlyContinue)
    if ($appProcesses.Count -gt 0) {
        Write-Host 'Closing Prompt Modifier before building...'
        foreach ($appProcess in $appProcesses) {
            if (-not $appProcess.HasExited) { [void]$appProcess.CloseMainWindow() }
        }
        $closeDeadline = [DateTime]::UtcNow.AddSeconds(5)
        do {
            $remaining = @(Get-Process -Name 'Prompt Modifier' -ErrorAction SilentlyContinue)
            if ($remaining.Count -eq 0) { break }
            Start-Sleep -Milliseconds 200
        } while ([DateTime]::UtcNow -lt $closeDeadline)

        foreach ($appProcess in $remaining) {
            if (-not $appProcess.HasExited) {
                Stop-Process -InputObject $appProcess -Force
                if (-not $appProcess.WaitForExit(5000)) {
                    throw "Prompt Modifier process $($appProcess.Id) did not exit."
                }
            }
        }
        if (Get-Process -Name 'Prompt Modifier' -ErrorAction SilentlyContinue) {
            throw 'Prompt Modifier is still running. Cannot start the build.'
        }
        Write-Host 'Prompt Modifier closed.'
    }

    $started = [DateTime]::UtcNow
    Push-Location $project
    try {
        & $env:ComSpec /d /c 'call "3_build_electron.bat" --no-pause < nul'
        if ($LASTEXITCODE -ne 0) { throw "Build failed with exit code $LASTEXITCODE" }
    } finally {
        Pop-Location
    }
    $installer = Join-Path $project "dist-electron\Prompt Modifier Setup $version.exe"
    if (-not (Test-Path -LiteralPath $installer)) { throw "Installer missing: $installer" }
    if ((Get-Item -LiteralPath $installer).LastWriteTimeUtc -lt $started) {
        throw 'The installer was not updated by this build. Refusing to launch an older installer.'
    }
    if ($SkipInstall) {
        Write-Host "Installer ready (launch skipped): $installer"
    } else {
        Write-Host "Starting installer: $installer"
        # This is an interactive installer; show its window and wait for its result.
        $installation = Start-Process -FilePath $installer -PassThru -Wait
        if ($installation.ExitCode -ne 0) {
            throw "Installer failed or was cancelled (exit code $($installation.ExitCode))."
        }
        Write-Host 'Installation completed.'
    }
} catch {
    Write-Host "ERROR: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host "Log: $log"
    exit 1
} finally {
    # Delete only this run's unique temporary extraction directory.
    $tempRoot = [IO.Path]::GetFullPath([IO.Path]::GetTempPath()).TrimEnd('\') + '\'
    $resolvedStaging = [IO.Path]::GetFullPath($staging)
    if ($resolvedStaging.StartsWith($tempRoot, [StringComparison]::OrdinalIgnoreCase) -and
        (Test-Path -LiteralPath $resolvedStaging)) {
        Remove-Item -LiteralPath $resolvedStaging -Recurse -Force -ErrorAction SilentlyContinue
    }
    if ($transcribing) { Stop-Transcript | Out-Null }
}
