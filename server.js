require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const { executeCWMCommand } = require('./powershell-bridge');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(bodyParser.json());

// MCP Protocol Structure
// All MCP endpoints follow the same pattern:
// POST /context/:contextId/:method
// with JSON body containing parameters

// Context Map to store session information
const contexts = new Map();

// Helper to validate context
function getContext(contextId) {
  if (!contexts.has(contextId)) {
    throw new Error(`Context ${contextId} not found`);
  }
  return contexts.get(contextId);
}

// MCP Context Creation Endpoint
app.post('/context', async (req, res) => {
  try {
    const contextId = Math.random().toString(36).substring(2, 15);
    
    // Create a new context
    contexts.set(contextId, {
      id: contextId,
      created: new Date(),
      lastAccessed: new Date(),
      // Add any context-specific data here
    });
    
    res.json({
      contextId,
      status: 'created'
    });
  } catch (error) {
    console.error('Error creating context:', error);
    res.status(500).json({
      error: error.message || 'Internal server error'
    });
  }
});

// Connect to ConnectWise Manage
app.post('/context/:contextId/connect', async (req, res) => {
  try {
    const { contextId } = req.params;
    const context = getContext(contextId);
    
    // Update last accessed time
    context.lastAccessed = new Date();
    
    // Get connection parameters from the request or use defaults from .env
    const { server, company, pubKey, privateKey, clientId } = req.body;
    
    // Execute the Connect-CWM command
    const result = await executeCWMCommand({
      command: 'Connect-CWM',
      params: {
        Server: server || process.env.CWM_SERVER,
        Company: company || process.env.CWM_COMPANY,
        PubKey: pubKey || process.env.CWM_PUBKEY,
        PrivateKey: privateKey || process.env.CWM_PRIVATEKEY,
        ClientID: clientId || process.env.CWM_CLIENTID
      }
    });
    
    // Save connection status in the context
    context.connected = true;
    
    res.json({
      status: 'connected',
      message: 'Successfully connected to ConnectWise Manage'
    });
  } catch (error) {
    console.error('Error connecting to CWM:', error);
    res.status(500).json({
      error: error.message || 'Failed to connect to ConnectWise Manage'
    });
  }
});

// Get system info
app.post('/context/:contextId/getSystemInfo', async (req, res) => {
  try {
    const { contextId } = req.params;
    const context = getContext(contextId);
    
    // Update last accessed time
    context.lastAccessed = new Date();
    
    // Execute the Get-CWMSystemInfo command
    const result = await executeCWMCommand({
      command: 'Get-CWMSystemInfo'
    });
    
    res.json(result);
  } catch (error) {
    console.error('Error getting system info:', error);
    res.status(500).json({
      error: error.message || 'Failed to get system info'
    });
  }
});

// Get companies
app.post('/context/:contextId/getCompanies', async (req, res) => {
  try {
    const { contextId } = req.params;
    const context = getContext(contextId);
    const { conditions } = req.body;
    
    // Update last accessed time
    context.lastAccessed = new Date();
    
    // Build parameters object
    const params = {};
    if (conditions) {
      params.Condition = conditions;
    }
    
    // Execute the Get-CWMCompany command
    const result = await executeCWMCommand({
      command: 'Get-CWMCompany',
      params
    });
    
    res.json(result);
  } catch (error) {
    console.error('Error getting companies:', error);
    res.status(500).json({
      error: error.message || 'Failed to get companies'
    });
  }
});

// Get tickets
app.post('/context/:contextId/getTickets', async (req, res) => {
  try {
    const { contextId } = req.params;
    const context = getContext(contextId);
    const { conditions } = req.body;
    
    // Update last accessed time
    context.lastAccessed = new Date();
    
    // Build parameters object
    const params = {};
    if (conditions) {
      params.Condition = conditions;
    }
    
    // Execute the Get-CWMTicket command
    const result = await executeCWMCommand({
      command: 'Get-CWMTicket',
      params
    });
    
    res.json(result);
  } catch (error) {
    console.error('Error getting tickets:', error);
    res.status(500).json({
      error: error.message || 'Failed to get tickets'
    });
  }
});

// Generic CWM command endpoint
app.post('/context/:contextId/executeCommand', async (req, res) => {
  try {
    const { contextId } = req.params;
    const context = getContext(contextId);
    const { command, params } = req.body;
    
    if (!command) {
      return res.status(400).json({
        error: 'Command is required'
      });
    }
    
    // Update last accessed time
    context.lastAccessed = new Date();
    
    // Execute the specified command
    const result = await executeCWMCommand({
      command,
      params
    });
    
    res.json(result);
  } catch (error) {
    console.error(`Error executing command:`, error);
    res.status(500).json({
      error: error.message || 'Failed to execute command'
    });
  }
});

// Delete context
app.delete('/context/:contextId', (req, res) => {
  try {
    const { contextId } = req.params;
    
    if (!contexts.has(contextId)) {
      return res.status(404).json({
        error: `Context ${contextId} not found`
      });
    }
    
    // Delete the context
    contexts.delete(contextId);
    
    res.json({
      status: 'deleted',
      message: `Context ${contextId} has been deleted`
    });
  } catch (error) {
    console.error('Error deleting context:', error);
    res.status(500).json({
      error: error.message || 'Failed to delete context'
    });
  }
});

// Cleanup job to remove stale contexts (runs every hour)
setInterval(() => {
  const now = new Date();
  const staleThreshold = 3600000; // 1 hour in milliseconds
  
  contexts.forEach((context, contextId) => {
    const timeSinceLastAccess = now - context.lastAccessed;
    if (timeSinceLastAccess > staleThreshold) {
      console.log(`Removing stale context: ${contextId}`);
      contexts.delete(contextId);
    }
  });
}, 3600000);

// Start the server
app.listen(PORT, () => {
  console.log(`MCP ConnectWise Manage API Server running on port ${PORT}`);
});