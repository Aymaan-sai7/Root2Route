import { Component, inject, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ToastrService } from 'ngx-toastr';
import { toSignal } from '@angular/core/rxjs-interop';

import { WorkersService } from '../../../../core/services/workers.service';
import { BookingsService } from '../../../../core/services/bookings.service';
import { AuthService } from '../../../../core/services/Auth.service';
import { Worker } from '../../../../core/models/worker.model';
import { BookingStep } from '../../../../core/models/booking.model';
import { LocationPickerComponent } from '../../../../shared/components/location-picker/location-picker.component';
import { EGYPT_GOVERNORATES, GovernorateData } from '../../../../core/data/egypt-governorates.data';

interface TimeSlot {
  time: string;   // "HH:mm"
  label: string;
  period: 'morning' | 'afternoon' | 'evening';
}

const TIME_SLOTS: TimeSlot[] = [
  { time: '09:00', label: '9:00 ص',  period: 'morning' },
  { time: '11:00', label: '11:00 ص', period: 'morning' },
  { time: '13:00', label: '1:00 م',  period: 'afternoon' },
  { time: '15:00', label: '3:00 م',  period: 'afternoon' },
  { time: '17:00', label: '5:00 م',  period: 'evening' },
  { time: '19:00', label: '7:00 م',  period: 'evening' },
];

const PERIODS: { key: TimeSlot['period']; label: string }[] = [
  { key: 'morning',   label: 'الصباح' },
  { key: 'afternoon', label: 'الظهر' },
  { key: 'evening',   label: 'المساء' },
];

@Component({
  selector: 'app-booking',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, LocationPickerComponent],
  templateUrl: './booking.component.html',
})
export class BookingComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private fb = inject(FormBuilder);
  private workersService = inject(WorkersService);
  private bookingsService = inject(BookingsService);
  private authService = inject(AuthService);
  private toastr = inject(ToastrService);

  worker = signal<Worker | null>(null);
  isLoading = signal(true);
  isSubmitting = signal(false);
  currentStep = signal<BookingStep>('details');

  // ─── Estimated Hours ───────────────────────
  estimatedHours = signal(2);
  readonly minHours = 1;
  readonly maxHours = 8;

  increaseHours(): void {
    if (this.estimatedHours() < this.maxHours) {
      this.estimatedHours.update(h => h + 1);
    }
  }

  decreaseHours(): void {
    if (this.estimatedHours() > this.minHours) {
      this.estimatedHours.update(h => h - 1);
    }
  }

  totalAmount = computed(() => {
    const w = this.worker();
    return w ? w.hourlyRate * this.estimatedHours() : 0;
  });

  minDate = computed(() => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return tomorrow.toISOString().split('T')[0];
  });

  // ─── Step 1: Service Details ───────────────────────
  detailsForm: FormGroup = this.fb.group({
    description: ['', [Validators.required, Validators.minLength(15)]],
  });

  get descriptionControl() {
    return this.detailsForm.get('description');
  }

  // ─── Step 2: Address (محافظة / مدينة / بلد / شارع / رقم عقار) ──
  governorates: GovernorateData[] = EGYPT_GOVERNORATES;

  //  شيل buildingNumber من الفورم
addressForm: FormGroup = this.fb.group({
  governorate: ['', Validators.required],
  city: ['', Validators.required],
  village: ['', Validators.required],
  street: ['', Validators.required],
  notes: [''],
  lat: [null as number | null],
  lng: [null as number | null],
});

get governorateControl() { return this.addressForm.get('governorate'); }
get cityControl() { return this.addressForm.get('city'); }
get villageControl() { return this.addressForm.get('village'); }
get streetControl() { return this.addressForm.get('street'); }
//  get buildingNumberControl() اتشالت

private governorateValue = toSignal(this.addressForm.get('governorate')!.valueChanges, {
  initialValue: this.addressForm.get('governorate')!.value,
});

availableCities = computed(() => {
  const gov = this.governorateValue();
  return this.governorates.find((g) => g.name === gov)?.cities ?? [];
});

//  اتشال رقم العقار من التنسيق
formattedAddress = computed(() => {
  const { governorate, city, village, street } = this.addressForm.value;
  if (!governorate || !city || !village || !street) return '';
  return `${street}، ${village}، ${city}، محافظة ${governorate}`;
});

showLocationPicker = signal(false);

locationPicked = computed(() => {
  const { lat, lng } = this.addressForm.value;
  return lat != null && lng != null;
});

openLocationPicker(): void {
  if (!this.governorateControl?.value || !this.cityControl?.value || !this.villageControl?.value) {
    this.governorateControl?.markAsTouched();
    this.cityControl?.markAsTouched();
    this.villageControl?.markAsTouched();
    this.toastr.warning('حدد المحافظة والمدينة والبلد الأول عشان نقدر نوريك الخريطة صح', 'محتاج بيانات كمان');
    return;
  }
  this.showLocationPicker.set(true);
}

