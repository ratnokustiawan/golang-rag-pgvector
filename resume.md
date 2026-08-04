# Resume Proyek: FiberGopher RAG

## 📌 Identitas Proyek

- **Nama**: FiberGopher RAG Engine (GoFiber + DeepSeek/Gemini)
- **Tipe**: Hybrid Full-Stack RAG (Retrieval-Augmented Generation) System
- **Bundle ID (Google AI Studio)**: `RAG GoFiber DeepSeek App`
- **Tagline**: *Golang + GoFiber + GORM + Logrus + Vector Engine*

## 🏗️ Arsitektur (3-Tier)

```
┌────────────────────────────────────────────────────────────────┐
│  BROWSER (React 19 SPA)                                        │
│   - Chat Playground │ Document Manager │ Vector Search Sim     │
│   - Architecture Inspector │ API Key Modal                     │
└───────────────────────────┬────────────────────────────────────┘
                            │ HTTP :3000
┌───────────────────────────▼────────────────────────────────────┐
│  NODE.JS LAYER (server.ts)                                     │
│   - Express + Vite middleware (dev mode HMR)                   │
│   - http-proxy-middleware → /api/* ke GoFiber                  │
│   - Spawn/compile backend Go otomatis                          │
└───────────────────────────┬────────────────────────────────────┘
                            │ HTTP :8081
┌───────────────────────────▼────────────────────────────────────┐
│  GO LAYER (GoFiber v2 + GORM + Logrus)                         │
│   - Handlers: Document │ Search │ Chat │ System                │
│   - Services: Chunker │ Embedder │ RAG                         │
│   - Vector math: cosine similarity/distance (1024-d)           │
└───────────────────────────┬────────────────────────────────────┘
                            │ pgx + pgvector
┌───────────────────────────▼────────────────────────────────────┐
│  DATA LAYER (PostgreSQL 16 + pgvector)                         │
│   - documents │ document_chunks (vector(1024))                 │
│   - HNSW index (vector_cosine_ops)                             │
└────────────────────────────────────────────────────────────────┘
```

## 🔧 Tech Stack

### Backend (Go)
| Komponen | Versi | Fungsi |
|---|---|---|
| Go | 1.26 | Bahasa |
| GoFiber | v2.52.14 | HTTP framework (fasthttp) |
| GORM | v1.31.2 | ORM |
| Logrus | v1.9.4 | Structured logging |
| postgres driver | v1.5.11 | pgx + pgvector |
| glebarez/sqlite | v1.11.0 | Fallback driver (no CGO) |

### Frontend & Proxy (Node.js)
| Komponen | Fungsi |
|---|---|
| Express 4 | HTTP server + proxy host |
| Vite 6 | Dev server (HMR) + build |
| React 19 | UI |
| TypeScript 5.8 | Type safety |
| http-proxy-middleware | `/api/*` → `:8081` |
| Tailwind 4 | Styling |
| Motion + lucide-react | Animasi & ikon |

### Infra
- **PostgreSQL 16 + pgvector** (image `pgvector/pgvector:pg16`)
- **Docker Compose** 3-service orchestration

## �️ Struktur Direktori

```
golang-rag-pgvector/
├── go_backend/                  # GoFiber RAG engine
│   ├── main.go                  # bootstrap, routes, middleware
│   ├── database/database.go     # GORM init (postgres/sqlite switch)
│   ├── models/document.go       # Document & DocumentChunk structs
│   ├── services/
│   │   ├── chunker.go           # paragraph + sliding-window chunking
│   │   ├── embedder.go          # BGE-M3 deterministic + OpenAI fallback
│   │   └── rag.go               # DeepSeek/Gemini caller + synthesis fallback
│   ├── handlers/
│   │   ├── document_handler.go  # CRUD dokumen + chunk embedding
│   │   ├── search_handler.go    # cosine top-K retrieval
│   │   ├── chat_handler.go      # RAG pipeline orchestrator
│   │   └── system_handler.go    # health + SQL DDL info
│   ├── go.mod / go.sum
│   └── Dockerfile               # multi-stage golang:1.26-alpine
├── src/                         # React SPA
│   ├── App.tsx                  # 4-tab router + state
│   ├── components/
│   │   ├── Navbar.tsx
│   │   ├── DocumentManager.tsx  # upload, list, delete, chunk preview
│   │   ├── RAGChatPlayground.tsx# chat + prompt inspector
│   │   ├── VectorSearchSimulator.tsx
│   │   ├── ArchitectureInspector.tsx
│   │   └── ApiKeyModal.tsx
│   ├── types.ts                 # shared TS contracts
│   └── main.tsx / index.css
├── server.ts                    # Node entry: build Go + spawn + Vite + proxy
├── vite.config.ts               # Tailwind + React plugins
├── docker-compose.yml           # database + backend + frontend
├── .env.example                 # semua env var
├── Dockerfile                   # frontend image (multi-stage Vite + esbuild)
├── package.json
├── metadata.json                # Google AI Studio metadata
├── index.html
└── README.md
```

