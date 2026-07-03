import { Component, inject, OnInit, signal, computed } from '@angular/core';
import { DatePipe } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { BookingsService } from '../../../../core/services/bookings.service';
import { AuthService } from '../../../../core/services/Auth.service';
import { WorkersService } from '../../../../core/services/workers.service';
import { Booking } from '../../../../core/models/booking.model';
import { generateAvatarColor } from '../../../../core/utils/color.util';
import { switchMap } from 'rxjs';

type TabFilter = 'pending' | 'active' | 'completed' | 'cancelled';

@Component({
  selector: 'app-pro-requests',
  standalone: true,
  imports: [DatePipe, ],
  templateUrl: './pro-requests.component.html',
  styleUrl: './pro-requests.component.css',
})
export class ProRequestsComponent implements OnInit {
  private bookings = inject(BookingsService);
  private auth     = inject(AuthService);
  private workers  = inject(WorkersService);
  private router   = inject(Router);

  allJobs   = signal<Booking[]>([]);
  activeTab = signal<TabFilter>('pending');
  loading   = signal(true);
  error     = signal<string | null>(null);

  tabs = [
    { id: 'pending'   as TabFilter, label: 'معلقة'    },
    { id: 'active'    as TabFilter, label: 'جارية'     },
    { id: 'completed' as TabFilter, label: 'مكتملة'    },
    { id: 'cancelled' as TabFilter, label: 'ملغية'     },
  ];

  filtered = computed(() =>
    this.allJobs().filter((j) => j.status === this.activeTab())
  );

  tabCount(tab: TabFilter): number {
    return this.allJobs().filter((j) => j.status === tab).length;
  }

  ngOnInit(): void {
    const user = this.auth.currentUser();
    if (!user) return;

    this.workers.getByUserId(user.id).pipe(
      switchMap((list) => {
        const worker = list[0];
        if (!worker) throw new Error('مش لاقي بيانات الصنايعي.');
        return this.bookings.getByWorker(worker.id);
      })
    ).subscribe({
      next: (jobs) => {
        this.allJobs.set(jobs);
        this.loading.set(false);
      },
      error: (err) => {
        this.error.set(err.message ?? 'مش قادر يجيب الطلبات.');
        this.loading.set(false);
      },
    });
  }

  setTab(tab: TabFilter): void {
    this.activeTab.set(tab);
  }

  acceptJob(id: string): void {
    this.bookings.updateStatus(id, 'active').subscribe({
      next: (updated) => {
        this.allJobs.update((jobs) =>
          jobs.map((j) => (j.id === id ? updated : j))
        );
      },
    });
  }

  rejectJob(id: string): void {
    this.bookings.updateStatus(id, 'cancelled').subscribe({
      next: (updated) => {
        this.allJobs.update((jobs) =>
          jobs.map((j) => (j.id === id ? updated : j))
        );
      },
    });
  }

  completeJob(id: string, workerId: string): void {
    this.bookings.updateStatus(id, 'completed').subscribe({
      next: (updated) => {
        this.allJobs.update((jobs) =>
          jobs.map((j) => (j.id === id ? updated : j))
        );
        this.workers.incrementCompletedJobs(workerId).subscribe();
      },
    });
  }

  getAvatarColor(name: string): string {
    return generateAvatarColor(name);
  }

  openChat(job: Booking): void {
    this.router.navigate(['/messages', job.clientId], {
      queryParams: { name: job.clientName, color: this.getAvatarColor(job.clientName) },
    });
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

  deleteJob(id: string): void {
    const confirmed = confirm('متأكد إنك عايز تمسح الطلب ده نهائيًا؟ الإجراء ده مش هيترجع.');
    if (!confirmed) return;

    this.bookings.delete(id).subscribe({
      next: () => {
        this.allJobs.update((jobs) => jobs.filter((j) => j.id !== id));
      },
    });
  }
}
