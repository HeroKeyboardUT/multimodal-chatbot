# Neural Chat - AI Chat Application

Ứng dụng chat AI đa năng với khả năng phân tích hình ảnh, xử lý dữ liệu CSV, và hỗ trợ nhiều định dạng nội dung phong phú.

## Tính năng đã hoàn thành

### 1. Chat với AI (Streaming)

- **Multi-turn conversation**: Hỗ trợ hội thoại nhiều lượt với ngữ cảnh được duy trì
- **Streaming response**: Phản hồi real-time, hiển thị từng ký tự khi AI trả lời
- **Session management**: Quản lý nhiều phiên chat, lưu trữ lịch sử

### 2. Markdown Rendering

- **Syntax Highlighting**: Code blocks với highlight theo ngôn ngữ (Python, JavaScript, TypeScript, etc.)
- **LaTeX Math**: Hỗ trợ công thức toán học với KaTeX (`$inline$` và `$$block$$`)
- **Mermaid Diagrams**: Render sơ đồ flowchart, sequence diagram
- **HTML Preview**: Xem trước HTML với nút toggle
- **SVG Rendering**: Hiển thị trực tiếp SVG
- **JSON Viewer**: Format và highlight JSON data
- **Copy Button**: Nút copy code nhanh cho mỗi code block

### 3. Upload & Phân tích ảnh

- **Upload ảnh**: Hỗ trợ PNG, JPG, WEBP, GIF
- **Paste ảnh**: Dán ảnh trực tiếp từ clipboard (Ctrl+V)
- **Vision AI**: Phân tích nội dung ảnh với Llama 4 Scout (Groq)

### 4. Upload & Phân tích CSV

- **Upload CSV**: Tải file CSV lên để phân tích
- **Load từ URL**: Tải CSV từ đường dẫn web
- **Auto-analysis**: Tự động tính toán thống kê (mean, median, min, max, std)
- **Data context**: AI có thể trả lời câu hỏi về dữ liệu CSV

### 5. UI/UX

- **Dark/Light mode**: Chuyển đổi theme sáng/tối
- **Responsive design**: Tương thích mobile và desktop
- **Session sidebar**: Quản lý nhiều cuộc hội thoại
- **Clean monochrome design**: Giao diện tối giản, chuyên nghiệp

---

## Hạn chế kỹ thuật

### 1. Giới hạn kích thước file

| Loại file | Giới hạn | Lý do                                                                                                                                 |
| --------- | -------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| **Ảnh**   | 10 MB    | Ảnh được encode thành Base64 (tăng ~33% kích thước) và lưu trong database. Ảnh quá lớn sẽ làm chậm API response và tốn bộ nhớ server. |
| **CSV**   | 5 MB     | CSV được parse thành JSON và giữ trong memory. File lớn có thể gây timeout hoặc out-of-memory.                                        |

### 2. Context không tồn tại ở tab mới

**Vấn đề**: Mở tab trình duyệt mới sẽ không thấy context (ảnh/CSV đang active) của session cũ.

**Lý do**:

- Session ID được lưu trong `localStorage` của trình duyệt
- `localStorage` là **riêng biệt cho mỗi tab/origin**
- Khi mở tab mới, frontend tạo session mới hoặc không tìm thấy session cũ trong localStorage

**Giải pháp tiềm năng**: Sử dụng URL params hoặc cookies để share session across tabs.

### 3. Lịch sử tin nhắn

| Aspect                     | Giá trị              | Lý do                                                                                            |
| -------------------------- | -------------------- | ------------------------------------------------------------------------------------------------ |
| **Thời gian lưu trữ**      | Vĩnh viễn (SQLite)   | Database SQLite lưu local, không tự động xóa                                                     |
| **Số tin nhắn gửi cho AI** | 15 tin nhắn gần nhất | Giới hạn token của LLM API (~8K-32K tokens). Gửi quá nhiều history sẽ vượt limit và tốn chi phí. |
| **Hiển thị trên UI**       | Tất cả               | Frontend load toàn bộ từ localStorage                                                            |

### 4. Giới hạn ảnh

| Aspect                 | Giá trị             | Lý do                                                        |
| ---------------------- | ------------------- | ------------------------------------------------------------ |
| **Số ảnh mỗi session** | 1 ảnh active        | Đơn giản hóa context management. Ảnh mới sẽ thay thế ảnh cũ. |
| **Định dạng**          | PNG, JPG, WEBP, GIF | Các format phổ biến được LLM vision hỗ trợ                   |
| **Lưu trữ**            | Base64 trong SQLite | Không cần file system, dễ backup/migrate                     |

### 5. Giới hạn CSV

| Aspect                    | Giá trị        | Lý do                                   |
| ------------------------- | -------------- | --------------------------------------- |
| **Số dòng hiển thị**      | 100 dòng đầu   | Giảm payload gửi cho frontend           |
| **Số dòng trong context** | 1000 dòng      | Giới hạn memory và token khi gửi cho AI |
| **Encoding**              | UTF-8, Latin-1 | Các encoding phổ biến nhất              |

### 6. Model AI

| Model                 | Mục đích             | Hạn chế                 |
| --------------------- | -------------------- | ----------------------- |
| **Llama 4 Scout 17B** | Chat + Vision        | Rate limit của Groq API |
| **Llama 3.3 70B**     | Fallback (text only) | Không hỗ trợ ảnh        |

---

## Cấu trúc Project

```
ii-assignment/
├── frontend/                 # Next.js 16 + React 19
│   ├── app/
│   │   ├── chat/            # Trang chat chính
│   │   ├── components/      # React components
│   │   ├── services/        # API client
│   │   └── types/           # TypeScript types
│   └── package.json
│
├── backend/                  # FastAPI + Python
│   ├── api/routes/          # API endpoints
│   │   ├── chat.py          # Chat streaming
│   │   ├── image.py         # Image upload
│   │   └── csv.py           # CSV processing
│   ├── services/
│   │   ├── llm_service.py   # Groq AI integration
│   │   └── csv_service.py   # CSV parsing
│   ├── database/
│   │   ├── models.py        # SQLAlchemy models
│   │   └── repository.py    # CRUD operations
│   └── requirements.txt
│
└── README.md
```

---

## Hướng dẫn cài đặt

### Yêu cầu

- Node.js 18+
- Python 3.10+
- Groq API Key

### Backend

```bash
cd backend

# Tạo virtual environment
python -m venv venv
venv\Scripts\activate  # Windows
source venv/bin/activate  # Linux/Mac

# Cài đặt dependencies
pip install -r requirements.txt

# Tạo file .env
echo "GROK_API_KEY=your_groq_api_key_here" > .env

# Chạy server
uvicorn main:app --reload --port 8000
```

### Frontend

```bash
cd frontend

# Cài đặt dependencies
npm install

# Chạy development server
npm run dev
```

Truy cập: http://localhost:3000

---

## Tech Stack

**Frontend:**

- Next.js 16
- React 19
- TailwindCSS 4
- react-markdown + remark-math + rehype-katex
- react-syntax-highlighter

**Backend:**

- FastAPI
- SQLAlchemy + SQLite
- Groq API (Llama 4 Scout)
- Pandas (CSV processing)

---

## License

MIT License
