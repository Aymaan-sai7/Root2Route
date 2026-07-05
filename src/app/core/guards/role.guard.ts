import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/Auth.service';
import { UserRole } from '../models/user.model';

/**
 * Factory بترجع guard بيتأكد من الـ role.
 * استخدام: canActivate: [roleGuard('pro')] أو [roleGuard('admin')]
 *
 * - لو مش مسجل دخول     → يرجع لـ /login
 * - لو مسجل بـ role غلط  → يرجعه لمكانه الصح (admin/pro/client) بدل ما يدخل مكان مش بتاعه
 */
export function roleGuard(requiredRole: UserRole): CanActivateFn {
  return () => {
    const auth   = inject(AuthService);
    const router = inject(Router);
    const user = auth.currentUser();
    if (!user) {
      router.navigate(['/login']);
      return false;
    }
    if (user.role !== requiredRole) {
      // يرجعه لمكانه الصح بدل ما يدخل مكان مش بتاعه
      const correctPath =
        user.role === 'admin' ? '/admin/dashboard' :
        user.role === 'pro'   ? '/pro/dashboard' :
        '/find-services';
      router.navigate([correctPath]);
      return false;
    }
    return true;
  };
}
