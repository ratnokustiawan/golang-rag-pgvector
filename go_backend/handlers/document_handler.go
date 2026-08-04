package handlers

import (
	"crypto/rand"
	"encoding/hex"
	"fmt"
	"go_backend/models"
	"go_backend/services"
	"io"
	"path/filepath"
	"strconv"
	"strings"
	"time"

	"github.com/gofiber/fiber/v2"
	"github.com/sirupsen/logrus"
	"gorm.io/gorm"
)

type DocumentHandler struct {
	db       *gorm.DB
	embedder *services.EmbeddingService
	log      *logrus.Logger
}

func NewDocumentHandler(db *gorm.DB, embedder *services.EmbeddingService, log *logrus.Logger) *DocumentHandler {
	return &DocumentHandler{
		db:       db,
		embedder: embedder,
		log:      log,
	}
}

type UploadRequest struct {
	TenantID     uint64 `json:"tenant_id" form:"tenant_id"`
	Title        string `json:"title" form:"title"`
	Content      string `json:"content" form:"content"`
	ChunkSize    int    `json:"chunk_size" form:"chunk_size"`
	ChunkOverlap int    `json:"chunk_overlap" form:"chunk_overlap"`
	APIKey       string `json:"api_key" form:"api_key"`
}

func generateDocID() string {
	b := make([]byte, 8)
	_, _ = rand.Read(b)
	return "doc_" + hex.EncodeToString(b)
}

func (h *DocumentHandler) UploadDocument(c *fiber.Ctx) error {
	var req UploadRequest

	// Try parsing body as JSON or Form
	if err := c.BodyParser(&req); err != nil {
		h.log.WithError(err).Warn("Failed to parse JSON body, checking form/file upload")
	}

	// Handle multipart form file upload if present
	file, err := c.FormFile("file")
	if err == nil && file != nil {
		if req.Title == "" {
			req.Title = file.Filename
		}
		f, err := file.Open()
		if err == nil {
			defer f.Close()
			contentBytes, err := io.ReadAll(f)
			if err == nil && len(contentBytes) > 0 {
				req.Content = string(contentBytes)
			}
		}
	}

	// Default tenant_id if not specified
	if req.TenantID == 0 {
		tenantStr := c.FormValue("tenant_id", c.Query("tenant_id", "1"))
		if tid, err := strconv.ParseUint(tenantStr, 10, 64); err == nil {
			req.TenantID = tid
		} else {
			req.TenantID = 1
		}
	}

	req.Title = strings.TrimSpace(req.Title)
	req.Content = strings.TrimSpace(req.Content)

	if req.Title == "" {
		req.Title = fmt.Sprintf("Dokumen RAG #%d", time.Now().Unix())
	}

	if req.Content == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Konten dokumen tidak boleh kosong",
		})
	}

	chunkConfig := services.ChunkConfig{
		ChunkSize:    req.ChunkSize,
		ChunkOverlap: req.ChunkOverlap,
	}
	if chunkConfig.ChunkSize == 0 {
		chunkConfig.ChunkSize = 800
	}
	if chunkConfig.ChunkOverlap == 0 {
		chunkConfig.ChunkOverlap = 150
	}

	docID := generateDocID()
	chunks := services.ChunkText(req.Content, chunkConfig)
	totalTokens := services.EstimateTokens(req.Content)

	h.log.WithFields(logrus.Fields{
		"doc_id":       docID,
		"tenant_id":    req.TenantID,
		"title":        req.Title,
		"total_chunks": len(chunks),
		"total_tokens": totalTokens,
	}).Info("Processing document upload and chunking")

	// Save Master Document entry using GORM
	doc := models.Document{
		DocID:       docID,
		TenantID:    req.TenantID,
		Title:       req.Title,
		FileName:    req.Title,
		FileType:    filepath.Ext(req.Title),
		TotalChunks: len(chunks),
		TotalTokens: totalTokens,
		CreatedAt:   time.Now(),
		UpdatedAt:   time.Now(),
	}

	if err := h.db.Create(&doc).Error; err != nil {
		h.log.WithError(err).Error("Failed to save master document in GORM")
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Gagal menyimpan metadata dokumen ke database",
		})
	}

	// Generate BGE-M3 Embeddings & save chunks
	var createdChunks []models.DocumentChunk
	for idx, chunkText := range chunks {
		vec, err := h.embedder.GenerateEmbedding(chunkText, req.APIKey)
		if err != nil {
			h.log.WithError(err).Warnf("Embedding generation fallback for chunk %d", idx)
		}

		chunkObj := models.DocumentChunk{
			DocID:      docID,
			TenantID:   req.TenantID,
			Title:      req.Title,
			ChunkIndex: idx + 1,
			Content:    chunkText,
			Embedding:  services.VectorToString(vec),
			Tokens:     services.EstimateTokens(chunkText),
			CreatedAt:  time.Now(),
		}

		if err := h.db.Create(&chunkObj).Error; err != nil {
			h.log.WithError(err).Errorf("Failed to save chunk #%d", idx+1)
		} else {
			createdChunks = append(createdChunks, chunkObj)
		}
	}

	return c.Status(fiber.StatusCreated).JSON(fiber.Map{
		"message":      "Dokumen berhasil diproses dan disimpan ke pgvector database",
		"doc_id":       docID,
		"document":     doc,
		"total_chunks": len(createdChunks),
		"chunks":       createdChunks,
	})
}

