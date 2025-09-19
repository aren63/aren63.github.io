import { QueryResult } from '@/lib/types';
import QueryDisplay from './query-display';
import SecurityCharts from './security-charts';
import EventsTable from './events-table';
import { Card, CardContent } from '@/components/ui/card';
import { AlertTriangle, Network, Skull, Clock } from 'lucide-react';

interface MainContentProps {
  currentResults: QueryResult | null;
  currentDSL: string;
}

export default function MainContent({ currentResults, currentDSL }: MainContentProps) {
  if (!currentResults) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center bg-background" data-testid="main-content-empty">
        <div className="text-center max-w-md">
          <AlertTriangle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-foreground mb-2">
            Ready to Analyze Security Data
          </h2>
          <p className="text-muted-foreground">
            Use natural language to query your SIEM data. Ask about failed logins, malware detections, 
            or generate security reports with charts and insights.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden" data-testid="main-content">
      <QueryDisplay dsl={currentDSL} />
      
      <div className="flex-1 overflow-y-auto">
        <div className="p-6 space-y-6">
          {/* Summary Cards */}
          <div className="grid grid-cols-4 gap-4" data-testid="summary-cards">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Total Events</p>
                    <p className="text-2xl font-semibold text-foreground" data-testid="total-events">
                      {currentResults.stats.total_events}
                    </p>
                  </div>
                  <div className="w-8 h-8 bg-primary/20 text-primary rounded-full flex items-center justify-center">
                    <AlertTriangle className="h-4 w-4" />
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Unique IPs</p>
                    <p className="text-2xl font-semibold text-foreground" data-testid="unique-ips">
                      {currentResults.stats.unique_ips}
                    </p>
                  </div>
                  <div className="w-8 h-8 bg-accent/20 text-accent rounded-full flex items-center justify-center">
                    <Network className="h-4 w-4" />
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">High Risk</p>
                    <p className="text-2xl font-semibold text-destructive" data-testid="high-risk">
                      {currentResults.stats.high_risk_events}
                    </p>
                  </div>
                  <div className="w-8 h-8 bg-destructive/20 text-destructive rounded-full flex items-center justify-center">
                    <Skull className="h-4 w-4" />
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Time Range</p>
                    <p className="text-sm font-semibold text-foreground" data-testid="time-range">
                      {currentResults.stats.time_range}
                    </p>
                  </div>
                  <div className="w-8 h-8 bg-secondary/20 text-secondary-foreground rounded-full flex items-center justify-center">
                    <Clock className="h-4 w-4" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Charts */}
          <SecurityCharts chartData={currentResults.chart_data} />

          {/* Threat Intelligence Panel */}
          {currentResults.stats.high_risk_events > 0 && (
            <Card data-testid="threat-intelligence">
              <CardContent className="p-6">
                <h3 className="font-semibold text-foreground mb-4">Threat Intelligence Insights</h3>
                <div className="space-y-4">
                  <div className="flex items-start space-x-3 p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
                    <AlertTriangle className="text-destructive mt-1 h-4 w-4" />
                    <div>
                      <p className="text-sm font-medium text-foreground">High-Risk Events Detected</p>
                      <p className="text-sm text-muted-foreground">
                        {currentResults.stats.high_risk_events} high-risk security events require immediate attention.
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Narrative Summary */}
          <Card data-testid="narrative-summary">
            <CardContent className="p-6">
              <h3 className="font-semibold text-foreground mb-4">Analysis Summary</h3>
              <p className="text-foreground" data-testid="narrative-text">
                {currentResults.narrative}
              </p>
            </CardContent>
          </Card>

          {/* Data Table */}
          <EventsTable events={currentResults.events} />
        </div>
      </div>
    </div>
  );
}
