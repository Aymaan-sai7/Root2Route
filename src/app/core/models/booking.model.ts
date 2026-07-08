import { TradeType } from './worker.model';

export type BookingStatus = 'pending' | 'active' | 'completed' | 'cancelled';

export interface BookingAddress {
  area: string;
  street: string;
  buildingNumber: string;
  notes?: string;
   governorate: string;
  city: string;
  village: string;      // ⚠️ جديد: "البلد" — كتابة حرة، مش قايمة ثابتة
  lat?: number;          // ⚠️ جديد: إحداثيات الموقع من الخريطة (اختياري)
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
  createdAt: string;
}

export type BookingStep = 'details' | 'address' | 'schedule' | 'review';
