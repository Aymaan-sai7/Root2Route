import { TradeType } from './worker.model';

export type BookingStatus = 'pending' | 'active' | 'completed' | 'cancelled';

// ⚠️ جديد: مراحل الشغل الجاري — بتتحدث من صفحة pro-jobs عن طريق
// endpoint محمي مخصص (PATCH /bookings/:id/work-stage)، الصنايعي صاحب
// الحجز بس يقدر يحركها
export type WorkStage = 'on_the_way' | 'in_progress' | 'done';

export interface BookingAddress {
   governorate: string;
  city: string;
  village: string;
  street: string;
  notes?: string;
  lat?: number;
  lng?: number;
}

export interface Booking {
  id: string;
  clientId: string;
  workerId: string;
  workerName: string;
  clientName: string;
  // ⚠️ workerTrade ده النص العربي المعروض (زي "كهربا")، مش الـ slug.
  // trade تحته هو الـ TradeType الحقيقي ("electrical") — لازم الاتنين لأن
  // الكوبونات بتتقيد بالـ trade مش بالـ label
  workerTrade: string;
  trade?: TradeType;
  workerAvatarColor: string;
  description: string;
  address: BookingAddress;
  status: BookingStatus;
  scheduledAt: string;
  estimatedHours: number;
  // ⚠️ totalAmount بقى يمثل السعر النهائي بعد الخصم (لو فيه كوبون اتطبق).
  // originalAmount هو السعر الأصلي قبل أي خصم — بيتحسبوا الاتنين في السيرفر
  // وقت إنشاء الحجز، مش في الفرونت، عشان محدش يقدر يزوّرهم
  totalAmount: number;
  originalAmount?: number;
  discountAmount?: number;
  couponCode?: string | null;
  // ⚠️ جديد — null لحد ما الطلب يتقبل ويبقى active، وقتها بيبدأ من
  // 'on_the_way' تلقائي (شوف updateStatus في bookings.service.ts)
  workStage?: WorkStage | null;
  createdAt: string;
}

export type BookingStep = 'details' | 'address' | 'schedule' | 'review';
