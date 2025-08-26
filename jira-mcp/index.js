#!/usr/bin/env node

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  ListToolsRequestSchema,
  CallToolRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";

// Retrieve environment variables
const JIRA_INSTANCE_URL = process.env.JIRA_INSTANCE_URL;
const JIRA_USERNAME = process.env.JIRA_USER_EMAIL;
const JIRA_PASSWORD = process.env.JIRA_API_KEY;

// Validate environment variables
if (!JIRA_INSTANCE_URL || !JIRA_USERNAME || !JIRA_PASSWORD) {
  console.error(
    "Error: JIRA_INSTANCE_URL, JIRA_USER_EMAIL, and JIRA_API_KEY must be set in the environment.",
  );
  process.exit(1);
}

// Initialize the server
const server = new Server(
  {
    name: "jira-mcp",
    version: "1.0.0",
  },
  {
    capabilities: {
      tools: {},
    },
  },
);

// Define available tools
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: "jql_search",
        description: "Perform enhanced JQL search in Jira",
        inputSchema: {
          type: "object",
          properties: {
            jql: { type: "string", description: "JQL query string" },
            nextPageToken: {
              type: "string",
              description: "Token for next page",
            },
            maxResults: {
              type: "integer",
              description: "Maximum results to fetch",
            },
            fields: {
              type: "array",
              items: { type: "string" },
              description: "List of fields to return for each issue",
            },
            expand: {
              type: "string",
              description: "Additional info to include in the response",
            },
          },
          required: ["jql"],
        },
      },
      {
        name: "get_issue",
        description: "Retrieve details about an issue by its ID or key.",
        inputSchema: {
          type: "object",
          properties: {
            issueIdOrKey: {
              type: "string",
              description: "ID or key of the issue",
            },
            fields: {
              type: "array",
              items: { type: "string" },
              description: "Fields to include in the response",
            },
            expand: {
              type: "string",
              description: "Additional information to include in the response",
            },
            properties: {
              type: "array",
              items: { type: "string" },
              description: "Properties to include in the response",
            },
            failFast: {
              type: "boolean",
              description: "Fail quickly on errors",
              default: false,
            },
          },
          required: ["issueIdOrKey"],
        },
      },
      {
        name: "log_work",
        description: "Log time worked on an issue by adding a worklog entry.",
        inputSchema: {
          type: "object",
          properties: {
            issueIdOrKey: {
              type: "string",
              description: "ID or key of the issue to log work against",
            },
            timeSpent: {
              type: "string",
              description: "Time spent in human readable format (e.g., '1h 30m', '2d', '45m')",
            },
            timeSpentSeconds: {
              type: "integer",
              description: "Time spent in seconds (alternative to timeSpent)",
            },
            started: {
              type: "string",
              description: "When the work was started in ISO 8601 format (e.g., '2023-06-15T10:00:00.000+0000'). Defaults to current time if not provided.",
            },
            comment: {
              type: "string",
              description: "Description of the work performed",
            },
            adjustEstimate: {
              type: "string",
              enum: ["new", "leave", "manual", "auto"],
              description: "How to adjust the remaining estimate: 'new' (set new estimate), 'leave' (leave unchanged), 'manual' (reduce by specified amount), 'auto' (reduce by time logged)",
              default: "auto",
            },
            newEstimate: {
              type: "string",
              description: "New estimate value when adjustEstimate is 'new'",
            },
            reduceBy: {
              type: "string",
              description: "Amount to reduce estimate by when adjustEstimate is 'manual'",
            },
          },
          required: ["issueIdOrKey"],
        },
      },
    ],
  };
});

// Handle tool execution
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  if (name === "jql_search") {
    const { jql, nextPageToken, maxResults, fields, expand } = args;
    try {
      const response = await fetch(`${JIRA_INSTANCE_URL}/rest/api/2/search`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Basic ${Buffer.from(`${JIRA_USERNAME}:${JIRA_PASSWORD}`).toString("base64")}`,
        },
        body: JSON.stringify({
          jql,
          startAt: nextPageToken || 0,
          maxResults: maxResults || 50,
          fields: (fields && fields.length > 0) ? fields : ["*all"],
          expand,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Jira API Error: ${response.status} ${response.statusText} - ${errorText}`);
      }

      const data = await response.json();
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(data, null, 2), // Format JSON response
          },
        ],
      };
    } catch (error) {
      return {
        isError: true,
        content: [
          {
            type: "text",
            text: `Error: ${error.message}`,
          },
        ],
      };
    }
  } else if (name === "get_issue") {
    const { issueIdOrKey, fields, expand, properties, failFast } = args;
    try {
      const queryParams = new URLSearchParams();

      if (fields && fields.length > 0) queryParams.append("fields", fields.join(","));
      if (expand) queryParams.append("expand", expand);
      if (properties && properties.length > 0) queryParams.append("properties", properties.join(","));
      if (failFast !== undefined)
        queryParams.append("failFast", String(failFast));

      const response = await fetch(
        `${JIRA_INSTANCE_URL}/rest/api/2/issue/${issueIdOrKey}?${queryParams.toString()}`,
        {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Basic ${Buffer.from(`${JIRA_USERNAME}:${JIRA_PASSWORD}`).toString("base64")}`,
          },
        },
      );

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Jira API Error: ${response.status} ${response.statusText} - ${errorText}`);
      }

      const data = await response.json();
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(data, null, 2), // Format JSON response
          },
        ],
      };
    } catch (error) {
      return {
        isError: true,
        content: [
          {
            type: "text",
            text: `Error: ${error.message}`,
          },
        ],
      };
    }
  } else if (name === "log_work") {
    const { 
      issueIdOrKey, 
      timeSpent, 
      timeSpentSeconds, 
      started, 
      comment, 
      adjustEstimate = "auto",
      newEstimate,
      reduceBy 
    } = args;
    
    try {
      // Build worklog payload
      const worklogData = {
        comment: comment || "",
        started: started || new Date().toISOString().replace('Z', '+0000')
      };
      
      // Add time - prefer timeSpent if provided, otherwise use timeSpentSeconds
      if (timeSpent) {
        worklogData.timeSpent = timeSpent;
      } else if (timeSpentSeconds) {
        worklogData.timeSpentSeconds = timeSpentSeconds;
      }
      
      // Build URL with query parameters for estimate adjustment
      const queryParams = new URLSearchParams();
      queryParams.append("adjustEstimate", adjustEstimate);
      
      if (adjustEstimate === "new" && newEstimate) {
        queryParams.append("newEstimate", newEstimate);
      } else if (adjustEstimate === "manual" && reduceBy) {
        queryParams.append("reduceBy", reduceBy);
      }
      
      const response = await fetch(
        `${JIRA_INSTANCE_URL}/rest/api/2/issue/${issueIdOrKey}/worklog?${queryParams.toString()}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Basic ${Buffer.from(`${JIRA_USERNAME}:${JIRA_PASSWORD}`).toString("base64")}`,
          },
          body: JSON.stringify(worklogData),
        },
      );

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Jira API Error: ${response.status} ${response.statusText} - ${errorText}`);
      }

      const data = await response.json();
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(data, null, 2),
          },
        ],
      };
    } catch (error) {
      return {
        isError: true,
        content: [
          {
            type: "text",
            text: `Error: ${error.message}`,
          },
        ],
      };
    }
  }

  throw new Error(`Tool not found: ${name}`);
});

// Start the server
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch((error) => {
  console.error("Error starting the server:", error);
});
