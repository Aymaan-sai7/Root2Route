import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { DatePipe } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { NgApexchartsModule, ApexAxisChartSeries, ApexChart, ApexXAxis, ApexNonAxisChartSeries, ApexResponsive } from 'ng-apexcharts';
import { AdminService, AdminStats } from '../../../../core/services/admin.service';
import { User, UserRole } from '../../../../core/models/user.model';
import { Booking, BookingStatus } from '../../../../core/models/booking.model';
import { Review } from '../../../../core/models/review.model';
import { generateAvatarColor } from '../../../../core/utils/color.util';
import { timeAgo } from '../../../../core/utils/time.util';
import { forkJoin } from 'rxjs';

interface TopWorker {
  workerId: string;
  workerName: string;
  count: number;
  revenue: number;
}

@Component({
  selector: 'app-admin-dashboard',
  standalone: true,
  imports: [DatePipe, RouterLink, NgApexchartsModule],
  templateUrl: './admin-dashboard.component.html',
  styleUrl: './admin-dashboard.component.css',
})
export class AdminDashboardComponent implements OnInit {
  private adminService = inject(AdminService);
  private router = inject(Router);

  stats       = signal<AdminStats | null>(null);
  allUsers    = signal<User[]>([]);
  allBookings = signal<Booking[]>([]);
  allReviews  = signal<Review[]>([]);
  loading     = signal(true);

