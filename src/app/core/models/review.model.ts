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
}

export interface CreateReviewDto {
  bookingId: string;
  clientId: string;
  clientName: string;
  workerId: string;
  rating: number;
  comment: string;
}
