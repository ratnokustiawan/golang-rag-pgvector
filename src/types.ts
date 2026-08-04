export interface Document {
  id: number;
  doc_id: string;
  tenant_id: number;
  title: string;
  file_name: string;
  file_type: string;
  total_chunks: number;
  total_tokens: number;
  created_at: string;
  updated_at: string;
  chunk_count?: number;
}

export interface DocumentChunk {
  id: number;
  doc_id: string;
  tenant_id: number;
  title: string;
  chunk_index: number;
  content: string;
  embedding: string;
  tokens: number;
  created_at: string;
}

export interface SearchResult {
  chunk: DocumentChunk;
  cosine_distance: number;
  similarity: number;
}

export interface ChatRequest {
  tenant_id: number;
  question: string;
  top_k?: number;
  model?: string;
  api_key?: string;
  doc_ids?: string[];
}

export interface ChatResponse {
  answer: string;
  retrieved_context: SearchResult[];
  prompt_used: string;
  model_used: string;
  execution_time_ms: number;
  tenant_id: number;
  total_tokens: number;
}

export interface SystemInfo {
  status: string;
  framework: string;
  orm: string;
  logger: string;
  vector_db: string;
  go_version: string;
  arch: string;
  os: string;
  goroutines: number;
  memory_alloc: string;
  metrics: {
    total_documents: number;
    total_chunks: number;
    active_tenants: number;
  };
  timestamp: string;
}

export interface SQLSchema {
  sql_ddl: string;
  gorm_model: string;
}

export interface ChatMessage {
  id: string;
  sender: 'user' | 'assistant';
  text: string;
  timestamp: string;
  retrievedContext?: SearchResult[];
  promptUsed?: string;
  modelUsed?: string;
  executionTimeMs?: number;
  isError?: boolean;
}