## 🧠 Pipeline RAG (Alur Inti)

### 1. Ingestion (Upload)
1. Client `POST /api/upload` (JSON atau multipart `file`)
2. `DocumentHandler.UploadDocument`:
   - Generate `docID` (8-byte hex → `doc_xxxxxxxx`)
   - Default tenant `1`, default title fallback timestamp
   - **Chunking** (`services.ChunkText`): split paragraf (`\n\n`), fallback sliding window jika paragraf > `chunkSize`
   - Default config: `ChunkSize=800`, `ChunkOverlap=150`
   - Token estimasi: `max(words, chars/4)`
   - Simpan master `Document` + per-chunk `DocumentChunk` (embedding = JSON array string)
3. Embedding per-chunk: `GenerateEmbedding(chunk, apiKey)`
   - Prioritas 1: remote OpenAI `text-embedding-3-large` (jika API key `sk-*` / `AIza*`)
   - Prioritas 2: **deterministic BGE-M3-style**: FNV-1a hash unigram/bigram/trigram → 1024-d dense vector → normalize L2
4. Persist dengan GORM `AutoMigrate`

### 2. Retrieval (Search / Chat)
1. `SearchHandler.SearchVectors` (`POST /api/search`) atau `ChatHandler.HandleRAGChat` (`POST /api/chat`)
2. Embed query → 1024-d vector
3. Load semua `DocumentChunk` filter `tenant_id` (dan opsional `doc_id IN ?`)
4. Loop cosine similarity/distance di Go (`services.CosineSimilarity` & `CosineDistance`)
5. Sort ascending by distance, slice Top-K (default 5, max 20)

### 3. Generation (Chat only)
1. `RAGService.ExecuteRAG`:
   - Build prompt: `Jawablah hanya berdasarkan context berikut. Context: [1] Title (Sim X%) Content ... \n\n Pertanyaan: ...`
   - Pilih provider berdasar prefix key: `sk-*`/`deepseek*` → DeepSeek, `AIza*`/`gemini*` → Gemini
   - **Fallback synthesizer** (`synthesizeAnswerFromContext`): format markdown dari chunk similarity ≥ 0.20 jika API gagal/tidak ada key
2. Return `{answer, retrieved_context, prompt_used, model_used, execution_time_ms, total_tokens}`

## 🔌 API Endpoints

| Method | Path | Handler | Kegunaan |
|---|---|---|---|
| GET | `/api/health` | `SystemHandler.GetSystemInfo` | status + metrics + runtime info |
| GET | `/api/schema` | `SystemHandler.GetSQLSchema` | dump SQL DDL + GORM model |
| POST | `/api/upload` | `DocumentHandler.UploadDocument` | ingest dokumen (JSON atau file) |
| GET | `/api/documents` | `DocumentHandler.ListDocuments` | list + filter tenant/search |
| GET | `/api/documents/:doc_id` | `DocumentHandler.GetDocument` | detail + chunks |
| DELETE | `/api/documents/:doc_id` | `DocumentHandler.DeleteDocument` | hapus master + chunks |
| POST | `/api/search` | `SearchHandler.SearchVectors` | vector-only Top-K |
| POST | `/api/chat` | `ChatHandler.HandleRAGChat` | RAG retrieval + LLM synthesis |

## 🗃️ Skema Data

```sql
CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE documents (
  id BIGSERIAL PRIMARY KEY,
  doc_id VARCHAR(64),
  tenant_id BIGINT,
  title TEXT,
  file_name VARCHAR(255),
  file_type VARCHAR(50),
  total_chunks INT,
  total_tokens INT,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
);
CREATE INDEX idx_documents_tenant_doc ON documents (tenant_id, doc_id);

CREATE TABLE document_chunks (
  id BIGSERIAL PRIMARY KEY,
  doc_id VARCHAR(64),
  tenant_id BIGINT,
  title TEXT,
  chunk_index INT,
  content TEXT,
  embedding vector(1024),     -- pgvector
  tokens INT,
  created_at TIMESTAMPTZ
);
CREATE INDEX idx_document_chunks_embedding
  ON document_chunks USING hnsw (embedding vector_cosine_ops);
```

Catatan: aktual GORM menyimpan `Embedding` sebagai `text` (JSON array string) — vector math dilakukan di aplikasi Go, bukan di SQL. SQL DDL di `system_handler` hanya representasi/documentation.

## 🔁 Middleware & Konfigurasi Backend

