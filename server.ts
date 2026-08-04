import express from "express";
import path from "path";
import { spawn, ChildProcess } from "child_process";
import { createProxyMiddleware } from "http-proxy-middleware";
import { createServer as createViteServer } from "vite";
import fs from "fs";

let goProcess: ChildProcess | null = null;

function startGoBackend() {
  if (process.env.SKIP_GO_SPAWN === "true") {
    console.log("[Node Server] SKIP_GO_SPAWN is set to true. Skipping Go process spawning.");
    return;
  }

  const goBackendDir = path.join(process.cwd(), "go_backend");
  const binaryPath = path.join(goBackendDir, "server_go");

  let goExec = "go";
  if (fs.existsSync("/tmp/go/bin/go")) {
    goExec = "/tmp/go/bin/go";
  } else if (fs.existsSync("/usr/local/go/bin/go")) {
    goExec = "/usr/local/go/bin/go";
  }

  if (!fs.existsSync(binaryPath)) {
    console.log("[Node Server] Compiling GoFiber backend with Go compiler...");
    try {
      require("child_process").execSync(`${goExec} build -o server_go .`, {
        cwd: goBackendDir,
        stdio: "inherit",
      });
    } catch (err) {
      console.error("[Node Server] Go build failed:", err);
    }
  }

  console.log("[Node Server] Spawning GoFiber backend on Port 8081...");
  const execPath = fs.existsSync(binaryPath) ? binaryPath : goExec;
  const goArgs = fs.existsSync(binaryPath) ? [] : ["run", "."];

  const goBinDir = path.dirname(goExec);
  const currentPath = process.env.PATH || "";

  goProcess = spawn(execPath, goArgs, {
    cwd: goBackendDir,
    env: {
      ...process.env,
      GO_PORT: "8081",
      PATH: `${goBinDir}:${currentPath}`,
    },
    stdio: "inherit",
  });

  goProcess.on("error", (err) => {
    console.error("[Node Server] Failed to start Go process:", err);
  });

  goProcess.on("exit", (code) => {
    console.log(`[Node Server] Go process exited with code ${code}`);
  });
}

async function startServer() {
  const app = express();
  const PORT = 3000;
  const targetBackend = process.env.GO_BACKEND_TARGET || "http://127.0.0.1:8081";

  // Start GoFiber backend on port 8081
  startGoBackend();

  // Proxy /api requests directly to GoFiber backend
  app.use(
    "/api",
    createProxyMiddleware({
      target: targetBackend,
      changeOrigin: true,
      pathRewrite: (pathStr) => {
        return pathStr.startsWith("/api") ? pathStr : "/api" + pathStr;
      },
      on: {
        error: (err, req, res: any) => {
          console.error("[Proxy Error] GoFiber backend unavailable:", err.message);
          if (res && typeof res.status === "function") {
            res.status(503).json({
              error: "GoFiber Backend Services initializing...",
              details: err.message,
            });
          }
        },
      },
    })
  );

  // Vite middleware for frontend development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`[Fullstack Server] Unified server listening on http://0.0.0.0:${PORT}`);
  });
}

process.on("SIGINT", () => {
  if (goProcess) goProcess.kill();
  process.exit();
});

process.on("SIGTERM", () => {
  if (goProcess) goProcess.kill();
  process.exit();
});

startServer();
