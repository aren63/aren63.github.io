import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Copy, Expand, Check } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface QueryDisplayProps {
  dsl: string;
}

export default function QueryDisplay({ dsl }: QueryDisplayProps) {
  const [copied, setCopied] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const { toast } = useToast();

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(dsl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      toast({
        title: "Copied!",
        description: "Elasticsearch query copied to clipboard",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to copy to clipboard",
        variant: "destructive",
      });
    }
  };

  if (!dsl) {
    return null;
  }

  const displayDSL = expanded ? dsl : dsl.split('\n').slice(0, 8).join('\n') + (dsl.split('\n').length > 8 ? '\n  ...' : '');

  return (
    <div className="bg-card border-b border-border p-4" data-testid="query-display">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold text-foreground" data-testid="query-title">
          Generated Elasticsearch Query
        </h3>
        <div className="flex items-center space-x-2">
          <Button
            variant="secondary"
            size="sm"
            onClick={handleCopy}
            data-testid="copy-button"
          >
            {copied ? (
              <>
                <Check className="h-4 w-4 mr-1" />
                Copied
              </>
            ) : (
              <>
                <Copy className="h-4 w-4 mr-1" />
                Copy
              </>
            )}
          </Button>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setExpanded(!expanded)}
            data-testid="expand-button"
          >
            <Expand className="h-4 w-4 mr-1" />
            {expanded ? 'Collapse' : 'Expand'}
          </Button>
        </div>
      </div>
      
      <Card className="syntax-highlight border border-border">
        <CardContent className="p-4">
          <pre className="font-mono text-sm overflow-x-auto" data-testid="query-text">
            <code className="text-accent">{displayDSL}</code>
          </pre>
        </CardContent>
      </Card>
    </div>
  );
}
