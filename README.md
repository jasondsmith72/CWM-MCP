# ConnectWise Manage MCP Server

This is a Model Context Protocol (MCP) server for the ConnectWise Manage API.

## Prerequisites

1. Node.js (v14 or higher)
2. PowerShell 5.1 or higher
3. ConnectWiseManageAPI PowerShell module (see installation options below)
4. ConnectWise Manage API credentials

## Installation

1. Clone or download this repository
   ```
   git clone https://github.com/jasondsmith72/CWM-MCP.git
   cd CWM-MCP
   ```

2. Install the required Node.js dependencies:
   ```
   npm install
   ```

3. Install the ConnectWiseManageAPI PowerShell module using one of these methods:

   **Option 1 (Recommended):** Bundle the module with the MCP server (no external installation required)
   ```powershell
   # Run in PowerShell
   .\install-module.ps1 -Bundle
   ```
   
   **Option 2:** Install the module globally via PowerShell Gallery
   ```powershell
   # Run in PowerShell as Administrator
   Install-Module 'ConnectWiseManageAPI'
   ```
   
   **Option 3:** Install the module locally via Git
   ```powershell
   # Run in PowerShell
   .\install-module.ps1 -Local
   ```

4. Configure your environment variables by copying `.env.example` to `.env` and editing the values:
   ```
   PORT=3000
   CWM_SERVER=your-cwm-server
   CWM_COMPANY=your-company
   CWM_PUBKEY=your-public-key
   CWM_PRIVATEKEY=your-private-key
   CWM_CLIENTID=your-client-id
   ```

5. Start the server:
   ```
   npm start
   ```

   Or run the included batch file:
   ```
   start-server.bat
   ```

## Usage

The server implements the Model Context Protocol (MCP) for ConnectWise Manage API access.

### Creating a Context

```
POST /context
```

Response:
```json
{
  "contextId": "abc123",
  "status": "created"
}
```

### Connecting to ConnectWise Manage

```
POST /context/:contextId/connect
```

Body (optional, will use .env values if not provided):
```json
{
  "server": "na.myconnectwise.net",
  "company": "your-company",
  "pubKey": "your-public-key",
  "privateKey": "your-private-key",
  "clientId": "your-client-id"
}
```

### Getting System Info

```
POST /context/:contextId/getSystemInfo
```

### Getting Companies

```
POST /context/:contextId/getCompanies
```

Body (optional):
```json
{
  "conditions": "name like '%acme%'"
}
```

### Getting Tickets

```
POST /context/:contextId/getTickets
```

Body (optional):
```json
{
  "conditions": "status='Open'"
}
```

### Executing Custom Commands

```
POST /context/:contextId/executeCommand
```

Body:
```json
{
  "command": "Get-CWMMember",
  "params": {
    "Condition": "identifier='admin'"
  }
}
```

### Deleting a Context

```
DELETE /context/:contextId
```

## Implementation Details

This MCP server acts as a bridge between the Model Context Protocol and the ConnectWiseManageAPI PowerShell module. It provides a RESTful API that follows the MCP protocol pattern while internally using PowerShell to execute commands against the ConnectWise Manage API.

Key components:

1. **server.js** - The main Express.js server that implements the MCP endpoints
2. **powershell-bridge.js** - A bridge module that executes PowerShell commands and converts between JSON and PowerShell formats
3. **fetch-module.ps1** - Script to download and bundle the ConnectWiseManageAPI module with the server
4. **modules/ConnectWiseManageAPI** - Directory where the ConnectWiseManageAPI module is stored when bundled

## Module Loading

The server will attempt to load the ConnectWiseManageAPI module in the following order:

1. Bundled module in the `modules/ConnectWiseManageAPI` directory (if installed with `-Bundle` option)
2. Local module in the `modules/ConnectWiseManageAPI` directory (if installed with `-Local` option)
3. Global module installed in the PowerShell module path

## Troubleshooting

If you encounter issues with the ConnectWiseManageAPI module:

1. Try running the bundled installation option: `.\install-module.ps1 -Bundle`
2. Check if the module was correctly downloaded to the `modules/ConnectWiseManageAPI` directory
3. If using the global installation method, ensure you have administrator privileges
4. Check Windows PowerShell execution policy with `Get-ExecutionPolicy`

## License

MIT