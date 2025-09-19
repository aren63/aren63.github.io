import { useEffect, useRef } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import Chart, { ChartConfiguration } from 'chart.js/auto';

interface SecurityChartsProps {
  chartData: {
    source_ip: { labels: string[]; values: number[] };
    timeline: { labels: string[]; values: number[] };
    users: { labels: string[]; values: number[] };
  };
}

export default function SecurityCharts({ chartData }: SecurityChartsProps) {
  const sourceIPChartRef = useRef<HTMLCanvasElement>(null);
  const timelineChartRef = useRef<HTMLCanvasElement>(null);
  const usersChartRef = useRef<HTMLCanvasElement>(null);
  const sourceIPChartInstance = useRef<Chart | null>(null);
  const timelineChartInstance = useRef<Chart | null>(null);
  const usersChartInstance = useRef<Chart | null>(null);

  useEffect(() => {
    if (!sourceIPChartRef.current) return;

    // Destroy existing chart
    if (sourceIPChartInstance.current) {
      sourceIPChartInstance.current.destroy();
    }

    const ctx = sourceIPChartRef.current.getContext('2d');
    if (!ctx) return;

    const config: ChartConfiguration = {
      type: 'doughnut',
      data: {
        labels: chartData.source_ip.labels.length > 0 ? chartData.source_ip.labels : ['No data'],
        datasets: [{
          data: chartData.source_ip.values.length > 0 ? chartData.source_ip.values : [1],
          backgroundColor: [
            'hsl(0 63% 61%)',      // destructive
            'hsl(38 92% 50%)',     // amber  
            'hsl(142 71% 45%)',    // accent
            'hsl(213 93% 68%)',    // primary
            'hsl(220 9% 65%)'      // muted
          ],
          borderWidth: 0
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'bottom',
            labels: {
              color: 'hsl(220 9% 95%)',
              padding: 15,
              font: {
                size: 12
              }
            }
          }
        }
      }
    };

    sourceIPChartInstance.current = new Chart(ctx, config);
  }, [chartData.source_ip]);

  useEffect(() => {
    if (!timelineChartRef.current) return;

    // Destroy existing chart
    if (timelineChartInstance.current) {
      timelineChartInstance.current.destroy();
    }

    const ctx = timelineChartRef.current.getContext('2d');
    if (!ctx) return;

    const config: ChartConfiguration = {
      type: 'line',
      data: {
        labels: chartData.timeline.labels.length > 0 ? chartData.timeline.labels : ['No data'],
        datasets: [{
          label: 'Security Events',
          data: chartData.timeline.values.length > 0 ? chartData.timeline.values : [0],
          borderColor: 'hsl(0 63% 61%)',
          backgroundColor: 'hsla(0 63% 61% / 0.1)',
          tension: 0.4,
          fill: true
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            labels: {
              color: 'hsl(220 9% 95%)'
            }
          }
        },
        scales: {
          y: {
            beginAtZero: true,
            ticks: {
              color: 'hsl(220 9% 65%)'
            },
            grid: {
              color: 'hsl(220 13% 18%)'
            }
          },
          x: {
            ticks: {
              color: 'hsl(220 9% 65%)'
            },
            grid: {
              color: 'hsl(220 13% 18%)'
            }
          }
        }
      }
    };

    timelineChartInstance.current = new Chart(ctx, config);
  }, [chartData.timeline]);

  useEffect(() => {
    if (!usersChartRef.current) return;

    // Destroy existing chart
    if (usersChartInstance.current) {
      usersChartInstance.current.destroy();
    }

    const ctx = usersChartRef.current.getContext('2d');
    if (!ctx) return;

    const config: ChartConfiguration = {
      type: 'bar',
      data: {
        labels: chartData.users.labels.length > 0 ? chartData.users.labels : ['No data'],
        datasets: [{
          label: 'Events',
          data: chartData.users.values.length > 0 ? chartData.users.values : [1],
          backgroundColor: 'hsl(142 71% 45%)', // accent color
          borderColor: 'hsl(142 71% 45%)',
          borderWidth: 1
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            display: false
          }
        },
        scales: {
          y: {
            beginAtZero: true,
            ticks: {
              color: 'hsl(220 9% 65%)'
            },
            grid: {
              color: 'hsl(220 13% 18%)'
            }
          },
          x: {
            ticks: {
              color: 'hsl(220 9% 65%)',
              maxRotation: 45
            },
            grid: {
              color: 'hsl(220 13% 18%)'
            }
          }
        }
      }
    };

    usersChartInstance.current = new Chart(ctx, config);
  }, [chartData.users]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (sourceIPChartInstance.current) {
        sourceIPChartInstance.current.destroy();
      }
      if (timelineChartInstance.current) {
        timelineChartInstance.current.destroy();
      }
      if (usersChartInstance.current) {
        usersChartInstance.current.destroy();
      }
    };
  }, []);

  return (
    <div className="grid grid-cols-3 gap-6" data-testid="security-charts">
      <Card>
        <CardContent className="p-6">
          <h3 className="font-semibold text-foreground mb-4" data-testid="source-ip-chart-title">
            Events by Source IP
          </h3>
          <div className="h-64">
            <canvas ref={sourceIPChartRef} data-testid="source-ip-chart"></canvas>
          </div>
        </CardContent>
      </Card>
      
      <Card>
        <CardContent className="p-6">
          <h3 className="font-semibold text-foreground mb-4" data-testid="timeline-chart-title">
            Attack Timeline
          </h3>
          <div className="h-64">
            <canvas ref={timelineChartRef} data-testid="timeline-chart"></canvas>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-6">
          <h3 className="font-semibold text-foreground mb-4" data-testid="users-chart-title">
            Top Users
          </h3>
          <div className="h-64">
            <canvas ref={usersChartRef} data-testid="users-chart"></canvas>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
