# ==========================================
# Dockerfile for GoBackend Service
# ==========================================
FROM golang:1.26-alpine AS builder
WORKDIR /app

# Copy Go module dependency definitions
COPY go.mod go.sum ./
RUN go mod download

# Copy source code and build statically linked binary
COPY . .
RUN CGO_ENABLED=0 GOOS=linux go build -ldflags="-s -w" -o server_go .

# Runtime Stage
FROM alpine:3.19
WORKDIR /app
RUN apk --no-cache add ca-certificates

COPY --from=builder /app/server_go .

EXPOSE 8081

CMD ["./server_go"]
