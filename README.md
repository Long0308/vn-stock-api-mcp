# VN Stock API MCP Server

MCP server để tìm kiếm và truy cập API từ các công ty chứng khoán Việt Nam: VNDirect, FireAnt, và SSI.

## Tính năng

- Tìm kiếm API documentation từ VNDirect, FireAnt, và SSI
- Lấy thông tin về API endpoints
- Truy cập documentation URLs

## Cài đặt

```bash
npm install
npm run build
```

## Cấu hình trong mcp.json

```json
{
  "mcpServers": {
    "vn-stock-api-mcp": {
      "command": "node",
      "args": [
        "C:\\Users\\philong.pham\\vn-stock-api-mcp\\dist\\index.js"
      ]
    }
  }
}
```

## Tools có sẵn

### 1. search_vn_stock_api
Tìm kiếm API documentation từ các nhà cung cấp.

**Parameters:**
- `provider`: "vndirect" | "fireant" | "ssi" | "all"
- `query` (optional): Từ khóa tìm kiếm

### 2. get_api_endpoints
Lấy danh sách API endpoints cho một nhà cung cấp.

**Parameters:**
- `provider`: "vndirect" | "fireant" | "ssi"
- `category` (optional): Lọc theo category

### 3. get_api_documentation_urls
Lấy URLs của API documentation.

**Parameters:**
- `provider`: "vndirect" | "fireant" | "ssi" | "all"

## Các nhà cung cấp được hỗ trợ

### VNDirect
- Open API
- D-Stock Data API
- Documentation: https://www.vndirect.com.vn/san-pham-to-chuc/apis-white-labeling/

### FireAnt
- FireAnt API
- Base URL: https://api.fireant.vn
- Documentation: https://api.fireant.vn/

### SSI
- FastConnect Trading API
- FastConnect Data API
- Documentation: https://guide.ssi.com.vn/ssi-products/tieng-viet/fastconnect-trading/danh-sach-cac-api

## Development

```bash
npm run dev  # Watch mode
npm run build  # Build
npm start  # Run server
```

## License

MIT

