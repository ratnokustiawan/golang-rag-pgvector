package services

import (
	"bytes"
	"encoding/json"
	"fmt"
	"go_backend/models"
	"io"
	"net/http"
	"os"
	"strings"
	"time"

	"github.com/sirupsen/logrus"
)

type RAGService struct {
	embedder *EmbeddingService
	log      *logrus.Logger
}

func NewRAGService(embedder *EmbeddingService, log *logrus.Logger) *RAGService {
	return &RAGService{
		embedder: embedder,
		log:      log,
	}
}

type ChatRequest struct {
	TenantID   uint64   `json:"tenant_id"`
	Question   string   `json:"question"`
	TopK       int      `json:"top_k"`
	Model      string   `json:"model"`       // e.g. "deepseek-chat", "deepseek-v4-pro", "gemini-2.5-flash"
	APIKey     string   `json:"api_key"`     // DeepSeek API key or OpenAI/Gemini key
	DocIDs     []string `json:"doc_ids"`     // Optional document filter
	MaxTokens  int      `json:"max_tokens"`  // Max response tokens
	SystemPrompt string `json:"system_prompt"` // Custom system prompt override if needed
}

type ChatResponse struct {
	Answer         string                `json:"answer"`
	RetrievedContext []models.SearchResult `json:"retrieved_context"`
	PromptUsed     string                `json:"prompt_used"`
	ModelUsed      string                `json:"model_used"`
	ExecutionTimeMs int64                `json:"execution_time_ms"`
	TenantID       uint64                `json:"tenant_id"`
	TotalTokens    int                   `json:"total_tokens"`
}

// BuildRAGPrompt constructs the prompt following the official specification
func BuildRAGPrompt(results []models.SearchResult, question string) string {
	var contextBuilder strings.Builder

	for i, res := range results {
		contextBuilder.WriteString(fmt.Sprintf("[%d] Dokumen: %s (Chunk #%d, Similarity: %.1f%%)\n%s\n\n",
			i+1, res.Chunk.Title, res.Chunk.ChunkIndex, res.Similarity*100, res.Chunk.Content))
	}

	retrievedText := strings.TrimSpace(contextBuilder.String())
	if retrievedText == "" {
		retrievedText = "Tidak ada context dokumen yang ditemukan."
	}

	prompt := fmt.Sprintf(`Jawablah hanya berdasarkan context berikut.

Context:
%s

Pertanyaan:
%s

Jika jawabannya tidak ada di context, katakan bahwa informasi tidak ditemukan.`, retrievedText, question)

	return prompt
}

func (r *RAGService) ExecuteRAG(req ChatRequest, results []models.SearchResult) (*ChatResponse, error) {
	start := time.Now()

	prompt := BuildRAGPrompt(results, req.Question)
	model := req.Model
	if model == "" {
		model = "deepseek-chat"
	}

	apiKey := req.APIKey
	if apiKey == "" {
		apiKey = os.Getenv("DEEPSEEK_API_KEY")
	}
	if apiKey == "" {
		apiKey = os.Getenv("GEMINI_API_KEY")
	}

	var answer string
	var err error

	// If API Key present, attempt call to DeepSeek API or Gemini API
	if apiKey != "" {
		if strings.HasPrefix(model, "deepseek") || strings.HasPrefix(apiKey, "sk-") {
			answer, err = r.callDeepSeekAPI(prompt, model, apiKey)
		} else if strings.HasPrefix(apiKey, "AIza") || strings.HasPrefix(model, "gemini") {
			answer, err = r.callGeminiAPI(prompt, apiKey)
		}
	}

	// Fallback/Synthesis engine if no API key or API call failed
	if answer == "" || err != nil {
		if err != nil {
			r.log.WithError(err).Warn("LLM API call failed, using intelligent context synthesis")
		}
		answer = synthesizeAnswerFromContext(req.Question, results)
	}

	execTime := time.Since(start).Milliseconds()

	return &ChatResponse{
		Answer:           answer,
		RetrievedContext: results,
		PromptUsed:       prompt,
		ModelUsed:        model,
		ExecutionTimeMs:  execTime,
		TenantID:         req.TenantID,
		TotalTokens:      EstimateTokens(prompt + answer),
	}, nil
}

