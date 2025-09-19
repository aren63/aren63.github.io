import { type SiemLog, type InsertSiemLog, type Conversation, type InsertConversation, type QueryResult, type ParsedQuery } from "@shared/schema";
import { randomUUID } from "crypto";
import fs from "fs";
import path from "path";

export interface IStorage {
  // SIEM logs
  getSiemLogs(): Promise<SiemLog[]>;
  filterSiemLogs(filters: any[]): Promise<SiemLog[]>;
  
  // Conversations
  getConversations(sessionId: string): Promise<Conversation[]>;
  createConversation(conversation: InsertConversation): Promise<Conversation>;
  
  // NLP and query processing
  parseNaturalLanguage(query: string, context?: any): Promise<ParsedQuery>;
  generateElasticsearchDSL(parsed: ParsedQuery): Promise<{ dsl: string; filters: any[] }>;
  executeQuery(filters: any[]): Promise<QueryResult>;
}

export class MemStorage implements IStorage {
  private siemLogs: SiemLog[] = [];
  private conversations: Map<string, Conversation[]> = new Map();

  constructor() {
    this.loadMockData();
  }

  private loadMockData() {
    try {
      const mockDataPath = path.resolve(process.cwd(), 'mock_data.json');
      if (fs.existsSync(mockDataPath)) {
        const data = JSON.parse(fs.readFileSync(mockDataPath, 'utf-8'));
        this.siemLogs = data.map((log: any) => {
          // Normalize event types
          let normalizedEventType = log.event_type;
          switch (log.event_type) {
            case 'login_failed':
              normalizedEventType = 'failed_login';
              break;
            case 'login_success':
              normalizedEventType = 'successful_login';
              break;
            case 'malware_detected':
              normalizedEventType = 'malware';
              break;
            case 'vpn_access':
              normalizedEventType = 'vpn_connection';
              break;
            case 'suspicious_activity':
              normalizedEventType = 'suspicious';
              break;
          }

          // Derive risk level from label
          let riskLevel = 'low';
          if (log.label === 'high_risk') {
            riskLevel = 'high';
          } else if (log.label === 'suspicious') {
            riskLevel = 'medium';
          }

          // Set VPN service flags
          let srcService = null;
          let dstService = null;
          if (log.event_type === 'vpn_access') {
            srcService = 'vpn';
            dstService = 'vpn';
          }

          // Set auth_method for MFA
          let authMethod = null;
          if (log.signature && log.signature.toLowerCase().includes('mfa')) {
            authMethod = 'mfa';
          } else if (log.details && (log.details.toLowerCase().includes('multi-factor') || log.details.toLowerCase().includes('mfa'))) {
            authMethod = 'mfa';
          }

          return {
            id: randomUUID(),
            timestamp: new Date(log['@timestamp']),
            src_ip: log.source_ip,
            dst_ip: log.destination_ip,
            event_type: normalizedEventType,
            message: log.details,
            signature: log.signature,
            src_service: srcService,
            dst_service: dstService,
            auth_method: authMethod,
            username: log.username,
            label: log.label,
            risk_level: riskLevel,
            metadata: null,
          };
        });
      }
    } catch (error) {
      console.error('Failed to load mock data:', error);
    }
  }

  async getSiemLogs(): Promise<SiemLog[]> {
    return this.siemLogs;
  }

  async filterSiemLogs(filters: any[]): Promise<SiemLog[]> {
    let results = [...this.siemLogs];
    
    for (const [filterType, value] of filters) {
      switch (filterType) {
        case 'time':
          const start = new Date(value.start);
          const end = new Date(value.end);
          end.setDate(end.getDate() + 1); // Include full end day
          results = results.filter(log => {
            const logTime = new Date(log.timestamp);
            return logTime >= start && logTime < end;
          });
          break;
        case 'event_type':
          results = results.filter(log => log.event_type === value);
          break;
        case 'vpn':
          results = results.filter(log => 
            log.src_service === 'vpn' || log.dst_service === 'vpn'
          );
          break;
        case 'ips':
          results = results.filter(log => 
            value.includes(log.src_ip) || value.includes(log.dst_ip)
          );
          break;
        case 'exclude_ips':
          results = results.filter(log => 
            !value.includes(log.src_ip) && !value.includes(log.dst_ip)
          );
          break;
        case 'mfa':
          results = results.filter(log => log.auth_method === 'mfa');
          break;
        case 'suspicious':
          results = results.filter(log => log.label === 'suspicious');
          break;
        case 'username':
          results = results.filter(log => log.username === value);
          break;
      }
    }
    
    return results;
  }

