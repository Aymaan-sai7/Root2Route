import { Component, inject, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ToastrService } from 'ngx-toastr';

import { WorkersService } from '../../../../core/services/workers.service';
import { BookingsService } from '../../../../core/services/bookings.service';
import { AuthService } from '../../../../core/services/Auth.service';
import { Worker } from '../../../../core/models/worker.model';
import { BookingStep } from '../../../../core/models/booking.model';

@Component({
  selector: 'app-booking',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
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

  // أقل تاريخ متاح = بكرة
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

  // ─── Step 2: Address ───────────────────────
  addressForm: FormGroup = this.fb.group({
    area: ['', Validators.required],
    street: ['', Validators.required],
    buildingNumber: ['', Validators.required],
    notes: [''],
  });

  get areaControl() { return this.addressForm.get('area'); }
  get streetControl() { return this.addressForm.get('street'); }
  get buildingNumberControl() { return this.addressForm.get('buildingNumber'); }

  formattedAddress = computed(() => {
    const { area, street, buildingNumber } = this.addressForm.value;
    if (!area || !street || !buildingNumber) return '';
    return `${street}، ${area}، عقار رقم ${buildingNumber}`;
  });

  // ─── Step 3: Schedule ───────────────────────
  scheduleForm: FormGroup = this.fb.group({
    scheduledDate: ['', Validators.required],
    scheduledTime: ['', Validators.required],
  });

  get dateControl() {
    return this.scheduleForm.get('scheduledDate');
  }
  get timeControl() {
    return this.scheduleForm.get('scheduledTime');
  }

  // عرض التاريخ/الوقت بشكل منسق في step 4
  formattedSchedule = computed(() => {
    const date = this.scheduleForm.get('scheduledDate')?.value;
    const time = this.scheduleForm.get('scheduledTime')?.value;
    if (!date || !time) return '';

    const dt = new Date(`${date}T${time}`);
    return dt.toLocaleDateString('ar-EG', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    }) + ' — ' + dt.toLocaleTimeString('ar-EG', {
      hour: '2-digit',
      minute: '2-digit',
    });
  });

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

  // ─── Step 4: Confirm & Submit ───────────────────────
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
      workerAvatarColor: w.avatarColor,
      description: this.detailsForm.get('description')?.value,
      address: this.addressForm.value,
      scheduledAt,
      estimatedHours: this.estimatedHours(),
      totalAmount: this.totalAmount(),
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
