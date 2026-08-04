import React, { useState } from 'react';
import { Search, Sliders, Database, Cpu, CheckCircle2, Zap, ArrowUpRight, BarChart3 } from 'lucide-react';
import { SearchResult } from '../types';

interface VectorSearchSimulatorProps {
  tenantId: number;
  apiKey: string;
}

export const VectorSearchSimulator: React.FC<VectorSearchSimulatorProps> = ({
  tenantId,
  apiKey,
}) => {
  const [query, setQuery] = useState('pengembalian dana barang rusak');
  const [topK, setTopK] = useState(5);
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<SearchResult[] | null>(null);
  const [executionTime, setExecutionTime] = useState<number | null>(null);
  const [candidatesTested, setCandidatesTested] = useState<number>(0);

  const handleSearch = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!query.trim() || loading) return;

    setLoading(true);
    try {
      const res = await fetch('/api/search', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          tenant_id: tenantId,
          query: query,
          top_k: topK,
          api_key: apiKey,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setResults(data.results || []);
        setExecutionTime(data.execution_time_ms || 0);
        setCandidatesTested(data.candidates_tested || 0);
      }
    } catch (err) {
      console.error('Vector search error:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Title Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-900 to-indigo-950/40 p-5 rounded-2xl border border-slate-800 shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center space-x-4">
          <div className="p-3.5 bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 rounded-2xl">
            <Search className="w-8 h-8" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              Simulator Vector Similarity Search (1024-d BGE-M3)
            </h2>
            <p className="text-xs text-slate-400 mt-1">
              Uji langsung query jarak kosinus (Cosine Distance <code className="text-cyan-300 font-mono">&lt;=&gt;</code>) pada database GORM pgvector.
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-3 text-xs">
          <div className="px-3 py-1.5 bg-slate-950 rounded-xl border border-slate-800 text-slate-300">
            Tenant Active: <strong className="text-cyan-400">#{tenantId}</strong>
          </div>
          <div className="px-3 py-1.5 bg-slate-950 rounded-xl border border-slate-800 text-slate-300">
            Metrik: <strong className="text-emerald-400">Cosine Distance (&lt;=&gt;)</strong>
          </div>
        </div>
      </div>

      {/* Query Search Form */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
        <form onSubmit={handleSearch} className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="w-5 h-5 text-slate-500 absolute left-4 top-3.5" />
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Masukkan kata kunci atau pertanyaan pencarian vector..."
                className="w-full bg-slate-950 border border-slate-700/80 rounded-xl pl-12 pr-4 py-3 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-cyan-500"
              />
            </div>

            <div className="flex items-center space-x-2">
              <div className="flex items-center space-x-1.5 bg-slate-950 px-3 py-3 rounded-xl border border-slate-700/80 text-xs text-slate-300">
                <span>Top-K:</span>
                <select
                  value={topK}
                  onChange={(e) => setTopK(Number(e.target.value))}
                  className="bg-transparent text-cyan-400 font-bold focus:outline-none cursor-pointer"
                >
                  {[3, 5, 8, 10, 15].map((k) => (
                    <option key={k} value={k} className="bg-slate-900">{k}</option>
                  ))}
                </select>
              </div>

              <button
                type="submit"
                disabled={loading || !query.trim()}
                className="px-6 py-3 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-bold text-sm rounded-xl shadow-lg shadow-cyan-600/20 disabled:opacity-50 transition flex items-center space-x-2 shrink-0"
              >
                {loading ? (
                  <span>Menghitung Embedding...</span>
                ) : (
                  <>
                    <Zap className="w-4 h-4" />
                    <span>Cari Similarity</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </form>
      </div>

      {/* Results Section */}
      {results && (
        <div className="space-y-4">
          {/* Metrics summary */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex items-center justify-between">
              <div>
                <p className="text-xs text-slate-400">Total Chunk Diuji</p>
                <p className="text-xl font-bold text-slate-100 mt-1">{candidatesTested} Chunk</p>
              </div>
              <Database className="w-8 h-8 text-cyan-400 opacity-80" />
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex items-center justify-between">
              <div>
                <p className="text-xs text-slate-400">Waktu Eksekusi GoFiber</p>
                <p className="text-xl font-bold text-emerald-400 mt-1">{executionTime} ms</p>
              </div>
              <Zap className="w-8 h-8 text-emerald-400 opacity-80" />
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex items-center justify-between">
              <div>
                <p className="text-xs text-slate-400">Top-K Terpilih</p>
                <p className="text-xl font-bold text-blue-400 mt-1">{results.length} Chunk</p>
              </div>
              <BarChart3 className="w-8 h-8 text-blue-400 opacity-80" />
            </div>
          </div>

          {/* Results List */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
            <h3 className="text-base font-bold text-white border-b border-slate-800 pb-3 flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-emerald-400" />
              Hasil Retrieval Vector Sesuai Peringkat Similarity
            </h3>

            {results.length === 0 ? (
              <p className="text-xs text-slate-400 py-6 text-center">Tidak ada vector chunk yang cocok.</p>
            ) : (
              <div className="space-y-4">
                {results.map((res, idx) => (
                  <div key={idx} className="bg-slate-950 border border-slate-800 rounded-xl p-4 space-y-3">
                    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800/80 pb-2">
                      <div className="flex items-center space-x-2">
                        <span className="w-6 h-6 rounded-full bg-cyan-500/20 text-cyan-300 font-bold text-xs flex items-center justify-center">
                          {idx + 1}
                        </span>
                        <h4 className="text-sm font-bold text-slate-100">{res.chunk.title}</h4>
                        <span className="text-xs font-mono text-slate-500">(Chunk #{res.chunk.chunk_index})</span>
                      </div>

                      <div className="flex items-center space-x-3 text-xs">
                        <span className="text-slate-400">
                          Similarity: <strong className="text-cyan-400 font-bold">{(res.similarity * 100).toFixed(1)}%</strong>
                        </span>
                        <span className="text-slate-400">
                          Cosine Distance: <strong className="text-emerald-400 font-bold">{res.cosine_distance.toFixed(4)}</strong>
                        </span>
                      </div>
                    </div>

                    {/* Progress bar meter */}
                    <div className="w-full bg-slate-900 h-2 rounded-full overflow-hidden">
                      <div
                        className="bg-gradient-to-r from-cyan-500 to-emerald-400 h-full transition-all duration-500"
                        style={{ width: `${Math.max(10, Math.min(100, res.similarity * 100))}%` }}
                      />
                    </div>

                    <p className="text-xs text-slate-200 leading-relaxed font-sans bg-slate-900/60 p-3 rounded-lg border border-slate-800/60">
                      {res.chunk.content}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
