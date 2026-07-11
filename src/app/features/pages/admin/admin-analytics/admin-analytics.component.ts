import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { NgApexchartsModule, ApexAxisChartSeries, ApexNonAxisChartSeries, ApexChart, ApexXAxis, ApexDataLabels, ApexStroke, ApexFill, ApexLegend, ApexTooltip, ApexPlotOptions } from 'ng-apexcharts';
import { AdminService } from '../../../../core/services/admin.service';
import { Booking } from '../../../../core/models/booking.model';
import { User } from '../../../../core/models/user.model';

interface WorkerRevenue {
  workerId: string;
  workerName: string;
  workerAvatarColor: string;
  revenue: number;
  completedJobs: number;
}

@Component({
  selector: 'app-admin-analytics',
  standalone: true,
  imports: [NgApexchartsModule],
  templateUrl: './admin-analytics.component.html',
  styleUrl: './admin-analytics.component.css',
})
export class AdminAnalyticsComponent implements OnInit {
  private adminService = inject(AdminService);

  loading = signal(true);
  bookings = signal<Booking[]>([]);
  users = signal<User[]>([]);

  ngOnInit(): void {
    this.load();
  }

  private load(): void {
    this.loading.set(true);
    this.adminService.getAllBookings().subscribe({
      next: (bookings) => {
        this.bookings.set(bookings);
        this.adminService.getUsers().subscribe({
          next: (users) => {
            this.users.set(users);
            this.loading.set(false);
            this.buildCharts();
          },
          error: () => this.loading.set(false),
        });
      },
      error: () => this.loading.set(false),
    });
  }

  // ══════════════════════════════════════════════════════════
  // إحصائيات سريعة (Stat Cards)
  // ══════════════════════════════════════════════════════════
  private completedBookings = computed(() =>
    this.bookings().filter((b) => b.status === 'completed')
  );

  totalRevenue = computed(() =>
    this.completedBookings().reduce((sum, b) => sum + b.totalAmount, 0)
  );

  avgBookingValue = computed(() => {
    const list = this.completedBookings();
    if (list.length === 0) return 0;
    return Math.round(this.totalRevenue() / list.length);
  });

  // ⚠️ إجمالي الخصومات الممنوحة عبر كل الحجوزات (مش الـ completed بس) —
  // بيعرض "الأثر الفعلي" لنظام الكوبونات على المنصة ككل
  totalDiscountsGiven = computed(() =>
    this.bookings().reduce((sum, b) => sum + (b.discountAmount ?? 0), 0)
  );

  // ⚠️ معدل التحويل: من كل العملاء الموافق عليهم (active)، كام واحد
  // عمل حجز فعلي واحد على الأقل
  conversionRate = computed(() => {
    const activeClients = this.users().filter((u) => u.role === 'client' && u.status === 'active');
    if (activeClients.length === 0) return 0;
    const clientIdsWithBookings = new Set(this.bookings().map((b) => b.clientId));
    const convertedCount = activeClients.filter((u) => clientIdsWithBookings.has(u.id)).length;
    return Math.round((convertedCount / activeClients.length) * 100);
  });

  // ══════════════════════════════════════════════════════════
  // قمع التحويل (Funnel) — أرقام خام تتعرض في شارت Bar تحت
  // ══════════════════════════════════════════════════════════
  funnelStages = computed(() => {
    const allClients = this.users().filter((u) => u.role === 'client');
    const activeClients = allClients.filter((u) => u.status === 'active');
    const clientIdsWithBookings = new Set(this.bookings().map((b) => b.clientId));
    const bookedClients = activeClients.filter((u) => clientIdsWithBookings.has(u.id));

    return [
      { label: 'كل التسجيلات', value: allClients.length },
      { label: 'موافق عليهم', value: activeClients.length },
      { label: 'حجزوا فعليًا', value: bookedClients.length },
    ];
  });

