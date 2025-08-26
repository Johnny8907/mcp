# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a Model Context Protocol (MCP) server that provides JIRA integration for Large Language Models. The server exposes three main tools (`jql_search`, `get_issue`, and `log_work`) that allow LLMs to interact with JIRA instances through the JIRA REST API v2.

## Development Commands

- **Test with MCP Inspector**: `npm run inspect`
- **Install via Smithery**: `npx -y @smithery/cli install jira-mcp --client claude`

## Architecture

The entire server is implemented in a single file (`index.js`) with these key components:

- **Environment validation**: Requires `JIRA_INSTANCE_URL`, `JIRA_USERNAME`, and `JIRA_PASSWORD`
- **MCP server setup**: Uses `@modelcontextprotocol/sdk` with stdio transport
- **Tool definitions**: JSON schemas for `jql_search`, `get_issue`, and `log_work` tools
- **JIRA API integration**: Basic Auth with Base64 encoding for API calls

## Tool Implementation Pattern

All tools follow the same structure:
1. Extract parameters from MCP request
2. Build JIRA API request (POST for search/worklog, GET for issue details)
3. Add Basic Auth header using username:password combination
4. Return formatted JSON response or error

## Available Tools

### `jql_search`
Performs enhanced JQL (JIRA Query Language) searches to find issues matching specific criteria.

### `get_issue` 
Retrieves detailed information about a specific issue by its ID or key.

### `log_work`
Logs time worked on an issue by creating a worklog entry. Supports:
- Human-readable time format (e.g., "1h 30m", "2d") or seconds
- Custom start time or defaults to current time
- Work description/comments
- Automatic or manual remaining estimate adjustment

## Environment Configuration

Required for all operations:
- `JIRA_INSTANCE_URL`: Full URL to JIRA instance (e.g., https://company.atlassian.net)
- `JIRA_USERNAME`: JIRA username
- `JIRA_PASSWORD`: JIRA password

## Adding New Tools

To extend functionality:
1. Add tool schema to `ListToolsRequestSchema` handler
2. Add implementation case in `CallToolRequestSchema` handler
3. Follow existing error handling pattern with try/catch and MCP-compliant responses