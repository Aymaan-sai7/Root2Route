import { Component, OnInit, inject, signal } from '@angular/core';
import { forkJoin, of } from 'rxjs';
import Swal from 'sweetalert2';
import { AdminService } from '../../../../core/services/admin.service';
import { User } from '../../../../core/models/user.model';
import { environment } from '../../../../../environments/environment';
import { timeAgo } from '../../../../core/utils/time.util';

interface PendingRow {
  user: User;
  worker: any | null;
}

@Component({
  selector: 'app-admin-registrations',
  standalone: true,
  imports: [],
  templateUrl: './admin-registrations.component.html',
  styleUrl: './admin-registrations.component.css',
})
export class AdminRegistrationsComponent implements OnInit {
  private adminService = inject(AdminService);

  rows = signal<PendingRow[]>([]);
  loading = signal(true);
  processingId = signal<string | null>(null);
  expandedId = signal<string | null>(null);

  ngOnInit(): void {
    this.load();
  }

  private load(): void {
    this.loading.set(true);
    this.adminService.getUsers({ status: 'pending' }).subscribe({
      next: (users) => {
        if (users.length === 0) {
          this.rows.set([]);
          this.loading.set(false);
          return;
        }
        // لو صنايعي، نجيب تفاصيله (فيها صور التحقق) — لو client مفيش داعي لطلب إضافي
        forkJoin(
          users.map((u) =>
            u.role === 'pro' ? this.adminService.getUserDetail(u.id) : of({ user: u, worker: null })
          )
        ).subscribe({
          next: (details) => {
            this.rows.set(details);
            this.loading.set(false);
          },
          error: () => this.loading.set(false),
        });
      },
      error: () => this.loading.set(false),
    });
  }

  toggleExpand(userId: string): void {
    this.expandedId.update((id) => (id === userId ? null : userId));
  }

  docUrl(path?: string): string {
    return path ? `${environment.apiUrl}${path}` : '';
  }

  timeAgo(date: string): string {
    return timeAgo(date);
  }

  accept(userId: string): void {
    this.updateStatus(userId, 'active');
  }

  reject(userId: string): void {
    Swal.fire({
      title: 'رفض الطلب؟',
      text: 'المستخدم مش هيقدر يسجل دخول. يقدر يتواصل مع الدعم لو حابب يعرف السبب.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'رفض الطلب',
      cancelButtonText: 'رجوع',
      confirmButtonColor: '#DC2626',
    }).then((result) => {
      if (result.isConfirmed) this.updateStatus(userId, 'rejected');
    });
  }

  block(userId: string): void {
    Swal.fire({
      title: 'حظر الحساب؟',
      text: 'المستخدم مش هيقدر يسجل دخول خالص لحد ما تلغي الحظر بنفسك من صفحة المستخدمين.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'حظر',
      cancelButtonText: 'رجوع',
      confirmButtonColor: '#DC2626',
    }).then((result) => {
      if (result.isConfirmed) this.updateStatus(userId, 'blocked');
    });
  }

  private updateStatus(userId: string, status: 'active' | 'rejected' | 'blocked'): void {
    this.processingId.set(userId);
    this.adminService.updateUserStatus(userId, status).subscribe({
      next: () => {
        // الحساب مبقاش pending، يتشال من القايمة فورًا
        this.rows.update((list) => list.filter((r) => r.user.id !== userId));
        //  جديد: ننقص الرقم في الصايدبار فورًا من غير ما نعمل request تاني لـ getStats()
        this.adminService.decrementPendingApprovals();
        this.processingId.set(null);
      },
      error: () => this.processingId.set(null),
    });
  }
}
