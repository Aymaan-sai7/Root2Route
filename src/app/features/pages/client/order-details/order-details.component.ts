import { Component, inject, OnInit, signal, computed } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { DatePipe } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ToastrService } from 'ngx-toastr';
import { BookingsService } from '../../../../core/services/bookings.service';
import { WorkersService } from '../../../../core/services/workers.service';
import { Booking } from '../../../../core/models/booking.model';
import { Worker } from '../../../../core/models/worker.model';
import { ReviewsService } from '../../../../core/services/review.service';
import { Review } from '../../../../core/models/review.model';

interface TimelineStep {
  status: string;
  label: string;
  desc: string;
  done: boolean;
  active: boolean;
}

@Component({
  selector: 'app-order-details',
  standalone: true,
  imports: [RouterLink, DatePipe, ReactiveFormsModule],
  templateUrl: './order-details.component.html',
  styleUrl: './order-details.component.css',
})
export class OrderDetailsComponent implements OnInit {
  private route    = inject(ActivatedRoute);
  private router   = inject(Router);
  private bookings = inject(BookingsService);
  private workers  = inject(WorkersService);
  private fb        = inject(FormBuilder);
  private toastr    = inject(ToastrService);

  order   = signal<Booking | null>(null);
  worker  = signal<Worker | null>(null);
  loading = signal(true);
  error   = signal<string | null>(null);

  isEditing = signal(false);
  isSaving  = signal(false);

  //  جديد: رقم تلفون الصنايعي — بيتجاب من endpoint محمي منفصل (مش من
  // Worker model العام)، عشان يبان بس للعميل صاحب الحجز ده بالظبط.
  // null لحد ما يتحمّل، وممكن يفضل null لو الصنايعي مالوش رقم مسجل
  workerPhone = signal<string | null>(null);
  loadingContact = signal(true);

