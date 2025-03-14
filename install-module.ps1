# Script to install the ConnectWiseManageAPI module locally or globally

param(
    [switch]$Local,
    [switch]$Force,
    [switch]$Bundle
)

$ErrorActionPreference = "Stop"

function Install-LocalModule {
    Write-Host "Installing ConnectWiseManageAPI module locally..." -ForegroundColor Cyan
    
    # Create modules directory if it doesn't exist
    $modulesDir = Join-Path $PSScriptRoot "modules"
    $moduleDir = Join-Path $modulesDir "ConnectWiseManageAPI"
    
    if (-not (Test-Path $modulesDir)) {
        Write-Host "Creating modules directory..." -ForegroundColor Yellow
        New-Item -Path $modulesDir -ItemType Directory -Force | Out-Null
    }
    
    # Clone the repository
    Write-Host "Cloning ConnectWiseManageAPI repository..." -ForegroundColor Yellow
    try {
        # Check if git is installed
        if (Get-Command git -ErrorAction SilentlyContinue) {
            Set-Location $modulesDir
            if (Test-Path $moduleDir) {
                if ($Force) {
                    Remove-Item $moduleDir -Recurse -Force
                    git clone https://github.com/jasondsmith72/ConnectWiseManageAPI.git
                } else {
                    Write-Host "ConnectWiseManageAPI directory already exists. Use -Force to overwrite." -ForegroundColor Yellow
                }
            } else {
                git clone https://github.com/jasondsmith72/ConnectWiseManageAPI.git
            }
        } else {
            Write-Error "Git is not installed. Please install Git or use the global installation method."
        }
    } catch {
        Write-Error "Failed to clone repository: $_"
    }
    
    Write-Host "ConnectWiseManageAPI module installed locally successfully!" -ForegroundColor Green
}

function Install-GlobalModule {
    Write-Host "Installing ConnectWiseManageAPI module globally..." -ForegroundColor Cyan
    
    try {
        # Check if module is already installed
        $moduleInstalled = Get-Module -ListAvailable -Name ConnectWiseManageAPI
        
        if ($moduleInstalled -and -not $Force) {
            Write-Host "ConnectWiseManageAPI module is already installed. Use -Force to reinstall." -ForegroundColor Yellow
            return
        }
        
        # Install the module from PowerShell Gallery
        if ($Force) {
            Install-Module -Name ConnectWiseManageAPI -Force -AllowClobber
        } else {
            Install-Module -Name ConnectWiseManageAPI
        }
        
        Write-Host "ConnectWiseManageAPI module installed globally successfully!" -ForegroundColor Green
    } catch {
        Write-Error "Failed to install module: $_"
    }
}

function Install-BundledModule {
    Write-Host "Checking for bundled module..." -ForegroundColor Cyan
    
    # Check if fetch-module.ps1 exists
    $fetchScriptPath = Join-Path $PSScriptRoot "fetch-module.ps1"
    if (Test-Path $fetchScriptPath) {
        Write-Host "Fetching the ConnectWiseManageAPI module using fetch-module.ps1..." -ForegroundColor Yellow
        try {
            & $fetchScriptPath -Force:$Force
        }
        catch {
            Write-Error "Failed to fetch module: $_"
            throw
        }
    } 
    else {
        Write-Error "The fetch-module.ps1 script was not found. Make sure it exists in the same directory as this script."
    }
}

if ($Bundle) {
    Install-BundledModule
}
elseif ($Local) {
    Install-LocalModule
} 
else {
    Install-GlobalModule
}
