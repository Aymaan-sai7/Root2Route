import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { DatePipe } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { AdminService } from '../../../../core/services/admin.service';
import { Booking, BookingStatus } from '../../../../core/models/booking.model';
import { timeAgo } from '../../../../core/utils/time.util';
import { AdminSelectComponent, AdminSelectOption } from '../../../../shared/components/admin-select/admin-select.component';

const VALID_STATUSES: BookingStatus[] = ['pending', 'active', 'completed', 'cancelled'];

@Component({
  selector: 'app-admin-bookings',
  standalone: true,
  imports: [DatePipe, AdminSelectComponent],
  templateUrl: './admin-bookings.component.html',
  styleUrl: './admin-bookings.component.css',
})
export class AdminBookingsComponent implements OnInit {
  private adminService = inject(AdminService);
  private route = inject(ActivatedRoute);

  bookings = signal<Booking[]>([]);
  loading = signal(true);
  statusFilter = signal<BookingStatus | ''>('');
  searchTerm = signal('');
  expandedId = signal<string | null>(null);

  statusOptions: AdminSelectOption[] = [
    { value: 'pending', label: 'قيد الانتظار' },
    { value: 'active', label: 'جاري التنفيذ' },
    { value: 'completed', label: 'مكتمل' },
    { value: 'cancelled', label: 'ملغي' },
  ];

  filteredBookings = computed(() => {
    const status = this.statusFilter();
    const q = this.searchTerm().trim().toLowerCase();
    let list = this.bookings();
    if (status) list = list.filter((b) => b.status === status);
    if (q) {
      list = list.filter(
        (b) =>
          b.clientName?.toLowerCase().includes(q) ||
          b.workerName?.toLowerCase().includes(q) ||
          b.description?.toLowerCase().includes(q)
      );
    }
    return [...list].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  });

  totalRevenue = computed(() =>
    this.bookings()
      .filter((b) => b.status === 'completed')
      .reduce((sum, b) => sum + b.totalAmount, 0)
  );

  avgBookingValue = computed(() => {
    const completed = this.bookings().filter((b) => b.status === 'completed');
    if (completed.length === 0) return 0;
    return Math.round(this.totalRevenue() / completed.length);
  });

  completedCount = computed(() => this.bookings().filter((b) => b.status === 'completed').length);
  activeCount = computed(() => this.bookings().filter((b) => b.status === 'active').length);

  ngOnInit(): void {
    //  جديد: لو جاي من رابط فيه ?status= (زي اللي بيتبعت من charts
    // داشبورد الأدمن)، بنطبقه كفلتر ابتدائي. filteredBookings computed
    // بتاعتنا هتعيد الحساب تلقائي أول ما statusFilter تتغيّر، فمفيش داعي
    // نستنى نتيجة الـ http call الأول
    const status = this.route.snapshot.queryParamMap.get('status') as BookingStatus | null;
    if (status && VALID_STATUSES.includes(status)) {
      this.statusFilter.set(status);
    }

    this.adminService.getAllBookings().subscribe({
      next: (list) => {
        this.bookings.set(list);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  onStatusChange(value: string): void {
    this.statusFilter.set(value as BookingStatus | '');
  }

  onSearchInput(event: Event): void {
    this.searchTerm.set((event.target as HTMLInputElement).value);
  }

  toggleExpand(booking: Booking): void {
    this.expandedId.set(this.expandedId() === booking.id ? null : booking.id);
  }

  timeAgo(date: string): string {
    return timeAgo(date);
  }

  statusLabel(status: BookingStatus): string {
    const map: Record<BookingStatus, string> = {
      pending: 'قيد الانتظار',
      active: 'جاري التنفيذ',
      completed: 'مكتمل',
      cancelled: 'ملغي',
    };
    return map[status];
  }
}
