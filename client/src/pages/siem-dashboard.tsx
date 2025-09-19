import { useState, useEffect } from 'react';
import ChatSidebar from '@/components/chat-sidebar';
import MainContent from '@/components/main-content';
import { ChatMessage, QueryResult } from '@/lib/types';
import { Shield, Database, Clock, User } from 'lucide-react';

export default function SiemDashboard() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [currentResults, setCurrentResults] = useState<QueryResult | null>(null);
  const [currentDSL, setCurrentDSL] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSendMessage = async (message: string) => {
    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      type: 'user',
      content: message,
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setIsLoading(true);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ message }),
      });

      if (!response.ok) {
        throw new Error('Failed to process query');
      }

      const data = await response.json();
      
      const assistantMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        type: 'assistant',
        content: data.results.narrative,
        timestamp: new Date(),
        elasticsearch_dsl: data.results.elasticsearch_dsl,
        result_count: data.results.stats.total_events,
        results: data.results,
      };

      setMessages(prev => [...prev, assistantMessage]);
      setCurrentResults(data.results);
      setCurrentDSL(data.results.elasticsearch_dsl);
    } catch (error) {
      console.error('Error sending message:', error);
      const errorMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        type: 'assistant',
        content: 'Sorry, I encountered an error processing your request. Please try again.',
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Header */}
      <header className="bg-card border-b border-border px-6 py-4" data-testid="app-header">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <Shield className="text-primary text-xl" data-testid="logo-shield" />
              <h1 className="text-xl font-semibold text-foreground" data-testid="app-title">
                SIEM Intelligence Platform
              </h1>
            </div>
            <div className="flex items-center space-x-2 px-3 py-1 bg-muted rounded-full text-sm">
              <div className="w-2 h-2 bg-accent rounded-full animate-pulse" data-testid="status-indicator"></div>
              <span className="text-muted-foreground" data-testid="status-text">Live Monitoring</span>
            </div>
          </div>
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2 text-sm text-muted-foreground">
              <Database size={16} data-testid="database-icon" />
              <span data-testid="logs-count">Loading...</span>
            </div>
            <div className="flex items-center space-x-2 text-sm text-muted-foreground">
              <Clock size={16} data-testid="clock-icon" />
              <span data-testid="last-update">Last update: Live</span>
            </div>
            <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center text-primary-foreground text-sm font-medium" data-testid="user-avatar">
              <User size={16} />
            </div>
          </div>
        </div>
      </header>

      <div className="flex h-[calc(100vh-73px)]">
        <ChatSidebar
          messages={messages}
          onSendMessage={handleSendMessage}
          isLoading={isLoading}
          data-testid="chat-sidebar"
        />
        <MainContent
          currentResults={currentResults}
          currentDSL={currentDSL}
          data-testid="main-content"
        />
      </div>
    </div>
  );
}
