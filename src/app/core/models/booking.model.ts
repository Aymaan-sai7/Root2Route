export type BookingStatus = 'pending' | 'active' | 'completed' | 'cancelled';

export interface BookingAddress {
  area: string;
  street: string;
  buildingNumber: string;
  notes?: string;
}

export interface Booking {
  id: string;
  clientId: string;
  workerId: string;
  workerName: string;
  clientName: string; 
  workerTrade: string;
  workerAvatarColor: string;
  description: string;
  address: BookingAddress;
  status: BookingStatus;
  scheduledAt: string;
  estimatedHours: number;
  totalAmount: number;
  createdAt: string;
}

export type BookingStep = 'details' | 'address' | 'schedule' | 'review';
