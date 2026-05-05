---
name: chartjs-apexcharts
description: Chart.js 4 and ApexCharts patterns for ULP M24 Dashboards (revenue, ageing, fleet utilization, customs throughput). Use when adding/modifying Angular dashboard components, chart wrappers, or any work in frontend/src/app/m24-dashboards/. Covers responsive sizing, real-time data refresh, drill-down on click, INR currency formatting, financial-year axis ticks, lazy-loaded chart imports, and Chart.js vs ApexCharts decision (Chart.js for simple bars/lines, ApexCharts for heatmaps/treemaps/financial). Always trigger on .chart.ts components or chart config changes.
---

# Chart.js + ApexCharts for ULP Dashboards

## When this skill triggers
Working in `frontend/src/app/m24-dashboards/`, modifying chart components, configuring chart options, debugging rendering/sizing issues, or adding new visualizations to executive/operational dashboards.

## Top 3 reference repos
1. **chartjs/Chart.js** (https://github.com/chartjs/Chart.js) — Official Chart.js. Read `docs/charts/` for chart types and `docs/general/responsive.md` for sizing. Lightweight (60KB gzip), best for line/bar/pie/doughnut.
2. **apexcharts/apexcharts.js** (https://github.com/apexcharts/apexcharts.js) — Official ApexCharts. Richer feature set (heatmaps, treemaps, candlestick, range area). Better for financial dashboards. Read `samples/` for ULP-relevant patterns.
3. **valor-software/ng2-charts** (https://github.com/valor-software/ng2-charts) — Angular wrapper for Chart.js (recommended over raw Chart.js). For ApexCharts use `apexcharts/ng-apexcharts`. Both wrappers provide `[type]` `[data]` `[options]` directives.

## Critical ULP patterns

### Decision matrix: Chart.js vs ApexCharts
| Need | Use |
|------|-----|
| Simple line / bar / pie / doughnut | Chart.js (lighter) |
| Stacked bar with annotations | Chart.js |
| Time series with zoom | ApexCharts |
| Heatmap (geo, calendar) | ApexCharts |
| Treemap | ApexCharts |
| Candlestick / OHLC (rare in ULP) | ApexCharts |
| Sankey (flow) | Custom D3 |
| Gauges (fleet utilization %) | ApexCharts |

### Lazy-load chart libraries (perf)
```typescript
// frontend/src/app/m24-dashboards/components/revenue-chart/revenue-chart.component.ts
import { Component, signal, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'ulp-revenue-chart',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="chart-host">
      @if (chartReady()) {
        <canvas baseChart [data]="chartData" [options]="chartOptions" type="line"></canvas>
      } @else {
        <ulp-skeleton></ulp-skeleton>
      }
    </div>
  `
})
export class RevenueChartComponent implements OnInit {
  chartReady = signal(false);
  chartData: any;
  chartOptions: any;

  async ngOnInit() {
    // Lazy import - Chart.js is 60KB; only loaded when this component renders
    const { Chart, registerables } = await import('chart.js');
    const { default: ChartDataLabels } = await import('chartjs-plugin-datalabels');
    Chart.register(...registerables, ChartDataLabels);

    this.chartOptions = this.buildOptions();
    this.chartData = await this.loadData();
    this.chartReady.set(true);
  }

  private buildOptions() {
    return {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { position: 'bottom' },
        tooltip: {
          callbacks: {
            label: (ctx: any) => `Revenue: ${this.formatInr(ctx.parsed.y)}`
          }
        }
      },
      scales: {
        y: {
          ticks: { callback: (v: any) => this.formatInrShort(v) }
        }
      },
      onClick: (_evt: any, elements: any[]) => {
        if (elements.length) this.onSliceClick(elements[0]);
      }
    };
  }

  private formatInr(v: number) {
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(v);
  }

  private formatInrShort(v: number) {
    if (v >= 1e7) return `₹${(v / 1e7).toFixed(1)}Cr`;
    if (v >= 1e5) return `₹${(v / 1e5).toFixed(1)}L`;
    if (v >= 1e3) return `₹${(v / 1e3).toFixed(0)}K`;
    return `₹${v}`;
  }

  private onSliceClick(element: any) {
    // Drill-down: navigate to detail view
    const monthLabel = this.chartData.labels[element.index];
    // ... router.navigate(['/m17/invoices', { month: monthLabel }])
  }
}
```

### ApexCharts heatmap (customs throughput by port × month)
```typescript
import { Component, OnInit, signal } from '@angular/core';
import { NgApexchartsModule, ChartComponent } from 'ng-apexcharts';

