package database

import (
	"fmt"
	"go_backend/models"
	"os"
	"path/filepath"

	"github.com/glebarez/sqlite"
	"github.com/sirupsen/logrus"
	"gorm.io/driver/postgres"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"
)

var DB *gorm.DB

// InitDB initializes GORM with PostgreSQL (pgvector compatible) or SQLite vector storage
func InitDB(log *logrus.Logger) (*gorm.DB, error) {
	var dialector gorm.Dialector

	dbDriver := os.Getenv("DB_DRIVER")
	postgresHost := os.Getenv("POSTGRES_HOST")
	dbDSN := os.Getenv("DATABASE_URL")

	if dbDriver == "postgres" || postgresHost != "" || dbDSN != "" {
		if dbDSN == "" {
			host := os.Getenv("POSTGRES_HOST")
			if host == "" {
				host = "postgres"
			}
			user := os.Getenv("POSTGRES_USER")
			if user == "" {
				user = "postgres"
			}
			password := os.Getenv("POSTGRES_PASSWORD")
			if password == "" {
				password = "postgres_password"
			}
			dbname := os.Getenv("POSTGRES_DB")
			if dbname == "" {
				dbname = "fiber_gopher_rag"
			}
			port := os.Getenv("POSTGRES_PORT")
			if port == "" {
				port = "5432"
			}
			sslmode := os.Getenv("POSTGRES_SSLMODE")
			if sslmode == "" {
				sslmode = "disable"
			}
			dbDSN = fmt.Sprintf("host=%s user=%s password=%s dbname=%s port=%s sslmode=%s",
				host, user, password, dbname, port, sslmode)
		}
		log.WithField("driver", "postgres").Info("Connecting to PostgreSQL database...")
		dialector = postgres.Open(dbDSN)
	} else {
		dbDir := "./data"
		if err := os.MkdirAll(dbDir, 0755); err != nil {
			log.WithError(err).Warn("Failed to create data directory")
		}

		dbPath := filepath.Join(dbDir, "rag_vector.db")
		log.WithField("driver", "sqlite").WithField("path", dbPath).Info("Connecting to SQLite database...")
		dialector = sqlite.Open(dbPath)
	}

	db, err := gorm.Open(dialector, &gorm.Config{
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
