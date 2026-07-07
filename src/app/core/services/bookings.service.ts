import { inject, Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse, HttpParams } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { map, switchMap, catchError } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Booking, BookingStatus, BookingAddress } from '../models/booking.model';
import { TradeType } from '../models/worker.model';
import { NotificationsService } from './notification.service';
import { WorkersService } from './workers.service';

export interface CreateBookingDto {
  clientId: string;
  clientName: string;
  workerId: string;
  workerName: string;
  // ⚠️ workerTrade فضل زي ما هو (النص العربي المعروض، زي "كهربا") عشان
  // مانلمسش أي حاجة بتعرضه في الفرونت. trade تحته هو الـ TradeType الحقيقي
  // ("electrical") — لازم يتبعت منفصل عشان قيود الكوبون (تصنيف معين) تتحقق صح
  workerTrade: string;
  trade: TradeType;
  workerAvatarColor: string;
  description: string;
  address: BookingAddress;
  scheduledAt: string;
  estimatedHours: number;
  // ⚠️ السعر الأصلي قبل أي خصم — اسمه فضل totalAmount عمدًا عشان مانلمسش
  // خطوات الحجز الأولى (تفاصيل/عنوان/معاد) اللي بتحسب الرقم ده زي ما هي.
  // السيرفر هو اللي بيحوّله لـ originalAmount ويحسب السعر النهائي الفعلي
  totalAmount: number;
  // ⚠️ اختياري — لو المستخدم كتب كود كوبون في خطوة المراجعة واتقبل فعليًا
  couponCode?: string;
}

// ⚠️ شكل الكوبون العام (Public) — بيرجع من /coupons/active، مفيهوش
// usedCount/usedByUserIds لأنها مش لازم تبان للعامة
export interface ActiveCoupon {
  code: string;
  discountType: 'percentage' | 'fixed';
  discountValue: number;
  tradeRestriction: TradeType | null;
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
  private notificationsService = inject(NotificationsService);
  private workersService = inject(WorkersService);
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

  /**
   * حجز جديد — بعد الإنشاء، بنبلّغ الصنايعي بطلب جديد
   * ⚠️ لو dto فيه couponCode، بيتبعت للسيرفر زي ما هو والسيرفر هو اللي بيتحقق
   * منه ويحسب الخصم الفعلي ويرجّع الحجز بـ totalAmount النهائي بعد الخصم —
   * مفيش أي حساب خصم بيحصل هنا في الفرونت خالص
   */
  create(dto: CreateBookingDto): Observable<Booking> {
    const booking = {
      ...dto,
      status: 'pending' as BookingStatus,
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

  /**
   * جيب كل الكوبونات النشطة دلوقتي (Public، مش محتاج تسجيل دخول)
   * ⚠️ بتتستخدم في سكشن "عروض وتنقل سريع" بصفحة find-services
   */
  getActiveCoupons(): Observable<ActiveCoupon[]> {
    return this.http
      .get<ActiveCoupon[]>(`${environment.apiUrl}/coupons/active`)
      .pipe(catchError(() => of([])));
  }

  /**
   * التحقق من كوبون قبل التأكيد النهائي (بيستخدم في خطوة Review & Confirm)
   * ⚠️ ده validate بس، مش استهلاك — الاستهلاك الفعلي بيحصل جوه create() فوق
   * وقت التأكيد النهائي بس
   * ⚠️ الباك اند بيرجع status 400/404 لأي كوبون مش صالح (مش 200 مع valid:false)،
   * فبنمسك الخطأ هنا ونحوّله لنفس الشكل { valid:false, message } عشان الكومبوننت
   * يقدر يتعامل معاه كـ "نتيجة عادية" مش error بيكسر حاجة
   */
  validateCoupon(
    code: string,
    trade: string
  ): Observable<{ valid: boolean; discountType?: 'percentage' | 'fixed'; discountValue?: number; code?: string; message?: string }> {
    return this.http
      .post<{ valid: boolean; discountType?: 'percentage' | 'fixed'; discountValue?: number; code?: string }>(
        `${environment.apiUrl}/coupons/validate`,
        { code, trade }
      )
      .pipe(
        catchError((err: HttpErrorResponse) =>
          of({ valid: false, message: err.error?.message ?? 'حصل خطأ، حاول تاني.' })
        )
      );
  }

  /** حذف حجز نهائيًا */
  delete(id: string): Observable<void> {
    return this.http.delete<void>(`${this.base}/${id}`);
  }
}
