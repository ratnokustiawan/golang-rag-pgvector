package services

import (
	"math"
	"strings"
)

// ChunkConfig holds parameters for document chunking
type ChunkConfig struct {
	ChunkSize    int `json:"chunk_size"`    // Target characters per chunk (e.g., 800)
	ChunkOverlap int `json:"chunk_overlap"` // Overlap characters (e.g., 150)
}

// DefaultChunkConfig returns standard BGE-M3 RAG chunk settings
func DefaultChunkConfig() ChunkConfig {
	return ChunkConfig{
		ChunkSize:    800,
		ChunkOverlap: 150,
	}
}

// ChunkText splits raw text into overlapping semantic chunks
func ChunkText(text string, config ChunkConfig) []string {
	if config.ChunkSize <= 0 {
		config.ChunkSize = 800
	}
	if config.ChunkOverlap < 0 || config.ChunkOverlap >= config.ChunkSize {
		config.ChunkOverlap = 150
	}

	text = strings.TrimSpace(text)
	if text == "" {
		return []string{}
	}

	// Normalize newlines
	text = strings.ReplaceAll(text, "\r\n", "\n")

	// First attempt splitting by double line breaks (paragraphs)
	paragraphs := strings.Split(text, "\n\n")
	var chunks []string
	var currentChunk strings.Builder

	for _, para := range paragraphs {
		para = strings.TrimSpace(para)
		if para == "" {
			continue
		}

		if currentChunk.Len()+len(para)+2 <= config.ChunkSize {
			if currentChunk.Len() > 0 {
				currentChunk.WriteString("\n\n")
			}
			currentChunk.WriteString(para)
		} else {
			if currentChunk.Len() > 0 {
				chunks = append(chunks, currentChunk.String())
				currentChunk.Reset()
			}

			// If paragraph itself is larger than ChunkSize, split by sentence or sliding window
			if len(para) > config.ChunkSize {
				paraChunks := splitBySlidingWindow(para, config.ChunkSize, config.ChunkOverlap)
				chunks = append(chunks, paraChunks...)
			} else {
				currentChunk.WriteString(para)
			}
		}
	}

	if currentChunk.Len() > 0 {
		chunks = append(chunks, currentChunk.String())
	}

	// Fallback if no chunks generated
	if len(chunks) == 0 && len(text) > 0 {
		return splitBySlidingWindow(text, config.ChunkSize, config.ChunkOverlap)
	}

	return chunks
}

func splitBySlidingWindow(text string, size, overlap int) []string {
	var chunks []string
	step := size - overlap
	if step <= 0 {
		step = size / 2
	}

	runes := []rune(text)
	length := len(runes)

	for i := 0; i < length; i += step {
		end := i + size
		if end > length {
			end = length
		}
		chunk := string(runes[i:end])
		chunk = strings.TrimSpace(chunk)
		if len(chunk) > 0 {
			chunks = append(chunks, chunk)
		}
		if end == length {
			break
		}
	}

	return chunks
}

// EstimateTokens provides approximate token count (approx. 4 chars per token for English/Indonesian)
func EstimateTokens(text string) int {
	words := len(strings.Fields(text))
	chars := len([]rune(text))
	return int(math.Max(float64(words), float64(chars)/4.0))
}
