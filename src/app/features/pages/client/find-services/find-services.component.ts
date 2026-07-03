import { Component, inject, OnInit, signal, computed } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { WorkersService, WorkersFilter } from '../../../../core/services/workers.service';
import { BookingsService } from '../../../../core/services/bookings.service';
import { AuthService } from '../../../../core/services/Auth.service';
import { Worker, TradeType } from '../../../../core/models/worker.model';
import { Booking } from '../../../../core/models/booking.model';
import { ScrollRevealDirective } from '../../../../shared/directive/scroll-reveal.directive';

interface BentoCategory {
  id: string;
  trade: TradeType;
  label: string;
  desc: string;
  imageUrl: string;
  isMostPopular: boolean;
  size: 'large' | 'medium' | 'small';
}

@Component({
  selector: 'app-find-services',
  standalone: true,
  imports: [ ScrollRevealDirective],
  templateUrl: './find-services.component.html',
  styleUrl: './find-services.component.css',
})
export class FindServicesComponent implements OnInit {
  private router = inject(Router);
  private workers = inject(WorkersService);
  private bookings = inject(BookingsService);
  private auth = inject(AuthService);

  searchQuery = signal('');

  recentServices = signal<Booking[]>([]);
  loadingRecent = signal(true);

  topSpecialists = signal<Worker[]>([]);
  loadingTopSpecialists = signal(true);

  bentoCategories: BentoCategory[] = [
    {
      id: 'electrical',
      trade: 'electrical',
      label: 'كهربا',
      desc: 'تركيب لوحات، أسلاك، وفحص أمان شامل لبيتك أو محلك.',
      imageUrl: 'https://images.pexels.com/photos/8005397/pexels-photo-8005397.jpeg?auto=compress&cs=tinysrgb&w=900',
      isMostPopular: true,
      size: 'large',
    },
    {
      id: 'plumbing',
      trade: 'plumbing',
      label: 'سباكة',
      desc: 'من تسريب الحنفية لتركيب المواسير بالكامل.',
      imageUrl: 'https://images.pexels.com/photos/8005368/pexels-photo-8005368.jpeg?auto=compress&cs=tinysrgb&w=900',
      isMostPopular: false,
      size: 'medium',
    },
    {
      id: 'carpentry',
      trade: 'carpentry',
      label: 'نجارة',
      desc: 'موبيليا وتفصيل بمقاسك.',
      imageUrl: 'https://images.pexels.com/photos/5974047/pexels-photo-5974047.jpeg?auto=compress&cs=tinysrgb&w=600',
      isMostPopular: false,
      size: 'small',
    },
    {
      id: 'painting',
      trade: 'painting',
      label: 'نقاشة',
      desc: 'لمسة نهائية نضيفة لأي حيطة.',
      imageUrl: 'https://images.pexels.com/photos/1797428/pexels-photo-1797428.jpeg?auto=compress&cs=tinysrgb&w=600',
      isMostPopular: false,
      size: 'small',
    },
  ];

  // خريطة بحث شاملة لكل التريدز (مش بس اللي ظاهرين في الـ bento)
  private searchTradeMap: { trade: TradeType; keywords: string[] }[] = [
    { trade: 'electrical', keywords: ['كهربا', 'كهرباء', 'electrical'] },
    { trade: 'plumbing',   keywords: ['سباكة', 'سباك', 'plumbing'] },
    { trade: 'carpentry',  keywords: ['نجارة', 'نجار', 'carpentry'] },
    { trade: 'painting',   keywords: ['نقاشة', 'دهان', 'painting'] },
    { trade: 'ac',         keywords: ['تكييف', 'تكييفات', 'ac'] },
  ];

  ngOnInit(): void {
    this.loadRecentServices();
    this.loadTopSpecialists();
    this.loadNearbySection();
  }

  private loadRecentServices(): void {
    const user = this.auth.currentUser();
    if (!user) {
      this.loadingRecent.set(false);
      return;
    }

    this.loadingRecent.set(true);
    this.bookings.getByClient(user.id).subscribe({
      next: (data) => {
        this.recentServices.set(data.slice(0, 4));
        this.loadingRecent.set(false);
      },
      error: () => this.loadingRecent.set(false),
    });
  }

  private loadTopSpecialists(): void {
    this.loadingTopSpecialists.set(true);
    this.workers.getTopRated(5).subscribe({
      next: (data) => {
        this.topSpecialists.set(data);
        this.loadingTopSpecialists.set(false);
      },
      error: () => this.loadingTopSpecialists.set(false),
    });
  }

  onSearch(event: Event): void {
    const value = (event.target as HTMLInputElement).value;
    this.searchQuery.set(value);
  }

  submitSearch(): void {
    const q = this.searchQuery().trim().toLowerCase();
    if (!q) return;

    const match = this.searchTradeMap.find((entry) =>
      entry.keywords.some((kw) => kw.toLowerCase().includes(q) || q.includes(kw.toLowerCase()))
    );

    this.router.navigate(['/find-services', match ? match.trade : 'other']);
  }

  goToCategory(trade: TradeType): void {
    this.router.navigate(['/find-services', trade]);
  }

  goToProfile(workerId: string): void {
    this.router.navigate(['/specialist', workerId]);
  }

  statusLabel(status: Booking['status']): string {
    const labels: Record<Booking['status'], string> = {
      pending: 'قيد الانتظار',
      active: 'جاري التنفيذ',
      completed: 'مكتمل',
      cancelled: 'ملغي',
    };
    return labels[status];
  }

  // ─── Nearby Workers (الأقرب ليك) ───────────────────────
  private readonly CITY_STORAGE_KEY = 'sanaye3i_client_city';

  selectedCity = signal<string | null>(null);
  availableCities = signal<string[]>([]);
  nearbyWorkers = signal<Worker[]>([]);
  loadingNearby = signal(true);
  isCityPickerOpen = signal(false);

  private loadNearbySection(): void {
    const savedCity = localStorage.getItem(this.CITY_STORAGE_KEY);

    this.workers.getDistinctCities().subscribe({
      next: (cities) => {
        this.availableCities.set(cities);

        if (savedCity && cities.includes(savedCity)) {
          this.selectedCity.set(savedCity);
          this.loadWorkersByCity(savedCity);
        } else {
          this.loadingNearby.set(false);
          this.isCityPickerOpen.set(true);
        }
      },
      error: () => this.loadingNearby.set(false),
    });
  }

  private loadWorkersByCity(city: string): void {
    this.loadingNearby.set(true);
    this.workers.getAll({ city }).subscribe({
      next: (list) => {
        this.nearbyWorkers.set(
          [...list].sort((a, b) => b.rating - a.rating).slice(0, 4)
        );
        this.loadingNearby.set(false);
      },
      error: () => this.loadingNearby.set(false),
    });
  }

  chooseCity(city: string): void {
    localStorage.setItem(this.CITY_STORAGE_KEY, city);
    this.selectedCity.set(city);
    this.isCityPickerOpen.set(false);
    this.loadWorkersByCity(city);
  }

  openCityPicker(): void {
    this.isCityPickerOpen.set(true);
  }
}
