# VN Stock API MCP Server

MCP server để tìm kiếm và truy cập API từ các công ty chứng khoán Việt Nam: VNDirect, FireAnt, và SSI.

## Tính năng

- Tìm kiếm API documentation từ VNDirect, FireAnt, và SSI
- Lấy thông tin về API endpoints
- Truy cập documentation URLs
- **Lấy giá cổ phiếu real-time từ FireAnt** (get_stock_price_fireant)
- **Liệt kê tất cả mã cổ phiếu Việt Nam** (list_vn_stocks) - tương tự list_assets trong coincap-mcp
- **Lấy tin tức thị trường chứng khoán từ CafeF** (get_cafef_market_news) - sử dụng Firecrawl API để scrape tin tức
- **Phân tích mô hình nến Doji** (analyze_doji_pattern) - phân tích kỹ thuật để phát hiện tín hiệu đảo chiều

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

**Cấu hình cơ bản (không có Firecrawl API):**

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

**Cấu hình đầy đủ (có Firecrawl API để sử dụng tính năng get_cafef_market_news):**

```json
{
  "mcpServers": {
    "vn-stock-api-mcp": {
      "command": "node",
      "args": [
        "C:\\path\\to\\vn-stock-api-mcp\\dist\\index.js"
      ],
      "env": {
        "FIRECRAWL_API_KEY": "your-firecrawl-api-key-here"
      }
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
      ],
      "env": {
        "FIRECRAWL_API_KEY": "your-firecrawl-api-key-here"
      }
    }
  }
}
```

