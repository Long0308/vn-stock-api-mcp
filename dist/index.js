#!/usr/bin/env node
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { CallToolRequestSchema, ListToolsRequestSchema, } from "@modelcontextprotocol/sdk/types.js";
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
    server;
    tools = [];
    constructor() {
        this.server = new Server({
            name: "vn-stock-api-mcp",
            version: "1.0.0",
        }, {
            capabilities: {
                tools: {},
            },
        });
        this.setupTools();
        this.setupHandlers();
    }
    setupTools() {
        this.tools = [
            {
                name: "search_vn_stock_api",
                description: "Search for API documentation and endpoints from VNDirect, FireAnt, or SSI. Returns information about available APIs, endpoints, and documentation URLs.",
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
                description: "Get specific API endpoints for a provider. Returns detailed endpoint information including URLs, methods, and descriptions.",
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
                description: "Get documentation URLs for API providers. Returns links to official API documentation, guides, and GitHub repositories.",
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
                description: "Get real-time stock price from FireAnt. Uses FireAnt API or web scraping to retrieve current stock prices for Vietnam stock market symbols (e.g., VIC, VNM, VCB).",
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
            {
                name: "list_vn_stocks",
                description: "List all available Vietnam stock symbols. Returns a comprehensive list of stock symbols traded on Vietnamese stock exchanges (HOSE, HNX, UPCOM). Similar to list_assets in coincap-mcp.",
                inputSchema: {
                    type: "object",
                    properties: {
                        exchange: {
                            type: "string",
                            enum: ["HOSE", "HNX", "UPCOM", "all"],
                            description: "Filter by exchange: HOSE (Ho Chi Minh Stock Exchange), HNX (Hanoi Stock Exchange), UPCOM (Unlisted Public Company Market), or 'all' for all exchanges.",
                        },
                        search: {
                            type: "string",
                            description: "Optional search query to filter stocks by symbol or company name.",
                        },
                    },
                },
            },
        ];
    }
    setupHandlers() {
        this.server.setRequestHandler(ListToolsRequestSchema, async () => ({
            tools: this.tools,
        }));
        this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
            const { name, arguments: args } = request.params;
            try {
                switch (name) {
                    case "search_vn_stock_api":
                        return await this.searchVNStockAPI(args);
                    case "get_api_endpoints":
                        return await this.getAPIEndpoints(args);
                    case "get_api_documentation_urls":
                        return await this.getAPIDocumentationURLs(args);
                    case "get_stock_price_fireant":
                        return await this.getStockPriceFireAnt(args);
                    case "list_vn_stocks":
                        return await this.listVNStocks(args);
                    default:
                        throw new Error(`Unknown tool: ${name}`);
                }
            }
            catch (error) {
                const errorMessage = error instanceof Error ? error.message : String(error);
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
    async searchVNStockAPI(args) {
        const { provider, query } = args;
        const results = [];
        const providersToSearch = provider === "all"
            ? Object.keys(API_SOURCES)
            : [provider];
        for (const prov of providersToSearch) {
            const source = API_SOURCES[prov];
            const info = {
                provider: prov,
                name: source.name,
                description: source.description,
                baseUrl: source.baseUrl,
                documentationUrls: source.apiDocs,
                endpoints: this.getEndpointsForProvider(prov),
            };
            if (query) {
                const lowerQuery = query.toLowerCase();
                const matches = source.name.toLowerCase().includes(lowerQuery) ||
                    source.description.toLowerCase().includes(lowerQuery) ||
                    info.endpoints.some((ep) => ep.name?.toLowerCase().includes(lowerQuery) ||
                        ep.description?.toLowerCase().includes(lowerQuery));
                if (matches) {
                    results.push(info);
                }
            }
            else {
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
    async getAPIEndpoints(args) {
        const { provider, category } = args;
        const endpoints = this.getEndpointsForProvider(provider);
        const filteredEndpoints = category
            ? endpoints.filter((ep) => ep.category?.toLowerCase() === category.toLowerCase() ||
                ep.name?.toLowerCase().includes(category.toLowerCase()))
            : endpoints;
        return {
            content: [
                {
                    type: "text",
                    text: JSON.stringify({
                        provider,
                        category: category || "all",
                        endpoints: filteredEndpoints,
                    }, null, 2),
                },
            ],
        };
    }
    async getAPIDocumentationURLs(args) {
        const { provider } = args;
        const providersToGet = provider === "all"
            ? Object.keys(API_SOURCES)
            : [provider];
        const docs = [];
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
    async getStockPriceFireAnt(args) {
        const { symbol } = args;
        const symbols = symbol.split(",").map((s) => s.trim().toUpperCase());
        try {
            // Try FireAnt API first
            const results = [];
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
                    }
                    else {
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
                        }
                        else {
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
                }
                catch (error) {
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
                        text: JSON.stringify({
                            provider: "FireAnt",
                            symbols: symbols,
                            results: results,
                            note: results.some((r) => r.note) &&
                                "Some data may require authentication. Consider using Firecrawl MCP server to scrape real-time data from FireAnt website.",
                        }, null, 2),
                    },
                ],
            };
        }
        catch (error) {
            return {
                content: [
                    {
                        type: "text",
                        text: JSON.stringify({
                            error: error instanceof Error ? error.message : String(error),
                            note: "Unable to fetch stock prices. You may need to use Firecrawl MCP to scrape data from FireAnt website at https://www.fireant.vn",
                        }, null, 2),
                    },
                ],
                isError: true,
            };
        }
    }
    async listVNStocks(args) {
        const { exchange = "all", search } = args;
        try {
            // Try to get list from FireAnt API
            let stocks = [];
            try {
                // FireAnt API endpoint for listing stocks
                const apiUrl = "https://restv2.fireant.vn/symbols";
                const response = await fetch(apiUrl, {
                    headers: {
                        "User-Agent": "Mozilla/5.0",
                        "Accept": "application/json",
                    },
                });
                if (response.ok) {
                    const data = await response.json();
                    stocks = Array.isArray(data) ? data : data.data || data.symbols || [];
                }
            }
            catch (error) {
                // If API fails, use a comprehensive static list of popular Vietnamese stocks
                stocks = this.getPopularVNStocks();
            }
            // If API returned empty or failed, use static list
            if (stocks.length === 0) {
                stocks = this.getPopularVNStocks();
            }
            // Filter by exchange if specified
            let filteredStocks = stocks;
            if (exchange !== "all") {
                filteredStocks = stocks.filter((stock) => stock.exchange?.toUpperCase() === exchange ||
                    stock.market?.toUpperCase() === exchange ||
                    (exchange === "HOSE" && this.isHOSEStock(stock.symbol || stock.code)) ||
                    (exchange === "HNX" && this.isHNXStock(stock.symbol || stock.code)) ||
                    (exchange === "UPCOM" && this.isUPCOMStock(stock.symbol || stock.code)));
            }
            // Filter by search query if provided
            if (search) {
                const lowerSearch = search.toLowerCase();
                filteredStocks = filteredStocks.filter((stock) => (stock.symbol || stock.code || "").toLowerCase().includes(lowerSearch) ||
                    (stock.name || stock.companyName || "").toLowerCase().includes(lowerSearch) ||
                    (stock.companyNameEn || "").toLowerCase().includes(lowerSearch));
            }
            return {
                content: [
                    {
                        type: "text",
                        text: JSON.stringify({
                            exchange: exchange,
                            total: filteredStocks.length,
                            stocks: filteredStocks,
                            note: "This list includes major Vietnamese stocks. For complete real-time data, use get_stock_price_fireant with specific symbols.",
                        }, null, 2),
                    },
                ],
            };
        }
        catch (error) {
            return {
                content: [
                    {
                        type: "text",
                        text: JSON.stringify({
                            error: error instanceof Error ? error.message : String(error),
                            stocks: this.getPopularVNStocks(),
                            note: "Using fallback static list of popular Vietnamese stocks.",
                        }, null, 2),
                    },
                ],
                isError: true,
            };
        }
    }
    getPopularVNStocks() {
        // Comprehensive list of popular Vietnamese stocks
        return [
            // HOSE - Ho Chi Minh Stock Exchange (Large cap)
            { symbol: "VIC", name: "Vingroup", exchange: "HOSE", market: "HOSE" },
            { symbol: "VNM", name: "Vinamilk", exchange: "HOSE", market: "HOSE" },
            { symbol: "VCB", name: "Vietcombank", exchange: "HOSE", market: "HOSE" },
            { symbol: "VRE", name: "Vincom Retail", exchange: "HOSE", market: "HOSE" },
            { symbol: "VHM", name: "Vinhomes", exchange: "HOSE", market: "HOSE" },
            { symbol: "HPG", name: "Hoa Phat Group", exchange: "HOSE", market: "HOSE" },
            { symbol: "MSN", name: "Masan Group", exchange: "HOSE", market: "HOSE" },
            { symbol: "VJC", name: "VietJet Air", exchange: "HOSE", market: "HOSE" },
            { symbol: "FPT", name: "FPT Corporation", exchange: "HOSE", market: "HOSE" },
            { symbol: "TCB", name: "Techcombank", exchange: "HOSE", market: "HOSE" },
            { symbol: "CTG", name: "VietinBank", exchange: "HOSE", market: "HOSE" },
            { symbol: "BID", name: "BIDV", exchange: "HOSE", market: "HOSE" },
            { symbol: "MWG", name: "Mobile World", exchange: "HOSE", market: "HOSE" },
            { symbol: "SSI", name: "SSI Securities", exchange: "HOSE", market: "HOSE" },
            { symbol: "VSH", name: "Vinhomes", exchange: "HOSE", market: "HOSE" },
            { symbol: "PLX", name: "Petrolimex", exchange: "HOSE", market: "HOSE" },
            { symbol: "GAS", name: "PetroVietnam Gas", exchange: "HOSE", market: "HOSE" },
            { symbol: "POW", name: "PetroVietnam Power", exchange: "HOSE", market: "HOSE" },
            { symbol: "BVH", name: "Bao Viet Holdings", exchange: "HOSE", market: "HOSE" },
            { symbol: "MBB", name: "MB Bank", exchange: "HOSE", market: "HOSE" },
            { symbol: "ACB", name: "ACB Bank", exchange: "HOSE", market: "HOSE" },
            { symbol: "TPB", name: "TPBank", exchange: "HOSE", market: "HOSE" },
            { symbol: "STB", name: "Sacombank", exchange: "HOSE", market: "HOSE" },
            { symbol: "VPB", name: "VPBank", exchange: "HOSE", market: "HOSE" },
            { symbol: "EIB", name: "Eximbank", exchange: "HOSE", market: "HOSE" },
            { symbol: "HDB", name: "HDBank", exchange: "HOSE", market: "HOSE" },
            { symbol: "SHB", name: "SHB", exchange: "HOSE", market: "HOSE" },
            { symbol: "VCI", name: "Viet Capital Securities", exchange: "HOSE", market: "HOSE" },
            { symbol: "VND", name: "VNDirect Securities", exchange: "HOSE", market: "HOSE" },
            { symbol: "BSI", name: "BIDV Securities", exchange: "HOSE", market: "HOSE" },
            { symbol: "VIX", name: "VIX Securities", exchange: "HOSE", market: "HOSE" },
            { symbol: "SHS", name: "Saigon-Hanoi Securities", exchange: "HOSE", market: "HOSE" },
            { symbol: "VRE", name: "Vincom Retail", exchange: "HOSE", market: "HOSE" },
            { symbol: "MWG", name: "Mobile World", exchange: "HOSE", market: "HOSE" },
            { symbol: "FRT", name: "FPT Retail", exchange: "HOSE", market: "HOSE" },
            { symbol: "DGW", name: "Digiworld", exchange: "HOSE", market: "HOSE" },
            { symbol: "PNJ", name: "Phu Nhuan Jewelry", exchange: "HOSE", market: "HOSE" },
            { symbol: "MSH", name: "Masan Consumer", exchange: "HOSE", market: "HOSE" },
            { symbol: "VGC", name: "Viglacera", exchange: "HOSE", market: "HOSE" },
            { symbol: "DXG", name: "Dat Xanh Group", exchange: "HOSE", market: "HOSE" },
            { symbol: "NVL", name: "Novaland", exchange: "HOSE", market: "HOSE" },
            { symbol: "KDH", name: "Khang Dien House", exchange: "HOSE", market: "HOSE" },
            { symbol: "HDG", name: "Hoa Binh Group", exchange: "HOSE", market: "HOSE" },
            { symbol: "BCM", name: "Becamex", exchange: "HOSE", market: "HOSE" },
            { symbol: "DXS", name: "Dat Xanh Services", exchange: "HOSE", market: "HOSE" },
            { symbol: "QCG", name: "Quoc Cuong Gia Lai", exchange: "HOSE", market: "HOSE" },
            { symbol: "VHC", name: "Vinh Hoan", exchange: "HOSE", market: "HOSE" },
            { symbol: "VTO", name: "Viettel Post", exchange: "HOSE", market: "HOSE" },
            { symbol: "GMD", name: "Gemadept", exchange: "HOSE", market: "HOSE" },
            { symbol: "VSC", name: "Vietnam Container", exchange: "HOSE", market: "HOSE" },
            { symbol: "GSP", name: "Gemadept Port", exchange: "HOSE", market: "HOSE" },
            { symbol: "VOS", name: "Vietnam Oil and Gas", exchange: "HOSE", market: "HOSE" },
            { symbol: "PVS", name: "PetroVietnam Services", exchange: "HOSE", market: "HOSE" },
            { symbol: "PVB", name: "PetroVietnam Insurance", exchange: "HOSE", market: "HOSE" },
            { symbol: "BSR", name: "Binh Son Refining", exchange: "HOSE", market: "HOSE" },
            { symbol: "OIL", name: "PV Oil", exchange: "HOSE", market: "HOSE" },
            { symbol: "PVT", name: "PetroVietnam Transportation", exchange: "HOSE", market: "HOSE" },
            { symbol: "PVD", name: "PV Drilling", exchange: "HOSE", market: "HOSE" },
            { symbol: "PVG", name: "PetroVietnam Gas", exchange: "HOSE", market: "HOSE" },
            { symbol: "HSG", name: "Hoa Sen Group", exchange: "HOSE", market: "HOSE" },
            { symbol: "HPX", name: "Hoa Phat Xanh", exchange: "HOSE", market: "HOSE" },
            { symbol: "NKG", name: "Nam Kim Steel", exchange: "HOSE", market: "HOSE" },
            { symbol: "SMC", name: "SMC Trading", exchange: "HOSE", market: "HOSE" },
            { symbol: "VGS", name: "Vietnam Gas", exchange: "HOSE", market: "HOSE" },
            { symbol: "GEX", name: "Gelex", exchange: "HOSE", market: "HOSE" },
            { symbol: "REE", name: "REE Corporation", exchange: "HOSE", market: "HOSE" },
            { symbol: "DRC", name: "Danang Rubber", exchange: "HOSE", market: "HOSE" },
            { symbol: "CSM", name: "Cao Su May", exchange: "HOSE", market: "HOSE" },
            { symbol: "DCM", name: "Dong Nai Rubber", exchange: "HOSE", market: "HOSE" },
            { symbol: "SRC", name: "Saigon Rubber", exchange: "HOSE", market: "HOSE" },
            { symbol: "DPM", name: "PetroVietnam Fertilizer", exchange: "HOSE", market: "HOSE" },
            { symbol: "LAS", name: "Lao Cai", exchange: "HOSE", market: "HOSE" },
            { symbol: "LIX", name: "Licogi", exchange: "HOSE", market: "HOSE" },
            { symbol: "ROS", name: "FLC Faros", exchange: "HOSE", market: "HOSE" },
            { symbol: "FLC", name: "FLC Group", exchange: "HOSE", market: "HOSE" },
            { symbol: "HBC", name: "Hoa Binh Construction", exchange: "HOSE", market: "HOSE" },
            { symbol: "CTD", name: "Coteccons", exchange: "HOSE", market: "HOSE" },
            { symbol: "LCG", name: "Lizen", exchange: "HOSE", market: "HOSE" },
            { symbol: "HNG", name: "Hoang Anh Gia Lai", exchange: "HOSE", market: "HOSE" },
            { symbol: "VGC", name: "Viglacera", exchange: "HOSE", market: "HOSE" },
            { symbol: "VCS", name: "Vietnam Container", exchange: "HOSE", market: "HOSE" },
            { symbol: "VRE", name: "Vincom Retail", exchange: "HOSE", market: "HOSE" },
            { symbol: "VHM", name: "Vinhomes", exchange: "HOSE", market: "HOSE" },
            { symbol: "VIC", name: "Vingroup", exchange: "HOSE", market: "HOSE" },
            { symbol: "VNM", name: "Vinamilk", exchange: "HOSE", market: "HOSE" },
            { symbol: "VCB", name: "Vietcombank", exchange: "HOSE", market: "HOSE" },
            { symbol: "VJC", name: "VietJet Air", exchange: "HOSE", market: "HOSE" },
            { symbol: "FPT", name: "FPT Corporation", exchange: "HOSE", market: "HOSE" },
            { symbol: "TCB", name: "Techcombank", exchange: "HOSE", market: "HOSE" },
            { symbol: "CTG", name: "VietinBank", exchange: "HOSE", market: "HOSE" },
            { symbol: "BID", name: "BIDV", exchange: "HOSE", market: "HOSE" },
            { symbol: "MWG", name: "Mobile World", exchange: "HOSE", market: "HOSE" },
            { symbol: "SSI", name: "SSI Securities", exchange: "HOSE", market: "HOSE" },
            { symbol: "PLX", name: "Petrolimex", exchange: "HOSE", market: "HOSE" },
            { symbol: "GAS", name: "PetroVietnam Gas", exchange: "HOSE", market: "HOSE" },
            { symbol: "POW", name: "PetroVietnam Power", exchange: "HOSE", market: "HOSE" },
            { symbol: "BVH", name: "Bao Viet Holdings", exchange: "HOSE", market: "HOSE" },
            { symbol: "MBB", name: "MB Bank", exchange: "HOSE", market: "HOSE" },
            { symbol: "ACB", name: "ACB Bank", exchange: "HOSE", market: "HOSE" },
            { symbol: "TPB", name: "TPBank", exchange: "HOSE", market: "HOSE" },
            { symbol: "STB", name: "Sacombank", exchange: "HOSE", market: "HOSE" },
            { symbol: "VPB", name: "VPBank", exchange: "HOSE", market: "HOSE" },
            { symbol: "EIB", name: "Eximbank", exchange: "HOSE", market: "HOSE" },
            { symbol: "HDB", name: "HDBank", exchange: "HOSE", market: "HOSE" },
            { symbol: "SHB", name: "SHB", exchange: "HOSE", market: "HOSE" },
            // HNX - Hanoi Stock Exchange
            { symbol: "VCG", name: "Viettel Construction", exchange: "HNX", market: "HNX" },
            { symbol: "VCS", name: "Vietnam Container", exchange: "HNX", market: "HNX" },
            { symbol: "VND", name: "VNDirect Securities", exchange: "HNX", market: "HNX" },
            { symbol: "BSI", name: "BIDV Securities", exchange: "HNX", market: "HNX" },
            { symbol: "VIX", name: "VIX Securities", exchange: "HNX", market: "HNX" },
            { symbol: "SHS", name: "Saigon-Hanoi Securities", exchange: "HNX", market: "HNX" },
            { symbol: "VCI", name: "Viet Capital Securities", exchange: "HNX", market: "HNX" },
            { symbol: "CTS", name: "VietinBank Securities", exchange: "HNX", market: "HNX" },
            { symbol: "HCM", name: "Ho Chi Minh Securities", exchange: "HNX", market: "HNX" },
            { symbol: "FTS", name: "FPT Securities", exchange: "HNX", market: "HNX" },
            { symbol: "AGR", name: "Agribank Securities", exchange: "HNX", market: "HNX" },
            { symbol: "BVS", name: "Bao Viet Securities", exchange: "HNX", market: "HNX" },
            { symbol: "MBS", name: "MB Securities", exchange: "HNX", market: "HNX" },
            { symbol: "TVS", name: "TVS Securities", exchange: "HNX", market: "HNX" },
            { symbol: "WSS", name: "WSS Securities", exchange: "HNX", market: "HNX" },
            { symbol: "BSC", name: "Bao Son Securities", exchange: "HNX", market: "HNX" },
            { symbol: "VDS", name: "Viet Dragon Securities", exchange: "HNX", market: "HNX" },
            { symbol: "EVS", name: "EIV Securities", exchange: "HNX", market: "HNX" },
            { symbol: "VNS", name: "Vietnam Securities", exchange: "HNX", market: "HNX" },
            { symbol: "HBS", name: "Hoang Gia Securities", exchange: "HNX", market: "HNX" },
            { symbol: "IVS", name: "IVS Securities", exchange: "HNX", market: "HNX" },
            { symbol: "PSI", name: "PetroVietnam Securities", exchange: "HNX", market: "HNX" },
            { symbol: "VCI", name: "Viet Capital Securities", exchange: "HNX", market: "HNX" },
            { symbol: "VND", name: "VNDirect Securities", exchange: "HNX", market: "HNX" },
            { symbol: "BSI", name: "BIDV Securities", exchange: "HNX", market: "HNX" },
            { symbol: "VIX", name: "VIX Securities", exchange: "HNX", market: "HNX" },
            { symbol: "SHS", name: "Saigon-Hanoi Securities", exchange: "HNX", market: "HNX" },
            // UPCOM - Unlisted Public Company Market
            { symbol: "VGI", name: "Vingroup", exchange: "UPCOM", market: "UPCOM" },
            { symbol: "VRE", name: "Vincom Retail", exchange: "UPCOM", market: "UPCOM" },
            { symbol: "VHM", name: "Vinhomes", exchange: "UPCOM", market: "UPCOM" },
            { symbol: "VIC", name: "Vingroup", exchange: "UPCOM", market: "UPCOM" },
            { symbol: "VNM", name: "Vinamilk", exchange: "UPCOM", market: "UPCOM" },
            { symbol: "VCB", name: "Vietcombank", exchange: "UPCOM", market: "UPCOM" },
            { symbol: "VJC", name: "VietJet Air", exchange: "UPCOM", market: "UPCOM" },
            { symbol: "FPT", name: "FPT Corporation", exchange: "UPCOM", market: "UPCOM" },
            { symbol: "TCB", name: "Techcombank", exchange: "UPCOM", market: "UPCOM" },
            { symbol: "CTG", name: "VietinBank", exchange: "UPCOM", market: "UPCOM" },
            { symbol: "BID", name: "BIDV", exchange: "UPCOM", market: "UPCOM" },
            { symbol: "MWG", name: "Mobile World", exchange: "UPCOM", market: "UPCOM" },
            { symbol: "SSI", name: "SSI Securities", exchange: "UPCOM", market: "UPCOM" },
            { symbol: "PLX", name: "Petrolimex", exchange: "UPCOM", market: "UPCOM" },
            { symbol: "GAS", name: "PetroVietnam Gas", exchange: "UPCOM", market: "UPCOM" },
            { symbol: "POW", name: "PetroVietnam Power", exchange: "UPCOM", market: "UPCOM" },
            { symbol: "BVH", name: "Bao Viet Holdings", exchange: "UPCOM", market: "UPCOM" },
            { symbol: "MBB", name: "MB Bank", exchange: "UPCOM", market: "UPCOM" },
            { symbol: "ACB", name: "ACB Bank", exchange: "UPCOM", market: "UPCOM" },
            { symbol: "TPB", name: "TPBank", exchange: "UPCOM", market: "UPCOM" },
            { symbol: "STB", name: "Sacombank", exchange: "UPCOM", market: "UPCOM" },
            { symbol: "VPB", name: "VPBank", exchange: "UPCOM", market: "UPCOM" },
            { symbol: "EIB", name: "Eximbank", exchange: "UPCOM", market: "UPCOM" },
            { symbol: "HDB", name: "HDBank", exchange: "UPCOM", market: "UPCOM" },
            { symbol: "SHB", name: "SHB", exchange: "UPCOM", market: "UPCOM" },
        ];
    }
    isHOSEStock(symbol) {
        // HOSE stocks typically have 3 characters
        return symbol.length === 3 && /^[A-Z]{3}$/.test(symbol);
    }
    isHNXStock(symbol) {
        // HNX stocks typically have 3 characters
        return symbol.length === 3 && /^[A-Z]{3}$/.test(symbol);
    }
    isUPCOMStock(symbol) {
        // UPCOM stocks can have 3-5 characters
        return symbol.length >= 3 && symbol.length <= 5 && /^[A-Z0-9]+$/.test(symbol);
    }
    getEndpointsForProvider(provider) {
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
                        documentation: "https://guide.ssi.com.vn/ssi-products/tieng-viet/fastconnect-trading/danh-sach-cac-api",
                    },
                    {
                        name: "FastConnect Data API",
                        description: "SSI FastConnect Data API",
                        category: "market-data",
                        documentation: "https://github.com/SSI-Securities-Corporation/docs",
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
//# sourceMappingURL=index.js.map