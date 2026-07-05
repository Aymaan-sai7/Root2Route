import { inject, Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, switchMap, map, of } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Review, CreateReviewDto } from '../models/review.model';
import { Worker } from '../models/worker.model';
import { NotificationsService } from './notification.service';

@Injectable({ providedIn: 'root' })
export class ReviewsService {
  private http = inject(HttpClient);
  private notificationsService = inject(NotificationsService);
  private reviewsBase = `${environment.apiUrl}/reviews`;
  private workersBase = `${environment.apiUrl}/workers`;

  /** يجيب تقييم حجز معين لو موجود */
  getByBooking(bookingId: string): Observable<Review | null> {
    const params = new HttpParams().set('bookingId', bookingId);
    return this.http.get<Review[]>(this.reviewsBase, { params }).pipe(
      map((reviews) => reviews[0] ?? null)
    );
  }

  /** كل تقييمات صنايعي معين (لعرضها في specialist-profile) */
  getByWorker(workerId: string): Observable<Review[]> {
    const params = new HttpParams().set('workerId', workerId);
    return this.http.get<Review[]>(this.reviewsBase, { params }).pipe(
      map((reviews) => reviews.sort((a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      ))
    );
  }

  /** تقييم جديد + تحديث متوسط تقييم الصنايعي + إشعار الصنايعي */
  create(dto: CreateReviewDto): Observable<Review> {
    const review: Omit<Review, 'id'> = {
      ...dto,
      createdAt: new Date().toISOString(),
    };
    return this.http.post<Review>(this.reviewsBase, review).pipe(
      switchMap((created) =>
        this.recalculateWorkerRating(dto.workerId).pipe(
          switchMap(() => this.notifyWorker(dto)),
          map(() => created)
        )
      )
    );
  }

  /** تعديل تقييم موجود (لو لسه جوه نافذة التعديل) */
  update(id: string, workerId: string, rating: number, comment: string): Observable<Review> {
    return this.http.patch<Review>(`${this.reviewsBase}/${id}`, {
      rating,
      comment,
      updatedAt: new Date().toISOString(),
    }).pipe(
      switchMap((updated) =>
        this.recalculateWorkerRating(workerId).pipe(map(() => updated))
      )
    );
  }

  adminDelete(reviewId: string, workerId: string): Observable<void> {
    return this.http.delete<void>(`${this.reviewsBase}/${reviewId}`).pipe(
      switchMap(() => this.recalculateWorkerRating(workerId)),
      map(() => undefined)
    );
  }

  /** بيبعت إشعار "تقييم جديد" للصنايعي — بيجيب الـ userId الحقيقي بتاعه الأول */
  private notifyWorker(dto: CreateReviewDto): Observable<unknown> {
    return this.http.get<Worker>(`${this.workersBase}/${dto.workerId}`).pipe(
      switchMap((worker) => {
        if (!worker.userId) return of(null); // مفيش userId معروف، تخطى الإشعار
        return this.notificationsService.create({
          userId: worker.userId, // ⚠️ user id الحقيقي، مش worker.id
          type: 'review_received',
          title: 'تقييم جديد',
          message: `${dto.clientName} قيّمك بـ ${dto.rating} نجوم`,
          link: '/pro/dashboard',
        });
      })
    );
  }

  /** إعادة حساب متوسط التقييم وعدد التقييمات للصنايعي */
  private recalculateWorkerRating(workerId: string): Observable<Worker> {
    return this.getByWorker(workerId).pipe(
      switchMap((reviews) => {
        const reviewsCount = reviews.length;
        const rating = reviewsCount > 0
          ? Math.round((reviews.reduce((sum, r) => sum + r.rating, 0) / reviewsCount) * 10) / 10
          : 0;
        return this.http.patch<Worker>(`${this.workersBase}/${workerId}`, {
          rating,
          reviewsCount,
        });
      })
    );
  }
}