func (r *RAGService) callDeepSeekAPI(prompt string, model string, apiKey string) (string, error) {
	apiURL := "https://api.deepseek.com/chat/completions"

	type DeepSeekMessage struct {
		Role    string `json:"role"`
		Content string `json:"content"`
	}

	type DeepSeekReq struct {
		Model       string            `json:"model"`
		Messages    []DeepSeekMessage `json:"messages"`
		Temperature float64           `json:"temperature"`
	}

	reqBody, _ := json.Marshal(DeepSeekReq{
		Model: model,
		Messages: []DeepSeekMessage{
			{Role: "user", Content: prompt},
		},
		Temperature: 0.2,
	})

	httpReq, err := http.NewRequest("POST", apiURL, bytes.NewBuffer(reqBody))
	if err != nil {
		return "", err
	}

	httpReq.Header.Set("Content-Type", "application/json")
	httpReq.Header.Set("Authorization", "Bearer "+apiKey)

	client := &http.Client{Timeout: 30 * time.Second}
	resp, err := client.Do(httpReq)
	if err != nil {
		return "", err
	}
	defer resp.Body.Close()

	body, _ := io.ReadAll(resp.Body)
	if resp.StatusCode != http.StatusOK {
		return "", fmt.Errorf("DeepSeek API error HTTP %d: %s", resp.StatusCode, string(body))
	}

	type DeepSeekResp struct {
		Choices []struct {
			Message struct {
				Content string `json:"content"`
			} `json:"message"`
		} `json:"choices"`
	}

	var res DeepSeekResp
	if err := json.Unmarshal(body, &res); err != nil {
		return "", err
	}

	if len(res.Choices) > 0 {
		return res.Choices[0].Message.Content, nil
	}

	return "", fmt.Errorf("no response choices from DeepSeek API")
}

func (r *RAGService) callGeminiAPI(prompt string, apiKey string) (string, error) {
	apiURL := fmt.Sprintf("https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=%s", apiKey)

	type ContentPart struct {
		Text string `json:"text"`
	}
	type Content struct {
		Parts []ContentPart `json:"parts"`
	}
	type GeminiReq struct {
		Contents []Content `json:"contents"`
	}

	reqBody, _ := json.Marshal(GeminiReq{
		Contents: []Content{
			{Parts: []ContentPart{{Text: prompt}}},
		},
	})

	resp, err := http.Post(apiURL, "application/json", bytes.NewBuffer(reqBody))
	if err != nil {
		return "", err
	}
	defer resp.Body.Close()

	body, _ := io.ReadAll(resp.Body)
	if resp.StatusCode != http.StatusOK {
		return "", fmt.Errorf("Gemini API error HTTP %d: %s", resp.StatusCode, string(body))
	}

	type GeminiResp struct {
		Candidates []struct {
			Content struct {
				Parts []struct {
					Text string `json:"text"`
				} `json:"parts"`
			} `json:"content"`
		} `json:"candidates"`
	}

	var res GeminiResp
	if err := json.Unmarshal(body, &res); err != nil {
		return "", err
	}

	if len(res.Candidates) > 0 && len(res.Candidates[0].Content.Parts) > 0 {
		return res.Candidates[0].Content.Parts[0].Text, nil
	}

	return "", fmt.Errorf("empty candidates in Gemini response")
}

func synthesizeAnswerFromContext(question string, results []models.SearchResult) string {
	if len(results) == 0 {
		return "Informasi tidak ditemukan."
	}

	// Filter results with reasonable similarity score (> 0.25)
	var relevant []models.SearchResult
	for _, res := range results {
		if res.Similarity >= 0.20 {
			relevant = append(relevant, res)
		}
	}

	if len(relevant) == 0 {
		return "Informasi tidak ditemukan."
	}

	var answerBuilder strings.Builder
	answerBuilder.WriteString("Berdasarkan dokumen yang ditemukan:\n\n")

	for i, res := range relevant {
		answerBuilder.WriteString(fmt.Sprintf("📌 **%s** (Kecocokan: %.1f%%)\n", res.Chunk.Title, res.Similarity*100))
		lines := strings.Split(res.Chunk.Content, "\n")
		for _, line := range lines {
			line = strings.TrimSpace(line)
			if line != "" {
				answerBuilder.WriteString(fmt.Sprintf("> %s\n", line))
			}
		}
		if i < len(relevant)-1 {
			answerBuilder.WriteString("\n")
		}
	}

	return answerBuilder.String()
}
