import { Component } from '@angular/core';

interface TrustBadge {
  label: string;
}

@Component({
  selector: 'app-trust-strip',
  standalone: true,
  imports: [],
  templateUrl: './trust-strip.component.html',
  styleUrl: './trust-strip.component.css'
})
export class TrustStripComponent {
  badges: TrustBadge[] = [
    { label: 'هويات متأكد منها' },
    { label: 'شغل بضمان' },
    { label: 'دعم على مدار الساعة' },
    { label: 'فلوسك مضمونة' },
    { label: 'فحص أمان شامل' },
    { label: 'صنايعية مرخصين' },
  ];
}
