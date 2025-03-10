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

   **Option 1:** Install the module globally via PowerShell Gallery
   ```powershell
   # Run in PowerShell as Administrator
   Install-Module 'ConnectWiseManageAPI'
   ```
   
   **Option 2:** Install the module locally to the project using the provided script
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
3. **modules/ConnectWiseManageAPI** - (Optional) Local copy of the ConnectWiseManageAPI module

## Module Loading

The server will attempt to load the ConnectWiseManageAPI module in the following order:

1. Local module in the `modules/ConnectWiseManageAPI` directory (if installed with `-Local` option)
2. Global module installed in the PowerShell module path

## License

MIT