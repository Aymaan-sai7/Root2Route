import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { DatePipe } from '@angular/common';
import { AdminService, AdminLog } from '../../../../core/services/admin.service';
import { AdminSelectComponent, AdminSelectOption } from '../../../../shared/components/admin-select/admin-select.component';
import { timeAgo } from '../../../../core/utils/time.util';

type ActionFilter = string | '';

@Component({
  selector: 'app-admin-log',
    standalone: true,
  imports: [DatePipe, AdminSelectComponent],
  templateUrl: './admin-log.component.html',
  styleUrl: './admin-log.component.css'
})

export class AdminLogComponent implements OnInit {
  private adminService = inject(AdminService);

  logs = signal<AdminLog[]>([]);
  loading = signal(true);
  actionFilter = signal<ActionFilter>('');

  actionOptions: AdminSelectOption[] = [
    { value: 'user_status_changed', label: 'تغيير حالة مستخدم' },
    { value: 'coupon_created', label: 'إنشاء كوبون' },
    { value: 'coupon_updated', label: 'تعديل كوبون' },
    { value: 'coupon_deleted', label: 'حذف كوبون' },
    { value: 'admin_email_changed', label: 'تعديل إيميل أدمن' },
  ];

  // ⚠️ نصوص عربية واضحة لكل نوع action + الأيقونة/اللون المناسب لتصنيفه
  private actionMeta: Record<string, { label: string; variant: 'success' | 'danger' | 'primary' | 'steel' }> = {
    user_status_changed: { label: 'تغيير حالة مستخدم', variant: 'primary' },
    coupon_created:      { label: 'إنشاء كوبون',        variant: 'success' },
    coupon_updated:      { label: 'تعديل كوبون',        variant: 'primary' },
    coupon_deleted:      { label: 'حذف كوبون',          variant: 'danger' },
    admin_email_changed: { label: 'تعديل إيميل أدمن',   variant: 'steel' },
  };

  filteredLogs = computed(() => {
    const filter = this.actionFilter();
    const list = this.logs();
    return filter ? list.filter((l) => l.action === filter) : list;
  });

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.adminService.getAuditLogs().subscribe({
      next: (list) => {
        this.logs.set(list);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  onActionFilterChange(value: string): void {
    this.actionFilter.set(value);
  }

  actionLabel(action: string): string {
    return this.actionMeta[action]?.label ?? action;
  }

  actionVariant(action: string): string {
    return this.actionMeta[action]?.variant ?? 'steel';
  }

  // ⚠️ بيبني جملة وصفية مختصرة لكل نوع log حسب details المخزّنة، عشان
  // العرض يبقى مفهوم من نظرة واحدة من غير ما تفتح JSON خام
  describeLog(log: AdminLog): string {
    const d = log.details ?? {};
    switch (log.action) {
      case 'user_status_changed':
        return `${d['targetName'] ?? 'مستخدم'}: ${this.statusLabel(d['from'])} ← ${this.statusLabel(d['to'])}`;
      case 'coupon_created':
        return `كود "${d['code']}" — ${d['discountType'] === 'percentage' ? d['discountValue'] + '%' : d['discountValue'] + ' ج.م'}`;
      case 'coupon_updated':
        return `كود "${d['code']}"`;
      case 'coupon_deleted':
        return `كود "${d['code']}"`;
      case 'admin_email_changed':
        return `${d['from'] ?? '—'} ← ${d['to'] ?? '—'}`;
      default:
        return '';
    }
  }

  private statusLabel(status: string): string {
    const map: Record<string, string> = {
      pending: 'قيد المراجعة',
      active: 'نشط',
      rejected: 'مرفوض',
      blocked: 'محظور',
    };
    return map[status] ?? status ?? '—';
  }

  timeAgo(date: string): string {
    return timeAgo(date);
  }
}

