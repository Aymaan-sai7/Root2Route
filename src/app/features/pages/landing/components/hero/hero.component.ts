import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ScrollRevealDirective } from '../../../../../shared/directive/scroll-reveal.directive';
@Component({
  selector: 'app-hero',
  imports: [RouterLink, ScrollRevealDirective],
  templateUrl: './hero.component.html',
  styleUrl: './hero.component.css'
})
export class HeroComponent {

}
