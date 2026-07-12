import { Component, inject, OnInit, signal, computed, Renderer2 } from '@angular/core';
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

const DEFAULT_FILTERS: FilterState = {
  city: '', minRate: null, maxRate: null,
  minRating: null, availableOnly: false, sortBy: 'rating',
};

@Component({
  selector: 'app-specialists-list',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './specialists-list.component.html',
  styleUrl: './specialists-list.component.css',
})
export class SpecialistsListComponent implements OnInit {
  private route    = inject(ActivatedRoute);
  private router   = inject(Router);
  private workers  = inject(WorkersService);
  private renderer = inject(Renderer2);

  allWorkers   = signal<Worker[]>([]);
  loading      = signal(true);
  currentTrade = signal<string>('');

  //  جديد: اسم التخصص المخصص المطلوب البحث عنه (جاي من ?q= في الرابط)،
  // مستخدم بس لما currentTrade === 'other'
  searchLabel = signal<string>('');

  filtersOpen = signal(false);

  filters = signal<FilterState>({ ...DEFAULT_FILTERS });

  cities = ['القاهرة', 'الجيزة', 'الإسكندرية', 'المنصورة', 'طنطا'];

  tradeLabels: Record<string, string> = {
    electrical: 'كهرباء',
    plumbing:   'سباكة',
    carpentry:  'نجارة',
    painting:   'نقاشة',
    ac:         'تكييف وتبريد',
    other:      'خدمات أخرى',
  };

  sortOptions = [
    { val: 'rating' as const,    label: 'الأعلى تقييماً' },
    { val: 'rate_asc' as const,  label: 'السعر: الأقل' },
    { val: 'rate_desc' as const, label: 'السعر: الأعلى' },
    { val: 'jobs' as const,      label: 'الأكثر تجربة' },
  ];

  ratingOptions = [4.5, 4, 3.5];

  activeFilterCount = computed(() => {
    const f = this.filters();
    let count = 0;
    if (f.city) count++;
    if (f.minRating) count++;
    if (f.availableOnly) count++;
    if (f.minRate) count++;
    if (f.maxRate) count++;
    return count;
  });

  filteredWorkers = computed(() => {
    const f = this.filters();
    const search = this.searchLabel();
    let list = [...this.allWorkers()];

    //  جديد: لو جاي من بحث عن تخصص مخصص، فلتر إضافي على tradeLabel
    // الحقيقي (مش على enum trade الثابت)
    if (search) {
      const normalizedSearch = this.normalizeArabic(search);
      list = list.filter((w) =>
        this.normalizeArabic(w.tradeLabel).includes(normalizedSearch)
      );
    }

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

    //  جديد: بيقرأ ?q= لو موجود (بيتبعت من find-services لما البحث يطابق
    // تخصص مخصص حقيقي)
    this.route.queryParams.subscribe(qp => {
      this.searchLabel.set(qp['q'] ?? '');
    });
  }

  private loadWorkers(trade: string): void {
    this.loading.set(true);
    //  فيكس: كان فيه استثناء بيخلي trade === 'other' يجيب كل الصنايعية
    // من غير فلترة خالص. دلوقتي بنفلتر دايمًا على التخصص الحقيقي المطلوب،
    // بما فيه 'other' — فصفحة "خدمات أخرى" بتعرض بس اللي تخصصهم فعلًا 'other'
    const filter: WorkersFilter = { trade: trade as TradeType };
    this.workers.getAll(filter).subscribe({
      next: (data) => {
        this.allWorkers.set(data);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  private normalizeArabic(text: string): string {
    return text
      .trim()
      .toLowerCase()
      .replace(/[\u064B-\u0652]/g, '')
      .replace(/[أإآ]/g, 'ا')
      .replace(/ة/g, 'ه')
      .replace(/ى/g, 'ي')
      .replace(/\s+/g, ' ');
  }

  setFilter(key: string, value: any): void {
    this.filters.update(f => ({ ...f, [key]: value }));
  }

  resetFilters(): void {
    this.filters.set({ ...DEFAULT_FILTERS });
  }

  openFilters(): void {
    this.filtersOpen.set(true);
    this.renderer.addClass(document.body, 'sl-no-scroll');
  }

  closeFilters(): void {
    this.filtersOpen.set(false);
    this.renderer.removeClass(document.body, 'sl-no-scroll');
  }

  applyAndClose(): void {
    this.closeFilters();
  }

  goToProfile(id: string): void {
    this.router.navigate(['/specialist', id]);
  }

  //  فيكس: لو جاي من بحث تخصص مخصص، نوري الاسم الحقيقي اللي بحث عنه
  // بدل "خدمات أخرى" العامة
  get tradeLabel(): string {
    if (this.currentTrade() === 'other' && this.searchLabel()) {
      return this.searchLabel();
    }
    return this.tradeLabels[this.currentTrade()] ?? 'الخدمات';
  }
}
