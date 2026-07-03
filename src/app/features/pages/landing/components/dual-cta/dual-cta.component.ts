import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ScrollRevealDirective } from '../../../../../shared/directive/scroll-reveal.directive';
import { CountUpDirective } from '../../../../../shared/directive/count-up.directive';

@Component({
  selector: 'app-dual-cta',
  standalone: true,
  imports: [RouterLink, ScrollRevealDirective, CountUpDirective],
  templateUrl: './dual-cta.component.html',
  styleUrl: './dual-cta.component.css',
})
export class DualCtaComponent {
  clientAvatars = [
    { initial: 'س', color: '#1B4F72' },
    { initial: 'م', color: '#E8762C' },
    { initial: 'ن', color: '#3F7A52' },
    { initial: 'ك', color: '#7A5FA0' },
  ];
}
