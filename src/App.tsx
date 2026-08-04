/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Navbar } from './components/Navbar';
import { DocumentManager } from './components/DocumentManager';
import { RAGChatPlayground } from './components/RAGChatPlayground';
import { VectorSearchSimulator } from './components/VectorSearchSimulator';
import { ArchitectureInspector } from './components/ArchitectureInspector';
import { ApiKeyModal } from './components/ApiKeyModal';
import { Document, SystemInfo } from './types';

export default function App() {
  const [activeTab, setActiveTab] = useState<'chat' | 'docs' | 'search' | 'architecture'>('chat');
  const [tenantId, setTenantId] = useState<number>(1);
  const [apiKey, setApiKey] = useState<string>(() => localStorage.getItem('rag_deepseek_api_key') || '');
  const [isApiKeyModalOpen, setIsApiKeyModalOpen] = useState(false);

  const [documents, setDocuments] = useState<Document[]>([]);
  const [loadingDocs, setLoadingDocs] = useState(false);
  const [systemInfo, setSystemInfo] = useState<SystemInfo | null>(null);

  // Save API key to localStorage when updated
  const handleSaveApiKey = (key: string) => {
    setApiKey(key);
    localStorage.setItem('rag_deepseek_api_key', key);
  };

  // Fetch Documents for current tenant
  const fetchDocuments = async () => {
    setLoadingDocs(true);
    try {
      const res = await fetch(`/api/documents?tenant_id=${tenantId}`);
      if (res.ok) {
        const data = await res.json();
        setDocuments(data.documents || []);
      }
    } catch (err) {
      console.error('Failed to fetch documents:', err);
    } finally {
      setLoadingDocs(false);
    }
  };

  // Fetch System Info
  const fetchSystemInfo = async () => {
    try {
      const res = await fetch('/api/health');
      if (res.ok) {
        const data = await res.json();
        setSystemInfo(data);
      }
    } catch (err) {
      console.error('Failed to fetch health info:', err);
    }
  };

  useEffect(() => {
    fetchDocuments();
    fetchSystemInfo();
  }, [tenantId]);

  // Upload Document Handler
  const handleUploadDocument = async (
    title: string,
    content: string,
    chunkSize: number,
    chunkOverlap: number
  ): Promise<boolean> => {
    try {
      const res = await fetch('/api/upload', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          tenant_id: tenantId,
          title,
          content,
          chunk_size: chunkSize,
          chunk_overlap: chunkOverlap,
          api_key: apiKey,
        }),
      });

      if (res.ok) {
        await fetchDocuments();
        await fetchSystemInfo();
        return true;
      }
    } catch (err) {
      console.error('Upload error:', err);
    }
    return false;
  };

  // Delete Document Handler
  const handleDeleteDocument = async (docId: string): Promise<boolean> => {
    try {
      const res = await fetch(`/api/documents/${docId}`, {
        method: 'DELETE',
      });

      if (res.ok) {
        await fetchDocuments();
        await fetchSystemInfo();
        return true;
      }
    } catch (err) {
      console.error('Delete error:', err);
    }
    return false;
  };

  return (
    <div id="app-root" className="min-h-screen bg-slate-950 text-slate-100 font-sans selection:bg-cyan-500 selection:text-white">
      {/* Top Navbar */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        tenantId={tenantId}
        setTenantId={setTenantId}
        systemInfo={systemInfo}
        apiKey={apiKey}
        onOpenApiKeyModal={() => setIsApiKeyModalOpen(true)}
      />

      {/* Main View Area */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {activeTab === 'chat' && (
          <RAGChatPlayground
            tenantId={tenantId}
            apiKey={apiKey}
            onOpenApiKeyModal={() => setIsApiKeyModalOpen(true)}
          />
        )}

        {activeTab === 'docs' && (
          <DocumentManager
            documents={documents}
            tenantId={tenantId}
            loading={loadingDocs}
            onRefresh={fetchDocuments}
            onUpload={handleUploadDocument}
            onDelete={handleDeleteDocument}
          />
        )}

        {activeTab === 'search' && (
          <VectorSearchSimulator
            tenantId={tenantId}
            apiKey={apiKey}
          />
        )}

        {activeTab === 'architecture' && (
          <ArchitectureInspector
            systemInfo={systemInfo}
          />
        )}
      </main>

      {/* API Key Modal */}
      <ApiKeyModal
        isOpen={isApiKeyModalOpen}
        onClose={() => setIsApiKeyModalOpen(false)}
        apiKey={apiKey}
        onSaveApiKey={handleSaveApiKey}
      />
    </div>
  );
}
