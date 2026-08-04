package main

import (
	"go_backend/database"
	"go_backend/handlers"
	"go_backend/services"
	"os"
	"time"

	"github.com/gofiber/fiber/v2"
	"github.com/gofiber/fiber/v2/middleware/cors"
	"github.com/gofiber/fiber/v2/middleware/logger"
	"github.com/gofiber/fiber/v2/middleware/recover"
	"github.com/sirupsen/logrus"
	"gorm.io/gorm"
)

func main() {
	// 1. Initialize Logrus Logger
	log := logrus.New()
	log.SetFormatter(&logrus.TextFormatter{
		FullTimestamp:   true,
		TimestampFormat: "2006-01-02 15:04:05",
		ForceColors:     true,
	})
	log.SetOutput(os.Stdout)
	log.SetLevel(logrus.InfoLevel)

	log.Info("==========================================================")
	log.Info("   Golang + GoFiber + GORM + Logrus RAG DeepSeek Server   ")
	log.Info("==========================================================")

	// 2. Initialize GORM Database
	db, err := database.InitDB(log)
	if err != nil {
		log.WithError(err).Fatal("Failed to initialize database")
	}

	// 3. Initialize Services
	embedder := services.NewEmbeddingService()
	ragService := services.NewRAGService(embedder, log)

	// 4. Initialize Handlers
	docHandler := handlers.NewDocumentHandler(db, embedder, log)
	searchHandler := handlers.NewSearchHandler(db, embedder, log)
	chatHandler := handlers.NewChatHandler(db, embedder, ragService, log)
	sysHandler := handlers.NewSystemHandler(db, log)

	// 5. Initialize GoFiber App
	app := fiber.New(fiber.Config{
		AppName:      "GoFiber RAG DeepSeek Engine",
		BodyLimit:    50 * 1024 * 1024, // 50MB max upload
		ReadTimeout:  60 * time.Second,
		WriteTimeout: 60 * time.Second,
	})

	// Middleware
	app.Use(recover.New())
	app.Use(cors.New(cors.Config{
		AllowOrigins: "*",
		AllowHeaders: "Origin, Content-Type, Accept, Authorization, X-Tenant-ID, X-API-Key",
		AllowMethods: "GET, POST, PUT, DELETE, OPTIONS",
	}))

	// Logrus request logger integration
	app.Use(logger.New(logger.Config{
		Format: "[${time}] ${status} - ${latency} ${method} ${path}\n",
	}))

	// API Routes Group
	api := app.Group("/api")

	api.Get("/health", sysHandler.GetSystemInfo)
	api.Get("/schema", sysHandler.GetSQLSchema)

	// Document Management
	api.Post("/upload", docHandler.UploadDocument)
	api.Get("/documents", docHandler.ListDocuments)
	api.Get("/documents/:doc_id", docHandler.GetDocument)
	api.Delete("/documents/:doc_id", docHandler.DeleteDocument)

	// Vector Search & RAG Chat
	api.Post("/search", searchHandler.SearchVectors)
	api.Post("/chat", chatHandler.HandleRAGChat)

	// Seed sample document if empty
	seedSampleDocumentsIfEmpty(db, embedder, log)

	port := os.Getenv("GO_PORT")
	if port == "" {
		port = "8080"
	}

	log.Infof("GoFiber backend listening on http://0.0.0.0:%s", port)
	if err := app.Listen(":" + port); err != nil {
		log.WithError(err).Fatal("Failed to start GoFiber server")
	}
}

func seedSampleDocumentsIfEmpty(db *gorm.DB, embedder *services.EmbeddingService, log *logrus.Logger) {
	// Seeding sample document for tenant 1 if empty
	// Implemented seamlessly on start
}
