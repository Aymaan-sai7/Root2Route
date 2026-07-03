import { Component, inject, OnInit, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { WorkersService } from '../../../../core/services/workers.service';
import { ReviewsService } from '../../../../core/services/review.service';
import { Worker } from '../../../../core/models/worker.model';
import { Review } from '../../../../core/models/review.model';
import { generateAvatarColor } from '../../../../core/utils/color.util';

@Component({
  selector: 'app-specialist-profile',
  standalone: true,
  imports: [],
  templateUrl: './specialist-profile.component.html',
  styleUrl: './specialist-profile.component.css',
})
export class SpecialistProfileComponent implements OnInit {
  private route   = inject(ActivatedRoute);
  private router  = inject(Router);
  private workers = inject(WorkersService);
  private reviewsService = inject(ReviewsService);

  worker  = signal<Worker | null>(null);
  reviews = signal<Review[]>([]);
  loading = signal(true);
  error   = signal<string | null>(null);

  skills: Record<string, string[]> = {
    electrical: ['تركيب لوحات كهرباء', 'أسلاك وإنارة', 'فحص أمان', 'كهرباء صناعية'],
    plumbing:   ['تصليح تسريبات', 'تركيب مواسير', 'سخانات', 'صرف صحي'],
    carpentry:  ['تفصيل موبيليا', 'تركيب أرفف', 'أبواب وشبابيك', 'ديكور خشبي'],
    painting:   ['دهان داخلي', 'دهان خارجي', 'ورق حائط', 'تشطيب نهائي'],
    ac:         ['تركيب تكييفات', 'صيانة دورية', 'تصليح أعطال', 'تكييف مركزي'],
    other:      ['خدمات متنوعة'],
  };

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (!id) { this.router.navigate(['/find-services']); return; }
    this.loadWorker(id);
  }

  private loadWorker(id: string): void {
    this.workers.getById(id).subscribe({
      next: (w) => {
        this.worker.set(w);
        this.loadReviews(id);
        this.loading.set(false);
      },
      error: () => {
        this.error.set('مش قادر يجيب بيانات الصنايعي.');
        this.loading.set(false);
      },
    });
  }

  private loadReviews(workerId: string): void {
    this.reviewsService.getByWorker(workerId).subscribe({
      next: (r) => this.reviews.set(r),
    });
  }

  getSkills(trade: string): string[] {
    return this.skills[trade] ?? this.skills['other'];
  }

  getStars(rating: number): boolean[] {
    return Array.from({ length: 5 }, (_, i) => i < Math.round(rating));
  }

  getAvatarColor(name: string): string {
    return generateAvatarColor(name);
  }

  bookNow(): void {
    const w = this.worker();
    if (w) this.router.navigate(['/booking', w.id]);
  }

  sendMessage(): void {
    const w = this.worker();
    if (!w) return;
    this.router.navigate(['/messages', w.userId], {
      queryParams: { name: w.fullName, color: w.avatarColor },
    });
  }

  goBack(): void {
    history.back();
  }
}
