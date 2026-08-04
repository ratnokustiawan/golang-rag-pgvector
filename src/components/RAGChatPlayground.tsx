import React, { useState, useRef, useEffect } from 'react';
import { Send, Bot, User, Sparkles, Sliders, ChevronDown, ChevronRight, FileText, Code2, AlertCircle, RefreshCw, BookOpen, Key, Check } from 'lucide-react';
import { ChatMessage, SearchResult } from '../types';

interface RAGChatPlaygroundProps {
  tenantId: number;
  apiKey: string;
  onOpenApiKeyModal: () => void;
}

export const RAGChatPlayground: React.FC<RAGChatPlaygroundProps> = ({
  tenantId,
  apiKey,
  onOpenApiKeyModal,
}) => {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome-1',
      sender: 'assistant',
      text: 'Halo! Saya adalah Asisten AI RAG berbasis **Golang GoFiber + GORM + DeepSeek V4 Pro**. Silakan ajukan pertanyaan terkait dokumen yang sudah diunggah di Tenant #' + tenantId + '.',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    },
  ]);
  const [inputQuestion, setInputQuestion] = useState('');
  const [loading, setLoading] = useState(false);
  const [selectedModel, setSelectedModel] = useState('deepseek-chat');
  const [topK, setTopK] = useState(4);
  const [expandedContextId, setExpandedContextId] = useState<string | null>(null);
  const [showPromptInspector, setShowPromptInspector] = useState<string | null>(null);

  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  const sampleQuestions = [
    'Apa syarat dan jangka waktu pengajuan refund?',
    'Bagaimana arsitektur RAG GoFiber dan pgvector bekerja?',
    'Apa saja penyebab klaim garansi hardware menjadi void?',
    'Berapa dimensi embedding BGE-M3 yang digunakan?',
  ];

  const handleSend = async (questionText?: string) => {
    const q = questionText || inputQuestion.trim();
    if (!q || loading) return;

    const userMsgId = 'usr_' + Date.now();
    const userMsg: ChatMessage = {
      id: userMsgId,
      sender: 'user',
      text: q,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMsg]);
    if (!questionText) setInputQuestion('');
    setLoading(true);

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          tenant_id: tenantId,
          question: q,
          top_k: topK,
          model: selectedModel,
          api_key: apiKey,
        }),
      });

      if (!res.ok) {
        throw new Error('Gagal menghubungi server GoFiber RAG');
      }

      const data = await res.json();

      const assistantMsg: ChatMessage = {
        id: 'ast_' + Date.now(),
        sender: 'assistant',
        text: data.answer || 'Informasi tidak ditemukan.',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        retrievedContext: data.retrieved_context || [],
        promptUsed: data.prompt_used,
        modelUsed: data.model_used,
        executionTimeMs: data.execution_time_ms,
      };

      setMessages((prev) => [...prev, assistantMsg]);
    } catch (err: any) {
      setMessages((prev) => [
        ...prev,
        {
          id: 'err_' + Date.now(),
          sender: 'assistant',
          text: '⚠️ Terjadi kesalahan saat memproses RAG: ' + (err.message || 'Server GoFiber tidak merespon'),
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          isError: true,
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 h-[calc(100vh-140px)]">
      {/* Main Chat Panel */}
      <div className="lg:col-span-8 bg-slate-900 border border-slate-800 rounded-2xl shadow-xl flex flex-col h-full overflow-hidden">
        {/* Chat Header Controls */}
        <div className="p-4 border-b border-slate-800 bg-slate-950/80 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center space-x-2">
            <div className="p-2 bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 rounded-xl">
              <Bot className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-100 text-sm">DeepSeek RAG Playground</h3>
              <p className="text-slate-400 text-xs">Tanya Jawab Dokumen Tenant #{tenantId}</p>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            {/* Model Selector */}
            <div className="flex items-center space-x-1.5 bg-slate-900 px-3 py-1.5 rounded-xl border border-slate-800">
              <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
              <select
                value={selectedModel}
                onChange={(e) => setSelectedModel(e.target.value)}
                className="bg-transparent text-slate-200 font-semibold focus:outline-none cursor-pointer text-xs"
              >
                <option value="deepseek-chat" className="bg-slate-900">DeepSeek V4 Pro (Default)</option>
                <option value="deepseek-reasoner" className="bg-slate-900">DeepSeek Reasoner (R1)</option>
                <option value="gemini-2.5-flash" className="bg-slate-900">Gemini 2.5 Flash</option>
              </select>
            </div>

            {/* Top-K Selector */}
            <div className="flex items-center space-x-2 bg-slate-900 px-3 py-1.5 rounded-xl border border-slate-800">
              <span className="text-slate-400 font-medium">Top-K:</span>
              <select
                value={topK}
                onChange={(e) => setTopK(Number(e.target.value))}
                className="bg-transparent text-cyan-400 font-bold focus:outline-none cursor-pointer text-xs"
              >
                {[2, 3, 4, 5, 8, 10].map((k) => (
                  <option key={k} value={k} className="bg-slate-900">{k} Chunks</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Message History */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex items-start space-x-3 ${msg.sender === 'user' ? 'flex-row-reverse space-x-reverse' : ''}`}
            >
              <div
                className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${
                  msg.sender === 'user'
                    ? 'bg-blue-600 text-white'
                    : msg.isError
                    ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                    : 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20'
                }`}
              >
                {msg.sender === 'user' ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
              </div>

              <div className={`max-w-[85%] space-y-2 ${msg.sender === 'user' ? 'text-right' : ''}`}>
                <div
                  className={`p-4 rounded-2xl text-xs leading-relaxed inline-block text-left ${
                    msg.sender === 'user'
                      ? 'bg-gradient-to-r from-cyan-600 to-blue-600 text-white shadow-md'
                      : 'bg-slate-950/90 text-slate-100 border border-slate-800/90 shadow-inner'
                  }`}
                >
                  <p className="whitespace-pre-wrap font-sans">{msg.text}</p>
                  <div className="mt-2 text-[10px] text-slate-400 text-right opacity-80">{msg.timestamp}</div>
                </div>

                {/* Retrieved Context Cards (if assistant message has RAG context) */}
                {msg.sender === 'assistant' && msg.retrievedContext && msg.retrievedContext.length > 0 && (
                  <div className="bg-slate-950/70 border border-slate-800/80 rounded-xl p-3 text-xs text-slate-300 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-cyan-400 flex items-center gap-1.5">
                        <BookOpen className="w-3.5 h-3.5" />
                        Kontekstual Dokumen Di-retrieval ({msg.retrievedContext.length} Chunk)
                      </span>
                      {msg.executionTimeMs && (
                        <span className="text-[10px] text-slate-500 font-mono">
                          ⚡ GoFiber: {msg.executionTimeMs}ms
                        </span>
                      )}
                    </div>

                    <div className="space-y-1.5">
                      {msg.retrievedContext.map((res, idx) => (
                        <div key={idx} className="bg-slate-900 border border-slate-800 rounded-lg p-2.5 space-y-1">
                          <div className="flex items-center justify-between text-[11px]">
                            <span className="font-bold text-slate-200">
                              #{idx + 1} {res.chunk.title}
                            </span>
                            <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-cyan-500/10 text-cyan-300 border border-cyan-500/20">
                              Similarity: {(res.similarity * 100).toFixed(1)}% | Distance: {res.cosine_distance.toFixed(4)}
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-300 line-clamp-2 bg-slate-950/50 p-1.5 rounded border border-slate-800/50">
                            {res.chunk.content}
                          </p>
                        </div>
                      ))}
                    </div>

                    {msg.promptUsed && (
                      <button
                        onClick={() => setShowPromptInspector(showPromptInspector === msg.id ? null : msg.id)}
                        className="text-[11px] text-cyan-400 hover:underline flex items-center gap-1 pt-1 font-mono"
                      >
                        <Code2 className="w-3 h-3" />
                        {showPromptInspector === msg.id ? 'Sembunyikan Raw Prompt' : 'Lihat Raw Prompt RAG'}
                      </button>
                    )}

                    {showPromptInspector === msg.id && msg.promptUsed && (
                      <div className="mt-2 p-3 bg-slate-950 rounded-lg border border-slate-800 text-[10px] font-mono text-slate-300 overflow-x-auto whitespace-pre-wrap">
                        {msg.promptUsed}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          ))}

          {loading && (
            <div className="flex items-center space-x-3 text-slate-400 text-xs py-2 animate-pulse">
              <div className="p-2 bg-cyan-500/10 text-cyan-400 rounded-xl">
                <Bot className="w-4 h-4 animate-spin" />
              </div>
              <span>Golang GoFiber sedang memproses query embedding & DeepSeek completion...</span>
            </div>
          )}

          <div ref={chatEndRef} />
        </div>

        {/* Question Input Area */}
        <div className="p-4 bg-slate-950 border-t border-slate-800 space-y-3">
          {/* Quick sample prompt chips */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[11px] font-medium text-slate-500">Pertanyaan Cepat:</span>
            {sampleQuestions.map((q, idx) => (
              <button
                key={idx}
                onClick={() => handleSend(q)}
                disabled={loading}
                className="px-2.5 py-1 bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 rounded-lg text-[11px] transition truncate max-w-[220px]"
              >
                {q}
              </button>
            ))}
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSend();
            }}
            className="flex items-center space-x-2"
          >
            <input
              type="text"
              value={inputQuestion}
              onChange={(e) => setInputQuestion(e.target.value)}
              placeholder="Ketik pertanyaan terkait dokumen..."
              disabled={loading}
              className="flex-1 bg-slate-900 border border-slate-800 rounded-xl px-4 py-3 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-cyan-500"
            />
            <button
              type="submit"
              disabled={loading || !inputQuestion.trim()}
              className="px-5 py-3 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-bold rounded-xl shadow-lg shadow-cyan-600/20 disabled:opacity-50 transition flex items-center space-x-1.5"
            >
              <Send className="w-4 h-4" />
              <span className="text-xs">Kirim</span>
            </button>
          </form>
        </div>
      </div>

      {/* Right Sidebar: RAG Architecture & System Specs */}
      <div className="lg:col-span-4 bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-5 flex flex-col h-full overflow-y-auto">
        <div className="border-b border-slate-800 pb-3">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-cyan-400" />
            Parameter Pipeline RAG
          </h3>
          <p className="text-xs text-slate-400">Konfigurasi GoFiber & DeepSeek Model</p>
        </div>

        {/* API Key Status Box */}
        <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800 space-y-2">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-300">
            <span>Status DeepSeek API Key</span>
            <span className={`px-2 py-0.5 rounded text-[10px] ${apiKey ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'}`}>
              {apiKey ? 'API Key Set' : 'Local Synthesis'}
            </span>
          </div>
          <p className="text-xs text-slate-400 leading-relaxed">
            {apiKey
              ? 'DeepSeek API terhubung secara langsung untuk menghasilkan jawaban LLM.'
              : 'Menggunakan Engine RAG Synthesis bawaan GoFiber secara lokal.'}
          </p>
          <button
            onClick={onOpenApiKeyModal}
            className="w-full py-1.5 bg-slate-800 hover:bg-slate-700 text-cyan-300 rounded-lg text-xs font-medium border border-slate-700 transition flex items-center justify-center gap-1.5"
          >
            <Key className="w-3.5 h-3.5" />
            <span>{apiKey ? 'Ubah API Key' : 'Atur DeepSeek API Key'}</span>
          </button>
        </div>

        {/* Prompt Template Box */}
        <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800 space-y-2 text-xs">
          <div className="font-semibold text-cyan-400 flex items-center gap-1.5">
            <Code2 className="w-3.5 h-3.5" />
            <span>Format Prompt Terstruktur RAG:</span>
          </div>
          <pre className="p-2.5 bg-slate-900 rounded-lg border border-slate-800 text-[11px] font-mono text-slate-300 whitespace-pre-wrap">
{`Jawablah hanya berdasarkan context berikut.

Context:
{{hasil retrieval}}

Pertanyaan:
{{pertanyaan user}}

Jika jawabannya tidak ada di context, katakan bahwa informasi tidak ditemukan.`}
          </pre>
        </div>

        {/* Specs List */}
        <div className="space-y-2 text-xs">
          <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 flex items-center justify-between">
            <span className="text-slate-400">Model Embedding:</span>
            <span className="font-bold text-cyan-300">BAAI/bge-m3 (1024-d)</span>
          </div>
          <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 flex items-center justify-between">
            <span className="text-slate-400">Database Vector:</span>
            <span className="font-bold text-blue-300">PostgreSQL pgvector</span>
          </div>
          <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 flex items-center justify-between">
            <span className="text-slate-400">Distance Metric:</span>
            <span className="font-bold text-emerald-300">Cosine Distance (&lt;=&gt;)</span>
          </div>
        </div>
      </div>
    </div>
  );
};
