import { Component, inject, OnInit, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { DashboardService, ClientDashboardData } from '../../../../core/services/dash.service';

@Component({
  selector: 'app-client-dashboard',
  standalone: true,
  imports: [DatePipe, RouterLink],
  templateUrl: './client-dashboard.component.html',
  styleUrl: './client-dashboard.component.css',
})
export class ClientDashboardComponent implements OnInit {
  private dashboard = inject(DashboardService);

  data = signal<ClientDashboardData | null>(null);
  loading = signal(true);
  error = signal<string | null>(null);

  // مؤقتاً hardcoded لحد ما تعمل AuthService
  private readonly MOCK_CLIENT_ID = 'u1';

  ngOnInit(): void {
    this.dashboard.getClientData(this.MOCK_CLIENT_ID).subscribe({
      next: (result) => {
        this.data.set(result);
        this.loading.set(false);
      },
      error: () => {
        this.error.set('مش قادر يجيب البيانات، تأكد إن json-server شغال.');
        this.loading.set(false);
      },
    });
  }

  getStatusLabel(status: string): string {
    const map: Record<string, string> = {
      pending: 'قيد الانتظار',
      active: 'جارية',
      completed: 'مكتملة',
      cancelled: 'ملغية',
    };
    return map[status] ?? status;
  }

  getStatusClass(status: string): string {
    const map: Record<string, string> = {
      pending: 'status--pending',
      active: 'status--active',
      completed: 'status--completed',
      cancelled: 'status--cancelled',
    };
    return map[status] ?? '';
  }
}
