# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This repository contains two Model Context Protocol (MCP) servers that provide integrations for Large Language Models:

1. **jira-mcp**: JIRA integration server for searching issues, retrieving details, and logging work
2. **wiki-mcp**: Confluence/Wiki integration server for searching, retrieving, and creating pages

Both servers use the `@modelcontextprotocol/sdk` framework to expose tools via stdio transport.

## Development Commands

### JIRA MCP (`jira-mcp/`)
- **Test with MCP Inspector**: `npm run inspect`
- **Install via Smithery**: `npx -y @smithery/cli install jira-mcp --client claude`

### Wiki MCP (`wiki-mcp/`)
- **Test with MCP Inspector**: `npm run inspect`

## Architecture

### JIRA MCP Server (`jira-mcp/index.js`)
- **Single-file architecture**: All functionality in `index.js`
- **Transport**: Uses StdioServerTransport for communication
- **Authentication**: Basic Auth with Base64 encoding using email + API token
- **Environment validation**: Requires `JIRA_INSTANCE_URL`, `JIRA_USER_EMAIL`, and `JIRA_API_KEY`
- **Tools**: `jql_search`, `get_issue`, and `log_work`
- **API**: JIRA REST API v2 integration

### Wiki MCP Server (`wiki-mcp/index.js`)
- **Single-file architecture**: All functionality in `index.js`
- **Transport**: Uses StdioServerTransport via McpServer wrapper
- **Authentication**: Bearer token authentication
- **Dependencies**: Uses `axios` for HTTP requests and `zod` for schema validation
- **Environment**: Requires `CONFLUENCE_PAT` (Personal Access Token), optional `CONFLUENCE_BASE`
- **Tools**: `confluence.search`, `confluence.getPage`, and `confluence.createPage`
- **API**: Confluence REST API integration

## Tool Implementation Patterns

### JIRA MCP Pattern
All tools follow this structure:
1. Extract parameters from MCP request
2. Build JIRA API request URL and payload
3. Add Basic Auth header (`username:password` base64 encoded)
4. Handle response with proper error handling
5. Return formatted JSON response or MCP-compliant error

### Wiki MCP Pattern
Tools use the modern MCP SDK pattern:
1. Register tool with `mcpServer.registerTool(name, config, handler)`
2. Use Zod schemas for input validation
3. Make authenticated API calls with axios
4. Return structured content responses

## Environment Configuration

### JIRA MCP Required Variables
- `JIRA_INSTANCE_URL`: Full JIRA instance URL (e.g., https://company.atlassian.net)
- `JIRA_USER_EMAIL`: Email address associated with JIRA account
- `JIRA_API_KEY`: API token generated from Atlassian account settings

### Wiki MCP Required Variables
- `CONFLUENCE_PAT`: Personal Access Token for authentication
- `CONFLUENCE_BASE`: (Optional) Base API URL, defaults to "https://spaces.telenav.com:8443/rest/api"

## Available Tools

### JIRA MCP Tools
- **`jql_search`**: Execute JQL queries with pagination support
- **`get_issue`**: Retrieve detailed issue information by ID/key
- **`log_work`**: Create worklog entries with time tracking

### Wiki MCP Tools
- **`confluence.search`**: Search pages using CQL (Confluence Query Language)
- **`confluence.getPage`**: Retrieve page content by ID
- **`confluence.createPage`**: Create new pages with HTML content

## Adding New Tools

### For JIRA MCP
1. Add tool definition to `ListToolsRequestSchema` handler array
2. Add implementation case in `CallToolRequestSchema` handler switch
3. Follow existing error handling with try/catch and MCP-compliant responses
4. Use Basic Auth pattern for API calls

### For Wiki MCP
1. Use `mcpServer.registerTool(name, config, handler)` pattern
2. Define input schema with Zod validation
3. Implement async handler function
4. Return content in `{ content: [{ type: "text", text: "..." }] }` format

## Testing

Both servers can be tested using the MCP Inspector:
```bash
cd jira-mcp && npm run inspect
cd wiki-mcp && npm run inspect
```

The inspector provides a web interface to test tool calls and verify functionality.