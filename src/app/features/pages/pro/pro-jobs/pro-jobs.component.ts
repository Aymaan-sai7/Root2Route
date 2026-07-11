import { Component, inject, OnInit, signal, computed } from '@angular/core';
import { DatePipe } from '@angular/common';
import { Router } from '@angular/router';
import { BookingsService } from '../../../../core/services/bookings.service';
import { AuthService } from '../../../../core/services/Auth.service';
import { WorkersService } from '../../../../core/services/workers.service';
import { Booking, WorkStage } from '../../../../core/models/booking.model';
import { generateAvatarColor } from '../../../../core/utils/color.util';
import { switchMap } from 'rxjs';
import { confirmDelete } from '../../../../core/utils/confirm.util';

type TabFilter = 'active' | 'completed';

interface StageDef {
  id: WorkStage;
  label: string;
  shortLabel: string;
}

// ترتيب المراحل ثابت — بنستخدم الـ index بتاعه لمعرفة "التالي"
const WORK_STAGES: StageDef[] = [
  { id: 'on_the_way',  label: 'في الطريق للعميل',  shortLabel: 'في الطريق' },
  { id: 'in_progress', label: 'بدأ الشغل فعليًا',   shortLabel: 'شغال دلوقتي' },
  { id: 'done',        label: 'خلّص الشغل',         shortLabel: 'خلّص' },
];

const UPCOMING_WINDOW_MS = 2 * 60 * 60 * 1000; // ساعتين

@Component({
  selector: 'app-pro-jobs',
  standalone: true,
  imports: [DatePipe],
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

  // رقم تلفون العميل لكل حجز جاري، بيتجاب لحظة فتح الصفحة عشان مايبقاش
  // في تأخير لما الصنايعي يحب يكلم العميل بسرعة
  contactByJobId = signal<Record<string, string | null>>({});

  stages = WORK_STAGES;

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
        this.loadContacts(jobs.filter((j) => j.status === 'active'));
      },
      error: (err) => {
        this.error.set(err.message ?? 'مش قادر يجيب الشغل.');
        this.loading.set(false);
      },
    });
  }

  // بيانات التواصل بتتجاب واحد واحد (مش endpoint جماعي موجود)، بس العدد
  // هنا صغير جدًا (شغل جاري بس)، فمفيش داعي لتعقيد إضافي
  private loadContacts(activeJobs: Booking[]): void {
    activeJobs.forEach((job) => {
      this.bookings.getBookingContact(job.id).subscribe({
        next: (contact) => {
          this.contactByJobId.update((map) => ({ ...map, [job.id]: contact.clientPhone }));
        },
        error: () => {
          // مش مشكلة كبيرة لو فشل — هيفضل "مش متاح" في الكارد وبس
        },
      });
    });
  }

  setTab(tab: TabFilter): void {
    this.activeTab.set(tab);
  }

  getClientPhone(jobId: string): string | null | undefined {
    return this.contactByJobId()[jobId];
  }

  // ── مراحل الشغل ──────────────────────────────────────────
  getStageIndex(job: Booking): number {
    const stage = job.workStage ?? 'on_the_way';
    const idx = WORK_STAGES.findIndex((s) => s.id === stage);
    return idx === -1 ? 0 : idx;
  }

  isStageDone(job: Booking, stageIndex: number): boolean {
    return this.getStageIndex(job) >= stageIndex;
  }

  isLastStage(job: Booking): boolean {
    return this.getStageIndex(job) === WORK_STAGES.length - 1;
  }

  advanceStage(job: Booking): void {
    const nextIndex = this.getStageIndex(job) + 1;
    if (nextIndex >= WORK_STAGES.length) return;

    const nextStage = WORK_STAGES[nextIndex].id;
    this.bookings.updateWorkStage(job.id, nextStage).subscribe({
      next: (updated) => {
        this.allJobs.update((jobs) => jobs.map((j) => (j.id === job.id ? updated : j)));
      },
    });
  }

  // ── تنبيهات المواعيد ──────────────────────────────────────
  isOverdue(job: Booking): boolean {
    if (job.status !== 'active' || job.workStage === 'done') return false;
    return new Date(job.scheduledAt).getTime() < Date.now();
  }

  isUpcoming(job: Booking): boolean {
    if (job.status !== 'active' || job.workStage === 'done' || this.isOverdue(job)) return false;
    const diff = new Date(job.scheduledAt).getTime() - Date.now();
    return diff >= 0 && diff <= UPCOMING_WINDOW_MS;
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

  addressText(job: Booking): string {
    const a = job.address;
    if (!a) return 'العنوان مش متوفر';
    return [a.governorate, a.city, a.village, a.street].filter(Boolean).join(' - ');
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
