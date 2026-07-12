export interface Review {
  id: string;
  bookingId: string;
  clientId: string;
  clientName: string;
  workerId: string;
  rating: number;
  comment: string;
  createdAt: string;
  updatedAt?: string;
  //  جديد: رد الصنايعي على التقييم — اختياري، بيظهر تحت التقييم للعميل
  // لما يتحط. workerReplyAt منفصل عن updatedAt عمدًا لأن ده رد الصنايعي
  // مش تعديل العميل لتقييمه
  workerReply?: string;
  workerReplyAt?: string;
}

export interface CreateReviewDto {
  bookingId: string;
  clientId: string;
  clientName: string;
  workerId: string;
  rating: number;
  comment: string;
}
