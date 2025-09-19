import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ChatMessage } from '@/lib/types';
import { Send, Loader2 } from 'lucide-react';

interface ChatSidebarProps {
  messages: ChatMessage[];
  onSendMessage: (message: string) => void;
  isLoading: boolean;
}

export default function ChatSidebar({ messages, onSendMessage, isLoading }: ChatSidebarProps) {
  const [inputValue, setInputValue] = useState('');
  const scrollAreaRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollAreaRef.current) {
      scrollAreaRef.current.scrollTop = scrollAreaRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (inputValue.trim() && !isLoading) {
      onSendMessage(inputValue.trim());
      setInputValue('');
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  const formatTimestamp = (date: Date) => {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    
    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
    
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours} hour${hours > 1 ? 's' : ''} ago`;
    
    return date.toLocaleDateString();
  };

  return (
    <div className="w-80 bg-card border-r border-border flex flex-col" data-testid="chat-sidebar">
      <div className="p-4 border-b border-border">
        <h2 className="font-semibold text-foreground mb-2" data-testid="sidebar-title">
          Natural Language Query
        </h2>
        <p className="text-sm text-muted-foreground" data-testid="sidebar-description">
          Ask questions about your security data using natural language
        </p>
      </div>
      
      {/* Chat Messages */}
      <ScrollArea className="flex-1 p-4" ref={scrollAreaRef} data-testid="chat-messages">
        <div className="space-y-4">
          {messages.length === 0 ? (
            <div className="text-center text-muted-foreground text-sm py-8" data-testid="empty-chat">
              <p>Start a conversation by asking about security events</p>
              <p className="mt-2 text-xs">
                Try: "What suspicious failed logins happened yesterday?"
              </p>
            </div>
          ) : (
            messages.map((message) => (
              <div key={message.id} className={message.type === 'user' ? 'text-right' : 'text-left'}>
                <div
                  className={`p-3 rounded-lg max-w-xs ${
                    message.type === 'user'
                      ? 'bg-primary text-primary-foreground ml-auto rounded-tr-sm'
                      : 'bg-secondary text-secondary-foreground rounded-tl-sm'
                  }`}
                  data-testid={`message-${message.type}-${message.id}`}
                >
                  {message.content}
                  {message.result_count !== undefined && (
                    <div className="mt-1 text-xs opacity-80" data-testid={`result-count-${message.id}`}>
                      {message.result_count} events found
                    </div>
                  )}
                </div>
                <div className="text-xs text-muted-foreground mt-1" data-testid={`timestamp-${message.id}`}>
                  {formatTimestamp(message.timestamp)}
                </div>
              </div>
            ))
          )}
          {isLoading && (
            <div className="text-left">
              <div className="bg-secondary text-secondary-foreground p-3 rounded-lg rounded-tl-sm max-w-xs flex items-center space-x-2" data-testid="loading-message">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Processing query...</span>
              </div>
            </div>
          )}
        </div>
      </ScrollArea>
      
      {/* Input Area */}
      <div className="p-4 border-t border-border">
        <form onSubmit={handleSubmit} className="flex space-x-2">
          <Input
            type="text"
            placeholder="Ask about security events..."
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyPress={handleKeyPress}
            disabled={isLoading}
            className="flex-1"
            data-testid="chat-input"
          />
          <Button 
            type="submit" 
            disabled={isLoading || !inputValue.trim()}
            data-testid="send-button"
          >
            <Send className="h-4 w-4" />
          </Button>
        </form>
        <div className="mt-2 text-xs text-muted-foreground" data-testid="input-hints">
          Try: "Show malware detections from last week" or "Generate security summary"
        </div>
      </div>
    </div>
  );
}
