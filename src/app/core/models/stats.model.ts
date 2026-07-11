// ⚠️ لازم يبقى مطابق تمامًا لشكل الرد بتاع GET /stats/public في server.js
// (شوف دالة computePublicStats هناك)
export interface PublicStats {
  totalWorkers: number;
  activeWorkersNow: number;
  totalClients: number;
  completedJobs: number;
  avgRating: number;
  avgMonthlyIncome: number;
  clientsThisWeek: number;
  // المفاتيح هنا هي TradeType الحقيقي (زي 'electrical', 'plumbing'...)
  workersByTrade: Record<string, number>;
  updatedAt: string;
}
