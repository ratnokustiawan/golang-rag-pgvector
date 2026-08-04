package database

import (
	"fmt"
	"go_backend/models"
	"os"
	"path/filepath"

	"github.com/glebarez/sqlite"
	"github.com/sirupsen/logrus"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"
)

var DB *gorm.DB

// InitDB initializes GORM with SQLite / pgvector vector storage compatibility
func InitDB(log *logrus.Logger) (*gorm.DB, error) {
	dbDir := "./data"
	if err := os.MkdirAll(dbDir, 0755); err != nil {
		log.WithError(err).Warn("Failed to create data directory")
	}

	dbPath := filepath.Join(dbDir, "rag_vector.db")
	log.WithField("path", dbPath).Info("Connecting to GORM database...")

	db, err := gorm.Open(sqlite.Open(dbPath), &gorm.Config{
		Logger: logger.Default.LogMode(logger.Silent),
	})
	if err != nil {
		return nil, fmt.Errorf("failed to open GORM database: %w", err)
	}

	log.Info("Running GORM AutoMigrate for Document & DocumentChunk models...")
	err = db.AutoMigrate(&models.Document{}, &models.DocumentChunk{})
	if err != nil {
		return nil, fmt.Errorf("auto-migration failed: %w", err)
	}

	DB = db
	log.Info("Database initialized successfully with GORM and vector support")
	return db, nil
}
