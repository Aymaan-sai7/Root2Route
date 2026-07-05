import { Component, OnInit, inject, signal } from '@angular/core';
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

  reviews = signal<Review[]>([]);
  loading = signal(true);
  deletingId = signal<string | null>(null);

  ngOnInit(): void {
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
