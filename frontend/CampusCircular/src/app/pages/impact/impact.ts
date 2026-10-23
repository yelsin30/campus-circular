import { Component, inject } from '@angular/core';
import { ImpactMetricsService } from '../../data/impact-metrics.service';

@Component({
  selector: 'app-impact-page',
  standalone: true,
  templateUrl: './impact.html',
  styleUrl: './impact.scss',
})
export class ImpactPage {
  readonly metrics = inject(ImpactMetricsService).metrics;
  readonly currentMonth = new Intl.DateTimeFormat('es-PE', { month: 'short', year: 'numeric' })
    .format(new Date())
    .replace('.', '');

  get monthlyMax(): number {
    return Math.max(1, ...this.metrics().monthlyActivity.map((point) => point.count));
  }

  get currentYearTransactions(): number {
    return this.metrics().monthlyActivity.reduce((total, point) => total + point.count, 0);
  }

  get monthlyMid(): number {
    return Math.ceil(this.monthlyMax / 2);
  }

  barHeight(value: number): number {
    if (value === 0) return 0;
    return Math.max(8, Math.round((value / this.monthlyMax) * 100));
  }

  get categoryConicGradient(): string {
    const colors = ['#ffc928', '#6c9fe0', '#79bd91', '#8d84c5', '#d9dce2'];
    let stop = 0;
    const segments = this.metrics().categoryDistribution.map((item, index) => {
      const start = stop;
      stop += item.percentage;
      return `${colors[index]} ${start}% ${stop}%`;
    });
    return `conic-gradient(${segments.join(', ')})`;
  }

  money(value: number | null): string {
    if (value === null) return 'Sin datos suficientes';
    return new Intl.NumberFormat('es-PE', { style: 'currency', currency: 'PEN', maximumFractionDigits: 0 }).format(value);
  }
}