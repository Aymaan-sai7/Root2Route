import { Component, inject, OnInit, signal, computed } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { WorkersService, WorkersFilter } from '../../../../core/services/workers.service';
import { BookingsService, ActiveCoupon } from '../../../../core/services/bookings.service';
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
  posKey: string;
}

interface PromoCard {
  id: string;
  badge: string;
  badgeVariant: 'new' | 'popular' | 'urgent';
  title: string;
  desc: string;
  ctaLabel: string;
  action: () => void;
}

@Component({
  selector: 'app-find-services',
  standalone: true,
  imports: [ScrollRevealDirective],
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

  // ══════════════════════════════════════════════════════════
  // عروض وتنقل سريع (Promo Cards)
  //  لو فيه كوبونات حقيقية شغالة دلوقتي، بتتعرض هي (مبنية من بيانات فعلية
  // من /coupons/active). لو مفيش كوبونات خالص (الأدمن لسه معملش حاجة، أو كلها
  // منتهية)، بنرجع لكاردات "تنقل سريع" الثابتة زي الأول عشان السكشن مايفضلش فاضي
  // ══════════════════════════════════════════════════════════
  activeCoupons = signal<ActiveCoupon[]>([]);
  copiedCode = signal<string | null>(null);

  private fallbackPromoCards: PromoCard[] = [
    {
      id: 'first-time',
      badge: 'جديد عندنا؟',
      badgeVariant: 'new',
      title: 'ابدأ بأول حجز ليك',
      desc: 'اختار من صنايعيتنا الموثقين بأعلى تقييم وابدأ فورًا من غير أي التزام.',
      ctaLabel: 'شوف الأعلى تقييمًا',
      action: () => this.scrollToSection('top-specialists-section'),
    },
    {
      id: 'most-popular',
      badge: 'الأكثر طلبًا',
      badgeVariant: 'popular',
      title: 'محتاج كهربائي؟',
      desc: 'كهربا هي الخدمة الأكثر طلبًا على المنصة — صنايعية جاهزين دلوقتي.',
      ctaLabel: 'تصفح كهربا',
      action: () => this.goToCategory('electrical'),
    },
    {
      id: 'emergency',
      badge: 'عاجل',
      badgeVariant: 'urgent',
      title: 'محتاج حد دلوقتي؟',
      desc: 'شوف الصنايعية المتاحين فورًا في الحالات العاجلة.',
      ctaLabel: 'شوف المتاحين دلوقتي',
      action: () => this.scrollToSection('emergency-section'),
    },
  ];

  promoCards = computed<PromoCard[]>(() => {
    const coupons = this.activeCoupons();
    if (coupons.length === 0) return this.fallbackPromoCards;

    return coupons.map((coupon) => this.couponToPromoCard(coupon));
  });

  private couponToPromoCard(coupon: ActiveCoupon): PromoCard {
    const discountText =
      coupon.discountType === 'percentage'
        ? `${coupon.discountValue}%`
        : `${coupon.discountValue} ج.م`;

    const tradeLabel = coupon.tradeRestriction
      ? this.allTradeLabels.find((t) => t.trade === coupon.tradeRestriction)?.label
      : null;

    return {
      id: `coupon-${coupon.code}`,
      badge: 'كوبون خصم',
      badgeVariant: 'popular',
      title: `خصم ${discountText}`,
      desc: tradeLabel ? `على خدمة ${tradeLabel} بس، استخدم الكود دلوقتي.` : 'على كل الحجوزات، استخدم الكود دلوقتي.',
      ctaLabel: this.copiedCode() === coupon.code ? 'اتنسخ! ✓' : `انسخ الكود: ${coupon.code}`,
      action: () => this.copyCouponCode(coupon.code),
    };
  }

  private copyCouponCode(code: string): void {
    navigator.clipboard?.writeText(code).then(() => {
      this.copiedCode.set(code);
      setTimeout(() => {
        if (this.copiedCode() === code) this.copiedCode.set(null);
      }, 1800);
    });
  }

  private loadActiveCoupons(): void {
    this.bookings.getActiveCoupons().subscribe((coupons) => this.activeCoupons.set(coupons));
  }

  private scrollToSection(elementId: string): void {
    document.getElementById(elementId)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  private readonly URGENT_TRADES: TradeType[] = ['electrical', 'plumbing', 'ac'];

  emergencyWorkers = signal<Worker[]>([]);
  loadingEmergency = signal(true);

  private loadEmergencyWorkers(): void {
    this.loadingEmergency.set(true);
    this.workers.getAll({ isAvailable: true } as WorkersFilter).subscribe({
      next: (list) => {
        const urgentOnly = list.filter((w) => this.URGENT_TRADES.includes(w.trade));
        this.emergencyWorkers.set(
          [...urgentOnly].sort((a, b) => b.rating - a.rating).slice(0, 4)
        );
        this.loadingEmergency.set(false);
      },
      error: () => this.loadingEmergency.set(false),
    });
  }

  bentoCategories: BentoCategory[] = [
    {
      id: 'electrical', trade: 'electrical', label: 'كهربا',
      desc: 'تركيب لوحات، أسلاك، وفحص أمان شامل لبيتك أو محلك.',
      imageUrl: 'https://images.pexels.com/photos/8005397/pexels-photo-8005397.jpeg?auto=compress&cs=tinysrgb&w=900',
      isMostPopular: true, size: 'large', posKey: 'large-right',
    },
    {
      id: 'plumbing', trade: 'plumbing', label: 'سباكة',
      desc: 'من تسريب الحنفية لتركيب المواسير بالكامل.',
      imageUrl: 'https://images.pexels.com/photos/8005368/pexels-photo-8005368.jpeg?auto=compress&cs=tinysrgb&w=900',
      isMostPopular: false, size: 'medium', posKey: 'medium-right',
    },
    {
      id: 'carpentry', trade: 'carpentry', label: 'نجارة',
      desc: 'موبيليا وتفصيل بمقاسك.',
      imageUrl: 'https://images.pexels.com/photos/5974047/pexels-photo-5974047.jpeg?auto=compress&cs=tinysrgb&w=600',
      isMostPopular: false, size: 'small', posKey: 'small-right-1',
    },
    {
      id: 'painting', trade: 'painting', label: 'نقاشة',
      desc: 'لمسة نهائية نضيفة لأي حيطة.',
      imageUrl: 'https://images.pexels.com/photos/1797428/pexels-photo-1797428.jpeg?auto=compress&cs=tinysrgb&w=600',
      isMostPopular: false, size: 'small', posKey: 'small-right-2',
    },
    {
      id: 'ac', trade: 'ac', label: 'تكييف',
      desc: 'تركيب وصيانة وتنظيف كل أنواع التكييفات.',
      imageUrl: 'https://images.pexels.com/photos/5463581/pexels-photo-5463581.jpeg?auto=compress&cs=tinysrgb&w=900',
      isMostPopular: false, size: 'medium', posKey: 'medium-left',
    },
    {
      id: 'cleaning', trade: 'cleaning', label: 'تنظيف',
      desc: 'نظافة شاملة للبيت أو المكتب.',
      imageUrl: 'https://images.pexels.com/photos/8055825/pexels-photo-8055825.jpeg?auto=compress&cs=tinysrgb&w=600',
      isMostPopular: false, size: 'small', posKey: 'small-left-1',
    },
    {
      id: 'moving', trade: 'moving', label: 'نقل عفش',
      desc: 'نقل آمن وسريع لكل حاجاتك.',
      imageUrl: 'https://images.pexels.com/photos/4487361/pexels-photo-4487361.jpeg?auto=compress&cs=tinysrgb&w=600',
      isMostPopular: false, size: 'small', posKey: 'small-left-2',
    },
    {
      id: 'metalwork', trade: 'metalwork', label: 'حدادة وألوميتال',
      desc: 'شبابيك، أبواب، وشغل حديد ومعادن باحترافية.',
      imageUrl: 'https://images.pexels.com/photos/2760343/pexels-photo-2760343.jpeg?auto=compress&cs=tinysrgb&w=900',
      isMostPopular: false, size: 'large', posKey: 'large-left',
    },
  ];

  private searchTradeMap: { trade: TradeType; keywords: string[] }[] = [
    { trade: 'electrical', keywords: ['كهربا', 'كهرباء', 'كهربائي', 'كهربجي', 'electrical', 'electric'] },
    { trade: 'plumbing',   keywords: ['سباكة', 'سباك', 'مواسير', 'بلاعة', 'بلاعات', 'plumbing', 'plumber'] },
    { trade: 'carpentry',  keywords: ['نجارة', 'نجار', 'موبيليا', 'اثاث', 'أثاث', 'carpentry', 'carpenter'] },
    { trade: 'painting',   keywords: ['نقاشة', 'نقاش', 'دهان', 'دهانات', 'painting', 'painter'] },
    { trade: 'ac',         keywords: ['تكييف', 'تكييفات', 'مكيف', 'مكيفات', 'ac', 'تبريد'] },
    { trade: 'cleaning',   keywords: ['تنظيف', 'نظافة', 'شركة نظافة', 'cleaning', 'cleaner'] },
    { trade: 'moving',     keywords: ['نقل عفش', 'نقل اثاث', 'عفش', 'وناسة', 'moving', 'movers'] },
    { trade: 'metalwork',  keywords: ['حدادة', 'حداد', 'الوميتال', 'ألوميتال', 'حديد', 'metalwork', 'blacksmith'] },
  ];

  private allTradeLabels: { trade: TradeType; label: string }[] = [
    { trade: 'electrical', label: 'كهربا' },
    { trade: 'plumbing', label: 'سباكة' },
    { trade: 'carpentry', label: 'نجارة' },
    { trade: 'painting', label: 'نقاشة' },
    { trade: 'ac', label: 'تكييف' },
    { trade: 'cleaning', label: 'تنظيف' },
    { trade: 'moving', label: 'نقل عفش' },
    { trade: 'metalwork', label: 'حدادة وألوميتال' },
  ];

  searchNotFound = signal(false);
  lastSearchedTerm = signal('');
  suggestedTrades = signal<{ trade: TradeType; label: string }[]>([]);

  ngOnInit(): void {
    this.loadRecentServices();
    this.loadTopSpecialists();
    this.loadNearbySection();
    this.loadEmergencyWorkers();
    this.loadActiveCoupons();
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
    if (this.searchNotFound()) {
      this.searchNotFound.set(false);
    }
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

  private levenshtein(a: string, b: string): number {
    const dp: number[][] = Array.from({ length: a.length + 1 }, () =>
      new Array(b.length + 1).fill(0)
    );
    for (let i = 0; i <= a.length; i++) dp[i][0] = i;
    for (let j = 0; j <= b.length; j++) dp[0][j] = j;

    for (let i = 1; i <= a.length; i++) {
      for (let j = 1; j <= b.length; j++) {
        dp[i][j] =
          a[i - 1] === b[j - 1]
            ? dp[i - 1][j - 1]
            : 1 + Math.min(dp[i - 1][j - 1], dp[i - 1][j], dp[i][j - 1]);
      }
    }
    return dp[a.length][b.length];
  }

  private findBestTradeMatch(query: string): { trade: TradeType; score: number } | null {
    const q = this.normalizeArabic(query);
    if (!q) return null;

    let best: { trade: TradeType; score: number } | null = null;

    for (const entry of this.searchTradeMap) {
      for (const rawKeyword of entry.keywords) {
        const keyword = this.normalizeArabic(rawKeyword);

        if (keyword.includes(q) || q.includes(keyword)) {
          return { trade: entry.trade, score: 1 };
        }

        const distance = this.levenshtein(q, keyword);
        const maxAllowedDistance = Math.max(1, Math.floor(keyword.length * 0.3));

        if (distance <= maxAllowedDistance) {
          const score = 1 - distance / Math.max(keyword.length, q.length, 1);
          if (!best || score > best.score) {
            best = { trade: entry.trade, score };
          }
        }
      }
    }

    return best;
  }

  /**
   *  جديد: البحث عن تطابق وسط "التخصصات المخصصة" اللي الصنايعية كتبوها
   * بنفسهم وقت التسجيل (لما اختاروا "تخصص تاني" وكتبوا اسم زي "دش").
   * دي مش موجودة في searchTradeMap الثابتة، فبنجيب كل صنايعية trade==='other'
   * فعليًا ونقارن كلام البحث مع tradeLabel الحقيقي بتاعهم، بنفس منطق
   * التسامح مع الأخطاء الإملائية المستخدم فوق.
   */
  private searchCustomTrades(originalQuery: string): void {
    const q = this.normalizeArabic(originalQuery);

    this.workers.getAll({ trade: 'other' as TradeType }).subscribe({
      next: (otherWorkers) => {
        let best: { label: string; score: number } | null = null;

        for (const w of otherWorkers) {
          if (!w.tradeLabel) continue;
          const label = this.normalizeArabic(w.tradeLabel);

          if (label.includes(q) || q.includes(label)) {
            best = { label: w.tradeLabel, score: 1 };
            break;
          }

          const distance = this.levenshtein(q, label);
          const maxAllowedDistance = Math.max(1, Math.floor(label.length * 0.3));
          if (distance <= maxAllowedDistance) {
            const score = 1 - distance / Math.max(label.length, q.length, 1);
            if (!best || score > best.score) {
              best = { label: w.tradeLabel, score };
            }
          }
        }

        if (best && best.score >= 0.45) {
          this.searchNotFound.set(false);
          //  بنوجّه لصفحة "other" مع q= الاسم الحقيقي، عشان specialists-list
          // يفلتر بس على الصنايعية اللي تخصصهم المخصص مطابق للي بحث عنه
          this.router.navigate(['/find-services', 'other'], {
            queryParams: { q: best.label },
          });
          return;
        }

        this.showNotFound(originalQuery);
      },
      error: () => this.showNotFound(originalQuery),
    });
  }

  private showNotFound(query: string): void {
    this.lastSearchedTerm.set(query);
    this.suggestedTrades.set(this.allTradeLabels);
    this.searchNotFound.set(true);
  }

  submitSearch(): void {
    const q = this.searchQuery().trim();
    if (!q) return;

    const match = this.findBestTradeMatch(q);

    if (match && match.score >= 0.45) {
      this.searchNotFound.set(false);
      this.router.navigate(['/find-services', match.trade]);
      return;
    }

    //  قبل ما نستسلم برسالة "مفيش نتيجة"، ندور في التخصصات المخصصة الحقيقية
    this.searchCustomTrades(q);
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
