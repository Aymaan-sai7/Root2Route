import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { ScrollRevealDirective } from '../../../../../shared/directive/scroll-reveal.directive';
import { StatsService } from '../../../../../core/services/stats.service';
import { PublicStats } from '../../../../../core/models/stats.model';

@Component({
  selector: 'app-hero',
  standalone: true,
  imports: [RouterLink, ScrollRevealDirective],
  templateUrl: './hero.component.html',
  styleUrl: './hero.component.css'
})
export class HeroComponent {
  private statsService = inject(StatsService);

  //  initialValue = null لحد ما رد السيرفر يوصل. الأرقام الاحتياطية (220،
  // 1500، 4.9) بتتعرض في الـ getters تحت بس وقت اللودينج، مش قيم مزيفة دايمة
  private stats = toSignal<PublicStats | null>(this.statsService.getPublicStats(), {
    initialValue: null,
  });

  get totalWorkers(): number {
    return this.stats()?.totalWorkers ?? 220;
  }

  get completedJobs(): number {
    return this.stats()?.completedJobs ?? 1500;
  }

  get avgRating(): string {
    const rating = this.stats()?.avgRating;
    return rating && rating > 0 ? rating.toFixed(1) : '4.9';
  }
}
