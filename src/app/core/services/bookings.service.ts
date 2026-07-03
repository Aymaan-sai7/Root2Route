import { inject, Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { map, switchMap } from 'rxjs'; // ← switchMap مضاف
import { environment } from '../../../environments/environment';
import { Booking, BookingStatus, BookingAddress } from '../models/booking.model';
import { NotificationsService } from './notification.service'; // ← جديد
import { WorkersService } from './workers.service'; // ← جديد (عشان نجيب worker.userId)

export interface CreateBookingDto {
  clientId: string;
  clientName: string;
  workerId: string;
  workerName: string;
  workerTrade: string;
  workerAvatarColor: string;
  description: string;
  address: BookingAddress;
  scheduledAt: string;
  estimatedHours: number;
  totalAmount: number;
}

const BOOKING_STATUS_TEXT: Record<BookingStatus, string> = {
  pending: 'قيد الانتظار',
  active: 'بدأ الشغل عليه',
  completed: 'اتقفل بنجاح',
  cancelled: 'اتلغى',
};

@Injectable({ providedIn: 'root' })
export class BookingsService {
  private http = inject(HttpClient);
  private notificationsService = inject(NotificationsService); // ← جديد
  private workersService = inject(WorkersService); // ← جديد
  private base = `${environment.apiUrl}/bookings`;

  /** جيب حجوزات عميل معين */
  getByClient(clientId: string): Observable<Booking[]> {
    const params = new HttpParams().set('clientId', clientId);
    return this.http.get<Booking[]>(this.base, { params }).pipe(
      map((bookings) => bookings.sort((a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      ))
    );
  }

  /** جيب حجوزات صنايعي معين */
  getByWorker(workerId: string): Observable<Booking[]> {
    const params = new HttpParams().set('workerId', workerId);
    return this.http.get<Booking[]>(this.base, { params }).pipe(
      map((bookings) => bookings.sort((a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      ))
    );
  }

  /** جيب حجز واحد بالـ id */
  getById(id: string): Observable<Booking> {
    return this.http.get<Booking>(`${this.base}/${id}`);
  }

  /** جيب أحدث الحجوزات */
  getRecent(limit = 4): Observable<Booking[]> {
    return this.http.get<Booking[]>(this.base).pipe(
      map((bookings) =>
        bookings
          .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
          .slice(0, limit)
      )
    );
  }

  /** جيب حجوزات بـ status معين */
  getByStatus(workerId: string, status: BookingStatus): Observable<Booking[]> {
    const params = new HttpParams()
      .set('workerId', workerId)
      .set('status', status);
    return this.http.get<Booking[]>(this.base, { params });
  }

  /** تعديل بيانات حجز موجود */
  update(id: string, changes: Partial<Pick<Booking, 'description' | 'address' | 'scheduledAt' | 'totalAmount'>>): Observable<Booking> {
    return this.http.patch<Booking>(`${this.base}/${id}`, changes);
  }

  /** حجز جديد — بعد الإنشاء، بنبلّغ الصنايعي بطلب جديد */
  create(dto: CreateBookingDto): Observable<Booking> {
    const booking: Omit<Booking, 'id'> = {
      ...dto,
      status: 'pending',
      createdAt: new Date().toISOString(),
    };
    return this.http.post<Booking>(this.base, booking).pipe(
      switchMap((created) =>
        this.workersService.getById(created.workerId).pipe(
          switchMap((worker) => {
            if (!worker.userId) return of(null); // مفيش userId معروف، تخطى الإشعار من غير ما يكسر الحجز
            return this.notificationsService.create({
              userId: worker.userId, // ⚠️ user id الحقيقي، مش worker.id
              type: 'booking_created',
              title: 'طلب جديد',
              message: `${created.clientName} طلب خدمتك`,
              link: '/pro/requests',
            });
          }),
          map(() => created)
        )
      )
    );
  }

  /** تحديث status حجز — بعد التحديث، بنبلّغ الـ client بالتغيير */
  updateStatus(id: string, status: BookingStatus): Observable<Booking> {
    return this.http.patch<Booking>(`${this.base}/${id}`, { status }).pipe(
      switchMap((updated) =>
        this.notificationsService.create({
          userId: updated.clientId,
          type: 'booking_status',
          title: 'تحديث في حالة الحجز',
          message: `حجزك مع ${updated.workerName} ${BOOKING_STATUS_TEXT[status]}`,
          link: `/orders/${updated.id}`,
        }).pipe(map(() => updated))
      )
    );
  }

  /** حذف حجز نهائيًا */
  delete(id: string): Observable<void> {
    return this.http.delete<void>(`${this.base}/${id}`);
  }
}
