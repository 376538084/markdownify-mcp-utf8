#!/usr/bin/env node
import { createServer } from "./server.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { createHttpTransport } from "./transports/http.js";

/**
 * 命令行参数解析
 */
function parseArgs(): { transport: 'stdio' | 'http', port: number, host: string } {
  const args = process.argv.slice(2);
  let transport: 'stdio' | 'http' = 'stdio';
  let port = 3000;
  let host = '0.0.0.0';

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    
    if (arg === '--transport' || arg === '-t') {
      const value = args[i + 1];
      if (value === 'http' || value === 'stdio') {
        transport = value;
        i++;
      }
    } else if (arg === '--port' || arg === '-p') {
      const value = args[i + 1];
      const parsed = parseInt(value, 10);
      if (!isNaN(parsed)) {
        port = parsed;
        i++;
      }
    } else if (arg === '--host' || arg === '-h') {
      host = args[i + 1];
      i++;
    } else if (arg === '--help') {
      console.log(`
Markdownify MCP Server with HTTP/SSE Support

Usage:
  node dist/index.js [options]

Options:
  --transport, -t <type>    Transport type: stdio or http (default: stdio)
  --port, -p <number>       Port for HTTP transport (default: 3000)
  --host, -h <address>      Host address for HTTP transport (default: 0.0.0.0)
  --help                    Show this help message

Environment Variables:
  MCP_TRANSPORT            Override transport type
  MCP_PORT                 Override port number
  MCP_HOST                 Override host address
  MCP_ENDPOINT             SSE endpoint path (default: /sse)
  MCP_CORS_ORIGIN          CORS origin (default: *)

Examples:
  # Stdio mode (default, for Claude Desktop)
  node dist/index.js
  
  # HTTP mode with SSE endpoint
  node dist/index.js --transport http --port 3000
  
  # HTTP mode with custom host
  node dist/index.js -t http -p 8080 -h localhost
      `);
      process.exit(0);
    }
  }

  // 环境变量优先级最高
  if (process.env.MCP_TRANSPORT === 'http') {
    transport = 'http';
  } else if (process.env.MCP_TRANSPORT === 'stdio') {
    transport = 'stdio';
  }
  
  if (process.env.MCP_PORT) {
    const parsed = parseInt(process.env.MCP_PORT, 10);
    if (!isNaN(parsed)) port = parsed;
  }
  
  if (process.env.MCP_HOST) {
    host = process.env.MCP_HOST;
  }

  return { transport, port, host };
}

/**
 * 主函数
 */
async function main() {
  try {
    const args = parseArgs();
    const server = createServer();
    
    console.log(`🚀 Starting Markdownify MCP Server...`);
    console.log(`📦 Version: 0.0.1`);
    console.log(`🚚 Transport: ${args.transport.toUpperCase()}`);
    
    if (args.transport === 'http') {
      // HTTP模式
      const transport = await createHttpTransport(server, {
        port: args.port,
        host: args.host,
        endpoint: process.env.MCP_ENDPOINT || '/sse',
        corsOrigin: process.env.MCP_CORS_ORIGIN || '*'
      });
      
      await server.connect(transport);
      
      console.log(`🌐 HTTP Server started`);
      console.log(`   Host: ${args.host}`);
      console.log(`   Port: ${args.port}`);
      console.log(`   SSE Endpoint: http://${args.host}:${args.port}${process.env.MCP_ENDPOINT || '/sse'}`);
      console.log(`   Health Check: http://${args.host}:${args.port}/health`);
      console.log(`   Tools List: http://${args.host}:${args.port}/tools`);
      console.log(`\n📝 Ready to convert HTML to Markdown!`);
      
      // 处理退出信号
      process.on('SIGINT', () => {
        console.log('\n👋 Shutting down server...');
        process.exit(0);
      });
      
      process.on('SIGTERM', () => {
        console.log('\n👋 Received termination signal...');
        process.exit(0);
      });
      
    } else {
      // Stdio模式（默认）
      const transport = new StdioServerTransport();
      await server.connect(transport);
      
      console.log(`🔌 Running in stdio mode`);
      console.log(`📝 Ready for MCP client connections`);
      
      // 在stdio模式下，我们保持静默，因为输出会干扰协议
      // 但可以记录到stderr
      console.error('MCP Server running in stdio mode');
    }
    
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

// 启动服务器
main().catch((error) => {
  console.error('💥 Unhandled error:', error);
  process.exit(1);
});
