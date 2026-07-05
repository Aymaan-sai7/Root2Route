import { Component, inject, OnInit, signal, computed } from '@angular/core';
import { DatePipe } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { BookingsService } from '../../../../core/services/bookings.service';
import { AuthService } from '../../../../core/services/Auth.service';
import { WorkersService } from '../../../../core/services/workers.service';
import { Booking } from '../../../../core/models/booking.model';
import { generateAvatarColor } from '../../../../core/utils/color.util';
import { switchMap } from 'rxjs';
import { confirmDelete } from '../../../../core/utils/confirm.util';

type TabFilter = 'active' | 'completed';

@Component({
  selector: 'app-pro-jobs',
  standalone: true,
  imports: [DatePipe,],
  templateUrl: './pro-jobs.component.html',
  styleUrl: './pro-jobs.component.css',
})
export class ProJobsComponent implements OnInit {
  private bookings = inject(BookingsService);
  private auth     = inject(AuthService);
  private workers  = inject(WorkersService);
  private router   = inject(Router);

  allJobs   = signal<Booking[]>([]);
  activeTab = signal<TabFilter>('active');
  loading   = signal(true);
  error     = signal<string | null>(null);

  tabs = [
    { id: 'active'    as TabFilter, label: 'جارية'  },
    { id: 'completed' as TabFilter, label: 'مكتملة' },
  ];

  filtered = computed(() =>
    this.allJobs().filter((j) => j.status === this.activeTab())
  );

  totalEarnings = computed(() =>
    this.allJobs()
      .filter((j) => j.status === 'completed')
      .reduce((sum, j) => sum + j.totalAmount, 0)
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
        this.error.set(err.message ?? 'مش قادر يجيب الشغل.');
        this.loading.set(false);
      },
    });
  }

  setTab(tab: TabFilter): void {
    this.activeTab.set(tab);
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
      active:    'جارية',
      completed: 'مكتملة',
    };
    return map[status] ?? status;
  }

  async deleteJob(id: string): Promise<void> {
  const confirmed = await confirmDelete();
  if (!confirmed) return;

  this.bookings.delete(id).subscribe({
    next: () => {
      this.allJobs.update((jobs) => jobs.filter((j) => j.id !== id));
    },
  });
}

}
