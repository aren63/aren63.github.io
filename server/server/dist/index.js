// index.ts
import express2 from "express";

// routes.ts
import { createServer } from "http";
import session from "express-session";

// storage.ts
import { randomUUID } from "crypto";
import fs from "fs";
import path from "path";
var MemStorage = class {
  siemLogs = [];
  conversations = /* @__PURE__ */ new Map();
  constructor() {
    this.loadMockData();
  }
  loadMockData() {
    try {
      const mockDataPath = path.resolve(process.cwd(), "mock_data.json");
      if (fs.existsSync(mockDataPath)) {
        const data = JSON.parse(fs.readFileSync(mockDataPath, "utf-8"));
        this.siemLogs = data.map((log2) => {
          let normalizedEventType = log2.event_type;
          switch (log2.event_type) {
            case "login_failed":
              normalizedEventType = "failed_login";
              break;
            case "login_success":
              normalizedEventType = "successful_login";
              break;
            case "malware_detected":
              normalizedEventType = "malware";
              break;
            case "vpn_access":
              normalizedEventType = "vpn_connection";
              break;
            case "suspicious_activity":
              normalizedEventType = "suspicious";
              break;
          }
          let riskLevel = "low";
          if (log2.label === "high_risk") {
            riskLevel = "high";
          } else if (log2.label === "suspicious") {
            riskLevel = "medium";
          }
          let srcService = null;
          let dstService = null;
          if (log2.event_type === "vpn_access") {
            srcService = "vpn";
            dstService = "vpn";
          }
          let authMethod = null;
          if (log2.signature && log2.signature.toLowerCase().includes("mfa")) {
            authMethod = "mfa";
          } else if (log2.details && (log2.details.toLowerCase().includes("multi-factor") || log2.details.toLowerCase().includes("mfa"))) {
            authMethod = "mfa";
          }
          return {
            id: randomUUID(),
            timestamp: new Date(log2["@timestamp"]),
            src_ip: log2.source_ip,
            dst_ip: log2.destination_ip,
            event_type: normalizedEventType,
            message: log2.details,
            signature: log2.signature,
            src_service: srcService,
            dst_service: dstService,
            auth_method: authMethod,
            username: log2.username,
            label: log2.label,
            risk_level: riskLevel,
            metadata: null
          };
        });
      }
    } catch (error) {
      console.error("Failed to load mock data:", error);
    }
  }
  async getSiemLogs() {
    return this.siemLogs;
  }
  async filterSiemLogs(filters) {
    let results = [...this.siemLogs];
    for (const [filterType, value] of filters) {
      switch (filterType) {
        case "time":
          const start = new Date(value.start);
          const end = new Date(value.end);
          const isFullTimestamp = value.end.includes("T");
          if (!isFullTimestamp) {
            end.setDate(end.getDate() + 1);
          }
          results = results.filter((log2) => {
            const logTime = new Date(log2.timestamp);
            return logTime >= start && logTime < end;
          });
          break;
        case "event_type":
          results = results.filter((log2) => log2.event_type === value);
          break;
        case "vpn":
          results = results.filter(
            (log2) => log2.src_service === "vpn" || log2.dst_service === "vpn"
          );
          break;
        case "ips":
          results = results.filter(
            (log2) => value.includes(log2.src_ip) || value.includes(log2.dst_ip)
          );
          break;
        case "exclude_ips":
          results = results.filter(
            (log2) => !value.includes(log2.src_ip) && !value.includes(log2.dst_ip)
          );
          break;
        case "mfa":
          results = results.filter((log2) => log2.auth_method === "mfa");
          break;
        case "suspicious":
          results = results.filter((log2) => log2.label === "suspicious");
          break;
        case "username":
          results = results.filter((log2) => log2.username === value);
          break;
      }
    }
    return results;
  }
  async getConversations(sessionId) {
    return this.conversations.get(sessionId) || [];
  }
  async createConversation(conversation) {
    const newConversation = {
      ...conversation,
      id: randomUUID(),
      timestamp: /* @__PURE__ */ new Date()
    };
    const existing = this.conversations.get(conversation.session_id) || [];
    existing.push(newConversation);
    this.conversations.set(conversation.session_id, existing);
    return newConversation;
  }
  async parseNaturalLanguage(query, context) {
    const text = query.toLowerCase();
    const parsed = {
      intent: "investigate",
      filters: {},
      raw: query
    };
    if (["summary", "report", "generate a summary", "chart", "graphs", "monthly report"].some((w) => text.includes(w))) {
      parsed.intent = "report";
    }
    const now = /* @__PURE__ */ new Date();
    if (text.includes("yesterday")) {
      const yesterday = new Date(now);
      yesterday.setDate(yesterday.getDate() - 1);
      parsed.time_range = {
        start: yesterday.toISOString().split("T")[0],
        end: yesterday.toISOString().split("T")[0]
      };
    } else if (text.includes("today")) {
      parsed.time_range = {
        start: now.toISOString().split("T")[0],
        end: now.toISOString().split("T")[0]
      };
    } else if (text.includes("past week")) {
      const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1e3);
      parsed.time_range = {
        start: weekAgo.toISOString(),
        end: now.toISOString()
      };
    } else if (text.includes("last week")) {
      const dayOfWeek = now.getDay();
      const daysToLastMonday = dayOfWeek === 0 ? 13 : dayOfWeek + 6;
      const lastMonday = new Date(now);
      lastMonday.setDate(lastMonday.getDate() - daysToLastMonday);
      lastMonday.setHours(0, 0, 0, 0);
      const lastSunday = new Date(lastMonday);
      lastSunday.setDate(lastSunday.getDate() + 6);
      lastSunday.setHours(23, 59, 59, 999);
      parsed.time_range = {
        start: lastMonday.toISOString().split("T")[0],
        end: lastSunday.toISOString().split("T")[0]
      };
    } else if (text.includes("this week")) {
      const dayOfWeek = now.getDay();
      const daysToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
      const thisMonday = new Date(now);
      thisMonday.setDate(thisMonday.getDate() - daysToMonday);
      thisMonday.setHours(0, 0, 0, 0);
      parsed.time_range = {
        start: thisMonday.toISOString().split("T")[0],
        end: now.toISOString().split("T")[0]
      };
    } else if (text.includes("past month")) {
      const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1e3);
      parsed.time_range = {
        start: monthAgo.toISOString(),
        end: now.toISOString()
      };
    } else if (text.includes("last month")) {
      const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0);
      parsed.time_range = {
        start: lastMonth.toISOString().split("T")[0],
        end: endOfLastMonth.toISOString().split("T")[0]
      };
    } else if (text.includes("this month")) {
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      parsed.time_range = {
        start: startOfMonth.toISOString().split("T")[0],
        end: now.toISOString().split("T")[0]
      };
    } else if (text.includes("last 24 hours") || text.includes("past 24 hours")) {
      const dayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1e3);
      parsed.time_range = {
        start: dayAgo.toISOString(),
        end: now.toISOString()
      };
    }
    if (text.includes("failed login") || text.includes("failed logins") || text.includes("authentication failure") || text.includes("auth failure") || text.includes("login failure") || text.includes("failed authentication") || text.includes("invalid credentials") || text.includes("bad password")) {
      parsed.filters.event_type = "failed_login";
    }
    if (text.includes("successful login") || text.includes("successful logins") || text.includes("login success") || text.includes("successful authentication") || text.includes("valid login") || text.includes("authenticated user")) {
      parsed.filters.event_type = "successful_login";
    }
    if (text.includes("vpn") || text.includes("remote access") || text.includes("vpn connection") || text.includes("vpn session")) {
      parsed.filters.vpn = true;
    }
    if (text.includes("mfa") || text.includes("multi-factor") || text.includes("two-factor") || text.includes("2fa")) {
      parsed.filters.mfa = true;
    }
    if (text.includes("malware") || text.includes("malicious") || text.includes("virus") || text.includes("trojan") || text.includes("ransomware") || text.includes("threat") || text.includes("infection") || text.includes("malware detection") || text.includes("malware alert")) {
      parsed.filters.event_type = "malware";
    }
    if (text.includes("suspicious") || text.includes("unusual") || text.includes("anomaly") || text.includes("anomalous")) {
      parsed.filters.suspicious = true;
    }
    const ipRegex = /\b(\d{1,3}(?:\.\d{1,3}){3})\b/g;
    const ips = text.match(ipRegex);
    if (ips) {
      parsed.filters.ips = ips;
    }
    const excludeMatch = text.match(/exclude\s+([0-9\.]+)/g);
    if (excludeMatch) {
      parsed.filters.exclude_ips = excludeMatch.map((m) => m.replace("exclude ", ""));
    }
    let userMatch = text.match(/(?:user(?:name)?\s*[:=]?\s*)([A-Za-z][\w.\-]+)/i);
    if (!userMatch) {
      userMatch = text.match(/\bfor\s+([A-Za-z][\w.\-]+)\b/i);
    }
    if (userMatch) {
      const potentialUser = userMatch[1];
      const ipRegex2 = /^\d{1,3}(\.\d{1,3}){3}$/;
      if (!ipRegex2.test(potentialUser)) {
        parsed.filters.username = potentialUser;
      }
    }
    if (text.includes("how many") || text.includes("count") || text.includes("number of") || text.includes("total") || text.includes("statistics") || text.includes("stats")) {
      parsed.intent = "report";
    }
    if (context) {
      parsed.context = context;
    }
    return parsed;
  }
  async generateElasticsearchDSL(parsed) {
    const clauses = [];
    const filters = [];
    if (parsed.time_range) {
      const isFullTimestamp = parsed.time_range.end.includes("T");
      let endValue = parsed.time_range.end;
      if (!isFullTimestamp) {
        const endDate = new Date(parsed.time_range.end);
        endDate.setDate(endDate.getDate() + 1);
        endValue = endDate.toISOString().split("T")[0];
        clauses.push(`"range": { "@timestamp": { "gte": "${parsed.time_range.start}", "lt": "${endValue}" } }`);
      } else {
        clauses.push(`"range": { "@timestamp": { "gte": "${parsed.time_range.start}", "lt": "${endValue}" } }`);
      }
      filters.push(["time", parsed.time_range]);
    }
    if (parsed.filters.event_type) {
      clauses.push(`"term": { "event_type": "${parsed.filters.event_type}" }`);
      filters.push(["event_type", parsed.filters.event_type]);
    }
    if (parsed.filters.vpn) {
      clauses.push(`"bool": { "should": [{ "term": { "src_service": "vpn" } }, { "term": { "dst_service": "vpn" } }] }`);
      filters.push(["vpn", true]);
    }
    if (parsed.filters.mfa) {
      clauses.push(`"term": { "auth_method": "mfa" }`);
      filters.push(["mfa", true]);
    }
    if (parsed.filters.suspicious) {
      clauses.push(`"term": { "label": "suspicious" }`);
      filters.push(["suspicious", true]);
    }
    if (parsed.filters.username) {
      clauses.push(`"term": { "username": "${parsed.filters.username}" }`);
      filters.push(["username", parsed.filters.username]);
    }
    if (parsed.filters.ips) {
      clauses.push(`"bool": { "should": [{ "terms": { "src_ip": ${JSON.stringify(parsed.filters.ips)} } }, { "terms": { "dst_ip": ${JSON.stringify(parsed.filters.ips)} } }] }`);
      filters.push(["ips", parsed.filters.ips]);
    }
    if (parsed.filters.exclude_ips) {
      clauses.push(`"bool": { "must_not": [{ "terms": { "src_ip": ${JSON.stringify(parsed.filters.exclude_ips)} } }, { "terms": { "dst_ip": ${JSON.stringify(parsed.filters.exclude_ips)} } }] }`);
      filters.push(["exclude_ips", parsed.filters.exclude_ips]);
    }
    const dsl = `{
  "query": {
    "bool": {
      "must": [
        ${clauses.map((c) => `{ ${c} }`).join(",\n        ")}
      ]
    }
  }
}`;
    return { dsl, filters };
  }
  async executeQuery(filters) {
    const filteredLogs = await this.filterSiemLogs(filters);
    const uniqueIps = new Set(filteredLogs.map((log2) => log2.src_ip)).size;
    const highRiskEvents = filteredLogs.filter((log2) => log2.risk_level === "high").length;
    const ipCounts = filteredLogs.reduce((acc, log2) => {
      acc[log2.src_ip] = (acc[log2.src_ip] || 0) + 1;
      return acc;
    }, {});
    const topIps = Object.entries(ipCounts).sort(([, a], [, b]) => b - a).slice(0, 5);
    const userCounts = filteredLogs.reduce((acc, log2) => {
      if (log2.username) {
        acc[log2.username] = (acc[log2.username] || 0) + 1;
      }
      return acc;
    }, {});
    const topUsers = Object.entries(userCounts).sort(([, a], [, b]) => b - a).slice(0, 5);
    const uniqueUsers = new Set(filteredLogs.map((log2) => log2.username).filter(Boolean)).size;
    const timelineCounts = filteredLogs.reduce((acc, log2) => {
      try {
        if (log2.timestamp) {
          const logDate = new Date(log2.timestamp);
          if (!isNaN(logDate.getTime())) {
            const hour = logDate.toISOString().split("T")[1].split(":")[0];
            const timeKey = `${hour}:00`;
            acc[timeKey] = (acc[timeKey] || 0) + 1;
          }
        }
      } catch (error) {
        console.warn("Invalid timestamp in log:", log2.id, log2.timestamp);
      }
      return acc;
    }, {});
    const narrative = filteredLogs.length > 0 ? `Found ${filteredLogs.length} matching security events. Analysis shows ${highRiskEvents} high-risk events from ${uniqueIps} unique source IPs.` : "No events found matching the specified criteria.";
    return {
      narrative,
      elasticsearch_dsl: "",
      // Will be filled by the route
      events: filteredLogs.slice(0, 20),
      // Limit to first 20 for display
      chart_data: {
        source_ip: {
          labels: topIps.map(([ip]) => ip),
          values: topIps.map(([, count]) => count)
        },
        timeline: {
          labels: Object.keys(timelineCounts).sort(),
          values: Object.keys(timelineCounts).sort().map((key) => timelineCounts[key] || 0)
        },
        users: {
          labels: topUsers.map(([user]) => user),
          values: topUsers.map(([, count]) => count)
        }
      },
      stats: {
        total_events: filteredLogs.length,
        unique_ips: uniqueIps,
        unique_users: uniqueUsers,
        high_risk_events: highRiskEvents,
        time_range: filters.find(([type]) => type === "time")?.[1] ? `${filters.find(([type]) => type === "time")[1].start} to ${filters.find(([type]) => type === "time")[1].end}` : "All time"
      }
    };
  }
};
var storage = new MemStorage();