  recentUsers = computed(() =>
    [...this.allUsers()]
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 6)
  );

  recentBookings = computed(() =>
    [...this.allBookings()]
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 8)
  );

  // ── إحصائيات مالية إضافية ────────────────────────────────
  totalGmv = computed(() =>
    this.allBookings()
      .filter((b) => b.status === 'completed')
      .reduce((sum, b) => sum + b.totalAmount, 0)
  );

  avgBookingValue = computed(() => {
    const completed = this.allBookings().filter((b) => b.status === 'completed');
    if (completed.length === 0) return 0;
    return Math.round(this.totalGmv() / completed.length);
  });

  approvalRate = computed(() => {
    const decided = this.allUsers().filter(
      (u) => u.role !== 'admin' && ['active', 'rejected', 'blocked'].includes(u.status ?? '')
    );
    if (decided.length === 0) return 0;
    const approved = decided.filter((u) => u.status === 'active').length;
    return Math.round((approved / decided.length) * 100);
  });

  topWorkers = computed<TopWorker[]>(() => {
    const map = new Map<string, TopWorker>();
    for (const b of this.allBookings()) {
      if (b.status !== 'completed') continue;
      const entry = map.get(b.workerId) ?? { workerId: b.workerId, workerName: b.workerName, count: 0, revenue: 0 };
      entry.count += 1;
      entry.revenue += b.totalAmount;
      map.set(b.workerId, entry);
    }
    return Array.from(map.values()).sort((a, b) => b.revenue - a.revenue).slice(0, 5);
  });

  // ── 1) Area/Line (span 7): إجمالي قيمة الحجوزات آخر 30 يوم ─
  gmvTrendSeries: ApexAxisChartSeries = [];
  gmvTrendOptions: any = {
    chart: { type: 'area', height: 280, toolbar: { show: false }, fontFamily: 'Inter, IBM Plex Sans Arabic, sans-serif' },
    colors: ['#2563EB'],
    stroke: { curve: 'smooth', width: 2.5 },
    fill: { type: 'gradient', gradient: { shadeIntensity: 1, opacityFrom: 0.35, opacityTo: 0.02, stops: [0, 90, 100] } },
    dataLabels: { enabled: false },
    grid: { borderColor: '#E2E8F0', strokeDashArray: 4 },
    xaxis: { categories: [], labels: { style: { fontSize: '10px' } }, tickAmount: 6 },
    yaxis: { labels: { style: { fontSize: '11px' } } },
    responsive: [{ breakpoint: 640, options: { chart: { height: 220 } } }],
  };

  // ── 2) Pie (span 5): توزيع المستخدمين حسب الدور ────────────
  rolesSeries: ApexNonAxisChartSeries = [];
  rolesOptions: any = {
    chart: {
      type: 'pie',
      height: 280,
      fontFamily: 'Inter, IBM Plex Sans Arabic, sans-serif',
      events: {
        dataPointSelection: (_e: any, _c: any, config: any) => {
          const order: UserRole[] = ['client', 'pro', 'admin'];
          this.navigateToUsers({ role: order[config.dataPointIndex] });
        },
      },
    },
    labels: ['عملاء', 'صنايعية', 'أدمن'],
    colors: ['#2563EB', '#F97316', '#0F172A'],
    legend: { position: 'bottom', fontSize: '12px' },
    dataLabels: { enabled: true, style: { fontSize: '11px' } },
    responsive: [{ breakpoint: 640, options: { chart: { height: 220 } } }],
  };

  // ── 3) Bar عمودي (span 4): تسجيلات جديدة آخر 7 أيام ────────
  registrationsSeries: ApexAxisChartSeries = [];
  registrationsOptions: Partial<{ chart: ApexChart; xaxis: ApexXAxis; colors: string[]; dataLabels: any; plotOptions: any; grid: any; responsive: ApexResponsive[] }> = {
    chart: {
      type: 'bar', height: 260, toolbar: { show: false }, fontFamily: 'Inter, IBM Plex Sans Arabic, sans-serif',
      events: { dataPointSelection: () => this.router.navigate(['/admin/registrations']) },
    } as any,
    colors: ['#2563EB'],
    dataLabels: { enabled: false },
    plotOptions: { bar: { borderRadius: 6, columnWidth: '45%' } },
    grid: { borderColor: '#E2E8F0', strokeDashArray: 4 },
    xaxis: { categories: [], labels: { style: { fontSize: '11px' } } },
    responsive: [{ breakpoint: 640, options: { chart: { height: 220 }, xaxis: { labels: { style: { fontSize: '9px' }, rotate: -45, rotateAlways: true } } } }],
  };

  // ── 4) Donut (span 4): الحسابات حسب الحالة ─────────────────
  statusSeries: ApexNonAxisChartSeries = [];
  statusOptions: any = {
    chart: {
      type: 'donut', height: 260, fontFamily: 'Inter, IBM Plex Sans Arabic, sans-serif',
      events: {
        dataPointSelection: (_e: any, _c: any, config: any) => {
          const order = ['pending', 'active', 'rejected', 'blocked'];
          this.navigateToUsers({ status: order[config.dataPointIndex] });
        },
      },
    },
    responsive: [{ breakpoint: 640, options: { chart: { height: 220 } } }],
    labels: ['قيد المراجعة', 'نشط', 'مرفوض', 'محظور'],
    colors: ['#F97316', '#16A34A', '#94A3B8', '#DC2626'],
    legend: { position: 'bottom', fontSize: '11px' },
    dataLabels: { enabled: false },
    stroke: { width: 0 },
  };

  // ── 5) Radial bar (span 4): معدل قبول التسجيلات ────────────
  approvalGaugeSeries: number[] = [];
  approvalGaugeOptions: any = {
    chart: {
      type: 'radialBar', height: 260, fontFamily: 'Inter, IBM Plex Sans Arabic, sans-serif',
      events: { dataPointSelection: () => this.router.navigate(['/admin/registrations']) },
    },
    colors: ['#16A34A'],
    plotOptions: {
      radialBar: {
        hollow: { size: '58%' },
        dataLabels: { value: { fontSize: '22px', fontWeight: 700, color: '#0F172A' }, name: { show: false } },
      },
    },
    labels: ['معدل القبول'],
    responsive: [{ breakpoint: 640, options: { chart: { height: 220 } } }],
  };

  // ── 6) Bar أفقي (span 6): الحجوزات حسب الحالة ──────────────
  bookingsSeries: ApexAxisChartSeries = [];
  bookingsOptions: any = {
    chart: {
      type: 'bar', height: 260, toolbar: { show: false }, fontFamily: 'Inter, IBM Plex Sans Arabic, sans-serif',
      events: {
        dataPointSelection: (_e: any, _c: any, config: any) => {
          const order: BookingStatus[] = ['pending', 'active', 'completed', 'cancelled'];
          this.navigateToBookings({ status: order[config.dataPointIndex] });
        },
      },
    },
    responsive: [{ breakpoint: 640, options: { chart: { height: 220 } } }],
    plotOptions: { bar: { horizontal: true, borderRadius: 6, distributed: true, barHeight: '55%' } },
    colors: ['#F97316', '#2563EB', '#16A34A', '#DC2626'],
    dataLabels: { enabled: true, style: { fontSize: '11px' } },
    grid: { borderColor: '#E2E8F0', strokeDashArray: 4 },
    xaxis: { categories: ['قيد الانتظار', 'جاري التنفيذ', 'مكتمل', 'ملغي'] },
    legend: { show: false },
  };

  // ── 7) Donut (span 6): توزيع التقييمات بالنجوم ─────────────
  reviewStarsSeries: ApexNonAxisChartSeries = [];
  reviewStarsOptions: any = {
    chart: {
      type: 'donut', height: 260, fontFamily: 'Inter, IBM Plex Sans Arabic, sans-serif',
      events: {
        dataPointSelection: (_e: any, _c: any, config: any) => {
          this.navigateToReviews({ rating: String(config.dataPointIndex + 1) });
        },
      },
    },
    responsive: [{ breakpoint: 640, options: { chart: { height: 220 } } }],
    labels: ['نجمة واحدة', 'نجمتين', '3 نجوم', '4 نجوم', '5 نجوم'],
    colors: ['#DC2626', '#F97316', '#EAB308', '#84CC16', '#16A34A'],
    legend: { position: 'bottom', fontSize: '10.5px' },
    dataLabels: { enabled: true, style: { fontSize: '10px' } },
    stroke: { width: 0 },
  };

  // ── 8) Bar أفقي (span 12): أكتر التخصصات طلبًا ─────────────
  topTradesSeries: ApexAxisChartSeries = [];
  topTradesOptions: any = {
    chart: { type: 'bar', height: 300, toolbar: { show: false }, fontFamily: 'Inter, IBM Plex Sans Arabic, sans-serif' },
    colors: ['#2563EB'],
    plotOptions: { bar: { horizontal: true, borderRadius: 5, barHeight: '55%' } },
    dataLabels: { enabled: true, style: { fontSize: '11px' } },
    grid: { borderColor: '#E2E8F0', strokeDashArray: 4 },
    xaxis: { categories: [], labels: { style: { fontSize: '11px' } } },
    responsive: [{ breakpoint: 640, options: { chart: { height: 260 }, xaxis: { labels: { style: { fontSize: '9px' } } } } }],
  };

  ngOnInit(): void {
    forkJoin({
      stats: this.adminService.getStats(),
      users: this.adminService.getUsers({}),
      bookings: this.adminService.getAllBookings(),
      reviews: this.adminService.getAllReviews(),
    }).subscribe({
      next: ({ stats, users, bookings, reviews }) => {
        this.stats.set(stats);
        this.allUsers.set(users);
        this.allBookings.set(bookings);
        this.allReviews.set(reviews);

        this.buildGmvTrendChart(bookings);
        this.buildRolesChart(users);
        this.buildRegistrationsChart(users);
        this.buildStatusChart(users);
        this.buildApprovalGauge();
        this.buildBookingsChart(bookings);
        this.buildReviewStarsChart(reviews);
        this.buildTopTradesChart(bookings);

        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  private buildGmvTrendChart(bookings: Booking[]): void {
    const days: { label: string; total: number }[] = [];
    for (let i = 29; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dayStr = d.toDateString();
      const total = bookings
        .filter((b) => b.status === 'completed' && new Date(b.createdAt).toDateString() === dayStr)
        .reduce((sum, b) => sum + b.totalAmount, 0);
      days.push({ label: String(d.getDate()), total });
    }
    this.gmvTrendSeries = [{ name: 'قيمة الحجوزات', data: days.map((d) => d.total) }];
    this.gmvTrendOptions = {
      ...this.gmvTrendOptions,
      xaxis: { ...this.gmvTrendOptions.xaxis, categories: days.map((d) => d.label) },
    };
  }

  private buildRolesChart(users: User[]): void {
    this.rolesSeries = [
      users.filter((u) => u.role === 'client').length,
      users.filter((u) => u.role === 'pro').length,
      users.filter((u) => u.role === 'admin').length,
    ];
  }

  private buildRegistrationsChart(users: User[]): void {
    const days: { label: string; count: number }[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const label = d.toLocaleDateString('ar-EG', { weekday: 'short' }).slice(0, 3);
      const dayStr = d.toDateString();
      const count = users.filter((u) => new Date(u.createdAt).toDateString() === dayStr).length;
      days.push({ label, count });
    }
    this.registrationsSeries = [{ name: 'تسجيلات جديدة', data: days.map((d) => d.count) }];
    this.registrationsOptions = {
      ...this.registrationsOptions,
      xaxis: { ...this.registrationsOptions.xaxis, categories: days.map((d) => d.label) },
    };
  }

  private buildStatusChart(users: User[]): void {
    this.statusSeries = [
      users.filter((u) => u.status === 'pending').length,
      users.filter((u) => u.status === 'active').length,
      users.filter((u) => u.status === 'rejected').length,
      users.filter((u) => u.status === 'blocked').length,
    ];
  }

  private buildApprovalGauge(): void {
    this.approvalGaugeSeries = [this.approvalRate()];
  }

  private buildBookingsChart(bookings: Booking[]): void {
    this.bookingsSeries = [{
      name: 'عدد الحجوزات',
      data: [
        bookings.filter((b) => b.status === 'pending').length,
        bookings.filter((b) => b.status === 'active').length,
        bookings.filter((b) => b.status === 'completed').length,
        bookings.filter((b) => b.status === 'cancelled').length,
      ],
    }];
  }

  private buildReviewStarsChart(reviews: Review[]): void {
    const counts = [0, 0, 0, 0, 0];
    reviews.forEach((r) => {
      const idx = Math.min(5, Math.max(1, Math.round(r.rating))) - 1;
      counts[idx] += 1;
    });
    this.reviewStarsSeries = counts;
  }

  private buildTopTradesChart(bookings: Booking[]): void {
    const map = new Map<string, number>();
    bookings
      .filter((b) => b.status !== 'cancelled')
      .forEach((b) => {
        const label = b.workerTrade || 'غير محدد';
        map.set(label, (map.get(label) ?? 0) + 1);
      });

    const sorted = Array.from(map.entries()).sort((a, b) => b[1] - a[1]).slice(0, 8);
    this.topTradesSeries = [{ name: 'عدد الطلبات', data: sorted.map(([, count]) => count) }];
    this.topTradesOptions = {
      ...this.topTradesOptions,
      xaxis: { ...this.topTradesOptions.xaxis, categories: sorted.map(([label]) => label) },
    };
  }

  // ── التنقل ─────────────────────────────────────────────
  //  بيبعت query params لصفحات admin-users/admin-bookings/admin-reviews —
  // لازم الصفحات دي تقرا الـ query params دي في ngOnInit (زي ما عملنا في
  // pro-requests/pro-jobs بالظبط) عشان الفلترة تشتغل فعليًا. لو لسه
  // معملتهاش، الضغط هيوديك للصفحة بس هيفتحها من غير فلتر
  navigateToUsers(query: Record<string, string>): void {
    this.router.navigate(['/admin/users'], { queryParams: query });
  }

  navigateToBookings(query: Record<string, string>): void {
    this.router.navigate(['/admin/bookings'], { queryParams: query });
  }

  navigateToReviews(query: Record<string, string> = {}): void {
    this.router.navigate(['/admin/reviews'], { queryParams: query });
  }

  navigateToBookingRow(booking: Booking): void {
    this.router.navigate(['/admin/bookings'], { queryParams: { status: booking.status } });
  }

  getAvatarColor(name: string): string {
    return generateAvatarColor(name);
  }

  timeAgo(date: string): string {
    return timeAgo(date);
  }

  roleLabel(role: string): string {
    const map: Record<string, string> = { client: 'عميل', pro: 'صنايعي', admin: 'أدمن' };
    return map[role] ?? role;
  }

  statusLabel(status: string): string {
    const map: Record<string, string> = {
      pending: 'قيد المراجعة', active: 'نشط', rejected: 'مرفوض', blocked: 'محظور',
    };
    return map[status] ?? status;
  }

  getBookingStatusLabel(status: string): string {
    const map: Record<string, string> = {
      pending: 'قيد الانتظار', active: 'جارية', completed: 'مكتملة', cancelled: 'ملغية',
    };
    return map[status] ?? status;
  }

  getBookingStatusClass(status: string): string {
    const map: Record<string, string> = {
      pending: 'ad-status-badge--pending', active: 'ad-status-badge--active',
      completed: 'ad-status-badge--completed', cancelled: 'ad-status-badge--cancelled',
    };
    return map[status] ?? '';
  }
}
