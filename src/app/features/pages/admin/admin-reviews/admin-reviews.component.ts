import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import Swal from 'sweetalert2';
import { AdminService } from '../../../../core/services/admin.service';
import { ReviewsService } from '../../../../core/services/review.service';
import { Review } from '../../../../core/models/review.model';
import { timeAgo } from '../../../../core/utils/time.util';

@Component({
  selector: 'app-admin-reviews',
  standalone: true,
  imports: [],
  templateUrl: './admin-reviews.component.html',
  styleUrl: './admin-reviews.component.css',
})
export class AdminReviewsComponent implements OnInit {
  private adminService = inject(AdminService);
  private reviewsService = inject(ReviewsService);
  private route = inject(ActivatedRoute);

  reviews = signal<Review[]>([]);
  loading = signal(true);
  deletingId = signal<string | null>(null);

  //  جديد: فلتر بالنجوم — بيتقرا من ?rating= لو جاي من داشبورد الأدمن，
  // وبرضو متاح تغيّره يدوي بالأزرار (شوف setRatingFilter). الفلترة
  // client-side لأن /reviews العام مبيدعمش rating كـ query param
  // بمعنى "يساوي بالظبط" مفيد هنا (الداتا أصلاً صغيرة، مفيش مشكلة أداء)
  ratingFilter = signal<number | null>(null);

  filteredReviews = computed(() => {
    const rating = this.ratingFilter();
    const list = this.reviews();
    return rating ? list.filter((r) => Math.round(r.rating) === rating) : list;
  });

  ngOnInit(): void {
    const ratingParam = this.route.snapshot.queryParamMap.get('rating');
    const parsed = ratingParam ? Number(ratingParam) : null;
    if (parsed && parsed >= 1 && parsed <= 5) {
      this.ratingFilter.set(parsed);
    }

    this.load();
  }

  private load(): void {
    this.loading.set(true);
    this.adminService.getAllReviews().subscribe({
      next: (list) => {
        this.reviews.set(list);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  //  استدعيها من الـ HTML لو عايز تضيف أزرار فلترة يدوية بالنجوم
  // (1 لحد 5)، أو ابعتلها null عشان تشيل الفلتر وترجع تشوف الكل
  setRatingFilter(rating: number | null): void {
    this.ratingFilter.set(rating);
  }

  timeAgo(date: string): string {
    return timeAgo(date);
  }

  stars(rating: number): number[] {
    return Array.from({ length: 5 }, (_, i) => (i < rating ? 1 : 0));
  }

  confirmDelete(review: Review): void {
    Swal.fire({
      title: 'حذف التقييم؟',
      text: 'هيتحذف نهائيًا، ومتوسط تقييم الصنايعي هيتحدث تلقائيًا.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'حذف',
      cancelButtonText: 'رجوع',
      confirmButtonColor: '#DC2626',
    }).then((result) => {
      if (result.isConfirmed) this.deleteReview(review);
    });
  }

  private deleteReview(review: Review): void {
    this.deletingId.set(review.id);
    this.reviewsService.adminDelete(review.id, review.workerId).subscribe({
      next: () => {
        this.reviews.update((list) => list.filter((r) => r.id !== review.id));
        this.deletingId.set(null);
      },
      error: () => this.deletingId.set(null),
    });
  }
}
