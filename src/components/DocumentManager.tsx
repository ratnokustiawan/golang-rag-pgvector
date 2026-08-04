import React, { useState } from 'react';
import { Upload, FileText, Trash2, Layers, Eye, RefreshCw, CheckCircle2, Sparkles, Sliders, ChevronRight, HardDrive } from 'lucide-react';
import { Document, DocumentChunk } from '../types';

interface DocumentManagerProps {
  documents: Document[];
  tenantId: number;
  loading: boolean;
  onRefresh: () => void;
  onUpload: (title: string, content: string, chunkSize: number, chunkOverlap: number) => Promise<boolean>;
  onDelete: (docId: string) => Promise<boolean>;
}

export const DocumentManager: React.FC<DocumentManagerProps> = ({
  documents,
  tenantId,
  loading,
  onRefresh,
  onUpload,
  onDelete,
}) => {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [chunkSize, setChunkSize] = useState(800);
  const [chunkOverlap, setChunkOverlap] = useState(150);
  const [isUploading, setIsUploading] = useState(false);
  const [selectedDoc, setSelectedDoc] = useState<Document | null>(null);
  const [selectedDocChunks, setSelectedDocChunks] = useState<DocumentChunk[]>([]);
  const [loadingChunks, setLoadingChunks] = useState(false);
  const [dragActive, setDragActive] = useState(false);

  // Quick Seed Sample Data
  const loadSampleDoc = (sampleType: 'refund' | 'rag_guide' | 'warranty') => {
    if (sampleType === 'refund') {
      setTitle('Panduan Kebijakan Refund & Pengembalian Dana E-Commerce');
      setContent(`Syarat dan Ketentuan Pengembalian Dana (Refund Policy):

1. Waktu Pengajuan Refund:
Pelanggan berhak mengajukan pengembalian dana dalam jangka waktu maksimal 7 (tujuh) hari kalender setelah barang diterima berdasarkan bukti resi pengiriman resmi.

2. Kondisi Barang yang Memenuhi Syarat:
- Barang masih dalam kondisi segel utuh dan tidak rusak akibat kelalaian pembeli.
- Kelengkapan produk seperti dus asli, buku panduan, kartu garansi, dan bonus aksesoris wajib dikembalikan secara utuh.
- Produk yang memiliki nomor seri (serial number) wajib cocok dengan data transaksi di database sistem server kami.

3. Alur dan Prosedur Pengembalian Dana:
- Pengguna wajib membuka menu "Pesanan Saya", pilih "Pengajuan Refund", dan unggah foto/video unboxing lengkap.
- Tim Quality Control (QC) akan memverifikasi dokumen dalam 1x24 jam kerja.
- Setelah disetujui, pembeli mengirim barang kembali ke Warehouse Pusat Jakarta.
- Dana akan dikembalikan 100% ke saldo E-Wallet atau Rekening Bank pembeli dalam waktu 2x24 jam kerja setelah barang tiba di warehouse.`);
    } else if (sampleType === 'rag_guide') {
      setTitle('Spesifikasi Arsitektur RAG GoFiber + pgvector + DeepSeek');
      setContent(`Panduan Arsitektur RAG Berbasis GoFiber, GORM, dan DeepSeek V4 Pro:

Arsitektur RAG (Retrieval-Augmented Generation) ini menggunakan stack performa tinggi:
1. Backend API Layer:
Dikembangkan menggunakan Golang v1.22+ dan GoFiber v2 web framework. Menghasilkan latency response bawah 10ms untuk routing dan middleware CORS/Logrus.

2. Database & Vector Storage Layer:
Database PostgreSQL dengan ekstensi pgvector. Pengolahan query database menggunakan GORM ORM untuk pemetaan struct Document dan DocumentChunk. Indexing menggunakan tipe HNSW (Hierarchical Navigable Small World) dengan fungsi jarak vector_cosine_ops (<=>).

3. Model Embedding:
Menggunakan BAEI/bge-m3 dense vector embedding dengan dimensi 1024-d. Setiap chunk teks dipotong berukuran 500-1000 karakter dengan overlap 150 karakter untuk menjaga keutuhan konteks naratif.

4. LLM & Reasoning Layer:
Mengintegrasikan model DeepSeek V4 Pro / DeepSeek Reasoner untuk menyelesaikan tugas tanya jawab kontekstual berdasarkan prompt terstruktur.`);
    } else {
      setTitle('Ketentuan Garansi Resmi & Klaim Perbaikan Hardware');
      setContent(`Ketentuan Garansi Resmi Hardware dan Elektronik:

1. Cakupan Garansi:
Garansi berlaku selama 12 bulan sejak tanggal pembelian untuk kerusakan pabrikan (factory defects) seperti mati total, cacat layar, atau kegagalan motherboard.

2. Pengecualian Garansi (Void Warranty):
Garansi tidak berlaku apabila:
- Kerusakan disebabkan oleh cairan (water damage), jatuh, benturan, atau lonjakan arus listrik.
- Segel garansi pada unit perangkat telah rusak atau pernah dibuka oleh pihak selain Service Center Resmi.
- Perangkat telah di-root, dicustom firmware, atau dimodifikasi tanpa izin pabrik.

3. Prosedur Klaim Garansi:
Bawa unit perangkat beserta nota pembelian dan kartu garansi ke Service Center terdekat. Waktu perbaikan standar adalah 3 hingga 5 hari kerja.`);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setTitle(file.name);
      const reader = new FileReader();
      reader.onload = (event) => {
        setContent(event.target?.result as string || '');
      };
      reader.readAsText(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim()) return;

    setIsUploading(true);
    const success = await onUpload(title, content, chunkSize, chunkOverlap);
    setIsUploading(false);

    if (success) {
      setTitle('');
      setContent('');
    }
  };

  const handleViewChunks = async (doc: Document) => {
    setSelectedDoc(doc);
    setLoadingChunks(true);
    try {
      const res = await fetch(`/api/documents/${doc.doc_id}`);
      if (res.ok) {
        const data = await res.json();
        setSelectedDocChunks(data.chunks || []);
      }
    } catch (err) {
      console.error('Failed to load chunks:', err);
    } finally {
      setLoadingChunks(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner Info */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-900 to-cyan-950/40 p-5 rounded-2xl border border-slate-800 shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center space-x-4">
          <div className="p-3.5 bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 rounded-2xl">
            <HardDrive className="w-8 h-8" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              Manajemen Dokumen & Chunking Engine
            </h2>
            <p className="text-xs text-slate-400 mt-1">
              Dokumen dipotong otomatis (500-1000 char, overlap 150), di-embed ke 1024-d BGE-M3, dan disimpan via GORM GORM ke pgvector.
            </p>
          </div>
        </div>

        {/* Quick Sample Seed Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-semibold text-slate-400">Contoh Dokumen:</span>
          <button
            type="button"
            onClick={() => loadSampleDoc('refund')}
            className="px-3 py-1.5 text-xs font-medium bg-slate-800 hover:bg-slate-700 text-cyan-300 border border-slate-700/80 rounded-lg transition"
          >
            + Kebijakan Refund
          </button>
          <button
            type="button"
            onClick={() => loadSampleDoc('rag_guide')}
            className="px-3 py-1.5 text-xs font-medium bg-slate-800 hover:bg-slate-700 text-blue-300 border border-slate-700/80 rounded-lg transition"
          >
            + RAG GoFiber Doc
          </button>
          <button
            type="button"
            onClick={() => loadSampleDoc('warranty')}
            className="px-3 py-1.5 text-xs font-medium bg-slate-800 hover:bg-slate-700 text-indigo-300 border border-slate-700/80 rounded-lg transition"
          >
            + Garansi Hardware
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Upload Form & Chunk Settings */}
        <div className="lg:col-span-5 bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-5">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Upload className="w-4 h-4 text-cyan-400" />
              Unggah Dokumen Baru
            </h3>
            <span className="text-xs px-2.5 py-1 bg-cyan-500/10 text-cyan-300 rounded-full border border-cyan-500/20">
              Tenant #{tenantId}
            </span>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Judul Dokumen</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="misal: Panduan Layanan Pelanggan 2026"
                className="w-full bg-slate-950 border border-slate-700/80 rounded-xl px-3.5 py-2 text-sm text-slate-100 placeholder-slate-600 focus:outline-none focus:border-cyan-500"
              />
            </div>

            {/* Drag & Drop File Upload zone */}
            <div
              onDragOver={(e) => { e.preventDefault(); setDragActive(true); }}
              onDragLeave={() => setDragActive(false)}
              onDrop={(e) => {
                e.preventDefault();
                setDragActive(false);
                const file = e.dataTransfer.files?.[0];
                if (file) {
                  setTitle(file.name);
                  const reader = new FileReader();
                  reader.onload = (ev) => setContent(ev.target?.result as string || '');
                  reader.readAsText(file);
                }
              }}
              className={`border-2 border-dashed rounded-xl p-4 text-center cursor-pointer transition ${
                dragActive ? 'border-cyan-400 bg-cyan-500/10' : 'border-slate-700/70 bg-slate-950/50 hover:bg-slate-950'
              }`}
            >
              <input type="file" onChange={handleFileUpload} accept=".txt,.md,.json,.csv" className="hidden" id="file-input" />
              <label htmlFor="file-input" className="cursor-pointer flex flex-col items-center justify-center space-y-1">
                <FileText className="w-6 h-6 text-slate-400" />
                <span className="text-xs text-slate-300 font-medium">
                  Tarik file ke sini atau <span className="text-cyan-400 underline">pilih file</span> (.txt, .md, .json)
                </span>
              </label>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Isi / Konten Dokumen</label>
              <textarea
                rows={7}
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="Tempelkan isi dokumen teks di sini..."
                className="w-full bg-slate-950 border border-slate-700/80 rounded-xl p-3.5 text-xs text-slate-200 placeholder-slate-600 focus:outline-none focus:border-cyan-500 font-mono leading-relaxed resize-none"
              />
            </div>

            {/* Chunking Settings Sliders */}
            <div className="bg-slate-950/80 rounded-xl p-4 border border-slate-800 space-y-3">
              <div className="flex items-center justify-between text-xs font-semibold text-slate-300">
                <span className="flex items-center gap-1.5">
                  <Sliders className="w-3.5 h-3.5 text-cyan-400" />
                  Parameter Chunking Engine
                </span>
                <span className="text-slate-500">BGE-M3 Specs</span>
              </div>

              <div className="space-y-1">
                <div className="flex justify-between text-xs text-slate-400">
                  <span>Ukuran Chunk (Characters):</span>
                  <span className="text-cyan-300 font-bold">{chunkSize} char</span>
                </div>
                <input
                  type="range"
                  min={300}
                  max={1500}
                  step={50}
                  value={chunkSize}
                  onChange={(e) => setChunkSize(Number(e.target.value))}
                  className="w-full accent-cyan-500 cursor-pointer"
                />
              </div>

              <div className="space-y-1">
                <div className="flex justify-between text-xs text-slate-400">
                  <span>Overlap Chunk:</span>
                  <span className="text-blue-300 font-bold">{chunkOverlap} char</span>
                </div>
                <input
                  type="range"
                  min={50}
                  max={400}
                  step={25}
                  value={chunkOverlap}
                  onChange={(e) => setChunkOverlap(Number(e.target.value))}
                  className="w-full accent-blue-500 cursor-pointer"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isUploading || !content.trim()}
              className="w-full py-3 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-bold text-sm rounded-xl shadow-lg shadow-cyan-600/20 disabled:opacity-50 transition flex items-center justify-center space-x-2"
            >
              {isUploading ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Memproses Chunking & BGE-M3 Embedding...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  <span>Proses & Simpan ke pgvector</span>
                </>
              )}
            </button>
          </form>
        </div>

        {/* Right Column: Uploaded Documents Table */}
        <div className="lg:col-span-7 bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Layers className="w-4 h-4 text-cyan-400" />
                Daftar Dokumen Terdaftar (GORM DB)
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">Filter Tenant #{tenantId} • Total: {documents.length} Dokumen</p>
            </div>

            <button
              onClick={onRefresh}
              disabled={loading}
              className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg border border-slate-700 transition"
              title="Refresh Data"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>

          {documents.length === 0 ? (
            <div className="text-center py-12 bg-slate-950/40 rounded-2xl border border-slate-800/80">
              <FileText className="w-12 h-12 text-slate-600 mx-auto mb-3" />
              <h4 className="text-sm font-semibold text-slate-300">Belum Ada Dokumen di Tenant #{tenantId}</h4>
              <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1 mb-4">
                Gunakan formulir di sebelah kiri atau tombol contoh di atas untuk mengunggah dokumen pertama Anda.
              </p>
            </div>
          ) : (
            <div className="space-y-3 max-h-[550px] overflow-y-auto pr-1">
              {documents.map((doc) => (
                <div
                  key={doc.id}
                  className="bg-slate-950/80 border border-slate-800/90 rounded-xl p-4 hover:border-slate-700 transition space-y-3"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-1">
                      <div className="flex items-center space-x-2">
                        <span className="text-xs font-mono px-2 py-0.5 bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 rounded">
                          {doc.doc_id}
                        </span>
                        <h4 className="text-sm font-bold text-slate-100">{doc.title}</h4>
                      </div>
                      <div className="flex items-center space-x-3 text-xs text-slate-400">
                        <span>Chunks: <strong className="text-cyan-300">{doc.total_chunks}</strong></span>
                        <span>•</span>
                        <span>Est. Tokens: <strong className="text-blue-300">{doc.total_tokens}</strong></span>
                        <span>•</span>
                        <span>Tenant #{doc.tenant_id}</span>
                      </div>
                    </div>

                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => handleViewChunks(doc)}
                        className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-cyan-300 rounded-lg text-xs font-semibold border border-slate-700 flex items-center gap-1 transition"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>Lihat Chunk</span>
                      </button>

                      <button
                        onClick={() => onDelete(doc.doc_id)}
                        className="p-1.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 rounded-lg border border-rose-500/20 transition"
                        title="Hapus Dokumen"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Chunk Detail Inspector Modal */}
      {selectedDoc && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fadeIn">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-3xl w-full p-6 shadow-2xl max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between pb-4 border-b border-slate-800">
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <FileText className="w-5 h-5 text-cyan-400" />
                  Inspektor Chunk Vector: {selectedDoc.title}
                </h3>
                <p className="text-xs text-slate-400 font-mono mt-0.5">
                  ID: {selectedDoc.doc_id} • Total {selectedDocChunks.length} Chunk (BGE-M3 1024-d)
                </p>
              </div>
              <button
                onClick={() => setSelectedDoc(null)}
                className="text-slate-400 hover:text-white px-3 py-1 bg-slate-800 rounded-lg text-xs"
              >
                Tutup
              </button>
            </div>

            <div className="flex-1 overflow-y-auto py-4 space-y-3">
              {loadingChunks ? (
                <div className="py-12 text-center text-slate-400 text-xs">Mengambil data chunk dari GORM...</div>
              ) : selectedDocChunks.length === 0 ? (
                <div className="py-12 text-center text-slate-400 text-xs">Tidak ada chunk ditemukan.</div>
              ) : (
                selectedDocChunks.map((chunk) => (
                  <div key={chunk.id} className="bg-slate-950 border border-slate-800 rounded-xl p-4 space-y-2">
                    <div className="flex items-center justify-between text-xs font-semibold text-cyan-400">
                      <span>Chunk #{chunk.chunk_index}</span>
                      <span className="text-slate-500">Vector Status: 1024-d Float32 Ready</span>
                    </div>
                    <p className="text-xs text-slate-200 leading-relaxed font-sans bg-slate-900/60 p-3 rounded-lg border border-slate-800/60">
                      {chunk.content}
                    </p>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
