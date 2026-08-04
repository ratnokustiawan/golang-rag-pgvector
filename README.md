# Panduan Menjalankan Proyek FiberGopher RAG

Proyek ini menggunakan arsitektur **Full-Stack Hybrid**:
- **Frontend & Proxy Server**: Node.js + Express + Vite (Port 3000)
- **Backend High-Performance**: Go + GoFiber + GORM + Vector Engine / RAG (Port 8081)

---

## 📋 Prasyarat (Prerequisites)

Sebelum menjalankan proyek ini, pastikan sistem Anda sudah terinstal:
- **Node.js**: v18 atau lebih baru (direkomendasikan v20+)
- **Go**: v1.26 atau lebih baru
- **npm** atau **bun** / **yarn**

---

## 🐳 1. Jalankan dengan Docker Compose (Paling Mudah)

Cukup satu perintah untuk melakukan *multi-stage build* dan menjalankan seluruh aplikasi beserta backend GoFiber di dalam container:

```bash
# 1. Pastikan file .env sudah dikonfigurasi (opsional)
cp .env.example .env

# 2. Jalankan dengan Docker Compose
docker compose up --build
```

Aplikasi akan langsung dapat diakses di **`http://localhost:3000`**.

Untuk menghentikan container:
```bash
docker compose down
```

---

## ⚙️ 2. Konfigurasi Environment Variables

Buat file `.env` di root direktori dengan menyalin dari `.env.example`:

```bash
cp .env.example .env
```

Berikut adalah daftar seluruh variabel lingkungan (Environment Variables) yang dapat dikonfigurasi:

| Nama Variable | Default Value | Keterangan / Deskripsi |
| :--- | :--- | :--- |
| `SERVER_HOST` / `HOST` | `0.0.0.0` | Host tempat server Node.js / Express mendengarkan |
| `SERVER_PORT` / `PORT` | `3000` | Port utama server Node.js / Express |
| `GO_PORT` | `8081` | Port internal untuk server backend GoFiber |
| `GO_BACKEND_TARGET` | `http://127.0.0.1:8081` | Target URL proxy Node.js ke Go backend |
| `SKIP_GO_SPAWN` | `false` | Set `true` jika backend Go dijalankan secara manual |
| `APP_URL` | `http://localhost:3000` | URL publik aplikasi |
| `GEMINI_API_KEY` | `""` | Kunci API Google Gemini untuk sintesis teks AI & RAG (opsional) |
| `DEEPSEEK_API_KEY` | `""` | Kunci API DeepSeek sebagai alternatif provider LLM/RAG (opsional) |

Contoh isi `.env`:
```env
SERVER_HOST="0.0.0.0"
PORT=3000
GO_PORT=8081
GO_BACKEND_TARGET="http://127.0.0.1:8081"
SKIP_GO_SPAWN="false"
APP_URL="http://localhost:3000"
GEMINI_API_KEY="sk-..."
DEEPSEEK_API_KEY=""
```

---

## 🚀 2. Cara Menjalankan dalam Mode Pengembangan (Development Mode)

Proyek ini dirancang agar server Node (`server.ts`) secara otomatis mengompilasi dan menjalankan backend **GoFiber** di latar belakang.

### Langkah-langkah:

1. **Install Dependensi Node.js**:
   ```bash
   npm install
   ```

2. **Jalankan Server Pengembang (Dev Mode)**:
   ```bash
   npm run dev
   ```

   *Secara otomatis:*
   - Server Node.js akan berjalan di **`http://localhost:3000`**
   - Script akan mengompilasi dan mengaktifkan backend Go pada port **`8081`**
   - Request API (`/api/*`) dari browser akan di-proxy langsung ke backend GoFiber.

---

## 🛠️ 3. Cara Menjalankan Secara Terpisah (Opsional)

Jika Anda ingin menjalankan backend Go dan frontend Node secara manual/terpisah:

### A. Menjalankan Backend Go Engine
```bash
cd go_backend
GO_PORT=8081 go run .
```
*(Backend akan berjalan di `http://localhost:8081`)*

### B. Menjalankan Frontend & Proxy Node
Di terminal terpisah (di root direktori):
```bash
npm run dev
```

---

## 🏗️ 4. Build & Jalankan untuk Mode Produksi (Production Mode)

1. **Build Seluruh Proyek**:
   ```bash
   npm run build
   ```
   *Proses ini akan mengompilasi binary Go (`go_backend/server_go`) serta membundle frontend Vite dan server Node ke dalam folder `dist/`.*

2. **Jalankan Aplikasi Production**:
   ```bash
   npm run start
   ```
   Buka `http://localhost:3000` di browser Anda.

---

## 📊 Ringkasan Endpoint Utama (API)

- `GET /api/health` - Healthcheck server Go & status sistem.
- `GET /api/documents` - Mengambil daftar dokumen terindeks.
- `POST /api/documents` - Mengunggah & melakukan chunking/embedding dokumen.
- `POST /api/rag/chat` - Mengirim query RAG dengan konteks vektor dokumen.
- `GET /api/schema` - Informasi skema basis data & konfigurasi embedding.
