import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import Swal from 'sweetalert2';
import { AdminService } from '../../../../core/services/admin.service';
import { Coupon } from '../../../../core/models/coupon.model';
import { TradeType } from '../../../../core/models/worker.model';
import { timeAgo } from '../../../../core/utils/time.util';
import { AdminSelectComponent, AdminSelectOption } from '../../../../shared/components/admin-select/admin-select.component';

type CouponStatusFilter = 'active' | 'inactive' | 'expired' | '';

@Component({
  selector: 'app-admin-coupons',
  standalone: true,
  imports: [DatePipe, ReactiveFormsModule, AdminSelectComponent],
  templateUrl: './admin-coupons.component.html',
  styleUrl: './admin-coupons.component.css',
})
export class AdminCouponsComponent implements OnInit {
  private adminService = inject(AdminService);
  private fb = inject(FormBuilder);

  coupons = signal<Coupon[]>([]);
  loading = signal(true);
  submitting = signal(false);
  showCreateForm = signal(false);

  statusFilter = signal<CouponStatusFilter>('');
  searchTerm = signal('');

  discountTypeOptions: AdminSelectOption[] = [
    { value: 'percentage', label: 'نسبة مئوية %' },
    { value: 'fixed', label: 'مبلغ ثابت (ج.م)' },
  ];

  //  القيمة الفاضية '' بتترجم لـ null (يعني عام على كل التصنيفات) وقت الإرسال
  tradeOptions: AdminSelectOption[] = [
    { value: '', label: 'كل التصنيفات' },
    { value: 'electrical', label: 'كهربا' },
    { value: 'plumbing', label: 'سباكة' },
    { value: 'carpentry', label: 'نجارة' },
    { value: 'painting', label: 'نقاشة' },
    { value: 'ac', label: 'تكييف' },
    { value: 'cleaning', label: 'تنظيف' },
    { value: 'moving', label: 'نقل عفش' },
    { value: 'metalwork', label: 'حدادة وألوميتال' },
  ];

  statusFilterOptions: AdminSelectOption[] = [
    { value: 'active', label: 'شغال' },
    { value: 'inactive', label: 'موقوف' },
    { value: 'expired', label: 'منتهي' },
  ];

  form: FormGroup = this.fb.group({
    code: [''],
    discountType: ['percentage', Validators.required],
    discountValue: [10, [Validators.required, Validators.min(1)]],
    tradeRestriction: [''],
    maxTotalUses: [''],
    expiryDate: [''],
  });

  get discountValueControl() {
    return this.form.get('discountValue');
  }

  // ── حالة الكوبون المحسوبة (مش مخزنة، بتتحسب من isActive + expiryDate) ──
  couponStatus(coupon: Coupon): 'active' | 'inactive' | 'expired' {
    if (coupon.expiryDate && new Date(coupon.expiryDate).getTime() < Date.now()) return 'expired';
    if (!coupon.isActive) return 'inactive';
    return 'active';
  }

  filteredCoupons = computed(() => {
    const status = this.statusFilter();
    const q = this.searchTerm().trim().toLowerCase();
    let list = this.coupons();

    if (status) list = list.filter((c) => this.couponStatus(c) === status);
    if (q) list = list.filter((c) => c.code.toLowerCase().includes(q));

    return list;
  });

  // ── إحصائيات سريعة (من كل الكوبونات، مش متأثرة بالفلاتر) ──────
  totalCoupons = computed(() => this.coupons().length);
  activeCouponsCount = computed(
    () => this.coupons().filter((c) => this.couponStatus(c) === 'active').length
  );
  totalRedemptions = computed(() =>
    this.coupons().reduce((sum, c) => sum + c.usedCount, 0)
  );

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.adminService.getCoupons().subscribe({
      next: (list) => {
        this.coupons.set(list);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  onStatusFilterChange(value: string): void {
    this.statusFilter.set(value as CouponStatusFilter);
  }

  onDiscountTypeChange(value: string): void {
    this.form.patchValue({ discountType: value });
  }

  onTradeChange(value: string): void {
    this.form.patchValue({ tradeRestriction: value });
  }

  onSearchInput(event: Event): void {
    this.searchTerm.set((event.target as HTMLInputElement).value);
  }

  toggleCreateForm(): void {
    this.showCreateForm.update((v) => !v);
  }

  discountLabel(coupon: Coupon): string {
    return coupon.discountType === 'percentage'
      ? `${coupon.discountValue}%`
      : `${coupon.discountValue} ج.م`;
  }

  tradeLabel(trade: TradeType | null): string {
    if (!trade) return 'كل التصنيفات';
    return this.tradeOptions.find((t) => t.value === trade)?.label ?? trade;
  }

  usageLabel(coupon: Coupon): string {
    return coupon.maxTotalUses != null
      ? `${coupon.usedCount} / ${coupon.maxTotalUses}`
      : `${coupon.usedCount} / بلا حد`;
  }

  timeAgo(date: string): string {
    return timeAgo(date);
  }

  submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.submitting.set(true);
    const raw = this.form.value;

    this.adminService
      .createCoupon({
        code: raw.code?.trim() || undefined,
        discountType: raw.discountType,
        discountValue: Number(raw.discountValue),
        tradeRestriction: raw.tradeRestriction || null,
        maxTotalUses: raw.maxTotalUses ? Number(raw.maxTotalUses) : null,
        expiryDate: raw.expiryDate || null,
      })
      .subscribe({
        next: (created) => {
          this.coupons.update((list) => [created, ...list]);
          this.submitting.set(false);
          this.showCreateForm.set(false);
          this.form.reset({
            code: '',
            discountType: 'percentage',
            discountValue: 10,
            tradeRestriction: '',
            maxTotalUses: '',
            expiryDate: '',
          });
          Swal.fire({
            title: 'تم إنشاء الكوبون',
            text: `الكود: ${created.code}`,
            icon: 'success',
            confirmButtonColor: '#2563EB',
            timer: 2000,
          });
        },
        error: (err) => {
          this.submitting.set(false);
          Swal.fire({
            title: 'حصل خطأ',
            text: err.error?.message ?? 'حاول تاني.',
            icon: 'error',
            confirmButtonColor: '#DC2626',
          });
        },
      });
  }

  toggleActive(coupon: Coupon, event?: Event): void {
    event?.stopPropagation();
    this.adminService.updateCoupon(coupon.id, { isActive: !coupon.isActive }).subscribe({
      next: (updated) => {
        this.coupons.update((list) => list.map((c) => (c.id === coupon.id ? updated : c)));
      },
    });
  }

  deleteCoupon(coupon: Coupon, event?: Event): void {
    event?.stopPropagation();
    Swal.fire({
      title: `حذف كوبون "${coupon.code}"؟`,
      text: 'الإجراء ده نهائي ومش هينفع يترجع.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'حذف',
      cancelButtonText: 'رجوع',
      confirmButtonColor: '#DC2626',
    }).then((result) => {
      if (result.isConfirmed) {
        this.adminService.deleteCoupon(coupon.id).subscribe({
          next: () => {
            this.coupons.update((list) => list.filter((c) => c.id !== coupon.id));
          },
        });
      }
    });
  }
}
