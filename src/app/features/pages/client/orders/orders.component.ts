import { Component, inject, OnInit, signal, computed } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { DatePipe } from '@angular/common';
import { BookingsService } from '../../../../core/services/bookings.service';
import { AuthService } from '../../../../core/services/Auth.service';
import { Booking, BookingStatus } from '../../../../core/models/booking.model';

type TabFilter = 'all' | BookingStatus;

interface Tab {
  id: TabFilter;
  label: string;
}

@Component({
  selector: 'app-orders',
  standalone: true,
  imports: [RouterLink, DatePipe],
  templateUrl: './orders.component.html',
  styleUrl: './orders.component.css',
})
export class OrdersComponent implements OnInit {
  private bookings = inject(BookingsService);
  private auth     = inject(AuthService);
  private router   = inject(Router);

  allOrders   = signal<Booking[]>([]);
  activeTab   = signal<TabFilter>('all');
  loading     = signal(true);
  error       = signal<string | null>(null);

  tabs: Tab[] = [
    { id: 'all',       label: 'الكل'         },
    { id: 'active',    label: 'جارية'        },
    { id: 'pending',   label: 'قيد الانتظار' },
    { id: 'completed', label: 'مكتملة'       },
    { id: 'cancelled', label: 'ملغية'        },
  ];

  filteredOrders = computed(() => {
    const tab = this.activeTab();
    if (tab === 'all') return this.allOrders();
    return this.allOrders().filter((o) => o.status === tab);
  });

  tabCount(tab: TabFilter): number {
    if (tab === 'all') return this.allOrders().length;
    return this.allOrders().filter((o) => o.status === tab).length;
  }

  ngOnInit(): void {
    const clientId = this.auth.currentUser()?.id;
    if (!clientId) { this.router.navigate(['/login']); return; }

    this.bookings.getByClient(clientId).subscribe({
      next: (data) => {
        this.allOrders.set(data);
        this.loading.set(false);
      },
      error: () => {
        this.error.set('مش قادر يجيب الطلبات، تأكد إن json-server شغال.');
        this.loading.set(false);
      },
    });
  }

  setTab(tab: TabFilter): void {
    this.activeTab.set(tab);
  }

  goToDetails(id: string): void {
    this.router.navigate(['/orders', id]);
  }

  getStatusLabel(status: string): string {
    const map: Record<string, string> = {
      pending:   'قيد الانتظار',
      active:    'جارية',
      completed: 'مكتملة',
      cancelled: 'ملغية',
    };
    return map[status] ?? status;
  }

  getStatusClass(status: string): string {
    const map: Record<string, string> = {
      pending:   'status--pending',
      active:    'status--active',
      completed: 'status--completed',
      cancelled: 'status--cancelled',
    };
    return map[status] ?? '';
  }
}
