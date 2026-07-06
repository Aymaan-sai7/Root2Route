import { Component, OnInit, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import Swal from 'sweetalert2';
import { AdminService } from '../../../../core/services/admin.service';
import { User, UserRole, UserStatus } from '../../../../core/models/user.model';
import { Worker } from '../../../../core/models/worker.model';
import { timeAgo } from '../../../../core/utils/time.util';
import { generateAvatarColor } from '../../../../core/utils/color.util';
import { AdminSelectComponent, AdminSelectOption } from '../../../../shared/components/admin-select/admin-select.component';

@Component({
  selector: 'app-admin-users',
  standalone: true,
  imports: [AdminSelectComponent, DatePipe],
  templateUrl: './admin-users.component.html',
  styleUrl: './admin-users.component.css',
})
export class AdminUsersComponent implements OnInit {
  private adminService = inject(AdminService);

  users = signal<User[]>([]);
  loading = signal(true);
  processingId = signal<string | null>(null);

  roleFilter = signal<UserRole | ''>('');
  statusFilter = signal<UserStatus | ''>('');
  searchTerm = signal('');

  // ── توسيع الصف لعرض التفاصيل ──────────────────────────────
  expandedId = signal<string | null>(null);
  loadingDetail = signal<string | null>(null);
  workerDetails = signal<Record<string, Worker | null>>({});

  roleOptions: AdminSelectOption[] = [
    { value: 'client', label: 'عملاء' },
    { value: 'pro', label: 'صنايعية' },
    { value: 'admin', label: 'أدمن' },
  ];

  statusOptions: AdminSelectOption[] = [
    { value: 'pending', label: 'قيد المراجعة' },
    { value: 'active', label: 'نشط' },
    { value: 'rejected', label: 'مرفوض' },
    { value: 'blocked', label: 'محظور' },
  ];

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.adminService
      .getUsers({
        role: this.roleFilter() || undefined,
        status: this.statusFilter() || undefined,
        search: this.searchTerm() || undefined,
      })
      .subscribe({
        next: (list) => {
          this.users.set(list);
          this.loading.set(false);
        },
        error: () => this.loading.set(false),
      });
  }

  onRoleChange(value: string): void {
    this.roleFilter.set(value as UserRole | '');
    this.load();
  }

  onStatusChange(value: string): void {
    this.statusFilter.set(value as UserStatus | '');
    this.load();
  }

  onSearchInput(event: Event): void {
    this.searchTerm.set((event.target as HTMLInputElement).value);
  }

  search(): void {
    this.load();
  }

  // ── توسيع/قفل صف مستخدم ────────────────────────────────────
  toggleExpand(user: User): void {
    if (this.expandedId() === user.id) {
      this.expandedId.set(null);
      return;
    }
    this.expandedId.set(user.id);

    // لو صنايعي ومفيش تفاصيله متجابة قبل كده، اجيبها دلوقتي بس
    if (user.role === 'pro' && !(user.id in this.workerDetails())) {
      this.loadingDetail.set(user.id);
      this.adminService.getUserDetail(user.id).subscribe({
        next: (detail) => {
          this.workerDetails.update((map) => ({ ...map, [user.id]: detail.worker }));
          this.loadingDetail.set(null);
        },
        error: () => this.loadingDetail.set(null),
      });
    }
  }

  workerFor(userId: string): Worker | null | undefined {
    return this.workerDetails()[userId];
  }

  getAvatarColor(name: string): string {
    return generateAvatarColor(name);
  }

  timeAgo(date: string): string {
    return timeAgo(date);
  }

  statusLabel(status: UserStatus): string {
    const map: Record<UserStatus, string> = {
      pending: 'قيد المراجعة', active: 'نشط', rejected: 'مرفوض', blocked: 'محظور',
    };
    return map[status];
  }

  roleLabel(role: UserRole): string {
    const map: Record<UserRole, string> = { client: 'عميل', pro: 'صنايعي', admin: 'أدمن' };
    return map[role];
  }

  accept(user: User, event?: Event): void {
    event?.stopPropagation();
    this.updateStatus(user.id, 'active');
  }

  reject(user: User, event?: Event): void {
    event?.stopPropagation();
    Swal.fire({
      title: `رفض ${user.fullName}؟`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'رفض',
      cancelButtonText: 'رجوع',
      confirmButtonColor: '#DC2626',
    }).then((result) => {
      if (result.isConfirmed) this.updateStatus(user.id, 'rejected');
    });
  }

  block(user: User, event?: Event): void {
    event?.stopPropagation();
    Swal.fire({
      title: `حظر ${user.fullName}؟`,
      text: 'مش هيقدر يسجل دخول خالص لحد ما تلغي الحظر.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'حظر',
      cancelButtonText: 'رجوع',
      confirmButtonColor: '#DC2626',
    }).then((result) => {
      if (result.isConfirmed) this.updateStatus(user.id, 'blocked');
    });
  }

  unblock(user: User, event?: Event): void {
    event?.stopPropagation();
    this.updateStatus(user.id, 'active');
  }

  private updateStatus(userId: string, status: UserStatus): void {
    this.processingId.set(userId);
    this.adminService.updateUserStatus(userId, status).subscribe({
      next: (updated) => {
        this.users.update((list) => list.map((u) => (u.id === userId ? updated : u)));
        this.processingId.set(null);
      },
      error: () => this.processingId.set(null),
    });
  }
}
