import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, forkJoin, of } from 'rxjs';
import { switchMap } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import { Notification } from '../models/notification.model';

@Injectable({ providedIn: 'root' })
export class NotificationsService {
  private http = inject(HttpClient);
  private base = `${environment.apiUrl}/notifications`;

  /** عدد الإشعارات الغير مقروءة — بيتحدث بالـ polling من notification-bell.component */
  unreadCount = signal(0);

  getForUser(userId: string, limit = 20): Observable<Notification[]> {
    return this.http.get<Notification[]>(this.base, {
      params: { userId, _sort: 'createdAt', _order: 'desc', _limit: limit },
    });
  }

  getUnread(userId: string): Observable<Notification[]> {
    return this.http.get<Notification[]>(this.base, {
      params: { userId, isRead: 'false' },
    });
  }

  refreshUnreadCount(userId: string): void {
    if (!userId) return;
    this.getUnread(userId).subscribe({
      next: (list) => this.unreadCount.set(list.length),
      error: () => this.unreadCount.set(0),
    });
  }

  markAsRead(id: string): Observable<Notification> {
    return this.http.patch<Notification>(`${this.base}/${id}`, { isRead: true });
  }

  /** بنعمل patch لكل عنصر غير مقروء على التوازي (السيرفر مبيدعمش bulk update) */
  markAllAsRead(userId: string): Observable<Notification[]> {
    return this.getUnread(userId).pipe(
      switchMap((unread) => {
        if (!unread.length) return of([]);
        return forkJoin(unread.map((n) => this.markAsRead(n.id)));
      })
    );
  }

  /**
   * بتتنادى من bookings.service.ts أو reviews.service.ts لما يحصل حدث محتاج إشعار.
   *
   * مثال (لما الـ client يعمل حجز جديد -> نبلّغ الصنايعي):
   *   this.notificationsService.create({
   *     userId: worker.userId,               //  لازم يكون user id الحقيقي، مش worker.id
   *     type: 'booking_created',
   *     title: 'طلب جديد',
   *     message: `${booking.clientName} طلب خدمتك`,
   *     link: '/pro/requests',
   *   }).subscribe();
   */
  create(payload: Omit<Notification, 'id' | 'isRead' | 'createdAt'>): Observable<Notification> {
    const notification: Partial<Notification> = {
      ...payload,
      isRead: false,
      createdAt: new Date().toISOString(),
    };
    return this.http.post<Notification>(this.base, notification);
  }
}
