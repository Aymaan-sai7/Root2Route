export type NotificationType =
  | 'booking_created'   // طلب حجز جديد -> بيوصل للصنايعي
  | 'booking_status'    // تغيير حالة الحجز (accepted/active/completed/cancelled) -> بيوصل للـ client
  | 'review_received';  // تقييم جديد -> بيوصل للصنايعي

export interface Notification {
  id: string;
  userId: string;        // الـ user id الحقيقي بتاع المستقبِل (نفس مبدأ otherId في نظام الرسائل — مش worker entity id)
  type: NotificationType;
  title: string;
  message: string;
  link?: string;          // مسار Angular للتنقل عند الضغط على الإشعار (اختياري)
  isRead: boolean;
  createdAt: string;
}
