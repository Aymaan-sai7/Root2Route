import { inject, Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, switchMap } from 'rxjs';
import { map } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Worker, TradeType } from '../models/worker.model';

export interface WorkersFilter {
  trade?: TradeType;
  city?: string;
  isAvailable?: boolean;
}

@Injectable({ providedIn: 'root' })
export class WorkersService {
  private http = inject(HttpClient);
  private base = `${environment.apiUrl}/workers`;

  /** جيب كل الصنايعية مع فلتر اختياري */
  getAll(filter?: WorkersFilter): Observable<Worker[]> {
    let params = new HttpParams();
    if (filter?.trade)       params = params.set('trade', filter.trade);
    if (filter?.city)        params = params.set('city', filter.city);
    if (filter?.isAvailable !== undefined)
      params = params.set('isAvailable', String(filter.isAvailable));
    return this.http.get<Worker[]>(this.base, { params });
  }

  /** جيب صنايعي واحد بالـ id */
  getById(id: string): Observable<Worker> {
    return this.http.get<Worker>(`${this.base}/${id}`);
  }

  /** أعلى الصنايعية تقييماً — sort محلي عشان json-server beta مش بيدعم _sort */
  getTopRated(limit = 5): Observable<Worker[]> {
    return this.http.get<Worker[]>(this.base).pipe(
      map((workers) =>
        workers
          .sort((a, b) => b.rating - a.rating)
          .slice(0, limit)
      )
    );
  }

  /** إنشاء صنايعي جديد (وقت الـ register) */
  createWorker(data: Omit<Worker, 'id'>): Observable<Worker> {
    const worker = { ...data, id: crypto.randomUUID() };
    return this.http.post<Worker>(this.base, worker);
  }

  /** جيب صنايعي بالـ userId (يربط بين users و workers) */
  getByUserId(userId: string): Observable<Worker[]> {
    const params = new HttpParams().set('userId', userId);
    return this.http.get<Worker[]>(this.base, { params });
  }

  /** كل المدن الفريدة اللي فيها صنايعية مسجلين */
  getDistinctCities(): Observable<string[]> {
    return this.http.get<Worker[]>(this.base).pipe(
      map((workers) => {
        const cities = workers.map((w) => w.city);
        return [...new Set(cities)].sort();
      })
    );
  }

  /** يزوّد عدد الطلبات المكتملة لصنايعي معين بـ 1 */
  incrementCompletedJobs(workerId: string): Observable<Worker> {
    return this.getById(workerId).pipe(
      switchMap((w) =>
        this.http.patch<Worker>(`${this.base}/${workerId}`, {
          completedJobs: (w.completedJobs ?? 0) + 1,
        })
      )
    );
  }
}
