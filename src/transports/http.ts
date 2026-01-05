import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { HTTPServerTransport } from "@modelcontextprotocol/sdk/server/http.js";
import express from "express";
import cors from "cors";

/**
 * 创建HTTP传输层
 */
export async function createHttpTransport(server: Server, options: {
  port?: number;
  host?: string;
  endpoint?: string;
  corsOrigin?: string | string[];
}) {
  const {
    port = parseInt(process.env.MCP_PORT || "3000"),
    host = process.env.MCP_HOST || "0.0.0.0",
    endpoint = process.env.MCP_ENDPOINT || "/sse",
    corsOrigin = process.env.MCP_CORS_ORIGIN || "*"
  } = options;

  const app = express();
  
  // 启用CORS
  app.use(cors({
    origin: corsOrigin,
    methods: ['GET', 'POST', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
  }));
  
  // 解析JSON请求体
  app.use(express.json());
  
  // 创建HTTP传输实例
  const transport = new HTTPServerTransport({
    server,
    endpoint,
    port,
    host,
    // 可以添加自定义请求处理
    requestHandler: app
  });

  // 添加健康检查端点
  app.get("/health", (req, res) => {
    res.json({
      status: "ok",
      service: "markdownify-mcp-server",
      version: "0.0.1",
      transport: "http",
      endpoints: {
        sse: endpoint,
        health: "/health",
        tools: "/tools"
      }
    });
  });

  // 添加工具列表端点
  app.get("/tools", async (req, res) => {
    try {
      // 这里可以返回服务器支持的工具列表
      res.json({
        tools: [
          {
            name: "markdownify_convert",
            description: "Convert HTML to Markdown with UTF-8 support"
          },
          {
            name: "markdownify_batch_convert",
            description: "Batch convert multiple HTML snippets to Markdown"
          }
        ]
      });
    } catch (error) {
      res.status(500).json({ error: "Failed to list tools" });
    }
  });

  return transport;
}
