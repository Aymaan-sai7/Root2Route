import { Component } from '@angular/core';
import { NavbarComponent } from '../../layout/navbar/navbar.component';
import { HeroComponent } from './components/hero/hero.component';
import { TrustStripComponent } from './components/trust-strip/trust-strip.component';
import { ServicesGridComponent } from './components/services-grid/services-grid.component';
import { HowItWorksComponent } from './components/how-it-works/how-it-works.component';
import { DualCtaComponent } from './components/dual-cta/dual-cta.component';
import { FooterComponent } from '../../layout/footer/footer.component';
import { WhySanaye3iComponent } from "./components/why-sanaye3i/why-sanaye3i.component";
import { TestimonialsComponent } from "./components/testimonials/testimonials.component";

@Component({
  selector: 'app-landing',
  standalone: true,
  imports: [
    NavbarComponent,
    HeroComponent,
    TrustStripComponent,
    ServicesGridComponent,
    HowItWorksComponent,
    DualCtaComponent,
    FooterComponent,
    WhySanaye3iComponent,
    TestimonialsComponent
],
  templateUrl: './landing.component.html',
  styleUrl: './landing.component.css'
})
export class LandingComponent {}
