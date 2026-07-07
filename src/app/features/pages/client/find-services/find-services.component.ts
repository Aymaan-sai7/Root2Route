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
  // ⚠️ size بيتحكم بس في حجم الخط والـ badge (مقاسات تصميمية)، مش في مكان
  // الكارت في الجريد — المكان بقى مسؤولية posKey لوحده (شوف fs-bento-card--pos-*
  // في الـ CSS)
  size: 'large' | 'medium' | 'small';
  posKey: string;
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
  // تصفح حسب الخدمة — Bento Grid
  // ⚠️ البلوك الأول (4 تصنيفات الأولانيين: كهربا/سباكة/نجارة/دهانات) بيشغل
  // نص الشاشة اليمين بصريًا (الكارت الكبير فيه على أقصى اليمين وطوله كامل).
  // البلوك التاني (4 تصنيفات الجداد: تكييف/تنظيف/نقل عفش/حدادة) بيشغل نص
  // الشاشة الشمال، بنفس التقسيمة بس معكوسة — الكارت الكبير فيه على أقصى الشمال.
  // ⚠️ ملحوظة: القيم 'ac' و 'cleaning' و 'moving' و 'metalwork' لازم تكون
  // موجودة في TradeType (union type) بتاعك في worker.model.ts، وإلا الكومبايلر
  // هيرفض. 'ac' غالبًا موجود بالفعل (مستخدم في searchTradeMap تحت)، بس
  // 'cleaning' و 'moving' و 'metalwork' محتاجين تتضاف لو مش موجودين.
  // ══════════════════════════════════════════════════════════
  bentoCategories: BentoCategory[] = [
    // ── البلوك الأول (يمين) ──────────────────────────────────
    {
      id: 'electrical',
      trade: 'electrical',
      label: 'كهربا',
      desc: 'تركيب لوحات، أسلاك، وفحص أمان شامل لبيتك أو محلك.',
      imageUrl: 'https://images.pexels.com/photos/8005397/pexels-photo-8005397.jpeg?auto=compress&cs=tinysrgb&w=900',
      isMostPopular: true,
      size: 'large',
      posKey: 'large-right',
    },
    {
      id: 'plumbing',
      trade: 'plumbing',
      label: 'سباكة',
      desc: 'من تسريب الحنفية لتركيب المواسير بالكامل.',
      imageUrl: 'https://images.pexels.com/photos/8005368/pexels-photo-8005368.jpeg?auto=compress&cs=tinysrgb&w=900',
      isMostPopular: false,
      size: 'medium',
      posKey: 'medium-right',
    },
    {
      id: 'carpentry',
      trade: 'carpentry',
      label: 'نجارة',
      desc: 'موبيليا وتفصيل بمقاسك.',
      imageUrl: 'https://images.pexels.com/photos/5974047/pexels-photo-5974047.jpeg?auto=compress&cs=tinysrgb&w=600',
      isMostPopular: false,
      size: 'small',
      posKey: 'small-right-1',
    },
    {
      id: 'painting',
      trade: 'painting',
      label: 'نقاشة',
      desc: 'لمسة نهائية نضيفة لأي حيطة.',
      imageUrl: 'https://images.pexels.com/photos/1797428/pexels-photo-1797428.jpeg?auto=compress&cs=tinysrgb&w=600',
      isMostPopular: false,
      size: 'small',
      posKey: 'small-right-2',
    },

    // ── البلوك الثاني (شمال) — الإضافة الجديدة ──────────────
    {
      id: 'ac',
      trade: 'ac',
      label: 'تكييف',
      desc: 'تركيب وصيانة وتنظيف كل أنواع التكييفات.',
      imageUrl: 'https://images.pexels.com/photos/5463581/pexels-photo-5463581.jpeg?auto=compress&cs=tinysrgb&w=900',
      isMostPopular: false,
      size: 'medium',
      posKey: 'medium-left',
    },
    {
      id: 'cleaning',
      trade: 'cleaning',
      label: 'تنظيف',
      desc: 'نظافة شاملة للبيت أو المكتب.',
      imageUrl: 'https://images.pexels.com/photos/8055825/pexels-photo-8055825.jpeg?auto=compress&cs=tinysrgb&w=600',
      isMostPopular: false,
      size: 'small',
      posKey: 'small-left-1',
    },
    {
      id: 'moving',
      trade: 'moving',
      label: 'نقل عفش',
      desc: 'نقل آمن وسريع لكل حاجاتك.',
      imageUrl: 'https://images.pexels.com/photos/4487361/pexels-photo-4487361.jpeg?auto=compress&cs=tinysrgb&w=600',
      isMostPopular: false,
      size: 'small',
      posKey: 'small-left-2',
    },
    {
      id: 'metalwork',
      trade: 'metalwork',
      label: 'حدادة وألوميتال',
      desc: 'شبابيك، أبواب، وشغل حديد ومعادن باحترافية.',
      imageUrl: 'https://images.pexels.com/photos/2760343/pexels-photo-2760343.jpeg?auto=compress&cs=tinysrgb&w=900',
      isMostPopular: false,
      size: 'large',
      posKey: 'large-left',
    },
  ];

  // ══════════════════════════════════════════════════════════
  // السيرش الذكي (Fuzzy Search)
  // ⚠️ الهدف: نتعامل مع أخطاء إملائية بسيطة واختلاف صيغ الكلمة (كهربا/كهرباء)،
  // ولو مفيش أي تطابق معقول، نوري "مفيش نتيجة" بدل ما ننقل المستخدم لتصنيف
  // عشوائي فيه صنايعية مالهمش علاقة بالكلمة اللي كتبها.
  // ══════════════════════════════════════════════════════════
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

  // خريطة التصنيفات المتاحة كلها، بتتفرج للمستخدم لما السيرش يفشل
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

  // ⚠️ لما السيرش يفشل، مبنقلش المستخدم لأي حتة — بنعرض رسالة "مفيش نتيجة"
  // مكانها هنا في نفس الصفحة، وبنقترح أقرب تصنيفات موجودة فعليًا
  searchNotFound = signal(false);
  lastSearchedTerm = signal('');
  suggestedTrades = signal<{ trade: TradeType; label: string }[]>([]);

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
    // لو المستخدم بدأ يعدّل تاني بعد ما ظهرتله رسالة "مفيش نتيجة"، نخفيها
    if (this.searchNotFound()) {
      this.searchNotFound.set(false);
    }
  }

  // ── Arabic text normalization ────────────────────────────────
  // بنوحّد أشكال الحروف المختلفة اللي المستخدمين بيلخبطوا فيها كتير
  // (همزات الألف، التاء المربوطة/الهاء، الياء/الألف المقصورة، التشكيل)
  private normalizeArabic(text: string): string {
    return text
      .trim()
      .toLowerCase()
      .replace(/[\u064B-\u0652]/g, '')   // إزالة التشكيل
      .replace(/[أإآ]/g, 'ا')            // توحيد أشكال الألف
      .replace(/ة/g, 'ه')                // توحيد التاء المربوطة مع الهاء
      .replace(/ى/g, 'ي')                // توحيد الألف المقصورة مع الياء
      .replace(/\s+/g, ' ');             // إزالة أي مسافات زيادة
  }

  // ── Levenshtein distance ──────────────────────────────────────
  // بيحسب "عدد التعديلات" (إضافة/حذف/تغيير حرف) المطلوبة عشان كلمة تبقى
  // زي التانية — ده اللي بيخلينا نتسامح مع أخطاء إملائية بسيطة
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

  // ── البحث الذكي عن أقرب تصنيف ───────────────────────────────
  // بيرجع أفضل تطابق (لو موجود) مع "درجة ثقة" من 0 لـ 1، عشان نقدر نفرّق
  // بين تطابق قوي (نروح له على طول) وتطابق ضعيف (نسيبه كاقتراح بس)
  private findBestTradeMatch(query: string): { trade: TradeType; score: number } | null {
    const q = this.normalizeArabic(query);
    if (!q) return null;

    let best: { trade: TradeType; score: number } | null = null;

    for (const entry of this.searchTradeMap) {
      for (const rawKeyword of entry.keywords) {
        const keyword = this.normalizeArabic(rawKeyword);

        // تطابق مباشر أو جزئي (substring) → ثقة كاملة
        if (keyword.includes(q) || q.includes(keyword)) {
          return { trade: entry.trade, score: 1 };
        }

        // تطابق تقريبي (فرق حرف أو اتنين — زي "كهربا" مقابل "كهرباء"،
        // أو خطأ إملائي بسيط زي "سباكه" بدل "سباكة")
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

  submitSearch(): void {
    const q = this.searchQuery().trim();
    if (!q) return;

    const match = this.findBestTradeMatch(q);

    // ⚠️ عتبة الثقة 0.45 اتحطت بعد تجربة: أعلى من كده بيرفض تطابقات
    // معقولة زي "كهربا"، وأقل من كده بيقبل كلمات مالهاش علاقة خالص
    if (match && match.score >= 0.45) {
      this.searchNotFound.set(false);
      this.router.navigate(['/find-services', match.trade]);
      return;
    }

    // ⚠️ مفيش تطابق واضح — منروحش لصفحة تانية فيها صنايعية مالهمش علاقة.
    // بدل كده، نعرض رسالة "مفيش نتيجة" هنا في نفس الصفحة، مع اقتراح
    // التصنيفات المتاحة فعليًا عشان نساعد المستخدم يوصل لطلبه
    this.lastSearchedTerm.set(q);
    this.suggestedTrades.set(this.allTradeLabels);
    this.searchNotFound.set(true);
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
