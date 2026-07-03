import { ApplicationConfig, provideZoneChangeDetection } from '@angular/core';
import { provideRouter } from '@angular/router';

import { routes } from './app.routes';
import { provideToastr } from 'ngx-toastr';
import { provideAnimations } from '@angular/platform-browser/animations';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { authInterceptor } from './core/interceptors/auth.interceptor';
export const appConfig: ApplicationConfig = {
  providers: [provideZoneChangeDetection({ eventCoalescing: true }),provideHttpClient(withInterceptors([authInterceptor])), provideRouter(routes),provideAnimations(),
    provideToastr({
      timeOut: 3500,
      positionClass: 'toast-top-right',
      preventDuplicates: true,
    }),]
};
