#!/usr/bin/env node

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  Tool,
} from "@modelcontextprotocol/sdk/types.js";
import { z } from "zod";

const API_SOURCES = {
  vndirect: {
    name: "VNDirect",
    baseUrl: "https://www.vndirect.com.vn",
    apiDocs: [
      "https://www.vndirect.com.vn/san-pham-to-chuc/apis-white-labeling/",
      "https://dstock.vndirect.com.vn/",
    ],
    description: "VNDirect Securities Corporation API",
  },
  fireant: {
    name: "FireAnt",
    baseUrl: "https://api.fireant.vn",
    apiDocs: [
      "https://api.fireant.vn/",
    ],
    description: "FireAnt API for Vietnam stock market",
  },
  ssi: {
    name: "SSI",
    baseUrl: "https://fc-tradeapi.ssi.com.vn",
    apiDocs: [
      "https://guide.ssi.com.vn/ssi-products/tieng-viet/fastconnect-trading/danh-sach-cac-api",
      "https://github.com/SSI-Securities-Corporation/docs",
    ],
    description: "SSI FastConnect API",
  },
};

class VNStockAPIServer {
  private server: Server;
  private tools: Tool[] = [];

  constructor() {
    this.server = new Server(
      {
        name: "vn-stock-api-mcp",
        version: "1.0.0",
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

    this.setupTools();
    this.setupHandlers();
  }

  private setupTools() {
    this.tools = [
      {
        name: "search_vn_stock_api",
        description:
          "Search for API documentation and endpoints from VNDirect, FireAnt, or SSI. Returns information about available APIs, endpoints, and documentation URLs.",
        inputSchema: {
          type: "object",
          properties: {
            provider: {
              type: "string",
              enum: ["vndirect", "fireant", "ssi", "all"],
              description: "Stock API provider to search. Use 'all' to get information from all providers.",
            },
            query: {
              type: "string",
              description: "Optional search query to filter results (e.g., 'trading', 'market data', 'authentication')",
            },
          },
          required: ["provider"],
        },
      },
      {
        name: "get_api_endpoints",
        description:
          "Get specific API endpoints for a provider. Returns detailed endpoint information including URLs, methods, and descriptions.",
        inputSchema: {
          type: "object",
          properties: {
            provider: {
              type: "string",
              enum: ["vndirect", "fireant", "ssi"],
              description: "Stock API provider",
            },
            category: {
              type: "string",
              description: "Optional category filter (e.g., 'trading', 'market-data', 'account')",
            },
          },
          required: ["provider"],
        },
      },
      {
        name: "get_api_documentation_urls",
        description:
          "Get documentation URLs for API providers. Returns links to official API documentation, guides, and GitHub repositories.",
        inputSchema: {
          type: "object",
          properties: {
            provider: {
              type: "string",
              enum: ["vndirect", "fireant", "ssi", "all"],
              description: "Stock API provider",
            },
          },
          required: ["provider"],
        },
      },
      {
        name: "get_stock_price_fireant",
        description:
          "Get real-time stock price from FireAnt. Uses FireAnt API or web scraping to retrieve current stock prices for Vietnam stock market symbols (e.g., VIC, VNM, VCB).",
        inputSchema: {
          type: "object",
          properties: {
            symbol: {
              type: "string",
              description: "Stock symbol (e.g., 'VIC', 'VNM', 'VCB'). Use comma-separated for multiple symbols.",
            },
          },
          required: ["symbol"],
        },
      },
    ];
  }

  private setupHandlers() {
    this.server.setRequestHandler(ListToolsRequestSchema, async () => ({
      tools: this.tools,
    }));

    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;

      try {
        switch (name) {
          case "search_vn_stock_api":
            return await this.searchVNStockAPI(args as any);
          case "get_api_endpoints":
            return await this.getAPIEndpoints(args as any);
          case "get_api_documentation_urls":
            return await this.getAPIDocumentationURLs(args as any);
          case "get_stock_price_fireant":
            return await this.getStockPriceFireAnt(args as any);
          default:
            throw new Error(`Unknown tool: ${name}`);
        }
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : String(error);
        return {
          content: [
            {
              type: "text",
              text: `Error: ${errorMessage}`,
            },
          ],
          isError: true,
        };
      }
    });
  }