// routes.ts
import { z } from "zod";
var chatRequestSchema = z.object({
  message: z.string().min(1)
});
async function registerRoutes(app2) {
  app2.use(session({
    secret: process.env.SESSION_SECRET || "siem-nlp-secret-key",
    resave: false,
    saveUninitialized: true,
    cookie: {
      secure: false,
      // Set to true in production with HTTPS
      maxAge: 24 * 60 * 60 * 1e3
      // 24 hours
    }
  }));
  app2.get("/api/conversations", async (req, res) => {
    try {
      const sessionId = req.sessionID;
      const conversations = await storage.getConversations(sessionId);
      res.json(conversations);
    } catch (error) {
      console.error("Error fetching conversations:", error);
      res.status(500).json({ error: "Failed to fetch conversations" });
    }
  });
  app2.post("/api/chat", async (req, res) => {
    try {
      const { message } = chatRequestSchema.parse(req.body);
      const sessionId = req.sessionID;
      const history = await storage.getConversations(sessionId);
      const lastConversation = history[history.length - 1];
      const parsedQuery = await storage.parseNaturalLanguage(
        message,
        lastConversation?.parsed_query
      );
      if (lastConversation && message.split(" ").length < 6) {
        const lastParsed = lastConversation.parsed_query;
        if (lastParsed && lastParsed.filters) {
          parsedQuery.filters = { ...lastParsed.filters, ...parsedQuery.filters };
          if (!parsedQuery.time_range && lastParsed.time_range) {
            parsedQuery.time_range = lastParsed.time_range;
          }
        }
      }
      const { dsl, filters } = await storage.generateElasticsearchDSL(parsedQuery);
      const results = await storage.executeQuery(filters);
      results.elasticsearch_dsl = dsl;
      await storage.createConversation({
        session_id: sessionId,
        user_query: message,
        parsed_query: parsedQuery,
        elasticsearch_dsl: dsl,
        result_count: results.stats.total_events
      });
      res.json({
        message,
        parsed_query: parsedQuery,
        results
      });
    } catch (error) {
      console.error("Error processing chat request:", error);
      if (error instanceof z.ZodError) {
        res.status(400).json({ error: "Invalid request data", details: error.errors });
      } else {
        res.status(500).json({ error: "Failed to process query" });
      }
    }
  });
  app2.get("/api/logs", async (req, res) => {
    try {
      const logs = await storage.getSiemLogs();
      res.json({ logs: logs.slice(0, 50) });
    } catch (error) {
      console.error("Error fetching logs:", error);
      res.status(500).json({ error: "Failed to fetch logs" });
    }
  });
  const httpServer = createServer(app2);
  return httpServer;
}