  async getConversations(sessionId: string): Promise<Conversation[]> {
    return this.conversations.get(sessionId) || [];
  }

  async createConversation(conversation: InsertConversation): Promise<Conversation> {
    const newConversation: Conversation = {
      ...conversation,
      id: randomUUID(),
      timestamp: new Date(),
    };

    const existing = this.conversations.get(conversation.session_id) || [];
    existing.push(newConversation);
    this.conversations.set(conversation.session_id, existing);

    return newConversation;
  }

  async parseNaturalLanguage(query: string, context?: any): Promise<ParsedQuery> {
    const text = query.toLowerCase();
    const parsed: ParsedQuery = {
      intent: 'investigate',
      filters: {},
      raw: query,
    };

    // Intent detection
    if (['summary', 'report', 'generate a summary', 'chart', 'graphs', 'monthly report'].some(w => text.includes(w))) {
      parsed.intent = 'report';
    }

    // Time range parsing
    const now = new Date();
    if (text.includes('yesterday')) {
      const yesterday = new Date(now);
      yesterday.setDate(yesterday.getDate() - 1);
      parsed.time_range = {
        start: yesterday.toISOString().split('T')[0],
        end: yesterday.toISOString().split('T')[0]
      };
    } else if (text.includes('last week') || text.includes('past week')) {
      const weekAgo = new Date(now);
      weekAgo.setDate(weekAgo.getDate() - 7);
      parsed.time_range = {
        start: weekAgo.toISOString().split('T')[0],
        end: now.toISOString().split('T')[0]
      };
    } else if (text.includes('past month') || text.includes('last month') || text.includes('month')) {
      const monthAgo = new Date(now);
      monthAgo.setDate(monthAgo.getDate() - 30);
      parsed.time_range = {
        start: monthAgo.toISOString().split('T')[0],
        end: now.toISOString().split('T')[0]
      };
    }

    // Event type and filters
    if (text.includes('failed login') || text.includes('failed logins')) {
      parsed.filters.event_type = 'failed_login';
    }
    if (text.includes('vpn')) {
      parsed.filters.vpn = true;
    }
    if (text.includes('mfa') || text.includes('multi-factor')) {
      parsed.filters.mfa = true;
    }
    if (text.includes('malware') || text.includes('malicious')) {
      parsed.filters.event_type = 'malware';
    }
    if (text.includes('suspicious') || text.includes('unusual')) {
      parsed.filters.suspicious = true;
    }

    // IP filtering
    const ipRegex = /\b(\d{1,3}(?:\.\d{1,3}){3})\b/g;
    const ips = text.match(ipRegex);
    if (ips) {
      parsed.filters.ips = ips;
    }

    const excludeMatch = text.match(/exclude\s+([0-9\.]+)/g);
    if (excludeMatch) {
      parsed.filters.exclude_ips = excludeMatch.map(m => m.replace('exclude ', ''));
    }

    if (context) {
      parsed.context = context;
    }

    return parsed;
  }

