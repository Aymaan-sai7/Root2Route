import { Component, signal, HostListener } from '@angular/core';
import { RouterLink } from '@angular/router';
@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './navbar.component.html',
  styleUrl: './navbar.component.css'
})
export class NavbarComponent {
  mobileOpen = signal(false);
showNavbar = signal(true);
private lastScroll = 0;
private readonly threshold = 15;

@HostListener('window:scroll')
onScroll() {

  const current = window.scrollY;

  if (Math.abs(current - this.lastScroll) < this.threshold)
    return;

  if (current <= 60) {

    this.showNavbar.set(true);

  } else if (current > this.lastScroll) {

    this.showNavbar.set(false);

  } else {

    this.showNavbar.set(true);

  }

  this.lastScroll = current;

}
  toggleMobile(): void {
    this.mobileOpen.update((v) => !v);
  }
}