- **Recover** → panic safety
- **CORS** → AllowOrigins `*`, header kustom `X-Tenant-ID` & `X-API-Key`
- **Logger** → format `${time} ${status} - ${latency} ${method} ${path}`
- **BodyLimit**: 50 MB
- **Read/Write Timeout**: 60s
- **Port**: `GO_PORT` (default 8081)

## 🔁 Middleware Node.js

- Auto-build Go binary (`go build -o server_go .`) jika belum ada
- Auto-spawn Go process dengan env `GO_PORT=8081`
- Proxy `/api/*` → `GO_BACKEND_TARGET` (default `http://127.0.0.1:8081`)
- Proxy error → response 503 `{error: "GoFiber Backend Services initializing..."}`
- Mode dev: Vite middleware (`middlewareMode: true`)
- Mode prod: `express.static(dist)` + SPA fallback ke `dist/index.html`

## 🌐 Multi-Tenancy

- Field `tenant_id` (uint64) pada `Document` & `DocumentChunk`
- Default tenant `1` bila tidak dikirim
- Semua query filter `WHERE tenant_id = ?`
- Frontend expose switcher tenant di `Navbar`

## � Konfigurasi Environment

```
SERVER_HOST / HOST          # Node bind
SERVER_PORT / PORT          # 3000
GO_PORT                     # 8081
GO_BACKEND_TARGET           # http://127.0.0.1:8081
SKIP_GO_SPAWN               # true di mode Docker (Go di-container terpisah)
APP_URL                     # http://localhost:3000
DB_DRIVER                   # postgres | sqlite (kosong)
POSTGRES_HOST/PORT/USER/PASSWORD/DB/SSLMODE
DATABASE_URL                # override DSN (cloud)
GEMINI_API_KEY              # opsional
DEEPSEEK_API_KEY            # opsional
```

## 🚀 Mode Eksekusi

| Mode | Perintah | Yang Terjadi |
|---|---|---|
| **Dev (full lokal)** | `npm install && npm run dev` | tsx jalanin `server.ts` → compile & spawn Go → Vite HMR aktif |
| **Prod build** | `npm run build` | build `go_backend/server_go`, `vite build`, bundle `server.ts` ke `dist/server.cjs` |
| **Prod run** | `npm run start` | `node dist/server.cjs` serving `dist/` static + proxy |
| **Docker 3-tier** | `docker compose up --build` | db :5432, backend :8081, frontend :3000 (SKIP_GO_SPAWN=true) |
| **Go manual** | `cd go_backend && go run .` | standalone |
| **Lint** | `npm run lint` | `tsc --noEmit` |

## 🎨 Frontend UX (4 Tab)

1. **Chat** (`RAGChatPlayground`) — bubble chat, sample questions, model picker (`deepseek-chat` default), Top-K slider, prompt inspector collapsible, retrieved-context expander
2. **Docs** (`DocumentManager`) — list per-tenant, upload form (chunk size + overlap), chunk preview, delete confirmation
3. **Search** (`VectorSearchSimulator`) — raw vector-only retrieval
4. **Architecture** (`ArchitectureInspector`) — stack detail + SQL DDL viewer

- API key disimpan di `localStorage` (`rag_deepseek_api_key`)
- `ApiKeyModal` untuk input/edit key

## ⚠️ Catatan & Insight Kritis

1. **Embedding storage mismatch**: kode GORM pakai `Embedding string` (`text`), tapi DDL di system handler pakai `vector(1024)`. Saat ini vector math dilakukan di Go. Untuk pakai HNSW pgvector native, perlu migrasi tipe.
2. **Fallback embedding deterministik** (BGE-M3-style hash): berkualitas rendah, hanya untuk demo offline. Real RAG butuh API key.
3. **Tenant isolation**: hanya filter SQL sederhana, tidak ada auth/JWT. Asumsi backend trusted-network.
4. **API key handling**: dikirim dari frontend ke backend lewat query body — tidak ideal untuk produksi (butuh server-side secrets).
5. **`seedSampleDocumentsIfEmpty`** di `main.go` masih stub kosong (TODO).
6. **CORS `AllowOrigins: "*"`** — longgar, tidak untuk produksi.
7. **Binary `server_go`** ter-commit di repo (3.5 MB) — sebaiknya `.gitignore` dan hanya build saat runtime/CI.

## 📊 Ringkasan Satu Baris

> **FiberGopher RAG** = React 19 SPA + Node/Express proxy + GoFiber v2 REST engine + GORM ORM + PostgreSQL 16 + pgvector (1024-d cosine) + DeepSeek/Gemini LLM synthesis + Docker Compose 3-service, dengan pipeline upload → chunk → embed → cosine top-K → prompt-build → LLM-call (fallback deterministic synthesis).
