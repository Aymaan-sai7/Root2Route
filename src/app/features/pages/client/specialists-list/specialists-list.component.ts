import { Component, inject, OnInit, signal, computed } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { WorkersService, WorkersFilter } from '../../../../core/services/workers.service';
import { Worker, TradeType } from '../../../../core/models/worker.model';

interface FilterState {
  city: string;
  minRate: number | null;
  maxRate: number | null;
  minRating: number | null;
  availableOnly: boolean;
  sortBy: 'rating' | 'rate_asc' | 'rate_desc' | 'jobs';
}

@Component({
  selector: 'app-specialists-list',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './specialists-list.component.html',
  styleUrl: './specialists-list.component.css',
})
export class SpecialistsListComponent implements OnInit {
  private route   = inject(ActivatedRoute);
  private router  = inject(Router);
  private workers = inject(WorkersService);

  allWorkers  = signal<Worker[]>([]);
  loading     = signal(true);
  currentTrade = signal<string>('');

  filters = signal<FilterState>({
    city: '',
    minRate: null,
    maxRate: null,
    minRating: null,
    availableOnly: false,
    sortBy: 'rating',
  });

  cities = ['القاهرة', 'الجيزة', 'الإسكندرية', 'المنصورة', 'طنطا'];

  tradeLabels: Record<string, string> = {
    electrical: 'كهرباء',
    plumbing:   'سباكة',
    carpentry:  'نجارة',
    painting:   'نقاشة',
    ac:         'تكييف وتبريد',
    other:      'خدمات أخرى',
  };

  // بيفلتر ويرتب محلياً بدون request جديد
  filteredWorkers = computed(() => {
    const f = this.filters();
    let list = [...this.allWorkers()];

    if (f.city)          list = list.filter(w => w.city === f.city);
    if (f.availableOnly) list = list.filter(w => w.isAvailable);
    if (f.minRating)     list = list.filter(w => w.rating >= f.minRating!);
    if (f.minRate)       list = list.filter(w => w.hourlyRate >= f.minRate!);
    if (f.maxRate)       list = list.filter(w => w.hourlyRate <= f.maxRate!);

    switch (f.sortBy) {
      case 'rating':    list.sort((a, b) => b.rating - a.rating);       break;
      case 'rate_asc':  list.sort((a, b) => a.hourlyRate - b.hourlyRate); break;
      case 'rate_desc': list.sort((a, b) => b.hourlyRate - a.hourlyRate); break;
      case 'jobs':      list.sort((a, b) => b.completedJobs - a.completedJobs); break;
    }
    return list;
  });

  ngOnInit(): void {
    this.route.params.subscribe(params => {
      const trade = params['trade'] as TradeType;
      this.currentTrade.set(trade);
      this.loadWorkers(trade);
    });
  }

  private loadWorkers(trade: string): void {
    this.loading.set(true);
    const filter: WorkersFilter = trade !== 'other' ? { trade: trade as TradeType } : {};
    this.workers.getAll(filter).subscribe({
      next: (data) => {
        this.allWorkers.set(data);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  setFilter(key: string, value: any): void {
  this.filters.update(f => ({ ...f, [key]: value }));
}

  resetFilters(): void {
    this.filters.set({
      city: '', minRate: null, maxRate: null,
      minRating: null, availableOnly: false, sortBy: 'rating',
    });
  }

  goToProfile(id: string): void {
    this.router.navigate(['/specialist', id]);
  }

  get tradeLabel(): string {
    return this.tradeLabels[this.currentTrade()] ?? 'الخدمات';
  }
}
