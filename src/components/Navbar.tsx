import React from 'react';
import { Bot, Database, Cpu, FileText, Search, Code2, Key, Activity, Layers } from 'lucide-react';
import { SystemInfo } from '../types';

interface NavbarProps {
  activeTab: 'chat' | 'docs' | 'search' | 'architecture';
  setActiveTab: (tab: 'chat' | 'docs' | 'search' | 'architecture') => void;
  tenantId: number;
  setTenantId: (id: number) => void;
  systemInfo: SystemInfo | null;
  apiKey: string;
  onOpenApiKeyModal: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  setActiveTab,
  tenantId,
  setTenantId,
  systemInfo,
  apiKey,
  onOpenApiKeyModal,
}) => {
  return (
    <header id="main-navbar" className="bg-slate-900 border-b border-slate-800 text-white sticky top-0 z-30 shadow-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo & Title */}
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-cyan-500 via-blue-600 to-indigo-600 flex items-center justify-center shadow-lg shadow-cyan-500/20">
              <Bot className="w-6 h-6 text-white" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h1 className="text-lg font-bold tracking-tight bg-gradient-to-r from-white via-slate-100 to-slate-300 bg-clip-text text-transparent">
                  GoFiber RAG Engine
                </h1>
                <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                  Golang + DeepSeek
                </span>
              </div>
              <p className="text-xs text-slate-400 flex items-center gap-1.5">
                <span>GORM ORM</span>
                <span>•</span>
                <span>Logrus</span>
                <span>•</span>
                <span>BGE-M3 (1024d)</span>
              </p>
            </div>
          </div>

          {/* Navigation Tabs */}
          <nav className="hidden md:flex items-center space-x-1 bg-slate-950/60 p-1.5 rounded-xl border border-slate-800/80">
            <button
              id="tab-chat"
              onClick={() => setActiveTab('chat')}
              className={`flex items-center space-x-2 px-3.5 py-1.5 rounded-lg text-sm font-medium transition-all ${
                activeTab === 'chat'
                  ? 'bg-gradient-to-r from-cyan-600 to-blue-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
              }`}
            >
              <Bot className="w-4 h-4" />
              <span>RAG Chat</span>
            </button>

            <button
              id="tab-docs"
              onClick={() => setActiveTab('docs')}
              className={`flex items-center space-x-2 px-3.5 py-1.5 rounded-lg text-sm font-medium transition-all ${
                activeTab === 'docs'
                  ? 'bg-gradient-to-r from-cyan-600 to-blue-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
              }`}
            >
              <FileText className="w-4 h-4" />
              <span>Dokumen & Chunking</span>
            </button>

            <button
              id="tab-search"
              onClick={() => setActiveTab('search')}
              className={`flex items-center space-x-2 px-3.5 py-1.5 rounded-lg text-sm font-medium transition-all ${
                activeTab === 'search'
                  ? 'bg-gradient-to-r from-cyan-600 to-blue-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
              }`}
            >
              <Search className="w-4 h-4" />
              <span>Vector Search</span>
            </button>

            <button
              id="tab-architecture"
              onClick={() => setActiveTab('architecture')}
              className={`flex items-center space-x-2 px-3.5 py-1.5 rounded-lg text-sm font-medium transition-all ${
                activeTab === 'architecture'
                  ? 'bg-gradient-to-r from-cyan-600 to-blue-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
              }`}
            >
              <Code2 className="w-4 h-4" />
              <span>Arsitektur & Code</span>
            </button>
          </nav>

          {/* Right actions */}
          <div className="flex items-center space-x-3">
            {/* Tenant selector */}
            <div className="flex items-center space-x-1.5 bg-slate-800/80 px-2.5 py-1.5 rounded-lg border border-slate-700/60 text-xs">
              <Layers className="w-3.5 h-3.5 text-cyan-400" />
              <span className="text-slate-400 font-medium">Tenant:</span>
              <select
                id="tenant-select"
                value={tenantId}
                onChange={(e) => setTenantId(Number(e.target.value))}
                className="bg-transparent text-slate-200 font-semibold focus:outline-none cursor-pointer"
              >
                <option value={1} className="bg-slate-900 text-slate-200">Tenant #1 (Utama)</option>
                <option value={2} className="bg-slate-900 text-slate-200">Tenant #2 (Demo)</option>
                <option value={3} className="bg-slate-900 text-slate-200">Tenant #3 (Enterprise)</option>
              </select>
            </div>

            {/* API Key Modal Button */}
            <button
              id="btn-key-modal"
              onClick={onOpenApiKeyModal}
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                apiKey
                  ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/20'
                  : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'
              }`}
            >
              <Key className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">{apiKey ? 'DeepSeek Key Active' : 'Set API Key'}</span>
            </button>

            {/* System Status Pill */}
            <div className="hidden lg:flex items-center space-x-2 px-2.5 py-1.5 bg-slate-950/80 rounded-lg border border-slate-800/80 text-xs text-slate-300">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              <span className="font-medium text-emerald-400">GoFiber</span>
              <span className="text-slate-600">|</span>
              <span className="text-slate-400">{systemInfo?.memory_alloc || '3.2 MB'}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile nav tabs */}
      <div className="md:hidden flex items-center justify-around bg-slate-950 px-2 py-2 border-t border-slate-800 text-xs">
        <button
          onClick={() => setActiveTab('chat')}
          className={`flex flex-col items-center py-1 px-3 rounded ${activeTab === 'chat' ? 'text-cyan-400 font-bold' : 'text-slate-400'}`}
        >
          <Bot className="w-4 h-4" />
          <span>Chat</span>
        </button>
        <button
          onClick={() => setActiveTab('docs')}
          className={`flex flex-col items-center py-1 px-3 rounded ${activeTab === 'docs' ? 'text-cyan-400 font-bold' : 'text-slate-400'}`}
        >
          <FileText className="w-4 h-4" />
          <span>Dokumen</span>
        </button>
        <button
          onClick={() => setActiveTab('search')}
          className={`flex flex-col items-center py-1 px-3 rounded ${activeTab === 'search' ? 'text-cyan-400 font-bold' : 'text-slate-400'}`}
        >
          <Search className="w-4 h-4" />
          <span>Search</span>
        </button>
        <button
          onClick={() => setActiveTab('architecture')}
          className={`flex flex-col items-center py-1 px-3 rounded ${activeTab === 'architecture' ? 'text-cyan-400 font-bold' : 'text-slate-400'}`}
        >
          <Code2 className="w-4 h-4" />
          <span>Code</span>
        </button>
      </div>
    </header>
  );
};
