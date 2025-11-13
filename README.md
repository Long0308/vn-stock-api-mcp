# VN Stock API MCP Server

MCP server để tìm kiếm và truy cập API từ các công ty chứng khoán Việt Nam: VNDirect, FireAnt, và SSI.

## Tính năng

- Tìm kiếm API documentation từ VNDirect, FireAnt, và SSI
- Lấy thông tin về API endpoints
- Truy cập documentation URLs

## Cài đặt

### Cách 1: Clone từ GitHub (Khuyến nghị)

```bash
# Clone repository
git clone https://github.com/Long0308/vn-stock-api-mcp.git
cd vn-stock-api-mcp

# Cài đặt dependencies và build
npm install
npm run build
```

### Cách 2: Sử dụng trực tiếp từ GitHub (đã có sẵn dist/)

Nếu bạn chỉ muốn sử dụng mà không cần phát triển, bạn có thể clone và sử dụng trực tiếp:

```bash
# Clone repository
git clone https://github.com/Long0308/vn-stock-api-mcp.git
cd vn-stock-api-mcp

# Chỉ cần cài đặt dependencies (dist/ đã có sẵn)
npm install
```

## Cấu hình trong mcp.json

### Cấu hình với đường dẫn local (sau khi clone)

```json
{
  "mcpServers": {
    "vn-stock-api-mcp": {
      "command": "node",
      "args": [
        "C:\\path\\to\\vn-stock-api-mcp\\dist\\index.js"
      ]
    }
  }
}
```

### Cấu hình với đường dẫn tương đối

```json
{
  "mcpServers": {
    "vn-stock-api-mcp": {
      "command": "node",
      "args": [
        "~/vn-stock-api-mcp/dist/index.js"
      ]
    }
  }
}
```

**Lưu ý:** Thay `C:\\path\\to\\vn-stock-api-mcp` hoặc `~/vn-stock-api-mcp` bằng đường dẫn thực tế đến thư mục bạn đã clone.

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

