import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import axios from "axios";

const BASE = process.env.CONFLUENCE_BASE || "https://spaces.telenav.com:8443/rest/api";
const TOKEN = process.env.CONFLUENCE_PAT;

if (!TOKEN) {
  console.error("Missing CONFLUENCE_PAT env var");
  process.exit(1);
}

const api = axios.create({
  baseURL: BASE,
  headers: { Authorization: `Bearer ${TOKEN}` }
});

const mcpServer = new McpServer({
  name: "Confluence MCP",
  version: "0.1.0"
});

mcpServer.registerTool("confluence.search", {
  description: "Search pages via CQL",
  inputSchema: {
    cql: z.string().describe("Confluence Query Language search string"),
    limit: z.number().optional().describe("Maximum number of results to return (default: 25)"),
    expand: z.string().optional().describe("Fields to expand in the response (default: body.storage)")
  }
}, async ({ cql, limit = 25, expand = "body.storage" }) => {
  const res = await api.get("/content/search", { params: { cql, limit, expand } });
  return {
    content: [{
      type: "text",
      text: JSON.stringify(res.data.results, null, 2)
    }]
  };
});

mcpServer.registerTool("confluence.getPage", {
  description: "Get a page by ID",
  inputSchema: {
    id: z.string().describe("Page ID"),
    expand: z.string().optional().describe("Fields to expand in the response (default: body.storage,version,space)")
  }
}, async ({ id, expand = "body.storage,version,space" }) => {
  const res = await api.get(`/content/${id}`, { params: { expand } });
  return {
    content: [{
      type: "text",
      text: JSON.stringify(res.data, null, 2)
    }]
  };
});

mcpServer.registerTool("confluence.createPage", {
  description: "Create a new page",
  inputSchema: {
    spaceKey: z.string().describe("Space key where the page should be created"),
    title: z.string().describe("Page title"),
    html: z.string().describe("Page content in HTML storage format"),
    parentId: z.string().optional().describe("Parent page ID (optional)")
  }
}, async ({ spaceKey, title, html, parentId }) => {
  const payload = {
    type: "page",
    title,
    space: { key: spaceKey },
    body: { storage: { value: html, representation: "storage" } }
  };
  if (parentId) payload.ancestors = [{ id: parentId }];
  const res = await api.post("/content", payload);
  return {
    content: [{
      type: "text",
      text: JSON.stringify(res.data, null, 2)
    }]
  };
});

async function main() {
  const transport = new StdioServerTransport();
  await mcpServer.connect(transport);
  console.error("Confluence MCP server running on stdio");
}

main().catch((error) => {
  console.error("Server error:", error);
  process.exit(1);
});