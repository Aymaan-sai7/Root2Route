import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { AdminService } from '../../../../core/services/admin.service';
import { Booking, BookingStatus } from '../../../../core/models/booking.model';
import { timeAgo } from '../../../../core/utils/time.util';

@Component({
  selector: 'app-admin-bookings',
  standalone: true,
  imports: [],
  templateUrl: './admin-bookings.component.html',
  styleUrl: './admin-bookings.component.css',
})
export class AdminBookingsComponent implements OnInit {
  private adminService = inject(AdminService);

  bookings = signal<Booking[]>([]);
  loading = signal(true);
  statusFilter = signal<BookingStatus | ''>('');

  filteredBookings = computed(() => {
    const filter = this.statusFilter();
    const list = this.bookings();
    return filter ? list.filter((b) => b.status === filter) : list;
  });

  ngOnInit(): void {
    this.adminService.getAllBookings().subscribe({
      next: (list) => {
        this.bookings.set(list);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  onStatusChange(event: Event): void {
    this.statusFilter.set((event.target as HTMLSelectElement).value as BookingStatus | '');
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
