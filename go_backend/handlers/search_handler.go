package handlers

import (
	"go_backend/models"
	"go_backend/services"
	"sort"
	"strconv"
	"strings"
	"time"

	"github.com/gofiber/fiber/v2"
	"github.com/sirupsen/logrus"
	"gorm.io/gorm"
)

type SearchHandler struct {
	db       *gorm.DB
	embedder *services.EmbeddingService
	log      *logrus.Logger
}

func NewSearchHandler(db *gorm.DB, embedder *services.EmbeddingService, log *logrus.Logger) *SearchHandler {
	return &SearchHandler{
		db:       db,
		embedder: embedder,
		log:      log,
	}
}

type SearchRequest struct {
	TenantID uint64   `json:"tenant_id" form:"tenant_id"`
	Query    string   `json:"query" form:"query"`
	TopK     int      `json:"top_k" form:"top_k"`
	APIKey   string   `json:"api_key" form:"api_key"`
	DocIDs   []string `json:"doc_ids" form:"doc_ids"`
}

func (h *SearchHandler) SearchVectors(c *fiber.Ctx) error {
	start := time.Now()

	var req SearchRequest
	if err := c.BodyParser(&req); err != nil {
		h.log.WithError(err).Warn("Failed to parse search request body")
	}

	if req.TenantID == 0 {
		tenantStr := c.Query("tenant_id", "1")
		if tid, err := strconv.ParseUint(tenantStr, 10, 64); err == nil {
			req.TenantID = tid
		} else {
			req.TenantID = 1
		}
	}

	if req.Query == "" {
		req.Query = c.Query("query", c.Query("q", ""))
	}

	req.Query = strings.TrimSpace(req.Query)
	if req.Query == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Query pencarian tidak boleh kosong",
		})
	}

	if req.TopK <= 0 {
		req.TopK = 5
	}
	if req.TopK > 20 {
		req.TopK = 20
	}

	h.log.WithFields(logrus.Fields{
		"tenant_id": req.TenantID,
		"query":     req.Query,
		"top_k":     req.TopK,
	}).Info("Executing pgvector cosine similarity search")

	// 1. Generate Query Vector Embedding (1024-d)
	queryVec, err := h.embedder.GenerateEmbedding(req.Query, req.APIKey)
	if err != nil {
		h.log.WithError(err).Error("Failed to generate query embedding vector")
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Gagal menghasilkan embedding vector untuk query",
		})
	}

	// 2. Query Candidate Chunks from GORM database with Tenant Isolation
	var candidateChunks []models.DocumentChunk
	dbQuery := h.db.Model(&models.DocumentChunk{}).Where("tenant_id = ?", req.TenantID)

	if len(req.DocIDs) > 0 {
		dbQuery = dbQuery.Where("doc_id IN ?", req.DocIDs)
	}

	if err := dbQuery.Find(&candidateChunks).Error; err != nil {
		h.log.WithError(err).Error("GORM database error during chunk retrieval")
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Gagal mengambil chunk dari database",
		})
	}

	// 3. Compute Cosine Distance <=> for each chunk vector
	var results []models.SearchResult
	for _, chunk := range candidateChunks {
		chunkVec := services.StringToVector(chunk.Embedding)
		sim := services.CosineSimilarity(queryVec, chunkVec)
		dist := services.CosineDistance(queryVec, chunkVec)

		results = append(results, models.SearchResult{
			Chunk:          chunk,
			CosineDistance: dist,
			Similarity:     sim,
		})
	}

	// 4. Sort by highest similarity / lowest Cosine Distance
	sort.Slice(results, func(i, j int) bool {
		return results[i].CosineDistance < results[j].CosineDistance
	})

	// 5. Select Top-K
	if len(results) > req.TopK {
		results = results[:req.TopK]
	}

	execTime := time.Since(start).Milliseconds()

	return c.JSON(fiber.Map{
		"tenant_id":         req.TenantID,
		"query":             req.Query,
		"top_k":             req.TopK,
		"candidates_tested": len(candidateChunks),
		"execution_time_ms": execTime,
		"results":           results,
	})
}