  minDate = computed(() => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return tomorrow.toISOString().split('T')[0];
  });

  editForm: FormGroup = this.fb.group({
    description: ['', [Validators.required, Validators.minLength(15)]],
    scheduledDate: ['', Validators.required],
    scheduledTime: ['', Validators.required],
  });

  get descriptionControl() { return this.editForm.get('description'); }
  get dateControl() { return this.editForm.get('scheduledDate'); }
  get timeControl() { return this.editForm.get('scheduledTime'); }

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (!id) { this.router.navigate(['/orders']); return; }
    this.loadOrder(id);
  }

  private loadOrder(id: string): void {
    this.bookings.getById(id).subscribe({
      next: (booking) => {
        this.order.set(booking);
        this.loadWorker(booking.workerId);
        this.loadContact(id);

        if (booking.status === 'completed') {
          this.reviews.getByBooking(booking.id).subscribe({
            next: (review) => this.existingReview.set(review),
          });
        }
      },
      error: () => {
        this.error.set('مش قادر يجيب تفاصيل الطلب.');
        this.loading.set(false);
      },
    });
  }

  private loadWorker(workerId: string): void {
    this.workers.getById(workerId).subscribe({
      next: (w) => {
        this.worker.set(w);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  //  جديد: بيجيب رقم تلفون الصنايعي (والعميل، لو حبينا نستخدمه لاحقًا)
  // بتاعين الحجز ده بس. لو حصل أي خطأ (403 مثلاً لو مش من طرفي الحجز)،
  // بنسيب workerPhone على null من غير ما نكسر الصفحة كلها
  private loadContact(bookingId: string): void {
    this.loadingContact.set(true);
    this.bookings.getBookingContact(bookingId).subscribe({
      next: (contact) => {
        this.workerPhone.set(contact.workerPhone);
        this.loadingContact.set(false);
      },
      error: () => this.loadingContact.set(false),
    });
  }

  private reviews = inject(ReviewsService);

  // ─── Edit Mode ───────────────────────
  startEdit(): void {
    const o = this.order();
    if (!o) return;

    const dt = new Date(o.scheduledAt);
    const pad = (n: number) => n.toString().padStart(2, '0');
    const dateStr = `${dt.getFullYear()}-${pad(dt.getMonth() + 1)}-${pad(dt.getDate())}`;
    const timeStr = `${pad(dt.getHours())}:${pad(dt.getMinutes())}`;

    this.editForm.setValue({
      description: o.description,
      scheduledDate: dateStr,
      scheduledTime: timeStr,
    });

    this.isEditing.set(true);
  }

  cancelEdit(): void {
    this.isEditing.set(false);
    this.editForm.reset();
  }

  saveEdit(): void {
    if (this.editForm.invalid) {
      this.editForm.markAllAsTouched();
      return;
    }

    const o = this.order();
    if (!o) return;

    const { description, scheduledDate, scheduledTime } = this.editForm.value;
    const scheduledAt = new Date(`${scheduledDate}T${scheduledTime}`).toISOString();

    this.isSaving.set(true);

    this.bookings.update(o.id, { description, scheduledAt }).subscribe({
      next: (updated) => {
        this.order.set(updated);
        this.isSaving.set(false);
        this.isEditing.set(false);
        this.toastr.success('تم تعديل الطلب بنجاح', 'تم');
      },
      error: () => {
        this.isSaving.set(false);
        this.toastr.error('حصل خطأ أثناء التعديل، حاول تاني', 'خطأ');
      },
    });
  }

  // ─── Timeline & Status Helpers (بدون تغيير) ───────────────────────
  getTimeline(status: string): TimelineStep[] {
    const steps = [
      { status: 'pending',   label: 'قيد الانتظار', desc: 'تم استلام طلبك وبننتظر تأكيد الصنايعي.' },
      { status: 'active',    label: 'جاري التنفيذ',  desc: 'الصنايعي في الطريق أو بيشتغل دلوقتي.'   },
      { status: 'completed', label: 'مكتمل',          desc: 'تم إنهاء الشغل بنجاح.'                   },
    ];
    const order = ['pending', 'active', 'completed'];
    const currentIdx = order.indexOf(status);
    return steps.map((step, idx) => ({
      ...step,
      done:   idx < currentIdx,
      active: idx === currentIdx,
    }));
  }

  getStatusLabel(status: string): string {
    const map: Record<string, string> = {
      pending:   'قيد الانتظار',
      active:    'جاري التنفيذ',
      completed: 'مكتمل',
      cancelled: 'ملغي',
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

  cancelOrder(): void {
    const o = this.order();
    if (!o) return;

    const confirmed = confirm('متأكد إنك عايز تلغي الطلب ده؟ الإجراء ده مش هيترجع.');
    if (!confirmed) return;

    this.bookings.updateStatus(o.id, 'cancelled').subscribe({
      next: (updated) => {
        this.order.set(updated);
        this.toastr.success('تم إلغاء الطلب', 'تم');
      },
    });
  }

  reOrder(): void {
    const o = this.order();
    if (o) this.router.navigate(['/specialist', o.workerId]);
  }

  goBack(): void {
    this.router.navigate(['/orders']);
  }

  openChat(): void {
    const w = this.worker();
    if (!w) return;
    this.router.navigate(['/messages', w.userId], {
      queryParams: { name: w.fullName, color: w.avatarColor },
    });
  }

  // ─── Location Helpers ───────────────────────
clientAddressText = computed(() => {
  const o = this.order();
  if (!o?.address) return '';
  const { governorate, city, village, street } = o.address;
  return `${street}، ${village}، ${city}، محافظة ${governorate}`;
});

openInMaps(query: string): void {
  const o = this.order();
  const { lat, lng } = o?.address ?? {};

  const url = (lat != null && lng != null)
    ? `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`
    : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;

  window.open(url, '_blank');
}

  // ─── Review ───────────────────────
  existingReview = signal<Review | null>(null);
  isReviewEditing = signal(false);
  isSubmittingReview = signal(false);
  selectedRating = signal(0);
  reviewComment = signal('');

  readonly reviewEditWindowHours = 24;

  canEditReview = computed(() => {
    const r = this.existingReview();
    if (!r) return false;
    const hoursPassed = (Date.now() - new Date(r.createdAt).getTime()) / (1000 * 60 * 60);
    return hoursPassed <= this.reviewEditWindowHours;
  });

  setRating(value: number): void {
    this.selectedRating.set(value);
  }

  startReviewEdit(): void {
    const r = this.existingReview();
    if (!r) return;
    this.selectedRating.set(r.rating);
    this.reviewComment.set(r.comment);
    this.isReviewEditing.set(true);
  }

  cancelReviewEdit(): void {
    this.isReviewEditing.set(false);
  }

  submitReview(): void {
    const o = this.order();
    const w = this.worker();
    const currentRating = this.selectedRating();

    if (!o || !w || currentRating < 1) {
      this.toastr.error('اختار تقييم بالنجوم الأول', 'خطأ');
      return;
    }

    this.isSubmittingReview.set(true);
    const existing = this.existingReview();

    const request$ = existing
      ? this.reviews.update(existing.id, w.id, currentRating, this.reviewComment())
      : this.reviews.create({
          bookingId: o.id,
          clientId: o.clientId,
          clientName: o.clientName,
          workerId: w.id,
          rating: currentRating,
          comment: this.reviewComment(),
        });

    request$.subscribe({
      next: (review) => {
        this.existingReview.set(review);
        this.isReviewEditing.set(false);
        this.isSubmittingReview.set(false);
        this.toastr.success(existing ? 'تم تعديل تقييمك' : 'شكراً على تقييمك', 'تم');
      },
      error: () => {
        this.isSubmittingReview.set(false);
        this.toastr.error('حصل خطأ، حاول تاني', 'خطأ');
      },
    });
  }
}
