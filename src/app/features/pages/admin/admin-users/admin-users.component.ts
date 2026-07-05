import { Component, OnInit, inject, signal } from '@angular/core';
import Swal from 'sweetalert2';
import { AdminService } from '../../../../core/services/admin.service';
import { User, UserRole, UserStatus } from '../../../../core/models/user.model';
import { timeAgo } from '../../../../core/utils/time.util';

@Component({
  selector: 'app-admin-users',
  standalone: true,
  imports: [],
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

  onRoleChange(event: Event): void {
    this.roleFilter.set((event.target as HTMLSelectElement).value as UserRole | '');
    this.load();
  }

  onStatusChange(event: Event): void {
    this.statusFilter.set((event.target as HTMLSelectElement).value as UserStatus | '');
    this.load();
  }

  onSearchInput(event: Event): void {
    this.searchTerm.set((event.target as HTMLInputElement).value);
  }

  search(): void {
    this.load();
  }

  timeAgo(date: string): string {
    return timeAgo(date);
  }

  statusLabel(status: UserStatus): string {
    const map: Record<UserStatus, string> = {
      pending: 'قيد المراجعة',
      active: 'نشط',
      rejected: 'مرفوض',
      blocked: 'محظور',
    };
    return map[status];
  }

  roleLabel(role: UserRole): string {
    const map: Record<UserRole, string> = {
      client: 'عميل',
      pro: 'صنايعي',
      admin: 'أدمن',
    };
    return map[role];
  }

  accept(user: User): void {
    this.updateStatus(user.id, 'active');
  }

  reject(user: User): void {
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

  block(user: User): void {
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

  unblock(user: User): void {
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
