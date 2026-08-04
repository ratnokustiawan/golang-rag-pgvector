# ==========================================
# STAGE 1: Build Go Backend Binary
# ==========================================
FROM golang:1.22-alpine AS go-builder
WORKDIR /app/go_backend

# Copy Go dependency manifests and download modules
COPY go_backend/go.mod go_backend/go.sum ./
RUN go mod download

# Copy Go source code and compile optimized static binary
COPY go_backend/ ./
RUN CGO_ENABLED=0 GOOS=linux go build -ldflags="-s -w" -o server_go .

# ==========================================
# STAGE 2: Build Frontend & Node Server
# ==========================================
FROM node:20-alpine AS node-builder
WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm ci || npm install

# Copy source code and build production assets
COPY . .
RUN npm run build

# ==========================================
# STAGE 3: Production Runtime
# ==========================================
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000

# Install production dependencies only
COPY package*.json ./
RUN npm install --omit=dev

# Copy Node build artifacts
COPY --from=node-builder /app/dist ./dist

# Copy compiled Go backend binary
COPY --from=go-builder /app/go_backend/server_go ./go_backend/server_go
RUN chmod +x ./go_backend/server_go

EXPOSE 3000

CMD ["npm", "start"]
