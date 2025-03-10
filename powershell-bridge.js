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
 * @returns {Promise<boolean>} - True if the module is available locally
 */
async function checkLocalModuleAvailability() {
  const moduleDir = path.join(__dirname, 'modules', 'ConnectWiseManageAPI');
  try {
    return fs.existsSync(moduleDir);
  } catch (error) {
    console.warn('Error checking for local module:', error);
    return false;
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
    const hasLocalModule = await checkLocalModuleAvailability();
    
    // Create a PowerShell script that imports the module and runs the command
    const script = `
      # Check if module is installed globally
      $moduleInstalled = $false
      
      ${hasLocalModule ? `
      # Check if we have a local module
      $localModulePath = "${path.join(__dirname, 'modules', 'ConnectWiseManageAPI').replace(/\\/g, '\\\\')}"
      if (Test-Path $localModulePath) {
        Write-Verbose "Using local ConnectWiseManageAPI module from $localModulePath"
        Import-Module "$localModulePath"
        $moduleInstalled = $true
      }
      ` : ''}
      
      # If no local module, try global module
      if (-not $moduleInstalled) {
        if (Get-Module -ListAvailable -Name ConnectWiseManageAPI) {
          Write-Verbose "Using global ConnectWiseManageAPI module"
          Import-Module ConnectWiseManageAPI
          $moduleInstalled = $true
        }
      }
      
      # If module is still not installed, exit with error
      if (-not $moduleInstalled) {
        Write-Error "ConnectWiseManageAPI module is not installed"
        exit 1
      }

      # Connect to the CWM server if not already connected
      if (-not $CWMServerConnection) {
        try {
          Connect-CWM -Server "${process.env.CWM_SERVER}" -Company "${process.env.CWM_COMPANY}" -PubKey "${process.env.CWM_PUBKEY}" -PrivateKey "${process.env.CWM_PRIVATEKEY}" -ClientID "${process.env.CWM_CLIENTID}"
        } catch {
          Write-Error "Failed to connect to ConnectWise Manage: $_"
          exit 1
        }
      }

      # Execute the command
      try {
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