@Component({
  standalone: true,
  imports: [NgApexchartsModule],
  template: `
    @if (options()) {
      <apx-chart
        [series]="options()!.series"
        [chart]="options()!.chart"
        [dataLabels]="options()!.dataLabels"
        [plotOptions]="options()!.plotOptions"
        [xaxis]="options()!.xaxis"
        [colors]="options()!.colors"></apx-chart>
    }
  `
})
export class CustomsHeatmapComponent implements OnInit {
  options = signal<any>(null);

  async ngOnInit() {
    const data = await this.loadData();
    this.options.set({
      series: data.ports.map(p => ({
        name: p.portName,
        data: p.monthlyShipments  // 12 numbers (Apr-Mar Indian FY)
      })),
      chart: { type: 'heatmap', height: 380, toolbar: { show: false } },
      dataLabels: { enabled: false },
      plotOptions: {
        heatmap: {
          colorScale: {
            ranges: [
              { from: 0, to: 100, color: '#e8f4fd', name: 'Low' },
              { from: 101, to: 500, color: '#90caf9', name: 'Medium' },
              { from: 501, to: 9999, color: '#1976d2', name: 'High' }
            ]
          }
        }
      },
      xaxis: { categories: ['Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec','Jan','Feb','Mar'] },
      colors: ['#1976d2']
    });
  }
}
```

### Financial Year axis (Apr to Mar, not Jan to Dec)
```typescript
// All ULP financial charts use Indian FY (Apr - Mar)
const FY_MONTHS = ['Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec','Jan','Feb','Mar'];

// Convert calendar month (1-12) to FY month index (0-11)
const fyIndex = (calendarMonth: number) => (calendarMonth + 8) % 12;
```

### Real-time dashboard refresh
```typescript
// Poll every 60s for executive dashboards
import { interval, switchMap, takeUntilDestroyed } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { toSignal } from '@angular/core/rxjs-interop';

export class ExecutiveDashboardComponent {
  private http = inject(HttpClient);
  metrics = toSignal(
    interval(60_000).pipe(
      switchMap(() => this.http.get<DashboardMetrics>('/api/m24/executive')),
      takeUntilDestroyed()
    ),
    { initialValue: { revenue: 0, invoices: 0, dso: 0 } }
  );
}
```

## Critical gotchas

### Lazy-load to keep main bundle small
- Chart.js (60KB) and ApexCharts (130KB) should NEVER be in the main bundle.
- Use `await import()` inside `ngOnInit` or route lazy load.
- This is a measurable Lighthouse win.

### maintainAspectRatio: false
- ALWAYS set when chart is in a fixed-height container.
- Otherwise chart resizes to image aspect ratio and may overflow.

### Chart.js plugins must be registered
- `Chart.register(...registerables)` once before first chart render.
- Forgetting this = empty canvas with no error.

### Tooltip currency format
- Always format as INR (en-IN locale).
- Use compact notation for axis labels: ₹2.5Cr instead of ₹25,000,000.

### Financial year handling
- ULP fiscal year = Apr 1 to Mar 31 (Indian FY).
- Sort data by FY index, not calendar order.

### Drill-down on click
- All exec dashboard charts MUST support drill-down to underlying data.
- Use chart's `onClick` callback to navigate to detailed view (e.g., from monthly revenue chart -> invoice list for that month).

### Server-side aggregation, client-side rendering
- Backend computes aggregates (sum, avg, count) and returns ~30-100 datapoints max.
- NEVER ship 10,000 raw transactions to the client and aggregate in JS.
- Cache aggregates in Redis with 60-second TTL.

### Print/Export
- Charts must be exportable as PNG for reports.
- Chart.js: `chart.toBase64Image()`. ApexCharts: built-in `chart.dataURI()`.

## ULP companion docs
- ULP_LLD_M24_v1.0_Dashboards.docx (full chart catalog: 60+ visualizations)
- ULP_HLD_v1.0_HighLevelDesign.docx Section 8 (Frontend architecture)
