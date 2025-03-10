const { spawn } = require('child_process');
const path = require('path');

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
 * Executes a ConnectWise Manage API command via PowerShell
 * @param {Object} options - Command options
 * @param {string} options.command - The CWM command to run
 * @param {Object} options.params - Parameters for the command
 * @returns {Promise<Object>} - The parsed JSON result
 */
async function executeCWMCommand(options) {
  try {
    // Create a PowerShell script that imports the module and runs the command
    const script = `
      # Check if module is installed
      if (-not (Get-Module -ListAvailable -Name ConnectWiseManageAPI)) {
        Write-Error "ConnectWiseManageAPI module is not installed"
        exit 1
      }

      # Import the module
      Import-Module ConnectWiseManageAPI

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