// vite.ts
import express from "express";
import fs2 from "fs";
import path3 from "path";
import { createServer as createViteServer, createLogger } from "vite";

// ../vite.config.ts
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path2 from "path";
import runtimeErrorOverlay from "@replit/vite-plugin-runtime-error-modal";
var vite_config_default = defineConfig({
  plugins: [
    react(),
    runtimeErrorOverlay(),
    ...process.env.NODE_ENV !== "production" && process.env.REPL_ID !== void 0 ? [
      await import("@replit/vite-plugin-cartographer").then(
        (m) => m.cartographer()
      ),
      await import("@replit/vite-plugin-dev-banner").then(
        (m) => m.devBanner()
      )
    ] : []
  ],
  resolve: {
    alias: {
      "@": path2.resolve(import.meta.dirname, "client", "src"),
      "@shared": path2.resolve(import.meta.dirname, "shared"),
      "@assets": path2.resolve(import.meta.dirname, "attached_assets")
    }
  },
  root: path2.resolve(import.meta.dirname, "client"),
  build: {
    outDir: path2.resolve(import.meta.dirname, "dist/public"),
    emptyOutDir: true
  },
  server: {
    fs: {
      strict: true,
      deny: ["**/.*"]
    }
  }
});

// vite.ts
import { nanoid } from "nanoid";
var viteLogger = createLogger();
function log(message, source = "express") {
  const formattedTime = (/* @__PURE__ */ new Date()).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true
  });
  console.log(`${formattedTime} [${source}] ${message}`);
}
async function setupVite(app2, server) {
  const serverOptions = {
    middlewareMode: true,
    hmr: { server },
    allowedHosts: true
  };
  const vite = await createViteServer({
    ...vite_config_default,
    configFile: false,
    customLogger: {
      ...viteLogger,
      error: (msg, options) => {
        viteLogger.error(msg, options);
        process.exit(1);
      }
    },
    server: serverOptions,
    appType: "custom"
  });
  app2.use(vite.middlewares);
  app2.use("*", async (req, res, next) => {
    const url = req.originalUrl;
    try {
      const clientTemplate = path3.resolve(
        import.meta.dirname,
        "..",
        "client",
        "index.html"
      );
      let template = await fs2.promises.readFile(clientTemplate, "utf-8");
      template = template.replace(
        `src="/src/main.tsx"`,
        `src="/src/main.tsx?v=${nanoid()}"`
      );
      const page = await vite.transformIndexHtml(url, template);
      res.status(200).set({ "Content-Type": "text/html" }).end(page);
    } catch (e) {
      vite.ssrFixStacktrace(e);
      next(e);
    }
  });
}
function serveStatic(app2) {
  const distPath = path3.resolve(import.meta.dirname, "public");
  if (!fs2.existsSync(distPath)) {
    throw new Error(
      `Could not find the build directory: ${distPath}, make sure to build the client first`
    );
  }
  app2.use(express.static(distPath));
  app2.use("*", (_req, res) => {
    res.sendFile(path3.resolve(distPath, "index.html"));
  });
}

// index.ts
var app = express2();
app.use(express2.json());
app.use(express2.urlencoded({ extended: false }));
app.use((req, res, next) => {
  const start = Date.now();
  const path4 = req.path;
  let capturedJsonResponse = void 0;
  const originalResJson = res.json;
  res.json = function(bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };
  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path4.startsWith("/api")) {
      let logLine = `${req.method} ${path4} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }
      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "\u2026";
      }
      log(logLine);
    }
  });
  next();
});
(async () => {
  const server = await registerRoutes(app);
  app.use((err, _req, res, _next) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";
    res.status(status).json({ message });
    throw err;
  });
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }
  const port = parseInt(process.env.PORT || "5000", 10);
  server.listen({
    port,
    host: "0.0.0.0",
    reusePort: true
  }, () => {
    log(`serving on port ${port}`);
  });
})();
