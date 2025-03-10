const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

/**
 * Executes a PowerShell command and returns the result
 * @param {string} command - The PowerShell command to execute
 * @returns {Promise<string>} - The output of the command
 */
function executePowerShell(command) {
  return new Promise((resolve, reject) => {
    // Create PowerShell process
    const ps = spawn('powershell.exe', ['-Command', command]);
    
    let stdout = '';
    let stderr = '';
    
    // Collect stdout data
    ps.stdout.on('data', (data) => {
      stdout += data.toString();
    });
    
    // Collect stderr data
    ps.stderr.on('data', (data) => {
      stderr += data.toString();
    });
    
    // Handle process completion
    ps.on('close', (code) => {
      if (code === 0) {
        resolve(stdout.trim());
      } else {
        reject(new Error(`PowerShell execution failed with code ${code}: ${stderr}`));
      }
    });
    
    // Handle process errors
    ps.on('error', (err) => {
      reject(new Error(`Failed to start PowerShell process: ${err.message}`));
    });
  });
}

/**
 * Checks if the ConnectWiseManageAPI module is available in the modules directory
 * @returns {Promise<{available: boolean, path: string|null}>} - Module availability and path
 */
async function checkLocalModuleAvailability() {
  const moduleDir = path.join(__dirname, 'modules', 'ConnectWiseManageAPI');
  
  try {
    // Check if module directory exists
    if (fs.existsSync(moduleDir)) {
      // Check for the module manifest file
      const manifestPath = path.join(moduleDir, 'ConnectWiseManageAPI.psd1');
      const psmPath = path.join(moduleDir, 'ConnectWiseManageAPI.psm1');
      
      if (fs.existsSync(manifestPath) || fs.existsSync(psmPath)) {
        console.log('Found bundled ConnectWiseManageAPI module');
        return { available: true, path: moduleDir };
      }
    }
    
    return { available: false, path: null };
  } catch (error) {
    console.warn('Error checking for local module:', error);
    return { available: false, path: null };
  }
}

/**
 * Executes a ConnectWise Manage API command via PowerShell
 * @param {Object} options - Command options
 * @param {string} options.command - The CWM command to run
 * @param {Object} options.params - Parameters for the command
 * @returns {Promise<Object>} - The parsed JSON result
 */
async function executeCWMCommand(options) {
  try {
    // Check if we have a local module
    const localModule = await checkLocalModuleAvailability();
    
    // Create a PowerShell script that imports the module and runs the command
    const script = `
      # Set verbose preference for debugging
      $VerbosePreference = 'Continue'
      
      # Check if module is already imported
      $moduleInstalled = $false
      $importedModule = Get-Module -Name ConnectWiseManageAPI
      if ($importedModule) {
        Write-Verbose "ConnectWiseManageAPI module is already imported"
        $moduleInstalled = $true
      }
      else {
        ${localModule.available ? `
        # First attempt to use the bundled module
        $localModulePath = "${localModule.path.replace(/\\/g, '\\\\')}"
        Write-Verbose "Attempting to import bundled module from $localModulePath"
        
        if (Test-Path $localModulePath) {
          try {
            Import-Module "$localModulePath" -ErrorAction Stop
            Write-Verbose "Successfully imported bundled ConnectWiseManageAPI module"
            $moduleInstalled = $true
          }
          catch {
            Write-Verbose "Failed to import bundled module: $_"
          }
        }
        ` : ''}
        
        # If bundled module couldn't be loaded, try the global module
        if (-not $moduleInstalled) {
          Write-Verbose "Attempting to import global ConnectWiseManageAPI module"
          if (Get-Module -ListAvailable -Name ConnectWiseManageAPI) {
            try {
              Import-Module ConnectWiseManageAPI -ErrorAction Stop
              Write-Verbose "Successfully imported global ConnectWiseManageAPI module"
              $moduleInstalled = $true
            }
            catch {
              Write-Verbose "Failed to import global module: $_"
            }
          }
        }
      }
      
      # If module is still not installed, exit with error
      if (-not $moduleInstalled) {
        Write-Error "ConnectWiseManageAPI module could not be found or imported. Please run './install-module.ps1 -Bundle' to install the module."
        exit 1
      }

      # Connect to the CWM server if not already connected
      if (-not $CWMServerConnection) {
        try {
          Write-Verbose "Connecting to ConnectWise Manage server..."
          Connect-CWM -Server "${process.env.CWM_SERVER}" -Company "${process.env.CWM_COMPANY}" -PubKey "${process.env.CWM_PUBKEY}" -PrivateKey "${process.env.CWM_PRIVATEKEY}" -ClientID "${process.env.CWM_CLIENTID}"
          Write-Verbose "Successfully connected to ConnectWise Manage server"
        } catch {
          Write-Error "Failed to connect to ConnectWise Manage: $_"
          exit 1
        }
      }

      # Execute the command
      try {
        Write-Verbose "Executing command: ${options.command} ${formatParams(options.params)}"
        $result = ${options.command} ${formatParams(options.params)}
        # Convert to JSON
        $result | ConvertTo-Json -Depth 10
      } catch {
        Write-Error "Command execution failed: $_"
        exit 1
      }
    `;
    
    // Execute the script
    const result = await executePowerShell(script);
    
    // Parse the result as JSON
    return JSON.parse(result);
  } catch (error) {
    console.error('Error executing CWM command:', error);
    throw error;
  }
}

/**
 * Format parameters for PowerShell commands
 * @param {Object} params - The parameters to format
 * @returns {string} - Formatted parameters
 */
function formatParams(params) {
  if (!params) return '';
  
  return Object.entries(params)
    .map(([key, value]) => {
      if (typeof value === 'string') {
        return `-${key} "${value}"`;
      } else if (typeof value === 'boolean') {
        return value ? `-${key}` : '';
      } else {
        return `-${key} ${value}`;
      }
    })
    .filter(Boolean)
    .join(' ');
}

module.exports = {
  executeCWMCommand
};