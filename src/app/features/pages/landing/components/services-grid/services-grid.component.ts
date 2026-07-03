import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TradeIconComponent, TradeIconName } from '../../../../../shared/components/trade-icon/trade-icon.component';
import { ScrollRevealDirective } from '../../../../../shared/directive/scroll-reveal.directive';

interface ServiceCategory {
  id: string;
  icon: TradeIconName;
  title: string;
  desc: string;
  proCount: string;
  featured?: boolean;
}

@Component({
  selector: 'app-services-grid',
  standalone: true,
  imports: [RouterLink, TradeIconComponent, ScrollRevealDirective],
  templateUrl: './services-grid.component.html',
  styleUrl: './services-grid.component.css'
})
export class ServicesGridComponent {
  categories: ServiceCategory[] = [
    { id: 'electrical', icon: 'electric', title: 'كهربا', desc: 'لوحات، أسلاك، إنارة، وفحص أمان شامل لبيتك أو محلك.', proCount: '+320 صنايعي متاح', featured: true },
    { id: 'plumbing', icon: 'plumbing', title: 'سباكة', desc: 'من تسريب الحنفية لتركيب المواسير بالكامل.', proCount: '+210 صنايعي' },
    { id: 'carpentry', icon: 'carpentry', title: 'نجارة', desc: 'موبيليا، أرفف، وتفصيل على المساحة.', proCount: '+180 صنايعي' },
    { id: 'painting', icon: 'painting', title: 'نقاشة', desc: 'لمسة نهائية نضيفة لأي حيطة أو سقف.', proCount: '+150 صنايعي' },
    { id: 'ac', icon: 'ac', title: 'تكييف وتبريد', desc: 'تركيب، صيانة دورية، وتصليح أعطال.', proCount: '+95 صنايعي' },
    { id: 'more', icon: 'more', title: 'وكمان...', desc: 'نقل عفش، تنظيف، وصيانة عامة.', proCount: '+140 صنايعي' },
  ];
}
