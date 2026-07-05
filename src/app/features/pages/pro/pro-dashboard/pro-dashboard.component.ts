import { Component, inject, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { NgApexchartsModule, ChartComponent, ApexAxisChartSeries, ApexChart, ApexXAxis, ApexNonAxisChartSeries, ApexResponsive } from 'ng-apexcharts';
import { BookingsService } from '../../../../core/services/bookings.service';
import { AuthService } from '../../../../core/services/Auth.service';
import { WorkersService } from '../../../../core/services/workers.service';
import { Booking } from '../../../../core/models/booking.model';
import { Worker } from '../../../../core/models/worker.model';
import { generateAvatarColor } from '../../../../core/utils/color.util';
import { switchMap } from 'rxjs';

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

  // ===== Stats =====
  totalEarnings = computed(() =>
    this.allJobs()
      .filter((j) => j.status === 'completed')
      .reduce((sum, j) => sum + j.totalAmount, 0)
  );

  pendingCount = computed(() =>
    this.allJobs().filter((j) => j.status === 'pending').length
  );

  activeCount = computed(() =>
    this.allJobs().filter((j) => j.status === 'active').length
  );

  recentJobs = computed(() =>
    [...this.allJobs()]
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 5)
  );

  // ===== Bar Chart: أرباح آخر 7 أيام =====
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
    chart: { type: 'bar', height: 260, toolbar: { show: false }, fontFamily: 'Inter, IBM Plex Sans Arabic, sans-serif' },
    colors: ['#2563EB'],
    dataLabels: { enabled: false },
    plotOptions: { bar: { borderRadius: 6, columnWidth: '45%' } },
    grid: { borderColor: '#E2E8F0', strokeDashArray: 4 },
    xaxis: {
      categories: [],
      labels: { style: { fontSize: '12px' } },
    },
    // ⚠️ ده اللي بيحل مشكلة تراكب أيام الأسبوع على الموبايل — لما عرض
    // الشاشة يبقى أقل من 640px، بنصغّر الخط ونقلل مساحة الأعمدة عشان
    // الليبلز الطويلة (زي "الأربعاء") تاخد مساحة أقل ومتتلخبطش فوق بعض
    responsive: [
      {
        breakpoint: 640,
        options: {
          chart: { height: 220 },
          xaxis: { labels: { style: { fontSize: '9px' }, rotate: -45, rotateAlways: true } },
          plotOptions: { bar: { columnWidth: '60%' } },
        },
      },
    ],
  };

  // ===== Donut Chart: توزيع الحالات =====
  statusChartSeries: ApexNonAxisChartSeries = [];
  statusChartOptions: any = {
    chart: { type: 'donut', height: 260, fontFamily: 'Inter, IBM Plex Sans Arabic, sans-serif' },
    labels: ['معلقة', 'جارية', 'مكتملة', 'ملغية'],
    colors: ['#F97316', '#2563EB', '#16A34A', '#DC2626'],
    legend: { position: 'bottom', fontSize: '12px' },
    dataLabels: { enabled: false },
    stroke: { width: 0 },
    responsive: [
      {
        breakpoint: 640,
        options: {
          chart: { height: 220 },
          legend: { fontSize: '11px' },
        },
      },
    ],
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
        this.buildStatusChart(jobs);
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
      // ⚠️ اختصرنا اسم اليوم لحرفين بس (زي "سبت"، "أحد") بدل الاسم كامل
      // عشان ياخد مساحة أقل أفقيًا ويقلل احتمال التراكب من الأساس
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
      xaxis: {
        ...this.earningsChartOptions.xaxis,
        categories: days.map((d) => d.label),
      },
    };
  }

  private buildStatusChart(jobs: Booking[]): void {
    const pending   = jobs.filter((j) => j.status === 'pending').length;
    const active    = jobs.filter((j) => j.status === 'active').length;
    const completed = jobs.filter((j) => j.status === 'completed').length;
    const cancelled = jobs.filter((j) => j.status === 'cancelled').length;
    this.statusChartSeries = [pending, active, completed, cancelled];
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
