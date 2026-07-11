export type TradeType =
  | 'electrical'
  | 'plumbing'
  | 'carpentry'
  | 'painting'
  | 'ac'
  | 'cleaning'
  | 'moving'
  | 'metalwork'
  | 'other';

export interface Worker {
  id: string;
  userId: string | null;
  fullName: string;
  trade: TradeType;
  tradeLabel: string;
  city: string;
  hourlyRate: number;
  yearsOfExperience: number;
  rating: number;
  reviewsCount: number;
  isAvailable: boolean;
  completedJobs: number;
  bio: string;
  serviceRadius: number;
  avatarColor: string;
  // ⚠️ جديد: مهارات حقيقية بيختارها الصنايعي بنفسه (من قايمة محددة حسب
  // تخصصه) — مش نص ثابت متحط في الفرونت. شوف core/constants/skills-by-trade.ts
  skills: string[];
  // ── جديد ──
  idFrontUrl?: string;
  idBackUrl?: string;
  certificateUrl?: string;
  verificationStatus?: 'pending' | 'verified' | 'rejected';
}
