import { Component, OnInit, OnDestroy, signal, inject } from '@angular/core';
import { trigger, transition, style, animate } from '@angular/animations';
import { forkJoin, of } from 'rxjs';
import { switchMap, map, catchError } from 'rxjs/operators';
import { ScrollRevealDirective } from '../../../../../shared/directive/scroll-reveal.directive';
import { ReviewsService } from '../../../../../core/services/review.service';
import { BookingsService } from '../../../../../core/services/bookings.service';
import { generateAvatarColor } from '../../../../../core/utils/color.util';
//  لو اسم الملف/المسار مختلف عندك، عدّل السطر اللي فوق ده بس

interface DisplayTestimonial {
  name: string;
  initial: string;
  color: string;
  service: string;
  rating: number;
  quote: string;
}

@Component({
  selector: 'app-testimonials',
  standalone: true,
  imports: [ScrollRevealDirective],
  templateUrl: './testimonials.component.html',
  styleUrl: './testimonials.component.css',
  animations: [
    trigger('cardSwap', [
      transition(':enter', [
        style({ opacity: 0, transform: 'translateY(16px) scale(0.985)' }),
        animate(
          '450ms cubic-bezier(0.16, 1, 0.3, 1)',
          style({ opacity: 1, transform: 'translateY(0) scale(1)' })
        ),
      ]),
      transition(':leave', [
        animate(
          '260ms cubic-bezier(0.7, 0, 0.84, 0)',
          style({ opacity: 0, transform: 'translateY(-12px) scale(0.99)' })
        ),
      ]),
    ]),
  ],
})
export class TestimonialsComponent implements OnInit, OnDestroy {
  private reviewsService = inject(ReviewsService);
  private bookingsService = inject(BookingsService);

  /**  تقييمات حقيقية بس — بتتجاب من السيرفر، مفيش أي داتا وهمية هنا خالص */
  testimonials = signal<DisplayTestimonial[]>([]);
  loading = signal(true);

  activeIndex = signal(0);
  readonly stepDuration = 4500;
  paused = signal(false);

  private intervalId?: ReturnType<typeof setInterval>;
  private pauseTimeoutId?: ReturnType<typeof setTimeout>;

  ngOnInit(): void {
    this.loadTestimonials();
  }

  ngOnDestroy(): void {
    this.clearInterval();
    if (this.pauseTimeoutId) clearTimeout(this.pauseTimeoutId);
  }

  goTo(idx: number): void {
    this.activeIndex.set(idx);
    this.pauseFor(8000);
  }

  private loadTestimonials(): void {
    this.loading.set(true);

    this.reviewsService.getTopRated(8, 4).pipe(
      switchMap((reviews) => {
        if (reviews.length === 0) return of([] as (DisplayTestimonial | null)[]);

        //  الـ Review مفيهوش اسم التخصص مباشرة، فبنجيبه من الحجز المرتبط بيه
        // (Booking.workerTrade متسجلة وقت إنشاء الحجز أصلًا)
        const requests = reviews.map((r) =>
          this.bookingsService.getById(r.bookingId).pipe(
            map((booking) => ({
              name: r.clientName,
              initial: r.clientName.charAt(0),
              color: generateAvatarColor(r.clientName),
              service: booking.workerTrade,
              rating: r.rating,
              quote: r.comment,
            })),
            // لو الحجز اتمسح لأي سبب، نتجاهل التقييم ده بس بدل ما يكسر الباقي
            catchError(() => of(null))
          )
        );

        return forkJoin(requests);
      }),
      map((results) => results.filter((r): r is DisplayTestimonial => r !== null)),
      catchError(() => of([] as DisplayTestimonial[]))
    ).subscribe((list) => {
      this.testimonials.set(list);
      this.loading.set(false);
      if (list.length > 0) this.startInterval();
    });
  }

  private startInterval(): void {
    this.intervalId = setInterval(() => {
      if (!this.paused()) {
        this.activeIndex.update(
          (current) => (current + 1) % this.testimonials().length
        );
      }
    }, this.stepDuration);
  }

  private clearInterval(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = undefined;
    }
  }

  private pauseFor(ms: number): void {
    this.paused.set(true);
    if (this.pauseTimeoutId) clearTimeout(this.pauseTimeoutId);
    this.pauseTimeoutId = setTimeout(() => {
      this.paused.set(false);
    }, ms);
  }
}
