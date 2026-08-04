package models

import (
	"time"
)

// Document represents a master document entry
type Document struct {
	ID          uint      `gorm:"primaryKey" json:"id"`
	DocID       string    `gorm:"index;type:varchar(64)" json:"doc_id"`
	TenantID    uint64    `gorm:"index" json:"tenant_id"`
	Title       string    `gorm:"type:text" json:"title"`
	FileName    string    `json:"file_name"`
	FileType    string    `json:"file_type"`
	TotalChunks int       `json:"total_chunks"`
	TotalTokens int       `json:"total_tokens"`
	CreatedAt   time.Time `json:"created_at"`
	UpdatedAt   time.Time `json:"updated_at"`
}

// DocumentChunk represents an individual chunk with vector embedding
type DocumentChunk struct {
	ID         uint      `gorm:"primaryKey" json:"id"`
	DocID      string    `gorm:"index;type:varchar(64)" json:"doc_id"`
	TenantID   uint64    `gorm:"index" json:"tenant_id"`
	Title      string    `json:"title"`
	ChunkIndex int       `json:"chunk_index"`
	Content    string    `gorm:"type:text" json:"content"`
	Embedding  string    `gorm:"type:text" json:"embedding"` // Stored vector representation
	Tokens     int       `json:"tokens"`
	CreatedAt  time.Time `json:"created_at"`
}

// SearchResult represents vector retrieval result
type SearchResult struct {
	Chunk          DocumentChunk `json:"chunk"`
	CosineDistance float64       `json:"cosine_distance"`
	Similarity     float64       `json:"similarity"`
}