  // ══════════════════════════════════════════════════════════
  // أفضل 5 صنايعية بالإيراد
  // ══════════════════════════════════════════════════════════
  topWorkers = computed<WorkerRevenue[]>(() => {
    const map = new Map<string, WorkerRevenue>();

    for (const b of this.completedBookings()) {
      const existing = map.get(b.workerId);
      if (existing) {
        existing.revenue += b.totalAmount;
        existing.completedJobs += 1;
      } else {
        map.set(b.workerId, {
          workerId: b.workerId,
          workerName: b.workerName,
          workerAvatarColor: b.workerAvatarColor,
          revenue: b.totalAmount,
          completedJobs: 1,
        });
      }
    }

    return [...map.values()].sort((a, b) => b.revenue - a.revenue).slice(0, 5);
  });

  // ══════════════════════════════════════════════════════════
  // Charts (ApexCharts)
  // ══════════════════════════════════════════════════════════

  // ── شارت 1: الإيرادات آخر 14 يوم ──────────────────────────
  revenueChartSeries: ApexAxisChartSeries = [];
  revenueChartLabels: string[] = [];
  revenueChart: ApexChart = { type: 'area', height: 260, toolbar: { show: false } };
  revenueChartDataLabels: ApexDataLabels = { enabled: false };
  revenueChartStroke: ApexStroke = { curve: 'smooth', width: 2.5, colors: ['#2563EB'] };
  revenueChartFill: ApexFill = {
    type: 'gradient',
    gradient: { shadeIntensity: 1, opacityFrom: 0.35, opacityTo: 0.02, stops: [0, 90, 100] },
    colors: ['#2563EB'],
  };
  revenueChartTooltip: ApexTooltip = { y: { formatter: (val: number) => `${val} ج.م` } };
  revenueChartXaxis: ApexXAxis = { categories: [] };

  // ── شارت 2: التصنيفات الأكثر طلبًا ──────────────────────────
  tradesChartSeries: ApexNonAxisChartSeries = [];
  tradesChartLabels: string[] = [];
  tradesChart: ApexChart = { type: 'donut', height: 260 };
  tradesChartColors = ['#2563EB', '#F97316', '#16A34A', '#7A5FA0', '#0F172A', '#1D4ED8', '#DC2626', '#0EA5E9'];
  tradesChartLegend: ApexLegend = { position: 'bottom', fontSize: '12px' };

  // ── شارت 3: قمع التحويل ─────────────────────────────────────
  funnelChartSeries: ApexAxisChartSeries = [];
  funnelChart: ApexChart = { type: 'bar', height: 220, toolbar: { show: false } };
  funnelChartPlotOptions: ApexPlotOptions = {
    bar: { horizontal: true, borderRadius: 6, distributed: true, barHeight: '55%' },
  };
  funnelChartColors = ['#94A3B8', '#2563EB', '#16A34A'];
  funnelChartXaxis: ApexXAxis = { categories: [] };
  funnelChartDataLabels: ApexDataLabels = { enabled: true };

  private buildCharts(): void {
    this.buildRevenueChart();
    this.buildTradesChart();
    this.buildFunnelChart();
  }

  private buildRevenueChart(): void {
    const days: { label: string; total: number }[] = [];
    const today = new Date();

    for (let i = 13; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const dayKey = d.toISOString().split('T')[0];

      const total = this.completedBookings()
        .filter((b) => b.createdAt.startsWith(dayKey))
        .reduce((sum, b) => sum + b.totalAmount, 0);

      days.push({
        label: d.toLocaleDateString('ar-EG', { day: 'numeric', month: 'short' }),
        total,
      });
    }

    this.revenueChartLabels = days.map((d) => d.label);
    this.revenueChartXaxis = { categories: this.revenueChartLabels };
    this.revenueChartSeries = [{ name: 'الإيرادات', data: days.map((d) => d.total) }];
  }

  private buildTradesChart(): void {
    const counts = new Map<string, number>();
    for (const b of this.bookings()) {
      const label = b.workerTrade || 'غير محدد';
      counts.set(label, (counts.get(label) ?? 0) + 1);
    }

    const sorted = [...counts.entries()].sort((a, b) => b[1] - a[1]);
    this.tradesChartLabels = sorted.map(([label]) => label);
    this.tradesChartSeries = sorted.map(([, count]) => count);
  }

  private buildFunnelChart(): void {
    const stages = this.funnelStages();
    this.funnelChartXaxis = { categories: stages.map((s) => s.label) };
    this.funnelChartSeries = [{ name: 'العدد', data: stages.map((s) => s.value) }];
  }
}
