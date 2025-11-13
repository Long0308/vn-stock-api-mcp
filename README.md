# VN Stock API MCP Server

MCP server để tìm kiếm và truy cập API từ các công ty chứng khoán Việt Nam: VNDirect, FireAnt, và SSI.

## Tính năng

- Tìm kiếm API documentation từ VNDirect, FireAnt, và SSI
- Lấy thông tin về API endpoints
- Truy cập documentation URLs
- **Lấy giá cổ phiếu real-time từ FireAnt** (get_stock_price_fireant)
- **Liệt kê tất cả mã cổ phiếu Việt Nam** (list_vn_stocks) - tương tự list_assets trong coincap-mcp

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

### 4. get_stock_price_fireant
Lấy giá cổ phiếu real-time từ FireAnt API. Hỗ trợ lấy giá cho một hoặc nhiều mã cổ phiếu cùng lúc.

**Parameters:**
- `symbol`: Mã cổ phiếu (ví dụ: "VIC", "VNM", "VCB"). Có thể truyền nhiều mã cách nhau bằng dấu phẩy (ví dụ: "VIC,VNM,VCB")

**Ví dụ sử dụng:**
```json
{
  "symbol": "VIC"
}
```

hoặc nhiều mã:

```json
{
  "symbol": "VIC,VNM,VCB"
}
```

**Lưu ý:** 
- FireAnt API có thể yêu cầu authentication. Nếu API không hoạt động, tool sẽ cung cấp URL web để truy cập thông tin trên FireAnt website.
- Để lấy dữ liệu real-time tốt hơn, có thể sử dụng kết hợp với Firecrawl MCP server để scrape từ website FireAnt.

### 5. list_vn_stocks
Liệt kê tất cả các mã cổ phiếu Việt Nam có sẵn. Tương tự như `list_assets` trong coincap-mcp, tool này trả về danh sách đầy đủ các mã cổ phiếu được giao dịch trên các sàn chứng khoán Việt Nam (HOSE, HNX, UPCOM).

**Parameters:**
- `exchange` (optional): Lọc theo sàn giao dịch - "HOSE" (Sàn Hồ Chí Minh), "HNX" (Sàn Hà Nội), "UPCOM" (Thị trường UPCOM), hoặc "all" để lấy tất cả (mặc định: "all")
- `search` (optional): Từ khóa tìm kiếm để lọc theo mã cổ phiếu hoặc tên công ty

**Ví dụ sử dụng:**

Liệt kê tất cả mã cổ phiếu:
```json
{}
```

Lọc theo sàn HOSE:
```json
{
  "exchange": "HOSE"
}
```

Tìm kiếm mã cổ phiếu:
```json
{
  "search": "VIC"
}
```

Kết hợp filter và search:
```json
{
  "exchange": "HOSE",
  "search": "bank"
}
```

**Lưu ý:**
- Tool sẽ cố gắng lấy danh sách từ FireAnt API trước, nếu không thành công sẽ sử dụng danh sách tĩnh các mã cổ phiếu phổ biến.
- Danh sách bao gồm các mã cổ phiếu lớn và phổ biến trên thị trường Việt Nam.
- Để lấy thông tin chi tiết và giá real-time, sử dụng `get_stock_price_fireant` với mã cổ phiếu cụ thể.

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

