package handlers

import (
	"go_backend/models"
	"go_backend/services"
	"sort"
	"strconv"

	"github.com/gofiber/fiber/v2"
	"github.com/sirupsen/logrus"
	"gorm.io/gorm"
)

type ChatHandler struct {
	db         *gorm.DB
	embedder   *services.EmbeddingService
	ragService *services.RAGService
	log        *logrus.Logger
}

func NewChatHandler(db *gorm.DB, embedder *services.EmbeddingService, ragService *services.RAGService, log *logrus.Logger) *ChatHandler {
	return &ChatHandler{
		db:         db,
		embedder:   embedder,
		ragService: ragService,
		log:        log,
	}
}

func (h *ChatHandler) HandleRAGChat(c *fiber.Ctx) error {
	var req services.ChatRequest
	if err := c.BodyParser(&req); err != nil {
		h.log.WithError(err).Warn("Failed to parse chat request body")
	}

	if req.TenantID == 0 {
		tenantStr := c.Query("tenant_id", "1")
		if tid, err := strconv.ParseUint(tenantStr, 10, 64); err == nil {
			req.TenantID = tid
		} else {
			req.TenantID = 1
		}
	}

	if req.Question == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Pertanyaan tidak boleh kosong",
		})
	}

	if req.TopK <= 0 {
		req.TopK = 5
	}

	h.log.WithFields(logrus.Fields{
		"tenant_id": req.TenantID,
		"question":  req.Question,
		"model":     req.Model,
		"top_k":     req.TopK,
	}).Info("Executing DeepSeek RAG Pipeline")

	// 1. Vector Search for Context Chunks
	queryVec, err := h.embedder.GenerateEmbedding(req.Question, req.APIKey)
	if err != nil {
		h.log.WithError(err).Error("Failed to generate query embedding for RAG chat")
	}

	var chunks []models.DocumentChunk
	dbQuery := h.db.Model(&models.DocumentChunk{}).Where("tenant_id = ?", req.TenantID)
	if len(req.DocIDs) > 0 {
		dbQuery = dbQuery.Where("doc_id IN ?", req.DocIDs)
	}
	dbQuery.Find(&chunks)

	var searchResults []models.SearchResult
	for _, chunk := range chunks {
		chunkVec := services.StringToVector(chunk.Embedding)
		sim := services.CosineSimilarity(queryVec, chunkVec)
		dist := services.CosineDistance(queryVec, chunkVec)

		searchResults = append(searchResults, models.SearchResult{
			Chunk:          chunk,
			CosineDistance: dist,
			Similarity:     sim,
		})
	}

	sort.Slice(searchResults, func(i, j int) bool {
		return searchResults[i].CosineDistance < searchResults[j].CosineDistance
	})

	if len(searchResults) > req.TopK {
		searchResults = searchResults[:req.TopK]
	}

	// 2. Execute DeepSeek V4 Pro RAG prompt completion
	resp, err := h.ragService.ExecuteRAG(req, searchResults)
	if err != nil {
		h.log.WithError(err).Error("Error generating RAG completion")
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Gagal memproses jawaban LLM",
		})
	}

	return c.JSON(resp)
}
