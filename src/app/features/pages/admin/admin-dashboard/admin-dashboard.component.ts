import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { NgApexchartsModule, ApexAxisChartSeries, ApexChart, ApexXAxis, ApexNonAxisChartSeries, ApexResponsive } from 'ng-apexcharts';
import { AdminService, AdminStats } from '../../../../core/services/admin.service';
import { User } from '../../../../core/models/user.model';
import { Booking } from '../../../../core/models/booking.model';
import { generateAvatarColor } from '../../../../core/utils/color.util';
import { timeAgo } from '../../../../core/utils/time.util';
import { forkJoin } from 'rxjs';

@Component({
  selector: 'app-admin-dashboard',
  standalone: true,
  imports: [DatePipe, RouterLink, NgApexchartsModule],
  templateUrl: './admin-dashboard.component.html',
  styleUrl: './admin-dashboard.component.css',
})
export class AdminDashboardComponent implements OnInit {
  private adminService = inject(AdminService);

  stats     = signal<AdminStats | null>(null);
  allUsers  = signal<User[]>([]);
  allBookings = signal<Booking[]>([]);
  loading   = signal(true);

  recentUsers = computed(() =>
    [...this.allUsers()]
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 6)
  );

  // ===== Chart 1: تسجيلات جديدة آخر 7 أيام (Bar) =====
  registrationsSeries: ApexAxisChartSeries = [];
  registrationsOptions: Partial<{ chart: ApexChart; xaxis: ApexXAxis; colors: string[]; dataLabels: any; plotOptions: any; grid: any; responsive: ApexResponsive[] }> = {
    chart: { type: 'bar', height: 240, toolbar: { show: false }, fontFamily: 'Inter, IBM Plex Sans Arabic, sans-serif' },
    colors: ['#2563EB'],
    dataLabels: { enabled: false },
    plotOptions: { bar: { borderRadius: 6, columnWidth: '45%' } },
    grid: { borderColor: '#E2E8F0', strokeDashArray: 4 },
    xaxis: { categories: [], labels: { style: { fontSize: '12px' } } },
    responsive: [{ breakpoint: 640, options: { chart: { height: 200 }, xaxis: { labels: { style: { fontSize: '9px' }, rotate: -45, rotateAlways: true } } } }],
  };

  // ===== Chart 2: توزيع المستخدمين حسب الدور (Donut) =====
  rolesSeries: ApexNonAxisChartSeries = [];

  rolesOptions: any = {
  chart: {
    type: 'donut',
    height: 240,
    fontFamily: 'Inter, IBM Plex Sans Arabic, sans-serif'
  },
  responsive: [
    {
      breakpoint: 640,
      options: {
        chart: {
          height: 200
        }
      }
    }
  ],
  labels: ['عملاء', 'صنايعية', 'أدمن'],
  colors: ['#2563EB', '#F97316', '#0F172A'],
  legend: {
    position: 'bottom',
    fontSize: '12px'
  },
  dataLabels: {
    enabled: false
  },
  stroke: {
    width: 0
  },
};

  // ===== Chart 3: توزيع الحسابات حسب الحالة (Donut) =====
  statusSeries: ApexNonAxisChartSeries = [];
  statusOptions: any = {
  chart: {
    type: 'donut',
    height: 240,
    fontFamily: 'Inter, IBM Plex Sans Arabic, sans-serif'
  },

  responsive: [
    {
      breakpoint: 640,
      options: {
        chart: {
          height: 200
        }
      }
    }
  ],

  labels: ['قيد المراجعة', 'نشط', 'مرفوض', 'محظور'],
  colors: ['#F97316', '#16A34A', '#94A3B8', '#DC2626'],
  legend: {
    position: 'bottom',
    fontSize: '12px'
  },
  dataLabels: {
    enabled: false
  },
  stroke: {
    width: 0
  },
};

  // ===== Chart 4: الحجوزات حسب الحالة (Bar أفقي) =====
  bookingsSeries: ApexAxisChartSeries = [];
  bookingsOptions: any = {
    chart: {
  type: 'bar',
  height: 240,
  toolbar: {
    show: false
  },
  fontFamily: 'Inter, IBM Plex Sans Arabic, sans-serif'
},

responsive: [
  {
    breakpoint: 640,
    options: {
      chart: {
        height: 220
      }
    }
  }
],
    plotOptions: { bar: { horizontal: true, borderRadius: 6, distributed: true, barHeight: '55%' } },
    colors: ['#F97316', '#2563EB', '#16A34A', '#DC2626'],
    dataLabels: { enabled: true, style: { fontSize: '11px' } },
    grid: { borderColor: '#E2E8F0', strokeDashArray: 4 },
    xaxis: { categories: ['قيد الانتظار', 'جاري التنفيذ', 'مكتمل', 'ملغي'] },
    legend: { show: false },
  };

  ngOnInit(): void {
    forkJoin({
      stats: this.adminService.getStats(),
      users: this.adminService.getUsers({}),
      bookings: this.adminService.getAllBookings(),
    }).subscribe({
      next: ({ stats, users, bookings }) => {
        this.stats.set(stats);
        this.allUsers.set(users);
        this.allBookings.set(bookings);
        this.buildRegistrationsChart(users);
        this.buildRolesChart(users);
        this.buildStatusChart(users);
        this.buildBookingsChart(bookings);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
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

  private buildRolesChart(users: User[]): void {
    this.rolesSeries = [
      users.filter((u) => u.role === 'client').length,
      users.filter((u) => u.role === 'pro').length,
      users.filter((u) => u.role === 'admin').length,
    ];
  }

  private buildStatusChart(users: User[]): void {
    this.statusSeries = [
      users.filter((u) => u.status === 'pending').length,
      users.filter((u) => u.status === 'active').length,
      users.filter((u) => u.status === 'rejected').length,
      users.filter((u) => u.status === 'blocked').length,
    ];
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
}
