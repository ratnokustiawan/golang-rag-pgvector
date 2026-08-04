# Panduan Menjalankan Proyek FiberGopher RAG

Proyek ini menggunakan arsitektur **Full-Stack Hybrid**:
- **Frontend & Proxy Server**: Node.js + Express + Vite (Port 3000)
- **Backend High-Performance**: Go + GoFiber + GORM + Vector Engine / RAG (Port 8081)

---

## 📋 Prasyarat (Prerequisites)

Sebelum menjalankan proyek ini, pastikan sistem Anda sudah terinstal:
- **Node.js**: v18 atau lebih baru (direkomendasikan v20+)
- **Go**: v1.22 atau lebih baru
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

Isi variabel lingkungan yang diperlukan:
```env
GEMINI_API_KEY="sk-..." # Opsional: Kunci API Google Gemini untuk fungsionalidad RAG / Embedding AI
APP_URL="http://localhost:3000"
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
