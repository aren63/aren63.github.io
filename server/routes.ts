import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import session from "express-session";
import { storage } from "./storage";
import { insertConversationSchema } from "@shared/schema";
import { z } from "zod";

const chatRequestSchema = z.object({
  message: z.string().min(1),
});

declare module 'express-session' {
  interface SessionData {
    conversations: any[];
  }
}

export async function registerRoutes(app: Express): Promise<Server> {
  // Session middleware
  app.use(session({
    secret: process.env.SESSION_SECRET || 'siem-nlp-secret-key',
    resave: false,
    saveUninitialized: true,
    cookie: { 
      secure: false, // Set to true in production with HTTPS
      maxAge: 24 * 60 * 60 * 1000 // 24 hours
    }
  }));

  // Get conversation history
  app.get("/api/conversations", async (req: Request, res: Response) => {
    try {
      const sessionId = req.sessionID;
      const conversations = await storage.getConversations(sessionId);
      res.json(conversations);
    } catch (error) {
      console.error('Error fetching conversations:', error);
      res.status(500).json({ error: 'Failed to fetch conversations' });
    }
  });

  // Process natural language query
  app.post("/api/chat", async (req: Request, res: Response) => {
    try {
      const { message } = chatRequestSchema.parse(req.body);
      const sessionId = req.sessionID;

      // Get conversation context
      const history = await storage.getConversations(sessionId);
      const lastConversation = history[history.length - 1];

      // Parse the natural language query
      const parsedQuery = await storage.parseNaturalLanguage(
        message, 
        lastConversation?.parsed_query
      );

      // Handle follow-up queries by merging context
      if (lastConversation && message.split(' ').length < 6) {
        const lastParsed = lastConversation.parsed_query as any;
        if (lastParsed && lastParsed.filters) {
          parsedQuery.filters = { ...lastParsed.filters, ...parsedQuery.filters };
          if (!parsedQuery.time_range && lastParsed.time_range) {
            parsedQuery.time_range = lastParsed.time_range;
          }
        }
      }

      // Generate Elasticsearch DSL
      const { dsl, filters } = await storage.generateElasticsearchDSL(parsedQuery);

      // Execute query
      const results = await storage.executeQuery(filters);
      results.elasticsearch_dsl = dsl;

      // Save conversation
      await storage.createConversation({
        session_id: sessionId,
        user_query: message,
        parsed_query: parsedQuery,
        elasticsearch_dsl: dsl,
        result_count: results.stats.total_events,
      });

      res.json({
        message,
        parsed_query: parsedQuery,
        results
      });
    } catch (error) {
      console.error('Error processing chat request:', error);
      if (error instanceof z.ZodError) {
        res.status(400).json({ error: 'Invalid request data', details: error.errors });
      } else {
        res.status(500).json({ error: 'Failed to process query' });
      }
    }
  });

  // Get SIEM logs (for debugging)
  app.get("/api/logs", async (req: Request, res: Response) => {
    try {
      const logs = await storage.getSiemLogs();
      res.json({ logs: logs.slice(0, 50) }); // Limit for performance
    } catch (error) {
      console.error('Error fetching logs:', error);
      res.status(500).json({ error: 'Failed to fetch logs' });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
