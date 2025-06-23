const { spawn } = require('child_process');
const path = require('path');

class MCPClient {
  constructor() {
    this.server = null;
    this.requestId = 1;
    this.pendingRequests = new Map();
    this.responseBuffer = ''; // Add buffer for incomplete JSON
  }

  async initialize() {
    try {
      console.log('🚀 Starting MCP server...');
      
      const mcpPath = path.resolve(__dirname, '../dist/index.js');
      this.server = spawn('node', [mcpPath], {
        stdio: ['pipe', 'pipe', 'pipe'],
        cwd: path.resolve(__dirname, '..')
      });

      // Set up error handling
      this.server.on('error', (error) => {
        console.error('❌ MCP Server spawn error:', error);
      });

      this.server.stderr.on('data', (data) => {
        // Log server output but don't treat as error
        console.log('📝 MCP Server log:', data.toString().trim());
      });

      // Set up response handling
      this.server.stdout.on('data', (data) => {
        const text = data.toString();
        this.handleServerResponse(text);
      });

      // Wait for server to initialize
      await this.waitForInitialization();
      
      console.log('✅ MCP Client initialized successfully');
      return true;
      
    } catch (error) {
      console.error('❌ Failed to initialize MCP client:', error);
      return false;
    }
  }

  async waitForInitialization() {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('MCP server initialization timeout'));
      }, 10000); // Increased timeout to 10 seconds

      // Look for ANY output indicating server is running
      const checkInitialization = (data) => {
        const text = data.toString();
        if (text.includes('MCP server started') || 
            text.includes('Calendar Copilot MCP server started') ||
            text.includes('"message":"Calendar Copilot MCP server started"')) {
          clearTimeout(timeout);
          this.server.stderr.off('data', checkInitialization);
          resolve();
        }
      };

      this.server.stderr.on('data', checkInitialization);
      
      // Also try to resolve after short delay as fallback
      setTimeout(() => {
        if (this.server && !this.server.killed) {
          clearTimeout(timeout);
          this.server.stderr.off('data', checkInitialization);
          console.log('🎯 MCP server appears to be running, proceeding...');
          resolve();
        }
      }, 3000);
    });
  }

  handleServerResponse(text) {
    // Add new text to buffer
    this.responseBuffer += text;
    
    // Split by newlines and process complete lines
    const lines = this.responseBuffer.split('\n');
    
    // Keep the last line in buffer (might be incomplete)
    this.responseBuffer = lines.pop() || '';
    
    for (let line of lines) {
      line = line.trim();
      if (!line) continue;
      
      // Skip log lines (they start with {"timestamp")
      if (line.startsWith('{"timestamp"')) continue;
      
      try {
        const response = JSON.parse(line);
        
        // Handle both direct responses and responses with id
        if (response.id !== undefined && this.pendingRequests.has(response.id)) {
          const { resolve, reject } = this.pendingRequests.get(response.id);
          this.pendingRequests.delete(response.id);
          
          if (response.error) {
            reject(new Error(response.error.message || 'MCP error'));
          } else {
            resolve(response.result);
          }
        }
      } catch (parseError) {
        // If it's a JSON parse error and looks like it might be incomplete, keep in buffer
        if (line.includes('{') && !line.includes('}')) {
          this.responseBuffer = line + '\n' + this.responseBuffer;
        }
        // Otherwise ignore
      }
    }
  }

  async callTool(toolName, args) {
    if (!this.server) {
      throw new Error('MCP client not initialized');
    }

    return new Promise((resolve, reject) => {
      const id = this.requestId++;
      
      const request = {
        jsonrpc: "2.0",
        id: id,
        method: "tools/call",
        params: {
          name: toolName,
          arguments: args
        }
      };

      // Store the promise resolvers
      this.pendingRequests.set(id, { resolve, reject });

      // Set timeout for this request
      const timeout = setTimeout(() => {
        if (this.pendingRequests.has(id)) {
          this.pendingRequests.delete(id);
          reject(new Error(`MCP tool call timeout: ${toolName}`));
        }
      }, 30000); // 30 second timeout

      // Clear timeout when resolved
      const originalResolve = resolve;
      const originalReject = reject;
      
      this.pendingRequests.set(id, {
        resolve: (result) => {
          clearTimeout(timeout);
          originalResolve(result);
        },
        reject: (error) => {
          clearTimeout(timeout);
          originalReject(error);
        }
      });

      // Send the request
      console.log(`📤 Calling MCP tool: ${toolName}`);
      this.server.stdin.write(JSON.stringify(request) + '\n');
    });
  }

  async listTools() {
    if (!this.server) {
      throw new Error('MCP client not initialized');
    }

    return new Promise((resolve, reject) => {
      const id = this.requestId++;
      
      const request = {
        jsonrpc: "2.0",
        id: id,
        method: "tools/list",
        params: {}
      };

      this.pendingRequests.set(id, { resolve, reject });

      const timeout = setTimeout(() => {
        if (this.pendingRequests.has(id)) {
          this.pendingRequests.delete(id);
          reject(new Error('MCP list tools timeout'));
        }
      }, 10000); // Increased timeout to 10 seconds

      const originalResolve = resolve;
      const originalReject = reject;
      
      this.pendingRequests.set(id, {
        resolve: (result) => {
          clearTimeout(timeout);
          originalResolve(result);
        },
        reject: (error) => {
          clearTimeout(timeout);
          originalReject(error);
        }
      });

      this.server.stdin.write(JSON.stringify(request) + '\n');
    });
  }

  async destroy() {
    if (this.server) {
      this.server.kill();
      this.server = null;
    }
    this.pendingRequests.clear();
  }
}

module.exports = { MCPClient }; 