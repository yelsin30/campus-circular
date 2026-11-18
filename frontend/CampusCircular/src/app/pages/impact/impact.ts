import { Component, DestroyRef, inject, OnInit } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ImpactMetricsService } from '../../data/impact-metrics.service';

@Component({
  selector: 'app-impact-page',
  standalone: true,
  templateUrl: './impact.html',
  styleUrl: './impact.scss',
})
export class ImpactPage implements OnInit {
  private readonly impactService = inject(ImpactMetricsService);
  private readonly destroyRef = inject(DestroyRef);

  readonly metrics = this.impactService.metrics;
  readonly currentMonth = new Intl.DateTimeFormat('es-PE', { month: 'short', year: 'numeric' })
    .format(new Date())
    .replace('.', '');

  ngOnInit(): void {
    this.impactService
      .loadImpactMetrics()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe();
  }

  get monthlyMax(): number {
    return Math.max(1, ...this.metrics().monthlyActivity.map((point) => point.count));
  }

  get currentYearTransactions(): number {
    return Math.max(
      this.metrics().completedTransactions,
      this.metrics().monthlyActivity.reduce((total, point) => total + point.count, 0),
    );
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

  formatRaee(value: number): string {
    return `${Number(value ?? 0).toFixed(3)} kg`;
  }

  money(value: number | null): string {
    const num = Number(value ?? 0);
    return `S/ ${num.toFixed(2)}`;
  }
}
