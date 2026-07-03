import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { ClientNavbarComponent } from '../client-navbar/client-navbar.component';
import { ClientFooterComponent } from '../../layout/client-footer/client-footer.component';

@Component({
  selector: 'app-client-layout',
  standalone: true,
  imports: [RouterOutlet, ClientNavbarComponent, ClientFooterComponent],
  template: `
    <app-client-navbar />
    <main>
      <router-outlet />
    </main>
    <app-client-footer />
  `,
})
export class ClientLayoutComponent {}