  async generateElasticsearchDSL(parsed: ParsedQuery): Promise<{ dsl: string; filters: any[] }> {
    const clauses: string[] = [];
    const filters: any[] = [];

    // Time range
    if (parsed.time_range) {
      const endDate = new Date(parsed.time_range.end);
      endDate.setDate(endDate.getDate() + 1);
      const endPlusOne = endDate.toISOString().split('T')[0];
      clauses.push(`"range": { "@timestamp": { "gte": "${parsed.time_range.start}", "lt": "${endPlusOne}" } }`);
      filters.push(['time', parsed.time_range]);
    }

    // Event type
    if (parsed.filters.event_type) {
      clauses.push(`"term": { "event_type": "${parsed.filters.event_type}" }`);
      filters.push(['event_type', parsed.filters.event_type]);
    }

    // VPN
    if (parsed.filters.vpn) {
      clauses.push(`"bool": { "should": [{ "term": { "src_service": "vpn" } }, { "term": { "dst_service": "vpn" } }] }`);
      filters.push(['vpn', true]);
    }

    // Other filters
    if (parsed.filters.mfa) {
      clauses.push(`"term": { "auth_method": "mfa" }`);
      filters.push(['mfa', true]);
    }

    if (parsed.filters.suspicious) {
      clauses.push(`"term": { "label": "suspicious" }`);
      filters.push(['suspicious', true]);
    }

    if (parsed.filters.ips) {
      clauses.push(`"bool": { "should": [{ "terms": { "src_ip": ${JSON.stringify(parsed.filters.ips)} } }, { "terms": { "dst_ip": ${JSON.stringify(parsed.filters.ips)} } }] }`);
      filters.push(['ips', parsed.filters.ips]);
    }

    if (parsed.filters.exclude_ips) {
      clauses.push(`"bool": { "must_not": [{ "terms": { "src_ip": ${JSON.stringify(parsed.filters.exclude_ips)} } }, { "terms": { "dst_ip": ${JSON.stringify(parsed.filters.exclude_ips)} } }] }`);
      filters.push(['exclude_ips', parsed.filters.exclude_ips]);
    }

    const dsl = `{
  "query": {
    "bool": {
      "must": [
        ${clauses.map(c => `{ ${c} }`).join(',\n        ')}
      ]
    }
  }
}`;

    return { dsl, filters };
  }

  async executeQuery(filters: any[]): Promise<QueryResult> {
    const filteredLogs = await this.filterSiemLogs(filters);
    
    // Generate statistics
    const uniqueIps = new Set(filteredLogs.map(log => log.src_ip)).size;
    const highRiskEvents = filteredLogs.filter(log => log.risk_level === 'high').length;
    
    // Generate chart data
    const ipCounts = filteredLogs.reduce((acc, log) => {
      acc[log.src_ip] = (acc[log.src_ip] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    const topIps = Object.entries(ipCounts)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 5);

    // User counts
    const userCounts = filteredLogs.reduce((acc, log) => {
      if (log.username) {
        acc[log.username] = (acc[log.username] || 0) + 1;
      }
      return acc;
    }, {} as Record<string, number>);
    
    const topUsers = Object.entries(userCounts)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 5);
    
    const uniqueUsers = new Set(filteredLogs.map(log => log.username).filter(Boolean)).size;

    // Timeline data (by hour)
    const timelineCounts = filteredLogs.reduce((acc, log) => {
      try {
        if (log.timestamp) {
          const logDate = new Date(log.timestamp);
          if (!isNaN(logDate.getTime())) {
            const hour = logDate.toISOString().split('T')[1].split(':')[0];
            const timeKey = `${hour}:00`;
            acc[timeKey] = (acc[timeKey] || 0) + 1;
          }
        }
      } catch (error) {
        console.warn('Invalid timestamp in log:', log.id, log.timestamp);
      }
      return acc;
    }, {} as Record<string, number>);

    const narrative = filteredLogs.length > 0 
      ? `Found ${filteredLogs.length} matching security events. Analysis shows ${highRiskEvents} high-risk events from ${uniqueIps} unique source IPs.`
      : 'No events found matching the specified criteria.';

    return {
      narrative,
      elasticsearch_dsl: '', // Will be filled by the route
      events: filteredLogs.slice(0, 20), // Limit to first 20 for display
      chart_data: {
        source_ip: {
          labels: topIps.map(([ip]) => ip),
          values: topIps.map(([, count]) => count)
        },
        timeline: {
          labels: Object.keys(timelineCounts).sort(),
          values: Object.keys(timelineCounts).sort().map(key => timelineCounts[key] || 0)
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
        time_range: filters.find(([type]) => type === 'time')?.[1] 
          ? `${filters.find(([type]) => type === 'time')[1].start} to ${filters.find(([type]) => type === 'time')[1].end}`
          : 'All time'
      }
    };
  }
}

export const storage = new MemStorage();
