import { sql } from "drizzle-orm";
import { pgTable, text, varchar, timestamp, integer, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const siemLogs = pgTable("siem_logs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  timestamp: timestamp("timestamp").notNull(),
  src_ip: text("src_ip").notNull(),
  dst_ip: text("dst_ip"),
  event_type: text("event_type").notNull(),
  message: text("message").notNull(),
  signature: text("signature"),
  src_service: text("src_service"),
  dst_service: text("dst_service"),
  auth_method: text("auth_method"),
  label: text("label"),
  risk_level: text("risk_level"),
  metadata: jsonb("metadata"),
});

export const conversations = pgTable("conversations", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  session_id: text("session_id").notNull(),
  user_query: text("user_query").notNull(),
  parsed_query: jsonb("parsed_query").notNull(),
  elasticsearch_dsl: text("elasticsearch_dsl").notNull(),
  result_count: integer("result_count").notNull(),
  timestamp: timestamp("timestamp").notNull().defaultNow(),
});

export const insertSiemLogSchema = createInsertSchema(siemLogs).omit({
  id: true,
});

export const insertConversationSchema = createInsertSchema(conversations).omit({
  id: true,
  timestamp: true,
});

export type InsertSiemLog = z.infer<typeof insertSiemLogSchema>;
export type SiemLog = typeof siemLogs.$inferSelect;

export type InsertConversation = z.infer<typeof insertConversationSchema>;
export type Conversation = typeof conversations.$inferSelect;

export interface ChatMessage {
  id: string;
  type: 'user' | 'assistant';
  content: string;
  timestamp: string;
  elasticsearch_dsl?: string;
  result_count?: number;
}

export interface QueryResult {
  narrative: string;
  elasticsearch_dsl: string;
  events: SiemLog[];
  chart_data: {
    source_ip: { labels: string[]; values: number[] };
    timeline: { labels: string[]; values: number[] };
  };
  stats: {
    total_events: number;
    unique_ips: number;
    high_risk_events: number;
    time_range: string;
  };
}

export interface ParsedQuery {
  intent: 'investigate' | 'report';
  time_range?: {
    start: string;
    end: string;
  };
  filters: {
    event_type?: string;
    vpn?: boolean;
    mfa?: boolean;
    suspicious?: boolean;
    ips?: string[];
    exclude_ips?: string[];
  };
  raw: string;
  context?: any;
}