**Lưu ý:** 
- Thay `C:\\path\\to\\vn-stock-api-mcp` hoặc `~/vn-stock-api-mcp` bằng đường dẫn thực tế đến thư mục bạn đã clone.
- Thay `"your-firecrawl-api-key-here"` bằng API key thực tế của bạn từ [firecrawl.dev](https://firecrawl.dev) (chỉ cần nếu muốn sử dụng tính năng `get_cafef_market_news`).
- Nếu không có Firecrawl API key, các tool khác vẫn hoạt động bình thường, chỉ có `get_cafef_market_news` sẽ sử dụng phương pháp fallback.

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

### 6. get_cafef_market_news
Lấy tin tức thị trường chứng khoán mới nhất từ CafeF (cafef.vn). Tool này sử dụng Firecrawl API để scrape và trả về tin tức, phân tích, và cập nhật thị trường từ trang tin tài chính hàng đầu Việt Nam.

**Parameters:**
- `limit` (optional): Số lượng bài viết tối đa cần trả về (mặc định: 20, tối đa: 100)
- `search` (optional): Từ khóa tìm kiếm để lọc tin tức (ví dụ: "VIC", "VN-Index", "ngân hàng")
- `format` (optional): Định dạng đầu ra - "markdown" (văn bản có định dạng), "json" (dữ liệu có cấu trúc), hoặc "text" (văn bản thuần). Mặc định: "markdown"

**Ví dụ sử dụng:**

Lấy 20 tin tức mới nhất:
```json
{}
```

Lấy 10 tin tức về VIC:
```json
{
  "limit": 10,
  "search": "VIC"
}
```

Lấy tin tức dạng JSON:
```json
{
  "limit": 20,
  "format": "json"
}
```

Tìm kiếm tin tức về ngân hàng:
```json
{
  "search": "ngân hàng",
  "limit": 15
}
```

**Lưu ý:**
- Tool sử dụng Firecrawl API để scrape dữ liệu từ [cafef.vn](https://cafef.vn/thi-truong-chung-khoan.chn).
- Để sử dụng Firecrawl API, **bạn cần tự đăng ký và lấy API key của riêng bạn** từ [firecrawl.dev](https://firecrawl.dev).
- Nếu không có Firecrawl API key, tool sẽ sử dụng phương pháp fallback với HTML parsing cơ bản (kết quả có thể kém chính xác hơn).
- Để có kết quả tốt nhất, nên sử dụng Firecrawl API key của bạn.

**Cách lấy Firecrawl API Key:**

1. Truy cập [https://firecrawl.dev](https://firecrawl.dev)
2. Đăng ký tài khoản miễn phí hoặc đăng nhập
3. Vào Dashboard và lấy API key của bạn
4. Copy API key và thêm vào cấu hình mcp.json như hướng dẫn bên dưới

**Cấu hình Firecrawl API Key trong mcp.json:**

Thêm `env` với `FIRECRAWL_API_KEY` vào cấu hình của `vn-stock-api-mcp`:

```json
{
  "mcpServers": {
    "vn-stock-api-mcp": {
      "command": "node",
      "args": ["C:\\path\\to\\vn-stock-api-mcp\\dist\\index.js"],
      "env": {
        "FIRECRAWL_API_KEY": "your-firecrawl-api-key-here"
      }
    }
  }
}
```

**⚠️ QUAN TRỌNG:** 
- Thay `"your-firecrawl-api-key-here"` bằng API key thực tế của bạn từ firecrawl.dev
- **KHÔNG** chia sẻ API key của bạn công khai
- **KHÔNG** commit API key vào Git repository

### 7. analyze_doji_pattern
Phân tích mô hình nến Doji trong biểu đồ giá cổ phiếu. Mô hình Doji cho thấy sự không chắc chắn của thị trường và tiềm năng đảo chiều xu hướng. Tool này phát hiện các loại Doji khác nhau bao gồm Standard Doji, Long-legged Doji, Dragonfly Doji, Gravestone Doji, và Four Price Doji.

**Parameters:**
- `symbol` (required): Mã cổ phiếu cần phân tích (ví dụ: "VIC", "VNM", "VCB")
- `period` (optional): Chu kỳ thời gian phân tích - "1D" (ngày), "1W" (tuần), "1M" (tháng). Mặc định: "1D"
- `days` (optional): Số ngày để phân tích (mặc định: 30, tối đa: 100). Dùng để phát hiện mô hình Doji trong dữ liệu lịch sử
- `threshold` (optional): Ngưỡng phát hiện Doji theo phần trăm của khoảng giá (mặc định: 0.1 = 0.1%). Giá trị thấp hơn sẽ phát hiện nhiều mô hình Doji hơn

**Ví dụ sử dụng:**

Phân tích Doji cho VIC (30 ngày gần nhất):
```json
{
  "symbol": "VIC"
}
```

Phân tích Doji với chu kỳ tuần:
```json
{
  "symbol": "VIC",
  "period": "1W",
  "days": 60
}
```

Phân tích với ngưỡng tùy chỉnh:
```json
{
  "symbol": "VNM",
  "threshold": 0.05,
  "days": 50
}
```

**Các loại mô hình Doji được phát hiện:**

1. **Standard Doji**: Giá mở và giá đóng gần như bằng nhau với bóng nến ở cả hai phía
   - Ý nghĩa: Thị trường không chắc chắn, có thể đảo chiều xu hướng

2. **Long-legged Doji**: Thân nến nhỏ với bóng trên và bóng dưới rất dài
   - Ý nghĩa: Biến động cao và không chắc chắn mạnh, tiềm năng đảo chiều

3. **Dragonfly Doji**: Giá mở và giá đóng gần mức cao nhất, với bóng dưới dài
   - Ý nghĩa: Tín hiệu tăng giá, đặc biệt sau xu hướng giảm

4. **Gravestone Doji**: Giá mở và giá đóng gần mức thấp nhất, với bóng trên dài
   - Ý nghĩa: Tín hiệu giảm giá, đặc biệt sau xu hướng tăng

5. **Four Price Doji**: Giá mở = giá cao = giá thấp = giá đóng (rất hiếm)
   - Ý nghĩa: Không chắc chắn cực mạnh, xuất hiện rất hiếm

**Lưu ý:**
- Tool cần dữ liệu OHLC (Open, High, Low, Close) từ FireAnt API hoặc nguồn khác
- Nếu FireAnt API không khả dụng, tool sẽ cung cấp hướng dẫn sử dụng Firecrawl để scrape dữ liệu
- Mô hình Doji chỉ cho thấy sự không chắc chắn của thị trường, nên kết hợp với các chỉ báo kỹ thuật khác để đưa ra quyết định đầu tư
- Phân tích kỹ thuật không đảm bảo kết quả đầu tư, chỉ mang tính chất tham khảo

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

