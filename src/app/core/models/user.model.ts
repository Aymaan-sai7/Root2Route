export type UserRole = 'client' | 'pro' | 'admin';
export type UserStatus = 'pending' | 'active' | 'rejected' | 'blocked';

// 1. مفيش password هنا خالص — السيرفر بيشيلها فعليًا من أي response (sanitizeUser)،
//    فمستحيل يوصل أي User object للفرونت إند فيه password فعلي. تركها هنا كـ
//    required كانت بتخلي الـ type غير دقيق (بيوعد بحاجة مستحيل توجد فعليًا).
// 2. nationalId بقت اختيارية — حساب الأدمن (اللي بيتعمل عن طريق /admin/bootstrap)
//    مالوش nationalId خالص، فلو سيبناها required، أي كود بيتعامل مع أدمن هيبقى
//    مضطر يعمل type assertion غير ضروري
export interface User {
  id: string;
  fullName: string;
  email: string;
  role: UserRole;
  status: UserStatus;
  nationalId?: string;
  createdAt: string;
}
