# Script to fetch the ConnectWiseManageAPI module and save it locally
param(
    [switch]$Force
)

$ErrorActionPreference = "Stop"
$moduleDir = Join-Path $PSScriptRoot "modules" "ConnectWiseManageAPI"

function Fetch-GitHubRepo {
    param(
        [string]$RepoUrl,
        [string]$DestinationPath,
        [switch]$Force
    )

    Write-Host "Downloading ConnectWiseManageAPI module from GitHub..." -ForegroundColor Cyan
    
    # Create destination directory if it doesn't exist
    if (-not (Test-Path $DestinationPath -PathType Container)) {
        New-Item -Path $DestinationPath -ItemType Directory -Force | Out-Null
    } elseif ($Force -and (Test-Path $DestinationPath -PathType Container)) {
        Write-Host "Removing existing module directory..." -ForegroundColor Yellow
        Remove-Item -Path $DestinationPath -Recurse -Force
        New-Item -Path $DestinationPath -ItemType Directory -Force | Out-Null
    } elseif (Test-Path $DestinationPath -PathType Container) {
        Write-Host "Module directory already exists. Use -Force to overwrite." -ForegroundColor Yellow
        return
    }

    # Create a temporary zip file location
    $tempZipPath = Join-Path $env:TEMP "ConnectWiseManageAPI.zip"
    
    try {
        # Download the repository as a ZIP file
        Write-Host "Downloading from $RepoUrl..." -ForegroundColor Yellow
        [Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
        Invoke-WebRequest -Uri "$RepoUrl/archive/refs/heads/master.zip" -OutFile $tempZipPath
        
        # Extract to a temporary directory
        $tempExtractPath = Join-Path $env:TEMP "ConnectWiseManageAPI-extract"
        if (Test-Path $tempExtractPath) {
            Remove-Item -Path $tempExtractPath -Recurse -Force
        }
        
        Write-Host "Extracting module files..." -ForegroundColor Yellow
        Expand-Archive -Path $tempZipPath -DestinationPath $tempExtractPath -Force
        
        # Copy the module files
        $extractedModulePath = Join-Path $tempExtractPath "ConnectWiseManageAPI-master" "ConnectWiseManageAPI"
        
        if (Test-Path $extractedModulePath) {
            Write-Host "Copying module files to $DestinationPath..." -ForegroundColor Yellow
            Copy-Item -Path $extractedModulePath\* -Destination $DestinationPath -Recurse -Force
            
            # Copy the module manifest from the parent directory
            $manifestPath = Join-Path $tempExtractPath "ConnectWiseManageAPI-master" "ConnectWiseManageAPI.psd1"
            if (Test-Path $manifestPath) {
                Copy-Item -Path $manifestPath -Destination $DestinationPath -Force
            }
            
            Write-Host "Module files successfully copied to $DestinationPath" -ForegroundColor Green
        } else {
            Write-Error "Could not find the ConnectWiseManageAPI module in the downloaded repository."
        }
    } catch {
        Write-Error "Error downloading and extracting the module: $_"
        throw $_
    } finally {
        # Clean up temporary files
        if (Test-Path $tempZipPath) {
            Remove-Item -Path $tempZipPath -Force
        }
        if (Test-Path $tempExtractPath) {
            Remove-Item -Path $tempExtractPath -Recurse -Force
        }
    }
}

# Download and copy the module
Fetch-GitHubRepo -RepoUrl "https://github.com/christaylorcodes/ConnectWiseManageAPI" -DestinationPath $moduleDir -Force:$Force

Write-Host ""
Write-Host "ConnectWiseManageAPI module has been bundled with the MCP server." -ForegroundColor Green
Write-Host "You can now use the MCP server without separately installing the PowerShell module." -ForegroundColor Green