import { inject, Injectable } from '@angular/core';
import { forkJoin, map, Observable } from 'rxjs';
import { BookingsService } from '../services/bookings.service';
import { WorkersService } from '../services/workers.service';
import { Booking } from '../models/booking.model';
import { Worker } from '../models/worker.model';

export interface ClientDashboardData {
  totalBookings: number;
  activeBookings: number;
  completedBookings: number;
  recentBookings: Booking[];
  topWorkers: Worker[];
}

export interface ProDashboardData {
  totalEarnings: number;
  activeJobs: number;
  pendingRequests: number;
  completedJobs: number;
  recentJobs: Booking[];
}

@Injectable({ providedIn: 'root' })
export class DashboardService {
  private bookings = inject(BookingsService);
  private workers = inject(WorkersService);

  /** بيانات داشبورد العميل */
  getClientData(clientId: string): Observable<ClientDashboardData> {
    return forkJoin({
      bookings: this.bookings.getByClient(clientId),
      topWorkers: this.workers.getTopRated(4),
    }).pipe(
      map(({ bookings, topWorkers }) => ({
        totalBookings: bookings.length,
        activeBookings: bookings.filter((b) => b.status === 'active').length,
        completedBookings: bookings.filter((b) => b.status === 'completed').length,
        recentBookings: bookings.slice(0, 5),
        topWorkers,
      }))
    );
  }

  /** بيانات داشبورد الصنايعي */
  getProData(workerId: string): Observable<ProDashboardData> {
    return this.bookings.getByWorker(workerId).pipe(
      map((bookings) => {
        const completed = bookings.filter((b) => b.status === 'completed');
        const totalEarnings = completed.reduce((sum, b) => sum + b.totalAmount, 0);
        return {
          totalEarnings,
          activeJobs: bookings.filter((b) => b.status === 'active').length,
          pendingRequests: bookings.filter((b) => b.status === 'pending').length,
          completedJobs: completed.length,
          recentJobs: bookings.slice(0, 5),
        };
      })
    );
  }
}
