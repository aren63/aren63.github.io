export interface ChatMessage {
  id: string;
  type: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  elasticsearch_dsl?: string;
  result_count?: number;
  results?: QueryResult;
}

export interface QueryResult {
  narrative: string;
  elasticsearch_dsl: string;
  events: SiemLog[];
  chart_data: {
    source_ip: { labels: string[]; values: number[] };
    timeline: { labels: string[]; values: number[] };
    users: { labels: string[]; values: number[] };
  };
  stats: {
    total_events: number;
    unique_ips: number;
    unique_users: number;
    high_risk_events: number;
    time_range: string;
  };
}

export interface SiemLog {
  id: string;
  timestamp: string;
  src_ip: string;
  dst_ip?: string;
  event_type: string;
  message: string;
  signature?: string;
  src_service?: string;
  dst_service?: string;
  auth_method?: string;
  username?: string;
  label?: string;
  risk_level?: string;
  metadata?: any;
}

export interface ChatResponse {
  message: string;
  parsed_query: any;
  results: QueryResult;
}
