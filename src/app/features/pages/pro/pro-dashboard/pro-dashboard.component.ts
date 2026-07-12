import { Component, inject, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { NgApexchartsModule, ApexAxisChartSeries, ApexChart, ApexXAxis, ApexNonAxisChartSeries, ApexResponsive } from 'ng-apexcharts';
import { BookingsService } from '../../../../core/services/bookings.service';
import { AuthService } from '../../../../core/services/Auth.service';
import { WorkersService } from '../../../../core/services/workers.service';
import { Booking, BookingStatus } from '../../../../core/models/booking.model';
import { Worker } from '../../../../core/models/worker.model';
import { generateAvatarColor } from '../../../../core/utils/color.util';
import { switchMap } from 'rxjs';

interface TopClient {
  clientId: string;
  clientName: string;
  count: number;
  total: number;
}

@Component({
  selector: 'app-pro-dashboard',
  standalone: true,
  imports: [CommonModule, NgApexchartsModule],
  templateUrl: './pro-dashboard.component.html',
  styleUrl: './pro-dashboard.component.css',
})
export class ProDashboardComponent implements OnInit {
  private bookings = inject(BookingsService);
  private auth     = inject(AuthService);
  private workers  = inject(WorkersService);
  private router   = inject(Router);

  allJobs = signal<Booking[]>([]);
  worker  = signal<Worker | null>(null);
  loading = signal(true);
  error   = signal<string | null>(null);

  // ── الإحصائيات ─────────────────────────────────────────
  totalEarnings = computed(() =>
    this.allJobs()
      .filter((j) => j.status === 'completed')
      .reduce((sum, j) => sum + j.totalAmount, 0)
  );

  avgOrderValue = computed(() => {
    const completed = this.allJobs().filter((j) => j.status === 'completed');
    if (completed.length === 0) return 0;
    return Math.round(completed.reduce((sum, j) => sum + j.totalAmount, 0) / completed.length);
  });

  pendingCount = computed(() =>
    this.allJobs().filter((j) => j.status === 'pending').length
  );

  activeCount = computed(() =>
    this.allJobs().filter((j) => j.status === 'active').length
  );

  completionRate = computed(() => {
    const completed = this.allJobs().filter((j) => j.status === 'completed').length;
    const cancelled = this.allJobs().filter((j) => j.status === 'cancelled').length;
    const total = completed + cancelled;
    return total === 0 ? 0 : Math.round((completed / total) * 100);
  });

  recentJobs = computed(() =>
    [...this.allJobs()]
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 8)
  );

  topClients = computed<TopClient[]>(() => {
    const map = new Map<string, TopClient>();
    for (const j of this.allJobs()) {
      if (j.status === 'cancelled') continue;
      const entry = map.get(j.clientId) ?? { clientId: j.clientId, clientName: j.clientName, count: 0, total: 0 };
      entry.count += 1;
      entry.total += j.totalAmount;
      map.set(j.clientId, entry);
    }
    return Array.from(map.values())
      .sort((a, b) => b.total - a.total)
      .slice(0, 5);
  });

  // ── 1) Bar chart: الأرباح آخر 7 أيام ────────────────────
  earningsChartSeries: ApexAxisChartSeries = [];
  earningsChartOptions: Partial<{
    chart: ApexChart;
    xaxis: ApexXAxis;
    colors: string[];
    dataLabels: any;
    plotOptions: any;
    grid: any;
    responsive: ApexResponsive[];
  }> = {
    chart: {
      type: 'bar',
      height: 260,
      toolbar: { show: false },
      fontFamily: 'Inter, IBM Plex Sans Arabic, sans-serif',
      events: {
        dataPointSelection: () => this.navigateToJobsTab('completed'),
      },
    },
    colors: ['#2563EB'],
    dataLabels: { enabled: false },
    plotOptions: { bar: { borderRadius: 6, columnWidth: '45%' } },
    grid: { borderColor: '#E2E8F0', strokeDashArray: 4 },
    xaxis: { categories: [], labels: { style: { fontSize: '12px' } } },
    responsive: [
      {
        breakpoint: 640,
        options: {
          chart: { height: 220 },
          xaxis: { labels: { style: { fontSize: '9px' }, rotate: -45, rotateAlways: true } },
          plotOptions: { bar: { columnWidth: '60%' } },
        },
      },
      {
        breakpoint: 380,
        options: { chart: { height: 190 } },
      },
    ],
  };

  // ── 2) Line chart: اتجاه الأرباح آخر 30 يوم ─────────────
  trendChartSeries: ApexAxisChartSeries = [];
  trendChartOptions: any = {
    chart: { type: 'line', height: 260, toolbar: { show: false }, fontFamily: 'Inter, IBM Plex Sans Arabic, sans-serif' },
    colors: ['#16A34A'],
    stroke: { curve: 'smooth', width: 3 },
    dataLabels: { enabled: false },
    grid: { borderColor: '#E2E8F0', strokeDashArray: 4 },
    markers: { size: 0, hover: { size: 5 } },
    xaxis: { categories: [], labels: { style: { fontSize: '10px' } }, tickAmount: 6 },
    responsive: [{ breakpoint: 640, options: { chart: { height: 220 } } }],
  };

  // ── 3) Donut chart: توزيع حالات الطلبات ─────────────────
  statusChartSeries: ApexNonAxisChartSeries = [];
  statusChartOptions: any = {
    chart: {
      type: 'donut',
      height: 260,
      fontFamily: 'Inter, IBM Plex Sans Arabic, sans-serif',
      events: {
        dataPointSelection: (_e: any, _c: any, config: any) => {
          const order: BookingStatus[] = ['pending', 'active', 'completed', 'cancelled'];
          this.navigateByBookingStatus(order[config.dataPointIndex]);
        },
      },
    },
    labels: ['معلقة', 'جارية', 'مكتملة', 'ملغية'],
    colors: ['#F97316', '#2563EB', '#16A34A', '#DC2626'],
    legend: { position: 'bottom', fontSize: '12px' },
    dataLabels: { enabled: false },
    stroke: { width: 0 },
    responsive: [{ breakpoint: 640, options: { chart: { height: 220 }, legend: { fontSize: '11px' } } }],
  };

  // ── 4) Pie chart: نسبة الطلبات بخصم كوبون ───────────────
  couponChartSeries: ApexNonAxisChartSeries = [];
  couponChartOptions: any = {
    chart: { type: 'pie', height: 260, fontFamily: 'Inter, IBM Plex Sans Arabic, sans-serif' },
    labels: ['بخصم كوبون', 'من غير خصم'],
    colors: ['#F97316', '#94A3B8'],
    legend: { position: 'bottom', fontSize: '12px' },
    dataLabels: { enabled: true, style: { fontSize: '11px' } },
    responsive: [{ breakpoint: 640, options: { chart: { height: 220 }, legend: { fontSize: '11px' } } }],
  };

  // ── 5) Radial bar (gauge): معدل إتمام الطلبات ───────────
  gaugeChartSeries: number[] = [];
  gaugeChartOptions: any = {
    chart: {
      type: 'radialBar',
      height: 260,
      fontFamily: 'Inter, IBM Plex Sans Arabic, sans-serif',
      events: {
        dataPointSelection: () => this.navigateToJobsTab('completed'),
      },
    },
    colors: ['#16A34A'],
    plotOptions: {
      radialBar: {
        hollow: { size: '60%' },
        dataLabels: {
          value: { fontSize: '22px', fontWeight: 700, color: '#0F172A' },
          name: { show: false },
        },
      },
    },
    labels: ['معدل الإنجاز'],
    responsive: [{ breakpoint: 640, options: { chart: { height: 220 } } }],
  };

  // ── 6) Bar أفقي: الطلبات حسب يوم الأسبوع ────────────────
  weekdayChartSeries: ApexAxisChartSeries = [];
  weekdayChartOptions: any = {
    chart: { type: 'bar', height: 260, toolbar: { show: false }, fontFamily: 'Inter, IBM Plex Sans Arabic, sans-serif' },
    colors: ['#2563EB'],
    plotOptions: { bar: { horizontal: true, borderRadius: 4, barHeight: '55%' } },
    dataLabels: { enabled: false },
    grid: { borderColor: '#E2E8F0', strokeDashArray: 4 },
    xaxis: { categories: [], labels: { style: { fontSize: '11px' } } },
    responsive: [{ breakpoint: 640, options: { chart: { height: 220 }, xaxis: { labels: { style: { fontSize: '9px' } } } } }],
  };

  ngOnInit(): void {
    const user = this.auth.currentUser();
    if (!user) return;

    this.workers.getByUserId(user.id).pipe(
      switchMap((list) => {
        const worker = list[0];
        if (!worker) throw new Error('مش لاقي بيانات الصنايعي.');
        this.worker.set(worker);
        return this.bookings.getByWorker(worker.id);
      })
    ).subscribe({
      next: (jobs) => {
        this.allJobs.set(jobs);
        this.buildEarningsChart(jobs);
        this.buildTrendChart(jobs);
        this.buildStatusChart(jobs);
        this.buildCouponChart(jobs);
        this.buildGaugeChart(jobs);
        this.buildWeekdayChart(jobs);
        this.loading.set(false);
      },
      error: (err) => {
        this.error.set(err.message ?? 'مش قادر يجيب بيانات الداشبورد.');
        this.loading.set(false);
      },
    });
  }

  private buildEarningsChart(jobs: Booking[]): void {
    const days: { label: string; total: number }[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const label = d.toLocaleDateString('ar-EG', { weekday: 'short' }).slice(0, 3);
      const dayStr = d.toDateString();
      const total = jobs
        .filter((j) => j.status === 'completed' && new Date(j.createdAt).toDateString() === dayStr)
        .reduce((sum, j) => sum + j.totalAmount, 0);
      days.push({ label, total });
    }

    this.earningsChartSeries = [{ name: 'الأرباح', data: days.map((d) => d.total) }];
    this.earningsChartOptions = {
      ...this.earningsChartOptions,
      xaxis: { ...this.earningsChartOptions.xaxis, categories: days.map((d) => d.label) },
    };
  }

  private buildTrendChart(jobs: Booking[]): void {
    const days: { label: string; total: number }[] = [];
    for (let i = 29; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dayStr = d.toDateString();
      const total = jobs
        .filter((j) => j.status === 'completed' && new Date(j.createdAt).toDateString() === dayStr)
        .reduce((sum, j) => sum + j.totalAmount, 0);
      days.push({ label: String(d.getDate()), total });
    }

    this.trendChartSeries = [{ name: 'الأرباح', data: days.map((d) => d.total) }];
    this.trendChartOptions = {
      ...this.trendChartOptions,
      xaxis: { ...this.trendChartOptions.xaxis, categories: days.map((d) => d.label) },
    };
  }

  private buildStatusChart(jobs: Booking[]): void {
    const pending   = jobs.filter((j) => j.status === 'pending').length;
    const active    = jobs.filter((j) => j.status === 'active').length;
    const completed = jobs.filter((j) => j.status === 'completed').length;
    const cancelled = jobs.filter((j) => j.status === 'cancelled').length;
    this.statusChartSeries = [pending, active, completed, cancelled];
  }

  private buildCouponChart(jobs: Booking[]): void {
    const withCoupon = jobs.filter((j) => !!j.couponCode).length;
    const withoutCoupon = jobs.length - withCoupon;
    this.couponChartSeries = [withCoupon, withoutCoupon];
  }

  private buildGaugeChart(jobs: Booking[]): void {
    const completed = jobs.filter((j) => j.status === 'completed').length;
    const cancelled = jobs.filter((j) => j.status === 'cancelled').length;
    const total = completed + cancelled;
    this.gaugeChartSeries = [total === 0 ? 0 : Math.round((completed / total) * 100)];
  }

  private buildWeekdayChart(jobs: Booking[]): void {
    //  بنعتمد على createdAt (وقت ما الطلب اتبعت)، مش scheduledAt، عشان
    // نعرف الصنايعي أكتر أيام بتيجيله فيها طلبات جديدة فعليًا
    const labels = ['الأحد', 'الإتنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];
    const counts = new Array(7).fill(0);
    jobs
      .filter((j) => j.status !== 'cancelled')
      .forEach((j) => {
        const day = new Date(j.createdAt).getDay();
        counts[day] += 1;
      });

    this.weekdayChartSeries = [{ name: 'عدد الطلبات', data: counts }];
    this.weekdayChartOptions = {
      ...this.weekdayChartOptions,
      xaxis: { ...this.weekdayChartOptions.xaxis, categories: labels },
    };
  }

  // ── التنقل ─────────────────────────────────────────────
  navigateToJobsTab(tab: 'active' | 'completed'): void {
    this.router.navigate(['/pro/jobs'], { queryParams: { tab } });
  }

  navigateToRequestsTab(tab: 'pending' | 'completed' | 'cancelled'): void {
    this.router.navigate(['/pro/requests'], { queryParams: { tab } });
  }

  navigateByBookingStatus(status: BookingStatus): void {
    if (status === 'active' || status === 'completed') {
      this.navigateToJobsTab(status);
    } else {
      this.navigateToRequestsTab(status);
    }
  }

  navigateToBookingRow(job: Booking): void {
    this.navigateByBookingStatus(job.status);
  }

  openChatWithClient(client: TopClient): void {
    this.router.navigate(['/messages', client.clientId], {
      queryParams: { name: client.clientName, color: this.getAvatarColor(client.clientName) },
    });
  }

  getAvatarColor(name: string): string {
    return generateAvatarColor(name);
  }

  getStatusLabel(status: string): string {
    const map: Record<string, string> = {
      pending: 'قيد الانتظار', active: 'جارية', completed: 'مكتملة', cancelled: 'ملغية',
    };
    return map[status] ?? status;
  }

  getStatusClass(status: string): string {
    const map: Record<string, string> = {
      pending: 'status--pending', active: 'status--active',
      completed: 'status--completed', cancelled: 'status--cancelled',
    };
    return map[status] ?? '';
  }

  openChat(job: Booking): void {
    this.router.navigate(['/messages', job.clientId], {
      queryParams: { name: job.clientName, color: this.getAvatarColor(job.clientName) },
    });
  }
}