  private async searchVNStockAPI(args: {
    provider: "vndirect" | "fireant" | "ssi" | "all";
    query?: string;
  }) {
    const { provider, query } = args;
    const results: any[] = [];

    const providersToSearch =
      provider === "all"
        ? (Object.keys(API_SOURCES) as Array<keyof typeof API_SOURCES>)
        : [provider];

    for (const prov of providersToSearch) {
      const source = API_SOURCES[prov];
      const info: any = {
        provider: prov,
        name: source.name,
        description: source.description,
        baseUrl: source.baseUrl,
        documentationUrls: source.apiDocs,
        endpoints: this.getEndpointsForProvider(prov),
      };

      if (query) {
        const lowerQuery = query.toLowerCase();
        const matches =
          source.name.toLowerCase().includes(lowerQuery) ||
          source.description.toLowerCase().includes(lowerQuery) ||
          info.endpoints.some((ep: any) =>
            ep.name?.toLowerCase().includes(lowerQuery) ||
            ep.description?.toLowerCase().includes(lowerQuery)
          );

        if (matches) {
          results.push(info);
        }
      } else {
        results.push(info);
      }
    }

    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(results, null, 2),
        },
      ],
    };
  }

  private async getAPIEndpoints(args: {
    provider: "vndirect" | "fireant" | "ssi";
    category?: string;
  }) {
    const { provider, category } = args;
    const endpoints = this.getEndpointsForProvider(provider);

    const filteredEndpoints = category
      ? endpoints.filter(
          (ep: any) =>
            ep.category?.toLowerCase() === category.toLowerCase() ||
            ep.name?.toLowerCase().includes(category.toLowerCase())
        )
      : endpoints;

    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(
            {
              provider,
              category: category || "all",
              endpoints: filteredEndpoints,
            },
            null,
            2
          ),
        },
      ],
    };
  }

  private async getAPIDocumentationURLs(args: {
    provider: "vndirect" | "fireant" | "ssi" | "all";
  }) {
    const { provider } = args;

    const providersToGet =
      provider === "all"
        ? (Object.keys(API_SOURCES) as Array<keyof typeof API_SOURCES>)
        : [provider];

    const docs: any[] = [];

    for (const prov of providersToGet) {
      const source = API_SOURCES[prov];
      docs.push({
        provider: prov,
        name: source.name,
        documentationUrls: source.apiDocs,
        baseUrl: source.baseUrl,
      });
    }

    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(docs, null, 2),
        },
      ],
    };
  }

  private async getStockPriceFireAnt(args: { symbol: string }) {
    const { symbol } = args;
    const symbols = symbol.split(",").map((s) => s.trim().toUpperCase());

    try {
      // Try FireAnt API first
      const results: any[] = [];

      for (const sym of symbols) {
        try {
          // FireAnt API endpoint for stock quotes
          const apiUrl = `https://restv2.fireant.vn/stocks/${sym}/quotes`;
          const response = await fetch(apiUrl, {
            headers: {
              "User-Agent": "Mozilla/5.0",
              "Accept": "application/json",
            },
          });

          if (response.ok) {
            const data = await response.json();
            results.push({
              symbol: sym,
              source: "FireAnt API",
              data: data,
              timestamp: new Date().toISOString(),
            });
          } else {
            // Fallback: Try alternative endpoint
            const altUrl = `https://restv2.fireant.vn/symbols/${sym}/intraday`;
            const altResponse = await fetch(altUrl, {
              headers: {
                "User-Agent": "Mozilla/5.0",
                "Accept": "application/json",
              },
            });

            if (altResponse.ok) {
              const altData = await altResponse.json();
              results.push({
                symbol: sym,
                source: "FireAnt API (alternative)",
                data: altData,
                timestamp: new Date().toISOString(),
              });
            } else {
              // If API fails, provide information about how to access
              results.push({
                symbol: sym,
                source: "FireAnt",
                status: "API endpoint may require authentication",
                note: "FireAnt API may require API key or authentication. Please check FireAnt API documentation or use Firecrawl to scrape from https://www.fireant.vn",
                documentationUrl: "https://api.fireant.vn/",
                webUrl: `https://www.fireant.vn/symbol/${sym}`,
              });
            }
          }
        } catch (error) {
          results.push({
            symbol: sym,
            error: error instanceof Error ? error.message : String(error),
            note: "Unable to fetch from API. Consider using Firecrawl MCP to scrape from FireAnt website.",
            webUrl: `https://www.fireant.vn/symbol/${sym}`,
          });
        }
      }

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(
              {
                provider: "FireAnt",
                symbols: symbols,
                results: results,
                note:
                  results.some((r) => r.note) &&
                  "Some data may require authentication. Consider using Firecrawl MCP server to scrape real-time data from FireAnt website.",
              },
              null,
              2
            ),
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(
              {
                error: error instanceof Error ? error.message : String(error),
                note: "Unable to fetch stock prices. You may need to use Firecrawl MCP to scrape data from FireAnt website at https://www.fireant.vn",
              },
              null,
              2
            ),
          },
        ],
        isError: true,
      };
    }
  }

  private getEndpointsForProvider(
    provider: "vndirect" | "fireant" | "ssi"
  ): any[] {
    switch (provider) {
      case "vndirect":
        return [
          {
            name: "Open API",
            description: "VNDirect Open API for trading and market data",
            url: "https://www.vndirect.com.vn/san-pham-to-chuc/apis-white-labeling/",
            category: "trading",
          },
          {
            name: "D-Stock Data API",
            description: "Real-time market data and financial information",
            url: "https://dstock.vndirect.com.vn/",
            category: "market-data",
          },
        ];
      case "fireant":
        return [
          {
            name: "FireAnt API",
            description: "FireAnt API for Vietnam stock market data",
            baseUrl: "https://api.fireant.vn",
            endpoints: [
              {
                path: "/fmarket/accounts/get-account-info",
                method: "GET",
                description: "Get account information",
              },
            ],
            category: "account",
          },
        ];
      case "ssi":
        return [
          {
            name: "FastConnect Trading API",
            description: "SSI FastConnect Trading API",
            baseUrl: "https://fc-tradeapi.ssi.com.vn/api/v2",
            endpoints: [
              {
                path: "/stock/transferable",
                method: "GET",
                description: "Query transferable stock information",
              },
            ],
            category: "trading",
            documentation:
              "https://guide.ssi.com.vn/ssi-products/tieng-viet/fastconnect-trading/danh-sach-cac-api",
          },
          {
            name: "FastConnect Data API",
            description: "SSI FastConnect Data API",
            category: "market-data",
            documentation:
              "https://github.com/SSI-Securities-Corporation/docs",
          },
        ];
      default:
        return [];
    }
  }

  async run() {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error("VN Stock API MCP server running on stdio");
  }
}

const server = new VNStockAPIServer();
server.run().catch(console.error);