func (h *DocumentHandler) ListDocuments(c *fiber.Ctx) error {
	tenantStr := c.Query("tenant_id", "")
	search := c.Query("search", "")

	var docs []models.Document
	query := h.db.Model(&models.Document{})

	if tenantStr != "" {
		if tid, err := strconv.ParseUint(tenantStr, 10, 64); err == nil {
			query = query.Where("tenant_id = ?", tid)
		}
	}

	if search != "" {
		query = query.Where("title LIKE ? OR doc_id LIKE ?", "%"+search+"%", "%"+search+"%")
	}

	if err := query.Order("created_at desc").Find(&docs).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Gagal mengambil daftar dokumen",
		})
	}

	// Also retrieve chunk counts & sample preview
	type DocItem struct {
		models.Document
		ChunkCount int `json:"chunk_count"`
	}

	var items []DocItem
	for _, d := range docs {
		var cnt int64
		h.db.Model(&models.DocumentChunk{}).Where("doc_id = ?", d.DocID).Count(&cnt)
		items = append(items, DocItem{
			Document:   d,
			ChunkCount: int(cnt),
		})
	}

	return c.JSON(fiber.Map{
		"total":     len(items),
		"documents": items,
	})
}

func (h *DocumentHandler) GetDocument(c *fiber.Ctx) error {
	docID := c.Params("doc_id")

	var doc models.Document
	if err := h.db.Where("doc_id = ?", docID).First(&doc).Error; err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{
			"error": "Dokumen tidak ditemukan",
		})
	}

	var chunks []models.DocumentChunk
	h.db.Where("doc_id = ?", docID).Order("chunk_index ascii").Find(&chunks)

	return c.JSON(fiber.Map{
		"document": doc,
		"chunks":   chunks,
	})
}

func (h *DocumentHandler) DeleteDocument(c *fiber.Ctx) error {
	docID := c.Params("doc_id")

	h.log.WithField("doc_id", docID).Info("Deleting document and associated vector chunks")

	// Delete chunks and master entry
	h.db.Where("doc_id = ?", docID).Delete(&models.DocumentChunk{})
	res := h.db.Where("doc_id = ?", docID).Delete(&models.Document{})

	if res.RowsAffected == 0 {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{
			"error": "Dokumen tidak ditemukan atau sudah dihapus",
		})
	}

	return c.JSON(fiber.Map{
		"message": "Dokumen dan seluruh chunk berhasil dihapus dari pgvector database",
		"doc_id":  docID,
	})
}
