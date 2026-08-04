package handlers

import (
	"fmt"
	"go_backend/models"
	"runtime"
	"time"

	"github.com/gofiber/fiber/v2"
	"github.com/sirupsen/logrus"
	"gorm.io/gorm"
)

type SystemHandler struct {
	db  *gorm.DB
	log *logrus.Logger
}

func NewSystemHandler(db *gorm.DB, log *logrus.Logger) *SystemHandler {
	return &SystemHandler{
		db:  db,
		log: log,
	}
}

func (h *SystemHandler) GetSystemInfo(c *fiber.Ctx) error {
	var totalDocs int64
	var totalChunks int64
	var totalTenants int64

	h.db.Model(&models.Document{}).Count(&totalDocs)
	h.db.Model(&models.DocumentChunk{}).Count(&totalChunks)
	h.db.Model(&models.Document{}).Distinct("tenant_id").Count(&totalTenants)

	var memStats runtime.MemStats
	runtime.ReadMemStats(&memStats)

	return c.JSON(fiber.Map{
		"status":      "ok",
		"framework":   "GoFiber v2",
		"orm":         "GORM",
		"logger":      "Logrus",
		"vector_db":   "pgvector (1024-d BGE-M3)",
		"go_version":  runtime.Version(),
		"arch":        runtime.GOARCH,
		"os":          runtime.GOOS,
		"goroutines":  runtime.NumCPU(),
		"memory_alloc": fmt.Sprintf("%.2f MB", float64(memStats.Alloc)/1024/1024),
		"metrics": fiber.Map{
			"total_documents": totalDocs,
			"total_chunks":    totalChunks,
			"active_tenants":  totalTenants,
		},
		"timestamp": time.Now().Format(time.RFC3339),
	})
}

func (h *SystemHandler) GetSQLSchema(c *fiber.Ctx) error {
	sqlDDL := `-- PostgreSQL + pgvector SQL Schema
CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE documents (
    id BIGSERIAL PRIMARY KEY,
    doc_id VARCHAR(64) NOT NULL,
    tenant_id BIGINT NOT NULL,
    title TEXT,
    file_name VARCHAR(255),
    file_type VARCHAR(50),
    total_chunks INT DEFAULT 0,
    total_tokens INT DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_documents_tenant_doc ON documents (tenant_id, doc_id);

CREATE TABLE document_chunks (
    id BIGSERIAL PRIMARY KEY,
    doc_id VARCHAR(64) NOT NULL,
    tenant_id BIGINT NOT NULL,
    title TEXT,
    chunk_index INT NOT NULL,
    content TEXT NOT NULL,
    embedding vector(1024),
    tokens INT DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- HNSW Vector Index for Cosine Distance <=>
CREATE INDEX idx_document_chunks_embedding
ON document_chunks
USING hnsw (embedding vector_cosine_ops);
`

	gormCode := `// GORM Model Definitions
type Document struct {
    ID          uint      ` + "`" + `gorm:"primaryKey" json:"id"` + "`" + `
    DocID       string    ` + "`" + `gorm:"index;type:varchar(64)" json:"doc_id"` + "`" + `
    TenantID    uint64    ` + "`" + `gorm:"index" json:"tenant_id"` + "`" + `
    Title       string    ` + "`" + `gorm:"type:text" json:"title"` + "`" + `
    FileName    string    ` + "`" + `json:"file_name"` + "`" + `
    FileType    string    ` + "`" + `json:"file_type"` + "`" + `
    TotalChunks int       ` + "`" + `json:"total_chunks"` + "`" + `
    TotalTokens int       ` + "`" + `json:"total_tokens"` + "`" + `
    CreatedAt   time.Time ` + "`" + `json:"created_at"` + "`" + `
    UpdatedAt   time.Time ` + "`" + `json:"updated_at"` + "`" + `
}

type DocumentChunk struct {
    ID         uint            ` + "`" + `gorm:"primaryKey" json:"id"` + "`" + `
    DocID      string          ` + "`" + `gorm:"index;type:varchar(64)" json:"doc_id"` + "`" + `
    TenantID   uint64          ` + "`" + `gorm:"index" json:"tenant_id"` + "`" + `
    Title      string          ` + "`" + `json:"title"` + "`" + `
    ChunkIndex int             ` + "`" + `json:"chunk_index"` + "`" + `
    Content    string          ` + "`" + `gorm:"type:text" json:"content"` + "`" + `
    Embedding  pgvector.Vector ` + "`" + `gorm:"type:vector(1024)" json:"embedding"` + "`" + `
    Tokens     int             ` + "`" + `json:"tokens"` + "`" + `
    CreatedAt  time.Time       ` + "`" + `json:"created_at"` + "`" + `
}`

	return c.JSON(fiber.Map{
		"sql_ddl":    sqlDDL,
		"gorm_model": gormCode,
	})
}
