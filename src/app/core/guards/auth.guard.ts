import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/Auth.service';

/**
 * يحمي أي route من الدخول من غير تسجيل دخول.
 * لو مش مسجل دخول → يرجع لـ /login.
 */
export const authGuard: CanActivateFn = (route, state) => {
  const auth   = inject(AuthService);
  const router = inject(Router);

  if (auth.isLoggedIn()) {
    return true;
  }

  // نحفظ الصفحة اللي كان عايز يروحلها عشان نرجعه ليها بعد اللوجن
  router.navigate(['/login'], { queryParams: { returnUrl: state.url } });
  return false;
};