onLocationConfirmed(loc: { lat: number; lng: number }): void {
  this.addressForm.patchValue({ lat: loc.lat, lng: loc.lng });
  this.showLocationPicker.set(false);
}

closeLocationPicker(): void {
  this.showLocationPicker.set(false);
}

  // ═══════════════════════════════════════════════════════════
  // Step 3: Schedule — فترات زمنية جاهزة + منع تعارض المواعيد
  // ═══════════════════════════════════════════════════════════
  scheduleForm: FormGroup = this.fb.group({
    scheduledDate: ['', Validators.required],
    scheduledTime: ['', Validators.required],
  });

  get dateControl() { return this.scheduleForm.get('scheduledDate'); }
  get timeControl() { return this.scheduleForm.get('scheduledTime'); }

  periods = PERIODS;
  timeSlots = TIME_SLOTS;

  slotsByPeriod = computed(() => {
    return this.periods.map((p) => ({
      ...p,
      slots: this.timeSlots.filter((s) => s.period === p.key),
    }));
  });

  //  الوقت المختار كـ signal حقيقي عشان الـ chips تعرف تتلوّن reactive
  private selectedTimeValue = toSignal(this.scheduleForm.get('scheduledTime')!.valueChanges, {
    initialValue: this.scheduleForm.get('scheduledTime')!.value,
  });

  //  مواعيد فعليًا مشغولة عند نفس الصنايعي في نفس اليوم المختار — بناءً
  // على حجوزاته الحقيقية (pending/active)، مش تخمين. مفيش عندنا نظام
  // "جدول عمل" منفصل للصنايعي في الباك إند، فده أدق تفسير عملي متاح
  occupiedSlots = signal<Set<string>>(new Set());
  loadingSlots = signal(false);

  ngOnInit(): void {
    const workerId = this.route.snapshot.paramMap.get('workerId');

    if (!workerId) {
      this.router.navigate(['/find-services']);
      return;
    }

    this.workersService.getById(workerId).subscribe({
      next: (worker) => {
        this.worker.set(worker);
        this.isLoading.set(false);
      },
      error: () => {
        this.toastr.error('الصنايعي غير موجود', 'خطأ');
        this.router.navigate(['/find-services']);
      },
    });

    this.addressForm.get('governorate')?.valueChanges.subscribe(() => {
      this.addressForm.get('city')?.setValue('', { emitEvent: false });
    });

    //  لما التاريخ يتغيّر: نصفّر الوقت المختار (ممكن يبقى مشغول في اليوم
    // الجديد) ونعيد فحص المواعيد المشغولة للصنايعي في اليوم ده
    this.scheduleForm.get('scheduledDate')?.valueChanges.subscribe((date) => {
      this.scheduleForm.get('scheduledTime')?.setValue('');
      this.loadOccupiedSlots(date);
    });
  }

  private loadOccupiedSlots(date: string): void {
    const w = this.worker();
    if (!w || !date) {
      this.occupiedSlots.set(new Set());
      return;
    }

    this.loadingSlots.set(true);
    this.bookingsService.getByWorker(w.id).subscribe({
      next: (bookings) => {
        const active = bookings.filter((b) => b.status !== 'cancelled');
        const occupied = new Set<string>();

        for (const slot of this.timeSlots) {
          const slotStart = this.toMinutes(slot.time);
          const conflict = active.some((b) => {
            const bDate = new Date(b.scheduledAt);
            if (this.toDateStr(bDate) !== date) return false;
            const bStart = bDate.getHours() * 60 + bDate.getMinutes();
            const bEnd = bStart + b.estimatedHours * 60;
            return slotStart >= bStart && slotStart < bEnd;
          });
          if (conflict) occupied.add(slot.time);
        }

        this.occupiedSlots.set(occupied);
        this.loadingSlots.set(false);
      },
      error: () => {
        this.occupiedSlots.set(new Set());
        this.loadingSlots.set(false);
      },
    });
  }

  private toMinutes(time: string): number {
    const [h, m] = time.split(':').map(Number);
    return h * 60 + m;
  }

  private toDateStr(d: Date): string {
    const pad = (n: number) => n.toString().padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  }

  isSlotOccupied(time: string): boolean {
    return this.occupiedSlots().has(time);
  }

  isSlotSelected(time: string): boolean {
    return this.selectedTimeValue() === time;
  }

  selectSlot(time: string): void {
    if (this.isSlotOccupied(time)) return;
    const control = this.scheduleForm.get('scheduledTime');
    control?.setValue(time);
    control?.markAsTouched();
  }

  allSlotsOccupiedForDate = computed(() => {
    const date = this.dateControl?.value;
    if (!date) return false;
    return this.occupiedSlots().size === this.timeSlots.length;
  });

  formattedSchedule = computed(() => {
    const date = this.scheduleForm.get('scheduledDate')?.value;
    const time = this.selectedTimeValue();
    if (!date || !time) return '';

    const dt = new Date(`${date}T${time}`);
    return dt.toLocaleDateString('ar-EG', {
      weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
    }) + ' — ' + dt.toLocaleTimeString('ar-EG', {
      hour: '2-digit', minute: '2-digit',
    });
  });

  // ─── الكوبون ───────────────────────
  couponCode = signal('');
  couponStatus = signal<'idle' | 'checking' | 'valid' | 'invalid'>('idle');
  couponMessage = signal<string | null>(null);
  appliedDiscount = signal<{ discountType: 'percentage' | 'fixed'; discountValue: number; code: string } | null>(null);

  discountAmount = computed(() => {
    const discount = this.appliedDiscount();
    const total = this.totalAmount();
    if (!discount) return 0;
    const raw =
      discount.discountType === 'percentage'
        ? (total * discount.discountValue) / 100
        : discount.discountValue;
    return Math.min(Math.round(raw * 100) / 100, total);
  });

  finalAmount = computed(() => {
    return Math.max(0, Math.round((this.totalAmount() - this.discountAmount()) * 100) / 100);
  });

  onCouponInput(event: Event): void {
    this.couponCode.set((event.target as HTMLInputElement).value);
    if (this.appliedDiscount() || this.couponStatus() === 'invalid') {
      this.appliedDiscount.set(null);
      this.couponStatus.set('idle');
      this.couponMessage.set(null);
    }
  }

  checkCoupon(): void {
    const code = this.couponCode().trim();
    const w = this.worker();
    if (!code || !w) return;

    this.couponStatus.set('checking');
    this.couponMessage.set(null);

    this.bookingsService.validateCoupon(code, w.trade).subscribe((result) => {
      if (result.valid && result.discountType && result.discountValue != null) {
        this.appliedDiscount.set({
          discountType: result.discountType,
          discountValue: result.discountValue,
          code: result.code ?? code,
        });
        this.couponStatus.set('valid');
        this.couponMessage.set(null);
      } else {
        this.appliedDiscount.set(null);
        this.couponStatus.set('invalid');
        this.couponMessage.set(result.message ?? 'الكود ده مش صالح.');
      }
    });
  }

  removeCoupon(): void {
    this.couponCode.set('');
    this.appliedDiscount.set(null);
    this.couponStatus.set('idle');
    this.couponMessage.set(null);
  }

  // ─── Navigation between steps ───────────────────────
  goToAddress(): void {
    if (this.detailsForm.invalid) {
      this.detailsForm.markAllAsTouched();
      return;
    }
    this.currentStep.set('address');
  }

  backToDetails(): void {
    this.currentStep.set('details');
  }

  goToSchedule(): void {
    if (this.addressForm.invalid) {
      this.addressForm.markAllAsTouched();
      return;
    }
    this.currentStep.set('schedule');
  }

  backToAddress(): void {
    this.currentStep.set('address');
  }

  goToReview(): void {
    if (this.scheduleForm.invalid) {
      this.scheduleForm.markAllAsTouched();
      return;
    }
    this.currentStep.set('review');
  }

  backToSchedule(): void {
    this.currentStep.set('schedule');
  }

  confirmBooking(): void {
    const w = this.worker();
    const currentUser = this.authService.currentUser();

    if (!w || !currentUser) {
      this.toastr.error('حصل خطأ، حاول تسجل الدخول تاني', 'خطأ');
      return;
    }

    const date = this.scheduleForm.get('scheduledDate')?.value;
    const time = this.scheduleForm.get('scheduledTime')?.value;
    const scheduledAt = new Date(`${date}T${time}`).toISOString();

    this.isSubmitting.set(true);

    this.bookingsService.create({
      clientId: currentUser.id,
      clientName: currentUser.fullName,
      workerId: w.id,
      workerName: w.fullName,
      workerTrade: w.tradeLabel,
      trade: w.trade,
      workerAvatarColor: w.avatarColor,
      description: this.detailsForm.get('description')?.value,
      address: this.addressForm.value,
      scheduledAt,
      estimatedHours: this.estimatedHours(),
      totalAmount: this.totalAmount(),
      couponCode: this.couponStatus() === 'valid' ? this.appliedDiscount()?.code : undefined,
    }).subscribe({
      next: (booking) => {
        this.isSubmitting.set(false);
        this.toastr.success('تم إرسال طلب الحجز بنجاح', 'تم');
        this.router.navigate(['/orders', booking.id]);
      },
      error: () => {
        this.isSubmitting.set(false);
        this.toastr.error('حصل خطأ أثناء الحجز، حاول تاني', 'خطأ');
      },
    });
  }
}
