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
            {
                name: "get_cafef_market_news",
                description: "Get latest stock market news from CafeF (cafef.vn). Scrapes and returns comprehensive market news, analysis, and updates from Vietnam's leading financial news website. Uses Firecrawl API for reliable web scraping.",
                inputSchema: {
                    type: "object",
                    properties: {
                        limit: {
                            type: "number",
                            description: "Maximum number of news articles to return (default: 20, max: 100)",
                            default: 20,
                        },
                        search: {
                            type: "string",
                            description: "Optional search query to filter news by keywords (e.g., 'VIC', 'VN-Index', 'ngân hàng')",
                        },
                        format: {
                            type: "string",
                            enum: ["markdown", "json", "text"],
                            description: "Output format: 'markdown' (formatted text), 'json' (structured data), or 'text' (plain text). Default: 'markdown'",
                            default: "markdown",
                        },
                    },
                },
            },
            {
                name: "analyze_doji_pattern",
                description: "Analyze Doji candlestick patterns in stock price charts. Doji patterns indicate market indecision and potential trend reversals. Detects various types of Doji patterns including Standard Doji, Long-legged Doji, Dragonfly Doji, Gravestone Doji, and Four Price Doji.",
                inputSchema: {
                    type: "object",
                    properties: {
                        symbol: {
                            type: "string",
                            description: "Stock symbol to analyze (e.g., 'VIC', 'VNM', 'VCB')",
                        },
                        period: {
                            type: "string",
                            enum: ["1D", "1W", "1M"],
                            description: "Time period for analysis: '1D' (daily), '1W' (weekly), '1M' (monthly). Default: '1D'",
                            default: "1D",
                        },
                        days: {
                            type: "number",
                            description: "Number of days to analyze (default: 30, max: 100). Used to detect Doji patterns in historical data.",
                            default: 30,
                        },
                        threshold: {
                            type: "number",
                            description: "Threshold for Doji detection as percentage of price range (default: 0.1 = 0.1%). Lower values detect more Doji patterns.",
                            default: 0.1,
                        },
                    },
                    required: ["symbol"],
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
                    case "get_cafef_market_news":
                        return await this.getCafefMarketNews(args);
                    case "analyze_doji_pattern":
                        return await this.analyzeDojiPattern(args);
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
    async getCafefMarketNews(args) {
        const { limit = 20, search, format = "markdown" } = args;
        const maxLimit = Math.min(limit, 100);
        try {
            // Use Firecrawl API to scrape cafef.vn
            const firecrawlApiKey = process.env.FIRECRAWL_API_KEY || "";
            const cafefUrl = "https://cafef.vn/thi-truong-chung-khoan.chn";
            if (!firecrawlApiKey) {
                // Fallback: Use direct fetch if Firecrawl API key is not available
                return await this.getCafefNewsFallback(cafefUrl, maxLimit, search, format);
            }
            // Use Firecrawl API
            const firecrawlUrl = "https://api.firecrawl.dev/v1/scrape";
            const response = await fetch(firecrawlUrl, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${firecrawlApiKey}`,
                },
                body: JSON.stringify({
                    url: cafefUrl,
                    formats: ["markdown"],
                    onlyMainContent: true,
                }),
            });
            if (response.ok) {
                const data = await response.json();
                const markdown = data.data?.markdown || data.markdown || "";
                // Parse markdown to extract news articles
                const newsArticles = this.parseCafefMarkdown(markdown, maxLimit, search);
                if (format === "json") {
                    return {
                        content: [
                            {
                                type: "text",
                                text: JSON.stringify({
                                    source: "CafeF (cafef.vn)",
                                    url: cafefUrl,
                                    total: newsArticles.length,
                                    articles: newsArticles,
                                    timestamp: new Date().toISOString(),
                                }, null, 2),
                            },
                        ],
                    };
                }
                else {
                    // Format as markdown or text
                    const formattedNews = newsArticles
                        .map((article, index) => {
                        if (format === "markdown") {
                            return `## ${index + 1}. ${article.title}\n\n**Ngày:** ${article.date}\n\n**Mô tả:** ${article.description}\n\n**Link:** ${article.url}\n\n---\n`;
                        }
                        else {
                            return `${index + 1}. ${article.title}\nNgày: ${article.date}\n${article.description}\nLink: ${article.url}\n\n`;
                        }
                    })
                        .join("\n");
                    return {
                        content: [
                            {
                                type: "text",
                                text: format === "markdown"
                                    ? `# Tin tức thị trường chứng khoán từ CafeF\n\n${formattedNews}`
                                    : formattedNews,
                            },
                        ],
                    };
                }
            }
            else {
                // Fallback if Firecrawl API fails
                return await this.getCafefNewsFallback(cafefUrl, maxLimit, search, format);
            }
        }
        catch (error) {
            return {
                content: [
                    {
                        type: "text",
                        text: JSON.stringify({
                            error: error instanceof Error ? error.message : String(error),
                            note: "Unable to fetch news from CafeF. Please ensure FIRECRAWL_API_KEY is set in environment variables, or use Firecrawl MCP server directly.",
                            fallback: "You can use Firecrawl MCP server to scrape https://cafef.vn/thi-truong-chung-khoan.chn directly.",
                        }, null, 2),
                    },
                ],
                isError: true,
            };
        }
    }
    async getCafefNewsFallback(url, limit, search, format = "markdown") {
        try {
            const response = await fetch(url, {
                headers: {
                    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
                    Accept: "text/html,application/xhtml+xml",
                },
            });
            if (response.ok) {
                const html = await response.text();
                // Simple HTML parsing to extract news (basic implementation)
                const newsArticles = this.parseCafefHTML(html, limit, search);
                if (format === "json") {
                    return {
                        content: [
                            {
                                type: "text",
                                text: JSON.stringify({
                                    source: "CafeF (cafef.vn)",
                                    url: url,
                                    total: newsArticles.length,
                                    articles: newsArticles,
                                    timestamp: new Date().toISOString(),
                                    note: "Data extracted using basic HTML parsing. For better results, use Firecrawl API with FIRECRAWL_API_KEY.",
                                }, null, 2),
                            },
                        ],
                    };
                }
                else {
                    const formattedNews = newsArticles
                        .map((article, index) => {
                        if (format === "markdown") {
                            return `## ${index + 1}. ${article.title}\n\n**Ngày:** ${article.date}\n\n**Mô tả:** ${article.description}\n\n**Link:** ${article.url}\n\n---\n`;
                        }
                        else {
                            return `${index + 1}. ${article.title}\nNgày: ${article.date}\n${article.description}\nLink: ${article.url}\n\n`;
                        }
                    })
                        .join("\n");
                    return {
                        content: [
                            {
                                type: "text",
                                text: format === "markdown"
                                    ? `# Tin tức thị trường chứng khoán từ CafeF\n\n${formattedNews}`
                                    : formattedNews,
                            },
                        ],
                    };
                }
            }
            else {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
        }
        catch (error) {
            throw error;
        }
    }
    parseCafefMarkdown(markdown, limit, search) {
        const articles = [];
        const lines = markdown.split("\n");
        let currentArticle = null;
        for (let i = 0; i < lines.length && articles.length < limit; i++) {
            const line = lines[i].trim();
            // Match article titles (usually start with ## or ###)
            if (line.match(/^###?\s+\[(.+)\]\((.+)\)/)) {
                const match = line.match(/^###?\s+\[(.+)\]\((.+)\)/);
                if (match) {
                    if (currentArticle) {
                        articles.push(currentArticle);
                    }
                    currentArticle = {
                        title: match[1],
                        url: match[2],
                        date: "",
                        description: "",
                    };
                }
            }
            // Match dates (format: DD/MM/YYYY - HH:MM)
            else if (line.match(/\d{2}\/\d{2}\/\d{4}\s*-\s*\d{2}:\d{2}/)) {
                if (currentArticle) {
                    currentArticle.date = line;
                }
            }
            // Match descriptions (text after date)
            else if (currentArticle && line && !line.startsWith("#") && !line.startsWith("![")) {
                if (!currentArticle.description) {
                    currentArticle.description = line;
                }
                else {
                    currentArticle.description += " " + line;
                }
            }
        }
        if (currentArticle) {
            articles.push(currentArticle);
        }
        // Filter by search query if provided
        let filteredArticles = articles;
        if (search) {
            const lowerSearch = search.toLowerCase();
            filteredArticles = articles.filter((article) => article.title.toLowerCase().includes(lowerSearch) ||
                article.description.toLowerCase().includes(lowerSearch));
        }
        return filteredArticles.slice(0, limit);
    }
    parseCafefHTML(html, limit, search) {
        // Basic HTML parsing - extract article links and titles
        const articles = [];
        const titleRegex = /<a[^>]+href="([^"]+)"[^>]*>([^<]+)<\/a>/g;
        const dateRegex = /(\d{2}\/\d{2}\/\d{4}\s*-\s*\d{2}:\d{2})/g;
        let match;
        const titles = [];
        while ((match = titleRegex.exec(html)) !== null && titles.length < limit * 2) {
            const url = match[1].startsWith("http") ? match[1] : `https://cafef.vn${match[1]}`;
            const title = match[2].trim();
            if (title && url.includes("cafef.vn")) {
                titles.push({ url, title });
            }
        }
        // Extract dates
        const dates = [];
        while ((match = dateRegex.exec(html)) !== null && dates.length < limit * 2) {
            dates.push(match[1]);
        }
        // Combine titles and dates
        for (let i = 0; i < Math.min(titles.length, dates.length, limit); i++) {
            const article = {
                title: titles[i].title,
                url: titles[i].url,
                date: dates[i] || "N/A",
                description: "",
            };
            if (!search || article.title.toLowerCase().includes(search.toLowerCase())) {
                articles.push(article);
            }
        }
        return articles;
    }
    async analyzeDojiPattern(args) {
        const { symbol, period = "1D", days = 30, threshold = 0.1 } = args;
        const maxDays = Math.min(days, 100);
        const symbolUpper = symbol.trim().toUpperCase();
        try {
            // Try to get OHLC data from FireAnt API
            let candles = [];
            try {
                // FireAnt API endpoint for historical data
                const apiUrl = `https://restv2.fireant.vn/symbols/${symbolUpper}/bars?resolution=${period}&from=${Date.now() - maxDays * 24 * 60 * 60 * 1000}&to=${Date.now()}`;
                const response = await fetch(apiUrl, {
                    headers: {
                        "User-Agent": "Mozilla/5.0",
                        Accept: "application/json",
                    },
                });
                if (response.ok) {
                    const data = await response.json();
                    candles = Array.isArray(data) ? data : data.data || data.bars || [];
                }
            }
            catch (error) {
                // If API fails, provide guidance
                return {
                    content: [
                        {
                            type: "text",
                            text: JSON.stringify({
                                symbol: symbolUpper,
                                error: "Unable to fetch OHLC data from FireAnt API",
                                note: "FireAnt API may require authentication. Please check FireAnt API documentation or use Firecrawl to scrape from https://www.fireant.vn",
                                suggestion: "You can use Firecrawl MCP server to scrape historical price data from FireAnt website, then analyze Doji patterns manually.",
                                dojiPatterns: this.getDojiPatternInfo(),
                            }, null, 2),
                        },
                    ],
                    isError: true,
                };
            }
            if (candles.length === 0) {
                return {
                    content: [
                        {
                            type: "text",
                            text: JSON.stringify({
                                symbol: symbolUpper,
                                error: "No price data available",
                                note: "Unable to fetch historical price data. Please check if the symbol is correct or try using Firecrawl to scrape data.",
                                dojiPatterns: this.getDojiPatternInfo(),
                            }, null, 2),
                        },
                    ],
                    isError: true,
                };
            }
            // Analyze Doji patterns
            const dojiPatterns = this.detectDojiPatterns(candles, threshold);
            const analysis = this.analyzeDojiSignificance(dojiPatterns, candles);
            return {
                content: [
                    {
                        type: "text",
                        text: JSON.stringify({
                            symbol: symbolUpper,
                            period: period,
                            analysisPeriod: `${maxDays} days`,
                            totalCandles: candles.length,
                            dojiPatternsFound: dojiPatterns.length,
                            patterns: dojiPatterns,
                            analysis: analysis,
                            interpretation: this.getDojiInterpretation(dojiPatterns),
                            note: "Doji patterns indicate market indecision. Always combine with other technical indicators for better trading decisions.",
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
                            symbol: symbolUpper,
                            note: "Unable to analyze Doji patterns. Please ensure you have access to price data.",
                            dojiPatterns: this.getDojiPatternInfo(),
                        }, null, 2),
                    },
                ],
                isError: true,
            };
        }
    }
    detectDojiPatterns(candles, threshold) {
        const dojiPatterns = [];
        for (let i = 0; i < candles.length; i++) {
            const candle = candles[i];
            const open = parseFloat(candle.open || candle.o || 0);
            const high = parseFloat(candle.high || candle.h || 0);
            const low = parseFloat(candle.low || candle.l || 0);
            const close = parseFloat(candle.close || candle.c || 0);
            const timestamp = candle.timestamp || candle.time || candle.date || i;
            if (open === 0 || high === 0 || low === 0 || close === 0)
                continue;
            const bodySize = Math.abs(close - open);
            const totalRange = high - low;
            const upperShadow = high - Math.max(open, close);
            const lowerShadow = Math.min(open, close) - low;
            // Threshold for Doji detection (body should be very small compared to range)
            const dojiThreshold = (totalRange * threshold) / 100;
            if (bodySize <= dojiThreshold && totalRange > 0) {
                const dojiType = this.classifyDojiType(bodySize, upperShadow, lowerShadow, totalRange);
                dojiPatterns.push({
                    index: i,
                    date: new Date(timestamp).toISOString(),
                    open: open,
                    high: high,
                    low: low,
                    close: close,
                    bodySize: bodySize,
                    totalRange: totalRange,
                    upperShadow: upperShadow,
                    lowerShadow: lowerShadow,
                    type: dojiType.type,
                    description: dojiType.description,
                    significance: dojiType.significance,
                });
            }
        }
        return dojiPatterns;
    }
    classifyDojiType(bodySize, upperShadow, lowerShadow, totalRange) {
        const bodyRatio = bodySize / totalRange;
        const upperRatio = upperShadow / totalRange;
        const lowerRatio = lowerShadow / totalRange;
        // Four Price Doji: Open = High = Low = Close
        if (bodySize === 0 && totalRange === 0) {
            return {
                type: "Four Price Doji",
                description: "Extremely rare pattern where Open = High = Low = Close",
                significance: "Very strong indecision, extremely rare occurrence",
            };
        }
        // Standard Doji: Small body with shadows on both sides
        if (bodyRatio < 0.1 && upperRatio > 0.2 && lowerRatio > 0.2) {
            return {
                type: "Standard Doji",
                description: "Open and close are nearly equal with shadows on both sides",
                significance: "Market indecision, potential trend reversal",
            };
        }
        // Long-legged Doji: Small body with very long shadows
        if (bodyRatio < 0.1 &&
            upperRatio > 0.3 &&
            lowerRatio > 0.3 &&
            totalRange > 0) {
            return {
                type: "Long-legged Doji",
                description: "Small body with very long upper and lower shadows",
                significance: "High volatility and strong indecision, potential reversal",
            };
        }
        // Dragonfly Doji: Small body at top, long lower shadow
        if (bodyRatio < 0.1 &&
            lowerRatio > 0.6 &&
            upperRatio < 0.1 &&
            totalRange > 0) {
            return {
                type: "Dragonfly Doji",
                description: "Open and close near the high, with long lower shadow",
                significance: "Bullish reversal signal, especially after downtrend",
            };
        }
        // Gravestone Doji: Small body at bottom, long upper shadow
        if (bodyRatio < 0.1 &&
            upperRatio > 0.6 &&
            lowerRatio < 0.1 &&
            totalRange > 0) {
            return {
                type: "Gravestone Doji",
                description: "Open and close near the low, with long upper shadow",
                significance: "Bearish reversal signal, especially after uptrend",
            };
        }
        // Generic Doji
        return {
            type: "Doji",
            description: "Open and close are nearly equal",
            significance: "Market indecision, watch for confirmation",
        };
    }
    analyzeDojiSignificance(dojiPatterns, candles) {
        if (dojiPatterns.length === 0) {
            return {
                message: "No Doji patterns detected in the analyzed period",
                recommendation: "Continue monitoring for Doji patterns",
            };
        }
        const patternTypes = dojiPatterns.reduce((acc, pattern) => {
            acc[pattern.type] = (acc[pattern.type] || 0) + 1;
            return acc;
        }, {});
        const recentDoji = dojiPatterns[dojiPatterns.length - 1];
        const isRecent = recentDoji.index >= candles.length - 5;
        return {
            totalPatterns: dojiPatterns.length,
            patternBreakdown: patternTypes,
            recentPattern: isRecent ? recentDoji : null,
            frequency: `${((dojiPatterns.length / candles.length) * 100).toFixed(2)}%`,
            interpretation: this.getDojiInterpretation(dojiPatterns),
        };
    }
    getDojiInterpretation(dojiPatterns) {
        if (dojiPatterns.length === 0) {
            return "Không phát hiện mô hình Doji trong khoảng thời gian phân tích.";
        }
        const dragonflyCount = dojiPatterns.filter((p) => p.type === "Dragonfly Doji").length;
        const gravestoneCount = dojiPatterns.filter((p) => p.type === "Gravestone Doji").length;
        const longLeggedCount = dojiPatterns.filter((p) => p.type === "Long-legged Doji").length;
        let interpretation = `Phát hiện ${dojiPatterns.length} mô hình Doji. `;
        if (dragonflyCount > 0) {
            interpretation += `Có ${dragonflyCount} Dragonfly Doji (tín hiệu tăng giá tiềm năng). `;
        }
        if (gravestoneCount > 0) {
            interpretation += `Có ${gravestoneCount} Gravestone Doji (tín hiệu giảm giá tiềm năng). `;
        }
        if (longLeggedCount > 0) {
            interpretation += `Có ${longLeggedCount} Long-legged Doji (biến động cao, không chắc chắn). `;
        }
        interpretation +=
            "Lưu ý: Doji chỉ cho thấy sự không chắc chắn của thị trường. Nên kết hợp với các chỉ báo kỹ thuật khác để đưa ra quyết định đầu tư.";
        return interpretation;
    }
    getDojiPatternInfo() {
        return {
            patterns: [
                {
                    name: "Standard Doji",
                    description: "Giá mở và giá đóng gần như bằng nhau với bóng nến ở cả hai phía",
                    significance: "Thị trường không chắc chắn, có thể đảo chiều xu hướng",
                },
                {
                    name: "Long-legged Doji",
                    description: "Thân nến nhỏ với bóng trên và bóng dưới rất dài",
                    significance: "Biến động cao và không chắc chắn mạnh, tiềm năng đảo chiều",
                },
                {
                    name: "Dragonfly Doji",
                    description: "Giá mở và giá đóng gần mức cao nhất, với bóng dưới dài",
                    significance: "Tín hiệu tăng giá, đặc biệt sau xu hướng giảm",
                },
                {
                    name: "Gravestone Doji",
                    description: "Giá mở và giá đóng gần mức thấp nhất, với bóng trên dài",
                    significance: "Tín hiệu giảm giá, đặc biệt sau xu hướng tăng",
                },
                {
                    name: "Four Price Doji",
                    description: "Giá mở = giá cao = giá thấp = giá đóng (rất hiếm)",
                    significance: "Không chắc chắn cực mạnh, xuất hiện rất hiếm",
                },
            ],
            usage: "Sử dụng tool analyze_doji_pattern với symbol cổ phiếu để phân tích",
        };
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