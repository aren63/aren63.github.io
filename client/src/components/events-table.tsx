import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { SiemLog } from '@/lib/types';
import { Download, Filter, Eye } from 'lucide-react';

interface EventsTableProps {
  events: SiemLog[];
}

export default function EventsTable({ events }: EventsTableProps) {
  const getRiskLevelColor = (level?: string) => {
    switch (level?.toLowerCase()) {
      case 'high':
        return 'destructive';
      case 'medium':
        return 'default';
      case 'low':
        return 'secondary';
      default:
        return 'outline';
    }
  };

  const getEventTypeColor = (type: string) => {
    switch (type.toLowerCase()) {
      case 'failed_login':
        return 'destructive';
      case 'malware':
        return 'destructive';
      case 'successful_login':
        return 'secondary';
      default:
        return 'outline';
    }
  };

  const formatTimestamp = (timestamp: string) => {
    return new Date(timestamp).toLocaleString();
  };

  return (
    <Card data-testid="events-table">
      <CardContent className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-foreground" data-testid="table-title">
            Event Details
          </h3>
          <div className="flex items-center space-x-2">
            <Button variant="secondary" size="sm" data-testid="export-button">
              <Download className="h-4 w-4 mr-1" />
              Export
            </Button>
            <Button variant="secondary" size="sm" data-testid="filter-button">
              <Filter className="h-4 w-4 mr-1" />
              Filter
            </Button>
          </div>
        </div>
        
        {events.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground" data-testid="empty-table">
            <p>No events found matching the current query.</p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm" data-testid="events-data-table">
                <thead>
                  <tr className="border-b border-border text-left">
                    <th className="py-3 px-4 text-muted-foreground font-medium">Timestamp</th>
                    <th className="py-3 px-4 text-muted-foreground font-medium">Source IP</th>
                    <th className="py-3 px-4 text-muted-foreground font-medium">Target</th>
                    <th className="py-3 px-4 text-muted-foreground font-medium">Event Type</th>
                    <th className="py-3 px-4 text-muted-foreground font-medium">Risk Level</th>
                    <th className="py-3 px-4 text-muted-foreground font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {events.map((event) => (
                    <tr
                      key={event.id}
                      className="border-b border-border hover:bg-muted/50 transition-colors"
                      data-testid={`event-row-${event.id}`}
                    >
                      <td className="py-3 px-4 font-mono text-xs text-muted-foreground" data-testid={`timestamp-${event.id}`}>
                        {formatTimestamp(event.timestamp)}
                      </td>
                      <td className="py-3 px-4 font-mono text-xs" data-testid={`src-ip-${event.id}`}>
                        {event.src_ip}
                      </td>
                      <td className="py-3 px-4 text-foreground" data-testid={`target-${event.id}`}>
                        {event.dst_ip || event.src_service || 'N/A'}
                      </td>
                      <td className="py-3 px-4" data-testid={`event-type-${event.id}`}>
                        <Badge variant={getEventTypeColor(event.event_type) as any}>
                          {event.event_type.replace('_', ' ')}
                        </Badge>
                      </td>
                      <td className="py-3 px-4" data-testid={`risk-level-${event.id}`}>
                        <Badge variant={getRiskLevelColor(event.risk_level) as any}>
                          {event.risk_level || 'Unknown'}
                        </Badge>
                      </td>
                      <td className="py-3 px-4">
                        <Button
                          variant="link"
                          size="sm"
                          className="text-primary hover:text-primary/80 text-xs p-0"
                          data-testid={`details-button-${event.id}`}
                        >
                          <Eye className="h-3 w-3 mr-1" />
                          Details
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            
            <div className="mt-4 flex items-center justify-between text-sm text-muted-foreground" data-testid="table-pagination">
              <div data-testid="table-info">
                Showing {events.length} events
              </div>
              {events.length >= 20 && (
                <div className="flex items-center space-x-2">
                  <Button variant="link" size="sm" className="text-muted-foreground hover:text-foreground p-0" data-testid="previous-button">
                    Previous
                  </Button>
                  <Button variant="link" size="sm" className="text-muted-foreground hover:text-foreground p-0" data-testid="next-button">
                    Next
                  </Button>
                </div>
              )}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
